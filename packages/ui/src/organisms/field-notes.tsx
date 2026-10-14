import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import { MonoLabel } from "../atoms/mono-label";
import { cx } from "../cx";

export interface FieldNote {
  readonly key: string;
  /** "00:12": when it happened, since the drawing began. */
  readonly time: string;
  readonly text: string;
  /** The flow it belongs to; `muted` for a note still waiting on something. */
  readonly tone: FlowName | "muted";
  /** Lines under the note: names, rules, libraries. */
  readonly details?: readonly string[];
  /** Arrives this many ms after the notes before it in the same batch. */
  readonly delay?: number;
}

export interface FieldNotesProps {
  readonly title: string;
  /** "01:24": how long the work has run. */
  readonly clock: string;
  readonly notes: readonly FieldNote[];
}

/**
 * A surveyor's notebook: what the work has found, one dated line at a time. New lines are
 * read out as they arrive; earlier ones stay where they are.
 */
export function FieldNotes({ title, clock, notes }: FieldNotesProps) {
  return (
    <section aria-labelledby="field-notes-title" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <MonoLabel as="h2" id="field-notes-title">
          {title}
        </MonoLabel>
        <span className="font-mono text-log text-text-secondary tabular-nums">{clock}</span>
      </div>
      {/* Reversed, the box stays scrolled to its last note as notes arrive. */}
      <div className="flex max-h-[34rem] flex-col-reverse overflow-y-auto">
        <ol role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.key}
              className="grid animate-enter grid-cols-[3.25rem_0.5rem_1fr] items-baseline gap-x-3 motion-reduce:animate-none"
              style={note.delay ? { animationDelay: `${note.delay}ms` } : undefined}
            >
              <span className="font-mono text-log text-text-faint tabular-nums">{note.time}</span>
              <span
                aria-hidden="true"
                className="block size-2 translate-y-[-1px] rounded-full"
                style={{
                  background:
                    note.tone === "muted" ? "var(--color-line-strong)" : flowColour[note.tone],
                }}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p
                  className={cx(
                    "text-small",
                    note.tone === "muted" ? "text-text-secondary" : "text-text",
                  )}
                >
                  {note.text}
                </p>
                {note.details?.map((line) => (
                  <p key={line} className="font-mono text-log break-words text-text-secondary">
                    {line}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
