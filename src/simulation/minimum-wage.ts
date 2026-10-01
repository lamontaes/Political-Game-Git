import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./law-consequences/pay-rows";
/**
 * The minimum wage in force where a job is, on a date.
 *
 * The floor is the highest of the federal, state and local minimum where the
 * job is (U.S. Department of Labor: the higher rate applies to covered work).
 *
 * - Federal: $7.25 an hour since July 24, 2009, until an Act of Congress that
 *   answers "should the federal minimum wage go up?" with yes takes effect;
 *   then the Act's exact adopted hourly floor. A later Act answering no ends the raise
 *   for new work, and cuts nobody's pay (callers only ever raise).
 * - State: the state's basic rate on file (`minimum-wage-2026.json`), or the
 *   rate a state law the game enacted set, from the day it takes effect.
 *   Unknown stays unknown, never zero.
 * - Local: NOT MODELED. No city or county minimum is on file, so none is
 *   claimed and none is read as zero.
 *
 * Nothing is stored as "the current minimum": it is derived from the laws each
 * time it is read.
 */

import localPremium from "../../data/research/labor/local-minimum-wage-premium.json" with { type: "json" };
import { addDays } from "./dates";
import {
  laborLawOfficeKey,
  ruleValueInWorld,
  STATUTE_EFFECTIVE_DEFAULT_DAYS,
} from "./enacted-rule-changes";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/automatic-legislation";
import { measurePropositionAnswer } from "./issue-record";
import { measureAnswersAt } from "./vote-bundle";
import {
  FEDERAL_MINIMUM_HOURLY,
  TOWN_MINIMUM_WAGES,
} from "./living-world/town-pay.generated";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, IsoDate, World } from "./types";

/** The policy question a federal minimum wage raise answers. */
export { FEDERAL_MINIMUM_WAGE_QUESTION_KEY } from "./law-consequences/pay-rows";

/** The policy question a state minimum wage raise answers. */
export { STATE_MINIMUM_WAGE_QUESTION_KEY } from "./law-consequences/pay-rows";

/**
 * The state question that decides whether a city's minimum wage counts: a
 * state law on it turns city ordinances on or off (`question-authority.ts`).
 */
export const LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY =
  "us-policy-positions:labor-workforce.local-minimum-wage-authority";

/** The policy question a city's own minimum wage answers. */
export const CITY_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.city-minimum-wage";

/**
 * ESTIMATED FROM AVERAGE (`local-minimum-wage-premium.json`, UC Berkeley Labor
 * Center inventory, 40 California localities in July 2026): how far above the
 * higher of the federal and state rate a city ordinance that answers yes sets
 * its wage, as a share of that rate, when it names no figure. The research
 * question `local-minimum-wages-by-place` replaces it with the real rates.
 */
export const CITY_PREMIUM_RATIO = localPremium.premiumRatio;

/** The federal minimum wage an hour, in cents (Fair Labor Standards Act). */
export const FEDERAL_MINIMUM_HOURLY_MINOR = Math.round(
  FEDERAL_MINIMUM_HOURLY * 100,
);

/** One step of the federal minimum: the rate from a date until the next step. */
export interface FederalMinimumStep {
  readonly from: IsoDate;
  readonly hourlyMinor: number;
  readonly measureId: EntityId;
  readonly designation: string;
}

const schedules = new WeakMap<
  object,
  {
    readonly readAt: IsoDate;
    readonly nextEffectiveAt: IsoDate | null;
    readonly steps: readonly FederalMinimumStep[];
  }
>();
const NO_ENACTMENTS: readonly FederalMinimumStep[] = [];

/**
 * Every date an enacted federal law on the raise question took effect, and the
 * federal minimum from then on, oldest first. Empty when no law was enacted.
 */
