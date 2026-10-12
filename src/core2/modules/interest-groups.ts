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
import { lawChain } from "./laws";
import {
  employerCosts,
  LEGISLATURE_MODULE_ID,
  members,
  registerLegislatureHooks,
  type BillRow,
} from "./legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";

export const INTEREST_GROUPS_MODULE_ID = "core2-interest-groups-v1";
const DUES_KIND = "interest-group-dues";

export interface GroupRow {
  readonly id: string;
  readonly organizationId: string;
  readonly interest: string;
  readonly formedOn: string;
  readonly formedOver: string;
  readonly memberOrganizationIds: readonly string[];
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
  registerLegislatureHooks({ beforeVote: organize, positionTerm: lobbyTerm });
}

function bill(api: CoreAPI, billId: string): BillRow {
  return api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow;
}

/** Before the vote: the bill's losers decide whether to organize, and the group lobbies. */
function organize(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(INTEREST_GROUPS_MODULE_ID)) return;
  const b = bill(api, billId);
  const costs = employerCosts(api, b);
  if (!costs.size) return;
  const state = api.state as CoreState;
  const dues = campaignParameter("groupDuesMinor");
  const interest = "employers-minimum-wage";
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
        org.liquidMinor >= dues
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
    table(api, "meetings").put(meeting as unknown as ModuleRow);
    if (group.lobbyistId && member.personId)
      api.relationship(group.lobbyistId, member.personId, "contact", 0.1);
  }
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
 * The group's lobbyist: the best-paid town resident working for the member
 * employer the bill costs most (until businesses have owners and hire
 * lobbyists: SG-GOV-group-lobbyist-stand-in).
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
    const best = [...state.work.commitments.values()]
      .filter(
        (c) =>
          c.organizationId === orgId &&
          c.endsAt === undefined &&
          api.state.people.get(c.personId)?.placeId === town,
      )
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
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[]
  ).filter((t) => t.status === "serving" && seats.has(t.seatId));
}

/** A member the group met weighs its case: against the bill, as strongly as the share of the bill's losers it speaks for. */
function lobbyTerm(api: CoreAPI, b: BillRow, memberId: string): number {
  if (!api.state.modules.has(INTEREST_GROUPS_MODULE_ID)) return 0;
  const met = table(api, "meetings").query("byBillMember", [
    b.id,
    memberId,
  ]) as unknown as LobbyMeeting[];
  return met.reduce(
    (sum, m) => sum - campaignParameter("lobbyWeight") * m.share,
    0,
  );
}

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
