import { getMachine, machines } from "@nightprint/catalog";
import { ConceptArticle, PageSection, RunTranscript, SiteFooter, UpNext } from "@nightprint/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cardsAfter } from "../../../components/catalogue-cards";
import { JsonLd } from "../../../components/json-ld";
import { MachineView } from "../../../components/machine-view";
import {
  conceptRevision,
  glossaryTerms,
  runTranscript,
} from "../../../components/machine-view-model";
import {
  machineDescription,
  machineHeadline,
  machineJsonLd,
  machinePath,
  previewImage,
  socialMetadata,
} from "../../../components/seo";
import { siteFooter } from "../../../components/site-footer-content";

interface MachinePageProps {
  readonly params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return machines.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: MachinePageProps): Promise<Metadata> {
  const machine = getMachine((await params).slug);
  if (!machine) {
    return {};
  }
  // The concept under all its names, not the catalogue code: that is what people search.
  const title = machineHeadline(machine);
  const description = machineDescription(machine);
  return {
    title,
    description,
    alternates: { canonical: machinePath(machine) },
    ...socialMetadata({
      title,
      description,
      path: machinePath(machine),
      image: previewImage(
        machinePath(machine),
        machine.revised,
        `${machine.title}, seen from above, with its title block`,
      ),
      article: { modifiedTime: machine.revised },
    }),
  };
}

export default async function MachinePage({ params }: MachinePageProps) {
  const machine = getMachine((await params).slug);
  if (!machine) {
    notFound();
  }
  return (
    <MachineView
      slug={machine.slug}
      after={
        <>
          <JsonLd data={machineJsonLd(machine)} />
          <PageSection id="concept">
            <ConceptArticle
              title={machine.summary}
              paragraphs={machine.article}
              terms={glossaryTerms(machine)}
              sources={machine.sources}
              revision={conceptRevision(machine)}
            />
          </PageSection>
          {/* The stage plays one step at a time; here is every step, in words. */}
          <PageSection id="run" tone="surface">
            <RunTranscript
              eyebrow="The run, step by step"
              title="Every scenario, in words."
              lead={[
                "What the machine plays, step by step. Beside a step, what a what-if switch plays in its place, or adds right after it.",
              ]}
              scenarios={runTranscript(machine)}
              play="Play"
            />
          </PageSection>
          <PageSection id="next">
            <UpNext
              eyebrow="On the drawing board"
              title="One new machine a week."
              machines={cardsAfter(machine.code, 4)}
              action={{ label: "See the catalogue", href: "/#machines" }}
            />
          </PageSection>
        </>
      }
      footer={<SiteFooter {...siteFooter} />}
    />
  );
}
