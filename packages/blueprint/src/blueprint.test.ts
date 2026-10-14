import { describe, expect, it } from "vitest";
import { type Blueprint, checkBlueprint } from "./blueprint";
import { shopBlueprint, snapshot } from "./fixture.test-helper";
import { surveyRepo } from "./survey";

const survey = surveyRepo(snapshot);

/** The shop's blueprint with one change. */
function with_(change: (b: Blueprint) => Blueprint): string[] {
  return checkBlueprint(change(shopBlueprint), survey);
}

describe("checkBlueprint", () => {
  it("accepts a blueprint whose every route stands on an import", () => {
    expect(checkBlueprint(shopBlueprint, survey)).toEqual([]);
  });

  it("refuses a route nothing in the code shows", () => {
    const issues = with_((b) => ({
      ...b,
      routes: [
        ...b.routes,
        { id: "core-pg", from: "core", to: "postgres", kind: "pipe", dependsOn: "to" },
      ],
    }));
    expect(issues).toContain(
      'route "core-pg": nothing in "core" imports "postgres", nor the other way round',
    );
  });

  it("points the arrowhead the way the import runs", () => {
    const issues = with_((b) => ({
      ...b,
      routes: b.routes.map((r) => (r.id === "web-core" ? { ...r, dependsOn: "from" } : r)),
    }));
    expect(issues).toContain('route "web-core": "web" imports "core", so its dependsOn is "to"');
  });

  it("accepts a route drawn against its import, when the arrowhead says so", () => {
    const issues = with_((b) => ({
      ...b,
      routes: b.routes.map((r) =>
        r.id === "db-core" ? { ...r, from: "core", to: "db", dependsOn: "from" } : r,
      ),
    }));
    expect(issues).toEqual([]);
  });

  it("lets someone outside the code in only where the code has a way in", () => {
    const issues = with_((b) => ({
      ...b,
      routes: [
        ...b.routes,
        { id: "poke", from: "visitor", to: "core", kind: "pipe", dependsOn: "none" },
      ],
    }));
    expect(issues).toContain(
      'route "poke" reaches "core" from outside, but none of its units has a way in',
    );
  });

  it("wants every unit drawn, or left out with a reason", () => {
    const issues = with_((b) => ({
      ...b,
      parts: b.parts.map((p) => (p.id === "db" ? { ...p, units: [] } : p)),
    }));
    expect(issues).toContain('unit "packages-db" is neither drawn nor left out with a reason');
    expect(issues).toContain('adapter "db" is the project\'s code: it must stand for units');
  });

  it("refuses a what-if that adds an import the code already has", () => {
    const issues = with_((b) => ({
      ...b,
      actions: b.actions.map((a) => ({
        ...a,
        addRoutes: [{ id: "core-db", from: "web", to: "core" }],
      })),
    }));
    expect(issues).toContain(
      'action "core-imports-db" adds "core-db", but "web" already imports "core": a what-if shows what the code does not do',
    );
  });

  it("plays a step on a what-if route only with its action on", () => {
    const issues = with_((b) => ({
      ...b,
      scenarios: b.scenarios.map((s) => ({
        ...s,
        steps: s.steps.map((step) => ({ ...step, whenOn: [] })),
      })),
    }));
    expect(issues).toContain(
      'step "shortcut" travels "core-db", added by "core-imports-db": it plays only with it on',
    );
  });

  it("makes a token follow its routes end to end", () => {
    const issues = with_((b) => ({
      ...b,
      scenarios: b.scenarios.map((s) => ({
        ...s,
        steps: s.steps.map((step) =>
          step.id === "save" ? { ...step, path: ["db-pg", "web-db"] } : step,
        ),
      })),
    }));
    expect(issues).toContain(
      'step "save": "web-db" starts at "web", not where "db-pg" ends ("postgres")',
    );
  });

  it("keeps the drawing's words short enough to print", () => {
    const issues = with_((b) => ({
      ...b,
      zones: b.zones.map((z) =>
        z.id === "code" ? { ...z, label: "Everything the repository holds" } : z,
      ),
    }));
    expect(issues).toContain(
      'zone label "Everything the repository holds" is longer than 24 characters',
    );
  });
});
