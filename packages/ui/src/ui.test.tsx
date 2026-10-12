import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Balloon } from "./atoms/balloon";
import { ButtonLink } from "./atoms/button-link";
import { DimensionLine } from "./atoms/dimension-line";
import { IconButton } from "./atoms/icon-button";
import { LogoMark } from "./atoms/logo-mark";
import { Breadcrumb } from "./molecules/breadcrumb";
import { FilterChips } from "./molecules/filter-chips";
import { FlowLegend } from "./molecules/flow-legend";
import { MachineCard } from "./molecules/machine-card";
import { PartCallout } from "./molecules/part-callout";
import { PlanView } from "./molecules/plan-view";
import { SheetPreview } from "./molecules/sheet-preview";
import { StepDots } from "./molecules/step-dots";
import { WhatIfSwitch } from "./molecules/what-if-switch";
import { BillOfParts } from "./organisms/bill-of-parts";
import { ConceptArticle } from "./organisms/concept-article";
import { DrawingLegend } from "./organisms/drawing-legend";
import { DrawingRegister } from "./organisms/drawing-register";
import { DrawingSheet } from "./organisms/drawing-sheet";
import { HomeHeader } from "./organisms/home-header";
import { HomeIntro } from "./organisms/home-intro";
import { MachineCatalogue } from "./organisms/machine-catalogue";
import { RunTranscript } from "./organisms/run-transcript";
import { ScenarioPicker } from "./organisms/scenario-picker";
import { SiteFooter } from "./organisms/site-footer";
import { SiteHeader } from "./organisms/site-header";
import { StoryNote } from "./organisms/story-note";
import { Transport } from "./organisms/transport";
import { UpNext } from "./organisms/up-next";
import { WhatIfPanel } from "./organisms/what-if-panel";
import { WhatIfShowcase } from "./organisms/what-if-showcase";
import { MachineFigure } from "./templates/machine-figure";
import { MachineTemplate } from "./templates/machine-template";
import { StoryTemplate } from "./templates/story-template";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("atoms", () => {
  it("draws a balloon at rest, lit by a flow, and in violation", () => {
    expect(html(<Balloon number={3} />)).toContain("background:#0A0B0D");
    expect(html(<Balloon number={3} flow="write" />)).toContain("background:#7BE38A");
    expect(html(<Balloon number={3} flow="write" violation />)).toContain("background:#FF5A36");
  });

  it("keeps the balloon out of the accessibility tree", () => {
    expect(html(<Balloon number={1} />)).toContain('aria-hidden="true"');
  });

  it("names icon-only buttons", () => {
    expect(html(<IconButton label="Next step">›</IconButton>)).toContain('aria-label="Next step"');
  });

  it("draws a navigating action as a link, not a button", () => {
    const link = html(<ButtonLink href="/m/x/">Run MCH-001</ButtonLink>);
    expect(link).toMatch(/^<a [^>]*href="\/m\/x\/"/);
    expect(link).not.toContain("<button");
  });

  it("keeps the logo mark and dimension lines out of the accessibility tree", () => {
    expect(html(<LogoMark />)).toContain('aria-hidden="true"');
    expect(html(<DimensionLine value="4.2 ms" />)).toContain('aria-hidden="true"');
  });
});

