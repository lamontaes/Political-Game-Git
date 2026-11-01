/**
 * P15 opening kin: the relatives every generated resident has outside their
 * household, consistent with each person's age. Parents survive by the SSA
 * 2023 life table, siblings come from the size-biased completed fertility of
 * the mother's cohort, children from children ever born by age, and
 * grandchildren from the adult children's own fertility. Relatives who live
 * elsewhere are light husk-tier people in households of their own. Where they
 * live follows the family: an adult who never left the county they grew up in
 * has parents nearby, siblings stay near the parents unless they moved away,
 * and grown children stay near the household unless they moved away. Whether
 * someone moved away is their state's ACS rate of leaving the county at each
 * adult age, read against their own seeded line, as survival is.
 *
 * Opening generation decides who exists; no draw here decides what anyone does.
 */
import kinJson from "./data/opening-kin.json" with { type: "json" };
import cohortJson from "./data/ssa-cohort-life-tables.json" with { type: "json" };
import {
  addDays,
  ageOnDate,
  isoDateFromParts,
  makeIsoDate,
} from "./kernel/dates";
import { createStableId } from "./kernel/ids";
import { generatePersonIdentity } from "./gov-rules/person-identity";
import { SeededRng } from "./kernel/rng";
import partnershipJson from "./data/opening-partnership.json" with { type: "json" };
import { parameter as p } from "./parameters";
import pastParameters from "./data/past/parameters.json" with { type: "json" };
import { stopgap } from "./stopgaps";
import type { IsoDate, PersonId } from "./types";

export const OPENING_KIN = kinJson;
// The NSFG marriage-survival points live with the partnership chain.
const OPENING_PARTNERSHIP = partnershipJson;
export type KinRelation =
  (typeof OPENING_KIN.relations)[keyof typeof OPENING_KIN.relations];

export interface KinHouseholdMember {
  id: PersonId;
  role: "adult" | "child";
  birthDate: IsoDate;
  gender?: string;
  familyName: string;
}

export interface KinHouseholdInput {
  id: string;
  stableKey: string;
  couple: boolean;
  /** The household's own county, for relatives who live near. */
  countyId?: string;
  members: readonly KinHouseholdMember[];
}

export type KinNamer = (input: {
  stableKey: string;
  gender: string;
  birthDate: IsoDate;
  familyName: string | null;
}) => { givenName: string; familyName: string };

export interface OpeningKinOptions {
  seed: string;
  worldId: string;
  startedAt: IsoDate;
  townId: string;
  countyId?: string;
  stateId?: string;
  /** The state's yearly rate of leaving the county, by ACS age band ("18-19" ... "75+"). */
  departurePerYearByAge: Readonly<Record<string, number>>;
  name: KinNamer;
}

export interface KinPerson {
  id: PersonId;
  stableKey: string;
  givenName: string;
  familyName: string;
  birthDate: IsoDate;
  gender: string;
  placeId: string;
  countyId?: string;
  householdId: string;
}

export interface KinRelationFact {
  personId: PersonId;
  otherId: PersonId;
  /** What `otherId` is to `personId`. */
  relation: KinRelation;
  /** The later of the two birth dates: the first day the tie existed for both. */
  date: IsoDate;
}

export interface OpeningKin {
  people: KinPerson[];
  households: { id: string; placeId: string; memberIds: PersonId[] }[];
  parentChildLinks: { id: string; parentId: PersonId; childId: PersonId }[];
  relations: KinRelationFact[];
  /** Biological parents the generator knows, for inherited temperament. */
  parentsOf: Map<PersonId, PersonId[]>;
  /**
   * Parents who died in the year before day one, from the same life-table
   * line that decides whether a parent is alive: the relative who survives
   * them, and who they were. They are in the world as dead people: a record
   * with a date of death, in no household, place count or tier.
   */
  deaths: KinDeath[];
}

export interface KinDeath {
  /** The dead parent's own person record, a dead person from day one. */
  personId: PersonId;
  /** The resident whose parent died. */
  survivorId: PersonId;
  relation: "father" | "mother";
  stableKey: string;
  givenName: string;
  familyName: string;
  birthDate: IsoDate;
  gender: string;
  date: IsoDate;
}

interface Dated {
  id: PersonId;
  birthDate: IsoDate;
  gender?: string;
  familyName: string;
}

interface Home {
  row: OpeningKin["households"][number];
  countyId?: string;
}

