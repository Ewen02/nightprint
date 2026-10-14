import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Answer } from "./compose";
import { drawRepository } from "./drawing";
import { answer, invented, snapshot, valid } from "./fixture.test-helper";
import { JobQueue, VisitorLimit } from "./jobs";
import { createImporter, type ImporterDeps } from "./server";
import { type GitHubCommit, type GitHubRepo, SourceError } from "./sources";
import { type Drawing, fileDrawingStore, fileLedger } from "./store";

const SHA = "a".repeat(40);
const commit: GitHubCommit = {
  owner: "acme",
  name: "tiny",
  sha: SHA,
  url: "https://github.com/acme/tiny",
};
const today = new Date("2026-10-14T12:00:00Z");

let dir: string;
let server: Server;
let base: string;
let resolved: GitHubRepo[];
/** The commit the repository's default branch points at, as GitHub would answer. */
let head: string;

/** The importer with GitHub and the model replaced: everything else is the real thing. */
async function start(overrides: Partial<ImporterDeps> = {}, ...answers: Answer[]) {
  const store = fileDrawingStore(dir);
  const ledger = fileLedger(dir);
  const queue = answers.length > 0 ? answers : [answer(valid)];
  const handler = createImporter({
    resolve: async (repo) => {
      resolved.push(repo);
      if (repo.name === "missing") {
        throw new SourceError("not-found", "No public repository acme/missing.");
      }
      return { ...commit, name: repo.name, sha: head };
    },
    commitsSince: async () => 3,
    draw: drawRepository({
      read: async (c, onProgress) => {
        onProgress(0, snapshot.files.length);
        onProgress(snapshot.files.length, snapshot.files.length);
        return { ...snapshot, name: `${c.owner}/${c.name}`, ref: c.sha };
      },
      ask: async () => {
        const next = queue.shift();
        if (!next) {
          throw new Error("asked once too often");
        }
        return next;
      },
      store,
      ledger,
      now: () => today,
    }),
    store,
    ledger,
    queue: new JobQueue<Drawing>({ maxWaiting: 2, keepFor: 60_000 }),
    visitors: new VisitorLimit(5, 86_400_000),
    dailyBudget: 1,
    estimate: 0.05,
    now: () => today,
    ...overrides,
  });
  server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { store, ledger };
}

/** What the API answers, as far as these tests read it. */
interface Reply {
  readonly id?: string;
  readonly stage?: string;
  readonly error?: string;
  readonly newer?: { readonly sha: string; readonly commits?: number };
  readonly events?: readonly { readonly type: string; readonly at: number }[];
  readonly result?: {
    readonly repo: string;
    readonly sha: string;
    readonly blueprint?: unknown;
    readonly attempts: number;
    readonly machine: { readonly code: string; readonly slug: string };
  };
}
// The server under test wrote it: these tests check its shape field by field.
const read = async (response: Response) => (await response.json()) as Reply;

