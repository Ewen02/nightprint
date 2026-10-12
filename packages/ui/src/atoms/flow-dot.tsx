import { type FlowName, flow as flowColour } from "@nightprint/tokens";

export interface FlowDotProps {
  readonly flow: FlowName;
}

/** An 8 px disc in a flow colour, beside a label that says what it means. */
export function FlowDot({ flow }: FlowDotProps) {
  return (
    <span
      aria-hidden="true"
      className="block size-2 flex-none rounded-full"
      style={{ background: flowColour[flow] }}
    />
  );
}
