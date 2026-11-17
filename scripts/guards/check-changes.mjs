/* global console, process */
/**
 * No session edits the checks that judge it (the CTO's "how done is proven",
 * rule 1, on the crew issue). A pull request may not add an expected-failure,
 * skip, only or todo mark, a known-red row, a test pinned to a named town or
 * seed (or a drawn seed taken out of a test), or a larger baseline; and it
 * may not delete a test file, drop test
 * cases or drop assertions from a test file it keeps. Each of those needs a
 * line from the CTO on the crew issue that approves that pull request by
 * number. One pattern is allowed by name (the CTO's standing ruling): a test
 * moving to a drawn place may drop the case that only checked its pin.
 *
 * The rules are tests/guards/check-changes.json. The `checks-guard` workflow
 * runs this script and that file from main (pull_request_target), so a pull
 * request cannot loosen its own judge; it only reads the pull request's files
 * through git and never runs them. `npm run guards -- check-changes` runs the
 * same rules on a branch against origin/main before a push.
 *
 *   node scripts/guards/check-changes.mjs [--base <sha>] [--head <sha>]
 *
 * PR_NUMBER and GITHUB_REPOSITORY (with `gh` signed in) let it read the crew
 * issue for an approval. Without them a finding always fails.
 *
 * What it does not see: a tolerance widened inside an assertion, or a time
 * limit raised. A reader still checks those.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{ path: string, before: string | null, after: string | null }} Change */
/** @typedef {{ path: string, id: string, says: string }} Finding */

const count = (text, pattern) =>
  text === null ? 0 : (text.match(new RegExp(pattern, "g")) ?? []).length;

const CASES =
  "\\b(?:it|test)(?:\\.concurrent|\\.sequential)?(?:\\.fails|\\.each\\s*(?:\\([^)]*\\)|`[^`]*`))?\\s*\\(";
const ASSERTIONS = "\\b(?:expect(?:\\.soft)?|assert(?:\\.\\w+)?)\\s*\\(";

/**
 * What a set of changed files adds that the rules refuse.
 * @param {readonly Change[]} changes
 * @param {any} rules
 * @returns {Finding[]}
 */
export function checkChanges(changes, rules) {
  /** @type {Finding[]} */
  const findings = [];
  const isTest = new RegExp(rules.testFiles);
  const isBaseline = new RegExp(rules.baselines);
  const baselineRoot = new RegExp(rules.baselineRoots);
  for (const change of changes) {
    const add = (id, says) => findings.push({ path: change.path, id, says });
    if (rules.ownFiles.includes(change.path))
      add("own-rules", "changes this guard's own rules, script or workflow");
    for (const rule of rules.counts) {
      if (!new RegExp(rule.files).test(change.path)) continue;
      const before = count(change.before, rule.pattern),
        after = count(change.after, rule.pattern);
      if (rule.refuse === "fewer" ? after < before : after > before)
        add(
          rule.id,
          `${rule.refuse === "fewer" ? "takes out" : "adds"} ${rule.says} (${before} before, ${after} after)`,
        );
    }
    if (isTest.test(change.path)) {
      if (change.after === null) {
        add("test-deleted", "deletes a test file");
        continue;
      }
      if (change.before === null) continue;
      // The CTO's standing ruling: a test moving to a drawn place may drop
      // the case that only checked its pin. Those cases and their assertions
      // are allowed by name; every other drop is still a finding.
      const pinOnly = pinOnlyRemoved(change.before, change.after, rules);
      for (const [id, pattern, what, allowed] of [
        ["cases-dropped", CASES, "test cases", pinOnly.cases],
        ["assertions-dropped", ASSERTIONS, "assertions", pinOnly.assertions],
      ]) {
        const before = count(change.before, pattern),
          after = count(change.after, pattern);
        if (after + allowed < before)
          add(id, `drops ${what} (${before} before, ${after} after)`);
      }
    }
    if (
      isBaseline.test(change.path) &&
      baselineRoot.test(change.path) &&
      change.before !== null &&
      change.after !== null
    ) {
      const lines = (text) => text.split("\n").length;
      if (lines(change.after) > lines(change.before))
        add(
          "baseline-raised",
          `makes a baseline larger (${lines(change.before)} lines before, ${lines(change.after)} after)`,
        );
    }
  }
  return findings;
}

const CASE_TITLE =
  "\\b(?:it|test)(?:\\.\\w+)*\\s*\\(\\s*([\"'`])((?:(?!\\1).)*)\\1";

/**
 * The pin-only cases a change removes while its file moves to a drawn place
 * (a drawn seed comes in, or a pinned place or seed goes out), and how many
 * assertions they held. Zero for any other change.
 */
