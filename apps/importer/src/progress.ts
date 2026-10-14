import type { Survey } from "@nightprint/blueprint";

/**
 * What a drawing tells its visitor while it runs, as it happens: the facts the survey finds,
 * then the drafter's answers, part by part. Nothing here is staged: every event is something
 * the server has just done or read.
 */

/** The survey, sized to be drawn as a sketch on the page: units, imports, libraries. */
export interface Sketch {
  readonly units: readonly {
    readonly id: string;
    readonly path: string;
    readonly files: number;
    /** Pages, endpoints and commands found in it. */
    readonly entries: number;
  }[];
  readonly edges: readonly { readonly from: string; readonly to: string; readonly files: number }[];
  /** The libraries most units use, the first few. */
  readonly libraries: readonly {
    readonly name: string;
    readonly category: string;
    readonly units: number;
  }[];
}

export type ProgressEvent =
  /** The tree is listed: this many source files to read. */
  | { readonly type: "listed"; readonly files: number }
  | { readonly type: "surveyed"; readonly sketch: Sketch }
  /** The drafter starts answer `answer` (1 to 3). */
  | { readonly type: "answer"; readonly answer: number }
  /** A part the drafter has written whole, while its answer still streams. */
  | {
      readonly type: "part";
      readonly answer: number;
      readonly label: string;
      readonly kind: string;
      readonly units: readonly string[];
    }
  /** What the drafter weighs while it thinks: a sentence of its reasoning summary. */
  | { readonly type: "musing"; readonly answer: number; readonly text: string }
  /** Answer `answer` broke these rules and went back to the drafter. */
  | { readonly type: "rejected"; readonly answer: number; readonly issues: readonly string[] }
  /** Answer `answer` kept every rule. */
  | { readonly type: "accepted"; readonly answer: number };

const LIBRARIES_SHOWN = 12;

export function sketchOf(survey: Survey): Sketch {
  const libraries = new Map<string, { category: string; units: number }>();
  for (const unit of survey.units) {
    for (const external of unit.externals) {
      const seen = libraries.get(external.name);
      libraries.set(external.name, {
        category: external.category,
        units: (seen?.units ?? 0) + 1,
      });
    }
  }
  return {
    units: survey.units.map((u) => ({
      id: u.id,
      path: u.path,
      files: u.files.length,
      entries: u.entries.length,
    })),
    edges: survey.edges.map((e) => ({ from: e.from, to: e.to, files: e.files })),
    libraries: [...libraries.entries()]
      .map(([name, l]) => ({ name, ...l }))
      .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name))
      .slice(0, LIBRARIES_SHOWN),
  };
}
