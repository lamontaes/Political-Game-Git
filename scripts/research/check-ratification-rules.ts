/**
 * Checks data/research/legislature/federal-amendment-ratification-rules-2026.json:
 * the vote each state legislature needs to ratify a proposed amendment to the
 * U.S. Constitution. It is the shape Team 2's ratification roll call reads, so
 * the check holds the file to that shape: all 50 states, the right chambers,
 * a threshold and quorum that mean one thing, a citation behind every chamber,
 * and a plain "INFERRED" or "UNSOURCED" note wherever the threshold is a
 * general rule applied rather than a rule about ratification.
 *
 *   node --import tsx scripts/research/check-ratification-rules.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
export const RATIFICATION_RULES = resolve(
  root,
  "data/research/legislature/federal-amendment-ratification-rules-2026.json",
);

export const STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

const NON_STATES = ["US-DC", "US-PR", "US-GU", "US-VI", "US-AS", "US-MP"];
const RULE_KINDS = new Set([
  "ratification-specific",
  "ratification-specific-unenforced",
  "resolution-rule",
  "bill-rule-by-reference",
  "bill-rule-assumed",
  "default",
  "default-unsourced",
]);
const FRACTIONS = new Set(["1/2", "3/5", "2/3"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Citation {
  readonly text?: unknown;
  readonly url?: unknown;
  readonly accessed?: unknown;
}
interface Chamber {
  readonly chamber?: unknown;
  readonly threshold?: {
    readonly basis?: unknown;
    readonly fraction?: unknown;
    readonly strictlyGreater?: unknown;
    readonly presentMeans?: unknown;
    readonly alsoRequires?: { readonly minYesFractionOfElected?: unknown };
  };
  readonly quorum?: {
    readonly basis?: unknown;
    readonly fraction?: unknown;
    readonly strictlyGreater?: unknown;
    readonly text?: unknown;
  };
  readonly rounding?: unknown;
  readonly ruleKind?: unknown;
  readonly onTheBooks?: unknown;
  readonly citations?: readonly Citation[];
  readonly notes?: unknown;
}
interface Row {
  readonly stateKey?: unknown;
  readonly chambers?: readonly Chamber[];
  readonly sameResolutionBothChambers?: unknown;
}
interface RatificationRules {
  readonly rows?: readonly Row[];
  readonly nonRatifying?: readonly {
    readonly stateKey?: unknown;
    readonly ratifies?: unknown;
  }[];
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function checkFraction(
  where: string,
  fraction: unknown,
  strict: unknown,
  problems: string[],
): void {
  if (typeof fraction !== "string" || !FRACTIONS.has(fraction))
    problems.push(
      `${where}: fraction ${String(fraction)} is not 1/2, 3/5 or 2/3`,
    );
  else if (typeof strict !== "boolean")
    problems.push(`${where}: strictlyGreater must be true or false`);
  else if ((fraction === "1/2") !== strict)
    problems.push(
      `${where}: a majority (1/2) is strictlyGreater true and a supermajority is false`,
    );
}

/** Every problem found in the ratification-rules file; empty when it holds. */
export function checkRatificationRules(data: RatificationRules): string[] {
  const problems: string[] = [];
  const rows = data.rows ?? [];
  const keys = rows.map((row) => String(row.stateKey));
  const expected = STATE_CODES.map((code) => `US-${code}`);
  for (const key of expected)
    if (!keys.includes(key)) problems.push(`${key}: no row`);
  for (const key of keys)
    if (!expected.includes(key)) problems.push(`${key}: not a state`);
  if (new Set(keys).size !== keys.length)
    problems.push("a state appears twice");
  for (const row of rows) {
    const key = String(row.stateKey);
    const chambers = row.chambers ?? [];
    const names = chambers.map((chamber) => String(chamber.chamber));
    const wanted = key === "US-NE" ? ["legislature"] : ["house", "senate"];
    if (names.join() !== wanted.join())
      problems.push(
        `${key}: chambers ${names.join()} should be ${wanted.join()}`,
      );
    if (row.sameResolutionBothChambers !== true)
      problems.push(`${key}: sameResolutionBothChambers must be true`);
    for (const chamber of chambers) {
      const where = `${key} ${String(chamber.chamber)}`;
      const threshold = chamber.threshold;
      if (!threshold) {
        problems.push(`${where}: no threshold`);
        continue;
      }
      if (threshold.basis !== "elected" && threshold.basis !== "present")
        problems.push(`${where}: basis must be elected or present`);
      checkFraction(
        `${where} threshold`,
        threshold.fraction,
        threshold.strictlyGreater,
        problems,
      );
      if (threshold.basis === "present") {
        if (
          threshold.presentMeans !== "present-and-voting" &&
          threshold.presentMeans !== "members-present"
        )
          problems.push(`${where}: a present basis needs presentMeans`);
      } else if (threshold.presentMeans !== undefined)
        problems.push(`${where}: presentMeans only goes with a present basis`);
      const floor = threshold.alsoRequires?.minYesFractionOfElected;
      if (floor !== undefined && floor !== "2/5")
        problems.push(
          `${where}: minYesFractionOfElected ${String(floor)} is not 2/5`,
        );
      const quorum = chamber.quorum;
      if (!quorum || !text(quorum.text) || quorum.basis !== "elected")
        problems.push(`${where}: quorum needs a basis of elected and its text`);
      else if (quorum.fraction !== "1/2" && quorum.fraction !== "2/3")
        problems.push(`${where}: quorum fraction must be 1/2 or 2/3`);
      else
        checkFraction(
          `${where} quorum`,
          quorum.fraction,
          quorum.strictlyGreater,
          problems,
        );
      if (!text(chamber.rounding))
        problems.push(`${where}: no rounding statement`);
      const kind = String(chamber.ruleKind);
      if (!RULE_KINDS.has(kind))
        problems.push(`${where}: ruleKind ${kind} unknown`);
      const notes = typeof chamber.notes === "string" ? chamber.notes : "";
      if (kind === "bill-rule-assumed" && !notes.includes("INFERRED"))
        problems.push(
          `${where}: an assumed rule must say INFERRED in its notes`,
        );
      if (kind === "default-unsourced" && !notes.includes("UNSOURCED"))
        problems.push(
          `${where}: an unsourced default must say UNSOURCED in its notes`,
        );
      if (kind === "ratification-specific-unenforced" && !chamber.onTheBooks)
        problems.push(`${where}: an unenforced rule needs onTheBooks`);
      const citations = chamber.citations ?? [];
      if (citations.length === 0) problems.push(`${where}: no citation`);
      for (const citation of citations) {
        if (
          !text(citation.text) ||
          typeof citation.url !== "string" ||
          !citation.url.startsWith("https://") ||
          typeof citation.accessed !== "string" ||
          !DATE.test(citation.accessed)
        )
          problems.push(
            `${where}: a citation needs text, an https url and an accessed date`,
          );
      }
    }
  }
  const non = (data.nonRatifying ?? []).map((entry) => String(entry.stateKey));
  for (const key of NON_STATES)
    if (!non.includes(key)) problems.push(`${key}: missing from nonRatifying`);
  for (const entry of data.nonRatifying ?? [])
    if (entry.ratifies !== false)
      problems.push(`${String(entry.stateKey)}: must say ratifies false`);
  return problems;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  const data = JSON.parse(
    readFileSync(RATIFICATION_RULES, "utf8"),
  ) as RatificationRules;
  const problems = checkRatificationRules(data);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(
    `ratification rules: ${(data.rows ?? []).length} states, all checks pass`,
  );
}
