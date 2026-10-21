/**
 * Victimization records. Once a month, for each place the outcome web covers,
 * the crimes the web keeps (burglary, other property crime, robbery, assault)
 * happen to households, as records. How many comes from the national NCVS
 * rate of each kind times the web's factor for the place, summed over every
 * household by weight (a counted household stands for as many real ones as
 * its weight says, the same rule as a full one), with the fractional
 * remainder carried to the next month. Which household is victimized is not
 * rolled: each household is owed its own share of the expected count, from
 * its exposure (income, tenure and household kind for property crime; age and
 * income of each member for violent crime, from the NCVS tables in
 * data/crime/victimization.json), and the households most owed are
 * victimized first, so equal exposure takes turns.
 *
 * A full household's victimization is a log record (`crime.victimized`) that
 * its members hold. A counted group's are a tally row per place, month and
 * group. A place-month row holds the counts, how many were reported to
 * police, and the index the web and the voters read.
 *
 * No offender, police or court is modeled here: see the stopgaps
 * SG-CORE-crime-offenders and SG-CORE-crime-arrests.
 */
import data from "../data/crime/victimization.json" with { type: "json" };
import { registerModule } from "../state";
import { residentsRuntime, incomeBandOf } from "./residents";
import { webReach, type WebPart } from "../outcome-web-reach";
import { OUTCOME_WEB_MODULE_ID } from "./outcome-web";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";

export const CRIME_MODULE_ID = "core2-crime-v1";
export const CRIME_EVENT = "crime.victimized";
const SCHEDULE_DAY = "04";

type CrimeType = keyof typeof data.types;
export const CRIME_TYPES = Object.keys(data.types) as CrimeType[];
const TYPES = data.types as Record<
  CrimeType,
  {
    unit: "household" | "person";
    ratePer1000: number;
    reportedShare: number;
    webMeasures: string[];
    source: { tag: "SOURCED" | "ESTIMATED"; citation: string; asOf: string };
  }
>;
const PER_THOUSAND = 1000;
/** The crimes that are violent (a person's), as opposed to a household's. */
const VIOLENT: readonly CrimeType[] = ["robbery", "assault"];
const PROPERTY: readonly CrimeType[] = ["burglary", "other-property"];

export interface TypeMonth {
  /** The expected count before rounding: rate x web factor x exposure, summed by weight. */
  expected: number;
  /** Victimizations that happened (full households and counted groups). */
  count: number;
  fullCount: number;
  countedCount: number;
  /** Of those, how many were reported to police (the NCVS share, carried). */
  reported: number;
  /** The web's factor on the national rate for this place and kind. */
  factor: number;
  /** The web links behind the factor. */
  links: string[];
}

export interface CrimeMonth {
  id: string;
  placeId: string;
  month: string;
  date: string;
  /** The web month the factors stand on. */
  webRecordId: string | null;
  households: number;
  persons: number;
  persons12: number;
  types: Record<CrimeType, TypeMonth>;
  /** 100 is where the place's first month stood: violent crime per person 12 and older. */
  violentIndex: number;
  propertyIndex: number;
  /** Victimizations per household this month, and expected, for the voters' reading. */
  perHousehold: number;
  expectedPerHousehold: number;
  /** Reported to police a year, per resident (the measure the web's migration link waits on). */
  reportedPerResident: number;
  victims: { type: CrimeType; householdId: string; eventId: string }[];
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(CRIME_MODULE_ID).table(name);
const core = (api: CoreAPI) => api.state as CoreState;

const ageOn = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) -
  Number(birthDate.slice(0, 4)) -
  (date.slice(5) < birthDate.slice(5) ? 1 : 0);

const HOUSEHOLD = data.householdExposure;
const PERSON = data.personExposure;
const ageRelative = (age: number): number =>
  (PERSON.ageRatePer1000.find((band) => age >= band.min && age < band.max)
    ?.rate ?? PERSON.meanRatePer1000) / PERSON.meanRatePer1000;

