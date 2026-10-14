import { getMachine, projects } from "@nightprint/catalog";
import { ConceptArticle, PageSection, RunTranscript, SiteFooter } from "@nightprint/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

interface ProjectPageProps {
  readonly params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

/** Real projects in the catalogue: read against their code before they were added. */
export function generateStaticParams() {
  return projects.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const machine = getMachine((await params).slug);
  if (!machine) {
    return {};
  }
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
        `${title}, drawn as a machine and seen from above, with its title block`,
      ),
      article: { modifiedTime: machine.revised },
    }),
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
