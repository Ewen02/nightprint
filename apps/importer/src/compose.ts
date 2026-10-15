import Anthropic from "@anthropic-ai/sdk";
// The SDK's tolerant JSON parser, the one it reads streaming tool inputs with.
import { partialParse } from "@anthropic-ai/sdk/_vendor/partial-json-parser/parser";
import {
  type Blueprint,
  type BlueprintPart,
  blueprintSchema,
  checkBlueprint,
  type DrawOptions,
  drawMachine,
  repairBlueprint,
  type Survey,
  surveySheet,
} from "@nightprint/blueprint";
import {
  defineMachine,
  type Machine,
  MachineDefinitionError,
  type MachineInput,
} from "@nightprint/engine";
import { z } from "zod";

export const MODEL = "claude-haiku-5-5";
/** A first answer, then two corrections at most. */
const MAX_ATTEMPTS = 3;

/**
 * What the draftsman is told once, the same for every repository: cached across requests.
 * The rules here mirror `checkBlueprint`, which enforces them; the words only help the
 * model get them right the first time.
 */
export const SYSTEM = `You draw real software projects as Nightprint machines. Nightprint shows software architecture as machines on a drawing plate: parts connected by routes, and scenarios in which a token travels those routes step by step. You receive the survey of one repository, read from its code: its units (a package, or one folder of a large package), the libraries each unit imports, its ways in (pages, endpoints, commands), and which unit imports which. You return the blueprint of its machine. A program lays it out; you choose what to draw and write the words.

The first rule: draw only what the code shows.
- A route between two parts of the code stands on an import in the survey, between a unit of one and a unit of the other. Its arrowhead, dependsOn, points at the part that is imported: "to" when \`from\` imports \`to\`, "from" when \`to\` imports \`from\`. Data may run against the import: a storage package that implements an interface of the domain is drawn from the domain to the storage package, with dependsOn "from".
- A route to an outside service (a database, a cache, a payment API) stands on a library some unit imports; the service part names those libraries.
- Someone outside the code (a visitor, a browser, a CLI user, a CI run) reaches only a part that holds a way in, and that route's dependsOn is "none".
- A scenario says only what the survey shows: file names, exported names, doc comments, imports. When you cannot tell what a step does at run time, say which part calls which, not a behaviour. Never invent a cache, a queue, a retry, a check or a number the survey does not show.
- A what-if (an action) shows a change the code does not have today and what it would break: an import across the project's own boundaries, such as a core that imports a framework or a UI kit that imports the data layer. It adds that import as a violation, flags the part it corrupts, and is named like a test case after the import it adds ("Import the database client in the domain"). Steps that show it play only with it on (whenOn). 0 to 3 actions.

Parts: 5 to 14. A part stands for one or more units that play one role; small units join the part they serve. Every unit is in exactly one part, or in leftOut with a reason (tests, build or release scripts, examples, generated code).
Kinds:
- core: the code the rest depends on, which depends on nothing else of the project (a domain, an engine).
- module: the project's own code that is neither core nor adapter.
- adapter: code that translates between the project and one technology (a UI, an HTTP layer, a database layer).
- configurator: the code that assembles the others at startup, such as an app entry that imports everything.
- actor: outside the code: a visitor, a CLI user, or an outside API reached through its libraries.
- store: a database or a cache, reached through its libraries. queue: a message broker, the same way.
Labels are what a developer of the project calls the part ("Engine", "Scene", "Web app"), never a path. Roles are one or two upper-case words, 12 characters at most ("CORE", "UI KIT", "DATA").
Zones, 2 to 4, in this order: who uses the project, then its own code (one or two zones, such as the delivery side and the core), then what it uses.

Layout: the composition that tells this project's architecture at a glance. Choose the most telling one whose condition holds; bands are what is left when no other holds. Then say why in one sentence for the reader of the drawing, in the project's own terms, not the rule's (120 characters at most): "Every binding and example is built on the engine", not "six parts import the core".
- hub: one core most of the code imports, at the centre of its zone, the rest of the code on a ring around it, who uses the project on the left, what it uses on the right. It holds when at least three parts of the code, and most of them, import one core part that imports none of them, and the code stands in the core's zone and at most one zone beside it. The center is that core's id.
- mirror: a zone of shared code in the middle, two halves of the code on either side of it, each with who uses it and what it uses beyond it: two apps over shared packages, a client and a server over shared types. It holds when the code outside the shared zone falls in exactly two groups that import nothing of each other, both importing the shared zone, which imports neither. The center is the id of a part in the shared zone.
- bus: a message queue stretched into a rail across the middle, the code that sends to it in a row behind, the code that reads from it in a row in front. It holds when at least three parts of the code have a route to or from one queue part; a route to the queue is a send, a route from it a read. The center is the queue's id.
- bands: the zones drawn left to right, the parts of each in columns: calls that run one way through layers, with no one core, shared zone or queue at the centre. Its center is null.

Routes: draw the imports that explain the architecture, not every edge; every route a scenario travels must exist. A pipe carries tokens. A wire is configuration (the configurator plugging a part in): it carries none and its dependsOn is "none".

Scenarios: 1 to 3, of 3 to 8 steps. Each plays at least two steps with every switch off: the steps that show a what-if sit inside a scenario that also plays without it, never in a scenario of their own. Each follows one real use of the project, from a way in through its parts, and says when each step runs: at build time, at startup, on a request, or in the browser. A static site's pages are built once and then run in the browser; a token goes back only along routes an answer really takes. A step moves one token along a path of routes that chain end to end (each route starts where the one before it ends; to come back, travel the same routes with reverse true), or holds a token on a part, or moves nothing. Flows: request (a call going in), write (a change stored or sent), response (an answer going back), error (a failure or a violation).

Words, in English: step titles of 2 to 6 words in sentence case; bodies of one or two plain sentences in the present tense that name the parts and what the code does; log lines short, like "Page /m/[slug] → MachineView". The article: 2 to 5 short paragraphs on how the project is organised and the rule its imports keep. A glossary of up to 8 terms a reader needs, each with the parts it names. No marketing, no superlatives, no emoji. Ids are kebab-case.`;

