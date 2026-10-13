import { Easing, interpolate } from "remotion";
import type { FlowName } from "./theme";

/** What `scripts/capture.mjs` writes next to a machine's video: the footage and its moments. */
export type Timeline = {
  readonly source: string;
  readonly footage: {
    readonly frames: number;
    readonly fps: number;
    /** CSS size of the captured page. */
    readonly width: number;
    readonly height: number;
    /** Device scale factor of the capture: room to zoom without upscaling. */
    readonly scale: number;
  };
  /** Each time the site's step caption changed, from that frame on. */
  readonly steps: readonly TimelineStep[];
  /** Clicks on the what-if switches, in CSS px of the page. */
  readonly clicks: readonly TimelineClick[];
};

export type TimelineStep = {
  readonly from: number;
  readonly number: number;
  readonly count: number;
  readonly title: string;
  readonly flow: FlowName;
};

export type TimelineClick = {
  readonly frame: number;
  readonly name: string;
  /** The whole switch. */
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** The centre of its toggle: where the pointer presses. */
  readonly at: { readonly x: number; readonly y: number };
};

/** The caption on screen at a frame, or null before the first one. */
export function stepAt(steps: readonly TimelineStep[], frame: number): TimelineStep | null {
  let current: TimelineStep | null = null;
  for (const step of steps) {
    if (step.from <= frame) {
      current = step;
    }
  }
  return current;
}

/** The capture's click on `name`; `nth` (from 0) picks a later one when it was clicked again. */
export function clickNamed(timeline: Timeline, name: string, nth = 0): TimelineClick {
  const click = timeline.clicks.filter((c) => c.name === name)[nth];
  if (!click) {
    throw new Error(`The capture has no click ${nth + 1} on "${name}"`);
  }
  return click;
}

/** The frame the site's caption first shows a step. */
export function stepFrom(timeline: Timeline, number: number): number {
  const step = timeline.steps.find((s) => s.number === number);
  if (!step) {
    throw new Error(`The capture never shows step ${number}`);
  }
  return step.from;
}

/** A camera keyframe: the page point at the centre of the frame, and the zoom (1 = whole page). */
export type CameraKey = readonly [frame: number, x: number, y: number, zoom: number];

export type Camera = { readonly x: number; readonly y: number; readonly zoom: number };

const glide = Easing.bezier(0.65, 0, 0.35, 1);

export function cameraAt(keys: readonly CameraKey[], frame: number): Camera {
  const frames = keys.map((k) => k[0]);
  const pick = (i: 1 | 2 | 3) =>
    interpolate(
      frame,
      frames,
      keys.map((k) => k[i]),
      { easing: glide, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  return { x: pick(1), y: pick(2), zoom: pick(3) };
}

/** The page rectangle the camera shows, kept inside the page. */
export function viewOf(
  camera: Camera,
  page: { readonly width: number; readonly height: number },
): {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
} {
  const width = page.width / camera.zoom;
  const height = page.height / camera.zoom;
  return {
    left: Math.min(Math.max(camera.x - width / 2, 0), page.width - width),
    top: Math.min(Math.max(camera.y - height / 2, 0), page.height - height),
    width,
    height,
  };
}

const FLOWS: readonly FlowName[] = ["request", "write", "response", "error"];

function fail(problem: string): never {
  throw new Error(`timeline.json: ${problem}. Run the capture again.`);
}

/** Checks what the capture script wrote, so a stale or hand-edited file fails loudly. */
export function readTimeline(json: unknown): Timeline {
  if (typeof json !== "object" || json === null) {
    fail("not an object");
  }
  const { source, footage, steps, clicks } = json as Record<string, unknown>;
  if (typeof source !== "string") fail("no source URL");
  if (typeof footage !== "object" || footage === null) fail("no footage");
  const f = footage as Record<string, unknown>;
  for (const key of ["frames", "fps", "width", "height", "scale"]) {
    if (typeof f[key] !== "number") fail(`footage.${key} is not a number`);
  }
  if (!Array.isArray(steps) || steps.length === 0) fail("no steps");
  for (const step of steps) {
    const s = step as Record<string, unknown>;
    if (typeof s.from !== "number" || typeof s.number !== "number" || typeof s.count !== "number")
      fail("a step lacks from, number or count");
    if (typeof s.title !== "string") fail("a step lacks its title");
    if (!FLOWS.includes(s.flow as FlowName)) fail(`unknown flow "${String(s.flow)}"`);
  }
  if (!Array.isArray(clicks)) fail("no clicks");
  for (const click of clicks) {
    const c = click as Record<string, unknown>;
    if (typeof c.frame !== "number" || typeof c.name !== "string")
      fail("a click lacks frame or name");
    if (typeof c.box !== "object" || c.box === null) fail(`click "${String(c.name)}" has no box`);
    if (typeof c.at !== "object" || c.at === null) fail(`click "${String(c.name)}" has no point`);
  }
  // Every field was checked above: the shape is the one Timeline declares.
  return json as Timeline;
}
