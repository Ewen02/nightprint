import {
  actionCombinations,
  createPlayer,
  FIXED_STEP_MS,
  resolveMachine,
  validateMachine,
} from "@nightprint/engine";
import { describe, expect, it } from "vitest";
import { ddd, hexagonal, machines, projects, upcoming } from "./index";

describe("catalogue", () => {
  it("has unique codes and slugs, real projects included", () => {
    const all = [...machines, ...projects];
    const codes = [...all.map((m) => m.code), ...upcoming.map((m) => m.code)];
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(all.map((m) => m.slug)).size).toBe(all.length);
  });

  it("numbers concepts in their series and real projects PRJ", () => {
    expect(machines.every((m) => /^(MCH|BEN|FMD|PRT)-/.test(m.code))).toBe(true);
    expect(projects.every((m) => m.code.startsWith("PRJ-"))).toBe(true);
  });

  for (const machine of [...machines, ...projects]) {
    describe(machine.code, () => {
      it("is valid under every combination of actions", () => {
        expect(validateMachine(machine)).toEqual([]);
      });

      it("numbers its bill of parts from 1 without gaps", () => {
        const refs = machine.parts.flatMap((p) => (p.ref === undefined ? [] : [p.ref]));
        expect([...refs].sort((a, b) => a - b)).toEqual(refs.map((_, i) => i + 1));
      });

      it("plays every scenario to the end under every combination of actions", () => {
        for (const scenario of machine.scenarios) {
          for (const actions of actionCombinations(machine)) {
            const player = createPlayer(machine, {
              actions,
              scenario: scenario.id,
              mode: "playing",
              pace: "reading",
            });
            for (let i = 0; i < 20_000 && !player.getSnapshot().finished; i++) {
              player.advance(FIXED_STEP_MS);
            }
            const label = `${scenario.id}: ${actions.join("+") || "no action"}`;
            expect(player.getSnapshot().finished, label).toBe(true);
          }
        }
      });
    });
  }
});

describe("MCH-001 hexagonal architecture", () => {
  const ids = (actions: string[]) =>
    resolveMachine(hexagonal, actions).scenarios[0]?.steps.map((s) => s.step.id);

  it("tells the nominal story in eight steps, from startup", () => {
    expect(ids([])).toEqual([
      "startup",
      "request-arrives",
      "input-port",
      "rules",
      "save",
      "postgres-answers",
      "payment",
      "response",
    ]);
  });

  it("swaps storage at startup, without touching the core steps", () => {
    const plain = ids([]) ?? [];
    const swapped = ids(["swap-storage"]) ?? [];
    const renamed: Record<string, string> = {
      startup: "startup-memory",
      "postgres-answers": "memory-answers",
    };
    expect(swapped).toEqual(plain.map((id) => renamed[id] ?? id));
  });

  it("rewires the configurator, not the core, when storage is swapped", () => {
    const wires = (actions: string[]) =>
      resolveMachine(hexagonal, actions)
        .routes.filter((r) => r.kind === "wire")
        .map((r) => r.to)
        .sort();
    expect(wires([])).toEqual(["http", "payment-provider", "postgres"]);
    expect(wires(["swap-storage"])).toEqual(["http", "in-memory", "payment-provider"]);
  });

  it("breaks only the swap once the core imports Postgres", () => {
    expect(ids(["core-imports-postgres"])).toContain("still-works");
    expect(ids(["core-imports-postgres", "swap-storage"])).toContain("swap-breaks");
  });

  it("lets a test suite drive the same port, through the same core steps", () => {
    const http = ids([]) ?? [];
    const tests = ids(["drive-from-tests"]) ?? [];
    expect(tests.slice(3, -1)).toEqual(http.slice(3, -1));
    expect(tests).toEqual(
      expect.arrayContaining(["test-calls", "test-input-port", "test-response"]),
    );
  });

  it("never reaches storage or payment when it rejects an order", () => {
    for (const actions of actionCombinations(hexagonal)) {
      const reject = resolveMachine(hexagonal, actions).scenarios.find(
        (s) => s.id === "reject-order",
      );
      const travelled = (reject?.steps ?? []).flatMap((s) =>
        s.tokens.flatMap((t) => (t.kind === "travel" ? t.routes : [t.part])),
      );
      for (const outside of ["repo-postgres", "repo-memory", "pay-provider", "core-postgres"]) {
        expect(travelled, actions.join("+") || "no action").not.toContain(outside);
      }
      expect(travelled).not.toContain("postgres");
      expect(travelled).not.toContain("payment-provider");
    }
  });

  it("keeps the provider's codes out of the core when a payment is declined", () => {
    for (const actions of actionCombinations(hexagonal)) {
      const declined = resolveMachine(hexagonal, actions).scenarios.find(
        (s) => s.id === "decline-payment",
      );
      const label = actions.join("+") || "no action";
      for (const step of declined?.steps ?? []) {
        const text = step.step.log.map((l) => l.text).join(" ");
        if (step.step.focus.includes("order-domain")) {
          expect(text, label).not.toContain("insufficient_funds");
        }
      }
      const last = declined?.steps.at(-1)?.step.log.at(-1)?.text ?? "";
      expect(last, label).toMatch(/402|not confirmed/);
    }
  });

  it("sends the violating wire to wherever Postgres sits", () => {
    const both = resolveMachine(hexagonal, ["core-imports-postgres", "swap-storage"]);
    const step = both.scenarios[0]?.steps.find((s) => s.step.id === "save-direct");
    const token = step?.tokens[0];
    const postgres = both.partById.get("postgres");
    expect(token?.kind).toBe("travel");
    if (token?.kind === "travel" && postgres) {
      const end = token.points.at(-1);
      expect(end?.[2]).toBeCloseTo(postgres.position[2] + postgres.socket[2], 6);
    }
  });
});

describe("MCH-004 domain-driven design", () => {
  const travelled = (actions: string[]) =>
    resolveMachine(ddd, actions).scenarios.flatMap((s) =>
      s.steps.flatMap((step) => step.tokens.flatMap((t) => (t.kind === "travel" ? t.routes : []))),
    );

  it("reaches the lines only through the root, unless the switch goes behind it", () => {
    for (const actions of actionCombinations(ddd)) {
      const label = actions.join("+") || "no action";
      const behind = actions.includes("behind-the-root");
      expect(travelled(actions).includes("service-lines"), label).toBe(behind);
      expect(travelled(actions).includes("order-lines"), label).toBe(!behind);
    }
  });

  it("crosses into Shipping through the relay alone, unless Sales calls it", () => {
    for (const actions of actionCombinations(ddd)) {
      const label = actions.join("+") || "no action";
      const call = actions.includes("call-shipping");
      const routes = travelled(actions);
      expect(routes.includes("service-shipping"), label).toBe(call);
      expect(routes.includes("relay-shipping"), label).toBe(!call);
    }
  });
});

describe("benches, failure modes and protocols", () => {
  it("say every step in one short line first, under every combination of switches", () => {
    for (const machine of machines.filter((m) => !m.code.startsWith("MCH-"))) {
      for (const actions of actionCombinations(machine)) {
        for (const scenario of resolveMachine(machine, actions).scenarios) {
          for (const { step } of scenario.steps) {
            const label = `${machine.code} ${step.id}`;
            expect(step.lead, label).toBeDefined();
            expect(step.lead?.split(/\s+/).length, label).toBeLessThanOrEqual(18);
          }
        }
      }
    }
  });
});
