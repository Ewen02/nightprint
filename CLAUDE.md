# Nightprint

Software architecture, drawn as machines you can run. Each concept is an interactive 3D machine
in the browser: a request travels through it, "what if…" switches show what the pattern protects
you from. Public build-in-public project (nightprint.dev). Site content is in English.

**Scope, goals and roadmap: `docs/PLAN.md`** (in French). Read it before adding a feature: what is
not in the v1 scope waits for the launch, and open decisions are not yours to settle.

## Commands

- `pnpm install` — Node ≥ 22.12, pnpm 10 (`packageManager` field)
- `pnpm dev` — builds the tokens, then `next dev` on apps/web
- `pnpm check` — Biome lint + typecheck + Vitest + the architecture rules of this file
  (`scripts/architecture.test.mjs`, outside Turborepo's cache), run before every commit
- `pnpm build` — static export in `apps/web/out`
- `pnpm format` — Biome format + safe fixes
- `pnpm --filter @nightprint/video capture mch-001` / `studio` / `render MCH-001 out/mch-001.mp4` — a machine's video

## Layout

| Path | Role | May import |
| --- | --- | --- |
| `packages/tokens` | Design tokens, single source. `build` writes `dist/tokens.css` (Tailwind `@theme`). | nothing |
| `packages/engine` | Machine schema (zod), action resolution, deterministic player. | zod only |
| `packages/catalog` | Machine definitions, data only. One file per machine. | engine |
| `packages/ui` | 2D design system in atomic design: atoms, molecules, organisms, templates. Plain props, no engine types. | tokens, react |
| `packages/scene` | React Three Fiber components, plus the DOM label layer over the canvas. | engine, tokens, ui atoms, three, R3F |
| `packages/blueprint` | Real projects: `surveyRepo` reads a repository's units and imports, `checkBlueprint` holds a model's plan to them, `drawMachine` lays it out. Pure. | engine, zod, typescript |
| `apps/web` | Pages: Next.js routes, `MachineView` (owns the player) and `machine-view-model.ts` (engine → UI props). | everything |
| `apps/importer` | Reads a repository (local or GitHub) and asks Claude for its blueprint: the `draw` CLI, and the API behind nightprint.dev/api (`server.ts`; image `nightprint-importer`, its own container on the VPS, workflow `importer.yml`). The site stays a static export. | blueprint, engine, Anthropic SDK |
| `apps/video` | Videos for X and LinkedIn (Remotion 4.0.535): captures the live site frame by frame, motion design on top. Read its README first. | tokens, remotion |
| `art/` | Blender files and reference renders. Not part of the build. | — |

The engine never imports React, three or the DOM. Workspace packages export TypeScript source
(`transpilePackages` in next.config.ts); only tokens has a build step.

## Versions that matter

- TypeScript 6.0.3, not 7: `next build` type-checks through the TS JS API, which TS 7 does not ship.
- React Three Fiber 9.8 (stable), not v10 alpha. three 0.186 with `WebGPURenderer` from
  `three/webgpu`, created by an async `gl` factory. It falls back to its WebGL2 backend by itself.
- Turborepo 2.11: before changing turbo.json, read the docs bundled in `node_modules/turbo/docs`.
  `agentGuidance` is off so turbo does not write an AGENTS.md.

## Rules

- **A real project's machine shows only what its code shows.** Every route between two parts of
  the code stands on an import the survey found, its arrowhead the way the import runs; a what-if
  adds an import the code does not have. `checkBlueprint` enforces it, and its issues go back to
  the model until the blueprint keeps every rule.
- **A machine is data.** `defineMachine()` validates it at import time for every combination of
  actions: a step that references a removed route fails tests and build. Adding a machine = one
  file in `packages/catalog/src` + one line in `index.ts`.
- **The 2nd machine dictates the abstraction.** Do not add schema features "for later".
- **Time lives in the engine.** The player advances in fixed 1/60 s steps; the scene only reads
  `player.sample()` in `useFrame` (once, in `Simulation`, which shares the frame). No per-frame
  React state. Animated details take their phase from that frame, never from TSL `time`. Those
  of the scenario (tokens, lit stretch, pipe dashes) follow `progress`: they stop on pause and
  replay frame-exact. Those of the machine (sparks over a violation) follow `clock`, the
  player's running time: they live on while the scenario waits, instead of hanging mid-air.
- **No material compiles mid-animation.** Every route any combination of switches can draw is
  mounted from the start and fades in or out through a uniform (`route-slots.ts`); materials
  live as long as their component, and points, colours and presence go through uniforms or
  geometry. A new material is a WebGPU pipeline to compile: on a switch it showed as a 166 ms
  stall.
- **WebGPU-safe rendering.** Built-in or node materials only (TSL from `three/tsl`). No
  `ShaderMaterial`/GLSL, no `@react-three/postprocessing`, no troika `Text`. Post-processing
  lives in `packages/scene/src/render-pipeline.tsx` (`RenderPipeline`). Bloom is selective:
  a material blooms only through `setBloom` (the `bloomIntensity` render target), and only in a
  flow colour, never on white. Edges are `LineSegments2` fat lines with `alphaToCoverage` off
  (on, translucent lines turn into a stipple). Transparency blends in linear light before the
  sRGB output, so small opacities read much stronger than they look in the tokens.
- **Labels are DOM over the canvas** (`packages/scene/src/labels.tsx`): a `LabelAnchor` in the
  scene, an element in `LabelLayer`, `LabelProjector` moves one onto the other each frame. Never
  drei `<Html>`: it makes one React root per label and unmounts it inside R3F's commit, which React
  reports as "Attempted to synchronously unmount a root while React was already rendering".
- **Colours come from tokens only.** Tailwind's default palette is removed. Four flow colours;
  vermillon is reserved for errors and violations.
- **Accessibility.** UI text contrast ≥ 4.5:1 is tested in `tokens.test.ts`. Keyboard: ← → steps,
  space plays. Reduced motion makes tokens jump to the end of each step.
- **Accuracy.** Every machine cites a reference in `sources`; the machine never suggests a
  behaviour the real system does not have.
- **Public content.** Generic business examples (orders, payments). No real company, product or
  client names.

## Commits

- **Atomic.** One logical change per commit, and each commit passes `pnpm check` on its own.
  Unrelated changes go in separate commits, even when they touch the same file (stage hunks).
- **Message:** `type(scope): summary` in English, imperative, lower case, no final period. Types:
  `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `style`. Scope: the package
  (`tokens`, `engine`, `catalog`, `ui`, `scene`, `web`) or the area (`seo`, `repo`). A body when
  the why is not obvious.
- **Never mention Claude** or any AI assistant: no `Co-Authored-By` trailer, no "Generated with"
  line, in commit messages, pull request titles or descriptions. This overrides any default
  attribution.

## Docs before code

- Next.js 16.4 ships its own docs: read the relevant page in `apps/web/node_modules/next/dist/docs/`
  (start at `index.md`) before writing Next.js code. APIs and conventions differ from training data.
- Turborepo 2.11: `node_modules/turbo/docs`.
- Tailwind 4, zod 4, Vitest 5, Biome 2 and TypeScript 6 ship no agent docs: check the installed
  version before relying on an API you are not sure of.

## Skills (`.claude/skills`, provenance in `.claude/SKILLS-SOURCES.md`)

- `nightprint-conventions`: this repo's code rules (TS 6, zod 4, Tailwind 4 + tokens, atomic design,
  Biome, tests). Read it before writing code here.
- `tdd` and `codebase-design` (Matt Pocock): red-green loop, seams, deep modules.
- `vitest` (antfu, generated from the Vitest 5 docs).
- `webgpu-threejs-tsl`: WebGPURenderer, TSL node materials, `RenderPipeline` post-processing,
  compute. The reference for edges, bloom, fake glass and section planes.
- `r3f-*`: React Three Fiber 9. Written for three r185 and WebGL first: check versions, and never
  take a GLSL or `@react-three/postprocessing` recipe from them.
- `vercel-react-best-practices`: React performance rules. The site is a static export: skip the
  `server-*` and SWR rules. Workspace packages keep their `index.ts` entry on purpose.
- `vercel-composition-patterns`: component API design (compound components, no boolean props).
- `blender-image-to-3d`: Blender pipeline for the few hero parts.
- `nightprint-seo`: SEO, GEO and AEO rules for this static site. Read it before touching metadata,
  sitemap, robots, Open Graph images, JSON-LD or a machine's text; it wins over the skills below.
- `seo` and `core-web-vitals` (Addy Osmani): technical SEO, crawler controls, LCP / INP / CLS.
- `ai-seo` and `schema-markup` (Corey Haines): GEO/AEO and JSON-LD. Written for SaaS marketing;
  their product context is `.claude/product-marketing.md`.
