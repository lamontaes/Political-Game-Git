/**
 * Demotion on exit (one model, two tiers). A household that is full (filled
 * in from the counts when the player met one of its people, or full from the
 * opening, a birth or an arrival) goes back into its counted group once it
 * has been out of the player's life for a long while (a parameter): no contact with the player for that long, and nobody in it is
 * the player's household, family or acquaintance, an official, a public
 * worker or a business owner. Nothing is lost: its money goes to its group's
 * account, its jobs stay on the employers' books as counted jobs at the same
 * pay, its rent, mortgage and purchases become its parts of the merged flows
 * again, and its people keep their records on the inactive tier at the
 * place's counted tier, so meeting one again brings the same people back.
 * Named officials, the player's household and circle are never demoted.
 */
import { daysBetweenText as daysBetween, makeIsoDate } from "../kernel/dates";
import { OUTSIDE_MARKET_KIND } from "../opening-outside-market";
import {
  COUNTED_PLACE_PREFIX,
  countedPlaceOf,
  isDemoted,
  type Tenure,
} from "../counted-groups";
import { workedToday } from "../job-lifecycle";
import { addCountedJob } from "../residents-economy";
import { MORTGAGE_PREFIX, countedMortgageFlowId } from "../housing-mortgages";
import { stableHash, pairKey } from "../kernel/ids";
import { endLivingPlan } from "../cost-of-living";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { VIEWS_MODULE_ID } from "./views";
import { ELECTIONS_MODULE_ID } from "./elections";
import { CANDIDACY_MODULE_ID, type CandidacyDecision } from "./candidacy";
import {
  countedFundOf,
  countedSpread,
  joinPublicPayAuthority,
  keepCalendar,
  residentsRuntime,
  returnToCounts,
  returnCommuterPay,
  commuterPeriodPay,
} from "./residents";
import { returnClaimToCounts } from "./retirement-claims";
import { isSchoolDistrict, type ResidentHouseholdRecord } from "../residents";
import type { ModuleRow } from "../module-data";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  JobInput,
  KnownFact,
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

/** People who are never demoted: the player's household and circle, officials, public workers, owners. */
export function protectedPeople(api: CoreAPI): Set<PersonId> {
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
    // A commuter's employer outside the town is the place's outside account, not a public employer.
    if (
      employer &&
      employer.kind !== OUTSIDE_MARKET_KIND &&
      (employer.kind !== "employer" ||
        (employer.publicPayAuthority && !isSchoolDistrict(employer)))
    )
      out.add(job.personId);
  }
  if (core.modules.has("business"))
    for (const row of api.moduleState("business").table("owners").rows())
      out.add((row as unknown as { ownerId: string }).ownerId);
  // Someone who has decided to run for office is in public life until their
  // race is decided, like those who hold one: their decision waits for its
  // filing day (Las Piedras, Puerto Rico: ten runners back in the counts by
  // the board's filing day, so none of them filed).
  if (
    core.modules.has(CANDIDACY_MODULE_ID) &&
    core.modules.has(ELECTIONS_MODULE_ID)
  ) {
    const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
    for (const row of api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows() as unknown as CandidacyDecision[]) {
      if (!row.run) continue;
      const contest = contests.get(row.contestId) as unknown as
        { electionDate: string } | undefined;
      if (contest && contest.electionDate >= core.date) out.add(row.personId);
    }
  }
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
  /** Facts a live income term of the person stands on (the award they were granted). */
  keptFacts: ReadonlySet<string>,
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
    pastFacts: (person.pastFacts ?? []).filter((fact) =>
      keptFacts.has(fact.id),
    ),
  };
}

/**
 * Whether a filled-in household can go back to the counts today, decided
 * before any record changes. Two reasons keep one out:
 * - it lives where the counts are not kept (no residents account at its
 *   place: a relative met in a state or a town beyond the played one), so it
 *   is not this engine's to send back;
 * - a member worked their job today: a job ends before its day's work (calendar
 *   work runs first on the world's clock, after the day on the player's), so
 *   it cannot end until tomorrow and the monthly review tries again.
 */
export function canReturnToCounts(
  api: CoreAPI,
  householdId: string,
): { ok: true } | { ok: false; reason: string } {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!rt) return { ok: false, reason: "no residents runtime" };
  const home = core.households.get(householdId);
  if (!home) return { ok: false, reason: "no such household" };
  if (home.placeId.startsWith(COUNTED_PLACE_PREFIX))
    return { ok: false, reason: "already in the counts" };
  if (!countsKeptAt(rt, home.placeId))
    return { ok: false, reason: "no counts kept at its place" };
  for (const id of home.memberIds) {
    const person = core.people.get(id);
    if (!person?.alive || isDemoted(person)) continue;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (job && job.endsAt === undefined && workedToday(core, person))
      return { ok: false, reason: "a member worked today" };
  }
  return { ok: true };
}

