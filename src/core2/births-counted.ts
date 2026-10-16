/**
 * The counted population drifts (PW-8). Once a month each place's counted
 * residents (the records the counts are read from) gain births and arrivals
 * and lose deaths and departures. How many comes from real rates applied to
 * the counted totals: the state's NCHS births by mother's age, the SSA
 * cohort life tables, the ACS rates of leaving the county and of arriving.
 * Fractions carry to the next month, so a year's flows match the rates.
 * Which record changes follows that record's own circumstances (age, work,
 * children, means), never a roll; who a newcomer or newborn is comes from the
 * world's seed, as all generation does. One row per place per month records
 * what moved; nothing is kept per counted person per day.
 */
import { makeIsoDate } from "./kernel/dates";
import { createStableId } from "./kernel/ids";
import { SeededRng } from "./kernel/rng";
import { drawCanonicalNamedIdentity } from "./person-names";
import { generatePersonIdentity } from "./gov-rules/person-identity";
import {
  corePlaceByJurisdictionId,
  corePlaceByKey,
  coreStateName,
} from "./place-lookup";
import { parameter } from "./parameters";
import { bedroomsForHousehold, hudRentRowFor } from "./hud-rents";
import type { EntityId } from "./kernel/brands";
import natality2023 from "../../data/research/renewal/natality-2023.json" with { type: "json" };
import natality2024 from "../../data/research/renewal/natality-2024.json" with { type: "json" };
import areaNames from "../../data/research/renewal/area-names.json" with { type: "json" };
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import lifeTables from "./data/ssa-cohort-life-tables.json" with { type: "json" };
import moveRows from "./data/moves/parameters.json" with { type: "json" };
import { renewalParameter } from "./births-parameters";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./modules/health";
import { openingTemperaments } from "./opening-personality";
import {
  addCountedPerson,
  admitCountedHousehold,
  countedHouseholdsByPlace,
  countedOutsideAccount,
  departCountedHousehold,
  removeCountedPerson,
} from "./modules/residents";
import type { ResidentHouseholdRecord } from "./residents";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, PersonInput, PlaceId, Source } from "./types";

export const COUNTED_FLOWS_STOPGAP = "SG-PW8-counted-arrivals";
/** Unit conversions only: NCHS rates are per 1,000 women; HUD figures are dollars. */
const PER_THOUSAND = 1000,
  CENTS_PER_DOLLAR = 100,
  MS_PER_DAY = 86_400_000;
/** The youngest age at which anybody becomes a parent. */
const YOUNGEST_PARENT_AGE = parameter("minimumParentAgeAtBirth");

type AgeRates = Readonly<Record<string, number | null>>;
interface NatalityArea {
  ageRates: AgeRates;
}
interface MoverPlace {
  departurePerYearByAge: Readonly<Record<string, number>>;
  arrivalsPerResidentPerYear: number;
}

const source = (date: string): Source => ({
  tag: "SOURCED",
  asOf: date,
  citation:
    "Counted population flows: NCHS final natality 2024 (2023 where a 2024 cell is suppressed) by mother's age and state; SSA Actuarial Study No. 120 cohort life tables; ACS 2024 one-year county departure rates by age and arrival rates by state. Rates applied to counted totals; records chosen by their circumstances.",
});

