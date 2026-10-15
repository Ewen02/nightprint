import { describe, expect, it } from "vitest";
import { type Blueprint, checkBlueprint } from "./blueprint";
import {
  busBlueprint,
  busSnapshot,
  hubBlueprint,
  hubSnapshot,
  mirrorBlueprint,
  shopBlueprint,
  snapshot,
} from "./fixture.test-helper";
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

  it("accepts a hub around the core most of the code imports", () => {
    expect(checkBlueprint(hubBlueprint, surveyRepo(hubSnapshot))).toEqual([]);
  });

  it("refuses a hub too few parts lean on, and says to choose bands", () => {
    const issues = with_((b) => ({ ...b, layout: { kind: "hub", center: "core", why: "" } }));
    expect(issues).toEqual([
      `layout "hub": 2 of the code's 2 other parts lean on "core"; a hub needs 3 and most of them, so choose "bands"`,
    ]);
  });

  it("refuses a hub that names no core of the code", () => {
    expect(with_((b) => ({ ...b, layout: { kind: "hub", center: "web", why: "" } }))).toEqual([
      `layout "hub": "web" is an adapter, not a core of the code`,
    ]);
    expect(with_((b) => ({ ...b, layout: { kind: "hub", center: null, why: "" } }))[0]).toMatch(
      /names no core/,
    );
  });

  it("accepts a mirror around the part both halves of the code import", () => {
    expect(checkBlueprint(mirrorBlueprint, surveyRepo(hubSnapshot))).toEqual([]);
  });

  it("refuses a mirror whose code does not split in two", () => {
    expect(with_((b) => ({ ...b, layout: { kind: "mirror", center: "core", why: "" } }))).toEqual([
      `layout "mirror": without the zone of "core", the code falls in 0 groups that do not import each other; a mirror needs exactly two`,
    ]);
  });

  it("accepts a bus along the queue three parts of the code are routed to", () => {
    expect(checkBlueprint(busBlueprint, surveyRepo(busSnapshot))).toEqual([]);
  });

  it("refuses a bus with too few parts on its queue", () => {
    const thin = {
      ...busBlueprint,
      routes: busBlueprint.routes.filter((r) => r.id !== "cli-broker"),
    };
    expect(checkBlueprint(thin, surveyRepo(busSnapshot))).toEqual([
      `layout "bus": 2 parts of the code are routed to "broker"; a bus needs 3, so choose another layout`,
    ]);
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
