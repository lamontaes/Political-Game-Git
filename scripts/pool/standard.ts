// The pool item standard (`standard: 2`): what an item must carry so any model can build it from the item alone.
// Rule: .agents/rules/pool-item-standard.md. Used by index.ts (the check, add, claim, the index) and audit.ts.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const MODELS = ["haiku", "sonnet", "opus", "fable"];
export const EFFORTS = ["low", "medium", "high"];
export const SECTIONS = [
  "What",
  "Cause",
  "Fix",
  "Time box",
  "Rules",
  "Done when",
  "Waits on",
  "Files",
];
export const CAUSE_KINDS = [
  "Found in code:",
  "Measured:",
  "Design:",
  "Needs cause.",
];
/** The Fix an item with no known cause carries (owner, Nov 10: no work unless Fable found the fix). */
export const NO_FIX = "None until the cause is found.";

/** Pulls one bolded section ("**What.**") out of an item body. */
export function section(text: string, name: string): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
  const re = new RegExp(
    `\\*\\*${name}\\.?\\*\\*\\.?([\\s\\S]*?)(?=\\n\\*\\*[A-Z][A-Za-z ]+(?:\\([^)]*\\))?\\.?\\*\\*|$)`,
  );
  return (re.exec(body)?.[1] ?? "").trim();
}

/** Which kind of cause an item states, or null when it states none of the four. */
export function causeKind(text: string): string | null {
  const c = section(text, "Cause");
  return CAUSE_KINDS.find((k) => c.startsWith(k)) ?? null;
}

/** An item at the standard whose cause is not known yet: it is listed, never built. */
export const needsCause = (fm: Record<string, string>, text: string): boolean =>
  fm.standard === "2" && causeKind(text) === "Needs cause.";

export interface Repo {
  root: string;
  exists(path: string): boolean;
  /** First path segments of the repository's files and folders. */
  top: Set<string>;
}

/**
 * A repository for path checks. A path counts when it is in the working tree or
 * tracked by git (a sparse copy lacks images, not the files an item names).
 */
export function repoAt(root: string): Repo {
  let tracked: Set<string> | null = null;
  const trackedSet = (): Set<string> => {
    if (tracked) return tracked;
    tracked = new Set();
    if (existsSync(join(root, ".git"))) {
      try {
        const out = execFileSync("git", ["-C", root, "ls-files"], {
          encoding: "utf8",
          maxBuffer: 256 * 1024 * 1024,
          stdio: ["ignore", "pipe", "ignore"],
        });
        for (const f of out.split("\n")) {
          if (!f) continue;
          tracked.add(f);
          for (let d = dirname(f); d !== "."; d = dirname(d)) {
            if (tracked.has(d)) break;
            tracked.add(d);
          }
        }
      } catch {
        /* fall back to the working tree */
      }
    }
    return tracked;
  };
  const exists = (p: string): boolean => {
    const rel = p.replace(/\/+$/, "");
    const target = rel.includes("*") ? dirname(rel) : rel;
    if (!target || target === ".") return true;
    return existsSync(join(root, target)) || trackedSet().has(target);
  };
  const top = new Set<string>(existsSync(root) ? readdirSync(root) : []);
  return { root, exists, top };
}

const PATH_TOKEN =
  /(?<![\w./@:-])[\w.@*-]+(?:\/[\w.@*[\]-]+)+\/?|(?<![\w./@:-])[\w-]+\.(?:ts|tsx|mjs|js|json|md|yml|yaml)\b/g;

/** Paths an item text names, each with whether it is marked ` (new)`. A word with a slash and no file ending ("and/or") is not a path unless its first segment is a folder of the repository. */
export function pathsIn(
  text: string,
  repo: Repo,
): { path: string; isNew: boolean }[] {
  const flat = text.replace(/\(new\)/gi, " @@new@@");
  const out: { path: string; isNew: boolean }[] = [];
  for (const m of flat.matchAll(PATH_TOKEN)) {
    const path = m[0].replace(/[.,;]+$/, "");
    if (!path || /^\d/.test(path)) continue;
    const first = path.split("/")[0];
    const looksLikeFile = /\.\w{1,5}$/.test(path.replace(/\/$/, ""));
    if (path.includes("/") && !repo.top.has(first) && !looksLikeFile) continue;
    if (!path.includes("/") && !repo.exists(path) && !looksLikeFile) continue;
    const after = flat.slice((m.index ?? 0) + m[0].length);
    out.push({ path, isNew: /^\s*@@new@@/.test(after) });
  }
  return out;
}

