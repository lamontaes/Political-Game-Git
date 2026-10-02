import {
  reciprocalRankedReferences,
  weightedReferenceMean,
} from "./income-tax-withholding";
import {
  GOVERNOR_SALARY_ROWS,
  LEGISLATOR_SALARY_ROWS,
  OFFICE_PAY_META,
  TRIAL_JUDGE_SALARY_ROWS,
} from "./office-pay.generated";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import { workRoleAt } from "./life-queries";
import stateHouseholdIncome2023 from "../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import { censusRegionOf } from "./world-setup/census-regions";
import {
  enactedRuleChangeAt,
  officePayLawOfficeKey,
  ruleValueInWorld,
  type AmendableRuleField,
  type RuleChangeApplicability,
} from "./enacted-rule-changes";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  World,
  WorkRelationship,
} from "./types";

export { OFFICE_PAY_META };

/**
 * What a state pays for an office, where the game holds it.
 *
 * The Council of State Governments' Book of the States 2023: the governor's
 * annual salary (as of January 1, 2022) and a legislator's annual salary
 * (2023), locked in `data/source/book-of-the-states`. A state that pays its
 * legislators a per diem or a weekly amount instead of one annual salary, or
 * two salaries by chamber, is absent: unknown is unknown, never zero and never
 * a neighbor's figure.
 *
 * A judge is paid the state's general trial court salary (table 5.4): the
 * game's judicial office start does not record a court level, so a judge is
 * read as a trial court judge. GAME ASSUMPTION until it does.
 *
 * A member of Congress is paid the salary Congress has set since January 2009,
 * $174,000 (Congressional Research Service report 97-1011, locked in
 * `data/source/crs-member-pay`). The Speaker and the party leaders are paid
 * more; the game does not yet record who holds those posts, so they read as
 * members.
 *
 * Other statewide officers, mayors, council members and civil servants are
 * not held yet.
 */

/** A member of Congress's annual salary, unchanged since January 2009. */
export const CONGRESS_MEMBER_SALARY_DOLLARS = 174_000;

function parse(rows: string): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const row of rows.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), Number(row.slice(colon + 1)));
  }
  return map;
}

let governors: ReadonlyMap<string, number> | null = null;
let legislators: ReadonlyMap<string, number> | null = null;
let judges: ReadonlyMap<string, number> | null = null;

export type PaidOffice =
  "governor" | "state-legislator" | "trial-court-judge" | "member-of-congress";

export interface OfficePay {
  readonly office: PaidOffice;
  /** Postal code of the state or territory that pays it. */
  readonly state: string;
  readonly annualDollars: number;
}

/** A state's published annual pay for an office, or null when it holds none. */
export function statePayFor(
  office: PaidOffice,
  state: string,
): OfficePay | null {
  if (office === "member-of-congress")
    return {
      office,
      state: "US",
      annualDollars: CONGRESS_MEMBER_SALARY_DOLLARS,
    };
  governors ??= parse(GOVERNOR_SALARY_ROWS);
  legislators ??= parse(LEGISLATOR_SALARY_ROWS);
  judges ??= parse(TRIAL_JUDGE_SALARY_ROWS);
  const table =
    office === "governor"
      ? governors
      : office === "trial-court-judge"
        ? judges
        : legislators;
  const annualDollars = table.get(state);
  return annualDollars === undefined ? null : { office, state, annualDollars };
}

/** Each government's sourced annual pay for this same office category. */
function publishedAnnualPay(office: PaidOffice): readonly [string, number][] {
  governors ??= parse(GOVERNOR_SALARY_ROWS);
  legislators ??= parse(LEGISLATOR_SALARY_ROWS);
  judges ??= parse(TRIAL_JUDGE_SALARY_ROWS);
  const table =
    office === "governor"
      ? governors
      : office === "trial-court-judge"
        ? judges
        : legislators;
  return [...table.entries()];
}

// Immutable source packets: rank once per office/state, not each paycheck.
const ESTIMATED_OFFICE_PAY = new Map<
  string,
  OfficePay & { readonly basis: string }
>();

