import type { ReactNode } from "react";
import { cx } from "../cx";

export interface SheetPreviewProps {
  readonly code: string;
  readonly title: string;
  /** An issued sheet has its drawing; a draft is blank and stamped preliminary. */
  readonly status: "issued" | "draft";
  /** The drawing of an issued sheet, filling the sheet. */
  readonly drawing?: ReactNode;
  /** The title block's cells: scale, revision, source. */
  readonly facts: readonly { readonly term: string; readonly value: string }[];
  /** What to do with the sheet: run an issued machine, vote for a draft. */
  readonly action?: { readonly label: string; readonly href: string };
}

/** Construction lines of a sheet not drawn yet: the axes and diagonals a draftsman starts from. */
function ConstructionLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 130 70"
      preserveAspectRatio="none"
      className="absolute inset-4 size-[calc(100%-2rem)] text-line-strong"
    >
      <g stroke="currentColor" strokeWidth="0.3" strokeDasharray="1.6 1.2" fill="none">
        <line x1="0" y1="35" x2="130" y2="35" />
        <line x1="65" y1="0" x2="65" y2="70" />
        <line x1="0" y1="0" x2="130" y2="70" />
        <line x1="0" y1="70" x2="130" y2="0" />
        <rect x="20" y="12" width="90" height="46" />
      </g>
    </svg>
  );
}

/**
 * One sheet of the drawing set, as it would come out of the plan chest: its drawing,
 * or for a draft the construction lines and a "preliminary" stamp, then its title block.
 */
export function SheetPreview({ code, title, status, drawing, facts, action }: SheetPreviewProps) {
  const issued = status === "issued";
  return (
    <figure className="flex flex-col border border-line-strong bg-bg">
      <div
        aria-hidden="true"
        className="flex justify-between border-b border-line-muted px-3 py-1.5 font-mono text-micro text-text-faint"
      >
        <span>{code}</span>
        <span>{issued ? "ISSUED" : "PRELIMINARY"}</span>
      </div>
      <div className="relative aspect-[13/8] overflow-hidden">
        {issued && drawing ? (
          <div className="absolute inset-4">{drawing}</div>
        ) : (
          <>
            <ConstructionLines />
            {/* The stamp a drawing carries until it is issued. */}
            <p className="absolute inset-0 m-auto flex h-fit w-fit -rotate-6 flex-col items-center border-2 border-frame bg-bg px-4 py-2 text-center">
              <span className="mono-label text-text-secondary">Preliminary</span>
              <span className="font-mono text-micro tracking-[0.12em] text-text-faint uppercase">
                Not for construction
              </span>
            </p>
          </>
        )}
      </div>
      <figcaption className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-frame">
        <p className="flex items-center px-3 py-2.5 text-small font-semibold text-text">{title}</p>
        <dl className="flex font-mono text-micro tracking-[0.08em]">
          {facts.map((fact) => (
            <div key={fact.term} className="flex flex-col gap-0.5 border-l border-frame px-3 py-2">
              <dt className="text-text-faint uppercase">{fact.term}</dt>
              <dd className="whitespace-nowrap text-text-body">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </figcaption>
      {action && (
        <a
          href={action.href}
          className={cx(
            "mono-label flex h-11 items-center justify-between border-t border-frame px-3 text-text",
            "transition-colors hover:bg-surface",
          )}
        >
          {action.label}
          <span aria-hidden="true">→</span>
        </a>
      )}
    </figure>
  );
}
