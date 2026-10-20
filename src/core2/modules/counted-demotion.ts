/**
 * Demotion on exit (one model, two tiers). A household filled in from the
 * counts when the player met one of its people goes back into its counted
 * group once it has been out of the player's life for a long while (a
 * parameter): no contact with the player for that long, and nobody in it is
 * the player's household, family or acquaintance, an official, a public
 * worker or a business owner. Nothing is lost: its money goes to its group's
 * account, its jobs stay on the employers' books as counted jobs at the same
 * pay, its rent, mortgage and purchases become its parts of the merged flows
 * again, and its people keep their records on the inactive tier at the
 * place's counted tier, so meeting one again brings the same people back.
 * Named officials, the player's household and circle are never demoted.
 */
import { pairKey } from "../kernel/pair-key";
import {
  COUNTED_PLACE_PREFIX,
  countedPlaceOf,
  isDemoted,
} from "../counted-groups";
import { addCountedJob } from "../residents-economy";
import { MORTGAGE_PREFIX, countedMortgageFlowId } from "../housing-mortgages";
import { stableHash } from "../kernel/ids";
import { endLivingPlan } from "../cost-of-living";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import {
  countedFundOf,
  countedSpread,
  keepCalendar,
  residentsRuntime,
  returnToCounts,
  returnUnplacedPay,
} from "./residents";
import { isSchoolDistrict, type ResidentHouseholdRecord } from "../residents";
import type { ModuleRow } from "../module-data";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  JobInput,
  PersonId,
  PersonInput,
  PersonState,
  Source,
  WorkCommitmentInput,
} from "../types";

export const COUNTED_DEMOTION_MODULE_ID = "core2-counted-demotion-v1";
const REVIEW_KIND = "counted-demotion-review";
const INACTIVE_TIER = "husk";

