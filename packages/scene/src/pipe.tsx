import type { Frame, Vec3 } from "@nightprint/engine";
import { polylineLength } from "@nightprint/engine";
import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo } from "react";
import { BackSide, Color, MathUtils } from "three";
import { color, float, fract, mix, step, uniform, uv } from "three/tsl";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import { litRange, type PipeTravel } from "./flow";
import { createPipeGeometry } from "./geometry";
import { setBloom } from "./materials";
import { flowColor, noRaycast, scene } from "./palette";

export interface PipeProps {
  readonly points: readonly Vec3[];
  /** Drawn under the current actions. An absent pipe fades out; its material stays. */
  readonly present: boolean;
  /** How the current step's token travels this pipe, if it does. */
  readonly travel: PipeTravel | undefined;
  readonly violation: boolean;
  readonly reducedMotion: boolean;
  /** The frame sampled by the simulation this frame. */
  readonly frame: RefObject<Frame | null>;
}

/**
 * A drawn route. At rest it is a dark tube. While a token travels it, the
 * stretch already travelled is lit in the token's flow and blooms; ahead of
 * the token, faint dashes run towards where it is going.
 */
export function Pipe({ points, present, travel, violation, reducedMotion, frame }: PipeProps) {
  const geometry = useMemo(() => createPipeGeometry(points, scene.pipe.radius), [points]);
  const hullGeometry = useMemo(
    () => createPipeGeometry(points, scene.pipe.radius + scene.pipe.outline),
    [points],
  );

  // One material for the pipe's whole life: anything that changes is a uniform, so a
  // switch or a step never compiles a new pipeline.
  const { material, hull, uniforms } = useMemo(() => {
    const u = {
      /** Length of the route, for the dashes' spacing. */
      length: uniform(1),
      /** 1 drawn, 0 absent under the current actions; eased in between. */
      presence: uniform(0),
      base: uniform(new Color(scene.pipeIdle)),
      flow: uniform(new Color(flowColor.request)),
      from: uniform(0),
      to: uniform(0),
      active: uniform(0),
      /** Strength of the lit stretch: 1 while travelled, fading once the token has left. */
      level: uniform(0),
      direction: uniform(1),
      /** Distance the dashes have moved this step, in world units. */
      phase: uniform(0),
      /** 1 on a wire that breaks the pattern: drawn in vermillon even at rest. */
      violation: uniform(0),
      /** Faint glow of a violation wire between the steps that travel it. */
      rest: uniform(0),
    };
    const error = color(flowColor.error);
    const along = uv().x;
    const metres = along.mul(u.length);
    const lit = step(u.from, along).mul(step(along, u.to)).mul(u.level);
    const dashes = step(0.5, fract(metres.sub(u.phase.mul(u.direction)).div(scene.pipe.dash)));
    const ahead = u.active.mul(float(1).sub(lit)).mul(dashes).mul(scene.pipe.aheadOpacity);
    // Fully rough and non-metallic: diffuse like the Lambert bodies, with a typed emissive node.
    const m = new MeshStandardNodeMaterial({ roughness: 1, metalness: 0, transparent: true });
    m.colorNode = u.base;
    m.opacityNode = u.presence;
    m.emissiveNode = u.flow.mul(lit.add(ahead)).add(error.mul(u.rest));
    setBloom(m, lit.add(ahead.mul(0.5)).add(u.rest));

    // The drawn outline: back faces of a slightly larger tube show only along
    // the silhouette, two light lines either side, as in the drawings.
    const h = new MeshBasicNodeMaterial({ side: BackSide, transparent: true, depthWrite: false });
    h.colorNode = mix(mix(color(scene.edge), error, u.violation), u.flow, lit);
    h.opacityNode = mix(float(scene.edgeOpacity.plate), float(1), lit.max(u.violation)).mul(
      u.presence,
    );
    setBloom(h, lit.mul(scene.bloom.edge));
    return { material: m, hull: h, uniforms: u };
  }, []);

  useEffect(() => {
    uniforms.length.value = polylineLength(points);
  }, [uniforms, points]);

  // Geometries follow the points; materials live as long as the pipe.
  useEffect(
    () => () => {
      geometry.dispose();
      hullGeometry.dispose();
    },
    [geometry, hullGeometry],
  );
  useEffect(
    () => () => {
      material.dispose();
      hull.dispose();
    },
    [material, hull],
  );

  useEffect(() => {
    uniforms.base.value.set(violation ? flowColor.error : scene.pipeIdle);
    uniforms.violation.value = violation ? 1 : 0;
    uniforms.rest.value = violation && !travel ? 0.25 : 0;
    uniforms.active.value = travel ? 1 : 0;
    if (!travel) {
      // Keep the last lit stretch and its colour: the frame callback fades it out.
      return;
    }
    uniforms.direction.value = travel.reverse ? -1 : 1;
    uniforms.flow.value.set(flowColor[travel.flow]);
  }, [uniforms, travel, violation]);

  useFrame((_, delta) => {
    const target = present ? 1 : 0;
    uniforms.presence.value = reducedMotion
      ? target
      : MathUtils.damp(uniforms.presence.value, target, scene.transition.fade, delta);
    if (!travel) {
      uniforms.level.value = reducedMotion
        ? 0
        : MathUtils.damp(uniforms.level.value, 0, scene.transition.trail, delta);
      return;
    }
    uniforms.level.value = 1;
    if (!frame.current) {
      return;
    }
    const [from, to] = litRange(travel, frame.current.eased);
    uniforms.from.value = from;
    uniforms.to.value = to;
    // With reduced motion, progress jumps to 1: the dashes stand still.
    uniforms.phase.value = reducedMotion ? 0 : frame.current.progress * scene.pipe.dashTravel;
  });

  return (
    <>
      <mesh geometry={geometry} material={material} raycast={noRaycast} />
      <mesh geometry={hullGeometry} material={hull} raycast={noRaycast} renderOrder={1} />
    </>
  );
}
