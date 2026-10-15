import type { MachineInput, Shape, Vec3 } from "@nightprint/engine";
import type { Blueprint, BlueprintPart } from "./blueprint";
import { type Bus, busAlong, type Hub, hubAround, type Mirror, mirrorAround } from "./layouts";
import type { Survey } from "./survey";

/**
 * Lays a blueprint out on a plate, in the composition it chose (see `layouts.ts`): bands
 * from left to right, or a hub around the core most of the code leans on. Each part
 * stands as tall as the code it holds. No judgement here, only geometry: the same
 * blueprint always gives the same drawing.
 */

export interface DrawOptions {
  /** "PRJ-001". */
  readonly code: string;
  readonly slug: string;
  /** The day it was drawn, as YYYY-MM-DD. */
  readonly revised: string;
  /** The repository at the commit surveyed: the drawing's source. */
  readonly sourceUrl: string;
}

const PIPE_Y = 0.3;
const WIRE_Y = 0.02;
/** Height a what-if import arcs to. */
const ARC_Y = 1.3;
/** Distance between two column centres, and between two row centres. */
const COLUMN = 3.4;
const ROW = 1.7;
const MAX_ROWS = 4;
/** Room between routes that share a gap or a corridor. */
const LANE = 0.16;
const MARGIN_X = 0.5;
const MARGIN_BACK = 0.8;
/** The front edge carries the zone labels. */
const MARGIN_FRONT = 1.3;

const SHAPES: Record<BlueprintPart["kind"], { readonly shape: Shape; readonly height: number }> = {
  actor: { shape: { type: "box", size: [1.4, 0.6, 0.9] }, height: 0.6 },
  module: { shape: { type: "box", size: [1.4, 0.6, 0.9] }, height: 0.6 },
  adapter: { shape: { type: "box", size: [1.5, 0.8, 1.0] }, height: 0.8 },
  core: { shape: { type: "prism", sides: 6, radius: 0.62, height: 0.6 }, height: 0.6 },
  configurator: { shape: { type: "box", size: [1.3, 0.45, 0.8] }, height: 0.45 },
  store: { shape: { type: "cylinder", radius: 0.55, height: 0.9 }, height: 0.9 },
  queue: { shape: { type: "box", size: [1.6, 0.5, 0.7] }, height: 0.5 },
};

/** A part of the code stands this much taller than its kind, from the least code to the most. */
const SHORTEST = 0.8;
const TALLEST = 1.7;

/**
 * Each part's shape, its height grown with the lines of code it stands for, on a log
 * scale: the tallest part holds the most code, and a part outside the code keeps its
 * kind's height. A skyline that only this repository has.
 */
function sizes(
  blueprint: Blueprint,
  survey: Survey,
): Map<string, { readonly shape: Shape; readonly height: number }> {
  const lines = new Map(survey.units.map((unit) => [unit.id, unit.lines]));
  const code = new Map(
    blueprint.parts.map((part) => [
      part.id,
      part.units.reduce((sum, unit) => sum + (lines.get(unit) ?? 0), 0),
    ]),
  );
  const most = Math.max(0, ...code.values());
  return new Map(
    blueprint.parts.map((part) => {
      const base = SHAPES[part.kind];
      const own = code.get(part.id) ?? 0;
      if (own === 0 || most === 0) {
        return [part.id, base];
      }
      const height =
        base.height * (SHORTEST + ((TALLEST - SHORTEST) * Math.log1p(own)) / Math.log1p(most));
      const shape: Shape =
        base.shape.type === "box"
          ? { type: "box", size: [base.shape.size[0], height, base.shape.size[2]] }
          : { ...base.shape, height };
      return [part.id, { shape, height }];
    }),
  );
}

interface Slot {
  readonly x: number;
  /** Row on the shared lattice. */
  readonly row: number;
}

/** 0, +1, -1, +2, -2…: the n-th lane around a gap's centre line. */
function laneOffset(n: number): number {
  return (n % 2 === 0 ? -1 : 1) * Math.ceil(n / 2) * LANE;
}

const columnsOf = (n: number) => Math.max(1, Math.ceil(n / MAX_ROWS));

type Point = { readonly x: number; readonly z: number };
type Rect = {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  /** A hub's zones are drawn as circles. */
  readonly shape?: "round";
};
/** The face of a part a plug is on. */
type Plug = { readonly axis: "x" | "z"; readonly sign: 1 | -1 };

