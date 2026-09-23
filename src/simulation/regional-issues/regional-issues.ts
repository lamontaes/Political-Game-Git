import { US_STATE_AND_LOCAL_POLICY_PACK } from "../policy-pack-us-state-and-local";
import { POLITICAL_CULTURE_JURISDICTIONS } from "../nationwide-world/political-culture";
import type { IsoDate } from "../types";
import {
  regionalMeasuresOn,
  type RegionalMeasureKey,
  type RegionalObservation,
} from "./regional-measures";

/**
 * The issues that dominate politics in a particular place: housing in Rhode
 * Island, say, the way the owner asked for it on 2026-09-23 ("I know in Rhode
 * Island housing is an issue. It's a big issue.").
 *
 * Two different things live here and must not be confused.
 *
 * 1. The regional issue record: which of the policy catalog's issues people in
 *    a place put at the top, and how far above the rest. That is a finding
 *    about public opinion, not something the figures below can decide, so it
 *    is AWAITING RESEARCH and empty for every one of the fifty-six places.
 *    Research question: `regional-issues-of-each-jurisdiction`. Blanket rule
 *    meanwhile: a place with no researched issues ranks none above the
 *    others, exactly as before this existed.
 *
 * 2. Measured pressures: the published figures (`regional-measures.ts`) laid
 *    beside the catalog issue each one measures, with the nation's figure for
 *    comparison. They are facts, and they are evidence a researcher can use,
 *    but they rank nothing: Rhode Island's housing price parity was 105.6
 *    against the nation's 100.6 in 2024, and its two-bedroom Fair Market Rent
 *    sits just under the national average, yet the owner names housing as a
 *    big issue there. How far above the nation a figure has to be before it becomes an
 *    issue is exactly the kind of number this project does not invent.
 */

export const REGIONAL_ISSUES_RESEARCH_QUESTION =
  "regional-issues-of-each-jurisdiction";

/**
 * How far an issue stands out in a place, ordered. "leading" is the one or
 * two issues a place's politics turn on; "major" is broadly shared; "notable"
 * matters to a real part of the place without dominating it.
 */
export type RegionalIssueProminence = "notable" | "major" | "leading";

export interface RegionalIssue {
  /** A policy catalog issue key, for example "housing-land-use.housing-affordability". */
  readonly issueKey: string;
  readonly prominence: RegionalIssueProminence;
  /**
   * Places inside the jurisdiction where it is concentrated, by life-place
   * key, or empty when it is statewide.
   */
  readonly concentratedIn: readonly string[];
  /** Internal record of the evidence. Never a player sentence. */
  readonly evidence: string;
  /** Research sources, as the answer cites them. */
  readonly sourceRefs: readonly string[];
}

export interface JurisdictionRegionalIssues {
  readonly jurisdictionKey: string;
  readonly basis: "awaiting-research" | "researched";
  /** Null until the research is answered: unknown, not "no issues". */
  readonly issues: readonly RegionalIssue[] | null;
}

/** The same fifty-six places political culture covers. */
export const REGIONAL_ISSUE_JURISDICTIONS = POLITICAL_CULTURE_JURISDICTIONS;

const RECORDS: Readonly<Record<string, JurisdictionRegionalIssues>> =
  Object.fromEntries(
    REGIONAL_ISSUE_JURISDICTIONS.map((jurisdictionKey) => [
      jurisdictionKey,
      { jurisdictionKey, basis: "awaiting-research", issues: null },
    ]),
  );

/** A place's regional issue record, or null for a key that is not one of the fifty-six. */
export function regionalIssuesFor(
  jurisdictionKey: string,
  records: Readonly<Record<string, JurisdictionRegionalIssues>> = RECORDS,
): JurisdictionRegionalIssues | null {
  return records[jurisdictionKey] ?? null;
}

const CATALOG_ISSUE_KEYS: ReadonlySet<string> = new Set(
  (US_STATE_AND_LOCAL_POLICY_PACK.issues ?? []).map((issue) => issue.key),
);

/** Every problem with a set of regional issue records; empty when they are sound. */
export function regionalIssueRecordProblems(
  records: Readonly<Record<string, JurisdictionRegionalIssues>> = RECORDS,
): readonly string[] {
  const problems: string[] = [];
  for (const jurisdictionKey of REGIONAL_ISSUE_JURISDICTIONS)
    if (!records[jurisdictionKey])
      problems.push(`${jurisdictionKey} has no regional issue record.`);
  for (const [key, record] of Object.entries(records)) {
    if (record.jurisdictionKey !== key)
      problems.push(`${key} is filed under the wrong key.`);
    if ((record.basis === "researched") !== (record.issues !== null))
      problems.push(`${key}: a researched record carries issues, and only it.`);
    const seen = new Set<string>();
    for (const issue of record.issues ?? []) {
      if (!CATALOG_ISSUE_KEYS.has(issue.issueKey))
        problems.push(`${key}: ${issue.issueKey} is not a catalog issue.`);
      if (seen.has(issue.issueKey))
        problems.push(`${key}: ${issue.issueKey} is listed twice.`);
      seen.add(issue.issueKey);
      if (issue.sourceRefs.length === 0)
        problems.push(`${key}: ${issue.issueKey} cites no source.`);
    }
  }
  return problems;
}

/**
 * Which catalog issue each published figure measures a side of. This says
 * what a figure is about, never how much it matters.
 */
export const MEASURE_BEARS_ON: Readonly<
  Record<RegionalMeasureKey, readonly string[]>
> = {
  housingPriceIndex: ["housing-land-use.housing-affordability"],
  twoBedroomFairMarketRent: ["housing-land-use.housing-affordability"],
  allItemsPriceIndex: [],
  perCapitaIncome: [],
  medianFamilyIncome: ["housing-land-use.housing-affordability"],
  unemploymentRate: [
    "labor-workforce.unemployment-insurance",
    "labor-workforce.workforce-training",
  ],
};

export interface MeasuredPressure {
  readonly issueKey: string;
  readonly measure: RegionalMeasureKey;
  readonly observation: RegionalObservation;
  /** The place's figure over the nation's, or null where there is no national figure. */
  readonly relativeToNation: number | null;
}

/** The published figures for a place on a date, laid beside the issues they measure. */
export function measuredPressures(
  jurisdictionKey: string,
  date: IsoDate,
): readonly MeasuredPressure[] {
  const measures = regionalMeasuresOn(jurisdictionKey, date);
  if (!measures) return [];
  return (Object.keys(MEASURE_BEARS_ON) as RegionalMeasureKey[]).flatMap(
    (measure) => {
      const observation = measures[measure];
      if (!observation) return [];
      const relativeToNation = observation.national
        ? observation.value / observation.national
        : null;
      return MEASURE_BEARS_ON[measure].map((issueKey) => ({
        issueKey,
        measure,
        observation,
        relativeToNation,
      }));
    },
  );
}
