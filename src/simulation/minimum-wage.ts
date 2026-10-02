import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
/**
 * The minimum wage in force where a job is, on a date.
 *
 * The floor is the highest of the federal, state and local minimum where the
 * job is (U.S. Department of Labor: the higher rate applies to covered work).
 *
 * - Federal: the canonical starting law or operative Act supplies its hourly
 *   floor. A yes/no answer never supplies a substitute dollar amount.
 * - State: the state's basic rate on file (`minimum-wage-2026.json`), or the
 *   rate a state law the game enacted set, from the day it takes effect.
 *   Unknown stays unknown, never zero.
 * - Local: an operative, authorized city ordinance supplies its adopted
 *   hourly target. Missing numeric text supplies no local floor.
 *
 * Nothing is stored as "the current minimum": it is derived from the laws each
 * time it is read.
 */

import raiseTerm from "../../data/research/labor/state-minimum-wage-raise-term.json" with { type: "json" };
import { addDays } from "./dates";
import {
  laborLawOfficeKey,
  ruleValueInWorld,
  STATUTE_EFFECTIVE_DEFAULT_DAYS,
} from "./enacted-rule-changes";
import { lawInForce } from "./governing/law-in-force";
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
import type { EntityId, HistoricalCutoff, IsoDate, World } from "./types";

/** The policy question a federal minimum wage raise answers. */
export const FEDERAL_MINIMUM_WAGE_QUESTION_KEY =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";

/** The policy question a state minimum wage raise answers. */
export const STATE_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.raise-minimum-wage";

/**
 * ESTIMATED FROM AVERAGE (`state-minimum-wage-raise-term.json`, Department of
 * Labor table of state rates, 2013 to 2024): what a state law that answers
 * "raise the minimum wage" with yes adds when its bill names no dollar figure.
 * The total is the median raise of a stretch of increases; the yearly step is
 * the median single-year raise. A bill that files its own wage term wins.
 */
export const STATE_RAISE_TERM = {
  totalMinor: raiseTerm.totalMinor,
  yearlyStepMinor: raiseTerm.yearlyStepMinor,
} as const;

/**
 * The state question that decides whether a city's minimum wage counts: a
 * state law on it turns city ordinances on or off (`question-authority.ts`).
 */
export const LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY =
  "us-policy-positions:labor-workforce.local-minimum-wage-authority";

/** The policy question a city's own minimum wage answers. */
export const CITY_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.city-minimum-wage";

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

const schedules = new WeakMap<object, readonly FederalMinimumStep[]>();
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
  const cached = schedules.get(world);
  if (cached) return cached;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  );
  const steps: FederalMinimumStep[] = [];
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
      if (from > world.currentDate) continue;
      const law = lawInForce(
        world,
        NATIONAL_ELECTION_JURISDICTION.id,
        proposition.id,
        from,
      );
      if (!law || law.origin !== "enacted") continue;
      const term = readFinalEnactedLawTerm(world, law, {
        questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "floor",
        unit: "minor/hour",
        onDate: from,
      });
      if (!term)
        throw new Error(
          "Federal minimum wage requires its adopted floor in minor/hour",
        );
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === law.measureId,
      );
      steps.push({
        from,
        hourlyMinor: term.value,
        measureId: law.measureId,
        designation: measure?.designation ?? "A federal law",
      });
    }
  }
  schedules.set(world, steps);
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
): number | null {
  return (
    canonicalMinimumTerm(
      world,
      NATIONAL_ELECTION_JURISDICTION.id,
      FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      "floor",
      onDate,
    )?.term?.value ?? null
  );
}

/** Read the actual canonical law and final hourly text on the activity date. */
function canonicalMinimumTerm(
  world: World,
  jurisdictionId: EntityId,
  questionKey: string,
  termKey: string,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
) {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === questionKey,
  );
  if (!proposition) return null;
  const law = lawInForce(
    world,
    jurisdictionId,
    proposition.id,
    onDate,
    "all",
    cutoff,
  );
  if (!law) return null;
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey,
    unit: "minor/hour",
    onDate,
    cutoff,
  });
  return { law, term };
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