/** Where a layout puts the parts, their routes and the zones. Only geometry. */
interface Layout {
  /** Where each part stands, seen from above. */
  readonly point: (id: string) => Point;
  /** The bends of a route between two parts, at height y. */
  readonly via: (from: string, to: string, y: number) => Vec3[];
  /** The face an adapter's plug is on: towards what it plugs into. */
  readonly plug: (id: string) => Plug;
  /** Each zone's rectangle, in the blueprint's order; none for a zone drawn without a frame. */
  readonly zones: readonly (Rect | undefined)[];
  readonly plate: { readonly size: [number, number]; readonly center: [number, number] };
  /** A part drawn longer than its kind, along x: a bus's queue, stretched into a rail. */
  readonly stretch?: (id: string) => number | undefined;
}

/** Puts parts in columns from `x0`, at most MAX_ROWS to a column, centred on z = 0. */
function columnsFrom(ids: readonly string[], x0: number, points: Map<string, Point>): number {
  const columns = columnsOf(ids.length);
  const perColumn = Math.ceil(ids.length / columns);
  ids.forEach((id, k) => {
    const c = Math.floor(k / perColumn);
    const inColumn = Math.min(perColumn, ids.length - c * perColumn);
    points.set(id, {
      x: x0 + (c + 0.5) * COLUMN,
      z: ((k % perColumn) - (inColumn - 1) / 2) * ROW,
    });
  });
  return ids.length === 0 ? 0 : columns * COLUMN;
}

/**
 * Puts parts in a row at depth `z`, each as near the x it wants as the row allows: in the
 * order of those x, a column apart at least, the row then shifted onto them on average.
 */
function spread(
  wanted: readonly { readonly id: string; readonly x: number }[],
  z: number,
  points: Map<string, Point>,
): void {
  const sorted = [...wanted].sort((a, b) => a.x - b.x);
  const xs: number[] = [];
  for (const { x } of sorted) {
    const previous = xs.at(-1);
    xs.push(previous === undefined ? x : Math.max(x, previous + COLUMN));
  }
  const shift =
    sorted.reduce((sum, { x }, k) => sum + x - (xs[k] ?? x), 0) / Math.max(1, sorted.length);
  sorted.forEach(({ id }, k) => {
    points.set(id, { x: (xs[k] ?? 0) + shift, z });
  });
}

/**
 * Each zone as the rectangle round its parts, and the plate round them all: for the
 * compositions where zones follow the parts instead of setting their places. There a zone's
 * parts need not stand together, so a frame that would take in a part of another zone is
 * left out, and a stretched part, the spine the others stand along, is in no frame.
 */
function framed(
  blueprint: Blueprint,
  points: ReadonlyMap<string, Point>,
  stretch: (id: string) => number | undefined = () => undefined,
): Pick<Layout, "zones" | "plate"> {
  const reach = (id: string) => Math.max(COLUMN / 2 - 0.15, (stretch(id) ?? 0) / 2 + 0.3);
  const at = (id: string) => points.get(id) ?? { x: 0, z: 0 };
  const frameOf = (parts: readonly BlueprintPart[]): Rect => ({
    from: [
      Math.min(...parts.map((p) => at(p.id).x - reach(p.id))),
      Math.min(...parts.map((p) => at(p.id).z)) - ROW / 2,
    ],
    to: [
      Math.max(...parts.map((p) => at(p.id).x + reach(p.id))),
      Math.max(...parts.map((p) => at(p.id).z)) + ROW / 2,
    ],
  });
  const framedParts = blueprint.parts.filter((p) => stretch(p.id) === undefined);
  const zones = blueprint.zones.map((zone): Rect | undefined => {
    const inside = framedParts.filter((p) => p.zone === zone.id);
    if (inside.length === 0) {
      return undefined;
    }
    const rect = frameOf(inside);
    // A stranger's own frame overlapping this one: its centre may sit right on the edge.
    const takesIn = framedParts.some((p) => {
      if (p.zone === zone.id) {
        return false;
      }
      const own = frameOf([p]);
      return (
        own.from[0] < rect.to[0] &&
        rect.from[0] < own.to[0] &&
        own.from[1] < rect.to[1] &&
        rect.from[1] < own.to[1]
      );
    });
    return takesIn ? undefined : rect;
  });
  const all = frameOf(blueprint.parts);
  const x0 = all.from[0] - MARGIN_X;
  const x1 = all.to[0] + MARGIN_X;
  const z0 = all.from[1] - MARGIN_BACK;
  const z1 = all.to[1] + MARGIN_FRONT;
  return {
    zones,
    plate: { size: [x1 - x0, z1 - z0], center: [(x0 + x1) / 2, (z0 + z1) / 2] },
  };
}