const COHORT_TABLES = cohortJson;
const R = OPENING_KIN.relations;
const FEMALE = OPENING_KIN.genders.female;
const MALE = OPENING_KIN.genders.male;

const hazardTables = new Map<string, number[]>();

/**
 * Cumulative age-year hazards for one birth year, by sex: SSA cohort life
 * tables (Actuarial Study No. 120), interpolated between birth decades and
 * held at the first and last decade outside them.
 */
function cumulativeHazard(sex: string, birthYear: number): number[] {
  // People outside the two SSA categories use the female table (registered gap).
  const key = sex === MALE ? "male" : "female";
  const cohorts = COHORT_TABLES.cohorts;
  const first = cohorts[p("zero")]!;
  const last = cohorts[cohorts.length - p("one")]!;
  const year = Math.min(last, Math.max(first, Math.round(birthYear)));
  const cacheKey = `${key}:${year}`;
  const cached = hazardTables.get(cacheKey);
  if (cached) return cached;
  const below = [...cohorts].reverse().find((cohort) => cohort <= year)!;
  const above = cohorts.find((cohort) => cohort >= year)!;
  const share = above === below ? p("zero") : (year - below) / (above - below);
  const table = COHORT_TABLES[key] as Record<string, readonly number[]>;
  const low = table[String(below)]!;
  const high = table[String(above)]!;
  const rows = [p("zero")];
  low.forEach((q, age) => {
    const blended = q + (high[age]! - q) * share;
    rows.push(rows[age]! - Math.log(p("one") - Math.min(blended, p("one"))));
  });
  hazardTables.set(cacheKey, rows);
  return rows;
}

function hazardBetween(
  sex: string,
  birthYear: number,
  fromAge: number,
  toAge: number,
): number {
  const rows = cumulativeHazard(sex, birthYear);
  const last = rows.length - p("one");
  const at = (age: number) =>
    rows[Math.max(p("zero"), Math.min(last, Math.floor(age)))]!;
  return at(toAge) - at(fromAge);
}

/** A person's own exponential line: they are alive while their cohort's hazard stays below it. */
function survivesAt(
  draw: number,
  sex: string,
  birthYear: number,
  fromAge: number,
  toAge: number,
) {
  return (
    hazardBetween(sex, birthYear, fromAge, toAge) < -Math.log(p("one") - draw)
  );
}

function survives(
  rng: SeededRng,
  sex: string,
  birthYear: number,
  fromAge: number,
  toAge: number,
) {
  return survivesAt(rng.next(), sex, birthYear, fromAge, toAge);
}

/**
 * The day a person who did not live to `toAge` died, when it fell within the
 * last `windowYears` of that span: the hazard they had left on entering the
 * window, spread evenly over it. Null when they died before the window.
 */
function diedInWindow(
  draw: number,
  sex: string,
  birthYear: number,
  fromAge: number,
  toAge: number,
  windowYears: number,
): number | null {
  const line = -Math.log(p("one") - draw);
  const before = hazardBetween(sex, birthYear, fromAge, toAge - windowYears);
  const through = hazardBetween(sex, birthYear, fromAge, toAge);
  if (before >= line || through <= before) return null;
  return (line - before) / (through - before);
}

/** Cumulative hazard of moving away between two ages, from the yearly leaving rates by band. */
function moveHazard(
  rates: Readonly<Record<string, number>>,
  fromAge: number,
  toAge: number,
): number {
  const bands = Object.entries(rates).map(([band, rate]) => {
    const [low, high] = band.split(/[-+]/);
    return {
      low: Number(low),
      high: high ? Number(high) + p("one") : Number.POSITIVE_INFINITY,
      hazard: -Math.log(p("one") - rate) * p("kinMoveAwayShare"),
    };
  });
  let total = p("zero");
  for (let age = Math.floor(fromAge); age < Math.floor(toAge); age += p("one"))
    total +=
      bands.find((row) => age >= row.low && age < row.high)?.hazard ??
      p("zero");
  return total;
}

/** Chance the parents' marriage is still intact this many years after it began (NSFG). */
function marriageIntact(years: number): number {
  const points = OPENING_PARTNERSHIP.marriageIntact.points;
  if (years >= points[points.length - p("one")]!.years)
    return points[points.length - p("one")]!.intact;
  for (let i = p("one"); i < points.length; i += p("one")) {
    const a = points[i - p("one")]!,
      b = points[i]!;
    if (years <= b.years)
      return (
        a.intact +
        ((b.intact - a.intact) * (years - a.years)) / (b.years - a.years)
      );
  }
  return points[p("zero")]!.intact;
}

