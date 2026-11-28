/**
 * Points the copies of the kernel's date arithmetic at the kernel (core audit
 * K10, Core item 4): a re-runnable script. In the game's source (never tests,
 * scripts or the kernel's own file) it rewrites
 *
 *   new Date(`${E}T00:00:00Z`).getUTCDay()      -> weekdayOf(E)   (also T12:00:00Z)
 *   new Date(makeIsoDate(E)).getUTCDay()        -> weekdayOf(E)
 *   new Date(Date.UTC(Y, M, 0)).getUTCDate()    -> lastDayOfMonth(Y, M)
 *   new Date(Date.parse(`${E}T00:00:00Z`) + N * 86_400_000).toISOString().slice(0, 10)
 *                                               -> addDays(makeIsoDate(E), N)   (also `DAY_MS`)
 *
 * and adds the import (a `DAY_MS` that only they used is removed by hand: lint names it). The nth-weekday copies are rewritten by hand, each
 * checked against the helper over the years the game runs
 * (tests/src/core2/kernel/dates-weekdays.test.ts). Formatting is left as it is.
 *
 *   node --import tsx scripts/core/date-helpers.ts          rewrite
 *   node --import tsx scripts/core/date-helpers.ts --plan   list the files only
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const KERNEL_DATES = "src/core2/kernel/dates.ts";
/**
 * Files other live sessions are building in (the goal's "skip files another
 * session changed in 2 days, and list them"): Story's director, English
 * engine and word files, and Past and Day One's opening, jobs, business and
 * century files. The next run takes them once those sessions have landed.
 */
const LIVE =
  /^(?:src\/director\/|src\/english\/|src\/core2\/tooling\/|src\/bench\/(?:path-check|m\d[^/]*-check)\.ts$|src\/bench\/(?:printed-words|archive-words|race-words|words|card)\.ts$|src\/core2\/(?:opening-[^/]*|past-[^/]*|electorate-century[^/]*|jobs-elsewhere|modules\/(?:jobs|business))\.ts$)/;
const files = execFileSync("git", ["ls-files", "src"], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 1 << 28,
})
  .split("\n")
  .filter(
    (file) =>
      /\.(ts|tsx)$/.test(file) &&
      !/\.(test|spec|browser)\.(ts|tsx)$/.test(file) &&
      !/\.d\.ts$/.test(file) &&
      file !== KERNEL_DATES,
  );
const skipped: string[] = [];

/** A simple argument: no backtick, no unbalanced parenthesis. */
const ARG = String.raw`((?:[^()\`]|\((?:[^()\`]|\([^()\`]*\))*\))+?)`;
const WEEKDAY_TEXT = new RegExp(
  String.raw`new Date\(\`\$\{${ARG}\}T(?:00|12):00:00(?:\.000)?Z\`\)\.getUTCDay\(\)`,
  "g",
);
const WEEKDAY_ISO = new RegExp(
  String.raw`new Date\(makeIsoDate\(${ARG}\)\)\.getUTCDay\(\)`,
  "g",
);
const LAST_DAY = new RegExp(
  String.raw`new Date\(\s*Date\.UTC\(\s*${ARG}\s*,\s*${ARG}\s*,\s*0\s*\)\s*\)\.getUTCDate\(\)`,
  "g",
);

const ADD_DAYS = new RegExp(
  String.raw`new Date\(\s*Date\.parse\(\s*\`\$\{${ARG}\}T00:00:00Z\`\s*\)\s*\+\s*(?:([A-Za-z0-9_.]+)\s*\*\s*)?(?:86_400_000|DAY_MS)\s*,?\s*\)\s*\.toISOString\(\)\s*\.slice\(0,\s*10\)`,
  "g",
);

