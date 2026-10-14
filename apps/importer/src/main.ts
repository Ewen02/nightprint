import { createServer } from "node:http";
import { claudeAsk } from "./compose";
import { drawRepository } from "./drawing";
import { JobQueue, VisitorLimit } from "./jobs";
import { createImporter } from "./server";
import { commitsSince, readGitHubAt, resolveGitHub } from "./sources";
import { type Drawing, fileDrawingStore, fileLedger } from "./store";

/**
 * The importer's server. Configuration comes from the environment, documented in
 * `.env.example`; only ANTHROPIC_API_KEY is required.
 */

const env = process.env;
if (!env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}
const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) ? parsed : fallback;
};

const dataDir = env.DATA_DIR ?? "/data";
const github = { token: env.GITHUB_TOKEN };
const store = fileDrawingStore(dataDir);
const ledger = fileLedger(dataDir);
const log = (event: Record<string, unknown>) =>
  console.log(JSON.stringify({ at: new Date().toISOString(), ...event }));

const handler = createImporter({
  resolve: (repo) => resolveGitHub(repo, github),
  commitsSince: (commit, base) => commitsSince(commit, base, github),
  draw: drawRepository({
    read: (commit) => readGitHubAt(commit, github),
    ask: claudeAsk(),
    store,
    ledger,
  }),
  store,
  ledger,
  queue: new JobQueue<Drawing>({ concurrency: 2, maxWaiting: 5, keepFor: 60 * 60 * 1000 }),
  visitors: new VisitorLimit(number(env.DRAWINGS_PER_VISITOR, 5), 24 * 60 * 60 * 1000),
  dailyBudget: number(env.DAILY_BUDGET_USD, 1),
  estimate: number(env.DRAWING_ESTIMATE_USD, 0.05),
  allowedOrigin: env.ALLOWED_ORIGIN,
  log,
});

const port = number(env.PORT, 3000);
const server = createServer((request, response) => {
  void handler(request, response);
});
server.listen(port, () => log({ event: "listening", port, dataDir }));
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