/** The monthly death record reaches the full people who already know its subject. */
export function notifyCountedDeaths(
  api: CoreAPI,
  row: { id: string; placeId: PlaceId; deaths: readonly string[] },
): void {
  for (const deceasedId of row.deaths) {
    // Unmet residents remain counted identities; a notification never fills
    // somebody in or gives them an invented past or medical cause.
    const deceased = api.state.husks.get(deceasedId);
    if (!deceased) continue;
    // stopgapId: SG-CORE-counted-death-relations
    // Opening full-to-counted family ties may have no closeness record.
    // Notify them, but leave grief to the existing relationship reader.
    api.stopgap("SG-CORE-counted-death-relations");
    const witnesses = new Set(deceased.familyIds ?? []);
    for (const key of api.state.relationshipsByPerson.get(deceasedId) ?? []) {
      const tie = api.state.relationships.get(key);
      if (tie)
        witnesses.add(tie.actorId === deceasedId ? tie.otherId : tie.actorId);
    }
    const witnessIds = [...witnesses]
      .filter((id) => id !== deceasedId && api.state.people.get(id)?.alive)
      .sort();
    if (!witnessIds.length) continue;
    const kind = DEFAULT_HEALTH_DATA.deathEventKind;
    const id = `${kind}:${deceasedId}:${api.state.date}`;
    api.emit({
      id,
      kind,
      date: api.state.date,
      placeId: row.placeId,
      personIds: [deceasedId],
      witnessIds,
      publicRecord: true,
      news: true,
      ...severityImpulse(api, DEFAULT_HEALTH_DATA.deathSeverity),
      source: source(api.state.date),
      facts: { [`event:${id}:countsId`]: row.id },
    });
  }
}

/** The place's state, as the research files name it (else the world's own state). */
function stateOf(
  api: CoreAPI,
  placeId: PlaceId,
): { key: string; name: string } {
  const worldKey = api.state.placeMetadata?.placeKey;
  const key =
    corePlaceByJurisdictionId(placeId as EntityId)?.stateJurisdictionKey ??
    (worldKey ? corePlaceByKey(worldKey)?.stateJurisdictionKey : undefined);
  if (!key) throw new Error(`No state recorded for ${placeId}`);
  const aliases = areaNames.aliases as Record<string, string>;
  return { key, name: aliases[key] ?? coreStateName(key.slice(3))! };
}

/** Births per woman a year by age band: the state's 2024 rate, else 2023, else national. */
function birthRates(stateName: string): Map<[number, number], number> {
  const areas = [natality2024, natality2023].map(
    (data) => (data.areas as Record<string, NatalityArea>)[stateName],
  );
  const national = (natality2024.areas as Record<string, NatalityArea>)[
    "United States"
  ]!.ageRates;
  const rates = new Map<[number, number], number>();
  for (const band of Object.keys(national)) {
    const [low, high] = band.split("-").map(Number) as [number, number];
    if (low < YOUNGEST_PARENT_AGE) continue;
    const per1000 =
      areas.map((area) => area?.ageRates[band]).find((rate) => rate != null) ??
      national[band] ??
      0;
    rates.set([low, high], per1000 / PER_THOUSAND);
  }
  return rates;
}

/** SSA cohort qx: the chance of dying within the year at this age, by sex and birth year. */
function cohortDeathChance(
  gender: string | undefined,
  birthYear: number,
  age: number,
) {
  const table = (
    gender === "male" ? lifeTables.male : lifeTables.female
  ) as Record<string, readonly number[]>;
  const cohorts = lifeTables.cohorts;
  const year = Math.min(cohorts.at(-1)!, Math.max(cohorts[0]!, birthYear));
  const below = [...cohorts].reverse().find((cohort) => cohort <= year)!;
  const above = cohorts.find((cohort) => cohort >= year)!;
  const share = above === below ? 0 : (year - below) / (above - below);
  const at = (rows: readonly number[]) => rows[Math.min(age, rows.length - 1)]!;
  const low = at(table[String(below)]!),
    high = at(table[String(above)]!);
  return Math.min(1, low + (high - low) * share);
}

const deathChances = new Map<string, number>();
/** Cached by sex, birth year and age: the table is fixed. */
function deathChance(
  gender: string | undefined,
  birthYear: number,
  age: number,
) {
  const key = `${gender === "male" ? "m" : "f"}${birthYear}:${age}`;
  let chance = deathChances.get(key);
  if (chance === undefined) {
    chance = cohortDeathChance(gender, birthYear, age);
    deathChances.set(key, chance);
  }
  return chance;
}

/** The ACS departure bands, parsed once: [youngest, oldest, band]. */
const DEPARTURE_BANDS = moverRates.ageBands.map((band) => {
  const [low, high] = band.replace("+", "-").split("-");
  return [Number(low), high ? Number(high) : Infinity, band] as const;
});

