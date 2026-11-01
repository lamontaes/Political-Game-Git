/**
 * Losing a home (owner, Oct 14, 2026: "they should become homeless"). A
 * household removed by an eviction is no longer housed: where it goes is
 * decided by its own records, in order: a relative with room (doubled up), a
 * shelter bed in the place (sheltered), else the street (unsheltered). The
 * status is one row per household that isn't housed, read by every engine
 * through `housingStatusOf` and `housingStatusCounts`, and announced the day
 * it changes (`housing.status-changed`). A household rents again when its
 * income and cash reach what a landlord asks for.
 *
 * Counted households are evicted the same way: their group's rent arrears
 * (the core's group money) say how many of the group's renting households
 * are behind, the ones with the least income of their own first. A removed
 * counted household stays counted (CTO, Nov 1, under "Two-level population"
 * and "One model, two tiers"): its record comes to stand for the one
 * household removed, holds no home (tenure "none"), and the same rule places
 * it, counts it and rents to it again from its counted record.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import shelterData from "./data/housing/shelter-beds.json" with { type: "json" };
import { currentCloseness } from "./closeness";
import { stopgap } from "./stopgaps";
import {
  householdCash,
  householdIncome,
  keepOneCountedHousehold,
  regroupHousehold,
  residentsRuntime,
} from "./modules/residents";
import {
  countedMovesRunning,
  moveCountedHouseholdAway,
} from "./modules/counted-moves";
import {
  isDemoted,
  MemberState,
  type CountedHousehold,
  type CountedStore,
} from "./counted-groups";
import { pairKey } from "./kernel/ids";
import { housingWorldOffset } from "./housing-prices";
import { parameter } from "./parameters";
import { endResidentFlow } from "./residents-economy";
import type { ModuleRow } from "./module-data";
import { webFactorFor } from "./outcome-web-reach";
import type { CoreAPI, CoreState, PersonId } from "./types";

export const HOUSING_STATUS_EVENT = "housing.status-changed";
const HOUSING = "housing";

export type HousingStatus =
  "housed" | "doubled-up" | "sheltered" | "unsheltered";

/** One household that is not housed. */
export interface HousingStatusRow {
  readonly id: string;
  readonly status: Exclude<HousingStatus, "housed">;
  readonly since: string;
  readonly placeId: string;
  readonly memberIds: readonly PersonId[];
  readonly counted: boolean;
  readonly caseId: string;
  readonly hostHouseholdId?: string;
  readonly shelterPlaceId?: string;
  /** The parts that decided where they went. */
  readonly reasons: Readonly<Record<string, number | string>>;
  readonly reasonRecordIds: readonly string[];
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);
const core = (api: CoreAPI) => api.state as CoreState;

/** A person's housing today: housed unless their household's row says otherwise. */
export function housingStatusOf(
  api: CoreAPI,
  personId: PersonId,
): HousingStatus {
  if (!core(api).modules.has(HOUSING)) return "housed";
  const link = table(api, "statusByPerson").get(personId) as
    { householdId: string } | undefined;
  if (!link) return "housed";
  const row = table(api, "statuses").get(link.householdId) as
    HousingStatusRow | undefined;
  return row?.status ?? "housed";
}

/**
 * What housing weighs on a household's health today, for the engines that
 * set the chance of a serious illness (health.ts for full people,
 * births-counted.ts for counted ones): the hazard factor of its housing
 * status, times the eviction factor for the days after its last removal
 * (Collinson et al. 2024), with the status and eviction day it read.
 */
