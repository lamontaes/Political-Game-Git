/**
 * Years in place on every household of the opening (town, kin and county
 * sample alike, both tiers): the day the household moved into its home. The
 * length of a stay is the survival of not having moved, run backward from the
 * head's age on the state's ACS yearly rate of moving at all by age band: the
 * share who left the county plus the share who moved within it
 * (mover-rates-acs-2024.json, the same rates the kin, the moves engine and the
 * past's moves pass use). A town home's tenure, as the housing opening drew
 * it, splits that rate by the moves engine's own owner hold
 * (`movesOwnerHold`) over this world's own share of owners among householders
 * of that age, so renters move more often than owners and each age's average
 * is unchanged. The household's seeded quantile picks where on that curve it
 * sits (generation of who exists, never an outcome of play). A stay cannot be
 * longer than the head's adult life.
 */
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import moveRows from "./data/moves/parameters.json" with { type: "json" };
import { addDays, ageInYears, makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import { openingTenureOf } from "./modules/housing";
import { placeStateKey } from "./place-map";
import { parameter as p } from "./parameters";
import type { CoreInput, HouseholdInput, IsoDate, PersonInput } from "./types";

type Rates = Readonly<Record<string, number>>;

/** A band table's bands read once: its low and high ages (none above "75+"), in the table's order. */
const parsedBands = new WeakMap<
  Rates,
  readonly { low: number; high: number | undefined; rate: number }[]
>();
function bandsOf(rates: Rates) {
  let bands = parsedBands.get(rates);
  if (!bands) {
    bands = Object.entries(rates).map(([band, rate]) => {
      const [low, high] = band.split(/[-+]/);
      return { low: Number(low), high: high ? Number(high) : undefined, rate };
    });
    parsedBands.set(rates, bands);
  }
  return bands;
}

/** The yearly rate of leaving at an age, from the band table ("18-19" ... "75+"). */
function rateAt(rates: Rates, age: number): number {
  for (const { low, high, rate } of bandsOf(rates))
    if (age >= low && (high === undefined || age <= high)) return rate;
  return p("zero");
}

/**
 * Years a household with a head of `headAge` has lived in its home, given a
 * quantile `u` of the stay-length curve (0 up to 1, exclusive). `scale` is
 * the household's multiple of the yearly hazard at an age (its tenure's
 * share of the age's moving); none leaves the rate as it is.
 */
export function yearsInPlaceOf(
  rates: Rates,
  headAge: number,
  u: number,
  scale?: (age: number) => number,
): number {
  const adult = p("votingAge");
  const most = Math.max(p("zero"), headAge - adult);
  const line = -Math.log(Math.max(u, Number.EPSILON));
  let hazard = p("zero");
  for (let back = p("zero"); back < most; back += p("one")) {
    const age = Math.max(adult, Math.floor(headAge - back - p("one")));
    const year =
      -Math.log(p("one") - rateAt(rates, age)) * (scale?.(age) ?? p("one"));
    if (hazard + year >= line) return back + (line - hazard) / year;
    hazard += year;
  }
  return most;
}

/** The state's yearly rate of moving at all by age band: leaving the county plus moving within it. */
function movingRates(stateKey: string): Rates {
  type Row = {
    departurePerYearByAge: Rates;
    withinCountyPerYearByAge?: Rates;
  };
  const row: Row =
    (moverRates.places as Record<string, Row>)[stateKey] ?? moverRates.national;
  const within = row.withinCountyPerYearByAge ?? {};
  return Object.fromEntries(
    Object.entries(row.departurePerYearByAge).map(([band, rate]) => [
      band,
      rate + (within[band] ?? p("zero")),
    ]),
  );
}

/**
 * Each tenure's multiple of an age's hazard: owners hold by the moves
 * engine's `movesOwnerHold` (as `modules/moves.ts` applies it), split over
 * this world's own share of owners among householders in the age's band so
 * the band's average stays the age's rate.
 */
function tenureScales(
  rates: Rates,
  heads: readonly { age: number; tenure: "own" | "rent" }[],
) {
  const hold = Math.exp(
    -(moveRows as unknown as Record<string, { value: number }>).movesOwnerHold!
      .value,
  );
  const bands = bandsOf(rates);
  const bandOf = (age: number) =>
    bands.findIndex(
      ({ low, high }) => age >= low && (high === undefined || age <= high),
    );
  const owners = bands.map(() => p("zero"));
  const all = bands.map(() => p("zero"));
  for (const { age, tenure } of heads) {
    const band = bandOf(age);
    if (band < 0) continue;
    all[band]! += p("one");
    if (tenure === "own") owners[band]! += p("one");
  }
  const townShare =
    owners.reduce((a, b) => a + b, p("zero")) /
    Math.max(
      p("one"),
      all.reduce((a, b) => a + b, p("zero")),
    );
  return (tenure: "own" | "rent") => (age: number) => {
    const band = bandOf(age);
    // A band with no householder in town reads the town's share.
    const share =
      band >= 0 && all[band]! > p("zero")
        ? owners[band]! / all[band]!
        : townShare;
    const renter = p("one") / (share * hold + p("one") - share);
    return tenure === "own" ? renter * hold : renter;
  };
}

/** The bands a tenure's share is counted in: the mover rates' own. */
const BANDS: Rates = moverRates.national.departurePerYearByAge;

/**
 * Each household's multiple of its age's moving hazard from the tenure of its
 * home (`tenure`, by household id), over `homes` (each household's id and its
 * head's age); none for a household with no home in `tenure`. The opening's
 * years in place and the past's moves pass (past-moves.ts) read this one
 * rule.
 */
export function tenureScaleOf(
  tenure: ReadonlyMap<string, "own" | "rent">,
  homes: readonly { id: string; head: number }[],
): (householdId: string | undefined) => ((age: number) => number) | undefined {
  const scaleOf = tenureScales(
    BANDS,
    homes.flatMap(({ id, head }) => {
      const kind = tenure.get(id);
      return kind ? [{ age: head, tenure: kind }] : [];
    }),
  );
  return (id) => {
    const kind = id === undefined ? undefined : tenure.get(id);
    return kind ? scaleOf(kind) : undefined;
  };
}

/** Every household of the opening gets the day it moved in, once the housing opening has drawn each town home's tenure. */
export function withYearsInPlace(input: CoreInput): CoreInput {
  const stateKey = placeStateKey(input.placeMetadata?.placeKey ?? "") ?? "";
  const rates = movingRates(stateKey);
  const start = makeIsoDate(input.startedAt);
  const people = new Map(input.people.map((row) => [row.id, row]));
  const headAge = (members: readonly (PersonInput | undefined)[]) =>
    Math.max(
      ...members
        .filter((row) => row !== undefined)
        .map((row) => ageInYears(row.birthDate, start)),
      p("zero"),
    );
  const homes = [
    ...input.households.map((home) => ({
      home,
      head: headAge(home.memberIds.map((id) => people.get(id))),
    })),
    ...(input.residents?.households ?? []).map((row) => ({
      home: row.household,
      head: headAge(row.people),
    })),
  ];
  // The town's homes, as the housing opening drew them; the county's other
  // homes get theirs when the module installs, and the past's moves pass reads them.
  const scaleOf = tenureScaleOf(
    openingTenureOf(input),
    homes.map(({ home, head }) => ({ id: home.id, head })),
  );
  const root = new SeededRng(input.seed).fork("opening-tenure");
  const placed = (home: HouseholdInput, head: number): HouseholdInput => {
    if (home.since || home.quarters || head < p("votingAge")) return home;
    const years = yearsInPlaceOf(
      rates,
      head,
      root.fork(home.id).next(),
      scaleOf(home.id),
    );
    return {
      ...home,
      since: makeIsoDate(
        addDays(start, -Math.round(years * p("daysPerMeanYear"))),
      ) as IsoDate,
    };
  };
  const households = input.households.map((home, i) =>
    placed(home, homes[i]!.head),
  );
  const offset = input.households.length;
  const residents = input.residents && {
    ...input.residents,
    households: input.residents.households.map((row, i): typeof row => {
      const home = placed(row.household, homes[offset + i]!.head);
      return home === row.household ? row : { ...row, household: home };
    }),
  };
  return { ...input, households, ...(residents ? { residents } : {}) };
}