/**
 * What a state law that answered yes to "raise the minimum wage" adds to the
 * rate before it, `daysSince` days after it took effect: the yearly step at the
 * start and again each year, up to the total.
 */
export function stateRaiseAfterDays(daysSince: number): number {
  if (daysSince < 0) return 0;
  const steps = Math.floor(daysSince / 365) + 1;
  return Math.min(
    STATE_RAISE_TERM.totalMinor,
    steps * STATE_RAISE_TERM.yearlyStepMinor,
  );
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
 * the term a state law that answered yes to raising the minimum wage carries
 * (`STATE_RAISE_TERM`, added to the rate on file, in yearly steps from the
 * law's own effective date) for as long as that law governs, so a later law
 * that answers no ends it; else the rate on file. Null when the state's rate
 * on file is unknown and no law sets one. Local minimums are NOT MODELED.
 */
export function stateMinimumSettingAt(
  world: World,
  stateKey: string,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
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
  if (!cutoff && cache?.has(cacheKey)) return cache.get(cacheKey)!;
  const setting = computeStateMinimumSetting(world, stateKey, onDate, cutoff);
  if (!cutoff) cache?.set(cacheKey, setting);
  return setting;
}

function computeStateMinimumSetting(
  world: World,
  stateKey: string,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): StateMinimumSetting | null {
  const stateId = stateJurisdictionForKey(stateKey)?.id ?? null;
  const stateQuestion = Object.values(world.policyCatalog.propositions).find(
    (definition) => definition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  );
  const startingLaw =
    stateId && stateQuestion
      ? lawInForce(world, stateId, stateQuestion.id, onDate, "all", cutoff)
      : null;
  const startingTerm = startingLaw
    ? readFinalEnactedLawTerm(world, startingLaw, {
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "target",
        unit: "minor/hour",
        onDate,
        cutoff,
      })
    : null;
  const beforeMinor = startingTerm?.value ?? null;
  const filed = /^US-[A-Z]{2}$/.test(stateKey)
    ? ruleValueInWorld(
        world,
        {
          jurisdiction: stateKey,
          officeKey: laborLawOfficeKey(stateKey.slice(3)),
          field: "labor.minimumWage.hourlyCents",
          onDate,
          cutoff,
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
  const proposition = stateQuestion;
  if (proposition && stateId && beforeMinor !== null) {
    const law = lawInForce(
      world,
      stateId,
      proposition.id,
      onDate,
      "enacted-only",
      cutoff,
    );
    if (law?.origin === "enacted" && law.answer === "yes") {
      const term = readFinalEnactedLawTerm(world, law, {
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "target",
        unit: "minor/hour",
        onDate,
        cutoff,
      });
      if (!term) return null;
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === law.measureId,
      );
      return {
        hourlyMinor: term.value,
        beforeMinor: beforeMinor ?? term.value,
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
 * its adopted hourly target from its effective date. A later ordinance that answers no, or a state law that
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
  let cache = localSettings.get(world);
  if (!cache) {
    cache = new Map();
    localSettings.set(world, cache);
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
    const term = readFinalEnactedLawTerm(world, law, {
      questionKey: CITY_MINIMUM_WAGE_QUESTION_KEY,
      termKey: "target",
      unit: "minor/hour",
      onDate,
    });
    if (!term) {
      cache.set(cacheKey, null);
      return null;
    }
    const measure = world.history.legislativeMeasures?.find(
      (entry) => entry.id === law.measureId,
    );
    setting = {
      hourlyMinor: term.value,
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
  const federalRead = canonicalMinimumTerm(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    "floor",
    onDate,
  );
  if (!federalRead?.term) return null;
  const federal: MinimumWageSetting = {
    hourlyMinor: federalRead.term.value,
    level: "federal",
    measureId: federalRead.term.measureId,
    designation:
      world.history.legislativeMeasures?.find(
        (row) => row.id === federalRead.term!.measureId,
      )?.designation ?? null,
    effectiveAt: federalRead.law.operativeAt,
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
