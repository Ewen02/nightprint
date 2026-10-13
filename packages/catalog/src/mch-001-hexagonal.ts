import { defineMachine, type MachineInput } from "@nightprint/engine";

type StepInput = MachineInput["scenarios"][number]["steps"][number];

/**
 * MCH-001 — Hexagonal architecture (ports and adapters).
 * References: A. Cockburn, "The Hexagonal (Ports & Adapters) Architecture", 2005; A. Cockburn
 * and J. M. Garrido de Paz, "Hexagonal Architecture Explained", 2024 (configurator, driving
 * and driven ports).
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3):
 * driving adapters on the left, the glass hexagon in the centre,
 * driven adapters on the right, the spare InMemory adapter on the bench.
 */

const PIPE_Y = 0.3;
const HEX_RADIUS = 1.3;
const APOTHEM = HEX_RADIUS * Math.cos(Math.PI / 6);
const ADAPTER = { type: "box", size: [1.5, 0.8, 1.0] } as const;
const PORT = { type: "box", size: [0.36, 0.36, 0.56] } as const;
const LEFT_SOCKET = [0.75, PIPE_Y - 0.4, 0] as const;
const RIGHT_SOCKET = [-0.75, PIPE_Y - 0.4, 0] as const;
const LANE = 0.975;
const SLOT_POSTGRES = [4.2, 0.4, -LANE] as const;
const SLOT_BENCH = [4.2, 0.4, 2.9] as const;
/** Configuration wires run on the plate, along these lines, to each adapter's plug. */
const WIRE_Y = 0.02;
const WIRE_FRONT = 2.85;
const WIRE_LEFT = -3.3;
const WIRE_RIGHT = 3.3;

const SWAP = "swap-storage";
const IMPORTS = "core-imports-postgres";
const TESTS = "drive-from-tests";

/**
 * Before any request, the application is put together: by the configurator in
 * production, by the test suite's own setup under test. One variant for each.
 */
function startupSteps(): StepInput[] {
  const plug = (storage: string) => [
    { flow: "write" as const, tag: "CONFIG", text: `OrderRepository ← ${storage}` },
    { flow: "write" as const, tag: "CONFIG", text: "PaymentGateway ← PaymentProviderAdapter" },
  ];
  return [
    {
      id: "startup",
      line: "storage",
      title: "The application starts",
      body: "Before any request, the configurator creates each adapter and plugs it into its port. Postgres answers OrderRepository: decided here, once, not in the core.",
      when: { none: [SWAP, TESTS] },
      focus: ["configurator", "http", "postgres", "payment-provider"],
      log: [
        { flow: "write", tag: "CONFIG", text: "HttpAdapter ← PlaceOrder" },
        ...plug("PostgresAdapter"),
      ],
    },
    {
      id: "startup-memory",
      line: "storage",
      title: "The application starts",
      body: "This time the configurator plugs InMemory into OrderRepository. That one line at startup is the whole swap: the core is untouched.",
      when: { all: [SWAP], none: [TESTS] },
      focus: ["configurator", "http", "in-memory", "payment-provider"],
      log: [
        { flow: "write", tag: "CONFIG", text: "HttpAdapter ← PlaceOrder" },
        ...plug("InMemoryAdapter"),
      ],
    },
    {
      id: "startup-tests",
      title: "The test suite sets the application up",
      body: "Before the test runs, its setup creates the adapters it needs and plugs them in, the way the configurator does in production.",
      when: { all: [TESTS], none: [SWAP] },
      focus: ["test", "postgres", "payment-provider"],
      log: [
        { flow: "write", tag: "SETUP", text: "TestAdapter ← PlaceOrder" },
        ...plug("PostgresAdapter").map((line) => ({ ...line, tag: "SETUP" })),
      ],
    },
    {
      id: "startup-tests-memory",
      title: "The test suite sets the application up",
      body: "The test's setup plugs InMemory into OrderRepository: no database to run the test. The core cannot tell.",
      when: { all: [TESTS, SWAP] },
      focus: ["test", "in-memory", "payment-provider"],
      log: [
        { flow: "write", tag: "SETUP", text: "TestAdapter ← PlaceOrder" },
        ...plug("InMemoryAdapter").map((line) => ({ ...line, tag: "SETUP" })),
      ],
    },
  ];
}

