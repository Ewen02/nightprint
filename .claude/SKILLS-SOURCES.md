# Skills tiers installés pour Nightprint (12/10/2026)

Relus avant installation : Markdown uniquement pour R3F, Vercel et WebGPU/TSL (les .js du skill TSL sont des exemples, jamais exécutés) ; scripts bpy locaux sans réseau pour Blender.

| Skill(s) | Source | Commit | Licence |
|---|---|---|---|
| r3f-fundamentals, r3f-geometry, r3f-materials, r3f-shaders, r3f-animation, r3f-lighting, r3f-textures, r3f-loaders, r3f-postprocessing, r3f-interaction, r3f-physics | github.com/EnzeD/r3f-skills | 4a11805f097396fb0b893172efd1e359e8051f92 | MIT (README) |
| blender-image-to-3d | github.com/majidmanzarpour/blender-game-skills | f0ef29385a03de139957e6f700b801cdc00b7e29 | MIT |
| vercel-react-best-practices, vercel-composition-patterns | github.com/vercel-labs/agent-skills (skills/react-best-practices, skills/composition-patterns) | 063bee94c3f4df8453406c830b0a7df0f2860278 | MIT |
| webgpu-threejs-tsl | github.com/dgreenheck/webgpu-claude-skill (skills/webgpu-threejs-tsl) | af2319bd01bb7cc881267a9ef42cafdaf5e9029d | MIT |
| vitest | github.com/antfu/skills (skills/vitest, généré depuis la doc officielle de Vitest 5.0.1) | feb0f3aba6566426f12230e7fc7a10d97c1293bb | MIT |
| tdd, codebase-design | github.com/mattpocock/skills (skills/engineering) ; les dossiers agents/openai.yaml servent à Codex, pas à Claude | 49dd158d1076134a641b33efb035946536778336 | MIT |
| seo, core-web-vitals | github.com/addyosmani/web-quality-skills (skills/seo, skills/core-web-vitals) | afa8da942115f2961fdbfa80807ea0b232ff6c00 | MIT (LICENSE.txt dans chaque dossier) |
| ai-seo, schema-markup | github.com/coreyhaines31/marketingskills (skills/ai-seo, skills/schema ; dossiers evals/ non copiés) ; `schema` renommé `schema-markup` (dossier et champ name) pour ne pas se confondre avec le schéma zod des machines | 1efedbc5148b54b2f0f6c6c9fe0be62e151c7fff | MIT (LICENSE.txt dans chaque dossier) |
| design-taste-frontend (tasteskill v2) | github.com/Leonxlnx/taste-skill (skills/taste-skill ; dossier evals/ non copié ; LICENSE du repo copié en LICENSE.txt) | f624f37a8c650b9cc550253104925efe4c8de246 | MIT (LICENSE.txt) |
| nightprint-seo | écrit pour ce repo : règles SEO/GEO/AEO du site statique, arbitre entre les skills ci-dessus ; contexte produit des skills de Corey Haines dans `.claude/product-marketing.md` | — | — |
| nightprint-conventions | écrit pour ce repo (règles TS 6, zod 4, Tailwind 4 + tokens, atomic design, Biome, Vitest) | — | — |
| motion-design, sound-design, review-loop, web-sims (dans ~/Documents/claude-motion, pas ici) | github.com/whaleyxbt/claude-motion | e627941543d9988b155dc610bb9cc0115a5e365e | MIT (Remotion : licence propre) |

Notes :
- Les skills R3F ciblent Fiber 9 / React 19 / three r185 en WebGL ; WebGPU et TSL sont peu couverts (voir r3f-shaders/references/webgpu.md).
- blender-image-to-3d attend Blender en ligne de commande : /Applications/Blender.app/Contents/MacOS/Blender.
- Mise à jour : re-cloner la source, relire, puis recopier le dossier.
- Pas installés : le skill pnpm d'antfu (écrit pour pnpm 11/12, le repo est en 10.28), web-design-guidelines de Vercel (télécharge ses règles depuis GitHub à chaque usage), les skills Tailwind communautaires (pousseraient la palette par défaut, supprimée ici), les skills TypeScript/zod/Tailwind génériques : remplacés par nightprint-conventions, écrit pour ce repo.
- Next.js 16.4 et Turborepo 2.11 embarquent leurs docs dans node_modules : voir CLAUDE.md.
- SEO/GEO/AEO (12/10/2026) : relus avant installation, Markdown uniquement (aucun script). Écartés : claude-seo d'AgriciDaniel (plugin lourd : environnement Python, Playwright, extensions d'API payantes), seo-audit et programmatic-seo de Corey Haines (orientés SaaS, e-commerce et local ; recouvrent `seo`), seo-aeo-best-practices de Sanity (lié à leur CMS), seo-geo d'opc-skills (scripts DataForSEO avec clés d'API), seo-geo-claude-skills d'aaron-he-zhu (suite marketing large, recouvre le reste).
- Points de désaccord entre ces skills (llms.txt, FAQPage) : `nightprint-seo` tranche.
- tasteskill v2 (15/10/2026) : relu avant installation. Quatre scripts Node sans dépendance (Node 22+) : `inspect.mjs` lance un Chrome local via le protocole DevTools, `assets.mjs` n'appelle que des banques d'images ouvertes (Openverse, Wikimedia Commons, Met, Art Institute of Chicago, NASA, Internet Archive) sans clé d'API. Fichiers de travail dans `.taste-skill/` (ignoré par git) et `~/.taste-skill/history.json`. Son style maison contredit la DA de Nightprint (mono hors code, labels, numéros d'étape, filets) : CLAUDE.md tranche.
