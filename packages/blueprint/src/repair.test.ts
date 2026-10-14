import { describe, expect, it } from "vitest";
import { type Blueprint, checkBlueprint } from "./blueprint";
import { shopBlueprint, snapshot } from "./fixture.test-helper";
import { repairBlueprint } from "./repair";
import { surveyRepo } from "./survey";

const survey = surveyRepo(snapshot);

/** The shop's blueprint with what a model often gets wrong. */
const sloppy: Blueprint = {
  ...shopBlueprint,
  zones: shopBlueprint.zones.map((z) =>
    z.id === "code" ? { ...z, note: "Pages, endpoints, the domain and the database package" } : z,
  ),
  parts: shopBlueprint.parts.map((p) =>
    p.id === "db" ? { ...p, units: [], kind: "module" as const, role: "storage layer" } : p,
  ),
  routes: shopBlueprint.routes.map((r) => (r.id === "web-core" ? { ...r, dependsOn: "from" } : r)),
  scenarios: shopBlueprint.scenarios.map((s) => ({
    ...s,
    steps: s.steps.map((step) => (step.id === "arrive" ? { ...step, label: "POST" } : step)),
  })),
};

describe("repairBlueprint", () => {
  it("mends what only breaks a length, a label or an arrowhead the imports settle", () => {
    const { blueprint, repairs } = repairBlueprint(sloppy, survey);
    expect(blueprint.zones.find((z) => z.id === "code")?.note).toBe(
      "Pages, endpoints, the domain and the…",
    );
    expect(blueprint.routes.find((r) => r.id === "web-core")?.dependsOn).toBe("to");
    expect(blueprint.scenarios[0]?.steps.find((s) => s.id === "arrive")?.label).toBeNull();
    expect(blueprint.parts.find((p) => p.id === "db")?.role).toBe("STORAGE…");
    expect(blueprint.leftOut).toContainEqual({
      unit: "packages-db",
      reason: "Not drawn: it plays no part in the scenarios.",
    });
    expect(repairs.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps the first three scenarios of a blueprint that wrote more", () => {
    // Four copies of the shop's own scenario, under new ids.
    const scenarios = [1, 2, 3, 4].flatMap((n) =>
      shopBlueprint.scenarios.slice(0, 1).map((s) => ({ ...s, id: `s${n}` })),
    );
    const { blueprint } = repairBlueprint({ ...shopBlueprint, scenarios }, survey);
    expect(blueprint.scenarios.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("leaves what only the model can decide to the check", () => {
    const { blueprint } = repairBlueprint(sloppy, survey);
    // The database package lost its units: its routes now stand on nothing, and that goes back.
    expect(checkBlueprint(blueprint, survey).some((i) => i.includes("is the project's code"))).toBe(
      true,
    );
  });

  it("changes nothing in a blueprint that keeps every rule", () => {
    expect(repairBlueprint(shopBlueprint, survey)).toEqual({
      blueprint: shopBlueprint,
      repairs: [],
    });
  });
});
