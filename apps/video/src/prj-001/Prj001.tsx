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
const stage = clickNamed(timeline, "Play a step on the stage");
const cycle = clickNamed(timeline, "Import the scene in the engine");
/** The step captions take over from the title at step 2. */
const STEPS_FROM = stepFrom(timeline, 2);
/** "The engine imports the scene": the import the code does not have, drawn. */
const VIOLATION =
  timeline.steps.find((s) => s.title === "The engine imports the scene")?.from ?? cycle.frame;
/** The end card covers the last frames of the footage. */
const END_FROM = timeline.footage.frames - 20;
const END_FRAMES = 104;
export const PRJ001_FRAMES = END_FROM + END_FRAMES;

/**
 * PRJ-001 for X and LinkedIn: Nightprint drawn from its own repository. A machine page is
 * built and run through the site's real packages, then the what-if no one would merge: the
 * engine importing the scene, a cycle the drawing shows in vermilion. Every frame of the
 * machine is the live page; the moments come from the capture's timeline.
 */
export function Prj001() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: neutral.bg }}>
      <Footage
        dir="footage/prj-001"
        footage={timeline.footage}
        camera={[
          // The whole page under the title, then the machine while it runs, then wider to
          // take in the scenarios and the switches.
          [0, 960, 540, 1],
          [STEPS_FROM - 20, 960, 540, 1],
          [STEPS_FROM, 700, 600, 1.3],
          [stage.frame - 40, 702, 600, 1.3],
          [stage.frame - 14, 1010, 520, 1.08],
          [VIOLATION - 30, 1012, 520, 1.08],
          [VIOLATION, 760, 600, 1.25],
          [END_FROM, 762, 600, 1.26],
        ]}
        style={{
          filter: `blur(${interpolate(frame, [END_FROM, END_FROM + 24], [0, 14], clamp)}px)`,
        }}
      >
        <Cursor
          path={[
            [stage.frame - 30, 1500, 1060, 0],
            [stage.frame - 24, 1500, 1060, 1],
            [stage.frame - 2, stage.at.x, stage.at.y, 1],
            [cycle.frame - 2, cycle.at.x, cycle.at.y, 1],
            [cycle.frame + 24, cycle.at.x, cycle.at.y, 1],
            [cycle.frame + 44, cycle.at.x + 60, cycle.at.y - 160, 0],
          ]}
          presses={[
            { frame: stage.frame, ...stage.at, colour: neutral.text },
            { frame: cycle.frame, ...cycle.at, colour: flow.error },
          ]}
        />
      </Footage>
      <TitleCard
        name="Title"
        from={0}
        durationInFrames={84}
        premountFor={fps}
        kicker="NIGHTPRINT · PRJ-001"
        lineOne="Nightprint, drawn"
        lineTwo="from its own code."
        outAt={64}
      />
      <StepCaption
        name="Steps"
        from={STEPS_FROM}
        durationInFrames={stage.frame - 24 - STEPS_FROM}
        premountFor={fps}
        steps={timeline.steps
          .filter((step) => step.from < stage.frame)
          .map((step) => ({ ...step, from: step.from - STEPS_FROM }))}
        stepFrames={70}
        outAt={stage.frame - 38 - STEPS_FROM}
      />
      <WhatIfCard
        name="What if: a cycle"
        from={cycle.frame - 16}
        durationInFrames={END_FROM - cycle.frame + 16}
        premountFor={fps}
        action={cycle.name}
        result="The engine and the scene would form a cycle."
        tone="error"
        clickAt={16}
        resultAt={VIOLATION - cycle.frame + 16}
        outAt={END_FROM - cycle.frame + 2}
      />
      <ViolationFrame
        name="Violation"
        from={VIOLATION}
        durationInFrames={END_FROM - VIOLATION}
        premountFor={fps}
        outAt={END_FROM - VIOLATION - 12}
      />
      <EndCard
        name="End card"
        from={END_FROM}
        durationInFrames={END_FRAMES}
        premountFor={fps}
        lineOne="Your repository,"
        lineTwo="drawn as a machine you can run."
        url="nightprint.dev/import"
        footer="PRJ-001 · NIGHTPRINT · EVERY ROUTE STANDS ON AN IMPORT"
      />
    </AbsoluteFill>
  );
}