export class ComposeError extends Error {
  override name = "ComposeError";
  constructor(
    message: string,
    /** What the last blueprint still broke, when it came to that. */
    readonly issues: readonly string[] = [],
    /** What the answers cost before it gave up: a failed drawing is paid for too. */
    readonly usage?: Usage,
  ) {
    super(message);
  }
}

export interface Usage {
  readonly inputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly outputTokens: number;
}

/** What `compose` reads of a model's answer. */
export interface Answer {
  readonly content: Anthropic.Beta.BetaContentBlock[];
  readonly stop_reason: Anthropic.Beta.BetaMessage["stop_reason"];
  readonly usage: Pick<
    Anthropic.Beta.BetaUsage,
    "input_tokens" | "output_tokens" | "cache_read_input_tokens" | "cache_creation_input_tokens"
  >;
}

/** What a caller hears of an answer while it streams, a piece at a time. */
export interface Listen {
  /** The answer's text: the blueprint being written. */
  readonly text?: (delta: string) => void;
  /** A summary of the model's reasoning, before it writes. */
  readonly thinking?: (delta: string) => void;
}

/** One round trip to the model: the conversation so far in, its answer out. */
export type Ask = (
  messages: readonly Anthropic.Beta.BetaMessageParam[],
  listen?: Listen,
) => Promise<Answer>;

/** What compose says while it works, for a visitor watching the drawing. */
export interface ComposeEvents {
  /** The drafter starts answer `answer`. */
  readonly answer?: (answer: number) => void;
  /** A part written whole, while the answer still streams. */
  readonly part?: (answer: number, part: BlueprintPart) => void;
  /** The latest sentence of the model's reasoning summary, while it thinks. */
  readonly musing?: (answer: number, sentence: string) => void;
  /** The answer broke these rules, and goes back to the drafter. */
  readonly rejected?: (answer: number, issues: readonly string[]) => void;
}

const MUSING_EVERY_MS = 1500;
const MUSING_CHARS = 160;

/**
 * Hands over the latest whole sentence of a streaming reasoning summary, at most every
 * 1.5 s: enough to follow what the model weighs, not a transcript.
 */
function sentencesAsTheyCome(
  onSentence: (sentence: string) => void,
  now: () => number = Date.now,
): (delta: string) => void {
  let text = "";
  let last = "";
  let at = 0;
  return (delta) => {
    text += delta;
    if (now() - at < MUSING_EVERY_MS) {
      return;
    }
    const sentences = text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s/)
      .map((s) => s.trim())
      .filter((s) => /[.!?]$/.test(s) && s.length > 12);
    const sentence = sentences.at(-1);
    if (!sentence || sentence === last) {
      return;
    }
    last = sentence;
    at = now();
    onSentence(
      sentence.length > MUSING_CHARS ? `${sentence.slice(0, MUSING_CHARS - 1)}…` : sentence,
    );
  };
}

/**
 * Hands each part of a streaming blueprint over once it is whole: when another part, or the
 * next key, follows it. The parse is tolerant, and only attempted when an object may have
 * closed.
 */
function partsAsTheyCome(onPart: (part: BlueprintPart) => void): (delta: string) => void {
  let text = "";
  let handed = 0;
  return (delta) => {
    text += delta;
    if (!delta.includes("}") && !delta.includes("]")) {
      return;
    }
    const start = text.indexOf("{");
    if (start < 0) {
      return;
    }
    let partial: unknown;
    try {
      partial = partialParse(text.slice(start));
    } catch {
      return;
    }
    if (typeof partial !== "object" || partial === null || !("parts" in partial)) {
      return;
    }
    const parts = partial.parts;
    if (!Array.isArray(parts)) {
      return;
    }
    // The key after `parts` has begun: the last part is closed too.
    const closed = "leftOut" in partial ? parts.length : parts.length - 1;
    for (; handed < closed; handed++) {
      const part = blueprintSchema.shape.parts.element.safeParse(parts[handed]);
      if (part.success) {
        onPart(part.data);
      }
    }
  };
}

