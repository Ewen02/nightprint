import { Interactive, type InteractivitySchema, interpolate, useCurrentFrame } from "remotion";
import { flow } from "../theme";
import { clamp, settle } from "./motion";

type ViolationFrameProps = {
  readonly outAt: number;
};

const INSET = 18;

/** A vermilion line drawn around the frame while the pattern is broken. Errors only. */
function ViolationFrameInner({ outAt }: ViolationFrameProps) {
  const frame = useCurrentFrame();
  const drawn = interpolate(frame, [0, 22], [0, 1], { ...clamp, easing: settle });
  const pulse = 0.75 + 0.25 * Math.cos((frame / 30) * Math.PI);
  const shown = interpolate(frame, [outAt, outAt + 10], [1, 0], clamp);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1920 1080"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <rect
        x={INSET}
        y={INSET}
        width={1920 - 2 * INSET}
        height={1080 - 2 * INSET}
        fill="none"
        stroke={flow.error}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - drawn}
        opacity={pulse * shown}
      />
    </svg>
  );
}

const violationFrameSchema = {
  outAt: {
    type: "number",
    default: 90,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Leaves at (frame)",
  },
} as const satisfies InteractivitySchema;

export const ViolationFrame = Interactive.withSchema({
  Component: ViolationFrameInner,
  componentName: "ViolationFrame",
  schema: violationFrameSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
