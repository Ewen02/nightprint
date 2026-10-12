import { FeatureCard, type FeatureCardProps } from "../molecules/feature-card";
import { SectionHeading } from "../molecules/section-heading";

export interface ReadingGuideProps {
  readonly eyebrow: string;
  readonly title: string;
  /** In reading order; each card carries its own number. */
  readonly features: readonly FeatureCardProps[];
}

/** How to read a machine, in numbered cards with a working sample each. */
export function ReadingGuide({ eyebrow, title, features }: ReadingGuideProps) {
  return (
    <section aria-labelledby="reading-title" className="flex flex-col gap-10">
      <div className="max-w-155">
        <SectionHeading id="reading-title" eyebrow={eyebrow} title={title} />
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {features.map((feature) => (
          <li key={feature.number}>
            <FeatureCard {...feature} />
          </li>
        ))}
      </ol>
    </section>
  );
}
