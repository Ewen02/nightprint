import type { FlowName } from "@nightprint/tokens";
import { ButtonLink } from "../atoms/button-link";
import { FlowTag } from "../atoms/flow-tag";
import { SectionHeading } from "../molecules/section-heading";

export interface BuildLogEntry {
  readonly key: string;
  /** Short date in mono: "12 OCT". */
  readonly date: string;
  readonly flow: FlowName;
  /** FIX, UI, ARCH… */
  readonly tag: string;
  readonly text: string;
}

export interface BuildLogProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  /** Newest first. */
  readonly entries: readonly BuildLogEntry[];
  /** Where the build is posted. */
  readonly follow?: { readonly label: string; readonly href: string };
  /** Under the table, when it shows only the latest changes: where they all are. */
  readonly history?: { readonly label: string; readonly href: string };
}

const CELL = "px-4 py-3 align-top";

/**
 * The project's own changelog, kept like the revision block of a drawing: one ruled
 * row per change, newest on top, with its date and its kind.
 */
export function BuildLog({ eyebrow, title, lead, entries, follow, history }: BuildLogProps) {
  return (
    <section aria-labelledby="build-log-title" className="flex flex-wrap items-start gap-12">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col items-start gap-6">
        <SectionHeading id="build-log-title" eyebrow={eyebrow} title={title} lead={[lead]} />
        {follow && (
          <ButtonLink href={follow.href} variant="secondary">
            {follow.label}
          </ButtonLink>
        )}
      </div>
      <div className="min-w-0 flex-[999_1_560px] border border-frame bg-inset">
        <table className="w-full border-collapse font-mono text-log">
          <caption className="mono-label border-b border-frame px-4 py-2.5 text-left text-text-faint">
            Revisions
          </caption>
          <thead>
            <tr className="border-b border-line-muted text-left text-micro tracking-[0.12em] text-text-faint uppercase">
              <th scope="col" className={`${CELL} w-24 font-medium`}>
                Date
              </th>
              <th scope="col" className={`${CELL} w-24 font-medium`}>
                Kind
              </th>
              <th scope="col" className={`${CELL} font-medium`}>
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.key} className="border-b border-line-muted last:border-b-0">
                <td className={`${CELL} whitespace-nowrap text-text-faint`}>{entry.date}</td>
                <td className={CELL}>
                  <FlowTag flow={entry.flow}>{entry.tag}</FlowTag>
                </td>
                <td className={`${CELL} text-text-body`}>{entry.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history && (
          <a
            href={history.href}
            className="mono-label flex h-11 items-center justify-between border-t border-frame px-4 text-text-secondary transition-colors hover:bg-surface hover:text-text"
          >
            {history.label}
            <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </section>
  );
}
