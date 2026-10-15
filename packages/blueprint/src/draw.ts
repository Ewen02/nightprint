import type { MachineInput, Shape, Vec3 } from "@nightprint/engine";
import type { Blueprint, BlueprintPart } from "./blueprint";
import type { Survey } from "./survey";

/**
 * Lays a blueprint out on a plate: zones as bands from left to right, parts in rows on one
 * lattice shared by every column, routes squared off along the gaps between columns and the
 * corridors between rows. No judgement here, only geometry: the same blueprint always gives
 * the same drawing.
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

export function drawMachine(
  blueprint: Blueprint,
  survey: Survey,
  options: DrawOptions,
): MachineInput {
  const zoneParts = blueprint.zones.map((zone) =>
    blueprint.parts.filter((p) => p.zone === zone.id),
  );
  const columnsOf = (n: number) => Math.max(1, Math.ceil(n / MAX_ROWS));
  const rows = Math.max(
    1,
    ...zoneParts.map((parts) => Math.ceil(parts.length / columnsOf(parts.length))),
  );
  const totalColumns = zoneParts.reduce((sum, parts) => sum + columnsOf(parts.length), 0);
  const width = totalColumns * COLUMN + 2 * MARGIN_X;
  const zOfRow = (row: number) => (row - (rows - 1) / 2) * ROW;

  const neighbours = new Map<string, string[]>();
  for (const route of blueprint.routes) {
    neighbours.set(route.from, [...(neighbours.get(route.from) ?? []), route.to]);
    neighbours.set(route.to, [...(neighbours.get(route.to) ?? []), route.from]);
  }

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
  const sized = sizes(blueprint, survey);
  const sizeOf = (part: BlueprintPart) => sized.get(part.id) ?? SHAPES[part.kind];
  const socketOf = (part: BlueprintPart): Vec3 => {
    const { height } = sizeOf(part);
    if (part.kind !== "adapter" || SHAPES.adapter.shape.type !== "box") {
      return [0, PIPE_Y - height / 2, 0];
    }
    // An adapter's plug faces the side most of its routes leave from.
    const own = slotOf(part.id).x;
    const sides = (neighbours.get(part.id) ?? []).map((id) => Math.sign(slotOf(id).x - own));
    const side = sides.reduce((a, b) => a + b, 0) < 0 ? -1 : 1;
    return [(side * SHAPES.adapter.shape.size[0]) / 2, PIPE_Y - height / 2, 0];
  };
  const partById = new Map(blueprint.parts.map((p) => [p.id, p]));

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
  const viaOf = (fromId: string, toId: string, y: number): Vec3[] => {
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

  /** A what-if import arcs over the plate, so it never reads as one of the code's own routes. */
  const arcOver = (fromId: string, toId: string): Vec3 => {
    const a = slotOf(fromId);
    const b = slotOf(toId);
    return [(a.x + b.x) / 2, ARC_Y, (zOfRow(a.row) + zOfRow(b.row)) / 2];
  };

  // Bill of parts numbered left to right, back to front.
  const numbered = [...blueprint.parts].sort((p, q) => {
    const a = slotOf(p.id);
    const b = slotOf(q.id);
    return a.x - b.x || a.row - b.row;
  });
  const refOf = new Map(numbered.map((p, i) => [p.id, i + 1]));

  const zMin = zOfRow(0) - 0.5 - MARGIN_BACK;
  const zMax = zOfRow(rows - 1) + 0.5 + MARGIN_FRONT;
  let column = 0;
  const zones = blueprint.zones.map((zone, i) => {
    const columns = columnsOf(zoneParts[i]?.length ?? 0);
    const x0 = i === 0 ? -width / 2 : -width / 2 + MARGIN_X + column * COLUMN;
    column += columns;
    const last = i === blueprint.zones.length - 1;
    const x1 = last ? width / 2 : -width / 2 + MARGIN_X + column * COLUMN;
    return {
      id: zone.id,
      label: zone.label,
      note: zone.note,
      from: [x0, zMin] as const,
      to: [x1, zMax] as const,
    };
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
      plate: { size: [width, zMax - zMin], center: [0, (zMin + zMax) / 2] },
      zones,
    },
    parts: numbered.map((part) => {
      const { shape, height } = sizeOf(part);
      const slot = slotOf(part.id);
      return {
        id: part.id,
        ref: refOf.get(part.id),
        label: part.label,
        role: part.role,
        kind: part.kind,
        shape,
        position: [slot.x, height / 2, zOfRow(slot.row)] as const,
        socket: socketOf(part),
        description: part.description,
      };
    }),
    routes: blueprint.routes.map((route) => ({
      id: route.id,
      from: route.from,
      to: route.to,
      kind: route.kind,
      via: viaOf(route.from, route.to, route.kind === "wire" ? WIRE_Y : PIPE_Y),
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
