/**
 * Interest groups (M3-07, first slice): organized interests form from whoever
 * loses money under a bill's fiscal note, pay for themselves, and lobby.
 *
 * Before a bill's vote, its fiscal note says which employers pay how much
 * more (a minimum-wage raise, employer by employer). Each one decides for
 * itself whether to join the employers' group against it: it joins when the
 * bill would cost it more in a year than the group's dues, and it has the
 * cash. Dues move through the cash journal into the group's own account. The
 * group's lobbyist, a named person, meets the members who will vote (every
 * member of a town body, and the town's own legislators in a state house or
 * Congress); a member they met weighs the group's case among their reasons,
 * in proportion to how many of the bill's losers the group speaks for.
 */
import { coreAPI, registerModule } from "../state";
import type { CashJournalSourceSlot } from "../journal-state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-views";
import { decisionLean } from "../trait-decisions";
import { lawChain } from "./laws";
import {
  chambersOf,
  employerCosts,
  LEGISLATURE_MODULE_ID,
  members,
  provisionStance,
  registerLegislatureHooks,
  votesOn,
  type BillRow,
} from "./legislature";
import { personLean } from "../campaign-views";
import { registerStanceListener, viewOf, viewOn } from "./views";
import { makeCase } from "./speech";
import { concerns, meetingParameter } from "./meetings";
import { parameter } from "../parameters";
import type { PersonState } from "../types";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { ownerOf } from "./business";
import { lobbyingBarredUntil } from "../law-reach/group-a-voting";
import { groupBPolicy } from "../law-reach/group-b";
import { businessEnergyCostYear } from "./place-prices";
import { jobsAt } from "../law-reach/group-b-money";
import { reachParameter } from "../law-reach/group-b-people";
import {
  CORRUPTION_MODULE_ID,
  considerBribe,
  settleBribes,
} from "./corruption";

export const INTEREST_GROUPS_MODULE_ID = "core2-interest-groups-v1";
const DUES_KIND = "interest-group-dues";

export interface GroupRow {
  readonly id: string;
  readonly organizationId: string;
  readonly interest: string;
  readonly formedOn: string;
  readonly formedOver: string;
  readonly memberOrganizationIds: readonly string[];
  /** The residents who joined a residents' group. */
  readonly memberPersonIds?: readonly string[];
  readonly lobbyistId: string | null;
}

export interface LobbyMeeting {
  readonly id: string;
  readonly groupId: string;
  readonly billId: string;
  readonly memberId: string;
  readonly lobbyistId: string | null;
  readonly date: string;
  /** The group's case: the yearly cost to the employers it speaks for, and their share of all the bill's losers. */
  readonly annualCostMinor: number;
  readonly share: number;
  /** For the bill (+1) or against it (-1); an employers' group is against. */
  readonly side?: number;
  /**
   * What the lobbyist decided at the first meeting with this member, and why:
   * the offer and take reasons the corruption engine's chooser weighed
   * (`reasons`), or `none` when there was nothing to weigh (no one to offer
   * to, or no money to offer). A refusal is kept here, not as a crime.
   */
  readonly bribe?: {
    readonly offered: boolean;
    readonly taken: boolean;
    readonly none?: "nothing-to-offer";
    readonly crimeId?: string;
    readonly reasons: Readonly<
      Record<string, Readonly<Record<string, number>>>
    >;
  };
}

interface DuesRecord {
  readonly id: string;
  readonly date: string;
  readonly groupId: string;
  readonly payerId: string;
  readonly reason: string;
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function duesSlot(api: CoreAPI, id: string): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, "dues").get(id) as unknown as DuesRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind: DUES_KIND,
    id: row.id,
    date: row.date,
    source: {
      tag: "SOURCED",
      citation: row.reason,
      asOf: row.date,
    },
    expectedPostings: row.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  const slot = {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
  map.set(id, slot);
  return slot;
}

