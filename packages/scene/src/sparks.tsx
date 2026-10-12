import type { Frame, Vec3 } from "@nightprint/engine";
import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo } from "react";
import { BoxGeometry, InstancedMesh, MathUtils } from "three";
import {
  cos,
  float,
  fract,
  hash,
  instanceIndex,
  positionLocal,
  sin,
  uniform,
  vec3,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { setBloom } from "./materials";
import { flowColor, noRaycast, scene } from "./palette";

const COUNT = 32;
/** Bursts per second: each spark lives 1 / RATE of a second. */
const RATE = 1.6;
const SIZE = 0.055;

export interface SparksProps {
  /** Where the violation is: the top of the offending part, in world space; null if none. */
  readonly origin: Vec3 | null;
  /** The frame sampled this frame: its `clock` keeps running while the scenario waits. */
  readonly frame: RefObject<Frame | null>;
  readonly reducedMotion: boolean;
}

/**
 * Vermillon sparks over a part that breaks the pattern. One emitter, always
 * mounted, so its material is compiled with the scene: it moves to the offending
 * part and fades in and out with the violation. Each spark's path is a function of
 * its index and the player's `clock`, which runs on while the scenario waits, so
 * they never hang mid-air. Computed in the vertex shader: one draw call,
 * no per-frame CPU work. None with reduced motion.
 */
export function Sparks({ origin, frame, reducedMotion }: SparksProps) {
  const u = useMemo(() => ({ phase: uniform(0), active: uniform(0) }), []);

  const mesh = useMemo(() => {
    const seed = float(instanceIndex);
    const life = fract(u.phase.mul(RATE).add(hash(seed)));
    const angle = hash(seed.add(17)).mul(Math.PI * 2);
    const out = hash(seed.add(31)).mul(0.7).add(0.45);
    const up = hash(seed.add(53)).mul(0.7).add(0.7);
    const offset = vec3(
      cos(angle).mul(out).mul(life),
      up.mul(life).sub(life.mul(life).mul(1.1)),
      sin(angle).mul(out).mul(life),
    );
    const material = new MeshBasicNodeMaterial({
      color: flowColor.error,
      transparent: true,
      depthWrite: false,
    });
    material.positionNode = positionLocal.mul(float(1).sub(life)).add(offset);
    material.opacityNode = float(1).sub(life).mul(u.active);
    setBloom(material, u.active);
    const instances = new InstancedMesh(new BoxGeometry(SIZE, SIZE, SIZE), material, COUNT);
    instances.frustumCulled = false;
    instances.raycast = noRaycast;
    return instances;
  }, [u]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    },
    [mesh],
  );

  // Without a violation the emitter stays where it was and fades out.
  useEffect(() => {
    if (origin) {
      mesh.position.set(origin[0], origin[1], origin[2]);
    }
  }, [mesh, origin]);

  useFrame((_, delta) => {
    u.phase.value = frame.current?.clock ?? 0;
    const target = origin && !reducedMotion ? 1 : 0;
    u.active.value = reducedMotion
      ? target
      : MathUtils.damp(u.active.value, target, scene.transition.fade, delta);
  });

  return <primitive object={mesh} />;
}
