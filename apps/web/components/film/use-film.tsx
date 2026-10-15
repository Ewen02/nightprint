"use client";

import {
  directFilm,
  FILM_FPS,
  type FilmDirector,
  filmSeconds,
  type Machine,
  ticksFor,
} from "@nightprint/engine";
import type { Film } from "@nightprint/scene";
import type { FilmPreviewProps } from "@nightprint/ui";
import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { canFilm, FILM_SIZE, openEncoder } from "./film-encoder";
import { FilmFrame } from "./film-frame";
import { createPainter, FILM_CAPTION_ROOM, loadFilmFonts } from "./film-paint";
import { filmCaption, filmFileName, filmLabels, filmTitles, filmWhatIf } from "./film-view-model";

// three/webgpu only runs in the browser: the film's stage is never rendered on the server.
const FilmStage = dynamic(() => import("@nightprint/scene").then((m) => m.FilmStage), {
  ssr: false,
});

/** Frames drawn and dropped before the first one kept: every material compiles on them. */
const WARM_UP = 3;
/** Seconds a saved or failed video says so before the button is back. */
const SAID_S = 4;

export type FilmState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "filming";
      readonly percent: number;
      /** Where the film is: "STEP 3 / 8", "WHAT IF", or null while there is no step to name. */
      readonly step: string | null;
    }
  | { readonly kind: "saved"; readonly file: string }
  | { readonly kind: "failed"; readonly message: string };

/** Gives React the turn, so what a frame changed (its step, the assembly) is in the next. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

/**
 * Shoots the film frame by frame: the director says what happens, the stage draws the scene,
 * the painter lays the labels and the words over it, and the encoder takes the frame. Time is
 * the frame's number over 30, however long a frame takes to draw.
 */
