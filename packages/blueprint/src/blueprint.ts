import { flows } from "@nightprint/engine";
import { z } from "zod";
import { hubAround, layoutKinds } from "./layouts";
import type { Survey } from "./survey";

/**
 * What the draftsman returns: the machine of a project, in its own terms (parts that stand
 * for survey units, routes between parts, scenarios over those routes), with no geometry.
 * The schema is loose on purpose, so it can constrain a model's output; `checkBlueprint`
 * holds the rules, and the first of them: a route connects only what the code connects.
 */

const flow = z.enum(flows);

/** Kinds a blueprint may use: no ports or boundaries, which a survey cannot see. */
export const blueprintKinds = [
  "actor",
  "module",
  "core",
  "adapter",
  "configurator",
  "store",
  "queue",
] as const;

export const blueprintSchema = z.object({
  title: z.string().describe("The project's name, as the title block shows it"),
  summary: z
    .string()
    .describe("One sentence: what the project does, and how its code is organised"),
  family: z.enum(["backend", "infra", "frontend", "mobile"]),
  article: z
    .array(z.string())
    .describe("2 to 5 short paragraphs: what each zone holds, the rule its imports keep, why"),
  zones: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().describe("24 characters at most"),
        note: z.string().describe("One line, 40 characters at most"),
      }),
    )
    .describe("2 to 4 zones, in the order the layout reads them"),
  layout: z
    .object({
      kind: z.enum(layoutKinds).describe("How the machine is composed on the plate"),
      core: z
        .string()
        .nullable()
        .describe("For a hub, the id of the core part most of the code imports; null otherwise"),
      why: z
        .string()
        .describe("One sentence, 120 characters at most: why this composition fits the code"),
    })
    .default({ kind: "bands", core: null, why: "" }),
  parts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      role: z.string().describe("A short tag, 12 characters at most, upper case"),
      kind: z.enum(blueprintKinds),
      zone: z.string(),
      units: z
        .array(z.string())
        .describe("Survey unit ids this part stands for; empty for something outside the code"),
      libraries: z
        .array(z.string())
        .describe("Libraries from the survey through which the code reaches this outside part"),
      description: z.string(),
    }),
  ),
  leftOut: z
    .array(z.object({ unit: z.string(), reason: z.string() }))
    .describe("Every survey unit no part stands for, and why it is not drawn"),
  routes: z.array(
    z.object({
      id: z.string(),
      from: z.string(),
      to: z.string(),
      kind: z.enum(["pipe", "wire"]),
      dependsOn: z.enum(["from", "to", "none"]),
    }),
  ),
  scenarios: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      steps: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          body: z.string(),
          flow,
          path: z
            .array(z.string())
            .describe("Route ids the token travels, each one starting where the last one ends"),
          reverse: z.boolean().describe("The token travels the path backwards, end to start"),
          at: z.string().nullable().describe("A part the token waits on, when it has no path"),
          label: z.string().nullable().describe("Written on the token, 3 characters at most"),
          focus: z.array(z.string()),
          log: z.array(z.object({ flow, text: z.string() })),
          whenOn: z.array(z.string()).describe("Action ids that must be on for the step to play"),
          whenOff: z.array(z.string()).describe("Action ids that must be off"),
        }),
      ),
    }),
  ),
  actions: z.array(
    z.object({
      id: z.string(),
      label: z.string().describe("Named like a test case"),
      description: z.string(),
      addRoutes: z
        .array(z.object({ id: z.string(), from: z.string(), to: z.string() }))
        .describe(
          "Imports the change would add, which the code does not have: drawn as violations",
        ),
      removeRoutes: z.array(z.string()),
      flagParts: z.array(z.string()),
    }),
  ),
  glossary: z.array(
    z.object({ term: z.string(), definition: z.string(), parts: z.array(z.string()) }),
  ),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type BlueprintPart = Blueprint["parts"][number];
export type BlueprintRoute = Blueprint["routes"][number];