/** Demote one filled-in household now. Returns the record, or nothing when it cannot go back today (`canReturnToCounts`). */
export function demoteHousehold(
  api: CoreAPI,
  householdId: string,
  lastContact: string,
): DemotionRecord | undefined {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  const home = core.households.get(householdId);
  if (!rt || !home) return undefined;
  if (!canReturnToCounts(api, householdId).ok) return undefined;
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
  let commuterPay = 0;
  for (const person of people) {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (!job || job.endsAt !== undefined) continue;
    // A commuter job (an employer outside the town) goes back to the unplaced workers' pay.
    const commuter = commuterPeriodPay(core, job);
    if (commuter !== undefined) {
      api.endJob(job.id, id);
      commuterPay += commuter;
      continue;
    }
    const counted: JobInput = { ...job, id: `${job.id}:counted:${date}` };
    delete (counted as { endsAt?: string }).endsAt;
    // The schedule and payday it worked on come back with it at a later fill-in.
    for (const cid of core.work.commitmentsByPerson.get(person.id) ?? []) {
      const row = core.work.commitments.get(cid);
      if (!row || row.jobId !== job.id || row.endsAt !== undefined) continue;
      const demoted = {
        ...row,
        id: `${row.id}:counted:${date}`,
        jobId: counted.id,
      };
      commitments.push(demoted);
      joinPublicPayAuthority(core, demoted);
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
  // A group-quarters room returns to the counts as a room, outside the market.
  let tenure: Tenure = home.quarters ? "group" : "other";
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
  // The award an income term stands on stays on the person's record: the
  // term outlives the demotion and the finance engine reads the award each
  // payday (a retired or disabled member's benefit).
  const awardFacts = new Set<string>();
  for (const contract of core.finance.contracts.values())
    if (
      !contract.endedAt &&
      contract.recipientIncome &&
      members.has(contract.recipientIncome.personId)
    )
      awardFacts.add(contract.recipientIncome.sourceFactId);
  const record: ResidentHouseholdRecord = {
    household: {
      id: householdId,
      placeId,
      memberIds: [...members],
      source,
      ...(home.quarters ? { quarters: home.quarters } : {}),
    },
    people: people.map((p) => asCounted(p, members, awardFacts)),
    jobs,
    workCommitments: commitments,
    contracts: [],
  };
  // A household without a home returns to the counts without one: the
  // housing engine's status row goes on reading it from its counted record.
  if (
    core.modules.has("housing") &&
    api.moduleState("housing").table("statuses").get(householdId)
  )
    tenure = "none";
  const h = returnToCounts(core, record, {
    tenure,
    parts,
    ...(rent ? { rent } : {}),
  });
  // Its commuters are the place's unplaced workers again.
  returnCommuterPay(core, householdId, commuterPay);
  for (const job of jobs) addCountedJob(core, job);
  // Retirement awards claimed in play join the residents' income again.
  for (const person of people) returnClaimToCounts(api, person.id, placeId);
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
  // They keep their results, not their day-to-day memory (two-level rule,
  // owner, Oct 11: nobody gets a full past or memory until filled in): what
  // they heard and lived through goes, as a counted person holds none; their
  // counts, accounts, jobs, drives, ties and the records of what they did
  // stay, and meeting them again brings back the same person to learn anew.
  for (const person of people) forgetOnReturn(api, person.id);
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
 * A person back in the counts holds no knowledge: no engine reads a counted
 * person's facts (the counted tier's rules read the group's record), and
 * keeping them made every person ever filled in cost memory for the rest of
 * the run (Montpelier, Vermont, Nov 9: 378 people returned to the counts in
 * year 1 still held 82,472 facts). The event a drive they still hold stands
 * on stays, as the forgetting pass keeps it; the drives engine keeps the
 * drives themselves.
 */
function forgetOnReturn(api: CoreAPI, personId: PersonId): void {
  const core = api.state as CoreState;
  // Their stances go too: while counted their group's record holds their
  // view, and filled in again they start from it (views.ts reads the record).
  if (core.modules.has(VIEWS_MODULE_ID)) {
    const stances = api.moduleState(VIEWS_MODULE_ID).table("stances");
    for (const row of stances.query("byPerson", [personId]))
      stances.remove(row.id);
  }
  const known = core.knowledgeByPerson.get(personId);
  if (!known?.size) return;
  const kept = new Map<string, KnownFact>();
  for (const drive of core.people.get(personId)?.drives.values() ?? []) {
    const key = `event:${drive.sourceEventId}:experienced`;
    const fact = known.get(key);
    if (fact) kept.set(key, fact);
  }
  core.knowledgeByPerson.set(personId, kept);
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

/** Whether the counts hold a population, and its residents account, in a place. */
function countsKeptAt(
  rt: NonNullable<ReturnType<typeof residentsRuntime>>,
  placeId: string,
): boolean {
  return rt.input.accounts.some((row) => row.placeId === placeId);
}

/** The monthly review: every filled-in household long out of the player's life goes back. */
function review(api: CoreAPI): void {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!rt) return;
  const days = demotionDays(core.seed);
  sweepLatePay(api);
  const keep = protectedPeople(api);
  // A household that was never filled in (the opening's full people, the
  // newly born and the newly arrived) is out of the player's life from the
  // day the review first sees it, so it goes back by the same rule once it
  // has been out of it as long (one model, two tiers).
  for (const home of [...core.households.values()].sort((a, b) =>
    a.id < b.id ? -1 : 1,
  ))
    if (
      !rt.filledAt.has(home.id) &&
      !home.placeId.startsWith(COUNTED_PLACE_PREFIX) &&
      countsKeptAt(rt, home.placeId)
    )
      rt.filledAt.set(home.id, makeIsoDate(core.date));
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
