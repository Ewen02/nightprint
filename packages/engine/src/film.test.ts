import { describe, expect, it } from "vitest";
import { defineMachine } from "./define";
import { directFilm, FILM_FPS, type FilmAct, filmSeconds } from "./film";
import { fixture, fixtureInput } from "./fixture.test-helper";
import type { Machine } from "./schema";

/** Shoots a film as a page does: a cue, then the frame, the scenario held until assembled. */
function shoot(machine: Machine, assembledAt = 2) {
  const film = directFilm(machine);
  const acts: FilmAct[] = [];
  const states: { act: FilmAct; actions: readonly string[]; step: number }[] = [];
  for (let frame = 0; frame < FILM_FPS * 300; frame++) {
    const t = frame / FILM_FPS;
    const cue = film.cue(t, t >= assembledAt);
    if (acts.at(-1) !== cue.act) {
      acts.push(cue.act);
      const state = film.player.getState();
      states.push({ act: cue.act, actions: state.actions, step: state.stepIndex });
    }
    if (cue.act === "over") {
      return { acts, states, seconds: t };
    }
    if (t >= assembledAt) {
      film.player.advance(1000 / FILM_FPS);
    }
  }
  throw new Error("the film never ends");
}

/** The fixture with only these what-ifs, and the steps the others decide left out. */
const withActions = (ids: readonly string[]) =>
  defineMachine({
    ...fixtureInput,
    scenarios: fixtureInput.scenarios.map((scenario) => ({
      ...scenario,
      steps: scenario.steps
        .filter((step) => !("when" in step) || step.when?.none?.includes("swap"))
        .map((step) => ({ ...step, when: undefined })),
    })),
    actions: fixtureInput.actions.filter((a) => ids.includes(a.id)),
  });

describe("film", () => {
  it("plays the first scenario, then flips the first what-if and plays the steps it changes", () => {
    const { acts, states } = shoot(fixture);
    expect(acts).toEqual([
      "assembly",
      "scenario",
      "rest",
      "flip",
      "scenario",
      "rest",
      "end",
      "over",
    ]);
    const flip = states.find((s) => s.act === "flip");
    // "swap" first changes the third step: d takes the place of c.
    expect(flip).toMatchObject({ actions: ["swap"], step: 2 });
  });

  it("holds a what-if that changes no step, then ends: its change is all there is to see", () => {
    const { acts } = shoot(withActions(["noop"]));
    expect(acts).toEqual(["assembly", "scenario", "rest", "flip", "end", "over"]);
  });

  it("ends after the scenario when the machine has no what-if", () => {
    const { acts } = shoot(withActions([]));
    expect(acts).toEqual(["assembly", "scenario", "rest", "end", "over"]);
  });

  it("waits for the assembly, so a longer one only delays it", () => {
    const short = shoot(fixture, 4);
    const long = shoot(fixture, 6);
    expect(long.seconds - short.seconds).toBeCloseTo(2, 5);
    expect(long.acts).toEqual(short.acts);
  });

  it("keeps its title on screen three seconds, however quick the assembly", () => {
    const film = directFilm(fixture);
    const start = Array.from({ length: FILM_FPS * 5 }, (_, frame) => frame / FILM_FPS).find(
      (t) => film.cue(t, true).act === "scenario",
    );
    expect(start).toBeCloseTo(3, 5);
    expect(film.player.getState().mode).toBe("playing");
  });

  it("knows its length before it is shot", () => {
    expect(filmSeconds(fixture, 2)).toBeCloseTo(shoot(fixture, 2).seconds, 5);
  });
});
