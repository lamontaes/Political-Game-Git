import pack from "../../../data/research/health/chronic-condition-pack-2026.json" with { type: "json" };
import { addDays, daysBetween } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stableHash } from "../ids";
import type { EntityId, IsoDate, World } from "../types";
import { FIXED_LN2 } from "./fixed-point";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
  type HazardMultiplierChange,
} from "./hazard";
import { annualPovertyLineMinor } from "./health-coverage";
import type { MortalityCalibrationCategory } from "./mortality-table";
import { appendCrisisRecords, crisisRecordId } from "./records";
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
 * category). Which people of an age hold a condition is a seeded selection
 * made once at creation, like a job or schooling, so the share matches the
 * source; nothing is rolled while the world runs. A condition that begins
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

/** The seeded place, from 0 to 1, of this person among people of their age for a condition. */
function selectionPlace(world: World, personId: EntityId, key: string): number {
  const hex = stableHash(
    JSON.stringify([CONDITION_PACK_KEY, world.seed, personId, key]),
  ).slice(0, 12);
  return parseInt(hex, 16) / 16 ** 12;
}

/** The pack conditions this person starts with at `age`. */
export function startingConditionKeys(
  world: World,
  personId: EntityId,
  age: number,
  category: MortalityCalibrationCategory,
): readonly string[] {
  return CONDITION_PACK.filter(
    (condition) =>
      selectionPlace(world, personId, condition.key) <
      conditionPrevalence(condition, age, category),
  ).map((condition) => condition.key);
}

function weightMicros(condition: PackCondition): number {
  return Math.round(condition.mortalityWeight.value * MULTIPLIER_ONE);
}

function weightBasis(condition: PackCondition): string {
  return `${CONDITION_PACK_KEY}: ${condition.label} multiplies mortality strain by ${condition.mortalityWeight.value} (${condition.mortalityWeight.status}).`;
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
  for (const { personId, category } of people) {
    const person = world.people[personId];
    if (!person) continue;
    const age = daysBetween(person.birthDate, date) / 365.25;
    for (const key of startingConditionKeys(world, personId, age, category)) {
      const condition = packCondition(key)!;
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
          hazardMultiplierMicros: weightMicros(condition),
          hazardBasis: weightBasis(condition),
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

/** The pack's weight and basis for a condition that begins during life. */
export function conditionHazard(key: string): {
  readonly micros: number;
  readonly basis: string;
} {
  const condition = packCondition(key)!;
  return { micros: weightMicros(condition), basis: weightBasis(condition) };
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
