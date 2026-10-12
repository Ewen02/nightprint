import type { Vec3 } from "@nightprint/engine";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { ConeGeometry, MathUtils, Quaternion, Vector3 } from "three";
import { uniform } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { setBloom } from "./materials";
import { flowColor, noRaycast, scene } from "./palette";

const RADIUS = 0.12;
const LENGTH = 0.32;
/** The tip stops short of the route's end, clear of plugs and receptacles. */
const SET_BACK = 0.26;
const UP = new Vector3(0, 1, 0);

export interface DependencyArrowProps {
  /** The route's points, in its drawing direction. */
  readonly points: readonly Vec3[];
  /** The end the other one depends on. */
  readonly end: "from" | "to";
  readonly violation: boolean;
  /** Drawn under the current actions. An absent arrow fades out; its material stays. */
  readonly present: boolean;
  readonly reducedMotion: boolean;
}

/**
 * The arrowhead of a source code dependency, on a pipe, pointing at the part
 * that is depended on. Every one points into the application, against the data
 * flow on the driven side; a violation points out, in vermillon.
 */
export function DependencyArrow({
  points,
  end,
  violation,
  present,
  reducedMotion,
}: DependencyArrowProps) {
  const presence = useMemo(() => uniform(0), []);
  const placement = useMemo(() => {
    const ordered = end === "to" ? points : [...points].reverse();
    const tip = new Vector3(...(ordered[ordered.length - 1] ?? [0, 0, 0]));
    const before = new Vector3(...(ordered[ordered.length - 2] ?? [0, 0, 0]));
    const direction = tip.clone().sub(before).normalize();
    const centre = tip.clone().addScaledVector(direction, -(SET_BACK + LENGTH / 2));
    return {
      position: centre.toArray(),
      quaternion: new Quaternion().setFromUnitVectors(UP, direction),
    };
  }, [points, end]);

  const geometry = useMemo(() => new ConeGeometry(RADIUS, LENGTH, 20), []);
  const material = useMemo(() => {
    const m = new MeshBasicNodeMaterial({
      color: violation ? flowColor.error : scene.edge,
      transparent: true,
    });
    m.opacityNode = presence;
    setBloom(m, presence.mul(violation ? scene.bloom.edge : 0));
    return m;
  }, [violation, presence]);

  useFrame((_, delta) => {
    const target = present ? 1 : 0;
    presence.value = reducedMotion
      ? target
      : MathUtils.damp(presence.value, target, scene.transition.fade, delta);
  });

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={placement.position}
      quaternion={placement.quaternion}
      raycast={noRaycast}
    />
  );
}
