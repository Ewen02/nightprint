"use client";

import { getMachine } from "@nightprint/catalog";
import { createPlayer, type Player } from "@nightprint/engine";
import { usePlayerSnapshot } from "@nightprint/scene/use-player";
import {
  BillOfParts,
  Cartouche,
  CodeListing,
  EventLog,
  FlowLegend,
  MachineTemplate,
  NavLink,
  ScenarioPicker,
  SiteHeader,
  StageAction,
  Transport,
  WhatIfPanel,
} from "@nightprint/ui";
import { type ReactNode, useEffect, useState } from "react";
import { momentLink } from "./machine-link";
import {
  billOfPartsItems,
  cartoucheProps,
  drawsDependencies,
  eventLogEntries,
  flowLegend,
  hasAdapters,
  programListing,
  scenarioEnding,
  stageLabel,
  transportData,
  unplugNote,
  whatIfItems,
} from "./machine-view-model";
import { Stage } from "./stage";
import { stageCallouts } from "./stage-callouts";
import { useMediaQuery } from "./use-media-query";
import { useMomentLinks } from "./use-moment-links";
import { useOpeningMoment } from "./use-opening-moment";
import { useReducedMotion } from "./use-reduced-motion";

/** Room the title block takes over the stage, from wide screens up, in px. */
const TITLE_ROOM = 140;
/** Room the program listing takes on the stage's right, from wide screens up, in px. */
const LISTING_ROOM = 410;

const INTERACTIVE = "button, a, input, select, textarea, summary, [role='switch']";

/** ← → change step, space plays or pauses, unless a control has focus. */
function useTransportKeys(player: Player) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) {
        return;
      }
      if (event.key === "ArrowRight") {
        player.dispatch({ type: "next" });
      } else if (event.key === "ArrowLeft") {
        player.dispatch({ type: "prev" });
      } else if (event.key === " ") {
        event.preventDefault();
        player.dispatch({ type: "togglePlay" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player]);
}

