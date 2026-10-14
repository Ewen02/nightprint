import { describe, expect, it } from "vitest";
import { ComposeError, compose } from "./compose";
import { answer, invented, options, scripted, survey, valid } from "./fixture.test-helper";

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
