import { type FlowName, flow, neutral } from "@nightprint/tokens";

export type { FlowName };
export { flow, neutral };

export const fonts = {
  sans: "IBM Plex Sans",
  mono: "IBM Plex Mono",
} as const;

/** Type sizes for a 1920×1080 frame watched on a phone: about a fifth of this on screen. */
export const type = {
  display: 104,
  headline: 68,
  body: 44,
  kicker: 28,
  caption: 24,
} as const;

/** Keeps text clear of the edges once X crops or rounds the frame. */
export const safe = { x: 96, y: 80 } as const;

/** A token colour with an alpha channel, for overlays over the footage. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
