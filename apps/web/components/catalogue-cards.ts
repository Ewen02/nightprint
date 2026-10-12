import { machines, upcoming } from "@nightprint/catalog";
import type { Machine } from "@nightprint/engine";
import type {
  MachineCardProps,
  PlanViewProps,
  RegisterRow,
  SheetPreviewProps,
} from "@nightprint/ui";
import { planView } from "./plan-view-model";
import { site } from "./seo";

/** How families read, in filter order. */
export const familyLabels = {
  backend: "Backend",
  frontend: "Frontend",
  mobile: "Mobile",
  infra: "Infra",
} as const satisfies Record<Machine["family"], string>;

/** Every machine as a catalogue card: published ones link to their page, upcoming ones do not. */
export function catalogueCards(): MachineCardProps[] {
  return [
    ...machines.map((m) => ({
      code: m.code,
      title: m.title,
      family: m.family,
      category: m.category,
      summary: m.summary,
      href: `/m/${m.slug}/`,
    })),
    ...upcoming.map((m) => ({ code: m.code, title: m.title, family: m.family })),
  ];
}

/** The machines after this one, in catalogue order. */
export function cardsAfter(code: string, count: number): MachineCardProps[] {
  const cards = catalogueCards();
  const index = cards.findIndex((card) => card.code === code);
  return cards.slice(index + 1, index + 1 + count);
}

/** A sheet of the drawing register: its row, its family for the filter, and its preview. */
export interface RegisterSheet extends RegisterRow {
  readonly familyId: Machine["family"];
  readonly preview: Omit<SheetPreviewProps, "drawing">;
  /** The plan view of an issued sheet. */
  readonly plan?: PlanViewProps;
}

/** Every machine as a sheet of the register: issued ones with their plan view, then drafts. */
export function registerSheets(): RegisterSheet[] {
  return [
    ...machines.map((m) => ({
      code: m.code,
      title: m.title,
      family: familyLabels[m.family],
      familyId: m.family,
      status: "issued" as const,
      revision: m.revision,
      href: `/m/${m.slug}/`,
      preview: {
        code: m.code,
        title: m.title,
        status: "issued" as const,
        facts: [
          { term: "Scale", value: m.scale },
          { term: "Rev", value: m.revision },
          { term: "Source", value: m.sources[0]?.label ?? "" },
        ],
        action: { label: `Run ${m.code}`, href: `/m/${m.slug}/` },
      },
      plan: { ...planView(m), label: `${m.title}, seen from above` },
    })),
    ...upcoming.map((m) => ({
      code: m.code,
      title: m.title,
      family: familyLabels[m.family],
      familyId: m.family,
      status: "draft" as const,
      preview: {
        code: m.code,
        title: m.title,
        status: "draft" as const,
        facts: [
          { term: "Family", value: familyLabels[m.family] },
          { term: "Status", value: "In draft" },
        ],
        // All four candidates run for the next free code: the vote is for the concept.
        ...(site.pollFor.includes(m.code)
          ? { action: { label: "Vote for it on X", href: site.poll } }
          : {}),
      },
    })),
  ];
}
