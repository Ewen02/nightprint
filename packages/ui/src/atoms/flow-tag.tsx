import { type FlowName, flow as flowColour } from "@nightprint/tokens";

export interface FlowTagProps {
  readonly flow: FlowName;
  /** REQ, WRITE, RESP, ERR, or a custom tag such as RULE. */
  readonly children: string;
}

/** A log tag in its flow colour. */
export function FlowTag({ flow, children }: FlowTagProps) {
  return (
    <span className="font-mono font-semibold" style={{ color: flowColour[flow] }}>
      {children}
    </span>
  );
}
