import ts from "typescript";
import { categoryOf, type ExternalCategory, isBuiltin, packageName } from "./externals";
import { isSource, type RepoSnapshot } from "./files";

/**
 * The facts of a repository, read from its code and nothing else: its units (a package,
 * or a folder of one), which unit imports which, and which libraries each one uses. A
 * machine drawn from a survey may only connect what the survey connects.
 */

/** A third-party package a unit imports. */
export interface External {
  readonly name: string;
  readonly category: ExternalCategory;
  /** How many of the unit's files import it. */
  readonly files: number;
}

export interface SurveyFile {
  readonly path: string;
  /** Names the file exports, the first few. */
  readonly exports: readonly string[];
  /** Its first doc comment, shortened. */
  readonly doc?: string | undefined;
}

/** A package, or one top-level folder of a large package. */
export interface Unit {
  /** Kebab-case, from the path: "packages-engine". */
  readonly id: string;
  /** "packages/engine", or "." for the repository root. */
  readonly path: string;
  /** The package it belongs to, by name. */
  readonly package: string;
  readonly files: readonly SurveyFile[];
  readonly lines: number;
  /** Test files, read but kept out of the edges: tests import everything. */
  readonly tests: number;
  /** Ways in from outside: "page /m/[slug]", "endpoint /api/orders", "command nightprint". */
  readonly entries: readonly string[];
  readonly externals: readonly External[];
}

/** `from` imports `to`, in this many of its files. */
export interface Edge {
  readonly from: string;
  readonly to: string;
  readonly files: number;
}

export interface Survey {
  readonly repo: {
    readonly name: string;
    readonly ref: string;
    readonly url?: string | undefined;
    readonly description?: string | undefined;
    readonly readme?: string | undefined;
  };
  readonly packages: readonly { readonly name: string; readonly path: string }[];
  readonly units: readonly Unit[];
  readonly edges: readonly Edge[];
}

export interface SurveyOptions {
  /** A package with fewer source files than this is one unit, not one unit per folder. */
  readonly folderUnitsFrom?: number;
  /** Past this many units, every package is one unit. */
  readonly maxUnits?: number;
}

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const README_CHARS = 4000;
const EXPORTS_PER_FILE = 8;
const DOC_CHARS = 200;
/** Marks an edge to a package whose import maps to no file. */
const PACKAGE = "package:";

interface Package {
  readonly dir: string;
  readonly name: string;
  readonly dependencies: ReadonlySet<string>;
  readonly exports: unknown;
  readonly main?: string | undefined;
  readonly bin: ReadonlyMap<string, string>;
}

interface Alias {
  readonly pattern: string;
  /** Repository paths, with the pattern's `*` where it has one. */
  readonly targets: readonly string[];
}

type Target =
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "package"; readonly pkg: Package }
  | { readonly type: "external"; readonly name: string }
  | { readonly type: "none" };

