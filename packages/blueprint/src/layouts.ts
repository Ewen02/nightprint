import type { Blueprint } from "./blueprint";

/**
 * The compositions a machine can be drawn in. The model chooses the one that tells the
 * project's architecture; the code checks the choice holds before it is drawn.
 */
export const layoutKinds = ["bands", "hub", "mirror", "bus"] as const;
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

/** The parts among `ids` joined by routes that stay among them: each group a list of ids. */
function groups(blueprint: Blueprint, ids: readonly string[]): string[][] {
  const left = new Set(ids);
  const found: string[][] = [];
  for (const start of ids) {
    if (!left.has(start)) {
      continue;
    }
    const group: string[] = [];
    const queue = [start];
    left.delete(start);
    while (queue.length > 0) {
      const id = queue.shift() ?? "";
      group.push(id);
      for (const route of blueprint.routes) {
        const other = route.from === id ? route.to : route.to === id ? route.from : undefined;
        if (other !== undefined && left.has(other)) {
          left.delete(other);
          queue.push(other);
        }
      }
    }
    found.push(group);
  }
  return found;
}

export interface Mirror {
  /** The parts of the code in the shared part's zone: what both halves build on. */
  readonly shared: readonly string[];
  /** The two halves of the code, left and right: neither imports the other. */
  readonly sides: readonly [readonly string[], readonly string[]];
}

/**
 * The mirror around this shared part's zone, or why it cannot be: the code in that zone leans
 * on no other code, and the rest of the code falls in exactly two groups that do not import
 * each other, both leaning on the shared zone (two apps over shared packages). The group of
 * the code part the blueprint lists first goes on the left.
 */
export function mirrorAround(blueprint: Blueprint, sharedId: string | null): Mirror | string {
  const anchor = blueprint.parts.find((p) => p.id === sharedId);
  if (!anchor || anchor.units.length === 0) {
    return `layout "mirror" names no shared part of the code: give the id of a part in the zone both halves import`;
  }
  const code = blueprint.parts.filter((p) => p.units.length > 0);
  const shared = code.filter((p) => p.zone === anchor.zone).map((p) => p.id);
  const rest = code.filter((p) => !shared.includes(p.id)).map((p) => p.id);
  for (const id of shared) {
    const leaned = rest.find((other) => leansOn(blueprint, id, other));
    if (leaned) {
      return `layout "mirror": "${id}" leans on "${leaned}", so the zone of "${anchor.id}" is not shared; choose another layout`;
    }
  }
  const halves = groups(blueprint, rest);
  if (halves.length !== 2) {
    return `layout "mirror": without the zone of "${anchor.id}", the code falls in ${halves.length} group${halves.length === 1 ? "" : "s"} that do not import each other; a mirror needs exactly two`;
  }
  const [left = [], right = []] = halves;
  for (const half of halves) {
    if (!half.some((id) => shared.some((s) => leansOn(blueprint, id, s)))) {
      return `layout "mirror": no part of the group of "${half[0]}" leans on the zone of "${anchor.id}"; both halves must`;
    }
  }
  return { shared, sides: [left, right] };
}

/** A bus needs this many parts of the code on its queue. */
export const BUS_PARTS = 3;

export interface Bus {
  readonly bus: string;
  /** Parts of the code whose routes run to the queue, then those whose routes come from it. */
  readonly producers: readonly string[];
  readonly consumers: readonly string[];
}

/**
 * The bus along this queue, or why it cannot be: a queue part, with at least three parts
 * of the code routed to or from it. A route to the queue marks a producer; from it, a consumer.
 */
export function busAlong(blueprint: Blueprint, busId: string | null): Bus | string {
  const bus = blueprint.parts.find((p) => p.id === busId);
  if (!bus || bus.kind !== "queue") {
    return `layout "bus" names no queue of this blueprint: give the id of the message queue the code shares`;
  }
  const code = new Set(blueprint.parts.filter((p) => p.units.length > 0).map((p) => p.id));
  const producers = new Set<string>();
  const consumers = new Set<string>();
  for (const route of blueprint.routes) {
    if (route.to === bus.id && code.has(route.from)) {
      producers.add(route.from);
    } else if (route.from === bus.id && code.has(route.to)) {
      consumers.add(route.to);
    }
  }
  for (const id of producers) {
    consumers.delete(id);
  }
  if (producers.size + consumers.size < BUS_PARTS) {
    return `layout "bus": ${producers.size + consumers.size} parts of the code are routed to "${bus.id}"; a bus needs ${BUS_PARTS}, so choose another layout`;
  }
  return { bus: bus.id, producers: [...producers], consumers: [...consumers] };
}
