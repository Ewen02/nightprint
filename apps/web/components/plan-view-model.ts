import {
  type Flow,
  type Machine,
  type Part,
  resolveMachine,
  routePoints,
  type Vec3,
} from "@nightprint/engine";
import { scene } from "@nightprint/tokens";
import type { PlanPart, PlanViewProps } from "@nightprint/ui";

/** Room around the plate, in plate units. */
const MARGIN = 0.5;
/** Seen from above, three's turn about +y is a clockwise SVG rotation. */
const degrees = (radians: number) => (-radians * 180) / Math.PI;

/** The flow each route first carries in the machine's first scenario, with these switches on. */
function routeFlows(machine: Machine, actions: readonly string[]): Map<string, Flow> {
  const flows = new Map<string, Flow>();
  for (const step of resolveMachine(machine, actions).scenarios[0]?.steps ?? []) {
    for (const token of step.tokens) {
      if (token.kind === "travel") {
        for (const route of token.routes) {
          flows.set(route, flows.get(route) ?? token.flow);
        }
      }
    }
  }
  return flows;
}

function planPart(part: Part): PlanPart {
  const [x, , z] = part.position;
  const common = { id: part.id, glass: part.material === "glass", flag: part.flag };
  const { shape } = part;
  if (shape.type === "box") {
    const [w, , d] = shape.size;
    return {
      ...common,
      shape: "rect",
      x: x - w / 2,
      y: z - d / 2,
      width: w,
      height: d,
      rotate: degrees(part.rotationY),
      cx: x,
      cy: z,
    };
  }
  if (shape.type === "cylinder") {
    return { ...common, shape: "circle", cx: x, cy: z, r: shape.radius };
  }
  // A prism is a cylinder with few sides: its first corner faces +z.
  const corners = Array.from({ length: shape.sides }, (_, i) => {
    const angle = (i / shape.sides) * Math.PI * 2;
    return `${x + shape.radius * Math.sin(angle)},${z + shape.radius * Math.cos(angle)}`;
  });
  return {
    ...common,
    shape: "polygon",
    points: corners.join(" "),
    rotate: degrees(part.rotationY),
    cx: x,
    cy: z,
  };
}

/**
 * A machine seen from above, as plain shapes: the plate's zones, every part's outline,
 * and every drawn route, in the colour of the flow that first travels it. Switches are
 * off unless named: what one breaks is flagged, part and route. Uncarried routes come
 * first, so a lit pipe is never drawn under a dark one.
 */
export function planView(
  machine: Machine,
  actions: readonly string[] = [],
): Omit<PlanViewProps, "label"> {
  const resolved = resolveMachine(machine, actions);
  const flows = routeFlows(machine, actions);
  const [width, depth] = machine.stage.plate.size;
  const [cx, cz] = machine.stage.plate.center;
  return {
    box: {
      x: cx - width / 2 - MARGIN,
      y: cz - depth / 2 - MARGIN,
      width: width + MARGIN * 2,
      height: depth + MARGIN * 2,
    },
    zones: machine.stage.zones.map((zone) => ({
      id: zone.id,
      label: zone.label,
      x: Math.min(zone.from[0], zone.to[0]),
      y: Math.min(zone.from[1], zone.to[1]),
      width: Math.abs(zone.to[0] - zone.from[0]),
      height: Math.abs(zone.to[1] - zone.from[1]),
      shape: zone.shape,
    })),
    parts: resolved.parts.map(planPart),
    routes: resolved.routes
      .filter((route) => route.kind !== "internal")
      .sort((a, b) => Number(flows.has(a.id)) - Number(flows.has(b.id)))
      .map((route) => ({
        id: route.id,
        kind: route.kind === "wire" ? "wire" : "pipe",
        flow: flows.get(route.id) ?? null,
        flag: route.flag,
        points: routePoints(route, resolved.partById)
          .map(([x, , z]) => `${x},${z}`)
          .join(" "),
      })),
  };
}

type Point = { readonly x: number; readonly y: number };
type Segment = readonly [Point, Point];

const flat = (points: readonly Vec3[]): Point[] => points.map(([x, , z]) => ({ x, y: z }));
const length = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const fmt = (p: Point) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;

