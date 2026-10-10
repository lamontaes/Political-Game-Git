/**
 * P15 later-life partnership: how likely a person of a given age and sex is to
 * have a living partner now, built from causes, and the ages of the adults in
 * each opening household drawn with it.
 *
 * The chance follows a yearly chain from age 15: never married people marry
 * at the place's ACS first-marriage pace (B12002 never-married shares by age);
 * a marriage ends by divorce at the NSFG pace for its length or by the
 * partner's death on the SSA 2023 life table; previously married people
 * remarry at the NCFMR 2022 rates by age and sex. Nothing here rolls a die:
 * the chain is arithmetic, and each adult's age is a seeded pick among the
 * ages their household role allows, keyed to that person and weighted by how
 * many people of that age and sex the place has times the chance their
 * household shape fits them: partnered for a couple; unpartnered and, by the
 * place's ACS living arrangements for their age band, living alone or with
 * nonrelatives otherwise.
 */
import data from "./data/opening-partnership.json" with { type: "json" };
import { OPENING_KIN } from "./opening-kin";
import { ssa2023AnnualProbability } from "../simulation/crisis/mortality-table";
import { SeededRng } from "../simulation/rng";
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";

export const OPENING_PARTNERSHIP = data;
export type Sex = "female" | "male";
type Band = { low: number; high: number };
type Geo = (typeof data.geos)[keyof typeof data.geos];

const bandsOf = (labels: readonly string[]): Band[] =>
  labels.map((label) => {
    const [low, high] = label.split(/[-+]/);
    return {
      low: Number(low),
      high: high ? Number(high) + p("one") : data.oldestAge + p("one"),
    };
  });
const POPULATION_BANDS = bandsOf(data.populationBands);
const MARITAL_BANDS = bandsOf(data.maritalBands);
const REMARRIAGE_BANDS = bandsOf(data.remarriage.bands);
const ARRANGEMENT_BANDS = bandsOf(data.arrangementBands);
export type Arrangement = "partnered" | "alone" | "housemate";

/** Mean children ever born by a woman's age, from Census fertility by age (June 2018). */
function childrenEverBorn(age: number): number {
  const rows = OPENING_KIN.fertilityByAge.rows;
  const counts = OPENING_KIN.parityBins.counts;
  const mean = (percent: readonly number[]) =>
    percent.reduce((sum, share, i) => sum + share * counts[i]!, p("zero")) /
    percent.reduce((sum, share) => sum + share, p("zero"));
  const points = rows.map((row) => ({
    age: row.minAge + data.fertilityBandMidYears,
    mean: mean(row.percent),
  }));
  if (age <= points[p("zero")]!.age)
    return Math.max(
      p("zero"),
      (points[p("zero")]!.mean * (age - rows[p("zero")]!.minAge)) /
        data.fertilityBandMidYears,
    );
  for (let i = p("one"); i < points.length; i += p("one"))
    if (age <= points[i]!.age) {
      const a = points[i - p("one")]!,
        b = points[i]!;
      return a.mean + ((b.mean - a.mean) * (age - a.age)) / (b.age - a.age);
    }
  return points[points.length - p("one")]!.mean;
}

/**
 * Chance a partnered adult has a child under 18 at home: at least one birth in
 * the last 18 years (Poisson in the expected births over that span). Men's
 * children come a few years later in their lives, as in the kin model.
 */
function minorChildAtHome(sex: Sex, age: number): number {
  const shifted =
    sex === "male" ? age - p("kinMaleFertilityAgeShiftYears") : age;
  const adult = p("benchmarkAdultMinimumAge");
  const births = childrenEverBorn(shifted) - childrenEverBorn(shifted - adult);
  return p("one") - Math.exp(-Math.max(births, p("zero")));
}

/** Share of the place's unpartnered adults of this age who live alone, or with nonrelatives. */
function arrangementShare(
  rows: Geo,
  arrangement: Arrangement,
  age: number,
): number {
  const index = bandIndex(ARRANGEMENT_BANDS, age);
  if (index < p("zero")) return p("zero");
  const row = rows.arrangements;
  const unpartnered = Math.max(row.unpartnered[index]!, p("one"));
  return (
    (arrangement === "alone"
      ? row.livesAlone[index]!
      : row.nonrelatives[index]!) / unpartnered
  );
}

