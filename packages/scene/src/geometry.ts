import type { Shape, Vec3 } from "@nightprint/engine";
import {
  BoxGeometry,
  type BufferGeometry,
  CurvePath,
  CylinderGeometry,
  LineCurve3,
  TubeGeometry,
  Vector3,
} from "three";

/**
 * Prisms use CylinderGeometry with one segment per side: a vertex
 * points to +z, so flat faces look at ±x and ±60°.
 */
export function createShapeGeometry(shape: Shape): BufferGeometry {
  switch (shape.type) {
    case "box":
      return new BoxGeometry(shape.size[0], shape.size[1], shape.size[2]);
    case "prism":
      return new CylinderGeometry(shape.radius, shape.radius, shape.height, shape.sides);
    case "cylinder":
      return new CylinderGeometry(shape.radius, shape.radius, shape.height, 48);
  }
}

/** Top of a shape above its centre, for balloons. */
export function shapeHalfHeight(shape: Shape): number {
  return shape.type === "box" ? shape.size[1] / 2 : shape.height / 2;
}

export function createPipeGeometry(points: readonly Vec3[], radius: number): TubeGeometry {
  const path = new CurvePath<Vector3>();
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = new Vector3(...(points[i - 1] as Vec3));
    const b = new Vector3(...(points[i] as Vec3));
    length += a.distanceTo(b);
    path.add(new LineCurve3(a, b));
  }
  const segments = Math.max(16, Math.ceil(length * 24));
  return new TubeGeometry(path, segments, radius, 8, false);
}