function normal(rng: SeededRng): number {
  const u = p("one") - rng.next();
  return (
    Math.sqrt(-p("two") * Math.log(u)) *
    Math.cos(p("two") * Math.PI * rng.next())
  );
}

function firstBirthAge(year: number): number {
  const points = OPENING_KIN.firstBirthAge.points;
  if (year <= points[p("zero")]!.year) return points[p("zero")]!.age;
  for (let i = p("one"); i < points.length; i += p("one")) {
    const a = points[i - p("one")]!;
    const b = points[i]!;
    if (year <= b.year)
      return a.age + ((b.age - a.age) * (year - a.year)) / (b.year - a.year);
  }
  return points[points.length - p("one")]!.age;
}

function completedRow(motherBirthYear: number): readonly number[] {
  const survey =
    motherBirthYear + OPENING_KIN.completedFertility.cohortOffsetYears;
  const rows = OPENING_KIN.completedFertility.rows;
  let chosen = rows[p("zero")]!;
  for (const row of rows) if (row.surveyYear <= survey) chosen = row;
  return chosen.percent;
}

function fertilityRowForAge(age: number, birthYear: number): readonly number[] {
  const byAge = OPENING_KIN.fertilityByAge;
  if (age >= byAge.completedFromAge) return completedRow(birthYear);
  let chosen: readonly number[] | undefined;
  for (const row of byAge.rows) if (age >= row.minAge) chosen = row.percent;
  return chosen ?? [p("percent")];
}

/** A count from a children-ever-born row, at least `minimum`, optionally size-biased. */
function drawCount(
  rng: SeededRng,
  percent: readonly number[],
  minimum: number,
  sizeBiased: boolean,
): number {
  const bins = OPENING_KIN.parityBins;
  const upper = (index: number) =>
    index === bins.splitBinIndex
      ? bins.splitBinUpperCount
      : (bins.counts[index] ?? p("zero"));
  const weights = percent.map((share, index) =>
    upper(index) < minimum
      ? p("zero")
      : share * (sizeBiased ? (bins.counts[index] ?? p("zero")) : p("one")),
  );
  const total = weights.reduce((sum, value) => sum + value, p("zero"));
  if (total <= p("zero")) return minimum;
  let point = rng.next() * total;
  for (let index = p("zero"); index < weights.length; index += p("one")) {
    const weight = weights[index]!;
    if (point < weight) {
      // In the five-and-six bin, the position within the bin picks the count.
      const count =
        index === bins.splitBinIndex && point / weight >= p("one") / p("two")
          ? bins.splitBinUpperCount
          : bins.counts[index]!;
      return Math.max(minimum, count);
    }
    point -= weight;
  }
  return minimum;
}

function yearOfDate(date: IsoDate): number {
  return Number(date.slice(p("zero"), p("isoYearCharacters")));
}

function dateInYear(rng: SeededRng, year: number): IsoDate {
  return isoDateFromParts(
    year,
    rng.integer(p("one"), p("monthsPerYear") + p("one")),
    rng.integer(p("one"), p("kinBirthdayLatestDayOfMonth") + p("one")),
  );
}