const KEBAB = /^[a-z][a-z0-9-]*$/;
const CODE_KINDS = new Set(["module", "core", "adapter", "configurator"]);

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) {
      dup.add(v);
    }
    seen.add(v);
  }
  return [...dup];
}

/** How two parts are connected in the code, read off the survey. */
export interface Evidence {
  /** `from` imports `to`, or uses the library `to` stands for. */
  readonly forward: boolean;
  /** `to` imports `from`, or uses the library `from` stands for. */
  readonly backward: boolean;
}

/** What the survey says connects two parts of a blueprint. */
export function evidenceBetween(survey: Survey, from: BlueprintPart, to: BlueprintPart): Evidence {
  const imports = (a: BlueprintPart, b: BlueprintPart) => {
    const source = new Set(a.units);
    const target = new Set(b.units);
    const viaEdge = survey.edges.some((e) => source.has(e.from) && target.has(e.to));
    const libraries = new Set(b.libraries);
    const viaLibrary =
      b.units.length === 0 &&
      survey.units.some((u) => source.has(u.id) && u.externals.some((x) => libraries.has(x.name)));
    return viaEdge || viaLibrary;
  };
  return { forward: imports(from, to), backward: imports(to, from) };
}

/**
 * Every rule a blueprint breaks, in words a model can act on; empty when it may be drawn.
 * Rules on wording come first, then the one that matters: a route stands on an import.
 */
