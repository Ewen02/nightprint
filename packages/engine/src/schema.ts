import { z } from "zod";

/**
 * The machine definition format. A machine is data: parts, routes
 * between them, scenarios made of steps, and "what if…" actions that
 * patch the machine. The engine never imports React or three.
 */

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case");

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]).readonly();
export type Vec3 = readonly [number, number, number];

/** The four flows of the visual grammar. */
export const flows = ["request", "write", "response", "error"] as const;
export const flowSchema = z.enum(flows);
export type Flow = z.infer<typeof flowSchema>;

export const shapeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("box"), size: vec3Schema }),
  z.object({
    type: z.literal("prism"),
    sides: z.number().int().min(3).max(12),
    radius: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    type: z.literal("cylinder"),
    radius: z.number().positive(),
    height: z.number().positive(),
  }),
]);
export type Shape = z.infer<typeof shapeSchema>;

export const partKinds = [
  "core",
  "port",
  "adapter",
  "store",
  "queue",
  "actor",
  "boundary",
  /** Builds the application at startup: creates the adapters and plugs them into ports. */
  "configurator",
  /** A unit of a real project's own code (a package, a folder) that is no port or adapter. */
  "module",
] as const;

export const partSchema = z.object({
  id,
  /** Bill-of-parts number, also the balloon label. Parts without one stay out of the list. */
  ref: z.number().int().positive().optional(),
  label: z.string().min(1),
  /** Short role shown in the bill of parts ("DRIVING PORT", "DRIVEN"). */
  role: z.string().min(1).max(12).optional(),
  kind: z.enum(partKinds),
  shape: shapeSchema,
  /** Centre of the shape, y up, plate top at y = 0. */
  position: vec3Schema,
  rotationY: z.number().default(0),
  /** Where routes attach, relative to `position`. */
  socket: vec3Schema.default([0, 0, 0]),
  material: z.enum(["solid", "glass"]).default("solid"),
  flag: z.enum(["violation"]).optional(),
  description: z.string().optional(),
});
export type Part = z.infer<typeof partSchema>;

export const routeSchema = z.object({
  id,
  from: id,
  to: id,
  /** Waypoints between the two sockets. */
  via: z.array(vec3Schema).default([]),
  /** `pipe` is drawn; `internal` is a path inside a part, never drawn. */
  /**
   * `pipe` is drawn and carries tokens; `internal` is a path inside a part, never
   * drawn; `wire` is drawn dashed and carries nothing: configuration, not traffic.
   */
  kind: z.enum(["pipe", "internal", "wire"]).default("pipe"),
  flag: z.enum(["violation"]).optional(),
  /** Simulated duration of the trip, shown as a dimension and in the log. */
  latencyMs: z.number().nonnegative().default(0),
  /**
   * Which end the other one depends on, in source code, drawn as an arrowhead at
   * that end. `to`: the `from` part knows the `to` part (a driving adapter calls
   * its port). `from`: the other way round (a driven adapter implements the port
   * that calls it). Data flow and dependency need not agree: that is the point.
   */
  dependsOn: z.enum(["from", "to"]).optional(),
});
export type Route = z.infer<typeof routeSchema>;

/** A named region of the plate, outlined and labelled on the drawing. */
export const zoneSchema = z.object({
  id,
  /** "Driving side". */
  label: z.string().min(1).max(24),
  /** One line under the name: "Uses the application". */
  note: z.string().min(1).max(40).optional(),
  /** Opposite corners on the plate, as [x, z]. */
  from: z.tuple([z.number(), z.number()]).readonly(),
  to: z.tuple([z.number(), z.number()]).readonly(),
  /** `round`: the circle inscribed between the corners, for a hub's rings. */
  shape: z.enum(["rect", "round"]).default("rect"),
});
export type Zone = z.infer<typeof zoneSchema>;

/** What a token stands for, written on it: the callback "B". */
const tokenLabel = z.string().min(1).max(3).optional();

export const travelSchema = z.object({
  flow: flowSchema,
  label: tokenLabel,
  /** Routes travelled in order; their polylines are chained. */
  path: z.array(id).min(1),
  reverse: z.boolean().default(false),
});

export const holdSchema = z.object({
  flow: flowSchema,
  label: tokenLabel,
  /** The token waits on this part for the whole step. */
  at: id,
});

export const tokenSchema = z.union([travelSchema, holdSchema]);
export type TokenSpec = z.infer<typeof tokenSchema>;

/** A step or nothing is kept depending on the active actions. */
export const conditionSchema = z.object({
  all: z.array(id).default([]),
  none: z.array(id).default([]),
});
export type Condition = z.infer<typeof conditionSchema>;

export const logLineSchema = z.object({
  flow: flowSchema,
  text: z.string().min(1),
  /** Overrides the flow tag ("RULE" instead of "REQ"). */
  tag: z.string().min(1).max(6).optional(),
});
export type LogLine = z.infer<typeof logLineSchema>;

