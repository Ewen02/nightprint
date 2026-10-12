import { useEffect, useMemo } from "react";
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { Edges } from "./edges";
import { createBodyMaterial } from "./materials";
import { noRaycast, scene } from "./palette";

const THICKNESS = 0.12;
const PLATE_EDGES = {
  color: scene.edge,
  opacity: scene.edgeOpacity.plate,
  width: scene.lineWidth.edge,
  bloom: 0,
} as const;
const GRID_STEP = 0.5;

function createGrid(width: number, depth: number): BufferGeometry {
  const positions: number[] = [];
  const y = 0.002;
  for (let x = -width / 2 + GRID_STEP; x < width / 2 - 1e-6; x += GRID_STEP) {
    positions.push(x, y, -depth / 2, x, y, depth / 2);
  }
  for (let z = -depth / 2 + GRID_STEP; z < depth / 2 - 1e-6; z += GRID_STEP) {
    positions.push(-width / 2, y, z, width / 2, y, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

export interface PlateProps {
  readonly size: readonly [number, number];
  readonly center: readonly [number, number];
}

/** The machine's base: a dark slab, a faint grid, light edges. */
export function Plate({ size, center }: PlateProps) {
  const [width, depth] = size;
  const body = useMemo(() => new BoxGeometry(width, THICKNESS, depth), [width, depth]);
  const material = useMemo(() => createBodyMaterial(scene.plate, true), []);
  const grid = useMemo(() => createGrid(width, depth), [width, depth]);

  useEffect(
    () => () => {
      body.dispose();
      material.dispose();
      grid.dispose();
    },
    [body, material, grid],
  );

  return (
    <group position={[center[0], 0, center[1]]}>
      <group position-y={-THICKNESS / 2}>
        <mesh geometry={body} material={material} raycast={noRaycast} />
        <Edges geometry={body} rest={PLATE_EDGES} />
      </group>
      <lineSegments geometry={grid} raycast={noRaycast}>
        <lineBasicMaterial color={scene.plateGrid} />
      </lineSegments>
    </group>
  );
}
