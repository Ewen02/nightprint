import { defineMachine } from "@nightprint/engine";
import { type StepBody, variants } from "./variants";

/**
 * FMD-001 — Retry storm: retries that pile load on a struggling database until the retries
 * alone keep it down. A failure mode: the scenario is the failure, the switches repair it.
 * References: M. Ulrich, "Addressing Cascading Failures", and A. Forero Cuervo, "Handling
 * Overload", Site Reliability Engineering, 2016 (64 attempts from 3 retries at 3 layers,
 * retry budgets); M. Brooker, "Exponential Backoff And Jitter", 2015; M. Fowler,
 * "CircuitBreaker", 2014; N. Bronson et al., "Metastable Failures in Distributed Systems",
 * HotOS 2021. The loads, the capacity and the timeouts are modelled.
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3): the shop app on the left, the API and
 * the orders service in the middle, the database on the right with the report job in front
 * of it. The circuit breaker waits on the bench until its switch puts it in the line.
 */

const PIPE_Y = 0.3;
const LINE_Z = 0;
const FRONT_Z = 2.2;
const APP_X = -5.0;
const API_X = -2.4;
const SERVICE_X = 0;
const BREAKER_X = 1.9;
const DB_X = 3.8;

const JITTER = "backoff-jitter";
const BUDGET = "retry-budget";
const BREAKER = "circuit-breaker";

const retryStep = variants("retries", [BUDGET, JITTER], (on): StepBody => {
  if (on(BUDGET)) {
    return {
      title: "One layer retries, within a budget",
      lead: "Only the service retries, within a 10% budget: the database sees 1.1 times the load.",
      body: `Only the orders service retries, the layer right above the database, and only while retries stay under 10% of its requests; the API and the app pass the failure on.${on(JITTER) ? " Each retry first waits a random, growing time." : ""} The database sees about 1.1 times the load: 275 queries a second instead of 250.`,
      focus: ["service", "db"],
      meter: 275,
      states: { db: "slow · 275 queries/s" },
      tokens: [{ flow: "write", path: ["service-db"], label: "10%" }],
      log: [
        {
          flow: "write",
          tag: "RETRY",
          text: "service only, retries ≤ 10% of requests → 1.1× the load",
        },
      ],
    };
  }
  return {
    title: on(JITTER) ? "Every layer retries, spread out" : "Every layer retries, at once",
    lead: on(JITTER)
      ? "Every layer retries 3 times, spread out by jitter: still up to 64 attempts per click."
      : "Every layer retries 3 times: one click becomes up to 64 attempts on the database.",
    body: on(JITTER)
      ? "The service retries its query 3 times, the API retries the service 3 times, the app retries the API 3 times. Each retry first waits a random time, up to a cap that doubles with every attempt, so retries stop arriving in waves. There are just as many: up to 64 attempts on the database for one click."
      : "The service retries its query 3 times, the API retries the service 3 times, the app retries the API 3 times. One click becomes up to 64 attempts on the database, 4 × 4 × 4, and the failed ones come back at the same moments.",
    focus: ["app", "api", "service", "db"],
    meter: 16000,
    states: { db: "up to 64× the load" },
    // One click, retried at each layer: 4 attempts on the API, 16 on the service, 64 on the database.
    tokens: [
      { flow: "error", path: ["app-api"], label: "×4" },
      { flow: "error", path: ["api-service"], label: "×16" },
      { flow: "error", path: ["service-db"], label: "×64" },
    ],
    log: [
      {
        flow: "error",
        tag: "RETRY",
        text: on(JITTER)
          ? "3 retries at 3 layers, backoff + jitter → spread out, still up to 64"
          : "3 retries at 3 layers → up to 64 attempts per click",
      },
    ],
  };
});

const databaseStep = variants("database", [BREAKER, BUDGET], (on): StepBody => {
  if (on(BREAKER)) {
    return {
      title: "The breaker opens",
      lead: "After 5 failures the breaker opens: calls fail at once, and the database gets a rest.",
      body: `After 5 failures in a row, the breaker opens. Calls now fail at once, without reaching the database: shoppers get an error straight away instead of a long wait, and the database only has the report to finish.${on(BUDGET) ? "" : " The layers above still retry, and every attempt stops at the breaker."}`,
      focus: ["service", "breaker", "db"],
      meter: 0,
      states: { breaker: "open", db: "only the report" },
      tokens: [{ flow: "error", path: ["service-breaker"], label: "5" }],
      log: [{ flow: "error", tag: "OPEN", text: "5 failures → breaker open · calls fail fast" }],
    };
  }
  if (on(BUDGET)) {
    return {
      title: "Slow, but not buried",
      lead: "The database is still slow, but no longer buried under retries.",
      body: "The database is still slow while the report runs, and some orders still time out. But the load on it stays near normal: it is not buried under retries.",
      focus: ["db"],
      meter: 275,
      states: { db: "slow · not overloaded" },
      tokens: [{ flow: "write", at: "db", label: "275" }],
      log: [{ flow: "write", tag: "DB", text: "275 queries/s on a slow database · some timeouts" }],
    };
  }
  return {
    title: "The database drowns",
    lead: "Queries pile up faster than the database answers: every one times out.",
    body: "Queries arrive far faster than the slowed database answers them. Every one now times out, orders that never needed a retry included, and each timeout sends more retries.",
    focus: ["db"],
    meter: 16000,
    states: { db: "overloaded · 0 orders/s" },
    tokens: [{ flow: "error", at: "db", label: "×64" }],
    log: [
      { flow: "error", tag: "DB", text: "queue grows · every query times out · 0 orders placed" },
    ],
  };
});

