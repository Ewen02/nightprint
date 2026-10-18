import type { Zone } from "@nightprint/engine";
import { useEffect, useMemo } from "react";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineSegments2 } from "three/addons/lines/webgpu/LineSegments2.js";
import { Line2NodeMaterial } from "three/webgpu";
import { zoneLabelId } from "./label-ids";
import { LabelAnchor, type LabelRegistry } from "./labels";
import { setBloom } from "./materials";
import { noRaycast, scene } from "./palette";

/** Zones are drawn a little inside their bounds, so two neighbours read as two regions. */
const INSET = 0.12;
const LIFT = 0.004;
/**
 * Labels sit just past the plate's back edge, like notes outside a drawing's frame:
 * in the isometric view that edge runs down to the right, so text set there opens
 * onto empty ground instead of the plate.
 */
const LABEL_OUT = 1.1;

/** A circle as short segments, enough that its dashes read as one round line. */
function circle(cx: number, cz: number, r: number): number[][] {
  const sides = 72;
  return Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2;
    const b = ((i + 1) / sides) * Math.PI * 2;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a), cx + r * Math.cos(b), cz + r * Math.sin(b)];
  });
}

function ZoneOutline({ zone }: { readonly zone: Zone }) {
  const object = useMemo(() => {
    const x0 = Math.min(zone.from[0], zone.to[0]) + INSET;
    const x1 = Math.max(zone.from[0], zone.to[0]) - INSET;
    const z0 = Math.min(zone.from[1], zone.to[1]) + INSET;
    const z1 = Math.max(zone.from[1], zone.to[1]) - INSET;
    const corners =
      zone.shape === "round"
        ? circle((x0 + x1) / 2, (z0 + z1) / 2, Math.min(x1 - x0, z1 - z0) / 2)
        : [
            [x0, z0, x1, z0],
            [x1, z0, x1, z1],
            [x1, z1, x0, z1],
            [x0, z1, x0, z0],
          ];
    const lines = new LineSegmentsGeometry().setPositions(
      corners.flatMap(([ax = 0, az = 0, bx = 0, bz = 0]) => [ax, LIFT, az, bx, LIFT, bz]),
    );
    const material = new Line2NodeMaterial({
      color: scene.edge,
      transparent: true,
      opacity: scene.edgeOpacity.hidden,
      linewidth: scene.lineWidth.hidden,
      depthWrite: false,
      dashed: true,
      dashSize: scene.hiddenDash[0] * 2,
      gapSize: scene.hiddenDash[1] * 2,
    });
    material.alphaToCoverage = false;
    setBloom(material, 0);
    const segments = new LineSegments2(lines, material);
    segments.computeLineDistances();
    segments.raycast = noRaycast;
    return segments;
  }, [zone]);

  useEffect(
    () => () => {
      object.geometry.dispose();
      object.material.dispose();
    },
    [object],
  );

  return <primitive object={object} />;
}

export interface ZonesProps {
  readonly zones: readonly Zone[];
  /** Plate centre on x: zones right of it are labelled from their outer end. */
  readonly centreX: number;
  /** Seen from the front, a zone is a lane: named before its start, like a row. */
  readonly view: "isometric" | "front";
  readonly labels: LabelRegistry;
}

/**
 * Where a zone's name is pinned, well past the plate's back edge so it clears the
 * parts standing near it. The middle of that edge, not its corner: the plate's back
 * corner is the top of the drawing, where the stage's title sits. On the right of
 * the plate, the edge's inner end instead: the label opens to the right, and from
 * the middle it would run off the stage. A wide zone that spans the plate's centre
 * starts its label there, clear of its neighbour's on the left. A zone with others behind
 * it (a bus's row of what the code uses) is named past their right end: its name runs up
 * to the right, over the ground behind it, and would cross them.
 */