const hasHours = (s: string): boolean => /\b\d+(?:\.\d+)?\s*hours?\b/i.test(s);
const MONTHS = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";

/** The roots listed in docs/pool/roots.md (`- \`id\`: ...`), or null when the file is missing. */
export function readRoots(poolDir: string): Set<string> | null {
  const p = join(poolDir, "roots.md");
  if (!existsSync(p)) return null;
  const ids = new Set<string>();
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^[-*]\s+`([a-z0-9][a-z0-9-]*)`/.exec(line);
    if (m) ids.add(m[1]);
  }
  return ids;
}

export const SEEN_KINDS = ["Seen:", "Feeds:", "Guards:"] as const;
export type SeenKind = (typeof SEEN_KINDS)[number];
/** An item id: lowercase words joined by hyphens. */
const ITEM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)+/;
/** Items still in the Nov 10 depth sweep are let through until it reaches them. */
const NOT_YET_SWEPT = ["open", "claimed", "blocked", "in-pr"];
/**
 * The `checked:` value of every item that existed when the seen-line rule began.
 * Such an item is not held to the rule yet. Delete this constant, and the
 * exemption in standardProblems, when the depth sweep of Nov 10
 * (docs/pool/DEPTH-SWEEP.md) is merged.
 */
export const SWEEP_PENDING_CHECKED = "fable 2026-11-10";

/**
 * Five items filed on Nov 10 before this rule, with no `checked:` field yet,
 * that are on the depth sweep's lists: the sweep writes their sentence.
 * Deleted with SWEEP_PENDING_CHECKED when the sweep is merged.
 */
export const SWEEP_PENDING_IDS: readonly string[] = [
  "core2-three-test-files-cannot-load",
  "laws-price-questions-without-an-axis",
  "play-plain-text-check-stops-at-filing-counter",
  "play-talk-no-say-nothing-when-nothing-left",
  "pool-release-cause-differs-reoffered",
];

/**
 * The sentence of a What section that says where the player sees the result
 * (owner, Nov 10, 2026): it begins Seen:, Feeds: or Guards:, as the last
 * sentence of the section or on a line of its own. Returns the kind and the
 * rest of the sentence, or null.
 */
export function seenLine(
  what: string,
): { kind: SeenKind; rest: string } | null {
  const lines = what.split(/\r?\n/).map((l) => l.trim());
  const last =
    what
      .trim()
      .split(/(?<=[.!?])\s+/)
      .pop() ?? "";
  for (const cand of [...lines, last]) {
    const kind = SEEN_KINDS.find((k) => cand.startsWith(k));
    if (kind) return { kind, rest: cand.slice(kind.length).trim() };
  }
  return null;
}

/** The item id a `Feeds:` line names, or null. */
export const feedsId = (what: string): string | null => {
  const s = seenLine(what);
  if (s?.kind !== "Feeds:") return null;
  return ITEM_ID.exec(s.rest)?.[0] ?? null;
};

