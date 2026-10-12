"use client";

import { createPlayer, type Player } from "@nightprint/engine";
import { usePlayerSnapshot } from "@nightprint/scene/use-player";
import {
  Cartouche,
  DrawingSheet,
  type StoryBeat,
  StoryNote,
  StoryTemplate,
  WhatIfSwitch,
} from "@nightprint/ui";
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { type StoryCase, type StoryMoment, storySteps, storyWhatIfs } from "../home-view-model";
import { cartoucheProps, stageLabel } from "../machine-view-model";
import { Stage } from "../stage";
import { stageCallouts } from "../stage-callouts";
import { prefersReducedMotion, useReducedMotion } from "../use-reduced-motion";
import { machineBySlug } from "./machine-by-slug";

const WIDE = "(min-width: 1024px)";
/** Room between the text and the machine, in px. */
const GUTTER = 48;
/** How long a machine left to run on its own rests before it starts over, in ms. */
const REST_MS = 2400;

/** Turns switches on or off until the machine has exactly these on. */
function setActions(player: Player, actions: readonly string[]) {
  const on = new Set(player.getState().actions);
  for (const { id } of player.machine.actions) {
    if (on.has(id) !== actions.includes(id)) {
      player.dispatch({ type: "setAction", action: id, active: actions.includes(id) });
    }
  }
}

/**
 * The beat read now: the one across the reading line. From wide screens up, the line
 * is the middle of the screen; on phones, the sheet holds the top, so it sits lower.
 */
function useReadBeat(column: RefObject<HTMLDivElement | null>): number {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const element = column.current;
    if (!element) {
      return;
    }
    const wide = window.matchMedia(WIDE);
    let observer: IntersectionObserver | null = null;
    const watch = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.target instanceof HTMLElement) {
              setBeat(Number(entry.target.dataset.beat ?? 0));
            }
          }
        },
        { rootMargin: wide.matches ? "-50% 0px -50% 0px" : "-52% 0px -48% 0px" },
      );
      for (const beatElement of element.querySelectorAll("[data-beat]")) {
        observer.observe(beatElement);
      }
    };
    watch();
    wide.addEventListener("change", watch);
    return () => {
      observer?.disconnect();
      wide.removeEventListener("change", watch);
    };
  }, [column]);
  return beat;
}

/** Room the text of this beat takes on the left of the sheet, in px; none on phones. */
function useInset(column: RefObject<HTMLDivElement | null>, beat: number): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const measure = () => {
      const element = column.current?.querySelector(`[data-beat="${beat}"]`);
      setInset(
        element && window.matchMedia(WIDE).matches
          ? Math.round(element.getBoundingClientRect().right + GUTTER)
          : 0,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [column, beat]);
  return inset;
}

export interface RunStoryProps {
  readonly slug: string;
  /** The first screen: the page's title and actions. The machine runs on its own. */
  readonly opening: ReactNode;
  /** What the steps are about, under its own heading, before the first one. */
  readonly intro: ReactNode;
  /** The "what if" notes after the run. */
  readonly cases: readonly StoryCase[];
  /** The last beat. The machine runs on its own again. */
  readonly closing: ReactNode;
}

/**
 * The home page's story: one machine on a drawing sheet that stays in view, and the
 * notes that scroll past it. The note being read sets the machine: its switches, and
 * the step it plays. Above and below the notes, the machine runs on its own.
 */
export function RunStory({ slug, opening, intro, cases, closing }: RunStoryProps) {
  const machine = useMemo(() => machineBySlug(slug), [slug]);
  const [player] = useState(() => createPlayer(machine, { pace: "reading" }));
  const snapshot = usePlayerSnapshot(player);
  useReducedMotion(player);

  const notes = useMemo(
    () => [...storySteps(machine), ...storyWhatIfs(machine, cases)],
    [machine, cases],
  );
  const column = useRef<HTMLDivElement>(null);
  const beat = useReadBeat(column);
  const inset = useInset(column, beat);
  // Two beats come before the notes: the opening and the intro.
  const first = 2;
  const moment: StoryMoment | null = notes[beat - first]?.moment ?? null;

  // The note being read plays its step, with its switches; before and after the notes,
  // the machine plays its scenario by itself, switches off.
  useEffect(() => {
    if (moment) {
      setActions(player, moment.actions);
      player.dispatch({ type: "seek", step: moment.step });
    } else {
      setActions(player, []);
      if (!prefersReducedMotion()) {
        player.dispatch({ type: "play" });
      }
    }
  }, [player, moment]);

  // Left to itself, the machine starts over after a rest at the end.
  const free = moment === null;
  useEffect(() => {
    if (!free || !snapshot.finished || prefersReducedMotion()) {
      return;
    }
    const timer = window.setTimeout(() => player.dispatch({ type: "play" }), REST_MS);
    return () => window.clearTimeout(timer);
  }, [player, free, snapshot.finished]);

  const steps: StoryBeat[] = notes.map(({ moment: _, switch: toggle, ...note }, index) => ({
    key: note.id,
    content: (
      <StoryNote {...note} active={beat === first + index}>
        {toggle && (
          <WhatIfSwitch
            label={toggle.label}
            description={toggle.description}
            tone={toggle.tone}
            on={snapshot.state.actions.includes(toggle.action)}
            onToggle={(on) =>
              player.dispatch({ type: "setAction", action: toggle.action, active: on })
            }
          />
        )}
      </StoryNote>
    ),
  }));

  return (
    <StoryTemplate
      id="run"
      label={`${machine.code} ${machine.title}, step by step`}
      columnRef={column}
      before={[
        { key: "opening", size: "opening", content: opening },
        { key: "intro", size: "intro", content: intro },
      ]}
      steps={steps}
      after={[{ key: "closing", content: closing }]}
      sheet={
        <DrawingSheet
          steps={snapshot.scenario.steps.map((s) => ({ key: s.step.id, flow: s.flow }))}
          current={snapshot.state.stepIndex}
          cartouche={<Cartouche {...cartoucheProps(machine)} />}
          stage={
            <Stage
              player={player}
              label={stageLabel(snapshot)}
              callouts={stageCallouts(snapshot)}
              camera={moment ? "follow" : "overview"}
              insetLeft={inset}
            />
          }
        />
      }
    />
  );
}
