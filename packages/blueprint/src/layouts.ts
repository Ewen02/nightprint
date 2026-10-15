import type { Blueprint } from "./blueprint";

/**
 * The compositions a machine can be drawn in. The model chooses the one that tells the
 * project's architecture; the code checks the choice holds before it is drawn.
 */
export const layoutKinds = ["bands", "hub"] as const;
export type LayoutKind = (typeof layoutKinds)[number];

/** A hub needs this many parts of the code leaning on its core, and this share of them. */
export const HUB_LEANERS = 3;
export const HUB_SHARE = 0.6;

/** A part leans on another when a route between them says it depends on it. */
export function leansOn(blueprint: Blueprint, a: string, b: string): boolean {
  return blueprint.routes.some(
    (r) =>
      (r.from === a && r.to === b && r.dependsOn === "to") ||
      (r.from === b && r.to === a && r.dependsOn === "from"),
  );
}

export interface Hub {
  readonly core: string;
  readonly coreZone: number;
  /** The zone around the core's, when the code stands in two zones. */
  readonly ringZone: number | undefined;
}

/**
 * The hub drawn around this core, or why it cannot be: the core is a core of the code that
 * imports none of it, at least three parts of the code and most of them import it, and the
 * code stands in the core's zone and at most one zone beside it.
 */
export function hubAround(blueprint: Blueprint, coreId: string | null): Hub | string {
  const core = blueprint.parts.find((p) => p.id === coreId);
  if (!core) {
    return `layout "hub" names no core of this blueprint: give the id of the core most of the code leans on`;
  }
  if (core.kind !== "core" || core.units.length === 0) {
    const article = /^[aeiou]/.test(core.kind) ? "an" : "a";
    return `layout "hub": "${core.id}" is ${article} ${core.kind}, not a core of the code`;
  }
  const code = blueprint.parts.filter((p) => p.units.length > 0);
  const leaned = code.find((p) => p.id !== core.id && leansOn(blueprint, core.id, p.id));
  if (leaned) {
    return `layout "hub": "${core.id}" leans on "${leaned.id}", so it is no hub; choose "bands"`;
  }
  const others = code.length - 1;
  const leaners = code.filter((p) => p.id !== core.id && leansOn(blueprint, p.id, core.id));
  if (leaners.length < HUB_LEANERS || leaners.length < HUB_SHARE * others) {
    return `layout "hub": ${leaners.length} of the code's ${others} other parts lean on "${core.id}"; a hub needs ${HUB_LEANERS} and most of them, so choose "bands"`;
  }
  const zoneOf = (id: string) => blueprint.zones.findIndex((z) => z.id === id);
  const zones = [...new Set(code.map((p) => zoneOf(p.zone)))].sort((a, b) => a - b);
  const coreZone = zoneOf(core.zone);
  const [first = -1, second] = zones;
  if (first < 0 || zones.length > 2 || (second !== undefined && second !== first + 1)) {
    return `layout "hub": the code stands in ${zones.length} zones; a hub holds it in the core's zone and at most one zone beside it`;
  }
  return { core: core.id, coreZone, ringZone: zones.find((i) => i !== coreZone) };
}
