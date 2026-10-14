import { defineMachine, resolveMachine } from "@nightprint/engine";
import { describe, expect, it } from "vitest";
import { drawMachine } from "./draw";
import { shopBlueprint, snapshot } from "./fixture.test-helper";
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

  it("gives the same drawing for the same blueprint", () => {
    expect(drawMachine(shopBlueprint, survey, options)).toEqual(
      drawMachine(shopBlueprint, survey, options),
    );
  });
});