/**
 * The answer's shape, told rather than enforced: structured outputs refuse a schema this
 * nested ("the compiled grammar is too large"). zod checks the answer, and what it finds
 * goes back to the model like any broken rule.
 */
const ANSWER_FORMAT = `Answer with the blueprint as one JSON object and nothing else: no prose, no code fence. It follows this JSON Schema:
${JSON.stringify(z.toJSONSchema(blueprintSchema))}`;

/** How long the model thinks before it writes: the main lever on a drawing's time and cost. */
export type Effort = "low" | "medium" | "high";

/** Asks Claude, streaming so a long answer never hits a request timeout. */
/**
 * Medium by default, measured on two repositories (15/10/2026): with mechanical slips
 * repaired, it drew both in one answer, in 69 and 98 s for $0.010 and $0.014. High took
 * 175 to 182 s for $0.030 to $0.035; low once needed three answers.
 */
export function claudeAsk(client = new Anthropic(), effort: Effort = "medium"): Ask {
  return async (messages, listen) => {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64_000,
      // Haiku 5.5 has no server-side fallback: a refusal ends the run, see `compose`.
      // Summarized, so a visitor can follow what the model weighs while it thinks.
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort },
      system: [
        {
          type: "text",
          text: `${SYSTEM}\n\n${ANSWER_FORMAT}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [...messages],
    });
    if (listen?.text) {
      stream.on("text", listen.text);
    }
    if (listen?.thinking) {
      stream.on("thinking", listen.thinking);
    }
    return stream.finalMessage();
  };
}

export interface Composed {
  readonly blueprint: Blueprint;
  /** The machine as drawn, before the engine applies its defaults: what a catalogue file holds. */
  readonly input: MachineInput;
  readonly machine: Machine;
  readonly attempts: number;
  readonly usage: Usage;
}

function blueprintOf(message: Answer): { blueprint?: Blueprint; issues: string[] } {
  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  // The object, should a sentence or a code fence wrap it after all.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { issues: ["the answer is not one JSON object"] };
  }
  const parsed = blueprintSchema.safeParse(json);
  if (!parsed.success) {
    return { issues: [z.prettifyError(parsed.error)] };
  }
  return { blueprint: parsed.data, issues: [] };
}

/**
 * Turns a survey into a machine: the model plans the blueprint, `checkBlueprint` and the
 * engine judge it, and every rule it breaks goes back to the model to correct.
 */
export async function compose(
  survey: Survey,
  options: DrawOptions,
  ask: Ask,
  events: ComposeEvents = {},
): Promise<Composed> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `${surveySheet(survey)}\n\nDraw the blueprint of this project's machine.`,
    },
  ];
  const usage = { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 };
  let issues: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    events.answer?.(attempt);
    const { part, musing } = events;
    const message = await ask(messages, {
      ...(part ? { text: partsAsTheyCome((p) => part(attempt, p)) } : {}),
      ...(musing ? { thinking: sentencesAsTheyCome((s) => musing(attempt, s)) } : {}),
    });
    usage.inputTokens += message.usage.input_tokens;
    usage.cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += message.usage.cache_creation_input_tokens ?? 0;
    usage.outputTokens += message.usage.output_tokens;
    if (message.stop_reason === "refusal") {
      throw new ComposeError("The model declined to draw this repository.", [], usage);
    }
    if (message.stop_reason === "max_tokens") {
      throw new ComposeError("The blueprint did not fit in one answer.", [], usage);
    }
    const read = blueprintOf(message);
    issues = read.issues;
    if (read.blueprint) {
      // Mechanical slips are mended here; only what the model must decide goes back to it.
      const { blueprint } = repairBlueprint(read.blueprint, survey);
      issues = checkBlueprint(blueprint, survey);
      if (issues.length === 0) {
        try {
          const input = drawMachine(blueprint, survey, options);
          const machine = defineMachine(input);
          return { blueprint, input, machine, attempts: attempt, usage };
        } catch (error) {
          if (!(error instanceof MachineDefinitionError)) {
            throw error;
          }
          issues = error.message.split("\n").slice(1);
        }
      }
    }
    events.rejected?.(attempt, issues);
    messages.push(
      { role: "assistant", content: message.content },
      {
        role: "user",
        content: `The blueprint breaks these rules:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nReturn the whole blueprint again, corrected.`,
      },
    );
  }
  throw new ComposeError(`No valid blueprint after ${MAX_ATTEMPTS} attempts.`, issues, usage);
}

/**
 * Haiku 5.5 list prices, in dollars per million tokens, for prompts up to 100K tokens
 * (a survey and its corrections stay under it): cache reads 0.1×, 5-minute writes 1.25×.
 */
export function costOf(usage: Usage): number {
  return (
    (usage.inputTokens * 0.1 +
      usage.cacheWriteTokens * 0.125 +
      usage.cacheReadTokens * 0.01 +
      usage.outputTokens * 0.5) /
    1_000_000
  );
}