function record(value: unknown): Record<string, unknown> | undefined {
  // Checked just above: a plain object, read key by key with each value still unknown.
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function dirname(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Joins and normalises repository paths; undefined when a ".." climbs out of the repository. */
function joinPath(...parts: readonly string[]): string | undefined {
  const out: string[] = [];
  for (const segment of parts.join("/").split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (out.length === 0) {
        return undefined;
      }
      out.pop();
    } else {
      out.push(segment);
    }
  }
  return out.join("/");
}

function inside(dir: string, path: string): boolean {
  return dir === "" || path.startsWith(`${dir}/`);
}

function isTest(path: string): boolean {
  return (
    /\.(test|spec)(-helper)?\.[cm]?[jt]sx?$/.test(path) ||
    path.split("/").some((s) => s === "__tests__" || s === "__mocks__" || s === "e2e")
  );
}

/** Tool configuration (vite.config.ts, next.config.ts): it builds the code, it is not part of it. */
function isConfig(path: string): boolean {
  return /\.config\.[cm]?[jt]s$/.test(basename(path));
}

function readPackages(snapshot: RepoSnapshot): Package[] {
  const packages: Package[] = [];
  for (const file of snapshot.files) {
    if (basename(file.path) !== "package.json") {
      continue;
    }
    let json: Record<string, unknown> | undefined;
    try {
      json = record(JSON.parse(file.text));
    } catch {
      json = undefined;
    }
    if (!json) {
      continue;
    }
    const dir = dirname(file.path);
    const dependencies = new Set<string>();
    for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
      for (const name of Object.keys(record(json[key]) ?? {})) {
        dependencies.add(name);
      }
    }
    const name = typeof json.name === "string" ? json.name : dir || snapshot.name;
    const bin = new Map<string, string>();
    if (typeof json.bin === "string") {
      bin.set(basename(name), json.bin);
    } else {
      for (const [command, target] of Object.entries(record(json.bin) ?? {})) {
        if (typeof target === "string") {
          bin.set(command, target);
        }
      }
    }
    packages.push({
      dir,
      name,
      dependencies,
      exports: json.exports,
      main: typeof json.main === "string" ? json.main : undefined,
      bin,
    });
  }
  // Deepest first, so a file belongs to the closest package.json above it.
  return packages.sort((a, b) => b.dir.length - a.dir.length);
}

function readAliases(snapshot: RepoSnapshot): Map<string, Alias[]> {
  const scopes = new Map<string, Alias[]>();
  for (const file of snapshot.files) {
    const name = basename(file.path);
    if (name !== "tsconfig.json" && name !== "jsconfig.json") {
      continue;
    }
    const { config } = ts.parseConfigFileTextToJson(file.path, file.text);
    const options = record(record(config)?.compilerOptions);
    const paths = record(options?.paths);
    if (!paths) {
      continue;
    }
    const dir = dirname(file.path);
    const baseUrl = typeof options?.baseUrl === "string" ? options.baseUrl : ".";
    const aliases: Alias[] = [];
    for (const [pattern, values] of Object.entries(paths)) {
      const targets = (Array.isArray(values) ? values : [])
        .filter((v): v is string => typeof v === "string")
        .flatMap((v) => joinPath(dir, baseUrl, v) ?? []);
      aliases.push({ pattern, targets });
    }
    scopes.set(dir, aliases);
  }
  return scopes;
}

/** The target of an `exports` entry, preferring source over built files. */
function conditionTarget(entry: unknown): string | undefined {
  if (typeof entry === "string") {
    return entry;
  }
  const conditions = record(entry);
  if (!conditions) {
    return undefined;
  }
  for (const key of ["source", "import", "default", "types", "module", "require", "node"]) {
    const target = conditionTarget(conditions[key]);
    if (target) {
      return target;
    }
  }
  return undefined;
}

/** What a package's `exports` maps a subpath ("." or "./sub") to. */
function exportTarget(exports: unknown, subpath: string): string | undefined {
  if (typeof exports === "string") {
    return subpath === "." ? exports : undefined;
  }
  const map = record(exports);
  if (!map) {
    return undefined;
  }
  if (!Object.keys(map).some((k) => k.startsWith("."))) {
    return subpath === "." ? conditionTarget(map) : undefined;
  }
  if (subpath in map) {
    return conditionTarget(map[subpath]);
  }
  for (const [key, entry] of Object.entries(map)) {
    const star = key.indexOf("*");
    if (star < 0) {
      continue;
    }
    const before = key.slice(0, star);
    const after = key.slice(star + 1);
    if (subpath.startsWith(before) && subpath.endsWith(after)) {
      const match = subpath.slice(before.length, subpath.length - after.length);
      return conditionTarget(entry)?.replace("*", match);
    }
  }
  return undefined;
}

function exportsOf(text: string): string[] {
  const names = new Set<string>();
  const declared =
    /export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of text.matchAll(declared)) {
    if (match[1]) {
      names.add(match[1]);
    }
  }
  for (const match of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of (match[1] ?? "").split(",")) {
      const name = item
        .replace(/^\s*type\s+/, "")
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) {
        names.add(name);
      }
    }
  }
  return [...names].slice(0, EXPORTS_PER_FILE);
}

