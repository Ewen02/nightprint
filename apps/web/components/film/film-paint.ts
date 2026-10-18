import type { FilmCue } from "@nightprint/engine";
import type { ScreenPosition } from "@nightprint/scene";
import { type FlowName, flow, font, neutral, radius } from "@nightprint/tokens";
import { FILM_SIZE } from "./film-encoder";
import type { FilmCaption, FilmLabel, FilmTitles, FilmWhatIf } from "./film-view-model";

/**
 * Paints a film's frame: the scene as drawn, the labels the page lays over its stage, and
 * the video's own words (title card, step caption, what-if card, end card), in the grammar
 * of the videos made with `apps/video`. Everything is set in the stage's CSS px, 1280 × 720,
 * and drawn at 1.5 px per px: the 1920 × 1080 frame a phone shows at about a fifth.
 */

const { width: W, height: H, scale: SCALE } = FILM_SIZE;

/** The videos' type sizes for a 1920 × 1080 frame, in the stage's px. */
const TYPE = {
  display: 69,
  headline: 45,
  title: 54,
  whatIf: 35,
  body: 24,
  kicker: 19,
  caption: 16,
};
/** Text keeps clear of the edges once X crops or rounds the frame. */
const SAFE = { x: 64, y: 53 };
/** Room the caption takes over the stage's top: the machine is framed below it. */
export const FILM_CAPTION_ROOM = 170;
/** Margin a label kept inside leaves to the stage's edge, as on the page. */
const EDGE = 28;
/** Seconds an overlay takes to come in or go. */
const FADE_S = 0.35;
/** Seconds the what-if card stays once the switch has flipped. */
const WHAT_IF_S = 3;

export interface FilmFonts {
  readonly sans: string;
  readonly mono: string;
}

/** The families the page set IBM Plex in, once every weight the film uses has loaded. */
export async function loadFilmFonts(): Promise<FilmFonts> {
  const style = getComputedStyle(document.documentElement);
  const family = (variable: string, fallback: string) =>
    style.getPropertyValue(variable).trim() || `"${fallback}"`;
  const fonts = {
    sans: family(font.sans.cssVariable, font.sans.family),
    mono: family(font.mono.cssVariable, font.mono.family),
  };
  await Promise.all(
    [
      `400 16px ${fonts.mono}`,
      `500 16px ${fonts.mono}`,
      `600 16px ${fonts.mono}`,
      `400 16px ${fonts.sans}`,
      `500 16px ${fonts.sans}`,
      `600 16px ${fonts.sans}`,
    ].map((spec) => document.fonts.load(spec)),
  );
  return fonts;
}

