// The rules of CLAUDE.md that nothing else enforces, read off the sources on every `pnpm check`.
// Outside Turborepo on purpose: a test inside one package would be cached on that package's
// files and miss a change in another one.
//
// An exception goes in a rule's `allow`, keyed by path, with the reason as its value. An entry
// that no longer matches anything fails too, so the list never outlives its reasons.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".next", "out", ".turbo", "design-system"]);

/** Every TypeScript source under `dir`, relative to the repo root. */
function sources(dir) {
  const found = [];
  const walk = (at) => {
    for (const entry of readdirSync(join(root, at), { withFileTypes: true })) {
      if (SKIP.has(entry.name)) {
        continue;
      }
      const path = join(at, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (/\.tsx?$/.test(entry.name)) {
        found.push(path);
      }
    }
  };
  walk(dir);
  return found;
}

const isTest = (path) => /\.test(-helper)?\.tsx?$/.test(path);

/** The code without its comments, so a rule can be explained in one without tripping itself. */
function code(path) {
  return readFileSync(join(root, path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Module specifiers a file imports or re-exports, static or dynamic. */
function imports(source) {
  const pattern =
    /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
  return [...source.matchAll(pattern)].map((m) => m[1] ?? m[2] ?? m[3]);
}

/**
 * Runs `find` on every file and returns what it reports, minus the allowed files, plus a
 * report for every allowed file that is clean now.
 */
function check(files, find, allow = {}) {
  const problems = [];
  const used = new Set();
  for (const path of files) {
    const found = find(path, code(path));
    if (found.length === 0) {
      continue;
    }
    if (path in allow) {
      used.add(path);
      continue;
    }
    problems.push(...found.map((what) => `${path}: ${what}`));
  }
  for (const path of Object.keys(allow)) {
    if (!used.has(path)) {
      problems.push(`${path}: allowed ("${allow[path]}") but breaks the rule no more; remove it`);
    }
  }
  return problems;
}

/** Imports outside `allowed` (bare specifiers or their prefixes); relative ones always pass. */
function importsOnly(allowed) {
  return (path, source) =>
    imports(source)
      .filter((spec) => !spec.startsWith("."))
      .filter((spec) => !allowed.some((ok) => spec === ok || spec.startsWith(`${ok}/`)))
      .filter((spec) => !(isTest(path) && spec === "vitest"))
      .map((spec) => `imports "${spec}"`);
}

test("the engine imports zod and nothing else: no React, no three, no DOM", () => {
  assert.deepEqual(check(sources("packages/engine/src"), importsOnly(["zod"])), []);
});

test("a machine is data: the catalog imports the engine only", () => {
  assert.deepEqual(check(sources("packages/catalog/src"), importsOnly(["@nightprint/engine"])), []);
});

test("the UI knows neither the engine nor the scene", () => {
  const banned = [
    "@nightprint/engine",
    "@nightprint/catalog",
    "@nightprint/scene",
    "three",
    "@react-three",
  ];
  const find = (_path, source) =>
    imports(source)
      .filter((spec) => banned.some((b) => spec === b || spec.startsWith(`${b}/`)))
      .map((spec) => `imports "${spec}"`);
  assert.deepEqual(check(sources("packages/ui/src"), find), []);
});

test("the scene renders WebGPU-safe: node materials, its own pipeline, DOM labels", () => {
  const find = (_path, source) => {
    const found = [];
    for (const name of ["ShaderMaterial", "RawShaderMaterial", "onBeforeCompile"]) {
      if (new RegExp(`\\b${name}\\b`).test(source)) {
        found.push(`uses ${name}: GLSL never reaches WebGPU`);
      }
    }
    const specs = imports(source);
    if (specs.some((s) => s.startsWith("@react-three/postprocessing"))) {
      found.push("imports @react-three/postprocessing: post-processing is RenderPipeline's");
    }
    if (/import\s*\{[^}]*\bHtml\b[^}]*\}\s*from\s*["']@react-three\/drei["']/.test(source)) {
      found.push("imports drei <Html>: labels are the DOM layer of labels.tsx");
    }
    if (/import\s*\{[^}]*\btime\b[^}]*\}\s*from\s*["']three\/tsl["']/.test(source)) {
      found.push("imports TSL time: animated details take their phase from the player's frame");
    }
    return found;
  };
  const everywhere = [
    ...sources("packages/scene/src"),
    ...sources("apps/web"),
    ...sources("packages/ui/src"),
  ];
  assert.deepEqual(check(everywhere, find), []);
});

test("colours come from the tokens: no hex literal outside packages/tokens", () => {
  const find = (path, source) =>
    isTest(path)
      ? []
      : [...source.matchAll(/["'`(\s:]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g)].map(
          (m) => `hex colour ${m[0].trim().slice(1)}`,
        );
  const files = [
    "packages/engine/src",
    "packages/catalog/src",
    "packages/ui/src",
    "packages/scene/src",
    "apps/web/app",
    "apps/web/components",
    "apps/video/src",
  ].flatMap(sources);
  assert.deepEqual(check(files, find), []);
});

test("the allow-list guard catches a stale exception", () => {
  const stale = check(["packages/engine/src/index.ts"], () => [], {
    "packages/engine/src/index.ts": "an old reason",
  });
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? "", /breaks the rule no more/);
});