/** Problems for an item that carries `standard`; none for an item without it. */
export function standardProblems(
  file: string,
  fm: Record<string, string>,
  text: string,
  repo: Repo,
  roots: Set<string> | null,
): string[] {
  if (fm.standard === undefined) return [];
  const id = file.replace(/\.md$/, "");
  const errs: string[] = [];
  const say = (m: string): number => errs.push(`${id}: ${m}`);
  if (fm.standard !== "2") say(`standard must be 2 (has "${fm.standard}")`);
  if (!MODELS.includes(fm.model ?? ""))
    say(`model "${fm.model ?? ""}" is not one of ${MODELS.join(" | ")}`);
  if (!EFFORTS.includes(fm.effort ?? ""))
    say(`effort "${fm.effort ?? ""}" is not one of ${EFFORTS.join(" | ")}`);
  if (!fm.root) say("root is missing (an id from docs/pool/roots.md, or none)");
  else if (fm.root !== "none" && !roots?.has(fm.root))
    say(`root "${fm.root}" is not listed in docs/pool/roots.md`);
  if (!fm.lead) say("lead is missing");
  for (const k of ["after", "blocked-on"])
    if (!(k in fm)) say(`${k} must be present (it may be empty)`);
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
  let last = -1;
  for (const name of SECTIONS) {
    const at = body.search(new RegExp(`^\\*\\*${name}\\.?\\*\\*`, "m"));
    if (at < 0) say(`section **${name}.** is missing`);
    else {
      if (at < last) say(`section **${name}.** is out of order`);
      last = at;
      if (!section(text, name)) say(`section **${name}.** is empty`);
    }
  }
  const heldToSeen =
    NOT_YET_SWEPT.includes(fm.status ?? "") &&
    fm.checked !== SWEEP_PENDING_CHECKED &&
    !SWEEP_PENDING_IDS.includes(id);
  const what = section(text, "What");
  if (heldToSeen && what) {
    const seen = seenLine(what);
    if (
      !seen ||
      (seen.kind === "Feeds:" && !feedsId(what)) ||
      (seen.kind !== "Feeds:" && seen.rest.split(/\s+/).length < 4)
    )
      say(
        "What must end with where the player sees it: a sentence that begins Seen:, Feeds: <item id> or Guards:",
      );
  }
  const cause = section(text, "Cause");
  const kind = causeKind(text);
  if (cause && !kind)
    say(`Cause must begin with ${CAUSE_KINDS.map((k) => `"${k}"`).join(", ")}`);
  const rest = kind ? cause.slice(kind.length).trim() : "";
  if (kind && !rest) say(`Cause says "${kind}" and nothing after it`);
  if (kind === "Found in code:") {
    const real = pathsIn(rest, repo).filter(
      (p) => !p.isNew && repo.exists(p.path),
    );
    if (!real.length)
      say("Found in code: names no repository path that exists");
    else if (
      !/:\d+/.test(rest) &&
      !/\blines? \d+/i.test(rest) &&
      !/`[A-Za-z_$][\w$.]*(?:\(\))?`/.test(rest)
    )
      say("Found in code: needs a line number or a function name");
  } else if (kind === "Measured:") {
    if (!/\bseed\b/i.test(rest) && !/\b(?:npm run|npx|node)\s+\S/.test(rest))
      say("Measured: needs a place and a seed, or the command that shows it");
  } else if (kind === "Design:") {
    const doc = pathsIn(rest, repo).some(
      (p) => p.path.startsWith("docs/") && repo.exists(p.path),
    );
    const ruling = new RegExp(
      `owner[^.\\n]{0,60}\\b${MONTHS}[a-z]*\\.? \\d{1,2}`,
      "i",
    ).test(rest);
    if (!doc && !ruling)
      say(
        "Design: needs a path under docs/ that exists, or a dated owner ruling",
      );
  }
  const fix = section(text, "Fix");
  if (fix) {
    if (kind === "Needs cause." && fix !== NO_FIX)
      say(`Fix for a Needs cause. item reads "${NO_FIX}"`);
    if (kind && kind !== "Needs cause." && fix === NO_FIX)
      say("Fix says None until the cause is found, but the cause is known");
  }
  const box = section(text, "Time box");
  if (box && !hasHours(box)) say("Time box names no number of hours");
  const done = section(text, "Done when");
  if (done && !/second session/i.test(done))
    say('Done when must say what a "second session" sees in the running game');
  if (done && !/\b(drawn|place)\b/i.test(done))
    say("Done when must name a drawn place");
  const files = section(text, "Files").replace(/\((?!new\))[^)]*\)/gi, " ");
  if (files) {
    const named = pathsIn(files, repo);
    if (!named.length) say("Files names no path");
    for (const p of named)
      if (!p.isNew && !repo.exists(p.path))
        say(
          `Files names ${p.path}, which does not exist (add " (new)" if it will)`,
        );
  }
  return errs;
}

/** Required fields and sections an item lacks, for any item (the audit reads old ones too). */
export function lacks(fm: Record<string, string>, text: string): string[] {
  const out: string[] = [];
  for (const k of ["model", "effort", "root", "lead"]) if (!fm[k]) out.push(k);
  for (const k of ["after", "blocked-on"]) if (!(k in fm)) out.push(k);
  for (const name of SECTIONS) {
    const s = section(text, name);
    if (!s || (name === "Time box" && !hasHours(s))) out.push(name);
  }
  return out;
}
