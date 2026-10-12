import { z } from "zod";
import { ResolveError, resolveMachine } from "./resolve";
import { type Machine, type MachineInput, machineSchema } from "./schema";

function duplicates(values: readonly (string | number)[]): (string | number)[] {
  const seen = new Set<string | number>();
  const dup = new Set<string | number>();
  for (const v of values) {
    if (seen.has(v)) {
      dup.add(v);
    }
    seen.add(v);
  }
  return [...dup];
}

/** Every subset of the action ids, the empty one included. */
export function actionCombinations(machine: Machine): string[][] {
  const ids = machine.actions.map((a) => a.id);
  const combos: string[][] = [];
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    combos.push(ids.filter((_, i) => mask & (1 << i)));
  }
  return combos;
}

/**
 * Checks what zod cannot: unique ids, known references, and that the
 * machine resolves for every combination of actions.
 */
export function validateMachine(machine: Machine): string[] {
  const issues: string[] = [];
  const check = (label: string, values: readonly (string | number)[]) => {
    for (const d of duplicates(values)) {
      issues.push(`duplicate ${label} "${d}"`);
    }
  };

  check(
    "part id",
    machine.parts.map((p) => p.id),
  );
  check(
    "part ref",
    machine.parts.flatMap((p) => (p.ref === undefined ? [] : [p.ref])),
  );
  check(
    "route id",
    machine.routes.map((r) => r.id),
  );
  check(
    "action id",
    machine.actions.map((a) => a.id),
  );
  check(
    "scenario id",
    machine.scenarios.map((s) => s.id),
  );
  for (const scenario of machine.scenarios) {
    check(
      `step id in "${scenario.id}"`,
      scenario.steps.map((s) => s.id),
    );
  }

  check(
    "zone id",
    machine.stage.zones.map((z) => z.id),
  );
  check(
    "glossary term",
    machine.glossary.map((g) => g.term),
  );
  const partIds = new Set(machine.parts.map((p) => p.id));
  for (const entry of machine.glossary) {
    for (const part of entry.parts) {
      if (!partIds.has(part)) {
        issues.push(`term "${entry.term}" points at unknown part "${part}"`);
      }
    }
  }
  const { size, center } = machine.stage.plate;
  const inside = ([x, z]: readonly [number, number]) =>
    Math.abs(x - center[0]) <= size[0] / 2 + 1e-9 && Math.abs(z - center[1]) <= size[1] / 2 + 1e-9;
  for (const zone of machine.stage.zones) {
    if (!inside(zone.from) || !inside(zone.to)) {
      issues.push(`zone "${zone.id}" reaches beyond the plate`);
    }
  }
  const routesWithDependency = [
    ...machine.routes,
    ...machine.actions.flatMap((a) =>
      a.effects.flatMap((e) => (e.type === "addRoute" ? [e.route] : [])),
    ),
  ];
  for (const route of routesWithDependency) {
    // Arrowheads are drawn on pipes only.
    if (route.dependsOn && route.kind !== "pipe") {
      issues.push(`${route.kind} route "${route.id}" declares a dependency it cannot draw`);
    }
  }

  const actionIds = new Set(machine.actions.map((a) => a.id));
  for (const scenario of machine.scenarios) {
    for (const step of scenario.steps) {
      for (const a of [...(step.when?.all ?? []), ...(step.when?.none ?? [])]) {
        if (!actionIds.has(a)) {
          issues.push(`step "${step.id}" depends on unknown action "${a}"`);
        }
      }
    }
  }

  for (const combo of actionCombinations(machine)) {
    try {
      resolveMachine(machine, combo);
    } catch (error) {
      if (!(error instanceof ResolveError)) {
        throw error;
      }
      const label = combo.length > 0 ? combo.join(" + ") : "no action";
      issues.push(`with ${label}: ${error.message}`);
    }
  }

  return issues;
}

export class MachineDefinitionError extends Error {
  override name = "MachineDefinitionError";
}

/** Parses and validates a machine definition. Throws at import time on any problem. */
export function defineMachine(input: MachineInput): Machine {
  const parsed = machineSchema.safeParse(input);
  if (!parsed.success) {
    throw new MachineDefinitionError(
      `Invalid machine ${String(input.code)}:\n${z.prettifyError(parsed.error)}`,
    );
  }
  const issues = validateMachine(parsed.data);
  if (issues.length > 0) {
    throw new MachineDefinitionError(
      `Invalid machine ${parsed.data.code}:\n${issues.map((i) => `  - ${i}`).join("\n")}`,
    );
  }
  return parsed.data;
}
