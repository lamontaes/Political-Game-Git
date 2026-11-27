/**
 * Moves the workshop out of the game's source (core audit K9, Core item 2):
 * a re-runnable script. It moves each file with `git mv`, rewrites every
 * relative import that reaches a moved file or sits in one, and rewrites the
 * repository paths written as text (package.json, scripts, docs, workflows).
 * Run it again after other branches land: a file already moved is skipped,
 * and a new file added in an old place moves the next time.
 *
 *   node --import tsx scripts/core/move-workshop.ts          move and rewrite
 *   node --import tsx scripts/core/move-workshop.ts --plan   print the moves only
 *
 * Where each file goes:
 *   src/core2/tooling/**              -> scripts/core2/tooling/**   (measurement, checks, proofs)
 *   src/core2/tooling/generated-world -> src/core2/generated-world  (the game starts worlds with it: saves.ts)
 *   src/core2/tooling/money-watch     -> src/bench/dev-money-watch  (the dev screens use it)
 *   src/core2/tooling/past-sessions   -> src/core2/past-sessions   (a world-start step the screens' world.ts calls; the past engine's)
 *   src/core2/tooling/test-days.ts, world-with.ts (only tests read them) -> tests/support/
 *   src/core2/tooling/fixtures/event-inputs.json                         -> tests/fixtures/
 *   src/core2/*-kit.ts, *-fixture.ts, law-test-start.ts -> tests/support/
 *   src/core2/bug-report.ts, gov-test-report.ts         -> scripts/core2/
 *   src/core2/trait-pairs.ts, turnover-check.ts, circle-turnover-check.ts -> scripts/core2/
 *   src/bench milestone checks (m0, m1-10..14, m2-03, m2-10, jump-end), store-shots, verify, integration-heads -> scripts/bench/
 *   src/bench/path-check.ts and its step-11 test -> tests/golden-path/
 *   src/core2/tooling/tsconfig.json   -> deleted (nothing reads it; its include no longer means anything)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
process.chdir(ROOT);

const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1 << 29,
  });

const tracked = git("ls-files", "-z")
  .split("\0")
  .filter(Boolean)
  .filter((file) => existsSync(path.join(ROOT, file)));
const trackedSet = new Set(tracked);

/** A file's new home, or null when it stays. `"delete"` removes it. */
function destination(file: string): string | "delete" | null {
  if (file === "src/core2/tooling/tsconfig.json") return "delete";
  if (file === "src/core2/tooling/generated-world.ts")
    return "src/core2/generated-world.ts";
  if (file === "src/core2/tooling/money-watch.ts")
    return "src/bench/dev-money-watch.ts";
  // The day-one world's last sittings run through the bill engine (src/bench/world.ts
  // calls it at the start of every world): a world-start step, in the past engine's files.
  if (file === "src/core2/tooling/past-sessions.ts")
    return "src/core2/past-sessions.ts";
  if (file === "src/core2/tooling/test-days.ts")
    return "tests/support/test-days.ts";
  if (file === "src/core2/tooling/world-with.ts")
    return "tests/support/world-with.ts";
  if (file === "src/core2/tooling/fixtures/event-inputs.json")
    return "tests/fixtures/event-inputs.json";
  if (file.startsWith("src/core2/tooling/"))
    return `scripts/core2/tooling/${file.slice("src/core2/tooling/".length)}`;
  if (/^src\/core2\/[^/]+(?:-kit|-fixture)\.ts$/.test(file))
    return `tests/support/${path.posix.basename(file)}`;
  if (file === "src/core2/law-test-start.ts")
    return "tests/support/law-test-start.ts";
  if (
    file === "src/core2/bug-report.ts" ||
    file === "src/core2/gov-test-report.ts" ||
    // Checks no game file imports (the CTO's addition, Nov 27): the kit
    // patterns miss them.
    file === "src/core2/trait-pairs.ts" ||
    file === "src/core2/turnover-check.ts" ||
    file === "src/core2/circle-turnover-check.ts"
  )
    return `scripts/core2/${path.posix.basename(file)}`;
  // The screens' milestone proofs and tools (screens map SC6, the CTO's Nov 27
  // 12:36 a.m. line): no game file imports them.
  if (
    /^src\/bench\/(?:m0-check|m1-1[0-4]-check|m1-11-named|m1-11-occurred|m2-03-check|m2-10-check|m2-10-seating|jump-end-check)(?:\.test)?\.ts$/.test(
      file,
    ) ||
    file === "src/bench/store-shots.mjs" ||
    file === "src/bench/verify.mjs" ||
    file === "src/bench/integration-heads.json"
  )
    return `scripts/bench/${path.posix.basename(file)}`;
  // The hand-run golden-path walk sits with the golden-path suite that imports it.
  if (
    file === "src/bench/path-check.ts" ||
    file === "src/bench/path-check-step-11.test.ts"
  )
    return `tests/golden-path/${path.posix.basename(file)}`;
  return null;
}