export const INTEREST_GROUPS_MODULE: CoreModule = {
  id: INTEREST_GROUPS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      groups: {},
      meetings: {
        indexes: { byBillMember: { fields: ["billId", "memberId"] } },
      },
      dues: {},
    },
  },
  journalSourceProviders: {
    [DUES_KIND]: (api, reference) => duesSlot(api, reference.id),
  },
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(INTEREST_GROUPS_MODULE_ID).table(name);

export function openInterestGroups(core: CoreState): void {
  if (!core.modules.has(INTEREST_GROUPS_MODULE_ID))
    registerModule(core, INTEREST_GROUPS_MODULE);
  registerLegislatureHooks({
    beforeVote: organize,
    positionTerm: lobbyTerm,
    // A bribe taken on the bill is settled by how the official voted.
    afterVote: (api, billId) => {
      const votes = new Map(
        votesOn(api, billId).map((row) => [row.memberId, row.vote]),
      );
      settleBribes(api, billId, (officialId) => {
        const vote = votes.get(officialId);
        return vote === "yes" || vote === "no" || vote === "abstain"
          ? vote
          : undefined;
      });
    },
  });
}

function bill(api: CoreAPI, billId: string): BillRow {
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow;
}

/** The owner weighs the bill's cost against the dues, then the owner's own traits; no owner keeps the cost rule. */
function ownerJoins(
  api: CoreAPI,
  orgId: string,
  cost: number,
  dues: number,
): boolean {
  const owner = ownerOf(api, orgId);
  const person = owner ? api.state.people.get(owner) : undefined;
  if (!person) return true;
  return (
    Math.log(cost / dues) +
      api.parameter("traitDecisionWeight") *
        decisionLean(
          api.state,
          person,
          "interest-groups.employer-join",
          "join",
          "stay-out",
        ) >
    0
  );
}

/** Before the vote: the bill's losers decide whether to organize, and the group lobbies. */
function organize(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(INTEREST_GROUPS_MODULE_ID)) return;
  const b = bill(api, billId);
  organizeResidents(api, b);
  for (const stake of employerStakes(api, b)) organizeEmployers(api, b, stake);
}

/** What one interest of the bill costs each employer in town, and the question it argues. */
interface EmployerStake {
  readonly interest: string;
  readonly costs: ReadonlyMap<string, { annualMinor: number }>;
  readonly question: { question: string; position: number } | null;
}

/**
 * Who loses money on the bill, interest by interest: employers paying under
 * a raised minimum wage (what the raise costs them), and employers a policy
 * the bill enacts binds by their classification (law-reach's selector),
 * at an estimated share of their own payroll, full and counted workers alike.
 */
function employerStakes(api: CoreAPI, b: BillRow): readonly EmployerStake[] {
  const out: EmployerStake[] = [];
  const wage = employerCosts(api, b);
  if (wage.size)
    out.push({
      interest: "employers-minimum-wage",
      costs: wage,
      question: billQuestionOf(api, b),
    });
  for (const p of b.provisions) {
    if (p.kind !== "policy-question" || !p.question || p.value <= 0) continue;
    const policy = groupBPolicy(p.question);
    const bound = policy?.organizations;
    // A policy that pays the employers it binds (vouchers, a tax exemption) costs them nothing.
    if (!bound?.length || policy?.employersGain) continue;
    const costs = new Map<string, { annualMinor: number }>();
    const priced = businessEnergyCostYear(api, p.question, 1) !== null;
    // A law that prices energy costs each employer what its own energy costs
    // come to (the price engine's arithmetic); any other bound policy still
    // stands on an estimated share of payroll.
    if (!priced)
      // stopgapId: SG-GOV-bound-employer-cost-estimate (a share of payroll stands for what the law costs)
      api.stopgap("SG-GOV-bound-employer-cost-estimate");
    for (const job of jobsAt(api, bound)) {
      const row = costs.get(job.organizationId) ?? { annualMinor: 0 };
      if (priced) {
        const book = (api.state as CoreState).finance.businesses.get(
          job.organizationId,
        );
        costs.set(job.organizationId, {
          annualMinor: businessEnergyCostYear(
            api,
            p.question,
            book?.annualOtherCostsMinor ?? 0,
          )!,
        });
      } else
        costs.set(job.organizationId, {
          annualMinor: Math.round(
            row.annualMinor +
              job.wageDailyMinor *
                reachParameter("daysPerYear") *
                campaignParameter("boundEmployerCostShare"),
          ),
        });
    }
    if (costs.size)
      out.push({
        interest: `employers:${p.question}`,
        costs,
        question: { question: p.question, position: 1 },
      });
  }
  return out;
}

