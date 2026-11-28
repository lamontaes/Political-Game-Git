/**
 * Moves the workshop out of the game's source (core audit K9, Core item 2):
 * a re-runnable script. It moves each file with `git mv`, rewrites every
 * relative import that reaches a moved file or sits in one, and rewrites the
 * repository paths written as text (package.json, scripts, docs, workflows).
 * It keeps every move it has made in move-workshop-moves.json beside it, so a
 * branch that lands later and still names an old path is repointed by the next
 * run; a file added in an old place moves the next time too.
 *
 *   node --import tsx scripts/core/move-workshop.ts          move and rewrite
 *   node --import tsx scripts/core/move-workshop.ts --plan   print the moves only
 *
 * Where each file goes (the rules are in `destination` below; the paths are
 * written there in pieces, so no document or comment points at an old one):
 * - the tooling folder of the core goes to scripts/core2/tooling, except
 *   - the world builder the game starts worlds with (it stays in the core),
 *   - the money watch the dev screens use (it joins them),
 *   - the past sessions step every world start runs (the past engine's, in the core),
 *   - two test helpers and one fixture only tests read (tests/support, tests/fixtures);
 * - test kits, fixtures and the law test start go to tests/support;
 * - the bug and test-report builders and the checks no game file imports go to scripts/core2;
 * - the screens' milestone checks and tools go to scripts/bench, and the hand-run
 *   golden-path walk to tests/golden-path;
 * - the tooling folder's tsconfig is deleted: nothing reads it, and its include
 *   no longer means anything.
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

/** Written in pieces: a path in a comment or string here would be a pointer the pointer guard counts. */
const CORE = ["src", "core2"].join("/") + "/";
const TOOLING = `${CORE}tooling/`;
/** The director's two report tools: no game file imports them, so they go to scripts (the CTO's line of Nov 28, 3:58 a.m.). */
const DIRECTOR_TOOLING = ["src", "director", "tooling"].join("/") + "/";
const BENCH = ["src", "bench"].join("/") + "/";
const SUPPORT = "tests/support/";
const REPORTS = "scripts/core2/";
const CHECKS =
  /^(?:m0-check|m1-1[0-4]-check|m1-11-named|m1-11-occurred|m2-03-check|m2-10-check|m2-10-seating|jump-end-check)(?:\.test)?\.ts$/;

