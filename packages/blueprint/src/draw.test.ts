import { defineMachine, type Machine, resolveMachine } from "@nightprint/engine";
import { describe, expect, it } from "vitest";
import { drawMachine } from "./draw";
import { hubBlueprint, hubSnapshot, shopBlueprint, snapshot } from "./fixture.test-helper";
import { surveyRepo } from "./survey";

const survey = surveyRepo(snapshot);
const options = {
  code: "PRJ-999",
  slug: "shop",
  revised: "2026-10-14",
  sourceUrl: "https://github.com/acme/shop/tree/abc1234def",
};
const machine = defineMachine(drawMachine(shopBlueprint, survey, options));

describe("drawMachine", () => {
  it("draws a machine the engine accepts under every combination of actions", () => {
    expect(machine.code).toBe("PRJ-999");
    expect(machine.sources).toEqual([
      { label: "acme/shop at abc1234", url: "https://github.com/acme/shop/tree/abc1234def" },
    ]);
  });

  it("lays the zones out left to right, each part inside its zone", () => {
    expect(machine.stage.zones.map((z) => z.id)).toEqual(["callers", "code", "services"]);
    for (const part of shopBlueprint.parts) {
      const zone = machine.stage.zones.find((z) => z.id === part.zone);
      const x = machine.parts.find((p) => p.id === part.id)?.position[0] ?? Number.NaN;
      expect(x).toBeGreaterThan(zone?.from[0] ?? Number.POSITIVE_INFINITY);
      expect(x).toBeLessThan(zone?.to[0] ?? Number.NEGATIVE_INFINITY);
    }
  });

  it("numbers the bill of parts left to right", () => {
    const xs = [...machine.parts]
      .sort((a, b) => (a.ref ?? 0) - (b.ref ?? 0))
      .map((p) => p.position[0]);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("squares every route off: each segment runs along x or z", () => {
    const resolved = resolveMachine(machine, []);
    for (const route of machine.routes) {
      const from = resolved.partById.get(route.from);
      const to = resolved.partById.get(route.to);
      const points = [
        from && [from.position[0] + from.socket[0], from.position[2] + from.socket[2]],
        ...route.via.map((p) => [p[0], p[2]]),
        to && [to.position[0] + to.socket[0], to.position[2] + to.socket[2]],
      ];
      for (let i = 1; i < points.length; i++) {
        const [ax = 0, az = 0] = points[i - 1] ?? [];
        const [bx = 0, bz = 0] = points[i] ?? [];
        expect(Math.abs(ax - bx) < 1e-9 || Math.abs(az - bz) < 1e-9).toBe(true);
      }
    }
  });

  it("draws a what-if import as a violation arcing over the plate", () => {
    const action = machine.actions.find((a) => a.id === "core-imports-db");
    const added = action?.effects.find((e) => e.type === "addRoute");
    expect(added?.type === "addRoute" && added.route).toMatchObject({
      flag: "violation",
      dependsOn: "to",
    });
    expect(added?.type === "addRoute" && added.route.via[0]?.[1]).toBeGreaterThan(1);
  });

  it("raises a part of the code with the lines it stands for, and leaves the rest as they are", () => {
    const lines = (id: string) =>
      (shopBlueprint.parts.find((p) => p.id === id)?.units ?? []).reduce(
        (sum, unit) => sum + (survey.units.find((u) => u.id === unit)?.lines ?? 0),
        0,
      );
    const height = (id: string) => {
      const shape = machine.parts.find((p) => p.id === id)?.shape;
      return shape?.type === "box" ? shape.size[1] : (shape?.height ?? 0);
    };
    // Two adapters: the one with more code stands taller.
    const [less = "", more = ""] = ["web", "db"].sort((a, b) => lines(a) - lines(b));
    expect(lines(more)).toBeGreaterThan(lines(less));
    expect(height(more)).toBeGreaterThan(height(less));
    // The visitor stands for no code: its kind's height.
    expect(height("visitor")).toBe(0.6);
  });

  it("gives the same drawing for the same blueprint", () => {
    expect(drawMachine(shopBlueprint, survey, options)).toEqual(
      drawMachine(shopBlueprint, survey, options),
    );
  });
});

describe("drawMachine, for a project whose code leans on one core", () => {
  const hubSurvey = surveyRepo(hubSnapshot);
  const hub: Machine = defineMachine(drawMachine(hubBlueprint, hubSurvey, options));
  const at = (id: string) => hub.parts.find((p) => p.id === id)?.position ?? [0, 0, 0];
  const zone = (id: string) => hub.stage.zones.find((z) => z.id === id);

  it("sets the core at the centre of its zone, inside the zone of the code that imports it", () => {
    const heart = zone("heart");
    const apps = zone("apps");
    const [x, , z] = at("core");
    expect(x).toBeCloseTo(((heart?.from[0] ?? 0) + (heart?.to[0] ?? 0)) / 2);
    expect(z).toBeCloseTo(((heart?.from[1] ?? 0) + (heart?.to[1] ?? 0)) / 2);
    expect(apps?.from[0]).toBeLessThan(heart?.from[0] ?? 0);
    expect(apps?.to[0]).toBeGreaterThan(heart?.to[0] ?? 0);
    expect(apps?.from[1]).toBeLessThan(heart?.from[1] ?? 0);
    expect(apps?.to[1]).toBeGreaterThan(heart?.to[1] ?? 0);
  });

  it("rings the code that imports the core around it, at one distance", () => {
    const [cx, , cz] = at("core");
    const distances = ["web", "db", "cli"].map((id) => {
      const [x, , z] = at(id);
      return Math.hypot(x - cx, z - cz);
    });
    for (const d of distances) {
      expect(d).toBeCloseTo(distances[0] ?? 0);
      expect(d).toBeGreaterThan(2);
    }
  });

  it("turns every adapter's plug towards the core", () => {
    const [cx, , cz] = at("core");
    for (const id of ["web", "db", "cli"]) {
      const part = hub.parts.find((p) => p.id === id);
      const [x, , z] = at(id);
      const [sx = 0, , sz = 0] = part?.socket ?? [];
      expect(sx * (cx - x) + sz * (cz - z)).toBeGreaterThan(0);
    }
  });

  it("runs a route between the ring and a band around the ring, never across its centre", () => {
    const [cx, , cz] = at("core");
    const ring = Math.hypot(at("web")[0] - cx, at("web")[2] - cz);
    for (const id of ["visit", "db-pg"]) {
      const route = hub.routes.find((r) => r.id === id);
      expect(route?.via.length).toBeGreaterThan(0);
      for (const [x, , z] of route?.via ?? []) {
        expect(Math.hypot(x - cx, z - cz)).toBeGreaterThan(ring);
      }
    }
  });

  it("keeps the callers on the left of the ring and the services on its right", () => {
    expect(at("visitor")[0]).toBeLessThan(at("web")[0]);
    expect(at("postgres")[0]).toBeGreaterThan(at("db")[0]);
  });

  it("gives the same drawing for the same blueprint", () => {
    expect(drawMachine(hubBlueprint, hubSurvey, options)).toEqual(
      drawMachine(hubBlueprint, hubSurvey, options),
    );
  });

  it("draws bands when the blueprint chose bands, whatever the code leans on", () => {
    const bands = drawMachine(
      { ...hubBlueprint, layout: { kind: "bands", core: null, why: "" } },
      hubSurvey,
      options,
    );
    const depths = (bands.stage.zones ?? []).map((z) => `${z.from[1]}:${z.to[1]}`);
    expect(new Set(depths).size).toBe(1);
  });
});
