import { type FlowName, flow as flowColour } from "@nightprint/tokens";

export interface StepDotProps {
  readonly flow: FlowName;
  readonly state: "done" | "current" | "upcoming";
}

/** One bar of the step sequencer. Current in its flow, done at 45 %, upcoming in `line-strong`. */
export function StepDot({ flow, state }: StepDotProps) {
  return (
    <span
      aria-hidden="true"
      className="block h-1 w-5 rounded-full transition-colors"
      style={{
        background: state === "upcoming" ? "var(--color-line-strong)" : flowColour[flow],
        opacity: state === "done" ? 0.45 : 1,
      }}
    />
  );
}