export function housingHealthFactor(
  api: CoreAPI,
  householdId: string,
): { factor: number; status: HousingStatus; evictedOn?: string } {
  const one = api.parameter("one");
  if (!core(api).modules.has(HOUSING)) return { factor: one, status: "housed" };
  const row = table(api, "statuses").get(householdId) as
    HousingStatusRow | undefined;
  const status: HousingStatus = row?.status ?? "housed";
  let evictedOn: string | undefined;
  for (const found of table(api, "cases").query("byHousehold", [
    householdId,
  ]) as unknown as { removedAt?: string }[])
    if (found.removedAt && (!evictedOn || found.removedAt > evictedOn))
      evictedOn = found.removedAt;
  const date = core(api).date;
  const evicted =
    evictedOn !== undefined &&
    evictedOn <= date &&
    date <
      addDays(
        makeIsoDate(evictedOn),
        api.parameter("healthEvictionEffectDays"),
      );
  return {
    factor:
      api.parameter(HEALTH_STATUS_FACTORS[status]) *
      (evicted ? api.parameter("healthEvictionHazardFactor") : one),
    status,
    ...(evicted ? { evictedOn } : {}),
  };
}

/** The health engine's hazard factor for each housing status (homelessness item 5). */
export const HEALTH_STATUS_FACTORS: Readonly<Record<HousingStatus, string>> = {
  housed: "one",
  "doubled-up": "healthDoubledUpHazardFactor",
  sheltered: "healthShelteredHazardFactor",
  unsheltered: "healthUnshelteredHazardFactor",
};

/** A place's people by housing status, full and counted together. */
export function housingStatusCounts(
  api: CoreAPI,
  placeId: string,
): Record<HousingStatus, number> {
  const out: Record<HousingStatus, number> = {
    housed: 0,
    "doubled-up": 0,
    sheltered: 0,
    unsheltered: 0,
  };
  if (!core(api).modules.has(HOUSING)) return out;
  const counted = residentsRuntime(core(api))?.store;
  for (const row of table(api, "statuses").query("byPlace", [
    placeId,
  ]) as unknown as HousingStatusRow[]) {
    // A household that left the counts for another place is no longer here,
    // though its row ends only at the month's review (`reviewHomeless`).
    if (leftForElsewhere(counted, row.id)) continue;
    // A counted row's people times the households its record stands for
    // (one, once removed: `keepOneCountedHousehold`).
    const h = row.counted ? counted?.liveHousehold(row.id) : undefined;
    out[row.status] += row.memberIds.length * (h ? counted!.weightOf(h) : 1);
  }
  const people = core(api).peopleByPlace.get(placeId)?.size ?? 0;
  let countedPeople = 0;
  if (counted)
    for (const h of counted.liveHouseholds())
      if (!h.gone && h.placeId === placeId)
        countedPeople += counted.weightedCount(h);
  out.housed = Math.max(
    0,
    people +
      countedPeople -
      out["doubled-up"] -
      out.sheltered -
      out.unsheltered,
  );
  return out;
}

/**
 * A household that left the counts for another place (a counted move): its
 * counted record is gone, with members who moved and none filled in.
 */
function leftForElsewhere(
  store: CountedStore | undefined,
  householdId: string,
): boolean {
  const ix = store?.householdOf.get(householdId);
  const record = ix === undefined ? undefined : store!.households[ix];
  return (
    record?.gone === true &&
    record.members.some((m) => store!.state[m] === MemberState.Moved) &&
    !record.members.some((m) => store!.state[m] === MemberState.Filled)
  );
}

/** Year-round shelter beds per 10,000 people: the state's (HUD HIC 2025), an island area with no Continuum of Care at the island-area median, else the nation's. */
export function publishedShelterRateFor(usps: string): number {
  return (
    (shelterData.bedsPer10k as Record<string, number>)[usps] ??
    (
      shelterData.estimated as Record<
        string,
        { bedsPer10k: number } | undefined
      >
    )[usps]?.bedsPer10k ??
    shelterData.nationalBedsPer10k
  );
}

/** The state's shelter beds per 10,000 people in this world: the published rate moved once by the world's own offset (owner, Oct 27: realistic, not real). */
export function shelterRateFor(usps: string, seed: string): number {
  return (
    publishedShelterRateFor(usps) *
    (parameter("one") +
      housingWorldOffset(
        seed,
        `shelter-beds:${usps}`,
        "housingWorldShelterBedsSpreadShare",
      ))
  );
}