/** Relative burglary exposure of a household: income, tenure and kind against the national mean. */
export function householdExposure(
  incomeFifth: number,
  tenure: "own" | "rent" | undefined,
  kind: "one-adult" | "adults" | "with-children",
): number {
  return (
    (HOUSEHOLD.incomeFifth[incomeFifth] ?? 1) *
    (tenure ? HOUSEHOLD.tenure[tenure] : 1) *
    HOUSEHOLD.kind[kind]
  );
}

/** A household's violent exposure from one member's age: their age against the mean, times the income fifth. */
export function personExposure(age: number, incomeFifth: number): number {
  return ageRelative(age) * (PERSON.incomeFifth[incomeFifth] ?? 1);
}

/** What one household (or one counted group) brings to a place's month. */
interface Unit {
  /** A full household's id, or a counted group's id. */
  id: string;
  full: boolean;
  /** Households it stands for (weighted). */
  households: number;
  persons: number;
  persons12: number;
  /** Relative exposure per household, and summed over its persons 12 and older. */
  propertyExposure: number;
  violentExposure: number;
  /** A full household's members, for the log record. */
  memberIds?: readonly string[];
  /** The member with the most violent exposure, who the violent record names. */
  victimId?: string;
}

/** Each full household's yearly income, from members' jobs and recorded income awards. */
function fullIncomes(c: CoreState): Map<string, number> {
  const income = new Map<string, number>();
  const daysPerYear = 365;
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const home = c.people.get(job.personId)?.householdId;
    if (home)
      income.set(
        home,
        (income.get(home) ?? 0) + job.wageDailyMinor * daysPerYear,
      );
  }
  for (const contract of c.finance.contracts.values()) {
    const award = contract.recipientIncome;
    if (!award || contract.endedAt) continue;
    income.set(
      award.householdId,
      (income.get(award.householdId) ?? 0) +
        (contract.amountMinor * 12) / contract.periodMonths,
    );
  }
  return income;
}

function fullUnits(
  api: CoreAPI,
  wanted: ReadonlySet<string>,
): Map<string, Unit[]> {
  const c = core(api);
  const incomes = fullIncomes(c);
  const dwellings = api.moduleState("housing");
  const hasHousing = c.modules.has("housing");
  const out = new Map<string, Unit[]>();
  for (const home of c.households.values()) {
    if (!wanted.has(home.placeId)) continue;
    const people: PersonState[] = [];
    for (const id of home.memberIds) {
      const person = c.people.get(id);
      if (person?.alive) people.push(person);
    }
    if (!people.length) continue;
    const fifth = incomeBandOf(incomes.get(home.id) ?? 0);
    const ages = people.map((p) => ageOn(p.birthDate, c.date));
    const children = ages.filter((a) => a < 18).length;
    const kind =
      children > 0
        ? "with-children"
        : ages.length - children <= 1
          ? "one-adult"
          : "adults";
    const dwelling = hasHousing
      ? (dwellings.table("dwellings").get(`dwelling:${home.id}`) as
          { tenure?: string } | undefined)
      : undefined;
    const tenure =
      dwelling?.tenure === "rent"
        ? "rent"
        : dwelling?.tenure === "own"
          ? "own"
          : undefined;
    let violent = 0,
      persons12 = 0,
      victimId: string | undefined,
      top = -1;
    people.forEach((person, i) => {
      if (ages[i]! < 12) return;
      persons12 += 1;
      const exposure = personExposure(ages[i]!, fifth);
      violent += exposure;
      if (exposure > top || (exposure === top && person.id < victimId!)) {
        top = exposure;
        victimId = person.id;
      }
    });
    const list = out.get(home.placeId) ?? [];
    list.push({
      id: home.id,
      full: true,
      households: 1,
      persons: people.length,
      persons12,
      propertyExposure: householdExposure(fifth, tenure, kind),
      violentExposure: violent,
      memberIds: people.map((p) => p.id),
      victimId,
    });
    out.set(home.placeId, list);
  }
  return out;
}