export const stepSchema = z.object({
  id,
  title: z.string().min(1),
  body: z.string().min(1),
  /**
   * The step in one short sentence, shown first under its title; the body waits a click.
   * For a step that tells several things at once (a bench's three lanes).
   */
  lead: z.string().min(1).max(120).optional(),
  /** How long the step's tokens travel. Same default as the `motion.step` token. */
  durationMs: z.number().int().positive().default(1400),
  /**
   * Simulated time the step itself takes, on top of its routes' latencies: code that
   * keeps a thread busy (a 200 ms loop), or the wait for a frame to be due. Added to the
   * log's clock, never to the playback.
   */
  takesMs: z.number().nonnegative().default(0),
  /** Parts lit during the step. */
  focus: z.array(id).default([]),
  tokens: z.array(tokenSchema).default([]),
  log: z.array(logLineSchema).default([]),
  /** The line of the machine's listing that runs in this step, by its id. */
  line: id.optional(),
  /** What the program prints in this step: the console reads them in order. */
  output: z.array(z.string().min(1)).default([]),
  /** What a part is doing during the step, by part id: "Microtasks" on the event loop. */
  states: z.record(id, z.string().min(1).max(28)).default({}),
  /** The machine's meter during the step, in its unit: the load on the database. */
  meter: z.number().nonnegative().optional(),
  when: conditionSchema.optional(),
});
export type Step = z.infer<typeof stepSchema>;

export const scenarioSchema = z.object({
  id,
  title: z.string().min(1),
  steps: z.array(stepSchema).min(1),
});
export type Scenario = z.infer<typeof scenarioSchema>;

/** A line of the program a machine runs, named so steps and switches can point at it. */
export const listingLineSchema = z.object({ id, text: z.string() });
export type ListingLine = z.infer<typeof listingLineSchema>;

export const effectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("patchPart"),
    part: id,
    set: partSchema.pick({ position: true, rotationY: true, role: true, flag: true }).partial(),
  }),
  z.object({ type: z.literal("addRoute"), route: routeSchema }),
  z.object({ type: z.literal("removeRoute"), route: id }),
  /** The switch changes a line of the program. */
  z.object({ type: z.literal("setLine"), line: id, text: z.string() }),
  /** The switch adds a line to the program, after another one. */
  z.object({ type: z.literal("addLine"), after: id, line: listingLineSchema }),
]);
export type Effect = z.infer<typeof effectSchema>;

export const actionSchema = z.object({
  id,
  /** Named like a test case: "Swap Postgres for InMemory". */
  label: z.string().min(1),
  description: z.string().min(1),
  /** None when the action only changes which steps play (`when` on the steps). */
  effects: z.array(effectSchema).default([]),
});
export type Action = z.infer<typeof actionSchema>;

export const machineSchema = z.object({
  /**
   * The series and the sheet's number. Concepts: `MCH-` a machine, `BEN-` a bench (several
   * machines run side by side on the same input), `FMD-` a failure mode (the switches
   * repair), `PRT-` a protocol (an exchange in time between parties). `PRJ-` a real
   * project drawn from its repository.
   */
  code: z.string().regex(/^(MCH|BEN|FMD|PRT|PRJ)-\d{3}$/),
  slug: id,
  title: z.string().min(1),
  /**
   * Other names of the concept, as written mid-sentence ("ports and adapters"). The
   * page title and the structured data carry them, so a search under either name finds it.
   */
  aliases: z.array(z.string().min(1)).default([]),
  summary: z.string().min(1),
  family: z.enum(["backend", "infra", "frontend", "mobile", "ai"]),
  category: z.string().min(1),
  /**
   * What each flow colour means in this machine, for its legend. A flow left out reads
   * as a request, a write, a response or an error.
   */
  flowLabels: z
    .object({
      request: z.string().min(1).max(16),
      write: z.string().min(1).max(16),
      response: z.string().min(1).max(16),
      error: z.string().min(1).max(16),
    })
    .partial()
    .default({}),
  /** Cartouche scale, e.g. "1 : 1 ms". */
  scale: z.string().min(1),
  revision: z.string().min(1),
  /**
   * The day the current revision was drawn, as YYYY-MM-DD. Bump it with `revision`:
   * it is the page's visible date, its `dateModified` and its sitemap `lastmod`.
   */
  revised: z.iso.date(),
  sources: z.array(z.object({ label: z.string().min(1), url: z.url() })).min(1),
  /** The concept in five paragraphs at most. */
  article: z.array(z.string().min(1)).min(1).max(5),
  /**
   * The words a visitor needs to read the drawing, each with the parts it names,
   * shown beside the article like the notes of a drawing.
   */
  glossary: z
    .array(
      z.object({
        term: z.string().min(1).max(24),
        definition: z.string().min(1).max(200),
        /** Parts the term names, by id: shown as their balloons. */
        parts: z.array(id).default([]),
      }),
    )
    .max(8)
    .default([]),
  /**
   * The program the scenarios run, shown beside the stage with each step's line lit.
   * Switches may change or add lines: the listing shown is the one they leave.
   */
  listing: z.array(listingLineSchema).max(20).default([]),
  stage: z.object({
    plate: z.object({
      size: z.tuple([z.number().positive(), z.number().positive()]),
      center: z.tuple([z.number(), z.number()]).default([0, 0]),
    }),
    zones: z.array(zoneSchema).default([]),
  }),
  parts: z.array(partSchema).min(1),
  routes: z.array(routeSchema).default([]),
  scenarios: z.array(scenarioSchema).min(1),
  actions: z.array(actionSchema).max(8).default([]),
  /**
   * One quantity the run follows step by step and plots against a limit: a failure mode's
   * load against the capacity it breaks. Each step gives its value in `meter`.
   */
  meter: z
    .object({
      label: z.string().min(1).max(32),
      unit: z.string().min(1).max(16),
      capacity: z.number().positive(),
    })
    .optional(),
});

export type MachineInput = z.input<typeof machineSchema>;
export type Machine = z.output<typeof machineSchema>;