function departureRate(rates: MoverPlace, age: number): number {
  for (const [low, high, band] of DEPARTURE_BANDS)
    if (age >= low && age <= high) return rates.departurePerYearByAge[band]!;
  return 0;
}

/** Plain code-unit order: stable across machines, unlike locale order. */
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const monthlyShare = (perYear: number, months: number) =>
  1 - Math.pow(1 - Math.min(perYear, 1), 1 / months);

interface Carry {
  births: number;
  deaths: number;
  departures: number;
  arrivals: number;
}

/** Whole years from birth to `date` (ISO strings; the same rule as ageOnDate). */
const ageOf = (person: PersonInput, date: string) =>
  Number(date.slice(0, 4)) -
  Number(person.birthDate.slice(0, 4)) -
  (date.slice(5) < person.birthDate.slice(5) ? 1 : 0);

/** A woman's partner in her counted household: a relative within one generation. */
function partnerOf(
  record: ResidentHouseholdRecord,
  woman: PersonInput,
  date: string,
): PersonInput | undefined {
  const age = ageOf(woman, date);
  return record.people.find(
    (row) =>
      row.id !== woman.id &&
      woman.familyIds.includes(row.id) &&
      ageOf(row, date) >= YOUNGEST_PARENT_AGE &&
      Math.abs(ageOf(row, date) - age) < YOUNGEST_PARENT_AGE,
  );
}

/**
 * How a counted household stands toward a child now, from its record: the
 * same reasons full couples weigh (age, children, partner, income against
 * the place's median, work, room), without a full person's memory.
 */
function birthStanding(
  api: CoreAPI,
  record: ResidentHouseholdRecord,
  woman: PersonInput,
  date: string,
  median: number,
  roomCost: number,
): number {
  const p = (key: string) => renewalParameter(api, key);
  const age = ageOf(woman, date);
  const distance = (age - p("renewalAgeCenter")) / p("renewalAgeSpread");
  const children = record.people.filter(
    (row) =>
      woman.familyIds.includes(row.id) &&
      age - ageOf(row, date) >= YOUNGEST_PARENT_AGE,
  ).length;
  const wages = record.jobs.reduce((n, job) => n + job.wageDailyMinor, 0);
  const ratio = (wages * p("daysPerMeanYear")) / median;
  const partner = partnerOf(record, woman, date);
  const employed = [woman, partner].filter(
    (row) => row && record.jobs.some((job) => job.personId === row.id),
  ).length;
  return (
    p("renewalAgeWeight") * (2 * Math.exp(-distance * distance) - 1) +
    p("renewalChildWeight") *
      (p("renewalNoChildPull") - p("renewalPerChildPull") * children) +
    (p("renewalIncomeWeight") * (ratio - 1)) / (ratio + 1) +
    p("renewalJobWeight") * (employed - 1) -
    (p("renewalRoomWeight") * roomCost) /
      (wages * p("daysPerMeanYear") + roomCost + 1) +
    (partner ? 1 : -p("renewalWaitPull"))
  );
}

function moveParameter(key: string): number {
  return (moveRows as Record<string, { value: number }>)[key]!.value;
}