const causeGoneStep = variants("cause-gone", [BREAKER, BUDGET, JITTER], (on): StepBody => {
  if (on(BREAKER)) {
    return {
      title: "A trial call, then the breaker closes",
      lead: "The report stops; one trial call succeeds, and the breaker closes.",
      body: "Someone stops the report. After its pause the breaker lets one trial call through: it is answered in 20 ms, so the breaker closes and calls reach the database again.",
      focus: ["service", "breaker", "db"],
      meter: 250,
      states: { breaker: "closed", db: "20 ms again", report: "stopped" },
      tokens: [{ flow: "response", path: ["service-db"], label: "1" }],
      log: [
        {
          flow: "response",
          tag: "CLOSE",
          text: "report stopped · half-open: trial call OK → closed",
        },
      ],
    };
  }
  if (on(BUDGET)) {
    return {
      title: "The report stops, the database catches up",
      lead: "The report stops, and with the load near normal the database catches up.",
      body: "Someone stops the report. With the load near normal, the database drains its queue and answers in 20 ms again.",
      focus: ["db"],
      meter: 250,
      states: { db: "20 ms again", report: "stopped" },
      tokens: [{ flow: "response", at: "db" }],
      log: [{ flow: "response", tag: "DB", text: "report stopped · queue drained · 20 ms again" }],
    };
  }
  return {
    title: "The cause is gone, the outage is not",
    lead: "The report stops, but the retries alone keep the database above capacity.",
    body: `Someone stops the report, and the database is as fast as before. It stays overloaded: the retries already sent, and the ones their timeouts trigger, keep it above 300 queries a second. The retries now keep the failure going on their own.${on(JITTER) ? " Jitter spread them out; it did not make them fewer." : ""}`,
    focus: ["db"],
    meter: 16000,
    states: { db: "still overloaded", report: "stopped" },
    tokens: [{ flow: "error", at: "db", label: "×64" }],
    log: [
      { flow: "error", tag: "DB", text: "report stopped · still > 300 queries/s · still down" },
    ],
  };
});

const endStep = variants(
  "end",
  [BREAKER, BUDGET],
  (on): StepBody =>
    on(BREAKER) || on(BUDGET)
      ? {
          title: "Orders flow again",
          lead: "Orders flow again: 250 a second, answered in 20 ms.",
          body: "250 orders a second, answered in 20 ms. The fix did not stop the slow query; it kept the slowdown from turning into an outage that outlives it.",
          focus: ["app", "api", "service", "db"],
          meter: 250,
          states: { db: "250 / 300 queries/s" },
          tokens: [
            { flow: "response", path: ["app-api", "api-service", "service-db"], reverse: true },
          ],
          log: [{ flow: "response", tag: "HTTP", text: "201 Created · 250 orders/s · 20 ms" }],
        }
      : {
          title: "Still down",
          lead: "Still down: only cutting the load far below normal brings it back.",
          body: "Getting out takes what the research on these failures calls a strong push: cut the load well below normal, or stop the retries. Until then, no order gets through.",
          focus: ["app", "db"],
          meter: 16000,
          states: { app: "every order fails" },
          tokens: [
            { flow: "error", path: ["app-api", "api-service", "service-db"], reverse: true },
          ],
          log: [
            {
              flow: "error",
              tag: "HTTP",
              text: "503 · 0 orders/s · recovery needs load far below normal",
            },
          ],
        },
);

