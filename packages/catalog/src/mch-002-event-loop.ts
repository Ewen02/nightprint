import { defineMachine } from "@nightprint/engine";

/**
 * MCH-002 — The JavaScript event loop in a browser.
 * References: WHATWG HTML, "Event loops" (8.1.7) and "Timers" (8.6); J. Archibald, "Tasks,
 * microtasks, queues and schedules", 2015; W3C Long Tasks API (the 50 ms threshold).
 *
 * The script the scenario runs:
 *
 *   console.log("A");
 *   setTimeout(() => console.log("B"), 0);
 *   Promise.resolve().then(() => console.log("C"));
 *   console.log("D");
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3): the event loop is the hub in the
 * middle, the call stack on its left, the task queue behind it and the microtask queue in
 * front, rendering on its right; timers wait in parallel, in their own zone on the far left.
 * Every route meets a part at its centre, so a queue's two routes run along its top like a
 * conveyor.
 */

const PIPE_Y = 0.3;
const LANE = 1.0;
const BACK = -1.4;
const FRONT = 3.2;
const STACK_X = -0.4;
const LOOP_X = 2.6;
const TIMER_X = -3.4;

const BLOCK = "block-stack";
const ENDLESS = "endless-microtasks";
const TIMEOUTS = "timeouts-forever";