/** The place's year-round shelter beds: the state's beds per 10,000 (HUD HIC 2025) times its people. */
export function shelterBeds(
  api: CoreAPI,
  placeId: string,
  usps: string,
): number {
  // stopgapId: SG-WORLD-housing-shelter-beds-state-rate
  stopgap("SG-WORLD-housing-shelter-beds-state-rate");
  const rate = shelterRateFor(usps, api.state.seed);
  // stopgapId: SG-WORLD-housing-shelter-territory
  if (!(usps in shelterData.bedsPer10k))
    stopgap("SG-WORLD-housing-shelter-territory");
  const counts = housingStatusCounts(api, placeId);
  const people =
    counts.housed +
    counts["doubled-up"] +
    counts.sheltered +
    counts.unsheltered;
  return Math.floor((people * rate) / 10_000);
}

function setStatus(
  api: CoreAPI,
  row:
    | HousingStatusRow
    | {
        id: string;
        status: "housed";
        placeId: string;
        memberIds: readonly PersonId[];
        reasons: Readonly<Record<string, number | string>>;
        reasonRecordIds: readonly string[];
      },
  previous: HousingStatus,
): void {
  const c = core(api);
  if (row.status === "housed") {
    table(api, "statuses").remove(row.id);
    for (const id of row.memberIds) table(api, "statusByPerson").remove(id);
  } else {
    table(api, "statuses").put(row as unknown as ModuleRow);
    for (const id of row.memberIds)
      table(api, "statusByPerson").put({ id, householdId: row.id });
  }
  // Members with a person record are named by the event; members still only
  // counted by its facts, each a subject (`countedFacts`).
  const countedIds = row.memberIds.filter((id) => !c.people.has(id));
  api.emit({
    id: `${HOUSING_STATUS_EVENT}:${row.id}:${c.date}`,
    date: c.date,
    kind: HOUSING_STATUS_EVENT,
    personIds: row.memberIds.filter((id) => c.people.has(id)),
    placeId: row.placeId,
    publicRecord: false,
    topic: row.id,
    source: {
      tag: "ESTIMATED",
      asOf: c.date,
      citation:
        "The housing engine's records: the eviction case, kin, shelter beds and the household's money.",
      estimatedFrom: Object.entries(row.reasons)
        .map(([key, value]) => `${key} ${value}`)
        .join("; "),
    },
    facts: {
      status: row.status,
      previousStatus: previous,
      ...Object.fromEntries(
        row.memberIds.map((id) => [`person:${id}:housing`, row.status]),
      ),
      ...countedFacts(row.id, countedIds),
    },
  });
}

/**
 * The facts that name a counted household and its members on an event that
 * happened to all of them (an eviction, a placement): every member is a
 * subject, as every member of a full household is named by the event, so the
 * drives engine answers each one by the same rule with the whole household
 * named (`counted-subjects`).
 */
export function countedFacts(
  householdId: string,
  memberIds: readonly PersonId[],
): Record<string, string> {
  return memberIds.length
    ? {
        "counted-household": householdId,
        "counted-subjects": JSON.stringify(memberIds),
      }
    : {};
}

/** Full people by the counted people they name as family, kept for one day. */
const namedBy = new WeakMap<
  CoreState,
  { date: string; people: number; index: Map<PersonId, PersonId[]> }
>();

/** The full people who name a counted person as family (their relatives once filled in). */
function relativesNaming(c: CoreState, personId: PersonId): PersonId[] {
  let held = namedBy.get(c);
  if (!held || held.date !== c.date || held.people !== c.people.size) {
    const index = new Map<PersonId, PersonId[]>();
    for (const person of c.people.values())
      for (const id of person.familyIds)
        if (!c.people.has(id)) {
          const list = index.get(id);
          if (list) list.push(person.id);
          else index.set(id, [person.id]);
        }
    held = { date: c.date, people: c.people.size, index };
    namedBy.set(c, held);
  }
  return (held.index.get(personId) ?? []).filter(
    (id) => c.people.get(id)?.familyIds.has(personId) === true,
  );
}

