import { type FlowName, flow as flowColour, neutral } from "@nightprint/tokens";

export interface PlanBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PlanShapeBase {
  readonly id: string;
  /** Drawn as an outline only, dashed: the glass boundary of the application. */
  readonly glass: boolean;
}

export type PlanPart =
  | (PlanShapeBase & {
      readonly shape: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      /** Degrees, about (cx, cy). */
      readonly rotate: number;
      readonly cx: number;
      readonly cy: number;
    })
  | (PlanShapeBase & {
      readonly shape: "polygon";
      readonly points: string;
      readonly rotate: number;
      readonly cx: number;
      readonly cy: number;
    })
  | (PlanShapeBase & {
      readonly shape: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
    });

export interface PlanRoute {
  readonly id: string;
  /** "x,y x,y …" in plate units. */
  readonly points: string;
  /** A pipe carries tokens; a wire only configures. */
  readonly kind: "pipe" | "wire";
  /** The flow that travels it, or null for a pipe the scenario leaves dark. */
  readonly flow: FlowName | null;
  /** The arrowhead at the end the other depends on: "x,y x,y x,y", a triangle. */
  readonly arrow?: string;
}

/** A numbered disc on a part, as on an assembly drawing. */
export interface PlanBalloon {
  readonly id: string;
  readonly number: number;
  readonly x: number;
  readonly y: number;
}

/** A dimension: extension lines, the dimension line and its ticks, and the value. */
export interface PlanDimension {
  readonly id: string;
  /** One "x,y x,y" segment per line drawn. */
  readonly lines: readonly string[];
  readonly label: string;
  readonly x: number;
  readonly y: number;
}

/** The title block in a corner of the sheet. */
export interface PlanTitleBlock extends PlanBox {
  readonly title: string;
  readonly cells: readonly { readonly term: string; readonly value: string }[];
  /** A last row across the block: the reference the machine was checked against. */
  readonly source?: string;
}

export interface PlanZone extends PlanBox {
  readonly id: string;
  readonly label: string;
}

export interface PlanViewProps {
  /** What the drawing shows, for assistive technology. */
  readonly label: string;
  /** The area drawn, in plate units. */
  readonly box: PlanBox;
  readonly zones: readonly PlanZone[];
  readonly parts: readonly PlanPart[];
  readonly routes: readonly PlanRoute[];
  readonly balloons?: readonly PlanBalloon[];
  readonly dimensions?: readonly PlanDimension[];
  readonly titleBlock?: PlanTitleBlock;
  /** Lit pipes run with dashes that travel along them. */
  readonly flowing?: boolean;
  /** Each zone's name in its corner. Off where another layer writes them. */
  readonly zoneLabels?: boolean;
  /** Pixel size, for renderers that need one; otherwise the drawing fills its box. */
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}

/** A dash and its gap, in plate units: the `dash` animation moves two of them per cycle. */
const DASH = "0.3 0.15";
const MONO = { fontFamily: "var(--font-mono)" };
const BALLOON_R = 0.19;

/**
 * A machine seen from above, like the plan view of a drawing: zones dashed, parts in
 * outline, pipes in the colour of their flow. Plain shapes and presentation attributes
 * only, so it also renders where there is no stylesheet.
 */