const moves = new Map<string, string>();
const deletes: string[] = [];
for (const file of tracked) {
  const to = destination(file);
  if (to === "delete") deletes.push(file);
  else if (to) moves.set(file, to);
}
for (const [from, to] of moves) {
  if (trackedSet.has(to))
    throw new Error(`${to} already exists; ${from} cannot move there.`);
}

if (process.argv.includes("--plan")) {
  for (const [from, to] of moves) console.log(`${from} -> ${to}`);
  for (const file of deletes) console.log(`${file} -> deleted`);
  console.log(`${moves.size} moves, ${deletes.length} deleted`);
  process.exit(0);
}

const CODE = /\.(?:ts|tsx|mts|mjs|js|cjs)$/;
const EXTENSIONS = [".ts", ".tsx", ".mts", ".mjs", ".js", ".cjs", ".json"];

/** The tracked file a relative specifier written in `from` names, and how it was written. */
function resolveSpecifier(
  from: string,
  specifier: string,
): { file: string; style: "exact" | "bare" | "index" } | null {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), specifier),
  );
  if (trackedSet.has(base)) return { file: base, style: "exact" };
  // `./x.js` written for `./x.ts`.
  const stripped = base.replace(/\.(?:js|mjs|cjs)$/, "");
  if (stripped !== base)
    for (const ext of EXTENSIONS)
      if (trackedSet.has(stripped + ext))
        return { file: stripped + ext, style: "exact" };
  for (const ext of EXTENSIONS)
    if (trackedSet.has(base + ext)) return { file: base + ext, style: "bare" };
  for (const ext of EXTENSIONS)
    if (trackedSet.has(`${base}/index${ext}`))
      return { file: `${base}/index${ext}`, style: "index" };
  return null;
}

