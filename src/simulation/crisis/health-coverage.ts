/**
 * Who holds Medicaid expansion coverage, person by person, and what it does to
 * their risk of dying.
 *
 * Coverage is decided from the person, the law and the place, never a roll:
 * an adult aged 19 to 64 whose household's recorded pay is at or under the
 * program's share of the poverty line, living in a state whose law in force
 * expands Medicaid, is covered. Where a work requirement is in force (a
 * state's own, or the federal one from its operative date), an adult who
 * works under the required hours a month, and is not exempt, loses it.
 *
 * On the 15th of each month a pass reads everyone once and records a change
 * of coverage (never a repeat), so a law enacted, repealed or amended in play
 * starts or ends coverage at the next pass, and so does a raise, a lost job
 * or a birthday. The pass re-plans the quarter's death day of anyone whose
 * hazard it changed (`health-coverage-pass.ts`).
 *
 * Death risk: Miller, Johnson and Wherry (2021, QJE) found expansion lowered
 * annual mortality 9.4% among low-income adults aged 55 to 64, measured over
 * everyone eligible, enrolled or not. The same share lowers each covered
 * person's all-cause hazard while they are 55 to 64, from a year after the
 * expansion took effect (the study's first-year lag, the outcome web's
 * `medicaid-expansion-to-mortality` row), and stops the day coverage ends.
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
import links from "../../../data/research/outcome-web/links.json" with { type: "json" };
import programs from "../../../data/research/money/public-programs-2026.json" with { type: "json" };
import {
  addDays,
  ageOnDate,
  dateAtAge,
  isoDateFromParts,
  yearOf,
} from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lawInForce, type LawInForce } from "../governing/law-in-force";
import { lawEffectStamp } from "../law-effect-stamp";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
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

const EXPANSION_QUESTION =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const WORK_REQUIREMENT_QUESTION =
  "us-policy-positions:health-human-services.medicaid-work-requirement";

const MEDICAID = programs.federal.medicaid;
const MORTALITY_LINK = (
  links as unknown as {
    readonly links: readonly {
      readonly key: string;
      readonly size: number;
      readonly lagMonths: number;
      readonly source: string;
    }[];
  }
).links.find((link) => link.key === "medicaid-expansion-to-mortality")!;

export const MEDICAID_EXPANSION_RULES = {
  incomeLimitPercentOfPovertyLine: MEDICAID.expansionIncomeLimitPctFpl.value,
  minimumAge: 19,
  maximumAge: 64,
  requiredHoursPerMonth: MEDICAID.pl119_21.workRequirement.hoursPerMonth.value,
  childExemptionMaximumAge: 13,
  mortality: {
    multiplierMicros: Math.round((1 + MORTALITY_LINK.size) * MULTIPLIER_ONE),
    minimumAge: 55,
    maximumAge: 64,
    lagMonths: MORTALITY_LINK.lagMonths,
    basis: `Medicaid expansion: ${Math.round(-MORTALITY_LINK.size * 1000) / 10}% lower annual mortality among low-income adults aged 55 to 64 (${MORTALITY_LINK.source}).`,
  },
} as const;

// ─── Poverty line ───────────────────────────────────────────────────────

/**
 * A year's guideline: the contiguous states' amounts, and a first-person
 * amount for each state that has its own, keyed by the state's name.
 */
type Guideline = {
  readonly contiguous: {
    readonly "1": number;
    readonly eachAdditional: number;
  };
} & Readonly<Record<string, { readonly "1": number }>>;

const GUIDELINES = Object.entries(
  programs.federal.povertyGuidelines as unknown as Record<
    string,
    { readonly value?: Guideline }
  >,
)
  .flatMap(([year, row]) =>
    /^\d{4}$/.test(year) && row.value
      ? [[Number(year), row.value] as const]
      : [],
  )
  .sort((a, b) => a[0] - b[0]);

