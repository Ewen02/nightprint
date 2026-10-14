import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Blueprint } from "@nightprint/blueprint";
import type { MachineInput } from "@nightprint/engine";

/**
 * What the server keeps on its one volume: each drawing, keyed by the commit it was drawn
 * from, so a repository is drawn once per commit, with a pointer to each repository's last
 * one; and what the model cost each day, so the budget holds across restarts.
 */

/** A repository's machine, as drawn from one commit. */
export interface Drawing {
  /** "owner/name", as GitHub spells it. */
  readonly repo: string;
  readonly sha: string;
  /** ISO time. */
  readonly drawnAt: string;
  readonly model: string;
  readonly attempts: number;
  /** Dollars, at list price. */
  readonly cost: number;
  /**
   * The model's plan, kept so a better layout can redraw every machine without asking the
   * model again. Drawings made before 15/10/2026 have none.
   */
  readonly blueprint?: Blueprint;
  readonly machine: MachineInput;
}

const OWNER = /^[A-Za-z0-9-]+$/;
const NAME = /^[A-Za-z0-9._-]+$/;
const SHA = /^[0-9a-f]{40}$/;

/** A repository's folder, from parts already checked: nothing in them climbs out of `dir`. */
function repoDir(dir: string, repo: string): string {
  const [owner = "", name = ""] = repo.toLowerCase().split("/");
  if (!OWNER.test(owner) || !NAME.test(name) || /^\.+$/.test(name)) {
    throw new Error(`Not a repository: ${repo}`);
  }
  return join(dir, "drawings", owner, name);
}

function drawingPath(dir: string, repo: string, sha: string): string {
  if (!SHA.test(sha)) {
    throw new Error(`Not a repository at a commit: ${repo}@${sha}`);
  }
  return join(repoDir(dir, repo), `${sha}.json`);
}

/** Writes through a temporary file, so a reader never sees half a file. */
async function writeAtomically(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  // Unique per write: two drawings of one repository may end together.
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export interface DrawingStore {
  get(repo: string, sha: string): Promise<Drawing | undefined>;
  /** The repository's most recent drawing, whatever its commit. */
  latest(repo: string): Promise<Drawing | undefined>;
  put(drawing: Drawing): Promise<void>;
}

export function fileDrawingStore(dir: string): DrawingStore {
  // Written by `put` alone, from a drawing the engine accepted.
  const get = async (repo: string, sha: string) =>
    (await readJson(drawingPath(dir, repo, sha))) as Drawing | undefined;
  return {
    get,
    latest: async (repo) => {
      const folder = repoDir(dir, repo);
      const pointer = await readJson(join(folder, "latest.json"));
      const sha =
        typeof pointer === "object" && pointer !== null && "sha" in pointer
          ? pointer.sha
          : undefined;
      if (typeof sha === "string") {
        return get(repo, sha);
      }
      // Drawn before pointers existed: the newest drawing in the folder.
      const names = await readdir(folder).catch((): string[] => []);
      const drawings = await Promise.all(
        names.filter((n) => /^[0-9a-f]{40}\.json$/.test(n)).map((n) => get(repo, n.slice(0, 40))),
      );
      return drawings
        .filter((d): d is Drawing => d !== undefined)
        .sort((a, b) => b.drawnAt.localeCompare(a.drawnAt))[0];
    },
    put: async (drawing) => {
      await writeAtomically(drawingPath(dir, drawing.repo, drawing.sha), JSON.stringify(drawing));
      await writeAtomically(
        join(repoDir(dir, drawing.repo), "latest.json"),
        JSON.stringify({ sha: drawing.sha }),
      );
    },
  };
}

/** What the model cost on one day, in dollars. */
export interface Ledger {
  spent(day: string): Promise<number>;
  add(day: string, dollars: number): Promise<void>;
}

export function fileLedger(dir: string): Ledger {
  const pathOf = (day: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new Error(`Not a day: ${day}`);
    }
    return join(dir, "spend", `${day}.json`);
  };
  const spent = async (day: string) => {
    const entry = await readJson(pathOf(day));
    return typeof entry === "object" &&
      entry !== null &&
      "usd" in entry &&
      typeof entry.usd === "number"
      ? entry.usd
      : 0;
  };
  // One write at a time: two drawings ending together must both be counted.
  let queue = Promise.resolve();
  return {
    spent,
    add: (day, dollars) => {
      queue = queue.then(async () => {
        const usd = (await spent(day)) + dollars;
        await writeAtomically(pathOf(day), JSON.stringify({ usd }));
      });
      return queue;
    },
  };
}

/** Today in UTC, as YYYY-MM-DD: the budget resets at midnight UTC. */
export function dayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}
