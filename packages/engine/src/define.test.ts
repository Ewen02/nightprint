import { describe, expect, it } from "vitest";
import { actionCombinations, defineMachine, validateMachine } from "./define";
import { fixture, fixtureInput } from "./fixture.test-helper";
import { logUntil, outputUntil } from "./log";
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

  it("keeps what the program prints, step by step, and names the tokens", () => {
    const main = must(fixtureInput.scenarios[0]);
    const machine = defineMachine({
      ...fixtureInput,
      listing: [
        { id: "a", text: 'console.log("A");' },
        { id: "b", text: 'console.log("B");' },
      ],
      scenarios: [
        {
          ...main,
          steps: [
            {
              id: "a",
              title: "A",
              body: "a.",
              line: "a",
              output: ["A"],
              states: { a: "busy" },
              tokens: [{ flow: "request", at: "a", label: "A" }],
            },
            { id: "b", title: "B", body: "b.", line: "b", output: ["B"] },
            ...main.steps,
          ],
        },
      ],
    });
    const scenario = must(resolveMachine(machine, []).scenarios[0]);
    expect(outputUntil(scenario, 0)).toEqual(["A"]);
    expect(outputUntil(scenario, 1)).toEqual(["A", "B"]);
    expect(scenario.steps[0]?.tokens[0]?.label).toBe("A");
    expect(scenario.steps[0]?.step.states).toEqual({ a: "busy" });
  });

  it("rejects a state on an unknown part, and a line the listing lacks", () => {
    const main = must(fixtureInput.scenarios[0]);
    const step = { id: "x", title: "X", body: "x.", line: "two", states: { nowhere: "?" } };
    expect(() =>
      defineMachine({
        ...fixtureInput,
        listing: [{ id: "one", text: "one();" }],
        scenarios: [{ ...main, steps: [step, ...main.steps] }],
      }),
    ).toThrow(
      /step "x" gives a state to unknown part "nowhere"[\s\S]*runs line "two", not in the listing/,
    );
  });

  it("lets a switch change a line of the program and add one", () => {
    const actions = [
      ...fixtureInput.actions,
      {
        id: "loop",
        label: "Loop",
        description: "Again.",
        effects: [
          { type: "setLine", line: "one", text: "function one() {" } as const,
          { type: "addLine", after: "one", line: { id: "again", text: "  one();" } } as const,
        ],
      },
    ];
    const machine = defineMachine({
      ...fixtureInput,
      actions,
      listing: [
        { id: "one", text: "one();" },
        { id: "end", text: "end();" },
      ],
    });
    expect(resolveMachine(machine, []).listing.map((l) => l.text)).toEqual(["one();", "end();"]);
    expect(resolveMachine(machine, ["loop"]).listing.map((l) => l.text)).toEqual([
      "function one() {",
      "  one();",
      "end();",
    ]);
  });

  it("adds the time a step spends running to the log's clock", () => {
    const main = must(fixtureInput.scenarios[0]);
    const busy: MachineInput["scenarios"][number]["steps"][number] = {
      id: "busy",
      title: "B",
      body: "b.",
      takesMs: 200,
      log: [{ flow: "error", text: "long task" }],
    };
    const machine = defineMachine({
      ...fixtureInput,
      scenarios: [{ ...main, steps: [busy, ...main.steps] }],
    });
    const scenario = must(resolveMachine(machine, []).scenarios[0]);
    expect(scenario.steps[0]?.latencyMs).toBe(200);
    expect(logUntil(scenario, 0).at(-1)?.atMs).toBe(200);
  });

  it("colours a step that moves no token by what it logs", () => {
    const main = must(fixtureInput.scenarios[0]);
    const quiet: MachineInput["scenarios"][number]["steps"] = [
      { id: "setup", title: "S", body: "s.", log: [{ flow: "write", text: "configured" }] },
      { id: "pause", title: "P", body: "p." },
    ];
    const machine = defineMachine({
      ...fixtureInput,
      scenarios: [{ ...main, steps: [...quiet, ...main.steps] }],
    });
    const steps = resolveMachine(machine, []).scenarios[0]?.steps ?? [];
    expect(steps[0]?.flow).toBe("write");
    // Nothing moves and nothing is logged: a request, as before.
    expect(steps[1]?.flow).toBe("request");
    // A token still decides when there is one.
    expect(steps[2]?.flow).toBe(steps[2]?.tokens[0]?.flow);
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
