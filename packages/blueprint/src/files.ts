/** One file of a repository, as read at one commit. */
export interface RepoFile {
  readonly path: string;
  readonly text: string;
}

/** What a survey reads: the files worth reading in a repository, at one commit. */
export interface RepoSnapshot {
  /** "owner/name" on GitHub, or a folder name for a local checkout. */
  readonly name: string;
  /** The commit the files were read at. */
  readonly ref: string;
  readonly url?: string | undefined;
  readonly description?: string | undefined;
  readonly files: readonly RepoFile[];
}

/** Larger files are generated or vendored, rarely architecture. */
export const MAX_FILE_BYTES = 200_000;
/** A survey reads at most this many files; past it, a repository is too big to draw whole. */
export const MAX_FILES = 3000;

const SOURCE = /\.[cm]?[jt]sx?$/;
const MANIFESTS = new Set(["package.json", "tsconfig.json", "jsconfig.json"]);
/**
 * Build output, dependencies and assets: never the project's own architecture. Hidden
 * folders (.git, .next, .github, an editor's or an assistant's) are skipped as well.
 */
const SKIPPED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "public",
  "storybook-static",
  "__generated__",
]);

export function isSource(path: string): boolean {
  return SOURCE.test(path) && !/\.d\.[cm]?ts$/.test(path) && !/\.min\.js$/.test(path);
}

/** Whether a survey needs this file: sources, manifests, and the README at the root. */
export function isWanted(path: string, bytes = 0): boolean {
  if (bytes > MAX_FILE_BYTES) {
    return false;
  }
  const segments = path.split("/");
  if (segments.slice(0, -1).some((s) => s.startsWith(".") || SKIPPED_DIRS.has(s))) {
    return false;
  }
  const name = segments[segments.length - 1] ?? "";
  if (segments.length === 1 && /^readme(\.md)?$/i.test(name)) {
    return true;
  }
  return MANIFESTS.has(name) || isSource(path);
}