export function buildOpeningKin(
  households: readonly KinHouseholdInput[],
  options: OpeningKinOptions,
): OpeningKin {
  stopgap("SG-P15-kin-generation");
  const out: OpeningKin = {
    people: [],
    households: [],
    parentChildLinks: [],
    relations: [],
    parentsOf: new Map(),
    deaths: [],
  };
  const startedAt = makeIsoDate(options.startedAt);
  const adultAge = p("votingAge");
  const archiveDays = pastParameters.pastArchiveDays.value;
  const interval = p("kinInterbirthYears");
  const minParentAge = OPENING_KIN.fertilityByAge.rows[p("zero")]!.minAge;
  const maxMotherAge = OPENING_KIN.fertilityByAge.completedFromAge;
  const ageAt = (date: string) => ageOnDate(makeIsoDate(date), startedAt);
  const ageOf = (row: Dated) => ageAt(row.birthDate);

  const relate = (a: Dated, b: Dated, aToB: KinRelation, bToA: KinRelation) => {
    const date = a.birthDate > b.birthDate ? a.birthDate : b.birthDate;
    out.relations.push({ personId: b.id, otherId: a.id, relation: aToB, date });
    out.relations.push({ personId: a.id, otherId: b.id, relation: bToA, date });
  };
  const addParents = (childId: PersonId, parents: readonly Dated[]) => {
    const list = out.parentsOf.get(childId) ?? [];
    for (const parent of parents)
      if (!list.includes(parent.id)) list.push(parent.id);
    out.parentsOf.set(childId, list);
  };
  const linkParent = (parent: Dated, child: Dated) =>
    out.parentChildLinks.push({
      id: createStableId(
        "kinship",
        `${options.worldId}:opening-kin:${parent.id}:${child.id}`,
      ),
      parentId: parent.id,
      childId: child.id,
    });
  const parentOf = (parent: Dated, child: Dated, relation: KinRelation) => {
    relate(parent, child, relation, R.child);
    linkParent(parent, child);
  };

  for (const household of households) {
    const rng = new SeededRng(options.seed).fork(
      `${OPENING_KIN.version}:${household.stableKey}`,
    );
    const adults = household.members.filter((row) => row.role === "adult");
    const children = household.members.filter((row) => row.role === "child");

    const countyId = household.countyId ?? options.countyId;
    // Whether an adult has stayed where they grew up since turning adult (who
    // lives near whom at the opening). When someone who left came to the
    // county is run by the moves engine's rule before the start
    // (src/core2/past-moves.ts, history-past-moves), not drawn here.
    const stayed = (key: string, age: number, fromAge = adultAge) => {
      const rates = options.departurePerYearByAge;
      const line = -Math.log(p("one") - rng.fork(`${key}:stayed`).next());
      if (moveHazard(rates, fromAge, age) < line) return true;
      return false;
    };
    const newHome = (key: string, local: boolean): Home => {
      const row = {
        id: createStableId(
          "household",
          `${options.worldId}:${household.stableKey}:kin:${key}`,
        ),
        // Nearby kin live in the county; where the town has no county record
        // they live elsewhere in the state, never in the town itself, so the
        // town holds only its own drawn households (its Census population).
        placeId: local
          ? (countyId ?? options.stateId ?? options.townId)
          : (options.stateId ?? countyId ?? options.townId),
        memberIds: [] as PersonId[],
      };
      out.households.push(row);
      return { row, ...(local && countyId ? { countyId } : {}) };
    };
    const homeOf = (person: KinPerson): Home => ({
      row: out.households.find((row) => row.id === person.householdId)!,
      ...(person.countyId ? { countyId: person.countyId } : {}),
    });
    const makePerson = (
      key: string,
      gender: string,
      birthDate: IsoDate,
      familyName: string | null,
      home: Home,
    ): KinPerson => {
      const stableKey = `${household.stableKey}:kin:${key}`;
      const named = options.name({ stableKey, gender, birthDate, familyName });
      const row: KinPerson = {
        id: createStableId("person", `${options.worldId}:${stableKey}`),
        stableKey,
        givenName: named.givenName,
        familyName: named.familyName,
        birthDate,
        gender,
        placeId: home.row.placeId,
        ...(home.countyId ? { countyId: home.countyId } : {}),
        householdId: home.row.id,
      };
      home.row.memberIds.push(row.id);
      out.people.push(row);
      return row;
    };
    const drawnGender = (r: SeededRng) => generatePersonIdentity(r).gender;

    // Each adult's family of origin: living parents and siblings.
    adults.forEach((adult, index) => {
      const r = rng.fork(`origin:${index}`);
      const birthYear = yearOfDate(adult.birthDate);
      const age = ageOf(adult);
      const firstAge = Math.max(
        minParentAge,
        firstBirthAge(birthYear) + normal(r) * p("kinFirstBirthAgeSdYears"),
      );
      const motherCohort = Math.round(birthYear - firstAge - interval);
      const sibship = drawCount(r, completedRow(motherCohort), p("one"), true);
      const order = r.integer(p("one"), sibship + p("one"));
      const motherAge = Math.min(
        maxMotherAge,
        firstAge + (order - p("one")) * interval,
      );
      // A partner who joined the household brought their own birth surname.
      let lineName: string | null =
        household.couple && index === p("one") ? null : adult.familyName;
      const parentsNear = stayed(`origin:${index}`, age);
      const parentsHome = newHome(`origin:${index}:parents`, parentsNear);
      // A marriage that ended leaves the father in a home of his own.
      const married = age + (order - p("one")) * interval;
      const apart = r.fork("marriage").next() >= marriageIntact(married);
      const parents: KinPerson[] = [];
      for (const [role, gender, parentAge] of [
        ["father", MALE, motherAge + p("kinPaternalAgeGapYears")],
        ["mother", FEMALE, motherAge],
      ] as const) {
        const pr = r.fork(role);
        const draw = pr.next();
        if (
          !survivesAt(
            draw,
            gender,
            birthYear - Math.round(parentAge),
            parentAge,
            parentAge + age,
          )
        ) {
          const through = diedInWindow(
            draw,
            gender,
            birthYear - Math.round(parentAge),
            parentAge,
            parentAge + age,
            archiveDays / p("daysPerMeanYear"),
          );
          if (through !== null) {
            const stableKey = `${household.stableKey}:kin:origin:${index}:${role}`;
            const birthDate = dateInYear(
              pr.fork("died"),
              birthYear - Math.round(parentAge),
            );
            const named = options.name({
              stableKey,
              gender,
              birthDate,
              familyName: lineName,
            });
            out.deaths.push({
              personId: createStableId(
                "person",
                `${options.worldId}:${stableKey}`,
              ),
              survivorId: adult.id,
              relation: role,
              stableKey,
              givenName: named.givenName,
              familyName: named.familyName,
              birthDate,
              gender,
              date: addDays(
                addDays(startedAt, -archiveDays),
                Math.round(through * archiveDays),
              ),
            });
          }
          continue;
        }
        const sinceGrown = parentAge + Math.max(age - adultAge, p("zero"));
        const parent = makePerson(
          `origin:${index}:${role}`,
          gender,
          dateInYear(pr, birthYear - Math.round(parentAge)),
          lineName,
          apart && role === "father"
            ? newHome(
                `origin:${index}:${role}`,
                parentsNear &&
                  stayed(
                    `origin:${index}:${role}`,
                    parentAge + age,
                    sinceGrown,
                  ),
              )
            : parentsHome,
        );
        lineName = parent.familyName;
        parents.push(parent);
        parentOf(parent, adult, R.parent);
        for (const child of children)
          relate(parent, child, R.grandparent, R.grandchild);
      }
      addParents(adult.id, parents);
      for (let j = p("one"); j <= sibship; j += p("one")) {
        if (j === order) continue;
        const sr = r.fork(`sibling:${j}`);
        const birthDate = dateInYear(sr, birthYear + (j - order) * interval);
        if (birthDate > startedAt) continue;
        const gender = drawnGender(sr.fork("identity"));
        if (
          !survives(
            sr,
            gender,
            yearOfDate(birthDate),
            p("zero"),
            ageAt(birthDate),
          )
        )
          continue;
        // A minor sibling lives with their parents; an adult stays near them unless they moved away.
        const siblingAge = ageAt(birthDate);
        const sibling = makePerson(
          `origin:${index}:sibling:${j}`,
          gender,
          birthDate,
          lineName,
          siblingAge < adultAge &&
            parents.some((row) => row.householdId === parentsHome.row.id)
            ? parentsHome
            : newHome(
                `origin:${index}:sibling:${j}`,
                stayed(`origin:${index}:sibling:${j}`, siblingAge)
                  ? parentsNear
                  : false,
              ),
        );
        relate(sibling, adult, R.sibling, R.sibling);
        for (const child of children)
          relate(sibling, child, R.auntUncle, R.nieceNephew);
        addParents(sibling.id, parents);
        for (const parent of parents) parentOf(parent, sibling, R.parent);
      }
    });

    // Children born to each parent unit who live elsewhere, and their children.
    const units = household.couple
      ? [{ key: "couple", parents: adults, here: children }]
      : adults.map((adult, index) => ({
          key: `adult:${index}`,
          parents: [adult],
          here: index === p("zero") ? children : [],
        }));
    for (const unit of units) {
      if (!unit.parents.length) continue;
      const dr = rng.fork(`descendants:${unit.key}`);
      const reference =
        unit.parents.find((row) => row.gender === FEMALE) ??
        unit.parents[p("zero")]!;
      const refYear = yearOfDate(reference.birthDate);
      const shift =
        reference.gender === FEMALE
          ? p("zero")
          : p("kinMaleFertilityAgeShiftYears");
      const total = drawCount(
        dr,
        fertilityRowForAge(ageOf(reference) - shift, refYear + shift),
        unit.here.length,
        false,
      );
      const familyName = unit.parents[p("zero")]!.familyName;
      let otherParent: KinPerson | undefined;
      let otherParentDrawn = false;
      const other = () => {
        if (household.couple || otherParentDrawn) return otherParent;
        otherParentDrawn = true;
        const or = dr.fork("other-parent");
        const gender = reference.gender === MALE ? FEMALE : MALE;
        const gap = p("kinPaternalAgeGapYears");
        const birthDate = dateInYear(
          or,
          refYear + Math.round(gender === MALE ? -gap : gap),
        );
        if (
          !survives(
            or,
            gender,
            yearOfDate(birthDate),
            p("zero"),
            ageAt(birthDate),
          )
        )
          return undefined;
        otherParent = makePerson(
          `${unit.key}:other-parent`,
          gender,
          birthDate,
          null,
          newHome(
            `${unit.key}:other-parent`,
            stayed(`${unit.key}:other-parent`, ageAt(birthDate)),
          ),
        );
        return otherParent;
      };
      for (const child of unit.here) {
        const second = other();
        addParents(child.id, second ? [...unit.parents, second] : unit.parents);
        if (second) parentOf(second, child, R.otherParent);
      }
      const oldest = unit.here.length
        ? Math.min(...unit.here.map((row) => yearOfDate(row.birthDate)))
        : undefined;
      const firstYear =
        oldest ?? refYear + Math.round(firstBirthAge(refYear) + shift);
      for (let i = p("one"); i <= total - unit.here.length; i += p("one")) {
        const cr = dr.fork(`child:${i}`);
        const year =
          oldest === undefined
            ? firstYear + (i - p("one")) * interval
            : firstYear - i * interval;
        const parentAge = year - refYear - shift;
        if (parentAge < minParentAge || parentAge > maxMotherAge) continue;
        const birthDate = dateInYear(cr, year);
        if (birthDate > startedAt) continue;
        const childAge = ageAt(birthDate);
        // A couple's minor children live with them. When parents part, the
        // mother keeps the minor children (the data's custody note), so only a
        // single father's minor children can live elsewhere, with their mother.
        if (
          childAge < adultAge &&
          (household.couple || reference.gender === FEMALE || !other())
        )
          continue;
        const gender = drawnGender(cr.fork("identity"));
        if (!survives(cr, gender, year, p("zero"), childAge)) continue;
        const child = makePerson(
          `${unit.key}:child:${i}`,
          gender,
          birthDate,
          familyName,
          childAge < adultAge
            ? homeOf(otherParent!)
            : newHome(
                `${unit.key}:child:${i}`,
                stayed(`${unit.key}:child:${i}`, childAge),
              ),
        );
        for (const parent of unit.parents) parentOf(parent, child, R.parent);
        if (otherParent) parentOf(otherParent, child, R.otherParent);
        addParents(
          child.id,
          otherParent ? [...unit.parents, otherParent] : unit.parents,
        );
        for (const sibling of unit.here)
          relate(child, sibling, R.sibling, R.sibling);
        if (childAge < adultAge) continue;
        const gshift =
          gender === FEMALE ? p("zero") : p("kinMaleFertilityAgeShiftYears");
        const grandchildren = drawCount(
          cr,
          fertilityRowForAge(childAge - gshift, year + gshift),
          p("zero"),
          false,
        );
        const gfirst = year + Math.round(firstBirthAge(year) + gshift);
        // A daughter's children share their father's surname, drawn once.
        const gfamily =
          gender === MALE || grandchildren === p("zero")
            ? child.familyName
            : options.name({
                stableKey: `${child.stableKey}:children-father`,
                gender: MALE,
                birthDate: child.birthDate,
                familyName: null,
              }).familyName;
        for (let g = p("one"); g <= grandchildren; g += p("one")) {
          const gr = cr.fork(`grandchild:${g}`);
          const gyear = gfirst + (g - p("one")) * interval;
          const gdate = dateInYear(gr, gyear);
          if (gdate > startedAt || gyear - year - gshift > maxMotherAge)
            continue;
          const ggender = drawnGender(gr.fork("identity"));
          if (!survives(gr, ggender, gyear, p("zero"), ageAt(gdate))) continue;
          const grandchild = makePerson(
            `${unit.key}:child:${i}:grandchild:${g}`,
            ggender,
            gdate,
            gfamily,
            homeOf(child),
          );
          parentOf(child, grandchild, R.parent);
          addParents(grandchild.id, [child]);
          for (const parent of unit.parents)
            relate(parent, grandchild, R.grandparent, R.grandchild);
        }
      }
    }
  }
  out.households = out.households.filter(
    (row) => row.memberIds.length > p("zero"),
  );
  return out;
}
