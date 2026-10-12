export interface ReadoutProps {
  /** The quantity, faint: "t". */
  readonly symbol: string;
  /** Its value, already formatted. */
  readonly value: string;
}

/** A measured value in mono, as an instrument would print it. */
export function Readout({ symbol, value }: ReadoutProps) {
  return (
    <p className="flex items-center gap-2.5 font-mono text-log text-text-body">
      <span className="text-text-faint">{symbol}</span>
      {value}
    </p>
  );
}
