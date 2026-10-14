/** What a third-party package does for the code that imports it. */
export const externalCategories = [
  "database",
  "cache",
  "queue",
  "storage",
  "http-server",
  "http-client",
  "payment",
  "email",
  "auth",
  "ai",
  "analytics",
  "monitoring",
  "ui",
  "3d",
  "media",
  "state",
  "validation",
  "testing",
  "build",
  "cli",
  "other",
] as const;
export type ExternalCategory = (typeof externalCategories)[number];

/** Names, or scopes written "@scope/*", by category. Unknown packages are "other". */
const KNOWN: Record<Exclude<ExternalCategory, "other">, readonly string[]> = {
  database: [
    "pg",
    "postgres",
    "mysql",
    "mysql2",
    "mariadb",
    "sqlite3",
    "better-sqlite3",
    "@libsql/client",
    "@prisma/client",
    "drizzle-orm",
    "kysely",
    "knex",
    "typeorm",
    "sequelize",
    "mongoose",
    "mongodb",
    "@neondatabase/serverless",
    "@planetscale/database",
    "@supabase/supabase-js",
    "@vercel/postgres",
    "@electric-sql/pglite",
    "firebase-admin",
    "dexie",
    "idb",
  ],
  cache: ["redis", "ioredis", "@upstash/redis", "@vercel/kv", "memcached", "lru-cache", "keyv"],
  queue: [
    "bullmq",
    "bull",
    "kafkajs",
    "amqplib",
    "@aws-sdk/client-sqs",
    "@google-cloud/pubsub",
    "nats",
    "inngest",
    "@trigger.dev/sdk",
    "@upstash/qstash",
  ],
  storage: ["@aws-sdk/client-s3", "@google-cloud/storage", "@vercel/blob", "minio", "uploadthing"],
  "http-server": [
    "express",
    "fastify",
    "koa",
    "hono",
    "@hono/*",
    "next",
    "@nestjs/*",
    "h3",
    "elysia",
    "@remix-run/*",
    "@sveltejs/kit",
    "nuxt",
    "astro",
    "@trpc/server",
    "@apollo/server",
    "graphql-yoga",
  ],
  "http-client": [
    "axios",
    "got",
    "ky",
    "node-fetch",
    "undici",
    "@trpc/client",
    "@apollo/client",
    "graphql-request",
    "swr",
    "@tanstack/react-query",
  ],
  payment: ["stripe", "@stripe/*", "@lemonsqueezy/*", "@paddle/*"],
  email: ["resend", "nodemailer", "@sendgrid/*", "postmark", "@react-email/*", "mailgun.js"],
  auth: [
    "next-auth",
    "@auth/*",
    "@clerk/*",
    "lucia",
    "better-auth",
    "passport",
    "jsonwebtoken",
    "jose",
    "bcrypt",
    "bcryptjs",
    "argon2",
  ],
  ai: [
    "openai",
    "@anthropic-ai/*",
    "ai",
    "@ai-sdk/*",
    "langchain",
    "@langchain/*",
    "@google/generative-ai",
    "replicate",
    "@mistralai/*",
  ],
  analytics: ["posthog-js", "posthog-node", "@vercel/analytics", "mixpanel", "@amplitude/*"],
  monitoring: ["@sentry/*", "pino", "winston", "@opentelemetry/*", "dd-trace"],
  ui: [
    "react",
    "react-dom",
    "vue",
    "svelte",
    "solid-js",
    "preact",
    "@radix-ui/*",
    "framer-motion",
    "motion",
    "lucide-react",
    "@headlessui/*",
    "@fontsource/*",
  ],
  "3d": ["three", "@react-three/*", "@babylonjs/*", "pixi.js", "ogl"],
  media: ["remotion", "@remotion/*", "sharp", "@resvg/*", "satori", "canvas"],
  state: ["zustand", "redux", "@reduxjs/*", "jotai", "mobx", "xstate", "valtio", "immer"],
  validation: ["zod", "yup", "joi", "valibot", "ajv", "@sinclair/typebox", "superstruct"],
  testing: [
    "vitest",
    "jest",
    "@playwright/test",
    "playwright",
    "@testing-library/*",
    "cypress",
    "mocha",
    "chai",
    "supertest",
    "msw",
  ],
  build: ["vite", "webpack", "esbuild", "rollup", "tsup", "typescript", "@vitejs/*", "@babel/*"],
  cli: ["commander", "yargs", "cac", "chalk", "ora", "inquirer", "@clack/prompts", "picocolors"],
};

const byName = new Map<string, ExternalCategory>();
const byScope = new Map<string, ExternalCategory>();
for (const category of externalCategories) {
  if (category === "other") {
    continue;
  }
  for (const name of KNOWN[category]) {
    if (name.endsWith("/*")) {
      byScope.set(name.slice(0, -2), category);
    } else {
      byName.set(name, category);
    }
  }
}

export function categoryOf(packageName: string): ExternalCategory {
  const known = byName.get(packageName);
  if (known) {
    return known;
  }
  const scope = packageName.startsWith("@") ? packageName.split("/")[0] : undefined;
  return (scope && byScope.get(scope)) || "other";
}

/** The package a bare specifier names: "@scope/name/sub" → "@scope/name", "name/sub" → "name". */
export function packageName(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : (segments[0] ?? specifier);
}

/** Node's own modules: the runtime, not a dependency worth drawing. */
const BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "crypto",
  "dns",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "querystring",
  "readline",
  "stream",
  "string_decoder",
  "test",
  "timers",
  "tls",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

export function isBuiltin(specifier: string): boolean {
  return specifier.startsWith("node:") || BUILTINS.has(specifier.split("/")[0] ?? "");
}