/** The place's rows, else its state's, else the nation's. */
export function partnershipGeo(placeGeoid?: string | null): {
  key: string;
  rows: Geo;
} {
  const geos = data.geos as Record<string, Geo>;
  for (const key of [placeGeoid, placeGeoid?.slice(p("zero"), p("two"))])
    if (key && geos[key]) return { key, rows: geos[key] };
  return { key: data.nationalKey, rows: geos[data.nationalKey]! };
}

function bandIndex(bands: readonly Band[], age: number): number {
  return bands.findIndex((row) => age >= row.low && age < row.high);
}

/** People of each single year of age, from the place's ACS sex-by-age bands. */
export function peopleAtAge(rows: Geo, sex: Sex, age: number): number {
  const index = bandIndex(POPULATION_BANDS, age);
  if (index < p("zero")) return p("zero");
  const band = POPULATION_BANDS[index]!;
  return rows.population[sex][index]! / (band.high - band.low);
}

function neverMarriedShare(rows: Geo, sex: Sex, age: number): number {
  const shareOf = (index: number) =>
    rows.neverMarried[sex][index]! /
    Math.max(rows.marital[sex][index]!, p("one"));
  const mids = MARITAL_BANDS.map((row) => (row.low + row.high) / p("two"));
  if (age <= mids[p("zero")]!)
    return age < MARITAL_BANDS[p("zero")]!.low ? p("one") : shareOf(p("zero"));
  for (let i = p("one"); i < mids.length; i += p("one"))
    if (age <= mids[i]!) {
      const t = (age - mids[i - p("one")]!) / (mids[i]! - mids[i - p("one")]!);
      return shareOf(i - p("one")) + (shareOf(i) - shareOf(i - p("one"))) * t;
    }
  return shareOf(mids.length - p("one"));
}

function intact(years: number): number {
  const points = data.marriageIntact.points;
  const last = points[points.length - p("one")]!;
  if (years >= last.years) return last.intact;
  for (let i = p("one"); i < points.length; i += p("one")) {
    const a = points[i - p("one")]!,
      b = points[i]!;
    if (years <= b.years)
      return (
        a.intact +
        ((b.intact - a.intact) * (years - a.years)) / (b.years - a.years)
      );
  }
  return p("one");
}

const cache = new Map<string, number[]>();

/** Chance of having a living partner at each age, for one place and sex. */
export function partneredByAge(key: string, rows: Geo, sex: Sex): number[] {
  const cached = cache.get(`${key}:${sex}`);
  if (cached) return cached;
  stopgap("SG-P15-partnership-model");
  const other: Sex = sex === "female" ? "male" : "female";
  const gap =
    (sex === "female" ? p("one") : -p("one")) * p("kinPaternalAgeGapYears");
  const longest = data.marriageIntact.points.at(-p("one"))!.years;
  let never = p("one"),
    previous = p("zero");
  let married = Array.from({ length: longest + p("one") }, () => p("zero"));
  const out: number[] = [];
  for (let age = p("zero"); age <= data.oldestAge; age += p("one")) {
    out.push(married.reduce((sum, value) => sum + value, p("zero")));
    if (age < data.firstMarriageAge) continue;
    const now = neverMarriedShare(rows, sex, age);
    const next = neverMarriedShare(rows, sex, age + p("one"));
    const firstRate =
      now > p("zero")
        ? Math.min(Math.max(p("one") - next / now, p("zero")), p("one"))
        : p("zero");
    const spouseAge = Math.max(p("zero"), Math.round(age + gap));
    const widowRate = Number(ssa2023AnnualProbability(spouseAge, other));
    const shifted = married.map(() => p("zero"));
    let ended = p("zero");
    married.forEach((share, years) => {
      const divorceRate =
        years < longest
          ? p("one") - intact(years + p("one")) / intact(years)
          : p("zero");
      const end = divorceRate + widowRate - divorceRate * widowRate;
      ended += share * end;
      shifted[Math.min(years + p("one"), longest)]! += share * (p("one") - end);
    });
    const firstMarriages = never * firstRate;
    never -= firstMarriages;
    const band = bandIndex(REMARRIAGE_BANDS, age);
    const remarryRate =
      band < p("zero")
        ? p("zero")
        : data.remarriage.perThousand[sex][band]! / data.remarriage.per;
    const remarriages = previous * remarryRate;
    previous += ended - remarriages;
    shifted[p("zero")]! += firstMarriages + remarriages;
    married = shifted;
  }
  cache.set(`${key}:${sex}`, out);
  return out;
}

