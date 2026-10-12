import { MonoLabel } from "../atoms/mono-label";

export interface SectionHeadingProps {
  /** Id of the h2, for the section's `aria-labelledby`. */
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  /** Lead paragraphs under the title. */
  readonly lead?: readonly string[];
}

/** Eyebrow, h2 and lead of a home page section. */
export function SectionHeading({ id, eyebrow, title, lead = [] }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3">
      <MonoLabel>{eyebrow}</MonoLabel>
      <h2 id={id} className="text-title">
        {title}
      </h2>
      {lead.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className="text-body text-text-muted">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
