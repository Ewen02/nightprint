import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JobQueue, QueueFullError, type Report, VisitorLimit } from "./jobs";
import { type Drawing, dayOf, fileDrawingStore, fileLedger } from "./store";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "importer-store-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const drawing: Drawing = {
  repo: "Acme/Tiny",
  sha: "b".repeat(40),
  drawnAt: "2026-10-14T12:00:00.000Z",
  model: "claude-haiku-5-5",
  attempts: 1,
  cost: 0.02,
  // The store keeps a machine as it is; the engine checks it where it is drawn.
  machine: { code: "PRJ-000" } as Drawing["machine"],
};

describe("fileDrawingStore", () => {
  it("keeps a drawing per repository and commit, whatever the case of the name", async () => {
    const store = fileDrawingStore(dir);
    expect(await store.get("acme/tiny", drawing.sha)).toBeUndefined();
    await store.put(drawing);
    expect(await store.get("acme/tiny", drawing.sha)).toEqual(drawing);
    expect(await store.get("acme/tiny", "c".repeat(40))).toBeUndefined();
  });

  it("refuses a key that would climb out of its folder", async () => {
    const store = fileDrawingStore(dir);
    await expect(store.get("acme/..", drawing.sha)).rejects.toThrow(/Not a repository/);
    await expect(store.get("../etc/passwd", drawing.sha)).rejects.toThrow(/Not a repository/);
    await expect(store.get("acme/tiny", "../../x")).rejects.toThrow(/Not a repository/);
  });
});

describe("fileLedger", () => {
  it("adds up a day's cost, two drawings ending at once included", async () => {
    const ledger = fileLedger(dir);
    await Promise.all([ledger.add("2026-10-14", 0.02), ledger.add("2026-10-14", 0.03)]);
    expect(await ledger.spent("2026-10-14")).toBeCloseTo(0.05);
    expect(await ledger.spent("2026-10-15")).toBe(0);
    expect(await fileLedger(dir).spent("2026-10-14")).toBeCloseTo(0.05);
  });

  it("counts days in UTC", () => {
    expect(dayOf(new Date("2026-10-14T23:30:00-02:00"))).toBe("2026-10-15");
  });
});

describe("JobQueue", () => {
  it("runs jobs one at a time and reports where each one is", async () => {
    const queue = new JobQueue<string>({ maxWaiting: 2, keepFor: 1000 });
    let release = () => {};
    const id = queue.add(
      (report) =>
        new Promise((resolve) => {
          report("drawing", 2);
          release = () => resolve("drawn");
        }),
      () => "failed",
    );
    const second = queue.add(
      async () => "second",
      () => "failed",
    );
    await Promise.resolve();
    expect(queue.get(id)).toMatchObject({ stage: "drawing", attempt: 2 });
    expect(queue.get(second)?.stage).toBe("queued");
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queue.get(id)).toMatchObject({ stage: "done", result: "drawn" });
    expect(queue.get(second)).toMatchObject({ stage: "done", result: "second" });
  });

  it("runs as many jobs at once as it is told, the rest waiting in line", async () => {
    const queue = new JobQueue<string>({ concurrency: 2, maxWaiting: 2, keepFor: 1000 });
    const starts = (report: Report) => {
      report("reading");
      return new Promise<string>(() => {});
    };
    const ids = [
      queue.add(starts, () => ""),
      queue.add(starts, () => ""),
      queue.add(starts, () => ""),
    ];
    await Promise.resolve();
    expect(ids.map((id) => queue.get(id)?.stage)).toEqual(["reading", "reading", "queued"]);
    expect(queue.pending).toBe(3);
  });

  it("refuses work past its waiting room", () => {
    const queue = new JobQueue<string>({ maxWaiting: 1, keepFor: 1000 });
    const never = () => new Promise<string>(() => {});
    queue.add(never, () => "");
    queue.add(never, () => "");
    expect(() => queue.add(never, () => "")).toThrow(QueueFullError);
  });

  it("says what failed in the words it was given", async () => {
    const queue = new JobQueue<string>({ maxWaiting: 1, keepFor: 1000 });
    const id = queue.add(
      async () => {
        throw new Error("secret detail");
      },
      () => "Try again later.",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queue.get(id)).toMatchObject({ stage: "failed", error: "Try again later." });
  });
});

describe("VisitorLimit", () => {
  it("lets a visitor start a few drawings per window", () => {
    let now = 0;
    const limit = new VisitorLimit(2, 1000, () => now);
    expect(limit.take("a")).toBe(true);
    expect(limit.take("a")).toBe(true);
    expect(limit.take("a")).toBe(false);
    expect(limit.take("b")).toBe(true);
    now = 1001;
    expect(limit.take("a")).toBe(true);
  });
});