function organizeEmployers(
  api: CoreAPI,
  b: BillRow,
  stake: EmployerStake,
): void {
  const costs = stake.costs;
  const state = api.state as CoreState;
  const dues = campaignParameter("groupDuesMinor");
  const interest = stake.interest;
  const groupId = `group:${lawChain(api).townPlaceId}:${interest}`;
  const existing = table(api, "groups").get(groupId) as unknown as
    GroupRow | undefined;
  const joined = new Set(existing?.memberOrganizationIds ?? []);
  const joining = [...costs.entries()]
    .filter(([orgId, cost]) => {
      if (joined.has(orgId)) return false;
      const org = state.organizations.get(orgId);
      return (
        !!org &&
        !org.outsideFlow &&
        state.cashJournal.accounts.has(`cash:${orgId}:residual`) &&
        cost.annualMinor > dues &&
        org.liquidMinor >= dues &&
        ownerJoins(api, orgId, cost.annualMinor, dues)
      );
    })
    .sort(
      (a, b) => b[1].annualMinor - a[1].annualMinor || a[0].localeCompare(b[0]),
    );
  if (!existing && !joining.length) return;
  const organizationId = `organization:${groupId}`;
  if (!state.organizations.has(organizationId))
    api.addOrganization({
      id: organizationId,
      placeId: lawChain(api).townPlaceId,
      name: "Employers' association",
      kind: "interest-group",
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: `Fiscal note of ${b.number}`,
        asOf: api.state.date,
      },
    });
  for (const [orgId] of joining)
    payDues(api, groupId, organizationId, orgId, b);
  const memberOrgs = [...joined, ...joining.map(([id]) => id)].sort();
  const group: GroupRow = {
    id: groupId,
    organizationId,
    interest,
    formedOn: existing?.formedOn ?? api.state.date,
    formedOver: existing?.formedOver ?? b.number,
    memberOrganizationIds: memberOrgs,
    lobbyistId: existing?.lobbyistId ?? lobbyistFor(api, memberOrgs, costs),
  };
  table(api, "groups").put(group as unknown as ModuleRow);
  // The group's case: what the bill costs the employers it speaks for.
  const annual = memberOrgs.reduce(
    (sum, id) => sum + (costs.get(id)?.annualMinor ?? 0),
    0,
  );
  const share =
    memberOrgs.filter((id) => costs.has(id)).length / Math.max(1, costs.size);
  const question = stake.question;
  for (const member of lobbied(api, b)) {
    const memberId = member.personId ?? `official:${member.id}`;
    const meeting: LobbyMeeting = {
      id: `lobby:${groupId}:${b.id}:${memberId}`,
      groupId,
      billId: b.id,
      memberId,
      lobbyistId: group.lobbyistId,
      date: api.state.date,
      annualCostMinor: annual,
      share,
    };
    const held = table(api, "meetings").get(meeting.id) as unknown as
      LobbyMeeting | undefined;
    const first = !held;
    table(api, "meetings").put({
      ...meeting,
      ...(held?.bribe ? { bribe: held.bribe } : {}),
    } as unknown as ModuleRow);
    // A lobbyist who sits on the body themselves doesn't lobby their own seat.
    if (
      group.lobbyistId &&
      member.personId &&
      member.personId !== group.lobbyistId &&
      api.state.people.has(group.lobbyistId) &&
      api.state.people.has(member.personId)
    ) {
      api.relationship(group.lobbyistId, member.personId, "contact", 0.1);
      // The lobbyist makes the employers' case against the bill.
      if (first && question)
        makeCase(api, {
          id: `case:${meeting.id}`,
          speakerId: group.lobbyistId,
          listenerIds: [member.personId],
          placeId: lawChain(api).townPlaceId,
          topic: question.question,
          desiredChange: question.position > 0 ? "repeal" : "enact",
          citation: `Lobbying visit on ${b.number}`,
        });
      if (first) {
        const bribe = offerBribe(
          api,
          group.lobbyistId,
          member.personId,
          annual,
          b.id,
        );
        if (bribe)
          table(api, "meetings").put({
            ...meeting,
            bribe,
          } as unknown as ModuleRow);
      }
    }
  }
}