/** The annual poverty line for a household, in cents. */
export function annualPovertyLineMinor(
  stateKey: string,
  householdSize: number,
  onDate: IsoDate,
): number {
  const year = yearOf(onDate);
  const guideline = (GUIDELINES.filter(([read]) => read <= year).at(-1) ??
    GUIDELINES[0]!)[1];
  const contiguous = guideline.contiguous;
  const name = stateJurisdictionForKey(stateKey)?.name.toLowerCase();
  const own = name && name !== "contiguous" ? guideline[name] : undefined;
  const first = own?.["1"] ?? contiguous["1"];
  const added = own
    ? (contiguous.eachAdditional * own["1"]) / contiguous["1"]
    : contiguous.eachAdditional;
  return Math.round((first + Math.max(0, householdSize - 1) * added) * 100);
}

// ─── Pay ────────────────────────────────────────────────────────────────

const PERIODS_PER_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/** Each person's recorded pay a month on a date, in cents, from pay terms. */
function monthlyPayByPerson(
  world: World,
  onDate: IsoDate,
): ReadonlyMap<EntityId, number> {
  const recipients = new Map<EntityId, EntityId>();
  for (const flow of world.history.resourceFlows)
    // Wages, salaries and an owner's draw from their own business.
    if (
      flow.basisKind.startsWith("compensation:") &&
      flow.recipient.kind === "person"
    )
      recipients.set(flow.id, flow.recipient.personId);
  const latest = new Map<
    EntityId,
    (typeof world.history.resourceFlowTerms)[number]
  >();
  for (const row of world.history.resourceFlowTerms)
    if (recipients.has(row.resourceFlowId) && row.effectiveAt <= onDate)
      latest.set(row.resourceFlowId, row);
  const byPerson = new Map<EntityId, number>();
  for (const [flowId, row] of latest) {
    if (row.status !== "active") continue;
    const match = /(weekly|biweekly|semimonthly|monthly)/.exec(row.cadenceKind);
    const perYear = match ? PERIODS_PER_YEAR[match[1]!] : undefined;
    if (!perYear) continue;
    const personId = recipients.get(flowId)!;
    byPerson.set(
      personId,
      (byPerson.get(personId) ?? 0) + (row.amount.minorUnits * perYear) / 12,
    );
  }
  return byPerson;
}

// ─── Who is covered ─────────────────────────────────────────────────────

export interface CoverageDecision {
  readonly covered: boolean;
  /**
   * `covered`, `lost:work-requirement`, or why the person is outside the
   * program: `outside:age`, `outside:no-expansion`, `outside:income`,
   * `outside:income-unrecorded`, `outside:no-household`,
   * `outside:no-residence`.
   */
  readonly reasonKey: string;
  readonly stateKey: string | null;
  readonly householdSize: number;
  readonly monthlyIncomeMinor: number;
  readonly monthlyWorkHours: number | null;
  readonly expansion: LawInForce | null;
}

interface PassCache {
  readonly pay: ReadonlyMap<EntityId, number>;
  readonly laws: Map<string, readonly [LawInForce | null, LawInForce | null]>;
}

function propositionId(world: World, stableKey: string): EntityId | null {
  return (
    Object.values(world.policyCatalog?.propositions ?? {}).find(
      (row) => row.stableKey === stableKey,
    )?.id ?? null
  );
}