export function checkBlueprint(blueprint: Blueprint, survey: Survey): string[] {
  const issues: string[] = [];
  const unique = (label: string, ids: readonly string[]) => {
    for (const id of ids) {
      if (!KEBAB.test(id)) {
        issues.push(`${label} id "${id}" is not kebab-case`);
      }
    }
    for (const d of duplicates(ids)) {
      issues.push(`duplicate ${label} id "${d}"`);
    }
  };
  const atMost = (what: string, text: string, max: number) => {
    if (text.length > max) {
      issues.push(`${what} "${text}" is longer than ${max} characters`);
    }
  };
  const count = (what: string, n: number, min: number, max: number) => {
    if (n < min || n > max) {
      issues.push(`${what}: ${n}, expected ${min} to ${max}`);
    }
  };

  const allRouteIds = [
    ...blueprint.routes.map((r) => r.id),
    ...blueprint.actions.flatMap((a) => a.addRoutes.map((r) => r.id)),
  ];
  unique(
    "zone",
    blueprint.zones.map((z) => z.id),
  );
  unique(
    "part",
    blueprint.parts.map((p) => p.id),
  );
  unique("route", allRouteIds);
  unique(
    "scenario",
    blueprint.scenarios.map((s) => s.id),
  );
  unique(
    "action",
    blueprint.actions.map((a) => a.id),
  );
  for (const scenario of blueprint.scenarios) {
    unique(
      `step (in "${scenario.id}")`,
      scenario.steps.map((s) => s.id),
    );
  }

  count("zones", blueprint.zones.length, 1, 4);
  count("parts", blueprint.parts.length, 2, 24);
  count("scenarios", blueprint.scenarios.length, 1, 3);
  count("actions", blueprint.actions.length, 0, 4);
  count("article paragraphs", blueprint.article.length, 1, 5);
  count("glossary terms", blueprint.glossary.length, 0, 8);
  atMost("layout why", blueprint.layout.why, 120);
  if (blueprint.layout.kind === "hub") {
    const hub = hubAround(blueprint, blueprint.layout.core);
    if (typeof hub === "string") {
      issues.push(hub);
    }
  }
  for (const zone of blueprint.zones) {
    atMost("zone label", zone.label, 24);
    atMost("zone note", zone.note, 40);
  }
  for (const part of blueprint.parts) {
    atMost("role", part.role, 12);
  }
  for (const entry of blueprint.glossary) {
    atMost("glossary term", entry.term, 24);
    atMost("glossary definition", entry.definition, 200);
  }

  // Parts stand for survey units, each unit once, and every unit is drawn or left out.
  const zoneIds = new Set(blueprint.zones.map((z) => z.id));
  const partById = new Map(blueprint.parts.map((p) => [p.id, p]));
  const unitIds = new Set(survey.units.map((u) => u.id));
  const libraryNames = new Set(survey.units.flatMap((u) => u.externals.map((e) => e.name)));
  const owner = new Map<string, string>();
  for (const part of blueprint.parts) {
    if (!zoneIds.has(part.zone)) {
      issues.push(`part "${part.id}" sits in unknown zone "${part.zone}"`);
    }
    for (const unit of part.units) {
      if (!unitIds.has(unit)) {
        issues.push(`part "${part.id}" stands for unknown unit "${unit}"`);
      }
      const other = owner.get(unit);
      if (other) {
        issues.push(`unit "${unit}" is drawn twice, in "${other}" and "${part.id}"`);
      }
      owner.set(unit, part.id);
    }
    for (const library of part.libraries) {
      if (!libraryNames.has(library)) {
        issues.push(`part "${part.id}" names library "${library}", which no unit imports`);
      }
    }
    if (CODE_KINDS.has(part.kind) && part.units.length === 0) {
      issues.push(`${part.kind} "${part.id}" is the project's code: it must stand for units`);
    }
    if ((part.kind === "store" || part.kind === "queue") && part.libraries.length === 0) {
      issues.push(`${part.kind} "${part.id}" names the libraries the code reaches it through`);
    }
    if (!CODE_KINDS.has(part.kind) && part.units.length > 0) {
      issues.push(`${part.kind} "${part.id}" lies outside the code: it stands for no unit`);
    }
  }
  const leftOut = new Set(blueprint.leftOut.map((l) => l.unit));
  for (const unit of survey.units) {
    if (!owner.has(unit.id) && !leftOut.has(unit.id)) {
      issues.push(`unit "${unit.id}" is neither drawn nor left out with a reason`);
    }
  }

  // Routes: each one stands on an import, and its arrowhead says which way it runs.
  const waysIn = new Set(survey.units.filter((u) => u.entries.length > 0).map((u) => u.id));
  const routeById = new Map(blueprint.routes.map((r) => [r.id, r]));
  for (const route of blueprint.routes) {
    const from = partById.get(route.from);
    const to = partById.get(route.to);
    if (!from || !to) {
      issues.push(`route "${route.id}" connects unknown part "${from ? route.to : route.from}"`);
      continue;
    }
    if (from.id === to.id) {
      issues.push(`route "${route.id}" goes from "${from.id}" to itself`);
      continue;
    }
    const outside = [from, to].filter((p) => p.units.length === 0);
    const visitor = outside.find((p) => p.libraries.length === 0);
    if (outside.length === 2) {
      issues.push(`route "${route.id}" connects two parts outside the code: nothing shows it`);
      continue;
    }
    if (visitor) {
      // Someone outside the code uses it: no import to show, but it must come in by a way in.
      const inner = visitor === from ? to : from;
      if (waysIn.size > 0 && !inner.units.some((u) => waysIn.has(u))) {
        issues.push(
          `route "${route.id}" reaches "${inner.id}" from outside, but none of its units has a way in`,
        );
      }
      if (route.dependsOn !== "none") {
        issues.push(`route "${route.id}" comes from outside the code: its dependsOn is "none"`);
      }
      continue;
    }
    const { forward, backward } = evidenceBetween(survey, from, to);
    if (!forward && !backward) {
      issues.push(
        `route "${route.id}": nothing in "${from.id}" imports "${to.id}", nor the other way round`,
      );
      continue;
    }
    if (route.kind === "wire") {
      if (route.dependsOn !== "none") {
        issues.push(`wire "${route.id}" carries no arrowhead: its dependsOn is "none"`);
      }
      continue;
    }
    const expected = forward && backward ? ["to", "from"] : forward ? ["to"] : ["from"];
    if (!expected.includes(route.dependsOn)) {
      issues.push(
        `route "${route.id}": "${forward ? from.id : to.id}" imports "${forward ? to.id : from.id}", so its dependsOn is "${expected[0]}"`,
      );
    }
  }

  // Actions: a what-if adds an import the code does not have.
  const actionById = new Map(blueprint.actions.map((a) => [a.id, a]));
  const addedBy = new Map<string, string>();
  for (const action of blueprint.actions) {
    for (const added of action.addRoutes) {
      addedBy.set(added.id, action.id);
      const from = partById.get(added.from);
      const to = partById.get(added.to);
      if (!from || !to) {
        issues.push(`action "${action.id}" adds a route to unknown part`);
        continue;
      }
      if (
        from.units.length > 0 &&
        to.units.length > 0 &&
        evidenceBetween(survey, from, to).forward
      ) {
        issues.push(
          `action "${action.id}" adds "${added.id}", but "${from.id}" already imports "${to.id}": a what-if shows what the code does not do`,
        );
      }
    }
    for (const removed of action.removeRoutes) {
      if (!routeById.has(removed)) {
        issues.push(`action "${action.id}" removes unknown route "${removed}"`);
      }
    }
    for (const flagged of action.flagParts) {
      if (!partById.has(flagged)) {
        issues.push(`action "${action.id}" flags unknown part "${flagged}"`);
      }
    }
  }

  // Scenarios: tokens follow routes end to end.
  const endpoints = (id: string) => {
    const base = routeById.get(id);
    if (base) {
      return base.kind === "pipe" ? base : undefined;
    }
    for (const action of blueprint.actions) {
      const added = action.addRoutes.find((r) => r.id === id);
      if (added) {
        return added;
      }
    }
    return undefined;
  };
  for (const scenario of blueprint.scenarios) {
    count(`steps in "${scenario.id}"`, scenario.steps.length, 2, 10);
    for (const step of scenario.steps) {
      const where = `step "${step.id}"`;
      if (step.path.length > 0 && step.at !== null) {
        issues.push(`${where} has both a path and a part to wait on`);
      }
      if (step.at !== null && !partById.has(step.at)) {
        issues.push(`${where} waits on unknown part "${step.at}"`);
      }
      if (step.label !== null) {
        atMost(`${where} token label`, step.label, 3);
      }
      for (const part of step.focus) {
        if (!partById.has(part)) {
          issues.push(`${where} focuses unknown part "${part}"`);
        }
      }
      for (const action of [...step.whenOn, ...step.whenOff]) {
        if (!actionById.has(action)) {
          issues.push(`${where} depends on unknown action "${action}"`);
        }
      }
      let previous: { readonly id: string; readonly to: string } | undefined;
      for (const id of step.path) {
        const route = endpoints(id);
        if (!route) {
          issues.push(`${where} travels "${id}", which is no pipe of the machine`);
          previous = undefined;
          continue;
        }
        const action = addedBy.get(id);
        if (action && !step.whenOn.includes(action)) {
          issues.push(`${where} travels "${id}", added by "${action}": it plays only with it on`);
        }
        for (const removing of blueprint.actions.filter((a) => a.removeRoutes.includes(id))) {
          if (!step.whenOff.includes(removing.id)) {
            issues.push(
              `${where} travels "${id}", removed by "${removing.id}": it plays only with it off`,
            );
          }
        }
        if (previous && previous.to !== route.from) {
          issues.push(
            `${where}: "${id}" starts at "${route.from}", not where "${previous.id}" ends ("${previous.to}")`,
          );
        }
        previous = { id, to: route.to };
      }
    }
  }
  for (const entry of blueprint.glossary) {
    for (const part of entry.parts) {
      if (!partById.has(part)) {
        issues.push(`glossary term "${entry.term}" names unknown part "${part}"`);
      }
    }
  }
  return issues;
}
