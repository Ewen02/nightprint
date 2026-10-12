import type { ReactNode } from "react";

export interface ConventionCardProps {
  readonly title: string;
  readonly body: string;
  /** The convention drawn small: balloons, a dimension, a title block. */
  readonly specimen: ReactNode;
}

/** A drawing convention: its specimen first, then what it means. */
export function ConventionCard({ title, body, specimen }: ConventionCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-md border border-line p-6">
      <div className="flex min-h-14 items-center gap-2">{specimen}</div>
      <h3 className="text-heading">{title}</h3>
      <p className="text-small text-text-muted">{body}</p>
    </article>
  );
}
