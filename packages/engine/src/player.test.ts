import { describe, expect, it, vi } from "vitest";
import { defineMachine } from "./define";
import { fixture, fixtureInput } from "./fixture.test-helper";
import { createPlayer, FIXED_STEP_MS } from "./player";

describe("player", () => {
  it("starts paused on the first step", () => {
    const player = createPlayer(fixture);
    const snap = player.getSnapshot();
    expect(snap.state.stepIndex).toBe(0);
    expect(snap.state.mode).toBe("paused");
    expect(snap.stepCount).toBe(4);
  });

  it("plays the whole scenario then stops", () => {
    const p2 = createPlayer(fixture);
    p2.dispatch({ type: "play" });
    for (let t = 0; t < 3200; t += FIXED_STEP_MS) p2.advance(FIXED_STEP_MS);
    const snap = p2.getSnapshot();
    expect(snap.state.stepIndex).toBe(3);
    expect(snap.state.mode).toBe("paused");
    expect(snap.finished).toBe(true);
  });

  it("is deterministic whatever the frame rate", () => {
    const run = (frames: number[]) => {
      const p = createPlayer(fixture, { mode: "playing" });
      for (const dt of frames) p.advance(dt);
      return p.getState();
    };
    const at60 = run(Array.from({ length: 90 }, () => 1000 / 60));
    const at144 = run(Array.from({ length: 216 }, () => 1000 / 144));
    const jittery = run([
      7, 33, 16, 41, 3, 150, 12, 8, 60, 120, 50, 100, 150, 150, 100, 150, 100, 150, 100,
    ]);
    expect(at144).toEqual(at60);
    expect(jittery).toEqual(at60);
  });

  it("drops time instead of catching up after a long frame", () => {
    const p = createPlayer(fixture, { mode: "playing" });
    p.advance(10_000);
    expect(p.getState().stepIndex).toBe(0);
    expect(p.getState().ticks).toBe(10);
  });

  it("plays one step at a time with next", () => {
    const p = createPlayer(fixture);
    p.dispatch({ type: "next" });
    expect(p.getState()).toMatchObject({ stepIndex: 1, ticks: 0, mode: "stepping" });
    for (let i = 0; i < 70; i++) p.advance(FIXED_STEP_MS);
    expect(p.getState()).toMatchObject({ stepIndex: 1, ticks: 60, mode: "paused" });
  });

  it("replays from the start when play is pressed at the end", () => {
    const p = createPlayer(fixture);
    p.dispatch({ type: "seek", step: 3 });
    for (let i = 0; i < 40; i++) p.advance(FIXED_STEP_MS);
    expect(p.getSnapshot().finished).toBe(true);
    p.dispatch({ type: "play" });
    expect(p.getState()).toMatchObject({ stepIndex: 0, ticks: 0, mode: "playing" });
  });

  it("re-resolves the scenario when an action changes", () => {
    const p = createPlayer(fixture);
    p.dispatch({ type: "seek", step: 2 });
    expect(p.getSnapshot().step.step.id).toBe("to-c");
    p.dispatch({ type: "setAction", action: "swap", active: true });
    expect(p.getSnapshot().step.step.id).toBe("to-d");
    expect(p.getSnapshot().log.at(-1)?.text).toBe("saved in d");
  });

  it("notifies only on discrete changes", () => {
    const p = createPlayer(fixture);
    const listener = vi.fn();
    p.subscribe(listener);
    p.dispatch({ type: "next" });
    expect(listener).toHaveBeenCalledTimes(1);
    const before = p.getSnapshot();
    p.advance(FIXED_STEP_MS * 5);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(p.getSnapshot()).toBe(before);
  });

  it("moves tokens along their route with easing", () => {
    const p = createPlayer(fixture);
    p.dispatch({ type: "seek", step: 1 });
    expect(p.sample().tokens[0]?.position).toEqual([0, 0, 0]);
    for (let i = 0; i < 30; i++) p.advance(FIXED_STEP_MS);
    const mid = p.sample();
    expect(mid.progress).toBeCloseTo(0.5, 5);
    expect(mid.tokens[0]?.position[0]).toBeCloseTo(1.5, 5);
  });

  it("interpolates between fixed steps", () => {
    const p = createPlayer(fixture);
    p.dispatch({ type: "seek", step: 1 });
    p.advance(FIXED_STEP_MS * 10);
    const a = p.sample().progress;
    p.advance(FIXED_STEP_MS / 2);
    const b = p.sample().progress;
    expect(b).toBeGreaterThan(a);
    expect(b).toBeCloseTo(10.5 / 60, 5);
  });

  it("keeps its clock running while the scenario waits, and never turns it back", () => {
    const p = createPlayer(fixture);
    p.dispatch({ type: "next" });
    // The step plays, then pauses at its end: progress stops, the clock does not.
    for (let i = 0; i < 90; i++) p.advance(FIXED_STEP_MS);
    expect(p.getState().mode).toBe("paused");
    expect(p.sample().progress).toBe(1);
    expect(p.sample().clock).toBeCloseTo(1.5, 5);
    p.advance(FIXED_STEP_MS / 2);
    const before = p.sample().clock;
    p.dispatch({ type: "prev" });
    expect(p.sample().clock).toBe(before);
    // Time dropped in the background is dropped from the clock too.
    p.advance(60_000);
    expect(p.sample().clock).toBeCloseTo(before + (10 * FIXED_STEP_MS) / 1000, 5);
  });

  it("switches scenario from its first step and plays it", () => {
    const machine = defineMachine({
      ...fixtureInput,
      scenarios: [
        ...fixtureInput.scenarios,
        { id: "other", title: "Other", steps: [{ id: "o1", title: "Only", body: "Once." }] },
      ],
    });
    const p = createPlayer(machine);
    p.dispatch({ type: "seek", step: 2 });
    p.dispatch({ type: "setScenario", scenario: "other" });
    expect(p.getState()).toMatchObject({
      scenarioId: "other",
      stepIndex: 0,
      ticks: 0,
      mode: "playing",
    });
    expect(p.getSnapshot().step.step.id).toBe("o1");
  });

  it("holds each step long enough to read it at the reading pace", () => {
    // "Arrive" + "At a." is 3 words: 250 ms + 3 × 150 ms = 700 ms = 42 ticks,
    // longer than the step's own 500 ms animation.
    const p = createPlayer(fixture, { pace: "reading" });
    p.dispatch({ type: "play" });
    for (let i = 0; i < 41; i++) p.advance(FIXED_STEP_MS);
    expect(p.getState().stepIndex).toBe(0);
    expect(p.sample().progress).toBe(1);
    p.advance(FIXED_STEP_MS);
    expect(p.getState()).toMatchObject({ stepIndex: 1, ticks: 0, mode: "playing" });
  });

  it("does not hold a step played on its own, whatever the pace", () => {
    const p = createPlayer(fixture, { pace: "reading" });
    p.dispatch({ type: "next" });
    for (let i = 0; i < 70; i++) p.advance(FIXED_STEP_MS);
    expect(p.getState()).toMatchObject({ stepIndex: 1, ticks: 60, mode: "paused" });
  });

  it("jumps to the end of each step with reduced motion", () => {
    const p = createPlayer(fixture, { reducedMotion: true });
    p.dispatch({ type: "next" });
    expect(p.getState().mode).toBe("paused");
    expect(p.sample().tokens[0]?.position).toEqual([3, 0, 0]);
  });
});
