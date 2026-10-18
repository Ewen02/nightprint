import { defineMachine, type MachineInput } from "@nightprint/engine";
import { type LogInput, type TokenInput, variants } from "./variants";

/**
 * BEN-001 — RAG vs CAG vs KAG: three ways of giving a language model knowledge it was not
 * trained on, run side by side on the same documents and the same question.
 * References: P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP
 * Tasks", NeurIPS 2020; B. J. Chan et al., "Don't Do RAG: When Cache-Augmented Generation
 * is All You Need for Knowledge Tasks", 2024; L. Liang et al., "KAG: Boosting LLMs in
 * Professional Domains via Knowledge Augmented Generation", 2024.
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3), seen from the front: one lane per
 * system, each a row read left to right: the documents, what builds the knowledge, where it
 * is kept, what finds in it, the model. RAG at the back, CAG in the middle, KAG in front.
 * The analyst stands at the rows' end, and the model alone beyond. CAG has no retrieval
 * step: its fourth place is empty.
 */

const PIPE_Y = 0.3;
/** The lanes, back to front. */
const RAG_Z = -2.8;
const CAG_Z = 0;
const KAG_Z = 2.8;
/** The places along each row, left to right. */
const DOCS_X = -5.0;
const BUILD_X = -3.3;
const STORE_X = -1.6;
const FIND_X = 0.1;
const LLM_X = 1.8;
const USER_X = 3.9;
const ALONE_X = 5.9;
/** Where a side lane's question runs: in the gap between it and the middle lane. */
const RAG_ASK_Z = -1.4;
const KAG_ASK_Z = 1.4;
/** Where a side lane's question leaves the analyst's row, just past the analyst's desk. */
const TURN_X = USER_X - 0.75;

const BIG = "big-corpus";
const TWO_HOP = "two-hop";
const BAD_EDGE = "bad-extraction";

const DOCS = { type: "box", size: [1.0, 0.9, 1.2] } as const;
const BUILDER = { type: "box", size: [1.1, 0.6, 1.0] } as const;
const FINDER = { type: "box", size: [1.1, 0.6, 1.0] } as const;
const MODEL = { type: "prism", sides: 8, radius: 0.45, height: 0.6 } as const;

/** Which switches are on, for the steps that read differently under them. */
interface Flags {
  readonly big: boolean;
  readonly twoHop: boolean;
  readonly badEdge: boolean;
}
const flags = (on: (action: string) => boolean): Flags => ({
  big: on(BIG),
  twoHop: on(TWO_HOP),
  badEdge: on(BAD_EDGE),
});

const question = (f: Flags) =>
  f.twoHop
    ? "Where is the supplier of part P-7, the brake pads, based?"
    : "Who supplies part P-7, the brake pads?";
/** What KAG's graph answers: the right relation, or the one extracted wrong. */
const kagFinds = (f: Flags) =>
  f.twoHop ? (f.badEdge ? "S-9, then Turin" : "S-12, then Lyon") : f.badEdge ? "S-9" : "S-12";

/**
 * A step takes its colour from its first token, and lights its parts in it: a lane that holds
 * goes first, so a bench's step is not painted in one lane's failure. The failing lane keeps
 * its red, on its token and on its flagged part.
 */
const holdingFirst = (tokens: readonly TokenInput[]): TokenInput[] => [
  ...tokens.filter((token) => token.flow !== "error"),
  ...tokens.filter((token) => token.flow === "error"),
];

