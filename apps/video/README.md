# @nightprint/video

The videos posted for each machine on X and LinkedIn, made with [Remotion](https://www.remotion.dev).
The machine is never redrawn: every frame of it is the live site, captured frame by frame, and
the motion design (camera, captions, cursor, end card) is React on top.

## Make a machine's video

```bash
pnpm --filter @nightprint/video capture mch-001   # live site → public/footage/mch-001 + timeline.json
pnpm --filter @nightprint/video studio            # preview and tweak in Remotion Studio
pnpm --filter @nightprint/video render MCH-001 out/mch-001.mp4
```

The first capture needs a browser for Playwright: `pnpm --filter @nightprint/video exec playwright
install chromium`. The footage (about 240 MB per machine) is not committed; `timeline.json` is.

If the render stops at "Getting composition" with `Target closed`, Remotion's own headless browser
crashed: render with Playwright's instead, `--browser-executable=<path>` set to the
`chrome-headless-shell` under `~/Library/Caches/ms-playwright/chromium_headless_shell-*/`.

To film a page before it is deployed (a new machine, a fix), build the site and capture it locally:

```bash
pnpm build && python3 -m http.server 4173 --directory apps/web/out
pnpm --filter @nightprint/video capture mch-001 --from http://localhost:4173
```

## How it fits together

| File | Role |
| --- | --- |
| `src/<id>/shots.json` | What to capture: the page, how many frames, which buttons and switches to click when; `"cursor": true` records a button's click for the cursor, as a switch's always is. `setup` clicks before the run starts: `{ "kind": "toggle", "name": "Event log" }` folds the log away, so the drawing keeps one size as lines come in. |
| `scripts/capture.mjs` | Freezes the page's animation time, advances it one video frame per screenshot, writes the images and `timeline.json` (step captions, and the clicks the cursor goes to, frame by frame). Always draws with WebGL2: it waits for the GPU by reading a pixel back. |
| `src/<id>/timeline.json` | What happened in the footage. The composition times its captions and cursor from it. |
| `src/<id>/<Id>.tsx` | The video: camera keyframes, then the overlays, placed on the timeline. Every moment is read from `timeline.json` (a click, a step), never typed as a frame number, so a new capture keeps them in place. |
| `src/components` | Reusable overlays, registered as connected compositions under "Elements" in Studio. |

## Rules

- Colours come from `@nightprint/tokens`, type is IBM Plex from the same Fontsource files as the
  site. Vermilion only for errors and violations, as on the site.
- Animate with `useCurrentFrame()` and `interpolate()`, never CSS transitions (they do not render).
- Text sized for a phone: a 1920×1080 frame shows at about a fifth of its size in the feed.
- The capture is 1.5× the page size, so the camera can zoom up to 1.5 without upscaling; `Footage`
  fails the render on a closer key.
- The Remotion skills in use are the official ones (`npx skills add remotion-dev/skills`); keep
  Remotion packages on the exact same version as each other.
