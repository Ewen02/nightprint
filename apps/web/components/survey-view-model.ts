import type { FieldNote, SketchBox, SketchLine } from "@nightprint/ui";

/**
 * The import page while a repository is drawn: the importer's events turned into the
 * surveyor's notes and the pencil sketch. Every note and every line stands for something the
 * server did or found; only the pace of the drawing is the page's.
 */

/** The survey as the importer sends it. */
export interface SketchData {
  readonly units: readonly {
    readonly id: string;
    readonly path: string;
    readonly files: number;
    readonly entries: number;
  }[];
  readonly edges: readonly { readonly from: string; readonly to: string; readonly files: number }[];
  readonly libraries: readonly {
    readonly name: string;
    readonly category: string;
    readonly units: number;
  }[];
}

/** One of the importer's events, with when it happened: ms since its job started. */
export type DrawingEvent = { readonly at: number } & (
  | { readonly type: "listed"; readonly files: number }
  | { readonly type: "surveyed"; readonly sketch: SketchData }
  | { readonly type: "answer"; readonly answer: number }
  | {
      readonly type: "part";
      readonly answer: number;
      readonly label: string;
      readonly kind: string;
      readonly units: readonly string[];
    }
  | { readonly type: "musing"; readonly answer: number; readonly text: string }
  | { readonly type: "rejected"; readonly answer: number; readonly issues: readonly string[] }
  | { readonly type: "accepted"; readonly answer: number }
);

export interface JobProgress {
  readonly events: readonly DrawingEvent[];
  readonly reading?: { readonly done: number; readonly total: number } | undefined;
}

/** A part as the sketch closes in on it: its name and the units it stands for. */
export interface SketchPart {
  readonly label: string;
  readonly units: readonly string[];
}

/** "01:07". */
export function clock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const LABEL_CHARS = 22;

