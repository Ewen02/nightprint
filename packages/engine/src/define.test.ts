import { describe, expect, it } from "vitest";
import { actionCombinations, defineMachine, validateMachine } from "./define";
import { fixture, fixtureInput } from "./fixture.test-helper";
import { logUntil } from "./log";
import { resolveMachine } from "./resolve";
import type { MachineInput } from "./schema";

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("missing fixture value");
  }
  return value;
}

describe("defineMachine", () => {
  it("accepts a valid machine and applies defaults", () => {
    expect(fixture.parts[0]?.material).toBe("solid");
    expect(fixture.routes[0]?.kind).toBe("pipe");
    expect(validateMachine(fixture)).toEqual([]);
  });

  it("rejects a malformed definition with a readable message", () => {
    expect(() => defineMachine({ ...fixtureInput, code: "M1" })).toThrow(/Invalid machine M1/);
  });

  it("rejects duplicate ids and refs", () => {
    const parts = [...fixtureInput.parts, { ...must(fixtureInput.parts[0]), ref: 99 }];
    expect(() => defineMachine({ ...fixtureInput, parts })).toThrow(/duplicate part id "a"/);
  });

  it("rejects a zone that reaches beyond the plate", () => {
    // The fixture's plate is 10 × 4 around the origin: x stops at -5.
    const stage = {
      ...fixtureInput.stage,
      zones: [{ id: "left", label: "Left", from: [-6, -1], to: [0, 1] } as const],
    };
    expect(() => defineMachine({ ...fixtureInput, stage })).toThrow(
      /zone "left" reaches beyond the plate/,
    );
  });

  it("rejects a dependency on a route that is never drawn", () => {
    const routes = [
      ...fixtureInput.routes,
      { id: "inside", from: "a", to: "b", kind: "internal", dependsOn: "to" } as const,
    ];
    expect(() => defineMachine({ ...fixtureInput, routes })).toThrow(
      /internal route "inside" declares a dependency it cannot draw/,
    );
  });

  it("rejects a token sent along a configuration wire", () => {
    const routes = [
      ...fixtureInput.routes,
      { id: "wiring", from: "a", to: "b", kind: "wire" } as const,
    ];
    const main = must(fixtureInput.scenarios[0]);
    const alongWire: MachineInput["scenarios"][number]["steps"][number] = {
      id: "along-wire",
      title: "W",
      body: "w.",
      tokens: [{ flow: "request", path: ["wiring"] }],
    };
    expect(() =>
      defineMachine({
        ...fixtureInput,
        routes,
        scenarios: [{ ...main, steps: [...main.steps, alongWire] }],
      }),
    ).toThrow(/step "along-wire" sends a token along wire "wiring"/);
  });

  it("accepts an action that only changes which steps play", () => {
    const actions = [
      ...fixtureInput.actions,
      { id: "quiet", label: "Quiet", description: "Changes no part.", effects: [] },
    ];
    expect(() => defineMachine({ ...fixtureInput, actions })).not.toThrow();
  });

  it("rejects a glossary term that points at no part", () => {
    const glossary = [{ term: "Port", definition: "An interface.", parts: ["nowhere"] }];
    expect(() => defineMachine({ ...fixtureInput, glossary })).toThrow(
      /term "Port" points at unknown part "nowhere"/,
    );
  });

  it("rejects a step that only breaks under some actions", () => {
    const main = must(fixtureInput.scenarios[0]);
    const steps = main.steps.map((s) => (s.id === "to-d" ? { ...s, when: undefined } : s));
    expect(() => defineMachine({ ...fixtureInput, scenarios: [{ ...main, steps }] })).toThrow(
      /with no action: step "to-d" travels unknown route "b-d"/,
    );
  });

  it("enumerates every action combination", () => {
    expect(actionCombinations(fixture)).toEqual([[], ["swap"], ["noop"], ["swap", "noop"]]);
  });
});

describe("resolveMachine", () => {
  it("keeps the steps whose condition holds", () => {
    const plain = resolveMachine(fixture, []);
    const swapped = resolveMachine(fixture, ["swap"]);
    expect(plain.scenarios[0]?.steps.map((s) => s.step.id)).toEqual([
      "arrive",
      "to-b",
      "to-c",
      "back",
    ]);
    expect(swapped.scenarios[0]?.steps.map((s) => s.step.id)).toEqual([
      "arrive",
      "to-b",
      "to-d",
      "back",
    ]);
  });

  it("moves parts and reroutes", () => {
    const swapped = resolveMachine(fixture, ["swap"]);
    expect(swapped.partById.get("d")?.position).toEqual([3, 0, 4]);
    expect(swapped.routeById.has("b-c")).toBe(false);
    const toD = swapped.scenarios[0]?.steps[2]?.tokens[0];
    expect(toD?.kind === "travel" && toD.points).toEqual([
      [3, 0, 0],
      [3, 0, 4],
    ]);
  });

  it("does not depend on toggle order", () => {
    const a = resolveMachine(fixture, ["swap", "noop"]);
    const b = resolveMachine(fixture, ["noop", "swap"]);
    expect(a.actions).toEqual(b.actions);
    expect(a.parts).toEqual(b.parts);
  });

  it("reverses a path", () => {
    const back = resolveMachine(fixture, []).scenarios[0]?.steps[3]?.tokens[0];
    expect(back?.kind === "travel" && back.points[0]).toEqual([3, 0, 0]);
  });
});

describe("logUntil", () => {
  it("accumulates simulated time from route latencies", () => {
    const scenario = resolveMachine(fixture, []).scenarios[0];
    if (!scenario) throw new Error("no scenario");
    const log = logUntil(scenario, 2);
    expect(log.map((l) => [l.tag, l.text, l.atMs])).toEqual([
      ["REQ", "in", 0],
      ["WRITE", "saved", 3],
    ]);
  });

  it("uses a custom tag when given", () => {
    const scenario = resolveMachine(fixture, ["swap"]).scenarios[0];
    if (!scenario) throw new Error("no scenario");
    expect(logUntil(scenario, 2).at(-1)?.tag).toBe("SWAP");
  });
});