/** A relative's household with room: the closest tie first, in town before elsewhere. */
function hostFor(
  api: CoreAPI,
  memberIds: readonly PersonId[],
  ownHouseholdId: string,
  placeId: string,
  canLeaveTown: boolean,
):
  | {
      householdId: string;
      placeId: string;
      closeness: number;
      relativeId: string;
    }
  | undefined {
  const c = core(api);
  const maxPeople = api.parameter("housingHostMaxPeople");
  const options: {
    householdId: string;
    placeId: string;
    closeness: number;
    relativeId: string;
  }[] = [];
  const counted = residentsRuntime(c)?.store;
  for (const memberId of memberIds) {
    const member = c.people.get(memberId);
    // A counted member's relatives with a home of their own are the full
    // people who name them as family: the ties fill-in would open.
    for (const relativeId of member
      ? member.familyIds
      : relativesNaming(c, memberId)) {
      const relative = c.people.get(relativeId);
      if (!relative?.alive || relative.householdId === ownHouseholdId) continue;
      const household = c.households.get(relative.householdId);
      if (!household) continue;
      // A relative back in the counts lives where its counted record does
      // (its full record waits at the counted placeholder place), and only
      // while that record still holds them.
      let hostPlaceId = household.placeId;
      let hostPeople = household.memberIds.length;
      if (isDemoted(relative) || isDemoted(household)) {
        const live = counted?.liveHousehold(household.id);
        const people = live ? counted!.memberIdsOf(live) : [];
        if (!people.includes(relativeId)) continue;
        hostPlaceId = live!.placeId;
        hostPeople = people.length;
      }
      // A host that is itself without a home, or full, can't take them in.
      if (table(api, "statuses").get(household.id)) continue;
      if (hostPeople + memberIds.length > maxPeople) continue;
      if (hostPlaceId !== placeId && !canLeaveTown) continue;
      let closeness = 0;
      if (member)
        for (const id of c.relationshipsByPerson.get(memberId) ?? []) {
          const tie = c.relationships.get(id);
          if (tie && (tie.otherId === relativeId || tie.actorId === relativeId))
            closeness = Math.max(closeness, currentCloseness(c, tie));
        }
      else {
        // The tie as it stands, else the family tie fill-in opens at.
        const tie = c.relationships.get(pairKey(memberId, relativeId));
        closeness = Math.max(
          closeness,
          tie ? currentCloseness(c, tie) : api.parameter("relationInitial"),
        );
      }
      options.push({
        householdId: household.id,
        placeId: hostPlaceId,
        closeness,
        relativeId,
      });
    }
  }
  return options.sort(
    (a, b) =>
      Number(b.placeId === placeId) - Number(a.placeId === placeId) ||
      b.closeness - a.closeness ||
      a.householdId.localeCompare(b.householdId),
  )[0];
}

/** A household as the housing rules read it: full from its people, counted from its record. */
interface HouseholdView {
  readonly id: string;
  readonly placeId: string;
  /** Members alive and still in it. */
  readonly memberIds: readonly PersonId[];
  /** A member holds a job here (their own, or the work a counted record's unplaced workers do). */
  readonly holdsJob: boolean;
  /** Monthly pay from jobs, as a landlord reads it. */
  readonly monthlyIncomeMinor: number;
  readonly cashMinor: number;
  readonly counted?: CountedHousehold;
}

/** A full household's view from its people's records. */
function fullView(
  api: CoreAPI,
  householdId: string,
  memberIds?: readonly PersonId[],
): HouseholdView | undefined {
  const c = core(api);
  const household = c.households.get(householdId);
  if (!household) return undefined;
  const members = (memberIds ?? household.memberIds).filter(
    (id) => c.people.get(id)?.alive && household.memberIds.includes(id),
  );
  let daily = 0;
  let holdsJob = false;
  for (const id of members) {
    const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
    if (job && job.endsAt === undefined) {
      holdsJob = true;
      daily += job.wageDailyMinor;
    }
  }
  return {
    id: household.id,
    placeId: household.placeId,
    memberIds: members,
    holdsJob,
    monthlyIncomeMinor:
      (daily * api.parameter("jobsDaysPerYear")) /
      api.parameter("macroMonthsPerYear"),
    cashMinor: members.reduce(
      (n, id) => n + (c.people.get(id)?.liquidMinor ?? 0),
      0,
    ),
  };
}

