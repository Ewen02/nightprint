import type { Vec3 } from "./schema";

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Same curve as the `motion.ease` token, cubic-bezier(0.65, 0, 0.35, 1) approximated by an ease-in-out cubic. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Joins polylines, dropping a point when it repeats the previous one. */
export function chain(polylines: readonly (readonly Vec3[])[]): Vec3[] {
  const out: Vec3[] = [];
  for (const line of polylines) {
    for (const p of line) {
      const last = out[out.length - 1];
      if (!last || distance(last, p) > 1e-9) {
        out.push(p);
      }
    }
  }
  return out;
}

export function polylineLength(points: readonly Vec3[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1] as Vec3, points[i] as Vec3);
  }
  return total;
}

/** Point at fraction `t` of the polyline's arc length. */
export function pointAlong(points: readonly Vec3[], t: number): Vec3 {
  const first = points[0];
  if (!first) {
    throw new Error("pointAlong needs at least one point");
  }
  if (points.length === 1) {
    return first;
  }
  const target = polylineLength(points) * clamp01(t);
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    const segment = distance(a, b);
    if (walked + segment >= target) {
      return segment === 0 ? b : lerpVec3(a, b, (target - walked) / segment);
    }
    walked += segment;
  }
  return points[points.length - 1] as Vec3;
}
