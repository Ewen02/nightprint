import { defineMachine } from "./define";
import type { MachineInput } from "./schema";

/** A three-part machine used by the engine tests. */
export const fixtureInput = {
  code: "MCH-999",
  slug: "fixture",
  title: "Fixture",
  summary: "A request goes from a to c through b.",
  family: "backend",
  category: "TEST",
  scale: "1 : 1 ms",
  revision: "A",
  revised: "2026-10-12",
  sources: [{ label: "Test", url: "https://example.com" }],
  article: ["A machine for tests."],
  stage: { plate: { size: [10, 4] } },
  parts: [
    {
      id: "a",
      ref: 1,
      label: "A",
      kind: "adapter",
      shape: { type: "box", size: [1, 1, 1] },
      position: [0, 0, 0],
    },
    {
      id: "b",
      ref: 2,
      label: "B",
      kind: "core",
      shape: { type: "box", size: [1, 1, 1] },
      position: [3, 0, 0],
    },
    {
      id: "c",
      ref: 3,
      label: "C",
      kind: "adapter",
      shape: { type: "box", size: [1, 1, 1] },
      position: [3, 0, 4],
    },
    {
      id: "d",
      ref: 4,
      label: "D",
      kind: "adapter",
      shape: { type: "box", size: [1, 1, 1] },
      position: [9, 0, 9],
    },
  ],
  routes: [
    { id: "a-b", from: "a", to: "b", latencyMs: 1 },
    { id: "b-c", from: "b", to: "c", latencyMs: 2 },
  ],
  scenarios: [
    {
      id: "main",
      title: "Main",
      steps: [
        {
          id: "arrive",
          title: "Arrive",
          body: "At a.",
          durationMs: 500,
          tokens: [{ flow: "request", at: "a" }],
          log: [{ flow: "request", text: "in" }],
        },
        {
          id: "to-b",
          title: "To b",
          body: "a to b.",
          durationMs: 1000,
          tokens: [{ flow: "request", path: ["a-b"] }],
        },
        {
          id: "to-c",
          title: "To c",
          body: "b to c.",
          durationMs: 1000,
          when: { none: ["swap"] },
          tokens: [{ flow: "write", path: ["b-c"] }],
          log: [{ flow: "write", text: "saved" }],
        },
        {
          id: "to-d",
          title: "To d",
          body: "b to d.",
          durationMs: 1000,
          when: { all: ["swap"] },
          tokens: [{ flow: "write", path: ["b-d"] }],
          log: [{ flow: "write", text: "saved in d", tag: "SWAP" }],
        },
        {
          id: "back",
          title: "Back",
          body: "c to a.",
          durationMs: 500,
          tokens: [{ flow: "response", path: ["a-b"], reverse: true }],
        },
      ],
    },
  ],
  actions: [
    {
      id: "swap",
      label: "Swap c for d",
      description: "d takes the place of c.",
      effects: [
        { type: "patchPart", part: "d", set: { position: [3, 0, 4] } },
        { type: "patchPart", part: "c", set: { position: [9, 0, 9] } },
        { type: "removeRoute", route: "b-c" },
        { type: "addRoute", route: { id: "b-d", from: "b", to: "d", latencyMs: 0.5 } },
      ],
    },
    {
      id: "noop",
      label: "Relabel a",
      description: "Changes a role only.",
      effects: [{ type: "patchPart", part: "a", set: { role: "SPARE" } }],
    },
  ],
} satisfies MachineInput;

export const fixture = defineMachine(fixtureInput);