async function shoot(
  film: Film,
  director: FilmDirector,
  machine: Machine,
  signal: AbortSignal,
  /** The canvas each frame is painted on, once, for the page to show as the film goes. */
  onCanvas: (canvas: HTMLCanvasElement) => void,
  onProgress: (fraction: number, step: string | null) => void,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = FILM_SIZE.width * FILM_SIZE.scale;
  canvas.height = FILM_SIZE.height * FILM_SIZE.scale;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("this browser cannot paint the video's frames.");
  }
  onCanvas(canvas);
  const paint = createPainter(ctx, await loadFilmFonts());
  const encoder = await openEncoder(canvas, FILM_FPS);
  const total = filmSeconds(machine, film.assemblySeconds);
  const titles = filmTitles(machine);
  try {
    for (let i = 0; i < WARM_UP; i++) {
      film.draw(0);
    }
    film.reveal();
    for (let frame = 0; ; frame++) {
      if (signal.aborted) {
        throw new DOMException("The video was cancelled.", "AbortError");
      }
      const t = frame / FILM_FPS;
      const phase = film.phase();
      const cue = director.cue(t, phase === "done");
      if (cue.act === "over") {
        break;
      }
      film.draw(t);
      const snapshot = director.player.getSnapshot();
      paint({
        t,
        cue,
        frame: film.canvas,
        anchors: film.anchors(),
        labels: filmLabels(snapshot),
        labelsReady: phase === "labels" || phase === "done",
        caption: filmCaption(snapshot),
        stepProgress: director.player.getState().ticks / ticksFor(snapshot.step),
        whatIf: cue.flipped ? filmWhatIf(snapshot, cue.flipped.action) : null,
        titles,
      });
      await encoder.add(t, 1 / FILM_FPS);
      const step =
        cue.act === "scenario" || cue.act === "rest"
          ? `STEP ${snapshot.state.stepIndex + 1} / ${snapshot.stepCount}`
          : cue.act === "flip"
            ? "WHAT IF"
            : null;
      onProgress(Math.min(0.99, t / total), step);
      await nextTask();
    }
    return await encoder.finish();
  } catch (error) {
    await encoder.cancel();
    throw error;
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface FilmControls {
  /** This browser can encode the video. Unknown until checked, then false or true. */
  readonly supported: boolean;
  readonly state: FilmState;
  readonly start: () => void;
  readonly cancel: () => void;
  /** The canvas the film is painted on, while it is shot and a moment after. */
  readonly frame: HTMLCanvasElement | null;
  /** The stage the film is shot on, out of view: render it while filming. */
  readonly stage: ReactNode;
}

/** A video of `machine`, made in the page and downloaded as an MP4. */
export function useFilm(machine: Machine): FilmControls {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    let live = true;
    canFilm().then((ok) => {
      if (live) {
        setSupported(ok);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const [state, setState] = useState<FilmState>({ kind: "idle" });
  const [frame, setFrame] = useState<HTMLCanvasElement | null>(null);
  const [take, setTake] = useState<{ readonly id: number; readonly director: FilmDirector } | null>(
    null,
  );
  const abort = useRef<AbortController | null>(null);
  // Leaving the page stops the filming.
  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    if (state.kind !== "saved" && state.kind !== "failed") {
      return;
    }
    const reset = window.setTimeout(() => {
      setState({ kind: "idle" });
      setFrame(null);
    }, SAID_S * 1000);
    return () => window.clearTimeout(reset);
  }, [state]);

  const start = useCallback(() => {
    if (abort.current) {
      return;
    }
    abort.current = new AbortController();
    setState({ kind: "filming", percent: 0, step: null });
    setTake({ id: Date.now(), director: directFilm(machine) });
  }, [machine]);

  const cancel = useCallback(() => abort.current?.abort(), []);

  const onReady = useCallback(
    (film: Film) => {
      const signal = abort.current?.signal;
      if (!take || !signal) {
        return;
      }
      let percent = 0;
      let where: string | null = null;
      shoot(film, take.director, machine, signal, setFrame, (fraction, step) => {
        // On a new percent or step only: the page re-renders a hundred times, not once a frame.
        const next = Math.floor(fraction * 100);
        if (next !== percent || step !== where) {
          percent = next;
          where = step;
          setState({ kind: "filming", percent, step });
        }
      })
        .then(
          (blob) => {
            const file = filmFileName(machine);
            download(blob, file);
            setState({ kind: "saved", file });
          },
          (error: unknown) => {
            setFrame(null);
            if (error instanceof DOMException && error.name === "AbortError") {
              setState({ kind: "idle" });
              return;
            }
            const message = error instanceof Error ? error.message : String(error);
            setState({ kind: "failed", message });
          },
        )
        .finally(() => {
          abort.current = null;
          setTake(null);
        });
    },
    [take, machine],
  );

  const stage = take && (
    <FilmStage
      key={take.id}
      player={take.director.player}
      width={FILM_SIZE.width}
      height={FILM_SIZE.height}
      scale={FILM_SIZE.scale}
      insetTop={FILM_CAPTION_ROOM}
      onReady={onReady}
    />
  );
  return { supported, state, start, cancel, frame, stage };
}

/** What the transport's button says about the video, and what it reads out. */
export function filmButton(film: FilmControls) {
  const { state } = film;
  switch (state.kind) {
    case "idle":
      return { label: "Download video", status: "", filming: false, onFilm: film.start };
    case "filming":
      return {
        label: `Cancel · ${state.percent} %`,
        status: "Filming the video. It downloads when it is done.",
        filming: true,
        progress: state.percent / 100,
        onFilm: film.cancel,
      };
    case "saved":
      return {
        label: "Video downloaded",
        status: "The video is in your downloads.",
        filming: false,
        onFilm: film.start,
      };
    case "failed":
      return {
        label: "Video failed",
        status: `The video could not be made: ${state.message}`,
        filming: false,
        onFilm: film.start,
      };
  }
}

/** The card in the stage's corner that shows the video being made, or none. */
export function filmPreview(film: FilmControls): FilmPreviewProps | null {
  const { state, frame } = film;
  if (!frame || (state.kind !== "filming" && state.kind !== "saved")) {
    return null;
  }
  return {
    state:
      state.kind === "filming"
        ? { kind: "filming", percent: state.percent, step: state.step }
        : { kind: "saved", file: state.file },
    frame: <FilmFrame source={frame} />,
  };
}