/**
 * The order goes out through OrderRepository and storage answers: the same two
 * steps in every story that saves an order, in every variant of the switches.
 */
function storageSteps(order: number): StepInput[] {
  return [
    {
      id: "save",
      line: "save",
      title: "Out through OrderRepository",
      body: "The core saves the order through a port it declares. It does not know which storage will answer.",
      when: { none: [IMPORTS] },
      focus: ["order-repository"],
      tokens: [{ flow: "write", path: ["core-repo"] }],
      log: [{ flow: "write", text: `OrderRepository.save(order#${order})` }],
    },
    {
      id: "save-direct",
      line: "save",
      title: "The core reaches for Postgres",
      body: "The domain imports the Postgres adapter and calls it directly. The dependency now points outward: the core cannot be built without the Postgres adapter.",
      when: { all: [IMPORTS] },
      focus: ["order-domain", "postgres"],
      tokens: [{ flow: "error", path: ["core-postgres"] }],
      log: [
        { flow: "error", text: "Order domain imports PostgresAdapter · dependency points outward" },
      ],
    },
    {
      id: "postgres-answers",
      title: "Postgres answers",
      body: "The Postgres adapter implements OrderRepository and runs the INSERT. The core never wrote a line of SQL.",
      when: { none: [SWAP, IMPORTS] },
      focus: ["postgres"],
      tokens: [{ flow: "write", path: ["repo-postgres"] }],
      log: [{ flow: "write", text: "PostgresAdapter  INSERT INTO orders" }],
    },
    {
      id: "memory-answers",
      title: "InMemory answers",
      body: "Same port, different adapter: a Map in memory answers, with no database. Not a single domain file changed.",
      when: { all: [SWAP], none: [IMPORTS] },
      focus: ["in-memory"],
      tokens: [{ flow: "write", path: ["repo-memory"] }],
      log: [{ flow: "write", text: `InMemoryAdapter  map.set(${order})` }],
    },
    {
      id: "still-works",
      title: "It still works, for now",
      body: "The order is saved. Nothing is broken at runtime: the cost shows up the day storage has to change.",
      when: { all: [IMPORTS], none: [SWAP] },
      focus: ["postgres"],
      tokens: [{ flow: "write", at: "postgres" }],
      log: [{ flow: "write", text: "PostgresAdapter  INSERT INTO orders" }],
    },
    {
      id: "swap-breaks",
      line: "save",
      title: "The swap does not reach the core",
      body: "InMemory is plugged into OrderRepository, but the core still calls the Postgres adapter it imports. The swap is ignored until someone edits the domain.",
      when: { all: [IMPORTS, SWAP] },
      focus: ["order-domain", "postgres"],
      tokens: [{ flow: "error", at: "postgres" }],
      log: [
        {
          flow: "error",
          text: "Order domain → PostgresAdapter · swap ignored, the core must change",
        },
      ],
    },
  ];
}