/** The machine page: owns the player and feeds the UI organisms. */
export function MachineView({
  slug,
  after,
  footer,
}: {
  readonly slug: string;
  /** Sections under the machine: the concept, what comes next. */
  readonly after?: ReactNode;
  readonly footer?: ReactNode;
}) {
  const machine = getMachine(slug);
  if (!machine) {
    throw new Error(`Unknown machine "${slug}"`);
  }
  const [player] = useState(() => createPlayer(machine, { pace: "reading" }));
  const snapshot = usePlayerSnapshot(player);
  const wide = useMediaQuery("(min-width: 1024px)");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  // The exploded view holds the machine still; playing puts it back together.
  const [exploded, setExploded] = useState(false);
  const playing = snapshot.state.mode === "playing";
  useEffect(() => {
    if (playing) {
      setExploded(false);
    }
  }, [playing]);
  useReducedMotion(player);
  useTransportKeys(player);
  useOpeningMoment(player);
  useMomentLinks(player);
  const [shared, setShared] = useState<"no" | "copied" | "address">("no");
  useEffect(() => {
    if (shared === "no") {
      return;
    }
    const reset = window.setTimeout(() => setShared("no"), 2500);
    return () => window.clearTimeout(reset);
  }, [shared]);
  const share = () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const link = momentLink(base, player.getState(), machine);
    // Without clipboard access (refused, or not a secure context), the address bar holds the link.
    const toAddressBar = () => {
      window.history.replaceState(null, "", link);
      setShared("address");
    };
    if (!navigator.clipboard) {
      toAddressBar();
      return;
    }
    navigator.clipboard.writeText(link).then(() => setShared("copied"), toAddressBar);
  };

  const { resolved } = snapshot;
  const listing = programListing(snapshot);
  const unplug = hasAdapters(machine) && (
    <StageAction
      label={exploded ? "Plug them back" : "Unplug the adapters"}
      note={exploded ? unplugNote(snapshot) : undefined}
      onClick={() => {
        if (!exploded) {
          player.dispatch({ type: "pause" });
        }
        setExploded(!exploded);
      }}
    />
  );
  const inspected = resolved.parts.find((p) => p.id === selected);

  return (
    <MachineTemplate
      header={
        <SiteHeader
          breadcrumb={[{ label: "Nightprint", href: "/" }, { label: machine.code }]}
          meta={`${machine.family} · ${machine.category}`}
        />
      }
      title={machine.title}
      summary={machine.summary}
      titleAside={<NavLink href="#concept">Read the concept</NavLink>}
      stage={
        <Stage
          player={player}
          label={stageLabel(snapshot)}
          selected={selected}
          hovered={hovered}
          callouts={stageCallouts(snapshot, selected, hovered, wide ? 2 : 1)}
          onSelect={setSelected}
          onHover={setHovered}
          // From wide screens up, the title block sits over the stage's top left.
          insetTop={wide ? TITLE_ROOM : 0}
          // The listing stands on the stage's right: the machine is framed beside it.
          insetRight={wide && listing ? LISTING_ROOM : 0}
          exploded={exploded}
        />
      }
      tools={
        (listing || unplug) && (
          // The button first: it stays in view while the listing gives up height.
          <div className="flex min-h-0 flex-col items-end gap-3">
            {unplug}
            {listing && <CodeListing {...listing} />}
          </div>
        )
      }
      legend={
        <FlowLegend
          items={flowLegend(machine)}
          dependency={drawsDependencies(machine) ? "Depends on" : undefined}
          latency="Modelled, not measured"
          hint="Click a part · drag to turn · pinch to zoom"
        />
      }
      cartouche={<Cartouche {...cartoucheProps(machine)} />}
      transport={
        <Transport
          {...transportData(snapshot)}
          onPrev={() => player.dispatch({ type: "prev" })}
          onNext={() => player.dispatch({ type: "next" })}
          onTogglePlay={() => player.dispatch({ type: "togglePlay" })}
          onSeek={(index) => player.dispatch({ type: "seek", step: index })}
          ending={scenarioEnding(machine, snapshot)}
          onSuggestion={(id) => {
            const [kind, target = ""] = id.split(":");
            if (kind === "scenario") {
              player.dispatch({ type: "setScenario", scenario: target });
              return;
            }
            // Flip the switch, then watch the whole scenario again with it.
            player.dispatch({ type: "setAction", action: target, active: true });
            player.dispatch({ type: "seek", step: 0 });
            player.dispatch({ type: "play" });
          }}
          share={{
            label: { no: "Copy link", copied: "Link copied", address: "Link in address bar" }[
              shared
            ],
            status: {
              no: "",
              copied: "A link to this step is in your clipboard.",
              address: "The address bar now links to this step.",
            }[shared],
            onShare: share,
          }}
        />
      }
      aside={
        <>
          <ScenarioPicker
            scenarios={machine.scenarios.map((s) => ({ id: s.id, label: s.title }))}
            value={snapshot.state.scenarioId}
            onChange={(scenario) => player.dispatch({ type: "setScenario", scenario })}
          />
          <WhatIfPanel
            description="Flip one: the step replays with the change."
            actions={whatIfItems(machine, snapshot)}
            onToggle={(action, active) => player.dispatch({ type: "setAction", action, active })}
          />
          <BillOfParts
            description="Point at a row to find its part, click to read it."
            items={billOfPartsItems(snapshot)}
            selectedId={selected}
            hoveredId={hovered}
            onSelect={setSelected}
            onHover={setHovered}
            inspected={
              inspected?.description
                ? { label: inspected.label, description: inspected.description }
                : null
            }
          />
        </>
      }
      log={<EventLog entries={eventLogEntries(snapshot)} />}
      after={after}
      footer={footer}
    />
  );
}