function longestSegment(points: readonly Point[]): Segment {
  let best: Segment | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b && (!best || length(a, b) > length(best[0], best[1]))) {
      best = [a, b];
    }
  }
  if (!best) {
    throw new Error("a route needs two points");
  }
  return best;
}

/** The arrowhead at the end a route's other end depends on, tip on the socket. */
function arrowhead(points: readonly Point[], at: "from" | "to"): { tip: Point; shape: string } {
  const [tip, before] = at === "to" ? [points.at(-1), points.at(-2)] : [points[0], points[1]];
  if (!tip || !before) {
    throw new Error("a route needs two points");
  }
  const d = length(before, tip);
  const ux = (tip.x - before.x) / d;
  const uy = (tip.y - before.y) / d;
  const base = { x: tip.x - ux * 0.24, y: tip.y - uy * 0.24 };
  const side = { x: -uy * 0.09, y: ux * 0.09 };
  return {
    tip,
    shape: [
      tip,
      { x: base.x + side.x, y: base.y + side.y },
      { x: base.x - side.x, y: base.y - side.y },
    ]
      .map(fmt)
      .join(" "),
  };
}

/** Where the drawing's conventions sit, for the legend's leader lines to point at. */
export interface LegendTargets {
  readonly balloon: Point;
  readonly dimension: Point;
  readonly flow: Point;
  readonly arrowhead: Point;
  readonly titleBlock: Point;
}

/** What the annotated plan shows an instance of: a part, and three routes. */
export interface LegendPicks {
  /** The part whose balloon the legend points at. */
  readonly part: string;
  /** The route that carries the dimension. */
  readonly dimension: string;
  /** A lit pipe. */
  readonly flow: string;
  /** A route with a dependency arrowhead. */
  readonly arrowhead: string;
}

/** Room above the plate for the top leader lines, and below it for the title block. */
const BAND_TOP = 1.1;
const BAND_BOTTOM = 1.8;

/**
 * The plan view dressed as a full drawing: every numbered part's balloon, every
 * dependency's arrowhead, one route's dimension and the title block, on a sheet with
 * room around the plate for leader lines. Returns where each convention sits.
 */
