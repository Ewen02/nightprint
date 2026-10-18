export interface ZoneLabelProps {
  /** "Driving side". */
  readonly label: string;
  /** "Uses the application". */
  readonly note?: string | undefined;
  /**
   * `lane`: one of a bench's lanes, named large before its start, its right edge and middle
   * on the anchor; the name stays on phones, where the stage has no room for notes. A zone
   * otherwise.
   */
  readonly variant?: "zone" | "lane";
}

/**
 * The name of a region of the drawing, set outside the plate like a note on a
 * sheet. Its bottom-left corner sits on the anchor point.
 */
export function ZoneLabel({ label, note, variant = "zone" }: ZoneLabelProps) {
  if (variant === "lane") {
    return (
      <div className="flex -translate-x-full -translate-y-1/2 flex-col items-end gap-0.5 pr-3 text-right">
        <span className="font-mono text-heading text-text">{label}</span>
        {note && (
          <span className="w-36 font-mono text-micro text-text-secondary max-sm:hidden">
            {note}
          </span>
        )}
      </div>
    );
  }
  return (
    // Hidden on phones: a stage that small has no room for notes beside the parts.
    <div className="flex -translate-y-full flex-col gap-0.5 pb-1 whitespace-nowrap max-sm:hidden">
      <span className="mono-label text-text-secondary">{label}</span>
      {note && <span className="font-mono text-micro text-text-faint">{note}</span>}
    </div>
  );
}
