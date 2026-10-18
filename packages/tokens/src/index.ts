/**
 * Nightprint design tokens: the single source of truth for the DA
 * "dessin d'ingénieur, de nuit". The web app consumes them as CSS
 * (generated `dist/tokens.css`, Tailwind v4 `@theme`), the 3D scene
 * imports them directly as hex strings.
 */

/** Neutral ramp, darkest to lightest. No other neutrals exist. */
export const neutral = {
  /** Page and scene background. */
  bg: "#0A0B0D",
  /** Console and event log well. */
  inset: "#08090B",
  /** Panels and cards. */
  surface: "#0E1013",
  /** Machine plate, controls at rest. */
  plate: "#121418",
  /** Lit top faces in flat drawings. */
  raised: "#1A1E24",
  /** Header and section rules. */
  lineMuted: "#1E2228",
  /** Card and panel borders. */
  line: "#22262C",
  /** Control borders, idle step dots. */
  lineStrong: "#2C3139",
  /** Cartouche frame, switch track at rest. */
  frame: "#3A4048",
  /** Idle balloon ring. Decorative only, never text. */
  ring: "#4A515B",
  /** Timestamps and tertiary text. */
  textFaint: "#7D8590",
  /** Labels and captions. */
  textSecondary: "#9AA1AB",
  /** Secondary paragraphs. */
  textMuted: "#B4BAC3",
  /** Body copy and 3D edges. */
  textBody: "#C9CED6",
  /** Titles, values, primary text. */
  text: "#E6E8EB",
  /** Keyboard focus ring. */
  focus: "#FFFFFF",
} as const;

/**
 * The four flow colours of the visual grammar. Never add a fifth:
 * vermillon is reserved for errors and violations.
 */
export const flow = {
  request: "#4CC9F0",
  write: "#7BE38A",
  response: "#F5B942",
  error: "#FF5A36",
} as const;

export type FlowName = keyof typeof flow;

/** Colours that may carry text. Each must reach 4.5:1 on every surface. */
export const textRoles = [
  "text",
  "textBody",
  "textMuted",
  "textSecondary",
  "textFaint",
] as const satisfies readonly (keyof typeof neutral)[];

/** Surfaces that text is placed on. */
export const surfaceRoles = [
  "bg",
  "inset",
  "surface",
  "plate",
] as const satisfies readonly (keyof typeof neutral)[];

export const font = {
  sans: {
    family: "IBM Plex Sans",
    cssVariable: "--font-plex-sans",
    fallback: "system-ui, sans-serif",
  },
  mono: {
    family: "IBM Plex Mono",
    cssVariable: "--font-plex-mono",
    fallback: "ui-monospace, monospace",
  },
} as const;

export interface TypeStyle {
  /** Font size in px. */
  readonly size: number;
  /** Unitless line height. */
  readonly lineHeight: number;
  readonly weight: 400 | 500 | 600;
  /** Letter spacing in em. */
  readonly tracking: number;
}

/**
 * Type scale. Sans for titles and prose, mono (uppercase, +0.14 em)
 * for labels, values, the log and the cartouche.
 */
export const typeScale = {
  /** The home page's one headline, from wide screens up. */
  hero: { size: 84, lineHeight: 0.98, weight: 600, tracking: -0.025 },
  display: { size: 44, lineHeight: 1.09, weight: 600, tracking: -0.01 },
  title: { size: 30, lineHeight: 1.1, weight: 600, tracking: -0.005 },
  heading: { size: 18, lineHeight: 1.3, weight: 600, tracking: 0 },
  body: { size: 16, lineHeight: 1.65, weight: 400, tracking: 0 },
  small: { size: 14, lineHeight: 1.45, weight: 400, tracking: 0 },
  log: { size: 13, lineHeight: 1.55, weight: 400, tracking: 0 },
  label: { size: 12, lineHeight: 1.35, weight: 500, tracking: 0.14 },
  micro: { size: 11, lineHeight: 1.35, weight: 500, tracking: 0.12 },
} as const satisfies Record<string, TypeStyle>;

/** Corner radii in px. */
export const radius = { xs: 2, sm: 6, md: 8, lg: 10 } as const;