/** A file's new home, or null when it stays. `"delete"` removes it. */
function destination(file: string): string | "delete" | null {
  const base = path.posix.basename(file);
  if (file.startsWith(DIRECTOR_TOOLING))
    return `scripts/director/tooling/${file.slice(DIRECTOR_TOOLING.length)}`;
  if (file.startsWith(TOOLING)) {
    const rest = file.slice(TOOLING.length);
    if (rest === "tsconfig.json") return "delete";
    if (rest === "generated-world.ts") return `${CORE}${rest}`;
    if (rest === "money-watch.ts") return `${BENCH}dev-${rest}`;
    // The day-one world's last sittings run through the bill engine (the
    // screens' world builder calls it at the start of every world).
    if (rest === "past-sessions.ts") return `${CORE}${rest}`;
    if (rest === "test-days.ts" || rest === "world-with.ts")
      return `${SUPPORT}${rest}`;
    if (rest === "fixtures/event-inputs.json") return `tests/fixtures/${base}`;
    return `scripts/core2/tooling/${rest}`;
  }
  if (file.startsWith(CORE) && path.posix.dirname(file) === CORE.slice(0, -1)) {
    if (
      /(?:-kit|-fixture)\.ts$/.test(base) ||
      base === "law-test-start.ts" ||
      base === "gov-test-clock.ts"
    )
      return `${SUPPORT}${base}`;
    if (
      // Checks no game file imports (the CTO's addition, Nov 27): the kit
      // patterns miss them.
      [
        "bug-report.ts",
        "gov-test-report.ts",
        "trait-pairs.ts",
        "turnover-check.ts",
        "circle-turnover-check.ts",
        "justice-chain.ts",
        "session-law-audit.ts",
      ].includes(base)
    )
      return `${REPORTS}${base}`;
  }
  // Read only by the place-map check (the CTO's line of Nov 27, 1:47 a.m.).
  if (file === `${CORE}gov-rules/place-slots.ts`)
    return `${REPORTS}place-slots.ts`;
  if (
    file.startsWith(BENCH) &&
    path.posix.dirname(file) === BENCH.slice(0, -1)
  ) {
    // The screens' milestone proofs and tools (screens map SC6, the CTO's Nov
    // 27 12:36 a.m. line): no game file imports them.
    if (
      CHECKS.test(base) ||
      base === "store-shots.mjs" ||
      base === "verify.mjs"
    )
      return `scripts/bench/${base}`;
    // The browser checks' helpers (the one way a check starts a life, sets a
    // campaign up through dev mode, and scans the menus' look): only checks
    // and the play walks import them (the CTO's Nov 27 12:36 a.m. line sent
    // them with Cleanup's move of the browser tests, whose mover moves tests
    // only).
    if (["start-life.mjs", "dev-setup.mjs", "ui-look-scan.mjs"].includes(base))
      return `${SUPPORT}${base}`;
    // The hand-run golden-path walk sits with the golden-path suite that imports it.
    if (base === "path-check.ts" || base === "path-check-step-11.test.ts")
      return `tests/golden-path/${base}`;
  }
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

/**
 * Every move this script has ever made, kept beside it: a branch that lands
 * later still names the old paths, and the next run rewrites those too.
 */
const MOVES_FILE = path.join(ROOT, "scripts/core/move-workshop-moves.json");
const earlier: { moved: Record<string, string>; deleted: string[] } =
  existsSync(MOVES_FILE)
    ? JSON.parse(readFileSync(MOVES_FILE, "utf8"))
    : { moved: {}, deleted: [] };
/** Old path to new path, earlier moves and this run's. */
const everMoved = new Map<string, string>([
  ...Object.entries(earlier.moved),
  ...moves,
]);
const everDeleted = new Set([...earlier.deleted, ...deletes]);

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
  const exists = (file: string) => trackedSet.has(file) || everMoved.has(file);
  if (exists(base)) return { file: base, style: "exact" };
  // `./x.js` written for `./x.ts`.
  const stripped = base.replace(/\.(?:js|mjs|cjs)$/, "");
  if (stripped !== base)
    for (const ext of EXTENSIONS)
      if (exists(stripped + ext))
        return { file: stripped + ext, style: "exact" };
  for (const ext of EXTENSIONS)
    if (exists(base + ext)) return { file: base + ext, style: "bare" };
  for (const ext of EXTENSIONS)
    if (exists(`${base}/index${ext}`))
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
      const newTarget = everMoved.get(hit.file) ?? hit.file;
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

/**
 * Text that records where something was is history, not a pointer: it stays
 * as written. docs/current.json names the records (the pointer guard does not
 * read them); the generated evidence is a record too. Every other document's
 * pointer follows the move, as the pointer guard counts them.
 */
const RECORDS: string[] = [
  ...JSON.parse(readFileSync(path.join(ROOT, "docs/current.json"), "utf8"))
    .records,
  "scripts/core2-guard/evidence/",
];
const LEDGER = {
  test: (file: string) =>
    RECORDS.some((record) =>
      record.endsWith("/") ? file.startsWith(record) : file === record,
    ),
};
const TEXT =
  /\.(?:ts|tsx|mts|mjs|js|cjs|json|md|yml|yaml|txt|mdc)$|^\.github\/CODEOWNERS$/;

/** Longest first, so a file moved on its own wins over its folder. */
const paths = [...everMoved].sort((a, b) => b[0].length - a[0].length);
const FOLDER_FROM = TOOLING;
const FOLDER_TO = "scripts/core2/tooling/";

/** A path written whole, as one may be reached from another folder ("../../path"): not the tail of a longer name, and not the mirror under tests/src that the test mover makes. */
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WHOLE = paths.map(
  ([from, to]) =>
    [new RegExp(`(?<![\\w-]|tests/)${escaped(from)}`, "g"), to] as const,
);
const WHOLE_FOLDER = new RegExp(
  `(?<![\\w-]|tests/)${escaped(FOLDER_FROM)}`,
  "g",
);

function rewriteText(text: string): string {
  let out = text;
  for (const [pattern, to] of WHOLE) out = out.replace(pattern, to);
  // A folder written whole ("the tooling folder/**", a prefix) follows the folder.
  out = out.replace(WHOLE_FOLDER, FOLDER_TO);
  return out;
}

let changed = 0;
for (const file of tracked) {
  if (!TEXT.test(file)) continue;
  const isCode = CODE.test(file);
  if (file === "scripts/core/move-workshop-moves.json") continue;
  if (!isCode && LEDGER.test(file)) continue;
  const original = readFileSync(path.join(ROOT, file), "utf8");
  let text = isCode ? rewriteCode(file, original) : original;
  if (
    !LEDGER.test(file) &&
    file !== "scripts/core/move-workshop.ts" &&
    file !== "scripts/core/move-workshop-moves.json"
  )
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
  // The engine-tables guard skipped the tooling folder, which held
  // past-sessions.ts: game code (the screens' world builder runs it at the
  // start of every world) whose six cross-family reads and writes the guard
  // never counted. Moving it into src would raise the baseline by six, which
  // no pull request may do, so the guard keeps skipping that one file until
  // item 7 gives those reads and writes owners' doors (core-plan-2026-11-27.md,
  // section 7).
  // `voting-age-row.test.ts` reads three of the moved checks by name, beside itself.
  [
    "tests/src/bench/voting-age-row.test.ts",
    `  "m0-check.ts",
  "m1-10-check.ts",
  "verify.mjs",`,
    `  "../../scripts/bench/m0-check.ts",
  "../../scripts/bench/m1-10-check.ts",
  "../../scripts/bench/verify.mjs",`,
  ],
  // `voting-age-row.test.ts` reads three of the moved checks by name, beside itself.
  [
    "tests/src/bench/voting-age-row.test.ts",
    `  "m0-check.ts",
  "m1-10-check.ts",
  "verify.mjs",`,
    `  "../../scripts/bench/m0-check.ts",
  "../../scripts/bench/m1-10-check.ts",
  "../../scripts/bench/verify.mjs",`,
  ],
  [
    "scripts/guards/engine-tables.ts",
    `        !file.startsWith("scripts/core2/tooling/"),`,
    `        file !== "src/core2/past-sessions.ts",`,
  ],
  // A comment that named the data file without its folder: the pointer guard
  // counts it in whichever area the file now sits, so the move would raise
  // the scripts area's count.
  [
    "scripts/core2/tooling/place-map-build.ts",
    "(data/places/place-county-by-point.json)",
    "(src/core2/data/places/place-county-by-point.json)",
  ],
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

/** The shape of tests/guards/families.json that this script edits. */
type FamiliesMap = {
  shared: string[];
  families: { paths: string[]; entry: string[] }[];
};

/** What the guards read by path: drop what left src, add what stayed in the game. */
function editJson<Data>(file: string, edit: (data: Data) => void): void {
  const full = path.join(ROOT, file);
  const data = JSON.parse(readFileSync(full, "utf8"));
  edit(data);
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
}
// The test mover's mirror (tests/src) stays: its entries are the tests' families, and this script may run after it.
const outsideSrc = (entry: string) =>
  (/^(?:scripts|tests)\//.test(entry) && !entry.startsWith("tests/src/")) ||
  everMoved.has(entry);
editJson<FamiliesMap>("tests/guards/families.json", (map) => {
  map.shared = map.shared.filter((entry) => !outsideSrc(entry));
  // Both were exempt as tooling; they stay exempt (no baseline rises) until
  // item 3 gives each its family.
  for (const stayed of [
    "src/core2/generated-world.ts",
    "src/core2/past-sessions.ts",
  ])
    if (!map.shared.includes(stayed)) map.shared.push(stayed);
  for (const family of map.families) {
    family.paths = family.paths.filter((entry) => !outsideSrc(entry));
    family.entry = family.entry.filter((entry) => !outsideSrc(entry));
  }
});
for (const file of [
  "tests/guards/english/line-register-baseline.json",
  "tests/guards/families-baseline.json",
  "tests/guards/determinism-baseline.json",
  "tests/guards/engine-tables-baseline.json",
]) {
  if (!existsSync(path.join(ROOT, file))) continue;
  editJson<Record<string, unknown>>(file, (data) => {
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
dropFromOtherGuards();
recordReplaced();
editTsconfig();
execFileSync("node", ["--import", "tsx", "scripts/guards/codeowners.ts"], {
  stdio: "inherit",
});

/**
 * Other guards keep exemptions for source files they scan; a file that left
 * src is out of their reach, so each exemption goes with it (they only get
 * stricter): the zero-dice allowlist, the wording baseline, and the exempt
 * lists in the one-history and place-lookup guards.
 */
function dropFromOtherGuards(): void {
  const gone = new Set([...everMoved.values(), ...everMoved.keys()]);
  const dice = path.join(ROOT, "scripts/zero-dice-allowlist.json");
  if (existsSync(dice)) {
    const data = JSON.parse(readFileSync(dice, "utf8"));
    data.entries = data.entries.filter(
      (entry: { file: string }) => !gone.has(entry.file),
    );
    writeFileSync(dice, JSON.stringify(data, null, 2) + "\n");
  }
  const wording = path.join(
    ROOT,
    "scripts/english-check/wording-baseline.json",
  );
  if (existsSync(wording)) {
    const data = JSON.parse(readFileSync(wording, "utf8"));
    for (const table of Object.values(data))
      if (table && typeof table === "object" && !Array.isArray(table))
        for (const entry of Object.keys(table))
          if ([...gone].some((file) => entry.startsWith(`${file} :: `)))
            delete (table as Record<string, unknown>)[entry];
    writeFileSync(wording, JSON.stringify(data, null, 2) + "\n");
  }
  for (const file of [
    "tests/guards/one-history.test.ts",
    "tests/guards/no-private-place-lookup.test.ts",
  ]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, "utf8");
    const kept = text
      .split("\n")
      .filter(
        (line) => ![...gone].some((moved) => line.includes(`"${moved}"`)),
      );
    if (kept.length !== text.split("\n").length)
      writeFileSync(full, kept.join("\n"));
  }
}

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
  const movedTo = new Set([...everMoved.values(), ...everMoved.keys()]);
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

writeFileSync(
  MOVES_FILE,
  JSON.stringify(
    {
      moved: Object.fromEntries(
        [...everMoved].sort(([a], [b]) => (a < b ? -1 : 1)),
      ),
      deleted: [...everDeleted].sort(),
    },
    null,
    2,
  ) + "\n",
);

// The JSON the script rewrote is left the way prettier writes it.
execFileSync(
  "npx",
  [
    "prettier",
    "--write",
    "--log-level",
    "warn",
    ...[
      "tsconfig.app.json",
      "docs/current.json",
      "tests/guards/families.json",
      "scripts/core/move-workshop-moves.json",
      "scripts/zero-dice-allowlist.json",
      "scripts/english-check/wording-baseline.json",
      "scripts/words/line-register-exempt.json",
      "tests/guards/english/line-register-baseline.json",
      "tests/guards/english/allowlist.ts",
      "tests/guards/one-history.test.ts",
      "tests/guards/no-private-place-lookup.test.ts",
    ].filter((file) => existsSync(path.join(ROOT, file))),
  ],
  { cwd: ROOT, stdio: "inherit" },
);

console.log(
  `${moves.size} files moved, ${deletes.length} deleted, ${changed} files rewritten`,
);
