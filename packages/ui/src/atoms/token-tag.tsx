import { type FlowName, flow as flowColour, neutral } from "@nightprint/tokens";

export interface TokenTagProps {
  /** What the token stands for: the callback "B". */
  readonly label: string;
  readonly flow: FlowName;
}

/**
 * The name written on a moving token, in its flow's colour, centred on its anchor. A
 * square tag, not a round balloon: a balloon numbers a part, a tag names what travels.
 * Decorative: the step's caption and the log say the same in words.
 */
export function TokenTag({ label, flow }: TokenTagProps) {
  return (
    <span
      aria-hidden="true"
      className="block -translate-x-1/2 -translate-y-1/2 rounded-xs px-1.5 py-px font-mono text-log font-semibold"
      style={{ background: flowColour[flow], color: neutral.bg }}
    >
      {label}
    </span>
  );
}