export const motion = {
  /** Default easing for UI and tokens (ease-in-out). */
  ease: [0.65, 0, 0.35, 1],
  /** Durations in ms. */
  fast: 120,
  base: 220,
  slow: 420,
  /** Default duration of one scenario step. */
  step: 1400,
} as const;

/** Values used by the 3D scene only. */
export const scene = {
  background: neutral.bg,
  plate: neutral.plate,
  plateGrid: "#1A1D22",
  body: "#2A2F37",
  core: "#343A44",
  /**
   * Matte Lambert shading in three tones, as in a technical illustration: the key
   * light leans towards +z, so in the isometric view the top is lightest, the +z
   * side mid and the +x side darkest.
   */
  light: { ambient: 0.55, key: 1.5, keyPosition: [2.5, 10, 5.5] },
  /** Glow of a part while a token goes through it. */
  litEmissive: 0.14,
  edge: neutral.textBody,
  edgeOpacity: { solid: 0.65, glass: 0.5, plate: 0.45, hidden: 0.28 },
  /**
   * Share of its edges' opacity a part keeps while the step is about other parts: the
   * drawing steps back, and the two or three parts that matter stand out.
   */
  dimmed: 0.3,
  /** Edge threshold angle in degrees: flatter creases are not drawn. */
  edgeThreshold: 25,
  /** Drawn line widths in CSS px: part edges, lit edges, hidden edges. */
  lineWidth: { edge: 1.25, lit: 1.75, hidden: 1 },
  /** Dash and gap of hidden edges, in world units. */
  hiddenDash: [0.06, 0.06],
  /**
   * Glass fill at normal incidence, and how much grazing faces add (fake fresnel).
   * Blended in linear light before the sRGB output: small values read stronger
   * than they look here on a dark ground.
   */
  glassOpacity: 0.012,
  glassFresnel: 0.07,
  pipeIdle: "#2A2F37",
  /**
   * Pipe radius; its drawn outline (a slightly larger tube, back faces only) and
   * the dashes on a pipe that a token is about to travel, which move `dashTravel`
   * world units over a step: driven by the step's progress, they stop on pause.
   */
  pipe: { radius: 0.04, outline: 0.014, dash: 0.16, dashTravel: 0.9, aheadOpacity: 0.35 },
  /** Section hatch on a cut face: lines per world unit, line share of each period. */
  hatch: { density: 9, width: 0.18, opacity: 0.32 },
  /**
   * Bloom on flow colours only (selective, never on white): discreet, no neon.
   * Intensity is per material: lit pipes and tokens 1, lit edges less.
   */
  bloom: { strength: 0.65, radius: 0.35, threshold: 0, edge: 0.5 },
  /** Camera direction for a true isometric view (y up). */
  isoDirection: [1, 1, 1],
  /**
   * Transitions between steps. `fade`: damping rate of a part lighting up or going out
   * (higher is faster; 8 settles in about a third of a second). `trail`: the same for a
   * pipe's lit stretch after its token has left.
   */
  transition: { fade: 8, trail: 3.5 },
  /**
   * The camera follows the action: it leans towards the parts of the current step by
   * `shift` of the way and zooms in by `zoom`, settling at rate `rate`. It stops
   * following once the visitor turns or zooms the camera themselves.
   */
  follow: { shift: 0.22, zoom: 1.06, rate: 1.8 },
  /**
   * The machine assembling on its first display, in seconds from when it shows: parts
   * set down one by one in balloon order (`stagger` apart, each over `part`, dropping
   * from `drop` world units and growing from `grow`), then the routes, then the labels,
   * then the scenario runs. About 1.5 s in all for ten parts.
   */
  assembly: {
    first: 0.1,
    stagger: 0.07,
    part: 0.5,
    drop: 0.8,
    grow: 0.55,
    routes: 0.25,
    labels: 0.2,
    run: 0.15,
  },
  /**
   * Latency dimensions along the pipes, in world units: how far the dimension line
   * sits from the pipe, where its extension lines start and how far they overshoot,
   * the half-length of its oblique ticks.
   */
  dimension: { offset: 0.34, gap: 0.09, overshoot: 0.06, tick: 0.06, opacity: 0.55 },
  /** Orbit around the isometric view: azimuth and elevation offsets in degrees, zoom factors. */
  orbit: { azimuth: 30, elevationMin: -12, elevationMax: 18, zoomMin: 0.85, zoomMax: 2.6 },
} as const;
