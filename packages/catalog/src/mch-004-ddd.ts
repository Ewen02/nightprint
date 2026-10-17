import { defineMachine } from "@nightprint/engine";

/**
 * MCH-004 — Domain-driven design: an aggregate and the boundary between two contexts.
 * References: E. Evans, "Domain-Driven Design Reference", 2015 (aggregates, repositories,
 * domain events, bounded context); V. Vernon, "Effective Aggregate Design", parts I and II,
 * 2011 (the purchase order and its limit, optimistic concurrency, one aggregate per
 * transaction, eventual consistency outside the boundary); M. Fowler, "DDD_Aggregate" and
 * "BoundedContext"; C. Richardson, "Transactional outbox".
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3): Sales on the left, the buyers at its
 * edge, the application service, then order 42 in its glass boundary; Sales' database and
 * the event relay along the front; Shipping on the right, reached only by the relay.
 */

const PIPE_Y = 0.3;
/** The row of the order: the service, the root, its lines. */
const ORDER_Z = -0.6;
/** The row of what is saved and published: Sales' database, the relay, Shipping's handler. */
const STORE_Z = 2.2;
const BUYERS_X = -5.3;
const BUYER_A_Z = -1.9;
const BUYER_B_Z = 0.7;
const JOIN_X = -4.2;
const SERVICE_X = -3.2;
const ROOT_X = -0.35;
const LINES_X = 1.35;
const SHIPPING_X = 4.6;
const SHIPMENT_Z = 0.4;
const SHIPPING_DB_Z = -1.4;
/** Where the switches' routes leave the order's row, one lane each so they never cross. */
const BEHIND_X = -1.6;
const BEHIND_Z = 1.15;
const CALL_X = -1.9;
const CALL_Z = 1.55;
const CALL_IN_X = 3.6;

const BEHIND = "behind-the-root";
const NO_VERSION = "no-version";
const CALL = "call-shipping";

const BUYER = { type: "box", size: [1.3, 0.7, 1.0] } as const;
const SERVICE = { type: "box", size: [1.5, 0.75, 1.1] } as const;

