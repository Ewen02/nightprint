import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Balloon } from "./atoms/balloon";
import { ButtonLink } from "./atoms/button-link";
import { IconButton } from "./atoms/icon-button";
import { LogoMark } from "./atoms/logo-mark";
import { TextField } from "./atoms/text-field";
import { TokenTag } from "./atoms/token-tag";
import { Breadcrumb } from "./molecules/breadcrumb";
import { DrawingNotes } from "./molecules/drawing-notes";
import { FileGrid } from "./molecules/file-grid";
import { FilmPreview } from "./molecules/film-preview";
import { FilterChips } from "./molecules/filter-chips";
import { FlowLegend } from "./molecules/flow-legend";
import { LogLine } from "./molecules/log-line";
import { MachineCard } from "./molecules/machine-card";
import { PartCallout } from "./molecules/part-callout";
import { PlanView } from "./molecules/plan-view";
import { RepoForm } from "./molecules/repo-form";
import { SheetPreview } from "./molecules/sheet-preview";
import { StageAction } from "./molecules/stage-action";
import { StepDots } from "./molecules/step-dots";
import { StepRuler } from "./molecules/step-ruler";
import { SurveySketch } from "./molecules/survey-sketch";
import { WhatIfSwitch } from "./molecules/what-if-switch";
import { BillOfParts } from "./organisms/bill-of-parts";
import { BuildLog } from "./organisms/build-log";
import { Cartouche } from "./organisms/cartouche";
import { CodeListing } from "./organisms/code-listing";
import { ConceptArticle } from "./organisms/concept-article";
import { DrawingLegend } from "./organisms/drawing-legend";
import { DrawingRegister } from "./organisms/drawing-register";
import { DrawingStages } from "./organisms/drawing-stages";
import { FieldNotes } from "./organisms/field-notes";
import { HomeHeader } from "./organisms/home-header";
import { HomeIntro } from "./organisms/home-intro";
import { ImportPanel } from "./organisms/import-panel";
import { NextSheet } from "./organisms/next-sheet";
import { RunTranscript } from "./organisms/run-transcript";
import { ScenarioPicker } from "./organisms/scenario-picker";
import { SiteFooter } from "./organisms/site-footer";
import { SiteHeader } from "./organisms/site-header";
import { StoryNote } from "./organisms/story-note";
import { Transport } from "./organisms/transport";
import { UpNext } from "./organisms/up-next";
import { WhatIfPanel } from "./organisms/what-if-panel";
import { MachineTemplate } from "./templates/machine-template";
import { SheetHero } from "./templates/sheet-hero";
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

  it("reads out what a stage action shows, from a live region there before it changes", () => {
    const idle = html(<StageAction label="Unplug the adapters" onClick={() => {}} />);
    expect(idle).toContain("<button");
    expect(idle).toContain('role="status"');
    const done = html(
      <StageAction label="Plug them back" note="The core stands alone." onClick={() => {}} />,
    );
    expect(done).toContain("The core stands alone.");
  });

  it("draws a navigating action as a link, not a button", () => {
    const link = html(<ButtonLink href="/m/x/">Run MCH-001</ButtonLink>);
    expect(link).toMatch(/^<a [^>]*href="\/m\/x\/"/);
    expect(link).not.toContain("<button");
  });

  it("writes a token's name in its flow colour, out of the accessibility tree", () => {
    const tag = html(<TokenTag label="B" flow="request" />);
    expect(tag).toContain('aria-hidden="true"');
    expect(tag).toContain(">B<");
  });

  it("keeps the logo mark out of the accessibility tree", () => {
    expect(html(<LogoMark />)).toContain('aria-hidden="true"');
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
        latency="Modelled, not measured"
        hint="Click a part"
      />,
    );
    expect(legend).toContain('aria-label="Flow colours"');
    expect(legend.match(/<li/g)).toHaveLength(3);
    expect(legend).toContain("Modelled, not measured");
    expect(legend).toContain("Click a part");
  });

  it("numbers a drawing's notes as a list, the numbers drawn out of the accessibility tree", () => {
    const notes = html(
      <DrawingNotes heading="Notes" notes={["Public repositories.", "Static imports only."]} />,
    );
    expect(notes).toMatch(/<h3[^>]*>Notes<\/h3><ol>(<li.*?<\/li>){2}<\/ol>/s);
    expect(notes).toContain(
      '<span aria-hidden="true" class="font-mono text-log text-text-faint">1.</span>',
    );
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
      />,
    );
    expect(intro.match(/<h1/g)).toHaveLength(1);
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

  it("lists the program with its running line, and what it printed so far", () => {
    const listing = html(
      <CodeListing
        lines={['console.log("A");', "setTimeout(b, 0);"]}
        current={2}
        flow="request"
        output={["A"]}
      />,
    );
    expect(listing).toContain('aria-label="Program"');
    expect(listing.match(/<li/g)).toHaveLength(2);
    expect(listing.match(/aria-current="step"/g)).toHaveLength(1);
    expect(listing).toMatch(/<output[^>]*><span>A<\/span><\/output>/);
    expect(html(<CodeListing lines={["x();"]} output={[]} />)).not.toContain("aria-current");
    // A program that never prints has no console.
    expect(html(<CodeListing lines={["x();"]} />)).not.toContain("<output");
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
                href: "?step=1",
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
                    href: "?with=swap&step=2",
                  },
                  {
                    key: "check",
                    when: "Swap storage",
                    title: "The map is checked",
                    body: "Once more.",
                    flow: "write",
                    adds: true,
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
        play="Play"
      />,
    );
    // Closed scenarios are still in the page: only the first one opens.
    expect(run.match(/<details/g)).toHaveLength(2);
    expect(run.match(/<details[^>]* open=""/g)).toHaveLength(1);
    expect(run).toMatch(/<summary[^>]*><h3[^>]*>Place an order<\/h3>/);
    expect(run.match(/<ol[^>]*>/g)).toHaveLength(2);
    expect(run).toContain("Swap storage");
    // A variant that adds a step says so: it does not stand in for this one.
    expect(run.match(/adds a step after it/g)).toHaveLength(1);
    expect(run).toContain("InMemory answers");
    expect(run).toContain("Refused");
    // Each link to the stage names its step: the visible words are the same on every one.
    expect(run).toContain('aria-label="Play step 1, A request arrives"');
    expect(run).toContain('aria-label="Play step 2 with Swap storage, InMemory answers"');
    // Only where a step has somewhere to play.
    expect(run.match(/<a /g)).toHaveLength(2);
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

describe("video of a machine", () => {
  const transport = (filming: boolean) =>
    html(
      <Transport
        scenario="Place an order"
        steps={[{ id: "a", title: "A", flow: "request" }]}
        current={0}
        caption={{ title: "A", body: "a.", flow: "request" }}
        playing={false}
        finished={false}
        film={{
          label: filming ? "Cancel · 42 %" : "Download video",
          status: filming ? "Filming the video. It downloads when it is done." : "",
          filming,
          onFilm: () => undefined,
        }}
      />,
    );

  it("shows the video as it is made: where it stands, and how far, as a progress bar", () => {
    const filming = html(
      <FilmPreview
        state={{ kind: "filming", percent: 41.6, step: "STEP 3 / 8" }}
        frame={<canvas />}
      />,
    );
    expect(filming).toContain('role="progressbar"');
    expect(filming).toContain('aria-valuenow="42"');
    expect(filming).toContain("STEP 3 / 8 · 42 %");
    const saved = html(
      <FilmPreview state={{ kind: "saved", file: "mch-001-hexagonal.mp4" }} frame={null} />,
    );
    expect(saved).toContain("SAVED");
    expect(saved).toContain("mch-001-hexagonal.mp4");
    expect(saved).toContain('aria-valuenow="100"');
  });

  it("offers the video as a button, pressed while it is filmed, and says so out loud", () => {
    expect(transport(false)).toMatch(
      /<button[^>]*aria-pressed="false"[^>]*>Download video<\/button>/,
    );
    const filming = transport(true);
    expect(filming).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Cancel · 42 %<\/button>/);
    expect(filming).toMatch(
      /aria-live="polite"[^>]*>Filming the video\. It downloads when it is done\./,
    );
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

  it("rules the run's zones for the eye only, on an opaque ground", () => {
    const ruler = html(
      <StepRuler
        steps={[
          { key: "a", flow: "request" },
          { key: "b", flow: "write" },
          { key: "c", flow: "response" },
        ]}
        current={1}
      />,
    );
    expect(ruler).toMatch(/^<ol aria-hidden="true" class="[^"]*\bbg-bg\b/);
    expect(ruler.match(/<li/g)).toHaveLength(3);
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
        groups={[
          {
            id: "series-mch",
            code: "MCH",
            label: "Machines",
            rule: "One concept",
            rows: [
              {
                code: "MCH-001",
                title: "Hexagonal",
                family: "Backend",
                status: "issued",
                revision: "A",
                href: "/m/hex/",
              },
              { code: "MCH-002", title: "Event loop", family: "Frontend", status: "draft" },
            ],
          },
          {
            id: "series-fmd",
            code: "FMD",
            label: "Failure modes",
            rule: "Replayed, then repaired",
            rows: [{ code: "FMD-001", title: "Retry storm", family: "Infra", status: "issued" }],
          },
        ]}
        filters={[{ id: "all", label: "All" }]}
        filter="all"
        selected="MCH-001"
        preview={null}
      />,
    );
    expect(register).toContain("<caption");
    expect(register.match(/<th scope="col"/g)).toHaveLength(5);
    // One row group per series, named by a header the links of its sheets' pages point at.
    expect(register.match(/<tbody /g)).toHaveLength(2);
    expect(register).toContain('id="series-fmd"');
    expect(register.match(/<th scope="rowgroup"/g)).toHaveLength(2);
    expect(register).toContain("FMD · Failure modes");
    expect(register).toContain('href="/m/hex/"');
    expect(register.match(/<a /g)).toHaveLength(1);
    expect(register).toContain("In draft");
    // A draft has no page: its title is a button that pulls its sheet.
    expect(register).toMatch(
      /<button type="button" aria-expanded="false"[^>]*>Event loop<\/button>/,
    );
  });

  it("opens the selected sheet beside the register, and under its row on narrow screens", () => {
    const register = html(
      <DrawingRegister
        eyebrow="Drawing register"
        title="Eight machines."
        lead="One a week."
        groups={[
          {
            id: "series-mch",
            code: "MCH",
            label: "Machines",
            rule: "One concept",
            rows: [{ code: "MCH-002", title: "Event loop", family: "Frontend", status: "draft" }],
          },
        ]}
        filters={[{ id: "all", label: "All" }]}
        filter="all"
        selected="MCH-002"
        preview={<p>Sheet MCH-002</p>}
      />,
    );
    expect(register).toContain('aria-expanded="true"');
    expect(register.match(/Sheet MCH-002/g)).toHaveLength(2);
    expect(register).toMatch(/<tr class="lg:hidden"><td colSpan="5"/);
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
    // The title has a row of its own, above the facts: a long source cannot squeeze it.
    expect(issued).toMatch(/<figcaption[^>]*><p[^>]*>Hexagonal<\/p><dl/);
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

  it("draws a round zone as the circle inside its box", () => {
    const plan = html(
      <PlanView
        label="A hub"
        box={{ x: 0, y: 0, width: 10, height: 10 }}
        zones={[{ id: "ring", label: "Ring", x: 1, y: 1, width: 8, height: 8, shape: "round" }]}
        parts={[]}
        routes={[]}
      />,
    );
    expect(plan).toMatch(/<circle cx="5" cy="5" r="4" fill="none"/);
  });

  it("draws what a what-if switch breaks in vermillon, whatever flow travels it", () => {
    const plan = html(
      <PlanView
        label="Nightprint, the UI kit importing the engine"
        box={{ x: 0, y: 0, width: 10, height: 5 }}
        zones={[]}
        parts={[
          { id: "ui", shape: "circle", cx: 1, cy: 1, r: 0.5, glass: false, flag: "violation" },
        ]}
        routes={[
          { id: "v", points: "0,0 1,1", kind: "pipe", flow: "write", flag: "violation" },
          { id: "w", points: "0,1 1,2", kind: "pipe", flow: "write" },
        ]}
      />,
    );
    // The vermillon of the error flow, on the part and on its route; the other route keeps its flow.
    expect(plan.match(/stroke="#FF5A36"/g)).toHaveLength(2);
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

describe("log lines", () => {
  it("wraps a long call between its names, never inside a decimal", () => {
    const line = html(
      <LogLine
        time="4.27 ms"
        flow="request"
        tag="REQ"
        text="PaymentGateway.charge(49.00 EUR) → PaymentProviderAdapter"
      />,
    );
    expect(line).toContain("PaymentGateway.<wbr/>charge(49.00 EUR) →<wbr/>");
    expect(line).not.toContain("49.<wbr/>");
  });
});

describe("build log", () => {
  it("links its full history under the table when it has one", () => {
    const log = html(
      <BuildLog
        eyebrow="Build log"
        title="Built in public."
        lead="As it happens."
        entries={[{ key: "a", date: "12 OCT", flow: "write", tag: "FIX", text: "A fix." }]}
        history={{ label: "Full history on GitHub", href: "https://example.org/commits" }}
      />,
    );
    expect(log).toMatch(
      /<\/table><a href="https:\/\/example.org\/commits"[^>]*>Full history on GitHub/,
    );
  });
});

describe("import", () => {
  const form = {
    value: "",
    onChange: () => {},
    onSubmit: () => {},
    label: "GitHub repository",
    placeholder: "owner/name",
    action: "Draw it",
  };

  it("names its field by its label, and points it at what reports on it", () => {
    const field = html(
      <TextField
        id="repo"
        label="GitHub repository"
        value=""
        onChange={() => {}}
        describedBy="s"
      />,
    );
    expect(field).toMatch(/<label for="repo"[^>]*>GitHub repository<\/label>/);
    expect(field).toMatch(/<input id="repo"[^>]*aria-describedby="s"/);
  });

  it("submits a repository, and only once one is typed", () => {
    expect(html(<RepoForm {...form} />)).toMatch(/<button type="submit"[^>]*disabled=""/);
    expect(html(<RepoForm {...form} value="acme/shop" />)).not.toMatch(/disabled=""/);
    expect(html(<RepoForm {...form} value="acme/shop" busy />)).toMatch(/disabled=""/);
  });

  it("gives a second form on the page its own field", () => {
    const second = html(<RepoForm {...form} id="repo-next" />);
    expect(second).toMatch(/<label for="repo-next"/);
    expect(second).toMatch(/<input id="repo-next"/);
  });

  it("reads a sheet hero's intro before its sheet", () => {
    const hero = html(
      <SheetHero
        label="Draw a repository"
        intro={<h1>Draw your repository.</h1>}
        sheet={<div>sheet</div>}
        caption={<p>Step 2 / 7</p>}
      />,
    );
    expect(hero).toMatch(/^<section aria-label="Draw a repository"/);
    expect(hero.indexOf("<h1>")).toBeLessThan(hero.indexOf("sheet</div>"));
    expect(hero).toContain("Step 2 / 7");
  });

  it("offers the stages of a drawing as tabs, the first one shown", () => {
    const stages = html(
      <DrawingStages
        label="Stages of a drawing"
        stages={[
          {
            key: "read",
            label: "Read",
            count: "176 files",
            title: "Every file.",
            body: "Read.",
            figure: <p>grid</p>,
          },
          {
            key: "survey",
            label: "Survey",
            count: "18 units",
            title: "The imports.",
            body: "Found.",
            figure: <p>sketch</p>,
          },
        ]}
      />,
    );
    expect(stages).toMatch(/<div role="tablist" aria-label="Stages of a drawing"/);
    expect(stages.match(/role="tab"/g)).toHaveLength(2);
    expect(stages.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(stages).toMatch(/role="tabpanel" id="([^"]+)-panel" aria-labelledby="\1-tab-0"/);
    expect(stages).toContain('<h3 class="text-title">Every file.</h3>');
    expect(stages).not.toContain("The imports.");
  });

  it("letters the next sheet's title as it is typed, the placeholder until then", () => {
    const sheet = (title: string) =>
      html(
        <NextSheet
          heading="Next on the board"
          title={title}
          placeholder="owner/name"
          cells={[
            { term: "Code", value: "PRJ-000" },
            { term: "Checked", value: "Not yet" },
          ]}
        />,
      );
    expect(sheet("")).toContain(">owner/name</p>");
    expect(sheet("ab").match(/<span[^>]*>[ab]<\/span>/g)).toHaveLength(2);
    expect(sheet("ab")).toMatch(/<dl[^>]*><div[^>]*><dt[^>]*>Code<\/dt><dd[^>]*>PRJ-000<\/dd>/);
  });

  it("reads out why the drawing failed", () => {
    const panel = html(
      <ImportPanel
        eyebrow="Import"
        title="Draw a repository."
        lead={[]}
        form={form}
        error="No public repository acme/missing."
      />,
    );
    expect(panel).toMatch(/<input id="repo"[^>]*aria-describedby="import-status"/);
    expect(panel).toMatch(/<div id="import-status" role="status" aria-live="polite"/);
    expect(panel).toContain("No public repository acme/missing.");
  });
});

describe("survey", () => {
  it("keeps its notes in a log, so new ones are read out as they come", () => {
    const notes = html(
      <FieldNotes
        title="Field notes"
        clock="01:07"
        notes={[
          { key: "a", time: "00:00", text: "Asked GitHub for acme/shop.", tone: "request" },
          {
            key: "b",
            time: "00:41",
            text: "Part: Web app.",
            tone: "write",
            details: ["web, web/app"],
          },
        ]}
      />,
    );
    expect(notes).toMatch(/<ol role="log" aria-live="polite" aria-relevant="additions"/);
    expect(notes).toContain("Part: Web app.");
    expect(notes).toContain("web, web/app");
  });

  it("names what the sketch and the file grid show, for whoever cannot see them", () => {
    const sketch = html(
      <SurveySketch
        width={400}
        height={200}
        boxes={[
          {
            id: "web",
            x: 10,
            y: 10,
            width: 150,
            height: 26,
            label: "web",
            part: "Web app",
            state: "latest",
            delay: 0,
          },
        ]}
        lines={[]}
        sweeping={false}
        closing={false}
        label="Sketch of acme/shop: 1 unit."
      />,
    );
    expect(sketch).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Sketch of acme\/shop: 1 unit."/);
    // A grouped unit shows its part's name, and keeps its own path as a tooltip.
    expect(sketch).toContain("<title>web</title>");
    expect(sketch).toContain("Web app");
    const grid = html(<FileGrid total={10} done={4} label="4 of 10 files read." />);
    expect(grid).toMatch(/role="img" aria-label="4 of 10 files read."/);
    expect(grid.match(/<rect/g)).toHaveLength(10);
  });
});

describe("title block", () => {
  it("names the sheet's series when it has one", () => {
    const props = { title: "Retry storm", code: "FMD-001", scale: "NTS", revision: "A" };
    expect(html(<Cartouche {...props} series="Failure mode" />)).toContain(
      '<dt class="text-text-faint">SERIES</dt><dd>Failure mode</dd>',
    );
    expect(html(<Cartouche {...props} />)).not.toContain("SERIES");
  });
});
