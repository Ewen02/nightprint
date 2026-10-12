export interface Fact {
  readonly term: string;
  readonly value: string;
}

export interface FactListProps {
  readonly facts: readonly Fact[];
}

/** Short key figures in mono: term above, value below. */
export function FactList({ facts }: FactListProps) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-4 font-mono text-micro tracking-[0.08em]">
      {facts.map((fact) => (
        <div key={fact.term} className="flex flex-col gap-1">
          <dt className="text-text-faint uppercase">{fact.term}</dt>
          <dd className="text-text">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
