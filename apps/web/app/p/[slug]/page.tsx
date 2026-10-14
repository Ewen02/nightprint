import { getMachine, projects } from "@nightprint/catalog";
import { ConceptArticle, PageSection, RunTranscript, SiteFooter } from "@nightprint/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MachineView } from "../../../components/machine-view";
import {
  conceptRevision,
  glossaryTerms,
  runTranscript,
} from "../../../components/machine-view-model";
import { siteFooter } from "../../../components/site-footer-content";

interface ProjectPageProps {
  readonly params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const machine = getMachine((await params).slug);
  if (!machine) {
    return {};
  }
  // A real project's machine is a preview until it is read against its code: kept out of search.
  return {
    title: `${machine.title}, drawn from its code`,
    description: machine.summary,
    robots: { index: false, follow: false },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const machine = getMachine((await params).slug);
  if (!machine) {
    notFound();
  }
  return (
    <MachineView
      machine={machine}
      after={
        <>
          <PageSection id="concept">
            <ConceptArticle
              title={machine.summary}
              paragraphs={machine.article}
              terms={glossaryTerms(machine)}
              sources={machine.sources}
              revision={conceptRevision(machine)}
            />
          </PageSection>
          <PageSection id="run" tone="surface">
            <RunTranscript
              eyebrow="The run, step by step"
              title="Every scenario, in words."
              lead={[
                "What the machine plays, step by step. Every route it travels stands on an import in the code.",
              ]}
              scenarios={runTranscript(machine)}
              play="Play"
            />
          </PageSection>
        </>
      }
      footer={<SiteFooter {...siteFooter} />}
    />
  );
}
