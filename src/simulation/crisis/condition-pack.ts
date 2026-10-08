import pack from "../../../data/research/health/chronic-condition-pack-2026.json" with { type: "json" };
import { addDays, daysBetween } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import { FIXED_LN2 } from "./fixed-point";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
  type HazardMultiplierChange,
} from "./hazard";
import {
  annualPovertyLineMinor,
  recordedMonthlyPayByPerson,
} from "../household-pay";
import { residenceStateKey } from "../statutory-tax";
import type { MortalityCalibrationCategory } from "./mortality-table";
import { appendCrisisRecords, crisisRecordId } from "./records";
import { activeHealthEpisodes } from "./health-queries";
import type {
  CrisisRecordInput,
  HealthCoverageRecord,
  HealthEpisodeOrigin,
} from "./types";

/**
 * The installed condition pack (Ruling 38): chronic conditions a person's
 * health record can hold, how common each is by age, and each one's weight on
 * mortality strain (./mortality.ts). One sourced data file holds every
 * number: data/research/health/chronic-condition-pack-2026.json.
 *
 * A person's starting conditions are written once, on the day the mortality
 * model first exposes them, from the real prevalence for their age (and sex
 * where the source gives it and their record carries a calibration
 * category). The exact prevalence determines the count in each place, age
 * and sex cell; recorded household income ranks the people, and even spacing
 * determines who starts with each condition. A condition that begins
 * during life begins on the day its own strain crosses the same fixed
 * threshold as mortality strain, from recorded causes only.
 */

interface PrevalenceBand {
  readonly fromAge: number;
  readonly toAge: number;
  readonly percent: number;
}

interface PackCondition {
  readonly key: string;
  readonly label: string;
  readonly infant?: boolean;
  /** A condition of childhood: held at its one band's ages only. */
  readonly childhood?: boolean;
  /** A condition that takes no severity grade or age factor. */
  readonly ungraded?: boolean;
  readonly prevalence: readonly PrevalenceBand[];
  readonly bySex?: { readonly male: number; readonly female: number };
  readonly mortalityWeight: { readonly value: number; readonly status: string };
  readonly onsetScale: {
    readonly value: number;
    readonly status: string;
  } | null;
}

export const CONDITION_PACK_KEY = pack.packKey;
export const CONDITION_PACK: readonly PackCondition[] =
  pack.conditions as readonly PackCondition[];
const ONSET_CAUSES = pack.onsetCauses;

/** Stable severity grading remains tied to the person's condition record. */

/** The due item for the day a condition's own strain crosses the threshold. */
export const CONDITION_ONSET_KEY = "crisis:condition-onset" as const;

export function packCondition(key: string): PackCondition | null {
  return CONDITION_PACK.find((condition) => condition.key === key) ?? null;
}

/** The plain words a person's record uses for a pack condition. */
export function conditionLabel(key: string): string | null {
  return packCondition(key)?.label ?? null;
}

/**
 * The share (0 to 1) of people of this exact age holding the condition. Each
 * band's figure sits at the band's middle; between middles it slides in a
 * straight line, below the first it slides to zero at the band's start, and
 * past the last it holds. The infant row covers the first year of life only.
 */
export function conditionPrevalence(
  condition: PackCondition,
  age: number,
  category: MortalityCalibrationCategory,
): number {
  const sex =
    condition.bySex && category !== "equal-mixture"
      ? condition.bySex[category]
      : 1;
  if (condition.infant)
    return age < 1 ? (condition.prevalence[0]!.percent / 100) * sex : 0;
  if (condition.childhood) {
    const band = condition.prevalence[0]!;
    return age >= band.fromAge && age < band.toAge + 1
      ? (band.percent / 100) * sex
      : 0;
  }
  const points = condition.prevalence.map((band) => ({
    age: (band.fromAge + band.toAge + 1) / 2,
    share: band.percent / 100,
  }));
  const first = condition.prevalence[0]!;
  if (age < first.fromAge) return 0;
  let share: number;
  if (age <= points[0]!.age)
    share =
      (points[0]!.share * (age - first.fromAge)) /
      (points[0]!.age - first.fromAge);
  else if (age >= points.at(-1)!.age) share = points.at(-1)!.share;
  else {
    const upper = points.findIndex((point) => point.age >= age);
    const low = points[upper - 1]!;
    const high = points[upper]!;
    share =
      low.share +
      ((high.share - low.share) * (age - low.age)) / (high.age - low.age);
  }
  return share * sex;
}

export interface StartingConditionSubject {
  readonly personId: EntityId;
  readonly placeKey: string;
  readonly age: number;
  readonly category: MortalityCalibrationCategory;
  /** Unknown household income sorts after recorded incomes; it is never zero. */
  readonly monthlyHouseholdIncomeMinor: number | null;
}

