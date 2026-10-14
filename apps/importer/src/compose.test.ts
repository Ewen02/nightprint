import type Anthropic from "@anthropic-ai/sdk";
import { type Blueprint, surveyRepo } from "@nightprint/blueprint";
import { describe, expect, it } from "vitest";
import { type Answer, ComposeError, compose } from "./compose";

/** A site and the domain it imports. */
const survey = surveyRepo({
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
});
const options = {
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
const valid: Blueprint = {
  title: "Tiny",
  summary: "A server and its rules.",
  family: "backend",
  article: ["The server calls the domain."],
  zones: [
    { id: "outside", label: "Outside", note: "Calls the server" },
    { id: "code", label: "Code", note: "The repository" },
  ],
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
/** The same machine with a route nothing in the code shows. */
const invented: Blueprint = {
  ...valid,
  routes: [
    ...valid.routes,
    { id: "made-up", from: "server", to: "user", kind: "pipe", dependsOn: "to" },
  ],
};

function answer(blueprint: unknown, stop: Answer["stop_reason"] = "end_turn"): Answer {
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
function scripted(...answers: Answer[]) {
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

describe("compose", () => {
  it("draws the first blueprint that keeps every rule", async () => {
    const model = scripted(answer(valid));
    const composed = await compose(survey, options, model.ask);
    expect(composed.attempts).toBe(1);
    expect(composed.machine.code).toBe("PRJ-999");
    expect(composed.usage).toEqual({
      inputTokens: 1000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 500,
    });
  });

  it("sends the rules a blueprint breaks back to the model, and draws its correction", async () => {
    const model = scripted(answer(invented), answer(valid));
    const composed = await compose(survey, options, model.ask);
    expect(composed.attempts).toBe(2);
    const feedback = model.sent[1]?.at(-1)?.content;
    expect(feedback).toContain(
      'route "made-up" comes from outside the code: its dependsOn is "none"',
    );
  });

  it("sends back an answer that does not match the schema", async () => {
    const model = scripted(answer({ title: "Tiny" }), answer(valid));
    expect((await compose(survey, options, model.ask)).attempts).toBe(2);
    expect(model.sent[1]?.at(-1)?.content).toContain("summary");
  });

  it("gives up after three answers, with what the last one still broke", async () => {
    const model = scripted(answer(invented), answer(invented), answer(invented));
    const failure = compose(survey, options, model.ask);
    await expect(failure).rejects.toBeInstanceOf(ComposeError);
    await expect(failure).rejects.toMatchObject({ issues: [expect.stringContaining("made-up")] });
  });

  it("stops at once when the model declines", async () => {
    const model = scripted(answer(valid, "refusal"));
    await expect(compose(survey, options, model.ask)).rejects.toThrow(/declined/);
  });
});
