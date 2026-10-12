"use client";

import { DrawingRegister, type FilterOption, PlanView, SheetPreview } from "@nightprint/ui";
import { useState } from "react";
import type { RegisterSheet } from "../catalogue-cards";

const ALL = "all";

/** The drawing register with its family filter, and the sheet pointed at beside it. */
export function HomeRegister({
  eyebrow,
  title,
  lead,
  sheets,
  families,
  action,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly sheets: readonly RegisterSheet[];
  readonly families: readonly FilterOption[];
  readonly action?: { readonly label: string; readonly href: string };
}) {
  const [filter, setFilter] = useState(ALL);
  const [selected, setSelected] = useState(sheets[0]?.code ?? "");
  const visible = filter === ALL ? sheets : sheets.filter((s) => s.familyId === filter);
  const current = sheets.find((s) => s.code === selected) ?? sheets[0];

  return (
    <DrawingRegister
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      rows={visible}
      filters={[{ id: ALL, label: "All" }, ...families]}
      filter={filter}
      onFilterChange={(id) => {
        setFilter(id);
        // The preview follows the filter: the first sheet left in the register.
        const first = id === ALL ? sheets[0] : sheets.find((s) => s.familyId === id);
        if (first) {
          setSelected(first.code);
        }
      }}
      selected={selected}
      onSelect={setSelected}
      action={action}
      preview={
        current && (
          // A new sheet slides in instead of swapping.
          <div key={current.code} className="animate-enter motion-reduce:animate-none">
            <SheetPreview
              {...current.preview}
              drawing={current.plan && <PlanView {...current.plan} flowing className="size-full" />}
            />
          </div>
        )
      }
    />
  );
}