/**
 * Allocate each condition evenly through the income-ranked age-sex cell.
 * Prevalence determines the count only. No seed or roll chooses a person.
 */
export function startingConditionAssignments(
  subjects: readonly StartingConditionSubject[],
): ReadonlyMap<EntityId, readonly string[]> {
  const assignments = new Map<EntityId, string[]>(
    subjects.map(({ personId }) => [personId, []]),
  );
  const cells = new Map<string, StartingConditionSubject[]>();
  for (const subject of subjects) {
    const cellKey = JSON.stringify([
      subject.placeKey,
      Math.floor(subject.age),
      subject.category,
    ]);
    const cell = cells.get(cellKey) ?? [];
    cell.push(subject);
    cells.set(cellKey, cell);
  }
  const conditionCount = CONDITION_PACK.length;
  for (const cell of cells.values()) {
    cell.sort((left, right) => {
      const leftIncome = left.monthlyHouseholdIncomeMinor;
      const rightIncome = right.monthlyHouseholdIncomeMinor;
      if (leftIncome === null && rightIncome !== null) return 1;
      if (leftIncome !== null && rightIncome === null) return -1;
      if (
        leftIncome !== null &&
        rightIncome !== null &&
        leftIncome !== rightIncome
      )
        return leftIncome - rightIncome;
      return left.personId < right.personId
        ? -1
        : left.personId > right.personId
          ? 1
          : 0;
    });
    for (const [conditionIndex, condition] of CONDITION_PACK.entries()) {
      // PLACEHOLDER(research: chronic-condition-income-gradients): the 2026 pack
      // has no condition-specific income gradient; keep even spacing until one
      // is sourced.
      const count = Math.min(
        cell.length,
        Math.max(
          0,
          Math.round(
            cell.reduce(
              (total, person) =>
                total +
                conditionPrevalence(condition, person.age, person.category),
              0,
            ),
          ),
        ),
      );
      if (count === 0) continue;
      if (count === cell.length) {
        for (const person of cell)
          assignments.get(person.personId)!.push(condition.key);
        continue;
      }
      const offset = conditionIndex / conditionCount;
      for (let index = 0; index < count; index += 1) {
        const position = Math.min(
          cell.length - 1,
          Math.round(((index + offset) * cell.length) / count),
        );
        assignments.get(cell[position]!.personId)!.push(condition.key);
      }
    }
  }
  return assignments;
}

function recordedHouseholdIncome(
  world: World,
  personId: EntityId,
  pay: ReadonlyMap<EntityId, number>,
): number | null {
  const cutoff = currentLifeCutoff(world);
  const membership = householdMembershipsAt(world, personId, cutoff)[0];
  if (!membership) return null;
  const members = peopleInHouseholdAt(world, membership.household.id, cutoff);
  if (
    members.some(
      (id) =>
        !pay.has(id) && activeWorkRelationshipsAt(world, id, cutoff).length > 0,
    )
  )
    return null;
  return Math.round(
    members.reduce((total, id) => total + (pay.get(id) ?? 0), 0),
  );
}

interface SeverityGrade {
  readonly key: string;
  readonly share: number;
  readonly weight: number;
}

/** The severity grades a held condition can carry, most severe first. */
export const SEVERITY_GRADES: readonly SeverityGrade[] =
  pack.severityGrades.grades;
const AGE_FACTOR = pack.ageFactor;
/** The scale at which the life table's hazard counts as strain (./mortality.ts). */
export const BASE_RATE_SCALE: number = pack.baseRateScale.value;

/**
 * The installed pack's most common severity grade when the condition has no
 * individual severity observation. Birth and childhood conditions carry none.
 */
export function conditionGrade(
  _seed: string,
  _personId: EntityId,
  key: string,
): SeverityGrade | null {
  const condition = packCondition(key);
  if (condition?.infant || condition?.childhood || condition?.ungraded)
    return null;
  // With no individual severity observation, the pack's modal grade is the
  // common reference estimate. Identity and the seed are not medical causes.
  return [...SEVERITY_GRADES].sort((a, b) => b.share - a.share)[0]!;
}

/**
 * How much more a condition weighs when it is recorded at `age`: smoothly
 * from the young factor down to one, read once at recording.
 */
export function conditionAgeFactor(age: number): number {
  return (
    1 +
    (AGE_FACTOR.youngFactor - 1) /
      (1 + Math.exp((age - AGE_FACTOR.turnAge) / AGE_FACTOR.widthYears))
  );
}

/**
 * The weight and basis a condition is recorded with: its own weight, times
 * its grade's weight and the factor for the age it is recorded at.
 */
