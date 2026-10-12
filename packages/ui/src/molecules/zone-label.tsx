export interface ZoneLabelProps {
  /** "Driving side". */
  readonly label: string;
  /** "Uses the application". */
  readonly note?: string | undefined;
}

/**
 * The name of a region of the drawing, set outside the plate like a note on a
 * sheet. Its bottom-left corner sits on the anchor point.
 */
export function ZoneLabel({ label, note }: ZoneLabelProps) {
  return (
    // Hidden on phones: a stage that small has no room for notes beside the parts.
    <div className="flex -translate-y-full flex-col gap-0.5 pb-1 whitespace-nowrap max-sm:hidden">
      <span className="mono-label text-text-secondary">{label}</span>
      {note && <span className="font-mono text-micro text-text-faint">{note}</span>}
    </div>
  );
}
