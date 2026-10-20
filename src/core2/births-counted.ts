/**
 * The counted population drifts (PW-8). Once a month each place's counted
 * residents (the records the counts are read from) gain births and lose
 * deaths. How many comes from real rates applied to the counted totals: the
 * state's NCHS births by mother's age and the SSA cohort life tables. Moving
 * in and out is the counted-moves engine's. Fractions carry to the next
 * month, so a year's flows match the rates. Which record changes follows that
 * record's own circumstances (age, work, children, means), never a roll; who
 * a newborn is comes from the world's seed, as all generation does. One row
 * per place per month records what happened; nothing is kept per counted
 * person per day.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import { SERIOUS_EPISODE_REMAINING_DAYS } from "./death-causes";
import {
  bookCountedIllness,
  countedCourseDays,
  endCountedIllness,
  illInPlace,
} from "./counted-illness";
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
import lifeTables from "./data/ssa-cohort-life-tables.json" with { type: "json" };
import stateMortality from "./data/state-mortality.json" with { type: "json" };
import { renewalParameter } from "./births-parameters";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./modules/health";
import { openingTemperaments } from "./opening-personality";
import {
  addCountedPerson,
  countedHouseholdsByPlace,
  householdIncome,
  incomeBandOf,
  removeCountedPerson,
  residentsRuntime,
} from "./modules/residents";
import { deathWebFactor } from "./health-web";
import type { ResidentHouseholdRecord } from "./residents";
import { webFactorFor } from "./outcome-web-reach";
import {
  OUTCOME_WEB_MODULE_ID,
  outcomeWebFactor,
  placeOutcome,
} from "./modules/outcome-web";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, PersonInput, PlaceId, Source } from "./types";

/** Unit conversions only: NCHS rates are per 1,000 women; HUD figures are dollars. */
const PER_THOUSAND = 1000,
  CENTS_PER_DOLLAR = 100,
  MS_PER_DAY = 86_400_000,
  /** The month the first run steps back by to find the illnesses already under way. */
  DAYS_PER_COUNT_MONTH = 30;
/** The youngest age at which anybody becomes a parent. */
const YOUNGEST_PARENT_AGE = parameter("minimumParentAgeAtBirth");

