// Captures a machine page from the live site, one image per video frame, for the Remotion videos.
//
//   pnpm --filter @nightprint/video capture mch-001
//
// Reads src/<id>/shots.json (page, length, clicks), writes the images to public/footage/<id>/ and
// what happened on each frame to src/<id>/timeline.json. The page's animation time is frozen and
// advanced by exactly one video frame between captures, so a slow machine (no GPU, software
// WebGL) still gives a smooth 30 fps video. Options: --frames N (capture fewer), --out DIR (write
// elsewhere, for a dry run), --from ORIGIN (film the same page from a local build, before it is
// deployed: `pnpm build`, then serve apps/web/out). Env: NIGHTPRINT_CHROMIUM (browser binary),
// NIGHTPRINT_SOFTWARE_GL=1 (force SwiftShader when there is no GPU).

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { flow } from "@nightprint/tokens";
import { chromium } from "playwright";

const FPS = 30;
const VIEWPORT = { width: 1920, height: 1080 };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { frames: { type: "string" }, out: { type: "string" }, from: { type: "string" } },
});
const id = positionals[0];
if (!id) {
  console.error("Usage: pnpm --filter @nightprint/video capture <id>   (e.g. mch-001)");
  process.exit(1);
}
const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = JSON.parse(readFileSync(join(pkg, "src", id, "shots.json"), "utf8"));
const frames = values.frames ? Number(values.frames) : shots.frames;
const url = values.from ? new URL(new URL(shots.url).pathname, values.from).href : shots.url;
const footageDir = values.out ? join(values.out, "footage") : join(pkg, "public", "footage", id);
const timelinePath = values.out
  ? join(values.out, "timeline.json")
  : join(pkg, "src", id, "timeline.json");
mkdirSync(footageDir, { recursive: true });
let problems = 0;
const log = (line) => {
  problems++;
  appendFileSync(join(footageDir, "capture.log"), `${line}\n`);
};

/**
 * Runs in the page before its scripts. Until __virtual() is called nothing changes; after it,
 * requestAnimationFrame callbacks and performance.now() only move when __advance(ms) is called.
 * The engine, the camera and the labels all read time from these two, so each capture is one
 * exact step of the scene. CSS transitions and animations run on the document's own clock, so
 * each one is paused as it starts and moved on by the same amount: a switch's knob slides over a
 * few frames instead of jumping, and the stage's fades end on the frame they should.
 *
 * It also hides WebGPU, so the site always draws with its WebGL2 backend: `renderAt` waits for
 * the GPU by reading a pixel back, which only WebGL can do. Headless Chromium offers no WebGPU
 * adapter anyway; a desktop Chrome (NIGHTPRINT_CHROMIUM) would, and some frames would then be
 * captured before they are drawn.
 */
function freezeAnimationTime() {
  Object.defineProperty(navigator, "gpu", { value: undefined });
  const realNow = performance.now.bind(performance);
  const realRequest = window.requestAnimationFrame.bind(window);
  const realCancel = window.cancelAnimationFrame.bind(window);
  let virtual = false;
  let now = 0;
  let nextId = 1e6;
  let queue = new Map();
  performance.now = () => (virtual ? now : realNow());
  window.requestAnimationFrame = (callback) => {
    if (!virtual) return realRequest(callback);
    const handle = nextId++;
    queue.set(handle, callback);
    return handle;
  };
  window.cancelAnimationFrame = (handle) => {
    if (!queue.delete(handle)) realCancel(handle);
  };
  // Paused as it starts, before the real clock moves it by more than a rendering frame.
  const hold = (event) => {
    if (!virtual) return;
    for (const animation of event.target.getAnimations()) animation.pause();
  };
  document.addEventListener("transitionrun", hold, true);
  document.addEventListener("animationstart", hold, true);
  window.__virtual = () => {
    now = realNow();
    virtual = true;
    for (const animation of document.getAnimations()) animation.pause();
  };
  window.__advance = (ms) => {
    now += ms;
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = Number(animation.currentTime ?? 0) + ms;
    }
    const due = queue;
    queue = new Map();
    for (const callback of due.values()) callback(now);
  };
}