/**
 * A state's pay for an office when the tables give no annual figure for it:
 * ESTIMATED FROM AVERAGE. The owner's ranked-reference rule uses the same
 * sourced office category, then Census region, then household-income distance.
 * Reciprocal rank is the authored fallback from the accepted deduction reader,
 * not an empirical salary coefficient. Equal closeness shares a rank/weight.
 * With no sourced target income, use the same-office mean instead. The world's
 * seed never chooses a salary. This estimate is not a researched pay law or a
 * conversion of a per diem (`state-legislator-per-day-pay` remains needed).
 */
export function estimatedStatePay(
  _world: World,
  office: PaidOffice,
  state: string,
): (OfficePay & { readonly basis: string }) | null {
  if (office === "member-of-congress") return null;
  const key = `${office}:${state}`;
  const cached = ESTIMATED_OFFICE_PAY.get(key);
  if (cached) return cached;
  const values = publishedAnnualPay(office);
  if (values.length < 4) return null;
  const incomes: Readonly<Record<string, number>> =
    stateHouseholdIncome2023.medianHouseholdIncomeDollarsByState;
  const targetIncome = incomes[`US-${state}`];
  const targetRegion =
    targetIncome === undefined ? null : censusRegionOf(state);
  const references = values.flatMap(([referenceState, annualDollars]) => {
    const income = incomes[`US-${referenceState}`];
    if (targetIncome !== undefined && income === undefined) return [];
    return [
      {
        state: referenceState,
        annualDollars,
        sameRegion:
          targetRegion !== null &&
          censusRegionOf(referenceState) === targetRegion,
        incomeDistance:
          targetIncome === undefined ? 0 : Math.abs(income! - targetIncome),
      },
    ];
  });
  const compare = (
    a: (typeof references)[number],
    b: (typeof references)[number],
  ) =>
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistance - b.incomeDistance;
  const weighted = reciprocalRankedReferences(
    references,
    compare,
    (ref) => ref.state,
  );
  const mean = weightedReferenceMean(weighted, (ref) => ref.annualDollars);
  const annualDollars = Math.round(mean / 100) * 100;
  const estimate = {
    office,
    state,
    annualDollars,
    basis: `ESTIMATED FROM AVERAGE: ${weighted.length} sourced annual ${office} salaries (${OFFICE_PAY_META.source}); ${targetIncome === undefined ? "same-office plain mean; target household income is not read" : `ranked by Census region, then sourced household-income distance (${stateHouseholdIncome2023.source.url}); reciprocal-rank weights are an authored estimation rule`}. References: ${weighted.map((ref) => `${ref.state}:$${ref.annualDollars}, weight ${ref.weight}`).join("; ")}. This is not statutory salary authority.`,
  };
  ESTIMATED_OFFICE_PAY.set(key, estimate);
  return estimate;
}

const GOVERNOR_OCCUPATION = /^service:us-([a-z]{2})-governor$/;

/** Which paid office a work relationship holds, and the state that pays it. */
export function paidOfficeOf(
  world: World,
  work: WorkRelationship,
  cutoff?: HistoricalCutoff,
): { readonly office: PaidOffice; readonly state: string } | null {
  const role = workRoleAt(world, work.id, cutoff);
  if (!role) return null;
  if (work.kind === "employment:congress-member")
    return { office: "member-of-congress", state: "US" };
  if (
    work.kind === "employment:judicial-office-practice" &&
    role.title === "Judicial office principal"
  ) {
    const place = role.locationJurisdictionId
      ? lifePlaceByJurisdictionId(role.locationJurisdictionId)
      : null;
    const key = place?.stateJurisdictionKey ?? null;
    return key && /^US-[A-Z]{2}$/.test(key)
      ? { office: "trial-court-judge", state: key.slice(3) }
      : null;
  }
  if (work.kind === "employment:executive-office") {
    const match = GOVERNOR_OCCUPATION.exec(role.occupationClassification ?? "");
    return match
      ? { office: "governor", state: match[1]!.toUpperCase() }
      : null;
  }
  if (work.kind === "employment:legislative-member") {
    const jurisdiction = role.locationJurisdictionId
      ? world.jurisdictions[role.locationJurisdictionId]
      : undefined;
    const key = jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
    return key ? { office: "state-legislator", state: key.slice(3) } : null;
  }
  return null;
}

