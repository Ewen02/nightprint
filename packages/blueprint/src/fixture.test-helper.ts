import type { Blueprint } from "./blueprint";
import type { RepoFile, RepoSnapshot } from "./files";

/** A small shop: a domain package, a database package, and a Next.js site that uses both. */
const shop: RepoFile[] = [
  { path: "README.md", text: "# Shop\nOrders and payments." },
  { path: "package.json", text: JSON.stringify({ name: "shop", private: true }) },
  {
    path: "packages/core/package.json",
    text: JSON.stringify({ name: "@shop/core", exports: { ".": "./src/index.ts" } }),
  },
  {
    path: "packages/core/src/index.ts",
    text: 'export { placeOrder } from "./order";\nexport type { Money } from "./money.js";',
  },
  {
    path: "packages/core/src/order.ts",
    text: '/** Places an order once it is valid. */\nimport type { Money } from "./money";\nexport function placeOrder(total: Money) { return total; }',
  },
  { path: "packages/core/src/money.ts", text: "export type Money = number;" },
  {
    path: "packages/db/package.json",
    text: JSON.stringify({ name: "@shop/db", dependencies: { pg: "8.0.0" } }),
  },
  {
    path: "packages/db/src/index.ts",
    text: 'import { Pool } from "pg";\nimport { placeOrder } from "@shop/core";\nexport const pool = new Pool();',
  },
  {
    path: "apps/web/package.json",
    text: JSON.stringify({ name: "@shop/web", dependencies: { next: "16.0.0" } }),
  },
  {
    path: "apps/web/tsconfig.json",
    // tsconfig files carry comments and trailing commas.
    text: '{ "compilerOptions": { "paths": { "@/*": ["./*"], }, }, // aliases\n}',
  },
  {
    path: "apps/web/app/(shop)/orders/page.tsx",
    text: 'import { OrderForm } from "@/components/order-form";\nimport { placeOrder } from "@shop/core";\nimport "./orders.css";\nexport default function Page() { return null; }',
  },
  {
    path: "apps/web/app/api/orders/route.ts",
    text: 'import { pool } from "@shop/db";\nimport { readFile } from "node:fs/promises";\nexport async function POST() {}',
  },
  {
    path: "apps/web/components/order-form.tsx",
    text: 'import { useState } from "react";\nexport function OrderForm() { return useState(0); }',
  },
  {
    path: "apps/web/components/order-form.test.tsx",
    text: 'import { describe } from "vitest";\nimport { OrderForm } from "./order-form";\nimport { pool } from "@shop/db";',
  },
  { path: "apps/web/next.config.ts", text: 'import type { NextConfig } from "next";' },
];

export const snapshot: RepoSnapshot = { name: "acme/shop", ref: "abc1234def", files: shop };

/** The shop with a command line that places orders too: three parts of the code import the domain. */
export const hubSnapshot: RepoSnapshot = {
  ...snapshot,
  files: [
    ...shop,
    {
      path: "apps/cli/package.json",
      text: JSON.stringify({ name: "@shop/cli", bin: { shop: "./src/index.ts" } }),
    },
    {
      path: "apps/cli/src/index.ts",
      text: 'import { placeOrder } from "@shop/core";\nplaceOrder(1);',
    },
  ],
};

