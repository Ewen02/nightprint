import { describe, expect, it } from "vitest";
import { chain, easeInOutCubic, pointAlong, polylineLength } from "./geometry";
import type { Vec3 } from "./schema";

const square: Vec3[] = [
  [0, 0, 0],
  [2, 0, 0],
  [2, 0, 2],
];

describe("geometry", () => {
  it("measures a polyline", () => {
    expect(polylineLength(square)).toBe(4);
  });

  it("samples by arc length, not by segment", () => {
    expect(pointAlong(square, 0)).toEqual([0, 0, 0]);
    expect(pointAlong(square, 0.25)).toEqual([1, 0, 0]);
    expect(pointAlong(square, 0.75)).toEqual([2, 0, 1]);
    expect(pointAlong(square, 1)).toEqual([2, 0, 2]);
  });

  it("clamps out-of-range progress", () => {
    expect(pointAlong(square, -1)).toEqual([0, 0, 0]);
    expect(pointAlong(square, 2)).toEqual([2, 0, 2]);
  });

  it("chains polylines without repeating joints", () => {
    expect(
      chain([
        [
          [0, 0, 0],
          [1, 0, 0],
        ],
        [
          [1, 0, 0],
          [1, 1, 0],
        ],
      ]),
    ).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
    ]);
  });

  it("eases symmetrically", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1, 10);
  });
});
