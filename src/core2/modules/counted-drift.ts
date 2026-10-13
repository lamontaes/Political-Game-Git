/**
 * The wider population changes year to year (owner, Oct 12): deaths and
 * births among the counted people, from national rates applied to the counts
 * each month (SSA cohort life tables; NCHS 2024 birth rates by age). Rates
 * set how many; the records set who: each place accumulates its expected
 * deaths and births, and when a whole one is due, the counted person with the
 * highest rate is the one (no roll). Aging needs nothing: ages come from
 * birth dates. Runs on the 1st of each month; one pass over the counts.
 */
import { makeIsoDate } from "../../simulation/dates";
import { createStableId, stableHash } from "../../simulation/ids";
import life from "../data/ssa-cohort-life-tables.json" with { type: "json" };
import data from "../data/counted-drift.json" with { type: "json" };
import { countedVoterGroupId } from "../opening-voter-groups";
import { endCountedJob, endFlowPart } from "../residents-economy";
import { voterGroups } from "../voter-groups";
import { residentsRuntime } from "./residents";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonInput,
  PlaceId,
} from "../types";

export const COUNTED_DRIFT_MODULE_ID = "core2-counted-drift-v1";

interface Runtime {
  due: Map<PlaceId, { deaths: number; births: number }>;
  /** Deaths and births by place and month, e.g. "2027-03|place". */
  tally: Map<string, { deaths: number; births: number }>;
}
const runtimes = new WeakMap<CoreState, Runtime>();

/** Deaths and births in the wider population, by month and place. */
export function countedDrift(
  core: CoreState,
): ReadonlyMap<string, { deaths: number; births: number }> {
  return runtimes.get(core)?.tally ?? new Map();
}

const ageOn = (birthDate: string, date: string) => {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
};

/** The SSA cohort qx for a person's age, sex and birth decade. */
function yearlyDeathRate(person: PersonInput, date: string): number {
  const year = Number(person.birthDate.slice(0, 4));
  const cohorts = life.cohorts as number[];
  let cohort = cohorts[0]!;
  for (const row of cohorts) if (row <= year) cohort = row;
  const table = (
    person.looks?.gender === "male" ? life.male : life.female
  ) as Record<string, number[]>;
  const row = table[String(cohort)]!;
  const age = Math.max(0, ageOn(person.birthDate, date));
  return row[Math.min(age, row.length - 1)] ?? 1;
}

function birthRate(person: PersonInput, date: string): number {
  if (person.looks?.gender !== "female") return 0;
  const age = ageOn(person.birthDate, date);
  const band = data.births.ratesPerThousand.find(
    (row) => age >= row.minAge && age <= row.maxAge,
  );
  return band ? band.rate / 1000 : 0;
}

/** Contract ids whose payments end this month; one pass over the flows ends them. */
type Ending = Set<string>;

function removeCountedPerson(
  core: CoreState,
  personId: PersonId,
  ending: Ending,
): void {
  const rt = residentsRuntime(core)!;
  const householdId = rt.householdOfPerson.get(personId)!;
  const record = rt.households.get(householdId)!;
  const person = record.people.find((row) => row.id === personId)!;
  // Their work ends, and their own retirement payments with it.
  for (const job of record.jobs)
    if (job.personId === personId) endCountedJob(core, job.id);
  for (const contract of record.contracts)
    if (contract.recipientIncome?.personId === personId)
      ending.add(contract.id);
  const claim = `retirement-claim:${personId}`;
  if (rt.flows.has(claim)) endFlowPart(core, claim, claim);
  // They leave their voter group.
  const group = countedVoterGroupId(
    record.household.placeId,
    person.birthDate,
    core.date,
  );
  const groups = voterGroups(core);
  const row = group ? groups.get(group) : undefined;
  if (row && row.size > 0) groups.put({ ...row, size: row.size - 1 });
  rt.householdOfPerson.delete(personId);
  if (record.people.length === 1) {
    // The household is gone: its purchases end; its money stays with the
    // town's residents.
    rt.households.delete(householdId);
    for (const contract of record.contracts) ending.add(contract.id);
    ending.add(`household:${householdId}`);
    const place = record.household.placeId;
    rt.openingCashByPlace.set(
      place,
      (rt.openingCashByPlace.get(place) ?? 0) - person.liquidMinor,
    );
    return;
  }
  rt.households.set(householdId, {
    ...record,
    household: {
      ...record.household,
      memberIds: record.household.memberIds.filter((id) => id !== personId),
    },
    people: record.people.filter((row) => row.id !== personId),
    jobs: record.jobs.filter((job) => job.personId !== personId),
  });
}

/** End each ended contract's part of every merged flow, in one pass. */
function endParts(core: CoreState, ending: Ending): void {
  if (!ending.size) return;
  for (const flow of residentsRuntime(core)!.flows.values()) {
    const parts = flow.amountByContract;
    if (!parts || flow.endedAt) continue;
    for (const id of ending)
      if (parts[id] !== undefined) endFlowPart(core, flow.id, id);
  }
}