export interface DemotionRecord {
  readonly id: string;
  readonly date: string;
  readonly householdId: string;
  readonly personIds: readonly PersonId[];
  readonly placeId: string;
  readonly groupId: string;
  readonly cashMinor: number;
  /** Jobs that stay on the employers' books as counted jobs. */
  readonly jobIds: readonly string[];
  /** Bills that became parts of the merged flows: flow id to monthly amount. */
  readonly parts: Readonly<Record<string, number>>;
  readonly lastContact: string;
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/** People who are never demoted: the player's household and circle, officials, public workers, owners. */
function protectedPeople(api: CoreAPI): Set<PersonId> {
  const core = api.state as CoreState;
  const out = new Set<PersonId>();
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (player) {
    out.add(player.id);
    for (const id of core.households.get(player.householdId)?.memberIds ?? [])
      out.add(id);
    for (const id of player.familyIds) out.add(id);
    for (const id of player.knownIds) out.add(id);
  }
  if (core.modules.has(OFFICES_MODULE_ID))
    for (const term of api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byStatus", ["serving"]) as unknown as TermRow[])
      if (term.personId) out.add(term.personId);
  for (const job of core.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const employer = core.organizations.get(job.organizationId);
    if (
      employer &&
      (employer.kind !== "employer" ||
        (employer.publicPayAuthority && !isSchoolDistrict(employer)))
    )
      out.add(job.personId);
  }
  if (core.modules.has("business"))
    for (const row of api.moduleState("business").table("owners").rows())
      out.add((row as unknown as { ownerId: string }).ownerId);
  return out;
}

/** When the player last had contact with this person (their relationship), if ever. */
function lastPlayerContact(core: CoreState, id: PersonId): string | undefined {
  if (!core.playerId) return undefined;
  return core.relationships.get(pairKey(core.playerId, id))?.lastContactDate;
}

/** A demoted person's record, as the counts keep it. */
function asCounted(
  person: PersonState,
  members: ReadonlySet<PersonId>,
): PersonInput {
  return {
    id: person.id,
    givenName: person.givenName,
    familyName: person.familyName,
    birthDate: person.birthDate,
    placeId: person.placeId,
    ...(person.countyId ? { countyId: person.countyId } : {}),
    householdId: person.householdId,
    tier: person.tier,
    traits: { ...person.traits },
    ...(person.sharedTraitSource
      ? { sharedTraitSource: person.sharedTraitSource }
      : {}),
    liquidMinor: person.liquidMinor,
    livingCostDailyMinor: person.livingCostDailyMinor,
    source: person.source,
    familyIds: [...person.familyIds].filter((id) => members.has(id)),
    knownIds: [],
    ...(person.looks ? { looks: person.looks } : {}),
    pastFacts: [],
  };
}

/** Demote one filled-in household now. Returns the record. */
export function demoteHousehold(
  api: CoreAPI,
  householdId: string,
  lastContact: string,
): DemotionRecord | undefined {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  const home = core.households.get(householdId);
  if (!rt || !home) return undefined;
  const people = home.memberIds
    .map((id) => core.people.get(id))
    .filter((row): row is PersonState => !!row?.alive && !isDemoted(row));
  if (!people.length) return undefined;
  const placeId = home.placeId;
  const date = api.state.date as IsoDate;
  const id = `demotion:${householdId}:${date}`;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: date,
    citation: `Out of the player's life since ${lastContact}: returned to the counts (one model, two tiers).`,
    estimatedFrom:
      "Owner ruling, Oct 15, 2026: 180 to 240 days, drawn per world",
  };
  // Its jobs stay on the employers' books as counted jobs at the same pay.
  const jobs: JobInput[] = [];
  const commitments: WorkCommitmentInput[] = [];
  for (const person of people) {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (!job || job.endsAt !== undefined) continue;
    const counted: JobInput = { ...job, id: `${job.id}:counted:${date}` };
    delete (counted as { endsAt?: string }).endsAt;
    // The schedule and payday it worked on come back with it at a later fill-in.
    for (const cid of core.work.commitmentsByPerson.get(person.id) ?? []) {
      const row = core.work.commitments.get(cid);
      if (!row || row.jobId !== job.id || row.endsAt !== undefined) continue;
      commitments.push({
        ...row,
        id: `${row.id}:counted:${date}`,
        jobId: counted.id,
      });
      const calendar = row.payrollCalendarId
        ? core.work.payrollCalendars.get(row.payrollCalendarId)
        : undefined;
      if (calendar) keepCalendar(core, calendar);
    }
    api.endJob(job.id, id);
    jobs.push(counted);
  }
  // Its bills become its parts of the merged flows again.
  const parts = new Map<string, number>();
  let tenure: "rent" | "mortgage" | "other" = "other";
  let rent:
    { payeeId: string; amountMinor: number; source: Source } | undefined;
  for (const contract of core.finance.contracts.values()) {
    if (contract.householdId !== householdId || contract.endedAt) continue;
    const monthly = contract.amountMinor / Math.max(1, contract.periodMonths);
    if (contract.id === `lease:${householdId}`) {
      tenure = "rent";
      rent = {
        payeeId: contract.payeeId,
        amountMinor: contract.amountMinor,
        source: contract.source,
      };
    } else if (contract.id === `${MORTGAGE_PREFIX}${householdId}`) {
      tenure = "mortgage";
      const flowId = countedMortgageFlowId(placeId, contract.payeeId);
      parts.set(flowId, (parts.get(flowId) ?? 0) + contract.amountMinor);
    } else if (contract.id.endsWith(`:${householdId}`)) {
      const flowId = contract.id.slice(0, -`:${householdId}`.length);
      if (rt.flows.has(flowId))
        parts.set(flowId, (parts.get(flowId) ?? 0) + Math.round(monthly));
    }
    if (!contract.recipientIncome) api.endStandingContract(contract.id);
  }
  endLivingPlan(core, householdId);
  // Its own outside living costs and awards are the counted flows' again.
  for (const flow of rt.flows.values()) {
    if (flow.endedAt) continue;
    if (flow.id === `residents:outside-living:${householdId}`) {
      flow.endedAt = date;
      flow.endedReason = "returned-to-counts";
      const merged = `residents:outside-living:counted:${placeId}`;
      parts.set(merged, (parts.get(merged) ?? 0) + flow.amountMinor);
    } else if (
      flow.kind === "purchase" &&
      flow.id.endsWith(`:${householdId}`) &&
      people.some((p) => p.id === flow.payerId)
    ) {
      // A bill to someone outside the town it paid as its own flow.
      flow.endedAt = date;
      flow.endedReason = "returned-to-counts";
      const merged = flow.id.slice(0, -`:${householdId}`.length);
      parts.set(merged, (parts.get(merged) ?? 0) + flow.amountMinor);
    } else if (
      flow.kind === "retirement" &&
      people.some((p) => p.id === flow.payeeId)
    ) {
      flow.payeeId = flow.residentsId;
      flow.amountByContract = { [`hh:${householdId}`]: flow.amountMinor };
    }
  }
  const members = new Set(people.map((p) => p.id));
  const record: ResidentHouseholdRecord = {
    household: { id: householdId, placeId, memberIds: [...members], source },
    people: people.map((p) => asCounted(p, members)),
    jobs,
    workCommitments: commitments,
    contracts: [],
  };
  const h = returnToCounts(core, record, {
    tenure,
    parts,
    ...(rent ? { rent } : {}),
  });
  // Its workers without a recorded job are the place's unplaced workers again.
  for (const flow of [...rt.flows.values()])
    if (
      !flow.endedAt &&
      flow.financeKind === "work.unplaced-residents" &&
      members.has(flow.payeeId)
    )
      returnUnplacedPay(core, householdId, flow.id);
  for (const job of jobs) addCountedJob(core, job);
  // Its money goes to its group's account.
  const fund = countedFundOf(core, householdId);
  let cash = 0;
  const accounts = api.accounts();
  for (const person of people)
    for (const from of [
      ...(core.cashJournal.accountsByOwner.get(person.id) ?? []),
    ].sort()) {
      // Every account they hold, set-aside funds included.
      const amount = accounts.balance(from);
      if (!fund || amount <= 0) continue;
      accounts.transfer({
        id: `${id}:cash:${from}`,
        from,
        to: fund,
        amountMinor: amount,
        reasonKey: "residents.returned-to-counts.cash",
        source,
      });
      cash += amount;
    }
  // The household goes back as its living members; those who died keep
  // their own records.
  if (home.memberIds.length !== members.size)
    core.households.set(householdId, {
      ...home,
      memberIds: home.memberIds.filter((m) => members.has(m)),
    });
  // Their records stay, on the inactive tier, at the place's counted tier.
  for (const person of people)
    api.updatePerson(person.id, { tier: INACTIVE_TIER });
  api.relocatePeopleV1({
    personIds: [...members],
    placeId: countedPlaceOf(placeId),
    ...(people[0]!.countyId ? { countyId: people[0]!.countyId } : {}),
    householdId,
    source,
  });
  const row: DemotionRecord = {
    id,
    date,
    householdId,
    personIds: [...members],
    placeId,
    groupId: rt.store.groups[h.group]?.id ?? "",
    cashMinor: cash,
    jobIds: jobs.map((j) => j.id),
    parts: Object.fromEntries(parts),
    lastContact,
  };
  api
    .moduleState(COUNTED_DEMOTION_MODULE_ID)
    .table("demotions")
    .put(row as unknown as ModuleRow);
  return row;
}

/**
 * How many days without contact before a met person drifts back: drawn once
 * per world from the world's seed within the parameter's spread (owner, Oct
 * 15, 2026: 180 to 240 days, never one fixed number). Seeded generation of
 * who the world is; nothing rolled in play.
 */
export function demotionDays(seed: string): number {
  const { low, high } = countedSpread("countedDemotionDays");
  const draw = Number.parseInt(
    stableHash(`${seed}:countedDemotionDays`).slice(0, 8),
    16,
  );
  return low + (draw % (high - low + 1));
}

/** The monthly review: every filled-in household long out of the player's life goes back. */
function review(api: CoreAPI): void {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!rt) return;
  const days = demotionDays(core.seed);
  sweepLatePay(api);
  const keep = protectedPeople(api);
  for (const [householdId, filledAt] of [...rt.filledAt].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  )) {
    if (daysBetween(filledAt, api.state.date) < days) continue;
    const home = core.households.get(householdId);
    if (!home || home.placeId.startsWith(COUNTED_PLACE_PREFIX)) continue;
    let last = filledAt;
    let eligible = true;
    for (const id of home.memberIds) {
      const person = core.people.get(id);
      if (!person?.alive) continue;
      if (keep.has(id) || person.tier === INACTIVE_TIER) {
        eligible = false;
        break;
      }
      const contact = lastPlayerContact(core, id);
      if (contact && contact > last) last = contact;
    }
    if (!eligible || daysBetween(last, api.state.date) < days) continue;
    demoteHousehold(api, householdId, last);
  }
}