export function conditionHazard(
  seed: string,
  personId: EntityId,
  key: string,
  age: number,
): { readonly micros: number; readonly basis: string } {
  const condition = packCondition(key)!;
  const grade = conditionGrade(seed, personId, key);
  const factor = grade ? grade.weight * conditionAgeFactor(age) : 1;
  const weight = condition.mortalityWeight.value * factor;
  return {
    micros: Math.round(weight * MULTIPLIER_ONE),
    basis: grade
      ? `${CONDITION_PACK_KEY}: ${condition.label}, ${grade.key}, recorded at age ${Math.floor(age)}, multiplies mortality strain by ${weight.toFixed(2)} (PLACEHOLDER).`
      : `${CONDITION_PACK_KEY}: ${condition.label} multiplies mortality strain by ${weight} (${condition.mortalityWeight.status}).`,
  };
}

/** The pack condition behind a person's recorded need for substance use services. */
export const SUBSTANCE_USE_DISORDER_KEY = "substance-use-disorder" as const;

/**
 * Whether the person's own health record holds this pack condition now. A
 * pure read of the record; it advances nothing and invents nothing, and a
 * person the model has not yet exposed holds none.
 */
export function holdsPackCondition(
  world: World,
  personId: EntityId,
  key: string,
): boolean {
  return activeHealthEpisodes(world, personId).some(
    (episode) =>
      episode.conditionKey === key && episode.origin.kind === "condition-pack",
  );
}

/** The health-episode stable key a pack condition is recorded under. */
export function conditionEpisodeKey(personId: EntityId, key: string): string {
  return `crisis:health:condition:${CONDITION_PACK_KEY}:${key}:${personId}`;
}

/** The origin every pack condition carries. */
export const CONDITION_PACK_ORIGIN: HealthEpisodeOrigin = {
  kind: "condition-pack",
  packKey: CONDITION_PACK_KEY,
};

/**
 * Writes each person's starting conditions on `date`, as ordinary
 * health-episode records with their disclosure and state, all at once.
 * Private to the person, like any health record at onset.
 */
export function recordStartingConditions(
  world: World,
  people: readonly {
    readonly personId: EntityId;
    readonly category: MortalityCalibrationCategory;
  }[],
  date: IsoDate,
  sourceId: EntityId,
): World {
  const inputs: CrisisRecordInput[] = [];
  const pay = recordedMonthlyPayByPerson(world, date);
  const subjects: StartingConditionSubject[] = people.flatMap(
    ({ personId, category }) => {
      const person = world.people[personId];
      if (!person) return [];
      return [
        {
          personId,
          category,
          age: daysBetween(person.birthDate, date) / 365.25,
          placeKey: residenceStateKey(world, personId) ?? "unknown",
          monthlyHouseholdIncomeMinor: recordedHouseholdIncome(
            world,
            personId,
            pay,
          ),
        },
      ];
    },
  );
  const assignments = startingConditionAssignments(subjects);
  for (const { personId } of people) {
    const person = world.people[personId];
    if (!person) continue;
    const age = daysBetween(person.birthDate, date) / 365.25;
    const held = new Set(
      activeHealthEpisodes(world, personId).map(
        (episode) => episode.conditionKey,
      ),
    );
    for (const key of assignments.get(personId) ?? []) {
      if (held.has(key)) continue;
      const hazard = conditionHazard(world.seed, personId, key, age);
      const stableKey = conditionEpisodeKey(personId, key);
      const id = crisisRecordId(world, stableKey);
      inputs.push(
        {
          kind: "health-episode",
          stableKey,
          effectiveAt: date,
          causalParentIds: [sourceId],
          visibility: "private",
          eventId: null,
          personId,
          label: "condition",
          conditionKey: key,
          severity: "chronic",
          origin: CONDITION_PACK_ORIGIN,
          hazardMultiplierMicros: hazard.micros,
          hazardBasis: hazard.basis,
          course: [],
        },
        {
          kind: "health-disclosure",
          stableKey: `${stableKey}:disclosure:initial`,
          effectiveAt: date,
          causalParentIds: [id],
          visibility: "private",
          eventId: null,
          episodeId: id,
          personId,
          access: "private",
          recipientIds: [],
          decidedByPersonId: null,
        },
        {
          kind: "health-state",
          stableKey: `${stableKey}:state:onset`,
          effectiveAt: date,
          causalParentIds: [id],
          visibility: "private",
          eventId: null,
          episodeId: id,
          personId,
          state: "chronic",
          functionalLimitation: "none",
          capacityRecordId: null,
        },
      );
    }
  }
  return appendCrisisRecords(world, inputs);
}

