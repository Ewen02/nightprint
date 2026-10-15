import type Anthropic from "@anthropic-ai/sdk";
import { type Blueprint, type RepoSnapshot, surveyRepo } from "@nightprint/blueprint";
import type { Answer } from "./compose";

/** A site and the domain it imports. */
export const snapshot: RepoSnapshot = {
  name: "acme/tiny",
  ref: "0123456789",
  files: [
    { path: "package.json", text: '{ "name": "tiny" }' },
    {
      path: "web/server.ts",
      text: 'import { rule } from "../domain/rule";\nexport const app = 1;',
    },
    { path: "domain/rule.ts", text: "export function rule() {}" },
  ],
};
export const survey = surveyRepo(snapshot);
export const options = {
  code: "PRJ-999",
  slug: "tiny",
  revised: "2026-10-14",
  sourceUrl: "https://github.com/acme/tiny",
};

const step = {
  reverse: false,
  at: null,
  label: null,
  focus: [],
  log: [],
  whenOn: [],
  whenOff: [],
};
export const valid: Blueprint = {
  title: "Tiny",
  summary: "A server and its rules.",
  family: "backend",
  article: ["The server calls the domain."],
  zones: [
    { id: "outside", label: "Outside", note: "Calls the server" },
    { id: "code", label: "Code", note: "The repository" },
  ],
  layout: { kind: "bands", core: null, why: "Calls run one way: the server, then the domain." },
  parts: [
    {
      id: "user",
      label: "User",
      role: "CALLER",
      kind: "actor",
      zone: "outside",
      units: [],
      libraries: [],
      description: "Calls the server.",
    },
    {
      id: "server",
      label: "Server",
      role: "HTTP",
      kind: "adapter",
      zone: "code",
      units: ["root"],
      libraries: [],
      description: "The server.",
    },
  ],
  leftOut: [],
  routes: [{ id: "call", from: "user", to: "server", kind: "pipe", dependsOn: "none" }],
  scenarios: [
    {
      id: "call",
      title: "A call",
      steps: [
        {
          ...step,
          id: "in",
          title: "In",
          body: "A call comes in.",
          flow: "request",
          path: ["call"],
        },
        {
          ...step,
          id: "out",
          title: "Out",
          body: "The answer goes back.",
          flow: "response",
          path: ["call"],
          reverse: true,
        },
      ],
    },
  ],
  actions: [],
  glossary: [],
};
/**
 * The same machine with a token whose path does not chain: the second route starts where
 * the first one started. No repair can tell which way was meant; the model must.
 */
export const invented: Blueprint = {
  ...valid,
  scenarios: valid.scenarios.map((scenario) => ({
    ...scenario,
    steps: scenario.steps.map((step) =>
      step.id === "in" ? { ...step, path: ["call", "call"] } : step,
    ),
  })),
};

export function answer(blueprint: unknown, stop: Answer["stop_reason"] = "end_turn"): Answer {
  return {
    content: [{ type: "text", text: JSON.stringify(blueprint), citations: null }],
    stop_reason: stop,
    usage: {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  };
}

/** A model that answers from a script, and keeps what it was sent. */
export function scripted(...answers: Answer[]) {
  const sent: Anthropic.Beta.BetaMessageParam[][] = [];
  const ask = async (messages: readonly Anthropic.Beta.BetaMessageParam[]) => {
    sent.push([...messages]);
    const next = answers.shift();
    if (!next) {
      throw new Error("asked once too often");
    }
    return next;
  };
  return { ask, sent };
}
