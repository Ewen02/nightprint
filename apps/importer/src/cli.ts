import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  blueprintSchema,
  checkBlueprint,
  drawMachine,
  surveyRepo,
  surveySheet,
} from "@nightprint/blueprint";
import { defineMachine, type MachineInput } from "@nightprint/engine";
import { ComposeError, claudeAsk, compose, costOf } from "./compose";
import { parseGitHubRepo, readGitHub, readLocal, SourceError } from "./sources";

const USAGE = `usage:
  survey <folder | owner/name | github url> [--json]
  draw   <folder | owner/name | github url> --code PRJ-001 --slug nightprint --out machine.json
         [--source <url>] [--date YYYY-MM-DD] [--blueprint plan.json]

draw asks Claude for the blueprint (ANTHROPIC_API_KEY), unless --blueprint gives one.
GITHUB_TOKEN, when set, raises GitHub's rate limit.`;

/** A catalogue file: the machine as data, validated when the catalogue loads it. */
function catalogModule(input: MachineInput, ref: string): string {
  const name = input.slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return `import { defineMachine } from "@nightprint/engine";

/**
 * ${input.code} — ${input.title}, drawn from its repository at ${ref.slice(0, 7)}.
 * Written by \`pnpm --filter @nightprint/importer draw\`: every route stands on an import the
 * survey found. Read it against the code before publishing it.
 */
export const ${name} = defineMachine(${JSON.stringify(input, null, 2)});
`;
}

/** A local folder when it exists on disk, a GitHub repository otherwise. */
async function read(target: string) {
  if (existsSync(target)) {
    return readLocal(target);
  }
  const repo = parseGitHubRepo(target);
  if (!repo) {
    throw new Error(`Neither a folder nor a GitHub repository: ${target}`);
  }
  return readGitHub(repo, { token: process.env.GITHUB_TOKEN });
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    code: { type: "string" },
    slug: { type: "string" },
    out: { type: "string" },
    source: { type: "string" },
    date: { type: "string" },
    blueprint: { type: "string" },
  },
});
const [command, target] = positionals;

try {
  if (command === "survey" && target) {
    const survey = surveyRepo(await read(target));
    console.log(values.json ? JSON.stringify(survey, null, 2) : surveySheet(survey));
  } else if (command === "draw" && target && values.code && values.slug && values.out) {
    const snapshot = await read(target);
    const survey = surveyRepo(snapshot);
    const options = {
      code: values.code,
      slug: values.slug,
      revised: values.date ?? new Date().toISOString().slice(0, 10),
      sourceUrl:
        values.source ??
        (snapshot.url
          ? `${snapshot.url}/tree/${snapshot.ref}`
          : `https://github.com/${snapshot.name}`),
    };
    let result: { readonly blueprint: unknown; readonly input: MachineInput };
    if (values.blueprint) {
      const blueprint = blueprintSchema.parse(JSON.parse(await readFile(values.blueprint, "utf8")));
      const issues = checkBlueprint(blueprint, survey);
      if (issues.length > 0) {
        throw new ComposeError("The blueprint breaks the rules.", issues);
      }
      const input = drawMachine(blueprint, survey, options);
      defineMachine(input);
      result = { blueprint, input };
    } else {
      console.error(`Surveyed ${survey.units.length} units, ${survey.edges.length} imports.`);
      const composed = await compose(survey, options, claudeAsk(), (attempt, issues) => {
        console.error(`Attempt ${attempt}: ${issues.length} issue(s); asking again.`);
      });
      console.error(
        `Drawn in ${composed.attempts} attempt(s), about $${costOf(composed.usage).toFixed(3)}.`,
      );
      result = composed;
    }
    await writeFile(
      values.out,
      values.out.endsWith(".ts")
        ? catalogModule(result.input, survey.repo.ref)
        : `${JSON.stringify(result, null, 2)}\n`,
    );
    console.error(`Wrote ${values.out}.`);
  } else {
    console.error(USAGE);
    process.exitCode = 1;
  }
} catch (error) {
  if (error instanceof ComposeError || error instanceof SourceError) {
    console.error(error.message);
    if (error instanceof ComposeError) {
      for (const issue of error.issues) {
        console.error(`  - ${issue}`);
      }
    }
    process.exitCode = 1;
  } else {
    throw error;
  }
}
