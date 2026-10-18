import type { Machine } from "@nightprint/engine";

/** A series of sheets, known by its code's prefix, as a drawing set groups its sheets by discipline. */
export interface Series {
  readonly id: "MCH" | "BEN" | "FMD" | "PRT" | "PRJ";
  /** "Failure modes": the register's group and the breadcrumb. */
  readonly label: string;
  /** "Failure mode": the title block and the share card. */
  readonly one: string;
  /** What a sheet of the series is, in one line under its group. */
  readonly rule: string;
  /** What flipping a switch does, above the switches. */
  readonly whatIf: string;
}

const MACHINES: Series = {
  id: "MCH",
  label: "Machines",
  one: "Machine",
  rule: "One concept, and switches that break it",
  whatIf: "Flip one: the step replays with the change.",
};

/** In register order. Real projects come last: they have their own section on the home page. */
export const series: readonly Series[] = [
  MACHINES,
  {
    id: "BEN",
    label: "Benches",
    one: "Bench",
    rule: "Several machines, one input",
    whatIf: "Flip one: the step replays, and one of them gives way.",
  },
  {
    id: "FMD",
    label: "Failure modes",
    one: "Failure mode",
    rule: "A failure replayed, then repaired",
    whatIf: "Flip one to repair it: the step replays with the fix.",
  },
  {
    id: "PRT",
    label: "Protocols",
    one: "Protocol",
    rule: "An exchange, counted in round trips",
    whatIf: "Flip one: the exchange replays with the change.",
  },
  {
    id: "PRJ",
    label: "Real projects",
    one: "Real project",
    rule: "A repository, drawn from its code",
    whatIf: "Flip one: the step replays with the change.",
  },
];

/** The series a sheet belongs to, read from its code: FMD-001 is a failure mode. */
export function seriesOf(sheet: Pick<Machine, "code">): Series {
  return series.find((s) => sheet.code.startsWith(`${s.id}-`)) ?? MACHINES;
}

/** Where a series is listed: its group in the home page's register, or the real projects. */
export function seriesHref(of: Series): string {
  return of.id === "PRJ" ? "/#projects" : `/#${seriesAnchor(of)}`;
}

/** The id of a series' group in the register, for links and the filter. */
export function seriesAnchor(of: Series): string {
  return `series-${of.id.toLowerCase()}`;
}