function statePrograms(
  world: World,
  stateKey: string,
  onDate: IsoDate,
  cache: PassCache,
): readonly [LawInForce | null, LawInForce | null] {
  const cached = cache.laws.get(stateKey);
  if (cached) return cached;
  const state = stateJurisdictionForKey(stateKey);
  const read = (question: string) => {
    const id = propositionId(world, question);
    return state && id ? lawInForce(world, state.id, id, onDate) : null;
  };
  const laws = [
    read(EXPANSION_QUESTION),
    read(WORK_REQUIREMENT_QUESTION),
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
  });
  const age = ageOnDate(person.birthDate, onDate);
  if (
    age < MEDICAID_EXPANSION_RULES.minimumAge ||
    age > MEDICAID_EXPANSION_RULES.maximumAge
  )
    return outside("outside:age", residenceStateKey(world, personId));
  const stateKey = residenceStateKey(world, personId);
  if (!stateKey) return outside("outside:no-residence");
  const [expansion, requirement] = statePrograms(
    world,
    stateKey,
    onDate,
    cache,
  );
  if (expansion?.answer !== "yes")
    return outside("outside:no-expansion", stateKey);
  // Nobody's income is known without a household the World records: the
  // officials and public figures it holds by name only are left undecided.
  const household = householdMembershipsAt(world, personId, cutoff)[0];
  if (!household) return outside("outside:no-household", stateKey);
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
    (annualPovertyLineMinor(stateKey, members.length, onDate) *
      MEDICAID_EXPANSION_RULES.incomeLimitPercentOfPovertyLine) /
    100;
  const facts = {
    stateKey,
    householdSize: members.length,
    monthlyIncomeMinor,
    expansion,
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
    { pay: monthlyPayByPerson(world, recordsAt), laws: new Map() },
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
      return `Covered by Medicaid expansion in ${decision.stateKey}: ${income}, at or under ${MEDICAID_EXPANSION_RULES.incomeLimitPercentOfPovertyLine}% of the poverty line.`;
    case "lost:work-requirement":
      return `Lost Medicaid under the work requirement in ${decision.stateKey}: ${decision.monthlyWorkHours} hours of work a month, under the ${MEDICAID_EXPANSION_RULES.requiredHoursPerMonth} required, and no exemption.`;
    case "outside:income":
      return `Earns too much for Medicaid expansion: ${income}, over ${MEDICAID_EXPANSION_RULES.incomeLimitPercentOfPovertyLine}% of the poverty line.`;
    case "outside:no-expansion":
      return `The law in force in ${decision.stateKey} no longer expands Medicaid.`;
    case "outside:age":
      return "Aged out of adult Medicaid expansion.";
    default:
      return "No longer lives in a state that covers them.";
  }
}

/** Records every change of coverage on `onDate`, one record per change. */
export function recordHealthCoverage(
  world: World,
  onDate: IsoDate,
  causeId: EntityId,
): World {
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const cache: PassCache = {
    pay: monthlyPayByPerson(world, onDate),
    laws: new Map(),
  };
  const latest = latestCoverage(world);
  const rules = MEDICAID_EXPANSION_RULES.mortality;
  let next = world;
  for (const personId of world.personOrder) {
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
    if (decision.covered === (prior?.covered ?? false)) continue;
    if (!decision.covered && !prior) {
      // Never covered: only a loss to the work requirement is a change worth
      // recording, since the person would otherwise hold coverage.
      if (decision.reasonKey !== "lost:work-requirement") continue;
    }
    const hazardFrom = decision.covered
      ? [
          onDate,
          addDays(
            decision.expansion!.operativeAt,
            Math.round(rules.lagMonths * 30.44),
          ),
        ].sort()[1]!
      : null;
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
              ? WORK_REQUIREMENT_QUESTION
              : EXPANSION_QUESTION,
            jurisdictionId: state.id,
            appliedAt: onDate,
            sourceRecordIds: [causeId, ...(prior ? [prior.id] : [])],
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
      hazardMultiplierMicros: decision.covered
        ? rules.multiplierMicros
        : MULTIPLIER_ONE,
      hazardFrom,
      hazardBasis: decision.covered ? rules.basis : basisFor(decision),
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

/**
 * The spans a person's coverage lowers their hazard: from the record's
 * `hazardFrom` (and their 55th birthday) until coverage ends (or their 65th
 * birthday).
 */
export function coverageHazardIntervals(
  birthDate: IsoDate,
  records: readonly HealthCoverageRecord[],
): readonly HazardInterval[] {
  const rules = MEDICAID_EXPANSION_RULES.mortality;
  const from = dateAtAge(birthDate, rules.minimumAge);
  const until = dateAtAge(birthDate, rules.maximumAge + 1);
  const intervals: HazardInterval[] = [];
  records.forEach((record, index) => {
    if (!record.covered || record.hazardFrom === null) return;
    const ends = records[index + 1]?.effectiveAt ?? null;
    const start = record.hazardFrom > from ? record.hazardFrom : from;
    const end = ends === null || ends > until ? until : ends;
    if (start < end)
      intervals.push({ start, end, micros: record.hazardMultiplierMicros });
  });
  return intervals;
}