/**
 * The bands: zones from left to right, parts in rows on one lattice shared by every
 * column, routes squared off along the gaps between columns and the corridors between rows.
 */
function bandsLayout(blueprint: Blueprint, neighbours: ReadonlyMap<string, string[]>): Layout {
  const zoneParts = blueprint.zones.map((zone) =>
    blueprint.parts.filter((p) => p.zone === zone.id),
  );
  const rows = Math.max(
    1,
    ...zoneParts.map((parts) => Math.ceil(parts.length / columnsOf(parts.length))),
  );
  const totalColumns = zoneParts.reduce((sum, parts) => sum + columnsOf(parts.length), 0);
  const width = totalColumns * COLUMN + 2 * MARGIN_X;
  const zOfRow = (row: number) => (row - (rows - 1) / 2) * ROW;

  // Each zone's parts fill its columns top to bottom, centred on the lattice; a few passes
  // reorder them by where their neighbours sit, which untangles most crossings.
  const slots = new Map<string, Slot>();
  const order = zoneParts.map((parts) => [...parts]);
  const place = () => {
    let column = 0;
    for (const parts of order) {
      const columns = columnsOf(parts.length);
      const perColumn = Math.ceil(parts.length / columns);
      parts.forEach((part, k) => {
        const c = Math.floor(k / perColumn);
        const inColumn = Math.min(perColumn, parts.length - c * perColumn);
        const first = Math.floor((rows - inColumn) / 2);
        slots.set(part.id, {
          x: -width / 2 + MARGIN_X + (column + c + 0.5) * COLUMN,
          row: first + (k % perColumn),
        });
      });
      column += columns;
    }
  };
  place();
  for (let pass = 0; pass < 4; pass++) {
    for (const parts of order) {
      const key = new Map(
        parts.map((part) => {
          const rowsAround = (neighbours.get(part.id) ?? []).flatMap(
            (id) => slots.get(id)?.row ?? [],
          );
          const own = slots.get(part.id)?.row ?? 0;
          const mean =
            rowsAround.length > 0 ? rowsAround.reduce((a, b) => a + b, 0) / rowsAround.length : own;
          return [part.id, mean + own * 1e-3] as const;
        }),
      );
      parts.sort((a, b) => (key.get(a.id) ?? 0) - (key.get(b.id) ?? 0));
    }
    place();
  }
  const slotOf = (id: string): Slot => slots.get(id) ?? { x: 0, row: 0 };

  // Routes leave a part along x to the gap beside its column, run along it, and cross to a
  // far column through the corridor between two rows.
  const gapUse = new Map<number, number>();
  const corridorUse = new Map<number, number>();
  const take = (uses: Map<number, number>, at: number) => {
    const key = Math.round(at * 100);
    const n = uses.get(key) ?? 0;
    uses.set(key, n + 1);
    return at + laneOffset(n);
  };
  const via = (fromId: string, toId: string, y: number): Vec3[] => {
    const a = slotOf(fromId);
    const b = slotOf(toId);
    const za = zOfRow(a.row);
    const zb = zOfRow(b.row);
    const dx = b.x - a.x;
    if (Math.abs(dx) < 1e-6) {
      if (a.row === b.row) {
        return [];
      }
      const gap = take(gapUse, a.x + COLUMN / 2);
      return [
        [gap, y, za],
        [gap, y, zb],
      ];
    }
    const dir = Math.sign(dx);
    const nearA = a.x + (dir * COLUMN) / 2;
    const nearB = b.x - (dir * COLUMN) / 2;
    if (Math.abs(nearA - nearB) < 1e-6) {
      if (a.row === b.row) {
        return [];
      }
      const gap = take(gapUse, nearA);
      return [
        [gap, y, za],
        [gap, y, zb],
      ];
    }
    const middle = (a.row + b.row) / 2;
    const corridor = take(corridorUse, zOfRow(Math.min(rows - 1, Math.floor(middle)) + 0.5));
    const gapA = take(gapUse, nearA);
    const gapB = take(gapUse, nearB);
    return [
      [gapA, y, za],
      [gapA, y, corridor],
      [gapB, y, corridor],
      [gapB, y, zb],
    ];
  };

  // An adapter's plug faces the side most of its routes leave from.
  const plug = (id: string): Plug => {
    const own = slotOf(id).x;
    const sides = (neighbours.get(id) ?? []).map((n) => Math.sign(slotOf(n).x - own));
    return { axis: "x", sign: sides.reduce((a, b) => a + b, 0) < 0 ? -1 : 1 };
  };

  const zMin = zOfRow(0) - 0.5 - MARGIN_BACK;
  const zMax = zOfRow(rows - 1) + 0.5 + MARGIN_FRONT;
  let column = 0;
  const zones = blueprint.zones.map((_, i): Rect => {
    const columns = columnsOf(zoneParts[i]?.length ?? 0);
    const x0 = i === 0 ? -width / 2 : -width / 2 + MARGIN_X + column * COLUMN;
    column += columns;
    const last = i === blueprint.zones.length - 1;
    const x1 = last ? width / 2 : -width / 2 + MARGIN_X + column * COLUMN;
    return { from: [x0, zMin], to: [x1, zMax] };
  });
  return {
    point: (id) => {
      const slot = slotOf(id);
      return { x: slot.x, z: zOfRow(slot.row) };
    },
    via,
    plug,
    zones,
    plate: { size: [width, zMax - zMin], center: [0, (zMin + zMax) / 2] },
  };
}

