import { ButtonLink } from "../atoms/button-link";
import { MachineCard, type MachineCardProps } from "../molecules/machine-card";
import { SectionHeading } from "../molecules/section-heading";

export interface UpNextProps {
  readonly eyebrow: string;
  readonly title: string;
  /** The next machines, published or upcoming. */
  readonly machines: readonly MachineCardProps[];
  /** Where the whole catalogue is. */
  readonly action: { readonly label: string; readonly href: string };
}

/** The machines after this one, at the end of a machine page. */
export function UpNext({ eyebrow, title, machines, action }: UpNextProps) {
  return (
    <section aria-labelledby="up-next-title" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-155">
          <SectionHeading id="up-next-title" eyebrow={eyebrow} title={title} />
        </div>
        <ButtonLink href={action.href} variant="secondary">
          {action.label}
        </ButtonLink>
      </div>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {machines.map((machine) => (
          <li key={machine.code}>
            <MachineCard {...machine} />
          </li>
        ))}
      </ol>
    </section>
  );
}