export const ddd = defineMachine({
  code: "MCH-004",
  slug: "domain-driven-design",
  title: "Domain-driven design",
  aliases: ["DDD"],
  summary:
    "An aggregate root enforces the rules of its cluster in one transaction, and other bounded contexts react to its domain events later, in theirs.",
  family: "backend",
  category: "DESIGN",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-17",
  flowLabels: {
    request: "Command",
    write: "Write, event",
    response: "Response",
    error: "Refused, broken",
  },
  sources: [
    {
      label: "E. Evans, DDD Reference, 2015",
      url: "https://domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf",
    },
    {
      label: "V. Vernon, Effective Aggregate Design, 2011",
      url: "https://www.dddcommunity.org/library/vernon_2011/",
    },
    {
      label: "M. Fowler, DDD Aggregate",
      url: "https://martinfowler.com/bliki/DDD_Aggregate.html",
    },
    {
      label: "M. Fowler, Bounded Context",
      url: "https://martinfowler.com/bliki/BoundedContext.html",
    },
    {
      label: "C. Richardson, Transactional outbox",
      url: "https://microservices.io/patterns/data/transactional-outbox.html",
    },
  ],
  article: [
    "Domain-driven design (DDD) is an approach to complex software, set out by Eric Evans in his book of the same name, in which the code follows a model of the business, worked out with domain experts and spoken in one language inside an explicitly bounded context. This machine runs two of its patterns: the aggregate, inside one context, and the boundary between two contexts.",
    "An aggregate is a cluster of entities and values changed as one unit. One entity is its root: code outside the aggregate holds references to the root only, and the root enforces the rules that span the cluster. A purchase order is the classic example: its lines may not total more than its approved limit, so a line is added through the order, never on its own.",
    "The aggregate is also the unit of a transaction. A repository loads and saves the whole aggregate, and a version on the root, checked at each save, stops two users from committing changes that are each valid and together break the limit. Vaughn Vernon's rule of thumb: change one aggregate per transaction, and keep aggregates small.",
    "A rule that spans aggregates, or bounded contexts, is kept eventually consistent. The root records a domain event, OrderPlaced; Shipping, a bounded context with its own model of a shipment, reacts to it later in its own transaction, and a delivery that fails is tried again. Sales does not wait for Shipping, and Shipping being down does not undo an order.",
    "Here the event is saved in the same transaction as the order and published afterwards by a relay: the transactional outbox, one common way to do it. Evans and Vernon leave the mechanism open; what they ask is that changes cross an aggregate's boundary asynchronously.",
  ],
  glossary: [
    {
      term: "Bounded context",
      definition:
        "The boundary inside which one model and its words apply. Sales speaks of orders and prices; Shipping of shipments and parcels.",
      parts: ["service", "shipping-handler"],
    },
    {
      term: "Aggregate",
      definition:
        "A cluster of objects changed as one unit, in one transaction. Code outside it holds references to its root only.",
      parts: ["order", "lines"],
    },
    {
      term: "Aggregate root",
      definition:
        "The one entity outside code may call. It enforces the aggregate's rules: here, lines may not total more than the approved limit.",
      parts: ["order"],
    },
    {
      term: "Invariant",
      definition:
        "A rule that holds at every commit: the lines of order 42 never total more than 1,000 €.",
      parts: ["order", "lines"],
    },
    {
      term: "Repository",
      definition:
        "Loads and saves whole aggregates, through their root. A repository for lines alone lets code change them behind the root's back.",
      parts: ["service", "sales-db"],
    },
    {
      term: "Optimistic concurrency",
      definition:
        "A save goes through only if the order is still at the version it was loaded at. Otherwise it fails, and nothing is written.",
      parts: ["sales-db"],
    },
    {
      term: "Domain event",
      definition:
        "Something that happened that the business cares about, such as OrderPlaced. Other aggregates and contexts react to it later.",
      parts: ["order", "shipping-handler"],
    },
    {
      term: "Outbox",
      definition:
        "A table the event is saved in, in the same transaction as the order. A relay publishes it afterwards, again until it is acknowledged.",
      parts: ["sales-db", "relay"],
    },
  ],
  listing: [
    { id: "file", text: "// sales · order.ts" },
    { id: "class", text: "class Order {" },
    { id: "add-fn", text: "  addLine(line) {" },
    { id: "sum", text: "    const sum = this.total + line.amount;" },
    { id: "check", text: "    if (sum > this.limit)" },
    { id: "throw", text: "      throw new OverLimit(this.id);" },
    { id: "push", text: "    this.lines.push(line);" },
    { id: "add-end", text: "  }" },
    { id: "class-end", text: "}" },
    { id: "commands", text: "// sales · commands.ts" },
    { id: "cmd-add", text: "async function addLine(cmd) {" },
    { id: "get", text: "  const order = await orders.get(cmd.id);" },
    { id: "call", text: "  order.addLine(cmd.line);" },
    { id: "save", text: "  await orders.save(order); // versioned" },
    { id: "cmd-add-end", text: "}" },
    { id: "cmd-place", text: "async function placeOrder(cmd) {" },
    { id: "place-get", text: "  const order = await orders.get(cmd.id);" },
    { id: "place-call", text: "  order.place(); // records OrderPlaced" },
    { id: "place-save", text: "  await orders.save(order); // + its event" },
    { id: "cmd-place-end", text: "}" },
  ],
  stage: {
    plate: { size: [13.4, 6.6], center: [0.2, 0.2] },
    zones: [
      {
        id: "sales",
        label: "Sales",
        note: "Bounded context",
        from: [-6.3, -2.9],
        to: [2.7, 3.3],
      },
      {
        id: "aggregate",
        label: "Order aggregate",
        note: "One root, one transaction",
        // Deeper than the glass at the back: the name sits there, clear of the root.
        from: [-1.35, -2.8],
        to: [2.25, 0.9],
      },
      {
        id: "shipping",
        label: "Shipping",
        note: "Bounded context",
        from: [2.7, -2.9],
        to: [6.7, 3.3],
      },
    ],
  },
  parts: [
    {
      id: "buyer-a",
      ref: 1,
      label: "Buyer A",
      role: "BUYER",
      kind: "actor",
      shape: BUYER,
      position: [BUYERS_X, 0.35, BUYER_A_Z],
      socket: [0, -0.05, 0],
      description: "A purchasing clerk adding lines to order 42, then placing it.",
    },
    {
      id: "buyer-b",
      ref: 2,
      label: "Buyer B",
      role: "BUYER",
      kind: "actor",
      shape: BUYER,
      position: [BUYERS_X, 0.35, BUYER_B_Z],
      socket: [0, -0.05, 0],
      description: "A second clerk, working on the same order at the same time.",
    },
    {
      id: "service",
      ref: 3,
      label: "Service",
      role: "APPLICATION",
      kind: "module",
      shape: SERVICE,
      position: [SERVICE_X, 0.375, ORDER_Z],
      socket: [0, -0.075, 0],
      description:
        "The application service. Runs each command: loads the order whole, calls its root, saves it. It holds no business rule of its own.",
    },
    {
      id: "order",
      ref: 4,
      label: "Order",
      role: "ROOT",
      kind: "core",
      shape: { type: "prism", sides: 8, radius: 0.5, height: 0.6 },
      position: [ROOT_X, PIPE_Y, ORDER_Z],
      description:
        "The aggregate root, and the only object outside code may call. It checks every change against the approved limit, 1,000 €.",
    },
    {
      id: "lines",
      ref: 5,
      label: "Order lines",
      role: "ENTITIES",
      kind: "core",
      shape: { type: "box", size: [0.9, 0.36, 1.8] },
      position: [LINES_X, 0.18, ORDER_Z],
      socket: [0, 0.12, 0],
      description:
        "The order's lines, each with a product, a quantity and a price. Changed through the root only.",
    },
    {
      id: "sales-db",
      ref: 6,
      label: "Sales database",
      role: "DATABASE",
      kind: "store",
      shape: { type: "cylinder", radius: 0.7, height: 1.1 },
      position: [SERVICE_X, 0.55, STORE_Z],
      socket: [0, -0.25, 0],
      description:
        "Sales' own tables: orders with their lines and a version each, and the outbox of events not yet published.",
    },
    {
      id: "relay",
      ref: 7,
      label: "Event relay",
      role: "OUTBOX",
      kind: "queue",
      shape: { type: "box", size: [1.6, 0.4, 0.7] },
      position: [0.6, 0.2, STORE_Z],
      socket: [0, 0.1, 0],
      description:
        "Reads the events committed to the outbox and delivers them to Shipping, again until they are acknowledged.",
    },
    {
      id: "shipping-handler",
      ref: 8,
      label: "Shipping handler",
      role: "SUBSCRIBER",
      kind: "module",
      shape: SERVICE,
      position: [SHIPPING_X, 0.375, STORE_Z],
      socket: [0, -0.075, 0],
      description:
        "Shipping's side: turns OrderPlaced into a shipment, in Shipping's own transaction and its own words.",
    },
    {
      id: "shipment",
      ref: 9,
      label: "Shipment",
      role: "ROOT",
      kind: "core",
      shape: { type: "prism", sides: 8, radius: 0.42, height: 0.5 },
      position: [SHIPPING_X, 0.25, SHIPMENT_Z],
      socket: [0, 0.05, 0],
      description:
        "Shipping's aggregate: a parcel and an address. It knows order 42 by its id, not by its lines or prices.",
    },
    {
      id: "shipping-db",
      ref: 10,
      label: "Shipping database",
      role: "DATABASE",
      kind: "store",
      shape: { type: "cylinder", radius: 0.6, height: 1.0 },
      position: [SHIPPING_X, 0.5, SHIPPING_DB_Z],
      socket: [0, -0.2, 0],
      description: "Shipping's own tables. Sales never writes them.",
    },
    {
      id: "boundary",
      label: "Order aggregate",
      kind: "boundary",
      shape: { type: "box", size: [3.2, 0.9, 2.6] },
      position: [0.45, 0.45, ORDER_Z],
      material: "glass",
      description: "The aggregate's boundary: one root, its lines, saved in one transaction.",
    },
  ],
  routes: [
    {
      id: "a-in",
      from: "buyer-a",
      to: "service",
      via: [
        [JOIN_X, PIPE_Y, BUYER_A_Z],
        [JOIN_X, PIPE_Y, ORDER_Z],
      ],
    },
    {
      id: "b-in",
      from: "buyer-b",
      to: "service",
      via: [
        [JOIN_X, PIPE_Y, BUYER_B_Z],
        [JOIN_X, PIPE_Y, ORDER_Z],
      ],
    },
    { id: "service-order", from: "service", to: "order", dependsOn: "to" },
    { id: "order-lines", from: "order", to: "lines", kind: "internal" },
    { id: "service-db", from: "service", to: "sales-db", latencyMs: 2 },
    { id: "db-relay", from: "sales-db", to: "relay" },
    {
      id: "relay-shipping",
      from: "relay",
      to: "shipping-handler",
      latencyMs: 5,
      // Shipping knows Sales' event; Sales knows nothing of Shipping.
      dependsOn: "from",
    },
    { id: "handler-shipment", from: "shipping-handler", to: "shipment" },
    {
      id: "handler-db",
      from: "shipping-handler",
      to: "shipping-db",
      via: [
        [5.9, PIPE_Y, STORE_Z],
        [5.9, PIPE_Y, SHIPPING_DB_Z],
      ],
      latencyMs: 2,
    },
  ],
  // Declaration order is the order effects apply in: both switches rewrite `save`, and
  // going behind the root, which drops the order altogether, must win.
  actions: [
    {
      id: NO_VERSION,
      label: "Save without a version",
      description:
        "orders.save writes the order without checking the version it was loaded at. Two saves made from the same copy both go through.",
      effects: [
        { type: "patchPart", part: "sales-db", set: { flag: "violation" } },
        { type: "setLine", line: "save", text: "  await orders.save(order); // unversioned" },
      ],
    },
    {
      id: BEHIND,
      label: "Add lines behind the root",
      description:
        "addLine builds the line and inserts it through a repository of its own. The order is never loaded, so nothing checks the limit.",
      effects: [
        {
          type: "addRoute",
          route: {
            id: "service-lines",
            from: "service",
            to: "lines",
            via: [
              [BEHIND_X, PIPE_Y, ORDER_Z],
              [BEHIND_X, PIPE_Y, BEHIND_Z],
              [LINES_X, PIPE_Y, BEHIND_Z],
            ],
            flag: "violation",
            dependsOn: "to",
          },
        },
        { type: "setLine", line: "get", text: "  const line = new OrderLine(cmd.line);" },
        { type: "setLine", line: "call", text: "  line.orderId = cmd.id;" },
        { type: "setLine", line: "save", text: "  await lines.insert(line); // no root" },
      ],
    },
    {
      id: CALL,
      label: "Call Shipping before the commit",
      description:
        "placeOrder creates the shipment through Shipping's API, inside its own transaction. When Shipping is down, the order fails with it.",
      effects: [
        {
          type: "addRoute",
          route: {
            id: "service-shipping",
            from: "service",
            to: "shipping-handler",
            via: [
              [CALL_X, PIPE_Y, ORDER_Z],
              [CALL_X, PIPE_Y, CALL_Z],
              [CALL_IN_X, PIPE_Y, CALL_Z],
              [CALL_IN_X, PIPE_Y, STORE_Z],
            ],
            flag: "violation",
            dependsOn: "to",
          },
        },
        {
          type: "addLine",
          after: "place-call",
          line: { id: "ship-call", text: "  await shipping.createShipment(order);" },
        },
      ],
    },
  ],
  scenarios: [
    {
      id: "add-line",
      title: "Add a line",
      steps: [
        {
          id: "adds",
          title: "A buyer adds a line",
          body: "Buyer A adds a 150 € line to order 42, whose approved limit is 1,000 €. The command reaches the application service.",
          line: "cmd-add",
          focus: ["buyer-a", "service"],
          states: {
            order: "800 € of 1,000 €",
            lines: "2 lines · 800 €",
            "sales-db": "order 42 · v3",
          },
          tokens: [{ flow: "request", path: ["a-in"], label: "150" }],
          log: [
            { flow: "request", tag: "CMD", text: "AddLine(order 42, 150 €) → application service" },
          ],
        },
        {
          id: "load",
          title: "Load the whole order",
          body: "The repository loads order 42 as one piece: the root, its two lines, and the version it was last saved at, 3.",
          when: { none: [BEHIND] },
          line: "get",
          focus: ["service", "sales-db"],
          tokens: [{ flow: "response", path: ["service-db"], reverse: true, label: "v3" }],
          log: [
            { flow: "response", tag: "SQL", text: "SELECT order 42 + 2 lines → 800 €, version 3" },
          ],
        },
        {
          id: "through-root",
          title: "Through the root",
          body: "The service does not touch a line itself: it asks the order to add one. Order is the aggregate root, the one object outside code may call.",
          when: { none: [BEHIND] },
          line: "call",
          focus: ["service", "order"],
          tokens: [{ flow: "request", path: ["service-order"], label: "150" }],
          log: [{ flow: "request", text: "order.addLine(150 €)" }],
        },
        {
          id: "check",
          title: "The root checks the limit",
          body: "800 € + 150 € = 950 €, within 1,000 €: the root adds the line. The rule is checked where the lines live, whoever calls.",
          when: { none: [BEHIND] },
          line: "check",
          focus: ["order", "lines"],
          states: { order: "950 € of 1,000 €", lines: "3 lines · 950 €" },
          tokens: [{ flow: "write", path: ["order-lines"], label: "150" }],
          log: [{ flow: "write", tag: "RULE", text: "800 + 150 = 950 ≤ 1,000 → line added" }],
        },
        {
          id: "save",
          title: "Saved as one, version 3 to 4",
          body: "The repository saves the whole order in one transaction, on condition that it is still at version 3. It is: the line is in, and the order moves to version 4.",
          when: { none: [BEHIND, NO_VERSION] },
          line: "save",
          focus: ["service", "sales-db"],
          states: { "sales-db": "order 42 · v4 · 950 €" },
          tokens: [{ flow: "write", path: ["service-db"], label: "v4" }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "INSERT line · UPDATE orders SET version = 4 WHERE version = 3 → 1 row",
            },
          ],
        },
        {
          id: "save-unversioned",
          title: "Saved as one",
          body: "The repository saves the whole order in one transaction: the line is in. Nothing checks which version it was loaded at.",
          when: { all: [NO_VERSION], none: [BEHIND] },
          line: "save",
          focus: ["service", "sales-db"],
          states: { "sales-db": "order 42 · 950 €" },
          tokens: [{ flow: "write", path: ["service-db"] }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "INSERT line · UPDATE orders SET … WHERE id = 42 → 1 row",
            },
          ],
        },
        {
          id: "straight-to-lines",
          title: "Straight to the lines",
          body: "The service builds the line and inserts it through a repository for lines. The order is never loaded and its root never runs: nothing checked the line. 950 € still fits, by luck.",
          when: { all: [BEHIND] },
          line: "save",
          focus: ["service", "lines"],
          states: { order: "never asked", lines: "3 lines · 950 €" },
          tokens: [{ flow: "write", path: ["service-lines"], label: "150" }],
          log: [{ flow: "write", tag: "SQL", text: "INSERT INTO order_lines (order 42, 150 €)" }],
        },
        {
          id: "one-too-many",
          title: "One line too many",
          body: "Buyer A adds another 100 €. The service loads the order again, now at 950 €, and asks the root to add the line.",
          when: { none: [BEHIND] },
          line: "call",
          focus: ["buyer-a", "service", "order"],
          tokens: [{ flow: "request", path: ["a-in", "service-order"], label: "100" }],
          log: [{ flow: "request", tag: "CMD", text: "AddLine(order 42, 100 €) → order.addLine" }],
        },
        {
          id: "refuses",
          title: "The root refuses",
          body: "950 € + 100 € = 1,050 €, over the limit. The root throws before touching its lines, and nothing is saved.",
          when: { none: [BEHIND] },
          line: "throw",
          focus: ["order"],
          states: { order: "950 € of 1,000 €" },
          tokens: [{ flow: "error", at: "order", label: "100" }],
          log: [{ flow: "error", tag: "RULE", text: "950 + 100 = 1,050 > 1,000 → OverLimit" }],
        },
        {
          id: "refusal",
          title: "The refusal goes back",
          body: "Buyer A gets 422: the line would take the order over its approved limit. The order and its lines are as they were.",
          when: { none: [BEHIND] },
          focus: ["buyer-a"],
          tokens: [{ flow: "response", path: ["a-in", "service-order"], reverse: true }],
          log: [{ flow: "response", text: "422 Unprocessable Content  over the approved limit" }],
        },
        {
          id: "gets-in",
          title: "One line too many gets in",
          body: "Buyer A adds another 100 €. The insert goes through the same way: order 42 now holds 1,050 € of lines on a 1,000 € limit, and no code compared them.",
          when: { all: [BEHIND] },
          line: "save",
          focus: ["service", "lines"],
          states: { lines: "4 lines · 1,050 €" },
          tokens: [{ flow: "error", path: ["a-in", "service-lines"], label: "100" }],
          log: [
            {
              flow: "error",
              tag: "SQL",
              text: "INSERT INTO order_lines (order 42, 100 €) · total 1,050 €",
            },
          ],
        },
        {
          id: "accepted",
          title: "201 for an order over its limit",
          body: "Both requests get 201. Order 42 breaks its own rule, and nothing will notice: the one place the rule is written was never called.",
          when: { all: [BEHIND] },
          focus: ["buyer-a"],
          tokens: [{ flow: "error", path: ["a-in", "service-lines"], reverse: true }],
          log: [{ flow: "error", text: "201 Created  order 42 at 1,050 € of 1,000 €" }],
        },
      ],
    },
    {
      id: "two-buyers",
      title: "Two buyers at once",
      steps: [
        {
          id: "both-add",
          title: "Two buyers, one order",
          body: "Buyer A and buyer B each add a 150 € line to order 42, at the same moment. Each line, on its own, fits within the 1,000 € limit.",
          line: "cmd-add",
          focus: ["buyer-a", "buyer-b", "service"],
          states: {
            order: "800 € of 1,000 €",
            lines: "2 lines · 800 €",
            "sales-db": "order 42 · v3",
          },
          tokens: [
            { flow: "request", path: ["a-in"], label: "A" },
            { flow: "request", path: ["b-in"], label: "B" },
          ],
          log: [{ flow: "request", tag: "CMD", text: "A: AddLine(150 €)  ·  B: AddLine(150 €)" }],
        },
        {
          id: "both-load",
          title: "Two copies of version 3",
          body: "Each command loads its own copy of order 42: 800 €, version 3. Neither copy knows about the other.",
          when: { none: [BEHIND] },
          line: "get",
          focus: ["service", "sales-db"],
          tokens: [{ flow: "response", path: ["service-db"], reverse: true, label: "×2" }],
          log: [{ flow: "response", tag: "SQL", text: "2 × SELECT order 42 → 800 €, version 3" }],
        },
        {
          id: "both-pass",
          title: "Each copy passes the check",
          body: "On each copy the root computes 800 € + 150 € = 950 €, within the limit. Each check is right about the copy it sees.",
          when: { none: [BEHIND] },
          line: "check",
          focus: ["service", "order"],
          states: { order: "950 € on each copy" },
          tokens: [{ flow: "request", path: ["service-order"], label: "×2" }],
          log: [{ flow: "request", tag: "RULE", text: "A: 950 ≤ 1,000 OK  ·  B: 950 ≤ 1,000 OK" }],
        },
        {
          id: "a-commits",
          title: "A commits first",
          body: "A's save finds the order still at version 3: its line goes in, and the order moves to version 4 at 950 €.",
          when: { none: [BEHIND, NO_VERSION] },
          line: "save",
          focus: ["service", "sales-db"],
          states: { "sales-db": "order 42 · v4 · 950 €", lines: "3 lines · 950 €" },
          tokens: [{ flow: "write", path: ["service-db"], label: "A" }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "A: UPDATE orders SET version = 4 WHERE version = 3 → 1 row",
            },
          ],
        },
        {
          id: "b-stale",
          title: "B's copy is stale",
          body: "B's save also asks for version 3, but the order is at version 4 now. No row matches: the save fails and its transaction rolls back, line included.",
          when: { none: [BEHIND, NO_VERSION] },
          line: "save",
          focus: ["service", "sales-db"],
          tokens: [{ flow: "error", path: ["service-db"], label: "B" }],
          log: [
            {
              flow: "error",
              tag: "SQL",
              text: "B: UPDATE … WHERE version = 3 → 0 rows · conflict",
            },
          ],
        },
        {
          id: "b-conflict",
          title: "409 for buyer B",
          body: "B's line was never written: B gets 409 and reloads the order. If B tries again, the root sees 950 € and refuses the 150 €.",
          when: { none: [BEHIND, NO_VERSION] },
          focus: ["buyer-b"],
          tokens: [{ flow: "response", path: ["b-in"], reverse: true, label: "B" }],
          log: [{ flow: "response", text: "409 Conflict  order 42 changed, reload it" }],
        },
        {
          id: "a-commits-unversioned",
          title: "A commits first",
          body: "A's save goes through: its line is in, and the order is at 950 €.",
          when: { all: [NO_VERSION], none: [BEHIND] },
          line: "save",
          focus: ["service", "sales-db"],
          states: { "sales-db": "order 42 · 950 €", lines: "3 lines · 950 €" },
          tokens: [{ flow: "write", path: ["service-db"], label: "A" }],
          log: [{ flow: "write", tag: "SQL", text: "A: INSERT line · UPDATE orders → 1 row" }],
        },
        {
          id: "b-commits",
          title: "B commits too",
          body: "Nothing checks the version B loaded: its line goes in as well. Order 42 now holds 1,100 € on a 1,000 € limit, though each check passed.",
          when: { all: [NO_VERSION], none: [BEHIND] },
          line: "save",
          focus: ["service", "sales-db", "lines"],
          states: {
            "sales-db": "order 42 · 1,100 €",
            lines: "4 lines · 1,100 €",
            order: "1,100 € of 1,000 €",
          },
          tokens: [{ flow: "error", path: ["service-db"], label: "B" }],
          log: [
            { flow: "error", tag: "SQL", text: "B: INSERT line · UPDATE orders → 1 row · 1,100 €" },
          ],
        },
        {
          id: "both-created",
          title: "201 for both",
          body: "Both buyers get 201. The rule held on each copy and broke on the order: only a version checked at save time sees two copies of one order.",
          when: { all: [NO_VERSION], none: [BEHIND] },
          focus: ["buyer-a", "buyer-b"],
          tokens: [
            { flow: "error", path: ["a-in"], reverse: true, label: "A" },
            { flow: "error", path: ["b-in"], reverse: true, label: "B" },
          ],
          log: [{ flow: "error", text: "201 Created ×2  order 42 at 1,100 € of 1,000 €" }],
        },
        {
          id: "both-inserted",
          title: "Both lines go straight in",
          body: "Each command inserts its line through the lines repository. No root runs and no check: order 42 ends at 1,100 € on a 1,000 € limit.",
          when: { all: [BEHIND] },
          line: "save",
          focus: ["service", "lines"],
          states: { lines: "4 lines · 1,100 €", order: "never asked" },
          tokens: [{ flow: "error", path: ["service-lines"], label: "×2" }],
          log: [{ flow: "error", tag: "SQL", text: "2 × INSERT INTO order_lines · total 1,100 €" }],
        },
        {
          id: "both-created-behind",
          title: "201 for both",
          body: "Both buyers get 201, and the order breaks its rule. No version could catch it either: neither command loaded or saved the order.",
          when: { all: [BEHIND] },
          focus: ["buyer-a", "buyer-b"],
          tokens: [
            { flow: "error", path: ["a-in"], reverse: true, label: "A" },
            { flow: "error", path: ["b-in"], reverse: true, label: "B" },
          ],
          log: [{ flow: "error", text: "201 Created ×2  order 42 at 1,100 € of 1,000 €" }],
        },
      ],
    },
    {
      id: "place-order",
      title: "Place the order",
      steps: [
        {
          id: "place",
          title: "Buyer A places the order",
          body: "Order 42 is complete, and buyer A places it. Shipping must then send it, but Shipping is another bounded context, with its own model and its own database.",
          line: "cmd-place",
          focus: ["buyer-a", "service"],
          states: {
            order: "open · 800 €",
            "sales-db": "order 42 · open",
            relay: "outbox empty",
            "shipping-handler": "down for a deploy",
          },
          tokens: [{ flow: "request", path: ["a-in"] }],
          log: [
            { flow: "request", tag: "CMD", text: "PlaceOrder(order 42) → application service" },
          ],
        },
        {
          id: "record",
          title: "The root records OrderPlaced",
          body: "The service loads the order and calls order.place(). The root records a domain event, OrderPlaced: a fact the business cares about, kept with the order until it is saved.",
          line: "place-call",
          focus: ["service", "order"],
          states: { order: "placed · 1 event" },
          tokens: [{ flow: "request", path: ["service-order"] }],
          log: [{ flow: "request", text: "order.place() → OrderPlaced recorded" }],
        },
        {
          id: "commit",
          title: "Order and event, one commit",
          body: "The repository saves the order and its event in one transaction: the event goes into an outbox table in Sales' own database. Both are saved, or neither is.",
          when: { none: [CALL] },
          line: "place-save",
          focus: ["service", "sales-db"],
          states: { "sales-db": "placed · outbox 1" },
          tokens: [{ flow: "write", path: ["service-db"] }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "UPDATE orders SET status = 'placed' · INSERT INTO outbox OrderPlaced → COMMIT",
            },
          ],
        },
        {
          id: "placed",
          title: "Placed: Sales answers",
          body: "Buyer A gets 200 at once. Sales does not wait for Shipping, and does not need it to be up.",
          when: { none: [CALL] },
          focus: ["buyer-a"],
          tokens: [{ flow: "response", path: ["a-in"], reverse: true }],
          log: [{ flow: "response", text: "200 OK  order 42 placed" }],
        },
        {
          id: "delivery-fails",
          title: "Shipping is down: the event waits",
          body: "The relay reads OrderPlaced from the outbox and delivers it to Shipping, which is down for a deploy. The event stays in the outbox for another try.",
          when: { none: [CALL] },
          focus: ["relay", "shipping-handler"],
          states: { relay: "OrderPlaced · retry in 30 s" },
          tokens: [{ flow: "error", path: ["db-relay", "relay-shipping"] }],
          log: [
            {
              flow: "error",
              tag: "EVENT",
              text: "OrderPlaced → Shipping · unavailable · retry in 30 s",
            },
          ],
        },
        {
          id: "delivered",
          title: "Redelivered: a shipment, in Shipping's words",
          body: "Once Shipping is back, the relay delivers again. In its own transaction, Shipping creates shipment S-17: a parcel and an address for order 42, no prices. It acknowledges, and the event leaves the outbox.",
          when: { none: [CALL] },
          // Modelled: the relay's next try, 30 s later.
          takesMs: 30000,
          focus: ["relay", "shipping-handler", "shipment", "shipping-db"],
          states: {
            relay: "outbox empty",
            "shipping-handler": "up",
            shipment: "S-17 · to pack",
            "shipping-db": "S-17 saved",
          },
          tokens: [
            { flow: "write", path: ["relay-shipping", "handler-shipment"], label: "S17" },
            { flow: "write", path: ["handler-db"] },
          ],
          log: [
            { flow: "write", tag: "EVENT", text: "OrderPlaced → Shipping · acknowledged" },
            {
              flow: "write",
              tag: "SQL",
              text: "Shipping: INSERT shipment S-17 (order 42) → COMMIT",
            },
          ],
        },
        {
          id: "call-shipping",
          title: "Shipping, called inside the transaction",
          body: "Before committing, placeOrder calls Shipping's API to create the shipment. Shipping is down for a deploy: the call hangs until its 5 s timeout, with Sales' transaction open.",
          when: { all: [CALL] },
          // Modelled: the client's timeout.
          takesMs: 5000,
          line: "ship-call",
          focus: ["service", "shipping-handler"],
          tokens: [{ flow: "error", path: ["service-shipping"] }],
          log: [
            { flow: "error", tag: "HTTP", text: "POST shipping/shipments → timeout after 5 s" },
          ],
        },
        {
          id: "rollback",
          title: "The order rolls back",
          body: "The call failed, so placeOrder throws and the transaction rolls back: order 42 is not placed. Sales fails because Shipping is down. Sent as an event, the order would have stood.",
          when: { all: [CALL] },
          focus: ["service", "sales-db", "buyer-a"],
          states: { order: "open · not placed", "sales-db": "order 42 · open" },
          tokens: [{ flow: "error", path: ["a-in"], reverse: true }],
          log: [
            { flow: "error", tag: "SQL", text: "ROLLBACK" },
            { flow: "error", text: "503 Service Unavailable  order 42 not placed" },
          ],
        },
      ],
    },
  ],
});
