import pack from "../../../data/research/health/chronic-condition-pack-2026.json" with { type: "json" };
import {
  CONDITION_PACK,
  CONDITION_PACK_KEY,
  conditionHazard,
  packCondition,
  type StartingConditionSubject,
  startingConditionAssignments,
} from "../../core2/condition-pack";
import { addDays, daysBetween } from "../../core2/kernel/dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import { FIXED_LN2 } from "../../core2/kernel/fixed-point";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
  type HazardMultiplierChange,
} from "../../core2/health-hazard";
import {
  annualPovertyLineMinor,
  recordedMonthlyPayByPerson,
} from "../household-pay";
import { residenceStateKey } from "../statutory-tax";
import type { MortalityCalibrationCategory } from "../../core2/health-mortality-table";
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

const ONSET_CAUSES = pack.onsetCauses;
/** The due item for the day a condition's own strain crosses the threshold. */
export const CONDITION_ONSET_KEY = "crisis:condition-onset" as const;

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
