import type { NextConfig } from "next";

const config: NextConfig = {
  // Static site: one HTML page per machine, served by Caddy.
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // CLAUDE.md already points agents at node_modules/next/dist/docs: no generated AGENTS.md.
  agentRules: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: [
    "@nightprint/catalog",
    "@nightprint/engine",
    "@nightprint/scene",
    "@nightprint/tokens",
    "@nightprint/ui",
  ],
};

export default config;
