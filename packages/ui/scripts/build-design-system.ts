/**
 * Builds the files the design system artifact runs its live previews on:
 *   design-system/bundle.js   one IIFE assigning window.Nightprint (React 18 UMD globals)
 *   design-system/bundle.css  Tailwind compiled for the ui sources, tokens included
 *   design-system/index.d.ts  the props interfaces, as documentation
 * Run with `pnpm --filter @nightprint/ui design-system`.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { build, type Plugin } from "esbuild";
import postcss from "postcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "design-system");
const NAMESPACE = "Nightprint";

/** React, ReactDOM and the JSX runtime come from the preview frame's globals. */
const reactGlobals: Plugin = {
  name: "react-globals",
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/jsx-runtime)?$/ }, (args) => ({
      path: args.path,
      namespace: "react-globals",
    }));
    b.onLoad({ filter: /.*/, namespace: "react-globals" }, (args) => {
      if (args.path === "react/jsx-runtime") {
        return {
          loader: "js",
          contents: [
            "const R = window.React;",
            "export const Fragment = R.Fragment;",
            "export function jsx(type, props, key) {",
            "  return R.createElement(type, key === undefined ? props : Object.assign({}, props, { key }));",
            "}",
            "export const jsxs = jsx;",
          ].join("\n"),
        };
      }
      const global = args.path === "react-dom" ? "ReactDOM" : "React";
      return { loader: "js", contents: `module.exports = window.${global};` };
    });
  },
};

function componentNames(): string[] {
  const index = readFileSync(join(src, "index.ts"), "utf8");
  return [...index.matchAll(/export \{\s*([A-Z]\w+),/g)]
    .map((m) => m[1])
    .filter((name): name is string => name !== undefined);
}

async function buildBundle(): Promise<void> {
  const result = await build({
    entryPoints: [join(src, "index.ts")],
    bundle: true,
    format: "iife",
    globalName: NAMESPACE,
    platform: "browser",
    target: "es2020",
    minify: true,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [reactGlobals],
    write: false,
  });
  const code = result.outputFiles[0]?.text ?? "";
  if (/<\/script|<!--/i.test(code)) {
    throw new Error("bundle.js contains </script or <!--, it cannot be inlined");
  }
  const header = {
    format: 4,
    namespace: NAMESPACE,
    components: componentNames().map((name) => ({ name })),
  };
  writeFileSync(join(out, "bundle.js"), `/* @ds-bundle: ${JSON.stringify(header)} */\n${code}`);
}

async function buildCss(): Promise<void> {
  const from = join(root, "scripts", "design-system.css");
  const input = [
    '@import "tailwindcss";',
    '@import "@nightprint/tokens/tokens.css";',
    '@source "../src";',
    "@layer base {",
    "  :root { color-scheme: dark; }",
    "  html, body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); }",
    "  :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }",
    "}",
  ].join("\n");
  const result = await postcss([tailwind()]).process(input, { from });
  if (/<\/style/i.test(result.css)) {
    throw new Error("bundle.css contains </style");
  }
  writeFileSync(join(out, "bundle.css"), result.css);
}

function buildTypes(): void {
  const blocks: string[] = [
    "// Props of @nightprint/ui, for reading. Generated from packages/ui/src.",
    'import type { ReactNode } from "react";',
    'export type FlowName = "request" | "write" | "response" | "error";',
  ];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
        const text = readFileSync(path, "utf8");
        for (const m of text.matchAll(/^export interface \w+ \{[\s\S]*?^\}/gm)) {
          blocks.push(m[0]);
        }
      }
    }
  };
  walk(src);
  writeFileSync(join(out, "index.d.ts"), `${blocks.join("\n\n")}\n`);
}

mkdirSync(out, { recursive: true });
await buildBundle();
await buildCss();
buildTypes();
console.log(`design system → ${out}`);
