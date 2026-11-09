/**
 * Years in place on every household of the opening (town, kin and county
 * sample alike): the day the household moved into its place. The length of a
 * stay is the survival of not having moved, run backward from the head's age
 * on the state's ACS yearly rate of leaving the county by age band
 * (mover-rates-acs-2024.json, the same rates the kin and the moves engine
 * use). The household's seeded quantile picks where on that curve it sits
 * (generation of who exists, never an outcome of play). A stay cannot be
 * longer than the head's adult life.
 */
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { addDays, ageInYears, makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import { placeStateKey } from "./place-map";
import { parameter as p } from "./parameters";
import type { CoreInput, HouseholdInput, IsoDate } from "./types";

type Rates = Readonly<Record<string, number>>;

/** The yearly rate of leaving at an age, from the band table ("18-19" ... "75+"). */
function rateAt(rates: Rates, age: number): number {
  for (const [band, rate] of Object.entries(rates)) {
    const [low, high] = band.split(/[-+]/);
    if (age >= Number(low) && (!high || age <= Number(high))) return rate;
  }
  return p("zero");
}

/**
 * Years a household with a head of `headAge` has lived in its home, given a
 * quantile `u` of the stay-length curve (0 up to 1, exclusive).
 */
export function yearsInPlaceOf(
  rates: Rates,
  headAge: number,
  u: number,
): number {
  const adult = p("votingAge");
  const most = Math.max(p("zero"), headAge - adult);
  const line = -Math.log(Math.max(u, Number.EPSILON));
  let hazard = p("zero");
  for (let back = p("zero"); back < most; back += p("one")) {
    const rate = rateAt(
      rates,
      Math.max(adult, Math.floor(headAge - back - p("one"))),
    );
    hazard += -Math.log(p("one") - rate);
    if (hazard >= line)
      return (
        back +
        (line - (hazard + Math.log(p("one") - rate))) /
          -Math.log(p("one") - rate)
      );
  }
  return most;
}

/** Every household of the opening gets the day it moved in. */
export function withYearsInPlace(input: CoreInput): CoreInput {
  const stateKey = placeStateKey(input.placeMetadata?.placeKey ?? "") ?? "";
  const rates: Rates =
    (moverRates.places as Record<string, { departurePerYearByAge: Rates }>)[
      stateKey
    ]?.departurePerYearByAge ?? moverRates.national.departurePerYearByAge;
  const start = makeIsoDate(input.startedAt);
  const people = new Map(input.people.map((row) => [row.id, row]));
  const root = new SeededRng(input.seed).fork("opening-tenure");
  const households = input.households.map((home): HouseholdInput => {
    if (home.since || home.quarters) return home;
    const ages = home.memberIds
      .map((id) => people.get(id))
      .filter((row) => row !== undefined)
      .map((row) => ageInYears(row.birthDate, start));
    const head = Math.max(...ages, p("zero"));
    if (head < p("votingAge")) return home;
    const years = yearsInPlaceOf(rates, head, root.fork(home.id).next());
    return {
      ...home,
      since: makeIsoDate(
        addDays(start, -Math.round(years * p("daysPerMeanYear"))),
      ) as IsoDate,
    };
  });
  return { ...input, households };
}