/** Counted groups of a place, each as one unit weighted by its households (one pass over the households). */
function countedUnits(api: CoreAPI, placeId: string): Unit[] {
  const store = residentsRuntime(core(api))?.store;
  if (!store) return [];
  const date = api.state.date;
  const units: Unit[] = [];
  for (const group of store.groups) {
    if (group.placeId !== placeId || !group.households.size) continue;
    let households = 0,
      persons = 0,
      persons12 = 0,
      violent = 0;
    for (const index of group.households) {
      const household = store.households[index]!;
      if (household.gone) continue;
      const weight = store.weightOf(household);
      households += weight;
      for (const member of store.countedMembers(household)) {
        const age = ageOn(store.born[member]!, date);
        persons += weight;
        if (age < 12) continue;
        persons12 += weight;
        violent += weight * personExposure(age, group.incomeBand);
      }
    }
    if (!households) continue;
    units.push({
      id: group.id,
      full: false,
      households,
      persons,
      persons12,
      propertyExposure:
        households *
        householdExposure(
          group.incomeBand,
          group.tenure === "rent" ? "rent" : "own",
          group.kind,
        ),
      violentExposure: violent,
    });
  }
  return units;
}

const expectedFor = (
  type: CrimeType,
  unit: Unit,
  factor: number,
  monthsPerYear: number,
): number => {
  const rate = TYPES[type].ratePer1000 / PER_THOUSAND / monthsPerYear;
  return (
    rate *
    factor *
    (TYPES[type].unit === "household"
      ? unit.propertyExposure
      : unit.violentExposure)
  );
};

/** A value kept in a table and carried to the next month. */
function carried(api: CoreAPI, id: string): number {
  return (
    (table(api, "carry").get(id) as unknown as { value: number } | undefined)
      ?.value ?? 0
  );
}
const keep = (api: CoreAPI, id: string, value: number) =>
  table(api, "carry").put({ id, value } as unknown as ModuleRow);

function typeFactor(
  api: CoreAPI,
  placeId: string,
  type: CrimeType,
): { factor: number; links: string[]; recordId: string | null } {
  let factor = 1,
    recordId: string | null = null;
  const links = new Set<string>();
  for (const measure of TYPES[type].webMeasures) {
    const reach = webReach(api, placeId, measure);
    factor *= reach.factor;
    recordId = reach.recordId ?? recordId;
    reach.parts.forEach((part: WebPart) => links.add(part.link));
  }
  return { factor, links: [...links].sort(), recordId };
}