export function federalMinimumSchedule(
  world: World,
): readonly FederalMinimumStep[] {
  const enactments = world.history.legislativeEnactments;
  if (!enactments?.length) return NO_ENACTMENTS;
  const cached = schedules.get(enactments);
  if (
    cached &&
    cached.readAt <= world.currentDate &&
    (!cached.nextEffectiveAt || world.currentDate < cached.nextEffectiveAt)
  )
    return cached.steps;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  );
  const steps: FederalMinimumStep[] = [];
  let nextEffectiveAt: IsoDate | null = null;
  if (proposition) {
    const dates = new Set<IsoDate>();
    for (const enactment of enactments) {
      if (enactment.outcome !== "enacted") continue;
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === enactment.measureId,
      );
      if (!measure || !measurePropositionAnswer(measure, proposition.id))
        continue;
      dates.add(
        enactment.effectiveAt ??
          addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
      );
    }
    for (const from of [...dates].sort()) {
      if (from > world.currentDate) {
        nextEffectiveAt ??= from;
        continue;
      }
      const law = lawInForce(
        world,
        NATIONAL_ELECTION_JURISDICTION.id,
        proposition.id,
        from,
      );
      if (!law || law.origin !== "enacted") continue;
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === law.measureId,
      );
      const term =
        law.answer === "yes"
          ? readFinalEnactedLawTerm(world, law, {
              questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
              termKey: "floor",
              unit: "minor/hour",
              onDate: from,
            })
          : null;
      if (
        law.answer === "yes" &&
        (!term || !Number.isSafeInteger(term.value) || term.value < 0)
      )
        continue;
      steps.push({
        from,
        hourlyMinor: term?.value ?? FEDERAL_MINIMUM_HOURLY_MINOR,
        measureId: law.measureId,
        designation: measure?.designation ?? "A federal law",
      });
    }
  }
  schedules.set(enactments, {
    readAt: world.currentDate,
    nextEffectiveAt,
    steps,
  });
  return steps;
}

/** The step of the federal minimum in force on `onDate`, or null before any. */
export function federalMinimumStepAt(
  world: World,
  onDate: IsoDate,
): FederalMinimumStep | null {
  let found: FederalMinimumStep | null = null;
  for (const step of federalMinimumSchedule(world)) {
    if (step.from > onDate) break;
    found = step;
  }
  return found;
}

/** The federal minimum wage in force on `onDate`, in cents an hour. */
export function federalMinimumHourlyMinorAt(
  world: World,
  onDate: IsoDate,
): number {
  return (
    federalMinimumStepAt(world, onDate)?.hourlyMinor ??
    FEDERAL_MINIMUM_HOURLY_MINOR
  );
}

/**
 * The state's basic minimum wage on file, or the federal one; null when the
 * state's rate is unknown. Dollars an hour.
 */
export function startingMinimumHourly(
  jurisdictionId: EntityId | null,
): number | null {
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  return startingStateMinimumHourly(place?.stateJurisdictionKey ?? null);
}

/** The same, for a state named by its key (`US-NE`). */
export function startingStateMinimumHourly(
  stateKey: string | null,
): number | null {
  if (!stateKey || !(stateKey in TOWN_MINIMUM_WAGES))
    return FEDERAL_MINIMUM_HOURLY;
  const state = TOWN_MINIMUM_WAGES[stateKey];
  if (state === null || state === undefined) return null;
  return Math.max(FEDERAL_MINIMUM_HOURLY, state);
}

const minimumWageQuestionLaws = new WeakMap<object, boolean>();

/**
 * Whether any law enacted in play answers a minimum wage question of a state
 * or a city, yes or no: the cheap test before reading each rate law by law.
 */
export function anyMinimumWageQuestionEnacted(world: World): boolean {
  const enactments = world.history.legislativeEnactments;
  if (!enactments?.length) return false;
  const cached = minimumWageQuestionLaws.get(enactments);
  if (cached !== undefined) return cached;
  const ids = new Set(
    Object.values(world.policyCatalog?.propositions ?? {})
      .filter(
        (definition) =>
          definition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY ||
          definition.stableKey === CITY_MINIMUM_WAGE_QUESTION_KEY,
      )
      .map((definition) => definition.id),
  );
  const found =
    ids.size > 0 &&
    enactments.some(
      (enactment) =>
        enactment.outcome === "enacted" &&
        measureAnswersAt(world, enactment.measureId, enactment.sequence).some(
          (row) => ids.has(row.propositionId),
        ),
    );
  minimumWageQuestionLaws.set(enactments, found);
  return found;
}

