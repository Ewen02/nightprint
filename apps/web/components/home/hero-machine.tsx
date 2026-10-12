"use client";

import { createPlayer } from "@nightprint/engine";
import { usePlayerSnapshot } from "@nightprint/scene/use-player";
import { Cartouche, MachineFigure, Transport } from "@nightprint/ui";
import { useState } from "react";
import { cartoucheProps, scenarioEnding, stageLabel, transportData } from "../machine-view-model";
import { Stage } from "../stage";
import { stageCallouts } from "../stage-callouts";
import { useAutoplay } from "../use-autoplay";
import { useReducedMotion } from "../use-reduced-motion";
import { machineBySlug } from "./machine-by-slug";

/** In the hero the end says what came out; the switches are on the machine's own page. */
function heroEnding(...args: Parameters<typeof scenarioEnding>) {
  const ending = scenarioEnding(...args);
  return ending && { ...ending, suggestions: [] };
}

/**
 * The machine in the hero, framed as a drawing sheet. It plays its scenario
 * once on arrival, unless the visitor asked for reduced motion. No keyboard
 * shortcuts here: on the home page, space scrolls.
 */
export function HeroMachine({ slug }: { readonly slug: string }) {
  const [player] = useState(() => createPlayer(machineBySlug(slug), { pace: "reading" }));
  const snapshot = usePlayerSnapshot(player);
  useReducedMotion(player);
  useAutoplay(player);

  return (
    <MachineFigure
      stage={
        <Stage
          player={player}
          label={stageLabel(snapshot)}
          callouts={stageCallouts(snapshot)}
          camera="overview"
        />
      }
      cartouche={<Cartouche {...cartoucheProps(player.machine)} />}
      transport={
        <Transport
          {...transportData(snapshot)}
          ending={heroEnding(player.machine, snapshot)}
          onPrev={() => player.dispatch({ type: "prev" })}
          onNext={() => player.dispatch({ type: "next" })}
          onTogglePlay={() => player.dispatch({ type: "togglePlay" })}
          onSeek={(index) => player.dispatch({ type: "seek", step: index })}
        />
      }
    />
  );
}
