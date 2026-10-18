import { defineMachine } from "@nightprint/engine";

/**
 * PRT-001 — The TLS 1.3 handshake over TCP, message by message, counted in round trips.
 * References: RFC 8446 (TLS 1.3, 2018): Figure 1 full handshake, §2.3 and §8 0-RTT,
 * §4.4 authentication, §6.2 alerts; RFC 5246 (TLS 1.2, 2008) §7.3; RFC 9525 (service
 * identity, 2023) §6.6; RFC 8470 (early data in HTTP, 2018); RFC 9293 (TCP, 2022) §3.5.
 * The 25 ms each way is modelled: the RFCs count round trips, not milliseconds.
 *
 * Layout (y up, plate top at y = 0, pipes at y = 0.3): the client on the left, the network
 * in the middle, the server on the right. Each side's key pair stands behind it; the
 * session ticket in front of the client, the certificate in front of the server.
 */

const SIDE_X = 4.0;
const BACK_Z = -1.9;
const FRONT_Z = 1.9;

const TLS12 = "tls-1-2";
const ZERO = "zero-rtt";
const WRONG = "wrong-name";

const KEYS = { type: "box", size: [1.0, 0.5, 0.7] } as const;

export const tlsHandshake = defineMachine({
  code: "PRT-001",
  slug: "tls-1-3-handshake",
  title: "TLS 1.3 handshake",
  aliases: ["TLS handshake"],
  summary:
    "Anyone on the network can read what a browser sends. Before its first request, browser and server agree on a secret key in one round trip, and the server proves it is the site asked for.",
  family: "infra",
  category: "PROTOCOL",
  scale: "NTS",
  revision: "A",
  revised: "2026-10-18",
  flowLabels: { request: "Client", write: "Keys", response: "Server", error: "Alert, risk" },
  sources: [
    { label: "RFC 8446, TLS 1.3, 2018", url: "https://www.rfc-editor.org/rfc/rfc8446.html" },
    { label: "RFC 5246, TLS 1.2, 2008", url: "https://www.rfc-editor.org/rfc/rfc5246.html" },
    {
      label: "RFC 9525, Service Identity in TLS, 2023",
      url: "https://www.rfc-editor.org/rfc/rfc9525.html",
    },
    {
      label: "RFC 8470, Early Data in HTTP, 2018",
      url: "https://www.rfc-editor.org/rfc/rfc8470.html",
    },
    { label: "RFC 9293, TCP, 2022", url: "https://www.rfc-editor.org/rfc/rfc9293.html" },
  ],
  article: [
    "The TLS 1.3 handshake is how a client and a server set up an encrypted, authenticated connection before any application data flows. Defined in RFC 8446 in 2018, it takes one round trip on top of the TCP handshake: the client sends a key share in its very first message, the server answers with its own and with the rest of the handshake encrypted, and the client sends its request right after its Finished message.",
    "Each side sends the public half of a fresh key pair. Combining it with its own private half, each side computes the same secret, which no one watching the wire can. From the ServerHello on, everything is encrypted, the server's certificate included. The server proves it holds the certificate's private key by signing the handshake (CertificateVerify), and each side's Finished message, a MAC over the whole handshake, shows that no one tampered with it. By default only the server is authenticated.",
    "TLS 1.2, defined in RFC 5246, takes two round trips: the key exchange completes only in the client's second flight, the certificate travels in plaintext, and no application data may be sent before the handshake is complete. A TLS 1.3 client meeting a TLS 1.2 server does not reconnect: the server answers the same ClientHello with a TLS 1.2 ServerHello.",
    "With a ticket from an earlier TLS 1.3 connection, the client can resume with a pre-shared key and send its request in its very first flight: 0-RTT early data. RFC 8446 warns that this data is not forward secret and has no protection against replay across connections, so RFC 8470 lets clients put only safe requests, such as a GET, in early data, and lets servers refuse it with 425 Too Early.",
    "Before trusting the keys, the client checks that the certificate names the host it meant to reach, here shop.example. RFC 9525 says to end the attempt with a bad certificate error when it does not. The 25 ms each way on this machine is modelled; the RFCs count round trips.",
  ],
  glossary: [
    {
      term: "Round trip",
      definition:
        "A message there and its answer back: 50 ms here. Handshakes are counted in round trips.",
    },
    {
      term: "Key share",
      definition:
        "The public half of a fresh key pair. With the other side's share, each side computes the same secret; no one on the wire can.",
      parts: ["client-keys", "server-keys"],
    },
    {
      term: "ClientHello",
      definition:
        "The client's first message: the versions and ciphers it supports, and its key share. Sent in plaintext.",
      parts: ["browser"],
    },
    {
      term: "Certificate",
      definition:
        "Binds the server's public key to its names, signed by an authority the client trusts. Encrypted in TLS 1.3, plaintext in 1.2.",
      parts: ["certificate"],
    },
    {
      term: "CertificateVerify",
      definition:
        "The server's signature over the handshake with its certificate's private key: proof that it holds that key.",
      parts: ["server", "certificate"],
    },
    {
      term: "Finished",
      definition:
        "A MAC over the whole handshake. Each side checks the other's, so a tampered handshake fails.",
      parts: ["browser", "server"],
    },
    {
      term: "Session ticket",
      definition:
        "Sent by the server after a handshake. Presented next time, it lets the client resume with a pre-shared key.",
      parts: ["ticket"],
    },
    {
      term: "0-RTT early data",
      definition:
        "A request sent with the first message of a resumed handshake. Not forward secret, and it can be replayed.",
      parts: ["ticket", "browser"],
    },
  ],
  stage: {
    plate: { size: [11.2, 6.2], center: [0, 0] },
    zones: [
      { id: "client", label: "Client", note: "Your browser", from: [-5.4, -2.9], to: [-2.2, 2.9] },
      {
        id: "network",
        label: "Network",
        note: "25 ms each way, modelled",
        from: [-2.2, -2.9],
        to: [2.2, 2.9],
      },
      {
        id: "server-side",
        label: "Server",
        note: "The site asked for: shop.example",
        from: [2.2, -2.9],
        to: [5.4, 2.9],
      },
    ],
  },
  parts: [
    {
      id: "browser",
      ref: 1,
      label: "Browser",
      role: "CLIENT",
      kind: "actor",
      shape: { type: "box", size: [1.3, 0.7, 1.0] },
      position: [-SIDE_X, 0.35, 0],
      socket: [0, -0.05, 0],
      description: "A browser opening https://shop.example. It speaks TLS 1.3 and 1.2.",
    },
    {
      id: "server",
      ref: 2,
      label: "Web server",
      role: "SERVER",
      kind: "module",
      shape: { type: "box", size: [1.6, 0.75, 1.1] },
      position: [SIDE_X, 0.375, 0],
      socket: [0, -0.075, 0],
      description: "Serves shop.example. Speaks TLS 1.3, unless a switch says otherwise.",
    },
    {
      id: "client-keys",
      ref: 3,
      label: "Client key pair",
      role: "ONE-TIME",
      kind: "store",
      shape: KEYS,
      position: [-SIDE_X, 0.25, BACK_Z],
      socket: [0, 0.05, 0],
      description: "Made fresh for this connection. Only its public half, the key share, is sent.",
    },
    {
      id: "server-keys",
      ref: 4,
      label: "Server key pair",
      role: "ONE-TIME",
      kind: "store",
      shape: KEYS,
      position: [SIDE_X, 0.25, BACK_Z],
      socket: [0, 0.05, 0],
      description: "Made fresh for this connection. Only its public half, the key share, is sent.",
    },
    {
      id: "certificate",
      ref: 5,
      label: "Certificate",
      role: "IDENTITY",
      kind: "store",
      shape: KEYS,
      position: [SIDE_X, 0.25, FRONT_Z],
      socket: [0, 0.05, 0],
      description:
        "The server's certificate and its private key. The certificate names the host; the key signs the handshake.",
    },
    {
      id: "ticket",
      ref: 6,
      label: "Session ticket",
      role: "NONE YET",
      kind: "store",
      shape: KEYS,
      position: [-SIDE_X, 0.25, FRONT_Z],
      socket: [0, 0.05, 0],
      description: "A ticket from an earlier TLS 1.3 connection to this server, if there was one.",
    },
  ],
  routes: [
    { id: "wire", from: "browser", to: "server", latencyMs: 25 },
    { id: "client-keys", from: "browser", to: "client-keys" },
    { id: "server-keys", from: "server", to: "server-keys" },
    { id: "server-cert", from: "server", to: "certificate" },
    { id: "ticket-browser", from: "ticket", to: "browser" },
  ],
  actions: [
    {
      id: TLS12,
      label: "Meet a server that speaks only TLS 1.2",
      description:
        "The same ClientHello gets a TLS 1.2 answer: the certificate travels in plaintext, and the handshake takes one more round trip.",
      effects: [{ type: "patchPart", part: "server", set: { role: "TLS 1.2 ONLY" } }],
    },
    {
      id: ZERO,
      label: "Come back with a ticket (0-RTT)",
      description:
        "With a ticket from an earlier TLS 1.3 visit, the request leaves with the very first message. Faster, but that request can be replayed.",
      effects: [{ type: "patchPart", part: "ticket", set: { role: "TICKET" } }],
    },
    {
      id: WRONG,
      label: "Serve a certificate for another name",
      description:
        "The certificate is valid, but for other.example. The client ends the handshake before sending anything.",
      effects: [{ type: "patchPart", part: "certificate", set: { flag: "violation" } }],
    },
  ],
  scenarios: [
    {
      id: "connect",
      title: "Open https://shop.example",
      steps: [
        {
          id: "syn",
          title: "TCP first: SYN",
          lead: "First the browser opens a line (TCP): its SYN takes 25 ms to cross the network.",
          body: "Before any TLS, TCP opens the connection. The browser sends SYN; it takes 25 ms to cross the network.",
          focus: ["browser", "server"],
          states: { browser: "connecting", server: "listening" },
          tokens: [{ flow: "request", path: ["wire"], label: "SYN" }],
          log: [{ flow: "request", tag: "TCP", text: "SYN → open a connection" }],
        },
        {
          id: "syn-ack",
          title: "SYN-ACK",
          lead: "The server answers (SYN-ACK): one round trip, 50 ms, and the line is open.",
          body: "The server answers SYN-ACK. One round trip so far, 50 ms, and the client may now send data.",
          focus: ["browser", "server"],
          tokens: [{ flow: "response", path: ["wire"], reverse: true, label: "S/A" }],
          log: [{ flow: "response", tag: "TCP", text: "← SYN, ACK: connection open" }],
        },
        {
          id: "hello",
          title: "ACK and ClientHello",
          lead: "The browser says hello and sends the public half of a fresh key: anyone may read it.",
          body: "The browser completes TCP and sends its ClientHello in the same flight: the TLS versions and ciphers it supports, and a key share, the public half of a key pair it has just made. The ClientHello travels in plaintext.",
          when: { none: [ZERO] },
          focus: ["browser", "client-keys"],
          states: { "client-keys": "fresh key · public half sent" },
          tokens: [
            { flow: "request", path: ["wire"], label: "CH" },
            { flow: "write", path: ["client-keys"], reverse: true, label: "KS" },
          ],
          log: [
            {
              flow: "request",
              tag: "TLS",
              text: "ACK + ClientHello: what it speaks, and its public key half",
            },
          ],
        },
        {
          id: "hello-no-ticket",
          title: "No ticket to resume with",
          lead: "No ticket from this TLS 1.2 server: the browser sends a plain hello and a fresh key.",
          body: "A TLS 1.2 server never issued a TLS 1.3 ticket, so there is nothing to resume and no early data. The browser completes TCP and sends a plain ClientHello, with its versions, its ciphers and a fresh key share.",
          when: { all: [ZERO, TLS12] },
          focus: ["browser", "client-keys", "ticket"],
          states: { ticket: "none for this server", "client-keys": "fresh key · public half sent" },
          tokens: [
            { flow: "request", path: ["wire"], label: "CH" },
            { flow: "write", path: ["client-keys"], reverse: true, label: "KS" },
          ],
          log: [
            {
              flow: "request",
              tag: "TLS",
              text: "ACK + ClientHello: what it speaks, and its public key half",
            },
          ],
        },
        {
          id: "hello-early",
          title: "ClientHello, and the request with it",
          lead: "With a ticket from last time, the request leaves right away, with the hello.",
          body: "With a ticket from an earlier TLS 1.3 connection to this server, the browser resumes: its ClientHello carries the ticket's pre-shared key and an early_data flag, and right behind it goes the request, GET /orders, encrypted with keys derived from that key. It leaves at 50 ms, right after TCP.",
          when: { all: [ZERO], none: [TLS12] },
          focus: ["browser", "ticket"],
          states: { ticket: "last time's key" },
          tokens: [
            { flow: "request", path: ["wire"], label: "GET" },
            { flow: "write", path: ["ticket-browser"], label: "PSK" },
          ],
          log: [
            {
              flow: "request",
              tag: "TLS",
              text: "ACK + ClientHello with last time's key + GET /orders, already",
            },
          ],
        },
        {
          id: "server-hello",
          title: "ServerHello, then everything encrypted",
          lead: "The server sends its own key half: both compute the same secret, and the rest is encrypted.",
          body: "The server picks TLS 1.3 and answers with its own key share. From the two shares, both sides compute the same secret, so everything after ServerHello is encrypted: the certificate, a signature over the handshake with the certificate's private key (CertificateVerify), and Finished, a MAC over the whole handshake.",
          when: { none: [TLS12, ZERO] },
          focus: ["server", "server-keys", "certificate"],
          states: { "server-keys": "fresh key · secret shared", server: "TLS 1.3" },
          tokens: [
            { flow: "response", path: ["wire"], reverse: true, label: "SH" },
            { flow: "write", path: ["server-keys"], reverse: true, label: "KS" },
            { flow: "write", path: ["server-cert"], reverse: true },
          ],
          log: [
            {
              flow: "response",
              tag: "TLS",
              text: "← ServerHello with its key half, then encrypted: certificate, signature, Finished",
            },
          ],
        },
        {
          id: "check",
          title: "The browser checks the server",
          lead: "The browser checks the server's ID card (certificate): right name, real signature, nothing tampered.",
          body: "The certificate names shop.example and chains to an authority the browser trusts; the signature matches the certificate's key; Finished matches the handshake the browser saw. The server is who it claims to be.",
          when: { none: [TLS12, ZERO, WRONG] },
          focus: ["browser"],
          states: { browser: "server checked", "client-keys": "secret shared" },
          tokens: [{ flow: "response", at: "browser", label: "OK" }],
          log: [
            {
              flow: "response",
              tag: "CHECK",
              text: "certificate for shop.example from a trusted authority; signature and Finished check out",
            },
          ],
        },
        {
          id: "check-wrong",
          title: "The name does not match",
          lead: "The ID card (certificate) is for other.example, not shop.example: wrong server.",
          body: "The certificate is valid, but for other.example: shop.example is not among its names. The browser must not go on with this server.",
          when: { all: [WRONG], none: [TLS12, ZERO] },
          focus: ["browser", "certificate"],
          states: { certificate: "names other.example" },
          tokens: [{ flow: "error", at: "browser", label: "≠" }],
          log: [
            {
              flow: "error",
              tag: "CHECK",
              text: "certificate names other.example, not shop.example",
            },
          ],
        },
        {
          id: "finished",
          title: "Finished, and the first request",
          lead: "Handshake done: the first request leaves, encrypted, at 100 ms.",
          body: "The browser sends its Finished and, in the same flight, the first request, GET /orders, encrypted with the application keys. It leaves 100 ms after the first SYN: one round trip for TCP, one for TLS.",
          when: { none: [TLS12, ZERO, WRONG] },
          focus: ["browser", "server"],
          tokens: [{ flow: "request", path: ["wire"], label: "GET" }],
          log: [{ flow: "request", tag: "TLS", text: "Finished + GET /orders, encrypted" }],
        },
        {
          id: "response",
          title: "The response",
          lead: "The page starts arriving (200 OK) at 150 ms.",
          body: "The server answers 200 OK. The first byte of the page arrives 150 ms after the first SYN.",
          when: { none: [TLS12, ZERO, WRONG] },
          focus: ["server", "browser"],
          tokens: [{ flow: "response", path: ["wire"], reverse: true, label: "200" }],
          log: [{ flow: "response", tag: "HTTP", text: "← 200 OK, encrypted" }],
        },
        {
          id: "alert",
          title: "Alert, and close",
          lead: "The browser hangs up (bad_certificate alert): it sent nothing to the wrong server.",
          body: "The browser sends a bad_certificate alert, encrypted under the handshake keys, and closes the connection. It sent no request: nothing reached a server it could not identify.",
          when: { all: [WRONG], none: [TLS12, ZERO] },
          focus: ["browser", "server"],
          states: { browser: "connection closed" },
          tokens: [{ flow: "error", path: ["wire"], label: "!" }],
          log: [
            {
              flow: "error",
              tag: "TLS",
              text: "alert bad_certificate, hang up: nothing sent to the wrong server",
            },
          ],
        },
        {
          id: "early-server",
          title: "The answer in the server's first flight",
          lead: "The server answers at once (200 OK): the page arrives at 100 ms.",
          body: "The server accepts the early data and answers in its first flight: ServerHello, its encrypted extensions and Finished, then 200 OK. No certificate is sent on a resumption: the pre-shared key stands for the one checked last time. The response arrives at 100 ms.",
          when: { all: [ZERO], none: [TLS12] },
          focus: ["server", "server-keys", "browser"],
          states: { server: "early request accepted" },
          tokens: [
            { flow: "response", path: ["wire"], reverse: true, label: "200" },
            { flow: "write", path: ["server-keys"], reverse: true, label: "KS" },
          ],
          log: [
            {
              flow: "response",
              tag: "TLS",
              text: "← ServerHello, Finished and 200 OK, in one flight",
            },
          ],
        },
        {
          id: "early-finished",
          title: "Fast, and replayable",
          lead: "Faster, but an eavesdropper can replay early data: only harmless requests, like reading a page, go in it.",
          body: "The browser ends its early data and sends its Finished. The request it sent early had a price: it is not forward secret, and nothing stops it being replayed on another connection. That is why RFC 8470 lets only safe requests, like this GET, go in early data.",
          when: { all: [ZERO], none: [TLS12] },
          focus: ["browser", "server"],
          tokens: [{ flow: "request", path: ["wire"], label: "FIN" }],
          log: [{ flow: "request", tag: "TLS", text: "end of early data, then Finished" }],
        },
        {
          id: "server-hello-12",
          title: "A TLS 1.2 answer, in plaintext",
          lead: "This server answers in TLS 1.2: its ID card (certificate) travels unencrypted.",
          body: "This server speaks only TLS 1.2. It answers the same ClientHello with a TLS 1.2 ServerHello, its certificate, its signed key exchange parameters and ServerHelloDone, all in plaintext: in TLS 1.2 the certificate is not encrypted.",
          when: { all: [TLS12] },
          focus: ["server", "certificate"],
          states: { server: "TLS 1.2" },
          tokens: [
            { flow: "response", path: ["wire"], reverse: true, label: "SH" },
            { flow: "write", path: ["server-cert"], reverse: true },
          ],
          log: [
            {
              flow: "response",
              tag: "TLS",
              text: "← ServerHello, certificate and key parameters, unencrypted",
            },
          ],
        },
        {
          id: "key-exchange-12",
          title: "The client's key exchange",
          lead: "The browser sends its key half only now: the keys are agreed a round trip later.",
          body: "The browser checks the certificate and the signed parameters, then sends its own key share (ClientKeyExchange), ChangeCipherSpec and an encrypted Finished. The keys are only now agreed.",
          when: { all: [TLS12], none: [WRONG] },
          focus: ["browser", "client-keys"],
          states: { browser: "server checked", "client-keys": "secret shared" },
          tokens: [
            { flow: "request", path: ["wire"], label: "CKE" },
            { flow: "write", path: ["client-keys"], reverse: true, label: "KS" },
          ],
          log: [
            {
              flow: "request",
              tag: "TLS",
              text: "the browser's key half (ClientKeyExchange), then Finished",
            },
          ],
        },
        {
          id: "finished-12",
          title: "The server's Finished",
          lead: "The server confirms (Finished): the handshake ends at 150 ms.",
          body: "The server replies with its ChangeCipherSpec and Finished. Only now is the handshake complete: TLS 1.2 sends no application data before.",
          when: { all: [TLS12], none: [WRONG] },
          focus: ["server", "browser"],
          tokens: [{ flow: "response", path: ["wire"], reverse: true, label: "FIN" }],
          log: [{ flow: "response", tag: "TLS", text: "← Finished: the keys are in use" }],
        },
        {
          id: "request-12",
          title: "The first request, a round trip later",
          lead: "The first request leaves at 150 ms, a round trip later than TLS 1.3.",
          body: "GET /orders leaves 150 ms after the first SYN, one round trip later than with TLS 1.3.",
          when: { all: [TLS12], none: [WRONG] },
          focus: ["browser", "server"],
          tokens: [{ flow: "request", path: ["wire"], label: "GET" }],
          log: [{ flow: "request", tag: "HTTP", text: "GET /orders, encrypted" }],
        },
        {
          id: "response-12",
          title: "The response",
          lead: "The page starts arriving (200 OK) at 200 ms.",
          body: "200 OK. The first byte of the page arrives 200 ms after the first SYN.",
          when: { all: [TLS12], none: [WRONG] },
          focus: ["server", "browser"],
          tokens: [{ flow: "response", path: ["wire"], reverse: true, label: "200" }],
          log: [{ flow: "response", tag: "HTTP", text: "← 200 OK, encrypted" }],
        },
        {
          id: "check-wrong-12",
          title: "The name does not match",
          lead: "The ID card (certificate), unencrypted, is for other.example: wrong server.",
          body: "The certificate, readable by anyone on the path in TLS 1.2, is for other.example: shop.example is not among its names. The browser must not go on.",
          when: { all: [TLS12, WRONG] },
          focus: ["browser", "certificate"],
          states: { certificate: "names other.example" },
          tokens: [{ flow: "error", at: "browser", label: "≠" }],
          log: [
            {
              flow: "error",
              tag: "CHECK",
              text: "certificate names other.example, not shop.example",
            },
          ],
        },
        {
          id: "alert-12",
          title: "Alert, and close",
          lead: "The browser hangs up (bad_certificate alert): it sent nothing to the wrong server.",
          body: "The browser sends a bad_certificate alert and closes the connection. It sent no request.",
          when: { all: [TLS12, WRONG] },
          focus: ["browser", "server"],
          states: { browser: "connection closed" },
          tokens: [{ flow: "error", path: ["wire"], label: "!" }],
          log: [
            {
              flow: "error",
              tag: "TLS",
              text: "alert bad_certificate, hang up: nothing sent to the wrong server",
            },
          ],
        },
      ],
    },
  ],
});
