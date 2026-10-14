import { describe, expect, it } from "vitest";
import { ComposeError, compose, type Listen } from "./compose";
import { answer, invented, options, scripted, survey, valid } from "./fixture.test-helper";

describe("compose", () => {
  it("hands each part over as soon as the streaming answer has written it whole", async () => {
    const text = JSON.stringify(valid);
    const seen: { answer: number; label: string; at: number }[] = [];
    let streamed = 0;
    const ask = async (_messages: unknown, listen?: Listen) => {
      // The answer arrives in small pieces, as the model writes it.
      for (let i = 0; i < text.length; i += 7) {
        streamed = i;
        listen?.text?.(text.slice(i, i + 7));
      }
      return answer(valid);
    };
    await compose(survey, options, ask, {
      part: (n, part) => seen.push({ answer: n, label: part.label, at: streamed }),
    });
    expect(seen.map((p) => [p.answer, p.label])).toEqual([
      [1, "User"],
      [1, "Server"],
    ]);
    // The first part is handed over while the answer is still being written.
    expect(seen[0]?.at).toBeLessThan(text.indexOf('"leftOut"'));
  });

  it("shares what the model weighs while it thinks, a whole sentence at a time", async () => {
    const said: string[] = [];
    const ask = async (_messages: unknown, listen?: Listen) => {
      listen?.thinking?.("The web app imports the dom");
      listen?.thinking?.("ain, so the domain is the core. Next I group");
      return answer(valid);
    };
    await compose(survey, options, ask, { musing: (_n, sentence) => said.push(sentence) });
    expect(said).toEqual(["The web app imports the domain, so the domain is the core."]);
  });

  it("says when each answer starts and why one went back", async () => {
    const model = scripted(answer(invented), answer(valid));
    const said: string[] = [];
    await compose(survey, options, model.ask, {
      answer: (n) => said.push(`answer ${n}`),
      rejected: (n, issues) => said.push(`rejected ${n}: ${issues.length}`),
    });
    expect(said).toEqual(["answer 1", "rejected 1: 1", "answer 2"]);
  });

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
      'step "in": "call" starts at "user", not where "call" ends ("server")',
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
    await expect(failure).rejects.toMatchObject({
      issues: [expect.stringContaining('"call" starts at "user"')],
    });
  });

  it("stops at once when the model declines", async () => {
    const model = scripted(answer(valid, "refusal"));
    await expect(compose(survey, options, model.ask)).rejects.toThrow(/declined/);
  });
});