export function annotatedPlan(
  machine: Machine,
  picks: LegendPicks,
): { readonly plan: Omit<PlanViewProps, "label">; readonly targets: LegendTargets } {
  const base = planView(machine);
  const resolved = resolveMachine(machine, []);
  const route = (id: string) => {
    const found = resolved.routeById.get(id);
    if (!found) {
      throw new Error(`${machine.code} has no route "${id}"`);
    }
    return { route: found, points: flat(routePoints(found, resolved.partById)) };
  };
  const [cx, cz] = machine.stage.plate.center;

  // Balloons sit just off each part, on the side away from the plate's centre.
  const balloons = resolved.parts.flatMap((part) => {
    if (part.ref === undefined) {
      return [];
    }
    const [x, , z] = part.position;
    const reach =
      part.shape.type === "box"
        ? Math.max(part.shape.size[0], part.shape.size[2]) / 2
        : part.shape.radius;
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    const [ux, uz] = d < 0.1 ? [0, -1] : [dx / d, dz / d];
    return [
      { id: part.id, number: part.ref, x: x + ux * (reach + 0.3), y: z + uz * (reach + 0.3) },
    ];
  });
  const balloon = balloons.find((b) => b.id === picks.part);
  if (!balloon) {
    throw new Error(`${machine.code} has no numbered part "${picks.part}"`);
  }

  const arrows = new Map(
    resolved.routes.flatMap((r) =>
      r.kind === "pipe" && r.dependsOn
        ? [[r.id, arrowhead(flat(routePoints(r, resolved.partById)), r.dependsOn)] as const]
        : [],
    ),
  );
  const arrow = arrows.get(picks.arrowhead);
  if (!arrow) {
    throw new Error(`${machine.code} route "${picks.arrowhead}" has no dependency arrowhead`);
  }

  // The dimension, set like the scene sets it: off the longest segment, away from the centre.
  const measured = route(picks.dimension);
  const [a, b] = longestSegment(measured.points);
  const d = length(a, b);
  let n = { x: -(b.y - a.y) / d, y: (b.x - a.x) / d };
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (n.x * (middle.x - cx) + n.y * (middle.y - cz) < 0) {
    n = { x: -n.x, y: -n.y };
  }
  const { offset, gap, overshoot, tick } = scene.dimension;
  const at = (p: Point, k: number) => ({ x: p.x + n.x * k, y: p.y + n.y * k });
  const u = { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
  const slash = { x: (u.x + n.x) * tick * 1.4, y: (u.y + n.y) * tick * 1.4 };
  const line = (p: Point, q: Point) => `${fmt(p)} ${fmt(q)}`;
  const ends = [at(a, offset), at(b, offset)] as const;
  const label = at(middle, offset + (n.y < 0 ? 0.1 : 0.3));

  const box = {
    x: base.box.x,
    y: base.box.y - BAND_TOP,
    width: base.box.width,
    height: base.box.height + BAND_TOP + BAND_BOTTOM,
  };
  const titleBlock = {
    width: 3.9,
    height: 1.5,
    x: box.x + box.width - 3.9 - 0.15,
    y: box.y + box.height - 1.5 - 0.15,
    title: machine.title,
    cells: [
      { term: "Code", value: machine.code },
      { term: "Scale", value: machine.scale },
      { term: "Rev", value: machine.revision },
    ],
    source: machine.sources[0]?.label,
  };

  return {
    plan: {
      ...base,
      box,
      routes: base.routes.map((r) => {
        const head = arrows.get(r.id);
        return head ? { ...r, arrow: head.shape } : r;
      }),
      balloons: balloons.map(({ id, number, x, y }) => ({ id, number, x, y })),
      dimensions: [
        {
          id: measured.route.id,
          lines: [
            line(at(a, gap), at(a, offset + overshoot)),
            line(at(b, gap), at(b, offset + overshoot)),
            line(ends[0], ends[1]),
            ...ends.map((p) =>
              line({ x: p.x - slash.x, y: p.y - slash.y }, { x: p.x + slash.x, y: p.y + slash.y }),
            ),
          ],
          label: `${measured.route.latencyMs} ms`,
          x: label.x,
          y: label.y,
        },
      ],
      titleBlock,
    },
    // Leader lines stop at the edge of what they point at, never over a number or a value.
    targets: {
      balloon: { x: balloon.x, y: balloon.y + (balloon.y < cz ? -0.19 : 0.19) },
      dimension: { x: label.x, y: label.y - 0.24 },
      flow: (() => {
        const [p, q] = longestSegment(route(picks.flow).points);
        return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      })(),
      arrowhead: arrow.tip,
      titleBlock: { x: titleBlock.x + 0.5, y: titleBlock.y },
    },
  };
}

/** A note of the legend: its letter, what it names, and where its leader line runs. */
export interface LegendCalloutData {
  readonly key: keyof LegendTargets;
  readonly tag: string;
  readonly target: Point;
  readonly anchor: Point;
}

/**
 * Leader lines out of the drawing: each runs from its convention to a tag in the band
 * above the plate, or below it for the conventions in its lower half, the tags spread
 * apart so none overlap. Lettered, not numbered: numbers are the parts' balloons.
 */
export function legendCallouts(
  plan: Omit<PlanViewProps, "label">,
  targets: LegendTargets,
  order: readonly (keyof LegendTargets)[],
): LegendCalloutData[] {
  const { box } = plan;
  const middle = box.y + BAND_TOP + (box.height - BAND_TOP - BAND_BOTTOM) / 2;
  const right = (plan.titleBlock?.x ?? box.x + box.width) - 0.5;
  const placed = order.map((key, index) => ({
    key,
    tag: String.fromCharCode(65 + index),
    target: targets[key],
    top: targets[key].y < middle,
  }));
  const spread = (group: typeof placed, y: number, max: number) => {
    let previous = Number.NEGATIVE_INFINITY;
    return [...group]
      .sort((p, q) => p.target.x - q.target.x)
      .map((item) => {
        const x = Math.min(Math.max(item.target.x, previous + 1.3, box.x + 0.5), max);
        previous = x;
        return { key: item.key, tag: item.tag, target: item.target, anchor: { x, y } };
      });
  };
  const top = spread(
    placed.filter((p) => p.top),
    box.y + 0.5,
    box.x + box.width - 0.5,
  );
  const bottom = spread(
    placed.filter((p) => !p.top),
    box.y + box.height - 0.75,
    right,
  );
  return [...top, ...bottom].sort((p, q) => p.tag.localeCompare(q.tag));
}
