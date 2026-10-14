import { type Blueprint, type BlueprintPart, evidenceBetween } from "./blueprint";
import type { Survey } from "./survey";

/**
 * Mends what a blueprint gets wrong mechanically, before `checkBlueprint` judges it: a word
 * over its length, a token label of four letters, an arrowhead the imports already settle,
 * a unit forgotten. Sending a whole answer back for those cost a second answer on every
 * drawing measured (15/10/2026), a third of its cost and most of a minute. What only the
 * model can decide (a route with no import, a path that does not chain) is left for it.
 */

/** Cuts at the last whole word that fits, and marks the cut. */
function shorten(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

/** The arrowhead the imports settle, or the model's own when both ways import. */
function settledDependsOn(
  survey: Survey,
  from: BlueprintPart,
  to: BlueprintPart,
  given: "from" | "to" | "none",
): "from" | "to" | "none" {
  const { forward, backward } = evidenceBetween(survey, from, to);
  if (forward && backward) {
    return given === "none" ? "to" : given;
  }
  return forward ? "to" : backward ? "from" : given;
}

export interface Repaired {
  readonly blueprint: Blueprint;
  /** What was mended, in words for a log. */
  readonly repairs: readonly string[];
}

export function repairBlueprint(blueprint: Blueprint, survey: Survey): Repaired {
  const repairs: string[] = [];
  const note = (what: string) => repairs.push(what);
  const libraries = new Set(survey.units.flatMap((u) => u.externals.map((e) => e.name)));

  const zones = blueprint.zones.map((zone) => {
    const label = shorten(zone.label, 24);
    const zoneNote = shorten(zone.note, 40);
    if (label !== zone.label || zoneNote !== zone.note) {
      note(`shortened zone "${zone.id}"`);
    }
    return { ...zone, label, note: zoneNote };
  });

  const parts = blueprint.parts.map((part) => {
    const role = shorten(part.role.toUpperCase(), 12);
    const known = part.libraries.filter((l) => libraries.has(l));
    if (role !== part.role.toUpperCase()) {
      note(`shortened the role of "${part.id}"`);
    }
    if (known.length !== part.libraries.length) {
      note(`dropped libraries no unit imports from "${part.id}"`);
    }
    return { ...part, role, libraries: known };
  });
  const repairedPartById = new Map(parts.map((p) => [p.id, p]));

  const drawn = new Set(parts.flatMap((p) => p.units));
  const leftOut = [...blueprint.leftOut];
  for (const unit of survey.units) {
    if (!drawn.has(unit.id) && !leftOut.some((l) => l.unit === unit.id)) {
      leftOut.push({ unit: unit.id, reason: "Not drawn: it plays no part in the scenarios." });
      note(`left out "${unit.id}"`);
    }
  }

  const routes = blueprint.routes.map((route) => {
    const from = repairedPartById.get(route.from);
    const to = repairedPartById.get(route.to);
    if (!from || !to) {
      return route;
    }
    // Someone outside the code, not a service its libraries reach: no import to point.
    const outside = from.units.length === 0 ? from : to.units.length === 0 ? to : undefined;
    const visitor = outside !== undefined && outside.libraries.length === 0;
    const dependsOn =
      route.kind === "wire" || visitor
        ? "none"
        : settledDependsOn(survey, from, to, route.dependsOn);
    if (dependsOn !== route.dependsOn) {
      note(`turned the arrowhead of "${route.id}" the way its import runs`);
    }
    return { ...route, dependsOn };
  });

  if (blueprint.scenarios.length > 3) {
    note(`kept the first 3 of ${blueprint.scenarios.length} scenarios`);
  }
  const scenarios = blueprint.scenarios.slice(0, 3).map((scenario) => ({
    ...scenario,
    steps: scenario.steps.map((step) => {
      if (step.label !== null && step.label.length > 3) {
        note(`dropped the token label "${step.label}" of "${step.id}"`);
        return { ...step, label: null };
      }
      return step;
    }),
  }));

  const glossary = blueprint.glossary.map((entry) => ({
    ...entry,
    term: shorten(entry.term, 24),
    definition: shorten(entry.definition, 200),
  }));

  return {
    blueprint: { ...blueprint, zones, parts, leftOut, routes, scenarios, glossary },
    repairs,
  };
}
