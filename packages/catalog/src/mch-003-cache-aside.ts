import { defineMachine } from "@nightprint/engine";

/**
 * MCH-003 — Cache-aside with Redis.
 * References: Azure Architecture Center, "Cache-Aside pattern"; Redis, cache-aside guide and
 * command reference (GET, SET EX, DEL, EXPIRE); Nishtala et al., "Scaling Memcache", NSDI
 * 2013 (stale sets, thundering herds); Vattani et al., "Optimal Probabilistic Cache Stampede
 * Prevention", PVLDB 2015.
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3): the callers on the left (a product
 * page, the back office, an import job), the API service in the middle, Redis and the
 * database on the right. Reads and writes from the API go through Redis or the database;
 * the import job writes the database directly, behind the cache's back.
 */

const PIPE_Y = 0.3;
const BACK = -1.4;
const MID = 0.6;
const FRONT = 2.6;
const CALLERS_X = -4.2;
const JOIN_X = -2.2;
const API_Z = 0.2;
const FORK_X = 2.0;
const STORE_X = 3.8;
const DB_Z = 1.6;

const NO_TTL = "no-ttl";
const DELETE_FIRST = "delete-first";
const HOT = "hot-key";

export const cacheAside = defineMachine({
  code: "MCH-003",
  slug: "redis-cache-aside",
  title: "Redis cache-aside",
  aliases: ["lazy loading", "look-aside cache"],
  summary:
    "The application reads the cache first, loads the database on a miss, and deletes the key when the data changes.",
  family: "infra",
  category: "PATTERN",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-13",
  flowLabels: { request: "Read", write: "Write", response: "Response", error: "Stale, overload" },
  sources: [
    {
      label: "Azure Architecture Center, Cache-Aside",
      url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside",
    },
    {
      label: "Redis docs, cache-aside",
      url: "https://redis.io/docs/latest/develop/use-cases/cache-aside/",
    },
    {
      label: "Nishtala et al., NSDI 2013",
      url: "https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf",
    },
    {
      label: "Redis docs, key eviction",
      url: "https://redis.io/docs/latest/develop/reference/eviction/",
    },
    {
      label: "Vattani et al., PVLDB 2015",
      url: "https://www.vldb.org/pvldb/vol8/p886-vattani.pdf",
    },
  ],
  article: [
    "Cache-aside, also called lazy loading, is a caching pattern in which the application, not the cache, keeps the cache filled: it reads the cache first, and on a miss it reads the database, stores the result in the cache with an expiry, and returns it. Redis is a common cache for it, an in-memory data store that never queries a database by itself.",
    "On a write, the application updates the database first, then deletes the cached key rather than writing the new value into it. The next read misses and loads the new value. A delete is idempotent; values written into the cache by several writers can land in the wrong order.",
    "The expiry is what bounds staleness. Anything that changes the database without deleting the key, an import job, a manual fix, another service, leaves the old value in the cache until the key expires. A key set without an expiry lives until someone deletes it or Redis evicts it, and the default policy evicts nothing: once maxmemory is reached, Redis refuses new writes.",
    "Cache-aside does not keep the cache consistent with the database. Between a write and its delete, readers see the old value, and a slow read that overlaps a write can put the old value back after the delete. The expiry is the upper bound on how long that lasts.",
    "A hot key that expires under load sends every request that misses to the database at once: a cache stampede. Common fixes let one caller reload the key while the others wait or keep serving the old value: a short lock taken with SET NX, coalescing requests inside a process, or recomputing a little before the expiry. Redis offers none of them as such: the application does it.",
  ],
  glossary: [
    {
      term: "Cache-aside",
      definition:
        "The application checks the cache, loads the database on a miss, and fills the cache itself. The cache never talks to the database.",
      parts: ["api", "redis", "database"],
    },
    {
      term: "Cache miss",
      definition:
        "The key is not in the cache: GET returns nil, and the application goes to the database.",
      parts: ["redis"],
    },
    {
      term: "TTL",
      definition:
        "Time to live: how long a key lasts before Redis deletes it, set with SET … EX. It bounds how long a stale value can be served.",
      parts: ["redis"],
    },
    {
      term: "Invalidation",
      definition:
        "Deleting the cached key after the database changed, so the next read loads the new value. Delete it, don't rewrite it.",
      parts: ["api", "redis"],
    },
    {
      term: "Stale value",
      definition:
        "A value the cache still serves after the database changed. Cache-aside allows it; the TTL limits it.",
      parts: ["redis", "import-job"],
    },
    {
      term: "Cache stampede",
      definition:
        "A hot key expires under load: every request misses at once and runs the same query against the database.",
      parts: ["database"],
    },
  ],
  listing: [
    { id: "file", text: "// api · products.ts" },
    { id: "get-fn", text: "async function getProduct(id) {" },
    { id: "key", text: "  const key = `product:${id}`;" },
    { id: "redis-get", text: "  const hit = await redis.get(key);" },
    { id: "hit", text: "  if (hit) return JSON.parse(hit);" },
    { id: "select", text: "  const row = await db.selectProduct(id);" },
    { id: "json", text: "  const json = JSON.stringify(row);" },
    { id: "set", text: "  await redis.set(key, json, { EX: 60 });" },
    { id: "return-row", text: "  return row;" },
    { id: "get-end", text: "}" },
    { id: "set-price-fn", text: "async function setPrice(id, price) {" },
    { id: "update", text: "  await db.updatePrice(id, price);" },
    { id: "del", text: "  await redis.del(`product:${id}`);" },
    { id: "set-price-end", text: "}" },
  ],
  stage: {
    plate: { size: [10.8, 5.8], center: [-0.1, 0.6] },
    zones: [
      {
        id: "callers",
        label: "Callers",
        note: "Read and write products",
        from: [-5.5, -2.3],
        to: [-2.7, 3.5],
      },
      {
        id: "service",
        label: "Service",
        note: "Owns the caching",
        from: [-2.7, -2.3],
        to: [1.3, 3.5],
      },
      {
        id: "storage",
        label: "Storage",
        note: "Memory, then disk",
        from: [1.3, -2.3],
        to: [5.3, 3.5],
      },
    ],
  },
  parts: [
    {
      id: "storefront",
      ref: 1,
      label: "Product page",
      role: "CALLER",
      kind: "actor",
      shape: { type: "box", size: [1.4, 0.7, 1.0] },
      position: [CALLERS_X, 0.35, BACK],
      socket: [0, -0.05, 0],
      description: "A shopper's page asking for product 42: GET /products/42.",
    },
    {
      id: "api",
      ref: 2,
      label: "API service",
      role: "SERVICE",
      kind: "core",
      shape: { type: "box", size: [1.6, 0.9, 1.4] },
      position: [0, 0.45, API_Z],
      socket: [0, -0.15, 0],
      description:
        "Owns the caching: reads Redis first, loads the database on a miss, and deletes the key after a write.",
    },
    {
      id: "redis",
      ref: 3,
      label: "Redis",
      role: "CACHE",
      kind: "store",
      shape: { type: "box", size: [1.3, 1.2, 1.1] },
      position: [STORE_X, 0.6, BACK],
      socket: [0, -0.3, 0],
      description:
        "In-memory key-value store. Holds product:42 until it expires or is deleted; never reads the database.",
    },
    {
      id: "database",
      ref: 4,
      label: "Database",
      role: "SOURCE",
      kind: "store",
      shape: { type: "cylinder", radius: 0.75, height: 1.1 },
      position: [STORE_X, 0.55, DB_Z],
      socket: [0, -0.25, 0],
      description: "The source of truth for prices, on disk. Slower to read than Redis.",
    },
    {
      id: "back-office",
      ref: 5,
      label: "Back office",
      role: "CALLER",
      kind: "actor",
      shape: { type: "box", size: [1.4, 0.7, 1.0] },
      position: [CALLERS_X, 0.35, MID],
      socket: [0, -0.05, 0],
      description: "Where staff change a price, through the API: PUT /products/42.",
    },
    {
      id: "import-job",
      ref: 6,
      label: "Import job",
      role: "CALLER",
      kind: "actor",
      shape: { type: "box", size: [1.4, 0.7, 1.0] },
      position: [CALLERS_X, 0.35, FRONT],
      socket: [0, -0.05, 0],
      description:
        "A nightly price import that writes the database directly. It knows nothing about the cache.",
    },
  ],
  routes: [
    {
      id: "page-api",
      from: "storefront",
      to: "api",
      via: [
        [JOIN_X, PIPE_Y, BACK],
        [JOIN_X, PIPE_Y, API_Z],
      ],
    },
    {
      id: "office-api",
      from: "back-office",
      to: "api",
      via: [
        [JOIN_X, PIPE_Y, MID],
        [JOIN_X, PIPE_Y, API_Z],
      ],
    },
    {
      id: "api-redis",
      from: "api",
      to: "redis",
      via: [
        [FORK_X, PIPE_Y, API_Z],
        [FORK_X, PIPE_Y, BACK],
      ],
      latencyMs: 0.5,
    },
    {
      id: "api-db",
      from: "api",
      to: "database",
      via: [
        [FORK_X, PIPE_Y, API_Z],
        [FORK_X, PIPE_Y, DB_Z],
      ],
      latencyMs: 10,
    },
    {
      id: "job-db",
      from: "import-job",
      to: "database",
      via: [[STORE_X, PIPE_Y, FRONT]],
      latencyMs: 10,
    },
  ],
  actions: [
    {
      id: NO_TTL,
      label: "Cache without an expiry",
      description:
        "SET without EX: the key never expires. A change the API does not delete stays in the cache for good.",
      effects: [
        { type: "patchPart", part: "redis", set: { flag: "violation" } },
        { type: "setLine", line: "set", text: "  await redis.set(key, json);" },
      ],
    },
    {
      id: DELETE_FIRST,
      label: "Delete the key before writing",
      description:
        "setPrice deletes product:42, then updates the database. A read in between caches the old price again.",
      effects: [
        { type: "patchPart", part: "api", set: { flag: "violation" } },
        { type: "setLine", line: "update", text: "  await redis.del(`product:${id}`);" },
        { type: "setLine", line: "del", text: "  await db.updatePrice(id, price);" },
      ],
    },
    {
      id: HOT,
      label: "Expire a hot key under load",
      description:
        "50 requests ask for product:42 the moment it expires or is deleted. Each one misses and queries the database.",
      effects: [{ type: "patchPart", part: "database", set: { flag: "violation" } }],
    },
  ],
  scenarios: [
    {
      id: "read-product",
      title: "Read a product",
      steps: [
        {
          id: "page-asks",
          title: "A page asks for product 42",
          body: "GET /products/42 reaches the API. The API, not Redis, decides where the product comes from.",
          line: "get-fn",
          focus: ["storefront", "api"],
          states: { redis: "empty", database: "price 10 €" },
          tokens: [{ flow: "request", path: ["page-api"] }],
          log: [{ flow: "request", tag: "HTTP", text: "GET /products/42 → API" }],
        },
        {
          id: "miss",
          title: "Redis first: a miss",
          body: "GET product:42 returns nil: nothing is cached yet. Redis does not go and look for it: the API must.",
          when: { none: [HOT] },
          line: "redis-get",
          focus: ["api", "redis"],
          states: { redis: "empty" },
          tokens: [{ flow: "request", path: ["api-redis"] }],
          log: [{ flow: "request", tag: "GET", text: "GET product:42 → (nil)" }],
        },
        {
          id: "miss-hot",
          title: "A hot key expires under load",
          body: "product:42 has just expired, and 50 requests ask for it within a few milliseconds. Every GET misses.",
          when: { all: [HOT], none: [NO_TTL] },
          line: "redis-get",
          focus: ["api", "redis"],
          states: { redis: "expired" },
          tokens: [{ flow: "error", path: ["api-redis"], label: "×50" }],
          log: [{ flow: "error", tag: "GET", text: "50 × GET product:42 → (nil)" }],
        },
        {
          id: "miss-hot-deleted",
          title: "A hot key is deleted under load",
          body: "A price change has just deleted product:42, and 50 requests ask for it within a few milliseconds. Every GET misses.",
          when: { all: [HOT, NO_TTL] },
          line: "redis-get",
          focus: ["api", "redis"],
          states: { redis: "deleted" },
          tokens: [{ flow: "error", path: ["api-redis"], label: "×50" }],
          log: [{ flow: "error", tag: "GET", text: "50 × GET product:42 → (nil)" }],
        },
        {
          id: "select",
          title: "On a miss, the database",
          body: "The API reads the product from the database: 10 €. Slower than Redis, and the reason the cache exists.",
          when: { none: [HOT] },
          line: "select",
          focus: ["api", "database"],
          states: { database: "price 10 €" },
          tokens: [{ flow: "request", path: ["api-db"] }],
          log: [{ flow: "request", tag: "SQL", text: "SELECT … WHERE id = 42 → 10 €" }],
        },
        {
          id: "select-hot",
          title: "50 identical queries",
          body: "Nothing tells the requests that one of them is already loading the key: each runs the same SELECT. The database takes 50 queries for one row: the very load the cache was there to absorb.",
          when: { all: [HOT] },
          line: "select",
          focus: ["api", "database"],
          states: { database: "50 queries at once" },
          tokens: [{ flow: "error", path: ["api-db"], label: "×50" }],
          log: [{ flow: "error", tag: "SQL", text: "50 × SELECT … WHERE id = 42" }],
        },
        {
          id: "set",
          title: "Cache it for 60 seconds",
          body: "SET product:42 … EX 60 stores the product with an expiry. However the price changes, this copy lasts 60 s at most.",
          when: { none: [HOT, NO_TTL] },
          line: "set",
          focus: ["api", "redis"],
          states: { redis: "10 € · TTL 60 s" },
          tokens: [{ flow: "write", path: ["api-redis"], label: "10€" }],
          log: [{ flow: "write", tag: "SET", text: "SET product:42 {…} EX 60 → OK" }],
        },
        {
          id: "set-forever",
          title: "Cache it, with no expiry",
          body: "SET without EX: the key will live until someone deletes it. Nothing goes wrong yet.",
          when: { all: [NO_TTL], none: [HOT] },
          line: "set",
          focus: ["api", "redis"],
          states: { redis: "10 € · no TTL" },
          tokens: [{ flow: "write", path: ["api-redis"], label: "10€" }],
          log: [{ flow: "write", tag: "SET", text: "SET product:42 {…} → OK  ·  TTL -1" }],
        },
        {
          id: "set-hot",
          title: "50 SETs of the same value",
          body: "Every request caches what it loaded: 50 writes of the same product. The cache ends up right; the database paid 50 times for it.",
          when: { all: [HOT] },
          line: "set",
          focus: ["api", "redis"],
          states: { redis: "10 € cached" },
          tokens: [{ flow: "write", path: ["api-redis"], label: "×50" }],
          log: [{ flow: "write", tag: "SET", text: "50 × SET product:42 {…}" }],
        },
        {
          id: "respond",
          title: "The page gets 10 €",
          body: "The API returns the product it loaded. The page cannot tell whether it came from Redis or the database.",
          line: "return-row",
          focus: ["api", "storefront"],
          tokens: [{ flow: "response", path: ["page-api"], reverse: true, label: "10€" }],
          log: [{ flow: "response", tag: "HTTP", text: "200 OK  price 10 €" }],
        },
        {
          id: "hit",
          title: "The next read: a hit",
          body: "Another page asks for product 42. GET finds it in memory: the database is not touched.",
          when: { none: [HOT] },
          line: "hit",
          focus: ["api", "redis"],
          states: { redis: "10 € · hit" },
          tokens: [{ flow: "response", path: ["api-redis"], reverse: true, label: "10€" }],
          log: [
            { flow: "response", tag: "GET", text: "GET product:42 → {…}  ·  database untouched" },
          ],
        },
        {
          id: "one-loader",
          title: "Let one request load it",
          body: "The usual fix lets one caller reload the key while the others wait: a short lock with SET … NX, or requests coalesced inside each process. Redis does not do it by itself.",
          when: { all: [HOT] },
          focus: ["api"],
          tokens: [{ flow: "request", at: "api", label: "1" }],
          log: [
            {
              flow: "request",
              tag: "FIX",
              text: "SET lock:product:42 <token> NX PX 2000 → one loader",
            },
          ],
        },
      ],
    },
    {
      id: "change-price",
      title: "Change a price",
      steps: [
        {
          id: "put",
          title: "The back office changes the price",
          body: "Staff set product 42 to 12 €. The API handles the write too, and must clear the cached copy.",
          line: "set-price-fn",
          focus: ["back-office", "api"],
          states: { redis: "10 € cached", database: "price 10 €" },
          tokens: [{ flow: "write", path: ["office-api"], label: "12€" }],
          log: [{ flow: "write", tag: "HTTP", text: "PUT /products/42  price = 12" }],
        },
        {
          id: "update",
          title: "Database first: UPDATE",
          body: "The new price is committed. Until the next line runs, Redis still holds 10 €, and readers can get it.",
          when: { none: [DELETE_FIRST] },
          line: "update",
          focus: ["api", "database"],
          states: { database: "price 12 €", redis: "10 € · stale" },
          tokens: [{ flow: "write", path: ["api-db"], label: "12€" }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "UPDATE products SET price = 12 WHERE id = 42 → COMMIT",
            },
          ],
        },
        {
          id: "delete",
          title: "Then delete the key",
          body: "DEL product:42 rather than SET: the next read loads the new price. Deleting twice is the same as deleting once, and two writers' deletes cannot leave the older price behind.",
          when: { none: [DELETE_FIRST] },
          line: "del",
          focus: ["api", "redis"],
          states: { redis: "empty" },
          tokens: [{ flow: "write", path: ["api-redis"] }],
          log: [{ flow: "write", tag: "DEL", text: "DEL product:42 → (integer) 1" }],
        },
        {
          id: "reload",
          title: "The next read loads 12 €",
          body: "A page asks for product 42: a miss, the database answers 12 €, and the API caches it again.",
          when: { none: [DELETE_FIRST] },
          line: "set",
          focus: ["api", "redis", "database"],
          states: { redis: "12 € cached", database: "price 12 €" },
          tokens: [{ flow: "write", path: ["api-redis"], label: "12€" }],
          log: [
            { flow: "write", tag: "SET", text: "GET → (nil)  ·  SELECT → 12 €  ·  SET product:42" },
          ],
        },
        {
          id: "delete-early",
          title: "The key goes first",
          body: "setPrice deletes product:42 before it touches the database. The database still says 10 €.",
          when: { all: [DELETE_FIRST] },
          line: "update",
          focus: ["api", "redis"],
          states: { redis: "empty", database: "price 10 €" },
          tokens: [{ flow: "write", path: ["api-redis"] }],
          log: [{ flow: "write", tag: "DEL", text: "DEL product:42 → (integer) 1" }],
        },
        {
          id: "read-slips-in",
          title: "A read slips in",
          body: "Before the UPDATE commits, a page asks for product 42. The key is gone, so the API reads the database: 10 €.",
          when: { all: [DELETE_FIRST] },
          line: "select",
          focus: ["storefront", "api", "database"],
          tokens: [{ flow: "request", path: ["page-api", "api-db"], label: "10€" }],
          log: [
            { flow: "request", tag: "SQL", text: "GET → (nil)  ·  SELECT … WHERE id = 42 → 10 €" },
          ],
        },
        {
          id: "update-late",
          title: "Then the UPDATE commits",
          body: "The database now says 12 €. The read that loaded 10 € has not finished yet.",
          when: { all: [DELETE_FIRST] },
          line: "del",
          focus: ["api", "database"],
          states: { database: "price 12 €" },
          tokens: [{ flow: "write", path: ["api-db"], label: "12€" }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "UPDATE products SET price = 12 WHERE id = 42 → COMMIT",
            },
          ],
        },
        {
          id: "stale-set",
          title: "The read puts 10 € back",
          body: "The slow read finishes and caches the price it read. Pages show 10 € while the database says 12 €, for up to 60 s: until the key expires or the next write deletes it.",
          when: { all: [DELETE_FIRST], none: [NO_TTL] },
          line: "set",
          focus: ["api", "redis"],
          states: { redis: "10 € · stale ≤ 60 s" },
          tokens: [{ flow: "error", path: ["api-redis"], label: "10€" }],
          log: [
            {
              flow: "error",
              tag: "SET",
              text: "SET product:42 {10 €} EX 60  ·  database says 12 €",
            },
          ],
        },
        {
          id: "stale-set-forever",
          title: "The read puts 10 € back, for good",
          body: "The slow read caches the price it read, with no expiry. Nothing expires it: pages show 10 € until the next write deletes the key.",
          when: { all: [DELETE_FIRST, NO_TTL] },
          line: "set",
          focus: ["api", "redis"],
          states: { redis: "10 € · stale, no TTL" },
          tokens: [{ flow: "error", path: ["api-redis"], label: "10€" }],
          log: [
            {
              flow: "error",
              tag: "SET",
              text: "SET product:42 {10 €}  ·  database says 12 €, for good",
            },
          ],
        },
      ],
    },
    {
      id: "behind-the-cache",
      title: "Change it behind the cache",
      steps: [
        {
          id: "import",
          title: "An import job writes the database",
          body: "A nightly import sets product 42 to 12 €, straight in the database. It knows nothing about Redis, so nothing deletes the key.",
          focus: ["import-job", "database"],
          states: { database: "price 12 €", redis: "10 € cached" },
          tokens: [{ flow: "write", path: ["job-db"], label: "12€" }],
          log: [
            {
              flow: "write",
              tag: "SQL",
              text: "import: UPDATE products SET price = 12 WHERE id = 42",
            },
          ],
        },
        {
          id: "stale-reads",
          title: "Reads keep getting 10 €",
          body: "Every page hits the cache and gets the old price. Redis is not wrong by its own rules: no one told it.",
          line: "hit",
          focus: ["api", "redis"],
          states: { redis: "10 € · stale" },
          tokens: [{ flow: "error", path: ["api-redis"], reverse: true, label: "10€" }],
          log: [
            { flow: "error", tag: "GET", text: "GET product:42 → 10 €  ·  database says 12 €" },
          ],
        },
        {
          id: "expires",
          title: "The key expires; 12 € loads",
          body: "Within 60 s the TTL runs out and Redis deletes the key. The next read misses and loads 12 €. The TTL bounded the damage.",
          when: { none: [NO_TTL] },
          // Modelled: up to the whole TTL can pass before the stale copy expires.
          takesMs: 60000,
          line: "set",
          focus: ["redis", "api", "database"],
          states: { redis: "12 € cached", database: "price 12 €" },
          tokens: [{ flow: "write", path: ["api-redis"], label: "12€" }],
          log: [
            {
              flow: "write",
              tag: "TTL",
              text: "expired  ·  GET → (nil)  ·  SELECT → 12 €  ·  SET … EX 60",
            },
          ],
        },
        {
          id: "never-expires",
          title: "It never expires",
          body: "SET without EX made the key permanent: TTL -1. The old price stays until someone deletes the key, and by default Redis never evicts it to make room.",
          when: { all: [NO_TTL] },
          focus: ["redis"],
          states: { redis: "10 € · stale, no TTL" },
          tokens: [{ flow: "error", at: "redis", label: "10€" }],
          log: [
            {
              flow: "error",
              tag: "TTL",
              text: "TTL product:42 → -1  ·  10 € until someone deletes it",
            },
          ],
        },
      ],
    },
  ],
});