type AgeRates = Readonly<Record<string, number | null>>;
interface NatalityArea {
  ageRates: AgeRates;
}
const source = (date: string): Source => ({
  tag: "SOURCED",
  asOf: date,
  citation:
    "Counted population flows: NCHS final natality 2024 (2023 where a 2024 cell is suppressed) by mother's age and state; SSA Actuarial Study No. 120 cohort life tables. Rates applied to counted totals; records chosen by their circumstances.",
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
export function cohortDeathChance(
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

/** Plain code-unit order: stable across machines, unlike locale order. */
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const monthlyShare = (perYear: number, months: number) =>
  1 - Math.pow(1 - Math.min(perYear, 1), 1 / months);

interface Carry {
  births: number;
  /** Each cohort's expected deaths not yet realized, by `deathCohort` key. */
  deaths: Record<string, number>;
}

/** The row of the death carry for debts that belong to no one living. */
const DEATH_POOL = "pool";

/** The cohort a counted person dies with: sex and birth year, the life table's own columns. */
const deathCohort = (person: PersonInput) =>
  `${person.looks?.gender === "male" ? "m" : "f"}:${person.birthDate.slice(0, 4)}`;

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
  const store = api.moduleState("core2-renewal-v1");
  for (const [placeId, households] of countedHouseholdsByPlace(core)) {
    const state = stateOf(api, placeId);
    const rates = birthRates(state.name);
    // Counted women follow the same rate as full ones, times how far the
    // place's own conditions (unemployment, home prices) have moved it.
    const webOn = core.modules.has(OUTCOME_WEB_MODULE_ID);
    const webBirths = webOn
      ? placeOutcome(api, placeId, "births.rate")
      : undefined;
    const webBirthsFactor = webOn
      ? outcomeWebFactor(api, placeId, "births.rate")
      : 1;
    const carryRow = store.table(carryTable).get(placeId);
    // Stored rows are read-only; work on a copy.
    const carry: Carry = {
      births: Number(carryRow?.births ?? 0),
      deaths: { ...((carryRow?.deaths as Record<string, number>) ?? {}) },
    };
    const people = households.flatMap((record) => record.people);
    // A counted household stands for as many real ones as its weight says
    // (one model, two tiers): every expected count is in real people, and an
    // event in its record consumes that many.
    const weightOf = new Map<string, number>();
    /** Whether each counted household rents or owns, for the links that split on it. */
    const tenureOf = new Map<string, "rent" | "own">();
    const runtime = residentsRuntime(core);
    const counted = runtime?.store;
    // The household's income fifth, for the outcome web's factor on a death.
    const fifthOf = new Map<string, number>();
    for (const record of households) {
      const at = counted?.householdOf.get(record.household.id);
      const weight =
        at === undefined ? 1 : counted!.weightOf(counted!.households[at]!);
      const fifth =
        at === undefined
          ? undefined
          : incomeBandOf(householdIncome(runtime!, counted!.households[at]!));
      for (const person of record.people) {
        weightOf.set(person.id, weight);
        if (fifth !== undefined) fifthOf.set(person.id, fifth);
      }
      if (at !== undefined)
        tenureOf.set(
          record.household.id,
          counted!.households[at]!.tenure === "rent" ? "rent" : "own",
        );
    }
    // The web's factor on each member's chance of a serious illness, by age and fifth.
    const webDeath: { recordId: string | null } = { recordId: null };
    const webDeaths = (person: PersonInput, on: string) => {
      const found = deathWebFactor(
        api,
        placeId,
        ageOf(person, on),
        fifthOf.get(person.id),
      );
      webDeath.recordId ??= found.recordId;
      return found.factor;
    };
    const weightOfPerson = (person: PersonInput) =>
      weightOf.get(person.id) ?? 1;
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
      /** Counted people who fell seriously ill this month, and who is ill at its end. */
      fellIll: [] as string[],
      /** At a place's first month: those already ill, their illness begun before the opening. */
      openingIll: [] as string[],
      ill: 0,
      /** What each death left to the household that outlived it, by heir. */
      estates: [] as {
        deceasedId: string;
        heirId: string;
        amountMinor: number;
      }[],
      expected: { births: 0, deaths: 0 },
      // The outcome web's factor on the place's birth rate this month, and
      // the web month record it was read from (null where the web is off).
      webBirths: webBirthsFactor,
      webRecordId: webBirths?.recordId ?? null,
      /** The web month record the deaths' factor was read from (null where it is off or moved nothing). */
      webDeathRecordId: null as string | null,
      endPeople: 0,
      endHouseholds: 0,
    };

    // Deaths follow a serious illness, as a full person's do. The ill whose
    // course has run die now. Each cohort's life-table chance, times its
    // healthy members, is the share of an onset it is owed this month; an
    // illness goes to the cohort owed the most (largest remainder), so
    // illnesses fall on cohorts in proportion to their hazard and not only
    // on the oldest, and the fraction owed is carried forward. No dice.
    // The state's age-adjusted death rate against the nation's (NCHS) scales
    // everyone there alike, so it sets how many fall ill and die, not who; a
    // territory the dataset lacks takes the national rate.
    const mortality =
      (stateMortality.ratioByState as Record<string, number>)[state.key] ?? 1;
    const lead = (person: PersonInput, on: string) =>
      countedCourseDays(ageOf(person, on));
    const byId = new Map(people.map((person) => [person.id, person]));
    const ill = new Map(
      illInPlace(api, placeId).map((found) => [found.id, found]),
    );
    for (const found of [...ill.values()].sort(
      (a, b) => compare(a.dueDate, b.dueDate) || compare(a.id, b.id),
    )) {
      const person = byId.get(found.id);
      if (!person) {
        // Filled in or moved away: the group no longer holds them.
        ill.delete(found.id);
        endCountedIllness(api, found.id);
        continue;
      }
      if (found.dueDate > date) continue;
      ill.delete(found.id);
      endCountedIllness(api, found.id);
      for (const heir of removeCountedPerson(core, person.id))
        row.estates.push({ deceasedId: person.id, ...heir });
      row.deaths.push(person.id);
    }
    const well = people.filter(
      (person) => !ill.has(person.id) && !row.deaths.includes(person.id),
    );
    const owed: Record<string, number> = { ...carry.deaths };
    const fall = (
      healthy: PersonInput[],
      on: string,
      debts: Record<string, number>,
    ) => {
      const cohorts = new Map<string, PersonInput[]>();
      for (const person of healthy) {
        // Looking back before the opening, someone born since was not yet there to fall ill.
        if (person.birthDate > on) continue;
        const key = deathCohort(person);
        cohorts.set(key, [...(cohorts.get(key) ?? []), person]);
      }
      let expected = 0;
      for (const [key, members] of cohorts) {
        // Each member's own chance at their own age, summed over the real
        // people the member stands for.
        const share = members.reduce(
          (n, member) =>
            n +
            monthlyShare(
              Math.min(
                1,
                deathChance(
                  member.looks?.gender,
                  Number(member.birthDate.slice(0, 4)),
                  ageOf(member, on),
                ) *
                  mortality *
                  webDeaths(member, on),
              ),
              months,
            ) *
              weightOfPerson(member),
          0,
        );
        expected += share;
        debts[key] = (debts[key] ?? 0) + share;
      }
      // The illnesses owed (the sum of every cohort's debt) begin, each in
      // the cohort owed the most, while the debt covers the real people the
      // next person stands for; a cohort that pays goes below zero and waits
      // its turn again. A cohort with nobody left owes nothing.
      for (;;) {
        let pick: string | undefined;
        for (const [key, debt] of Object.entries(debts))
          if (
            cohorts.get(key)?.length &&
            (pick === undefined ||
              debt > debts[pick]! ||
              (debt === debts[pick] && compare(key, pick) < 0))
          )
            pick = key;
        if (pick === undefined) break;
        const members = cohorts.get(pick)!.sort((a, b) => compare(a.id, b.id));
        const owedNow = Object.values(debts).reduce((n, debt) => n + debt, 0);
        if (!(owedNow + 1e-9 >= weightOfPerson(members[0]!))) break;
        const person = members.shift()!;
        debts[pick]! -= weightOfPerson(person);
        const due = addDays(makeIsoDate(on), lead(person, on));
        // An illness whose course ended before the first day played is a
        // death that happened before the opening: nobody here is booked.
        if (due <= date) continue;
        bookCountedIllness(api, {
          id: person.id,
          placeId,
          onsetDate: makeIsoDate(on),
          dueDate: due,
          countsId: row.id,
        });
        ill.set(person.id, {
          id: person.id,
          placeId,
          onsetDate: makeIsoDate(on),
          dueDate: due,
          countsId: row.id,
        });
        (on === date ? row.fellIll : row.openingIll).push(person.id);
      }
      return expected;
    };
    // The first month of a place has people already ill: the illnesses that
    // began in the months before the opening and have not yet run out.
    // They are found by the same rule, month by month back from today.
    if (!carryRow)
      for (
        let back = Math.ceil(
          SERIOUS_EPISODE_REMAINING_DAYS.longest / DAYS_PER_COUNT_MONTH,
        );
        back > 0;
        back -= 1
      ) {
        const before = addDays(makeIsoDate(date), -back * DAYS_PER_COUNT_MONTH);
        fall(
          people.filter((person) => !ill.has(person.id)),
          before,
          {},
        );
      }
    row.expected.deaths = fall(
      well.filter((person) => !ill.has(person.id)),
      date,
      owed,
    );
    carry.deaths = owed;
    // A cohort with nobody left keeps no row, but what it owed or overpaid
    // stays in the town's pool, so the year's total still matches the tables.
    const present = new Set(well.map(deathCohort));
    for (const key of Object.keys(owed))
      if (key !== DEATH_POOL && !present.has(key)) {
        owed[DEATH_POOL] = (owed[DEATH_POOL] ?? 0) + owed[key]!;
        delete owed[key];
      }
    row.ill = ill.size;
    row.webDeathRecordId = webDeath.recordId;

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
        // The web's links land on each woman by her own age and home (a
        // recession delays births most among women in their early twenties;
        // dearer homes raise owners' births and lower renters').
        const webFactor = webOn
          ? webFactorFor(api, placeId, "births.rate", {
              age,
              sex: "female",
              tenure: tenureOf.get(record.household.id),
            })
          : 1;
        row.expected.births +=
          monthlyShare(rate * webFactor, months) * weightOfPerson(woman);
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
      // A baby in a record stands for as many babies as the household does.
      const stands = weightOfPerson(woman);
      if (carry.births < stands) continue;
      carry.births -= stands;
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
  // stopgapId: SG-PW8-counted-newborn-temperament (a seeded temperament, not inherited)
  api.stopgap("SG-PW8-counted-newborn-temperament");
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
