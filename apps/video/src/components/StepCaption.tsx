import { Interactive, type InteractivitySchema, interpolate, useCurrentFrame } from "remotion";
import "../fonts";
import { flow, fonts, neutral, safe, type, withAlpha } from "../theme";
import { stepAt, type TimelineStep } from "../timeline";
import { clamp, Scrim, settle } from "./motion";

type StepCaptionProps = {
  /** The site's step captions, with `from` relative to this sequence. */
  readonly steps: readonly TimelineStep[];
  /** Frames a step's segment takes to fill: its animation on the site. */
  readonly stepFrames: number;
  readonly outAt: number;
};

const SWAP_FRAMES = 12;

/** The current step, large, with a ruler of all the steps: the site's transport, for a phone. */
function StepCaptionInner({ steps, stepFrames, outAt }: StepCaptionProps) {
  const frame = useCurrentFrame();
  const current = stepAt(steps, frame);
  if (!current) {
    return null;
  }
  // The caption it replaces, if that one was on screen in this sequence.
  const before = steps[steps.indexOf(current) - 1];
  const previous = before && before.from >= 0 ? before : undefined;
  const swap = interpolate(frame, [current.from, current.from + SWAP_FRAMES], [0, 1], {
    ...clamp,
    easing: settle,
  });
  const shown = interpolate(frame, [0, 10, outAt, outAt + 10], [0, 1, 1, 0], clamp);
  const fill = interpolate(frame, [current.from, current.from + stepFrames], [0, 1], clamp);
  const colourOf = (n: number) => {
    const step = steps.find((s) => s.number === n);
    return step ? flow[step.flow] : neutral.lineStrong;
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Scrim corner="bottom-left" opacity={shown} />
      <div
        style={{
          position: "absolute",
          left: safe.x,
          bottom: safe.y + 16,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          opacity: shown,
          translate: `0 ${interpolate(shown, [0, 1], [24, 0])}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontWeight: 500,
              fontSize: type.kicker,
              letterSpacing: "0.14em",
              color: flow[current.flow],
              minWidth: 210,
            }}
          >
            STEP {current.number} / {current.count}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: current.count }, (_, i) => {
              const n = i + 1;
              const done = n < current.number;
              const width = done ? 1 : n === current.number ? fill : 0;
              return (
                <div
                  key={n}
                  style={{
                    position: "relative",
                    width: 34,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: neutral.lineStrong,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${width * 100}%`,
                      backgroundColor: done ? withAlpha(colourOf(n), 0.7) : flow[current.flow],
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: "relative",
            height: type.headline * 1.2,
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: type.headline,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: neutral.text,
            whiteSpace: "nowrap",
          }}
        >
          {previous && swap < 1 && (
            <div
              style={{
                position: "absolute",
                opacity: 1 - swap,
                translate: `0 ${-swap * 40}%`,
              }}
            >
              {previous.title}
            </div>
          )}
          <div style={{ position: "absolute", opacity: swap, translate: `0 ${(1 - swap) * 40}%` }}>
            {current.title}
          </div>
        </div>
      </div>
    </div>
  );
}

const stepCaptionSchema = {
  stepFrames: {
    type: "number",
    default: 42,
    min: 1,
    step: 1,
    hiddenFromList: false,
    description: "Step fill (frames)",
  },
  outAt: {
    type: "number",
    default: 180,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Leaves at (frame)",
  },
} as const satisfies InteractivitySchema;

export const StepCaption = Interactive.withSchema({
  Component: StepCaptionInner,
  componentName: "StepCaption",
  schema: stepCaptionSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
