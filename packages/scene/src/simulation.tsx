import type { Frame, Player } from "@nightprint/engine";
import { motion } from "@nightprint/tokens";
import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import { type Color, type Group, Vector3 } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { setBloom } from "./materials";
import { flowThreeColor, noRaycast } from "./palette";

/** Tokens rendered at once. A step rarely moves more than two. */
const POOL = 4;
const LIFT = 0.02;
/** The halo of a token: the 22 % of the visual grammar. */
const HALO_OPACITY = 0.22;
/** Seconds a token takes to appear, or to vanish where it was. */
const SWITCH_S = motion.base / 1000;
/**
 * Further than this between two frames, a token has not travelled: the next step
 * starts it elsewhere. It vanishes where it was and appears where it starts.
 */
const JUMP = 0.5;

function createTokenMaterials() {
  const core = new MeshBasicNodeMaterial();
  setBloom(core, 1);
  const halo = new MeshBasicNodeMaterial({
    transparent: true,
    opacity: HALO_OPACITY,
    depthWrite: false,
  });
  setBloom(halo, 0.6);
  return { core, halo };
}

type TokenMaterials = ReturnType<typeof createTokenMaterials>;

/** A token slot between frames. */
interface Live {
  shown: boolean;
  /** Where it was drawn last frame. */
  readonly last: Vector3;
  /** 0 to 1 while it appears. */
  appear: number;
}

/** The trace of a token that left a place: it shrinks out there. */
interface Ghost {
  /** 1 to 0 while it vanishes. */
  life: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const next = new Vector3();

export interface SimulationProps {
  readonly player: Player;
  /** Receives the frame sampled this frame, for anything that follows the tokens. */
  readonly frame: RefObject<Frame | null>;
  /** The scenario has played to its end: no token is drawn. */
  readonly resting: boolean;
  readonly reducedMotion: boolean;
  /** While true, the scenario gets no time: it waits for the machine to be assembled. */
  readonly hold?: RefObject<boolean>;
}

/** A waiting token breathes: about one breath a second. */
function breath(clockSeconds: number, depth: number): number {
  return 1 + depth * Math.sin(clockSeconds * Math.PI * 2 * 0.9);
}

function TokenMesh({
  material,
  groupRef,
}: {
  readonly material: TokenMaterials;
  readonly groupRef: (group: Group | null) => void;
}) {
  return (
    <group visible={false} ref={groupRef}>
      <mesh raycast={noRaycast} material={material.core}>
        <capsuleGeometry args={[0.1, 0.14, 4, 12]} />
      </mesh>
      <mesh raycast={noRaycast} material={material.halo}>
        <sphereGeometry args={[0.24, 16, 12]} />
      </mesh>
    </group>
  );
}

/**
 * Drives the player with real frame time and draws its tokens. It runs before
 * every other frame callback (priority -1), so pipes read the same instant.
 * Token meshes are pooled and updated imperatively: no React render per frame.
 *
 * Tokens never pop: one that appears grows in; one that leaves, or that the next
 * step starts somewhere else, shrinks out where it was while its successor grows.
 * Cosmetic only, like a fade: the token's position is still the player's.
 */
export function Simulation({ player, frame, resting, reducedMotion, hold }: SimulationProps) {
  const groups = useRef<(Group | null)[]>([]);
  const ghostGroups = useRef<(Group | null)[]>([]);
  const materials = useMemo(() => Array.from({ length: POOL }, createTokenMaterials), []);
  const ghostMaterials = useMemo(() => Array.from({ length: POOL }, createTokenMaterials), []);
  const live = useRef<Live[]>(
    Array.from({ length: POOL }, () => ({ shown: false, last: new Vector3(), appear: 1 })),
  );
  const ghosts = useRef<Ghost[]>(Array.from({ length: POOL }, () => ({ life: 0 })));

  useEffect(
    () => () => {
      for (const { core, halo } of [...materials, ...ghostMaterials]) {
        core.dispose();
        halo.dispose();
      }
    },
    [materials, ghostMaterials],
  );

  useFrame((_, delta) => {
    if (!hold?.current) {
      player.advance(delta * 1000);
    }
    const sampled = player.sample();
    frame.current = sampled;
    const step = reducedMotion ? 1 : delta / SWITCH_S;

    // A token leaves `from`: the first free ghost shrinks out there, in its colour.
    const leave = (from: Vector3, colour: Color) => {
      if (reducedMotion) {
        return;
      }
      const index = ghosts.current.findIndex((g) => g.life <= 0);
      const group = ghostGroups.current[index];
      const ghost = ghosts.current[index];
      const material = ghostMaterials[index];
      if (!group || !ghost || !material) {
        return;
      }
      ghost.life = 1;
      group.position.copy(from);
      material.core.color.copy(colour);
      material.halo.color.copy(colour);
    };

    materials.forEach((material, i) => {
      const group = groups.current[i];
      const state = live.current[i];
      if (!group || !state) {
        return;
      }
      const token = resting ? undefined : sampled.tokens[i];
      if (!token) {
        if (state.shown) {
          leave(state.last, material.core.color);
          state.shown = false;
        }
        group.visible = false;
        return;
      }
      next.set(token.position[0], token.position[1] + LIFT, token.position[2]);
      if (!state.shown) {
        state.appear = 0;
      } else if (state.last.distanceTo(next) > JUMP) {
        leave(state.last, material.core.color);
        state.appear = 0;
      }
      state.shown = true;
      state.appear = Math.min(1, state.appear + step);
      state.last.copy(next);
      group.position.copy(next);
      // Travelling, a token keeps its size; waiting, at a part or at the end of its trip
      // while the caption is read, it breathes. The player's clock runs on while the
      // scenario waits, so a waiting token never freezes.
      const waiting = token.kind === "hold" || sampled.progress >= 1;
      const pulse =
        waiting && !reducedMotion ? breath(sampled.clock, token.kind === "hold" ? 0.12 : 0.07) : 1;
      group.scale.setScalar(pulse * easeOut(state.appear));
      group.visible = true;
      material.core.color.copy(flowThreeColor[token.flow]);
      material.halo.color.copy(flowThreeColor[token.flow]);
    });

    ghosts.current.forEach((ghost, i) => {
      const group = ghostGroups.current[i];
      if (!group) {
        return;
      }
      ghost.life = Math.max(0, ghost.life - step);
      group.visible = ghost.life > 0;
      group.scale.setScalar(easeOut(ghost.life));
    });
  }, -1);

  return (
    <>
      {materials.map((material, i) => (
        <TokenMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size pool, slots never reorder.
          key={`token-${i}`}
          material={material}
          groupRef={(g) => {
            groups.current[i] = g;
          }}
        />
      ))}
      {ghostMaterials.map((material, i) => (
        <TokenMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size pool, slots never reorder.
          key={`ghost-${i}`}
          material={material}
          groupRef={(g) => {
            ghostGroups.current[i] = g;
          }}
        />
      ))}
    </>
  );
}
