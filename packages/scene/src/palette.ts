import type { Flow } from "@nightprint/engine";
import { flow, neutral, scene } from "@nightprint/tokens";
import { Color } from "three";

/** Fails to compile if the engine and the tokens disagree on the flows. */
export const flowColor: Readonly<Record<Flow, string>> = flow;

/** Pre-parsed colours for per-frame updates. */
export const flowThreeColor: Readonly<Record<Flow, Color>> = {
  request: new Color(flow.request),
  write: new Color(flow.write),
  response: new Color(flow.response),
  error: new Color(flow.error),
};

export { neutral, scene };

/** Disables raycasting on decorative objects (edges, glass, pipes). */
export function noRaycast(): void {}
