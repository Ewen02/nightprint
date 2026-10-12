export interface ArrowheadProps {
  readonly className?: string;
}

/** The filled arrowhead of a drawing: a dependency, read as "depends on". Current colour. */
export function Arrowhead({ className }: ArrowheadProps) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={className}>
      <path d="M1 1.5L9 5L1 8.5Z" fill="currentColor" />
    </svg>
  );
}
