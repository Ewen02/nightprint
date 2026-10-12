import { Interactive, type InteractivitySchema, interpolate, useCurrentFrame } from "remotion";
import "../fonts";
import { flow, fonts, neutral, type, withAlpha } from "../theme";
import { clamp, Reveal, Typed } from "./motion";
import { SheetCorners } from "./SheetCorners";

type EndCardProps = {
  readonly lineOne: string;
  readonly lineTwo: string;
  readonly url: string;
  readonly footer: string;
};

const GRID = 64;

/** The last frames: the drawing sheet, the promise, the address. */
function EndCardInner({ lineOne, lineTwo, url, footer }: EndCardProps) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: withAlpha(neutral.bg, interpolate(frame, [0, 18], [0, 0.86], clamp)),
        }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1920 1080"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: interpolate(frame, [6, 30], [0, 0.55], clamp),
        }}
      >
        <defs>
          <pattern
            id="sheet-grid"
            width={GRID}
            height={GRID}
            patternUnits="userSpaceOnUse"
            x={0}
            y={28}
          >
            <path
              d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
              fill="none"
              stroke={neutral.lineStrong}
              strokeWidth={1}
            />
          </pattern>
          <radialGradient id="sheet-fade">
            <stop offset="0.35" stopColor="white" stopOpacity={1} />
            <stop offset="1" stopColor="white" stopOpacity={0} />
          </radialGradient>
          <mask id="sheet-mask">
            <rect width={1920} height={1080} fill="url(#sheet-fade)" />
          </mask>
        </defs>
        <rect width={1920} height={1080} fill="url(#sheet-grid)" mask="url(#sheet-mask)" />
      </svg>
      <SheetCorners at={6} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: type.kicker,
            letterSpacing: "0.2em",
            color: neutral.textSecondary,
            marginBottom: 28,
          }}
        >
          <Typed text="NIGHTPRINT" at={10} />
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: type.display,
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
            color: neutral.text,
          }}
        >
          <Reveal at={14} duration={16}>
            {lineOne}
          </Reveal>
          <Reveal at={20} duration={16}>
            {lineTwo}
          </Reveal>
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: 60,
            color: flow.request,
            marginTop: 56,
          }}
        >
          <Typed text={url} at={34} pace={1.2} caret />
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontWeight: 400,
            fontSize: type.caption,
            letterSpacing: "0.16em",
            color: neutral.textFaint,
            marginTop: 40,
            opacity: interpolate(frame, [48, 60], [0, 1], clamp),
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

const endCardSchema = {
  lineOne: { type: "string", default: "Software architecture,", description: "First line" },
  lineTwo: {
    type: "string",
    default: "drawn as machines you can run.",
    description: "Second line",
  },
  url: { type: "string", default: "nightprint.dev", description: "Address" },
  footer: {
    type: "string",
    default: "MCH-001 · HEXAGONAL ARCHITECTURE · ONE MACHINE A WEEK",
    description: "Footer",
  },
} as const satisfies InteractivitySchema;

export const EndCard = Interactive.withSchema({
  Component: EndCardInner,
  componentName: "EndCard",
  schema: endCardSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
