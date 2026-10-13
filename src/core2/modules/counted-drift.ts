/**
 * The wider population changes year to year (owner, Oct 12): deaths and
 * births among the counted people, from national rates applied to the counts
 * each month (SSA cohort life tables; NCHS 2024 birth rates by age). Rates
 * set how many; the records set who: each place accumulates its expected
 * deaths and births, and when a whole one is due, the counted person with the
 * highest rate is the one (no roll). Aging needs nothing: ages come from
 * birth dates. Runs on the 1st of each month; one pass over the counts.
 *
 * Moves too: each place accrues its leavers from the state's American
 * Community Survey 2024 rate of leaving the county for each adult's age, and
 * its newcomers from the state's arrivals per resident. The households that
 * leave are those whose pull has built up most (each month adds their adults'
 * age rate, held back by a mortgage or school-age children, as in the moves
 * engine; a move starts it over); newcomers
 * move into the homes they leave. Leavers' jobs end, and the jobs engine
 * fills the openings from the counts' job seekers, newcomers included.
 */
import { makeIsoDate } from "../../simulation/dates";
import { createStableId, stableHash } from "../../simulation/ids";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import life from "../data/ssa-cohort-life-tables.json" with { type: "json" };
import data from "../data/counted-drift.json" with { type: "json" };
import moveRows from "../data/moves/parameters.json" with { type: "json" };
import { MORTGAGE_PREFIX } from "../housing-mortgages";
import { drawCohortGivenName } from "../gov-rules/given-name-cohorts";
import { countedVoterGroupId } from "../opening-voter-groups";
import { stateOfPlaceKey } from "../places";
import type { ResidentHouseholdRecord } from "../residents";
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
import { registerWorldMapPart } from "../snapshot";

export const COUNTED_DRIFT_MODULE_ID = "core2-counted-drift-v1";

interface Due {
  deaths: number;
  births: number;
  /** Adults due to leave, and to arrive. */
  leavers: number;
  arrivals: number;
}
export interface DriftTally {
  deaths: number;
  births: number;
  /** People who moved away, and who moved in. */
  movedOut: number;
  movedIn: number;
}
interface Runtime {
  due: Map<PlaceId, Due>;
  /** Changes by place and month, e.g. "2027-03|place". */
  tally: Map<string, DriftTally>;
  /** Each household's pull to leave, built up month by month since it moved in. */
  pull: Map<string, number>;
  names?: Names;
}
const runtimes = new WeakMap<CoreState, Runtime>();
registerWorldMapPart("core2-counted-drift", runtimes);

/** Deaths, births and moves in the wider population, by month and place. */
export function countedDrift(core: CoreState): ReadonlyMap<string, DriftTally> {
  return runtimes.get(core)?.tally ?? new Map();
}

const ageOn = (birthDate: string, date: string) => {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
};

/** The SSA cohort qx for a person's age, sex and birth decade. */
function yearlyDeathRate(
  person: PersonInput,
  date: string,
  knownAge?: number,
): number {
  const year = Number(person.birthDate.slice(0, 4));
  const cohorts = life.cohorts as number[];
  let cohort = cohorts[0]!;
  for (const row of cohorts) if (row <= year) cohort = row;
  const table = (
    person.looks?.gender === "male" ? life.male : life.female
  ) as Record<string, number[]>;
  const row = table[String(cohort)]!;
  const age = Math.max(0, knownAge ?? ageOn(person.birthDate, date));
  return row[Math.min(age, row.length - 1)] ?? 1;
}

function birthRate(
  person: PersonInput,
  date: string,
  knownAge?: number,
): number {
  if (person.looks?.gender !== "female") return 0;
  const age = knownAge ?? ageOn(person.birthDate, date);
  const band = data.births.ratesPerThousand.find(
    (row) => age >= row.minAge && age <= row.maxAge,
  );
  return band ? band.rate / 1000 : 0;
}

/** Contract ids whose payments end this month; one pass over the flows ends them. */
type Ending = Set<string>;

interface Month {
  core: CoreState;
  ending: Ending;
  /** Each counted person's live jobs (the jobs engine's hires included). */
  jobsOf: Map<PersonId, string[]>;
}

