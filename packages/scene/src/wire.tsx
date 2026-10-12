import type { Flow, Vec3 } from "@nightprint/engine";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Color, MathUtils } from "three";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineSegments2 } from "three/addons/lines/webgpu/LineSegments2.js";
import { color, float, mix, uniform } from "three/tsl";
import { Line2NodeMaterial } from "three/webgpu";
import { setBloom } from "./materials";
import { flowColor, noRaycast, scene } from "./palette";

/** Opacity of a wire at rest: faint, like a wiring note. */
const REST_OPACITY = scene.edgeOpacity.hidden + 0.12;

export interface WireProps {
  readonly points: readonly Vec3[];
  /** Drawn under the current actions. An absent wire fades out; its material stays. */
  readonly present: boolean;
  /** Lit in a flow colour while the step is about both of its ends, else null. */
  readonly flow: Flow | null;
  readonly reducedMotion: boolean;
}

/**
 * A configuration wire: how the configurator plugs an adapter in. Dashed and
 * faint, like a wiring note on a drawing; it carries no token. Lighting up,
 * fading in or out and moving only change uniforms and geometry: its material
 * is compiled once.
 */
export function Wire({ points, present, flow, reducedMotion }: WireProps) {
  const u = useMemo(
    () => ({ presence: uniform(0), lit: uniform(0), colour: uniform(new Color(scene.edge)) }),
    [],
  );

  const object = useMemo(() => {
    const material = new Line2NodeMaterial({
      transparent: true,
      depthWrite: false,
      dashed: true,
      dashSize: scene.hiddenDash[0] * 1.5,
      gapSize: scene.hiddenDash[1],
    });
    material.alphaToCoverage = false;
    material.colorNode = mix(color(scene.edge), u.colour, u.lit);
    material.opacityNode = mix(float(REST_OPACITY), float(1), u.lit).mul(u.presence);
    setBloom(material, u.lit.mul(scene.bloom.edge));
    const segments = new LineSegments2(new LineSegmentsGeometry(), material);
    segments.raycast = noRaycast;
    return segments;
  }, [u]);

  useEffect(() => () => object.material.dispose(), [object]);

  useEffect(() => {
    const geometry = new LineSegmentsGeometry().setPositions(
      points.slice(1).flatMap((b, i) => [...(points[i] ?? b), ...b]),
    );
    const previous = object.geometry;
    object.geometry = geometry;
    object.computeLineDistances();
    previous.dispose();
  }, [object, points]);

  useEffect(() => () => object.geometry.dispose(), [object]);

  useEffect(() => {
    // Keep the last colour when the wire goes out, so it fades from it.
    if (flow) {
      u.colour.value.set(flowColor[flow]);
    }
  }, [u, flow]);

  useFrame((_, delta) => {
    const ease = (from: number, to: number) =>
      reducedMotion ? to : MathUtils.damp(from, to, scene.transition.fade, delta);
    u.presence.value = ease(u.presence.value, present ? 1 : 0);
    u.lit.value = ease(u.lit.value, flow ? 1 : 0);
    object.material.linewidth =
      scene.lineWidth.hidden + (scene.lineWidth.edge - scene.lineWidth.hidden) * u.lit.value;
  });

  return <primitive object={object} />;
}