export function PlanView({
  label,
  box,
  zones,
  parts,
  routes,
  balloons = [],
  dimensions = [],
  titleBlock,
  flowing = false,
  zoneLabels = true,
  width,
  height,
  className,
}: PlanViewProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      width={width}
      height={height}
      className={className}
    >
      {zones.map((zone) => (
        <rect
          key={zone.id}
          x={zone.x}
          y={zone.y}
          width={zone.width}
          height={zone.height}
          fill="none"
          stroke={neutral.lineStrong}
          strokeWidth={0.025}
          strokeDasharray="0.12 0.12"
        />
      ))}
      {zoneLabels &&
        zones.map((zone) => (
          <text
            key={`${zone.id}-label`}
            x={zone.x + 0.1}
            y={zone.y - 0.12}
            fill={neutral.textFaint}
            fontSize={0.22}
            letterSpacing={0.03}
            style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
          >
            {zone.label}
          </text>
        ))}
      {parts.map((part) => {
        const paint = {
          fill: part.glass ? "none" : neutral.raised,
          stroke: part.glass ? neutral.ring : neutral.textFaint,
          strokeWidth: 0.035,
          strokeDasharray: part.glass ? "0.16 0.1" : undefined,
        };
        if (part.shape === "circle") {
          return <circle key={part.id} cx={part.cx} cy={part.cy} r={part.r} {...paint} />;
        }
        const transform = `rotate(${part.rotate} ${part.cx} ${part.cy})`;
        return part.shape === "rect" ? (
          <rect
            key={part.id}
            x={part.x}
            y={part.y}
            width={part.width}
            height={part.height}
            transform={transform}
            {...paint}
          />
        ) : (
          <polygon key={part.id} points={part.points} transform={transform} {...paint} />
        );
      })}
      {routes.map((route) => {
        const line = {
          points: route.points,
          fill: "none",
          strokeLinejoin: "round" as const,
          strokeLinecap: "round" as const,
        };
        if (route.kind === "wire") {
          return (
            <polyline
              key={route.id}
              {...line}
              stroke={neutral.frame}
              strokeWidth={0.025}
              strokeDasharray="0.1 0.08"
            />
          );
        }
        const colour = route.flow ? flowColour[route.flow] : neutral.ring;
        if (!(flowing && route.flow)) {
          return <polyline key={route.id} {...line} stroke={colour} strokeWidth={0.06} />;
        }
        return (
          <g key={route.id}>
            <polyline {...line} stroke={colour} strokeWidth={0.06} strokeOpacity={0.35} />
            <polyline
              {...line}
              stroke={colour}
              strokeWidth={0.06}
              strokeDasharray={DASH}
              className="animate-dash motion-reduce:animate-none"
            />
          </g>
        );
      })}
      {routes.map(
        (route) =>
          route.arrow && (
            <polygon key={`${route.id}-arrow`} points={route.arrow} fill={neutral.textBody} />
          ),
      )}
      {dimensions.map((dimension) => (
        <g key={dimension.id}>
          {dimension.lines.map((line) => (
            <polyline
              key={line}
              points={line}
              fill="none"
              stroke={neutral.textFaint}
              strokeWidth={0.018}
            />
          ))}
          <text
            x={dimension.x}
            y={dimension.y}
            fill={neutral.textBody}
            fontSize={0.22}
            textAnchor="middle"
            style={MONO}
          >
            {dimension.label}
          </text>
        </g>
      ))}
      {balloons.map((balloon) => (
        <g key={balloon.id}>
          <circle
            cx={balloon.x}
            cy={balloon.y}
            r={BALLOON_R}
            fill={neutral.bg}
            stroke={neutral.ring}
            strokeWidth={0.02}
          />
          <text
            x={balloon.x}
            y={balloon.y + 0.07}
            fill={neutral.textBody}
            fontSize={0.2}
            textAnchor="middle"
            style={MONO}
          >
            {balloon.number}
          </text>
        </g>
      ))}
      {titleBlock && <TitleBlock {...titleBlock} />}
    </svg>
  );
}

/** The title block drawn in the sheet: the title on top, then a row of cells. */
function TitleBlock({ x, y, width, height, title, cells, source }: PlanTitleBlock) {
  const rule = { stroke: neutral.frame, strokeWidth: 0.02 };
  // Rows: the title, the cells, and the source when there is one.
  const row = height / (source ? 3.2 : 2.2);
  const top = row;
  const bottom = top + row * 1.2;
  const cell = width / Math.max(cells.length, 1);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={neutral.bg} {...rule} />
      <line x1={x} y1={y + top} x2={x + width} y2={y + top} {...rule} />
      <text
        x={x + 0.14}
        y={y + top * 0.66}
        fill={neutral.text}
        fontSize={0.21}
        fontWeight={600}
        style={MONO}
      >
        {title}
      </text>
      {cells.map((item, index) => (
        <g key={item.term}>
          {index > 0 && (
            <line
              x1={x + cell * index}
              y1={y + top}
              x2={x + cell * index}
              y2={y + bottom}
              {...rule}
            />
          )}
          <text
            x={x + cell * index + 0.12}
            y={y + top + 0.24}
            fill={neutral.textFaint}
            fontSize={0.13}
            letterSpacing={0.02}
            style={MONO}
          >
            {item.term.toUpperCase()}
          </text>
          <text
            x={x + cell * index + 0.12}
            y={y + top + 0.48}
            fill={neutral.textBody}
            fontSize={0.17}
            style={MONO}
          >
            {item.value}
          </text>
        </g>
      ))}
      {source && (
        <>
          <line x1={x} y1={y + bottom} x2={x + width} y2={y + bottom} {...rule} />
          <text x={x + 0.12} y={y + bottom + row * 0.62} fontSize={0.13} style={MONO}>
            <tspan fill={neutral.textFaint} letterSpacing={0.02}>
              SOURCE
            </tspan>
            <tspan dx={0.16} fill={neutral.textBody} fontSize={0.17}>
              {source}
            </tspan>
          </text>
        </>
      )}
    </g>
  );
}
