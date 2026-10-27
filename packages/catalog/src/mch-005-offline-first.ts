import { defineMachine } from "@nightprint/engine";
import { type StepBody, variants } from "./variants";

/**
 * MCH-005 — Offline-first sync: a delivery app that saves on the phone first and syncs later.
 * References: Android Developers, "Build an offline-first app" (local source of truth, lazy
 * writes, sync with exponential backoff, last write wins); Android Developers, "Task
 * scheduling" (WorkManager: work persists across app restarts) and "Processes and app
 * lifecycle" (the system kills cached processes to reclaim memory); IETF draft "The
 * Idempotency-Key HTTP Header Field"; RFC 9110 §13.1.1 (If-Match and the lost update);
 * Kleppmann et al., "Local-first software", 2019. The network's 60 ms and the time spent
 * offline are modelled.
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3): the phone on the left, the app and its
 * database at the back, the outbox and the sync worker in front; the network in the middle,
 * crossed by one pipe; the server on the right, its API in front, its database behind it,
 * and the back office beside it.
 */

const BACK_Z = -1.4;
const FRONT_Z = 1.4;
const APP_X = -4.9;
const LOCAL_X = -2.6;
const API_X = 2.6;
const OFFICE_X = 4.9;

const IN_MEMORY = "outbox-in-memory";
const NO_KEY = "no-change-id";
const LAST_WINS = "last-arrival-wins";

const ACTOR = { type: "box", size: [1.3, 0.7, 1.0] } as const;
const SERVICE = { type: "box", size: [1.5, 0.75, 1.1] } as const;

