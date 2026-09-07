import type { ProseInventory } from "./inventory";
import type { ProseRecord } from "./types";

/**
 * What canonical data licenses each prose family's factual claims.
 *
 * The rule PR #119 established and this map preserves: **missing facts mean
 * omit the detail or withhold the scene.** Never a vague rescue — not
 * "something", not "the thing", not "somebody". A family whose grounding the
 * banks do not declare is reported as undeclared here, which is a finding for
 * the migration to answer, not a hole for the harness to fill. Nothing in this
 * file manufactures a fact.
 */

/** The canonical concerns PR #119 named as the ones prose most often invents. */
export const SENSITIVE_CONCERNS: readonly {
  key: string;
  label: string;
  /** How the banks' own grounding vocabulary names this concern. */
  matches: readonly string[];
}[] = [
  { key: "age", label: "Age", matches: ["age-at-least", "age-below", "age"] },
  {
    key: "enrollment",
    label: "Enrollment",
    matches: ["enrol", "school", "education", "training", "class"],
  },
  {
    key: "work-standing",
    label: "Work standing",
    matches: ["work", "employment", "shift", "job", "paid"],
  },
  {
    key: "colleague-identity",
    label: "Colleague or supervisor identity",
    matches: ["colleague", "supervisor", "coworker", "briefing-lead"],
  },
  {
    key: "activity-evidence",
    label: "Shift or activity evidence",
    matches: ["activity", "participation", "attend", "session", "organization"],
  },
  {
    key: "household-kinship",
    label: "Household and kinship",
    matches: ["household", "guardian", "kin", "sibling", "partner", "home"],
  },
  {
    key: "persistent-cast",
    label: "Persistent cast identity",
    matches: ["role:", "instance", "peer"],
  },
  {
    key: "incident-locality",
    label: "Incidents and locality",
    matches: ["incident", "place", "locality", "neighbour", "neighbor"],
  },
  {
    key: "elapsed-time",
    label: "Time elapsed",
    matches: ["days-since", "elapsed", "after-stage"],
  },
  {
    key: "candidacy",
    label: "Candidacy, election and office",
    matches: ["candidacy", "campaign", "election", "office", "treasury"],
  },
  {
    key: "measure",
    label: "Legislative measure and chamber",
    matches: ["measure", "rule-pack", "chamber", "committee"],
  },
];

export interface FamilyGrounding {
  readonly domain: string;
  readonly bank: string;
  readonly records: number;
  readonly withheld: number;
  /** Distinct grounding keys the bank declares for this family. */
  readonly groundingKeys: readonly string[];
  /** Which of the sensitive concerns this family's grounding touches. */
  readonly concerns: readonly string[];
  /** Records whose bank declares no grounding at all. */
  readonly undeclared: number;
  readonly undeclaredReasons: readonly string[];
}

export interface GroundingMap {
  readonly families: readonly FamilyGrounding[];
  /** Every withheld record and the exact missing evidence the bank names. */
  readonly withholdings: readonly {
    id: string;
    stableKey: string;
    reason: string;
  }[];
  readonly concernCoverage: Readonly<Record<string, number>>;
}

function concernsFor(keys: readonly string[]): readonly string[] {
  const found = new Set<string>();
  for (const concern of SENSITIVE_CONCERNS) {
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (concern.matches.some((needle) => lower.includes(needle))) {
        found.add(concern.key);
        break;
      }
    }
  }
  return [...found].sort();
}