/** `from "./x"`, `import("./x")`, `import "./x"`, `require("./x")`, `vi.mock("./x"`, `new URL("./x"`. */
const SPECIFIER =
  /((?:\bfrom|\bimport|\brequire|\bvi\.(?:mock|doMock|importActual)|\bnew URL)\s*\(?\s*)(["'])(\.{1,2}\/[^"'\n]*)\2/g;

function rewriteCode(file: string, text: string): string {
  const newFile = moves.get(file) ?? file;
  return text.replace(
    SPECIFIER,
    (whole, lead: string, quote: string, specifier: string) => {
      const hit = resolveSpecifier(file, specifier);
      if (!hit) return whole;
      const newTarget = moves.get(hit.file) ?? hit.file;
      if (newFile === file && newTarget === hit.file) return whole;
      let target = newTarget;
      if (hit.style === "bare") target = target.replace(/\.[^./]+$/, "");
      else if (hit.style === "index") target = path.posix.dirname(target);
      else if (/\.(?:js|mjs|cjs)$/.test(specifier))
        target = target.replace(/\.[^./]+$/, specifier.match(/\.[^./]+$/)![0]);
      let relative = path.posix.relative(path.posix.dirname(newFile), target);
      if (!relative.startsWith(".")) relative = `./${relative}`;
      return `${lead}${quote}${relative}${quote}`;
    },
  );
}

/** Text that records where something was is history, not a pointer: it stays as written. */
const LEDGER =
  /^(?:docs\/coordination\/|docs\/pool\/items\/|docs\/plans\/completed\/|docs\/stopgaps\/triage|scripts\/core2-guard\/evidence\/)|(?:^|\/)OWNER-DECISIONS|prior-rulings\//;
const TEXT =
  /\.(?:ts|tsx|mts|mjs|js|cjs|json|md|yml|yaml|txt|mdc)$|^\.github\/CODEOWNERS$/;

/** Longest first, so a file moved on its own wins over its folder. */
const paths = [...moves].sort((a, b) => b[0].length - a[0].length);
const FOLDER_FROM = "src/core2/tooling/";
const FOLDER_TO = "scripts/core2/tooling/";

function rewriteText(text: string): string {
  let out = text;
  for (const [from, to] of paths) out = out.split(from).join(to);
  // A folder written whole ("src/core2/tooling/**", a prefix) follows the folder.
  out = out.split(FOLDER_FROM).join(FOLDER_TO);
  return out;
}

let changed = 0;
for (const file of tracked) {
  if (!TEXT.test(file)) continue;
  const isCode = CODE.test(file);
  if (!isCode && LEDGER.test(file)) continue;
  const original = readFileSync(path.join(ROOT, file), "utf8");
  let text = isCode ? rewriteCode(file, original) : original;
  if (!LEDGER.test(file) && file !== "scripts/core/move-workshop.ts")
    text = rewriteText(text);
  if (text !== original) {
    writeFileSync(path.join(ROOT, file), text);
    changed += 1;
  }
}

for (const [from, to] of moves) {
  mkdirSync(path.join(ROOT, path.dirname(to)), { recursive: true });
  git("mv", from, to);
}
for (const file of deletes) git("rm", "-q", file);

/** Paths written in pieces (`join(root, "src", "core2", "tooling", ...)`), which no search for the whole path finds. */
const PIECEWISE: [file: string, from: string, to: string][] = [
  [
    "scripts/core2/tooling/tripwires.ts",
    `    "src",
    "core2",
    "tooling",
    "calibration-targets.json",`,
    `    "scripts",
    "core2",
    "tooling",
    "calibration-targets.json",`,
  ],
];
for (const [file, from, to] of PIECEWISE) {
  const full = path.join(ROOT, moves.get(file) ?? file);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, "utf8");
  if (text.includes(from)) writeFileSync(full, text.replace(from, to));
}

/** What the guards read by path: drop what left src, add what stayed in the game. */
function editJson(file: string, edit: (data: any) => void): void {
  const full = path.join(ROOT, file);
  const data = JSON.parse(readFileSync(full, "utf8"));
  edit(data);
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
}
const outsideSrc = (entry: string) => /^(?:scripts|tests)\//.test(entry);
editJson("tests/guards/families.json", (map) => {
  map.shared = map.shared.filter((entry: string) => !outsideSrc(entry));
  // Both were exempt as tooling; they stay exempt (no baseline rises) until
  // item 3 gives each its family.
  for (const stayed of [
    "src/core2/generated-world.ts",
    "src/core2/past-sessions.ts",
  ])
    if (!map.shared.includes(stayed)) map.shared.push(stayed);
  for (const family of map.families) {
    family.paths = family.paths.filter((entry: string) => !outsideSrc(entry));
    family.entry = family.entry.filter((entry: string) => !outsideSrc(entry));
  }
});
for (const file of [
  "tests/guards/english/line-register-baseline.json",
  "tests/guards/families-baseline.json",
  "tests/guards/determinism-baseline.json",
  "tests/guards/engine-tables-baseline.json",
]) {
  if (!existsSync(path.join(ROOT, file))) continue;
  editJson(file, (data) => {
    const strip = (table: Record<string, unknown>) => {
      for (const key of Object.keys(table))
        if (outsideSrc(key)) delete table[key];
    };
    for (const value of Object.values(data))
      if (Array.isArray(value)) {
        const kept = value.filter(
          (entry) => typeof entry !== "string" || !outsideSrc(entry),
        );
        value.splice(0, value.length, ...kept);
      } else if (value && typeof value === "object")
        strip(value as Record<string, unknown>);
    if (!Array.isArray(data)) strip(data);
  });
}
dropFromEnglishGuards();
recordReplaced();
editTsconfig();
execFileSync("node", ["--import", "tsx", "scripts/guards/codeowners.ts"], {
  stdio: "inherit",
});

/** docs/current.json: every path that was replaced, with what stands in its place (skill current-pointers). */
function recordReplaced(): void {
  const full = path.join(ROOT, "docs/current.json");
  const data = JSON.parse(readFileSync(full, "utf8"));
  const known = new Set(data.replaced.map((row: { old: string }) => row.old));
  const why =
    "Core item 2 (core audit K9): the workshop is out of the game's source; scripts/core/move-workshop.ts made the move.";
  const rows: { old: string; now: string }[] = [
    {
      old: "src/core2/tooling/",
      now: "scripts/core2/tooling/ (generated-world.ts is src/core2/generated-world.ts, past-sessions.ts is src/core2/past-sessions.ts, money-watch.ts is src/bench/dev-money-watch.ts, test-days.ts and world-with.ts are in tests/support/, fixtures/event-inputs.json is tests/fixtures/event-inputs.json)",
    },
  ];
  for (const [from, to] of moves)
    if (!(from.startsWith(FOLDER_FROM) && to.startsWith(FOLDER_TO)))
      rows.push({ old: from, now: to });
  for (const file of deletes)
    rows.push({
      old: file,
      now: "nothing: no file read it, and its include no longer meant anything",
    });
  for (const row of rows)
    if (!known.has(row.old))
      data.replaced.push({ ...row, when: "2026-11-27", why });
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
}

/**
 * The English guards keep lists keyed by a source file they scan; a file that
 * left src is no longer scanned, so its entries go with it.
 */
function dropFromEnglishGuards(): void {
  const movedTo = new Set(moves.values());
  const exempt = path.join(ROOT, "scripts/words/line-register-exempt.json");
  if (existsSync(exempt)) {
    const data = JSON.parse(readFileSync(exempt, "utf8"));
    for (const [key, value] of Object.entries(data))
      if (Array.isArray(value))
        data[key] = value.filter(
          (entry: { file?: string }) => !entry.file || !movedTo.has(entry.file),
        );
    writeFileSync(exempt, JSON.stringify(data, null, 2) + "\n");
  }
  const allowlist = path.join(ROOT, "tests/guards/english/allowlist.ts");
  if (existsSync(allowlist)) {
    let text = readFileSync(allowlist, "utf8");
    for (const file of movedTo)
      text = text.replace(
        new RegExp(
          `(?:  //[^\\n]*\\n)*  "${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}": \\d+,\\n`,
        ),
        "",
      );
    writeFileSync(allowlist, text);
  }
}

/**
 * The moved scripts and test support are still type-checked, in the project
 * that holds the game's source (they import it; tsconfig.node.json is a
 * composite project that may not).
 */
function editTsconfig(): void {
  const full = path.join(ROOT, "tsconfig.app.json");
  const config = JSON.parse(readFileSync(full, "utf8"));
  const add = (list: string[], entries: string[]) => {
    for (const entry of entries) if (!list.includes(entry)) list.push(entry);
  };
  add(config.include, ["scripts/core2/**/*.ts", "scripts/bench/**/*.ts"]);
  add(config.exclude, [
    "scripts/core2/**/*.test.ts",
    "scripts/bench/**/*.test.ts",
  ]);
  const support = [...moves.values()]
    .filter((to) => /^tests\/support\/[^/]+\.ts$/.test(to))
    .sort();
  add(config.files, [...support, "tests/golden-path/path-check.ts"]);
  writeFileSync(full, JSON.stringify(config, null, 2) + "\n");
}

console.log(
  `${moves.size} files moved, ${deletes.length} deleted, ${changed} files rewritten`,
);
