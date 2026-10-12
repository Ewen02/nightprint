import { MonoLabel } from "../atoms/mono-label";
import { SectionHeading } from "../molecules/section-heading";
import { TermEntry, type TermEntryProps } from "../molecules/term-entry";

export interface ConceptArticleProps {
  /** The concept in one sentence: the section's title. */
  readonly title: string;
  /** Five paragraphs at most. */
  readonly paragraphs: readonly string[];
  /** The words of the drawing, with the balloons they name. */
  readonly terms: readonly TermEntryProps[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  /** The revision the text belongs to: "Rev A", and its day, machine-readable and as shown. */
  readonly revision?: {
    readonly label: string;
    readonly date: string;
    readonly display: string;
  };
}

/**
 * The text under a machine: the article on the left, and beside it, like the
 * notes of a drawing, its key terms, the reference it was checked against and
 * the day of its revision.
 */
export function ConceptArticle({
  title,
  paragraphs,
  terms,
  sources,
  revision,
}: ConceptArticleProps) {
  return (
    <article aria-labelledby="concept-title" className="flex flex-wrap items-start gap-12">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
        <SectionHeading id="concept-title" eyebrow="The concept" title={title} />
        <div className="flex max-w-170 flex-col gap-5">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-body text-text-body">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      <aside aria-label="Notes" className="flex min-w-0 flex-[1_1_320px] flex-col gap-8">
        {terms.length > 0 && (
          <div className="flex flex-col gap-3">
            <MonoLabel as="h3">Key terms</MonoLabel>
            <dl className="flex flex-col divide-y divide-line-muted rounded-md border border-line bg-surface">
              {terms.map((term) => (
                <TermEntry key={term.term} {...term} />
              ))}
            </dl>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <MonoLabel as="h3">Checked against</MonoLabel>
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <li
                key={source.url}
                className="flex flex-col gap-1 border border-frame px-3 py-2 font-mono text-micro tracking-[0.08em]"
              >
                <span className="text-text-faint">SOURCE</span>
                <a
                  href={source.url}
                  className="text-small tracking-normal text-text-body underline decoration-frame underline-offset-4 hover:decoration-text"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          {revision && (
            <p className="font-mono text-micro tracking-[0.08em] text-text-faint">
              {revision.label.toUpperCase()} ·{" "}
              <time dateTime={revision.date} className="text-text-secondary">
                {revision.display}
              </time>
            </p>
          )}
        </div>
      </aside>
    </article>
  );
}