/** The state's own minimum in force at a date and the law or rate behind it. */
export interface StateMinimumSetting {
  readonly hourlyMinor: number;
  /** What the state's rate was before any law enacted in play changed it. */
  readonly beforeMinor: number;
  /** The enacted measure that set it; null for a rate on file at the start. */
  readonly measureId: EntityId | null;
  readonly designation: string | null;
  /** The day that law took effect; null for a rate on file at the start. */
  readonly effectiveAt: IsoDate | null;
}

const stateSettings = new WeakMap<
  object,
  Map<string, StateMinimumSetting | null>
>();

/**
 * A state's own minimum wage on `onDate`, in cents an hour. Reads, in order:
 * a wage term an enacted bill filed (`labor.minimumWage.hourlyCents`); else
 * the exact adopted target of the state minimum-wage proposition, in minor
 * units per hour. A yes answer without that numeric term sets no new rate.
 * Otherwise the rate on file remains. Null when the state's rate
 * on file is unknown and no law sets one. Local minimums are NOT MODELED.
 */
export function stateMinimumSettingAt(
  world: World,
  stateKey: string,
  onDate: IsoDate,
): StateMinimumSetting | null {
  const enactments = world.history.legislativeEnactments;
  let cache: Map<string, StateMinimumSetting | null> | null = null;
  if (enactments !== undefined) {
    cache = stateSettings.get(enactments) ?? null;
    if (!cache) {
      cache = new Map();
      stateSettings.set(enactments, cache);
    }
  }
  const cacheKey = `${stateKey}:${onDate}`;
  const futureRead = onDate > world.currentDate;
  if (!futureRead && cache?.has(cacheKey)) return cache.get(cacheKey)!;
  const setting = computeStateMinimumSetting(world, stateKey, onDate);
  if (!futureRead) cache?.set(cacheKey, setting);
  return setting;
}

function computeStateMinimumSetting(
  world: World,
  stateKey: string,
  onDate: IsoDate,
): StateMinimumSetting | null {
  const stateId = stateJurisdictionForKey(stateKey)?.id ?? null;
  const starting = startingStateMinimumHourly(stateKey);
  const beforeMinor = starting === null ? null : Math.round(starting * 100);
  const filed = /^US-[A-Z]{2}$/.test(stateKey)
    ? ruleValueInWorld(
        world,
        {
          jurisdiction: stateKey,
          officeKey: laborLawOfficeKey(stateKey.slice(3)),
          field: "labor.minimumWage.hourlyCents",
          onDate,
        },
        null,
      )
    : null;
  if (filed?.source === "enacted" && typeof filed.value === "number")
    return {
      hourlyMinor: filed.value,
      beforeMinor: beforeMinor ?? filed.value,
      measureId: filed.measureId,
      designation: filed.designation,
      effectiveAt: filed.effectiveAt,
    };
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  );
  if (proposition && stateId && beforeMinor !== null) {
    const law = lawInForce(
      world,
      stateId,
      proposition.id,
      onDate,
      "enacted-only",
    );
    if (law?.origin === "enacted" && law.answer === "yes") {
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === law.measureId,
      );
      const term = readFinalEnactedLawTerm(world, law, {
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "target",
        unit: "minor/hour",
        onDate,
      });
      if (term && Number.isSafeInteger(term.value) && term.value >= 0)
        return {
          hourlyMinor: term.value,
          beforeMinor,
          measureId: law.measureId,
          designation: measure?.designation ?? "A state law",
          effectiveAt: law.operativeAt,
        };
    }
  }
  return beforeMinor === null
    ? null
    : {
        hourlyMinor: beforeMinor,
        beforeMinor,
        measureId: null,
        designation: null,
        effectiveAt: null,
      };
}

/** The minimum wage in force at a job, and the law or rate that sets it. */
export interface MinimumWageSetting {
  readonly hourlyMinor: number;
  readonly level: "federal" | "state" | "local";
  /** The enacted measure that set it; null for a rate on file at the start. */
  readonly measureId: EntityId | null;
  readonly designation: string | null;
  /** The day that law took effect; null for a rate on file at the start. */
  readonly effectiveAt: IsoDate | null;
}

const localSettings = new WeakMap<
  object,
  Map<string, MinimumWageSetting | null>
>();

