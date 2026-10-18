import type { Part, Vec3 } from "@nightprint/engine";
import { BoxGeometry, type BufferGeometry, CylinderGeometry, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createShapeGeometry } from "./geometry";

/**
 * The drawn model of a part, built from its kind, shape and socket. The machine
 * data stays abstract (a box, a prism); the scene turns it into the grammar of
 * the drawing: an adapter is a module with a plug facing its port, a port is a
 * socket set in the glass wall, the core sits on a plinth, an actor is a terminal, a
 * module of a project's code a stepped block, a store a stack of disks or frames. Every
 * adapter shares one form factor, so a swap reads as unplugging one module and plugging
 * another. A store with a `form` is drawn as what it holds: an index of vectors, a model's
 * memory, a knowledge graph.
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
export type PartModelSpec = Pick<Part, "kind" | "shape" | "socket" | "form">;

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

/** A conveyor tray: a base, two rails, and dividers marking the places items wait in. */
function queuePieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const along = w >= d ? "x" : "z";
  const length = Math.max(w, d);
  const width = Math.min(w, d);
  const base = h * 0.45;
  const rail = 0.06;
  const pieces = [
    box([w, base, d], [0, -h / 2 + base / 2, 0]),
    box(sized(along, length, h - base, rail), onAxis(along, 0, base / 2, width / 2 - rail / 2)),
    box(sized(along, length, h - base, rail), onAxis(along, 0, base / 2, -(width / 2 - rail / 2))),
  ];
  const slots = Math.max(2, Math.round(length / 0.5));
  for (let i = 1; i < slots; i++) {
    const at = -length / 2 + (i * length) / slots;
    pieces.push(
      box(
        sized(along, 0.025, (h - base) * 0.6, width - rail * 2),
        onAxis(along, at, -h / 2 + base + (h - base) * 0.3, 0),
      ),
    );
  }
  return pieces;
}

/** A stack of frames: slabs piled with a gap between them, the top one set slightly in. */
function stackPieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const frames = 4;
  const gap = 0.05;
  const slab = (h - gap * (frames - 1)) / frames;
  return Array.from({ length: frames }, (_, i) => {
    const inset = i === frames - 1 ? 0.08 : 0;
    return box([w - inset, slab, d - inset], [0, -h / 2 + slab / 2 + i * (slab + gap), 0]);
  });
}

/** How far a terminal's screen leans back, in radians. */
const SCREEN_LEAN = 0.32;

/**
 * Someone or something outside the code: a terminal, a low desk on a plinth and a screen
 * leaning back from its rear edge, facing the plate's front.
 */
function terminalPieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const desk = h * 0.42;
  const tall = h * 0.85;
  const thick = 0.06;
  const screen = new BoxGeometry(w * 0.84, tall, thick)
    .rotateX(-SCREEN_LEAN)
    .translate(0, -h / 2 + desk + (tall / 2) * Math.cos(SCREEN_LEAN), -d / 2 + 0.22);
  return [
    box([w + 0.08, PLINTH, d + 0.08], [0, -h / 2 + PLINTH / 2, 0]),
    box([w, desk - PLINTH, d], [0, -h / 2 + PLINTH + (desk - PLINTH) / 2, 0]),
    screen,
  ];
}

/**
 * A unit of a project's own code: a block in two steps, its rear half raised, with
 * vents along the raised top, so a row of modules reads as a skyline, not a row of crates.
 */
function modulePieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const low = h * 0.6;
  const rear = d * 0.52;
  const top = h / 2;
  const pieces = [
    box([w + 0.08, PLINTH, d + 0.08], [0, -h / 2 + PLINTH / 2, 0]),
    box([w, low - PLINTH, d], [0, -h / 2 + PLINTH + (low - PLINTH) / 2, 0]),
    box([w, h - low, rear], [0, -h / 2 + low + (h - low) / 2, -d / 2 + rear / 2]),
  ];
  for (const x of [-0.25, 0, 0.25]) {
    pieces.push(box([w * 0.16, RIB, rear * 0.62], [x * w, top + RIB / 2, -d / 2 + rear / 2]));
  }
  return pieces;
}

/** A store drawn as the database it is: disks stacked with a gap between them. */
function diskPieces(radius: number, height: number): BufferGeometry[] {
  const disks = 3;
  const gap = 0.05;
  const disk = (height - gap * (disks - 1)) / disks;
  return Array.from({ length: disks }, (_, i) =>
    new CylinderGeometry(radius, radius, disk, ROUND * 2).translate(
      0,
      -height / 2 + disk / 2 + i * (disk + gap),
      0,
    ),
  );
}