describe("molecules", () => {
  it("exposes what-if switches as switches", () => {
    const on = html(<WhatIfSwitch label="Swap" description="d" on />);
    expect(on).toContain('role="switch"');
    expect(on).toContain('aria-checked="true"');
  });

  it("marks the current step", () => {
    const dots = html(
      <StepDots
        current={1}
        steps={[
          { id: "a", title: "A", flow: "request" },
          { id: "b", title: "B", flow: "write" },
        ]}
      />,
    );
    expect(dots.match(/aria-current="step"/g)).toHaveLength(1);
    expect(dots).toContain('aria-label="Step 2: B"');
  });

  it("draws an upcoming machine without a link", () => {
    expect(html(<MachineCard code="MCH-002" title="Event loop" family="frontend" />)).not.toContain(
      "<a",
    );
    expect(
      html(<MachineCard code="MCH-001" title="Hexagonal" family="backend" href="/m/x/" />),
    ).toContain('href="/m/x/"');
  });

  it("groups filter chips under a name, with exactly one pressed", () => {
    const chips = html(
      <FilterChips
        label="Filter by family"
        value="mobile"
        options={[
          { id: "all", label: "All" },
          { id: "mobile", label: "Mobile" },
        ]}
      />,
    );
    expect(chips).toContain('role="group"');
    expect(chips).toContain('aria-label="Filter by family"');
    expect(chips.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(chips.match(/aria-pressed="false"/g)).toHaveLength(1);
  });

  it("says as much as the moment needs in a part callout", () => {
    const part = {
      number: 4,
      label: "Order domain",
      role: "CORE",
      description: "Business rules.",
    } as const;
    expect(html(<PartCallout {...part} detail="name" />)).not.toContain("Business rules.");
    const full = html(<PartCallout {...part} detail="full" />);
    expect(full).toContain("CORE");
    expect(full).toContain("Business rules.");
  });

  it("lists the flow colours under a name", () => {
    const legend = html(
      <FlowLegend
        items={[
          { flow: "request", label: "Request" },
          { flow: "error", label: "Error" },
        ]}
        hint="Click a part"
      />,
    );
    expect(legend).toContain('aria-label="Flow colours"');
    expect(legend.match(/<li/g)).toHaveLength(2);
    expect(legend).toContain("Click a part");
  });

  it("marks the last breadcrumb item as the current page", () => {
    const crumbs = html(
      <Breadcrumb items={[{ label: "Nightprint", href: "/" }, { label: "MCH-001" }]} />,
    );
    expect(crumbs).toContain('aria-current="page"');
    expect(crumbs).toContain('href="/"');
  });
});

describe("organisms", () => {
  it("counts its parts and shows the inspected one", () => {
    const bop = html(
      <BillOfParts
        selectedId="pg"
        items={[{ id: "pg", number: 7, label: "Postgres adapter", flow: null, violation: false }]}
        inspected={{ label: "Postgres adapter", description: "Implements OrderRepository." }}
      />,
    );
    expect(bop).toMatch(/Bill of parts · (<!-- -->)?1</);
    expect(bop).toContain("Implements OrderRepository.");
    expect(bop).toContain('aria-pressed="true"');
  });

  it("explains the bill of parts and keeps a hovered row distinct from a pressed one", () => {
    const bop = html(
      <BillOfParts
        selectedId={null}
        hoveredId="pg"
        description="Point at a row to find its part."
        items={[{ id: "pg", number: 7, label: "Postgres adapter", flow: null, violation: false }]}
      />,
    );
    expect(bop).toContain("Point at a row to find its part.");
    expect(bop).toContain('aria-pressed="false"');
  });

  it("offers a choice of scenario only when there is one to make", () => {
    const one = [{ id: "a", label: "Place an order" }];
    expect(html(<ScenarioPicker scenarios={one} value="a" />)).toBe("");
    const two = html(
      <ScenarioPicker scenarios={[...one, { id: "b", label: "Reject" }]} value="b" />,
    );
    expect(two).toContain('<h2 id="scenario"');
    expect(two.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("renders nothing for a machine without actions", () => {
    expect(html(<WhatIfPanel actions={[]} />)).toBe("");
  });

  it("names the home navigation and links each section", () => {
    const header = html(
      <HomeHeader
        homeHref="#top"
        links={[
          { label: "Machines", href: "#machines" },
          { label: "Build log", href: "#build-log" },
        ]}
      />,
    );
    expect(header).toMatch(/<nav aria-label="Main"[ >]/);
    expect(header).toContain('href="#top"');
    expect(header).toContain('href="#machines"');
    expect(header.match(/<li[ >]/g)).toHaveLength(2);
  });

  it("gives the hero the page's only h1", () => {
    const intro = html(
      <HomeIntro
        status="MCH-001 is running"
        title="Machines you can run."
        lead="Lead."
        primaryAction={{ label: "Run", href: "/m/x/" }}
        facts={[{ term: "Live", value: "1 machine" }]}
      />,
    );
    expect(intro.match(/<h1/g)).toHaveLength(1);
    expect(intro).toContain("<dt");
  });

  it("labels each home section by its own h2", () => {
    const catalogue = html(
      <MachineCatalogue
        eyebrow="The catalogue"
        title="Eight machines."
        lead="Lead."
        machines={[{ code: "MCH-002", title: "Event loop", family: "frontend" }]}
        filters={[{ id: "all", label: "All" }]}
        filter="all"
      />,
    );
    expect(catalogue).toContain('aria-labelledby="catalogue-title"');
    expect(catalogue).toContain('<h2 id="catalogue-title"');
    expect(catalogue).toContain('aria-label="Filter by family"');
  });

  it("pairs each what-if switch with the log it changes", () => {
    const showcase = html(
      <WhatIfShowcase
        eyebrow="What if…"
        title="Swap Postgres."
        lead={["Flip the switch."]}
        cases={[
          {
            id: "swap",
            caption: "Step 5 / 7 · InMemory answers",
            label: "Swap Postgres for InMemory",
            description: "d",
            tone: "safe",
            on: true,
            log: [{ key: "a", time: "0.08 ms", flow: "write", tag: "WRITE", text: "map.set" }],
          },
        ]}
      />,
    );
    expect(showcase).toContain('role="switch"');
    expect(showcase).toContain('aria-checked="true"');
    expect(showcase).toContain('aria-live="polite"');
    expect(showcase).toContain("map.set");
  });

  it("holds a machine page's content in its main landmark, between header and footer", () => {
    const page = html(
      <MachineTemplate
        header={<header>h</header>}
        title="Hexagonal architecture"
        summary="s"
        stage={null}
        transport={null}
        aside={null}
        log={null}
        after={<div id="concept" />}
        footer={<footer>f</footer>}
      />,
    );
    expect(page).toMatch(
      /<\/header><main>.*<h1[^>]*>Hexagonal architecture<\/h1>.*id="concept".*<\/main><footer>/s,
    );
  });
});

describe("machine page sections", () => {
  it("sets the key terms beside the article as a definition list", () => {
    const concept = html(
      <ConceptArticle
        title="The core owns its interfaces."
        paragraphs={["First.", "Second."]}
        terms={[{ term: "Port", definition: "An interface.", numbers: [3, 5] }]}
        sources={[{ label: "A. Cockburn, 2005", url: "https://example.org/" }]}
      />,
    );
    expect(concept).toContain('<h2 id="concept-title"');
    expect(concept).toContain('aria-labelledby="concept-title"');
    expect(concept).toMatch(/<dl[^>]*>.*<dt.*Port.*<\/dt><dd[^>]*>An interface\.<\/dd>/s);
    expect(concept).toContain('href="https://example.org/"');
  });

  it("sets the article apart as an article, dated by its revision", () => {
    const concept = html(
      <ConceptArticle
        title="The core owns its interfaces."
        paragraphs={["First."]}
        terms={[]}
        sources={[{ label: "A. Cockburn, 2005", url: "https://example.org/" }]}
        revision={{ label: "Rev A", date: "2026-10-12", display: "12 Oct 2026" }}
      />,
    );
    expect(concept).toMatch(/^<article aria-labelledby="concept-title"/);
    expect(concept).toContain('<time dateTime="2026-10-12"');
    expect(concept).toContain("REV A");
  });

  it("writes out the whole run: every scenario, every step, and what a switch plays instead", () => {
    const run = html(
      <RunTranscript
        eyebrow="The run"
        title="Step by step."
        scenarios={[
          {
            id: "place-order",
            title: "Place an order",
            steps: [
              {
                number: 1,
                title: "A request arrives",
                body: "POST /orders.",
                flow: "request",
                variants: [],
              },
              {
                number: 2,
                title: "Postgres answers",
                body: "INSERT.",
                flow: "write",
                variants: [
                  {
                    key: "memory",
                    when: "Swap storage",
                    title: "InMemory answers",
                    body: "A Map.",
                    flow: "write",
                  },
                ],
              },
            ],
          },
          {
            id: "reject",
            title: "Reject an order",
            steps: [{ number: 1, title: "Refused", body: "No.", flow: "error", variants: [] }],
          },
        ]}
      />,
    );
    // Closed scenarios are still in the page: only the first one opens.
    expect(run.match(/<details/g)).toHaveLength(2);
    expect(run.match(/<details[^>]* open=""/g)).toHaveLength(1);
    expect(run).toMatch(/<summary[^>]*><h3[^>]*>Place an order<\/h3>/);
    expect(run.match(/<ol[^>]*>/g)).toHaveLength(2);
    expect(run).toContain("What if · Swap storage");
    expect(run).toContain("InMemory answers");
    expect(run).toContain("Refused");
  });

  it("ends a machine page on what comes next, with a way back to the catalogue", () => {
    const next = html(
      <UpNext
        eyebrow="On the drawing board"
        title="One new machine a week."
        machines={[{ code: "MCH-002", title: "Event loop", family: "frontend" }]}
        action={{ label: "See the catalogue", href: "/#machines" }}
      />,
    );
    expect(next).toContain('href="/#machines"');
    expect(next.match(/<li/g)).toHaveLength(1);
  });

  it("shows the logo mark in the machine page header, out of the accessibility tree", () => {
    const header = html(
      <SiteHeader breadcrumb={[{ label: "Nightprint", href: "/" }, { label: "MCH-001" }]} />,
    );
    expect(header).toContain("<svg");
    expect(header).toContain('aria-current="page"');
  });
});

describe("end of a scenario", () => {
  const steps = [
    { id: "a", title: "A", flow: "request" },
    { id: "b", title: "B", flow: "response" },
  ] as const;
  const transport = (ending: Parameters<typeof Transport>[0]["ending"]) =>
    html(
      <Transport
        scenario="Place an order"
        steps={steps}
        current={1}
        caption={{ title: "B", body: "b.", flow: "response" }}
        playing={false}
        finished={ending !== null}
        ending={ending}
      />,
    );

  it("says the scenario is over, what came out, and offers what to try next", () => {
    const end = transport({
      count: 2,
      title: "Done in 184.34 ms",
      result: "201 Created",
      suggestions: [{ id: "action:swap", label: "Swap Postgres for InMemory" }],
    });
    expect(end).toContain("Done in 184.34 ms");
    expect(end).toContain('aria-live="polite"');
    expect(end).toMatch(/<button[^>]*>Swap Postgres for InMemory<\/button>/);
    expect(end).not.toContain('aria-current="step"');
  });

  it("keeps the step bars while the scenario runs", () => {
    expect(transport(null)).toContain('aria-current="step"');
  });
});

describe("templates", () => {
  it("frames a machine as a figure, its zone numbers hidden from screen readers", () => {
    const figure = html(<MachineFigure stage={<canvas />} transport={<section />} />);
    expect(figure).toMatch(/^<figure/);
    expect(figure).toContain('aria-hidden="true"');
  });
});

describe("home page story", () => {
  it("titles each step under the story's heading and keeps its log as a list", () => {
    const note = html(
      <StoryNote
        id="step-rules"
        eyebrow="Step 4 / 8"
        title="The core applies the rules"
        body="Pure business logic."
        flow="request"
        parts={[4]}
        log={[{ key: "r", time: "0.06 ms", flow: "request", tag: "RULE", text: "lines > 0 OK" }]}
        active
      />,
    );
    expect(note).toMatch(/^<div id="step-rules"/);
    expect(note).toMatch(/<h3[^>]*>The core applies the rules<\/h3>/);
    expect(note).toMatch(/<ol[^>]*><li[^>]*>.*lines &gt; 0 OK.*<\/li><\/ol>/s);
  });

  it("draws the run's zones on the sheet for the eye only", () => {
    const sheet = html(
      <DrawingSheet
        stage={null}
        steps={[
          { key: "a", flow: "request" },
          { key: "b", flow: "write" },
          { key: "c", flow: "response" },
        ]}
        current={1}
      />,
    );
    expect(sheet).toMatch(/<div aria-hidden="true"[^>]*><ol/);
    expect(sheet.match(/<li/g)).toHaveLength(3);
  });

  it("reads the steps as an ordered list and numbers every beat in order", () => {
    const story = html(
      <StoryTemplate
        id="run"
        label="MCH-001, step by step"
        sheet={null}
        before={[
          { key: "opening", size: "opening", content: <h1>Title</h1> },
          { key: "intro", size: "intro", content: <h2>Hexagonal, step by step</h2> },
        ]}
        steps={[
          { key: "one", content: <h3>One</h3> },
          { key: "two", content: <h3>Two</h3> },
        ]}
        after={[{ key: "closing", content: <p>End</p> }]}
      />,
    );
    expect(story).toMatch(/^<section id="run" aria-label="MCH-001, step by step"/);
    expect(story).toMatch(/<ol[^>]*><li data-beat="2"[^>]*><h3>One<\/h3><\/li><li data-beat="3"/);
    expect(story).toContain('data-beat="4"');
  });
});

describe("drawing set", () => {
  it("keeps the register a table, issued sheets linked and drafts not", () => {
    const register = html(
      <DrawingRegister
        eyebrow="Drawing register"
        title="Eight machines."
        lead="One a week."
        rows={[
          {
            code: "MCH-001",
            title: "Hexagonal",
            family: "Backend",
            status: "issued",
            revision: "A",
            href: "/m/hex/",
          },
          { code: "MCH-002", title: "Event loop", family: "Frontend", status: "draft" },
        ]}
        filters={[{ id: "all", label: "All" }]}
        filter="all"
        selected="MCH-001"
        preview={null}
      />,
    );
    expect(register).toContain("<caption");
    expect(register.match(/<th scope="col"/g)).toHaveLength(5);
    expect(register).toContain('href="/m/hex/"');
    expect(register.match(/<a /g)).toHaveLength(1);
    expect(register).toContain("In draft");
  });

  it("stamps a draft sheet and gives an issued one its drawing and action", () => {
    const draft = html(
      <SheetPreview code="MCH-002" title="Event loop" status="draft" facts={[]} />,
    );
    expect(draft).toContain("Not for construction");
    const issued = html(
      <SheetPreview
        code="MCH-001"
        title="Hexagonal"
        status="issued"
        drawing={<svg aria-label="plan" />}
        facts={[{ term: "Rev", value: "A" }]}
        action={{ label: "Run MCH-001", href: "/m/hex/" }}
      />,
    );
    expect(issued).not.toContain("Not for construction");
    expect(issued).toContain('aria-label="plan"');
    expect(issued).toContain('href="/m/hex/"');
  });

  it("says each annotation in words, draws its leader line for the eye only, numbers the notes", () => {
    const legend = html(
      <DrawingLegend
        eyebrow="Legend"
        title="Read one."
        lead="Same symbols."
        drawing={<svg role="img" aria-label="plan" />}
        box={{ x: 0, y: 0, width: 10, height: 6 }}
        callouts={[
          {
            key: "balloon",
            tag: "A",
            term: "Balloon",
            meaning: "A part's number.",
            target: { x: 1, y: 1 },
            anchor: { x: 1, y: 0.3 },
          },
        ]}
        notes={["Latencies are modelled.", "Vermillon marks errors."]}
      />,
    );
    expect(legend).toMatch(/<p[^>]*>Balloon<\/p><p[^>]*>A part&#x27;s number\.<\/p>/);
    expect(legend).toMatch(/<svg aria-hidden="true" viewBox="0 0 10 6"/);
    expect(legend).toContain('aria-label="plan"');
    expect(legend).toMatch(/<ol class="mt-4[^>]*>(<li.*?<\/li>){2}<\/ol>/s);
  });

  it("draws a plan view as one labelled image, lit pipes in their flow colour", () => {
    const plan = html(
      <PlanView
        label="Hexagonal architecture, seen from above"
        box={{ x: 0, y: 0, width: 10, height: 5 }}
        zones={[]}
        parts={[{ id: "a", shape: "circle", cx: 1, cy: 1, r: 0.5, glass: false }]}
        routes={[{ id: "r", points: "0,0 1,1", kind: "pipe", flow: "write" }]}
      />,
    );
    expect(plan).toMatch(/^<svg role="img" aria-label="Hexagonal architecture, seen from above"/);
    expect(plan).toContain('stroke="#7BE38A"');
  });
});

describe("footer", () => {
  it("says the next machine and how far the series has got, in words", () => {
    const footer = html(
      <SiteFooter
        title="Nightprint"
        tagline="Drawn as machines."
        series={{
          sheets: [
            { code: "MCH-001", title: "Hexagonal", live: true },
            { code: "MCH-002", title: "Event loop", live: false },
          ],
          next: { code: "MCH-002", title: "Event loop", live: false },
          follow: { label: "Follow on X", href: "https://example.org/x" },
        }}
        links={[{ label: "Machines", href: "/#machines" }]}
        credit={{ name: "Ewen", href: "https://example.org/ewen", year: "2026" }}
      />,
    );
    expect(footer).toMatch(/^<footer/);
    expect(footer).toContain("Event loop, to come");
    expect(footer).toContain("1 of 2 live");
    expect(footer).toContain('<nav aria-label="Footer">');
    expect(footer).toMatch(/Made by <a href="https:\/\/example.org\/ewen"[^>]*>Ewen<\/a> · 2026/);
  });
});