function relativeToKernel(file: string): string {
  const rel = path.posix.relative(
    path.posix.dirname(file),
    KERNEL_DATES.replace(/\.ts$/, ""),
  );
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** Adds `names` to the file's import from the kernel's dates, or a new import. */
function withImport(file: string, text: string, names: string[]): string {
  const spec = relativeToKernel(file);
  const existing = new RegExp(
    String.raw`import\s*\{([^}]*)\}\s*from\s*"${spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}";`,
  ).exec(text);
  if (existing) {
    const have = existing[1]!
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const all = [...new Set([...have, ...names])];
    return text.replace(
      existing[0],
      `import { ${all.join(", ")} } from "${spec}";`,
    );
  }
  const line = `import { ${names.join(", ")} } from "${spec}";\n`;
  // After the last top-level import, so a file header comment stays first.
  const imports = [...text.matchAll(/^import[^;]*;\n/gm)];
  const last = imports[imports.length - 1];
  if (!last) return line + text;
  const at = last.index! + last[0].length;
  return text.slice(0, at) + line + text.slice(at);
}

let changed = 0;
for (const file of files) {
  const original = readFileSync(path.join(ROOT, file), "utf8");
  const names = new Set<string>();
  // A file with its own `weekdayOf` or `lastDayOfMonth` would call itself: by hand.
  if (
    /(?:function|const)\s+(?:weekdayOf|lastDayOfMonth|addDays)\b/.test(original)
  ) {
    skipped.push(`${file} (names its own helper)`);
    continue;
  }
  if (LIVE.test(file)) {
    if (
      WEEKDAY_TEXT.test(original) ||
      WEEKDAY_ISO.test(original) ||
      LAST_DAY.test(original) ||
      ADD_DAYS.test(original)
    )
      skipped.push(file);
    WEEKDAY_TEXT.lastIndex =
      WEEKDAY_ISO.lastIndex =
      LAST_DAY.lastIndex =
      ADD_DAYS.lastIndex =
        0;
    continue;
  }
  let text = original
    .replace(WEEKDAY_TEXT, (_m, e: string) => {
      names.add("weekdayOf");
      return `weekdayOf(${e.trim()})`;
    })
    .replace(WEEKDAY_ISO, (_m, e: string) => {
      names.add("weekdayOf");
      return `weekdayOf(${e.trim()})`;
    })
    .replace(LAST_DAY, (_m, y: string, m: string) => {
      names.add("lastDayOfMonth");
      return `lastDayOfMonth(${y.trim()}, ${m.trim()})`;
    })
    .replace(ADD_DAYS, (_m, e: string, n: string | undefined) => {
      names.add("addDays");
      names.add("makeIsoDate");
      return `addDays(makeIsoDate(${e.trim()}), ${n ?? "1"})`;
    });
  if (text === original) continue;
  text = withImport(file, text, [...names].sort());
  changed += 1;
  console.log(file, [...names].join(" "));
  if (!process.argv.includes("--plan"))
    writeFileSync(path.join(ROOT, file), text);
}
// The zero-dice allowlist names an allowed line by its text: a line this script
// rewrote keeps its entry, spelled the new way.
const ALLOWLIST = path.join(ROOT, "scripts/zero-dice-allowlist.json");
if (!process.argv.includes("--plan")) {
  const list = JSON.parse(readFileSync(ALLOWLIST, "utf8"));
  let respelled = 0;
  for (const entry of list.entries as { file: string; code?: string }[]) {
    if (!entry.code || LIVE.test(entry.file)) continue;
    const spelled = entry.code
      .replace(WEEKDAY_TEXT, (_m, e: string) => `weekdayOf(${e.trim()})`)
      .replace(WEEKDAY_ISO, (_m, e: string) => `weekdayOf(${e.trim()})`)
      .replace(
        LAST_DAY,
        (_m, y: string, m: string) =>
          `lastDayOfMonth(${y.trim()}, ${m.trim()})`,
      );
    if (spelled !== entry.code) {
      entry.code = spelled;
      respelled += 1;
    }
  }
  if (respelled) {
    writeFileSync(ALLOWLIST, JSON.stringify(list, null, 2) + "\n");
    console.log(`${respelled} allowlist entries respelled`);
  }
}
console.log(`${changed} files; left for a later run, in live sessions' files:`);
for (const file of skipped) console.log(`  ${file}`);
