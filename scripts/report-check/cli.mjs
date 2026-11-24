#!/usr/bin/env node
/**
 * `npm run report:check -- <file.md> [...]` measures a report against the
 * mechanical half of the civic-reports standard. `--story` forces the
 * story-first rules on a file outside a playtest folder.
 */
import process from "node:process";
import { readFileSync } from "node:fs";
import { checkReport } from "./report-check.mjs";

const args = process.argv.slice(2);
const story = args.includes("--story") ? true : undefined;
const files = args.filter((arg) => !arg.startsWith("--"));
if (files.length === 0) {
  process.stderr.write("usage: npm run report:check -- <file.md> [--story]\n");
  process.exit(2);
}
let failed = 0;
for (const file of files) {
  const {
    errors,
    warnings,
    story: measured,
  } = checkReport(readFileSync(file, "utf8"), { path: file, story });
  for (const line of errors) process.stdout.write(`error ${line}\n`);
  for (const line of warnings) process.stdout.write(`warn  ${line}\n`);
  process.stdout.write(
    `${file}: ${errors.length} error(s), ${warnings.length} warning(s)` +
      `${measured ? ", read as a story report" : ""}\n`,
  );
  if (errors.length) failed += 1;
}
process.exit(failed ? 1 : 0);
