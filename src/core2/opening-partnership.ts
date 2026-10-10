/**
 * P15 later-life partnership: how likely a person of a given age and sex is to
 * have a living partner now, built from causes, and the ages of the adults in
 * each opening household drawn with it.
 *
 * The chance follows a yearly chain from age 15: never married people marry
 * at the place's ACS first-marriage pace (B12002 never-married shares by age);
 * a marriage ends by divorce at the NSFG pace for its length or by the
 * partner's death on the SSA 2023 life table; previously married people
 * remarry at the NCFMR 2022 rates by age and sex. A spouse's age follows the
 * CPS 2023 distribution of husbands' minus wives' ages (Table FG3), which
 * also sets how old the partner is whose death widows someone. Nothing here
 * rolls a die: the chain is arithmetic, and each age is a seeded pick among
 * real ages, keyed to that person and weighted by how many people of that age
 * and sex the place has times the chance their household fits them:
 * partnered for a couple; unpartnered and, by the place's ACS living
 * arrangements for their age band, living alone, with nonrelatives or with
 * relatives otherwise. Parents of children under 18 follow CPS 2023 parents
 * by age and living arrangement (Table A3), and each child's age follows the
 * births their parent had at each age.
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
export type Arrangement =
  "partnered" | "alone" | "housemate" | "relatives" | "grown-child";
type ParentArrangement = "partnered" | "single";
const SINGLE_PARENT_BANDS = bandsOf(data.parentAge.bands);

/** Mean children ever born by a woman's age, from Census fertility by age (June 2018). */
const FERTILITY_POINTS = (() => {
  const counts = OPENING_KIN.parityBins.counts;
  const mean = (percent: readonly number[]) =>
    percent.reduce((sum, share, i) => sum + share * counts[i]!, p("zero")) /
    percent.reduce((sum, share) => sum + share, p("zero"));
  return OPENING_KIN.fertilityByAge.rows.map((row) => ({
    age: row.minAge + data.fertilityBandMidYears,
    mean: mean(row.percent),
  }));
})();

function childrenEverBorn(age: number): number {
  const rows = OPENING_KIN.fertilityByAge.rows;
  const points = FERTILITY_POINTS;
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
  const shifted = motherAge(sex, age);
  const adult = p("benchmarkAdultMinimumAge");
  const births = childrenEverBorn(shifted) - childrenEverBorn(shifted - adult);
  return p("one") - Math.exp(-Math.max(births, p("zero")));
}

/** Men's children come a few years later in their lives, as in the kin model. */
function motherAge(sex: Sex, age: number): number {
  return sex === "male" ? age - p("kinMaleFertilityAgeShiftYears") : age;
}

/** Expected births to a parent of this sex in each whole year of age. */
const BIRTHS_BY_AGE = Object.fromEntries(
  (["female", "male"] as const).map((sex) => [
    sex,
    Array.from({ length: data.oldestAge + p("one") }, (_, age) => {
      const at = motherAge(sex, age);
      if (at < OPENING_KIN.fertilityByAge.rows[p("zero")]!.minAge)
        return p("zero");
      return Math.max(
        p("zero"),
        childrenEverBorn(at + p("one")) - childrenEverBorn(at),
      );
    }),
  ]),
) as Record<Sex, number[]>;

function birthsAtAge(sex: Sex, age: number): number {
  return BIRTHS_BY_AGE[sex][age] ?? p("zero");
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
  const count =
    arrangement === "alone"
      ? row.livesAlone[index]!
      : arrangement === "housemate"
        ? row.nonrelatives[index]!
        : arrangement === "grown-child"
          ? row.childOfHouseholder[index]!
          : row.childOfHouseholder[index]! + row.otherRelatives[index]!;
  return count / unpartnered;
}

/** Husbands' minus wives' ages, one weight per whole year (CPS FG3). */
const SPOUSE_GAP: ReadonlyMap<number, number> = (() => {
  const open = p("spouseAgeGapOpenRowYears");
  const out = new Map<number, number>();
  for (const row of data.spouseAgeGap.rows) {
    const low = row.low ?? row.high! - open + p("one");
    const high = row.high ?? row.low! + open - p("one");
    for (let gap = low; gap <= high; gap += p("one"))
      out.set(gap, row.thousands / (high - low + p("one")));
  }
  return out;
})();

