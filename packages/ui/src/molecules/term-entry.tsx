import { Balloon } from "../atoms/balloon";

export interface TermEntryProps {
  readonly term: string;
  readonly definition: string;
  /** Balloon numbers of the parts the term names in the drawing. */
  readonly numbers: readonly number[];
}

/** One note of the drawing: a term, the balloons it names, what it means. Inside a `dl`. */
export function TermEntry({ term, definition, numbers }: TermEntryProps) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <dt className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="mono-label text-text">{term}</span>
        {numbers.length > 0 && (
          <span className="flex gap-1">
            {numbers.map((n) => (
              <Balloon key={n} number={n} size="sm" />
            ))}
          </span>
        )}
      </dt>
      <dd className="text-small text-text-muted">{definition}</dd>
    </div>
  );
}
