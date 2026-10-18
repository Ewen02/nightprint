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
const behind = clickNamed(timeline, "Add lines behind the root");
/** The step captions take over from the title at step 2. */
const STEPS_FROM = stepFrom(timeline, 2);
/** "One line too many gets in": what the switch proves. */
const GETS_IN =
  timeline.steps.find((s) => s.title === "One line too many gets in")?.from ?? behind.frame;
/** The end card covers the last frames of the footage. */
const END_FROM = timeline.footage.frames - 20;
const END_FRAMES = 104;
export const MCH004_FRAMES = END_FROM + END_FRAMES;

/**
 * MCH-004 for X and LinkedIn: a line added through the order's root, which checks the
 * approved limit and then refuses one line too many; replayed with the lines written
 * behind the root, where the same line gets in. Every frame of the machine is the live
 * site; the moments come from the capture's timeline.
 */
export function Mch004() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: neutral.bg }}>
      <Footage
        dir="footage/mch-004"
        footage={timeline.footage}
        camera={[
          // The whole page under the title, then the machine and the code it runs, read
          // together, then wider to take in the switches.
          [0, 960, 540, 1],
          [STEPS_FROM - 20, 960, 540, 1],
          [STEPS_FROM, 805, 470, 1.29],
          [behind.frame - 50, 807, 470, 1.29],
          [behind.frame - 24, 1000, 500, 1.1],
          [END_FROM, 998, 502, 1.11],
        ]}
        style={{
          filter: `blur(${interpolate(frame, [END_FROM, END_FROM + 24], [0, 14], clamp)}px)`,
        }}
      >
        <Cursor
          path={[
            [behind.frame - 30, 1500, 1060, 0],
            [behind.frame - 24, 1500, 1060, 1],
            [behind.frame - 2, behind.at.x, behind.at.y, 1],
            [behind.frame + 24, behind.at.x, behind.at.y, 1],
            [behind.frame + 44, behind.at.x + 60, behind.at.y - 160, 0],
          ]}
          presses={[{ frame: behind.frame, ...behind.at, colour: flow.error }]}
        />
      </Footage>
      <TitleCard
        name="Title"
        from={0}
        durationInFrames={84}
        premountFor={fps}
        kicker="NIGHTPRINT · MCH-004"
        lineOne="Domain-driven design,"
        lineTwo="as a machine you can run."
        outAt={64}
      />
      <StepCaption
        name="Steps"
        from={STEPS_FROM}
        durationInFrames={behind.frame - 24 - STEPS_FROM}
        premountFor={fps}
        steps={timeline.steps.map((step) => ({ ...step, from: step.from - STEPS_FROM }))}
        stepFrames={70}
        outAt={behind.frame - 38 - STEPS_FROM}
      />
      <WhatIfCard
        name="What if: behind the root"
        from={behind.frame - 16}
        durationInFrames={END_FROM - behind.frame + 16}
        premountFor={fps}
        action={behind.name}
        result="1,050 € on a 1,000 € limit."
        tone="error"
        clickAt={16}
        resultAt={GETS_IN - behind.frame + 16}
        outAt={END_FROM - behind.frame + 2}
      />
      <ViolationFrame
        name="Violation"
        from={behind.frame + 8}
        durationInFrames={END_FROM - behind.frame - 8}
        premountFor={fps}
        outAt={END_FROM - behind.frame - 20}
      />
      <EndCard
        name="End card"
        from={END_FROM}
        durationInFrames={END_FRAMES}
        premountFor={fps}
        lineOne="Software architecture,"
        lineTwo="drawn as machines you can run."
        url="nightprint.dev"
        footer="MCH-004 · DOMAIN-DRIVEN DESIGN · ONE MACHINE A WEEK"
      />
    </AbsoluteFill>
  );
}