export const hexagonal = defineMachine({
  code: "MCH-001",
  slug: "hexagonal-architecture",
  title: "Hexagonal architecture",
  aliases: ["ports and adapters"],
  summary: "The business core owns its interfaces and depends on nothing outside it.",
  family: "backend",
  category: "PATTERN",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-12",
  sources: [
    {
      label: "A. Cockburn, 2005",
      url: "https://alistair.cockburn.us/hexagonal-architecture/",
    },
    {
      label: "A. Cockburn and J. M. Garrido de Paz, 2024",
      url: "https://alistaircockburn.com/Books",
    },
  ],
  article: [
    "Hexagonal architecture, also called ports and adapters, structures an application so that its business core depends on nothing outside it: user interfaces, databases and test suites all plug into ports the core declares. Alistair Cockburn described it in 2005, with one intent: an application should run the same whether a person, another program, a test suite or a batch script drives it, and it should be built and tested away from the databases and devices it will use in production.",
    "The application declares ports, interfaces written in its own vocabulary. Driving ports, like PlaceOrder, are what the outside world can ask of it. Driven ports, like OrderRepository and PaymentGateway, are what it needs from the outside world.",
    "Adapters translate between a technology and a port. The HTTP adapter turns a request into a PlaceOrder call; the Postgres adapter implements OrderRepository with SQL. Source code dependencies point inward: adapters know the core, the core only knows its ports.",
    "That is why the swap works: the in-memory adapter implements the same port, so not a line of the core changes, and the choice is one line in the configurator, at startup. It is also why the counter-example hurts: once the domain imports the Postgres adapter, changing storage means editing business code, and the core can no longer be tested away from the database.",
    "The six sides mean nothing. Cockburn drew a hexagon to leave room for several ports and adapters; each port is one purposeful conversation with the outside world, and how many to have is a judgement call.",
  ],
  glossary: [
    {
      term: "Port",
      definition:
        "An interface the application declares, in its own words. PlaceOrder is what the outside can ask of it; OrderRepository and PaymentGateway are what it needs.",
      parts: ["place-order", "order-repository", "payment-gateway"],
    },
    {
      term: "Adapter",
      definition:
        "Translates between one technology and one port. Swap an adapter and the port, and the core behind it, stay the same.",
      parts: ["http", "test", "postgres", "payment-provider", "in-memory"],
    },
    {
      term: "Driving side",
      definition:
        "Whoever uses the application: a client over HTTP, a test suite. Its adapters call a port.",
      parts: ["http", "test"],
    },
    {
      term: "Driven side",
      definition:
        "What the application uses: storage, a payment provider. Its adapters implement a port the core declared.",
      parts: ["postgres", "payment-provider", "in-memory"],
    },
    {
      term: "Core",
      definition:
        "The business rules. It knows its ports and nothing else: no SQL, no HTTP, no framework.",
      parts: ["order-domain"],
    },
    {
      term: "Configurator",
      definition:
        "Builds the application at startup: creates each adapter and plugs it into its port. The one place that knows every technology.",
      parts: ["configurator"],
    },
    {
      term: "Dependency",
      definition:
        "Code that knows other code, drawn as an arrowhead on a pipe. Here every one points into the application.",
    },
  ],
  listing: [
    { id: "core-file", text: "// core · place-order.ts" },
    { id: "factory", text: "export const placeOrder =" },
    { id: "param-orders", text: "  (orders: OrderRepository," },
    { id: "param-pay", text: "   pay: PaymentGateway) =>" },
    { id: "signature", text: "  async (order: Order) => {" },
    { id: "rules", text: "    assertValid(order);" },
    { id: "save", text: "    await orders.save(order);" },
    { id: "charge", text: "    const paid = await pay.charge(order);" },
    { id: "decide", text: '    return paid ? "confirmed" : "declined";' },
    { id: "close", text: "  };" },
    { id: "main-file", text: "// startup · main.ts" },
    { id: "wire", text: "const run = placeOrder(" },
    { id: "storage", text: "  new PostgresAdapter(pool), payments);" },
  ],
  stage: {
    plate: { size: [12, 6], center: [0, 0.6] },
    // Cockburn's layout: who drives the application on the left, what it drives on the right.
    zones: [
      {
        id: "driving",
        label: "Driving side",
        note: "Uses the application",
        from: [-6, -2.4],
        to: [-2.1, 3.6],
      },
      {
        id: "application",
        label: "Application",
        note: "Ports, core and startup",
        from: [-2.1, -2.4],
        to: [2.1, 3.6],
      },
      {
        id: "driven",
        label: "Driven side",
        note: "Used by the application",
        from: [2.1, -2.4],
        to: [6, 3.6],
      },
    ],
  },
  parts: [
    {
      id: "http",
      ref: 1,
      label: "HTTP adapter",
      role: "DRIVING",
      kind: "adapter",
      shape: ADAPTER,
      position: [-4.2, 0.4, -LANE],
      socket: LEFT_SOCKET,
      description: "Turns POST /orders into a PlaceOrder call, and the result into a response.",
    },
    {
      id: "test",
      ref: 2,
      label: "Test adapter",
      role: "DRIVING",
      kind: "adapter",
      shape: ADAPTER,
      position: [-4.2, 0.4, LANE],
      socket: LEFT_SOCKET,
      description: "A test suite drives the same port as HTTP does.",
    },
    {
      id: "place-order",
      ref: 3,
      label: "PlaceOrder",
      role: "DRIVING PORT",
      kind: "port",
      shape: PORT,
      position: [-APOTHEM, PIPE_Y, 0],
      socket: [-0.18, 0, 0],
      description: "Driving port: the use case the outside world can call.",
    },
    {
      id: "order-domain",
      ref: 4,
      label: "Order domain",
      role: "CORE",
      kind: "core",
      shape: { type: "prism", sides: 6, radius: 0.62, height: 0.6 },
      position: [0, PIPE_Y, 0],
      description: "Business rules. No SQL, no HTTP, no framework.",
    },
    {
      id: "order-repository",
      ref: 5,
      label: "OrderRepository",
      role: "DRIVEN PORT",
      kind: "port",
      shape: PORT,
      position: [APOTHEM * 0.5, PIPE_Y, -LANE],
      rotationY: Math.PI / 3,
      socket: [0.2, 0, 0],
      description: "Driven port: how the core saves orders, declared by the core.",
    },
    {
      id: "payment-gateway",
      ref: 6,
      label: "PaymentGateway",
      role: "DRIVEN PORT",
      kind: "port",
      shape: PORT,
      position: [APOTHEM * 0.5, PIPE_Y, LANE],
      rotationY: -Math.PI / 3,
      socket: [0.2, 0, 0],
      description: "Driven port: how the core charges a customer.",
    },
    {
      id: "postgres",
      ref: 7,
      label: "Postgres adapter",
      role: "DRIVEN",
      kind: "adapter",
      shape: ADAPTER,
      position: SLOT_POSTGRES,
      socket: RIGHT_SOCKET,
      description: "Implements OrderRepository with SQL.",
    },
    {
      id: "payment-provider",
      ref: 8,
      label: "Payment provider adapter",
      role: "DRIVEN",
      kind: "adapter",
      shape: ADAPTER,
      position: [4.2, 0.4, LANE],
      socket: RIGHT_SOCKET,
      description: "Implements PaymentGateway with a card payment provider's web API.",
    },
    {
      id: "in-memory",
      ref: 9,
      label: "InMemory adapter",
      role: "SPARE",
      kind: "adapter",
      shape: ADAPTER,
      position: SLOT_BENCH,
      socket: RIGHT_SOCKET,
      description:
        "Implements OrderRepository with a Map: the application runs without a database.",
    },
    {
      id: "configurator",
      ref: 10,
      label: "Configurator",
      role: "STARTUP",
      kind: "configurator",
      shape: { type: "box", size: [1.3, 0.45, 0.8] },
      position: [0, 0.225, WIRE_FRONT],
      socket: [0, -0.205, 0],
      description:
        "Starts the application: creates each adapter and plugs it into its port. The test suite sets the application up the same way, with its own choices.",
    },
    {
      id: "hexagon",
      label: "Application",
      kind: "boundary",
      shape: { type: "prism", sides: 6, radius: HEX_RADIUS, height: 0.96 },
      position: [0, 0.48, 0],
      material: "glass",
      description: "The application boundary. Ports sit on its walls.",
    },
  ],
  routes: [
    {
      id: "http-in",
      from: "http",
      to: "place-order",
      via: [
        [-2.6, PIPE_Y, -LANE],
        [-2.6, PIPE_Y, 0],
      ],
      latencyMs: 0.05,
      dependsOn: "to",
    },
    {
      id: "test-in",
      from: "test",
      to: "place-order",
      via: [
        [-2.6, PIPE_Y, LANE],
        [-2.6, PIPE_Y, 0],
      ],
      latencyMs: 0.05,
      dependsOn: "to",
    },
    { id: "in-core", from: "place-order", to: "order-domain", kind: "internal", latencyMs: 0.01 },
    {
      id: "core-repo",
      from: "order-domain",
      to: "order-repository",
      kind: "internal",
      latencyMs: 0.01,
    },
    // Driven adapters implement their port: the dependency runs against the data flow.
    {
      id: "repo-postgres",
      from: "order-repository",
      to: "postgres",
      latencyMs: 4.2,
      dependsOn: "from",
    },
    {
      id: "core-pay",
      from: "order-domain",
      to: "payment-gateway",
      kind: "internal",
      latencyMs: 0.01,
    },
    // Configuration, not traffic: drawn dashed on the plate, never travelled by a token.
    // The test adapter has none: the test suite plugs it in itself.
    {
      id: "config-http",
      from: "configurator",
      to: "http",
      kind: "wire",
      via: [
        [WIRE_LEFT, WIRE_Y, WIRE_FRONT],
        [WIRE_LEFT, WIRE_Y, -LANE],
      ],
    },
    {
      id: "config-postgres",
      from: "configurator",
      to: "postgres",
      kind: "wire",
      via: [
        [WIRE_RIGHT, WIRE_Y, WIRE_FRONT],
        [WIRE_RIGHT, WIRE_Y, -LANE],
      ],
    },
    {
      id: "config-provider",
      from: "configurator",
      to: "payment-provider",
      kind: "wire",
      via: [
        [WIRE_RIGHT, WIRE_Y, WIRE_FRONT],
        [WIRE_RIGHT, WIRE_Y, LANE],
      ],
    },
    {
      id: "pay-provider",
      from: "payment-gateway",
      to: "payment-provider",
      latencyMs: 180,
      dependsOn: "from",
    },
  ],
  actions: [
    {
      id: "swap-storage",
      label: "Swap Postgres for InMemory",
      description:
        "At startup, the configurator plugs the in-memory adapter into OrderRepository instead of Postgres. The core does not change.",
      effects: [
        { type: "patchPart", part: "in-memory", set: { position: SLOT_POSTGRES, role: "DRIVEN" } },
        { type: "patchPart", part: "postgres", set: { position: SLOT_BENCH, role: "SPARE" } },
        { type: "removeRoute", route: "repo-postgres" },
        { type: "removeRoute", route: "config-postgres" },
        // One line at startup; not a line of the core.
        { type: "setLine", line: "storage", text: "  new InMemoryAdapter(), payments);" },
        {
          type: "addRoute",
          route: {
            id: "config-memory",
            from: "configurator",
            to: "in-memory",
            kind: "wire",
            via: [
              [WIRE_RIGHT, WIRE_Y, WIRE_FRONT],
              [WIRE_RIGHT, WIRE_Y, -LANE],
            ],
          },
        },
        {
          type: "addRoute",
          route: {
            id: "repo-memory",
            from: "order-repository",
            to: "in-memory",
            latencyMs: 0.01,
            dependsOn: "from",
          },
        },
      ],
    },
    {
      id: "core-imports-postgres",
      label: "Import Postgres in the core",
      description:
        "The domain calls the Postgres adapter directly. The dependency now points outward.",
      effects: [
        { type: "patchPart", part: "order-domain", set: { flag: "violation" } },
        {
          type: "addLine",
          after: "core-file",
          line: { id: "import-pg", text: "import { PostgresAdapter }" },
        },
        {
          type: "addLine",
          after: "import-pg",
          line: { id: "import-pg-end", text: '  from "../adapters/postgres";' },
        },
        { type: "setLine", line: "save", text: "    await PostgresAdapter.insert(order);" },
        {
          type: "addRoute",
          route: {
            id: "core-postgres",
            from: "order-domain",
            to: "postgres",
            via: [[0, 1.3, 0]],
            flag: "violation",
            latencyMs: 4.2,
            // The counter-example: the core now knows an adapter, the arrow points outward.
            dependsOn: "to",
          },
        },
      ],
    },
    {
      // Cockburn's first intent: the same application, driven by a test suite instead of HTTP.
      // Nothing moves: only who calls the port changes, so only the steps that show it do.
      id: "drive-from-tests",
      label: "Drive it from the test suite",
      description:
        "A test calls PlaceOrder instead of HTTP. Same port, same core: the core cannot tell who is calling.",
    },
  ],
  scenarios: [
    {
      id: "place-order",
      title: "Place an order",
      steps: [
        ...startupSteps(),
        {
          id: "request-arrives",
          title: "A request arrives",
          body: "POST /orders reaches the HTTP adapter. It turns the request into a PlaceOrder command, nothing more.",
          durationMs: 1050,
          when: { none: ["drive-from-tests"] },
          focus: ["http"],
          tokens: [{ flow: "request", at: "http" }],
          log: [{ flow: "request", text: "POST /orders → HttpAdapter" }],
        },
        {
          id: "test-calls",
          title: "A test calls the application",
          body: "A test case builds an order and calls PlaceOrder through the test adapter. No HTTP request, no web server.",
          durationMs: 1050,
          when: { all: ["drive-from-tests"] },
          focus: ["test"],
          tokens: [{ flow: "request", at: "test" }],
          log: [{ flow: "request", tag: "TEST", text: "placeOrder(order#1042) → TestAdapter" }],
        },
        {
          id: "input-port",
          line: "signature",
          title: "Through the driving port",
          body: "The adapter calls PlaceOrder, an interface the core owns. The adapter depends on the core, not the other way round.",
          when: { none: ["drive-from-tests"] },
          focus: ["place-order"],
          tokens: [{ flow: "request", path: ["http-in"] }],
          log: [{ flow: "request", text: "HttpAdapter → PlaceOrder (driving port)" }],
        },
        {
          id: "test-input-port",
          line: "signature",
          title: "Through the same driving port",
          body: "The test adapter calls PlaceOrder, the very port HTTP uses. Nothing in the core knows a test is calling.",
          when: { all: ["drive-from-tests"] },
          focus: ["place-order"],
          tokens: [{ flow: "request", path: ["test-in"] }],
          log: [{ flow: "request", text: "TestAdapter → PlaceOrder (driving port)" }],
        },
        {
          id: "rules",
          line: "rules",
          title: "The core applies the rules",
          body: "An order needs at least one line and a positive total. Pure business logic: no SQL, no HTTP, no framework.",
          focus: ["order-domain"],
          tokens: [{ flow: "request", path: ["in-core"] }],
          log: [
            { flow: "request", tag: "RULE", text: "order#1042  lines > 0 OK  ·  total > 0 OK" },
          ],
        },
        ...storageSteps(1042),
        {
          id: "payment",
          line: "charge",
          title: "Payment through PaymentGateway",
          body: "The core charges the customer through another port. The payment provider is only one adapter behind it.",
          focus: ["payment-gateway", "payment-provider"],
          tokens: [{ flow: "request", path: ["core-pay", "pay-provider"] }],
          log: [
            { flow: "request", text: "PaymentGateway.charge(49.00 EUR) → PaymentProviderAdapter" },
          ],
        },
        {
          id: "response",
          title: "The response goes back",
          body: "201 Created. The HTTP adapter turns the result into a response. The core never saw HTTP.",
          when: { none: ["drive-from-tests"] },
          focus: ["http"],
          tokens: [{ flow: "response", path: ["http-in", "in-core"], reverse: true }],
          log: [{ flow: "response", text: "201 Created  order#1042" }],
        },
        {
          id: "test-response",
          title: "The result goes back to the test",
          body: "The test adapter hands the result to the test, which checks it. The core returned exactly what HTTP would turn into a response.",
          when: { all: ["drive-from-tests"] },
          focus: ["test"],
          tokens: [{ flow: "response", path: ["test-in", "in-core"], reverse: true }],
          log: [{ flow: "response", text: "order#1042 placed · test passes" }],
        },
      ],
    },
    {
      // The rules live in the core: an invalid order is refused before any driven adapter is called.
      id: "reject-order",
      title: "Reject an empty order",
      steps: [
        {
          id: "empty-arrives",
          title: "An empty order arrives",
          body: "POST /orders with no lines reaches the HTTP adapter. It turns it into a PlaceOrder command, as for any order.",
          durationMs: 1050,
          when: { none: ["drive-from-tests"] },
          focus: ["http"],
          tokens: [{ flow: "request", at: "http" }],
          log: [{ flow: "request", text: "POST /orders (no lines) → HttpAdapter" }],
        },
        {
          id: "empty-test",
          title: "A test sends an empty order",
          body: "A test case calls PlaceOrder with an order that has no lines, to check that the core refuses it.",
          durationMs: 1050,
          when: { all: ["drive-from-tests"] },
          focus: ["test"],
          tokens: [{ flow: "request", at: "test" }],
          log: [
            {
              flow: "request",
              tag: "TEST",
              text: "placeOrder(order#1043, no lines) → TestAdapter",
            },
          ],
        },
        {
          id: "empty-input-port",
          line: "signature",
          title: "Through the driving port",
          body: "The adapter calls PlaceOrder like any other time. Checking the order is not its job.",
          when: { none: ["drive-from-tests"] },
          focus: ["place-order"],
          tokens: [{ flow: "request", path: ["http-in"] }],
          log: [{ flow: "request", text: "HttpAdapter → PlaceOrder (driving port)" }],
        },
        {
          id: "empty-test-port",
          line: "signature",
          title: "Through the same driving port",
          body: "The test adapter calls PlaceOrder, the port HTTP uses. Checking the order is not its job either.",
          when: { all: ["drive-from-tests"] },
          focus: ["place-order"],
          tokens: [{ flow: "request", path: ["test-in"] }],
          log: [{ flow: "request", text: "TestAdapter → PlaceOrder (driving port)" }],
        },
        {
          id: "rule-fails",
          line: "rules",
          title: "The core refuses the order",
          body: "An order needs at least one line. The rule lives in the core, so it holds whoever calls, and no storage or payment is ever reached.",
          focus: ["order-domain"],
          tokens: [{ flow: "error", path: ["in-core"] }],
          log: [{ flow: "error", tag: "RULE", text: "order#1043  lines > 0 FAILED" }],
        },
        {
          id: "refusal",
          title: "The refusal goes back",
          body: "The HTTP adapter turns the core's refusal into 422 Unprocessable Content. Postgres and the payment provider were never called.",
          when: { none: ["drive-from-tests"] },
          focus: ["http"],
          tokens: [{ flow: "response", path: ["http-in", "in-core"], reverse: true }],
          log: [{ flow: "response", text: "422 Unprocessable Content  order needs a line" }],
        },
        {
          id: "refusal-test",
          title: "The test sees the refusal",
          body: "The test adapter hands the refusal back and the test checks it. No database was needed to test a business rule.",
          when: { all: ["drive-from-tests"] },
          focus: ["test"],
          tokens: [{ flow: "response", path: ["test-in", "in-core"], reverse: true }],
          log: [{ flow: "response", text: "order#1043 rejected · test passes" }],
        },
      ],
    },
    {
      // Failure from the outside: the provider's own vocabulary stops at its adapter,
      // and what a refused payment means is the core's decision.
      id: "decline-payment",
      title: "Decline a payment",
      steps: [
        {
          id: "declined-arrives",
          line: "signature",
          title: "An order arrives",
          body: "POST /orders reaches the HTTP adapter, which calls PlaceOrder. This customer's card will be refused.",
          when: { none: [TESTS] },
          focus: ["http", "place-order"],
          // On to the core: the next step saves from there.
          tokens: [{ flow: "request", path: ["http-in", "in-core"] }],
          log: [{ flow: "request", text: "POST /orders → HttpAdapter → PlaceOrder" }],
        },
        {
          id: "declined-test",
          line: "signature",
          title: "A test places an order",
          body: "A test calls PlaceOrder through the test adapter, for a customer whose card will be refused.",
          when: { all: [TESTS] },
          focus: ["test", "place-order"],
          tokens: [{ flow: "request", path: ["test-in", "in-core"] }],
          log: [{ flow: "request", tag: "TEST", text: "placeOrder(order#1044) → TestAdapter" }],
        },
        ...storageSteps(1044),
        {
          id: "declined-charge",
          line: "charge",
          title: "The core asks for the payment",
          body: "The core charges the customer through PaymentGateway, the port it declares. The payment provider adapter makes the call.",
          focus: ["payment-gateway", "payment-provider"],
          tokens: [{ flow: "request", path: ["core-pay", "pay-provider"] }],
          log: [
            { flow: "request", text: "PaymentGateway.charge(49.00 EUR) → PaymentProviderAdapter" },
          ],
        },
        {
          id: "declined-translated",
          title: "The adapter translates the refusal",
          body: "The provider answers in its own terms: declined, reason insufficient_funds. The adapter turns that into PaymentDeclined, a result the port defines.",
          focus: ["payment-provider", "payment-gateway"],
          tokens: [{ flow: "error", path: ["pay-provider"], reverse: true }],
          log: [
            { flow: "error", tag: "EXT", text: "provider: declined  reason=insufficient_funds" },
            { flow: "error", tag: "PORT", text: "PaymentGateway → PaymentDeclined" },
          ],
        },
        {
          id: "declined-decision",
          line: "decide",
          title: "The core decides",
          body: "What a refused payment means is a business rule: the order is not confirmed. The core decides, in its own words, without the provider's codes.",
          focus: ["order-domain"],
          tokens: [{ flow: "error", path: ["core-pay"], reverse: true }],
          log: [
            { flow: "error", tag: "RULE", text: "order#1044  PaymentDeclined → not confirmed" },
          ],
        },
        {
          id: "declined-response",
          title: "402 goes back",
          body: "The HTTP adapter turns the core's decision into 402 Payment Required. Neither the core nor HTTP ever saw the provider's codes.",
          when: { none: [TESTS] },
          focus: ["http"],
          tokens: [{ flow: "response", path: ["http-in", "in-core"], reverse: true }],
          log: [{ flow: "response", text: "402 Payment Required  order#1044" }],
        },
        {
          id: "declined-test-response",
          title: "The test sees the decision",
          body: "The test adapter hands the result back and the test checks it: the order is not confirmed.",
          when: { all: [TESTS] },
          focus: ["test"],
          tokens: [{ flow: "response", path: ["test-in", "in-core"], reverse: true }],
          log: [{ flow: "response", text: "order#1044 not confirmed · test passes" }],
        },
      ],
    },
  ],
});