export function buildGroundingMap(inventory: ProseInventory): GroundingMap {
  const byFamily = new Map<string, ProseRecord[]>();
  for (const record of inventory.records) {
    const key = `${record.domain}/${record.bank}`;
    const list = byFamily.get(key) ?? [];
    list.push(record);
    byFamily.set(key, list);
  }

  const families: FamilyGrounding[] = [];
  for (const [key, list] of [...byFamily.entries()].sort(([left], [right]) =>
    left < right ? -1 : 1,
  )) {
    const [domain = "", bank = ""] = key.split("/");
    const groundingKeys = new Set<string>();
    const undeclaredReasons = new Set<string>();
    let undeclared = 0;
    for (const record of list) {
      if (record.grounding.length === 0) {
        undeclared += 1;
        continue;
      }
      let declaresSomething = false;
      for (const ref of record.grounding) {
        groundingKeys.add(ref.key);
        if (ref.kind === "undeclared") undeclaredReasons.add(ref.description);
        else declaresSomething = true;
      }
      if (!declaresSomething) undeclared += 1;
    }
    const keys = [...groundingKeys].sort();
    families.push({
      domain,
      bank,
      records: list.length,
      withheld: list.filter(
        (record) => record.reachability === "WITHHELD_BY_GROUNDING",
      ).length,
      groundingKeys: keys,
      concerns: concernsFor(keys),
      undeclared,
      undeclaredReasons: [...undeclaredReasons].sort(),
    });
  }

  const withholdings = inventory.records
    .filter((record) => record.reachability === "WITHHELD_BY_GROUNDING")
    .map((record) => ({
      id: record.id,
      stableKey: record.stableKey,
      reason: record.reachabilityReason,
    }));

  const concernCoverage: Record<string, number> = {};
  for (const concern of SENSITIVE_CONCERNS) {
    concernCoverage[concern.key] = families.filter((family) =>
      family.concerns.includes(concern.key),
    ).length;
  }

  return { families, withholdings, concernCoverage };
}

export function groundingMarkdown(map: GroundingMap): string {
  const familyRows = map.families
    .map(
      (family) =>
        `| \`${family.domain}/${family.bank}\` | ${family.records} | ${family.withheld} | ${family.undeclared} | ${family.concerns.join(", ") || "—"} |`,
    )
    .join("\n");

  const concernRows = SENSITIVE_CONCERNS.map(
    (concern) =>
      `| ${concern.label} | ${map.concernCoverage[concern.key] ?? 0} |`,
  ).join("\n");

  const distinctWithholdings = new Map<string, string[]>();
  for (const entry of map.withholdings) {
    const list = distinctWithholdings.get(entry.reason) ?? [];
    list.push(entry.stableKey);
    distinctWithholdings.set(entry.reason, list);
  }
  const withheldRows = [...distinctWithholdings.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(
      ([reason, stages]) =>
        `- **${[...new Set(stages)].sort().join(", ")}** — ${reason}`,
    )
    .join("\n");

  const undeclared = map.families.filter(
    (family) => family.undeclaredReasons.length > 0,
  );

  return `# Grounding and fact-packet map

For every prose family, the canonical data that licenses its factual claims.

**The rule this preserves, from merged PR #119: missing facts mean omit the
detail or withhold the scene.** Never a vague rescue — not "something", not
"the thing", not "somebody", not "whatever". Nothing in this map manufactures a
fact to make a scene eligible, and a family whose grounding the banks do not
declare is reported as undeclared rather than filled in from a guess.

## By family

| Family | Templates | Withheld | Undeclared grounding | Canonical concerns |
| --- | --- | --- | --- | --- |
${familyRows}

## The concerns PR #119 named

These are the facts prose most often invents when the record is silent. The
count is how many families' declared grounding touches each one.

| Concern | Families touching it |
| --- | --- |
${concernRows}

## Withheld scenes and the evidence each one is missing

${map.withholdings.length} templates across ${distinctWithholdings.size} distinct
missing-evidence reasons. Each reason is the bank's own, read from the stage's
\`withheld\` requirement rather than restated here.

${withheldRows}

## Families whose grounding the banks do not declare

${
  undeclared.length === 0
    ? "None."
    : undeclared
        .map(
          (family) =>
            `- \`${family.domain}/${family.bank}\` — ${family.undeclaredReasons.join(" ")}`,
        )
        .join("\n")
}

An undeclared dimension is a question for the prose migration to answer at the
bank, not a hole for this harness to fill.
`;
}