/**
 * A counted household's view from its record, by the same rule: its counted
 * members, the jobs it holds (and the work of its unplaced workers, which a
 * fill-in makes a job of its own), its pay from them, and its share of its
 * group's money.
 */
function countedView(
  api: CoreAPI,
  h: CountedHousehold,
  memberIds?: readonly PersonId[],
): HouseholdView {
  const rt = residentsRuntime(core(api))!;
  const store = rt.store;
  const counted = new Set(store.memberIdsOf(h));
  const unplaced =
    h.unplacedWorkers * (rt.unplacedPerWorker.get(h.placeId) ?? 0);
  return {
    id: h.id,
    placeId: h.placeId,
    memberIds: memberIds
      ? memberIds.filter((id) => counted.has(id))
      : [...counted],
    holdsJob:
      h.jobs.some(
        (job) => job.endsAt === undefined && counted.has(job.personId),
      ) || unplaced > 0,
    // Pay from work only, as a full household's is read (retirement awards are not).
    monthlyIncomeMinor:
      (householdIncome(rt, h) - h.retirementMinorYear) /
      api.parameter("macroMonthsPerYear"),
    cashMinor: householdCash(rt, h),
    counted: h,
  };
}

/** The household as the housing rules read it: counted while its record is, else full. */
function viewOf(
  api: CoreAPI,
  householdId: string,
  memberIds?: readonly PersonId[],
): HouseholdView | undefined {
  const h = residentsRuntime(core(api))?.store.liveHousehold(householdId);
  return h
    ? countedView(api, h, memberIds)
    : fullView(api, householdId, memberIds);
}

/**
 * A removed household goes where its records take it: a relative with room,
 * a shelter bed in the place, else the street. A counted household is read
 * from its record (`countedView`) by the same rule.
 */
export function placeRemovedHousehold(
  api: CoreAPI,
  input: {
    householdId: string;
    caseId: string;
    counted: boolean;
    usps: string;
  },
): HousingStatusRow | undefined {
  const c = core(api);
  const household = viewOf(api, input.householdId);
  if (!household) return undefined;
  const memberIds = household.memberIds;
  if (!memberIds.length) return undefined;
  const placeId = household.placeId;
  const holdsJob = household.holdsJob;
  const cash = household.cashMinor;
  // With no job holding them here they may go to a relative elsewhere; a
  // counted household leaves only through the counted moves engine, so
  // without it a relative in town, a shelter bed or the street.
  const host = hostFor(
    api,
    memberIds,
    household.id,
    placeId,
    !holdsJob && (!household.counted || countedMovesRunning(api)),
  );
  const base = {
    id: household.id,
    since: c.date,
    placeId,
    memberIds,
    counted: input.counted,
    caseId: input.caseId,
  };
  let row: HousingStatusRow;
  if (host) {
    row = {
      ...base,
      status: "doubled-up",
      hostHouseholdId: host.householdId,
      reasons: {
        relative: host.relativeId,
        closeness: host.closeness,
        cashMinor: cash,
      },
      reasonRecordIds: [input.caseId, host.householdId],
    };
    // With no job holding them here, they go to the relative's town: a
    // counted household leaves the counts for that place's (after its status
    // is announced, so its members hear it while still counted), at the moves
    // engine's coarse grain (SG-WORLD-housing-counted-rent).
    if (host.placeId !== placeId && household.counted) {
      setStatus(api, row, "housed");
      moveCountedHouseholdAway(api, household.id, host.placeId, {
        evicted: 1,
        doubledUp: 1,
        closeness: host.closeness,
      });
      return row;
    }
    if (host.placeId !== placeId)
      api.relocatePeopleV1({
        personIds: memberIds,
        placeId: host.placeId,
        householdId: household.id,
        source: {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: "Doubled up with a relative after an eviction.",
        },
      });
  } else {
    const beds = shelterBeds(api, placeId, input.usps);
    const used = housingStatusCounts(api, placeId).sheltered;
    row =
      used + memberIds.length <= beds
        ? {
            ...base,
            status: "sheltered",
            shelterPlaceId: placeId,
            reasons: { bedsInPlace: beds, bedsTaken: used, cashMinor: cash },
            reasonRecordIds: [input.caseId, `shelter-beds:${input.usps}`],
          }
        : {
            ...base,
            status: "unsheltered",
            reasons: {
              bedsInPlace: beds,
              bedsTaken: used,
              noRelativeWithRoom: 1,
              cashMinor: cash,
            },
            reasonRecordIds: [input.caseId, `shelter-beds:${input.usps}`],
          };
  }
  setStatus(api, row, "housed");
  return row;
}

