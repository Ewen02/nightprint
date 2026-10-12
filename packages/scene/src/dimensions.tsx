import type { Route, Vec3 } from "@nightprint/engine";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { MathUtils, Vector3 } from "three";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineSegments2 } from "three/addons/lines/webgpu/LineSegments2.js";
import { uniform } from "three/tsl";
import { Line2NodeMaterial } from "three/webgpu";
import { dimensionLabelId } from "./label-ids";
import { LabelAnchor, type LabelRegistry } from "./labels";
import { setBloom } from "./materials";
import { noRaycast, scene } from "./palette";

export interface DimensionedRoute {
  readonly route: Route;
  readonly points: readonly Vec3[];
  readonly present: boolean;
}

interface Placement {
  readonly lines: number[];
  readonly label: Vec3;
}

const key = (a: Vec3, b: Vec3) =>
  [a, b]
    .map((p) => p.map((v) => v.toFixed(3)).join(","))
    .sort()
    .join("|");

/**
 * Where a route's dimension goes: along its longest segment that no other route
 * shares (two pipes merging into one port would stack their values), on the side
 * away from the plate's centre, like a dimension set outside the part it measures.
 */
function place(
  points: readonly Vec3[],
  shared: ReadonlySet<string>,
  centre: readonly [number, number],
): Placement | null {
  const segments = points.slice(1).map((b, i) => [points[i] as Vec3, b] as const);
  const horizontal = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[2] - a[2]);
  const candidates = segments.filter(([a, b]) => horizontal(a, b) > 0.3);
  const own = candidates.filter(([a, b]) => !shared.has(key(a, b)));
  const pick = (own.length > 0 ? own : candidates).reduce<readonly [Vec3, Vec3] | null>(
    (best, s) => (!best || horizontal(s[0], s[1]) > horizontal(best[0], best[1]) ? s : best),
    null,
  );
  if (!pick) {
    return null;
  }
  const [a, b] = pick.map((p) => new Vector3(...p));
  if (!a || !b) {
    return null;
  }
  const along = b.clone().sub(a).normalize();
  const normal = new Vector3(-(b.z - a.z), 0, b.x - a.x).normalize();
  const middle = a.clone().add(b).multiplyScalar(0.5);
  if (normal.dot(new Vector3(middle.x - centre[0], 0, middle.z - centre[1])) < 0) {
    normal.negate();
  }
  const { offset, gap, overshoot, tick } = scene.dimension;
  const at = (p: Vector3, d: number) => p.clone().addScaledVector(normal, d);
  const slash = along.clone().add(normal).normalize().multiplyScalar(tick);
  const lines: number[] = [];
  const segment = (p: Vector3, q: Vector3) => lines.push(p.x, p.y, p.z, q.x, q.y, q.z);
  segment(at(a, gap), at(a, offset + overshoot));
  segment(at(b, gap), at(b, offset + overshoot));
  segment(at(a, offset), at(b, offset));
  for (const end of [a, b]) {
    const p = at(end, offset);
    segment(p.clone().sub(slash), p.clone().add(slash));
  }
  const label = at(middle, offset);
  return { lines, label: [label.x, label.y, label.z] };
}

function Dimension({
  id,
  placement,
  present,
  reducedMotion,
  labels,
}: {
  readonly id: string;
  readonly placement: Placement;
  readonly present: boolean;
  readonly reducedMotion: boolean;
  readonly labels: LabelRegistry;
}) {
  const presence = useMemo(() => uniform(0), []);
  // One material for the dimension's whole life: appearing, fading and moving
  // change a uniform and the geometry, never the pipeline.
  const object = useMemo(() => {
    const material = new Line2NodeMaterial({
      color: scene.edge,
      transparent: true,
      linewidth: scene.lineWidth.hidden,
      depthWrite: false,
    });
    material.alphaToCoverage = false;
    material.opacityNode = presence.mul(scene.dimension.opacity);
    setBloom(material, 0);
    const segments = new LineSegments2(new LineSegmentsGeometry(), material);
    segments.raycast = noRaycast;
    return segments;
  }, [presence]);

  useEffect(() => () => object.material.dispose(), [object]);
  useEffect(() => () => object.geometry.dispose(), [object]);

  const linesKey = placement.lines.map((v) => v.toFixed(4)).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when the lines change, not when a new array holds the same ones.
  useEffect(() => {
    const previous = object.geometry;
    object.geometry = new LineSegmentsGeometry().setPositions(placement.lines);
    previous.dispose();
  }, [object, linesKey]);

  useFrame((_, delta) => {
    const target = present ? 1 : 0;
    presence.value = reducedMotion
      ? target
      : MathUtils.damp(presence.value, target, scene.transition.fade, delta);
  });

  return (
    <>
      <primitive object={object} />
      <LabelAnchor labels={labels} id={dimensionLabelId(id)} position={placement.label} />
    </>
  );
}

export interface DimensionsProps {
  /** Every drawn route the actions can produce; those with a latency get a dimension. */
  readonly routes: readonly DimensionedRoute[];
  readonly centre: readonly [number, number];
  readonly reducedMotion: boolean;
  readonly labels: LabelRegistry;
}

/**
 * The latency of each drawn route, set as a dimension of the drawing: extension
 * lines, a dimension line with oblique ticks, and an anchor where the page pins
 * the value. Mounted for every route the actions can draw, faded in and out.
 */
export function Dimensions({ routes, centre, reducedMotion, labels }: DimensionsProps) {
  const placements = useMemo(() => {
    const seen = new Map<string, number>();
    for (const { points } of routes.filter((r) => r.present)) {
      for (let i = 1; i < points.length; i++) {
        const k = key(points[i - 1] as Vec3, points[i] as Vec3);
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
    }
    const shared = new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
    return routes
      .filter(({ route }) => route.latencyMs > 0)
      .map(({ route, points, present }) => ({
        id: route.id,
        present,
        placement: place(points, shared, centre),
      }))
      .filter(
        (d): d is { id: string; present: boolean; placement: Placement } => d.placement !== null,
      );
  }, [routes, centre]);

  return (
    <>
      {placements.map(({ id, present, placement }) => (
        <Dimension
          key={id}
          id={id}
          placement={placement}
          present={present}
          reducedMotion={reducedMotion}
          labels={labels}
        />
      ))}
    </>
  );
}
