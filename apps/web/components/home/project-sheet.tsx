"use client";

import {
  Cartouche,
  DrawingSheet,
  NavLink,
  PlanView,
  RepoForm,
  SectionHeading,
} from "@nightprint/ui";
import { useMemo, useState } from "react";
import { requestDrawing } from "../draw-request";
import { cartoucheProps } from "../machine-view-model";
import { planView } from "../plan-view-model";
import { machinePath } from "../seo";
import { machineBySlug } from "./machine-by-slug";

export interface ProjectSheetProps {
  /** The real project on the sheet. */
  readonly slug: string;
}

/**
 * The home page's real projects, short: the import page's drawing sheet with a real
 * project on it, seen from above, and the form that draws the visitor's repository next.
 */
export function ProjectSheet({ slug }: ProjectSheetProps) {
  const machine = useMemo(() => machineBySlug(slug), [slug]);
  const plan = useMemo(() => planView(machine), [machine]);
  const [repo, setRepo] = useState("");
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="projects-title"
          eyebrow="Real projects"
          title="Real repositories, drawn from their code."
          lead={[
            `The same drawing, made from a real repository: its packages become parts, and every route between two of them stands on an import the code has. Here is ${machine.title}'s own, ${machine.code}, read against its code before it was published.`,
            "Paste a public JavaScript or TypeScript repository: yours is drawn in about two minutes, with a link you can share.",
          ]}
        />
        <RepoForm
          id="repo-home"
          value={repo}
          onChange={setRepo}
          onSubmit={() => window.location.assign(requestDrawing(repo.trim()))}
          label="GitHub repository"
          placeholder="owner/name"
          action="Draw it"
        />
      </div>
      <figure className="m-0 flex flex-col gap-3">
        <div className="relative aspect-[4/3] w-full lg:aspect-[16/11]">
          <DrawingSheet
            stage={
              <div className="absolute inset-0 flex items-center justify-center p-6 sm:px-10 lg:px-12 lg:pt-10 lg:pb-40">
                <PlanView
                  {...plan}
                  label={`${machine.code} ${machine.title}, drawn from its code and seen from above`}
                  flowing
                  className="size-full"
                />
              </div>
            }
            cartouche={<Cartouche {...cartoucheProps(machine)} />}
          />
        </div>
        <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="mono-label text-text-faint">{`${machine.code} · ${machine.title} · seen from above`}</span>
          <NavLink href={machinePath(machine)}>{`Run ${machine.code}`}</NavLink>
        </figcaption>
      </figure>
    </div>
  );
}
