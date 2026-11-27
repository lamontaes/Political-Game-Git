import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();
process.chdir(run("git", ["rev-parse", "--show-toplevel"]));
const captures = [
  "calendar-day.png",
  "calendar-holidays-hidden.png",
  "calendar-today.png",
];
const otherCopies = [
  "tests/src/bench/calendar.browser.mjs",
  "src/bench/calendar.browser.mjs",
].filter(existsSync);
if (otherCopies.length !== 1)
  throw new Error("Expected one calendar browser check");
const [check] = otherCopies;
const code = readFileSync(check, "utf8");
const before = 'process.env.SHOTS ?? "."';
const after = 'process.env.SHOTS ?? "test-results/proof/calendar"';
if (code.includes(before) && code.split(before).length !== 4)
  throw new Error("Unexpected screenshot path count");
if (!code.includes(before) && code.split(after).length !== 4)
  throw new Error("Missing screenshot paths");
const pages = [".claude", ".agents"].map(
  (root) => `${root}/skills/play-first/references/prompt.md`,
);
const marker =
  "- **Restore only files your check changed.** Calendar proof goes under the ignored `test-results/proof/calendar` directory. Attach the images to the PR.";
const prompts = pages.map((file) => [file, readFileSync(file, "utf8")]);
for (const [file, text] of prompts)
  if (
    !text.includes(marker) &&
    !/^- \*\*Restore the rewritten screenshots by name.*$/m.test(text)
  )
    throw new Error("Missing play-first proof pointer in " + file);
const currentFile = "docs/current.json";
const current = JSON.parse(readFileSync(currentFile, "utf8"));
const when = run("date", ["-u", "+%F"]);
for (const old of captures)
  if (!current.replaced.some((entry) => entry.old === old))
    current.replaced.push({
      old,
      now: "Generated calendar proof in the ignored test-results directory",
      when,
      why: "Review captures belong to their pull requests, not the repository.",
    });
current.topLevel = current.topLevel.filter(
  ({ path }) => !captures.includes(path),
);
if (code.includes(before)) writeFileSync(check, code.replaceAll(before, after));
for (const [file, text] of prompts)
  if (!text.includes(marker))
    writeFileSync(
      file,
      text.replace(
        /^- \*\*Restore the rewritten screenshots by name.*$/m,
        () => marker,
      ),
    );
writeFileSync(currentFile, JSON.stringify(current, null, 2) + "\n");
run(process.execPath, ["--import", "tsx", "scripts/current/write.ts"]);
const tracked = run("git", ["ls-files", "--", ...captures])
  .split("\n")
  .filter(Boolean);
if (tracked.length) run("git", ["rm", "--", ...tracked]);
console.log(`Retired ${tracked.length} calendar proof files.`);
