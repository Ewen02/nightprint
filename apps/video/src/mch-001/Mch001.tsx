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
const swap = clickNamed(timeline, "Swap Postgres for InMemory");
const imports = clickNamed(timeline, "Import Postgres in the core");
/** The step captions take over from the title at step 3. */
const STEPS_FROM = stepFrom(timeline, 3);
/** The end card covers the last frames of the footage. */
const END_FROM = timeline.footage.frames - 20;
const END_FRAMES = 104;
export const MCH001_FRAMES = END_FROM + END_FRAMES;

/**
 * MCH-001 for X and LinkedIn: an order through the hexagon, then the two what-if switches.
 * Every frame of the machine is the live site, captured by `scripts/capture.mjs`; the moments
 * below come from what that capture recorded, so a new capture keeps them in place.
 */
export function Mch001() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: neutral.bg }}>
      <Footage
        dir="footage/mch-001"
        footage={timeline.footage}
        camera={[
          // The whole page under the title, then the machine with its title block (the
          // cartouche, which cites the source), then over to the switches.
          [0, 960, 540, 1],
          [STEPS_FROM - 42, 960, 540, 1],
          [STEPS_FROM, 920, 480, 1.44],
          [swap.frame - 50, 935, 470, 1.5],
          [swap.frame - 32, 1050, 480, 1.5],
          [swap.frame - 14, 1234, 448, 1.4],
          [END_FROM, 1222, 452, 1.46],
        ]}
        style={{
          filter: `blur(${interpolate(frame, [END_FROM, END_FROM + 24], [0, 14], clamp)}px)`,
        }}
      >
        <Cursor
          path={[
            [swap.frame - 30, 1500, 960, 0],
            [swap.frame - 24, 1500, 960, 1],
            [swap.frame - 2, swap.at.x, swap.at.y, 1],
            [imports.frame - 24, swap.at.x, swap.at.y, 1],
            [imports.frame - 2, imports.at.x, imports.at.y, 1],
            [imports.frame + 24, imports.at.x, imports.at.y, 1],
            [imports.frame + 44, imports.at.x + 60, imports.at.y + 220, 0],
          ]}
          presses={[
            { frame: swap.frame, ...swap.at, colour: flow.write },
            { frame: imports.frame, ...imports.at, colour: flow.error },
          ]}
        />
      </Footage>
      <TitleCard
        name="Title"
        from={0}
        durationInFrames={84}
        premountFor={fps}
        kicker="NIGHTPRINT · MCH-001"
        lineOne="Hexagonal architecture,"
        lineTwo="as a machine you can run."
        outAt={64}
      />
      <StepCaption
        name="Steps"
        from={STEPS_FROM}
        durationInFrames={swap.frame - 24 - STEPS_FROM}
        premountFor={fps}
        steps={timeline.steps.map((step) => ({ ...step, from: step.from - STEPS_FROM }))}
        stepFrames={42}
        outAt={swap.frame - 38 - STEPS_FROM}
      />
      <WhatIfCard
        name="What if: swap"
        from={swap.frame - 16}
        durationInFrames={104}
        premountFor={fps}
        action={swap.name}
        result="The core does not change."
        tone="write"
        clickAt={16}
        resultAt={50}
        outAt={90}
      />
      <WhatIfCard
        name="What if: import"
        from={imports.frame - 16}
        durationInFrames={120}
        premountFor={fps}
        action={imports.name}
        result="Now the swap breaks the core."
        tone="error"
        clickAt={16}
        resultAt={44}
        outAt={104}
      />
      <ViolationFrame
        name="Violation"
        from={imports.frame + 8}
        durationInFrames={100}
        premountFor={fps}
        outAt={88}
      />
      <EndCard
        name="End card"
        from={END_FROM}
        durationInFrames={END_FRAMES}
        premountFor={fps}
        lineOne="Software architecture,"
        lineTwo="drawn as machines you can run."
        url="nightprint.dev"
        footer="MCH-001 · HEXAGONAL ARCHITECTURE · ONE MACHINE A WEEK"
      />
    </AbsoluteFill>
  );
}
