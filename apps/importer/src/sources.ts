import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { isWanted, MAX_FILES, type RepoFile, type RepoSnapshot } from "@nightprint/blueprint";
import { z } from "zod";

const run = promisify(execFile);

/** Why a repository could not be read, in words a visitor can act on. */
export class SourceError extends Error {
  override name = "SourceError";
  constructor(
    readonly reason: "not-found" | "private" | "too-big" | "rate-limited" | "unreadable" | "empty",
    message: string,
  ) {
    super(message);
  }
}

/** Reads a local checkout: the files git tracks, at its current commit. */
export async function readLocal(dir: string): Promise<RepoSnapshot> {
  const listed = await run("git", ["ls-files", "-z"], { cwd: dir, maxBuffer: 64 << 20 });
  const files: RepoFile[] = [];
  for (const path of listed.stdout.split("\0").filter(Boolean)) {
    const info = await stat(join(dir, path)).catch(() => undefined);
    if (!info?.isFile() || !isWanted(path, info.size)) {
      continue;
    }
    if (files.length >= MAX_FILES) {
      throw new SourceError("too-big", `More than ${MAX_FILES} source files.`);
    }
    files.push({ path, text: await readFile(join(dir, path), "utf8") });
  }
  const head = await run("git", ["rev-parse", "HEAD"], { cwd: dir });
  // A checkout of a GitHub repository is named after it, like a read from GitHub would be.
  const origin = await run("git", ["remote", "get-url", "origin"], { cwd: dir }).catch(
    () => undefined,
  );
  const github = origin
    ? parseGitHubRepo(origin.stdout.trim().replace(/^git@github\.com:/, ""))
    : undefined;
  return {
    name: github ? `${github.owner}/${github.name}` : basename(resolve(dir)),
    ref: head.stdout.trim(),
    url: github ? `https://github.com/${github.owner}/${github.name}` : undefined,
    files,
  };
}

export interface GitHubRepo {
  readonly owner: string;
  readonly name: string;
  /** A branch, tag or commit; the default branch when left out. */
  readonly ref?: string | undefined;
}

/** "owner/name", or a github.com address, with or without a /tree/<ref>. */
export function parseGitHubRepo(input: string): GitHubRepo | undefined {
  const match =
    /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:\/tree\/([^?#]+))?\/?(?:[?#].*)?$/.exec(
      input.trim(),
    );
  // "." and ".." are no repository names, and would climb out of a cache folder.
  if (!match?.[1] || !match[2] || /^\.+$/.test(match[2])) {
    return undefined;
  }
  return { owner: match[1], name: match[2], ref: match[3] };
}

export interface GitHubOptions {
  /** Raises the API's limit from 60 to 5,000 requests an hour. */
  readonly token?: string | undefined;
  readonly fetch?: typeof fetch;
  /** Raw files fetched at once. */
  readonly concurrency?: number;
}

/** The fields read from GitHub's answers; anything else they carry is ignored. */
const repoInfo = z.object({
  full_name: z.string(),
  private: z.boolean().optional(),
  default_branch: z.string().optional(),
  description: z.string().nullish(),
  html_url: z.string().optional(),
});
const commitInfo = z.object({ sha: z.string().regex(/^[0-9a-f]{40}$/) });
const treeInfo = z.object({
  truncated: z.boolean().optional(),
  tree: z.array(z.object({ path: z.string(), type: z.string(), size: z.number().optional() })),
});

/** A public repository pinned to one commit, as GitHub names it. */
export interface GitHubCommit {
  readonly owner: string;
  readonly name: string;
  readonly sha: string;
  readonly url: string;
  readonly description?: string | undefined;
}

function githubApi(options: GitHubOptions) {
  const get = options.fetch ?? fetch;
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "nightprint-importer",
    "x-github-api-version": "2022-11-28",
  };
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  const api = async <T>(repo: GitHubRepo, path: string, schema: z.ZodType<T>): Promise<T> => {
    const response = await get(`https://api.github.com/repos/${repo.owner}/${repo.name}${path}`, {
      headers,
    });
    if (response.status === 404 || response.status === 422) {
      throw new SourceError("not-found", `No public repository ${repo.owner}/${repo.name}.`);
    }
    if (response.status === 403 || response.status === 429) {
      throw new SourceError("rate-limited", "GitHub's rate limit is reached; try again later.");
    }
    if (!response.ok) {
      throw new SourceError("unreadable", `GitHub answered ${response.status}.`);
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new SourceError("unreadable", "GitHub answered in an unexpected shape.");
    }
    return parsed.data;
  };
  return { get, api };
}

