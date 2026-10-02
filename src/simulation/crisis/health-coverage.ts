/**
 * Who holds Medicaid expansion coverage, person by person, and what it does to
 * their eligibility and enrollment.
 *
 * Coverage is decided from the person, the law and the place, never a roll:
 * an adult aged 19 to 64 whose household's recorded pay is at or under the
 * governing law's recorded share of the poverty line, living in a state whose law in force
 * expands Medicaid, is covered. Where a work requirement is in force (a
 * state's own, or the federal one from its operative date), an adult who
 * works under the required hours a month, and is not exempt, loses it.
 *
 * On the 15th of each month a pass reads everyone once and records a change
 * of coverage (never a repeat), so a law enacted, repealed or amended in play
 * starts or ends coverage at the next pass, and so does a raise, a lost job
 * or a birthday. It does not re-plan personal death or illness.
 *
 * Coverage records eligibility and enrollment only. The population mortality
 * study belongs to the place-level outcome web, not personal death strain.
 *
 * Game rules, labeled:
 * - Income is the household's recorded pay (Medicaid counts income, not
 *   savings). Pay the World does not record, such as a pension, is not
 *   counted; a household where someone works for pay the World does not
 *   record is left undecided, never read as earning nothing.
 * - Exempt from a work requirement, from the federal law's list: a parent of
 *   a child 13 or younger in the household, a person with an active serious
 *   illness (medically frail), and a student enrolled in school (education
 *   counts toward the hours). The law's other exemptions are not modeled.
 * - The poverty line is the HHS guideline of the year, or the latest year
 *   read; Alaska's and Hawaii's added-person amounts are ESTIMATED FROM
 *   AVERAGE, the contiguous amount scaled by their first-person ratio.
 * - A state that did not expand covers no adult here, even where it covers
 *   some adults below the poverty line (Wisconsin) or through a waiver of
 *   its own (Georgia Pathways).
 */
import programs from "../../../data/research/money/public-programs-2026.json" with { type: "json" };
import { ageOnDate, isoDateFromParts, yearOf } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import type { LawInForce } from "../governing/law-in-force";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import { readEligibilityLawsInForce } from "../enacted-eligibility";
import { COVERAGE_QUESTION_KEYS } from "../law-consequences/coverage-eligibility-rows";
import { lawEffectStamp } from "../law-effect-stamp";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import {
  annualPovertyLineMinor,
  recordedMonthlyPayByPerson,
} from "../household-pay";
import { stateJurisdictionForKey } from "../life-places";
import { residenceStateKey } from "../statutory-tax";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "../types";
import { isPersonAliveAt } from "../vitality";
import { activeHealthEpisodes } from "./health-queries";
import { appendCrisisRecord, crisisRecords } from "./records";
import { MULTIPLIER_ONE } from "./hazard";
import type { HealthCoverageRecord } from "./types";

export const HEALTH_COVERAGE_VERSION = "health-coverage/v1" as const;
/** In the `crisis:` namespace so every clock path settles it. */
export const HEALTH_COVERAGE_KEY = "crisis:health-coverage" as const;

/** The monthly pass day: the 15th, clear of the first-of-month writers. */
export function nextHealthCoveragePassAt(after: IsoDate): IsoDate {
  const year = yearOf(after);
  const month = Number(after.slice(5, 7));
  const day = Number(after.slice(8, 10));
  if (day < 15) return isoDateFromParts(year, month, 15);
  return month === 12
    ? isoDateFromParts(year + 1, 1, 15)
    : isoDateFromParts(year, month + 1, 15);
}

export function scheduleHealthCoveragePass(
  world: World,
  after: IsoDate,
  sourceEntityId: EntityId,
): World {
  const dueAt = nextHealthCoveragePassAt(after);
  return scheduleFutureDueItem(world, {
    stableKey: `${HEALTH_COVERAGE_VERSION}:pass:${dueAt}`,
    dueAt,
    transitionKey: HEALTH_COVERAGE_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [sourceEntityId] },
  });
}

/** Starts the monthly pass unless one is already on the clock. */
export function ensureHealthCoveragePass(
  world: World,
  sourceEntityId: EntityId,
): World {
  const key = `${HEALTH_COVERAGE_VERSION}:pass:${nextHealthCoveragePassAt(world.currentDate)}`;
  if (
    world.history.futureDueItems.some(
      (item) =>
        item.transitionKey === HEALTH_COVERAGE_KEY &&
        (item.dueAt >= world.currentDate || item.stableKey === key),
    )
  )
    return world;
  return scheduleHealthCoveragePass(world, world.currentDate, sourceEntityId);
}