/**
 * Each month a household without a home rents again once its monthly income
 * reaches the landlord's multiple of the rent and its cash covers the first
 * month. `rentOf` is the rent a lease here would ask of it; `lease` signs it;
 * `wrote` is told after each write the review makes (a status, a move, a
 * lease tried), so what `rentOf` keeps is read again. A counted household is
 * read from its record by the same rule.
 */
export function reviewHomeless(
  api: CoreAPI,
  rentOf: (householdId: string, placeId: string, incomeMinor: number) => number,
  lease: (householdId: string, rentMinor: number) => string | undefined,
  wrote: () => void = () => {},
): void {
  const baseMultiple = api.parameter("housingRehouseIncomeMultiple");
  const store = residentsRuntime(core(api))?.store;
  // The outcome web's factor on the town's homelessness (housing first, vouchers, by-right
  // permitting): a subsidy or a supportive placement covers part of the rent, so the income a
  // landlord asks for moves by the factor; one place, one factor per month.
  const webFactors = new Map<string, number>();
  // Every write this loop makes calls `wrote()` before the next `rentOf`: a new
  // write here (a person filled in, a move, a dwelling) must too, or the rent
  // `rentOf` keeps goes stale.
  for (const row of table(
    api,
    "statuses",
  ).rows() as unknown as HousingStatusRow[]) {
    // Those still alive and still in this household: a member who moved out or
    // married away does not sign or pay the lease, and a household whose
    // homeless members all left it has nobody to rehouse.
    const household = viewOf(api, row.id, row.memberIds);
    const living = household?.memberIds ?? [];
    if (!household || !living.length) {
      // A counted household that left the counts for another place moved
      // away; any other is no longer here.
      const moved = leftForElsewhere(store, row.id);
      setStatus(
        api,
        {
          ...row,
          status: "housed",
          reasons: moved ? { movedAway: 1 } : { noLongerHere: 1 },
        },
        row.status,
      );
      wrote();
      continue;
    }
    // A household that moved on is without a home where it went, not here.
    if (household.placeId !== row.placeId) {
      table(api, "statuses").put({
        ...row,
        placeId: household.placeId,
      } as unknown as ModuleRow);
      wrote();
      continue;
    }
    const income = household.monthlyIncomeMinor;
    const cash = household.cashMinor;
    const rent = rentOf(row.id, household.placeId, income);
    let factor = webFactors.get(row.placeId);
    if (factor === undefined) {
      factor = webFactorFor(api, row.placeId, "housing.homelessness");
      webFactors.set(row.placeId, factor);
    }
    const multiple = baseMultiple * factor;
    if (rent <= 0 || income < rent * multiple || cash < rent) continue;
    const leaseId = lease(row.id, rent);
    wrote();
    if (!leaseId) continue;
    setStatus(
      api,
      {
        id: row.id,
        status: "housed",
        placeId: household.placeId,
        memberIds: [...living],
        reasons: {
          monthlyIncomeMinor: Math.round(income),
          rentMinor: rent,
          cashMinor: cash,
        },
        reasonRecordIds: [leaseId],
      },
      row.status,
    );
    wrote();
  }
}