/**
 * At the meeting, the lobbyist weighs offering the member a bribe, and the
 * member weighs taking it, each for their own reasons (the corruption
 * engine's chooser): the favor is worth what the bill costs the employers the
 * group speaks for. A bribe taken is part of the member's position on the
 * bill (legislature.ts, bribePull).
 */
function offerBribe(
  api: CoreAPI,
  lobbyistId: string,
  memberId: string,
  stakeMinor: number,
  billId: string,
): LobbyMeeting["bribe"] | undefined {
  if (lobbyistId === memberId || stakeMinor <= 0) return undefined;
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return undefined;
  const owners = (api.state as CoreState).cashJournal.residualAccountByOwner;
  if (!owners.has(lobbyistId) || !owners.has(memberId)) return undefined;
  const crime = considerBribe(api, {
    offererId: lobbyistId,
    officialId: memberId,
    stakeMinor,
    subjectId: billId,
  });
  if (!crime)
    return {
      offered: false,
      taken: false,
      none: "nothing-to-offer",
      reasons: {},
    };
  return {
    offered: crime.offered,
    taken: crime.taken,
    ...(crime.offered ? { crimeId: crime.id } : {}),
    reasons: crime.reasons,
  };
}

function payDues(
  api: CoreAPI,
  groupId: string,
  groupOrg: string,
  payerId: string,
  b: BillRow,
): void {
  const state = api.state as CoreState;
  const amount = campaignParameter("groupDuesMinor");
  const record: DuesRecord = {
    id: `dues:${groupId}:${payerId}:${api.state.date}`,
    date: api.state.date,
    groupId,
    payerId,
    reason: `Dues to oppose ${b.number}`,
    postings: [
      {
        id: "payer",
        accountId: `cash:${payerId}:residual`,
        deltaMinor: -amount,
      },
      {
        id: "group",
        accountId: `cash:${groupOrg}:residual`,
        deltaMinor: amount,
      },
    ],
  };
  table(api, "dues").put(record as unknown as ModuleRow);
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: DUES_KIND, id: record.id },
    postings: record.postings,
  });
}

/**
 * The group's lobbyist: the owner of the member employer the bill costs most
 * when that owner lives in town, is not barred from lobbying and their traits
 * lean to serve; else the best-paid town resident working for that employer
 * (until the group hires a lobbyist: SG-GOV-group-lobbyist-stand-in).
 */
