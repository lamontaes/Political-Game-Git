// Builds docs/pool/INDEX.md from docs/pool/items/*.md. `--check` fails when the index is stale or an item is invalid.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  branchPrefix,
  identify,
  identityFile,
  levelOf,
  readTiers,
  tierOfLevel,
} from "./agent";
import {
  NOTE_PLACEHOLDER,
  chooseNoteId,
  prBody,
  prTitle,
  releaseNote,
} from "./draft-pr";
import {
  claimable,
  DEFAULT_ORDER,
  inKind,
  makeOrder,
  type Order,
  readOrder,
  timeBoxHours,
  visibleRank,
} from "./order";
import {
  needsCause,
  readRoots,
  repoAt,
  feedsId,
  section,
  standardProblems,
  seenLine,
} from "./standard";

export { section };

export const AREAS = [
  "laws",
  "gov",
  "elections",
  "office",
  "world",
  "core",
  "people",
  "director",
  "words",
  "play",
  "art",
  "release",
  "docs",
];
export const KINDS = [
  "bug",
  "feature",
  "wiring",
  "stopgap",
  "research",
  "cleanup",
  "owner-decision",
];
export const STATUSES = [
  "open",
  "claimed",
  "in-pr",
  "merged",
  "blocked",
  "done",
  "dropped",
];
/**
 * `merged`: the work is on main and no second session has seen it in the
 * running game yet. Only `pool seen` (or the CTO, for work with no running-game
 * check) makes an item `done` (owner, Nov 3: "nothing is done until a second
 * session replays its finish line on main").
 */
const ON_MAIN = ["merged", "done"];
/** An `after:` gate opens when the item it names is on main: checkers never hold work. */
export const gateOpen = (status: string | undefined): boolean =>
  ON_MAIN.includes(status ?? "");
export const PRIORITIES = ["1", "2", "3"];
/** A name git and the pool accept for a branch: no spaces, not starting with a dash. */
const BRANCH = /^[\w.][\w./-]*$/;
export const SIZES = ["S", "M", "L"];
const sizeOf = (i: { size?: string }): string => i.size || "M";

export interface Item {
  id: string;
  title: string;
  area: string;
  kind: string;
  priority: string;
  status: string;
  "claimed-by": string;
  pr: string;
  "blocked-on": string;
  size: string;
  [key: string]: string;
}

/** Reads the front matter: `key: value`, optional double quotes (JSON), trailing ` # comment` ignored. */
export function parseFrontMatter(text: string): Record<string, string> | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const c = line.indexOf(":");
    if (c < 1 || /^\s/.test(line)) continue;
    let v = line.slice(c + 1).trim();
    if (v.startsWith('"')) {
      try {
        v = String(JSON.parse(/^"(?:[^"\\]|\\.)*"/.exec(v)?.[0] ?? v));
      } catch {
        /* keep raw */
      }
    } else if (v.startsWith("'"))
      v = v.replace(/^'(.*)'.*$/, "$1").replace(/''/g, "'");
    else v = v.replace(/\s+#.*$/, "").trim();
    out[line.slice(0, c).trim()] = v;
  }
  return out;
}

export function validate(
  file: string,
  fm: Record<string, string> | null,
): string[] {
  if (!fm) return [`${file}: no front matter`];
  const errs: string[] = [];
  const stem = file.replace(/\.md$/, "");
  if (fm.id !== stem)
    errs.push(`${file}: id "${fm.id ?? ""}" must equal the file name`);
  if (!fm.title) errs.push(`${file}: title is required`);
  const enums: [string, string[]][] = [
    ["area", AREAS],
    ["kind", KINDS],
    ["priority", PRIORITIES],
    ["status", STATUSES],
  ];
  for (const [k, ok] of enums)
    if (!ok.includes(fm[k] ?? ""))
      errs.push(
        `${file}: ${k} "${fm[k] ?? ""}" is not one of ${ok.join(" | ")}`,
      );
  if (fm.size && !SIZES.includes(fm.size))
    errs.push(`${file}: size "${fm.size}" is not one of ${SIZES.join(" | ")}`);
  if (fm.status === "claimed" && !fm["claimed-by"])
    errs.push(`${file}: claimed-by is required when status is claimed`);
  if (fm.status === "in-pr" && !fm.pr)
    errs.push(`${file}: pr is required when status is in-pr`);
  if (fm.branch && !BRANCH.test(fm.branch))
    errs.push(`${file}: branch "${fm.branch}" is not a branch name`);
  return errs;
}

