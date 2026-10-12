"use client";

import { type FilterOption, type MachineCardProps, MachineCatalogue } from "@nightprint/ui";
import { useState } from "react";

const ALL = "all";

/** The catalogue section with its family filter. Families are the machines' `family` ids. */
export function HomeCatalogue({
  eyebrow,
  title,
  lead,
  machines,
  families,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly machines: readonly MachineCardProps[];
  readonly families: readonly FilterOption[];
}) {
  const [filter, setFilter] = useState(ALL);
  return (
    <MachineCatalogue
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      machines={filter === ALL ? machines : machines.filter((m) => m.family === filter)}
      filters={[{ id: ALL, label: "All" }, ...families]}
      filter={filter}
      onFilterChange={setFilter}
    />
  );
}