/** Radius of the circle the core's zone-mates stand on, and room between parts on the ring. */
const INNER = 2.6;
const RING_GAP = 2.6;
const RING_MIN = 3.1;
/** Room around a ring of parts, inside its zone's square. */
const RING_MARGIN = 1.35;
/**
 * How far inside the ring its own routes run, how far outside it the routes to the bands
 * run, and the longest straight piece of their arcs.
 */
const CORRIDOR = 1.2;
const OUTER = 1.0;
const ARC_STEP = 0.35;

/**
 * The hub: the core at the centre of its zone, drawn as a square; its zone-mates on a small
 * circle around it; the code of the zone beside it on a ring around that, in a square of its
 * own; the zones before and after as bands on either side. Routes run straight, the ring's
 * own along a circular corridor inside it, those to the bands along one outside it, out to
 * their side; a band reaches the centre through a gap between two parts of the ring.
 * Every plug faces the core.
 */
function hubLayout(
  blueprint: Blueprint,
  hub: Hub,
  neighbours: ReadonlyMap<string, string[]>,
): Layout {
  const { zones } = blueprint;
  const partsOf = (i: number) => blueprint.parts.filter((p) => p.zone === zones[i]?.id);
  const ringIds = (
    hub.ringZone === undefined
      ? partsOf(hub.coreZone).filter((p) => p.id !== hub.core)
      : partsOf(hub.ringZone)
  ).map((p) => p.id);
  const innerIds =
    hub.ringZone === undefined
      ? []
      : partsOf(hub.coreZone)
          .filter((p) => p.id !== hub.core)
          .map((p) => p.id);
  const firstMiddle = Math.min(hub.coreZone, hub.ringZone ?? hub.coreZone);
  const lastMiddle = Math.max(hub.coreZone, hub.ringZone ?? hub.coreZone);
  const left = zones.map((_, i) => i).filter((i) => i < firstMiddle);
  const right = zones.map((_, i) => i).filter((i) => i > lastMiddle);

  const inner = Math.max(INNER, (innerIds.length * RING_GAP) / (2 * Math.PI));
  const innerHalf = innerIds.length > 0 ? inner + 1.15 : 1.25;
  const ring = Math.max(
    RING_MIN,
    (ringIds.length * RING_GAP) / (2 * Math.PI),
    innerHalf + CORRIDOR + 0.5,
  );
  const ringHalf = ring + RING_MARGIN;
  const sideWidth = (indices: readonly number[]) =>
    indices.reduce((sum, i) => sum + columnsOf(partsOf(i).length) * COLUMN, 0);
  const width = sideWidth(left) + 2 * ringHalf + sideWidth(right) + 2 * MARGIN_X;
  const sideRows = Math.max(
    1,
    ...[...left, ...right].map((i) => Math.ceil(partsOf(i).length / columnsOf(partsOf(i).length))),
  );
  const half = Math.max(ringHalf, (sideRows * ROW) / 2);
  const zMin = -half - MARGIN_BACK;
  const zMax = half + MARGIN_FRONT;

  const points = new Map<string, Point>();
  const angles = new Map<string, number>();
  const rects: Rect[] = [];
  let cursor = -width / 2 + MARGIN_X;
  const xc = cursor + sideWidth(left) + ringHalf;
  points.set(hub.core, { x: xc, z: 0 });

  // The ring first: a part tied to the bands on the left takes the ring's left side, one
  // tied to the right takes its right side; the angles are shared out evenly.
  const sideOf = (id: string) =>
    left.some((i) => partsOf(i).some((p) => p.id === id))
      ? -1
      : right.some((i) => partsOf(i).some((p) => p.id === id))
        ? 1
        : 0;
  const lean = (id: string) => {
    const sides = (neighbours.get(id) ?? []).map(sideOf).filter((side) => side !== 0);
    return sides.length > 0 ? sides.reduce((a, b) => a + b, 0) / sides.length : 0;
  };
  const slots = ringIds
    .map((_, k) => Math.PI / 2 + ((k + 0.5) * 2 * Math.PI) / ringIds.length)
    .sort((a, b) => Math.cos(a) - Math.cos(b) || Math.sin(a) - Math.sin(b));
  [...ringIds]
    .sort((a, b) => lean(a) - lean(b))
    .forEach((id, k) => {
      const angle = slots[k] ?? 0;
      angles.set(id, angle);
      points.set(id, { x: xc + ring * Math.cos(angle), z: ring * Math.sin(angle) });
    });
  innerIds.forEach((id, k) => {
    const angle = -Math.PI / 2 + (k * 2 * Math.PI) / innerIds.length;
    points.set(id, { x: xc + inner * Math.cos(angle), z: inner * Math.sin(angle) });
  });

  // The bands, each zone's parts in columns, ordered by where their neighbours stand.
  const band = (i: number, x0: number) => {
    const parts = [...partsOf(i)];
    const columns = columnsOf(parts.length);
    const perColumn = Math.ceil(parts.length / columns);
    const depthOf = (id: string) => {
      const around = (neighbours.get(id) ?? []).flatMap((n) => points.get(n)?.z ?? []);
      return around.length > 0 ? around.reduce((a, b) => a + b, 0) / around.length : 0;
    };
    parts.sort((a, b) => depthOf(a.id) - depthOf(b.id));
    parts.forEach((part, k) => {
      const c = Math.floor(k / perColumn);
      const inColumn = Math.min(perColumn, parts.length - c * perColumn);
      points.set(part.id, {
        x: x0 + (c + 0.5) * COLUMN,
        z: ((k % perColumn) - (inColumn - 1) / 2) * ROW,
      });
    });
    return columns * COLUMN;
  };
  zones.forEach((_, i) => {
    if (i >= firstMiddle && i <= lastMiddle) {
      const square = i === hub.coreZone && hub.ringZone !== undefined ? innerHalf : ringHalf;
      rects[i] = { from: [xc - square, -square], to: [xc + square, square], shape: "round" };
      if (i === lastMiddle) {
        cursor = xc + ringHalf;
      }
      return;
    }
    const x0 = cursor;
    cursor += band(i, x0);
    rects[i] = {
      from: [i === 0 ? -width / 2 : x0, zMin],
      to: [i === zones.length - 1 ? width / 2 : cursor, zMax],
    };
  });

  const pointOf = (id: string): Point => points.get(id) ?? { x: xc, z: 0 };
  const corridor = ring - CORRIDOR;
  const outer = ring + OUTER;
  /** Points along a circle round the core, the shorter way from one angle to another. */
  const arc = (radius: number, from: number, to: number, y: number): Vec3[] => {
    const turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    const steps = Math.max(1, Math.ceil(Math.abs(turn) / ARC_STEP));
    return Array.from({ length: steps + 1 }, (_, k): Vec3 => {
      const angle = from + (turn * k) / steps;
      return [xc + radius * Math.cos(angle), y, radius * Math.sin(angle)];
    });
  };
  const step = (2 * Math.PI) / Math.max(1, ringIds.length);
  /** The gap between two parts of the ring nearest to an angle, where a spoke goes through. */
  const gapNear = (angle: number) =>
    slots
      .map((slot) => slot + step / 2)
      .reduce((best, gap) => (Math.cos(gap - angle) > Math.cos(best - angle) ? gap : best), angle);
  const sideAngle = (id: string) => (sideOf(id) < 0 ? Math.PI : 0);
  const centred = (id: string) => id === hub.core || innerIds.includes(id);
  /** The bends from `a` to `b`, when this layout has a way for them; the reverse is reversed. */
  const bends = (a: string, b: string, y: number): Vec3[] | undefined => {
    const ta = angles.get(a);
    const tb = angles.get(b);
    if (ta !== undefined && tb !== undefined) {
      return arc(corridor, ta, tb, y);
    }
    if (sideOf(b) === 0) {
      return undefined;
    }
    if (ta !== undefined) {
      return arc(outer, ta, sideAngle(b), y);
    }
    if (centred(a)) {
      return arc(outer, gapNear(sideAngle(b)), sideAngle(b), y);
    }
    return undefined;
  };
  const via = (fromId: string, toId: string, y: number): Vec3[] =>
    bends(fromId, toId, y) ?? bends(toId, fromId, y)?.reverse() ?? [];
  const plug = (id: string): Plug => {
    const own = pointOf(id);
    const centred = id !== hub.core && (angles.has(id) || innerIds.includes(id));
    const dx = centred ? xc - own.x : Math.sign(xc - own.x) || 1;
    const dz = centred ? -own.z : 0;
    return Math.abs(dx) >= Math.abs(dz)
      ? { axis: "x", sign: dx < 0 ? -1 : 1 }
      : { axis: "z", sign: dz < 0 ? -1 : 1 };
  };
  return {
    point: pointOf,
    via,
    plug,
    zones: rects,
    plate: { size: [width, zMax - zMin], center: [0, (zMin + zMax) / 2] },
  };
}

