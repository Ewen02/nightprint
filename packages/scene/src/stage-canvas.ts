import { PCFShadowMap } from "three";
import { WebGPURenderer } from "three/webgpu";

/**
 * What every canvas of a machine is set up with: the page's stage and the film's. WebGPU
 * first: WebGPURenderer uses its WebGL2 backend by itself when WebGPU is missing. Only
 * built-in and node materials are used, so the scene renders the same on both backends.
 * `forceWebGL` keeps to WebGL2 even where WebGPU runs: a frame read back right after it
 * is drawn (the film) is then the frame just drawn, on every browser.
 */
export function rendererFactory(forceWebGL = false) {
  return async ({ canvas }: { canvas: unknown }) => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Nightprint needs a browser canvas");
    }
    const renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL });
    await renderer.init();
    return renderer;
  };
}

/**
 * No shadows. R3F sets PCFSoftShadowMap even when shadows are off, and WebGPURenderer warns that
 * it no longer exists: give it the type it supports.
 */
export const NO_SHADOWS = { enabled: false, type: PCFShadowMap };

/**
 * R3F re-measures the canvas on every page scroll by default, to keep its page
 * offset. Nothing here needs it (pointer events use offsetX/Y), and each new
 * measure re-renders the scene: measure on resize only.
 */
export const MEASURE = { scroll: false } as const;

/** The isometric camera before the rig frames it. */
export const CAMERA = { position: [30, 30, 30], zoom: 40, near: 0.1, far: 200 } as const;
