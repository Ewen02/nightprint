# Nightprint

Software architecture, drawn as machines you can run.

MCH-001 — Hexagonal architecture: follow `POST /orders` through ports and adapters, swap Postgres
for an in-memory adapter without touching the core, then make the core import Postgres and watch
the swap break.

Goals, scope and roadmap: [docs/PLAN.md](docs/PLAN.md) (French).

## Run

```sh
pnpm install
pnpm dev     # http://localhost:3000
pnpm check   # lint, typecheck, tests
pnpm build   # static site in apps/web/out
```

Stack: Next.js 16 (static export), React Three Fiber 9, three.js WebGPURenderer (WebGL 2
fallback), TypeScript, zod, Tailwind CSS 4, Turborepo, Vitest, Biome.