/** The shop's machine as a draftsman would plan it: every route stands on an import. */
export const shopBlueprint: Blueprint = {
  title: "Shop",
  summary: "A site that places orders through a domain package and stores them in Postgres.",
  family: "backend",
  article: ["The site calls the domain; the database package implements its storage."],
  zones: [
    { id: "callers", label: "Callers", note: "Use the shop" },
    { id: "code", label: "Shop", note: "The repository's code" },
    { id: "services", label: "Services", note: "Used by the code" },
  ],
  layout: {
    kind: "bands",
    center: null,
    why: "Calls run one way: the site, the domain, the database.",
  },
  parts: [
    {
      id: "visitor",
      label: "Visitor",
      role: "CALLER",
      kind: "actor",
      zone: "callers",
      units: [],
      libraries: [],
      description: "Someone ordering in a browser.",
    },
    {
      id: "web",
      label: "Web app",
      role: "SITE",
      kind: "adapter",
      zone: "code",
      units: ["apps-web"],
      libraries: [],
      description: "Pages and endpoints.",
    },
    {
      id: "core",
      label: "Order domain",
      role: "CORE",
      kind: "core",
      zone: "code",
      units: ["packages-core"],
      libraries: [],
      description: "Order rules.",
    },
    {
      id: "db",
      label: "Database package",
      role: "STORAGE",
      kind: "adapter",
      zone: "code",
      units: ["packages-db"],
      libraries: [],
      description: "Saves orders.",
    },
    {
      id: "postgres",
      label: "Postgres",
      role: "DATABASE",
      kind: "store",
      zone: "services",
      units: [],
      libraries: ["pg"],
      description: "Where orders live.",
    },
  ],
  leftOut: [],
  routes: [
    { id: "visit", from: "visitor", to: "web", kind: "pipe", dependsOn: "none" },
    { id: "web-core", from: "web", to: "core", kind: "pipe", dependsOn: "to" },
    { id: "web-db", from: "web", to: "db", kind: "pipe", dependsOn: "to" },
    { id: "db-core", from: "db", to: "core", kind: "pipe", dependsOn: "to" },
    { id: "db-pg", from: "db", to: "postgres", kind: "pipe", dependsOn: "to" },
  ],
  scenarios: [
    {
      id: "place-order",
      title: "Place an order",
      steps: [
        {
          id: "arrive",
          title: "An order arrives",
          body: "The visitor posts the form.",
          flow: "request",
          path: ["visit"],
          reverse: false,
          at: null,
          label: null,
          focus: ["web"],
          log: [{ flow: "request", text: "POST /api/orders" }],
          whenOn: [],
          whenOff: [],
        },
        {
          id: "save",
          title: "Saved",
          body: "The endpoint saves it through the database package.",
          flow: "write",
          path: ["web-db", "db-pg"],
          reverse: false,
          at: null,
          label: null,
          focus: ["db"],
          log: [],
          whenOn: [],
          whenOff: [],
        },
        {
          id: "shortcut",
          title: "The domain reaches for the database",
          body: "With the counter-example on, the domain imports the database package.",
          flow: "error",
          path: ["core-db"],
          reverse: false,
          at: null,
          label: null,
          focus: ["core"],
          log: [],
          whenOn: ["core-imports-db"],
          whenOff: [],
        },
      ],
    },
  ],
  actions: [
    {
      id: "core-imports-db",
      label: "Import the database in the domain",
      description: "The domain calls the database package directly.",
      addRoutes: [{ id: "core-db", from: "core", to: "db" }],
      removeRoutes: [],
      flagParts: ["core"],
    },
  ],
  glossary: [{ term: "Core", definition: "The order rules.", parts: ["core"] }],
};

/**
 * The shop again, its code leaning on the domain: the site, the command line and the
 * database package all import it, from a zone of their own around the domain's.
 */
export const hubBlueprint: Blueprint = {
  ...shopBlueprint,
  zones: [
    { id: "callers", label: "Callers", note: "Use the shop" },
    { id: "apps", label: "Apps", note: "Built on the domain" },
    { id: "heart", label: "Domain", note: "What the rest imports" },
    { id: "services", label: "Services", note: "Used by the code" },
  ],
  layout: {
    kind: "hub",
    center: "core",
    why: "The site, the command line and the database package all import the domain.",
  },
  parts: [
    ...shopBlueprint.parts.map((part) =>
      part.id === "core"
        ? { ...part, zone: "heart" }
        : part.zone === "code"
          ? { ...part, zone: "apps" }
          : part,
    ),
    {
      id: "cli",
      label: "Command line",
      role: "CLI",
      kind: "adapter",
      zone: "apps",
      units: ["apps-cli"],
      libraries: [],
      description: "Places orders from a terminal.",
    },
  ],
  routes: [
    ...shopBlueprint.routes,
    { id: "cli-core", from: "cli", to: "core", kind: "pipe", dependsOn: "to" },
  ],
};

/** The hub's shop drawn as a mirror: the site and its database package on one side, the command line on the other. */
export const mirrorBlueprint: Blueprint = {
  ...hubBlueprint,
  layout: {
    kind: "mirror",
    center: "core",
    why: "The site and the command line both build on the domain, and never on each other.",
  },
};

/** The shop whose site and command line send orders to a Kafka topic the database package reads. */
export const busSnapshot: RepoSnapshot = {
  ...hubSnapshot,
  files: [
    ...hubSnapshot.files,
    {
      path: "apps/web/app/api/orders/events.ts",
      text: 'import { Kafka } from "kafkajs";\nexport const kafka = new Kafka({ brokers: [] });',
    },
    {
      path: "apps/cli/src/events.ts",
      text: 'import { Kafka } from "kafkajs";\nexport const kafka = new Kafka({ brokers: [] });',
    },
    {
      path: "packages/db/src/events.ts",
      text: 'import { Kafka } from "kafkajs";\nexport const kafka = new Kafka({ brokers: [] });',
    },
  ],
};

export const busBlueprint: Blueprint = {
  ...hubBlueprint,
  layout: {
    kind: "bus",
    center: "broker",
    why: "Orders travel through one topic, from the site and the command line to the database package.",
  },
  parts: [
    ...hubBlueprint.parts,
    {
      id: "broker",
      label: "Order topic",
      role: "QUEUE",
      kind: "queue",
      zone: "services",
      units: [],
      libraries: ["kafkajs"],
      description: "Where orders wait.",
    },
  ],
  routes: [
    ...hubBlueprint.routes,
    { id: "web-broker", from: "web", to: "broker", kind: "pipe", dependsOn: "to" },
    { id: "cli-broker", from: "cli", to: "broker", kind: "pipe", dependsOn: "to" },
    { id: "broker-db", from: "broker", to: "db", kind: "pipe", dependsOn: "from" },
  ],
};