/** A unit as a developer would name it: "packages/ui/src/atoms" → "ui/atoms". */
export function shortPath(path: string): string {
  if (path === ".") {
    return "root";
  }
  const segments = path.split("/").filter((s) => s !== "src");
  const named =
    segments.length > 1 && (segments[0] === "packages" || segments[0] === "apps")
      ? segments.slice(1)
      : segments;
  const label = named.join("/");
  return label.length > LABEL_CHARS ? `…${label.slice(-(LABEL_CHARS - 1))}` : label;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** The parts of the answer the drafter is on: an answer that went back no longer counts. */
export function currentParts(events: readonly DrawingEvent[]): SketchPart[] {
  let answer = 0;
  for (const event of events) {
    if (event.type === "answer") {
      answer = event.answer;
    }
  }
  return events.flatMap((e) =>
    e.type === "part" && e.answer === answer ? [{ label: e.label, units: e.units }] : [],
  );
}

/**
 * The surveyor's notes: the request, what the tree holds, the files read, the survey, then
 * each answer of the drafter and the parts it names. `finished` adds the last line.
 */
export function fieldNotes(
  repo: string,
  progress: JobProgress | undefined,
  finished: boolean,
): FieldNote[] {
  const notes: FieldNote[] = [
    { key: "asked", time: clock(0), text: `Asked GitHub for ${repo}.`, tone: "request" },
  ];
  const events = progress?.events ?? [];
  const surveyed = events.some((e) => e.type === "surveyed");
  const units = new Map<string, string>();
  // What the drafter weighs: one live line per answer, its latest sentence.
  const musings = new Map<number, { at: number; text: string }>();
  for (const event of events) {
    if (event.type === "musing") {
      musings.set(event.answer, { at: event.at, text: event.text });
    }
  }
  for (const event of events) {
    const time = clock(event.at);
    switch (event.type) {
      case "listed": {
        notes.push({
          key: "listed",
          time,
          text: `Listed the tree: ${plural(event.files, "JavaScript or TypeScript file")} to read.`,
          tone: "request",
        });
        const reading = progress?.reading;
        notes.push(
          surveyed || (reading && reading.done === reading.total)
            ? { key: "read", time, text: `Read ${plural(event.files, "file")}.`, tone: "request" }
            : {
                key: "read",
                time,
                text: `Reading the files: ${reading?.done ?? 0} of ${event.files}.`,
                tone: "muted",
              },
        );
        break;
      }
      case "surveyed": {
        for (const unit of event.sketch.units) {
          units.set(unit.id, shortPath(unit.path));
        }
        const ways = event.sketch.units.reduce((sum, u) => sum + u.entries, 0);
        const libraries = event.sketch.libraries.slice(0, 4);
        notes.push({
          key: "surveyed",
          time,
          text: `Surveyed ${plural(event.sketch.units.length, "unit")} and ${plural(event.sketch.edges.length, "import")} between them.`,
          tone: "request",
          details: [
            ...(ways > 0 ? [`Ways in: ${ways} (pages, endpoints, commands)`] : []),
            ...(libraries.length > 0
              ? [`Libraries: ${libraries.map((l) => `${l.name} (${l.category})`).join(", ")}`]
              : []),
          ],
        });
        break;
      }
      case "answer":
        notes.push({
          key: `answer-${event.answer}`,
          time,
          text:
            event.answer === 1
              ? `The drafter is grouping ${plural(units.size, "unit")} into parts.`
              : `The drafter tries again: answer ${event.answer} of 3.`,
          tone: "muted",
        });
        {
          const musing = musings.get(event.answer);
          if (musing) {
            notes.push({
              key: `musing-${event.answer}`,
              time: clock(musing.at),
              text: `“${musing.text}”`,
              tone: "muted",
            });
          }
        }
        break;
      case "musing":
        break;
      case "part":
        notes.push({
          key: `part-${event.answer}-${event.label}`,
          time,
          text: `Part: ${event.label}.`,
          tone: "write",
          ...(event.units.length > 0
            ? { details: [event.units.map((id) => units.get(id) ?? id).join(", ")] }
            : {}),
        });
        break;
      case "rejected":
        notes.push({
          key: `rejected-${event.answer}`,
          time,
          text: `Answer ${event.answer} went back: ${plural(event.issues.length, "rule")} broken.`,
          tone: "error",
          details: event.issues.slice(0, 3),
        });
        break;
      case "accepted":
        notes.push({
          key: "accepted",
          time,
          text: `Answer ${event.answer} keeps every rule: each route stands on an import.`,
          tone: "response",
        });
        break;
    }
  }
  if (finished) {
    const last = events.at(-1);
    notes.push({
      key: "laid-out",
      time: clock(last?.at ?? 0),
      text: "Laid out on the plate.",
      tone: "response",
    });
  }
  return notes;
}

const BOX_W = 150;
const BOX_H = 26;
const COLUMN_GAP = 64;
const ROW_GAP = 8;
/** Between two packages in one column. */
const PACKAGE_GAP = 18;
const PAD = 22;
/** A column holds at most this many units before it splits in two. */
const COLUMN_ROWS = 12;
/** The whole sketch draws in about this long, however many units it has. */
const BOXES_MS = 1600;
const LINES_MS = 1600;

/** The package a unit belongs to: "apps/web/components" → "apps/web", "lib/db" → "lib". */
function packageOf(path: string): string {
  if (path === ".") {
    return ".";
  }
  const segments = path.split("/");
  return segments.length > 1 && (segments[0] === "apps" || segments[0] === "packages")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? path);
}