function lobbyistFor(
  api: CoreAPI,
  memberOrgs: readonly string[],
  costs: ReadonlyMap<string, { annualMinor: number }>,
): string | null {
  // stopgapId: SG-GOV-group-lobbyist-stand-in
  api.stopgap("SG-GOV-group-lobbyist-stand-in");
  const state = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  for (const orgId of [...memberOrgs].sort(
    (a, b) =>
      (costs.get(b)?.annualMinor ?? 0) - (costs.get(a)?.annualMinor ?? 0) ||
      a.localeCompare(b),
  )) {
    const ownerId = ownerOf(api, orgId);
    const owner = ownerId ? api.state.people.get(ownerId) : undefined;
    if (
      owner?.alive &&
      owner.placeId === town &&
      lobbyingBarredUntil(api, owner.id) === null &&
      decisionLean(
        api.state,
        owner,
        "interest-groups.lobbyist",
        "serve",
        "decline",
      ) >= 0
    )
      return owner.id;
    const best = [...state.work.commitments.values()]
      .filter((c) => {
        const person = api.state.people.get(c.personId);
        return (
          c.organizationId === orgId &&
          c.endsAt === undefined &&
          lobbyingBarredUntil(api, c.personId) === null &&
          person?.placeId === town &&
          decisionLean(
            api.state,
            person,
            "interest-groups.lobbyist",
            "serve",
            "decline",
          ) >= 0
        );
      })
      .sort(
        (a, b) =>
          b.hourlyMinor - a.hourlyMinor || a.personId.localeCompare(b.personId),
      )[0];
    if (best) return best.personId;
  }
  return null;
}

/** Whom the group meets: a town body's members, or the town's own legislators in a larger body. */
function lobbied(api: CoreAPI, b: BillRow): readonly TermRow[] {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(b.bodyOfficeId) as unknown as { kind: string } | undefined;
  const local = office?.kind === "council" || office?.kind === "county-board";
  if (local) return members(api, b.bodyOfficeId);
  const seats = new Set(
    (
      api.moduleState(OFFICES_MODULE_ID).table("seats").rows() as unknown as {
        id: string;
        coversTown?: boolean;
      }[]
    )
      .filter((s) => s.coversTown)
      .map((s) => s.id),
  );
  return chambersOf(api, b)
    .flatMap((chamber) => members(api, chamber))
    .filter((term) => seats.has(term.seatId));
}

/** A member the group met weighs its case: its way on the bill, as strongly as the share of those on its side (or of the bill's losers) it speaks for. */
function lobbyTerm(api: CoreAPI, b: BillRow, memberId: string): number {
  if (!api.state.modules.has(INTEREST_GROUPS_MODULE_ID)) return 0;
  const met = table(api, "meetings").query("byBillMember", [
    b.id,
    memberId,
  ]) as unknown as LobbyMeeting[];
  return met.reduce(
    (sum, m) =>
      sum + (m.side ?? -1) * campaignParameter("lobbyWeight") * m.share,
    0,
  );
}

