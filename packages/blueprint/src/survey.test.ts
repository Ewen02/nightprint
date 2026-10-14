import { describe, expect, it } from "vitest";
import { isWanted } from "./files";
import { snapshot } from "./fixture.test-helper";
import { surveyRepo } from "./survey";

describe("surveyRepo", () => {
  it("makes each small package one unit", () => {
    const survey = surveyRepo(snapshot);
    expect(survey.units.map((u) => [u.id, u.path, u.package])).toEqual([
      ["apps-web", "apps/web", "@shop/web"],
      ["packages-core", "packages/core", "@shop/core"],
      ["packages-db", "packages/db", "@shop/db"],
    ]);
  });

  it("connects units through relative imports, path aliases and workspace packages", () => {
    const survey = surveyRepo(snapshot);
    expect(survey.edges).toEqual([
      { from: "apps-web", to: "packages-core", files: 1 },
      { from: "apps-web", to: "packages-db", files: 1 },
      { from: "packages-db", to: "packages-core", files: 1 },
    ]);
  });

  it("keeps tests and tool configuration out of the edges, and counts the tests", () => {
    const web = surveyRepo(snapshot).units.find((u) => u.id === "apps-web");
    expect(web?.tests).toBe(1);
    expect(web?.files.map((f) => f.path)).not.toContain("apps/web/next.config.ts");
    expect(web?.externals.map((e) => e.name)).not.toContain("vitest");
  });

  it("names the libraries a unit uses, by category, and leaves Node's own modules out", () => {
    const units = surveyRepo(snapshot).units;
    expect(units.find((u) => u.id === "packages-db")?.externals).toEqual([
      { name: "pg", category: "database", files: 1 },
    ]);
    expect(units.find((u) => u.id === "apps-web")?.externals).toEqual([
      { name: "react", category: "ui", files: 1 },
    ]);
  });

  it("finds the ways in: Next.js pages and endpoints, route groups left out", () => {
    const web = surveyRepo(snapshot).units.find((u) => u.id === "apps-web");
    expect(web?.entries).toEqual(["endpoint /api/orders", "page /orders"]);
  });

  it("splits a large package by top-level folder", () => {
    const survey = surveyRepo(snapshot, { folderUnitsFrom: 1 });
    expect(survey.units.map((u) => u.id)).toEqual([
      "apps-web-app",
      "apps-web-components",
      "packages-core",
      "packages-db",
    ]);
    expect(survey.edges).toContainEqual({
      from: "apps-web-app",
      to: "apps-web-components",
      files: 1,
    });
  });

  it("keeps what a file exports and its first doc comment", () => {
    const core = surveyRepo(snapshot).units.find((u) => u.id === "packages-core");
    expect(core?.files.find((f) => f.path.endsWith("order.ts"))).toEqual({
      path: "packages/core/src/order.ts",
      exports: ["placeOrder"],
      doc: "Places an order once it is valid.",
    });
    expect(core?.files.find((f) => f.path.endsWith("index.ts"))?.exports).toEqual([
      "placeOrder",
      "Money",
    ]);
  });

  it("keeps the README and the commit it read", () => {
    const { repo } = surveyRepo(snapshot);
    expect(repo).toMatchObject({ name: "acme/shop", ref: "abc1234def" });
    expect(repo.readme).toContain("Orders and payments.");
  });
});

describe("isWanted", () => {
  it("reads sources, manifests and the root README, never build output or dependencies", () => {
    expect(isWanted("packages/core/src/order.ts")).toBe(true);
    expect(isWanted("apps/web/tsconfig.json")).toBe(true);
    expect(isWanted("README.md")).toBe(true);
    expect(isWanted("docs/README.md")).toBe(false);
    expect(isWanted("node_modules/pg/index.js")).toBe(false);
    expect(isWanted("apps/web/.next/server/page.js")).toBe(false);
    expect(isWanted(".github/scripts/release.ts")).toBe(false);
    expect(isWanted("packages/core/src/types.d.ts")).toBe(false);
    expect(isWanted("packages/core/src/huge.ts", 500_000)).toBe(false);
  });
});
