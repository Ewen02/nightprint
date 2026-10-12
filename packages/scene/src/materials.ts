import {
  abs,
  color,
  float,
  fract,
  fwidth,
  mix,
  mrt,
  normalFlat,
  normalWorld,
  positionWorld,
  smoothstep,
} from "three/tsl";
import { MeshBasicNodeMaterial, MeshLambertNodeMaterial, type Node } from "three/webgpu";
import { scene } from "./palette";

/**
 * Node materials of the scene. WebGPU-safe: built-in node materials and TSL only.
 *
 * Bloom is selective: the render pipeline blooms `colour × bloomIntensity`, an
 * extra render target every material writes through `mrtNode`. Only flow
 * colours ever get a non-zero intensity, so white edges and surfaces never glow.
 */

/** Sets how much a material feeds the bloom (0 = none). */
export function setBloom(material: { mrtNode: Node | null }, intensity: Node | number): void {
  material.mrtNode = mrt({
    bloomIntensity: typeof intensity === "number" ? float(intensity) : intensity,
  });
}

/** Pushes faces back a hair, so edges drawn on them never z-fight into dotted lines. */
const UNDER_EDGES = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 } as const;

/** Matte faceted body: three tones from the key light, no gradient across a face. */
export function createBodyMaterial(base: string, faceted: boolean): MeshLambertNodeMaterial {
  const material = new MeshLambertNodeMaterial({
    color: base,
    flatShading: faceted,
    ...UNDER_EDGES,
  });
  setBloom(material, 0);
  return material;
}

/**
 * The core, cut open: its top face is a section, hatched at 45° in the edge
 * colour, as on an assembly drawing. Lines are antialiased with `fwidth`.
 */
export function createSectionMaterial(base: string): MeshLambertNodeMaterial {
  const material = new MeshLambertNodeMaterial({ color: base, flatShading: true, ...UNDER_EDGES });
  const { density, width, opacity } = scene.hatch;
  // Lines along (1, 0, 0.268) project at 45° in the isometric view.
  const coordinate = positionWorld.z.sub(positionWorld.x.mul(0.268)).mul(density);
  const along = fract(coordinate);
  const aa = fwidth(coordinate);
  const line = float(1).sub(smoothstep(float(width).sub(aa), float(width).add(aa), along));
  const top = smoothstep(0.85, 0.95, normalWorld.y);
  material.colorNode = mix(color(base), color(scene.edge), line.mul(top).mul(opacity));
  setBloom(material, 0);
  return material;
}

/**
 * Fake glass, no transmission: a faint fill that thickens on faces seen edge-on.
 * It writes depth, pushed back a little, so the hidden-edge pass can tell which
 * glass edges are behind it.
 */
export function createGlassMaterial(): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial({
    color: scene.edge,
    transparent: true,
    depthWrite: true,
    ...UNDER_EDGES,
  });
  // Faceted: one normal per face, from screen derivatives, in view space.
  const grazing = float(1).sub(abs(normalFlat.z));
  material.opacityNode = float(scene.glassOpacity).add(
    grazing.mul(grazing).mul(scene.glassFresnel),
  );
  setBloom(material, 0);
  return material;
}
