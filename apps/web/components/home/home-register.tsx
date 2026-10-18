"use client";

import { DrawingRegister, PlanView, SheetPreview } from "@nightprint/ui";
import { useState } from "react";
import type { RegisterSeries } from "../catalogue-cards";

const ALL = "all";

/** The drawing register grouped by series, with its series filter, and the sheet pointed at beside it. */
export function HomeRegister({
  eyebrow,
  title,
  lead,
  groups,
  action,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly groups: readonly RegisterSeries[];
  readonly action?: { readonly label: string; readonly href: string };
}) {
  const sheets = groups.flatMap((group) => group.sheets);
  const [filter, setFilter] = useState(ALL);
  const [selected, setSelected] = useState(sheets[0]?.code ?? "");
  const visible = filter === ALL ? groups : groups.filter((group) => group.id === filter);
  const current = sheets.find((s) => s.code === selected) ?? sheets[0];

  return (
    <DrawingRegister
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      groups={visible.map(({ sheets: rows, ...group }) => ({ ...group, rows }))}
      filters={[
        { id: ALL, label: "All" },
        ...groups.map((group) => ({
          id: group.id,
          label: `${group.label} · ${group.sheets.length}`,
        })),
      ]}
      filter={filter}
      onFilterChange={(id) => {
        setFilter(id);
        // The preview follows the filter: the first sheet of the series left in the register.
        const first = id === ALL ? sheets[0] : groups.find((group) => group.id === id)?.sheets[0];
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
