import { ConventionCard, type ConventionCardProps } from "../molecules/convention-card";
import { SectionHeading } from "../molecules/section-heading";

export interface DrawingConventionsProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly conventions: readonly ConventionCardProps[];
}

/** The technical drawing conventions every machine follows, each with its specimen. */
export function DrawingConventions({ eyebrow, title, lead, conventions }: DrawingConventionsProps) {
  return (
    <section aria-labelledby="conventions-title" className="flex flex-col gap-10">
      <div className="max-w-155">
        <SectionHeading id="conventions-title" eyebrow={eyebrow} title={title} lead={[lead]} />
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {conventions.map((convention) => (
          <li key={convention.title}>
            <ConventionCard {...convention} />
          </li>
        ))}
      </ul>
    </section>
  );
}
