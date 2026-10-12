import { add, chain, polylineLength } from "./geometry";
import type { Condition, Flow, Machine, Part, Route, Scenario, Step, Vec3 } from "./schema";

/** A token with its geometry computed for the current actions. */
export type ResolvedToken =
  | {
      readonly kind: "travel";
      readonly flow: Flow;
      /** Routes lit while the token travels. */
      readonly routes: readonly string[];
      readonly points: readonly Vec3[];
      readonly length: number;
    }
  | {
      readonly kind: "hold";
      readonly flow: Flow;
      readonly part: string;
      readonly point: Vec3;
    };

export interface ResolvedStep {
  readonly index: number;
  readonly step: Step;
  readonly tokens: readonly ResolvedToken[];
  /** Flow that colours the step: its first token, or `request`. */
  readonly flow: Flow;
  /** Sum of the latencies of the routes travelled in this step. */
  readonly latencyMs: number;
}

export interface ResolvedScenario {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly ResolvedStep[];
}

export interface ResolvedMachine {
  readonly machine: Machine;
  /** Active action ids, in declaration order. */
  readonly actions: readonly string[];
  readonly parts: readonly Part[];
  readonly routes: readonly Route[];
  readonly partById: ReadonlyMap<string, Part>;
  readonly routeById: ReadonlyMap<string, Route>;
  readonly scenarios: readonly ResolvedScenario[];
}

export class ResolveError extends Error {
  override name = "ResolveError";
}

export function matches(condition: Condition | undefined, active: ReadonlySet<string>): boolean {
  if (!condition) {
    return true;
  }
  return condition.all.every((a) => active.has(a)) && condition.none.every((a) => !active.has(a));
}

/** Canonical key of an action set, independent of toggle order. */
export function actionsKey(machine: Machine, active: Iterable<string>): string {
  const set = new Set(active);
  return machine.actions
    .filter((a) => set.has(a.id))
    .map((a) => a.id)
    .join("+");
}

function socketOf(part: Part): Vec3 {
  return add(part.position, part.socket);
}

export function routePoints(route: Route, partById: ReadonlyMap<string, Part>): Vec3[] {
  const from = partById.get(route.from);
  const to = partById.get(route.to);
  if (!from || !to) {
    throw new ResolveError(
      `route "${route.id}" connects unknown part "${from ? route.to : route.from}"`,
    );
  }
  return chain([[socketOf(from)], route.via, [socketOf(to)]]);
}

function resolveSteps(
  scenario: Scenario,
  active: ReadonlySet<string>,
  partById: ReadonlyMap<string, Part>,
  routeById: ReadonlyMap<string, Route>,
): ResolvedStep[] {
  const kept = scenario.steps.filter((s) => matches(s.when, active));
  return kept.map((step, index) => {
    for (const p of step.focus) {
      if (!partById.has(p)) {
        throw new ResolveError(`step "${step.id}" focuses unknown part "${p}"`);
      }
    }
    let latencyMs = 0;
    const tokens = step.tokens.map((spec): ResolvedToken => {
      if ("at" in spec) {
        const part = partById.get(spec.at);
        if (!part) {
          throw new ResolveError(`step "${step.id}" holds a token on unknown part "${spec.at}"`);
        }
        return { kind: "hold", flow: spec.flow, part: part.id, point: socketOf(part) };
      }
      const lines = spec.path.map((routeId) => {
        const route = routeById.get(routeId);
        if (!route) {
          throw new ResolveError(`step "${step.id}" travels unknown route "${routeId}"`);
        }
        if (route.kind === "wire") {
          throw new ResolveError(`step "${step.id}" sends a token along wire "${routeId}"`);
        }
        latencyMs += route.latencyMs;
        return routePoints(route, partById);
      });
      const forward = chain(lines);
      const points = spec.reverse ? [...forward].reverse() : forward;
      return {
        kind: "travel",
        flow: spec.flow,
        routes: spec.path,
        points,
        length: polylineLength(points),
      };
    });
    return {
      index,
      step,
      tokens,
      flow: tokens[0]?.flow ?? "request",
      latencyMs,
    };
  });
}

/**
 * Applies the active actions to a machine, in declaration order, and
 * computes the geometry of every token. Pure: the same machine and
 * actions always give the same result.
 */
export function resolveMachine(machine: Machine, active: Iterable<string>): ResolvedMachine {
  const activeSet = new Set(active);
  for (const a of activeSet) {
    if (!machine.actions.some((action) => action.id === a)) {
      throw new ResolveError(`unknown action "${a}"`);
    }
  }
  const actions = machine.actions.filter((a) => activeSet.has(a.id));

  const parts = new Map<string, Part>(machine.parts.map((p) => [p.id, p]));
  const routes = new Map<string, Route>(machine.routes.map((r) => [r.id, r]));

  for (const action of actions) {
    for (const effect of action.effects) {
      switch (effect.type) {
        case "patchPart": {
          const part = parts.get(effect.part);
          if (!part) {
            throw new ResolveError(`action "${action.id}" patches unknown part "${effect.part}"`);
          }
          parts.set(part.id, { ...part, ...effect.set });
          break;
        }
        case "addRoute": {
          if (routes.has(effect.route.id)) {
            throw new ResolveError(
              `action "${action.id}" adds existing route "${effect.route.id}"`,
            );
          }
          routes.set(effect.route.id, effect.route);
          break;
        }
        case "removeRoute": {
          if (!routes.delete(effect.route)) {
            throw new ResolveError(`action "${action.id}" removes unknown route "${effect.route}"`);
          }
          break;
        }
      }
    }
  }

  for (const route of routes.values()) {
    routePoints(route, parts);
  }

  const scenarios = machine.scenarios.map((scenario) => {
    const steps = resolveSteps(scenario, activeSet, parts, routes);
    if (steps.length === 0) {
      throw new ResolveError(`scenario "${scenario.id}" has no step left`);
    }
    return { id: scenario.id, title: scenario.title, steps };
  });

  return {
    machine,
    actions: actions.map((a) => a.id),
    parts: [...parts.values()],
    routes: [...routes.values()],
    partById: parts,
    routeById: routes,
    scenarios,
  };
}
