import type { RepoSnapshot } from "@nightprint/blueprint";
import { surveyRepo } from "@nightprint/blueprint";
import { type Ask, ComposeError, compose, costOf, MODEL } from "./compose";
import type { Report } from "./jobs";
import { type GitHubCommit, SourceError } from "./sources";
import { type Drawing, type DrawingStore, dayOf, type Ledger } from "./store";

export interface DrawDeps {
  readonly read: (commit: GitHubCommit) => Promise<RepoSnapshot>;
  readonly ask: Ask;
  readonly store: DrawingStore;
  readonly ledger: Ledger;
  readonly now?: () => Date;
}

/** An engine id from a repository's name: "Ewen02/nightprint" → "ewen02-nightprint". */
export function slugOf(owner: string, name: string): string {
  const slug = `${owner}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[a-z]/.test(slug) ? slug : `r-${slug}`;
}

/**
 * Draws a repository at one commit, for anyone who asks: reads it, surveys it, has the
 * model plan it, keeps the drawing, and books what the model cost, failed or not.
 * Drawn for a visitor, a machine is not in the register: its code is PRJ-000.
 */
export function drawRepository(deps: DrawDeps) {
  const now = deps.now ?? (() => new Date());
  return async (commit: GitHubCommit, report: Report): Promise<Drawing> => {
    report("reading");
    const snapshot = await deps.read(commit);
    report("surveying");
    const survey = surveyRepo(snapshot);
    if (survey.units.length === 0) {
      throw new SourceError("empty", "No JavaScript or TypeScript code to draw in it.");
    }
    report("drawing", 1);
    const day = dayOf(now());
    let composed: Awaited<ReturnType<typeof compose>>;
    try {
      composed = await compose(
        survey,
        {
          code: "PRJ-000",
          slug: slugOf(commit.owner, commit.name),
          revised: day,
          sourceUrl: `${commit.url}/tree/${commit.sha}`,
        },
        deps.ask,
        (attempt) => report("drawing", attempt + 1),
      );
    } catch (error) {
      if (error instanceof ComposeError && error.usage) {
        await deps.ledger.add(day, costOf(error.usage));
      }
      throw error;
    }
    const cost = costOf(composed.usage);
    await deps.ledger.add(day, cost);
    const drawing: Drawing = {
      repo: `${commit.owner}/${commit.name}`,
      sha: commit.sha,
      drawnAt: now().toISOString(),
      model: MODEL,
      attempts: composed.attempts,
      cost,
      blueprint: composed.blueprint,
      machine: composed.input,
    };
    await deps.store.put(drawing);
    return drawing;
  };
}