/** Each package's column: how deep it sits in the imports, callers left, what they use right. */
function packageDepths(
  packages: readonly string[],
  edges: readonly [string, string][],
): Map<string, number> {
  const depth = new Map(packages.map((p) => [p, 0]));
  // Longest path from the packages nothing imports; a cycle stops growing after one pass each.
  for (let pass = 0; pass < packages.length; pass++) {
    let moved = false;
    for (const [from, to] of edges) {
      const a = depth.get(from);
      const b = depth.get(to);
      if (a !== undefined && b !== undefined && b < a + 1) {
        depth.set(to, a + 1);
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
  return depth;
}

export interface SketchLayout {
  readonly width: number;
  readonly height: number;
  readonly boxes: readonly SketchBox[];
  readonly lines: readonly SketchLine[];
}

/**
 * The sketch: a column per package, ordered by its imports, its units stacked in it; imports
 * as pencil curves; each unit renamed after the part the drafter puts it in; and, when
 * `closing` names the final parts, each unit's way to its part.
 */
export function sketchLayout(
  sketch: SketchData,
  parts: readonly SketchPart[],
  closing?: readonly SketchPart[],
): SketchLayout {
  const unitPackage = new Map(sketch.units.map((u) => [u.id, packageOf(u.path)]));
  const packages = [...new Set(unitPackage.values())].sort();
  const packageEdges = sketch.edges.flatMap((e): [string, string][] => {
    const a = unitPackage.get(e.from);
    const b = unitPackage.get(e.to);
    return a && b && a !== b ? [[a, b]] : [];
  });
  const depth = packageDepths(packages, packageEdges);

  // Columns of packages, split when one runs too tall.
  const byDepth = new Map<number, string[]>();
  for (const pkg of packages) {
    const d = depth.get(pkg) ?? 0;
    byDepth.set(d, [...(byDepth.get(d) ?? []), pkg]);
  }
  const unitsOf = (pkg: string) =>
    sketch.units
      .filter((u) => unitPackage.get(u.id) === pkg)
      .sort((a, b) => a.path.localeCompare(b.path));
  const columns: string[][] = [];
  for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
    let column: string[] = [];
    let rows = 0;
    for (const pkg of byDepth.get(d) ?? []) {
      const size = unitsOf(pkg).length;
      if (column.length > 0 && rows + size > COLUMN_ROWS) {
        columns.push(column);
        column = [];
        rows = 0;
      }
      column.push(pkg);
      rows += size;
    }
    columns.push(column);
  }

  const columnHeight = (column: readonly string[]) =>
    column.reduce((h, pkg) => h + unitsOf(pkg).length * (BOX_H + ROW_GAP) - ROW_GAP, 0) +
    Math.max(0, column.length - 1) * PACKAGE_GAP;
  const inner = Math.max(BOX_H, ...columns.map(columnHeight));
  const width = PAD * 2 + columns.length * BOX_W + Math.max(0, columns.length - 1) * COLUMN_GAP;
  const height = PAD * 2 + inner;

  const place = new Map<string, { x: number; y: number }>();
  const order: string[] = [];
  columns.forEach((column, c) => {
    let y = PAD + (inner - columnHeight(column)) / 2;
    for (const pkg of column) {
      for (const unit of unitsOf(pkg)) {
        place.set(unit.id, { x: PAD + c * (BOX_W + COLUMN_GAP), y });
        order.push(unit.id);
        y += BOX_H + ROW_GAP;
      }
      y += PACKAGE_GAP - ROW_GAP;
    }
  });

  const partOf = new Map<string, number>();
  parts.forEach((part, index) => {
    for (const unit of part.units) {
      partOf.set(unit, index);
    }
  });
  const latest = parts.length - 1;
  const finalPart = new Map<string, number>();
  closing?.forEach((part, index) => {
    for (const unit of part.units) {
      finalPart.set(unit, index);
    }
  });
  const centres =
    closing?.map((part) => {
      const spots = part.units.flatMap((id) => place.get(id) ?? []);
      return spots.length === 0
        ? undefined
        : {
            x: spots.reduce((s, p) => s + p.x, 0) / spots.length + BOX_W / 2,
            y: spots.reduce((s, p) => s + p.y, 0) / spots.length + BOX_H / 2,
          };
    }) ?? [];

  const boxStep = Math.min(40, BOXES_MS / Math.max(1, order.length));
  const boxes: SketchBox[] = order.map((id, i) => {
    const spot = place.get(id) ?? { x: 0, y: 0 };
    const unit = sketch.units.find((u) => u.id === id);
    const index = partOf.get(id);
    const final = finalPart.get(id);
    const state: SketchBox["state"] =
      closing && final === undefined
        ? "dropped"
        : index === undefined
          ? "found"
          : index === latest && !closing
            ? "latest"
            : "grouped";
    return {
      id,
      ...spot,
      width: BOX_W,
      height: BOX_H,
      label: shortPath(unit?.path ?? id),
      part: index === undefined ? undefined : parts[index]?.label,
      state,
      to: final === undefined ? undefined : centres[final],
      delay: Math.round(i * boxStep),
    };
  });

  const lineStep = Math.min(30, LINES_MS / Math.max(1, sketch.edges.length));
  const linesFrom = order.length * boxStep + 200;
  const lines: SketchLine[] = sketch.edges.flatMap((edge, i) => {
    const a = place.get(edge.from);
    const b = place.get(edge.to);
    if (!a || !b) {
      return [];
    }
    const y1 = a.y + BOX_H / 2;
    const y2 = b.y + BOX_H / 2;
    let d: string;
    if (b.x > a.x) {
      const x1 = a.x + BOX_W;
      const x2 = b.x;
      const bend = (x2 - x1) / 2;
      d = `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`;
    } else {
      // Back to an earlier or the same column: around the right of both boxes.
      const x1 = a.x + BOX_W;
      const x2 = b.x + BOX_W;
      const out = Math.max(x1, x2) + 28;
      d = `M${x1},${y1} C${out},${y1} ${out},${y2} ${x2},${y2}`;
    }
    const grouped = partOf.has(edge.from) && partOf.has(edge.to);
    return [
      {
        id: `${edge.from}>${edge.to}`,
        d,
        state: grouped ? "grouped" : "found",
        delay: Math.round(linesFrom + i * lineStep),
      },
    ];
  });

  return { width, height, boxes, lines };
}
