import { createPlayer, type Player, readingMs, scenarioOf } from "./player";
import { type ResolvedStep, resolveMachine } from "./resolve";
import type { Action, Machine } from "./schema";

/**
 * The film of a machine: the order a video plays it in, the same for every machine. The
 * machine is set down under its title, its first scenario plays at reading pace, then its first what-if
 * switch flips and the steps it changes play again, and the film closes on its end card.
 * The director only says when; the page draws each frame and the scene holds the
 * scenario until the machine is assembled, as on the stage.
 */

/** Frames a second, the rate a film is shot and encoded at. */
export const FILM_FPS = 30;

/** Seconds the title stays on screen at least, the machine set down or not: time to read it. */
const TITLE_S = 3;
/** Seconds at rest after a scenario, at least: the camera settles back on the whole machine. */
const REST_S = 1.5;
/** Seconds the flipped switch shows its change before the scenario plays it. */
const FLIP_S = 1.6;
/** Seconds it holds when it changes no step: the change on the machine is all there is. */
const FLIP_ONLY_S = 3.2;
/** Seconds of the end card. */
const END_S = 4.5;
/** Past this, the film goes to its end card: X takes a video of 140 s at most. */
const MAX_S = 130;
/** Frame times are sums of thirtieths: an act lasts its length give or take this. */
const EPSILON = 1e-6;

export type FilmAct = "assembly" | "scenario" | "rest" | "flip" | "end" | "over";

export interface FilmCue {
  readonly act: FilmAct;
  /** Seconds since the act began. */
  readonly since: number;
  /** The switch the film has flipped, and how long ago; null before it flips. */
  readonly flipped: { readonly action: string; readonly since: number } | null;
}

export interface FilmDirector {
  /** The film's own player: its scenario runs without touching the page's. */
  readonly player: Player;
  /** The what-if the film flips: the machine's first, if it has one. */
  readonly whatIf: Action | null;
  /**
   * What happens at `t` seconds from the first frame, before that frame is drawn: the
   * film dispatches to its player what it does then. `assembled`: the machine is set
   * down and its scenario runs.
   */
  cue(t: number, assembled: boolean): FilmCue;
}

/** The parts a step's tokens go through, for telling two versions of a step apart. */
function path(step: ResolvedStep | undefined): string {
  return (
    step?.tokens
      .map((token) => (token.kind === "travel" ? token.routes.join(">") : `@${token.part}`))
      .join("|") ?? ""
  );
}

/** The first step `action` changes in a scenario, or -1 when it changes none. */
function firstChangedStep(machine: Machine, scenarioId: string, action: string): number {
  const plain = scenarioOf(resolveMachine(machine, []), scenarioId).steps;
  const flipped = scenarioOf(resolveMachine(machine, [action]), scenarioId).steps;
  return flipped.findIndex(
    (step, i) => step.step !== plain[i]?.step || path(step) !== path(plain[i]),
  );
}

export function directFilm(machine: Machine): FilmDirector {
  const scenario = machine.scenarios[0]?.id ?? "";
  // Paused until the title has been read: the film, not the assembly, starts the scenario.
  const player = createPlayer(machine, { scenario, pace: "reading" });
  const whatIf = machine.actions[0] ?? null;
  const changed = whatIf ? firstChangedStep(machine, scenario, whatIf.id) : -1;
  let act: FilmAct = "assembly";
  let began = 0;
  let flippedAt: number | null = null;
  let rest = REST_S;
  const begin = (next: FilmAct, t: number) => {
    act = next;
    began = t;
  };

  return {
    player,
    whatIf,
    cue(t, assembled) {
      if (act !== "end" && act !== "over" && t >= MAX_S) {
        begin("end", t);
      }
      // Time into the act, rounded up by a hair so an act ends on the frame it should.
      const since = t - began + EPSILON;
      switch (act) {
        case "assembly":
          if (assembled && since >= TITLE_S) {
            player.dispatch({ type: "play" });
            begin("scenario", t);
          }
          break;
        case "scenario": {
          const snapshot = player.getSnapshot();
          if (snapshot.finished) {
            // The last step's caption stays on screen while the camera settles: time to read it.
            rest = Math.max(REST_S, readingMs(snapshot.step.step) / 1000);
            begin("rest", t);
          }
          break;
        }
        case "rest":
          if (since < rest) {
            break;
          }
          if (whatIf && flippedAt === null) {
            player.dispatch({ type: "setAction", action: whatIf.id, active: true });
            player.dispatch({ type: "seek", step: Math.max(changed, 0) });
            player.dispatch({ type: "pause" });
            flippedAt = t;
            begin("flip", t);
          } else {
            begin("end", t);
          }
          break;
        case "flip":
          if (changed < 0 && since >= FLIP_ONLY_S) {
            begin("end", t);
          } else if (changed >= 0 && since >= FLIP_S) {
            player.dispatch({ type: "play" });
            begin("scenario", t);
          }
          break;
        case "end":
          if (since >= END_S) {
            begin("over", t);
          }
          break;
        case "over":
          break;
      }
      return {
        act,
        since: t - began,
        flipped: whatIf && flippedAt !== null ? { action: whatIf.id, since: t - flippedAt } : null,
      };
    },
  };
}

/**
 * How long the film of `machine` runs when its assembly takes `assemblySeconds`: shot
 * without drawing, the way a page shoots it. For a progress bar before the first frame.
 */
export function filmSeconds(machine: Machine, assemblySeconds: number): number {
  const film = directFilm(machine);
  for (let frame = 0; ; frame++) {
    const t = frame / FILM_FPS;
    const assembled = t >= assemblySeconds;
    if (film.cue(t, assembled).act === "over") {
      return t;
    }
    if (assembled) {
      film.player.advance(1000 / FILM_FPS);
    }
  }
}