const INCOME_KNOWN = new Set([
  "covered",
  "lost:work-requirement",
  "outside:income",
]);

/**
 * How strongly the recorded causes push a condition's strain, from one
 * coverage record: household income under the poverty line, and coverage
 * lost. A record that does not establish a fact leaves it unread (1), never
 * counted as present.
 */
export function onsetCauseFactor(record: HealthCoverageRecord): number {
  const incomeKnown = INCOME_KNOWN.has(record.reasonKey) && !!record.stateKey;
  const poor =
    incomeKnown &&
    record.monthlyIncomeMinor * 12 <
      annualPovertyLineMinor(
        record.stateKey!,
        record.householdSize,
        record.effectiveAt,
      );
  const uncovered = record.reasonKey === "lost:work-requirement";
  return (
    (poor ? ONSET_CAUSES.belowPovertyLine.value : 1) *
    (uncovered ? ONSET_CAUSES.uncovered.value : 1)
  );
}

/**
 * The day in [from, to) on which a condition's strain reaches the one
 * threshold, or null. Its strain is the life table's age hazard times the
 * condition's onset scale times the recorded causes, from the person's first
 * exposure.
 */
export function conditionOnsetDay(
  input: {
    readonly key: string;
    readonly birthDate: IsoDate;
    readonly category: MortalityCalibrationCategory;
    readonly exposureStart: IsoDate;
    readonly coverage: readonly HealthCoverageRecord[];
  },
  from: IsoDate,
  to: IsoDate,
): IsoDate | null {
  const condition = packCondition(input.key);
  if (!condition?.onsetScale) return null;
  const scale = condition.onsetScale.value;
  const multipliers: HazardMultiplierChange[] = [
    {
      effectiveAt: input.exposureStart,
      micros: Math.round(scale * MULTIPLIER_ONE),
    },
  ];
  for (const record of input.coverage)
    multipliers.push({
      effectiveAt:
        record.effectiveAt < input.exposureStart
          ? input.exposureStart
          : record.effectiveAt,
      micros: Math.round(scale * onsetCauseFactor(record) * MULTIPLIER_ONE),
    });
  return firstThresholdDay(
    {
      birthDate: input.birthDate,
      category: input.category,
      exposureStart: input.exposureStart,
      multipliers,
    },
    thresholdUnits(FIXED_LN2),
    from,
    to,
  );
}

export function conditionOnsetStableKey(
  personId: EntityId,
  key: string,
  day: IsoDate,
): string {
  return `crisis:condition:${key}:${personId}:${day}:onset:due`;
}

/** What a person's condition strains read: their dates and records. */
export interface ConditionStrainInput {
  readonly birthDate: IsoDate;
  readonly category: MortalityCalibrationCategory;
  readonly exposureStart: IsoDate;
  readonly coverage: readonly HealthCoverageRecord[];
  /** Pack conditions the person holds now. */
  readonly held: ReadonlySet<string>;
}

/**
 * Puts on the clock the day each condition the person does not hold crosses
 * the threshold inside [from, windowEnd). A crossing on or before today
 * begins tomorrow. The onset handler re-reads the crossing, so an item a
 * later record change made wrong begins nothing.
 */
export function scheduleConditionOnsets(
  world: World,
  personId: EntityId,
  input: ConditionStrainInput,
  from: IsoDate,
  windowEnd: IsoDate,
  sourceEntityId: EntityId,
): World {
  const tomorrow = addDays(world.currentDate, 1);
  let next = world;
  for (const condition of CONDITION_PACK) {
    if (!condition.onsetScale || input.held.has(condition.key)) continue;
    const day = conditionOnsetDay(
      { ...input, key: condition.key },
      from,
      windowEnd,
    );
    if (day === null) continue;
    const dueAt = day < tomorrow ? tomorrow : day;
    const stableKey = conditionOnsetStableKey(personId, condition.key, dueAt);
    if (
      next.history.futureDueItems.some((item) => item.stableKey === stableKey)
    )
      continue;
    next = scheduleFutureDueItem(next, {
      stableKey,
      dueAt,
      transitionKey: CONDITION_ONSET_KEY,
      entityIds: [personId],
      jurisdictionId: world.people[personId]?.homeJurisdictionId ?? null,
      provenance: { kind: "simulated", sourceEntityIds: [sourceEntityId] },
    });
  }
  return next;
}

/** The pack condition a scheduled onset item names. */
export function conditionOfOnsetItem(
  personId: EntityId,
  stableKey: string,
  dueAt: IsoDate,
): string | null {
  return (
    CONDITION_PACK.find(
      (condition) =>
        conditionOnsetStableKey(personId, condition.key, dueAt) === stableKey,
    )?.key ?? null
  );
}
