import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import "../fonts";
import { Footage } from "../components/Footage";
import { clamp, settle } from "../components/motion";
import { flow, fonts, neutral, withAlpha } from "../theme";
import { clickNamed, readTimeline, stepAt } from "../timeline";
import capture from "./timeline.json";

const timeline = readTimeline(capture);
const budget = clickNamed(timeline, "Retry at one layer, within a budget");
/** The end card covers the last frames of the footage. */
const END_FROM = timeline.footage.frames - 20;
const END_FRAMES = 100;
/** How long the switch is said in full over the scene, before it settles on the step's line. */
const BANNER_FRAMES = 64;
export const FMD001_VERTICAL_FRAMES = END_FROM + END_FRAMES;

/** 9:16 for Reels and TikTok. The bottom 300 px are left to the apps' own captions and buttons. */
const WIDTH = 1080;
const SIDE = 72;
const HEADER_TOP = 110;
const CAPTION_TOP = 250;
const SCENE = { top: 500, height: 700 } as const;
/**
 * The site's camera leans toward each step's parts, so the crop holds them all, in page px: from
 * the shop app to the database's zone label, from the shoppers' label to the plate's near corner.
 */
const SCENE_CAMERA = { x: 690, y: 575, zoom: 1.13 } as const;
/** The load curve's panel on the site, in page px, and enlarged twice: the capture's sharpness. */
const PANEL_PAGE = { x: 1159, y: 72, width: 384, height: 190 } as const;
const PANEL_ZOOM = 2;
const PANEL = {
  top: 1230,
  width: PANEL_PAGE.width * PANEL_ZOOM,
  height: PANEL_PAGE.height * PANEL_ZOOM,
} as const;

/**
 * FMD-001, vertical, for a phone held upright: the retry storm up to the plateau that outlives
 * the slow query, then replayed with retries at one layer within a budget, and the load
 * coming back under capacity. Each step's one-line lead is the caption. Every frame of the
 * machine and the curve is the live site, cropped.
 */
export function Fmd001Vertical() {
  const frame = useCurrentFrame();
  const step = stepAt(timeline.steps, frame);
  const end = interpolate(frame, [END_FROM, END_FROM + 18], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: neutral.bg }}>
      <Header />
      {step && (
        <div
          key={`${step.number}:${step.title}`}
          style={{
            position: "absolute",
            top: CAPTION_TOP,
            left: SIDE,
            right: SIDE,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            opacity: interpolate(frame, [step.from, step.from + 10], [0, 1], clamp),
            translate: `0 ${interpolate(frame, [step.from, step.from + 12], [18, 0], { ...clamp, easing: settle })}px`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                fontFamily: fonts.mono,
                fontWeight: 500,
                fontSize: 28,
                letterSpacing: "0.14em",
                color: flow[step.flow],
              }}
            >
              STEP {step.number} / {step.count}
            </div>
            <SwitchOn from={budget.frame + BANNER_FRAMES - 12} />
          </div>
          <div
            style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 54, color: neutral.text }}
          >
            {step.title}
          </div>
          {step.lead && (
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 38,
                lineHeight: 1.3,
                color: neutral.textBody,
              }}
            >
              {step.lead}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: SCENE.top,
          left: 0,
          width: WIDTH,
          height: SCENE.height,
        }}
      >
        <Footage
          dir="footage/fmd-001-vertical"
          footage={timeline.footage}
          size={{ width: WIDTH, height: SCENE.height }}
          camera={[[0, SCENE_CAMERA.x, SCENE_CAMERA.y, SCENE_CAMERA.zoom]]}
        />
        {/*
          The legend's corner goes, the colours are told by the caption; the edges fade, the
          bottom one before the page's transport.
        */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: [
              `radial-gradient(ellipse 420px 200px at 0% 100%, ${neutral.bg} 78%, ${withAlpha(neutral.bg, 0)} 100%)`,
              `linear-gradient(to top, ${neutral.bg} 0px, ${withAlpha(neutral.bg, 0)} 64px)`,
              `linear-gradient(to bottom, ${neutral.bg} 0px, ${withAlpha(neutral.bg, 0)} 48px)`,
            ].join(", "),
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: PANEL.top,
          left: (WIDTH - PANEL.width) / 2,
          width: PANEL.width,
          height: PANEL.height,
        }}
      >
        <Footage
          dir="footage/fmd-001-vertical"
          footage={timeline.footage}
          size={{ width: PANEL.width, height: PANEL.height }}
          camera={[
            [
              0,
              PANEL_PAGE.x + PANEL_PAGE.width / 2,
              PANEL_PAGE.y + PANEL_PAGE.height / 2,
              PANEL_ZOOM,
            ],
          ]}
        />
      </div>
      <WhatIf from={budget.frame - 8} />
      <EndCard shown={end} />
    </AbsoluteFill>
  );
}

function Header() {
  return (
    <div
      style={{
        position: "absolute",
        top: HEADER_TOP,
        left: SIDE,
        right: SIDE,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 64, color: neutral.text }}>
        Retry storm
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 26,
          letterSpacing: "0.14em",
          color: neutral.textFaint,
        }}
      >
        FMD-001
      </div>
    </div>
  );
}

/**
 * The switch, said in words over the scene as it flips: the site's switches are out of this
 * crop. It leaves after a moment, so the scene is whole again while the fix plays.
 */
function WhatIf({ from }: { readonly from: number }) {
  const frame = useCurrentFrame();
  const to = from + BANNER_FRAMES;
  const shown = interpolate(frame, [from, from + 12, to - 12, to], [0, 1, 1, 0], clamp);
  if (shown === 0) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: SCENE.top + 24,
        left: SIDE,
        right: SIDE,
        padding: "22px 28px",
        border: `2px solid ${flow.write}`,
        background: neutral.bg,
        opacity: shown,
        translate: `0 ${interpolate(shown, [0, 1], [-16, 0])}px`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 26,
          letterSpacing: "0.14em",
          color: flow.write,
        }}
      >
        WHAT IF…
      </div>
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 40, color: neutral.text }}>
        Retry at one layer, within a budget
      </div>
    </div>
  );
}

/** The switch left on, beside the step: every step from here plays with the fix. */
function SwitchOn({ from }: { readonly from: number }) {
  const frame = useCurrentFrame();
  const shown = interpolate(frame, [from, from + 12], [0, 1], clamp);
  if (shown === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: shown }}>
      <div
        style={{
          position: "relative",
          width: 46,
          height: 26,
          borderRadius: 13,
          backgroundColor: flow.write,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: neutral.bg,
          }}
        />
      </div>
      <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 28, color: neutral.text }}>
        Retry at one layer, within a budget
      </div>
    </div>
  );
}

function EndCard({ shown }: { readonly shown: number }) {
  if (shown === 0) {
    return null;
  }
  return (
    <AbsoluteFill
      style={{
        backgroundColor: withAlpha(neutral.bg, 0.94 * shown),
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        opacity: shown,
        padding: SIDE,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 28,
          letterSpacing: "0.2em",
          color: neutral.textFaint,
        }}
      >
        NIGHTPRINT
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 600,
          fontSize: 76,
          lineHeight: 1.15,
          color: neutral.text,
        }}
      >
        Software architecture, drawn as machines you can run.
      </div>
      <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 52, color: flow.request }}>
        nightprint.dev
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 24,
          letterSpacing: "0.14em",
          color: neutral.textFaint,
        }}
      >
        FMD-001 · RETRY STORM · FAILURE MODES
      </div>
    </AbsoluteFill>
  );
}
