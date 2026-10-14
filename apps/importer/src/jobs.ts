import { randomUUID } from "node:crypto";

/**
 * Drawings run a few at a time, in order, in this process. A job lives in memory: a restart
 * loses the ones in flight, and their visitors simply ask again. The cache, not the queue,
 * is what lasts.
 */

export type JobStage = "queued" | "reading" | "surveying" | "drawing" | "done" | "failed";

export interface JobState<Result> {
  readonly id: string;
  readonly stage: JobStage;
  /** Which answer of the model is being checked, while drawing. */
  readonly attempt?: number | undefined;
  /** Why it failed, in words a visitor can act on. */
  readonly error?: string | undefined;
  readonly result?: Result | undefined;
}

/** How a job tells where it is. */
export type Report = (stage: "reading" | "surveying" | "drawing", attempt?: number) => void;

export interface QueueOptions {
  /** Jobs run at once: a drawing mostly waits on GitHub and the model, not on the CPU. */
  readonly concurrency?: number;
  /** Jobs waiting beyond the running ones; past it, `add` refuses. */
  readonly maxWaiting: number;
  /** How long a finished job stays readable, in ms. */
  readonly keepFor: number;
  readonly now?: () => number;
}

export class QueueFullError extends Error {
  override name = "QueueFullError";
}

export class JobQueue<Result> {
  readonly #jobs = new Map<string, { state: JobState<Result>; finishedAt?: number }>();
  readonly #waiting: { id: string; run: (report: Report) => Promise<Result> }[] = [];
  #running = 0;
  readonly #options: QueueOptions;
  readonly #now: () => number;

  constructor(options: QueueOptions) {
    this.#options = options;
    this.#now = options.now ?? Date.now;
  }

  /** Jobs not finished yet: those running and those waiting. */
  get pending(): number {
    return this.#waiting.length + this.#running;
  }

  add(run: (report: Report) => Promise<Result>, describe: (error: unknown) => string): string {
    this.#forgetOld();
    if (this.#waiting.length >= this.#options.maxWaiting) {
      throw new QueueFullError("Too many drawings in progress; try again in a few minutes.");
    }
    const id = randomUUID();
    this.#jobs.set(id, { state: { id, stage: "queued" } });
    this.#waiting.push({
      id,
      run: async (report) => {
        try {
          return await run(report);
        } catch (error) {
          throw new Error(describe(error));
        }
      },
    });
    void this.#next();
    return id;
  }

  get(id: string): JobState<Result> | undefined {
    this.#forgetOld();
    return this.#jobs.get(id)?.state;
  }

  async #next(): Promise<void> {
    if (this.#running >= (this.#options.concurrency ?? 1)) {
      return;
    }
    const job = this.#waiting.shift();
    if (!job) {
      return;
    }
    this.#running += 1;
    const set = (state: JobState<Result>, finished = false) => {
      this.#jobs.set(job.id, finished ? { state, finishedAt: this.#now() } : { state });
    };
    try {
      const result = await job.run((stage, attempt) => set({ id: job.id, stage, attempt }));
      set({ id: job.id, stage: "done", result }, true);
    } catch (error) {
      set(
        { id: job.id, stage: "failed", error: error instanceof Error ? error.message : "" },
        true,
      );
    } finally {
      this.#running -= 1;
      void this.#next();
    }
  }

  #forgetOld(): void {
    const now = this.#now();
    for (const [id, job] of this.#jobs) {
      if (job.finishedAt !== undefined && now - job.finishedAt > this.#options.keepFor) {
        this.#jobs.delete(id);
      }
    }
  }
}

/**
 * How many new drawings each visitor started over a sliding window. In memory: a restart
 * forgives everyone, which the daily budget still bounds.
 */
export class VisitorLimit {
  readonly #starts = new Map<string, number[]>();
  constructor(
    readonly perWindow: number,
    readonly windowMs: number,
    readonly now: () => number = Date.now,
  ) {}

  /** Counts a start for `visitor` if the window allows it. */
  take(visitor: string): boolean {
    const now = this.now();
    const recent = (this.#starts.get(visitor) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.perWindow) {
      this.#starts.set(visitor, recent);
      return false;
    }
    this.#starts.set(visitor, [...recent, now]);
    return true;
  }
}