const ageOn = (p: Readonly<PersonState>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

/**
 * Residents organize over a bill: each feels its pull by how strongly they
 * stand on its question today (the views engine), more where it touches
 * their own life (their work, children at home, age, housing), and joins the
 * group on their side of the question when that pull and their own traits
 * toward joining clear the bar. Joining one side leaves the other. A group
 * forms once enough have joined, recruits on every later bill on its
 * question, names the member most willing to speak for it, and meets the
 * members who vote; its speaker makes the group's case to each one.
 */
function organizeResidents(api: CoreAPI, b: BillRow): void {
  const stance = billQuestionOf(api, b, "policy-question");
  if (!stance) return;
  const state = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
  // Each resident's view on the question itself (+ for it, - against it).
  const feeling = [...(state.peopleByPlace.get(town) ?? [])]
    .map((id) => state.people.get(id))
    .filter(
      (p): p is PersonState =>
        !!p && p.alive && ageOn(p, date) >= 18 && p.id !== state.playerId,
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({
      p,
      view: viewOn(api, p.id, stance.question, personLean(state.people, p, 0)),
      touches: concerns(api, p)(stance.question),
    }))
    .filter((row) => row.view !== 0);
  for (const side of [1, -1]) {
    const onSide = feeling.filter((row) => Math.sign(row.view) === side);
    if (!onSide.length) continue;
    const groupId = groupIdFor(town, stance.question, side);
    const organizationId = `organization:${groupId}`;
    const existing = table(api, "groups").get(groupId) as unknown as
      GroupRow | undefined;
    const joined = new Set(existing?.memberPersonIds ?? []);
    const joining = onSide.filter(
      (row) =>
        !joined.has(row.p.id) &&
        joinPull(api, row.p, row.view * side, row.touches) >=
          campaignParameter("groupJoinBar"),
    );
    if (!existing && joining.length < campaignParameter("groupFoundingMembers"))
      continue;
    if (!state.organizations.has(organizationId))
      api.addOrganization({
        id: organizationId,
        placeId: town,
        name: groupId,
        kind: "interest-group",
        topic: stance.question,
        liquidMinor: 0,
        source: {
          tag: "SOURCED",
          citation: `Residents organizing over ${b.number}`,
          asOf: date,
        },
      });
    for (const row of joining)
      joinSide(api, row.p.id, town, stance.question, side);
    const group = table(api, "groups").get(groupId) as unknown as
      GroupRow | undefined;
    const memberIds = [
      ...new Set([
        ...(group?.memberPersonIds ?? []),
        ...joining.map((row) => row.p.id),
      ]),
    ].sort();
    const speaker =
      existing?.lobbyistId &&
      memberIds.includes(existing.lobbyistId) &&
      state.people.get(existing.lobbyistId)?.alive &&
      lobbyingBarredUntil(api, existing.lobbyistId) === null
        ? existing.lobbyistId
        : (onSide
            .filter(
              (row) =>
                memberIds.includes(row.p.id) &&
                lobbyingBarredUntil(api, row.p.id) === null &&
                decisionLean(
                  state,
                  row.p,
                  "interest-groups.lobbyist",
                  "serve",
                  "decline",
                ) >= 0,
            )
            .sort(
              (x, y) =>
                Math.abs(y.view) - Math.abs(x.view) ||
                x.p.id.localeCompare(y.p.id),
            )[0]?.p.id ?? null);
    table(api, "groups").put({
      id: groupId,
      organizationId,
      interest: stance.question,
      formedOn: existing?.formedOn ?? date,
      formedOver: existing?.formedOver ?? b.number,
      memberOrganizationIds: [],
      memberPersonIds: memberIds,
      lobbyistId: speaker,
    } satisfies GroupRow as unknown as ModuleRow);
    // The group speaks for its share of the residents on its side.
    const share = memberIds.length / Math.max(1, onSide.length);
    for (const member of lobbied(api, b)) {
      const memberId = member.personId ?? `official:${member.id}`;
      const id = `lobby:${groupId}:${b.id}:${memberId}`;
      const first = !table(api, "meetings").get(id);
      table(api, "meetings").put({
        id,
        groupId,
        billId: b.id,
        memberId,
        lobbyistId: speaker,
        date,
        annualCostMinor: 0,
        share: Math.min(1, share),
        // Its way on the bill: its side of the question times the bill's.
        side: side * stance.position,
      } satisfies LobbyMeeting as unknown as ModuleRow);
      if (speaker && member.personId && speaker !== member.personId) {
        api.relationship(speaker, member.personId, "contact", 0.1);
        if (first)
          makeCase(api, {
            id: `case:${id}`,
            speakerId: speaker,
            listenerIds: [member.personId],
            placeId: town,
            topic: stance.question,
            desiredChange: side > 0 ? "enact" : "repeal",
            citation: `Lobbying visit on ${b.number}`,
          });
      }
    }
  }
}

/** The bill's first policy question, and which way the bill takes it. */
function billQuestionOf(
  api: CoreAPI,
  b: BillRow,
  kind?: string,
): { question: string; position: number } | null {
  const local =
    !b.bodyOfficeId.includes(":legislature-") &&
    !b.bodyOfficeId.includes(":us-");
  return (
    b.provisions
      .filter((p) => !kind || p.kind === kind)
      .map((p) => provisionStance(api, p, local ? "city" : "state"))
      .find((row) => row !== null) ?? null
  );
}

const groupIdFor = (town: string, question: string, side: number) =>
  `group:${town}:${question}:${side > 0 ? "for" : "against"}`;

/** How hard a side of a question pulls a resident: their view toward it, their stake, and their traits toward joining. */
function joinPull(
  api: CoreAPI,
  person: Readonly<PersonState>,
  toward: number,
  touches: boolean,
): number {
  return (
    Math.max(0, toward) *
      (1 + meetingParameter("lifeConcernWeight") * (touches ? 1 : 0)) +
    parameter("traitDecisionWeight") *
      decisionLean(
        api.state,
        person,
        "interest-groups.member-join",
        "join",
        "stay-out",
      )
  );
}

/** Take a resident out of a side's group (no-op if they are not in it). */
function leaveSide(
  api: CoreAPI,
  personId: string,
  town: string,
  question: string,
  side: number,
): boolean {
  const groupId = groupIdFor(town, question, side);
  const group = table(api, "groups").get(groupId) as unknown as
    GroupRow | undefined;
  if (!group?.memberPersonIds?.includes(personId)) return false;
  table(api, "groups").put({
    ...group,
    memberPersonIds: group.memberPersonIds.filter((id) => id !== personId),
    lobbyistId: group.lobbyistId === personId ? null : group.lobbyistId,
  } as unknown as ModuleRow);
  api.leave(personId, group.organizationId);
  return true;
}

/** A resident joins a side's group, leaving the other side's: no one belongs to both. */
function joinSide(
  api: CoreAPI,
  personId: string,
  town: string,
  question: string,
  side: number,
): void {
  leaveSide(api, personId, town, question, -side);
  const groupId = groupIdFor(town, question, side);
  const group = table(api, "groups").get(groupId) as unknown as
    GroupRow | undefined;
  if (group && !group.memberPersonIds?.includes(personId))
    table(api, "groups").put({
      ...group,
      memberPersonIds: [...(group.memberPersonIds ?? []), personId].sort(),
    } as unknown as ModuleRow);
  api.join(personId, `organization:${groupId}`);
}

/**
 * Membership follows the view, on the day it moves: a member whose view on
 * the group's question has crossed to the other side, by a margin that
 * slides with how closely they follow politics (the engaged hold on longer),
 * leaves; they join the other side's group if its pull clears the bar.
 */
function reviewMember(api: CoreAPI, personId: string, question: string): void {
  if (!api.state.modules.has(INTEREST_GROUPS_MODULE_ID)) return;
  const town = lawChain(api).townPlaceId;
  const person = api.state.people.get(personId);
  if (!person?.alive) return;
  for (const side of [1, -1]) {
    const group = table(api, "groups").get(
      groupIdFor(town, question, side),
    ) as unknown as GroupRow | undefined;
    if (!group?.memberPersonIds?.includes(personId)) continue;
    const view = viewOn(
      api,
      personId,
      question,
      personLean(api.state.people, person, 0),
    );
    const margin =
      campaignParameter("groupLeaveMargin") *
      (1 + (viewOf(api, personId)?.engagement ?? 0));
    if (view * side >= -margin) return;
    leaveSide(api, personId, town, question, side);
    const other = table(api, "groups").get(
      groupIdFor(town, question, -side),
    ) as unknown as GroupRow | undefined;
    if (
      other &&
      joinPull(api, person, -view * side, concerns(api, person)(question)) >=
        campaignParameter("groupJoinBar")
    )
      joinSide(api, personId, town, question, -side);
    return;
  }
}

registerStanceListener(reviewMember);

export function groupsHere(api: CoreAPI): readonly GroupRow[] {
  return table(api, "groups").rows() as unknown as GroupRow[];
}

export function meetingsOn(
  api: CoreAPI,
  billId: string,
): readonly LobbyMeeting[] {
  return (table(api, "meetings").rows() as unknown as LobbyMeeting[]).filter(
    (m) => m.billId === billId,
  );
}

export { coreAPI };
