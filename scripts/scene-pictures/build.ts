/**
 * npm run scene-pictures [-- --check]
 *
 * Writes docs/art/SCENE-PICTURES.md (every scene type and setting with its
 * picture and gaps) and the generated "Scene pictures wanted" section of
 * docs/art/WANTED.md (between its markers). --check fails when a row names a
 * type, variant or setting that does not exist, or when either file is stale.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import { buildReport } from "./report.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const BEGIN = "<!-- scene-pictures:begin (generated, do not edit) -->";
const END = "<!-- scene-pictures:end -->";

export function wantedWith(current: string, section: string): string {
  const block = `${BEGIN}\n${section}${END}`;
  const from = current.indexOf(BEGIN);
  if (from < 0)
    return `${current.trimEnd()}\n\n## Scene pictures wanted\n\n${block}\n`;
  const to = current.indexOf(END, from) + END.length;
  return current.slice(0, from) + block + current.slice(to);
}

const check = process.argv.includes("--check");
const report = buildReport();
const pretty = (text: string) => format(text, { parser: "markdown" });
const wantedPath = join(ROOT, "docs/art/WANTED.md");
const reportPath = join(ROOT, "docs/art/SCENE-PICTURES.md");
const reportNow = await pretty(report.markdown);
const wantedNow = await pretty(
  wantedWith(readFileSync(wantedPath, "utf8"), report.wantedMarkdown),
);
if (check) {
  const stale = (path: string, next: string) =>
    readFileSync(path, "utf8") !== next
      ? [`${path} is stale: run npm run scene-pictures`]
      : [];
  const bad = [
    ...report.dead,
    ...stale(reportPath, reportNow),
    ...stale(wantedPath, wantedNow),
  ];
  if (bad.length) {
    console.error(bad.join("\n"));
    process.exit(1);
  }
} else {
  writeFileSync(reportPath, reportNow);
  writeFileSync(wantedPath, wantedNow);
  console.log(
    `${report.rows.length} scene and setting pairs, ${report.dead.length} dead rows, ${report.wanted.length} pictures wanted, ${report.nightWanted.length} without a night picture.`,
  );
}