/** Room between the groups of a mirror or a bus, along x. */
const GROUP_GAP = 0.8;

/**
 * The mirror: the shared zone in the middle, each half of the code on its side, and outside
 * them, on the side of the half that uses them, who uses the project and what it uses; what
 * only the shared zone uses stands in front of it, in the middle. Routes run straight; every
 * plug faces the middle.
 */
function mirrorLayout(
  blueprint: Blueprint,
  mirror: Mirror,
  neighbours: ReadonlyMap<string, string[]>,
): Layout {
  const [left, right] = mirror.sides;
  const halfOf = (id: string) => (left.includes(id) ? -1 : right.includes(id) ? 1 : 0);
  const inner = new Set([...left, ...right, ...mirror.shared]);
  const shared = new Set(mirror.shared);
  const underShared = blueprint.parts
    .filter((p) => !inner.has(p.id))
    .filter((p) => {
      const near = neighbours.get(p.id) ?? [];
      return near.length > 0 && near.every((id) => shared.has(id));
    })
    .map((p) => p.id);
  const outside = blueprint.parts.filter((p) => !inner.has(p.id) && !underShared.includes(p.id));
  const lean = (id: string) =>
    (neighbours.get(id) ?? []).reduce((sum, other) => sum + halfOf(other), 0);
  const outLeft = outside
    .filter((p) => lean(p.id) < 0 || (lean(p.id) === 0 && p.kind === "actor"))
    .map((p) => p.id);
  const outRight = outside.map((p) => p.id).filter((id) => !outLeft.includes(id));
  const points = new Map<string, Point>();
  let cursor = 0;
  for (const group of [outLeft, left, mirror.shared, right, outRight]) {
    const width = columnsFrom(group, cursor, points);
    cursor += width + (width > 0 ? GROUP_GAP : 0);
  }
  const middle =
    mirror.shared.reduce((sum, id) => sum + (points.get(id)?.x ?? 0), 0) / mirror.shared.length;
  for (const [id, point] of points) {
    points.set(id, { x: point.x - middle, z: point.z });
  }
  const front = Math.max(...mirror.shared.map((id) => points.get(id)?.z ?? 0)) + ROW;
  spread(
    underShared.map((id) => ({ id, x: 0 })),
    front,
    points,
  );
  const plug = (id: string): Plug => {
    const x = points.get(id)?.x ?? 0;
    return underShared.includes(id) ? { axis: "z", sign: -1 } : { axis: "x", sign: x > 0 ? -1 : 1 };
  };
  return {
    point: (id) => points.get(id) ?? { x: 0, z: 0 },
    via: () => [],
    plug,
    ...framed(blueprint, points),
  };
}

