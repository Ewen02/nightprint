import type { Flow, Part } from "@nightprint/engine";
import { easeInOutCubic } from "@nightprint/engine";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { type Group, MathUtils, Vector3 } from "three";
import { uniform } from "three/tsl";
import { type EdgeStyle, Edges } from "./edges";
import { LabelAnchor, type LabelRegistry } from "./labels";
import { createBodyMaterial, createGlassMaterial, createSectionMaterial } from "./materials";
import { flowColor, neutral, noRaycast, scene } from "./palette";
import { createPartGeometry, partTop } from "./part-geometry";

/** Glass after every opaque part and its edges; its own edges after the glass. */
const GLASS_ORDER = 3;
const GLASS_HIDDEN: EdgeStyle = {
  color: scene.edge,
  opacity: scene.edgeOpacity.hidden,
  width: scene.lineWidth.hidden,
  bloom: 0,
};

/**
 * A moved part is unplugged, lifted, carried and plugged in: it rises first,
 * travels at height, then sets down. Two parts swapping places cross the same
 * column at the same time, so a part carried towards +z flies one lane higher.
 */
const MOVE_MS = 1100;
const LIFT = 0.95;
const UPPER_LANE = 1;

interface Move {
  readonly from: Vector3;
  readonly to: Vector3;
  readonly lift: number;
  /** 0 to 1 over the move. */
  t: number;
}

/** Height over the move: up in the first fifth, held, down in the last fifth. */
function liftAt(t: number): number {
  return Math.min(1, Math.sin(Math.PI * t) * 1.8);
}

/** Horizontal travel happens while the part is up. */
function carryAt(t: number): number {
  return easeInOutCubic((t - 0.2) / 0.6);
}

