import type { ResolvedMachine, Vec3 } from "@nightprint/engine";
import type { RouteSlot } from "./route-slots";

/** How far an unplugged adapter slides off the end of its pipe, in scene units. */
const GAP = 1.2;
/** How high it rises as it comes off: no longer seated, like a part in an exploded drawing. */
const RISE = 0.25;

/** An adapter in the exploded view. */
export interface Unplug {
  /** Where its plug meets the pipe, then where the plug ends up: the gap between them. */
  readonly line: readonly [Vec3, Vec3];
  /** Along its pipe, away from the port. Zero for an adapter that stays. */
  readonly offset: Vec3;
  /**
   * Plugged into a port and nothing else, so it comes off. A spare is plugged into
   * nothing; an adapter the core imports cannot be pulled out without editing the core.
   */
  readonly free: boolean;
}

/**
 * The exploded view of a machine: every adapter plugged into a port slides off the
 * end of its pipe, along it, and the core keeps its ports. One entry per adapter.
 */
export function unplugs(
  resolved: ResolvedMachine,
  pipes: readonly RouteSlot[],
): ReadonlyMap<string, Unplug> {
  const result = new Map<string, Unplug>();
  for (const part of resolved.parts) {
    if (part.kind !== "adapter") {
      continue;
    }
    const touching = pipes.filter(
      (slot) => slot.present && (slot.route.from === part.id || slot.route.to === part.id),
    );
    const bound = touching.some((slot) => slot.route.flag === "violation");
    const pipe = touching.find((slot) => slot.route.flag !== "violation");
    const end = pipe && (pipe.route.to === part.id ? pipe.points.at(-1) : pipe.points[0]);
    const next = pipe && (pipe.route.to === part.id ? pipe.points.at(-2) : pipe.points[1]);
    if (!end || !next) {
      result.set(part.id, {
        line: [part.position, part.position],
        offset: [0, 0, 0],
        free: false,
      });
      continue;
    }
    // Along the pipe as seen from above: a pipe that climbs (an import arching over the core)
    // would otherwise send the adapter into the air.
    const dx = end[0] - next[0];
    const dz = end[2] - next[2];
    const length = Math.hypot(dx, dz) || 1;
    const offset: Vec3 = [(dx / length) * GAP, RISE, (dz / length) * GAP];
    result.set(part.id, {
      line: [end, [end[0] + offset[0], end[1] + offset[1], end[2] + offset[2]]],
      offset: bound ? [0, 0, 0] : offset,
      free: !bound,
    });
  }
  return result;
}
