import { ButtonLink, MonoLabel, PageSection, SiteFooter, SiteHeader } from "@nightprint/ui";
import type { Metadata } from "next";
import { siteFooter } from "../components/site-footer-content";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Any address the export has no page for: the static server sends it with a 404. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader breadcrumb={[{ label: "Nightprint", href: "/" }, { label: "404" }]} />
      <main className="flex-1">
        <PageSection id="not-found">
          <div className="flex max-w-155 flex-col gap-6">
            {/* The page's own h1: SectionHeading is a section's h2. */}
            <div className="flex flex-col gap-3">
              <MonoLabel>404 · Not found</MonoLabel>
              <h1 className="text-title">No drawing under this number.</h1>
              <p className="text-body text-text-muted">
                This address is not in the register: the page may have moved, or it was never
                issued.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/">Back to the start</ButtonLink>
              <ButtonLink href="/#machines" variant="secondary">
                See the catalogue
              </ButtonLink>
            </div>
          </div>
        </PageSection>
      </main>
      <SiteFooter {...siteFooter} />
    </div>
  );
}