/** Monthly flows for every place with counted residents. */
export function applyCountedFlows(
  api: CoreAPI,
  carryTable: string,
  rowsTable: string,
  birthsTable: string,
) {
  const core = api.state,
    date = core.date,
    month = date.slice(0, 7);
  const p = (key: string) => renewalParameter(api, key);
  const months = p("monthsPerYear");
  // The youngest age in the ACS departure bands.
  const adultAge = moveParameter("movesMinimumAge");
  const store = api.moduleState("core2-renewal-v1");
  for (const [placeId, households] of countedHouseholdsByPlace(core)) {
    const state = stateOf(api, placeId);
    const movers = (moverRates.places as Record<string, MoverPlace>)[state.key];
    if (!movers) throw new Error(`No ACS mover rates for ${state.key}`);
    const rates = birthRates(state.name);
    const carryRow = store.table(carryTable).get(placeId);
    // Stored rows are read-only; work on a copy.
    const carry: Carry = {
      births: Number(carryRow?.births ?? 0),
      deaths: Number(carryRow?.deaths ?? 0),
      departures: Number(carryRow?.departures ?? 0),
      arrivals: Number(carryRow?.arrivals ?? 0),
    };
    const people = households.flatMap((record) => record.people);
    const start = { people: people.length, households: households.length };
    const row = {
      id: `${placeId}:${month}`,
      placeId,
      month,
      date,
      startPeople: start.people,
      startHouseholds: start.households,
      births: [] as string[],
      deaths: [] as string[],
      /** What each death left to the household that outlived it, by heir. */
      estates: [] as {
        deceasedId: string;
        heirId: string;
        amountMinor: number;
      }[],
      departedHouseholds: [] as string[],
      departedPeople: 0,
      arrivedHouseholds: [] as string[],
      arrivedPeople: 0,
      expected: { births: 0, deaths: 0, departures: 0, arrivals: 0 },
      endPeople: 0,
      endHouseholds: 0,
    };

    // Deaths: each record's cohort chance, summed; the most at risk first.
    const risks = people
      .map((person) => ({
        person,
        risk: monthlyShare(
          deathChance(
            person.looks?.gender,
            Number(person.birthDate.slice(0, 4)),
            ageOf(person, date),
          ),
          months,
        ),
      }))
      .sort(
        (a, b) =>
          b.risk - a.risk ||
          compare(a.person.birthDate, b.person.birthDate) ||
          compare(a.person.id, b.person.id),
      );
    row.expected.deaths = risks.reduce((n, entry) => n + entry.risk, 0);
    carry.deaths += row.expected.deaths;
    for (const { person } of risks) {
      if (carry.deaths < 1) break;
      carry.deaths -= 1;
      for (const heir of removeCountedPerson(core, person.id))
        row.estates.push({ deceasedId: person.id, ...heir });
      row.deaths.push(person.id);
    }

    // Births: the state's rate for every counted woman of each age, summed;
    // the households whose circumstances stand best toward a child first.
    const hud = hudRentRowFor(placeId as EntityId);
    const median =
      hud?.veryLow4 != null
        ? hud.veryLow4 * CENTS_PER_DOLLAR * p("renewalMedianPerVeryLowLimit")
        : p("renewalMedianAnnualIncomeMinor");
    const current = countedHouseholdsByPlace(core).get(placeId) ?? [];
    const spacing = p("renewalCountedBirthSpacingDays");
    const today = Date.parse(date);
    const mothers: {
      record: ResidentHouseholdRecord;
      woman: PersonInput;
      standing: number;
    }[] = [];
    for (const record of current)
      for (const woman of record.people) {
        if (woman.looks?.gender !== "female") continue;
        const age = ageOf(woman, date);
        const rate = [...rates].find(
          ([[low, high]]) => age >= low && age <= high,
        )?.[1];
        if (!rate) continue;
        row.expected.births += monthlyShare(rate, months);
        const recent = record.people.some(
          (row) =>
            woman.familyIds.includes(row.id) &&
            (today - Date.parse(row.birthDate)) / MS_PER_DAY < spacing,
        );
        if (recent) continue;
        const size = record.people.length;
        const roomCost = hud
          ? Math.max(
              0,
              (hud.rents[bedroomsForHousehold(size + 1)]! -
                hud.rents[bedroomsForHousehold(size)]!) *
                CENTS_PER_DOLLAR *
                months,
            )
          : 0;
        mothers.push({
          record,
          woman,
          standing: birthStanding(api, record, woman, date, median, roomCost),
        });
      }
    mothers.sort(
      (a, b) => b.standing - a.standing || compare(a.woman.id, b.woman.id),
    );
    carry.births += row.expected.births;
    for (const { record, woman } of mothers) {
      if (carry.births < 1) break;
      carry.births -= 1;
      const partner = partnerOf(record, woman, date);
      const baby = countedNewborn(api, record, woman, partner, date);
      addCountedPerson(core, record.household.id, baby);
      row.births.push(baby.id);
      // The town's birth record: a counted baby has no plan or pregnancy of
      // its own, only the rate that counted it and the household it joined.
      store.table(birthsTable).put({
        id: `${baby.id}:birth`,
        childId: baby.id,
        counted: true,
        motherId: woman.id,
        otherParentId: partner?.id ?? null,
        date,
        placeId,
        householdId: record.household.id,
        countsId: row.id,
      });
    }

    // Departures: the ACS rate of leaving the county for each counted adult,
    // summed; whole households leave, those least held in place first.
    const job = moveParameter("movesJobHold"),
      kids = moveParameter("movesChildrenHold");
    // Where counted moves run (one model, two tiers), people move from
    // causes there; this keeps births and deaths only.
    const movesFromCauses = core.modules.has(COUNTED_MOVES_MODULE_ID);
    const leaving = (
      movesFromCauses ? [] : (countedHouseholdsByPlace(core).get(placeId) ?? [])
    )
      .map((record) => {
        const adults = record.people.filter(
          (row) => ageOf(row, date) >= adultAge,
        );
        const pull = adults.reduce(
          (n, row) => n + departureRate(movers, ageOf(row, date)),
          0,
        );
        const minors = record.people.length - adults.length;
        return {
          record,
          adults: adults.length,
          pull,
          push:
            pull /
            Math.max(adults.length, 1) /
            (1 + job * record.jobs.length + kids * minors),
        };
      })
      .filter((entry) => entry.adults > 0);
    row.expected.departures = leaving.reduce(
      (n, entry) =>
        n + monthlyShare(entry.pull / entry.adults, months) * entry.adults,
      0,
    );
    carry.departures += row.expected.departures;
    leaving.sort(
      (a, b) =>
        b.push - a.push ||
        compare(a.record.household.id, b.record.household.id),
    );
    for (const { record, adults } of leaving) {
      if (carry.departures < adults) break;
      carry.departures -= adults;
      const gone = departCountedHousehold(core, record.household.id);
      if (gone?.accountId && gone.cashShare > 0) {
        const accounts = api.accounts(),
          from = accounts.main(gone.accountId),
          amount = Math.floor(accounts.balance(from) * gone.cashShare),
          outside = countedOutsideAccount(core, placeId);
        if (amount > 0 && outside)
          accounts.transfer({
            id: `counted-departure:${record.household.id}:${date}`,
            from,
            to: accounts.main(outside),
            amountMinor: amount,
            reasonKey: "residents.counted-departure.cash",
            source: source(date),
          });
      }
      row.departedHouseholds.push(record.household.id);
      row.departedPeople += record.people.length;
    }

    // Arrivals: the ACS arrivals per resident, against today's count. Movers
    // look like movers: each newcomer household takes the shape of the
    // households most apt to move (this month's leavers first, then down the
    // same ranking); who they are is generated from the world's seed.
    const now = countedHouseholdsByPlace(core).get(placeId) ?? [];
    const count = now.reduce((n, record) => n + record.people.length, 0);
    row.expected.arrivals = movesFromCauses
      ? 0
      : monthlyShare(movers.arrivalsPerResidentPerYear, months) * count;
    carry.arrivals += row.expected.arrivals;
    const shapes = leaving.length ? leaving.map((entry) => entry.record) : now;
    for (let index = 0; shapes.length && carry.arrivals >= 1; index++) {
      const rng = new SeededRng(core.seed).fork(
        `counted-arrival:${placeId}:${month}:${index}`,
      );
      const template = shapes[index % shapes.length]!;
      if (carry.arrivals < template.people.length) break;
      carry.arrivals -= template.people.length;
      api.stopgap(COUNTED_FLOWS_STOPGAP);
      const record = arrivingHousehold(
        api,
        template,
        rng,
        `${placeId}:${month}:${index}`,
        date,
      );
      admitCountedHousehold(core, record);
      row.arrivedHouseholds.push(record.household.id);
      row.arrivedPeople += record.people.length;
    }

    const end = countedHouseholdsByPlace(core).get(placeId) ?? [];
    row.endHouseholds = end.length;
    row.endPeople = end.reduce((n, record) => n + record.people.length, 0);
    store.table(rowsTable).put(row as unknown as ModuleRow);
    store.table(carryTable).put({ id: placeId, ...carry });
    notifyCountedDeaths(api, row);
  }
}

