import { defineMachine } from "@nightprint/engine";

/**
 * PRJ-001 — Nightprint, drawn from its repository at 3fdf528.
 * Written by `pnpm --filter @nightprint/importer draw`: every route stands on an import the
 * survey found. Read it against the code before publishing it.
 */
export const nightprint = defineMachine({
  code: "PRJ-001",
  slug: "nightprint",
  title: "Nightprint",
  summary:
    "Nightprint draws software architecture as machines: a Next.js site renders published machines in the browser from an engine, a 3D scene and a UI kit that share design tokens.",
  family: "frontend",
  category: "PROJECT",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-15",
  sources: [
    {
      label: "Ewen02/nightprint at 3fdf528",
      url: "https://github.com/Ewen02/nightprint/tree/3fdf5282182af0b7810bee7dfe2f36b791e42c6d",
    },
  ],
  article: [
    "The project has three zones, read left to right. Readers hold the visitor's browser, a search crawler or a link-preview fetcher; they reach the site only through the web app's pages and image endpoints. The delivery zone holds the code that turns a machine into a page: the Next.js app, the site views, the 3D scene, the UI kit and the film package.",
    "The core zone holds what the rest depends on: the engine, which defines the machine format and plays it; the design tokens; and the catalogue of published machines, which is written with the engine's definition function.",
    "The imports keep one rule: they point inward, from delivery to core, and not back. The engine imports only zod. The UI kit imports the tokens and no engine code, and the site views are the seam that turns the engine's snapshot into the plain props the UI kit takes.",
    "The web app builds its pages once, at build time, into static files; the browser then runs the stage. Each step of a machine moves a token along a route, and the two what-if switches show what would break if an import crossed a boundary the code keeps today.",
  ],
  glossary: [
    {
      term: "Machine",
      definition:
        "A machine is data: parts, routes between them, scenarios made of steps, and what-if actions, written in the engine's format.",
      parts: ["engine", "catalogue"],
    },
    {
      term: "Engine",
      definition:
        "The definition format and the player: it validates a machine, resolves it for the current actions and advances it in fixed steps.",
      parts: ["engine"],
    },
    {
      term: "Seam",
      definition:
        "The view-model file where the engine's snapshot becomes plain props, so the UI kit never reads the engine.",
      parts: ["site-views", "ui-kit"],
    },
    {
      term: "Static export",
      definition:
        "Pages built once at build time into static files; the browser runs the stage after they load.",
      parts: ["web-app", "site-views"],
    },
    {
      term: "Design tokens",
      definition:
        "Colours, type and flow colours defined once and shared as CSS for the site and as values for the scene.",
      parts: ["tokens", "scene", "ui-kit"],
    },
    {
      term: "Violation",
      definition:
        "An import across a boundary the code keeps today. A what-if action adds one to show what would break.",
      parts: ["engine", "ui-kit"],
    },
  ],
  stage: {
    plate: {
      size: [14.6, 6.5],
      center: [0, 0.25],
    },
    zones: [
      {
        id: "readers",
        label: "Readers",
        note: "Browsers, crawlers and link previews",
        from: [-7.3, -3],
        to: [-3.4, 3.5],
      },
      {
        id: "delivery",
        label: "Delivery",
        note: "Pages, views, drawing and films",
        from: [-3.4, -3],
        to: [3.3999999999999995, 3.5],
      },
      {
        id: "core",
        label: "Core",
        note: "What the rest depends on",
        from: [3.3999999999999995, -3],
        to: [7.3, 3.5],
      },
    ],
  },
  parts: [
    {
      id: "visitor",
      ref: 1,
      label: "Visitor",
      role: "BROWSER",
      kind: "actor",
      shape: {
        type: "box",
        size: [1.4, 0.6, 0.9],
      },
      position: [-5.1, 0.3, 0],
      socket: [0, 0, 0],
      description:
        "A browser, a search crawler or a social network's fetcher. It reaches the web app's pages and image endpoints.",
    },
    {
      id: "scene",
      ref: 2,
      label: "Scene",
      role: "3D DRAWING",
      kind: "adapter",
      shape: {
        type: "box",
        size: [1.5, 0.8, 1],
      },
      position: [-1.7000000000000002, 0.4, -1.7],
      socket: [0.75, -0.10000000000000003, 0],
      description:
        "The 3D drawing of a machine with three.js and React Three Fiber: the plate, parts, routes, tokens and labels.",
    },
    {
      id: "video",
      ref: 3,
      label: "Video",
      role: "VIDEO",
      kind: "adapter",
      shape: {
        type: "box",
        size: [1.5, 0.8, 1],
      },
      position: [-1.7000000000000002, 0.4, 0],
      socket: [0.75, -0.10000000000000003, 0],
      description:
        "Remotion films of three machines, with their own step captions, cursor and end card, rendered from the tokens.",
    },
    {
      id: "ui-kit",
      ref: 4,
      label: "UI kit",
      role: "UI KIT",
      kind: "adapter",
      shape: {
        type: "box",
        size: [1.5, 0.8, 1],
      },
      position: [-1.7000000000000002, 0.4, 1.7],
      socket: [0.75, -0.10000000000000003, 0],
      description:
        "The design system in React: atoms, molecules, organisms and templates, styled by the tokens. It takes plain props and never reads the engine.",
    },
    {
      id: "site-views",
      ref: 5,
      label: "Site views",
      role: "SITE VIEWS",
      kind: "module",
      shape: {
        type: "box",
        size: [1.4, 0.6, 0.9],
      },
      position: [1.7000000000000002, 0.3, -1.7],
      socket: [0, 0, 0],
      description:
        "The site's components and view models: the machine view, the home page, the cards, and the mapping from the engine's snapshot to props.",
    },
    {
      id: "web-app",
      ref: 6,
      label: "Web app",
      role: "NEXT APP",
      kind: "configurator",
      shape: {
        type: "box",
        size: [1.3, 0.45, 0.8],
      },
      position: [1.7000000000000002, 0.225, 0],
      socket: [0, 0.07499999999999998, 0],
      description:
        "The Next.js app: the home page, the machine page and the og.png endpoints. It is exported as static files and plugs the token stylesheet in.",
    },
    {
      id: "catalogue",
      ref: 7,
      label: "Catalogue",
      role: "CONTENT",
      kind: "module",
      shape: {
        type: "box",
        size: [1.4, 0.6, 0.9],
      },
      position: [5.1000000000000005, 0.3, -1.7],
      socket: [0, 0, 0],
      description:
        "The published machines (hexagonal architecture, event loop, cache-aside), each defined with the engine's definition function.",
    },
    {
      id: "tokens",
      ref: 8,
      label: "Tokens",
      role: "DESIGN",
      kind: "core",
      shape: {
        type: "prism",
        sides: 6,
        radius: 0.62,
        height: 0.6,
      },
      position: [5.1000000000000005, 0.3, 0],
      socket: [0, 0, 0],
      description:
        "Design tokens for the drawing style: colours, type scale and flow colours, shared as CSS and as scene values.",
    },
    {
      id: "engine",
      ref: 9,
      label: "Engine",
      role: "ENGINE",
      kind: "core",
      shape: {
        type: "prism",
        sides: 6,
        radius: 0.62,
        height: 0.6,
      },
      position: [5.1000000000000005, 0.3, 1.7],
      socket: [0, 0, 0],
      description:
        "The machine definition format, its validation, the resolver, the player and the log. It imports only zod.",
    },
  ],
  routes: [
    {
      id: "visit-app",
      from: "visitor",
      to: "web-app",
      kind: "pipe",
      via: [
        [-3.3999999999999995, 0.3, 0],
        [-3.3999999999999995, 0.3, 0.85],
        [2.220446049250313e-16, 0.3, 0.85],
        [2.220446049250313e-16, 0.3, 0],
      ],
    },
    {
      id: "app-tokens",
      from: "web-app",
      to: "tokens",
      kind: "wire",
      via: [],
    },
    {
      id: "app-views",
      from: "web-app",
      to: "site-views",
      kind: "pipe",
      via: [
        [3.4000000000000004, 0.3, 0],
        [3.4000000000000004, 0.3, -1.7],
      ],
      dependsOn: "to",
    },
    {
      id: "views-catalogue",
      from: "site-views",
      to: "catalogue",
      kind: "pipe",
      via: [],
      dependsOn: "to",
    },
    {
      id: "views-engine",
      from: "site-views",
      to: "engine",
      kind: "pipe",
      via: [
        [3.5600000000000005, 0.3, -1.7],
        [3.5600000000000005, 0.3, 1.7],
      ],
      dependsOn: "to",
    },
    {
      id: "views-scene",
      from: "site-views",
      to: "scene",
      kind: "pipe",
      via: [],
      dependsOn: "to",
    },
    {
      id: "views-ui",
      from: "site-views",
      to: "ui-kit",
      kind: "pipe",
      via: [
        [0.16000000000000023, 0.3, -1.7],
        [0.16000000000000023, 0.3, 1.7],
      ],
      dependsOn: "to",
    },
    {
      id: "catalogue-engine",
      from: "catalogue",
      to: "engine",
      kind: "pipe",
      via: [
        [6.800000000000001, 0.3, -1.7],
        [6.800000000000001, 0.3, 1.7],
      ],
      dependsOn: "to",
    },
    {
      id: "scene-engine",
      from: "scene",
      to: "engine",
      kind: "pipe",
      via: [
        [-0.16000000000000023, 0.3, -1.7],
        [-0.16000000000000023, 0.3, 1.01],
        [3.24, 0.3, 1.01],
        [3.24, 0.3, 1.7],
      ],
      dependsOn: "to",
    },
    {
      id: "scene-tokens",
      from: "scene",
      to: "tokens",
      kind: "pipe",
      via: [
        [0.3199999999999998, 0.3, -1.7],
        [0.3199999999999998, 0.3, -0.85],
        [3.72, 0.3, -0.85],
        [3.72, 0.3, 0],
      ],
      dependsOn: "to",
    },
    {
      id: "ui-tokens",
      from: "ui-kit",
      to: "tokens",
      kind: "pipe",
      via: [
        [-0.32000000000000023, 0.3, 1.7],
        [-0.32000000000000023, 0.3, 0.69],
        [3.0800000000000005, 0.3, 0.69],
        [3.0800000000000005, 0.3, 0],
      ],
      dependsOn: "to",
    },
    {
      id: "video-tokens",
      from: "video",
      to: "tokens",
      kind: "pipe",
      via: [
        [0.47999999999999976, 0.3, 0],
        [0.47999999999999976, 0.3, 1.17],
        [3.8800000000000003, 0.3, 1.17],
        [3.8800000000000003, 0.3, 0],
      ],
      dependsOn: "to",
    },
  ],
  scenarios: [
    {
      id: "open-machine-page",
      title: "Open a machine page",
      steps: [
        {
          id: "build-pages",
          title: "Build writes the machine pages",
          body: "At build time, the page's generateStaticParams lists the machine slugs, and each page is written into the static export.",
          focus: ["web-app"],
          tokens: [
            {
              flow: "write",
              at: "web-app",
            },
          ],
          log: [
            {
              flow: "write",
              text: "generateStaticParams → /m/[slug]",
            },
          ],
        },
        {
          id: "ask-page",
          title: "A visitor asks for a machine page",
          body: "The visitor's browser asks for a machine's page: one of the web app's pages, already built for that slug.",
          focus: ["visitor", "web-app"],
          tokens: [
            {
              flow: "request",
              path: ["visit-app"],
              reverse: false,
              label: "GET",
            },
          ],
          log: [
            {
              flow: "request",
              text: "GET /m/[slug]",
            },
          ],
        },
        {
          id: "page-to-views",
          title: "The page hands the slug to the views",
          body: "The page route passes the slug to the site views, which build the machine's view.",
          focus: ["web-app", "site-views"],
          tokens: [
            {
              flow: "request",
              path: ["app-views"],
              reverse: false,
              label: "SLG",
            },
          ],
          log: [
            {
              flow: "request",
              text: "Page /m/[slug] → MachineView",
            },
          ],
        },
        {
          id: "read-catalogue",
          title: "The views read the machine",
          body: "The site views read the published machine from the catalogue by its slug.",
          focus: ["site-views", "catalogue"],
          tokens: [
            {
              flow: "request",
              path: ["views-catalogue"],
              reverse: false,
              label: "MCH",
            },
          ],
          log: [
            {
              flow: "request",
              text: "machineBySlug(slug)",
            },
          ],
        },
        {
          id: "ask-engine",
          title: "The views ask the engine for a snapshot",
          body: "The site views call the engine to resolve the machine's scenario into a snapshot for the page.",
          focus: ["site-views", "engine"],
          tokens: [
            {
              flow: "request",
              path: ["views-engine"],
              reverse: false,
              label: "ENG",
            },
          ],
          log: [
            {
              flow: "request",
              text: "scenarioFor → ResolvedMachine",
            },
          ],
        },
        {
          id: "page-returns",
          title: "The visitor gets the page",
          body: "The page's HTML was written at build time: the web app sends it as a file, and no server runs on the way back.",
          focus: ["web-app", "visitor"],
          tokens: [
            {
              flow: "response",
              path: ["visit-app"],
              reverse: true,
            },
          ],
          log: [
            {
              flow: "response",
              text: "Static HTML → browser",
            },
          ],
        },
        {
          id: "draw-in-browser",
          title: "The stage draws the machine in the browser",
          body: "In the browser, the stage hands the machine to the scene, which draws the plate, the parts and the routes.",
          focus: ["site-views", "scene"],
          tokens: [
            {
              flow: "request",
              path: ["views-scene"],
              reverse: false,
              label: "DRW",
            },
          ],
          log: [
            {
              flow: "request",
              text: "MachineStage → Plate",
            },
          ],
        },
      ],
    },
    {
      id: "social-preview",
      title: "Share a machine's preview image",
      steps: [
        {
          id: "ask-image",
          title: "A fetcher asks for the image",
          body: "A crawler or a social network asks for the preview image of a machine's page.",
          focus: ["visitor", "web-app"],
          tokens: [
            {
              flow: "request",
              path: ["visit-app"],
              reverse: false,
              label: "OG",
            },
          ],
          log: [
            {
              flow: "request",
              text: "GET /m/[slug]/og.png",
            },
          ],
        },
        {
          id: "image-to-card",
          title: "The image route builds a card",
          body: "The image route hands the machine to the og card, which takes its headline from the machine.",
          focus: ["web-app", "site-views"],
          tokens: [
            {
              flow: "request",
              path: ["app-views"],
              reverse: false,
              label: "CRD",
            },
          ],
          log: [
            {
              flow: "request",
              text: "machineOgCard → machineHeadline",
            },
          ],
        },
        {
          id: "image-reads-machine",
          title: "The card reads the machine",
          body: "The site views read the machine from the catalogue by its slug, so the card follows the published definition.",
          focus: ["site-views", "catalogue"],
          tokens: [
            {
              flow: "request",
              path: ["views-catalogue"],
              reverse: false,
              label: "MCH",
            },
          ],
          log: [
            {
              flow: "request",
              text: "machineBySlug(slug)",
            },
          ],
        },
        {
          id: "image-returns",
          title: "The image goes back to the fetcher",
          body: "The image returns along the route it came by, from the views through the web app to the fetcher.",
          focus: ["site-views", "web-app", "visitor"],
          tokens: [
            {
              flow: "response",
              path: ["visit-app", "app-views"],
              reverse: true,
            },
          ],
          log: [
            {
              flow: "response",
              text: "og.png → response",
            },
          ],
        },
      ],
    },
    {
      id: "play-a-step",
      title: "Play a step on the stage",
      steps: [
        {
          id: "press-play",
          title: "The visitor presses Play",
          body: "The visitor presses Play on the stage, and the site views advance the machine's player by one step.",
          focus: ["site-views"],
          tokens: [
            {
              flow: "request",
              at: "site-views",
            },
          ],
          log: [
            {
              flow: "request",
              text: "Play → next step",
            },
          ],
        },
        {
          id: "advance-engine",
          title: "The engine advances the player",
          body: "The site views call the engine, which advances the simulation in fixed steps and works out which tokens move.",
          focus: ["site-views", "engine"],
          tokens: [
            {
              flow: "request",
              path: ["views-engine"],
              reverse: false,
              label: "TCK",
            },
          ],
          log: [
            {
              flow: "request",
              text: "FIXED_STEP_MS → tick",
            },
          ],
        },
        {
          id: "light-step",
          title: "The scene lights the step",
          body: "The site views hand the playing state to the scene, which lights the parts and routes of the current step.",
          focus: ["site-views", "scene"],
          tokens: [
            {
              flow: "request",
              path: ["views-scene"],
              reverse: false,
              label: "LIT",
            },
          ],
          log: [
            {
              flow: "request",
              text: "MachineStage → lit parts",
            },
          ],
        },
        {
          id: "read-geometry",
          title: "The scene reads the route geometry",
          body: "The scene asks the engine for the points of each route, so each token travels along its drawn pipe.",
          focus: ["scene", "engine"],
          tokens: [
            {
              flow: "response",
              path: ["scene-engine"],
              reverse: true,
            },
          ],
          log: [
            {
              flow: "response",
              text: "routePoints → Pipe",
            },
          ],
        },
        {
          id: "switch-engine-scene",
          title: "The engine imports the scene",
          body: "With this switch on, the engine imports the scene package, so the core depends on three.js and on an adapter. The rule breaks.",
          focus: ["engine", "scene"],
          tokens: [
            {
              flow: "error",
              path: ["v-engine-scene"],
              reverse: false,
              label: "ERR",
            },
          ],
          log: [
            {
              flow: "error",
              text: "engine → scene: core imports adapter",
            },
          ],
          when: {
            all: ["import-three-in-engine"],
            none: [],
          },
        },
        {
          id: "switch-ui-engine",
          title: "The UI kit imports the engine",
          body: "With this switch on, the UI kit imports the engine directly, skipping the site views. The UI kit no longer stays free of the data layer.",
          focus: ["ui-kit", "engine"],
          tokens: [
            {
              flow: "error",
              path: ["v-ui-engine"],
              reverse: false,
              label: "ERR",
            },
          ],
          log: [
            {
              flow: "error",
              text: "ui-kit → engine: UI imports data",
            },
          ],
          when: {
            all: ["import-engine-in-ui"],
            none: [],
          },
        },
      ],
    },
  ],
  actions: [
    {
      id: "import-three-in-engine",
      label: "Import the scene in the engine",
      description:
        "The engine imports the scene package, which draws with three.js and React Three Fiber. The core would depend on an adapter, and the scene already depends on the engine, so the two would form a cycle.",
      effects: [
        {
          type: "patchPart",
          part: "engine",
          set: {
            flag: "violation",
          },
        },
        {
          type: "addRoute",
          route: {
            id: "v-engine-scene",
            from: "engine",
            to: "scene",
            via: [[1.7000000000000002, 1.3, 0]],
            flag: "violation",
            dependsOn: "to",
          },
        },
      ],
    },
    {
      id: "import-engine-in-ui",
      label: "Import engine in the UI kit",
      description:
        "The UI kit imports the engine, the data layer. The code keeps this seam today: the UI package never imports the engine, and the site views translate the snapshot into plain props for it.",
      effects: [
        {
          type: "patchPart",
          part: "ui-kit",
          set: {
            flag: "violation",
          },
        },
        {
          type: "addRoute",
          route: {
            id: "v-ui-engine",
            from: "ui-kit",
            to: "engine",
            via: [[1.7000000000000002, 1.3, 1.7]],
            flag: "violation",
            dependsOn: "to",
          },
        },
      ],
    },
  ],
});