const browser = await chromium.launch({
  executablePath: process.env.NIGHTPRINT_CHROMIUM || undefined,
  args:
    process.env.NIGHTPRINT_SOFTWARE_GL === "1"
      ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
      : ["--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: VIEWPORT,
  deviceScaleFactor: shots.scale,
  reducedMotion: "no-preference",
});
page.on("pageerror", (error) => log(`pageerror ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") log(`console.error ${message.text()}`);
});
await page.addInitScript(freezeAnimationTime);
await page.goto(url, { waitUntil: "load" });
// Frame 0 is the machine assembled, its labels shown and every fade over, however long a slow
// GPU takes to get there.
await page.waitForSelector("[data-assembly='done']", { timeout: 120_000 });
await page.waitForFunction(
  () =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getComputedTiming().iterations === Number.POSITIVE_INFINITY,
      ),
  null,
  { timeout: 30_000 },
);
const cdp = await page.context().newCDPSession(page);

/**
 * Clicks a transport button or a what-if switch by its accessible name. Returns the switch's box
 * and the centre of its toggle (its first decorative child), where a pointer would press.
 */
const click = (kind, name) =>
  page.evaluate(
    ([kind, name]) => {
      const candidates = [
        ...document.querySelectorAll(kind === "switch" ? "[role='switch']" : "button"),
      ];
      const element = candidates.find((el) =>
        (el.getAttribute("aria-label") || el.textContent || "").trim().startsWith(name),
      );
      if (!element) throw new Error(`No ${kind} named "${name}"`);
      const box = element.getBoundingClientRect();
      const toggle = (
        element.querySelector("[aria-hidden='true']") ?? element
      ).getBoundingClientRect();
      element.click();
      return {
        box: { x: box.x, y: box.y, w: box.width, h: box.height },
        at: { x: toggle.x + toggle.width / 2, y: toggle.y + toggle.height / 2 },
      };
    },
    [kind, name],
  );

/**
 * Each flow by the colour the site paints it in, as the browser computes it. From the tokens, not
 * the page's CSS variables: Tailwind only emits those a class uses, and the site sets flow colours
 * inline.
 */
const flowByColour = Object.fromEntries(
  Object.entries(flow).map(([name, hex]) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [`rgb(${value >> 16}, ${(value >> 8) & 255}, ${value & 255})`, name];
  }),
);

/** The site's step caption (StepCaption): number, count, title and flow. */
const readCaption = () =>
  page.evaluate((flowByColour) => {
    // "Step 3 / 8", then the title right after it, wherever the transport nests them.
    const region = document.querySelector("section[aria-label^='Scenario']");
    const label = [...(region?.querySelectorAll("div[aria-live='polite'] *") ?? [])].find((el) =>
      /^Step\s+\d+\s*\/\s*\d+$/i.test(el.textContent?.trim() ?? ""),
    );
    const title = label?.nextElementSibling;
    // A step with a lead shows it right under its title; its body waits behind "More".
    const lead =
      title?.nextElementSibling?.nextElementSibling?.tagName === "BUTTON"
        ? title.nextElementSibling.textContent?.trim()
        : undefined;
    const match = label?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
    if (!label || !title || !match) return null;
    const colour = getComputedStyle(label).color;
    const flow = flowByColour[colour];
    if (!flow) throw new Error(`Step caption in ${colour}, which is no flow colour`);
    return {
      number: Number(match[1]),
      count: Number(match[2]),
      title: title.textContent?.trim() ?? "",
      ...(lead ? { lead } : {}),
      flow,
    };
  }, flowByColour);

const canvasSize = () =>
  page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return canvas ? `${canvas.width}x${canvas.height}` : "";
  });

/** Moves animation time on by `ms` and waits until the GPU has drawn that instant. */
async function renderAt(ms) {
  await page.evaluate((delta) => window.__advance(delta), ms);
  // Software WebGL queues the work behind the page's back: reading a pixel waits for it.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const canvas = document.querySelector("canvas");
        const gl = canvas?.getContext("webgl2");
        if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        setTimeout(resolve, 0);
      }),
  );
}

// Stop the autoplay; from here, time moves one video frame per capture.
await click("button", "Pause");
await page.evaluate(() => window.__virtual());
let lastSize = await canvasSize();

const steps = [];
const clicks = [];
const started = Date.now();
for (let frame = 0; frame < frames; frame++) {
  for (const action of shots.actions.filter((a) => a.frame === frame)) {
    const { box, at } = await click(action.kind, action.name);
    // The transport is driven blind; a switch or a stage tool is where the video's cursor goes.
    if (action.kind === "switch" || action.cursor)
      clicks.push({ frame, name: action.name, box, at });
  }
  await renderAt(1000 / FPS);
  // A layout change or an adaptive pixel ratio resizes the canvas, which clears it until the next
  // render: draw the same instant again so the capture is not a blank frame.
  const size = await canvasSize();
  if (size !== lastSize) {
    await renderAt(0);
    lastSize = size;
  }
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 95,
    clip: { x: 0, y: 0, ...VIEWPORT, scale: shots.scale },
  });
  writeFileSync(
    join(footageDir, `f${String(frame).padStart(4, "0")}.jpg`),
    Buffer.from(data, "base64"),
  );
  const caption = await readCaption();
  const last = steps.at(-1);
  if (caption && (!last || last.number !== caption.number || last.title !== caption.title)) {
    steps.push({ from: frame, ...caption });
  }
  if (frame % 30 === 0) {
    const perFrame = (Date.now() - started) / (frame + 1);
    console.log(`frame ${frame}/${frames} · ${Math.round(perFrame)} ms/frame`);
  }
}
await browser.close();
if (problems > 0) {
  console.warn(
    `${problems} page error(s) during the capture: see ${join(footageDir, "capture.log")}`,
  );
}

const timeline = {
  source: shots.url,
  footage: { frames, fps: FPS, ...VIEWPORT, scale: shots.scale },
  steps,
  clicks,
};
writeFileSync(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`);
console.log(`${frames} frames of ${url} in ${footageDir}, timeline in ${timelinePath}`);