/** The problem first: a model on its own was never shown the documents. */
const aloneStep = variants("alone", [TWO_HOP], (on) => {
  const f = flags(on);
  return {
    title: "A model alone",
    lead: f.twoHop
      ? "Alone, a model never saw your documents: it cannot know where P-7's supplier is."
      : "Alone, a model never saw your documents: it cannot know who supplies P-7.",
    body: `The analyst first asks a language model on its own: “${question(f)}” It was trained on public text, never on these orders, catalogues and supplier sheets. It can only say it does not know, or make up a supplier that sounds right. Each system below hands it the documents another way.`,
    focus: ["user", "alone"],
    states: {
      user: f.twoHop ? "Where is P-7's supplier?" : "Who supplies part P-7?",
      alone: "never saw your documents",
    },
    tokens: [
      { flow: "request", path: ["alone-ask"] },
      { flow: "error", at: "alone", label: "?" },
    ],
    log: [
      {
        flow: "error",
        tag: "LLM",
        text: "never saw the documents: “I don't know”, or a made-up supplier",
      },
    ],
  };
});

const buildStep = variants("build", [BIG, BAD_EDGE], (on) => {
  const f = flags(on);
  const docs = f.big ? "40,000" : "40";
  const tokens: TokenInput[] = [
    { flow: "write", path: ["rag-read", "rag-write"] },
    f.big
      ? { flow: "error", path: ["cag-read"] }
      : { flow: "write", path: ["cag-read", "cag-write"] },
    f.badEdge
      ? { flow: "error", path: ["kag-read", "kag-write"], label: "S9" }
      : { flow: "write", path: ["kag-read", "kag-write"] },
  ];
  const log: LogInput[] = [
    {
      flow: "write",
      tag: "RAG",
      text: f.big
        ? "cuts 40,000 docs into 300,000 passages, indexed by meaning (vectors)"
        : "cuts 40 docs into 300 passages, indexed by meaning (vectors)",
    },
    f.big
      ? {
          flow: "error",
          tag: "CAG",
          text: "millions of tokens: more than the 128,000 it reads at once",
        }
      : {
          flow: "write",
          tag: "CAG",
          text: "reads all 40 docs once and keeps what it read (KV cache)",
        },
    f.badEdge
      ? {
          flow: "error",
          tag: "KAG",
          text: "writes the facts into a graph, one wrong: P-7 supplied by S-9",
        }
      : { flow: "write", tag: "KAG", text: "writes the facts into a graph: P-7 supplied by S-12" },
  ];
  return {
    title: "Three ways to hand over the documents",
    lead: f.big
      ? f.badEdge
        ? "40,000 documents: too many for CAG to read first, and KAG maps one fact wrong."
        : "40,000 documents: RAG and KAG index them; CAG cannot read that many first."
      : f.badEdge
        ? "Each one prepares the documents its own way; KAG maps one fact wrong: P-7 supplied by S-9."
        : "Before any question, RAG cuts the documents into passages, CAG reads them all, KAG maps their facts.",
    body: [
      `Each system prepares the same ${docs} documents (orders, a parts catalogue, supplier sheets) before any question.`,
      "RAG cuts them into chunks and stores one vector per chunk.",
      f.big
        ? "CAG cannot: so many documents run to millions of tokens, and the whole corpus has to fit in the model's context window."
        : "CAG runs the model once over all of them and keeps its KV cache.",
      f.badEdge
        ? "KAG has a model extract entities and relations into a graph, and one relation comes out wrong: P-7 supplied by S-9."
        : "KAG has a model extract entities and relations into a graph, each linked to the passage it came from.",
    ].join(" "),
    focus: ["rag-build", "rag-store", "cag-build", "cag-store", "kag-build", "kag-store"],
    states: {
      "rag-store": f.big ? "300,000 passages as vectors" : "300 passages as vectors",
      "cag-store": f.big ? "empty: too much to read" : "all 40 docs, already read",
      "kag-store": f.badEdge ? "P-7 → S-9 · S-12 → Lyon" : "P-7 → S-12 · S-12 → Lyon",
    },
    tokens,
    log,
  };
});