/** A counted baby: who they are comes from the world's seed. */
function countedNewborn(
  api: CoreAPI,
  record: ResidentHouseholdRecord,
  mother: PersonInput,
  partner: PersonInput | undefined,
  date: string,
): PersonInput {
  const id = createStableId(
    "person",
    `${api.state.seed}:counted-birth:${mother.id}:${date}`,
  );
  const rng = new SeededRng(api.state.seed).fork(id);
  const identity = generatePersonIdentity(rng.fork("identity"));
  const name = drawCanonicalNamedIdentity(rng.fork("name"), identity);
  const parents = partner ? [mother.id, partner.id] : [mother.id];
  const subjects = [mother, ...(partner ? [partner] : [])].map((row) => ({
    id: row.id,
    birthDate: row.birthDate,
    gender: row.looks?.gender,
    parents: [],
  }));
  const traits = openingTemperaments(
    [...subjects, { id, birthDate: date, gender: identity.gender, parents }],
    { seed: api.state.seed, startedAt: date },
  ).get(id)!;
  return {
    id,
    givenName: name.givenName,
    familyName: mother.familyName,
    birthDate: makeIsoDate(date),
    placeId: mother.placeId,
    ...(mother.countyId ? { countyId: mother.countyId } : {}),
    householdId: record.household.id,
    tier: mother.tier,
    discretionaryEligibleV1: false,
    traits,
    liquidMinor: 0,
    livingCostDailyMinor: 0,
    source: source(date),
    familyIds: parents,
    knownIds: [],
    looks: { gender: identity.gender, pronouns: identity.pronouns },
  };
}

