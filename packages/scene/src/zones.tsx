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

function ZoneOutline({ zone }: { readonly zone: Zone }) {
  const object = useMemo(() => {
    const x0 = Math.min(zone.from[0], zone.to[0]) + INSET;
    const x1 = Math.max(zone.from[0], zone.to[0]) - INSET;
    const z0 = Math.min(zone.from[1], zone.to[1]) + INSET;
    const z1 = Math.max(zone.from[1], zone.to[1]) - INSET;
    const corners = [
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
  readonly labels: LabelRegistry;
}

/**
 * Where a zone's name is pinned, well past the plate's back edge so it clears the
 * parts standing near it. The middle of that edge, not its corner: the plate's back
 * corner is the top of the drawing, where the stage's title sits. On the right of
 * the plate, the edge's inner end instead: the label opens to the right, and from
 * the middle it would run off the stage.
 */
function labelPoint(zone: Zone, centreX: number): [number, number, number] {
  const x0 = Math.min(zone.from[0], zone.to[0]);
  const x1 = Math.max(zone.from[0], zone.to[0]);
  const middle = (x0 + x1) / 2;
  const x = middle > centreX + 1e-6 ? x0 + INSET : middle;
  return [x, 0, Math.min(zone.from[1], zone.to[1]) - LABEL_OUT];
}

/**
 * The named regions of the plate: a dashed outline each, and an anchor past the
 * plate's back edge where the page pins the zone's name (see `labelPoint`).
 */
export function Zones({ zones, centreX, labels }: ZonesProps) {
  return (
    <>
      {zones.map((zone) => (
        <group key={zone.id}>
          <ZoneOutline zone={zone} />
          <LabelAnchor
            labels={labels}
            id={zoneLabelId(zone.id)}
            position={labelPoint(zone, centreX)}
          />
        </group>
      ))}
    </>
  );
}
