import type { Survey } from "./survey";

const FILES_PER_UNIT = 40;
const ENTRIES_PER_UNIT = 25;

/**
 * A survey as plain text, compact enough to send whole: what a draftsman reads before
 * drawing the machine. File paths are relative to their unit.
 */
export function surveySheet(survey: Survey): string {
  const { repo } = survey;
  const lines: string[] = [`REPOSITORY ${repo.name} @ ${repo.ref.slice(0, 7)}`];
  if (repo.description) {
    lines.push(`Description: ${repo.description}`);
  }
  if (repo.readme) {
    lines.push("README (start):", repo.readme.trim(), "");
  }
  lines.push(`PACKAGES ${survey.packages.map((p) => `${p.name} (${p.path})`).join(", ")}`, "");
  lines.push("UNITS [id] path · package · size");
  for (const unit of survey.units) {
    const tests = unit.tests > 0 ? ` · ${unit.tests} test file${unit.tests > 1 ? "s" : ""}` : "";
    lines.push(
      `[${unit.id}] ${unit.path} · ${unit.package} · ${unit.files.length} files, ${unit.lines} lines${tests}`,
    );
    if (unit.entries.length > 0) {
      const more = unit.entries.length - ENTRIES_PER_UNIT;
      lines.push(
        `  ways in: ${unit.entries.slice(0, ENTRIES_PER_UNIT).join("; ")}${more > 0 ? `; and ${more} more` : ""}`,
      );
    }
    if (unit.externals.length > 0) {
      lines.push(
        `  libraries: ${unit.externals.map((e) => `${e.name} (${e.category}, ${e.files})`).join(", ")}`,
      );
    }
    const prefix = unit.path === "." ? "" : `${unit.path}/`;
    for (const file of unit.files.slice(0, FILES_PER_UNIT)) {
      const exports = file.exports.length > 0 ? ` — exports ${file.exports.join(", ")}` : "";
      const doc = file.doc ? ` — "${file.doc}"` : "";
      lines.push(`  ${file.path.slice(prefix.length)}${exports}${doc}`);
    }
    if (unit.files.length > FILES_PER_UNIT) {
      lines.push(`  and ${unit.files.length - FILES_PER_UNIT} more files`);
    }
  }
  lines.push("", "IMPORTS from → to · files that import");
  for (const edge of survey.edges) {
    lines.push(`${edge.from} → ${edge.to} · ${edge.files}`);
  }
  return lines.join("\n");
}
