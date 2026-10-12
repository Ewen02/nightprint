import { type FlowName, flow as flowColour } from "@nightprint/tokens";

export interface DimensionLabelProps {
  /** Already formatted: "4.2 ms". */
  readonly value: string;
  /** The flow travelling the dimensioned route right now, if any. */
  readonly flow?: FlowName | null;
}

/** The value of a dimension, centred on its anchor, over the dimension line. Hidden on phones. */
export function DimensionLabel({ value, flow = null }: DimensionLabelProps) {
  return (
    <span
      className="block -translate-x-1/2 -translate-y-1/2 rounded-xs bg-bg/85 px-1 font-mono text-micro whitespace-nowrap text-text-secondary transition-colors duration-200 ease-machine motion-reduce:transition-none max-sm:hidden"
      style={flow ? { color: flowColour[flow] } : undefined}
    >
      {value}
    </span>
  );
}