/**
 * Jobs a public supplier agreement names as its qualified workers (stopgap
 * SG-CORE-counted-drift-named-workers: their holders don't die or move in the
 * counts until an agreement can replace a worker it names).
 */
function namedJobIds(core: CoreState): Set<string> {
  const out = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object")
      for (const [key, inner] of Object.entries(value))
        if (key === "jobIds" && Array.isArray(inner))
          for (const id of inner) out.add(String(id));
        else visit(inner);
  };
  for (const org of core.organizations.values())
    for (const raw of Object.values(org.governmentFacts ?? {}))
      if (typeof raw === "string" && raw.includes('"jobIds"'))
        try {
          visit(JSON.parse(raw));
        } catch {
          // Not a record; nothing named.
        }
  return out;
}

function liveJobsByPerson(core: CoreState): Map<PersonId, string[]> {
  const out = new Map<PersonId, string[]>();
  for (const job of residentsRuntime(core)!.jobs.values())
    if (!job.endsAt)
      out.set(job.personId, [...(out.get(job.personId) ?? []), job.id]);
  return out;
}

const shiftVoterGroup = (
  core: CoreState,
  placeId: PlaceId,
  person: PersonInput,
  by: number,
) => {
  const group = countedVoterGroupId(placeId, person.birthDate, core.date);
  const groups = voterGroups(core);
  const row = group ? groups.get(group) : undefined;
  if (row && row.size + by >= 0) groups.put({ ...row, size: row.size + by });
};

/** A counted person's work, retirement income and voter-group place end. */
function endPersonsTies(
  month: Month,
  placeId: PlaceId,
  record: ResidentHouseholdRecord,
  person: PersonInput,
): void {
  const { core, ending } = month;
  const rt = residentsRuntime(core)!;
  for (const jobId of month.jobsOf.get(person.id) ?? [])
    endCountedJob(core, jobId);
  month.jobsOf.delete(person.id);
  for (const contract of record.contracts)
    if (contract.recipientIncome?.personId === person.id)
      ending.add(contract.id);
  const claim = `retirement-claim:${person.id}`;
  if (rt.flows.has(claim)) endFlowPart(core, claim, claim);
  shiftVoterGroup(core, placeId, person, -1);
  rt.householdOfPerson.delete(person.id);
}

/** An emptied home: its purchases and mortgage end; its cash stays in town. */
function closeHousehold(
  month: Month,
  householdId: string,
  record: ResidentHouseholdRecord,
  cashMinor: number,
): void {
  const rt = residentsRuntime(month.core)!;
  rt.households.delete(householdId);
  for (const contract of record.contracts) month.ending.add(contract.id);
  month.ending.add(`household:${householdId}`);
  month.ending.add(`${MORTGAGE_PREFIX}${householdId}`);
  const place = record.household.placeId;
  rt.openingCashByPlace.set(
    place,
    (rt.openingCashByPlace.get(place) ?? 0) - cashMinor,
  );
}

