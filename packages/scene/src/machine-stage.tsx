"use client";

import type { Player } from "@nightprint/engine";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { PCFShadowMap } from "three";
import { WebGPURenderer } from "three/webgpu";
import type { AssemblyPhase } from "./assembly";
import { createLabelRegistry, LabelLayer, type StageCallout } from "./labels";
import { MachineScene } from "./machine-scene";
import { filterThreeConsole } from "./three-console";

// Before any Canvas exists: R3F creates its deprecated Clock with the store.
filterThreeConsole();

export interface MachineStageProps {
  readonly player: Player;
  /** Accessible description of what the scene shows. */
  readonly label: string;
  readonly selected?: string | null;
  /** Part under the pointer, in the scene or on its row in the bill of parts. */
  readonly hovered?: string | null;
  /** What to show at each part's anchor: balloons, names, the selected part's card. */
  readonly callouts: readonly StageCallout[];
  readonly onSelect?: (partId: string | null) => void;
  readonly onHover?: (partId: string | null) => void;
  /**
   * `follow`: the camera leans towards each step's parts. `overview`: it keeps
   * the whole machine framed, for a small stage whose corners hold overlays.
   */
  readonly camera?: "follow" | "overview";
  /**
   * Width kept clear on the left, in CSS px, for text laid over the stage: the
   * machine is framed in the rest of the canvas.
   */
  readonly insetLeft?: number;
  readonly className?: string;
}

/**
 * WebGPU first: WebGPURenderer uses its WebGL2 backend by itself when
 * WebGPU is missing. Only built-in and node materials are used, so the
 * scene renders the same on both backends.
 */
async function createRenderer({ canvas }: { canvas: unknown }) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Nightprint needs a browser canvas");
  }
  const renderer = new WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  return renderer;
}

/**
 * No shadows. R3F sets PCFSoftShadowMap even when shadows are off, and WebGPURenderer warns that
 * it no longer exists: give it the type it supports.
 */
const NO_SHADOWS = { enabled: false, type: PCFShadowMap };

/**
 * R3F re-measures the canvas on every page scroll by default, to keep its page
 * offset. Nothing here needs it (pointer events use offsetX/Y), and each new
 * measure re-renders the scene: measure on resize only.
 */
const MEASURE = { scroll: false } as const;

/** Frames drawn before the stage shows: by then every material has compiled once. */
const FRAMES_BEFORE_SHOWING = 3;

/** Calls `onReady` once, after the first frames have been drawn. */
function FirstFrames({ onReady }: { readonly onReady: () => void }) {
  const drawn = useRef(0);
  useFrame(() => {
    if (drawn.current < FRAMES_BEFORE_SHOWING) {
      drawn.current += 1;
      if (drawn.current === FRAMES_BEFORE_SHOWING) {
        onReady();
      }
    }
  });
  return null;
}

export function MachineStage({
  player,
  label,
  selected = null,
  hovered = null,
  callouts,
  onSelect,
  onHover,
  camera = "follow",
  insetLeft = 0,
  className,
}: MachineStageProps) {
  const [labels] = useState(createLabelRegistry);
  // The stage, labels included, fades in once its first frames are drawn: never an
  // empty canvas, a half-built scene or labels floating before their parts.
  const [ready, setReady] = useState(false);
  // The labels come last in the assembly, once their parts are set down.
  const [phase, setPhase] = useState<AssemblyPhase>("compiling");
  const labelsShown = phase === "labels" || phase === "done";
  return (
    <div
      className={`relative size-full transition-opacity duration-700 ease-machine motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    >
      <Canvas
        role="img"
        aria-label={label}
        orthographic
        flat
        shadows={NO_SHADOWS}
        dpr={[1, 2]}
        camera={{ position: [30, 30, 30], zoom: 40, near: 0.1, far: 200 }}
        gl={createRenderer}
        resize={MEASURE}
        onPointerMissed={() => onSelect?.(null)}
      >
        <MachineScene
          player={player}
          selected={selected}
          hovered={hovered}
          labels={labels}
          onSelect={onSelect}
          onHover={onHover}
          follows={camera === "follow"}
          insetLeft={insetLeft}
          revealed={ready}
          onPhase={setPhase}
        />
        <FirstFrames onReady={() => setReady(true)} />
      </Canvas>
      <div
        className={`transition-opacity duration-500 ease-machine motion-reduce:transition-none ${labelsShown ? "opacity-100" : "opacity-0"}`}
      >
        <LabelLayer labels={labels} callouts={callouts} />
      </div>
    </div>
  );
}