/**
 * The minimum wage a city ordinance sets where the job is, or null when no
 * city law in force does: an ordinance enacted in play that answered yes to
 * "should the city set its own minimum wage above the state's?", counted only
 * where the state's law lets cities set one (`question-authority.ts`), sets
 * the higher of the federal and state rate plus `CITY_PREMIUM_RATIO`, from its
 * effective date. A later ordinance that answers no, or a state law that
 * takes the authority away, ends it. Counties are NOT MODELED.
 */
export function localMinimumSettingAt(
  world: World,
  jurisdictionId: EntityId | null,
  baseMinor: number,
  onDate: IsoDate,
): MinimumWageSetting | null {
  const enactments = world.history.legislativeEnactments;
  if (!jurisdictionId || !enactments?.length) return null;
  let cache = localSettings.get(enactments);
  if (!cache) {
    cache = new Map();
    localSettings.set(enactments, cache);
  }
  const cacheKey = `${jurisdictionId}:${baseMinor}:${onDate}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;
  let setting: MinimumWageSetting | null = null;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === CITY_MINIMUM_WAGE_QUESTION_KEY,
  );
  const law = proposition
    ? lawInForce(world, jurisdictionId, proposition.id, onDate, "enacted-only")
    : null;
  if (
    law?.origin === "enacted" &&
    law.answer === "yes" &&
    law.level === "local-ordinance"
  ) {
    const measure = world.history.legislativeMeasures?.find(
      (entry) => entry.id === law.measureId,
    );
    setting = {
      hourlyMinor: Math.round(baseMinor * (1 + CITY_PREMIUM_RATIO)),
      level: "local",
      measureId: law.measureId,
      designation: measure?.designation ?? "A city ordinance",
      effectiveAt: law.operativeAt,
    };
  }
  cache.set(cacheKey, setting);
  return setting;
}

/**
 * The minimum wage in force where the job is on `onDate`: the highest of the
 * federal rate (raised by an enacted Act), the state's rate (on file, or set
 * by a state law the game enacted from the day it takes effect) and a city
 * ordinance the game enacted where the state lets cities set one. Null when
 * the state's rate is unknown and no enacted law sets one. A tie goes to the
 * state, then to the federal rate.
 */
export function minimumWageSettingAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): MinimumWageSetting | null {
  const step = federalMinimumStepAt(world, onDate);
  const federal: MinimumWageSetting = {
    hourlyMinor: step?.hourlyMinor ?? FEDERAL_MINIMUM_HOURLY_MINOR,
    level: "federal",
    measureId: step?.measureId ?? null,
    designation: step?.designation ?? null,
    effectiveAt: step?.from ?? null,
  };
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const key = place?.stateJurisdictionKey ?? null;
  const stateSetting =
    key && /^US-[A-Z]{2}$/.test(key)
      ? stateMinimumSettingAt(world, key, onDate)
      : null;
  let state: MinimumWageSetting | null = stateSetting && {
    hourlyMinor: stateSetting.hourlyMinor,
    level: "state",
    measureId: stateSetting.measureId,
    designation: stateSetting.designation,
    effectiveAt: stateSetting.effectiveAt,
  };
  if (!state) {
    const starting = startingMinimumHourly(jurisdictionId);
    if (starting === null) return null;
    state = {
      hourlyMinor: Math.round(starting * 100),
      level: "state",
      measureId: null,
      designation: null,
      effectiveAt: null,
    };
  }
  const base = federal.hourlyMinor > state.hourlyMinor ? federal : state;
  const local = localMinimumSettingAt(
    world,
    jurisdictionId,
    base.hourlyMinor,
    onDate,
  );
  return local && local.hourlyMinor > base.hourlyMinor ? local : base;
}

/**
 * The minimum wage in force where the job is on `onDate`, in dollars an hour;
 * null when unknown. See `minimumWageSettingAt`.
 */
export function minimumHourlyAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number | null {
  const setting = minimumWageSettingAt(world, jurisdictionId, onDate);
  return setting === null ? null : setting.hourlyMinor / 100;
}

/** The minimum wage in cents an hour; null if unknown. */
export function minimumHourlyMinorAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number | null {
  return (
    minimumWageSettingAt(world, jurisdictionId, onDate)?.hourlyMinor ?? null
  );
}