const askStep = variants("ask", [BIG, TWO_HOP], (on) => {
  const f = flags(on);
  return {
    title: "One question, three systems",
    lead: f.big
      ? `“${question(f)}” goes to RAG and KAG only.`
      : `“${question(f)}” goes to all three.`,
    body: f.big
      ? `An analyst asks: “${question(f)}” The question goes to RAG and KAG. CAG has no cache to answer from.`
      : `An analyst asks: “${question(f)}” The same question goes to all three.`,
    focus: ["user", "rag-find", "kag-find", ...(f.big ? [] : ["cag-llm"])],
    states: { user: f.twoHop ? "Where is P-7's supplier?" : "Who supplies part P-7?" },
    tokens: [
      { flow: "request", path: ["rag-ask"] },
      ...(f.big ? [] : [{ flow: "request" as const, path: ["cag-ask"] }]),
      { flow: "request", path: ["kag-ask"] },
    ],
    log: [
      {
        flow: "request",
        tag: "ASK",
        text: `“${question(f)}” → ${f.big ? "RAG, KAG" : "RAG, CAG, KAG"}`,
      },
    ],
  };
});

const findStep = variants("find", [BIG, TWO_HOP, BAD_EDGE], (on) => {
  const f = flags(on);
  const kagWrong = f.badEdge;
  return {
    title: "Find what to read",
    lead: `${[
      f.twoHop ? "RAG's 3 passages never give the city" : "RAG looks up 3 passages, one names S-12",
      f.big ? "" : "CAG has read everything",
      kagWrong
        ? "KAG follows a wrong fact"
        : f.twoHop
          ? "KAG follows two links to Lyon"
          : "KAG follows the link to S-12",
    ]
      .filter(Boolean)
      .join("; ")}.`,
    body: [
      f.twoHop
        ? "RAG takes the 3 chunks closest to the question: all three are about P-7 and its supplier. The sheet that says where S-12 is based never mentions P-7, so it is not among them."
        : "RAG embeds the question and takes the 3 chunks closest to it. One says S-12 supplies P-7.",
      f.big ? "" : "CAG looks nothing up: the question is appended to the cached corpus.",
      f.twoHop
        ? `KAG's planner writes two steps, the supplier of P-7, then that supplier's city, and runs them on the graph: ${kagFinds(f)}.`
        : `KAG's planner writes one step, the supplier of P-7, and runs it on the graph: ${kagFinds(f)}.`,
    ]
      .filter(Boolean)
      .join(" "),
    focus: [
      "rag-find",
      "rag-store",
      ...(f.big ? [] : ["cag-store", "cag-llm"]),
      "kag-find",
      "kag-store",
    ],
    states: {
      "rag-find": f.twoHop ? "3 passages · no city" : "3 passages · one names S-12",
      "kag-find": f.twoHop ? "P-7 → supplier → city" : "P-7 → its supplier",
    },
    // What RAG and KAG find comes back as an answer would; CAG's cache only loads.
    tokens: holdingFirst([
      {
        flow: f.twoHop ? "error" : "response",
        path: ["rag-query"],
        reverse: true,
        label: "×3",
      },
      {
        flow: kagWrong ? "error" : "response",
        path: ["kag-query"],
        reverse: true,
        label: kagWrong ? "S9" : "S12",
      },
      ...(f.big ? [] : [{ flow: "write" as const, path: ["cag-load"] }]),
    ]),
    log: [
      {
        flow: f.twoHop ? "error" : "response",
        tag: "RAG",
        text: f.twoHop
          ? "picks the 3 passages most like the question: none gives S-12's city"
          : "picks the 3 passages most like the question: one names S-12",
      },
      ...(f.big
        ? []
        : [
            {
              flow: "write" as const,
              tag: "CAG",
              text: "looks nothing up: it has read everything already",
            },
          ]),
      {
        flow: kagWrong ? "error" : "response",
        tag: "KAG",
        text: f.twoHop
          ? `follows two links: P-7 → ${kagWrong ? "S-9" : "S-12"} → ${kagWrong ? "Turin" : "Lyon"}`
          : `follows one link: P-7 → ${kagWrong ? "S-9" : "S-12"}`,
      },
    ],
  };
});