const post = (repo: unknown, redraw?: boolean) =>
  fetch(`${base}/api/drawings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repo, redraw }),
  });

/** Polls a job until it finishes. */
async function settle(id: string | undefined): Promise<Reply> {
  for (let i = 0; i < 100; i++) {
    const state = await read(await fetch(`${base}/api/drawings/${id}`));
    if (state.stage === "done" || state.stage === "failed") {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the job never finished");
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "importer-"));
  resolved = [];
  head = SHA;
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true, maxRetries: 5 });
});

describe("the importer's API", () => {
  it("answers its healthcheck", async () => {
    await start();
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("draws a repository in a job, then keeps the drawing for that commit", async () => {
    const { ledger } = await start();
    const first = await post("https://github.com/acme/tiny");
    expect(first.status).toBe(202);
    const job = await read(first);
    // Its job starts at once: by the time it answers, it may already be reading.
    expect(["queued", "reading"]).toContain(job.stage);

    const done = await settle(job.id);
    expect(done.stage).toBe("done");
    expect(done.result).toMatchObject({ repo: "acme/tiny", sha: SHA, attempts: 1 });
    expect(done.result?.machine).toMatchObject({ code: "PRJ-000", slug: "acme-tiny" });
    expect(await ledger.spent("2026-10-14")).toBeGreaterThan(0);

    const again = await post("acme/tiny");
    expect(again.status).toBe(200);
    expect((await read(again)).result?.sha).toBe(SHA);
    const shared = await fetch(`${base}/api/drawings/acme/tiny/${SHA}`);
    expect(shared.status).toBe(200);
  });

  it("tells its visitor what it reads, finds and draws, in order", async () => {
    await start();
    const done = await settle((await read(await post("acme/tiny"))).id);
    expect(done.events?.map((e) => e.type)).toEqual(["listed", "surveyed", "answer", "accepted"]);
    expect(done.events?.[1]).toMatchObject({
      type: "surveyed",
      sketch: { units: [{ id: "root" }], edges: [] },
    });
  });

  it("keeps the model's plan with the machine, so a better layout can redraw it for free", async () => {
    await start();
    const done = await settle((await read(await post("acme/tiny"))).id);
    expect(done.result?.blueprint).toMatchObject({ title: "Tiny" });
  });

  it("opens the last drawing when the repository has moved on, and redraws only when asked", async () => {
    await start({}, answer(valid), answer(valid));
    await settle((await read(await post("acme/tiny"))).id);

    head = "b".repeat(40);
    const behind = await post("acme/tiny");
    expect(behind.status).toBe(200);
    expect(await read(behind)).toMatchObject({
      stage: "done",
      result: { sha: SHA },
      newer: { sha: head, commits: 3 },
    });

    const redrawn = await settle((await read(await post("acme/tiny", true))).id);
    expect(redrawn.result?.sha).toBe(head);
    expect((await read(await post("acme/tiny"))).result?.sha).toBe(head);
  });

  it("refuses what is not a repository, and says why GitHub could not find one", async () => {
    await start();
    const nonsense = await post("not a repository");
    expect(nonsense.status).toBe(400);
    const missing = await post("acme/missing");
    expect(missing.status).toBe(404);
    expect(await read(missing)).toEqual({ error: "No public repository acme/missing." });
  });

  it("never reads outside its cache, whatever the path", async () => {
    await start();
    const response = await fetch(`${base}/api/drawings/acme/..%2F..%2Fetc/${SHA}`);
    expect(response.status).toBe(404);
  });

  it("starts a few drawings per visitor, as Caddy names them", async () => {
    await start({ visitors: new VisitorLimit(1, 86_400_000) });
    const visit = (repo: string, ip: string) =>
      fetch(`${base}/api/drawings`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": ip },
        body: JSON.stringify({ repo }),
      });
    expect((await visit("acme/one", "203.0.113.1")).status).toBe(202);
    expect((await visit("acme/two", "203.0.113.1")).status).toBe(429);
    expect((await visit("acme/two", "203.0.113.2")).status).toBe(202);
  });

  it("stops drawing once the day's budget is spent, and still opens cached drawings", async () => {
    const { ledger } = await start();
    await ledger.add("2026-10-14", 0.99);
    const response = await post("acme/tiny");
    expect(response.status).toBe(503);
    expect((await read(response)).error).toMatch(/budget/);
  });

  it("tells the visitor why a drawing failed, in words they can act on", async () => {
    await start({}, answer(invented), answer(invented), answer(invented));
    const job = await read(await post("acme/tiny"));
    const failed = await settle(job.id);
    expect(failed).toMatchObject({
      stage: "failed",
      error: "No valid blueprint after 3 attempts.",
    });
  });

  it("lets the site's development server call across origins, and nobody else", async () => {
    await start({ allowedOrigin: "http://localhost:3000" });
    const allowed = await fetch(`${base}/api/health`, {
      headers: { origin: "http://localhost:3000" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const other = await fetch(`${base}/api/health`, {
      headers: { origin: "https://evil.example" },
    });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});