function docOf(text: string): string | undefined {
  const match = /\/\*\*([\s\S]*?)\*\//.exec(text);
  if (!match?.[1]) {
    return undefined;
  }
  const doc = match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line !== "" && !line.startsWith("@"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (doc === "") {
    return undefined;
  }
  return doc.length > DOC_CHARS ? `${doc.slice(0, DOC_CHARS - 1)}…` : doc;
}

function unitId(path: string, taken: Set<string>): string {
  const base =
    path === ""
      ? "root"
      : path
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
  let id = /^[a-z]/.test(base) ? base : `u-${base}`;
  for (let n = 2; taken.has(id); n++) {
    id = `${base}-${n}`;
  }
  taken.add(id);
  return id;
}

/** Reads a repository's structure from its files. Pure: the same snapshot gives the same survey. */
export function surveyRepo(snapshot: RepoSnapshot, options: SurveyOptions = {}): Survey {
  const folderUnitsFrom = options.folderUnitsFrom ?? 12;
  const maxUnits = options.maxUnits ?? 60;
  const known = new Set(snapshot.files.map((f) => f.path));
  const packages = readPackages(snapshot);
  const aliasScopes = readAliases(snapshot);
  const root: Package = {
    dir: "",
    name: snapshot.name,
    dependencies: new Set(),
    exports: undefined,
    bin: new Map(),
  };
  const packageOf = (path: string) => packages.find((p) => inside(p.dir, path)) ?? root;

  const sources = snapshot.files
    .filter((f) => isSource(f.path))
    .sort((a, b) => a.path.localeCompare(b.path));
  const code = sources.filter((f) => !isTest(f.path) && !isConfig(f.path));

  // Units: one per package, or one per top-level folder in a package big enough to split.
  const sizeOf = new Map<Package, number>();
  for (const file of code) {
    const pkg = packageOf(file.path);
    sizeOf.set(pkg, (sizeOf.get(pkg) ?? 0) + 1);
  }
  const folderUnit = (path: string, pkg: Package): string => {
    if ((sizeOf.get(pkg) ?? 0) < folderUnitsFrom) {
      return pkg.dir;
    }
    const segments = (pkg.dir === "" ? path : path.slice(pkg.dir.length + 1)).split("/");
    const inSrc = segments[0] === "src" && segments.length > 1;
    const inner = inSrc ? segments.slice(1) : segments;
    const folder = inner[0];
    if (inner.length < 2 || folder === undefined) {
      return pkg.dir;
    }
    return joinPath(pkg.dir, inSrc ? `src/${folder}` : folder) ?? pkg.dir;
  };
  let unitPathOf = (path: string) => folderUnit(path, packageOf(path));
  if (new Set(sources.map((f) => unitPathOf(f.path))).size > maxUnits) {
    unitPathOf = (path) => packageOf(path).dir;
  }

  const resolveFile = (base: string): string | undefined => {
    const candidates = [base];
    const swapped = base.replace(/\.([cm]?)js(x?)$/, ".$1ts$2");
    if (swapped !== base) {
      candidates.push(swapped);
    }
    for (const ext of EXTENSIONS) {
      candidates.push(`${base}${ext}`);
    }
    for (const ext of EXTENSIONS) {
      candidates.push(`${base}/index${ext}`);
    }
    return candidates.find((c) => known.has(c) && isSource(c));
  };

  const aliasesFor = (path: string): readonly Alias[] => {
    let best: string | undefined;
    for (const dir of aliasScopes.keys()) {
      if (inside(dir, path) && (best === undefined || dir.length > best.length)) {
        best = dir;
      }
    }
    return best === undefined ? [] : (aliasScopes.get(best) ?? []);
  };

  const workspaceFile = (pkg: Package, subpath: string): string | undefined => {
    const target = exportTarget(pkg.exports, subpath) ?? (subpath === "." ? pkg.main : undefined);
    const tries =
      subpath === "."
        ? [target, "src/index", "index"]
        : [target, subpath, `src/${subpath.slice(2)}`];
    for (const t of tries) {
      const base = t === undefined ? undefined : joinPath(pkg.dir, t);
      const file = base === undefined ? undefined : resolveFile(base);
      if (file) {
        return file;
      }
    }
    return undefined;
  };

  const resolve = (specifier: string, from: string): Target => {
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      const base = specifier.startsWith("/")
        ? joinPath(specifier)
        : joinPath(dirname(from), specifier);
      const file = base === undefined ? undefined : resolveFile(base);
      return file ? { type: "file", path: file } : { type: "none" };
    }
    for (const alias of aliasesFor(from)) {
      const star = alias.pattern.indexOf("*");
      const matched =
        star < 0
          ? specifier === alias.pattern
            ? ""
            : undefined
          : specifier.startsWith(alias.pattern.slice(0, star)) &&
              specifier.endsWith(alias.pattern.slice(star + 1))
            ? specifier.slice(star, specifier.length - (alias.pattern.length - star - 1))
            : undefined;
      if (matched === undefined) {
        continue;
      }
      for (const target of alias.targets) {
        const file = resolveFile(target.replace("*", matched));
        if (file) {
          return { type: "file", path: file };
        }
      }
    }
    if (isBuiltin(specifier)) {
      return { type: "none" };
    }
    const pkg = packages.find((p) => specifier === p.name || specifier.startsWith(`${p.name}/`));
    if (pkg) {
      const subpath = specifier === pkg.name ? "." : `./${specifier.slice(pkg.name.length + 1)}`;
      const file = workspaceFile(pkg, subpath);
      return file ? { type: "file", path: file } : { type: "package", pkg };
    }
    // Any other bare specifier is a library, unless it is an asset or a virtual module.
    return /^[@a-z0-9]/i.test(specifier)
      ? { type: "external", name: packageName(specifier) }
      : { type: "none" };
  };

  const entriesOf = (path: string, pkg: Package): string[] => {
    const entries: string[] = [];
    const segments = (pkg.dir === "" ? path : path.slice(pkg.dir.length + 1)).split("/");
    const inner = segments[0] === "src" ? segments.slice(1) : segments;
    const base = (inner[inner.length - 1] ?? "").replace(/\.[^.]+$/, "");
    if (pkg.dependencies.has("next")) {
      const route = (parts: readonly string[]) =>
        `/${parts.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@")).join("/")}`;
      if (inner[0] === "app" && (base === "page" || base === "route")) {
        entries.push(`${base === "page" ? "page" : "endpoint"} ${route(inner.slice(1, -1))}`);
      }
      if (inner[0] === "pages" && !base.startsWith("_")) {
        const parts = [...inner.slice(1, -1), ...(base === "index" ? [] : [base])];
        entries.push(`${inner[1] === "api" ? "endpoint" : "page"} ${route(parts)}`);
      }
    }
    for (const [command, target] of pkg.bin) {
      const file = resolveFile(joinPath(pkg.dir, target) ?? "");
      if (file === path) {
        entries.push(`command ${command}`);
      }
    }
    const main =
      pkg.main === undefined ? undefined : resolveFile(joinPath(pkg.dir, pkg.main) ?? "");
    if (main === path || ((base === "server" || base === "main") && inner.length === 1)) {
      entries.push("main");
    }
    return entries;
  };

  // Units, with their files.
  const takenIds = new Set<string>();
  const unitIdByPath = new Map<string, string>();
  const idOfUnit = (unitPath: string) => {
    let id = unitIdByPath.get(unitPath);
    if (!id) {
      id = unitId(unitPath, takenIds);
      unitIdByPath.set(unitPath, id);
    }
    return id;
  };
  interface Draft {
    path: string;
    pkg: Package;
    files: SurveyFile[];
    lines: number;
    tests: number;
    entries: string[];
    externals: Map<string, Set<string>>;
  }
  const drafts = new Map<string, Draft>();
  const draftOf = (path: string): Draft => {
    const unitPath = unitPathOf(path);
    const id = idOfUnit(unitPath);
    let draft = drafts.get(id);
    if (!draft) {
      draft = {
        path: unitPath,
        pkg: packageOf(path),
        files: [],
        lines: 0,
        tests: 0,
        entries: [],
        externals: new Map(),
      };
      drafts.set(id, draft);
    }
    return draft;
  };

  const edgeFiles = new Map<string, Set<string>>();
  for (const file of sources) {
    const draft = draftOf(file.path);
    if (isTest(file.path)) {
      draft.tests += 1;
      continue;
    }
    if (isConfig(file.path)) {
      continue;
    }
    draft.files.push({ path: file.path, exports: exportsOf(file.text), doc: docOf(file.text) });
    draft.lines += file.text.split("\n").length;
    draft.entries.push(...entriesOf(file.path, draft.pkg));
    const fromId = idOfUnit(draft.path);
    const imported = ts.preProcessFile(file.text, true, true).importedFiles;
    for (const { fileName } of imported) {
      const target = resolve(fileName, file.path);
      if (target.type === "external") {
        const users = draft.externals.get(target.name) ?? new Set<string>();
        users.add(file.path);
        draft.externals.set(target.name, users);
        continue;
      }
      if (target.type === "none") {
        continue;
      }
      // A package import that maps to no file lands on the package's largest unit, once known.
      const toKey =
        target.type === "file" ? idOfUnit(unitPathOf(target.path)) : `${PACKAGE}${target.pkg.dir}`;
      if (toKey === fromId) {
        continue;
      }
      const key = `${fromId}\u0000${toKey}`;
      const files = edgeFiles.get(key) ?? new Set<string>();
      files.add(file.path);
      edgeFiles.set(key, files);
    }
  }

  const units: Unit[] = [...drafts.entries()]
    // A folder of tests alone is no part of the architecture.
    .filter(([, d]) => d.files.length > 0)
    .map(([id, d]) => ({
      id,
      path: d.path === "" ? "." : d.path,
      package: d.pkg.name,
      files: d.files,
      lines: d.lines,
      tests: d.tests,
      entries: [...new Set(d.entries)].sort(),
      externals: [...d.externals.entries()]
        .map(([name, users]) => ({ name, category: categoryOf(name), files: users.size }))
        .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const unitIds = new Set(units.map((u) => u.id));

  const largestUnit = new Map<string, Unit>();
  for (const unit of units) {
    const dir = packages.find((p) => p.name === unit.package)?.dir ?? "";
    const best = largestUnit.get(dir);
    if (!best || unit.files.length > best.files.length) {
      largestUnit.set(dir, unit);
    }
  }
  const merged = new Map<string, Set<string>>();
  for (const [key, files] of edgeFiles) {
    const [from = "", rawTo = ""] = key.split("\u0000");
    const to = rawTo.startsWith(PACKAGE) ? largestUnit.get(rawTo.slice(PACKAGE.length))?.id : rawTo;
    if (to === undefined || to === from || !unitIds.has(from) || !unitIds.has(to)) {
      continue;
    }
    const all = merged.get(`${from}\u0000${to}`) ?? new Set<string>();
    for (const f of files) {
      all.add(f);
    }
    merged.set(`${from}\u0000${to}`, all);
  }
  const edges: Edge[] = [...merged.entries()]
    .map(([key, files]) => {
      const [from = "", to = ""] = key.split("\u0000");
      return { from, to, files: files.size };
    })
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const readme = snapshot.files.find((f) => /^readme(\.md)?$/i.test(f.path));
  return {
    repo: {
      name: snapshot.name,
      ref: snapshot.ref,
      url: snapshot.url,
      description: snapshot.description,
      readme: readme?.text.slice(0, README_CHARS),
    },
    packages: packages
      .map((p) => ({ name: p.name, path: p.dir === "" ? "." : p.dir }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    units,
    edges,
  };
}