/** Weight of a partner aged `other` for someone aged `age`, by the CPS age gap. */
function spouseGapWeight(
  age: number,
  sex: Sex | undefined,
  other: number,
  otherSex: Sex | undefined,
): number {
  const gap = (husband: number, wife: number) =>
    SPOUSE_GAP.get(husband - wife) ?? p("zero");
  if (sex && otherSex && sex !== otherSex)
    return sex === "male" ? gap(age, other) : gap(other, age);
  // Same-sex couples, or a partner whose sex is not recorded: either may be older.
  return (gap(age, other) + gap(other, age)) / p("two");
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
  const gapTotal = [...SPOUSE_GAP.values()].reduce(
    (sum, value) => sum + value,
    p("zero"),
  );
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
    // The spouse's age follows the CPS age gap, so wives are widowed sooner.
    let widowRate = p("zero");
    for (const [gap, weight] of SPOUSE_GAP) {
      const spouseAge = sex === "female" ? age + gap : age - gap;
      if (spouseAge < p("zero")) continue;
      widowRate +=
        (weight / gapTotal) *
        Number(
          ssa2023AnnualProbability(Math.min(spouseAge, data.oldestAge), other),
        );
    }
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

/** A seeded pick among the ages from `minimum`, weighted; undefined when no age fits. */
function pickAge(
  seed: string,
  key: string,
  minimum: number,
  weights: readonly number[],
): number | undefined {
  const total = weights.reduce((sum, value) => sum + value, p("zero"));
  if (!(total > p("zero"))) return undefined;
  let point = new SeededRng(seed).fork(`${data.version}:${key}`).next() * total;
  for (let i = p("zero"); i < weights.length; i += p("one")) {
    point -= weights[i]!;
    if (point < p("zero")) return minimum + i;
  }
  return minimum + weights.length - p("one");
}

const sexesOf = (sex: Sex | undefined): Sex[] =>
  sex ? [sex] : ["female", "male"];

const weightCache = new Map<string, number[]>();

/** People of this age and sex in the place times the chance this household fits them. */
function adultWeight(
  geo: { key: string; rows: Geo },
  sex: Sex,
  arrangement: Arrangement,
  age: number,
): number {
  const key = `${geo.key}:${sex}:${arrangement}`;
  let row = weightCache.get(key);
  if (!row) {
    row = Array.from({ length: data.oldestAge + p("one") }, (_, at) =>
      uncachedAdultWeight(geo, sex, arrangement, at),
    );
    weightCache.set(key, row);
  }
  return row[age] ?? p("zero");
}

function uncachedAdultWeight(
  geo: { key: string; rows: Geo },
  sex: Sex,
  arrangement: Arrangement,
  age: number,
): number {
  const partnered = partneredByAge(geo.key, geo.rows, sex)[age] ?? p("zero");
  return (
    peopleAtAge(geo.rows, sex, age) *
    (arrangement === "partnered"
      ? partnered * (p("one") - minorChildAtHome(sex, age))
      : (p("one") - partnered) * arrangementShare(geo.rows, arrangement, age))
  );
}

/**
 * One adult's age: a seeded pick among the whole ages in [minimum, maximumExclusive),
 * weighted by the place's people of that age and sex times how well the
 * household shape fits them.
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
  const weights: number[] = [];
  for (let age = input.minimum; age < input.maximumExclusive; age += p("one"))
    weights.push(
      sexesOf(input.sex).reduce(
        (sum, sex) => sum + adultWeight(input.geo, sex, input.arrangement, age),
        p("zero"),
      ),
    );
  return (
    pickAge(input.seed, `${input.key}:age`, input.minimum, weights) ??
    input.minimum
  );
}

/**
 * A parent of children under 18: CPS A3 parents of this sex and living
 * arrangement in each age band, spread within the band by the place's people
 * of each age who are (un)partnered and have a child under 18 at home.
 */
function parentAgeWeights(
  geo: { key: string; rows: Geo },
  sex: Sex | undefined,
  arrangement: ParentArrangement,
  minimum: number,
  maximumExclusive: number,
): number[] {
  const weights = Array.from({ length: maximumExclusive - minimum }, () =>
    p("zero"),
  );
  for (const s of sexesOf(sex)) {
    const partnered = partneredByAge(geo.key, geo.rows, s);
    SINGLE_PARENT_BANDS.forEach((band, b) => {
      const single = data.parentAge.single[s][b]!;
      const parents =
        arrangement === "single" ? single : data.parentAge.all[s][b]! - single;
      const low = Math.max(band.low, minimum);
      const high = Math.min(band.high, maximumExclusive);
      const shape: number[] = [];
      for (let age = low; age < high; age += p("one")) {
        const fit =
          arrangement === "single"
            ? p("one") - (partnered[age] ?? p("zero"))
            : (partnered[age] ?? p("zero"));
        shape.push(
          peopleAtAge(geo.rows, s, age) * fit * minorChildAtHome(s, age),
        );
      }
      const total = shape.reduce((sum, value) => sum + value, p("zero"));
      if (!(total > p("zero"))) return;
      shape.forEach((value, i) => {
        weights[low - minimum + i]! += (parents * value) / total;
      });
    });
  }
  return weights;
}

/** A partner's age: the CPS spouse age gap from the first adult's age. */
function partnerAgeWeights(
  head: number,
  headSex: Sex | undefined,
  partnerSex: Sex | undefined,
  minimum: number,
  maximumExclusive: number,
): number[] {
  const weights: number[] = [];
  for (let age = minimum; age < maximumExclusive; age += p("one"))
    weights.push(spouseGapWeight(head, headSex, age, partnerSex));
  return weights;
}

/** Births to a parent of unknown sex count as the average of a mother's and a father's. */
function birthsTo(sex: Sex | undefined, age: number): number {
  const sexes = sexesOf(sex);
  return (
    sexes.reduce((sum, s) => sum + birthsAtAge(s, age), p("zero")) /
    sexes.length
  );
}

/**
 * A child's age under 18: the births their parent had at each age, among the
 * ages at which every parent in the home was old enough.
 */
function childAgeWeights(
  parents: readonly { age: number; sex: Sex | undefined }[],
  reference: { age: number; sex: Sex | undefined },
): number[] {
  const youngestParent = OPENING_KIN.fertilityByAge.rows[p("zero")]!.minAge;
  const weights: number[] = [];
  for (
    let age = p("zero");
    age < p("benchmarkAdultMinimumAge");
    age += p("one")
  )
    weights.push(
      parents.every((parent) => parent.age - age >= youngestParent)
        ? birthsTo(reference.sex, reference.age - age)
        : p("zero"),
    );
  return weights;
}

/**
 * A parent and grown child living together: the parent weighted by the
 * place's unpartnered adults of their age who live with relatives, the child
 * by those who live in a parent's home, and the pair by the births the parent
 * had at the age between them.
 */
function relativesPair(input: {
  seed: string;
  key: string;
  geo: { key: string; rows: Geo };
  parentSex: Sex | undefined;
  childSex: Sex | undefined;
  minimum: number;
  maximumExclusive: number;
}): [number, number] | undefined {
  const span = input.maximumExclusive - input.minimum;
  const weightOf = (sex: Sex | undefined, arrangement: Arrangement) =>
    Array.from({ length: span }, (_, i) =>
      sexesOf(sex).reduce(
        (sum, s) =>
          sum + adultWeight(input.geo, s, arrangement, input.minimum + i),
        p("zero"),
      ),
    );
  const parent = weightOf(input.parentSex, "relatives");
  const child = weightOf(input.childSex, "grown-child");
  const weights: number[] = [];
  for (let a = p("zero"); a < span; a += p("one"))
    for (let c = p("zero"); c < span; c += p("one"))
      weights.push(
        c < a
          ? parent[a]! * child[c]! * birthsTo(input.parentSex, a - c)
          : p("zero"),
      );
  const index = pickAge(input.seed, `${input.key}:pair`, p("zero"), weights);
  if (index === undefined) return undefined;
  return [
    input.minimum + Math.floor(index / span),
    input.minimum + (index % span),
  ];
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
 * Ages the members of an opening household from the place's records: who
 * lives alone, as a couple, as a parent of children under 18, with a grown
 * child or with housemates follows the place's people by age and sex, their
 * chance of having a partner now, CPS parents by age, and the spouse age gap.
 * A household of housemates is a parent and grown child in the place's share
 * of such households that are relatives (ACS B11001 and B11003); the grown
 * child takes the parent's surname and `grownChild` names them.
 */
export function partnerAgedHousehold<
  S extends SkeletonLike,
  P extends PersonLike,
>(input: {
  seed: string;
  geo: { key: string; rows: Geo };
  skeleton: S;
  people: readonly P[];
  rebirth: (person: P, age: number) => P;
}): { skeleton: S; people: P[]; grownChild?: number } {
  const shape = input.skeleton.shape;
  const sexOf = (n: number): Sex | undefined => {
    const gender = input.people[n]?.identity?.gender;
    return gender === "female" || gender === "male" ? gender : undefined;
  };
  const keyOf = (n: number) => input.people[n]!.stableKey;
  const minimum = p("benchmarkAdultMinimumAge");
  const maximumExclusive = data.oldestAge + p("one");
  const members = input.skeleton.members;
  const ages = members.map((member) => member.age);
  const adults = members.flatMap((member, n) =>
    member.role === "adult" ? [n] : [],
  );
  const children = members.flatMap((member, n) =>
    member.role === "child" ? [n] : [],
  );
  const adultAge = (n: number, arrangement: Arrangement) =>
    drawAdultAge({
      seed: input.seed,
      key: keyOf(n),
      geo: input.geo,
      sex: sexOf(n),
      arrangement,
      minimum,
      maximumExclusive,
    });
  const partnerOf = (head: number, n: number) =>
    pickAge(
      input.seed,
      `${keyOf(n)}:age`,
      minimum,
      partnerAgeWeights(
        ages[head]!,
        sexOf(head),
        sexOf(n),
        minimum,
        maximumExclusive,
      ),
    ) ?? ages[n]!;
  let grownChild: number | undefined;
  if (shape === "alone") ages[p("zero")] = adultAge(p("zero"), "alone");
  else if (shape === "housemates") {
    const counts = input.geo.rows.households;
    const related =
      counts.otherFamilyNoChildren /
      Math.max(counts.otherFamilyNoChildren + counts.nonfamilyShared, p("one"));
    const pair =
      new SeededRng(input.seed)
        .fork(`${data.version}:${keyOf(p("zero"))}:relatives`)
        .next() < related
        ? relativesPair({
            seed: input.seed,
            key: keyOf(p("zero")),
            geo: input.geo,
            parentSex: sexOf(p("zero")),
            childSex: sexOf(p("one")),
            minimum,
            maximumExclusive,
          })
        : undefined;
    if (pair) {
      [ages[p("zero")], ages[p("one")]] = pair;
      grownChild = p("one");
    } else for (const n of adults) ages[n] = adultAge(n, "housemate");
  } else if (shape === "couple") {
    ages[p("zero")] = adultAge(p("zero"), "partnered");
    ages[p("one")] = partnerOf(p("zero"), p("one"));
  } else if (
    shape === "couple-with-children" ||
    shape === "parent-with-children"
  ) {
    const head = adults[p("zero")]!;
    ages[head] =
      pickAge(
        input.seed,
        `${keyOf(head)}:age`,
        minimum,
        parentAgeWeights(
          input.geo,
          sexOf(head),
          shape === "couple-with-children" ? "partnered" : "single",
          minimum,
          maximumExclusive,
        ),
      ) ?? ages[head]!;
    for (const n of adults.slice(p("one"))) ages[n] = partnerOf(head, n);
    const parents = adults.map((n) => ({ age: ages[n]!, sex: sexOf(n) }));
    const reference =
      parents.find((parent) => parent.sex === "female") ?? parents[p("zero")]!;
    for (const n of children)
      ages[n] =
        pickAge(
          input.seed,
          `${keyOf(n)}:age`,
          p("zero"),
          childAgeWeights(parents, reference),
        ) ?? ages[n]!;
  } else return { skeleton: input.skeleton, people: [...input.people] };
  const familyName =
    grownChild === undefined ? undefined : input.people[p("zero")]!.familyName;
  const people = input.people.map((person, n) => {
    const aged =
      ages[n] !== members[n]!.age ? input.rebirth(person, ages[n]!) : person;
    return n === grownChild && familyName !== undefined
      ? { ...aged, familyName }
      : aged;
  });
  return {
    skeleton: {
      ...input.skeleton,
      members: members.map((member, n) => ({ ...member, age: ages[n]! })),
    },
    people,
    ...(grownChild === undefined ? {} : { grownChild }),
  };
}
