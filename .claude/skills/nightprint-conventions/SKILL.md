---
name: nightprint-conventions
description: House rules for writing code in the Nightprint monorepo — TypeScript 6, zod 4, Tailwind 4 with design tokens, atomic design in @nightprint/ui, Biome, Vitest, and the engine/scene/ui boundaries. Use before adding or changing any component, machine definition, engine code, style or test in this repo.
---

# Nightprint conventions

Read `CLAUDE.md` first for the architecture. This skill is the code-level checklist.

## Where code goes

| You are adding… | It goes in | It may import |
| --- | --- | --- |
| A colour, size, radius, easing | `packages/tokens/src/index.ts` (then `pnpm --filter @nightprint/tokens build`) | nothing |
| A machine | `packages/catalog/src/mch-NNN-<slug>.ts` + one line in `index.ts` | engine |
| Simulation, timing, resolution logic | `packages/engine` | zod |
| A 3D primitive or scene behaviour | `packages/scene` | engine, tokens, ui (atoms only), three, R3F |
| A 2D component | `packages/ui`, at its atomic level (below) | tokens, react |
| Mapping engine data to UI props | `apps/web/components/machine-view-model.ts` | engine, ui |
| A route | `apps/web/app` | everything |

## Atomic design in `@nightprint/ui`

- **Atoms** (`src/atoms`): one element, styled only with tokens. No layout of siblings, no data shapes. Examples: `Balloon`, `Button`, `IconButton`, `Toggle`, `FlowTag`, `StepDot`, `MonoLabel`, `ChevronIcon`.
- **Molecules** (`src/molecules`): a few atoms doing one job together. Examples: `PartRow`, `WhatIfSwitch`, `StepDots`, `StepCaption`, `LogLine`, `MachineCard`, `Breadcrumb`.
- **Organisms** (`src/organisms`): a section of a page with its own heading or landmark, built from molecules. Examples: `BillOfParts`, `WhatIfPanel`, `Transport`, `EventLog`, `Cartouche`, `SiteHeader`, `MachineCatalogue`, `ConceptArticle`.
- **Templates** (`src/templates`): layout only, slots as `ReactNode` props, no data. `MachineTemplate`, `HomeTemplate`, `MachineFigure`.
- **Pages**: the Next.js routes in `apps/web/app` plus `MachineView`, which owns the player and fills the template.
- A level imports only from levels below it. Never import an organism into a molecule.
- UI components take plain props (`flow: FlowName`, `number`, `label`), never engine types. The engine-to-props mapping lives in `machine-view-model.ts`.
- Every new component gets a preview in the design system artifact, under its level's group.

## TypeScript 6

- Strict mode, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`: use `import type` for types, handle `undefined` from index access explicitly (no `!`).
- Props interfaces are `readonly`; arrays in props are `readonly T[]`.
- Discriminated unions over optional-field bags; switch on the discriminant and let TypeScript check exhaustiveness.
- No `any`, no `as` casts except at a validated boundary (and say why in a comment).
- Do not upgrade to TypeScript 7: `next build` type-checks through the JS API that TS 7 does not ship.

## zod 4 (engine and catalog only)

- Schemas live in `packages/engine/src/schema.ts`; author with `z.input`, consume `z.output` (defaults applied).
- Use zod 4 APIs: `z.url()`, `z.prettifyError()`, `.readonly()` on tuples.
- What zod cannot express (unique ids, references, every action combination) goes in `validateMachine`, which must report every problem, not the first.

## Tailwind 4 and tokens

- The default palette is removed (`--color-*: initial`). Colours exist only as token utilities: `bg-surface`, `text-text-secondary`, `border-line`, `text-flow-error`.
- No arbitrary colour values (`bg-[#123456]`) and no inline hex in components: import from `@nightprint/tokens` when a colour must be dynamic (flow colours).
- Type utilities come from the scale: `text-display`, `text-title`, `text-heading`, `text-body`, `text-small`, `text-log`, `text-micro`, plus the `mono-label` utility.
- Any workspace package that carries classes must be listed with `@source` in `apps/web/app/globals.css`.
- UI text stays at 4.5:1 or more: add a token and let `tokens.test.ts` check it rather than eyeballing.

## Biome

- `pnpm format` before committing; `pnpm check` must pass (lint, typecheck, tests).
- Suppress a rule only on the line, with `biome-ignore <rule>: <reason>`. R3F JSX is exempted from `noStaticElementInteractions` in `biome.json`.

## Tests (Vitest 5)

- Engine and catalog: behaviour through the public API (`createPlayer`, `resolveMachine`, `defineMachine`), never internals. Determinism tests feed different frame rates and expect identical state.
- Every machine is tested to play to the end under every action combination (catalog test does it for you).
- UI: render with `renderToStaticMarkup` and assert accessibility contracts (`role`, `aria-checked`, `aria-current`, accessible names), not class names.
- Expected values come from the spec or a worked example, never recomputed the way the code does.

## Rendering (WebGPU)

- Built-in or node materials only; TSL from `three/tsl`; post-processing through `RenderPipeline`. See the `webgpu-threejs-tsl` skill.
- The scene reads the player in `useFrame` and never stores per-frame values in React state.
- Text in the scene (part numbers, later dimensions) is DOM, not 3D: a `LabelAnchor` in the scene, an element in `LabelLayer`, `LabelProjector` writes the transform each frame (`packages/scene/src/labels.tsx`). Never drei `<Html>`: one React root per label, unmounted inside R3F's commit, which React reports as a race in Strict Mode.
- R3F turns PCFSoftShadowMap on even without shadows; keep `shadows={NO_SHADOWS}` on the Canvas or WebGPURenderer warns on every page.
