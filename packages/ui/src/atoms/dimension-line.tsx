export interface DimensionLineProps {
  /** The measured value, already formatted ("4.2 ms"). */
  readonly value: string;
}

/**
 * A dimension of a technical drawing: two extension lines, the dimension line
 * with its oblique ticks, the value above. Decorative: the text around it states the value.
 */
export function DimensionLine({ value }: DimensionLineProps) {
  return (
    <svg
      viewBox="0 0 220 56"
      aria-hidden="true"
      className="block h-14 w-full max-w-55 font-mono text-log"
    >
      <g className="stroke-text-faint" strokeDasharray="2 3">
        <line x1="12" y1="12" x2="12" y2="44" />
        <line x1="208" y1="12" x2="208" y2="44" />
      </g>
      <g className="stroke-text-secondary">
        <line x1="12" y1="36" x2="208" y2="36" />
        <line x1="8" y1="40" x2="16" y2="32" />
        <line x1="204" y1="40" x2="212" y2="32" />
      </g>
      <text x="110" y="28" textAnchor="middle" className="fill-text-body">
        {value}
      </text>
    </svg>
  );
}
