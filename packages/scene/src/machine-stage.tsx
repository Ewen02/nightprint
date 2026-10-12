"use client";

import type { Player } from "@nightprint/engine";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { PCFShadowMap } from "three";
import { WebGPURenderer } from "three/webgpu";
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
  return (
    <div className={`relative size-full ${className ?? ""}`}>
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
        />
      </Canvas>
      <LabelLayer labels={labels} callouts={callouts} />
    </div>
  );
}
