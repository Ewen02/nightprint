import {
  actionCombinations,
  type Machine,
  type ResolvedMachine,
  type Route,
  resolveMachine,
  routePoints,
  type Vec3,
} from "@nightprint/engine";

/** A drawn route the scene keeps mounted, present or not under the current actions. */
export interface RouteSlot {
  readonly route: Route;
  readonly points: readonly Vec3[];
  readonly present: boolean;
}

/**
 * Every route some combination of actions draws (pipes and wires), as it first
 * appears. The scene mounts them all from the start and fades them in and out:
 * flipping a switch then changes uniforms, never compiles a new material.
 */
export function everyDrawnRoute(machine: Machine): RouteSlot[] {
  const seen = new Map<string, RouteSlot>();
  for (const actions of actionCombinations(machine)) {
    const resolved = resolveMachine(machine, actions);
    for (const route of resolved.routes) {
      if (route.kind !== "internal" && !seen.has(route.id)) {
        seen.set(route.id, {
          route,
          points: routePoints(route, resolved.partById),
          present: false,
        });
      }
    }
  }
  return [...seen.values()];
}

const keyOf = (points: readonly Vec3[]) => points.map((p) => p.join(",")).join(";");

/**
 * The routes as the current actions place them. An absent route keeps its last
 * points, so it fades out where it was. Points are reused while unchanged, so
 * geometries built from them survive a re-render.
 */
export function placeRoutes(
  every: readonly RouteSlot[],
  resolved: ResolvedMachine,
  last: Map<string, { readonly key: string; readonly points: readonly Vec3[] }>,
): RouteSlot[] {
  return every.map((slot) => {
    const current = resolved.routeById.get(slot.route.id);
    const previous = last.get(slot.route.id);
    const points = current
      ? routePoints(current, resolved.partById)
      : (previous?.points ?? slot.points);
    const key = keyOf(points);
    if (previous?.key === key) {
      return { route: current ?? slot.route, points: previous.points, present: !!current };
    }
    last.set(slot.route.id, { key, points });
    return { route: current ?? slot.route, points, present: !!current };
  });
}