export function pinOnlyRemoved(before, after, rules) {
  const none = { cases: 0, assertions: 0 };
  const rule = (id) => rules.counts.find((row) => row.id === id);
  const drawn = rule("drawn-seed-dropped"),
    pinned = rule("pinned-place-or-seed");
  const toDrawn =
    (drawn && count(after, drawn.pattern) > count(before, drawn.pattern)) ||
    (pinned && count(after, pinned.pattern) < count(before, pinned.pattern));
  if (!toDrawn || !rules.pinOnlyCase) return none;
  const isPinOnly = new RegExp(rules.pinOnlyCase, "i");
  const starts = [...before.matchAll(new RegExp(CASE_TITLE, "g"))];
  const kept = new Set(
    [...after.matchAll(new RegExp(CASE_TITLE, "g"))].map((m) => m[2]),
  );
  let cases = 0,
    assertions = 0;
  starts.forEach((match, i) => {
    if (kept.has(match[2]) || !isPinOnly.test(match[2])) return;
    const end = starts[i + 1]?.index ?? before.length;
    cases += 1;
    assertions += count(before.slice(match.index, end), ASSERTIONS);
  });
  return { cases, assertions };
}

/**
 * Whether a crew-issue comment approves this pull request's check changes:
 * a comment whose first line starts with "CTO:" and with a line that names
 * the pull request by number and says it is approved, never "not approved".
 */
export function approves(comment, number, rules) {
  const fill = (pattern) =>
    new RegExp(pattern.replaceAll("{number}", String(number)), "i");
  const lines = comment.replace(/\r\n/g, "\n").split("\n");
  const first = lines.find((text) => text.trim() !== "") ?? "";
  if (!fill(rules.approvalStart).test(first.trim())) return false;
  const approved = fill(rules.approvalLine),
    refused = fill(rules.approvalRefused);
  return lines.some((text) => approved.test(text) && !refused.test(text));
}

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "ignore"],
  });

function show(sha, file) {
  try {
    return git("show", `${sha}:${file}`);
  } catch {
    return null;
  }
}

/** The changed files between two commits; a rename is one change at its new path. */
function changesBetween(base, head) {
  const rows = git("diff", "--name-status", "-M", "-z", base, head)
    .split("\0")
    .filter(Boolean);
  /** @type {Change[]} */
  const changes = [];
  for (let at = 0; at < rows.length;) {
    const status = rows[at++];
    if (status.startsWith("R") || status.startsWith("C")) {
      const from = rows[at++],
        to = rows[at++];
      changes.push({
        path: to,
        before: status.startsWith("R") ? show(base, from) : null,
        after: show(head, to),
      });
    } else {
      const file = rows[at++];
      changes.push({
        path: file,
        before: status === "A" ? null : show(base, file),
        after: status === "D" ? null : show(head, file),
      });
    }
  }
  return changes;
}

function approvedOnCrewIssue(rules) {
  const number = process.env.PR_NUMBER,
    repository = process.env.GITHUB_REPOSITORY;
  if (!number || !repository) return false;
  try {
    // One JSON string per line, so a comment's own line breaks stay inside it.
    const bodies = execFileSync(
      "gh",
      [
        "api",
        "--paginate",
        `repos/${repository}/issues/${rules.crewIssue}/comments?per_page=100`,
        "--jq",
        '.[] | (.body // "") | @json',
      ],
      { encoding: "utf8", maxBuffer: 1 << 28 },
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return bodies.some((body) => approves(body, number, rules));
  } catch (error) {
    console.error(`Could not read the crew issue: ${error.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const option = (name) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const head = option("head") ?? "HEAD";
  const base = option("base") ?? git("merge-base", "origin/main", head).trim();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const rules = JSON.parse(
    readFileSync(
      path.join(here, "../../tests/guards/check-changes.json"),
      "utf8",
    ),
  );
  const findings = checkChanges(changesBetween(base, head), rules);
  if (findings.length === 0) {
    console.log("check-changes: this change loosens no check.");
    return;
  }
  for (const finding of findings)
    console.log(`${finding.path}: ${finding.says} [${finding.id}]`);
  if (approvedOnCrewIssue(rules)) {
    console.log(
      `check-changes: ${findings.length} finding(s), approved by a CTO line on issue #${rules.crewIssue} for #${process.env.PR_NUMBER}.`,
    );
    return;
  }
  console.error(
    `check-changes: ${findings.length} finding(s). No session edits the checks that judge it. ` +
      `Fix the cause and take the mark out, or ask on issue #${rules.crewIssue} for a line that starts "CTO:" and approves this pull request by number (CTO: check change approved #<number>).`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
