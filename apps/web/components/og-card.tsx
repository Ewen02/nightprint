import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Machine } from "@nightprint/engine";
import { neutral } from "@nightprint/tokens";
import { PlanView } from "@nightprint/ui";
import { ImageResponse } from "next/og";
import { planView } from "./plan-view-model";
import { site } from "./seo";

/** The size every network shows without cropping. */
export const ogSize = { width: 1200, height: 630 };

/*
 * Previews are route handlers named `og.png`, not `opengraph-image` files: the
 * export writes those without an extension, and a static server then sends them
 * with no image type.
 */

// Satori reads woff, not woff2: the same Fontsource files the site self-hosts.
const font = (family: "sans" | "mono", weight: 400 | 600) =>
  readFile(
    join(
      process.cwd(),
      `node_modules/@fontsource/ibm-plex-${family}/files/ibm-plex-${family}-latin-${weight}-normal.woff`,
    ),
  );
const fonts = Promise.all([font("sans", 400), font("sans", 600), font("mono", 400)]);

const DRAWING = { width: 620, height: 420 };

/** The machine's plan view, its zones named over it in Plex Mono. */
function PlanDrawing({ machine }: { readonly machine: Machine }) {
  const plan = planView(machine);
  const scale = Math.min(DRAWING.width / plan.box.width, DRAWING.height / plan.box.height);
  const width = plan.box.width * scale;
  const height = plan.box.height * scale;
  return (
    <div style={{ display: "flex", position: "relative", width, height }}>
      <PlanView
        {...plan}
        label={`${machine.title}, seen from above`}
        zoneLabels={false}
        width={width}
        height={height}
      />
      {plan.zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            position: "absolute",
            left: (zone.x - plan.box.x) * scale + 8,
            top: (zone.y - plan.box.y) * scale - 22,
            fontFamily: "Plex Mono",
            fontSize: 13,
            letterSpacing: 1.6,
            color: neutral.textFaint,
            textTransform: "uppercase",
          }}
        >
          {zone.label}
        </div>
      ))}
    </div>
  );
}

export interface OgCardProps {
  /** Mono line on top: "Nightprint / MCH-001". */
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly lead: string;
  /** The machine drawn on the right. */
  readonly machine: Machine;
  /** The title block along the bottom, like the corner of a drawing sheet. */
  readonly cells: readonly { readonly term: string; readonly value: string }[];
}

/** A link preview drawn like the sheet of a machine: tokens only, Plex, the plan view. */
export async function ogCard({ eyebrow, title, subtitle, lead, machine, cells }: OgCardProps) {
  const [sans, sansBold, mono] = await fonts;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 24,
        background: neutral.bg,
        fontFamily: "Plex Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          border: `1px solid ${neutral.frame}`,
        }}
      >
        <div style={{ display: "flex", flex: 1, padding: "36px 36px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 470 }}>
            <div
              style={{
                fontFamily: "Plex Mono",
                fontSize: 17,
                letterSpacing: 2.4,
                color: neutral.textSecondary,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>
            {/* The title block takes the height the eyebrow leaves, centred in it. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
                gap: 22,
                paddingBottom: 24,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    // A sentence-long title steps down a size to stay clear of the title block.
                    fontSize: title.length > 32 ? 52 : 60,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: neutral.text,
                  }}
                >
                  {title}
                </div>
                {subtitle && (
                  <div style={{ fontSize: 28, color: neutral.textSecondary }}>{subtitle}</div>
                )}
              </div>
              <div style={{ fontSize: 24, lineHeight: 1.4, color: neutral.textMuted }}>{lead}</div>
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <PlanDrawing machine={machine} />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            borderTop: `1px solid ${neutral.frame}`,
            fontFamily: "Plex Mono",
            fontSize: 15,
            letterSpacing: 1.2,
          }}
        >
          {cells.map((cell, index) => (
            <div
              key={cell.term}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "12px 18px",
                flexGrow: index === cells.length - 1 ? 1 : 0,
                borderLeft: index === 0 ? "none" : `1px solid ${neutral.frame}`,
              }}
            >
              <div style={{ color: neutral.textFaint, textTransform: "uppercase" }}>
                {cell.term}
              </div>
              <div style={{ color: neutral.textBody }}>{cell.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: "Plex Sans", data: sans, weight: 400, style: "normal" },
        { name: "Plex Sans", data: sansBold, weight: 600, style: "normal" },
        { name: "Plex Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}

/** The home page's preview: the promise, drawn over the featured machine. */
export function homeOgCard(featured: Machine, live: number, upcoming: number) {
  return ogCard({
    eyebrow: site.name,
    title: site.tagline,
    lead: "Follow a request through each pattern, step by step, then flip a what-if switch.",
    machine: featured,
    cells: [
      { term: "Live", value: `${live} machine${live === 1 ? "" : "s"}` },
      { term: "On the board", value: `${upcoming} machines` },
      { term: "Cadence", value: "1 a week" },
      { term: "Site", value: new URL(site.url).host },
    ],
  });
}

/** A machine page's preview: its plan view and its title block. */
export function machineOgCard(machine: Machine) {
  const alias = machine.aliases[0];
  return ogCard({
    eyebrow: `${site.name} / ${machine.code}`,
    title: machine.title,
    subtitle: alias ? `${alias.charAt(0).toUpperCase()}${alias.slice(1)}` : undefined,
    lead: machine.summary,
    machine,
    cells: [
      { term: "Code", value: machine.code },
      { term: "Scale", value: machine.scale },
      { term: "Rev", value: machine.revision },
      { term: "Source", value: machine.sources[0]?.label ?? "" },
      { term: "Site", value: new URL(site.url).host },
    ],
  });
}
