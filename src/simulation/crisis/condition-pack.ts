import pack from "../../../data/research/health/chronic-condition-pack-2026.json" with { type: "json" };
import { addDays, daysBetween } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stableHash } from "../ids";
import type { EntityId, IsoDate, World } from "../types";
import { MULTIPLIER_ONE } from "./hazard";
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
 * input: data/research/health/chronic-condition-pack-2026.json. Its labels
 * distinguish sourced figures from placeholders and authored assumptions.
 *
 * A person's starting conditions are written once, on the day the mortality
 * model first exposes them, from the real prevalence for their age (and sex
 * where the source gives it and their record carries a calibration
 * category). Which people of an age hold a condition is a seeded selection
 * made once at creation, like a job or schooling, so the share matches the
 * source; nothing is rolled while the world runs. A condition that begins
 * during life begins on the day its own strain reaches the person's
 * threshold from that same place: the strain rises with the pack's own rise
 * in prevalence between age bands (conditionOnsetDay). The onset scale in
 * the data file only marks which conditions can begin during life.
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

/** The due item for the day a condition's own strain crosses the threshold. */
export const CONDITION_ONSET_KEY = "crisis:condition-onset" as const;

export function packCondition(key: string): PackCondition | null {
  return CONDITION_PACK.find((condition) => condition.key === key) ?? null;
}

/** The plain words a person's record uses for a pack condition. */
export function conditionLabel(key: string): string | null {
  return packCondition(key)?.label ?? null;
}

/** No age's share reaches everyone, so every onset strain stays finite. */
const MAX_SHARE = 0.999;

/**
 * The share (0 to 1) of people of this exact age holding the condition. Each
 * band's figure sits at the band's middle; between middles it slides in a
 * straight line, below the first it slides to zero at the band's start, and
 * past the last it extends the nonnegative rise between the last two
 * middles. These exact-age placements and extrapolation are authored
 * assumptions; survey age-group prevalence does not determine them.
 * It never reaches one. The infant row covers the first
 * year of life only.
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
  else if (age >= points.at(-1)!.age) {
    const last = points.at(-1)!;
    const before = points.at(-2);
    const rise = before
      ? Math.max(0, (last.share - before.share) / (last.age - before.age))
      : 0;
    share = Math.min(MAX_SHARE, last.share + rise * (age - last.age));
  } else {
    const upper = points.findIndex((point) => point.age >= age);
    const low = points[upper - 1]!;
    const high = points[upper]!;
    share =
      low.share +
      ((high.share - low.share) * (age - low.age)) / (high.age - low.age);
  }
  return Math.min(MAX_SHARE, share * sex);
}

/** The seeded place, from 0 to 1, of this person among people of their age for a condition. */
function selectionPlace(seed: string, personId: EntityId, key: string): number {
  const hex = stableHash(
    JSON.stringify([CONDITION_PACK_KEY, seed, personId, key]),
  ).slice(0, 12);
  return parseInt(hex, 16) / 16 ** 12;
}

/** The pack conditions this person starts with at `age`. */
export function startingConditionKeys(
  seed: string,
  personId: EntityId,
  age: number,
  category: MortalityCalibrationCategory,
): readonly string[] {
  return CONDITION_PACK.filter(
    (condition) =>
      selectionPlace(seed, personId, condition.key) <
      conditionPrevalence(condition, age, category),
  ).map((condition) => condition.key);
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
 * The grade this person holds a condition at: their seeded place among the
 * people holding it, against the grades' shares, chosen once when the
 * condition is recorded. A condition of birth or childhood carries no grade.
 */
export function conditionGrade(
  seed: string,
  personId: EntityId,
  key: string,
): SeverityGrade | null {
  const condition = packCondition(key);
  if (condition?.infant || condition?.childhood) return null;
  const place = selectionPlace(seed, personId, `${key}:severity`);
  let below = 0;
  for (const grade of SEVERITY_GRADES) {
    below += grade.share;
    if (place < below) return grade;
  }
  return SEVERITY_GRADES.at(-1)!;
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
    for (const key of startingConditionKeys(
      world.seed,
      personId,
      age,
      category,
    )) {
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

/**
 * A condition's onset strain at `age`: minus the log of the share of people
 * that age who do not hold it, taking the highest share at any age up to
 * this one (conditionPrevalence). Per year of age it rises by the pack's own
 * rise in prevalence from one band to the next, over the years between their
 * middles, among those who do not yet hold the condition: dP/da / (1 - P).
 */
function onsetStrainAt(
  condition: PackCondition,
  age: number,
  category: MortalityCalibrationCategory,
): number {
  let share = conditionPrevalence(condition, age, category);
  // A band lower than an earlier one adds nothing: the strain never falls.
  for (const band of condition.prevalence) {
    const middle = (band.fromAge + band.toAge + 1) / 2;
    if (middle < age)
      share = Math.max(share, conditionPrevalence(condition, middle, category));
  }
  return -Math.log(1 - share);
}

/** What one person's onset day for one condition reads. */
export interface ConditionOnsetInput {
  readonly key: string;
  readonly seed: string;
  readonly personId: EntityId;
  readonly birthDate: IsoDate;
  readonly category: MortalityCalibrationCategory;
  readonly exposureStart: IsoDate;
  readonly coverage: readonly HealthCoverageRecord[];
}

/**
 * The day in [from, to) on which a person begins a condition they do not
 * hold, or null. Their threshold is minus the log of one less their seeded
 * place, the same place that decided whether they started with it. Their
 * strain follows the pack's prevalence-derived rise with age. Poverty and
 * coverage records do not change onset without sourced multipliers.
 * The day is the one on which the share of people their age holding
 * the condition passes their place. This authored threshold does not
 * establish an individual medical onset date from survey prevalence.
 * Nothing is rolled; the place is chosen once.
 */
export function conditionOnsetDay(
  input: ConditionOnsetInput,
  from: IsoDate,
  to: IsoDate,
): IsoDate | null {
  const condition = packCondition(input.key);
  // Only the conditions the pack gives an onset begin during life.
  if (!condition?.onsetScale || from >= to) return null;
  const threshold = -Math.log(
    1 - selectionPlace(input.seed, input.personId, input.key),
  );
  const strainAt = (date: IsoDate) =>
    onsetStrainAt(
      condition,
      daysBetween(input.birthDate, date) / 365.25,
      input.category,
    );
  // No sourced poverty or coverage multiplier is installed.
  const strainOn = strainAt;
  // The strain never falls, so the first day at or past the threshold is
  // found by halving the span.
  if (strainOn(from) >= threshold) return from;
  const last = addDays(to, -1);
  if (strainOn(last) < threshold) return null;
  let below = 0;
  let reached = daysBetween(from, last);
  while (reached - below > 1) {
    const middle = Math.floor((below + reached) / 2);
    if (strainOn(addDays(from, middle)) >= threshold) reached = middle;
    else below = middle;
  }
  return addDays(from, reached);
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
      { ...input, key: condition.key, seed: world.seed, personId },
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