export const STANDING_RULES = [
  "No dice",
  "Sliding scales and causes",
  "One rule, all 56 places",
  "Estimate, never UNKNOWN",
  "Wire to the world",
  "This is a game, not a spreadsheet",
  "An effect is a read, not a record",
  "Replace, never layer",
  "One model, two tiers",
  "The chain is the acceptance",
  "Look before you ask",
  "Ask why",
  "No hand-written player text",
  "Research before building",
  "Speed",
  "American English",
];
const DONE_WORDS = [
  "drawn place",
  "played world",
  "record id",
  "buildBenchWorld",
  "test",
  "screenshot",
];

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Quality gate for open or claimed priority 1 and 2 items, and play-first items at any priority. Returns "<id>: <field> ..." problems. */
export function quality(
  file: string,
  fm: Record<string, string>,
  text: string,
): string[] {
  const id = file.replace(/\.md$/, "");
  const live = ["open", "claimed"].includes(fm.status);
  // The play-first lane (docs/play-first/README.md): every item is time-boxed
  // at four hours or less and says what the owner will see, at any priority.
  const lane: string[] = [];
  if (live && fm.milestone === "play-first") {
    const box = /^(\d+(?:\.\d+)?) hours?\b/.exec(section(text, "Time box"));
    if (!box || Number(box[1]) <= 0 || Number(box[1]) > 4)
      lane.push(`${id}: a play-first item needs a Time box of 4 hours or less`);
    for (const name of ["You will see", "Screenshot"])
      if (!section(text, name))
        lane.push(`${id}: a play-first item needs its ${name} line`);
  }
  if (!live || !["1", "2"].includes(fm.priority)) return lane;
  const errs: string[] = [...lane];
  const what = section(text, "What");
  const sentences = what.split(/[.!?](?:\s|$)/).filter((x) => x.trim()).length;
  if (sentences < 3 || words(what) < 40)
    errs.push(
      `${id}: What needs at least 3 sentences and 40 words (has ${sentences} and ${words(what)})`,
    );
  const rules = section(text, "Rules");
  const ok = STANDING_RULES.some((r) => {
    const at = rules.toLowerCase().indexOf(r.toLowerCase());
    return at >= 0 && words(rules.slice(at + r.length)) >= 6;
  });
  if (!ok)
    errs.push(
      `${id}: Rules must name a standing rule with at least 6 words after it saying how it applies`,
    );
  const done = section(text, "Done when");
  if (words(done) < 25 || !DONE_WORDS.some((w) => done.includes(w)))
    errs.push(
      `${id}: Done when needs 25 words and one of ${DONE_WORDS.join(", ")}`,
    );
  if (/#\d+/.test(done) && !fm.after && !fm["blocked-on"])
    errs.push(
      `${id}: Done when names a PR number; use after: or blocked-on: instead`,
    );
  if (!/[\w.-]+\/[\w./-]+/.test(section(text, "Files")))
    errs.push(`${id}: Files must name at least one path`);
  return errs;
}

const ids = (v?: string): string[] =>
  (v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const cell = (s: string): string => (s || "").replace(/\|/g, "\\|");

const prLink = (pr: string): string =>
  pr
    ? pr.replace(
        /^#(\d+)$/,
        "[#$1](https://github.com/lamontaes/Political-Game-Git/pull/$1)",
      )
    : "no PR";

/** Items `next` may take, in the order, for each level of order.json. */
export function readyByModel(
  items: Item[],
  order: Order = DEFAULT_ORDER,
): Map<string, Item[]> {
  const onMain = new Set(
    items.filter((i) => gateOpen(i.status)).map((i) => i.id),
  );
  const known = new Set(items.map((i) => i.id));
  const cmp = makeOrder(items, order);
  const ready = items.filter((i) => claimable(i, onMain, known)).sort(cmp);
  return new Map(
    order.levels.map((l) => [l, ready.filter((i) => i.model === l)]),
  );
}

export function buildIndex(
  items: Item[],
  order: Order = DEFAULT_ORDER,
): string {
  const onMainIds = new Set(
    items.filter((i) => gateOpen(i.status)).map((i) => i.id),
  );
  const waiting = (i: Item): string[] =>
    ids(i.after).filter((a) => !onMainIds.has(a));
  const gated = (i: Item): boolean =>
    i.status === "open" && waiting(i).length > 0;
  const by = (s: string): Item[] =>
    items.filter((i) => i.status === s && !gated(i));
  const cmp = makeOrder(items, order);
  const sorted = (xs: Item[]): Item[] => [...xs].sort(cmp);
  const ready = readyByModel(items, order);
  const gatedItems = items.filter(gated);
  const needs = items.filter(
    (i) => i["needs-cause"] === "1" && ["open", "blocked"].includes(i.status),
  );
  const live = items.filter((i) => ["open", "blocked"].includes(i.status));
  const atStandard = live.filter((i) => i.standard === "2").length;
  // Oldest merge first. An item with no merged-at was merged before the stamp
  // existed, so it is older than any stamped one.
  const merged = items
    .filter((i) => i.status === "merged")
    .sort(
      (a, b) =>
        (a["merged-at"] || "").localeCompare(b["merged-at"] || "") ||
        a.id.localeCompare(b.id),
    );
  const counts = STATUSES.map(
    (s) => `${items.filter((i) => i.status === s).length} ${s}`,
  ).join(", ");
  const table = (xs: Item[]): string[] => [
    "| id | title | area | lead | kind | priority | size | claimed-by | pr | blocked-on |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...sorted(xs).map(
      (i) =>
        `| [${i.id}](items/${i.id}.md) | ${cell(i.title)} | ${i.area} | ${cell(i.lead)} | ${i.kind} | ${i.priority} | ${sizeOf(i)} | ${cell(i["claimed-by"])} | ${cell(i.pr)} | ${cell(i["blocked-on"])} |`,
    ),
  ];
  const out = [
    "# The pool",
    "",
    "Generated by `npm run pool`. Never edit by hand; see [README](README.md).",
    "",
    `**${items.length} items:** ${counts}.`,
    "",
    `**Standard:** ${atStandard} of ${live.length} open, gated and blocked items are at the standard.`,
    "",
    "## In PR (from pool items)",
    "",
    ...(by("in-pr").length
      ? sorted(by("in-pr")).map(
          (i) =>
            `- ${prLink(i.pr)}: ${cell(i.title)} ([${i.id}](items/${i.id}.md))`,
        )
      : ["None."]),
    "",
    `## Merged, waiting to be seen in the game (${merged.length})`,
    "",
    ...(merged.length
      ? merged.map(
          (i) =>
            `- [${i.id}](items/${i.id}.md) (${[
              i.area,
              i.lead ? `lead ${i.lead}` : "",
              i["merged-at"] ? `merged ${i["merged-at"].slice(0, 10)}` : "",
              prLink(i.pr),
            ]
              .filter(Boolean)
              .join(", ")}) — ${cell(i.title)}`,
        )
      : ["None."]),
    "",
    "## Next up",
    "",
    ...sorted(by("open").filter((i) => i["needs-cause"] !== "1"))
      .slice(0, 15)
      .map(
        (i, n) =>
          `${n + 1}. [${i.id}](items/${i.id}.md) (${i.area}${i.lead ? `, lead ${i.lead}` : ""}, ${i.kind}, p${i.priority}, ${sizeOf(i)}) — ${cell(i.title)}`,
      ),
    "",
    "## Ready by model",
    "",
    "What `npm run pool -- next` can take now, by the level each item names (an agent's tier maps to a level in tiers.json): open, checked by Fable, cause known, and waiting on nothing that is not on main. Each level counts only its own items; `next` takes lower levels when its own run out.",
    "",
    order.levels
      .map((l) => `**${l}:** ${ready.get(l)?.length ?? 0}`)
      .join(", ") + ".",
    "",
  ];
  for (const l of order.levels) {
    const xs = ready.get(l) ?? [];
    out.push(`### ${l} (${xs.length})`, "");
    out.push(
      ...(xs.length
        ? xs
            .slice(0, 15)
            .map(
              (i, n) =>
                `${n + 1}. [${i.id}](items/${i.id}.md) (${i.area}, p${i.priority}, ${i.effort || "no effort"}, ${sizeOf(i)}) — ${cell(i.title)}`,
            )
        : ["None."]),
      "",
    );
  }
  out.push(
    `## Needs cause (${needs.length})`,
    "",
    "Not built until Fable finds the fix (owner, Nov 10).",
    "",
    ...(needs.length
      ? sorted(needs).map(
          (i) =>
            `- [${i.id}](items/${i.id}.md) (${i.area}${i.lead ? `, lead ${i.lead}` : ""}, p${i.priority}, ${sizeOf(i)}) — ${cell(i.title)}`,
        )
      : ["None."]),
    "",
  );
  for (const s of ["open", "claimed", "in-pr", "blocked"]) {
    out.push(`## ${s} (${by(s).length})`, "");
    out.push(...(by(s).length ? table(by(s)) : ["None."]), "");
  }
  out.push("## Gated (waiting on another item)", "");
  out.push(
    ...(gatedItems.length
      ? sorted(gatedItems).map(
          (i) =>
            `- [${i.id}](items/${i.id}.md) (${i.area}, p${i.priority}, ${sizeOf(i)}) — waits on ${waiting(i).join(", ")}`,
        )
      : ["None."]),
    "",
  );
  for (const s of ["done", "dropped"]) {
    out.push(`## ${s} (${by(s).length})`, "");
    out.push(
      ...(by(s).length
        ? sorted(by(s)).map((i) => `- [${i.id}](items/${i.id}.md)`)
        : ["None."]),
      "",
    );
  }
  return out.join("\n");
}

/**
 * Reads a pool directory (the folder holding items/ and INDEX.md). Returns the index text and every problem.
 * `qualityOnly`, when given, limits the writing-quality checks to those item files; structure is checked everywhere.
 */
export function run(
  poolDir: string,
  check: boolean,
  qualityOnly?: ReadonlySet<string>,
  opts: { staleCheck?: boolean; writeIndex?: boolean } = {},
): { index: string; errors: string[]; warnings: string[]; items: Item[] } {
  const dir = join(poolDir, "items");
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const items: Item[] = [];
  const repo = repoAt(join(poolDir, "..", ".."));
  const roots = readRoots(poolDir);
  for (const f of files) {
    const text = readFileSync(join(dir, f), "utf8");
    const fm = parseFrontMatter(text);
    const errs = validate(f, fm);
    errors.push(...errs);
    if (!errs.length && fm && (!qualityOnly || qualityOnly.has(f)))
      warnings.push(
        ...quality(f, fm, text),
        ...standardProblems(f, fm, text, repo, roots),
      );
    if (!errs.length && fm) {
      const row: Record<string, string> = {
        "claimed-by": "",
        pr: "",
        "blocked-on": "",
        ...fm,
        ...(needsCause(fm, text) ? { "needs-cause": "1" } : {}),
        "waits-on": section(text, "Waits on"),
        "time-box": section(text, "Time box"),
        shown: seenLine(section(text, "What"))?.kind ?? "",
      };
      items.push(row as Item);
    }
  }
  const known = new Set(files.map((f) => f.replace(/\.md$/, "")));
  for (const i of items)
    for (const a of ids(i.after))
      if (!known.has(a)) errors.push(`${i.id}.md: after "${a}" is not an item`);
  for (const i of items) {
    const feeds = feedsId(
      section(readFileSync(join(dir, `${i.id}.md`), "utf8"), "What"),
    );
    if (feeds && !known.has(feeds))
      errors.push(`${i.id}.md: Feeds: "${feeds}" is not an item`);
  }
  const index = buildIndex(items, readOrder(poolDir));
  const path = join(poolDir, "INDEX.md");
  if (check) {
    if (opts.staleCheck !== false)
      if (!existsSync(path) || readFileSync(path, "utf8") !== index)
        errors.push("docs/pool/INDEX.md is stale: run `npm run pool`");
  } else if (!errors.length && opts.writeIndex !== false)
    writeFileSync(path, index);
  return {
    index,
    errors: check ? [...errors, ...warnings] : errors,
    warnings,
    items,
  };
}

/** The index main's items would produce, without writing it. */
export function buildIndexFor(poolDir: string): string {
  return run(poolDir, true, new Set(), { staleCheck: false }).index;
}

/**
 * The index is main's alone (pool-generated-index-merge-starvation): its count
 * line and lists change with every status, so any two branches that each wrote
 * it conflicted, and checked PRs starved. It is written only where the checkout
 * stands on main (a claim's push, the pool index workflow, the merge flip, a
 * seen check, each on a branch made at origin/main to push to it); a branch never
 * changes it. A checkout with no origin/main is its own main.
 */
export function onIndexHome(): boolean {
  try {
    git("rev-parse", "--verify", "-q", "origin/main");
  } catch {
    return true;
  }
  return git("rev-parse", "--abbrev-ref", "HEAD") === "main";
}

/**
 * The index's part of `--check`. On main it must be current. On a branch it
 * must equal main's copy at the merge base: the branch changed nothing in it,
 * so no merge can conflict there, and the workflow on main regenerates it.
 */
export function indexCheck(poolDir: string): string[] {
  const path = join(poolDir, "INDEX.md");
  if (onIndexHome()) {
    const index = buildIndexFor(poolDir);
    return existsSync(path) && readFileSync(path, "utf8") === index
      ? []
      : ["docs/pool/INDEX.md is stale: run `npm run pool`"];
  }
  const base = git("merge-base", "HEAD", "origin/main");
  const rel = git("ls-files", "--full-name", path) || "docs/pool/INDEX.md";
  let mains = "";
  try {
    mains = execFileSync("git", ["show", `${base}:${rel}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    mains = "";
  }
  const own = existsSync(path) ? readFileSync(path, "utf8") : "";
  return own === mains
    ? []
    : [
        "docs/pool/INDEX.md is written on main only and this branch changes it: run `git checkout origin/main -- docs/pool/INDEX.md` (after merging main) and commit",
      ];
}

const POOL = (): string => join(process.cwd(), "docs", "pool");
const itemPath = (id: string): string => join(POOL(), "items", `${id}.md`);

/** The repository's own Prettier, found from this file so it works from any working directory. */
const PRETTIER = createRequire(import.meta.url).resolve(
  "prettier/bin/prettier.cjs",
);

/**
 * The one writer of an item file: the text goes through the repository's
 * Prettier, with the item's own path so its Markdown rules and any
 * configuration apply, before it is written. Every command that writes an
 * item (add, claim, release, status, seen, next and the merged flip) writes
 * through here, so nothing the tool pushes fails the repository's format
 * check (three items written by add on Nov 12, 2026 did).
 */
function writeItem(id: string, text: string): void {
  const path = itemPath(id);
  const formatted = execFileSync(
    process.execPath,
    [PRETTIER, "--stdin-filepath", path],
    { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  writeFileSync(path, formatted);
}

/** Sets or inserts front-matter keys in an item's text. */
export function setFields(
  text: string,
  fields: Record<string, string>,
): string {
  let out = text;
  for (const [k, v] of Object.entries(fields)) {
    const re = new RegExp(`^${k}:.*$`, "m");
    const head = /^---\r?\n[\s\S]*?\r?\n---/.exec(out);
    if (!head) throw new Error("no front matter");
    if (re.test(head[0])) {
      const h2 = head[0].replace(re, () => `${k}: ${v}`.trimEnd());
      out = h2 + out.slice(head[0].length);
    } else {
      const h2 = head[0].replace(
        /\r?\n---$/,
        () => `\n${`${k}: ${v}`.trimEnd()}\n---`,
      );
      out = h2 + out.slice(head[0].length);
    }
  }
  return out;
}

/** A front-matter value: plain when the reader takes it as written, quoted otherwise. */
const fmValue = (v: string): string =>
  /^[\w./@-]+(?: [\w./@-]+)*$/.test(v) ? v : JSON.stringify(v);

/**
 * Adds one line, as its own paragraph, to the end of an item's Notes section;
 * an item with no Notes section gets one at the end.
 */
export function appendNote(text: string, line: string): string {
  const head = /\*\*Notes\.?\*\*\.?/.exec(text);
  if (!head) return `${text.trimEnd()}\n\n**Notes.** ${line}\n`;
  const from = head.index + head[0].length;
  const next = /\n\*\*[A-Z][a-z ]+\.?\*\*/.exec(text.slice(from));
  const end = next ? from + next.index : text.length;
  const tail = text.slice(end).replace(/^\s+/, "");
  return `${text.slice(0, end).trimEnd()}\n\n${line}\n${tail ? `\n${tail}` : ""}`;
}

const git = (...a: string[]): string =>
  execFileSync("git", a, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

function readItem(id: string): Record<string, string> {
  if (!existsSync(itemPath(id))) throw new Error(`no such item: ${id}`);
  return parseFrontMatter(readFileSync(itemPath(id), "utf8")) ?? {};
}

/** Applies an edit, regenerates the index and commits the two files. Throws on a refusal. */
function applyAndCommit(
  id: string,
  edit: () => void,
  message: string,
  home: boolean,
): void {
  edit();
  const { errors } = run(POOL(), false, undefined, { writeIndex: home });
  if (errors.length) throw new Error(errors.join("\n"));
  const files = home
    ? ["docs/pool/INDEX.md", `docs/pool/items/${id}.md`]
    : [`docs/pool/items/${id}.md`];
  git("add", ...files);
  // Another writer (a merger, the CTO) may have made the same change on main
  // between the read and the fetch; nothing to commit is then a finished job.
  if (!git("diff", "--cached", "--name-only")) return;
  git("commit", "-m", message, "--", ...files);
}

/** Runs `step` on a fresh branch at origin/main and pushes it to main, retrying a lost race. */
function onMain(tmp: string, step: () => void, beforePush?: () => void): void {
  const prev = git("rev-parse", "--abbrev-ref", "HEAD");
  let last: unknown;
  try {
    // A merge burst runs many flips at once; each loses the push race to the
    // one before it, so the retries cover a burst, not just a pair.
    for (let n = 0; n < 8; n++) {
      git("fetch", "origin", "main");
      git("checkout", "-B", tmp, "origin/main");
      step();
      beforePush?.();
      try {
        git("push", "origin", "HEAD:main");
        return;
      } catch (e) {
        last = e;
      }
    }
    throw new Error(`push to main failed 8 times: ${String(last)}`);
  } finally {
    try {
      git("checkout", prev === "HEAD" ? "-" : prev);
      git("branch", "-D", tmp);
    } catch {
      /* best effort */
    }
  }
}

/**
 * Regenerates the index on main from main's items and pushes it when it moved.
 * The pool index workflow runs it after every push to main that changes an item.
 * Returns an error message or null.
 */
export function reindex(): string | null {
  try {
    onMain("pool-reindex", () => {
      const { errors } = run(POOL(), false);
      if (errors.length) throw new Error(errors.join("\n"));
      git("add", "docs/pool/INDEX.md");
      if (!git("diff", "--cached", "--name-only")) return;
      git(
        "commit",
        "-m",
        "pool: regenerate the index",
        "--",
        "docs/pool/INDEX.md",
      );
    });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function mutate(
  id: string,
  edit: () => void,
  message: string,
  noPush: boolean,
): void {
  if (noPush) return applyAndCommit(id, edit, message, onIndexHome());
  onMain(`pool-claim-${id}`, () => applyAndCommit(id, edit, message, true));
}

/**
 * Flags come as `--key value` or `--key=value`. `--by` may also come from
 * POOL_BY: npm swallows a `--by` written without `--` before the arguments
 * (`npm run pool status x done --by cto` reaches the tool as `done cto`), and
 * an env var survives that.
 */
export function flags(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): { pos: string[]; f: Record<string, string> } {
  const pos: string[] = [];
  const f: Record<string, string> = {};
  if (env.POOL_BY) f.by = env.POOL_BY;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--no-push") f["no-push"] = "1";
    else if (argv[i] === "--local") f.local = "1";
    else if (argv[i] === "--not") f.not = "1";
    else if (argv[i] === "--dry-run") f["dry-run"] = "1";
    else if (argv[i] === "--no-pr") f["no-pr"] = "1";
    else if (argv[i].startsWith("--")) {
      const eq = argv[i].indexOf("=");
      if (eq > 2) f[argv[i].slice(2, eq)] = argv[i].slice(eq + 1);
      else f[argv[i].slice(2)] = argv[++i] ?? "";
    } else pos.push(argv[i]);
  }
  return { pos, f };
}

/** What `add` must be given: every body section and every field of the standard (docs/pool/README.md). */
const ADD_FLAGS = [
  "title",
  "what",
  "cause",
  "fix",
  "timebox",
  "rules",
  "done",
  "waits",
  "files",
  "model",
  "effort",
  "root",
  "lead",
  "seen",
] as const;

const TEMPLATE = (f: Record<string, string>, id: string): string => {
  const box = /^\d+(?:\.\d+)?$/.test(f.timebox)
    ? `${f.timebox} hours`
    : f.timebox;
  return `---\nid: ${id}\ntitle: ${JSON.stringify(f.title)}\narea: ${f.area}\nkind: ${f.kind}\npriority: ${f.priority}\nsize: ${f.size}\nstatus: open\nstandard: 2\nclaimed-by:\npr:\nafter: ${f.after ?? ""}\nblocked-on:\nlead: ${f.lead}\nmodel: ${f.model}\neffort: ${f.effort}\nroot: ${f.root}\nsource: ${f.source || "added with npm run pool -- add"}\n---\n\n**What.** ${f.what} ${f.seen}\n\n**Cause.** ${f.cause}\n\n**Fix.** ${f.fix}\n\n**Time box.** ${box}\n\n**Rules.** ${f.rules}\n\n**Done when.** ${f.done}\n\n**Waits on.** ${f.waits}\n\n**Files.** ${f.files}\n${f.notes ? `\n**Notes.** ${f.notes}\n` : ""}`;
};

/** What `seen` must be told: who looked, where, on which seed and commit, and what was on screen. */
const SEEN_FLAGS = ["by", "place", "seed", "main", "saw"] as const;
const SEEN_USAGE =
  'usage: pool seen <id> [--not] --by <who> --place "<place>" --seed <seed> --main <commit> --saw "<what was on screen>"';
const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();

/**
 * An item's text claimed by `branch`, or null when that branch holds it
 * already and there is nothing new to record. Throws the claim's refusals.
 * `record` writes `branch:` (the branch `next` made); `pr` records the draft.
 */
function claimText(
  id: string,
  branch: string,
  opts: { pr?: string; note?: string; record?: boolean } = {},
): string | null {
  const fm = readItem(id);
  const text = readFileSync(itemPath(id), "utf8");
  if (fm.status === "claimed" && fm["claimed-by"] === branch)
    return opts.pr && fm.pr !== opts.pr
      ? setFields(text, { pr: opts.pr })
      : null;
  if (fm.status === "claimed" || fm.status === "in-pr")
    throw new Error(
      `already claimed by ${fm["claimed-by"] || fm.pr}; take the next item`,
    );
  if (fm.status !== "open") throw new Error(`${id} is ${fm.status}, not open`);
  if (needsCause(fm, text))
    throw new Error(
      `${id} has no known cause (Cause: Needs cause.); it is not built until Fable finds the fix (owner, Nov 10)`,
    );
  const waiting = ids(fm.after).filter((a) => !gateOpen(readItem(a).status));
  if (waiting.length)
    throw new Error(
      `${id} waits on ${waiting.join(", ")}; take the top of Next up`,
    );
  const fields: Record<string, string> = {
    status: "claimed",
    "claimed-by": branch,
    "claimed-at": new Date().toISOString(),
  };
  if (opts.pr) fields.pr = opts.pr;
  if (opts.record) fields.branch = branch;
  const out = setFields(text, fields);
  return opts.note ? appendNote(out, opts.note) : out;
}

/** A claimed item's text set open, keeping its branch and pull request, with `lead` and where to continue in Notes. */
function releasedText(id: string, lead: string): string {
  const fm = readItem(id);
  const branch = fm.branch || fm["claimed-by"] || "";
  const fields: Record<string, string> = {
    status: "open",
    "claimed-by": "",
    "claimed-at": "",
  };
  if (BRANCH.test(branch)) fields.branch = branch;
  const where = BRANCH.test(branch)
    ? ` Continue on branch ${branch}${fm.pr ? ` and pull request ${fm.pr}` : ""}.`
    : "";
  return appendNote(
    setFields(readFileSync(itemPath(id), "utf8"), fields),
    `${lead.replace(/\s*$/, "")}${/[.!?]$/.test(lead.trim()) ? "" : "."}${where}`,
  );
}

/** The release notes a branch adds under docs/release/changes/: path and text, read from origin's copy when origin has the branch, else the local branch. Null when the branch is unreadable. */
function notesOnBranch(
  branch: string,
): { path: string; text: string }[] | null {
  if (!BRANCH.test(branch)) return null;
  let ref = branch;
  try {
    git("fetch", "-q", "origin", branch);
    ref = "FETCH_HEAD";
  } catch {
    /* no origin copy */
  }
  try {
    const names = git(
      "diff",
      "--name-only",
      "--diff-filter=AM",
      `origin/main...${ref}`,
      "--",
      "docs/release/changes/",
    )
      .split("\n")
      .filter(Boolean);
    return names.map((path) => ({ path, text: git("show", `${ref}:${path}`) }));
  } catch {
    return null;
  }
}

/** Every change id already used on main: those listed in consumed-changes.json and the files in docs/release/changes/. */
function usedNoteIds(): Set<string> {
  const used = new Set<string>();
  try {
    const j = JSON.parse(
      git("show", "origin/main:docs/release/consumed-changes.json"),
    ) as { entries?: { changeIds?: string[] }[] };
    for (const e of j.entries ?? [])
      for (const c of e.changeIds ?? []) used.add(c);
  } catch {
    /* no list on main */
  }
  try {
    for (const f of git(
      "ls-tree",
      "--name-only",
      "origin/main",
      "docs/release/changes/",
    )
      .split("\n")
      .filter(Boolean))
      used.add(f.replace(/^.*\//, "").replace(/\.md$/, ""));
  } catch {
    /* no changes folder on main */
  }
  return used;
}

/** When a branch was last pushed: its newest commit's time, fetched from origin or read from the local origin ref. */
function branchTip(branch: string, fetch: boolean): number | null {
  if (!BRANCH.test(branch)) return null;
  try {
    if (fetch) {
      git("fetch", "-q", "origin", branch);
      return Date.parse(git("log", "-1", "--format=%cI", "FETCH_HEAD"));
    }
    return Date.parse(git("log", "-1", "--format=%cI", `origin/${branch}`));
  } catch {
    return null;
  }
}

export interface Stale {
  id: string;
  branch: string;
  last: number;
  hours: number;
}

/**
 * Claims gone quiet: claimed longer than twice the item's time box (4 hours
 * when it names none) and, by the branch's newest commit (or the claim time
 * when there is no branch), quiet that long too. A claim with neither time
 * is left alone.
 */
export function staleClaims(
  items: Item[],
  now: number,
  tip: (branch: string) => number | null,
): Stale[] {
  const out: Stale[] = [];
  for (const i of items) {
    if (i.status !== "claimed") continue;
    const hours = timeBoxHours(i["time-box"]);
    const limit = 2 * hours * 3600 * 1000;
    const at = i["claimed-at"] ? Date.parse(i["claimed-at"]) : NaN;
    if (!Number.isNaN(at) && now - at <= limit) continue;
    const branch = i.branch || i["claimed-by"] || "";
    const last = (branch ? tip(branch) : null) ?? at;
    if (Number.isNaN(last) || now - last <= limit) continue;
    out.push({ id: i.id, branch, last, hours });
  }
  return out;
}

/** Whether a pull request is OPEN, CLOSED or MERGED, asked of gh; null when gh cannot say. */
function prState(pr: string): string | null {
  try {
    const said = execFileSync(
      "gh",
      ["pr", "view", pr.replace(/^#/, ""), "--json", "state"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const state = (JSON.parse(said) as { state?: string }).state;
    return state && /^[A-Z]+$/.test(state) ? state : null;
  } catch {
    return null;
  }
}

/**
 * How many game pull requests are open, asked of gh's search: the open pull
 * requests that are not drafts, less those whose body says `Touches pool
 * item` (pool notes, rules, skills and docs). Null when gh cannot say.
 */
function openGamePullRequests(): number | null {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const slug = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/.exec(
      url,
    )?.[1];
    if (!slug) return null;
    const count = (rest: string): number =>
      Number(
        execFileSync(
          "gh",
          [
            "api",
            "-X",
            "GET",
            "search/issues",
            "-f",
            `q=repo:${slug} is:pr is:open draft:false${rest}`,
            "--jq",
            ".total_count",
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ).trim(),
      );
    const open = count("");
    const notes = count(' "Touches pool item" in:body');
    return Number.isInteger(open) && Number.isInteger(notes)
      ? open - notes
      : null;
  } catch {
    return null;
  }
}

/** Where `next` prints, and a hook tests use to run another caller between the claim and its push. */
export interface NextIO {
  out: (line: string) => void;
  beforePush?: () => void;
  /** How many game pull requests are open; asked of gh when unset. */
  openGame?: () => number | null;
  /** Where the stage lines go; standard error when unset, so the result lines stay the same. */
  progress?: (line: string) => void;
}

const NEXT_USAGE =
  'usage: pool next [--as "<your model and tool>"] [--tier <tier>] [--agent <name>] [--branch-prefix <prefix>] [--for <kind>] [--no-pr] [--dry-run]';
/** The subject of a new item branch's first commit; any other commit on the branch means another agent started. */
const startSubject = (id: string): string =>
  `${id}: start the branch with its release note`;

/** Makes `branch` on origin from origin/main with one commit adding the item's release note, without touching the working tree. */
function startBranch(id: string, noteId: string, branch: string): void {
  const dir = mkdtempSync(join(tmpdir(), "pool-branch-"));
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, "index") };
  const g = (args: string[], input?: string): string =>
    execFileSync("git", args, {
      encoding: "utf8",
      env,
      input,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  try {
    const blob = g(["hash-object", "-w", "--stdin"], releaseNote(noteId));
    g(["read-tree", "origin/main"]);
    g([
      "update-index",
      "--add",
      "--cacheinfo",
      `100644,${blob},docs/release/changes/${noteId}.md`,
    ]);
    const tree = g(["write-tree"]);
    const commit = g([
      "commit-tree",
      tree,
      "-p",
      "origin/main",
      "-m",
      startSubject(id),
    ]);
    git("push", "-q", "origin", `${commit}:refs/heads/${branch}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const day = (t: number): string => new Date(t).toISOString().slice(0, 10);
const when = (t: number): string =>
  new Date(t).toISOString().slice(0, 16).replace("T", " ") + " UTC";

/**
 * `npm run pool -- next`: releases quiet claims, takes the first claimable item
 * at the caller's level or the nearest level below, claims it on main, starts
 * its branch and opens its draft pull request. Returns an error or null.
 */
function next(
  f: Record<string, string>,
  io: NextIO,
  env: NodeJS.ProcessEnv,
): string | null {
  const order = readOrder(POOL());
  const tiers = readTiers(POOL());
  const dry = !!f["dry-run"];
  const now = Date.now();
  const stage = (line: string): void =>
    (io.progress ?? ((l) => void process.stderr.write(`${l}\n`)))(line);
  // The agent of this checkout: named and given its tier by the tool, from
  // what it says it is. `--tier` (or the older `--model`) and `--agent` are
  // for an owner or CTO who wants to set them by hand.
  const who = identify(f.as ?? "", tiers, identityFile(env), now, !dry);
  const asked = f.tier ?? f.model ?? who.tier;
  const level = levelOf(asked, tiers, order.levels);
  const at = level ? order.levels.indexOf(level) : -1;
  if (!level || at < 0)
    return `${NEXT_USAGE}\nThe tiers are ${tiers.tiers.map((x) => x.name).join(", ")}.`;
  const kindName = f.for ?? "";
  const kind = kindName ? order.kinds[kindName] : undefined;
  if (kindName && !kind)
    return `No kind of work is called "${kindName}". The kinds are ${Object.keys(order.kinds).join(", ") || "none"} (docs/pool/order.json).\n${NEXT_USAGE}`;
  const tier = tierOfLevel(level, tiers);
  const levels = order.levels.slice(0, at + 1).reverse();
  const prefix = branchPrefix(f["branch-prefix"], env);
  const agent = oneLine(
    f.agent
      ? f.agent
      : `${who.name} (${who.as ? `${who.as}, ` : ""}tier ${tier})`,
  );
  io.out(
    `You are ${f.agent ? oneLine(f.agent) : who.name}, tier ${tier}${who.as ? ` (${who.as})` : ""}.`,
  );
  const template = join(process.cwd(), ".github", "PULL_REQUEST_TEMPLATE.md");
  const startPage = join(POOL(), "START-A-BUILDER.md");
  for (const p of [template, startPage])
    if (!existsSync(p)) return `next needs ${p}, which is missing`;
  const branchOf = (i: Item): string => i.branch || `${prefix}${i.id}`;
  if (!BRANCH.test(prefix + "x"))
    return `--branch-prefix "${prefix}" does not make a branch name`;
  const read = (): Item[] =>
    run(POOL(), true, new Set(), { staleCheck: false }).items;
  const pick = (items: Item[]): Item | null => {
    const onMain = new Set(
      items.filter((i) => gateOpen(i.status)).map((i) => i.id),
    );
    const known = new Set(items.map((i) => i.id));
    const cmp = makeOrder(items, order);
    const ready = items
      .filter((i) => claimable(i, onMain, known) && (!kind || inKind(i, kind)))
      // While the cap is on, only what still comes first is handed out.
      .filter((i) => !capLine || visibleRank(i, order) === 0)
      .sort(cmp);
    for (const l of levels) {
      const hit = ready.find((i) => i.model === l);
      if (hit) return hit;
    }
    return null;
  };
  const capped = (): string | null => {
    // The cap on new work (order.json `cap`; skill pool-notes).
    const most = order.cap?.openGamePullRequests;
    if (!most) return null;
    stage("Counting the open game pull requests.");
    const open = (io.openGame ?? openGamePullRequests)();
    if (open === null) {
      // Said with the stage lines, so the result lines stay the same.
      stage(
        "Could not count the open pull requests, so the cap was not checked.",
      );
      return null;
    }
    return open > most
      ? `The cap is on: ${open} game pull requests are open and the cap is ${most} (docs/pool/order.json). Only a red on main, a rule, a check or a skill is handed out. Otherwise take no new item: fix what a desk sent back on your own pull requests, bring your open pull requests up to main, then stop and say so (skill pool-notes).`
      : null;
  };
  const capLine = capped();
  if (capLine) io.out(capLine);
  const none = capLine
    ? "Nothing that comes before the cap is ready for your tier."
    : kind
      ? `No ${kindName} item is left for your tier (${tier}) or any tier below it.`
      : `No item is ready for tier ${tier} or any tier below it.`;
  const staleLine = (s: Stale): string =>
    `no push to ${s.branch || "its branch"} since ${when(s.last)}, more than twice its ${s.hours}-hour time box`;

  if (dry) {
    const items = read();
    stage("Looking for claims gone quiet (fetching each claimed branch).");
    const stale = staleClaims(items, now, (b) => branchTip(b, true));
    for (const s of stale) {
      io.out(`Would release ${s.id}: ${staleLine(s)}.`);
      const i = items.find((x) => x.id === s.id);
      if (i) {
        i.status = "open";
        if (!i.branch && BRANCH.test(s.branch)) i.branch = s.branch;
      }
    }
    const item = pick(items);
    if (!item) {
      io.out(none);
      return null;
    }
    const branch = branchOf(item);
    io.out(`Would take: ${item.id} (${item.model}, p${item.priority})`);
    io.out(`Title: ${item.title}`);
    io.out(`File: docs/pool/items/${item.id}.md`);
    io.out(`Branch: ${branch}`);
    io.out(
      item.pr
        ? `Pull request: ${item.pr}`
        : "Pull request: a draft would be opened",
    );
    let started = "";
    try {
      started = git("log", "--format=%s", `origin/main..origin/${branch}`);
    } catch {
      /* no branch yet */
    }
    if (started.split("\n").some((x) => x && x !== startSubject(item.id)))
      io.out("continue: another agent started this item.");
    io.out("Dry run: nothing was changed.");
    return null;
  }

  stage("Releasing quiet claims, choosing the item and claiming it on main.");
  let taken: Item | null = null;
  let released: Stale[] = [];
  onMain(
    "pool-next",
    () => {
      taken = null;
      released = staleClaims(read(), now, (b) => branchTip(b, true));
      for (const s of released)
        writeItem(
          s.id,
          releasedText(s.id, `Released by next (${day(now)}): ${staleLine(s)}`),
        );
      const item = pick(read());
      if (item) {
        const text = claimText(item.id, branchOf(item), {
          record: true,
          note: agent
            ? `Claimed by next for ${agent} (${when(now)}) on branch ${branchOf(item)}.`
            : undefined,
        });
        if (text) writeItem(item.id, text);
        taken = item;
      }
      const ids = [...released.map((s) => s.id), ...(item ? [item.id] : [])];
      if (!ids.length) return;
      const { errors } = run(POOL(), false);
      if (errors.length) throw new Error(errors.join("\n"));
      const files = [
        "docs/pool/INDEX.md",
        ...ids.map((x) => `docs/pool/items/${x}.md`),
      ];
      // The check-in: one small file per agent, written with its first claim,
      // so who is working outlives the session and needs no comment thread.
      const card = join(POOL(), "agents", `${who.name}.json`);
      if (item && !f.agent && !existsSync(card)) {
        mkdirSync(join(POOL(), "agents"), { recursive: true });
        writeFileSync(
          card,
          JSON.stringify(
            { name: who.name, tier, as: who.as, checkedIn: who.at },
            null,
            2,
          ) + "\n",
        );
        files.push(`docs/pool/agents/${who.name}.json`);
      }
      git("add", ...files);
      if (!git("diff", "--cached", "--name-only")) return;
      const parts = [
        item ? `next takes ${item.id} (${branchOf(item)})` : "",
        released.length
          ? `releases ${released.map((s) => s.id).join(", ")}`
          : "",
      ].filter(Boolean);
      git("commit", "-m", `pool: ${parts.join("; ")}`, "--", ...files);
    },
    io.beforePush,
  );
  for (const s of released) io.out(`Released ${s.id}: ${staleLine(s)}.`);
  const item = taken as Item | null;
  if (!item) {
    io.out(none);
    return null;
  }
  const branch = branchOf(item);
  let started: string[] | null = null;
  stage(`Starting the branch ${branch}.`);
  try {
    git("fetch", "-q", "origin", branch);
    started = git("log", "--format=%s", "origin/main..FETCH_HEAD")
      .split("\n")
      .filter(Boolean);
  } catch {
    startBranch(item.id, chooseNoteId(item.id, usedNoteIds()), branch);
  }
  io.out(`Item: ${item.id}`);
  io.out(`Title: ${item.title}`);
  io.out(`File: docs/pool/items/${item.id}.md`);
  io.out(
    `Branch: ${branch} (to start: git fetch origin ${branch} && git checkout -B ${branch} origin/${branch})`,
  );
  const notes = notesOnBranch(branch) ?? [];
  io.out(
    notes.length
      ? `Release note: ${notes.map((n) => n.path).join(", ")}`
      : "Release note: none on the branch yet; add one under docs/release/changes/",
  );
  let pr = item.pr;
  if (pr) {
    const state = prState(pr);
    if (state === "OPEN") {
      /* a live draft: keep it */
    } else if (state) {
      io.out(
        `Pull request ${pr} is ${state.toLowerCase()}; opening a new draft.`,
      );
      pr = "";
    } else io.out(`Pull request ${pr}: gh could not say whether it is open.`);
  }
  if (!pr) {
    stage("Opening the draft pull request.");
    const title = prTitle(item.id, item.title);
    const body = prBody(
      item.id,
      git("show", `origin/main:docs/pool/items/${item.id}.md`),
      readFileSync(template, "utf8"),
      readFileSync(startPage, "utf8"),
    );
    const bodyFile = join(mkdtempSync(join(tmpdir(), "pool-pr-")), "body.md");
    writeFileSync(bodyFile, body);
    let why = "--no-pr was given";
    if (!f["no-pr"])
      try {
        const said = execFileSync(
          "gh",
          [
            "pr",
            "create",
            "--draft",
            "--head",
            branch,
            "--base",
            "main",
            "--title",
            title,
            "--body-file",
            bodyFile,
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        );
        const n = /\/pull\/(\d+)/.exec(said)?.[1];
        if (n) pr = `#${n}`;
        else why = `gh did not print a pull request address: ${oneLine(said)}`;
      } catch (e) {
        why = `gh could not open it: ${oneLine(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
      }
    if (pr) {
      try {
        mutate(
          item.id,
          () => {
            const text = claimText(item.id, branch, { pr });
            if (text) writeItem(item.id, text);
          },
          `pool: ${item.id} draft ${pr}`,
          false,
        );
      } catch (e) {
        io.out(
          `The draft is open but its number was not recorded (${e instanceof Error ? e.message : String(e)}): run npm run pool -- claim ${item.id} --branch ${branch} --pr ${pr.slice(1)}`,
        );
      }
      io.out(`Pull request: ${pr} (draft)`);
    } else {
      io.out(`Pull request: not opened; ${why}.`);
      io.out(`Pull request title: ${title}`);
      io.out(`Pull request body file: ${bodyFile}`);
      io.out(
        `Open a draft pull request from ${branch} to main with that title and body, then record it: npm run pool -- claim ${item.id} --branch ${branch} --pr <number>`,
      );
    }
  } else io.out(`Pull request: ${pr}`);
  if (started?.some((x) => x !== startSubject(item.id)))
    io.out(
      "continue: another agent started this item. Read its pull request from top to bottom and the branch's commits before you change anything.",
    );
  return null;
}

/** Runs a subcommand; returns an error message or null. */
export function command(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  io: NextIO = { out: (l) => console.log(l) },
): string | null {
  const { pos, f } = flags(argv, env);
  const [cmd, id] = pos;
  const noPush = !!f["no-push"];
  try {
    if (cmd === "reindex") {
      if (!f.local) return reindex();
      const { errors } = run(POOL(), false, undefined, {
        writeIndex: onIndexHome(),
      });
      return errors.length ? errors.join("\n") : null;
    }
    if (cmd === "claim") {
      if (!id || !f.branch)
        return "usage: pool claim <id> --branch <branch> [--pr N]";
      const pr = f.pr ? `#${f.pr.replace(/^#/, "")}` : "";
      const edit = (): void => {
        const text = claimText(id, f.branch, { pr });
        if (text) writeItem(id, text);
      };
      mutate(id, edit, `pool: claim ${id} (${f.branch})`, noPush);
    } else if (cmd === "release") {
      const reason = oneLine(f.reason ?? "");
      if (!id || !reason || reason.startsWith("--"))
        return 'usage: pool release <id> --reason "<one sentence>"';
      const edit = (): void => {
        const fm = readItem(id);
        if (fm.status !== "claimed")
          throw new Error(`${id} is ${fm.status}, not claimed`);
        writeItem(
          id,
          releasedText(
            id,
            `Released (${new Date().toISOString().slice(0, 10)}): ${reason}`,
          ),
        );
      };
      mutate(id, edit, `pool: release ${id}`, noPush);
    } else if (cmd === "check-in") {
      const tiers = readTiers(POOL());
      const who = identify(f.as ?? "", tiers, identityFile(env), Date.now());
      io.out(
        `You are ${who.name}, tier ${who.tier}${who.as ? ` (${who.as})` : ""}.`,
      );
    } else if (cmd === "next") {
      return next(f, io, env);
    } else if (cmd === "status") {
      const st = pos[2];
      if (
        !id ||
        !["in-pr", "merged", "done", "blocked", "open", "dropped"].includes(st)
      )
        return "usage: pool status <id> <in-pr|merged|done|blocked|open|dropped> [--pr N] [--blocked-on <id>] [--by=cto]";
      if ((st === "done" || st === "dropped") && f.by !== "cto")
        return `${st} is allowed only with --by=cto (or POOL_BY=cto in the environment); work seen in the running game is closed with pool seen`;
      const edit = (): void => {
        const fm = readItem(id);
        if (st === "in-pr") {
          const branch = fm.branch || fm["claimed-by"];
          const notes = branch ? notesOnBranch(branch) : null;
          const open = notes?.find((n) => n.text.includes(NOTE_PLACEHOLDER));
          if (open)
            throw new Error(
              `${open.path} on ${branch} still says "${NOTE_PLACEHOLDER}" Write the release note, push it, then set the item in-pr.`,
            );
        }
        // A second merge of a checked or closed item must not undo its check.
        if (
          st === "merged" &&
          ["done", "dropped"].includes(fm.status) &&
          f.by !== "cto"
        )
          throw new Error(
            `${id} is already ${fm.status}; merged would undo that (allowed only with --by=cto)`,
          );
        const fields: Record<string, string> = { status: st };
        if (f.pr) fields.pr = `#${f.pr.replace(/^#/, "")}`;
        if (f["blocked-on"]) fields["blocked-on"] = f["blocked-on"];
        // The first merge's time stands: the index lists the oldest merge first.
        if (st === "merged" && !(fm.status === "merged" && fm["merged-at"]))
          fields["merged-at"] = new Date().toISOString();
        if (st === "open") {
          fields["claimed-by"] = "";
          fields["claimed-at"] = "";
          if ("merged-at" in fm) fields["merged-at"] = "";
        }
        writeItem(id, setFields(readFileSync(itemPath(id), "utf8"), fields));
      };
      mutate(
        id,
        edit,
        `pool: ${id} ${st}${f.pr ? ` (#${f.pr.replace(/^#/, "")})` : ""}`,
        noPush,
      );
    } else if (cmd === "seen") {
      if (!id) return SEEN_USAGE;
      const missing = SEEN_FLAGS.filter(
        (k) => !f[k]?.trim() || f[k].startsWith("--"),
      );
      if (missing.length)
        return `seen needs every one of its five flags; missing ${missing.map((k) => `--${k}`).join(", ")}\n${SEEN_USAGE}`;
      const by = oneLine(f.by);
      const saw = oneLine(f.saw);
      if (words(saw) < 8)
        return `--saw needs at least 8 words saying what was on screen (has ${words(saw)})`;
      const not = !!f.not;
      const edit = (): void => {
        const fm = readItem(id);
        if (fm.status === "done" && fm["seen-by"])
          throw new Error(`${id} was already seen by ${fm["seen-by"]}`);
        if (fm.status !== "merged" && fm.status !== "done")
          throw new Error(
            `${id} is ${fm.status}, not merged; only work on main can be seen in the game`,
          );
        // Only the confirmation needs a second session: a builder who finds
        // their own work missing may say so, since that never moves the number.
        const builder = (fm["claimed-by"] || "").toLowerCase();
        if (!not && builder && builder.includes(by.toLowerCase()))
          throw new Error(
            `${by} built ${id} (claimed-by ${fm["claimed-by"]}); the builder cannot confirm their own work, a second session must see it`,
          );
        const now = new Date().toISOString();
        const fields: Record<string, string> = not
          ? { status: "open", "claimed-by": "", "claimed-at": "" }
          : { status: "done", "seen-by": fmValue(by), "seen-at": now };
        if (not && "merged-at" in fm) fields["merged-at"] = "";
        const note = `${not ? "Not seen" : "Seen"} in the game (${now.slice(0, 10)}, ${by}): ${oneLine(f.place)}, seed ${oneLine(f.seed)}, main ${oneLine(f.main)}: ${saw}`;
        writeItem(
          id,
          appendNote(
            setFields(readFileSync(itemPath(id), "utf8"), fields),
            note,
          ),
        );
      };
      mutate(
        id,
        edit,
        not
          ? `pool: ${id} not seen in the game, reopened (${by})`
          : `pool: ${id} seen in the game (${by})`,
        noPush,
      );
    } else if (cmd === "add") {
      if (!id)
        return "usage: pool add <id> --title ... --area ... --kind ... --priority N --size S|M|L [--after a,b] --what ... --cause ... --fix ... --timebox <hours> --rules ... --done ... --waits ... --files ... --model haiku|sonnet|opus|fable --effort low|medium|high --root <id|none> --lead <role> --seen '<Seen: ..., Feeds: <item id> ... or Guards: ...>' [--notes ...] (every one of these is required; the item is written at the standard, docs/pool/README.md)";
      f.size = f.size || "M";
      const edit = (): void => {
        if (existsSync(itemPath(id))) throw new Error(`${id} already exists`);
        const missing = ADD_FLAGS.filter((name) => !f[name]);
        if (missing.length)
          throw new Error(
            `an item at the standard needs every field and section: missing ${missing.map((n) => `--${n}`).join(", ")}`,
          );
        const text = TEMPLATE(f, id);
        const fm = parseFrontMatter(text) ?? {};
        const problems = [
          ...validate(`${id}.md`, fm),
          ...standardProblems(
            `${id}.md`,
            fm,
            text,
            repoAt(join(POOL(), "..", "..")),
            readRoots(POOL()),
          ),
        ];
        if (problems.length) throw new Error(problems.join("\n"));
        writeItem(id, text);
      };
      mutate(id, edit, `pool: add ${id}`, noPush);
    } else return `unknown subcommand: ${cmd}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return null;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const sub = process.argv[2];
  if (sub === "audit") {
    const { f } = flags(process.argv.slice(3));
    void import("./audit").then((m) => {
      const rows = m.auditPool(join(process.cwd(), "docs", "pool"));
      const json = `${JSON.stringify(rows, null, 2)}\n`;
      if (f.out) writeFileSync(f.out, json);
      else process.stdout.write(json);
    });
  } else {
    if (sub && !sub.startsWith("-")) {
      const err = command(process.argv.slice(2));
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`pool ${sub} done`);
      process.exit(0);
    }
    const check = process.argv.includes("--check");
    // `--changed`: the writing-quality checks cover only the items named in
    // CHANGED_FILES (one path per line), so a change answers for its own items.
    const qualityOnly = process.argv.includes("--changed")
      ? new Set(
          (process.env.CHANGED_FILES ?? "")
            .split("\n")
            .filter((f) => f.startsWith("docs/pool/items/"))
            .map((f) => f.slice("docs/pool/items/".length)),
        )
      : undefined;
    const poolDir = join(process.cwd(), "docs", "pool");
    const home = onIndexHome();
    const { errors, warnings } = run(poolDir, check, qualityOnly, {
      staleCheck: false,
      writeIndex: home,
    });
    if (check) errors.push(...indexCheck(poolDir));
    if (!check && warnings.length) console.warn(warnings.join("\n"));
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exit(1);
    }
    console.log(
      check
        ? "pool items are valid and the index is main's"
        : home
          ? "pool index written"
          : "pool items are valid; the index is written on main only, by the pool index workflow",
    );
  }
}