export interface PartModelProps {
  readonly part: Part;
  readonly focused: boolean;
  readonly selected: boolean;
  /** The pointer is on the part, here or on its row in the bill of parts. */
  readonly hovered: boolean;
  /** Flow of the current step, colours a focused part. */
  readonly flow: Flow;
  readonly reducedMotion: boolean;
  /** Where the part's number is pinned, for the label layer over the canvas. */
  readonly labels: LabelRegistry;
  readonly onSelect?: ((partId: string) => void) | undefined;
  readonly onHover?: ((partId: string | null) => void) | undefined;
  /**
   * The machine's first display: `clock` counts seconds since the stage showed (-1
   * before), and the part is set down from `at`. Absent with reduced motion.
   */
  readonly arrival?: { readonly clock: RefObject<number>; readonly at: number } | undefined;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function PartModel({
  part,
  focused,
  selected,
  hovered,
  flow,
  reducedMotion,
  labels,
  onSelect,
  onHover,
  arrival,
}: PartModelProps) {
  const group = useRef<Group>(null);
  // What the arrival moves: the part's body, not its label anchor.
  const body = useRef<Group>(null);
  const arrived = useRef(arrival === undefined);
  useFrame(() => {
    const g = body.current;
    if (!g || arrived.current || !arrival) {
      return;
    }
    const t = arrival.clock.current ?? -1;
    // Before the stage shows, the part is drawn whole: its material compiles now, unseen.
    if (t < 0) {
      return;
    }
    const p = MathUtils.clamp((t - arrival.at) / scene.assembly.part, 0, 1);
    const e = easeOut(p);
    const { grow, drop } = scene.assembly;
    g.visible = p > 0;
    g.scale.setScalar(grow + (1 - grow) * e);
    g.position.y = (1 - e) * drop;
    if (p >= 1) {
      g.scale.setScalar(1);
      g.position.y = 0;
      arrived.current = true;
    }
  });
  const glass = part.material === "glass";
  const { kind, shape, socket } = part;
  const geometry = useMemo(
    () => createPartGeometry({ kind, shape, socket }),
    [kind, shape, socket],
  );
  const top = useMemo(() => partTop(geometry), [geometry]);
  const material = useMemo(() => {
    if (glass) {
      return createGlassMaterial();
    }
    if (part.kind === "core") {
      return createSectionMaterial(scene.core);
    }
    return createBodyMaterial(scene.body, part.shape.type !== "cylinder");
  }, [glass, part.kind, part.shape.type]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Position is driven imperatively so a swapped part travels instead of jumping.
  const move = useRef<Move | null>(null);
  const [x, y, z] = part.position;

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial placement only.
  useLayoutEffect(() => {
    group.current?.position.set(x, y, z);
  }, []);

  useEffect(() => {
    const g = group.current;
    const to = new Vector3(x, y, z);
    if (!g || g.position.distanceTo(to) < 1e-4) {
      return;
    }
    if (reducedMotion) {
      g.position.copy(to);
      move.current = null;
      return;
    }
    const from = move.current ? move.current.to.clone() : g.position.clone();
    const lift = LIFT + (to.z > from.z ? UPPER_LANE : 0);
    move.current = { from, to, lift, t: 0 };
  }, [x, y, z, reducedMotion]);

  useFrame((_, delta) => {
    const g = group.current;
    const m = move.current;
    if (!g || !m) {
      return;
    }
    m.t = Math.min(1, m.t + (delta * 1000) / MOVE_MS);
    g.position.lerpVectors(m.from, m.to, carryAt(m.t));
    g.position.y += liftAt(m.t) * m.lift;
    if (m.t >= 1) {
      move.current = null;
    }
  });

  const violation = part.flag === "violation";
  const lit = focused || selected || hovered || violation;
  /** A flow colour lights the part; selection or hover alone is white, and white never blooms. */
  const flowLit = focused || violation;
  const accent = violation ? flowColor.error : focused ? flowColor[flow] : neutral.text;

  const rest = useMemo<EdgeStyle>(
    () => ({
      color: scene.edge,
      opacity: glass ? scene.edgeOpacity.glass : scene.edgeOpacity.solid,
      width: scene.lineWidth.edge,
      bloom: 0,
    }),
    [glass],
  );
  const litStyle = useMemo<EdgeStyle | undefined>(
    () =>
      lit
        ? {
            color: accent,
            opacity: 1,
            width: scene.lineWidth.lit,
            bloom: flowLit ? scene.bloom.edge : 0,
          }
        : undefined,
    [lit, accent, flowLit],
  );

  // 0 at rest, 1 lit: eased every frame so a part lights up and goes out smoothly.
  const level = useMemo(() => uniform(0), []);

  useEffect(() => {
    if (lit && "emissive" in material) {
      material.emissive.set(accent);
    }
  }, [material, lit, accent]);

  useFrame((_, delta) => {
    const target = lit ? 1 : 0;
    level.value = reducedMotion
      ? target
      : MathUtils.damp(level.value, target, scene.transition.fade, delta);
    if ("emissive" in material) {
      // White (hover, selection) glows half as much as a flow colour: a pointer, not an event.
      material.emissiveIntensity = level.value * scene.litEmissive * (flowLit ? 1 : 0.5);
    }
  });

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect?.(part.id);
  };
  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover?.(part.id);
  };
  const leave = () => {
    document.body.style.cursor = "";
    onHover?.(null);
  };

  return (
    <group
      ref={group}
      rotation-y={part.rotationY}
      onClick={glass ? undefined : select}
      onPointerOver={glass ? undefined : enter}
      onPointerOut={glass ? undefined : leave}
    >
      <group ref={body}>
        {glass ? (
          <>
            <mesh
              geometry={geometry}
              material={material}
              raycast={noRaycast}
              renderOrder={GLASS_ORDER}
            />
            <Edges geometry={geometry} rest={rest} renderOrder={GLASS_ORDER + 1} />
            <Edges
              geometry={geometry}
              rest={GLASS_HIDDEN}
              pass="hidden"
              renderOrder={GLASS_ORDER + 2}
            />
          </>
        ) : (
          <>
            <mesh geometry={geometry} material={material} />
            <Edges geometry={geometry} rest={rest} lit={litStyle} level={level} />
          </>
        )}
      </group>
      {part.ref !== undefined && (
        <LabelAnchor labels={labels} id={part.id} position={[0, top + 0.4, 0]} />
      )}
    </group>
  );
}
