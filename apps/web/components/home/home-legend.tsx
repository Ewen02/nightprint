"use client";

import { DrawingLegend, type LegendCallout, PlanView, type PlanViewProps } from "@nightprint/ui";
import { useState } from "react";

/** The legend's annotated drawing, with the note pointed at lit on both sides. */
export function HomeLegend({
  eyebrow,
  title,
  lead,
  plan,
  callouts,
  notes,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly plan: PlanViewProps;
  readonly callouts: readonly LegendCallout[];
  readonly notes: readonly string[];
}) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <DrawingLegend
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      drawing={<PlanView {...plan} flowing className="size-full" />}
      box={plan.box}
      callouts={callouts}
      notes={notes}
      active={active}
      onActive={setActive}
    />
  );
}
