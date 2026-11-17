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
import { existsSync, readFileSync } from "node:fs";
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
export function checkChanges(
  changes,
  rules,
  readHead = () => null,
  spellings = () => [],
  sourcedRows = new Map(),
) {
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
    // A test that reads a research file may not add range assertions: a
    // band a world must stay inside is how a published figure becomes a pin
    // (owner, Nov 17: "Everything comes from the simulation"). A relationship
    // checked against research is written with its own approved line.
    const research = new RegExp(rules.researchImport);
    if (
      isTest.test(change.path) &&
      change.after !== null &&
      research.test(change.after)
    ) {
      const before =
          change.before === null
            ? 0
            : count(change.before, rules.rangeAssertion),
        after = count(change.after, rules.rangeAssertion);
      if (after > before)
        add(
          "research-band",
          `adds range assertions to a test that reads research data (${before} before, ${after} after)`,
        );
    }
    // Skills, rules and docs are written in American English, as player text
    // is (owner; "cancelled" turned every pull request red on Nov 17): a
    // change may not add a British spelling to them.
    if (
      new RegExp(rules.spellingFiles).test(change.path) &&
      change.after !== null
    ) {
      const words = (text) =>
        text === null
          ? []
          : spellings(text).map((f) => f.british.toLowerCase());
      const before = words(change.before),
        after = words(change.after);
      if (after.length > before.length)
        add(
          "british-spelling",
          `adds British spelling (${[...new Set(after.filter((w) => !before.includes(w)))].join(", ") || after.length - before.length + " more"})`,
        );
    }
    // Calibration, not pins (owner, Nov 16: "Everything comes from the
    // simulation"; CTO, Nov 17 on the crew issue, item 7): new code may not
    // read a SOURCED parameter as a level or an opening value. Real data sets
    // only a relationship's strength (role coefficient) or the law in force
    // (role law). A SOURCED row with no role cannot be told apart, so a new
    // read of one is reported too: give the row its role.
    if (
      new RegExp(rules.sourcedReadFiles).test(change.path) &&
      !isTest.test(change.path) &&
      change.after !== null
    ) {
      const before = literalCounts(change.before, sourcedRows),
        after = literalCounts(change.after, sourcedRows);
      for (const [id, kind, says] of [
        ["sourced-level-read", "level", "a level or an opening value"],
        [
          "sourced-unlabeled-read",
          "unlabeled",
          "a value whose row has no role",
        ],
      ]) {
        const added = [...after]
          .filter(
            ([name, n]) =>
              sourcedRows.get(name) === kind && n > (before.get(name) ?? 0),
          )
          .map(([name]) => name);
        if (added.length)
          add(
            id,
            `adds a read of a SOURCED parameter as ${says} (${added.join(", ")})`,
          );
      }
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
  findings.push(...wholeChangeFindings(changes, rules, readHead));
  return findings;
}

/**
 * How often each SOURCED parameter's id appears as a string literal.
 * @param {string | null} text
 * @param {Map<string, string>} rows id to "level" or "unlabeled"
 */
function literalCounts(text, rows) {
  const counts = new Map();
  if (text === null || rows.size === 0) return counts;
  for (const match of text.matchAll(/["'`]([A-Za-z][\w.-]*)["'`]/g))
    if (rows.has(match[1]))
      counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  return counts;
}

/**
 * The SOURCED parameter rows that new code may not read as a level: role
 * level or opening ("level"), or no role at all ("unlabeled"). A row is an
 * object with a numeric value and a tag; its id is its `id` field or its key,
 * and a one-word key is skipped.
 * @param {readonly { path: string, text: string }[]} files parameter files
 * @returns {Map<string, string>}
 */
export function sourcedLevelRows(files) {
  const rows = new Map();
  const walk = (node, key) => {
    if (Array.isArray(node)) return node.forEach((item) => walk(item));
    if (!node || typeof node !== "object") return;
    if (typeof node.value === "number" && node.tag === "SOURCED") {
      const named = typeof node.id === "string" ? node.id : key;
      // A one-word key ("zero", "farm", "reference") names a slot in a
      // nested table, not a parameter that code reads by name.
      const id = named && !/^[a-z]+$/.test(named) ? named : undefined;
      if (id && node.role === undefined) rows.set(id, "unlabeled");
      else if (id && (node.role === "level" || node.role === "opening"))
        rows.set(id, "level");
    }
    for (const [k, v] of Object.entries(node)) walk(v, k);
  };
  for (const file of files) {
    try {
      walk(JSON.parse(file.text));
    } catch {
      // Not JSON this guard can read; the parameter guards judge it.
    }
  }
  return rows;
}

/**
 * Rules read across the whole change, not file by file (skills policy, Nov
 * 17: rules that must always hold become checks). A change that adds a skill
 * retires as many in the same change, so the count never grows; and a new
 * guard test file is named in the guard list, so every guard runs.
 * @param {readonly Change[]} changes
 * @param {any} rules
 * @param {(path: string) => string | null} readHead the file as the change leaves it
 * @returns {Finding[]}
 */
function wholeChangeFindings(changes, rules, readHead) {
  /** @type {Finding[]} */
  const findings = [];
  const isSkill = new RegExp(rules.skillFiles);
  const added = changes.filter(
    (c) => isSkill.test(c.path) && c.before === null && c.after !== null,
  );
  const retired = changes.filter(
    (c) => isSkill.test(c.path) && c.before !== null && c.after === null,
  ).length;
  if (added.length > retired)
    for (const change of added)
      findings.push({
        path: change.path,
        id: "skill-added",
        says: `adds a skill without retiring one (${added.length} added, ${retired} retired)`,
      });
  // The two skill trees are one skill twice: a changed file under either
  // must leave both copies the same.
  const mirror = new RegExp(rules.skillMirror);
  const seen = new Set();
  for (const change of changes) {
    const m = mirror.exec(change.path);
    if (!m || seen.has(m[2])) continue;
    seen.add(m[2]);
    const read = (tree) => {
      const file = `${tree}/skills/${m[2]}`;
      const changed = changes.find((c) => c.path === file);
      return changed ? changed.after : readHead(file);
    };
    if (read(".agents") !== read(".claude"))
      findings.push({
        path: change.path,
        id: "skill-copies-differ",
        says: `leaves .agents/skills/${m[2]} and .claude/skills/${m[2]} different`,
      });
  }
  const isGuard = new RegExp(rules.guardTests);
  const list =
    changes.find((c) => c.path === rules.guardList)?.after ??
    readHead(rules.guardList) ??
    "";
  for (const change of changes)
    if (
      isGuard.test(change.path) &&
      change.before === null &&
      change.after !== null &&
      !list.includes(change.path)
    )
      findings.push({
        path: change.path,
        id: "guard-unlisted",
        says: `adds a guard test that no guard runs (not named in ${rules.guardList})`,
      });
  return findings;
}

/**
 * The done-proof stamp a pull request body carries (done-proof, Nov 16): each
 * line starts a line of the body. Returns the lines it lacks.
 * @param {string} body
 * @param {any} rules
 * @returns {string[]}
 */
/**
 * A new rule starts in observe mode (CTO, Nov 17, 05:22Z on #9747: "How
 * every new gate starts: in observe mode first"): its findings are reported
 * and do not refuse the pull request, until the CTO takes its id out of
 * `observe` in the rules file on main.
 */
export function splitByMode(findings, rules) {
  const observe = new Set(rules.observe ?? []);
  return {
    enforced: findings.filter((finding) => !observe.has(finding.id)),
    observed: findings.filter((finding) => observe.has(finding.id)),
  };
}

export function stampMissing(body, rules) {
  return rules.stampLines.filter(
    (line) => !new RegExp(`^${line}`, "m").test(body),
  );
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

async function main() {
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
  const { britishSpellings } =
    await import("../prose-eval/american-spelling.ts");
  const findings = checkChanges(
    changesBetween(base, head),
    rules,
    (file) => show(head, file),
    britishSpellings,
    sourcedLevelRows(
      git("ls-files", "--", ...rules.parameterFiles)
        .split("\n")
        .filter((file) => file && existsSync(file))
        .map((file) => ({ path: file, text: readFileSync(file, "utf8") })),
    ),
  );
  if (process.env.PR_BODY !== undefined)
    for (const line of stampMissing(process.env.PR_BODY, rules))
      findings.push({
        path: "(pull request body)",
        id: "stamp-missing",
        says: `lacks the done-proof stamp line "${line}"`,
      });
  if (findings.length === 0) {
    console.log("check-changes: this change loosens no check.");
    return;
  }
  const { enforced, observed } = splitByMode(findings, rules);
  for (const finding of observed)
    console.log(
      `${process.env.GITHUB_ACTIONS ? "::warning::" : ""}${finding.path}: ${finding.says} [${finding.id}, observe mode: reported, not refused]`,
    );
  for (const finding of enforced)
    console.log(`${finding.path}: ${finding.says} [${finding.id}]`);
  if (enforced.length === 0) {
    console.log(
      `check-changes: ${observed.length} finding(s), all from rules in observe mode; the CTO switches a rule to enforce by taking its id out of "observe" in tests/guards/check-changes.json on main.`,
    );
    return;
  }
  if (approvedOnCrewIssue(rules)) {
    console.log(
      `check-changes: ${enforced.length} finding(s), approved by a CTO line on issue #${rules.crewIssue} for #${process.env.PR_NUMBER}.`,
    );
    return;
  }
  console.error(
    `check-changes: ${enforced.length} finding(s). No session edits the checks that judge it. ` +
      `Fix the cause and take the mark out, or ask on issue #${rules.crewIssue} for a line that starts "CTO:" and approves this pull request by number (CTO: check change approved #<number>).`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  await main();