/**
 * Pay that reaches someone after they returned to the counts (a last
 * paycheck for days they worked) goes on to their group's account.
 */
function sweepLatePay(api: CoreAPI): void {
  const core = api.state as CoreState;
  const accounts = api.accounts();
  for (const row of countedDemotions(api))
    for (const personId of row.personIds) {
      const person = core.people.get(personId);
      if (!person || !isDemoted(person)) continue;
      const fund = countedFundOf(core, row.householdId);
      if (!fund) continue;
      for (const from of [
        ...(core.cashJournal.accountsByOwner.get(personId) ?? []),
      ].sort()) {
        const amount = accounts.balance(from);
        if (amount <= 0) continue;
        accounts.transfer({
          id: `${row.id}:late:${from}:${api.state.date}`,
          from,
          to: fund,
          amountMinor: amount,
          reasonKey: "residents.returned-to-counts.cash",
          source: {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation:
              "Pay reaching someone after they returned to the counts goes to their group.",
          },
        });
      }
    }
}

function scheduleReview(api: CoreAPI): void {
  const [year, month] = api.state.date.split("-").map(Number) as [
    number,
    number,
  ];
  const next =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  api.moduleCalendar(COUNTED_DEMOTION_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "The monthly review of who has been out of the player's life long enough to return to the counts.",
      estimatedFrom:
        "Owner ruling, Oct 15, 2026: 180 to 240 days, drawn per world",
    },
    sourceRecordIds: ["counted-demotion:state"],
  });
}

/** Demotions so far, oldest first. */
export function countedDemotions(api: CoreAPI): readonly DemotionRecord[] {
  return (
    api
      .moduleState(COUNTED_DEMOTION_MODULE_ID)
      .table("demotions")
      .rows() as unknown as DemotionRecord[]
  )
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1,
    );
}

export const COUNTED_DEMOTION_MODULE: CoreModule = {
  id: COUNTED_DEMOTION_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, demotions: {} } },
  // Ending jobs happens only from calendar work: the review is booked on
  // the module calendar for the first of each month.
  onDay(api) {
    const table = api.moduleState(COUNTED_DEMOTION_MODULE_ID).table("state");
    if (table.get("counted-demotion:state")) return;
    table.put({ id: "counted-demotion:state", openedAt: api.state.date });
    scheduleReview(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== REVIEW_KIND) return;
    review(api);
    scheduleReview(api);
  },
};