/** Which commit a repository's branch, tag or default branch points at: two API calls. */
export async function resolveGitHub(
  repo: GitHubRepo,
  options: GitHubOptions = {},
): Promise<GitHubCommit> {
  const { api } = githubApi(options);
  const info = await api(repo, "", repoInfo);
  if (info.private) {
    throw new SourceError("private", "Only public repositories can be drawn.");
  }
  const [owner = repo.owner, name = repo.name] = info.full_name.split("/");
  const ref = repo.ref ?? info.default_branch ?? "main";
  const commit = await api(repo, `/commits/${encodeURIComponent(ref)}`, commitInfo);
  return {
    owner,
    name,
    sha: commit.sha,
    url: info.html_url ?? `https://github.com/${owner}/${name}`,
    description: info.description ?? undefined,
  };
}

const compareInfo = z.object({ ahead_by: z.number() });

/** How many commits `commit` is ahead of an older one: one API call, undefined when unknown. */
export async function commitsSince(
  commit: GitHubCommit,
  base: string,
  options: GitHubOptions = {},
): Promise<number | undefined> {
  const { api } = githubApi(options);
  return api(commit, `/compare/${base}...${commit.sha}`, compareInfo).then(
    (c) => c.ahead_by,
    () => undefined,
  );
}

/**
 * Reads a public repository at a known commit: one API call for the tree, then each wanted
 * file from raw.githubusercontent.com, which the API's rate limit does not count.
 */
export async function readGitHubAt(
  commit: GitHubCommit,
  options: GitHubOptions = {},
  /** Files read so far, out of the files wanted, after each one. */
  onProgress?: (done: number, total: number) => void,
): Promise<RepoSnapshot> {
  const { get, api } = githubApi(options);
  const tree = await api(commit, `/git/trees/${commit.sha}?recursive=1`, treeInfo);
  if (tree.truncated) {
    throw new SourceError("too-big", "The repository is too big for GitHub to list in one go.");
  }
  const wanted = tree.tree.filter((e) => e.type === "blob" && isWanted(e.path, e.size));
  if (wanted.length > MAX_FILES) {
    throw new SourceError("too-big", `More than ${MAX_FILES} source files.`);
  }

  const files: RepoFile[] = [];
  let next = 0;
  const worker = async () => {
    while (next < wanted.length) {
      const entry = wanted[next++];
      if (!entry) {
        return;
      }
      const path = entry.path.split("/").map(encodeURIComponent).join("/");
      const url = `https://raw.githubusercontent.com/${commit.owner}/${commit.name}/${commit.sha}/${path}`;
      const response = await get(url, { headers: { "user-agent": "nightprint-importer" } });
      if (!response.ok) {
        throw new SourceError("unreadable", `Could not read ${entry.path} (${response.status}).`);
      }
      files.push({ path: entry.path, text: await response.text() });
      onProgress?.(files.length, wanted.length);
    }
  };
  onProgress?.(0, wanted.length);
  await Promise.all(Array.from({ length: options.concurrency ?? 16 }, worker));

  return {
    name: `${commit.owner}/${commit.name}`,
    ref: commit.sha,
    url: commit.url,
    description: commit.description,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/** Reads a public GitHub repository at the commit its ref points at. */
export async function readGitHub(
  repo: GitHubRepo,
  options: GitHubOptions = {},
): Promise<RepoSnapshot> {
  return readGitHubAt(await resolveGitHub(repo, options), options);
}