/** How far behind and in front of a bus its producers and consumers stand. */
const BUS_ROW = 1.9;
/** Room behind a zone's frame for its name: the scene sets it 1.1 behind, two lines deep. */
const NAME_LANE = 2.4;
/** How far out what the code uses stands: a row further, past the name of the zone in front. */
const BUS_OUT = BUS_ROW + ROW + NAME_LANE;

/**
 * The bus: the queue stretched into a rail across the middle, the parts that send to it in a
 * row behind, those that read from it in a row in front. What the code uses stands a row
 * further out, on the side of the parts that use it and as near them as the row allows; the
 * rest of the code stands on the left, zone by zone, and who uses the project beyond it. A
 * route to the rail meets it in front of its part, then runs inside it.
 */
function busLayout(
  blueprint: Blueprint,
  bus: Bus,
  neighbours: ReadonlyMap<string, string[]>,
): Layout {
  const onBus = new Set([bus.bus, ...bus.producers, ...bus.consumers]);
  const isVisitor = (p: BlueprintPart) =>
    p.kind === "actor" && p.units.length === 0 && p.libraries.length === 0;
  const rest = blueprint.parts.filter((p) => !onBus.has(p.id));
  const span = Math.max(bus.producers.length, bus.consumers.length, 2) * COLUMN;
  const points = new Map<string, Point>();
  points.set(bus.bus, { x: 0, z: 0 });
  const row = (ids: readonly string[], z: number) =>
    ids.forEach((id, k) => {
      points.set(id, { x: -span / 2 + ((k + 0.5) * span) / ids.length, z });
    });
  row(bus.producers, -BUS_ROW);
  row(bus.consumers, BUS_ROW);
  // The rest of the code, its last zone nearest the rail, and the visitors beyond it.
  const leftGroups = [
    ...blueprint.zones
      .map((zone) => rest.filter((p) => p.zone === zone.id && p.units.length > 0).map((p) => p.id))
      .reverse(),
    rest.filter(isVisitor).map((p) => p.id),
  ].filter((ids) => ids.length > 0);
  const left = new Set(leftGroups.flat());
  let cursor = -span / 2 - GROUP_GAP;
  for (const ids of leftGroups) {
    const width = columnsOf(ids.length) * COLUMN;
    columnsFrom(ids, cursor - width, points);
    cursor -= width + GROUP_GAP;
  }
  // What the code uses: behind the senders unless readers use it more, near its users.
  const side = (id: string) =>
    bus.producers.includes(id) ? -1 : bus.consumers.includes(id) ? 1 : 0;
  const rows = {
    back: [] as { id: string; x: number }[],
    front: [] as { id: string; x: number }[],
  };
  for (const part of rest.filter((p) => !left.has(p.id))) {
    const near = (neighbours.get(part.id) ?? []).flatMap((id) => points.get(id) ?? []);
    const lean = (neighbours.get(part.id) ?? []).reduce((sum, id) => sum + side(id), 0);
    const x = near.length > 0 ? near.reduce((sum, p) => sum + p.x, 0) / near.length : -span / 2;
    (lean > 0 ? rows.front : rows.back).push({ id: part.id, x });
  }
  spread(rows.back, -BUS_OUT, points);
  spread(rows.front, BUS_OUT, points);
  const stretch = (id: string) => (id === bus.bus ? span : undefined);
  const via = (fromId: string, toId: string, y: number): Vec3[] => {
    const other = fromId === bus.bus ? toId : toId === bus.bus ? fromId : undefined;
    const at = other === undefined ? undefined : points.get(other);
    if (!at || at.z === 0) {
      return [];
    }
    // Meet the rail in front of the part, at its edge; the rest runs inside the rail.
    return [[at.x, y, Math.sign(at.z) * 0.4]];
  };
  const plug = (id: string): Plug => {
    const at = points.get(id) ?? { x: 0, z: 0 };
    return left.has(id) ? { axis: "x", sign: 1 } : { axis: "z", sign: at.z < 0 ? 1 : -1 };
  };
  return {
    point: (id) => points.get(id) ?? { x: 0, z: 0 },
    via,
    plug,
    stretch,
    ...framed(blueprint, points, stretch),
  };
}