function labelPoint(
  zone: Zone,
  centreX: number,
  nested: boolean,
  behind: readonly Zone[],
): [number, number, number] {
  const x0 = Math.min(zone.from[0], zone.to[0]);
  const x1 = Math.max(zone.from[0], zone.to[0]);
  const z0 = Math.min(zone.from[1], zone.to[1]);
  // A zone drawn inside another (a hub's core) is named in its own back corner, inside it;
  // a round one on its rim, at the back.
  if (nested && zone.shape === "round") {
    const x1r = Math.max(zone.from[0], zone.to[0]);
    const z1 = Math.max(zone.from[1], zone.to[1]);
    const r = Math.min(x1r - x0, z1 - z0) / 2;
    return [(x0 + x1r) / 2 - r * Math.SQRT1_2, 0, (z0 + z1) / 2 - r * Math.SQRT1_2];
  }
  if (nested) {
    return [x0 + INSET * 2, 0, z0 + INSET * 2];
  }
  const middle = (x0 + x1) / 2;
  const x = middle > centreX + 1e-6 ? Math.max(x0 + INSET, centreX) : middle;
  const past = Math.max(x, ...behind.map((other) => Math.max(other.from[0], other.to[0]) + INSET));
  return [past < x1 ? past : x, 0, z0 - LABEL_OUT];
}

/** How far a lane's name stands before its start, and back from its middle, in world units. */
const LANE_NAME = { before: 0.3, back: 0.35 } as const;

/**
 * Seen from the front, where a lane's name is pinned: just before its start, about halfway
 * across it, like the heading of a table's row. The name ends there and reads before the
 * parts, on the ground the plate keeps clear on the left. A little back from the middle:
 * the first balloon of the lane in front stands just below its end.
 */
function lanePoint(zone: Zone): [number, number, number] {
  const x0 = Math.min(zone.from[0], zone.to[0]);
  const z0 = Math.min(zone.from[1], zone.to[1]);
  const z1 = Math.max(zone.from[1], zone.to[1]);
  return [x0 - LANE_NAME.before, 0, (z0 + z1) / 2 - LANE_NAME.back];
}

/** The zones wholly behind `zone` that share some of its width: its name would cross them. */
function zonesBehind(zone: Zone, zones: readonly Zone[]): Zone[] {
  const x0 = Math.min(zone.from[0], zone.to[0]);
  const x1 = Math.max(zone.from[0], zone.to[0]);
  const z0 = Math.min(zone.from[1], zone.to[1]);
  return zones.filter(
    (other) =>
      other !== zone &&
      Math.max(other.from[1], other.to[1]) <= z0 + 1e-6 &&
      Math.max(other.from[0], other.to[0]) > x0 &&
      Math.min(other.from[0], other.to[0]) < x1,
  );
}

/** Whether `inner` lies wholly inside `outer`. */
function within(inner: Zone, outer: Zone): boolean {
  const box = (z: Zone) => ({
    x0: Math.min(z.from[0], z.to[0]),
    x1: Math.max(z.from[0], z.to[0]),
    z0: Math.min(z.from[1], z.to[1]),
    z1: Math.max(z.from[1], z.to[1]),
  });
  const a = box(inner);
  const b = box(outer);
  return a.x0 > b.x0 && a.x1 < b.x1 && a.z0 > b.z0 && a.z1 < b.z1;
}

/**
 * The named regions of the plate: a dashed outline each, and an anchor past the
 * plate's back edge where the page pins the zone's name (see `labelPoint`).
 */
export function Zones({ zones, centreX, view, labels }: ZonesProps) {
  return (
    <>
      {zones.map((zone) => (
        <group key={zone.id}>
          <ZoneOutline zone={zone} />
          <LabelAnchor
            labels={labels}
            id={zoneLabelId(zone.id)}
            position={
              view === "front"
                ? lanePoint(zone)
                : labelPoint(
                    zone,
                    centreX,
                    zones.some((other) => other !== zone && within(zone, other)),
                    zonesBehind(zone, zones),
                  )
            }
          />
        </group>
      ))}
    </>
  );
}
