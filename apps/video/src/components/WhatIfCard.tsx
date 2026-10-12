import {
  Easing,
  Interactive,
  type InteractivitySchema,
  interpolate,
  interpolateColors,
  useCurrentFrame,
} from "remotion";
import "../fonts";
import { type FlowName, flow, fonts, neutral, safe, type } from "../theme";
import { clamp, Reveal, Scrim } from "./motion";

type WhatIfCardProps = {
  /** The switch, named like the site: "Swap Postgres for InMemory". */
  readonly action: string;
  /** What flipping it shows. */
  readonly result: string;
  /** Flow colour of the result: write when the pattern holds, error when it breaks. */
  readonly tone: Extract<FlowName, "write" | "error">;
  /** Local frame of the click on the switch. */
  readonly clickAt: number;
  /** Local frame the result appears, once the machine has moved. */
  readonly resultAt: number;
  readonly outAt: number;
};

/** A what-if switch as a title: the action, its toggle flipping, then what the machine shows. */
function WhatIfCardInner({ action, result, tone, clickAt, resultAt, outAt }: WhatIfCardProps) {
  const frame = useCurrentFrame();
  const colour = flow[tone];
  const shown = interpolate(frame, [0, 10, outAt, outAt + 10], [0, 1, 1, 0], clamp);
  const on = interpolate(frame, [clickAt, clickAt + 6], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Scrim corner="top-left" opacity={shown} reach={0.5} />
      <div
        style={{
          position: "absolute",
          left: safe.x,
          top: safe.y,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          opacity: shown,
          translate: `0 ${interpolate(shown, [0, 1], [-20, 0])}px`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: type.kicker,
            letterSpacing: "0.14em",
            color: neutral.textSecondary,
          }}
        >
          WHAT IF…
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg aria-hidden="true" width={76} height={42} viewBox="0 0 76 42">
            <rect
              x={1.5}
              y={1.5}
              width={73}
              height={39}
              rx={19.5}
              fill={interpolateColors(on, [0, 1], [neutral.plate, colour])}
              stroke={interpolateColors(on, [0, 1], [neutral.frame, colour])}
              strokeWidth={3}
            />
            <circle cx={interpolate(on, [0, 1], [21, 55])} cy={21} r={13} fill={neutral.text} />
          </svg>
          <div
            style={{
              fontFamily: fonts.sans,
              fontWeight: 500,
              fontSize: 52,
              color: neutral.text,
              whiteSpace: "nowrap",
            }}
          >
            {action}
          </div>
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: type.headline,
            letterSpacing: "-0.01em",
            color: colour,
            whiteSpace: "nowrap",
          }}
        >
          <Reveal at={resultAt}>{result}</Reveal>
        </div>
      </div>
    </div>
  );
}

const whatIfCardSchema = {
  action: { type: "string", default: "Swap Postgres for InMemory", description: "Switch" },
  result: { type: "string", default: "The core does not change.", description: "Result" },
  clickAt: {
    type: "number",
    default: 16,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Click at (frame)",
  },
  resultAt: {
    type: "number",
    default: 40,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Result at (frame)",
  },
  outAt: {
    type: "number",
    default: 90,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Leaves at (frame)",
  },
} as const satisfies InteractivitySchema;

export const WhatIfCard = Interactive.withSchema({
  Component: WhatIfCardInner,
  componentName: "WhatIfCard",
  schema: whatIfCardSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