const MEDICAID = programs.federal.medicaid;
export const MEDICAID_EXPANSION_RULES = {
  incomeLimitPercentOfPovertyLine: MEDICAID.expansionIncomeLimitPctFpl.value,
  minimumAge: 19,
  maximumAge: 64,
  requiredHoursPerMonth: MEDICAID.pl119_21.workRequirement.hoursPerMonth.value,
  childExemptionMaximumAge: 13,
} as const;

// ─── Who is covered ─────────────────────────────────────────────────────

export interface CoverageDecision {
  readonly covered: boolean;
  /**
   * `covered`, `lost:work-requirement`, or why the person is outside the
   * program: `outside:age`, `outside:no-expansion`, `outside:income`,
   * `outside:income-unrecorded`, `outside:no-household`,
   * `outside:no-residence`, `outside:law-unrecorded`,
   * `outside:terms-unrecorded`.
   */
  readonly reasonKey: string;
  readonly stateKey: string | null;
  readonly householdSize: number;
  readonly monthlyIncomeMinor: number;
  readonly monthlyWorkHours: number | null;
  readonly expansion: LawInForce | null;
  /** The financial ceiling in the actual governing text; missing is not a default. */
  readonly incomeLimitRatio: number | null;
}

interface PassCache {
  readonly pay: ReadonlyMap<EntityId, number>;
  readonly laws: Map<
    string,
    readonly [LawInForce | null, LawInForce | null, number | null]
  >;
}

function statePrograms(
  world: World,
  stateKey: string,
  onDate: IsoDate,
  cache: PassCache,
): readonly [LawInForce | null, LawInForce | null, number | null] {
  const cached = cache.laws.get(stateKey);
  if (cached) return cached;
  const state = stateJurisdictionForKey(stateKey);
  const read = state
    ? readEligibilityLawsInForce(
        world,
        state.id,
        Object.values(COVERAGE_QUESTION_KEYS),
        onDate,
      )
    : new Map<string, LawInForce | null>();
  const expansion = read.get(COVERAGE_QUESTION_KEYS.expansion) ?? null;
  // A preview uses text already operative and recorded today. Future phases
  // remain unresolved; the canonical term query is never asked to invent them.
  const termDate = onDate > world.currentDate ? world.currentDate : onDate;
  const incomeLimit =
    expansion && expansion.operativeAt <= termDate
      ? readFinalEnactedLawTerm(world, expansion, {
          questionKey: COVERAGE_QUESTION_KEYS.expansion,
          termKey: "income-limit",
          unit: "ratio",
          onDate: termDate,
        })
      : null;
  const laws = [
    expansion,
    read.get(COVERAGE_QUESTION_KEYS.workRequirement) ?? null,
    incomeLimit && incomeLimit.value > 0 ? incomeLimit.value : null,
  ] as const;
  cache.laws.set(stateKey, laws);
  return laws;
}

function decide(
  world: World,
  personId: EntityId,
  onDate: IsoDate,
  cutoff: HistoricalCutoff,
  cache: PassCache,
): CoverageDecision {
  const person = world.people[personId]!;
  const outside = (reasonKey: string, stateKey: string | null = null) => ({
    covered: false,
    reasonKey,
    stateKey,
    householdSize: 1,
    monthlyIncomeMinor: 0,
    monthlyWorkHours: null,
    expansion: null,
    incomeLimitRatio: null,
  });
  const age = ageOnDate(person.birthDate, onDate);
  if (
    age < MEDICAID_EXPANSION_RULES.minimumAge ||
    age > MEDICAID_EXPANSION_RULES.maximumAge
  )
    return outside("outside:age", residenceStateKey(world, personId));
  const stateKey = residenceStateKey(world, personId);
  if (!stateKey) return outside("outside:no-residence");
  // Nobody's income is known without a household the World records: the
  // officials and public figures it holds by name only are left undecided.
  const household = householdMembershipsAt(world, personId, cutoff)[0];
  if (!household) return outside("outside:no-household", stateKey);
  const [expansion, requirement, incomeLimitRatio] = statePrograms(
    world,
    stateKey,
    onDate,
    cache,
  );
  if (!expansion) return outside("outside:law-unrecorded", stateKey);
  if (expansion.answer !== "yes")
    return outside("outside:no-expansion", stateKey);
  if (incomeLimitRatio === null)
    return outside("outside:terms-unrecorded", stateKey);
  const members = peopleInHouseholdAt(
    world,
    household.household.id,
    cutoff,
  ).filter((id) => isPersonAliveAt(world, id, cutoff));
  // Someone at work whose pay the World does not record: the household's
  // income is unknown, and unknown is not zero.
  if (
    members.some(
      (id) =>
        !cache.pay.has(id) &&
        activeWorkRelationshipsAt(world, id, cutoff).length > 0,
    )
  )
    return outside("outside:income-unrecorded", stateKey);
  const monthlyIncomeMinor = Math.round(
    members.reduce((sum, id) => sum + (cache.pay.get(id) ?? 0), 0),
  );
  const limit =
    annualPovertyLineMinor(stateKey, members.length, onDate) * incomeLimitRatio;
  const facts = {
    stateKey,
    householdSize: members.length,
    monthlyIncomeMinor,
    expansion,
    incomeLimitRatio,
  };
  if (monthlyIncomeMinor * 12 > limit)
    return {
      covered: false,
      reasonKey: "outside:income",
      monthlyWorkHours: null,
      ...facts,
    };
  const monthlyWorkHours =
    Math.round(
      activeWorkRelationshipsAt(world, personId, cutoff).reduce(
        (sum, { role }) =>
          sum +
          ((role.timeDemand.expectedWeekly.minimumHours +
            role.timeDemand.expectedWeekly.maximumHours) /
            2) *
            (52 / 12),
        0,
      ) * 10,
    ) / 10;
  if (requirement?.answer === "yes") {
    const caresForChild = members.some((id) => {
      const member = world.people[id];
      return (
        id !== personId &&
        !!member &&
        ageOnDate(member.birthDate, onDate) <=
          MEDICAID_EXPANSION_RULES.childExemptionMaximumAge
      );
    });
    const frail = activeHealthEpisodes(world, personId).some(
      (episode) =>
        episode.severity === "serious" && episode.effectiveAt <= onDate,
    );
    const student =
      activeEducationEnrollmentsAt(world, personId, cutoff).length > 0;
    if (
      !caresForChild &&
      !frail &&
      !student &&
      monthlyWorkHours < MEDICAID_EXPANSION_RULES.requiredHoursPerMonth
    )
      return {
        covered: false,
        reasonKey: "lost:work-requirement",
        monthlyWorkHours,
        ...facts,
      };
  }
  return { covered: true, reasonKey: "covered", monthlyWorkHours, ...facts };
}