/**
 * The published pay for the office a work relationship holds: a governor from
 * the office's own state, a state legislator from the state whose legislature
 * the seat is in. Null for any other office, and for a state the tables do
 * not carry.
 */
export function publishedOfficePay(
  world: World,
  work: WorkRelationship,
): OfficePay | null {
  const held = paidOfficeOf(world, work);
  return held ? statePayFor(held.office, held.state) : null;
}

/** The rule field a state's pay law sets for each office it can set. */
const PAY_LAW_FIELD: Readonly<Partial<Record<PaidOffice, AmendableRuleField>>> =
  {
    governor: "pay.governor.annualDollars",
    "state-legislator": "pay.stateLegislator.annualDollars",
    "trial-court-judge": "pay.trialJudge.annualDollars",
  };

/** What a state's pay law did to an office's salary, when one did. */
export interface OfficePayLaw {
  readonly measureId: EntityId;
  readonly designation: string;
  readonly effectiveAt: IsoDate;
  readonly applicability: RuleChangeApplicability;
}

export interface OfficePayInForce {
  readonly annualDollars: number;
  /** The law that set it, or null while the published salary stands. */
  readonly law: OfficePayLaw | null;
  /** Why the figure is an estimate, when the tables give no salary for the state. */
  readonly estimatedBecause?: string;
}

/**
 * The annual pay an office carries on a date: what the state's pay law says if
 * one is operative, otherwise the published salary (null when the game holds
 * none).
 *
 * A law that says it reaches only terms beginning after its date does not
 * reach an office held since before it. A law silent on whom it reaches is
 * read as reaching the sitting holder at once. GAME ASSUMPTION: many state
 * constitutions bar changing an official's pay during the current term, and
 * which ones is a filed research question (`state-pay-change-during-term`).
 *
 * NOT MODELED: Congress. Its pay is set by federal statute, and federal
 * statutes are not recorded as rule changes yet; the Twenty-seventh Amendment
 * delay (a change takes effect only after the next House election) needs that
 * record first.
 */
export function officePayInForce(
  world: World,
  work: WorkRelationship,
  onDate: IsoDate,
): OfficePayInForce | null {
  const held = paidOfficeOf(world, work);
  if (!held) return null;
  const stated = statePayFor(held.office, held.state);
  const estimate =
    stated || held.state === "US"
      ? null
      : estimatedStatePay(world, held.office, held.state);
  const published = stated ?? estimate;
  const field = PAY_LAW_FIELD[held.office];
  if (field && held.state !== "US") {
    const law = ruleValueInWorld<number | null>(
      world,
      {
        jurisdiction: held.state,
        officeKey: officePayLawOfficeKey(held.state),
        field,
        onDate,
      },
      published?.annualDollars ?? null,
    );
    const reachesThisTerm =
      law.source === "enacted" &&
      !(
        law.applicability.appliesTo === "terms-beginning-after" &&
        work.startedAt < law.effectiveAt
      );
    if (
      law.source === "enacted" &&
      reachesThisTerm &&
      typeof law.value === "number"
    )
      return {
        annualDollars: law.value,
        law: {
          measureId: law.measureId,
          designation: law.designation,
          effectiveAt: law.effectiveAt,
          applicability: law.applicability,
        },
      };
  }
  return published
    ? {
        annualDollars: published.annualDollars,
        law: null,
        ...(estimate ? { estimatedBecause: estimate.basis } : {}),
      }
    : null;
}

/** Saved operative rule for the actual office; the same reader owns applicability. */
export function savedAnnualOfficePayRule(
  world: World,
  work: WorkRelationship,
  onDate: IsoDate,
) {
  const held = paidOfficeOf(world, work);
  const legal = officePayInForce(world, work, onDate);
  const field = held ? PAY_LAW_FIELD[held.office] : undefined;
  if (!held || !field || !legal?.law) return null;
  const rule = enactedRuleChangeAt(world, {
    stateUsps: held.state,
    officeKey: officePayLawOfficeKey(held.state),
    field,
    onDate,
  });
  if (
    !rule ||
    rule.measureId !== legal.law.measureId ||
    rule.value !== legal.annualDollars
  )
    throw new Error("Annual office pay differs from its saved authority");
  return { rule, legal, state: held.state, field };
}
