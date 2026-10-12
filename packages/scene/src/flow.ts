import {
  clamp01,
  type Flow,
  polylineLength,
  type ResolvedMachine,
  type ResolvedStep,
  routePoints,
} from "@nightprint/engine";

/** How one token of the current step travels through one route. */
export interface PipeTravel {
  readonly flow: Flow;
  /** Where the route starts along the token's whole path, in world units, path order. */
  readonly offset: number;
  /** Length of the route itself. */
  readonly length: number;
  /** Length of the token's whole path. */
  readonly total: number;
  /** The token runs the path backwards (a response going back). */
  readonly reverse: boolean;
}

/** For each route a token travels in this step, where that route sits on the token's path. */
export function pipeTravels(
  step: ResolvedStep,
  resolved: ResolvedMachine,
): Map<string, PipeTravel> {
  const travels = new Map<string, PipeTravel>();
  step.tokens.forEach((token, index) => {
    const spec = step.step.tokens[index];
    if (token.kind !== "travel" || !spec || !("path" in spec)) {
      return;
    }
    let offset = 0;
    const lengths = token.routes.map((id) => {
      const route = resolved.routeById.get(id);
      return route ? polylineLength(routePoints(route, resolved.partById)) : 0;
    });
    const total = lengths.reduce((sum, length) => sum + length, 0);
    token.routes.forEach((id, i) => {
      const length = lengths[i] ?? 0;
      travels.set(id, { flow: token.flow, offset, length, total, reverse: spec.reverse });
      offset += length;
    });
  });
  return travels;
}

/**
 * The lit stretch of a route, as fractions of its own length (its drawing
 * direction): everything the token has already passed at `eased` progress.
 */
export function litRange(travel: PipeTravel, eased: number): readonly [number, number] {
  if (travel.length <= 0) {
    return [0, 0];
  }
  const travelled = eased * travel.total;
  if (travel.reverse) {
    const head = travel.total - travelled;
    return [clamp01((head - travel.offset) / travel.length), 1];
  }
  return [0, clamp01((travelled - travel.offset) / travel.length)];
}