/** Whether a person would hold expansion coverage on a date, and why. */
export function medicaidCoverageDecision(
  world: World,
  personId: EntityId,
  onDate: IsoDate = world.currentDate,
): CoverageDecision {
  // Records are read as they stand today; the law and the person's age on
  // the date asked, so a law dated ahead can be read before it starts.
  const recordsAt = onDate < world.currentDate ? onDate : world.currentDate;
  return decide(
    world,
    personId,
    onDate,
    {
      asOfDate: recordsAt,
      historySequenceExclusive: world.history.nextSequence,
    },
    { pay: recordedMonthlyPayByPerson(world, recordsAt), laws: new Map() },
  );
}

// ─── Records ────────────────────────────────────────────────────────────

export function healthCoverageRecords(
  world: World,
): readonly HealthCoverageRecord[] {
  return crisisRecords(world).filter(
    (record): record is HealthCoverageRecord =>
      record.kind === "health-coverage",
  );
}

/** Each person's latest coverage record. */
function latestCoverage(world: World): Map<EntityId, HealthCoverageRecord> {
  const latest = new Map<EntityId, HealthCoverageRecord>();
  for (const record of healthCoverageRecords(world))
    latest.set(record.personId, record);
  return latest;
}

function spokenDollars(minor: number): string {
  return `$${(minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function basisFor(decision: CoverageDecision): string {
  const income = `household of ${decision.householdSize}, recorded pay ${spokenDollars(decision.monthlyIncomeMinor)} a month`;
  switch (decision.reasonKey) {
    case "covered":
      return `Covered by Medicaid expansion in ${decision.stateKey}: ${income}, at or under ${Math.round(decision.incomeLimitRatio! * 100)}% of the poverty line.`;
    case "lost:work-requirement":
      return `Lost Medicaid under the work requirement in ${decision.stateKey}: ${decision.monthlyWorkHours} hours of work a month, under the ${MEDICAID_EXPANSION_RULES.requiredHoursPerMonth} required, and no exemption.`;
    case "outside:income":
      return `Earns too much for Medicaid expansion: ${income}, over ${Math.round(decision.incomeLimitRatio! * 100)}% of the poverty line.`;
    case "outside:no-expansion":
      return `The law in force in ${decision.stateKey} no longer expands Medicaid.`;
    case "outside:age":
      return "Aged out of adult Medicaid expansion.";
    default:
      return "No longer lives in a state that covers them.";
  }
}

/** Missing input records never establish an eligibility loss. */
export function coverageDecisionIsKnown(decision: CoverageDecision): boolean {
  return ![
    "outside:no-residence",
    "outside:no-household",
    "outside:income-unrecorded",
    "outside:law-unrecorded",
    "outside:terms-unrecorded",
  ].includes(decision.reasonKey);
}

/** One indexed pay/law pass for the actual subjects of an activity. */
export function coverageDecisionsForSubjects(
  world: World,
  subjectIds: readonly EntityId[],
  onDate: IsoDate,
): ReadonlyMap<EntityId, CoverageDecision> {
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const cache: PassCache = {
    pay: recordedMonthlyPayByPerson(world, onDate),
    laws: new Map(),
  };
  const decisions = new Map<EntityId, CoverageDecision>();
  for (const personId of new Set(subjectIds))
    if (world.people[personId])
      decisions.set(personId, decide(world, personId, onDate, cutoff, cache));
  return decisions;
}

/** Records every change of coverage on `onDate`, one record per change. */
export function recordHealthCoverage(
  world: World,
  onDate: IsoDate,
  causeId: EntityId,
): World {
  return recordHealthCoverageForSubjects(
    world,
    onDate,
    causeId,
    world.personOrder,
  );
}

/** Existing append-only writer, restricted to recorded activity subjects. */
export function recordHealthCoverageForSubjects(
  world: World,
  onDate: IsoDate,
  causeId: EntityId,
  subjectIds: readonly EntityId[],
  sourceRecordIds: readonly EntityId[] = [],
): World {
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const cache: PassCache = {
    pay: recordedMonthlyPayByPerson(world, onDate),
    laws: new Map(),
  };
  const latest = latestCoverage(world);
  let next = world;
  for (const personId of new Set(subjectIds)) {
    const person = world.people[personId];
    if (!person || person.birthDate > onDate) continue;
    const prior = latest.get(personId);
    const age = ageOnDate(person.birthDate, onDate);
    // Nobody outside the program's ages changes coverage unless they held it.
    if (
      !prior?.covered &&
      (age < MEDICAID_EXPANSION_RULES.minimumAge ||
        age > MEDICAID_EXPANSION_RULES.maximumAge)
    )
      continue;
    if (!isPersonAliveAt(world, personId, cutoff)) continue;
    const decision = decide(world, personId, onDate, cutoff, cache);
    // Missing facts cannot revoke an existing entitlement. Wait for the
    // person's recorded residence, household, income or governing law.
    if (!coverageDecisionIsKnown(decision)) continue;
    if (decision.covered === (prior?.covered ?? false)) continue;
    if (!decision.covered && !prior) {
      // Never covered: only a loss to the work requirement is a change worth
      // recording, since the person would otherwise hold coverage.
      if (decision.reasonKey !== "lost:work-requirement") continue;
    }
    const state = decision.stateKey
      ? stateJurisdictionForKey(decision.stateKey)
      : null;
    const laws = decision.stateKey
      ? statePrograms(world, decision.stateKey, onDate, cache)
      : null;
    // Attribute the governing rule, preserving the original change cause.
    // A work-rule loss/restoration belongs to that rule, not to expansion.
    const workRuleChangedCoverage =
      decision.reasonKey === "lost:work-requirement" ||
      (decision.covered && prior?.reasonKey === "lost:work-requirement");
    const stamp =
      state && laws
        ? lawEffectStamp(laws[workRuleChangedCoverage ? 1 : 0], {
            effectKind: "health-coverage",
            questionKey: workRuleChangedCoverage
              ? COVERAGE_QUESTION_KEYS.workRequirement
              : COVERAGE_QUESTION_KEYS.expansion,
            jurisdictionId: state.id,
            appliedAt: onDate,
            sourceRecordIds: [
              ...new Set([
                causeId,
                ...sourceRecordIds,
                ...(prior ? [prior.id] : []),
              ]),
            ],
          })
        : null;
    next = appendCrisisRecord(next, {
      kind: "health-coverage",
      stableKey: `${HEALTH_COVERAGE_VERSION}:${personId}:${onDate}`,
      effectiveAt: onDate,
      causalParentIds: [causeId],
      visibility: "private",
      eventId: null,
      personId,
      ...(stamp ? { lawEffectStamps: [stamp] } : {}),
      program: "medicaid-expansion",
      covered: decision.covered,
      reasonKey: decision.reasonKey,
      stateKey: decision.stateKey,
      householdSize: decision.householdSize,
      monthlyIncomeMinor: decision.monthlyIncomeMinor,
      monthlyWorkHours: decision.monthlyWorkHours,
      // Compatibility fields: coverage is enrollment, not a personal hazard.
      hazardMultiplierMicros: MULTIPLIER_ONE,
      hazardFrom: null,
      hazardBasis:
        "Coverage does not apply a population study to personal hazard.",
      basis: basisFor(decision),
    });
  }
  return next;
}

export interface HazardInterval {
  readonly start: IsoDate;
  readonly end: IsoDate | null;
  readonly micros: number;
}