/** The answers in one line: who is right, then how the others fail. */
function answerLead(f: Flags, right: string, kag: string): string {
  const correct = [!f.twoHop && "RAG", !f.big && "CAG", !f.badEdge && "KAG"].filter(
    (lane): lane is string => typeof lane === "string",
  );
  const named = correct.length === 3 ? "All three" : correct.join(" and ");
  return `${[
    correct.length > 0 ? `${named} answer${correct.length === 1 ? "s" : ""} ${right}` : "",
    f.twoHop ? "RAG cannot say where S-12 is" : "",
    f.big ? "CAG has no answer" : "",
    f.badEdge ? `KAG answers ${kag}, wrongly` : "",
  ]
    .filter(Boolean)
    .join("; ")}.`;
}

const answerStep = variants("answer", [BIG, TWO_HOP, BAD_EDGE], (on) => {
  const f = flags(on);
  const right = f.twoHop ? "Lyon" : "S-12";
  const kag = f.twoHop ? (f.badEdge ? "Turin" : "Lyon") : f.badEdge ? "S-9" : "S-12";
  return {
    title: f.big ? "Two answers" : "Three answers",
    lead: answerLead(f, right, kag),
    body: [
      f.twoHop
        ? "RAG names S-12 but cannot say where it is based: no passage it was given says so."
        : "RAG answers S-12, from the question and its 3 chunks.",
      f.big
        ? "CAG gives no answer: it never had a cache."
        : `CAG answers ${right}, from the whole corpus in its cache; the question is then cut off the cache, ready for the next one.`,
      f.badEdge
        ? `KAG answers ${kag}, as confidently as a right answer: the mistake was made when the graph was built.`
        : `KAG answers ${kag}, from the steps its planner ran on the graph.`,
    ].join(" "),
    focus: ["user", "rag-llm", "kag-llm", ...(f.big ? [] : ["cag-llm"])],
    states: {
      "rag-llm": f.twoHop ? "S-12, city unknown" : "answers S-12",
      "cag-llm": f.big ? "read nothing: no answer" : `answers ${right}`,
      "kag-llm": `answers ${kag}`,
    },
    tokens: holdingFirst([
      { flow: f.twoHop ? "error" : "response", path: ["rag-feed", "rag-answer"] },
      ...(f.big ? [] : [{ flow: "response" as const, path: ["cag-ask"], reverse: true }]),
      { flow: f.badEdge ? "error" : "response", path: ["kag-feed", "kag-answer"] },
    ]),
    log: [
      f.twoHop
        ? { flow: "error", tag: "RAG", text: "“S-12 supplies P-7; the passages don't say where.”" }
        : { flow: "response", tag: "RAG", text: "“S-12”" },
      f.big
        ? { flow: "error", tag: "CAG", text: "read nothing: no answer" }
        : { flow: "response", tag: "CAG", text: `“${right}”` },
      { flow: f.badEdge ? "error" : "response", tag: "KAG", text: `“${kag}”` },
    ],
  };
});

/** A lane's copy of the corpus, its builder and its store: the same three rows in each. */
function laneParts(
  lane: "rag" | "cag" | "kag",
  z: number,
  refs: readonly [number, number, number],
  build: { readonly label: string; readonly description: string },
  store: {
    readonly label: string;
    readonly role: string;
    readonly form: "grid" | "memory" | "graph";
    readonly size: readonly [number, number, number];
    readonly description: string;
  },
): MachineInput["parts"] {
  return [
    {
      id: `${lane}-docs`,
      ref: refs[0],
      label: "Documents",
      role: "CORPUS",
      kind: "store",
      shape: DOCS,
      position: [DOCS_X, 0.45, z],
      socket: [0, -0.15, 0],
      description:
        "The same documents in every lane: orders, a parts catalogue and supplier sheets.",
    },
    {
      id: `${lane}-build`,
      ref: refs[1],
      label: build.label,
      role: "BUILDS",
      kind: "module",
      shape: BUILDER,
      position: [BUILD_X, 0.3, z],
      description: build.description,
    },
    {
      id: `${lane}-store`,
      ref: refs[2],
      label: store.label,
      role: store.role,
      kind: "store",
      shape: { type: "box", size: store.size },
      form: store.form,
      position: [STORE_X, store.size[1] / 2, z],
      // Routes meet it at pipe height.
      socket: [0, PIPE_Y - store.size[1] / 2, 0],
      description: store.description,
    },
  ];
}