export const retryStorm = defineMachine({
  code: "FMD-001",
  slug: "retry-storm",
  title: "Retry storm",
  aliases: ["retry amplification"],
  summary:
    "A slow database makes callers time out and retry; retried at every layer, one click becomes 64 attempts, and the outage outlives its cause.",
  family: "infra",
  category: "FAILURE MODE",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-18",
  flowLabels: { request: "Order", write: "Retry", response: "Answer", error: "Timeout, flood" },
  // Modelled: 250 orders a second against a 300-query capacity, up to 64 times that in the storm.
  meter: { label: "Load on the database", unit: "queries/s", capacity: 300 },
  sources: [
    {
      label: "SRE book, Addressing Cascading Failures",
      url: "https://sre.google/sre-book/addressing-cascading-failures/",
    },
    {
      label: "SRE book, Handling Overload",
      url: "https://sre.google/sre-book/handling-overload/",
    },
    {
      label: "M. Brooker, Exponential Backoff And Jitter, 2015",
      url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
    },
    {
      label: "M. Fowler, CircuitBreaker, 2014",
      url: "https://martinfowler.com/bliki/CircuitBreaker.html",
    },
    {
      label: "N. Bronson et al., HotOS 2021",
      url: "https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf",
    },
  ],
  article: [
    "A retry storm is a failure in which retries, meant to ride out a brief error, add load to a service that is already struggling, until the retries alone keep it down. It starts with a trigger, here a slow query that makes the database answer late: callers time out and retry, and each retry is more work for a database that could not keep up in the first place.",
    "Retries multiply across layers. The Site Reliability Engineering book gives the case of a backend, a frontend and a JavaScript client each retrying 3 times: a single user action may create 64 attempts on the database. It recommends retrying at one layer only, capping a request at 3 attempts, and keeping retries under 10% of a client's requests, which bounds the extra load to about 1.1 times.",
    "Exponential backoff makes each new attempt wait longer, and jitter makes that wait random, so callers that failed together do not come back together. Marc Brooker showed that backoff without jitter still sends calls in clusters. Neither changes how many attempts there are: they spread them over time.",
    "A circuit breaker, as Martin Fowler describes it, sits before a call and counts failures. Past a threshold it opens, and calls fail at once without being made, which spares the struggling service; after a pause it lets a trial call through, and closes if the call succeeds. Callers get an error, or stale data, straight away instead of a long wait.",
    "The outage can outlive its cause. Nathan Bronson and colleagues call these metastable failures: once the retries keep the load above capacity, stopping the trigger is not enough, and recovery needs a strong push, such as cutting the load well below normal. The loads, the capacity and the timeouts on this machine are modelled.",
  ],
  glossary: [
    {
      term: "Retry storm",
      definition:
        "Retries that add load to a struggling service faster than it can shed it, until the retries alone keep it down.",
      parts: ["db"],
    },
    {
      term: "Retry amplification",
      definition:
        "Retries at several layers multiply: 3 retries at each of 3 layers make up to 64 attempts for one click.",
      parts: ["app", "api", "service"],
    },
    {
      term: "Timeout",
      definition:
        "How long a caller waits before giving up. The callee may still do the work: it is then wasted.",
      parts: ["service"],
    },
    {
      term: "Exponential backoff",
      definition: "Waiting longer before each new attempt, the delay doubling up to a cap.",
      parts: ["app", "api", "service"],
    },
    {
      term: "Jitter",
      definition:
        "A random part in that wait, so callers that failed together do not retry together.",
      parts: ["service"],
    },
    {
      term: "Retry budget",
      definition:
        "A limit on retries: at most 3 attempts for a request, and retries under 10% of a client's requests.",
      parts: ["service"],
    },
    {
      term: "Circuit breaker",
      definition:
        "Sits before a call. After enough failures it opens and fails calls at once; after a pause it lets one trial call through.",
      parts: ["breaker"],
    },
    {
      term: "Metastable failure",
      definition:
        "A failure that outlives its cause: a trigger pushes the system into a bad state, and its own load, here the retries, keeps it there.",
      parts: ["db"],
    },
  ],
  stage: {
    plate: { size: [11.4, 5.2], center: [-0.7, 0.85] },
    zones: [
      {
        id: "shoppers",
        label: "Shoppers",
        note: "Click Place order",
        from: [-6.2, -1.5],
        to: [-3.6, 3.2],
      },
      {
        id: "services",
        label: "Services",
        note: "Each one can retry",
        from: [-3.6, -1.5],
        to: [2.8, 3.2],
      },
      {
        id: "storage",
        label: "Database",
        note: "300 queries a second",
        from: [2.8, -1.5],
        to: [4.8, 3.2],
      },
    ],
  },
  parts: [
    {
      id: "app",
      ref: 1,
      label: "Shop app",
      role: "CLIENT",
      kind: "actor",
      shape: { type: "box", size: [1.3, 0.7, 1.0] },
      position: [APP_X, 0.35, LINE_Z],
      socket: [0, -0.05, 0],
      description: "The shop in a browser. Retries a failed order up to 3 times.",
    },
    {
      id: "api",
      ref: 2,
      label: "API",
      role: "FRONTEND",
      kind: "module",
      shape: { type: "box", size: [1.4, 0.7, 1.0] },
      position: [API_X, 0.35, LINE_Z],
      socket: [0, -0.05, 0],
      description: "Receives the orders. Retries the orders service up to 3 times.",
    },
    {
      id: "service",
      ref: 3,
      label: "Orders service",
      role: "BACKEND",
      kind: "module",
      shape: { type: "box", size: [1.6, 0.75, 1.1] },
      position: [SERVICE_X, 0.375, LINE_Z],
      socket: [0, -0.075, 0],
      description: "Writes each order to the database. Retries a failed query up to 3 times.",
    },
    {
      id: "db",
      ref: 4,
      label: "Database",
      role: "DATABASE",
      kind: "store",
      shape: { type: "cylinder", radius: 0.7, height: 1.1 },
      position: [DB_X, 0.55, LINE_Z],
      socket: [0, -0.25, 0],
      description: "Answers in 20 ms and takes up to 300 queries a second. It gets 250.",
    },
    {
      id: "report",
      ref: 5,
      label: "Report job",
      role: "TRIGGER",
      kind: "module",
      shape: { type: "box", size: [1.3, 0.6, 0.9] },
      position: [DB_X, 0.3, FRONT_Z],
      description: "Runs a heavy query on the same database: the cause of the slowdown.",
    },
    {
      id: "breaker",
      ref: 6,
      label: "Circuit breaker",
      role: "SPARE",
      kind: "configurator",
      shape: { type: "box", size: [0.9, 0.45, 0.8] },
      position: [BREAKER_X, 0.225, FRONT_Z],
      socket: [0, 0.075, 0],
      description:
        "Counts failed calls. Open, it fails calls at once without making them; after a pause it lets one trial call through.",
    },
  ],
  routes: [
    { id: "app-api", from: "app", to: "api" },
    { id: "api-service", from: "api", to: "service" },
    { id: "service-db", from: "service", to: "db", latencyMs: 20 },
    { id: "report-db", from: "report", to: "db" },
  ],
  actions: [
    {
      id: JITTER,
      label: "Back off with jitter",
      description:
        "Each retry waits a random time, up to a cap that doubles with every attempt. Retries stop arriving in waves; there are just as many.",
    },
    {
      id: BUDGET,
      label: "Retry at one layer, within a budget",
      description:
        "Only the service next to the database retries, and only while retries stay under 10% of its requests. The database sees 1.1 times the load, not 64.",
    },
    {
      id: BREAKER,
      label: "Put a circuit breaker before the database",
      description:
        "After 5 failures in a row it opens: calls fail at once without reaching the database. After a pause it lets one trial call through.",
      effects: [
        {
          type: "patchPart",
          part: "breaker",
          set: { position: [BREAKER_X, 0.225, LINE_Z], role: "BREAKER" },
        },
        { type: "addRoute", route: { id: "service-breaker", from: "service", to: "breaker" } },
      ],
    },
  ],
  scenarios: [
    {
      id: "slow-query",
      title: "A slow query",
      steps: [
        {
          id: "normal",
          title: "Orders flow",
          lead: "250 orders a second reach a database that can take 300.",
          body: "Shoppers place orders through the shop app. Each one goes through the API and the orders service to the database, which answers in 20 ms and can take 300 queries a second. It gets 250.",
          focus: ["app", "api", "service", "db"],
          meter: 250,
          states: { db: "250 / 300 queries/s", report: "idle", app: "orders go through" },
          tokens: [{ flow: "request", path: ["app-api", "api-service", "service-db"] }],
          log: [
            {
              flow: "request",
              tag: "HTTP",
              text: "POST /orders → API → orders service → database",
            },
          ],
        },
        {
          id: "trigger",
          title: "A report slows the database",
          lead: "A report's heavy query makes every query wait: 1.5 s instead of 20 ms.",
          body: "A report job starts a heavy query on the same database. Every query now waits behind it: answers take 1.5 s instead of 20 ms.",
          focus: ["report", "db"],
          meter: 250,
          states: { db: "slow · 1.5 s a query", report: "heavy query" },
          tokens: [{ flow: "error", path: ["report-db"] }],
          log: [
            {
              flow: "error",
              tag: "SQL",
              text: "report: SELECT … over every order · queries now take 1.5 s",
            },
          ],
        },
        {
          id: "timeout",
          title: "The service gives up after 1 s",
          lead: "After 1 s the service gives up, and so does every layer above it.",
          body: "The orders service waits 1 s for the database, then gives up. The API, waiting on the service, gives up too, and so does the app. The database may still finish the query: that work is wasted.",
          // Modelled: the service's timeout.
          takesMs: 1000,
          focus: ["service", "db"],
          meter: 250,
          tokens: [{ flow: "error", path: ["service-db"], label: "1s" }],
          log: [
            { flow: "error", tag: "TIME", text: "orders service → database: timeout after 1 s" },
          ],
        },
        ...retryStep,
        ...databaseStep,
        ...causeGoneStep,
        ...endStep,
      ],
    },
  ],
});
