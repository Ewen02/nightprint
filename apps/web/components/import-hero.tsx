"use client";

import { createPlayer } from "@nightprint/engine";
import { usePlayerSnapshot } from "@nightprint/scene/use-player";
import {
  Cartouche,
  DrawingSheet,
  FlowDot,
  MonoLabel,
  NextSheet,
  RepoForm,
  SheetHero,
  StepRuler,
} from "@nightprint/ui";
import { useEffect, useRef, useState } from "react";
import { machineBySlug } from "./home/machine-by-slug";
import { cartoucheProps, stageLabel } from "./machine-view-model";
import { Stage } from "./stage";
import { stageCallouts } from "./stage-callouts";
import { useMediaQuery } from "./use-media-query";
import { prefersReducedMotion, useReducedMotion } from "./use-reduced-motion";

/** The real project the import page runs while a visitor types: Nightprint, drawn from its code. */
export const SAMPLE_PROJECT = "nightprint";

const WIDE = "(min-width: 1024px)";
/** Room between the intro and the machine, in px. */
const GUTTER = 48;
/** Room the zone labels need past the plate's right corner, from wide screens up, in px. */
const LABEL_ROOM = 72;
/** Room the step ruler takes along the top of the sheet, in px. */
const RULER_ROOM = 44;
/** How long the machine rests at the end of its scenario before it starts over, in ms. */
const REST_MS = 2400;

/** "https://github.com/owner/name.git" → "owner/name", for the title block only. */
function lettered(value: string): string {
  return value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

export interface ImportHeroProps {
  readonly repo: string;
  readonly onRepoChange: (value: string) => void;
  readonly onSubmit: () => void;
  /** Why the last drawing did not happen. */
  readonly error?: string | undefined;
}

/**
 * The import page's first screen: a drawing sheet with PRJ-001 running on it, the form on
 * its left margin, and beside the project's title block the one the visitor's repository
 * will get, lettered as it is typed.
 */
export function ImportHero({ repo, onRepoChange, onSubmit, error }: ImportHeroProps) {
  const [machine] = useState(() => machineBySlug(SAMPLE_PROJECT));
  const [player] = useState(() => createPlayer(machine, { pace: "reading" }));
  const snapshot = usePlayerSnapshot(player);
  useReducedMotion(player);
  const wide = useMediaQuery(WIDE);
  const intro = useRef<HTMLDivElement>(null);
  const [inset, setInset] = useState(0);

  // The machine plays on its own, and starts over after a rest at the end.
  useEffect(() => {
    if (!prefersReducedMotion()) {
      player.dispatch({ type: "play" });
    }
  }, [player]);
  useEffect(() => {
    if (!snapshot.finished || prefersReducedMotion()) {
      return;
    }
    const timer = window.setTimeout(() => player.dispatch({ type: "play" }), REST_MS);
    return () => window.clearTimeout(timer);
  }, [player, snapshot.finished]);

  // From wide screens up the intro covers the sheet's left margin: the machine is framed beside it.
  useEffect(() => {
    const measure = () => {
      const element = intro.current;
      setInset(
        element && window.matchMedia(WIDE).matches
          ? Math.round(element.getBoundingClientRect().right + GUTTER)
          : 0,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { scenario, state, step } = snapshot;
  const next = (
    <NextSheet
      heading="Next on the board"
      title={lettered(repo)}
      placeholder="owner/name"
      cells={[
        { term: "Code", value: "PRJ-000" },
        { term: "Scale", value: "NTS" },
        { term: "Checked", value: "Not yet" },
      ]}
    />
  );

  return (
    <SheetHero
      label="Draw a repository"
      introRef={intro}
      intro={
        <>
          <MonoLabel flow="request" className="flex items-center gap-2.5">
            <FlowDot flow="request" />
            {`${machine.code} is running`}
          </MonoLabel>
          <h1 className="text-title sm:text-display lg:text-hero">Draw your repository.</h1>
          <p className="max-w-120 text-body text-text-muted">
            Paste a public JavaScript or TypeScript repository. It comes back as a machine like this
            one, drawn from its own code, with a link you can share. Every route between two parts
            stands on an import.
          </p>
          <RepoForm
            value={repo}
            onChange={onRepoChange}
            onSubmit={onSubmit}
            label="GitHub repository"
            placeholder="owner/name or https://github.com/owner/name"
            action="Draw it"
            describedBy="import-status"
          />
          <div id="import-status" role="status" aria-live="polite">
            {error ? (
              <p className="text-small text-flow-error">{error}</p>
            ) : (
              <p className="mono-label text-text-faint">
                About 2 min · JavaScript and TypeScript · public repositories
              </p>
            )}
          </div>
        </>
      }
      sheet={
        <DrawingSheet
          ruler={
            <StepRuler
              steps={scenario.steps.map((s) => ({ key: s.step.id, flow: s.flow }))}
              current={state.stepIndex}
            />
          }
          cartouche={
            <div className="flex items-end gap-2.5">
              {next}
              <Cartouche {...cartoucheProps(machine)} />
            </div>
          }
          stage={
            <Stage
              player={player}
              label={stageLabel(snapshot)}
              callouts={stageCallouts(snapshot, null, null, wide ? 2 : 1)}
              camera="overview"
              insetLeft={inset}
              insetRight={wide ? LABEL_ROOM : 0}
              insetTop={RULER_ROOM}
            />
          }
        />
      }
      caption={
        <div className="flex flex-col gap-1.5">
          <MonoLabel flow={step.flow}>
            {`Step ${state.stepIndex + 1} / ${scenario.steps.length} · ${scenario.title}`}
          </MonoLabel>
          <p className="text-small text-text-body">{step.step.title}</p>
        </div>
      }
      aside={next}
    />
  );
}
