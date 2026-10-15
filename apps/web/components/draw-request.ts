/**
 * A drawing asked for from another page. The form there leaves the repository in this
 * tab's session storage and opens /import with it in the address; /import starts it once.
 * A shared link carries the address alone, so it only fills the form: a new drawing costs
 * the drafter's time and the site's budget, and is only started by someone who asked.
 */
const KEY = "nightprint:draw";

/** The address of /import for this repository, which will start drawing it on arrival. */
export function requestDrawing(repo: string): string {
  try {
    sessionStorage.setItem(KEY, repo);
  } catch {
    // Storage refused (a private window, blocked site data): the form is filled, not sent.
  }
  return `/import/?repo=${encodeURIComponent(repo)}`;
}

/** The repository a form asked to draw, if any. Reading it clears it: it starts once. */
export function takeDrawingRequest(): string | null {
  try {
    const repo = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return repo;
  } catch {
    return null;
  }
}