/** A token colour with an alpha channel. */
function alpha(hex: string, a: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${a})`;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** The videos' `settle` easing, near enough: fast out, long landing. */
const settle = (x: number) => 1 - (1 - clamp01(x)) ** 4;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const shared = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const STAGE: Box = { x: 0, y: 0, w: W, h: H };

/** How much of a box is lost under others or past the stage's edge. */
const lost = (box: Box, others: readonly Box[]) =>
  box.w * box.h - shared(box, STAGE) + others.reduce((sum, other) => sum + shared(box, other), 0);

export interface FilmShot {
  /** Seconds from the first frame. */
  readonly t: number;
  readonly cue: FilmCue;
  /** The scene as just drawn. */
  readonly frame: CanvasImageSource;
  readonly anchors: ReadonlyMap<string, ScreenPosition>;
  readonly labels: readonly FilmLabel[];
  /** The machine is set down far enough for its labels: from the assembly's `labels` on. */
  readonly labelsReady: boolean;
  readonly caption: FilmCaption;
  /** How far the current step's animation has run, 0 to 1. */
  readonly stepProgress: number;
  readonly whatIf: FilmWhatIf | null;
  readonly titles: FilmTitles;
}

/** A painter for one film: it keeps what eases from frame to frame (fades, a caption's swap). */
export function createPainter(ctx: CanvasRenderingContext2D, fonts: FilmFonts) {
  const shown = { title: 0, caption: 0, whatIf: 0, labels: 0 };
  let last = 0;
  let caption: { number: number; title: string; at: number; previous: string | null } | null = null;
  let held: { caption: FilmCaption; progress: number } | null = null;

  const set = (weight: number, size: number, family: string, tracking = 0) => {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.letterSpacing = `${tracking}em`;
  };
  const textWidth = (text: string) => ctx.measureText(text).width;
  /** `text` cut to `max` px wide, with an ellipsis if it had to be. */
  const fit = (text: string, max: number) => {
    if (textWidth(text) <= max) {
      return text;
    }
    let cut = text;
    while (cut.length > 1 && textWidth(`${cut}…`) > max) {
      cut = cut.slice(0, -1);
    }
    return `${cut.trimEnd()}…`;
  };
  /** `text` in lines at most `max` px wide, `lines` of them at most, the last cut if it must be. */
  const wrap = (text: string, max: number, lines: number): string[] => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next) <= max || !line) {
        line = next;
        continue;
      }
      out.push(line);
      line = word;
      if (out.length === lines) {
        break;
      }
    }
    if (out.length < lines && line) {
      out.push(line);
      line = "";
    }
    const last = out.length - 1;
    const rest = out.join(" ").length < text.length;
    if (rest && last >= 0) {
      out[last] = fit(`${out[last]}…`, max);
    }
    return out;
  };
  const roundRect = (box: Box, r: number) => {
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, r);
  };

  // The scrim under the top-left words: dark at the corner, gone by the middle.
  const scrim = document.createElement("canvas");
  scrim.width = W;
  scrim.height = H;
  {
    const s = scrim.getContext("2d");
    if (s) {
      // Down to just under the caption, which ends about a quarter of the way down.
      const down = s.createLinearGradient(0, 0, 0, H * 0.38);
      down.addColorStop(0, alpha(neutral.bg, 0.96));
      down.addColorStop(0.55, alpha(neutral.bg, 0.9));
      down.addColorStop(1, alpha(neutral.bg, 0));
      s.fillStyle = down;
      s.fillRect(0, 0, W, H);
      s.globalCompositeOperation = "destination-in";
      const across = s.createLinearGradient(0, 0, W, 0);
      across.addColorStop(0, "rgba(0, 0, 0, 1)");
      across.addColorStop(0.55, "rgba(0, 0, 0, 1)");
      across.addColorStop(0.88, "rgba(0, 0, 0, 0)");
      s.fillStyle = across;
      s.fillRect(0, 0, W, H);
    }
  }

  // The end card's sheet: a grid that fades out from the middle.
  const GRID = 43;
  const sheet = document.createElement("canvas");
  sheet.width = W;
  sheet.height = H;
  {
    const s = sheet.getContext("2d");
    if (s) {
      s.strokeStyle = neutral.lineStrong;
      s.lineWidth = 1 / SCALE;
      s.beginPath();
      for (let x = 0; x <= W; x += GRID) {
        s.moveTo(x, 0);
        s.lineTo(x, H);
      }
      for (let y = 19; y <= H; y += GRID) {
        s.moveTo(0, y);
        s.lineTo(W, y);
      }
      s.stroke();
      s.globalCompositeOperation = "destination-in";
      const fade = s.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
      fade.addColorStop(0.35, "rgba(0, 0, 0, 1)");
      fade.addColorStop(1, "rgba(0, 0, 0, 0)");
      s.fillStyle = fade;
      s.fillRect(0, 0, W, H);
    }
  }

  /** Crop marks at the four corners, as on a drawing sheet. */
  const corners = (arm: number) => {
    const inset = 27;
    ctx.strokeStyle = neutral.textFaint;
    ctx.lineWidth = 2 / SCALE;
    for (const [x, y, sx, sy] of [
      [inset, inset, 1, 1],
      [W - inset, inset, -1, 1],
      [inset, H - inset, 1, -1],
      [W - inset, H - inset, -1, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * arm);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * arm, y);
      ctx.stroke();
    }
  };

  /**
   * A lane's name, as the page's lane label sets it: large, its right edge and middle on the
   * anchor, before the row, the note under it in lines of a fixed width.
   */
  const paintLane = (
    label: Extract<FilmLabel, { kind: "zone" | "lane" }>,
    pos: ScreenPosition,
    names: readonly Box[],
  ) => {
    const gap = 12;
    set(600, 18, fonts.mono);
    const nameW = textWidth(label.label);
    set(500, 11, fonts.mono, 0.12);
    const lines = label.note ? wrap(label.note, 144, 3) : [];
    const noteW = Math.max(0, ...lines.map(textWidth));
    const w = Math.max(nameW, noteW) + gap;
    const h = 23 + (lines.length > 0 ? 2 + lines.length * 15 : 0);
    const right = Math.max(pos.x, EDGE + w) - gap;
    const box = { x: right + gap - w, y: pos.y - h / 2, w, h };
    if (names.some((b) => overlaps(b, box))) {
      return;
    }
    ctx.textAlign = "right";
    set(600, 18, fonts.mono);
    ctx.fillStyle = neutral.text;
    ctx.fillText(label.label, right, box.y + 11.5);
    set(500, 11, fonts.mono, 0.12);
    ctx.fillStyle = neutral.textSecondary;
    lines.forEach((line, i) => {
      ctx.fillText(line, right, box.y + 23 + 2 + 7.5 + i * 15);
    });
    ctx.textAlign = "left";
  };

  /** The page's label layer, painted: zones, dimensions, balloons and names, token tags. */
  const paintLabels = (shot: FilmShot, opacity: number) => {
    if (opacity <= 0) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textBaseline = "middle";
    const at = (id: string) => shot.anchors.get(id);

    // First what stays put: balloons, names and tags. Names open on the side that loses least.
    type Fixed = {
      readonly label: Extract<FilmLabel, { kind: "part" | "token" }>;
      readonly pos: ScreenPosition;
      boxes: Box[];
      side: "left" | "right";
    };
    const fixed: Fixed[] = [];
    const partBoxes = (
      label: Extract<FilmLabel, { kind: "part" }>,
      pos: ScreenPosition,
      side: "left" | "right",
    ): Box[] => {
      const balloon = { x: pos.x - 11, y: pos.y - 11, w: 22, h: 22 };
      if (!label.named) {
        return [balloon];
      }
      set(400, 13, fonts.mono);
      const nameW = Math.min(textWidth(label.label), 224);
      set(500, 11, fonts.mono, 0.12);
      const statusW = label.status ? Math.min(textWidth(label.status), 224) : 0;
      const w = Math.max(nameW, statusW) + 16 + 2;
      const h = 4 + 20 + (label.status ? 2 + 15 : 0) + 4 + 2;
      const x = side === "right" ? pos.x + 11 + 6 : pos.x - 11 - 6 - w;
      return [balloon, { x, y: pos.y - 11, w, h }];
    };
    for (const label of shot.labels) {
      const pos = at(label.id);
      if (!pos) {
        continue;
      }
      if (label.kind === "part") {
        fixed.push({ label, pos, side: pos.side, boxes: partBoxes(label, pos, pos.side) });
      } else if (label.kind === "token") {
        set(600, 13, fonts.mono);
        const w = textWidth(label.label) + 12;
        fixed.push({
          label,
          pos,
          side: pos.side,
          boxes: [{ x: pos.x - w / 2, y: pos.y - 11, w, h: 22 }],
        });
      }
    }
    fixed.forEach((item, i) => {
      if (item.label.kind !== "part" || !item.label.named) {
        return;
      }
      const others = fixed.flatMap((other, j) => (j === i ? [] : other.boxes));
      const here = item.boxes.reduce((sum, box) => sum + lost(box, others), 0);
      if (here === 0) {
        return;
      }
      const side = item.side === "left" ? "right" : "left";
      const flipped = partBoxes(item.label, item.pos, side);
      if (flipped.reduce((sum, box) => sum + lost(box, others), 0) < here) {
        item.side = side;
        item.boxes = flipped;
      }
    });
    const blockers = fixed.flatMap((item) => item.boxes);
    // A lane's name is read the whole run: only an open name covers it.
    const names = fixed.flatMap((item) =>
      item.label.kind === "part" && item.label.named ? item.boxes : [],
    );

    // Then what gives way: a zone's name and a latency fade out under a balloon or a name.
    for (const label of shot.labels) {
      const pos = at(label.id);
      if (!pos) {
        continue;
      }
      if (label.kind === "lane") {
        paintLane(label, pos, names);
      } else if (label.kind === "zone") {
        set(500, 12, fonts.mono, 0.14);
        const name = label.label.toUpperCase();
        const nameW = textWidth(name);
        set(500, 11, fonts.mono, 0.12);
        const noteW = label.note ? textWidth(label.note) : 0;
        const w = Math.max(nameW, noteW);
        const h = 16 + (label.note ? 2 + 15 : 0);
        const x = Math.min(Math.max(pos.x, EDGE), W - w - EDGE);
        const box = { x, y: pos.y - 4 - h, w, h };
        if (blockers.some((b) => overlaps(b, box))) {
          continue;
        }
        set(500, 12, fonts.mono, 0.14);
        ctx.fillStyle = neutral.textSecondary;
        ctx.fillText(name, x, box.y + 8);
        if (label.note) {
          set(500, 11, fonts.mono, 0.12);
          ctx.fillStyle = neutral.textFaint;
          ctx.fillText(label.note, x, box.y + 16 + 2 + 7.5);
        }
      } else if (label.kind === "dimension") {
        set(500, 11, fonts.mono, 0.12);
        const w = textWidth(label.value) + 8;
        const box = { x: pos.x - w / 2, y: pos.y - 7.5, w, h: 15 };
        if (blockers.some((b) => overlaps(b, box))) {
          continue;
        }
        ctx.fillStyle = alpha(neutral.bg, 0.85);
        roundRect(box, radius.xs);
        ctx.fill();
        ctx.fillStyle = label.flow ? flow[label.flow] : neutral.textSecondary;
        ctx.fillText(label.value, box.x + 4, pos.y);
      }
    }

    // Far to near, names above bare balloons, as the page stacks them.
    const raised = (item: Fixed) => (item.label.kind === "part" && item.label.named ? 1 : 0);
    const ordered = [...fixed].sort((a, b) => raised(a) - raised(b) || b.pos.z - a.pos.z);
    for (const item of ordered) {
      const { label, pos } = item;
      if (label.kind === "token") {
        const box = item.boxes[0];
        if (!box) {
          continue;
        }
        set(600, 13, fonts.mono);
        ctx.fillStyle = flow[label.flow];
        roundRect(box, radius.xs);
        ctx.fill();
        ctx.fillStyle = neutral.bg;
        ctx.fillText(label.label, box.x + 6, pos.y);
        continue;
      }
      const accent = label.violation ? flow.error : label.flow ? flow[label.flow] : null;
      // The balloon.
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10.5, 0, Math.PI * 2);
      ctx.fillStyle = accent ?? neutral.bg;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = accent ?? neutral.ring;
      ctx.stroke();
      set(accent ? 600 : 500, 11, fonts.mono);
      ctx.fillStyle = accent ? neutral.bg : neutral.textBody;
      ctx.textAlign = "center";
      ctx.fillText(String(label.number), pos.x, pos.y + 0.5);
      ctx.textAlign = "left";
      // Its name, open beside it.
      const box = item.boxes[1];
      if (!box) {
        continue;
      }
      ctx.fillStyle = alpha(neutral.bg, 0.9);
      roundRect(box, radius.xs);
      ctx.fill();
      ctx.strokeStyle = accent ?? neutral.line;
      ctx.lineWidth = 1;
      roundRect({ x: box.x + 0.5, y: box.y + 0.5, w: box.w - 1, h: box.h - 1 }, radius.xs);
      ctx.stroke();
      set(400, 13, fonts.mono);
      ctx.fillStyle = neutral.text;
      ctx.fillText(fit(label.label, 224), box.x + 9, box.y + 1 + 4 + 10);
      if (label.status) {
        set(500, 11, fonts.mono, 0.12);
        ctx.fillStyle = accent ?? neutral.textSecondary;
        ctx.fillText(fit(label.status, 224), box.x + 9, box.y + 1 + 4 + 20 + 2 + 7.5);
      }
    }
    ctx.restore();
  };

  /** A line of type rising out of a mask, like type set on a plate. */
  const rise = (text: string, x: number, y: number, size: number, progress: number) => {
    const lineH = size * 1.2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4, y - lineH / 2, W, lineH);
    ctx.clip();
    ctx.globalAlpha *= clamp01(progress * 1.4);
    ctx.fillText(text, x, y + (1 - settle(progress)) * lineH);
    ctx.restore();
  };

  /** The step caption at the top left: the step and its bars, then its title. */
  const paintCaption = (shot: FilmShot, opacity: number) => {
    if (opacity <= 0) {
      return;
    }
    const c = shot.caption;
    if (!caption || caption.number !== c.number || caption.title !== c.title) {
      caption = { number: c.number, title: c.title, at: shot.t, previous: caption?.title ?? null };
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textBaseline = "middle";
    const kickerY = SAFE.y + TYPE.kicker * 0.675;
    set(500, TYPE.kicker, fonts.mono, 0.14);
    ctx.fillStyle = flow[c.flow];
    ctx.fillText(`STEP ${c.number} / ${c.count}`, SAFE.x, kickerY);
    // After the widest the kicker gets, so the bars never move as the number grows.
    const barsX = SAFE.x + textWidth(`STEP ${c.count} / ${c.count}`) + 19;
    for (let i = 0; i < c.count; i++) {
      const x = barsX + i * 28;
      const bar = { x, y: kickerY - 1.75, w: 23, h: 3.5 };
      ctx.fillStyle = neutral.lineStrong;
      roundRect(bar, 2);
      ctx.fill();
      const n = i + 1;
      const filled = n < c.number ? 1 : n === c.number ? clamp01(shot.stepProgress) : 0;
      if (filled > 0) {
        const stepFlow: FlowName = c.flows[i] ?? c.flow;
        ctx.fillStyle = n < c.number ? alpha(flow[stepFlow], 0.7) : flow[c.flow];
        roundRect({ ...bar, w: bar.w * filled }, 2);
        ctx.fill();
      }
    }
    const titleY = SAFE.y + TYPE.kicker * 1.35 + 13 + (TYPE.headline * 1.2) / 2;
    const swap = settle((shot.t - caption.at) / 0.4);
    set(600, TYPE.headline, fonts.sans, -0.01);
    ctx.fillStyle = neutral.text;
    const max = W - SAFE.x * 2;
    // The titles roll through the line's height, one out above as the next comes up.
    const lineH = TYPE.headline * 1.3;
    ctx.beginPath();
    ctx.rect(0, titleY - lineH / 2, W, lineH);
    ctx.clip();
    if (caption.previous && swap < 1) {
      ctx.save();
      ctx.globalAlpha = opacity * (1 - swap);
      ctx.fillText(fit(caption.previous, max), SAFE.x, titleY - swap * lineH);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = opacity * (caption.previous ? swap : 1);
    ctx.fillText(fit(c.title, max), SAFE.x, titleY + (caption.previous ? 1 - swap : 0) * lineH);
    ctx.restore();
    ctx.restore();
  };

  /** The opening title over the machine as it is set down. */
  const paintTitle = (shot: FilmShot, opacity: number) => {
    if (opacity <= 0) {
      return;
    }
    const { kicker, title, source } = shot.titles;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textBaseline = "middle";
    set(500, TYPE.kicker, fonts.mono, 0.14);
    ctx.fillStyle = neutral.textSecondary;
    ctx.fillText(kicker.toUpperCase(), SAFE.x, SAFE.y + TYPE.kicker * 0.675);
    set(600, TYPE.title, fonts.sans, -0.015);
    ctx.fillStyle = neutral.text;
    const titleY = SAFE.y + TYPE.kicker * 1.35 + 12 + (TYPE.title * 1.1) / 2;
    rise(fit(title, W - SAFE.x * 2), SAFE.x, titleY, TYPE.title, (shot.t - 0.2) / 0.5);
    if (source) {
      set(400, TYPE.caption, fonts.mono);
      ctx.fillStyle = neutral.textFaint;
      ctx.globalAlpha = opacity * clamp01((shot.t - 0.5) / 0.4);
      ctx.fillText(source, SAFE.x, titleY + (TYPE.title * 1.1) / 2 + 18);
    }
    ctx.restore();
  };

  /** The flipped switch, named like the page's, and what it changes. */
  const paintWhatIf = (shot: FilmShot, opacity: number) => {
    const whatIf = shot.whatIf;
    const flipped = shot.cue.flipped;
    if (opacity <= 0 || !whatIf || !flipped) {
      return;
    }
    const colour = flow[whatIf.tone];
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textBaseline = "middle";
    set(500, TYPE.kicker, fonts.mono, 0.14);
    ctx.fillStyle = neutral.textSecondary;
    ctx.fillText("WHAT IF…", SAFE.x, SAFE.y + TYPE.kicker * 0.675);
    const rowY = SAFE.y + TYPE.kicker * 1.35 + 11 + 14;
    const on = settle((flipped.since - 0.25) / 0.2);
    const track = { x: SAFE.x, y: rowY - 13, w: 49, h: 26 };
    ctx.fillStyle = on > 0.5 ? colour : neutral.plate;
    roundRect(track, 13);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = on > 0.5 ? colour : neutral.frame;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(track.x + 14 + on * 21, rowY, 8.7, 0, Math.PI * 2);
    ctx.fillStyle = neutral.text;
    ctx.fill();
    set(500, TYPE.whatIf, fonts.sans);
    ctx.fillStyle = neutral.text;
    ctx.fillText(fit(whatIf.label, W - SAFE.x * 2 - 64), SAFE.x + 64, rowY);
    if (whatIf.description) {
      set(500, TYPE.body, fonts.sans);
      ctx.fillStyle = colour;
      // Two lines at most, within the scrim's dark part.
      wrap(whatIf.description, W * 0.62, 2).forEach((line, i) => {
        rise(
          line,
          SAFE.x,
          rowY + 14 + 12 + TYPE.body * 0.6 + i * TYPE.body * 1.3,
          TYPE.body,
          (flipped.since - 0.6 - i * 0.12) / 0.5,
        );
      });
    }
    ctx.restore();
  };

  /** Letters typed one a frame from `at` seconds, as on the videos' end card. */
  const typed = (text: string, since: number, at: number, pace = 1) =>
    text.slice(0, Math.max(0, Math.floor((since - at) * 30 * pace)));

  /** The last seconds: the drawing sheet, the promise, the address. */
  const paintEnd = (shot: FilmShot) => {
    if (shot.cue.act !== "end" && shot.cue.act !== "over") {
      return;
    }
    const since = shot.cue.since;
    ctx.save();
    ctx.fillStyle = alpha(neutral.bg, 0.86 * clamp01(since / 0.6));
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.55 * clamp01((since - 0.2) / 0.8);
    ctx.drawImage(sheet, 0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = W / 2;
    set(500, TYPE.kicker, fonts.mono, 0.2);
    ctx.fillStyle = neutral.textSecondary;
    ctx.fillText(typed("NIGHTPRINT", since, 0.33), cx, H / 2 - 128);
    set(600, TYPE.display, fonts.sans, -0.015);
    ctx.fillStyle = neutral.text;
    const lines = ["Software architecture,", "drawn as machines you can run."];
    lines.forEach((line, i) => {
      const y = H / 2 - 52 + i * TYPE.display * 1.08;
      const lineH = TYPE.display * 1.2;
      const progress = (since - 0.47 - i * 0.2) / 0.53;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y - lineH / 2, W, lineH);
      ctx.clip();
      ctx.globalAlpha = clamp01(progress * 1.4);
      ctx.fillText(line, cx, y + (1 - settle(progress)) * lineH);
      ctx.restore();
    });
    set(500, 40, fonts.mono);
    ctx.fillStyle = flow.request;
    ctx.fillText(typed("nightprint.dev", since, 1.13, 1.2), cx, H / 2 + 120);
    set(400, TYPE.caption, fonts.mono, 0.16);
    ctx.fillStyle = neutral.textFaint;
    ctx.globalAlpha = clamp01((since - 1.6) / 0.4);
    ctx.fillText(shot.titles.footer.toUpperCase(), cx, H / 2 + 176);
    ctx.restore();
  };

  /** The address, small, in the bottom right: where the machine runs. */
  const paintMark = (shot: FilmShot, opacity: number) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    set(500, 12, fonts.mono, 0.14);
    ctx.fillStyle = neutral.textFaint;
    ctx.fillText(
      `NIGHTPRINT.DEV · ${shot.titles.kicker.split(" · ")[0] ?? ""}`,
      W - SAFE.x,
      H - SAFE.y + 12,
    );
    ctx.restore();
  };

  return (shot: FilmShot) => {
    const dt = Math.max(0, shot.t - last);
    last = shot.t;
    const { act, flipped } = shot.cue;
    const toward = (key: keyof typeof shown, target: number) => {
      const step = dt / FADE_S;
      shown[key] =
        target > shown[key]
          ? Math.min(target, shown[key] + step)
          : Math.max(target, shown[key] - step);
    };
    const ending = act === "end" || act === "over";
    const whatIfShown = flipped !== null && flipped.since < WHAT_IF_S && !ending;
    // One set of words at a time in the top left: each waits for the one before to leave.
    const clear = (...others: (keyof typeof shown)[]) => others.every((key) => shown[key] < 0.05);
    toward("title", act === "assembly" ? 1 : 0);
    toward("whatIf", whatIfShown && clear("caption") ? 1 : 0);
    const captionWanted = !ending && act !== "assembly" && !whatIfShown;
    toward("caption", captionWanted && clear("title", "whatIf") ? 1 : 0);
    toward("labels", shot.labelsReady && !ending ? 1 : 0);
    // A caption on its way out keeps what it said: the step it leaves, not the one coming.
    if (captionWanted || !held) {
      held = { caption: shot.caption, progress: shot.stepProgress };
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = neutral.bg;
    ctx.fillRect(0, 0, W * SCALE, H * SCALE);
    ctx.drawImage(shot.frame, 0, 0, W * SCALE, H * SCALE);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.textAlign = "left";

    paintLabels(shot, shown.labels);
    const words = Math.max(shown.title, shown.caption, shown.whatIf);
    if (words > 0) {
      ctx.globalAlpha = words;
      ctx.drawImage(scrim, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    paintTitle(shot, shown.title);
    paintCaption({ ...shot, caption: held.caption, stepProgress: held.progress }, shown.caption);
    paintWhatIf(shot, shown.whatIf);
    paintMark(shot, 1 - clamp01(ending ? shot.cue.since / 0.4 : 0));
    paintEnd(shot);
    ctx.save();
    ctx.globalAlpha = 0.9;
    corners(27 * settle(shot.t / 0.6));
    ctx.restore();
  };
}