/**
 * SG-PW8-counted-arrivals: a household that moves in is generated in the
 * shape of one already recorded here (ages, sexes, who is family), with new
 * names and temperaments from the seed. It arrives with no job, contracts or
 * cash on record, and no past.
 */
function arrivingHousehold(
  api: CoreAPI,
  template: ResidentHouseholdRecord,
  rng: SeededRng,
  key: string,
  date: string,
): ResidentHouseholdRecord {
  const householdId = createStableId(
    "household",
    `${api.state.seed}:counted-arrival:${key}`,
  );
  const ids = new Map(
    template.people.map((row) => [
      row.id,
      createStableId(
        "person",
        `${api.state.seed}:counted-arrival:${key}:${row.id}`,
      ),
    ]),
  );
  const traits = openingTemperaments(
    template.people.map((row) => ({
      id: ids.get(row.id)!,
      birthDate: row.birthDate,
      gender: row.looks?.gender,
      parents: [],
    })),
    { seed: api.state.seed, startedAt: date },
  );
  let familyName: string | undefined;
  const people = template.people.map((row): PersonInput => {
    const id = ids.get(row.id)!;
    const drawn = generatePersonIdentity(rng.fork(`identity:${id}`));
    const identity = row.looks?.gender
      ? { ...drawn, gender: row.looks.gender as typeof drawn.gender }
      : drawn;
    const name = drawCanonicalNamedIdentity(rng.fork(`name:${id}`), identity);
    familyName ??= name.familyName;
    return {
      id,
      givenName: name.givenName,
      familyName,
      birthDate: row.birthDate,
      placeId: row.placeId,
      ...(row.countyId ? { countyId: row.countyId } : {}),
      householdId,
      tier: row.tier,
      traits: traits.get(id)!,
      liquidMinor: 0,
      livingCostDailyMinor: row.livingCostDailyMinor,
      source: source(date),
      familyIds: row.familyIds.flatMap((other) => {
        const mapped = ids.get(other);
        return mapped ? [mapped] : [];
      }),
      knownIds: [],
      looks: { ...(row.looks ?? {}), gender: identity.gender },
    };
  });
  return {
    household: {
      ...template.household,
      id: householdId,
      memberIds: people.map((row) => row.id),
      source: source(date),
    },
    people,
    jobs: [],
    workCommitments: [],
    contracts: [],
  };
}