/**
 * One adult's age: a seeded pick among the whole ages in [minimum, maximumExclusive),
 * weighted by the place's people of that age and sex times how well the
 * household shape fits them (partnered or not).
 */
export function drawAdultAge(input: {
  seed: string;
  key: string;
  geo: { key: string; rows: Geo };
  sex: Sex | undefined;
  arrangement: Arrangement;
  minimum: number;
  maximumExclusive: number;
}): number {
  const sexes: Sex[] = input.sex ? [input.sex] : ["female", "male"];
  const weights: number[] = [];
  for (let age = input.minimum; age < input.maximumExclusive; age += p("one")) {
    let weight = p("zero");
    for (const sex of sexes) {
      const partnered =
        partneredByAge(input.geo.key, input.geo.rows, sex)[age] ?? p("zero");
      weight +=
        peopleAtAge(input.geo.rows, sex, age) *
        (input.arrangement === "partnered"
          ? partnered * (p("one") - minorChildAtHome(sex, age))
          : (p("one") - partnered) *
            arrangementShare(input.geo.rows, input.arrangement, age));
    }
    weights.push(weight);
  }
  const total = weights.reduce((sum, value) => sum + value, p("zero"));
  if (!(total > p("zero"))) return input.minimum;
  let point =
    new SeededRng(input.seed).fork(`${data.version}:${input.key}:age`).next() *
    total;
  for (let i = p("zero"); i < weights.length; i += p("one")) {
    point -= weights[i]!;
    if (point < p("zero")) return input.minimum + i;
  }
  return input.maximumExclusive - p("one");
}

type SkeletonLike = {
  readonly index: number;
  readonly shape: string;
  readonly members: readonly {
    readonly age: number;
    readonly role: "adult" | "child";
  }[];
};
type PersonLike = {
  readonly stableKey: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: string;
  readonly identity?: { readonly gender: string };
};

/**
 * Re-ages the adults of a household without children so that who lives as a
 * couple and who lives alone or with housemates follows the place's people by
 * age and sex and their chance of having a partner now. Households with
 * children keep the ages their children's ages were drawn from.
 */
export function partnerAgedHousehold<
  S extends SkeletonLike,
  P extends PersonLike,
>(input: {
  seed: string;
  geo: { key: string; rows: Geo };
  skeleton: S;
  people: readonly P[];
  bounds: (role: string) => { minimum: number; maximumExclusive: number };
  rebirth: (person: P, age: number) => P;
}): { skeleton: S; people: P[] } {
  const roles = (
    data.householdRoles as unknown as Record<
      string,
      | { roles: string[]; partnered: boolean; arrangement: Arrangement }
      | undefined
    >
  )[input.skeleton.shape];
  if (!roles) return { skeleton: input.skeleton, people: [...input.people] };
  const sexOf = (n: number) => {
    const gender = input.people[n]?.identity?.gender;
    return gender === "female" || gender === "male" ? gender : undefined;
  };
  const ages: number[] = [];
  roles.roles.forEach((role, n) => {
    const own = input.bounds(role);
    const head = ages[p("zero")];
    // A partner is within the household generator's age band of the first adult.
    const band = data.partnerAgeBandYears;
    const bounds =
      roles.partnered && n > p("zero") && head !== undefined
        ? {
            minimum: Math.max(own.minimum, head - band),
            maximumExclusive: Math.min(
              own.maximumExclusive,
              head + band + p("one"),
            ),
          }
        : own;
    ages.push(
      drawAdultAge({
        seed: input.seed,
        key: input.people[n]!.stableKey,
        geo: input.geo,
        sex: sexOf(n),
        arrangement: roles.arrangement,
        ...bounds,
      }),
    );
  });
  const members = input.skeleton.members.map((member, n) =>
    n < ages.length ? { ...member, age: ages[n]! } : member,
  );
  const people = input.people.map((person, n) =>
    n < ages.length && ages[n] !== input.skeleton.members[n]!.age
      ? input.rebirth(person, ages[n]!)
      : person,
  );
  return { skeleton: { ...input.skeleton, members }, people };
}