/** The composition the blueprint chose, as checkBlueprint let it through; bands otherwise. */
function chosenLayout(blueprint: Blueprint, neighbours: ReadonlyMap<string, string[]>): Layout {
  const { kind, center } = blueprint.layout;
  if (kind === "hub") {
    const hub = hubAround(blueprint, center);
    if (typeof hub !== "string") {
      return hubLayout(blueprint, hub, neighbours);
    }
  }
  if (kind === "mirror") {
    const mirror = mirrorAround(blueprint, center);
    if (typeof mirror !== "string") {
      return mirrorLayout(blueprint, mirror, neighbours);
    }
  }
  if (kind === "bus") {
    const bus = busAlong(blueprint, center);
    if (typeof bus !== "string") {
      return busLayout(blueprint, bus, neighbours);
    }
  }
  return bandsLayout(blueprint, neighbours);
}

export function drawMachine(
  blueprint: Blueprint,
  survey: Survey,
  options: DrawOptions,
): MachineInput {
  const neighbours = new Map<string, string[]>();
  for (const route of blueprint.routes) {
    neighbours.set(route.from, [...(neighbours.get(route.from) ?? []), route.to]);
    neighbours.set(route.to, [...(neighbours.get(route.to) ?? []), route.from]);
  }
  const layout = chosenLayout(blueprint, neighbours);
  const sized = sizes(blueprint, survey);
  const sizeOf = (part: BlueprintPart): { readonly shape: Shape; readonly height: number } => {
    const own = sized.get(part.id) ?? SHAPES[part.kind];
    const length = layout.stretch?.(part.id);
    return length !== undefined && own.shape.type === "box"
      ? { ...own, shape: { ...own.shape, size: [length, own.shape.size[1], own.shape.size[2]] } }
      : own;
  };
  const socketOf = (part: BlueprintPart): Vec3 => {
    const { shape, height } = sizeOf(part);
    const y = PIPE_Y - height / 2;
    if (part.kind !== "adapter" || shape.type !== "box") {
      return [0, y, 0];
    }
    const { axis, sign } = layout.plug(part.id);
    return axis === "x" ? [(sign * shape.size[0]) / 2, y, 0] : [0, y, (sign * shape.size[2]) / 2];
  };
  const partById = new Map(blueprint.parts.map((p) => [p.id, p]));

  /** A what-if import arcs over the plate, so it never reads as one of the code's own routes. */
  const arcOver = (fromId: string, toId: string): Vec3 => {
    const a = layout.point(fromId);
    const b = layout.point(toId);
    return [(a.x + b.x) / 2, ARC_Y, (a.z + b.z) / 2];
  };

  // Bill of parts numbered left to right, back to front.
  const numbered = [...blueprint.parts].sort((p, q) => {
    const a = layout.point(p.id);
    const b = layout.point(q.id);
    return a.x - b.x || a.z - b.z;
  });
  const refOf = new Map(numbered.map((p, i) => [p.id, i + 1]));
  const zones = blueprint.zones.flatMap((zone, i) => {
    const rect = layout.zones[i];
    return rect
      ? [
          {
            id: zone.id,
            label: zone.label,
            note: zone.note,
            from: rect.from,
            to: rect.to,
            ...(rect.shape ? { shape: rect.shape } : {}),
          },
        ]
      : [];
  });

  const routeKind = (id: string) => blueprint.routes.find((r) => r.id === id)?.kind;
  return {
    code: options.code,
    slug: options.slug,
    title: blueprint.title,
    summary: blueprint.summary,
    family: blueprint.family,
    category: "PROJECT",
    scale: "NTS",
    revision: "A",
    revised: options.revised,
    sources: [
      { label: `${survey.repo.name} at ${survey.repo.ref.slice(0, 7)}`, url: options.sourceUrl },
    ],
    article: blueprint.article,
    glossary: blueprint.glossary.map((g) => ({
      term: g.term,
      definition: g.definition,
      parts: g.parts,
    })),
    stage: {
      plate: layout.plate,
      zones,
    },
    parts: numbered.map((part) => {
      const { shape, height } = sizeOf(part);
      const at = layout.point(part.id);
      return {
        id: part.id,
        ref: refOf.get(part.id),
        label: part.label,
        role: part.role,
        kind: part.kind,
        shape,
        position: [at.x, height / 2, at.z] as const,
        socket: socketOf(part),
        description: part.description,
      };
    }),
    routes: blueprint.routes.map((route) => ({
      id: route.id,
      from: route.from,
      to: route.to,
      kind: route.kind,
      via: layout.via(route.from, route.to, route.kind === "wire" ? WIRE_Y : PIPE_Y),
      ...(route.dependsOn === "none" ? {} : { dependsOn: route.dependsOn }),
    })),
    scenarios: blueprint.scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      steps: scenario.steps.map((step) => {
        const label = step.label ?? undefined;
        const tokens =
          step.path.length > 0
            ? [{ flow: step.flow, path: step.path, reverse: step.reverse, label }]
            : step.at !== null
              ? [{ flow: step.flow, at: step.at, label }]
              : [];
        const conditional = step.whenOn.length > 0 || step.whenOff.length > 0;
        return {
          id: step.id,
          title: step.title,
          body: step.body,
          focus: step.focus,
          tokens,
          log: step.log,
          ...(conditional ? { when: { all: step.whenOn, none: step.whenOff } } : {}),
        };
      }),
    })),
    actions: blueprint.actions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      effects: [
        ...action.flagParts.map((part) => ({
          type: "patchPart" as const,
          part,
          set: { flag: "violation" as const },
        })),
        ...action.removeRoutes
          .filter((id) => routeKind(id) !== undefined)
          .map((route) => ({ type: "removeRoute" as const, route })),
        ...action.addRoutes
          .filter((r) => partById.has(r.from) && partById.has(r.to))
          .map((r) => ({
            type: "addRoute" as const,
            route: {
              id: r.id,
              from: r.from,
              to: r.to,
              via: [arcOver(r.from, r.to)],
              flag: "violation" as const,
              // The what-if: `from` now imports `to`.
              dependsOn: "to" as const,
            },
          })),
      ],
    })),
  };
}
