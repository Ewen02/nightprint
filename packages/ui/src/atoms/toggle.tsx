import { flow as flowColour, neutral } from "@nightprint/tokens";

export interface ToggleProps {
  readonly on: boolean;
  /** `safe` lights in write green, `violation` in vermillon. */
  readonly tone?: "safe" | "violation";
}

/**
 * The track and knob of a switch, purely visual. The accessible switch is
 * the molecule that wraps it (`WhatIfSwitch`).
 */
export function Toggle({ on, tone = "safe" }: ToggleProps) {
  const colour = tone === "violation" ? flowColour.error : flowColour.write;
  return (
    <span
      aria-hidden="true"
      className="relative block h-5 w-9 flex-none rounded-full transition-colors"
      style={{ background: on ? colour : neutral.textFaint }}
    >
      <span
        className="absolute top-0.5 size-4 rounded-full bg-bg transition-[left] ease-machine motion-reduce:transition-none"
        style={{ left: on ? 18 : 2 }}
      />
    </span>
  );
}