/** Uneven heights for a grid's bars, read row by row: numbers side by side, not a pattern. */
const BARS = [0.9, 0.45, 0.7, 0.35, 0.55, 1, 0.4, 0.8, 0.5, 0.75, 0.3, 0.95];

/** An index of vectors: a slab carrying rows of bars of uneven height, numbers side by side. */
function gridPieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const base = h * 0.3;
  const columns = 4;
  const rows = 3;
  const pitchX = w / columns;
  const pitchZ = d / rows;
  const pieces = [box([w, base, d], [0, -h / 2 + base / 2, 0])];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const tall = (h - base) * (BARS[row * columns + column] ?? 1);
      pieces.push(
        box(
          [pitchX * 0.55, tall, pitchZ * 0.55],
          [
            -w / 2 + pitchX * (column + 0.5),
            -h / 2 + base + tall / 2,
            -d / 2 + pitchZ * (row + 0.5),
          ],
        ),
      );
    }
  }
  return pieces;
}

/**
 * A model's memory: a board standing on a plinth, a row of chips on its front face and
 * its contacts along the bottom, like the module it is kept in.
 */
function memoryPieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const board = 0.12;
  const tall = h - PLINTH;
  const front = board / 2;
  const pieces = [
    box([w, PLINTH, d], [0, -h / 2 + PLINTH / 2, 0]),
    box([w * 0.92, tall, board], [0, -h / 2 + PLINTH + tall / 2, 0]),
  ];
  for (const x of [-0.33, -0.11, 0.11, 0.33]) {
    pieces.push(
      box([w * 0.17, tall * 0.42, 0.05], [x * w, -h / 2 + PLINTH + tall * 0.58, front + 0.025]),
    );
  }
  // The contacts: one strip along the bottom of the front face.
  pieces.push(box([w * 0.8, tall * 0.12, 0.03], [0, -h / 2 + PLINTH + tall * 0.12, front + 0.015]));
  return pieces;
}

/** A link of a graph: a thin rod from `a` to `b`. */
function link(a: Vec3, b: Vec3): BufferGeometry {
  const from = new Vector3(...a);
  const along = new Vector3(...b).sub(from);
  const rod = new CylinderGeometry(0.035, 0.035, along.length(), 8);
  rod.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), along.clone().normalize()),
  );
  const middle = from.addScaledVector(along, 0.5);
  return rod.translate(middle.x, middle.y, middle.z);
}

/**
 * Where a graph's nodes sit, as shares of the footprint (x, z) and of the height above the
 * base (y), and which pairs are linked: the facts and the relations between them.
 */
const NODES: readonly Vec3[] = [
  [-0.34, 0.1, -0.22],
  [-0.02, 0.65, -0.3],
  [0.32, 0.3, -0.05],
  [-0.12, 0.35, 0.28],
  [0.26, 0.9, 0.3],
];
const LINKS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [3, 2],
  [2, 4],
  [3, 4],
];

/** A knowledge graph: nodes held at different heights over a base, linked by rods. */
function graphPieces(size: Vec3): BufferGeometry[] {
  const [w, h, d] = size;
  const base = h * 0.15;
  const node = 0.14;
  const room = h - base - node;
  const at = NODES.map(([x, y, z]): Vec3 => [x * w, -h / 2 + base + node / 2 + y * room, z * d]);
  const pieces = [box([w, base, d], [0, -h / 2 + base / 2, 0])];
  for (const point of at) {
    pieces.push(new CylinderGeometry(0.15, 0.15, node, ROUND).translate(...point));
  }
  for (const [a, b] of LINKS) {
    const from = at[a];
    const to = at[b];
    if (from && to) {
      pieces.push(link(from, to));
    }
  }
  return pieces;
}

function pieces(part: PartModelSpec): BufferGeometry[] {
  if (part.form && part.shape.type === "box") {
    const forms = { grid: gridPieces, memory: memoryPieces, graph: graphPieces };
    return forms[part.form](part.shape.size);
  }
  if (part.kind === "queue" && part.shape.type === "box") {
    return queuePieces(part.shape.size);
  }
  if (part.kind === "store" && part.shape.type === "box") {
    return stackPieces(part.shape.size);
  }
  if (part.kind === "store" && part.shape.type === "cylinder") {
    return diskPieces(part.shape.radius, part.shape.height);
  }
  if (part.kind === "actor" && part.shape.type === "box") {
    return terminalPieces(part.shape.size);
  }
  if (part.kind === "module" && part.shape.type === "box") {
    return modulePieces(part.shape.size);
  }
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
