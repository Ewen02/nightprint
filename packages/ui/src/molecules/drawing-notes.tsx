export interface DrawingNotesProps {
  /** "Notes", as on a drawing. */
  readonly heading: string;
  readonly notes: readonly string[];
}

/** The numbered notes of a drawing, one ruled row each: what holds, and what does not. */
export function DrawingNotes({ heading, notes }: DrawingNotesProps) {
  return (
    <div className="border-t border-line-strong">
      <h3 className="mono-label pt-3.5 pb-1.5 text-text-faint">{heading}</h3>
      <ol>
        {notes.map((note, index) => (
          <li
            key={note}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2 border-b border-line-muted py-3.5 text-small text-text-muted"
          >
            {/* The list numbers the notes for screen readers already. */}
            <span aria-hidden="true" className="font-mono text-log text-text-faint">
              {index + 1}.
            </span>
            {note}
          </li>
        ))}
      </ol>
    </div>
  );
}
