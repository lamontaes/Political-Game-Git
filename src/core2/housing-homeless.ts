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
 * are behind, the ones with the least income of their own first. At removal
 * a counted household is filled in, so the same rule places its people.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import shelterData from "./data/housing/shelter-beds.json" with { type: "json" };
import { currentCloseness } from "./closeness";
import { stopgap } from "./stopgaps";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
import { endResidentFlow } from "./residents-economy";
import type { ModuleRow } from "./module-data";
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
  for (const row of table(api, "statuses").query("byPlace", [
    placeId,
  ]) as unknown as HousingStatusRow[])
    out[row.status] += row.memberIds.length;
  const people = core(api).peopleByPlace.get(placeId)?.size ?? 0;
  const counted = residentsRuntime(core(api))?.store;
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

/** The place's year-round shelter beds: the state's beds per 10,000 (HUD HIC 2025) times its people. */
export function shelterBeds(
  api: CoreAPI,
  placeId: string,
  usps: string,
): number {
  // stopgapId: SG-WORLD-housing-shelter-beds-state-rate
  stopgap("SG-WORLD-housing-shelter-beds-state-rate");
  const rate =
    (shelterData.bedsPer10k as Record<string, number>)[usps] ??
    shelterData.nationalBedsPer10k;
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
    },
  });
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
  for (const memberId of memberIds) {
    const member = c.people.get(memberId);
    for (const relativeId of member?.familyIds ?? []) {
      const relative = c.people.get(relativeId);
      if (!relative?.alive || relative.householdId === ownHouseholdId) continue;
      const household = c.households.get(relative.householdId);
      if (!household) continue;
      // A host that is itself without a home, or full, can't take them in.
      if (table(api, "statuses").get(household.id)) continue;
      if (household.memberIds.length + memberIds.length > maxPeople) continue;
      if (household.placeId !== placeId && !canLeaveTown) continue;
      let closeness = 0;
      for (const id of c.relationshipsByPerson.get(memberId) ?? []) {
        const tie = c.relationships.get(id);
        if (tie && (tie.otherId === relativeId || tie.actorId === relativeId))
          closeness = Math.max(closeness, currentCloseness(c, tie));
      }
      options.push({
        householdId: household.id,
        placeId: household.placeId,
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

/**
 * A removed household goes where its records take it: a relative with room,
 * a shelter bed in the place, else the street.
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
  const household = c.households.get(input.householdId);
  if (!household) return undefined;
  const memberIds = household.memberIds.filter((id) => c.people.get(id)?.alive);
  if (!memberIds.length) return undefined;
  const placeId = household.placeId;
  const holdsJob = memberIds.some((id) => {
    const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
    return job !== undefined && job.endsAt === undefined;
  });
  const cash = memberIds.reduce(
    (n, id) => n + (c.people.get(id)?.liquidMinor ?? 0),
    0,
  );
  const host = hostFor(api, memberIds, household.id, placeId, !holdsJob);
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
    // With no job holding them here, they go to the relative's town.
    if (host.placeId !== placeId)
      api.relocatePeopleV1({
        personIds: household.memberIds,
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
 * month. `rentOf` is the rent a lease here would ask of it; `lease` signs it.
 */
export function reviewHomeless(
  api: CoreAPI,
  rentOf: (householdId: string, incomeMinor: number) => number,
  lease: (householdId: string, rentMinor: number) => string | undefined,
): void {
  const c = core(api);
  const multiple = api.parameter("housingRehouseIncomeMultiple");
  const daysPerMonth =
    api.parameter("jobsDaysPerYear") / api.parameter("macroMonthsPerYear");
  for (const row of table(
    api,
    "statuses",
  ).rows() as unknown as HousingStatusRow[]) {
    const household = c.households.get(row.id);
    const living = row.memberIds.filter((id) => c.people.get(id)?.alive);
    if (!household || !living.length) {
      setStatus(
        api,
        { ...row, status: "housed", reasons: { noLongerHere: 1 } },
        row.status,
      );
      continue;
    }
    // A household that moved on is without a home where it went, not here.
    if (household.placeId !== row.placeId) {
      table(api, "statuses").put({
        ...row,
        placeId: household.placeId,
      } as unknown as ModuleRow);
      continue;
    }
    let daily = 0;
    for (const id of living) {
      const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
      if (job && job.endsAt === undefined) daily += job.wageDailyMinor;
    }
    const income = daily * daysPerMonth;
    const cash = living.reduce(
      (n, id) => n + (c.people.get(id)?.liquidMinor ?? 0),
      0,
    );
    const rent = rentOf(row.id, income);
    if (rent <= 0 || income < rent * multiple || cash < rent) continue;
    const leaseId = lease(row.id, rent);
    if (!leaseId) continue;
    setStatus(
      api,
      {
        id: row.id,
        status: "housed",
        placeId: household.placeId,
        memberIds: living,
        reasons: {
          monthlyIncomeMinor: Math.round(income),
          rentMinor: rent,
          cashMinor: cash,
        },
        reasonRecordIds: [leaseId],
      },
      row.status,
    );
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
 * arrears goes with it (the landlord writes it off), and its people are
 * filled in so the same rule decides where they go.
 */
export function removeCountedHousehold(
  api: CoreAPI,
  householdId: string,
  owed: number,
): boolean {
  const c = core(api);
  const rt = residentsRuntime(c);
  const ix = rt?.store.householdOf.get(householdId);
  if (!rt || ix === undefined) return false;
  const h = rt.store.households[ix]!;
  if (h.gone) return false;
  endResidentFlow(c, `rent:${householdId}`, "eviction");
  rt.arrears.set(h.group, Math.max(0, (rt.arrears.get(h.group) ?? 0) - owed));
  const first = rt.store.countedMembers(h)[0];
  if (first === undefined) return false;
  fillInPerson(c, rt.store.ids[first]!);
  return c.households.has(householdId);
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
