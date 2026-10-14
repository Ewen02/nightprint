import type { IncomingMessage, ServerResponse } from "node:http";
import { ComposeError } from "./compose";
import { type JobQueue, QueueFullError, type Report, type VisitorLimit } from "./jobs";
import { type GitHubCommit, type GitHubRepo, parseGitHubRepo, SourceError } from "./sources";
import { type Drawing, type DrawingStore, dayOf, type Ledger } from "./store";

/**
 * The importer's HTTP API, behind Caddy on nightprint.dev/api:
 *
 *   GET  /api/health                         for the deployment's healthcheck
 *   POST /api/drawings { repo }              the drawing of a repository at its latest commit:
 *                                            at once when cached, else a job to follow
 *   GET  /api/drawings/<job id>              where that job is
 *   GET  /api/drawings/<owner>/<name>/<sha>  a cached drawing, for a shared link
 *
 * A new drawing costs model tokens: each visitor starts a few a day, and all of them
 * together stay under a daily budget.
 */

export interface ImporterDeps {
  readonly resolve: (repo: GitHubRepo) => Promise<GitHubCommit>;
  readonly draw: (commit: GitHubCommit, report: Report) => Promise<Drawing>;
  readonly store: DrawingStore;
  readonly ledger: Ledger;
  readonly queue: JobQueue<Drawing>;
  readonly visitors: VisitorLimit;
  /** Dollars the model may cost in a UTC day. */
  readonly dailyBudget: number;
  /** Dollars set aside for each drawing not finished yet. */
  readonly estimate: number;
  /** An origin allowed to call across sites, for a site served elsewhere in development. */
  readonly allowedOrigin?: string | undefined;
  readonly now?: () => Date;
  readonly log?: (event: Record<string, unknown>) => void;
}

const MAX_BODY = 2048;
const JOB_ID = /^[0-9a-f-]{36}$/;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const SOURCE_STATUS: Record<SourceError["reason"], number> = {
  "not-found": 404,
  private: 403,
  "too-big": 413,
  "rate-limited": 503,
  unreadable: 502,
  empty: 422,
};

async function readBody(request: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > MAX_BODY) {
      throw new HttpError(413, "The request is too large.");
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "The request is not JSON.");
  }
}

/** The visitor, as Caddy saw it: the container is reachable through Caddy alone. */
function visitorOf(request: IncomingMessage): string {
  const real = request.headers["x-real-ip"];
  return (Array.isArray(real) ? real[0] : real) ?? request.socket.remoteAddress ?? "unknown";
}

export function createImporter(deps: ImporterDeps) {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});
  /** The job drawing each repository commit, so two visitors asking at once share one. */
  const inFlight = new Map<string, string>();

  const startDrawing = async (request: IncomingMessage) => {
    const body = await readBody(request);
    const input =
      typeof body === "object" && body !== null && "repo" in body && typeof body.repo === "string"
        ? body.repo
        : undefined;
    const repo = input === undefined ? undefined : parseGitHubRepo(input);
    if (!repo) {
      throw new HttpError(400, "Give a GitHub repository: owner/name or its address.");
    }
    const commit = await deps.resolve(repo);
    const key = `${commit.owner}/${commit.name}`;
    const cached = await deps.store.get(key, commit.sha);
    if (cached) {
      return { status: 200, body: { stage: "done", result: cached } };
    }
    const running = inFlight.get(`${key}@${commit.sha}`);
    const runningState = running === undefined ? undefined : deps.queue.get(running);
    if (
      running &&
      runningState &&
      runningState.stage !== "done" &&
      runningState.stage !== "failed"
    ) {
      return { status: 202, body: runningState };
    }
    const spent = await deps.ledger.spent(dayOf(now()));
    if (spent + (deps.queue.pending + 1) * deps.estimate > deps.dailyBudget) {
      throw new HttpError(503, "Today's drawing budget is spent; cached drawings still open.");
    }
    if (!deps.visitors.take(visitorOf(request))) {
      throw new HttpError(429, "You have drawn enough repositories for today; try tomorrow.");
    }
    const started = Date.now();
    const id = deps.queue.add(
      async (report) => {
        const drawing = await deps.draw(commit, report);
        log({
          event: "drawn",
          repo: key,
          sha: commit.sha,
          attempts: drawing.attempts,
          cost: drawing.cost,
          seconds: Math.round((Date.now() - started) / 1000),
        });
        return drawing;
      },
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        log({ event: "failed", repo: key, sha: commit.sha, error: message });
        // Our own errors speak to the visitor; anything else stays in the log.
        return error instanceof SourceError || error instanceof ComposeError
          ? message
          : "Something went wrong while drawing; try again later.";
      },
    );
    inFlight.set(`${key}@${commit.sha}`, id);
    log({ event: "queued", repo: key, sha: commit.sha, id });
    return { status: 202, body: deps.queue.get(id) };
  };

  const route = async (request: IncomingMessage) => {
    const url = new URL(request.url ?? "/", "http://importer");
    const parts = url.pathname.replace(/\/+$/, "").split("/").slice(1);
    if (parts[0] !== "api") {
      throw new HttpError(404, "Not found.");
    }
    if (request.method === "GET" && parts.length === 2 && parts[1] === "health") {
      return { status: 200, body: { ok: true } };
    }
    if (parts[1] !== "drawings") {
      throw new HttpError(404, "Not found.");
    }
    if (request.method === "POST" && parts.length === 2) {
      return startDrawing(request);
    }
    if (request.method === "GET" && parts.length === 3 && JOB_ID.test(parts[2] ?? "")) {
      const state = deps.queue.get(parts[2] ?? "");
      if (!state) {
        throw new HttpError(404, "No such drawing in progress; it may have finished long ago.");
      }
      return { status: 200, body: state };
    }
    if (request.method === "GET" && parts.length === 5) {
      const [, , owner = "", name = "", sha = ""] = parts;
      const drawing = await deps.store.get(`${owner}/${name}`, sha).catch(() => undefined);
      if (!drawing) {
        throw new HttpError(404, "This repository has not been drawn at this commit.");
      }
      return { status: 200, body: { stage: "done", result: drawing } };
    }
    throw new HttpError(404, "Not found.");
  };

  return async (request: IncomingMessage, response: ServerResponse) => {
    const origin = request.headers.origin;
    if (deps.allowedOrigin && origin === deps.allowedOrigin) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("access-control-allow-methods", "GET, POST");
      response.setHeader("access-control-allow-headers", "content-type");
      response.setHeader("vary", "origin");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    let status: number;
    let body: unknown;
    try {
      ({ status, body } = await route(request));
    } catch (error) {
      if (error instanceof HttpError) {
        ({ status, body } = { status: error.status, body: { error: error.message } });
      } else if (error instanceof SourceError) {
        ({ status, body } = {
          status: SOURCE_STATUS[error.reason],
          body: { error: error.message },
        });
      } else if (error instanceof QueueFullError) {
        ({ status, body } = { status: 503, body: { error: error.message } });
      } else {
        log({ event: "error", error: error instanceof Error ? error.message : String(error) });
        ({ status, body } = { status: 500, body: { error: "Something went wrong." } });
      }
    }
    response.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(body));
  };
}
