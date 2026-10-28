/* global console, process */
/**
 * The reading line: a pull request that asks the owner something shows it
 * looked first (`.agents/rules/smart-and-look-first.md`, the look-first
 * skill). If the body's OWNER DECISIONS NEEDED section says anything but
 * "none", it must contain `Read: OWNER-DECISIONS`.
 *
 * The body comes from PR_BODY_FILE (a local file), or from the pull request
 * named by PR_NUMBER and GITHUB_REPOSITORY, read live so an edited body is
 * judged as it stands. With neither (a push, a local run), there is no body
 * and the check passes.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HEADING = /OWNER DECISIONS NEEDED/i;

/** The text of the OWNER DECISIONS NEEDED section, or null when there is none. */
export function ownerDecisionsSection(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => HEADING.test(line));
  if (start === -1) return null;
  const first = lines[start]
    .replace(/^#+\s*/, "")
    .replace(/\*\*\s*OWNER DECISIONS NEEDED\.?\s*\*\*/i, "")
    .replace(/OWNER DECISIONS NEEDED\.?:?/i, "")
    .trim();
  const rest = [];
  for (const line of lines.slice(start + 1)) {
    // The next section: a heading, a bold lead-in paragraph, or a rule.
    if (
      /^#+\s/.test(line) ||
      /^\*\*[^*]+\*\*/.test(line) ||
      /^---\s*$/.test(line)
    )
      break;
    rest.push(line);
  }
  return [first, ...rest].join("\n").trim();
}

/** A problem with the body, or null when it passes. */
export function readingLineProblem(body) {
  const section = ownerDecisionsSection(body);
  if (section === null || section === "") return null;
  if (/^(?:none|nothing|n\/a)\b/i.test(section.replace(/^[-*>\s]+/, "")))
    return null;
  if (/Read: OWNER-DECISIONS/.test(section)) return null;
  return (
    "The OWNER DECISIONS NEEDED section asks something but has no reading line. " +
    "End each question with `Read: OWNER-DECISIONS (<newest ruling read>), DECISION-REGISTER, " +
    "prior-rulings/<file>, LAW; searched: <terms>` after running the look-first search, " +
    'or write "None." if nothing is asked.'
  );
}

function body() {
  if (process.env.PR_BODY_FILE)
    return readFileSync(process.env.PR_BODY_FILE, "utf8");
  const number = process.env.PR_NUMBER;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!number || !repository) return null;
  return execFileSync(
    "gh",
    ["api", `repos/${repository}/pulls/${number}`, "--jq", '.body // ""'],
    { encoding: "utf8" },
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const text = body();
  if (text === null) {
    console.log(
      "reading line: no pull request body to read (push or local run).",
    );
  } else {
    const problem = readingLineProblem(text);
    if (problem) {
      console.error(problem);
      process.exitCode = 1;
    } else console.log("reading line: OK");
  }
}
