import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../components/Cursor";
import { EndCard } from "../components/EndCard";
import { Footage } from "../components/Footage";
import { clamp } from "../components/motion";
import { StepCaption } from "../components/StepCaption";
import { TitleCard } from "../components/TitleCard";
import { ViolationFrame } from "../components/ViolationFrame";
import { WhatIfCard } from "../components/WhatIfCard";
import { flow, neutral } from "../theme";
import { clickNamed, readTimeline, stepFrom } from "../timeline";
import capture from "./timeline.json";

const timeline = readTimeline(capture);
const hot = clickNamed(timeline, "Expire a hot key under load");
/** The step captions take over from the title at step 2. */
const STEPS_FROM = stepFrom(timeline, 2);
/** "50 identical queries": what the switch proves. */
const STAMPEDE = timeline.steps.find((s) => s.title === "50 identical queries")?.from ?? hot.frame;
/** The end card covers the last frames of the footage. */
const END_FROM = timeline.footage.frames - 20;
const END_FRAMES = 104;
export const MCH003_FRAMES = END_FROM + END_FRAMES;

/**
 * MCH-003 for X and LinkedIn: a read through cache-aside (miss, load, cache for 60 s, hit),
 * then a hot key expiring under load, replayed from the miss: 50 requests, 50 queries.
 * Every frame of the machine is the live site; the moments come from the capture's timeline.
 */
export function Mch003() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: neutral.bg }}>
      <Footage
        dir="footage/mch-003"
        footage={timeline.footage}
        camera={[
          // The whole page under the title, then the machine and the code it runs, read
          // together, then wider to take in the switches.
          [0, 960, 540, 1],
          [STEPS_FROM - 20, 960, 540, 1],
          [STEPS_FROM, 805, 470, 1.29],
          [hot.frame - 50, 807, 470, 1.29],
          [hot.frame - 24, 1000, 500, 1.1],
          [END_FROM, 998, 502, 1.11],
        ]}
        style={{
          filter: `blur(${interpolate(frame, [END_FROM, END_FROM + 24], [0, 14], clamp)}px)`,
        }}
      >
        <Cursor
          path={[
            [hot.frame - 30, 1500, 1060, 0],
            [hot.frame - 24, 1500, 1060, 1],
            [hot.frame - 2, hot.at.x, hot.at.y, 1],
            [hot.frame + 24, hot.at.x, hot.at.y, 1],
            [hot.frame + 44, hot.at.x + 60, hot.at.y - 160, 0],
          ]}
          presses={[{ frame: hot.frame, ...hot.at, colour: flow.error }]}
        />
      </Footage>
      <TitleCard
        name="Title"
        from={0}
        durationInFrames={84}
        premountFor={fps}
        kicker="NIGHTPRINT · MCH-003"
        lineOne="Redis cache-aside,"
        lineTwo="as a machine you can run."
        outAt={64}
      />
      <StepCaption
        name="Steps"
        from={STEPS_FROM}
        durationInFrames={hot.frame - 24 - STEPS_FROM}
        premountFor={fps}
        steps={timeline.steps.map((step) => ({ ...step, from: step.from - STEPS_FROM }))}
        stepFrames={70}
        outAt={hot.frame - 38 - STEPS_FROM}
      />
      <WhatIfCard
        name="What if: hot key"
        from={hot.frame - 16}
        durationInFrames={END_FROM - hot.frame + 16}
        premountFor={fps}
        action={hot.name}
        result="50 requests, 50 queries."
        tone="error"
        clickAt={16}
        resultAt={STAMPEDE - hot.frame + 16}
        outAt={END_FROM - hot.frame + 2}
      />
      <ViolationFrame
        name="Violation"
        from={hot.frame + 8}
        durationInFrames={END_FROM - hot.frame - 8}
        premountFor={fps}
        outAt={END_FROM - hot.frame - 20}
      />
      <EndCard
        name="End card"
        from={END_FROM}
        durationInFrames={END_FRAMES}
        premountFor={fps}
        lineOne="Software architecture,"
        lineTwo="drawn as machines you can run."
        url="nightprint.dev"
        footer="MCH-003 · REDIS CACHE-ASIDE · ONE MACHINE A WEEK"
      />
    </AbsoluteFill>
  );
}