function runPlace(
  api: CoreAPI,
  placeId: string,
  month: string,
  fullHere: readonly Unit[],
): void {
  const monthsPerYear = api.parameter("macroMonthsPerYear");
  const counted = countedUnits(api, placeId);
  const everyone = [...fullHere, ...counted];
  const households = everyone.reduce((n, u) => n + u.households, 0);
  const persons12 = everyone.reduce((n, u) => n + u.persons12, 0);
  const persons = everyone.reduce((n, u) => n + u.persons, 0);
  if (!households) return;
  const types = {} as Record<CrimeType, TypeMonth>;
  const victims: CrimeMonth["victims"] = [];
  let webRecordId: string | null = null;
  const source = {
    tag: "ESTIMATED" as const,
    asOf: api.state.date,
    citation: `Victimization records: the national NCVS rate of each kind (data/crime/victimization.json) times the outcome web's factor for the place, shared out by each household's exposure.`,
    estimatedFrom: `BJS Criminal Victimization 2024 rates; exposure by income, tenure, household kind and age from BJS tables.`,
  };
  for (const type of CRIME_TYPES) {
    const { factor, links, recordId } = typeFactor(api, placeId, type);
    webRecordId = recordId ?? webRecordId;
    let expectedFull = 0,
      expectedCounted = 0;
    // Every household and counted group is owed its own expected count; the
    // place's expected count with its remainder is how many happen, and the
    // units owed the most are the ones victimized, one at a time.
    const owed = new Map<string, number>();
    for (const unit of everyone) {
      const e = expectedFor(type, unit, factor, monthsPerYear);
      if (unit.full) expectedFull += e;
      else expectedCounted += e;
      const key = `${type}:${unit.id}`;
      const before =
        (
          table(api, "pressure").get(key) as unknown as
            { value: number } | undefined
        )?.value ?? 0;
      owed.set(unit.id, before + e);
    }
    const carryKey = `${placeId}:${type}`;
    const total = carried(api, carryKey) + expectedFull + expectedCounted;
    const happen = Math.floor(total);
    keep(api, carryKey, total - happen);
    const hits = new Map<string, number>();
    for (let k = 0; k < happen; k += 1) {
      let best: string | undefined;
      for (const [id, pressure] of owed)
        if (
          best === undefined ||
          pressure > owed.get(best)! ||
          (pressure === owed.get(best) && id < best)
        )
          best = id;
      if (best === undefined) break;
      owed.set(best, owed.get(best)! - 1);
      hits.set(best, (hits.get(best) ?? 0) + 1);
    }
    for (const [id, pressure] of owed)
      table(api, "pressure").put({
        id: `${type}:${id}`,
        value: pressure,
      } as unknown as ModuleRow);
    let fullCount = 0,
      countedCount = 0;
    for (const unit of everyone) {
      const n = hits.get(unit.id) ?? 0;
      if (!n) continue;
      if (!unit.full) {
        countedCount += n;
        const id = `${placeId}:${month}:${unit.id}`;
        const row = table(api, "tallies").get(id) as unknown as
          { counts: Record<string, number> } | undefined;
        table(api, "tallies").put({
          id,
          placeId,
          month,
          groupId: unit.id,
          counts: { ...row?.counts, [type]: n },
        } as unknown as ModuleRow);
        continue;
      }
      fullCount += n;
      const violent = TYPES[type].unit === "person";
      for (let j = 0; j < n; j += 1) {
        const eventId = `${CRIME_EVENT}:${type}:${unit.id}:${api.state.date}${j ? `:${j}` : ""}`;
        api.emit({
          id: eventId,
          kind: CRIME_EVENT,
          date: api.state.date,
          placeId,
          personIds:
            violent && unit.victimId ? [unit.victimId] : (unit.memberIds ?? []),
          source,
          facts: {
            type,
            householdId: unit.id,
            webRecordId: recordId ?? "",
            links: links.join(","),
          },
        });
        victims.push({ type, householdId: unit.id, eventId });
      }
    }
    const count = fullCount + countedCount;
    const reportKey = `${placeId}:${type}:reported`;
    const reportedTotal =
      carried(api, reportKey) + count * TYPES[type].reportedShare;
    const reported = Math.floor(reportedTotal);
    keep(api, reportKey, reportedTotal - reported);
    types[type] = {
      expected: expectedFull + expectedCounted,
      count,
      fullCount,
      countedCount,
      reported,
      factor,
      links,
    };
  }
  // The place's first month is where its index starts.
  const opening = table(api, "openings").get(placeId) as unknown as
    { violent: number; property: number; perHousehold: number } | undefined;
  const sum = (kinds: readonly CrimeType[]) =>
    kinds.reduce((n, type) => n + types[type].expected, 0);
  const violentRate = persons12 ? sum(VIOLENT) / persons12 : 0;
  const propertyRate = sum(PROPERTY) / households;
  const expectedAll = sum(CRIME_TYPES);
  const start = opening ?? {
    violent: violentRate,
    property: propertyRate,
    perHousehold: expectedAll / households,
  };
  if (!opening)
    table(api, "openings").put({
      id: placeId,
      ...start,
    } as unknown as ModuleRow);
  const countAll = CRIME_TYPES.reduce((n, type) => n + types[type].count, 0);
  const reportedAll = CRIME_TYPES.reduce(
    (n, type) => n + types[type].reported,
    0,
  );
  const row: CrimeMonth = {
    id: `${placeId}:${month}`,
    placeId,
    month,
    date: api.state.date,
    webRecordId,
    households,
    persons,
    persons12,
    types,
    violentIndex: start.violent ? (100 * violentRate) / start.violent : 100,
    propertyIndex: start.property ? (100 * propertyRate) / start.property : 100,
    perHousehold: countAll / households,
    expectedPerHousehold: expectedAll / households,
    reportedPerResident: persons ? (reportedAll * monthsPerYear) / persons : 0,
    victims,
  };
  table(api, "months").put(row as unknown as ModuleRow);
}