export const eventLoop = defineMachine({
  code: "MCH-002",
  slug: "javascript-event-loop",
  title: "JavaScript event loop",
  aliases: ["tasks and microtasks"],
  summary:
    "One thread runs one task at a time: microtasks go before the next task, and a frame only fits between two.",
  family: "frontend",
  category: "RUNTIME",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-13",
  flowLabels: { request: "Task", write: "Microtask", response: "Frame", error: "Blocked" },
  sources: [
    {
      label: "WHATWG HTML, event loops",
      url: "https://html.spec.whatwg.org/multipage/webappapis.html#event-loops",
    },
    {
      label: "J. Archibald, 2015",
      url: "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/",
    },
    {
      label: "WHATWG HTML, timers",
      url: "https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers",
    },
    { label: "W3C Long Tasks API", url: "https://w3c.github.io/longtasks/" },
  ],
  article: [
    "The JavaScript event loop is how a browser runs a page's code on a single thread: it takes one task from its task queues, runs it to the end on the call stack, empties the microtask queue, and renders a frame when one is due, then starts again.",
    "A task is a unit of work the browser schedules: running a script, dispatching a click, calling back a timer. Browsers keep several task queues and choose which one to serve next, but they run one task at a time, and nothing interrupts the code it starts until the call stack is empty.",
    "A microtask is a job the running code queues to run right after it: a promise's then callback, the rest of an async function after await, queueMicrotask. Once the stack is empty, at the end of every task and after each callback the browser calls, the event loop runs every queued microtask, those queued along the way included, before anything else.",
    "Rendering waits its turn too. When a frame is due, roughly every 16.7 ms on a 60 Hz screen, the browser runs the animation-frame callbacks, recalculates style and layout, then paints. A task that holds the stack for 200 ms leaves no room for any of it: the page cannot update or run a click's handler until the task is over.",
    "Timers count in parallel, off the main thread. setTimeout(cb, 0) only asks for cb to be queued as a task once at least 0 ms have passed; then it waits for the event loop to pick it. That is why the script in this machine logs A, D, C, then B.",
  ],
  glossary: [
    {
      term: "Task",
      definition:
        "A unit of work the browser schedules: a script, a click, a timer's callback. One runs at a time, to the end.",
      parts: ["task-queue"],
    },
    {
      term: "Microtask",
      definition:
        "A job queued by running code, like a promise's then. The whole queue is emptied once the stack is empty, before the next task and before any frame.",
      parts: ["microtask-queue"],
    },
    {
      term: "Call stack",
      definition:
        "Where code runs, one call on top of another. One thread, one stack: while it is busy, nothing else on this thread runs.",
      parts: ["call-stack"],
    },
    {
      term: "Event loop",
      definition:
        "Takes one task, empties the microtask queue, renders when a frame is due, and starts again, for as long as the page is open.",
      parts: ["event-loop"],
    },
    {
      term: "Rendering",
      definition:
        "Animation-frame callbacks, then style, layout and paint, about every 16.7 ms at 60 Hz, in a gap between two tasks.",
      parts: ["rendering"],
    },
    {
      term: "Long task",
      definition:
        "A task, with the microtasks after it, that holds the main thread for more than 50 ms by the Long Tasks API's measure: frames and clicks wait behind it.",
      parts: ["call-stack"],
    },
  ],
  stage: {
    plate: { size: [11, 6.2], center: [0.9, 0.9] },
    zones: [
      {
        id: "in-parallel",
        label: "In parallel",
        note: "Waits off the main thread",
        from: [-4.5, -2.1],
        to: [-2.1, 3.9],
      },
      {
        id: "main-thread",
        label: "Main thread",
        note: "One thing at a time",
        from: [-2.1, -2.1],
        to: [6.3, 3.9],
      },
    ],
  },
  parts: [
    {
      id: "task-queue",
      ref: 1,
      label: "Task queue",
      role: "QUEUE",
      kind: "queue",
      shape: { type: "box", size: [2.6, 0.3, 0.7] },
      position: [1.0, 0.15, BACK],
      socket: [0, 0.15, 0],
      description:
        "Tasks waiting their turn: the script, a timer's callback, a click. Browsers keep several task queues and pick among them; one stands for all here.",
    },
    {
      id: "event-loop",
      ref: 2,
      label: "Event loop",
      role: "LOOP",
      kind: "core",
      shape: { type: "cylinder", radius: 0.75, height: 0.5 },
      position: [LOOP_X, 0.25, LANE],
      socket: [0, 0.05, 0],
      description:
        "Takes one task, empties the microtask queue, renders when a frame is due, and starts again.",
    },
    {
      id: "call-stack",
      ref: 3,
      label: "Call stack",
      role: "STACK",
      kind: "store",
      shape: { type: "box", size: [1.1, 1.4, 1.1] },
      position: [STACK_X, 0.7, LANE],
      socket: [0, -0.4, 0],
      description:
        "Where JavaScript runs, one call on top of another. The main thread has one: while it is busy, nothing else on this thread runs.",
    },
    {
      id: "web-apis",
      ref: 4,
      label: "Web APIs",
      role: "IN PARALLEL",
      kind: "actor",
      shape: { type: "box", size: [1.4, 0.8, 1.2] },
      position: [TIMER_X, 0.4, BACK],
      socket: [0, -0.1, 0],
      description:
        "Timers, network and other browser features. They work off the main thread and queue a task when they are done.",
    },
    {
      id: "microtask-queue",
      ref: 5,
      label: "Microtask queue",
      role: "QUEUE",
      kind: "queue",
      shape: { type: "box", size: [2.6, 0.3, 0.7] },
      position: [1.0, 0.15, FRONT],
      socket: [0, 0.15, 0],
      description:
        "Promise callbacks and other microtasks. Emptied completely whenever the stack empties: before the next task, before any frame.",
    },
    {
      id: "rendering",
      ref: 6,
      label: "Rendering",
      role: "FRAME",
      kind: "actor",
      shape: { type: "box", size: [1.4, 0.7, 1.1] },
      position: [5.2, 0.35, LANE],
      socket: [0, -0.05, 0],
      description:
        "Animation-frame callbacks, then style, layout and paint, when the browser has a frame to draw.",
    },
  ],
  routes: [
    // The script hands a callback to a timer, across into the parallel zone.
    { id: "stack-timer", from: "call-stack", to: "web-apis", via: [[TIMER_X, PIPE_Y, LANE]] },
    { id: "timer-tasks", from: "web-apis", to: "task-queue" },
    { id: "tasks-loop", from: "task-queue", to: "event-loop", via: [[LOOP_X, PIPE_Y, BACK]] },
    {
      id: "stack-microtasks",
      from: "call-stack",
      to: "microtask-queue",
      via: [[STACK_X, PIPE_Y, FRONT]],
    },
    {
      id: "microtasks-loop",
      from: "microtask-queue",
      to: "event-loop",
      via: [[LOOP_X, PIPE_Y, FRONT]],
    },
    { id: "loop-stack", from: "event-loop", to: "call-stack" },
    { id: "loop-render", from: "event-loop", to: "rendering" },
  ],
  actions: [
    {
      id: BLOCK,
      label: "Block the stack for 200 ms",
      description:
        "A loop spins for 200 ms inside the script. Timer callbacks, clicks and frames all wait for the stack to empty.",
      effects: [{ type: "patchPart", part: "call-stack", set: { flag: "violation" } }],
    },
    {
      id: ENDLESS,
      label: "Chain microtasks forever",
      description:
        "C queues itself again as a microtask. The queue never empties, so no task and no frame runs again, until the browser offers to stop the page.",
      effects: [{ type: "patchPart", part: "microtask-queue", set: { flag: "violation" } }],
    },
    {
      // The contrast: the same endless chain, one task at a time, leaves the page alive.
      id: TIMEOUTS,
      label: "Chain timeouts forever",
      description:
        "B queues itself again with setTimeout. Each round is a new task, so frames and clicks still fit in between.",
    },
  ],
  scenarios: [
    {
      id: "run-script",
      title: "Run a script",
      steps: [
        {
          id: "script-task",
          title: "The script runs as one task",
          body: "The script logs A, sets a 0 ms timer for B, queues C on a resolved promise and logs D. All of it is one task: the event loop takes it from the task queue and runs it on the call stack.",
          focus: ["task-queue", "event-loop", "call-stack"],
          tokens: [{ flow: "request", path: ["tasks-loop", "loop-stack"] }],
          log: [{ flow: "request", tag: "TASK", text: "run script" }],
        },
        {
          id: "log-a",
          title: "A runs at once",
          body: 'console.log("A") is plain synchronous code: it runs right away, on the stack.',
          durationMs: 1050,
          focus: ["call-stack"],
          tokens: [{ flow: "request", at: "call-stack" }],
          log: [{ flow: "request", tag: "LOG", text: "A" }],
        },
        {
          id: "long-loop",
          title: "A 200 ms loop holds the stack",
          body: "A loop spins for 200 ms. One thread, one stack: while it runs, nothing else can, not a timer's callback, not a click, not a frame.",
          when: { all: [BLOCK] },
          takesMs: 200,
          focus: ["call-stack"],
          tokens: [{ flow: "error", at: "call-stack" }],
          log: [{ flow: "error", tag: "BLOCK", text: "while (Date.now() < end) {}  ·  200 ms" }],
        },
        {
          id: "set-timeout",
          title: "setTimeout hands B to a timer",
          body: "setTimeout(cb, 0) does not run cb. It gives it to a timer, which counts in parallel, off the main thread. 0 ms means at least 0 ms.",
          focus: ["call-stack", "web-apis"],
          tokens: [{ flow: "request", path: ["stack-timer"] }],
          log: [{ flow: "request", tag: "TIMER", text: "setTimeout(B, 0) → timer" }],
        },
        {
          id: "then",
          title: "The promise queues C as a microtask",
          body: "Promise.resolve().then(cb) queues cb straight away, as a microtask. It will run as soon as the stack is empty, before the next task.",
          focus: ["call-stack", "microtask-queue"],
          tokens: [
            { flow: "write", path: ["stack-microtasks"] },
            { flow: "request", at: "web-apis" },
          ],
          log: [{ flow: "write", tag: "MICRO", text: "then(C) → microtask queue" }],
        },
        {
          id: "log-d",
          title: "D, and the script is done",
          body: "The last line logs D and the script's task ends: the stack is empty. Once its 0 ms are up, the timer queues B in the task queue, where B waits its turn.",
          focus: ["call-stack", "web-apis", "task-queue"],
          tokens: [
            { flow: "request", path: ["timer-tasks"] },
            { flow: "write", at: "microtask-queue" },
          ],
          log: [
            { flow: "request", tag: "LOG", text: "D" },
            { flow: "request", tag: "TIMER", text: "timer done → task queue (B)" },
          ],
        },
        {
          id: "checkpoint",
          title: "Microtasks first: C",
          body: "The stack is empty, so the event loop runs a microtask checkpoint: it empties the microtask queue, C included, before it takes another task.",
          when: { none: [ENDLESS] },
          focus: ["microtask-queue", "event-loop", "call-stack"],
          tokens: [
            { flow: "write", path: ["microtasks-loop", "loop-stack"] },
            { flow: "request", at: "task-queue" },
          ],
          log: [{ flow: "write", tag: "LOG", text: "C" }],
        },
        {
          id: "checkpoint-endless",
          title: "C queues C again",
          body: "C logs, then queues itself as a new microtask. The checkpoint only ends when the microtask queue is empty, and now it never is.",
          when: { all: [ENDLESS] },
          focus: ["microtask-queue", "event-loop", "call-stack"],
          tokens: [
            { flow: "error", path: ["microtasks-loop", "loop-stack"] },
            { flow: "request", at: "task-queue" },
          ],
          log: [
            { flow: "write", tag: "LOG", text: "C" },
            { flow: "error", tag: "MICRO", text: "then(C) → microtask queue, again" },
          ],
        },
        {
          id: "frozen",
          title: "The page freezes",
          body: "B never runs and no frame is drawn: the event loop never leaves the checkpoint. Clicks pile up in the task queue, unanswered.",
          when: { all: [ENDLESS] },
          focus: ["event-loop", "task-queue", "rendering"],
          tokens: [{ flow: "error", at: "event-loop" }],
          log: [
            {
              flow: "error",
              tag: "BLOCK",
              text: "microtask queue never empties  ·  no task, no frame",
            },
          ],
        },
        {
          id: "frame-late",
          title: "A frame, 200 ms late",
          body: "A frame has been due since the loop began, so it most likely comes before B. About 12 frames were never drawn at 60 Hz, and each click waited for the stack, then ran late.",
          when: { all: [BLOCK], none: [ENDLESS] },
          focus: ["event-loop", "rendering"],
          tokens: [{ flow: "response", path: ["loop-render"] }],
          log: [
            { flow: "error", tag: "FRAME", text: "≈ 12 frames skipped during the long task" },
            {
              flow: "response",
              tag: "FRAME",
              text: "rAF callbacks  ·  style  ·  layout  ·  paint",
            },
          ],
        },
        {
          id: "next-task",
          title: "Then the next task: B",
          body: "Only now can the event loop take another task: here, the timer's callback, which logs B. The output reads A, D, C, B.",
          when: { none: [ENDLESS, TIMEOUTS] },
          focus: ["task-queue", "event-loop", "call-stack"],
          tokens: [{ flow: "request", path: ["tasks-loop", "loop-stack"] }],
          log: [{ flow: "request", tag: "LOG", text: "B" }],
        },
        {
          id: "next-task-again",
          title: "B runs, and sets B again",
          body: "Here the next task is the timer's callback: it logs B, then calls setTimeout(B, 0) again. The next B will be a new task, queued once its timer is up, so frames and other tasks can go first.",
          when: { all: [TIMEOUTS], none: [ENDLESS] },
          focus: ["task-queue", "event-loop", "call-stack"],
          tokens: [{ flow: "request", path: ["tasks-loop", "loop-stack"] }],
          log: [
            { flow: "request", tag: "LOG", text: "B" },
            { flow: "request", tag: "TIMER", text: "setTimeout(B, 0) → timer, again" },
          ],
        },
        {
          id: "frame",
          title: "A frame, when one is due",
          body: "Between two tasks the browser may render: animation-frame callbacks, then style, layout and paint. At 60 Hz one is due within 16.7 ms, so it can also come before B.",
          when: { none: [ENDLESS, BLOCK] },
          // Modelled: the latest a 60 Hz screen's next frame can be due, 16.7 ms after the script began.
          takesMs: 16.7,
          focus: ["event-loop", "rendering"],
          tokens: [{ flow: "response", path: ["loop-render"] }],
          log: [
            {
              flow: "response",
              tag: "FRAME",
              text: "rAF callbacks  ·  style  ·  layout  ·  paint",
            },
          ],
        },
        {
          id: "keeps-going",
          title: "The page stays responsive",
          body: "Each B is its own task, so frames and clicks fit in between. Once timers nest more than five deep, browsers wait at least 4 ms between rounds.",
          when: { all: [TIMEOUTS], none: [ENDLESS] },
          focus: ["web-apis", "task-queue"],
          tokens: [{ flow: "request", path: ["timer-tasks"] }],
          log: [
            {
              flow: "request",
              tag: "TIMER",
              text: "timer done → task queue (B), round after round",
            },
          ],
        },
      ],
    },
  ],
});
