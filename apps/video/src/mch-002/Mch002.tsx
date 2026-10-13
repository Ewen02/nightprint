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
const freeze = clickNamed(timeline, "Chain microtasks forever");
const unfreeze = clickNamed(timeline, "Chain microtasks forever", 1);
const timeouts = clickNamed(timeline, "Chain timeouts forever");
/** The step captions take over from the title at step 2. */
const STEPS_FROM = stepFrom(timeline, 2);
/** "The page freezes" and "A frame, when one is due": what each switch proves. */
const FROZEN = timeline.steps.find((s) => s.title === "The page freezes")?.from ?? freeze.frame;
const FRAME =
  timeline.steps.find((s) => s.title === "A frame, when one is due")?.from ?? timeouts.frame;
/** The end card covers the last frames of the footage. */
const END_FROM = timeline.footage.frames - 20;
const END_FRAMES = 104;
export const MCH002_FRAMES = END_FROM + END_FRAMES;

/**
 * MCH-002 for X and LinkedIn: a script through the event loop (A, D, C, B), then the two
 * endless chains side by side: microtasks freeze the page, timeouts leave it alive. Every
 * frame of the machine is the live site; the moments come from the capture's timeline.
 */
export function Mch002() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: neutral.bg }}>
      <Footage
        dir="footage/mch-002"
        footage={timeline.footage}
        camera={[
          // The whole page under the title, then the machine and its listing, read
          // together while the script runs, then wider to take in the switches too.
          [0, 960, 540, 1],
          [STEPS_FROM - 20, 960, 540, 1],
          [STEPS_FROM, 850, 437, 1.36],
          [freeze.frame - 50, 852, 437, 1.36],
          [freeze.frame - 24, 1030, 440, 1.12],
          [END_FROM, 1028, 442, 1.13],
        ]}
        style={{
          filter: `blur(${interpolate(frame, [END_FROM, END_FROM + 24], [0, 14], clamp)}px)`,
        }}
      >
        <Cursor
          path={[
            [freeze.frame - 30, 1500, 960, 0],
            [freeze.frame - 24, 1500, 960, 1],
            [freeze.frame - 2, freeze.at.x, freeze.at.y, 1],
            [unfreeze.frame - 2, unfreeze.at.x, unfreeze.at.y, 1],
            [unfreeze.frame + 8, unfreeze.at.x, unfreeze.at.y, 1],
            [timeouts.frame - 2, timeouts.at.x, timeouts.at.y, 1],
            [timeouts.frame + 24, timeouts.at.x, timeouts.at.y, 1],
            [timeouts.frame + 44, timeouts.at.x + 60, timeouts.at.y + 220, 0],
          ]}
          presses={[
            { frame: freeze.frame, ...freeze.at, colour: flow.error },
            // Off again: no flow of its own.
            { frame: unfreeze.frame, ...unfreeze.at, colour: neutral.text },
            { frame: timeouts.frame, ...timeouts.at, colour: flow.write },
          ]}
        />
      </Footage>
      <TitleCard
        name="Title"
        from={0}
        durationInFrames={84}
        premountFor={fps}
        kicker="NIGHTPRINT · MCH-002"
        lineOne="The JavaScript event loop,"
        lineTwo="as a machine you can run."
        outAt={64}
      />
      <StepCaption
        name="Steps"
        from={STEPS_FROM}
        durationInFrames={freeze.frame - 24 - STEPS_FROM}
        premountFor={fps}
        steps={timeline.steps.map((step) => ({ ...step, from: step.from - STEPS_FROM }))}
        stepFrames={70}
        outAt={freeze.frame - 38 - STEPS_FROM}
      />
      <WhatIfCard
        name="What if: microtasks"
        from={freeze.frame - 16}
        durationInFrames={unfreeze.frame - freeze.frame + 4}
        premountFor={fps}
        action={freeze.name}
        result="The page freezes."
        tone="error"
        clickAt={16}
        resultAt={FROZEN - freeze.frame + 16}
        outAt={unfreeze.frame - freeze.frame - 8}
      />
      <ViolationFrame
        name="Violation"
        from={freeze.frame + 8}
        durationInFrames={unfreeze.frame - freeze.frame}
        premountFor={fps}
        outAt={unfreeze.frame - freeze.frame - 12}
      />
      <WhatIfCard
        name="What if: timeouts"
        from={timeouts.frame - 16}
        durationInFrames={END_FROM - timeouts.frame + 16}
        premountFor={fps}
        action={timeouts.name}
        result="The page stays responsive."
        tone="write"
        clickAt={16}
        resultAt={FRAME - timeouts.frame + 16}
        outAt={END_FROM - timeouts.frame + 2}
      />
      <EndCard
        name="End card"
        from={END_FROM}
        durationInFrames={END_FRAMES}
        premountFor={fps}
        lineOne="Software architecture,"
        lineTwo="drawn as machines you can run."
        url="nightprint.dev"
        footer="MCH-002 · JAVASCRIPT EVENT LOOP · ONE MACHINE A WEEK"
      />
    </AbsoluteFill>
  );
}
