import { type FlowName, flow as flowColour, neutral } from "@nightprint/tokens";
import { cx } from "../cx";

export interface BalloonProps {
  /** Bill-of-parts number. */
  readonly number: number;
  /** Set while the step's tokens go through the part. */
  readonly flow?: FlowName | null;
  /** A violation wins over the step's flow. */
  readonly violation?: boolean;
  readonly size?: "sm" | "md";
}

/** The numbered disc of an assembly drawing. Decorative: the part's name carries the meaning. */
export function Balloon({ number, flow = null, violation = false, size = "md" }: BalloonProps) {
  const accent = violation ? flowColour.error : flow ? flowColour[flow] : null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex flex-none select-none items-center justify-center rounded-full border font-mono text-micro tracking-normal transition-colors duration-200 ease-machine motion-reduce:transition-none",
        size === "md" ? "size-[22px]" : "size-5",
      )}
      style={
        accent
          ? { background: accent, borderColor: accent, color: neutral.bg, fontWeight: 600 }
          : { background: neutral.bg, borderColor: neutral.ring, color: neutral.textBody }
      }
    >
      {number}
    </span>
  );
}
