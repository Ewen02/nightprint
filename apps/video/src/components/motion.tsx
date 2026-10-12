import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { neutral, withAlpha } from "../theme";

/** The house curve: quick out, long settle, no bounce. */
export const settle = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type RevealProps = {
  /** Local frame the line starts rising. */
  readonly at: number;
  /** Local frame it starts sinking out, if it leaves before its sequence ends. */
  readonly out?: number;
  readonly duration?: number;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
};

/** A line that rises out of a mask, like type set on a plate, and sinks back out. */
export function Reveal({ at, out, duration = 14, children, style }: RevealProps) {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [at, at + duration], [110, 0], { ...clamp, easing: settle });
  const sink =
    out === undefined
      ? 0
      : interpolate(frame, [out, out + 10], [0, -110], {
          ...clamp,
          easing: Easing.in(Easing.cubic),
        });
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em", ...style }}>
      <div style={{ translate: `0 ${rise + sink}%` }}>{children}</div>
    </div>
  );
}

type TypedProps = {
  readonly text: string;
  readonly at: number;
  /** Frames per character. */
  readonly pace?: number;
  /** A block caret after the text, blinking once typed. */
  readonly caret?: boolean;
};

/** Mono text typed in, one character at a time. */
export function Typed({ text, at, pace = 1, caret = false }: TypedProps) {
  const frame = useCurrentFrame();
  const count = Math.floor(
    interpolate(frame, [at, at + text.length * pace], [0, text.length], clamp),
  );
  const done = count >= text.length;
  const caretOn = caret && (!done || Math.floor((frame - at) / 15) % 2 === 0);
  return (
    <span style={{ whiteSpace: "pre" }}>
      {text.slice(0, count)}
      {caret && <span style={{ opacity: caretOn ? 1 : 0 }}>▌</span>}
    </span>
  );
}

type ScrimProps = {
  readonly corner: "bottom-left" | "top-left";
  readonly opacity: number;
  /** How far up (or down) the frame the darkening reaches, as a fraction of its height. */
  readonly reach?: number;
};

/** Darkens a corner of the footage so the type over it reads, without a hard box. */
export function Scrim({ corner, opacity, reach = 0.5 }: ScrimProps) {
  const vertical = corner === "bottom-left" ? "to top" : "to bottom";
  const stop = (fraction: number) => `${Math.round(fraction * reach * 100)}%`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        background: `linear-gradient(${vertical}, ${withAlpha(neutral.bg, 0.96)} 0%, ${withAlpha(neutral.bg, 0.9)} ${stop(0.55)}, ${withAlpha(neutral.bg, 0)} ${stop(1)})`,
        maskImage: "linear-gradient(to right, black 0%, black 55%, transparent 88%)",
      }}
    />
  );
}
