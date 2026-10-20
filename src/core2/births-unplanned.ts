import providerDistance from "../../data/research/people/abortion-provider-distance.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { renewalParameter } from "./births-parameters";
import { birthCircumstances, type BirthCouple } from "./births-plan";
import { lawInForce } from "./modules/laws";
import { corePlaceByJurisdictionId, corePlaceByKey } from "./place-lookup";
import type { EntityId } from "./kernel/brands";
import type { CoreAPI } from "./types";

export const ABORTION_LAW_SERIES =
  "us-policy-positions:civil-family-community.restrict-abortion";
export const UNPLANNED_STOPGAP = "SG-PEOPLE-unplanned-pregnancy";

interface MilesRow {
  readonly miles: number;
  readonly low: number;
  readonly high: number;
}
const PROVIDER_PLACES = providerDistance.places as unknown as Readonly<
  Record<
    string,
    { readonly milesBefore: MilesRow; readonly milesNow: MilesRow }
  >
>;

/**
 * Miles to the nearest abortion provider for the state or territory where she
 * lives (Myers county-by-month distances, weighted by women aged 15 to 44;
 * five territories estimated), by place key: the figure from before the
 * Dobbs-era closures where the law in force does not restrict, the current
 * one where it does.
 */
export function providerMiles(
  placeId: string,
  restricted: boolean,
  worldPlaceKey?: string,
): { miles: number; stateKey: string } {
  // A town's own households keep their governing unit's id, which the place
  // lookup may not know: they live in the world's own place's state.
  const stateKey =
    corePlaceByJurisdictionId(placeId as EntityId)?.stateJurisdictionKey ??
    (worldPlaceKey
      ? corePlaceByKey(worldPlaceKey)?.stateJurisdictionKey
      : undefined);
  const row = stateKey ? PROVIDER_PLACES[stateKey] : undefined;
  if (!stateKey || !row)
    throw new Error(`No provider distance recorded for place ${placeId}`);
  return {
    miles: (restricted ? row.milesNow : row.milesBefore).miles,
    stateKey,
  };
}

/** The restriction law in force where she lives: its record id, or none recorded. */
export function restrictionRead(api: CoreAPI): {
  restricted: boolean;
  lawId: string | null;
} {
  let answer;
  try {
    answer = lawInForce(api, ABORTION_LAW_SERIES);
  } catch {
    // No laws engine in this world: nothing restricts, and no record is cited.
    return { restricted: false, lawId: null };
  }
  const governing = answer.governing;
  return {
    restricted: (answer.value ?? 0) > 0,
    lawId: governing ? governing.id : null,
  };
}

/**
 * Exposure a couple that chose to wait adds at a review: the mother's age
 * curve times how little cushion the household has (cash against its costs),
 * a sliding scale with no cutoff. A whole unit of carried exposure is one
 * unplanned pregnancy, so rates check totals and never pick a couple.
 */
export function unplannedExposure(
  api: CoreAPI,
  couple: BirthCouple,
  asOf = api.state.date,
): number {
  const p = (key: string) => renewalParameter(api, key);
  const mother = api.state.people.get(couple.motherId)!;
  const age = ageOnDate(makeIsoDate(mother.birthDate), makeIsoDate(asOf));
  const distance = (age - p("renewalAgeCenter")) / p("renewalAgeSpread");
  const members = api.state.households
    .get(mother.householdId)!
    .memberIds.map((id) => api.state.people.get(id)!)
    .filter((person) => person.alive);
  const cash = members.reduce((sum, person) => sum + person.liquidMinor, 0);
  const costs = members.reduce(
    (sum, person) => sum + person.livingCostDailyMinor,
    0,
  );
  const cushion = cash / (cash + costs * p("moneyBufferDays") + p("one"));
  return (
    p("renewalUnplannedExposure") *
    Math.exp(-distance * distance) *
    (p("one") - cushion)
  );
}

export interface UnplannedDecision {
  continues: boolean;
  restricted: boolean;
  lawId: string | null;
  miles: number;
  travelMinor: number;
  scores: { continue: number; end: number };
  reasons: Record<string, number>;
}

/**
 * The mother weighs carrying the pregnancy against ending it. Carrying weighs
 * what a planned birth weighs (her records now) plus the pull of a pregnancy
 * already begun; ending weighs its own weight and the trip to a provider,
 * which the law in force where she lives lengthens and her cash shortens.
 */
export function decideUnplanned(
  api: CoreAPI,
  couple: BirthCouple,
  asOf = api.state.date,
): UnplannedDecision {
  const p = (key: string) => renewalParameter(api, key);
  const mother = api.state.people.get(couple.motherId)!;
  const circumstances = birthCircumstances(api, mother, couple, asOf);
  const raising = Object.values(circumstances).reduce((sum, v) => sum + v, 0);
  const law = restrictionRead(api);
  const { miles } = providerMiles(
    mother.placeId,
    law.restricted,
    api.state.placeMetadata?.placeKey,
  );
  const travelMinor = Math.round(miles * p("renewalTravelCostPerMileMinor"));
  const cash = api.state.households
    .get(mother.householdId)!
    .memberIds.map((id) => api.state.people.get(id)!)
    .filter((person) => person.alive)
    .reduce((sum, person) => sum + person.liquidMinor, 0);
  // Distance and money both hold her back, each on a smooth curve.
  const far = miles / (miles + p("renewalTravelHalfMiles"));
  const unaffordable = travelMinor / (travelMinor + cash + p("one"));
  const travel = (-p("renewalTravelWeight") * (far + unaffordable)) / p("two");
  const accepted = p("renewalUnplannedAcceptance");
  const reasons = {
    ...circumstances,
    accepted,
    ending: -p("renewalEndingBase"),
    travel,
  };
  const carry = raising + accepted;
  const end = -p("renewalEndingBase") + travel;
  return {
    continues: carry >= end,
    restricted: law.restricted,
    lawId: law.lawId,
    miles,
    travelMinor,
    scores: { continue: carry, end },
    reasons,
  };
}
