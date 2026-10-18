import type { Machine, PlayerSnapshot } from "@nightprint/engine";
import { dimensionLabelId, tokenLabelId, zoneLabelId } from "@nightprint/scene/label-ids";
import type { FlowName } from "@nightprint/tokens";
import { partCallouts } from "../machine-view-model";

/** What the film pins on the stage, as the page's label layer does: plain data to paint. */
export type FilmLabel =
  | {
      /** `lane`: a bench's lane seen from the front, named large before its row. */
      readonly kind: "zone" | "lane";
      readonly id: string;
      readonly label: string;
      readonly note?: string;
    }
  | {
      readonly kind: "dimension";
      readonly id: string;
      readonly value: string;
      readonly flow: FlowName | null;
    }
  | {
      readonly kind: "part";
      readonly id: string;
      readonly number: number;
      readonly label: string;
      readonly status?: string | undefined;
      readonly flow: FlowName | null;
      readonly violation: boolean;
      /** Its name is open beside its balloon. */
      readonly named: boolean;
    }
  | {
      readonly kind: "token";
      readonly id: string;
      readonly label: string;
      readonly flow: FlowName;
    };

/**
 * The stage's labels at this moment, as `stageCallouts` gives them to the page: each zone's
 * name, each route's latency, each numbered part (the step's two first named), and the name
 * of each token the step moves that has one.
 */
export function filmLabels(snapshot: PlayerSnapshot): FilmLabel[] {
  const { zones: regions, view } = snapshot.resolved.machine.stage;
  const zones = regions.map(
    (zone): FilmLabel => ({
      kind: view === "front" ? "lane" : "zone",
      id: zoneLabelId(zone.id),
      label: zone.label,
      ...(zone.note ? { note: zone.note } : {}),
    }),
  );
  const steps = snapshot.finished ? [] : snapshot.step.tokens;
  const travelled = new Map(
    steps.flatMap((token) =>
      token.kind === "travel" ? token.routes.map((id) => [id, token.flow] as const) : [],
    ),
  );
  const dimensions = snapshot.resolved.routes
    .filter((route) => route.kind === "pipe" && route.latencyMs > 0)
    .map(
      (route): FilmLabel => ({
        kind: "dimension",
        id: dimensionLabelId(route.id),
        value: `${route.latencyMs} ms`,
        flow: travelled.get(route.id) ?? null,
      }),
    );
  const parts = partCallouts(snapshot).map(
    (part): FilmLabel => ({
      kind: "part",
      id: part.id,
      number: part.number,
      label: part.label,
      status: part.status,
      flow: part.flow ?? null,
      violation: part.violation ?? false,
      named: part.detail !== "number",
    }),
  );
  const tokens = steps.flatMap((token, index): FilmLabel[] =>
    token.label
      ? [{ kind: "token", id: tokenLabelId(index), label: token.label, flow: token.flow }]
      : [],
  );
  return [...zones, ...dimensions, ...parts, ...tokens];
}

/** The step the film is on, as its caption says it: "STEP 3 / 8", the bars, the title. */
export interface FilmCaption {
  readonly number: number;
  readonly count: number;
  readonly title: string;
  /** The step in one sentence, under its title, when it has one. */
  readonly lead?: string;
  readonly flow: FlowName;
  /** Each step's flow, for the bars of the steps already played. */
  readonly flows: readonly FlowName[];
}

export function filmCaption(snapshot: PlayerSnapshot): FilmCaption {
  return {
    number: snapshot.state.stepIndex + 1,
    count: snapshot.stepCount,
    title: snapshot.step.step.title,
    ...(snapshot.step.step.lead ? { lead: snapshot.step.step.lead } : {}),
    flow: snapshot.step.flow,
    flows: snapshot.scenario.steps.map((step) => step.flow),
  };
}

/** The words around the machine: its title card, and the end card's last line. */
export interface FilmTitles {
  /** "PRJ-000 · PROJECT". */
  readonly kicker: string;
  readonly title: string;
  /** Where it was drawn from: "floriaaan/goodfood at c758052". */
  readonly source: string;
  /** Small, under the address on the end card. */
  readonly footer: string;
}

export function filmTitles(machine: Machine): FilmTitles {
  const source = machine.sources[0]?.label ?? "";
  return {
    kicker: `${machine.code} · ${machine.category}`,
    title: machine.title,
    source,
    footer: machine.category === "PROJECT" ? source : `${machine.code} · ${machine.title}`,
  };
}

/** The flipped switch, as the film's card shows it. */
export interface FilmWhatIf {
  readonly label: string;
  readonly description: string;
  /** Error when the flip breaks the pattern, write when the machine takes it. */
  readonly tone: Extract<FlowName, "write" | "error">;
}

export function filmWhatIf(snapshot: PlayerSnapshot, action: string): FilmWhatIf | null {
  const flipped = snapshot.resolved.machine.actions.find((a) => a.id === action);
  if (!flipped) {
    return null;
  }
  const breaks =
    snapshot.resolved.parts.some((part) => part.flag === "violation") ||
    snapshot.resolved.routes.some((route) => route.flag === "violation");
  return {
    label: flipped.label,
    description: flipped.description,
    tone: breaks ? "error" : "write",
  };
}

/** "prj-000-floriaaan-goodfood.mp4". */
export function filmFileName(machine: Machine): string {
  return `${machine.code.toLowerCase()}-${machine.slug}.mp4`;
}