/** Straight runs inside a lane: documents to builder, builder to store. */
function laneRoutes(lane: "rag" | "cag" | "kag"): NonNullable<MachineInput["routes"]> {
  return [
    { id: `${lane}-read`, from: `${lane}-docs`, to: `${lane}-build` },
    { id: `${lane}-write`, from: `${lane}-build`, to: `${lane}-store` },
  ];
}

export const ragCagKag = defineMachine({
  code: "BEN-001",
  slug: "rag-vs-cag-vs-kag",
  title: "RAG vs CAG vs KAG",
  aliases: [
    "retrieval-augmented generation",
    "cache-augmented generation",
    "knowledge-augmented generation",
  ],
  summary:
    "A language model only knows what it was trained on. To answer from your documents, it can look a few passages up (RAG), read them all first (CAG), or follow facts linked in a graph (KAG).",
  family: "ai",
  category: "COMPARISON",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-18",
  flowLabels: {
    request: "Question",
    write: "Knowledge",
    response: "Answer",
    error: "Wrong, missing",
  },
  sources: [
    {
      label: "P. Lewis et al., RAG, 2020",
      url: "https://arxiv.org/abs/2005.11401",
    },
    {
      label: "B. J. Chan et al., CAG, 2024",
      url: "https://arxiv.org/abs/2412.15605",
    },
    {
      label: "L. Liang et al., KAG, 2024",
      url: "https://arxiv.org/abs/2409.13731",
    },
  ],
  article: [
    "RAG, CAG and KAG are three ways of giving a large language model knowledge it was not trained on. Retrieval-augmented generation (RAG) looks passages up when a question arrives; cache-augmented generation (CAG) has the model read all the knowledge ahead of time and keeps its state; knowledge-augmented generation (KAG) builds a knowledge graph and plans the question over it. This bench sends the same documents and the same question through all three.",
    "RAG, introduced by Patrick Lewis and colleagues in 2020, splits the documents into passages, stores one vector per passage, and retrieves the passages closest to each question. In the original paper the generator reads the question with each retrieved passage and combines the results. The index can be replaced without retraining the model, which is how its knowledge is updated.",
    "CAG, proposed by Brian Chan and colleagues in 2024, drops retrieval when the knowledge is small enough. The whole corpus is fed to the model once, and the resulting KV cache is kept and reused for every question, cut back to the corpus after each answer. It removes the retrieval step, not generation: in their test with an 8-billion-parameter model, answering took 0.85 s with a 21,000-token corpus and 2.26 s with 85,000. The authors note it becomes impractical for much larger datasets.",
    "KAG, from Lei Liang and colleagues in 2024, has a model extract entities and relations from the documents into a graph whose nodes point back to the passages they came from. A planner rewrites each question as logical-form steps, retrieves through the graph and the passages, and checks whether the question is answered. On multi-hop benchmarks the authors report a higher F1 than a multi-step retrieval baseline, at the price of several model calls to build and to answer; errors made while building the graph lead to wrong answers.",
    "None of the three wins everywhere. CAG needs the corpus to fit in the context window. Retrieval in one step returns passages similar to the question and can miss the one that leads to the answer. KAG's answers are only as right as the graph it extracted. Each switch here triggers one of these limits.",
  ],
  glossary: [
    {
      term: "Chunk",
      definition: "A short passage cut from a document: what RAG indexes and retrieves.",
      parts: ["rag-build", "rag-store"],
    },
    {
      term: "Embedding",
      definition:
        "A vector that stands for a passage's meaning. RAG compares the question's vector with each chunk's to find the closest.",
      parts: ["rag-store", "rag-find"],
    },
    {
      term: "Top-k",
      definition: "The k chunks most similar to the question, here 3. Only they reach the model.",
      parts: ["rag-find"],
    },
    {
      term: "KV cache",
      definition:
        "The model's state after reading a text: keys and values for every token. CAG computes it once for the whole corpus and reuses it.",
      parts: ["cag-store"],
    },
    {
      term: "Context window",
      definition:
        "The most tokens, pieces of words, a model reads at once. CAG's whole corpus must fit in it.",
      parts: ["cag-build", "cag-llm"],
    },
    {
      term: "Knowledge graph",
      definition:
        "Entities and the relations between them, extracted from the documents. In KAG each one points back to the passage it came from.",
      parts: ["kag-build", "kag-store"],
    },
    {
      term: "Logical form",
      definition:
        "The question rewritten as steps a program can run: find the supplier of P-7, then that supplier's city.",
      parts: ["kag-find"],
    },
    {
      term: "Multi-hop question",
      definition:
        "A question whose answer joins facts from several places through something in between: P-7 to S-12, S-12 to Lyon.",
      parts: ["rag-find", "kag-find"],
    },
  ],
  stage: {
    // Wider on the left than the lanes: their names stand there, before each row.
    plate: { size: [15.8, 8.0], center: [-1.1, 0] },
    view: "front",
    zones: [
      {
        id: "rag",
        label: "RAG",
        note: "Open book: looks up 3 passages",
        from: [-5.8, -3.7],
        to: [2.7, -1.9],
      },
      {
        id: "cag",
        label: "CAG",
        note: "Reads the whole book first",
        from: [-5.8, -0.9],
        to: [2.7, 0.9],
      },
      {
        id: "kag",
        label: "KAG",
        note: "A map of facts, link by link",
        from: [-5.8, 1.9],
        to: [2.7, 3.7],
      },
    ],
  },
  parts: [
    {
      id: "user",
      ref: 1,
      label: "Analyst",
      role: "ASKS",
      kind: "actor",
      shape: { type: "box", size: [1.3, 0.7, 1.0] },
      position: [USER_X, 0.35, CAG_Z],
      socket: [0, -0.05, 0],
      description:
        "Asks one question about the documents: first to a model alone, then to all three systems.",
    },
    ...laneParts(
      "rag",
      RAG_Z,
      [2, 3, 4],
      {
        label: "Chunk and embed",
        description: "Cuts the documents into chunks and turns each into a vector.",
      },
      {
        label: "Vector index",
        role: "INDEX",
        form: "grid",
        size: [1.1, 0.7, 1.0],
        description:
          "One vector per chunk, searched by similarity. Replaceable without retraining the model.",
      },
    ),
    {
      id: "rag-find",
      ref: 5,
      label: "Retriever",
      role: "TOP-K",
      kind: "module",
      shape: FINDER,
      position: [FIND_X, 0.3, RAG_Z],
      description: "Embeds the question and returns the 3 chunks closest to it.",
    },
    {
      id: "rag-llm",
      ref: 6,
      label: "LLM",
      role: "RAG",
      kind: "core",
      shape: MODEL,
      position: [LLM_X, PIPE_Y, RAG_Z],
      description:
        "Writes the answer from the question and the retrieved chunks, and nothing else.",
    },
    ...laneParts(
      "cag",
      CAG_Z,
      [7, 8, 9],
      {
        label: "Prefill",
        description:
          "Runs the model once over the whole corpus. It has to fit in the context window.",
      },
      {
        label: "KV cache",
        role: "CACHE",
        form: "memory",
        size: [1.2, 0.8, 0.9],
        description:
          "The model's state after reading the corpus, saved to be reused by every question.",
      },
    ),
    {
      id: "cag-llm",
      ref: 10,
      label: "LLM",
      role: "CAG",
      kind: "core",
      shape: MODEL,
      position: [LLM_X, PIPE_Y, CAG_Z],
      description: "Answers from the question appended to the cache. No retrieval step.",
    },
    ...laneParts(
      "kag",
      KAG_Z,
      [11, 12, 13],
      {
        label: "Extractor",
        description: "Has a model extract entities and relations from the documents.",
      },
      {
        label: "Knowledge graph",
        role: "GRAPH",
        form: "graph",
        size: [1.2, 0.9, 1.1],
        description: "Entities and relations, each linked to the passage it came from.",
      },
    ),
    {
      id: "kag-find",
      ref: 14,
      label: "Planner",
      role: "LOGICAL FORM",
      kind: "module",
      shape: FINDER,
      position: [FIND_X, 0.3, KAG_Z],
      description: "Rewrites the question as steps and runs them on the graph and its passages.",
    },
    {
      id: "kag-llm",
      ref: 15,
      label: "LLM",
      role: "KAG",
      kind: "core",
      shape: MODEL,
      position: [LLM_X, PIPE_Y, KAG_Z],
      description: "Writes the answer from what the planner's steps found.",
    },
    {
      id: "alone",
      ref: 16,
      label: "LLM alone",
      role: "NO DOCS",
      kind: "core",
      shape: MODEL,
      position: [ALONE_X, PIPE_Y, CAG_Z],
      description:
        "A language model on its own: trained on public text, it has never seen these documents.",
    },
  ],
  routes: [
    ...laneRoutes("rag"),
    ...laneRoutes("cag"),
    ...laneRoutes("kag"),
    { id: "rag-query", from: "rag-find", to: "rag-store" },
    { id: "rag-feed", from: "rag-find", to: "rag-llm" },
    {
      id: "rag-ask",
      from: "user",
      to: "rag-find",
      via: [
        [TURN_X, PIPE_Y, CAG_Z],
        [TURN_X, PIPE_Y, RAG_ASK_Z],
        [FIND_X, PIPE_Y, RAG_ASK_Z],
      ],
    },
    {
      id: "rag-answer",
      from: "rag-llm",
      to: "user",
      via: [[USER_X, PIPE_Y, RAG_Z]],
    },
    { id: "cag-load", from: "cag-store", to: "cag-llm" },
    { id: "cag-ask", from: "user", to: "cag-llm" },
    { id: "kag-query", from: "kag-find", to: "kag-store" },
    { id: "kag-feed", from: "kag-find", to: "kag-llm" },
    {
      id: "kag-ask",
      from: "user",
      to: "kag-find",
      via: [
        [TURN_X, PIPE_Y, CAG_Z],
        [TURN_X, PIPE_Y, KAG_ASK_Z],
        [FIND_X, PIPE_Y, KAG_ASK_Z],
      ],
    },
    {
      id: "kag-answer",
      from: "kag-llm",
      to: "user",
      via: [[USER_X, PIPE_Y, KAG_Z]],
    },
    { id: "alone-ask", from: "user", to: "alone" },
  ],
  actions: [
    {
      id: BIG,
      label: "Give them 40,000 documents",
      description:
        "Millions of tokens, far more than a model reads at once (its context window). RAG and KAG index them; CAG cannot read them all first.",
      effects: [{ type: "patchPart", part: "cag-build", set: { flag: "violation" } }],
    },
    {
      id: TWO_HOP,
      label: "Ask what takes two documents",
      description:
        "Where is P-7's supplier based? One document says S-12 supplies P-7, another that S-12 is in Lyon, and only the first mentions P-7: a two-hop question.",
      effects: [{ type: "patchPart", part: "rag-find", set: { flag: "violation" } }],
    },
    {
      id: BAD_EDGE,
      label: "Get one fact wrong in the graph",
      description:
        "The graph records P-7 as supplied by S-9. KAG answers from its graph, so its answer repeats the mistake.",
      effects: [{ type: "patchPart", part: "kag-store", set: { flag: "violation" } }],
    },
  ],
  scenarios: [
    {
      id: "ask",
      title: "Ask about a part",
      steps: [...aloneStep, ...buildStep, ...askStep, ...findStep, ...answerStep],
    },
  ],
});