function removeCountedPerson(month: Month, personId: PersonId): void {
  const rt = residentsRuntime(month.core)!;
  const householdId = rt.householdOfPerson.get(personId)!;
  const record = rt.households.get(householdId)!;
  const person = record.people.find((row) => row.id === personId)!;
  endPersonsTies(month, record.household.placeId, record, person);
  if (record.people.length === 1) {
    closeHousehold(month, householdId, record, person.liquidMinor);
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

/** End each ended contract's part of every merged flow, in one pass and one copy per flow. */
function endParts(core: CoreState, ending: Ending): void {
  if (!ending.size) return;
  for (const flow of residentsRuntime(core)!.flows.values()) {
    const parts = flow.amountByContract;
    if (!parts || flow.endedAt) continue;
    let next: Record<string, number> | undefined;
    let ended = 0;
    for (const id of ending) {
      const amount = parts[id];
      if (amount === undefined) continue;
      next ??= { ...parts };
      delete next[id];
      ended += amount;
    }
    if (!next) continue;
    flow.amountByContract = next;
    flow.amountMinor = Math.max(0, flow.amountMinor - ended);
  }
}

/** Given and family names already recorded in the counts, by gender, to draw newcomers' names from. */
interface Names {
  given: Map<string, string[]>;
  family: string[];
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
  const youngest = youngestByGender.get(gender);
  const baby: PersonInput = {
    id,
    givenName:
      cohortName(
        `${core.seed}:${id}:given`,
        gender,
        core.date,
        record.people,
      ) ??
      youngest?.givenName ??
      mother.givenName,
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

const isAdult = (person: PersonInput, date: string) =>
  ageOn(person.birthDate, date) >= 18;

const BANDS = moverRates.ageBands.map((label) => {
  const [low, high] = label.replace("+", "-200").split("-").map(Number);
  return { label, low: low!, high: high! };
});
const ratesByState = new Map<string, number[]>();

/** The state's yearly rate of leaving the county for an adult's age (ACS 2024). */
function leaveRate(
  state: string,
  person: PersonInput,
  date: string,
  knownAge?: number,
): number {
  const age = knownAge ?? ageOn(person.birthDate, date);
  if (age < 18) return 0;
  let rates = ratesByState.get(state);
  if (!rates) {
    const row = (
      (
        moverRates.places as Record<
          string,
          { departurePerYearByAge: Record<string, number> }
        >
      )[state] ?? moverRates.national
    ).departurePerYearByAge;
    rates = BANDS.map(
      (band) => (row as Record<string, number>)[band.label] ?? 0,
    );
    ratesByState.set(state, rates);
  }
  const index = BANDS.findIndex((band) => age >= band.low && age <= band.high);
  return rates[index < 0 ? BANDS.length - 1 : index]!;
}

function arrivalRate(state: string): number {
  return (
    (
      moverRates.places as Record<
        string,
        { arrivalsPerResidentPerYear: number }
      >
    )[state] ?? moverRates.national
  ).arrivalsPerResidentPerYear;
}

const MOVE_HOLDS = moveRows as unknown as Record<string, { value: number }>;

/**
 * How strongly a household is pulled to leave: its adults' strongest age rate,
 * held back by a mortgage on the home and by school-age children (the moves
 * engine's sourced and tunable holds).
 */
function leavePull(
  topRate: number,
  householdId: string,
  owners: ReadonlySet<string>,
  kids: boolean,
): number {
  const hold =
    (owners.has(householdId) ? MOVE_HOLDS.movesOwnerHold!.value : 0) +
    (kids ? MOVE_HOLDS.movesChildrenHold!.value : 0);
  return topRate * Math.exp(-hold);
}

const pick = <T>(list: readonly T[], key: string): T | undefined =>
  list.length
    ? list[parseInt(stableHash(key).slice(0, 8), 16) % list.length]
    : undefined;

/**
 * A given name people born that year were called (SSA top names by decade),
 * not one a housemate already has. Seeded: generation of who exists.
 */
function cohortName(
  key: string,
  gender: string,
  birthDate: string,
  housemates: readonly PersonInput[],
): string | undefined {
  const rng = {
    next: () => parseInt(stableHash(key).slice(0, 8), 16) / 2 ** 32,
  } as Parameters<typeof drawCohortGivenName>[0];
  return (
    drawCohortGivenName(
      rng,
      gender === "male" ? "male" : "female",
      Number(birthDate.slice(0, 4)),
      housemates.map((row) => row.givenName),
    ) ?? undefined
  );
}

/**
 * A household moves away; when newcomers are due, a household of the same
 * makeup moves into the home (stopgap: until a housing market places
 * newcomers, they arrive only into homes left empty, with the home's cash and
 * no retirement income of their own). Returns the newcomers, if any.
 */
function moveHousehold(
  api: CoreAPI,
  month: Month,
  householdId: string,
  names: Names,
  arrive: boolean,
): readonly PersonInput[] {
  const core = api.state;
  const rt = residentsRuntime(core)!;
  const record = rt.households.get(householdId)!;
  const place = record.household.placeId;
  for (const person of record.people)
    endPersonsTies(month, place, record, person);
  const cash = record.people.reduce((n, row) => n + row.liquidMinor, 0);
  if (!arrive) {
    closeHousehold(month, householdId, record, cash);
    return [];
  }
  api.stopgap(data.movesStopgapId);
  const family =
    pick(names.family, `${core.seed}:${householdId}:${core.date}:family`) ??
    record.people[0]!.familyName;
  const ids = new Map<PersonId, PersonId>(
    record.people.map((person): [PersonId, PersonId] => [
      person.id,
      createStableId(
        "person",
        `${core.seed}:${COUNTED_DRIFT_MODULE_ID}:arrival:${person.id}:${core.date}`,
      ),
    ]),
  );
  // Generation decides who the newcomers are (seeded); the rates decided that they came.
  const newcomers = record.people.map((person): PersonInput => {
    const id = ids.get(person.id)!;
    const gender = person.looks?.gender ?? "female";
    return {
      id,
      givenName:
        cohortName(
          `${core.seed}:${id}:given`,
          gender,
          person.birthDate,
          record.people,
        ) ??
        pick(names.given.get(gender) ?? [], `${core.seed}:${id}:given`) ??
        person.givenName,
      familyName: family,
      birthDate: person.birthDate,
      placeId: person.placeId,
      ...(person.countyId ? { countyId: person.countyId } : {}),
      householdId,
      tier: person.tier,
      traits: {},
      liquidMinor: person.liquidMinor,
      livingCostDailyMinor: person.livingCostDailyMinor,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: data.moves.citation,
        estimatedFrom: `Moved into the wider population: the place's expected newcomers reached a household, and a home here had just been left.`,
      },
      familyIds: person.familyIds
        .map((other) => ids.get(other))
        .filter((other): other is PersonId => !!other),
      knownIds: [],
      looks: { gender },
      pastFacts: [],
    };
  });
  for (const person of newcomers) {
    rt.householdOfPerson.set(person.id, householdId);
    shiftVoterGroup(core, place, person, 1);
  }
  rt.households.set(householdId, {
    ...record,
    household: {
      ...record.household,
      memberIds: newcomers.map((row) => row.id),
    },
    people: newcomers,
    jobs: [],
    workCommitments: [],
    contracts: record.contracts.filter((row) => !row.recipientIncome),
  });
  return newcomers;
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

/** Households paying a counted mortgage (the housing engine's merged flows). */
function mortgagedHouseholds(core: CoreState): Set<string> {
  const out = new Set<string>();
  for (const flow of residentsRuntime(core)!.flows.values())
    if (flow.id.startsWith(MORTGAGE_PREFIX) && !flow.endedAt)
      for (const part of Object.keys(flow.amountByContract ?? {}))
        if (part.startsWith(MORTGAGE_PREFIX))
          out.add(part.slice(MORTGAGE_PREFIX.length));
  return out;
}

function runMonth(api: CoreAPI, rt: Runtime): void {
  const core = api.state;
  const residents = residentsRuntime(core);
  if (!residents) return;
  api.stopgap(data.stopgapId);
  const date = core.date;
  // The town's state sets the move rates for every counted household.
  const state = stateOfPlaceKey(core.placeMetadata.placeKey ?? "") ?? "";
  // Pass 1: how many deaths, births and moves each place has due this month.
  const due = new Map<PlaceId, Due>();
  const owners = mortgagedHouseholds(core);
  const youngestByGender = new Map<string, PersonInput>();
  const names: Names = { given: new Map(), family: [] };
  for (const [householdId, record] of residents.households) {
    const place = record.household.placeId;
    let topRate = 0,
      kids = false;
    const row = due.get(place) ?? {
      ...(rt.due.get(place) ?? {
        deaths: 0,
        births: 0,
        leavers: 0,
        arrivals: 0,
      }),
    };
    const arrive = arrivalRate(state) / 12;
    for (const person of record.people) {
      const age = ageOn(person.birthDate, date);
      row.deaths += yearlyDeathRate(person, date, age) / 12;
      row.births += birthRate(person, date, age) / 12;
      if (age >= 18) {
        const rate = leaveRate(state, person, date, age);
        row.leavers += rate / 12;
        row.arrivals += arrive;
        if (rate > topRate) topRate = rate;
      } else if (age >= 5) kids = true;
      const gender = person.looks?.gender;
      const prior = gender ? youngestByGender.get(gender) : undefined;
      if (gender && (!prior || person.birthDate > prior.birthDate))
        youngestByGender.set(gender, person);
      if (gender && !rt.names) {
        const list = names.given.get(gender) ?? [];
        list.push(person.givenName);
        names.given.set(gender, list);
      }
    }
    if (!rt.names) names.family.push(record.people[0]?.familyName ?? "");
    rt.pull.set(
      householdId,
      (rt.pull.get(householdId) ?? 0) +
        leavePull(topRate, householdId, owners, kids) / 12,
    );
    due.set(place, row);
  }
  // The town's recorded names, gathered once, are the newcomers' name pool.
  names.family = names.family.filter(Boolean);
  rt.names ??= names;
  const month: Month = {
    core,
    ending: new Set(),
    jobsOf: liveJobsByPerson(core),
  };
  const named = namedJobIds(core);
  const pinned = new Set<PersonId>();
  if (named.size) {
    api.stopgap(data.namedWorkersStopgapId);
    for (const [personId, jobIds] of month.jobsOf)
      if (jobIds.some((id) => named.has(id))) pinned.add(personId);
  }
  // Pass 2: the people with the highest rates, only as many as are due.
  const dying = new Map<PlaceId, [number, number, PersonId][]>();
  const mothers = new Map<PlaceId, [number, number, PersonId][]>();
  const leaving = new Map<PlaceId, [number, number, string][]>();
  for (const [householdId, record] of residents.households) {
    const place = record.household.placeId;
    const row = due.get(place)!;
    const deaths = Math.floor(row.deaths),
      births = Math.floor(row.births),
      leavers = Math.floor(row.leavers);
    if (deaths <= 0 && births <= 0 && leavers <= 0) continue;
    if (leavers > 0 && !record.people.some((p) => pinned.has(p.id))) {
      const list = leaving.get(place) ?? [];
      keepTop(list, leavers, [rt.pull.get(householdId) ?? 0, 0, householdId]);
      leaving.set(place, list);
    }
    let young = -1;
    for (const person of record.people) {
      const age = ageOn(person.birthDate, date);
      if (deaths > 0 && !pinned.has(person.id)) {
        const list = dying.get(place) ?? [];
        keepTop(list, deaths, [
          yearlyDeathRate(person, date, age),
          0,
          person.id,
        ]);
        dying.set(place, list);
      }
      const birth = births > 0 ? birthRate(person, date, age) : 0;
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
  const monthKey = date.slice(0, 7);
  for (const [place, row] of due) {
    const tally = rt.tally.get(`${monthKey}|${place}`) ?? {
      deaths: 0,
      births: 0,
      movedOut: 0,
      movedIn: 0,
    };
    for (const [, , id] of dying.get(place) ?? [])
      if (residents.householdOfPerson.has(id)) {
        removeCountedPerson(month, id);
        tally.deaths++;
        row.deaths -= 1;
      }
    for (const [, , id] of mothers.get(place) ?? [])
      if (residents.householdOfPerson.has(id)) {
        addNewborn(api, id, youngestByGender);
        tally.births++;
        row.births -= 1;
      }
    for (const [, , householdId] of leaving.get(place) ?? []) {
      const record = residents.households.get(householdId);
      if (!record) continue;
      const adults = record.people.filter((p) => isAdult(p, date)).length;
      if (adults === 0 || adults > row.leavers) continue;
      const arrive = row.arrivals >= adults;
      tally.movedOut += record.people.length;
      row.leavers -= adults;
      const newcomers = moveHousehold(
        api,
        month,
        householdId,
        rt.names!,
        arrive,
      );
      rt.pull.delete(householdId);
      if (newcomers.length) {
        tally.movedIn += newcomers.length;
        row.arrivals -= adults;
      }
    }
    // Newcomers wait for a home at most a year (stopgap: no new homes yet).
    row.arrivals = Math.min(row.arrivals, Math.max(1, row.leavers + 1) * 12);
    rt.due.set(place, row);
    if (tally.deaths || tally.births || tally.movedOut || tally.movedIn)
      rt.tally.set(`${monthKey}|${place}`, tally);
  }
  endParts(core, month.ending);
}

export const COUNTED_DRIFT_MODULE: CoreModule = {
  id: COUNTED_DRIFT_MODULE_ID,
  onDay(api) {
    if (!api.state.date.endsWith("-01")) return undefined;
    let rt = runtimes.get(api.state);
    if (!rt)
      runtimes.set(
        api.state,
        (rt = { due: new Map(), tally: new Map(), pull: new Map() }),
      );
    runMonth(api, rt);
    return undefined;
  },
};
