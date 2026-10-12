import type { Part, Vec3 } from "@nightprint/engine";
import { BoxGeometry, type BufferGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createShapeGeometry } from "./geometry";

/**
 * The drawn model of a part, built from its kind, shape and socket. The machine
 * data stays abstract (a box, a prism); the scene turns it into the grammar of
 * the drawing: an adapter is a module with a plug facing its port, a port is a
 * socket set in the glass wall, the core sits on a plinth. Every adapter shares
 * one form factor, so a swap reads as unplugging one module and plugging another.
 */

/** Round details: enough sides that no facet crease reaches the edge threshold. */
const ROUND = 20;
const PLINTH = 0.05;
const LID = 0.025;
const RIB = 0.02;

function box(size: Vec3, at: Vec3): BufferGeometry {
  return new BoxGeometry(size[0], size[1], size[2]).translate(at[0], at[1], at[2]);
}

/** A short cylinder lying along x or z. */
function rod(radius: number, length: number, axis: "x" | "z", at: Vec3): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, length, ROUND);
  if (axis === "x") {
    geometry.rotateZ(Math.PI / 2);
  } else {
    geometry.rotateX(Math.PI / 2);
  }
  return geometry.translate(at[0], at[1], at[2]);
}

/** The face a socket is on: its dominant horizontal axis and direction. */
function socketSide(socket: Vec3): { readonly axis: "x" | "z"; readonly sign: 1 | -1 } {
  const axis = Math.abs(socket[0]) >= Math.abs(socket[2]) ? "x" : "z";
  const value = axis === "x" ? socket[0] : socket[2];
  return { axis, sign: value < 0 ? -1 : 1 };
}

/** Places a point given along the socket axis (`along`) and across it (`across`). */
function onAxis(axis: "x" | "z", along: number, y: number, across: number): Vec3 {
  return axis === "x" ? [along, y, across] : [across, y, along];
}

/** Swaps the x and z extents of a size when the socket faces z. */
function sized(axis: "x" | "z", alongSize: number, y: number, acrossSize: number): Vec3 {
  return axis === "x" ? [alongSize, y, acrossSize] : [acrossSize, y, alongSize];
}

function adapterPieces(size: Vec3, socket: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const { axis, sign } = socketSide(socket);
  const half = (axis === "x" ? w : d) / 2;
  const across = axis === "x" ? d : w;
  const along = axis === "x" ? w : d;
  const top = h / 2 + LID;
  const pieces = [
    // Plinth, chassis and the raised panel of the lid.
    box([w + 0.08, PLINTH, d + 0.08], [0, -h / 2 + PLINTH / 2, 0]),
    box([w, h - PLINTH, d], [0, PLINTH / 2, 0]),
    box([w - 0.22, LID, d - 0.22], [0, h / 2 + LID / 2, 0]),
  ];
  // Cooling ribs on the half of the lid away from the plug.
  for (const offset of [-0.16, 0, 0.16]) {
    pieces.push(
      box(
        sized(axis, along * 0.34, RIB, 0.04),
        onAxis(axis, -sign * along * 0.18, top + RIB / 2, offset * across),
      ),
    );
  }
  // The plug: a flange on the socket face and the connector the pipe leaves from.
  pieces.push(
    box(sized(axis, 0.03, 0.26, 0.34), onAxis(axis, sign * (half + 0.015), socket[1], 0)),
    rod(0.07, 0.14, axis, onAxis(axis, sign * (half + 0.1), socket[1], 0)),
  );
  return pieces;
}

function portPieces(size: Vec3, socket: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const { axis, sign } = socketSide(socket);
  const half = (axis === "x" ? w : d) / 2;
  const across = axis === "x" ? d : w;
  return [
    box(size, [0, 0, 0]),
    // The plate the socket is set in, flush with the glass wall (the part's own centre).
    box(sized(axis, 0.025, h + 0.12, across + 0.12), [0, 0, 0]),
    // The receptacle on the outer face, where a route plugs in.
    rod(0.085, 0.05, axis, onAxis(axis, sign * (half + 0.025), socket[1], 0)),
  ];
}

/** What the drawn model depends on: not the position, so a moved part keeps its geometry. */
export type PartModelSpec = Pick<Part, "kind" | "shape" | "socket">;

function corePieces(part: PartModelSpec): BufferGeometry[] {
  const body = createShapeGeometry(part.shape);
  if (part.shape.type !== "prism") {
    return [body];
  }
  const { radius, height, sides } = part.shape;
  return [
    body,
    new CylinderGeometry(radius + 0.08, radius + 0.08, PLINTH, sides).translate(
      0,
      -height / 2 + PLINTH / 2,
      0,
    ),
  ];
}

/** A patch panel: the console that plugs adapters in, with a row of sockets on top. */
function configuratorPieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const top = h / 2 + LID;
  const pieces = [
    box([w + 0.08, PLINTH, d + 0.08], [0, -h / 2 + PLINTH / 2, 0]),
    box([w, h - PLINTH, d], [0, PLINTH / 2, 0]),
    box([w - 0.2, LID, d - 0.2], [0, h / 2 + LID / 2, 0]),
  ];
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    pieces.push(new CylinderGeometry(0.07, 0.07, 0.05, ROUND).translate(x * w, top + 0.025, 0));
  }
  return pieces;
}

function pieces(part: PartModelSpec): BufferGeometry[] {
  if (part.kind === "configurator" && part.shape.type === "box") {
    return configuratorPieces(part.shape.size);
  }
  if (part.kind === "adapter" && part.shape.type === "box") {
    return adapterPieces(part.shape.size, part.socket);
  }
  if (part.kind === "port" && part.shape.type === "box") {
    return portPieces(part.shape.size, part.socket);
  }
  if (part.kind === "core") {
    return corePieces(part);
  }
  return [createShapeGeometry(part.shape)];
}

/** One geometry per part: its pieces merged, for one mesh and one set of edges. */
export function createPartGeometry(part: PartModelSpec): BufferGeometry {
  const parts = pieces(part);
  if (parts.length === 1 && parts[0]) {
    return parts[0];
  }
  const merged = mergeGeometries(parts);
  for (const piece of parts) {
    piece.dispose();
  }
  return merged;
}

/** Highest point of a part's model above its centre, for its balloon. */
export function partTop(geometry: BufferGeometry): number {
  geometry.computeBoundingBox();
  return geometry.boundingBox?.max.y ?? 0;
}