/**
 * Counted households behind on rent: their group's arrears over the group's
 * typical rent say how many, the ones with the least income first. Returns
 * each with the rent it owes, for the landlord to weigh like any late lease.
 */
export function countedLate(
  api: CoreAPI,
  placeId: string,
  inCase: (leaseId: string) => boolean,
): {
  householdId: string;
  leaseId: string;
  owedMinor: number;
  months: number;
  landlordId: string;
}[] {
  const rt = residentsRuntime(core(api));
  if (!rt) return [];
  const byGroup = new Map<
    number,
    { id: string; rent: number; income: number; payee: string }[]
  >();
  for (const h of rt.store.liveHouseholds()) {
    if (h.gone || h.placeId !== placeId || h.tenure !== "rent") continue;
    const flow = rt.flows.get(`rent:${h.id}`);
    if (!flow || flow.endedAt || flow.amountMinor <= 0) continue;
    const list = byGroup.get(h.group) ?? [];
    list.push({
      id: h.id,
      rent: flow.amountMinor,
      income: householdIncome(rt, h),
      payee: flow.payeeId,
    });
    byGroup.set(h.group, list);
  }
  const out: {
    householdId: string;
    leaseId: string;
    owedMinor: number;
    months: number;
    landlordId: string;
  }[] = [];
  for (const [group, list] of byGroup) {
    let arrears = rt.arrears.get(group) ?? 0;
    if (arrears <= 0) continue;
    for (const h of [...list].sort(
      (a, b) => a.income - b.income || a.id.localeCompare(b.id),
    )) {
      if (arrears <= 0) break;
      const owed = Math.min(arrears, h.rent);
      arrears -= h.rent;
      if (inCase(`rent:${h.id}`)) continue;
      out.push({
        householdId: h.id,
        leaseId: `rent:${h.id}`,
        owedMinor: owed,
        months: owed / h.rent,
        landlordId: h.payee,
      });
    }
  }
  return out;
}

/** What a counted case's household still owes: its share, while its group still carries arrears. */
export function countedOwed(
  api: CoreAPI,
  householdId: string,
  owedAtNotice: number,
): number {
  const rt = residentsRuntime(core(api));
  const ix = rt?.store.householdOf.get(householdId);
  if (!rt || ix === undefined) return 0;
  const h = rt.store.households[ix]!;
  if (h.gone) return 0;
  return Math.min(owedAtNotice, rt.arrears.get(h.group) ?? 0);
}

/**
 * A counted household's removal: its rent ends, its share of the group's
 * arrears goes with it (the landlord writes it off), and it stays counted
 * without a home (`leaveCountedHome`), for the same rule to decide where it
 * goes. Returns whether a household is left to place.
 */
export function removeCountedHousehold(
  api: CoreAPI,
  householdId: string,
  owed: number,
): boolean {
  const c = core(api);
  const rt = residentsRuntime(c);
  const h = rt?.store.liveHousehold(householdId);
  if (!rt || !h) return false;
  endResidentFlow(c, `rent:${householdId}`, "eviction");
  rt.arrears.set(h.group, Math.max(0, (rt.arrears.get(h.group) ?? 0) - owed));
  return leaveCountedHome(api, h);
}

/**
 * A counted household loses its home and stays counted (CTO, Nov 1): its
 * record comes to stand for the one household removed (the rest it stood for
 * keep their homes in its group, as at fill-in), it holds no home, and it
 * joins the group of households without one, its share of its group's money
 * going with it. Returns whether it has members left to place.
 */
export function leaveCountedHome(api: CoreAPI, h: CountedHousehold): boolean {
  const c = core(api);
  const rt = residentsRuntime(c);
  if (!rt || h.gone) return false;
  keepOneCountedHousehold(c, h);
  h.tenure = "none";
  regroupHousehold(rt, h, c.date);
  return rt.store.countedCount(h) > 0;
}

/** The first of next month, when a household that rents again pays. */
export function nextDue(date: string): string {
  return (
    addDays(makeIsoDate(`${date.slice(0, "YYYY-MM".length)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-01"
  );
}
