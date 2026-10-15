"use client";

import type { Player } from "@nightprint/engine";
import { advance, Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { type AssemblyPhase, assemblyTimeline } from "./assembly";
import {
  createLabelRegistry,
  type LabelRegistry,
  projectAnchors,
  type ScreenPosition,
} from "./labels";
import { MachineScene } from "./machine-scene";
import { CAMERA, MEASURE, NO_SHADOWS, rendererFactory } from "./stage-canvas";
import { filterThreeConsole } from "./three-console";

filterThreeConsole();

/** A machine's scene, drawn one frame at a time on demand: what a film is shot from. */
export interface Film {
  /**
   * Moves the scene on to `seconds` from the first frame and draws it: every frame callback
   * runs once, with the time since the frame before. Nothing moves between two calls.
   */
  draw(seconds: number): void;
  /** What was drawn last; read it before the next `draw`. */
  readonly canvas: HTMLCanvasElement;
  /** Where each label's anchor stands on the stage now, in CSS px. */
  anchors(): ReadonlyMap<string, ScreenPosition>;
  /** Where the assembly stands: labels belong on the film from `labels` on. */
  phase(): AssemblyPhase;
  /** Starts the assembly: the parts are set down from the next frame. */
  reveal(): void;
  /** Seconds from the reveal to the scenario's start; none when the system asks for less motion. */
  readonly assemblySeconds: number;
}

export interface FilmStageProps {
  /** A player of its own: the film runs its scenario without touching the page's. */
  readonly player: Player;
  /** The stage's size in CSS px, and how many pixels it draws per CSS px. */
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  /** Room kept clear for the captions, as on the page's stage. */
  readonly insetTop?: number;
  readonly insetLeft?: number;
  readonly insetRight?: number;
  /** Called once the renderer is ready, with the film to draw from. */
  readonly onReady: (film: Film) => void;
}

const createRenderer = rendererFactory(true);

function FilmHandle({
  labels,
  phase,
  reveal,
  assemblySeconds,
  onReady,
}: {
  readonly labels: LabelRegistry;
  readonly phase: { readonly current: AssemblyPhase };
  readonly reveal: () => void;
  readonly assemblySeconds: number;
  readonly onReady: (film: Film) => void;
}) {
  const get = useThree((state) => state.get);
  // Once, with the renderer and the scene in place: the film reads them through `get`.
  const ready = useRef(onReady);
  useEffect(() => {
    const state = get();
    ready.current({
      canvas: state.gl.domElement,
      draw: (seconds) => advance(seconds, true, get()),
      anchors: () => projectAnchors(labels, get().camera, get().size),
      phase: () => phase.current,
      reveal,
      assemblySeconds,
    });
  }, [get, labels, phase, reveal, assemblySeconds]);
  return null;
}

/**
 * The machine as the page's stage draws it, at a fixed size and out of view, for a film:
 * no frame is drawn until the film asks for one, so each frame is one exact step of the
 * scene however long it takes to draw. WebGL2 always, read back right after each frame.
 * The labels are not laid over it: the film paints them from `anchors`.
 */
export function FilmStage({
  player,
  width,
  height,
  scale,
  insetTop = 0,
  insetLeft = 0,
  insetRight = 0,
  onReady,
}: FilmStageProps) {
  const [labels] = useState(createLabelRegistry);
  const [revealed, setRevealed] = useState(false);
  const phase = useRef<AssemblyPhase>("compiling");
  // Committed before the next frame is drawn, so that frame already sets the parts down.
  const [reveal] = useState(() => () => flushSync(() => setRevealed(true)));
  const [onPhase] = useState(() => (next: AssemblyPhase) => {
    phase.current = next;
  });
  // As MachineScene decides it: no assembly for a system that asks for less motion.
  const [assemblySeconds] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : assemblyTimeline(player.machine.parts).run,
  );
  return (
    <div
      aria-hidden="true"
      // Laid out at its full size, so the canvas has it, and out of the page's view.
      style={{ position: "fixed", left: 0, top: 0, width, height, transform: "translateX(-300vw)" }}
      className="pointer-events-none"
    >
      <Canvas
        orthographic
        flat
        frameloop="never"
        shadows={NO_SHADOWS}
        dpr={scale}
        camera={{ ...CAMERA, position: [...CAMERA.position] }}
        gl={createRenderer}
        resize={MEASURE}
      >
        <MachineScene
          player={player}
          selected={null}
          hovered={null}
          labels={labels}
          follows
          insetTop={insetTop}
          insetLeft={insetLeft}
          insetRight={insetRight}
          revealed={revealed}
          onPhase={onPhase}
        />
        <FilmHandle
          labels={labels}
          phase={phase}
          reveal={reveal}
          assemblySeconds={assemblySeconds}
          onReady={onReady}
        />
      </Canvas>
    </div>
  );
}
