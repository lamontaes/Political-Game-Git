/**
 * A federal law that grows defense spending faster than inflation, reaching
 * the states that get the contracts.
 *
 * A yes from Congress to "should defense spending grow faster than
 * inflation?" raises defense contracts year over year, in real terms, at the
 * pace they rose in the fiscal years they beat inflation (2016 to 2020 and
 * 2023: 6.9% a year, USAspending.gov contract obligations deflated by CPI-U,
 * `defense-contracts-by-state-fy2024.json`), for as long as the law stays in
 * force and for at most the longest run on record, five years. Each state
 * gets the extra contracts in proportion to what it draws today, its fiscal
 * year 2024 contract dollars per resident. Each extra dollar spent in a state
 * adds about $1.50 of output there, relative to other states (Nakamura and
 * Steinsson 2014, NBER w17391), so the state's earnings rise by that share of
 * what it produces per resident (BEA 2024 GDP). A later law answering no ends
 * the build-up the day it takes effect.
 *
 * The outcome web reads the result as the cause `federal.defense-boost-pct`
 * (`outcome-web/index.ts`), so the earnings, the size drawn for the world and
 * the chain of causes are recorded the same way as any other link.
 */
import defenseData from "../../data/research/federal/defense-contracts-by-state-fy2024.json" with { type: "json" };
import { daysBetween } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { IsoDate, World } from "./types";

export const GROW_DEFENSE_SPENDING_QUESTION =
  "us-federal-positions:defense.grow-defense-spending";

/** Real yearly rise of defense contracts in the years they beat inflation. */
export const DEFENSE_BUILD_UP_YEARLY_RISE =
  defenseData.buildUp.meanYearlyRealRise;

/** The longest run of real rises on record, in years: the build-up stops there. */
export const DEFENSE_BUILD_UP_MAX_YEARS = defenseData.buildUp.longestRunYears;

const DAYS_PER_YEAR = 365.25;

interface DefensePlace {
  readonly contractsPerResident: number;
  readonly gdpPerResident: number;
  readonly gdpBasis: string;
}

const PLACES = defenseData.places as Readonly<Record<string, DefensePlace>>;

/** How much a state's defense contracts have grown from where they began, as a share. */
export function defenseBuildUpShare(
  world: World,
  onDate: IsoDate,
): { readonly share: number; readonly lawMeasureId: string | null } {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === GROW_DEFENSE_SPENDING_QUESTION,
  );
  if (!proposition) return { share: 0, lawMeasureId: null };
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    onDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted" || law.answer !== "yes")
    return { share: 0, lawMeasureId: null };
  const years = Math.min(
    DEFENSE_BUILD_UP_MAX_YEARS,
    Math.max(0, daysBetween(law.operativeAt, onDate)) / DAYS_PER_YEAR,
  );
  return {
    share: (1 + DEFENSE_BUILD_UP_YEARLY_RISE) ** years - 1,
    lawMeasureId: law.measureId,
  };
}

/**
 * The extra defense contracts a state has received, as a percent of what it
 * produces: 0 with no law; null for a place with no defense record.
 */
export function defenseBoostPct(
  world: World,
  placeKey: string,
  onDate: IsoDate,
): number | null {
  const place = PLACES[placeKey];
  if (!place) return null;
  const { share } = defenseBuildUpShare(world, onDate);
  return ((place.contractsPerResident * share) / place.gdpPerResident) * 100;
}