function run(api: CoreAPI): void {
  const c = core(api);
  if (!c.modules.has(OUTCOME_WEB_MODULE_ID)) return;
  const month = api.state.date.slice(0, "YYYY-MM".length);
  // stopgapId: SG-CORE-crime-exposure-marginals
  api.stopgap("SG-CORE-crime-exposure-marginals");
  // stopgapId: SG-CORE-crime-offenders
  api.stopgap("SG-CORE-crime-offenders");
  // stopgapId: SG-CORE-crime-arrests
  api.stopgap("SG-CORE-crime-arrests");
  // stopgapId: SG-CORE-crime-vandalism
  api.stopgap("SG-CORE-crime-vandalism");
  // stopgapId: SG-CORE-crime-firearm-homicide
  api.stopgap("SG-CORE-crime-firearm-homicide");
  // The places the web has a month for; the rest have no factor to read.
  const places = new Set<string>();
  const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  for (const row of web.rows() as unknown as { placeId: string }[])
    places.add(row.placeId);
  const todo = [...places]
    .filter((placeId) => !table(api, "months").get(`${placeId}:${month}`))
    .sort();
  if (!todo.length) return;
  // One pass over the households for every place due.
  const full = fullUnits(api, new Set(todo));
  for (const placeId of todo)
    runPlace(api, placeId, month, full.get(placeId) ?? []);
}

export const CRIME_MODULE: CoreModule = {
  id: CRIME_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      months: { indexes: { byPlace: { fields: ["placeId"] } } },
      tallies: { indexes: { byPlace: { fields: ["placeId"] } } },
      pressure: {},
      carry: {},
      openings: {},
    },
  },
  onDay(api) {
    // The web writes its month on the 3rd; victimizations stand on that row.
    if (api.state.date.slice(-2) === SCHEDULE_DAY) run(api);
    return undefined;
  },
};

export function openCrime(state: CoreState): void {
  if (state.modules.has(CRIME_MODULE_ID)) return;
  registerModule(state, CRIME_MODULE);
}

/** A place's records, oldest first. */
export function crimeMonths(api: CoreAPI, placeId: string): CrimeMonth[] {
  if (!core(api).modules.has(CRIME_MODULE_ID)) return [];
  return [
    ...(table(api, "months").query("byPlace", [
      placeId,
    ]) as unknown as CrimeMonth[]),
  ].sort((a, b) => a.month.localeCompare(b.month));
}

/** The latest month's record at or before today. */
export function latestCrimeMonth(
  api: CoreAPI,
  placeId: string,
): CrimeMonth | undefined {
  return crimeMonths(api, placeId)
    .filter((row) => row.date <= api.state.date)
    .pop();
}

/** The months a voter's sense of crime averages over. */
const NOTICE_MONTHS = 3;

/**
 * How much more crime a town's households have met than it began with: the
 * victimizations per household in the last few months against the first
 * month's expected rate, as a share above that start (0 where no record).
 */
export function crimeChange(api: CoreAPI, placeId: string): number {
  const rows = crimeMonths(api, placeId).filter(
    (r) => r.date <= api.state.date,
  );
  if (!rows.length) return 0;
  const recent = rows.slice(-NOTICE_MONTHS);
  const start = rows[0]!.expectedPerHousehold;
  if (!start) return 0;
  const met = recent.reduce((n, r) => n + r.perHousehold, 0);
  return met / (start * recent.length) - 1;
}
