import { Interactive, type InteractivitySchema, interpolate, useCurrentFrame } from "remotion";
import "../fonts";
import { flow, fonts, neutral, safe, type } from "../theme";
import { clamp, Reveal, Scrim, Typed } from "./motion";
import { SheetCorners } from "./SheetCorners";

type TitleCardProps = {
  readonly kicker: string;
  readonly lineOne: string;
  readonly lineTwo: string;
  /** Local frame the title starts leaving. */
  readonly outAt: number;
};

/** The opening title over the whole page: what this is, in two lines. */
function TitleCardInner({ kicker, lineOne, lineTwo, outAt }: TitleCardProps) {
  const frame = useCurrentFrame();
  const shown = interpolate(frame, [0, 8, outAt, outAt + 12], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Scrim corner="bottom-left" opacity={shown} reach={0.62} />
      <SheetCorners at={2} out={outAt} />
      <div
        style={{
          position: "absolute",
          left: safe.x,
          bottom: safe.y + 16,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: type.kicker,
            letterSpacing: "0.14em",
            color: flow.request,
            opacity: interpolate(frame, [outAt, outAt + 8], [1, 0], clamp),
          }}
        >
          <Typed text={kicker} at={4} />
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: 80,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            color: neutral.text,
          }}
        >
          <Reveal at={10} out={outAt}>
            {lineOne}
          </Reveal>
          <Reveal at={16} out={outAt + 3}>
            {lineTwo}
          </Reveal>
        </div>
      </div>
    </div>
  );
}

const titleCardSchema = {
  kicker: { type: "string", default: "NIGHTPRINT · MCH-001", description: "Kicker" },
  lineOne: { type: "string", default: "Hexagonal architecture,", description: "First line" },
  lineTwo: { type: "string", default: "as a machine you can run.", description: "Second line" },
  outAt: {
    type: "number",
    default: 70,
    min: 0,
    step: 1,
    hiddenFromList: false,
    description: "Leaves at (frame)",
  },
} as const satisfies InteractivitySchema;

export const TitleCard = Interactive.withSchema({
  Component: TitleCardInner,
  componentName: "TitleCard",
  schema: titleCardSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