function addNewborn(
  api: CoreAPI,
  motherId: PersonId,
  youngestByGender: ReadonlyMap<string, PersonInput>,
): PersonInput {
  const core = api.state;
  const rt = residentsRuntime(core)!;
  const householdId = rt.householdOfPerson.get(motherId)!;
  const record = rt.households.get(householdId)!;
  const mother = record.people.find((row) => row.id === motherId)!;
  const id = createStableId(
    "person",
    `${core.seed}:${COUNTED_DRIFT_MODULE_ID}:${motherId}:${core.date}`,
  );
  // Generation decides who the baby is (seeded), never whether a birth occurs.
  const gender =
    parseInt(stableHash(`${core.seed}:${id}:gender`).slice(0, 8), 16) % 2
      ? "female"
      : "male";
  api.stopgap(data.newbornNamesStopgapId);
  // A given name already recorded among the town's youngest of that gender.
  const youngest = youngestByGender.get(gender);
  const baby: PersonInput = {
    id,
    givenName: youngest?.givenName ?? mother.givenName,
    familyName: mother.familyName,
    birthDate: makeIsoDate(core.date),
    placeId: mother.placeId,
    ...(mother.countyId ? { countyId: mother.countyId } : {}),
    householdId,
    tier: mother.tier,
    traits: {},
    liquidMinor: 0,
    livingCostDailyMinor: 0,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: data.births.citation,
      estimatedFrom: `Born in the wider population: the place's expected births reached a whole birth; the mother is the counted woman with the highest birth rate for her age.`,
    },
    familyIds: [motherId],
    knownIds: [],
    looks: { gender },
    pastFacts: [],
  };
  rt.householdOfPerson.set(id, householdId);
  rt.households.set(householdId, {
    ...record,
    household: {
      ...record.household,
      memberIds: [...record.household.memberIds, id],
    },
    people: [
      ...record.people.map((row) =>
        row.id === motherId
          ? { ...row, familyIds: [...row.familyIds, id] }
          : row,
      ),
      baby,
    ],
  });
  return baby;
}

/** Keep the k highest-ranked candidates (rank, then id), without sorting everyone. */
function keepTop(
  top: [number, number, PersonId][],
  k: number,
  row: [number, number, PersonId],
): void {
  if (k <= 0) return;
  const better = (
    a: [number, number, PersonId],
    b: [number, number, PersonId],
  ) =>
    a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] < b[2];
  if (top.length === k && !better(row, top[k - 1]!)) return;
  let i = top.length;
  while (i > 0 && better(row, top[i - 1]!)) i--;
  top.splice(i, 0, row);
  if (top.length > k) top.pop();
}

function runMonth(api: CoreAPI, rt: Runtime): void {
  const core = api.state;
  const residents = residentsRuntime(core);
  if (!residents) return;
  api.stopgap(data.stopgapId);
  const date = core.date;
  // Pass 1: how many deaths and births each place has due this month.
  const due = new Map<PlaceId, { deaths: number; births: number }>();
  const youngestByGender = new Map<string, PersonInput>();
  for (const record of residents.households.values()) {
    const place = record.household.placeId;
    const row = due.get(place) ?? {
      ...(rt.due.get(place) ?? { deaths: 0, births: 0 }),
    };
    for (const person of record.people) {
      row.deaths += yearlyDeathRate(person, date) / 12;
      row.births += birthRate(person, date) / 12;
      const gender = person.looks?.gender;
      const prior = gender ? youngestByGender.get(gender) : undefined;
      if (gender && (!prior || person.birthDate > prior.birthDate))
        youngestByGender.set(gender, person);
    }
    due.set(place, row);
  }
  // Pass 2: the people with the highest rates, only as many as are due.
  const dying = new Map<PlaceId, [number, number, PersonId][]>();
  const mothers = new Map<PlaceId, [number, number, PersonId][]>();
  for (const record of residents.households.values()) {
    const place = record.household.placeId;
    const row = due.get(place)!;
    const deaths = Math.floor(row.deaths),
      births = Math.floor(row.births);
    if (deaths <= 0 && births <= 0) continue;
    let young = -1;
    for (const person of record.people) {
      if (deaths > 0) {
        const list = dying.get(place) ?? [];
        keepTop(list, deaths, [yearlyDeathRate(person, date), 0, person.id]);
        dying.set(place, list);
      }
      const birth = births > 0 ? birthRate(person, date) : 0;
      if (birth > 0) {
        if (young < 0)
          young = record.people.filter(
            (other) => ageOn(other.birthDate, date) < 5,
          ).length;
        const list = mothers.get(place) ?? [];
        // Fewer small children at home ranks first.
        keepTop(list, births, [birth, -young, person.id]);
        mothers.set(place, list);
      }
    }
  }
  const month = date.slice(0, 7);
  const ending: Ending = new Set();
  for (const [place, row] of due) {
    const tally = rt.tally.get(`${month}|${place}`) ?? { deaths: 0, births: 0 };
    for (const [, , id] of dying.get(place) ?? []) {
      removeCountedPerson(core, id, ending);
      tally.deaths++;
      row.deaths -= 1;
    }
    for (const [, , id] of mothers.get(place) ?? [])
      if (residents.householdOfPerson.has(id)) {
        addNewborn(api, id, youngestByGender);
        tally.births++;
        row.births -= 1;
      }
    rt.due.set(place, row);
    if (tally.deaths || tally.births) rt.tally.set(`${month}|${place}`, tally);
  }
  endParts(core, ending);
}

export const COUNTED_DRIFT_MODULE: CoreModule = {
  id: COUNTED_DRIFT_MODULE_ID,
  onDay(api) {
    if (!api.state.date.endsWith("-01")) return undefined;
    let rt = runtimes.get(api.state);
    if (!rt)
      runtimes.set(api.state, (rt = { due: new Map(), tally: new Map() }));
    runMonth(api, rt);
    return undefined;
  },
};
