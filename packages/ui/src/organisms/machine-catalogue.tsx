import { FilterChips, type FilterOption } from "../molecules/filter-chips";
import { MachineCard, type MachineCardProps } from "../molecules/machine-card";
import { SectionHeading } from "../molecules/section-heading";

export interface MachineCatalogueProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  /** Published machines first, then upcoming ones (cards without href), already filtered. */
  readonly machines: readonly MachineCardProps[];
  readonly filters: readonly FilterOption[];
  /** Id of the pressed filter. */
  readonly filter: string;
  readonly onFilterChange?: (id: string) => void;
}

/** The machines, published and upcoming, with a filter by family. */
export function MachineCatalogue({
  eyebrow,
  title,
  lead,
  machines,
  filters,
  filter,
  onFilterChange,
}: MachineCatalogueProps) {
  return (
    <section aria-labelledby="catalogue-title" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-155">
          <SectionHeading id="catalogue-title" eyebrow={eyebrow} title={title} lead={[lead]} />
        </div>
        <FilterChips
          label="Filter by family"
          options={filters}
          value={filter}
          onChange={onFilterChange}
        />
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