export const offlineFirst = defineMachine({
  code: "MCH-005",
  slug: "offline-first-sync",
  title: "Offline-first sync",
  aliases: ["offline-first", "offline sync"],
  summary:
    "No signal in a basement, yet a payment must be recorded. An offline-first app saves each change on the phone first, and sends it once a network returns.",
  family: "mobile",
  category: "PATTERN",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-27",
  flowLabels: { request: "Read", write: "Change", response: "Answer", error: "Lost, doubled" },
  sources: [
    {
      label: "Android Developers, offline-first apps",
      url: "https://developer.android.com/topic/architecture/data-layer/offline-first",
    },
    {
      label: "Android Developers, WorkManager",
      url: "https://developer.android.com/develop/background-work/background-tasks/persistent",
    },
    {
      label: "Android Developers, process lifecycle",
      url: "https://developer.android.com/guide/components/activities/process-lifecycle",
    },
    {
      label: "IETF draft, Idempotency-Key header",
      url: "https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/",
    },
    {
      label: "RFC 9110, If-Match, 2022",
      url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match",
    },
    {
      label: "Kleppmann et al., Local-first software, 2019",
      url: "https://www.inkandswitch.com/essay/local-first/",
    },
  ],
  article: [
    "Offline-first is a way to build an app so that it works without a network: it reads and writes its own copy of the data on the device, and syncs that copy with a server when a network is there. Android's guide to offline-first apps makes the local database the app's source of truth: screens read only from it, and the network only ever updates it.",
    "A change made offline is written to the local database first and queued to be sent later, what the guide calls a lazy write. Here the queue is an outbox: a table in the same database, written in the same transaction as the change, so the two never disagree, and kept on disk, because the system can stop a background app's process at any time to reclaim memory. The system's scheduler, WorkManager on Android, runs the sync once a network is connected, even after the app was closed, and tries again with exponential backoff when it fails.",
    "A network can drop after the server has applied a change but before its answer arrives. The phone cannot tell, so it sends the change again: a change may arrive more than once. A unique ID made on the phone and sent with each change, as in the IETF's Idempotency-Key draft, lets the server recognise a repeat and answer it without applying it twice.",
    "While the phone is offline, someone else can change the same data on the server. Android's guide names last write wins as a common approach on mobile: each change carries the time it was made, and the server keeps the newer, silently discarding the other. Applying changes in the order they arrive is a different rule, and a worse one: a change made offline arrives late and erases newer work. Sending the version a change started from, with HTTP's If-Match, lets the server refuse a change made against an old version, so the conflict is seen and settled instead of lost.",
    "Local-first software, as Kleppmann and his co-authors described it in 2019, goes further: the copy on the device is the primary one, and concurrent changes merge by themselves with CRDTs. This machine shows the simpler and more common form, where the server holds the copy every phone shares. The 60 ms each way and the time spent offline are modelled.",
  ],
  glossary: [
    {
      term: "Offline-first",
      definition:
        "An app built to work without a network: it reads and writes its own copy on the phone, and syncs with the server when it can.",
      parts: ["app", "local-db"],
    },
    {
      term: "Source of truth",
      definition:
        "Where the app reads its data. Here the phone's database: screens never wait for the network. The server holds the copy every phone shares.",
      parts: ["local-db", "server-db"],
    },
    {
      term: "Outbox",
      definition:
        "The changes saved on the phone that the server has not confirmed yet, kept on disk, in the order they were made.",
      parts: ["outbox"],
    },
    {
      term: "Sync",
      definition:
        "Sending the outbox to the server and fetching what changed there, in the background, whenever a network is up.",
      parts: ["sync-worker", "api"],
    },
    {
      term: "Backoff",
      definition:
        "After a failed try, waiting longer before each new one, instead of hammering a server that cannot be reached.",
      parts: ["sync-worker"],
    },
    {
      term: "Idempotency key",
      definition:
        "An ID made on the phone for each change and sent with it. A server that sees the same ID twice applies the change once.",
      parts: ["sync-worker", "api"],
    },
    {
      term: "Conflict",
      definition:
        "Two sides changed the same thing without seeing each other's change. Someone must decide; the danger is that no one notices.",
      parts: ["api", "office"],
    },
    {
      term: "If-Match",
      definition:
        "Sent with a change: the version it started from. If the order is no longer at that version, the server refuses with 412 and writes nothing.",
      parts: ["api", "server-db"],
    },
  ],
  listing: [
    { id: "file", text: "// app · delivery.ts" },
    { id: "collect-fn", text: "async function collect(order, euros) {" },
    { id: "tx", text: "  await db.transaction(async (tx) => {" },
    { id: "local", text: "    await tx.payments.add(order, euros);" },
    { id: "outbox", text: "    await tx.outbox.add({ id: uuid()," },
    { id: "outbox-body", text: '      method: "POST", order, euros });' },
    { id: "tx-end", text: "  });" },
    { id: "collect-end", text: "}" },
    { id: "worker", text: "// sync worker · runs once online" },
    { id: "sync-fn", text: "async function sync() {" },
    { id: "changes", text: "  const changes = await db.outbox.all();" },
    { id: "loop", text: "  for (const c of changes) {" },
    { id: "send", text: "    const res = await api.send(c, {" },
    { id: "key", text: '      "Idempotency-Key": c.id,' },
    { id: "match", text: '      "If-Match": c.version }); // edits' },
    { id: "conflict", text: "    if (res.status === 412) pull(c);" },
    { id: "done", text: "    await db.outbox.delete(c.id);" },
    { id: "loop-end", text: "  }" },
    { id: "sync-end", text: "}" },
  ],
  stage: {
    plate: { size: [12.4, 5.6], center: [0, 0] },
    zones: [
      {
        id: "phone",
        label: "Phone",
        note: "Works with no signal",
        from: [-6.2, -2.8],
        to: [-1.4, 2.8],
      },
      {
        id: "network",
        label: "Network",
        note: "Patchy",
        // Only the band the pipe crosses: the name sits mid-plate, clear of the server's.
        from: [-1.4, -0.5],
        to: [1.4, 2.8],
      },
      {
        id: "server",
        label: "Server",
        note: "Shared by every phone",
        from: [1.4, -2.8],
        to: [6.2, 2.8],
      },
    ],
  },
  parts: [
    {
      id: "app",
      ref: 1,
      label: "Delivery app",
      role: "SCREEN",
      kind: "actor",
      shape: ACTOR,
      position: [APP_X, 0.35, BACK_Z],
      socket: [0, -0.05, 0],
      description:
        "The courier's app. Every screen reads the phone database and every tap writes it; none waits for the network.",
    },
    {
      id: "local-db",
      ref: 2,
      label: "Phone database",
      role: "LOCAL COPY",
      kind: "store",
      shape: { type: "cylinder", radius: 0.7, height: 1.0 },
      position: [LOCAL_X, 0.5, BACK_Z],
      socket: [0, -0.2, 0],
      description:
        "The phone's copy of today's deliveries and of what the courier did. The app reads only from here.",
    },
    {
      id: "outbox",
      ref: 3,
      label: "Outbox",
      role: "TO SEND",
      kind: "queue",
      shape: { type: "box", size: [1.4, 0.4, 0.7] },
      position: [APP_X, 0.2, FRONT_Z],
      socket: [0, 0.1, 0],
      description:
        "A table in the phone database: the changes the server has not confirmed yet, in the order they were made, each with an ID made on the phone.",
    },
    {
      id: "sync-worker",
      ref: 4,
      label: "Sync worker",
      role: "BACKGROUND",
      kind: "module",
      shape: SERVICE,
      position: [LOCAL_X, 0.375, FRONT_Z],
      socket: [0, -0.075, 0],
      description:
        "A background job the phone's system runs once a network is connected, even with the app closed. Sends the outbox one change at a time.",
    },
    {
      id: "api",
      ref: 5,
      label: "Server API",
      role: "SERVER",
      kind: "module",
      shape: SERVICE,
      position: [API_X, 0.375, FRONT_Z],
      socket: [0, -0.075, 0],
      description:
        "Receives every phone's changes. Applies a change once, by its ID, and only to the version it was made from.",
    },
    {
      id: "server-db",
      ref: 6,
      label: "Server database",
      role: "SHARED",
      kind: "store",
      shape: { type: "cylinder", radius: 0.75, height: 1.1 },
      position: [API_X, 0.55, BACK_Z],
      socket: [0, -0.25, 0],
      description:
        "Orders and payments as every phone and the back office see them, with a version on each order.",
    },
    {
      id: "office",
      ref: 7,
      label: "Back office",
      role: "STAFF",
      kind: "actor",
      shape: ACTOR,
      position: [OFFICE_X, 0.35, FRONT_Z],
      socket: [0, -0.05, 0],
      description: "Staff who change an order when a customer calls, through the same API.",
    },
  ],
  routes: [
    { id: "app-db", from: "app", to: "local-db", latencyMs: 1 },
    { id: "app-outbox", from: "app", to: "outbox" },
    { id: "outbox-worker", from: "outbox", to: "sync-worker" },
    { id: "worker-db", from: "sync-worker", to: "local-db", latencyMs: 1 },
    { id: "worker-api", from: "sync-worker", to: "api", latencyMs: 60 },
    { id: "api-db", from: "api", to: "server-db", latencyMs: 2 },
    { id: "office-api", from: "office", to: "api", latencyMs: 20 },
  ],
  actions: [
    {
      id: IN_MEMORY,
      label: "Keep the outbox in memory",
      description:
        "The payment is saved on disk, but the change to send waits in a list in the app's memory. When the system closes the app, the list goes with it.",
      effects: [
        { type: "patchPart", part: "outbox", set: { role: "IN MEMORY", flag: "violation" } },
        { type: "setLine", line: "outbox", text: "    queue.push({ id: uuid(), // memory" },
        { type: "setLine", line: "changes", text: "  const changes = queue; // in memory" },
        { type: "setLine", line: "done", text: "    queue.shift();" },
      ],
    },
    {
      id: NO_KEY,
      label: "Retry without a change ID",
      description:
        "The sync sends each change without its ID. When an answer is lost and the change is sent again, the server takes the copy for a new payment.",
      effects: [
        { type: "patchPart", part: "sync-worker", set: { flag: "violation" } },
        { type: "setLine", line: "key", text: "      // the change's ID is not sent" },
      ],
    },
    {
      id: LAST_WINS,
      label: "Let the last change to arrive win",
      description:
        "Changes go out without the version they started from, and the server applies whatever arrives last. A change made offline arrives late and erases newer ones.",
      effects: [
        { type: "patchPart", part: "api", set: { flag: "violation" } },
        { type: "setLine", line: "match", text: "      }); // no If-Match: last in wins" },
      ],
    },
  ],
  scenarios: [
    {
      id: "collect-offline",
      title: "Collect cash with no signal",
      steps: [
        {
          id: "open-list",
          title: "The list opens with no signal",
          lead: "No signal in the basement, yet the deliveries open at once: they are on the phone (local database).",
          body: "The courier opens today's deliveries. The app reads them from the phone's own database, filled at the depot this morning, and never waits for the network: every screen reads that database, with or without a signal.",
          focus: ["app", "local-db"],
          states: { app: "no signal", "local-db": "12 deliveries" },
          tokens: [{ flow: "request", path: ["app-db"] }],
          log: [
            {
              flow: "request",
              tag: "READ",
              text: "today's deliveries → 12, from the phone · no network",
            },
          ],
        },
        {
          id: "collect",
          title: "Order 42 paid, saved on the phone",
          lead: "30 € in cash: saved on the phone, with a note to send it, on disk too (outbox).",
          body: "The courier records order 42 as paid, 30 € in cash. In one transaction the app writes the payment to the phone's database and adds it to the outbox, the changes the server has not confirmed yet, with an ID made on the phone: 7f3a. Both are saved or neither, and the screen shows paid at once.",
          when: { none: [IN_MEMORY] },
          line: "outbox",
          focus: ["app", "local-db", "outbox"],
          states: { outbox: "1 change · ID 7f3a", "local-db": "order 42 · paid 30 €" },
          tokens: [
            { flow: "write", path: ["app-db"], label: "30€" },
            { flow: "write", path: ["app-outbox"], label: "30€" },
          ],
          log: [
            {
              flow: "write",
              tag: "SAVE",
              text: "payment 42 · 30 € + outbox change 7f3a, in one transaction",
            },
          ],
        },
        {
          id: "collect-memory",
          title: "Order 42 paid, the note in memory",
          lead: "30 € in cash: saved on the phone, but the note to send it lives in memory only.",
          body: "The courier records order 42 as paid, 30 € in cash. The app writes the payment to the phone's database, but the change to send goes into a list held in the app's memory, not on disk. The screen shows paid at once; nothing has failed yet.",
          when: { all: [IN_MEMORY] },
          line: "outbox",
          focus: ["app", "local-db", "outbox"],
          states: { outbox: "1 change · in memory", "local-db": "order 42 · paid 30 €" },
          tokens: [
            { flow: "write", path: ["app-db"], label: "30€" },
            { flow: "write", path: ["app-outbox"], label: "30€" },
          ],
          log: [
            {
              flow: "write",
              tag: "SAVE",
              text: "payment 42 · 30 € on disk · change 7f3a in memory",
            },
          ],
        },
        {
          id: "waits",
          title: "No network: the sync waits",
          lead: "Nothing can be sent yet. The phone will run the sync once a network is back.",
          body: "The app asks the phone's system to run the sync worker once a network is connected: WorkManager, on Android. Until then nothing is sent and nothing fails. The courier walks on to the next delivery.",
          line: "sync-fn",
          focus: ["sync-worker", "outbox"],
          states: { "sync-worker": "waiting for a network", outbox: "1 change waiting" },
          tokens: [{ flow: "write", at: "outbox", label: "30€" }],
          log: [
            {
              flow: "write",
              tag: "SYNC",
              text: "sync scheduled · runs when a network is connected",
            },
          ],
        },
        {
          id: "app-closed",
          title: "The phone closes the app",
          lead: "The phone closes the app to free memory. The note to send is on disk: still there.",
          body: "In the background, the system stops the app's process to free memory, as phones do. Nothing is lost: the payment and its outbox change are both in the phone's database, on disk, and the scheduled sync does not need the app open.",
          when: { none: [IN_MEMORY] },
          focus: ["app", "outbox"],
          states: { app: "closed by the system", outbox: "1 change · on disk" },
          tokens: [{ flow: "write", at: "outbox", label: "30€" }],
          log: [
            { flow: "write", tag: "OS", text: "app process stopped · outbox on disk: 1 change" },
          ],
        },
        {
          id: "app-closed-memory",
          title: "The phone closes the app, memory and all",
          lead: "The phone closes the app to free memory. The note to send was only in memory: gone.",
          body: "The system stops the app's process to free memory. The payment is still on disk, but the queued change lived in the app's memory and went with it. Nothing on the phone remembers that the server was never told.",
          when: { all: [IN_MEMORY] },
          focus: ["app", "outbox"],
          states: { outbox: "empty · change lost", app: "closed by the system" },
          tokens: [{ flow: "error", at: "outbox", label: "30€" }],
          log: [
            {
              flow: "error",
              tag: "OS",
              text: "app process stopped · the list in memory went with it",
            },
          ],
        },
        {
          id: "online",
          title: "Signal back: the sync starts",
          lead: "Back in the street, the phone finds a network and starts the sync, even with the app closed.",
          body: "Twenty minutes later there is a network. The system starts the sync worker by itself, the app still closed, and the worker reads the outbox: one change, ID 7f3a.",
          when: { none: [IN_MEMORY] },
          // Modelled: twenty minutes without a network.
          takesMs: 1_200_000,
          line: "changes",
          focus: ["sync-worker", "outbox"],
          states: { "sync-worker": "network up · syncing" },
          tokens: [{ flow: "write", path: ["outbox-worker"], label: "30€" }],
          log: [
            {
              flow: "write",
              tag: "SYNC",
              text: "network up · sync worker started · outbox: 1 change",
            },
          ],
        },
        {
          id: "online-empty",
          title: "Signal back: nothing to send",
          lead: "Signal back: the sync finds nothing to send, so the server never hears of the 30 €.",
          body: "Twenty minutes later the system starts the sync worker in a fresh process. Its list is empty. The phone says order 42 is paid, the server says it is not, and nothing will ever send the payment.",
          when: { all: [IN_MEMORY] },
          // Modelled: twenty minutes without a network.
          takesMs: 1_200_000,
          line: "changes",
          focus: ["sync-worker", "server-db"],
          states: { "sync-worker": "nothing to send", "server-db": "42 · unpaid" },
          tokens: [{ flow: "error", at: "sync-worker", label: "0" }],
          log: [
            {
              flow: "error",
              tag: "SYNC",
              text: "network up · nothing to send · server still says 42 unpaid",
            },
          ],
        },
        {
          id: "send",
          title: "Send it, with its ID",
          lead: "The phone sends the payment with its ID (idempotency key), so the server can spot a repeat.",
          body: "The worker sends POST /payments with the change, and its ID in an Idempotency-Key header. It sends one change at a time, in the order they were made.",
          when: { none: [IN_MEMORY, NO_KEY] },
          line: "key",
          focus: ["sync-worker", "api"],
          tokens: [{ flow: "write", path: ["worker-api"], label: "30€" }],
          log: [
            {
              flow: "write",
              tag: "HTTP",
              text: "POST /payments · order 42, 30 € · Idempotency-Key: 7f3a",
            },
          ],
        },
        {
          id: "send-no-key",
          title: "Send it, without its ID",
          lead: "The phone sends the payment without its ID: to the server, every copy will look new.",
          body: "The worker sends POST /payments with the change, but not its ID. Nothing goes wrong this time: the answer will arrive.",
          when: { all: [NO_KEY], none: [IN_MEMORY] },
          line: "key",
          focus: ["sync-worker", "api"],
          tokens: [{ flow: "write", path: ["worker-api"], label: "30€" }],
          log: [{ flow: "write", tag: "HTTP", text: "POST /payments · order 42, 30 € · no ID" }],
        },
        {
          id: "recorded",
          title: "The server records 30 €",
          lead: "The server records the 30 € and keeps the ID it came with.",
          body: "The API has never seen change 7f3a. It records the payment in the server database and keeps the ID with the answer it gives.",
          when: { none: [IN_MEMORY, NO_KEY] },
          line: "send",
          focus: ["api", "server-db"],
          states: { "server-db": "42 · paid 30 €" },
          tokens: [{ flow: "write", path: ["api-db"], label: "30€" }],
          log: [{ flow: "write", tag: "SQL", text: "INSERT payment · order 42, 30 € · key 7f3a" }],
        },
        {
          id: "recorded-no-key",
          title: "The server records 30 €",
          lead: "The server records the 30 €; with no ID, it keeps nothing to spot a repeat.",
          body: "The API records the payment in the server database. With no ID, nothing tells this payment from another of the same amount.",
          when: { all: [NO_KEY], none: [IN_MEMORY] },
          line: "send",
          focus: ["api", "server-db"],
          states: { "server-db": "42 · paid 30 €" },
          tokens: [{ flow: "write", path: ["api-db"], label: "30€" }],
          log: [{ flow: "write", tag: "SQL", text: "INSERT payment · order 42, 30 €" }],
        },
        {
          id: "confirmed",
          title: "Confirmed: the note is crossed out",
          lead: "The server says OK. The phone deletes the note to send: both sides agree on 30 €.",
          body: "201 Created comes back. Only then does the worker delete the change from the outbox. Phone and server now both say order 42 is paid, 30 €.",
          when: { none: [IN_MEMORY] },
          line: "done",
          focus: ["api", "sync-worker", "outbox"],
          states: { outbox: "empty · all confirmed" },
          tokens: [{ flow: "response", path: ["worker-api"], reverse: true, label: "201" }],
          log: [
            {
              flow: "response",
              tag: "HTTP",
              text: "← 201 Created · change deleted from the outbox",
            },
          ],
        },
      ],
    },
    {
      id: "lost-answer",
      title: "Lose the answer",
      steps: [
        ...variants("send-first", [NO_KEY], (on) => ({
          title: on(NO_KEY) ? "Send 30 €, without its ID" : "Send 30 €, with its ID",
          lead: on(NO_KEY)
            ? "Signal back, the phone sends the 30 € payment, without its ID."
            : "Signal back, the phone sends the 30 € payment with its ID (idempotency key).",
          body: `The courier collected 30 € for order 42 offline; now there is a network. The worker sends POST /payments ${
            on(NO_KEY)
              ? "with the change, but not its ID."
              : "with the change and its ID, 7f3a, in an Idempotency-Key header."
          }`,
          line: "key",
          focus: ["outbox", "sync-worker", "api"],
          states: { outbox: "1 change · 30 €" },
          tokens: [{ flow: "write", path: ["outbox-worker", "worker-api"], label: "30€" }],
          log: [
            {
              flow: "write",
              tag: "HTTP",
              text: on(NO_KEY)
                ? "POST /payments · order 42, 30 € · no ID"
                : "POST /payments · order 42, 30 € · Idempotency-Key: 7f3a",
            },
          ],
        })),
        ...variants("applied", [NO_KEY], (on) => ({
          title: "The server records it",
          lead: on(NO_KEY)
            ? "The server records the 30 € and sends back OK."
            : "The server records the 30 €, keeps the ID, and sends back OK.",
          body: on(NO_KEY)
            ? "The API records the payment in the server database and answers 201 Created."
            : "The API has never seen change 7f3a: it records the payment, keeps the ID with its answer, and answers 201 Created.",
          line: "send",
          focus: ["api", "server-db"],
          states: { "server-db": "42 · paid 30 €" },
          tokens: [{ flow: "write", path: ["api-db"], label: "30€" }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: on(NO_KEY)
                ? "INSERT payment · order 42, 30 €"
                : "INSERT payment · order 42, 30 € · key 7f3a",
            },
          ],
        })),
        {
          id: "lost",
          title: "The answer is lost in a tunnel",
          lead: "The signal drops on the way back: the OK never arrives. Did the payment get through?",
          body: "The van enters a tunnel and the 201 is lost on its way back. The worker cannot tell a request that never arrived from an answer that never came back, so it keeps the change and asks the system to run it again later, waiting longer after each failure (backoff).",
          line: "send",
          focus: ["sync-worker", "outbox"],
          states: { "sync-worker": "no answer · try again later", outbox: "1 change kept" },
          tokens: [{ flow: "error", at: "sync-worker", label: "?" }],
          log: [
            {
              flow: "error",
              tag: "HTTP",
              text: "no answer · timeout · change kept, retry with backoff",
            },
          ],
        },
        ...variants("retry", [NO_KEY], (on) => ({
          title: "Send it again",
          lead: on(NO_KEY)
            ? "Out of the tunnel, the phone sends the same payment again, and nothing says it is a repeat."
            : "Out of the tunnel, the phone sends the same payment again, with the same ID.",
          body: `Thirty seconds later the worker sends the change again, as it must: it never got an answer. ${
            on(NO_KEY)
              ? "Without its ID, the request looks like a new payment."
              : "The ID is the same, 7f3a."
          }`,
          // Modelled: the first wait of the backoff.
          takesMs: 30_000,
          line: "key",
          focus: ["sync-worker", "api"],
          tokens: [{ flow: "write", path: ["worker-api"], label: "30€" }],
          log: [
            {
              flow: "write",
              tag: "HTTP",
              text: on(NO_KEY)
                ? "POST /payments · order 42, 30 € · again, no ID"
                : "POST /payments · order 42, 30 € · Idempotency-Key: 7f3a, again",
            },
          ],
        })),
        ...variants(
          "repeat",
          [NO_KEY],
          (on): StepBody =>
            on(NO_KEY)
              ? {
                  title: "Recorded twice: 60 €",
                  lead: "Nothing tells the server it is a repeat: it records 30 € again. The books say 60 €.",
                  body: "The API sees a new payment and inserts a second row. The customer handed over 30 €; the books say 60 €, and tonight's cash count will come up 30 € short.",
                  line: "send",
                  focus: ["api", "server-db"],
                  states: { "server-db": "2 payments: 60 €" },
                  tokens: [{ flow: "error", path: ["api-db"], label: "30€" }],
                  log: [
                    {
                      flow: "error",
                      tag: "SQL",
                      text: "INSERT payment · order 42, 30 € · a second row: 60 €",
                    },
                  ],
                }
              : {
                  title: "Same ID: already done",
                  lead: "The server knows this ID: it records nothing new and gives its first answer again.",
                  body: "Change 7f3a is already recorded. The API writes nothing and answers as it did the first time: 201, with the same payment. The customer paid 30 € once, and the books say 30 €.",
                  line: "key",
                  focus: ["api", "server-db"],
                  states: { api: "7f3a seen · no write", "server-db": "42 · paid 30 €" },
                  tokens: [{ flow: "response", at: "api", label: "ID" }],
                  log: [
                    {
                      flow: "response",
                      tag: "KEY",
                      text: "key 7f3a already seen · nothing written · same answer",
                    },
                  ],
                },
        ),
        ...variants(
          "crossed-out",
          [NO_KEY],
          (on): StepBody => ({
            title: "The OK arrives",
            lead: on(NO_KEY)
              ? "The OK arrives: the phone deletes the note to send, sure all went well."
              : "The OK arrives: the phone deletes the note to send. 30 €, recorded once.",
            body: on(NO_KEY)
              ? "201 Created comes back for the second request, and the worker deletes the change from the outbox. Nothing on the phone or in its log says the server holds two payments."
              : "201 Created comes back, the same answer as the first time, and the worker deletes the change from the outbox. The payment was sent twice and recorded once.",
            line: "done",
            focus: on(NO_KEY)
              ? ["api", "sync-worker", "server-db"]
              : ["api", "sync-worker", "outbox"],
            states: on(NO_KEY) ? { "server-db": "60 € recorded" } : { outbox: "empty · sent once" },
            tokens: [
              {
                flow: on(NO_KEY) ? "error" : "response",
                path: ["worker-api"],
                reverse: true,
                label: "201",
              },
            ],
            log: [
              on(NO_KEY)
                ? {
                    flow: "error",
                    tag: "HTTP",
                    text: "← 201 Created · change deleted · the server holds 60 €",
                  }
                : {
                    flow: "response",
                    tag: "HTTP",
                    text: "← 201 Created · change deleted · 30 € recorded once",
                  },
            ],
          }),
        ),
      ],
    },
    {
      id: "both-sides",
      title: "Change it on both sides",
      steps: [
        {
          id: "nobody-home",
          title: "Nobody home: try tomorrow",
          lead: "Order 43, nobody home. Still offline, the courier moves it to tomorrow, on the phone.",
          body: "At 10:02 nobody answers the door for order 43. The courier, still without a signal, moves the delivery to tomorrow. The phone saves it and queues the change, noting the version of the order it started from: version 2.",
          focus: ["app", "local-db", "outbox"],
          states: { "local-db": "order 43 · tomorrow", outbox: "1 change · from version 2" },
          tokens: [
            { flow: "write", path: ["app-db"] },
            { flow: "write", path: ["app-outbox"], label: "v2" },
          ],
          log: [
            {
              flow: "write",
              tag: "SAVE",
              text: "order 43 · slot tomorrow · made from version 2, queued",
            },
          ],
        },
        {
          id: "office-moves",
          title: "The office moves it to 18:00",
          lead: "Meanwhile the customer calls the office: deliver tonight at 18:00. The server is now at version 3.",
          body: "At 10:05 the customer phones: they will be home tonight, at 18:00. Staff change the slot through the API, and order 43 goes from version 2 to version 3. The courier's phone, still offline, knows nothing of it.",
          // Modelled: three minutes after the courier's change.
          takesMs: 180_000,
          focus: ["office", "api", "server-db"],
          states: { "server-db": "43 · 18:00 · v3" },
          tokens: [{ flow: "write", path: ["office-api", "api-db"], label: "v3" }],
          log: [
            {
              flow: "write",
              tag: "HTTP",
              text: "office: PATCH /orders/43 · slot 18:00 → version 3",
            },
          ],
        },
        ...variants("sync-change", [LAST_WINS], (on) => ({
          title: "Signal back: the phone sends its change",
          lead: on(LAST_WINS)
            ? "Signal back, the phone sends “tomorrow” without saying which version it started from."
            : "Signal back, the phone sends “tomorrow”, saying it started from version 2 (If-Match).",
          body: on(LAST_WINS)
            ? "At 10:22 the worker sends PATCH /orders/43 with the new slot, and nothing about the version the courier saw."
            : 'At 10:22 the worker sends PATCH /orders/43 with the new slot and If-Match: "v2", the version the courier saw: change it only if it is still that one.',
          // Modelled: seventeen more minutes without a network.
          takesMs: 1_020_000,
          line: "match",
          focus: ["outbox", "sync-worker", "api"],
          tokens: [
            {
              flow: "write",
              path: ["outbox-worker", "worker-api"],
              ...(on(LAST_WINS) ? {} : { label: "v2" }),
            },
          ],
          log: [
            {
              flow: "write",
              tag: "HTTP",
              text: on(LAST_WINS)
                ? "PATCH /orders/43 · slot tomorrow"
                : 'PATCH /orders/43 · slot tomorrow · If-Match: "v2"',
            },
          ],
        })),
        {
          id: "refused",
          title: "Version 3, not 2: refused",
          lead: "The order is at version 3, not 2: the server refuses (412) instead of erasing 18:00.",
          body: "Order 43 changed after the courier saw it. The API writes nothing and answers 412 Precondition Failed: the office's 18:00 slot stays.",
          when: { none: [LAST_WINS] },
          line: "conflict",
          focus: ["api", "server-db", "sync-worker"],
          states: { api: "v3 ≠ v2 · refused" },
          tokens: [{ flow: "response", path: ["worker-api"], reverse: true, label: "412" }],
          log: [
            {
              flow: "response",
              tag: "HTTP",
              text: "← 412 Precondition Failed · order 43 is at version 3",
            },
          ],
        },
        {
          id: "pull",
          title: "The phone takes version 3",
          lead: "The phone fetches version 3 and tells the courier: the customer wants tonight, 18:00.",
          body: "The worker fetches order 43, writes version 3 into the phone's database and drops its own change. The app tells the courier what changed and who changed it. Here the app keeps the office's slot; another app could ask the courier to choose. Either way, the conflict is seen.",
          when: { none: [LAST_WINS] },
          line: "conflict",
          focus: ["sync-worker", "local-db", "app"],
          states: { app: "office moved it to 18:00", "local-db": "order 43 · 18:00 · v3" },
          tokens: [{ flow: "response", path: ["worker-db"], label: "v3" }],
          log: [
            {
              flow: "response",
              tag: "SYNC",
              text: "GET /orders/43 → version 3, 18:00 · courier told",
            },
          ],
        },
        {
          id: "overwritten",
          title: "The last to arrive wins",
          lead: "The server applies whatever arrives last: “tomorrow” erases 18:00, and no one is told.",
          body: "With no version to check, the API applies the change. It was made at 10:02, before the office's, but arrived at 10:22, after it: order 43 goes back to tomorrow, version 4.",
          when: { all: [LAST_WINS] },
          focus: ["api", "server-db"],
          states: { "server-db": "43 · tomorrow · v4" },
          tokens: [{ flow: "error", path: ["api-db"] }],
          log: [
            {
              flow: "error",
              tag: "SQL",
              text: "UPDATE order 43 · slot tomorrow · 18:00 overwritten",
            },
          ],
        },
        {
          id: "waits-in-vain",
          title: "The customer waits at 18:00",
          lead: "Everyone's screen says it worked. At 18:00 the customer waits at home for nothing.",
          body: "The phone gets 200 OK and deletes the change. The office's screen now says tomorrow, with no trace of the call. The customer stays in at 18:00; the parcel comes the next day.",
          when: { all: [LAST_WINS] },
          line: "done",
          focus: ["sync-worker", "api", "office"],
          tokens: [{ flow: "error", path: ["worker-api"], reverse: true, label: "200" }],
          log: [
            {
              flow: "error",
              tag: "HTTP",
              text: "← 200 OK · the 18:00 slot is gone, and no one was told",
            },
          ],
        },
      ],
    },
  ],
});
