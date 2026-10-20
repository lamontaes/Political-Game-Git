/**
 * Law reach, group A: the module that holds what each policy reaches, and
 * the record half of every policy. On the day a policy becomes law for the
 * town, every named person, organization and officeholder its selector
 * matches (from their own records: age, work, household, employer, seat)
 * gets a legal reach record; counted groups get one row
 * with their count. A repeal ends every open row the same day.
 */
import reach from "../data/laws/reach-group-a.json" with { type: "json" };
import parameters from "../data/laws/reach-group-a-parameters.json" with { type: "json" };
import { registerModule } from "../state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  OrganizationInput,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import type { CashJournalSourceSlot } from "../journal-state";
import type { WorkPayrollJournalReceipt } from "../work-payroll-cash";
import { reachOf } from "../counted-reach";
import { isNoncitizen } from "../citizenship";
import { citizenShareOf } from "../electorate-places";
import {
  firearmOwnershipRate,
  householdOwnsFirearm,
} from "../firearm-ownership";
import { lawChain, LAWS_MODULE_ID } from "../modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "../modules/offices";
import type { LawRowInput } from "../laws-starting";

export const REACH_A_MODULE_ID = "core2-law-reach-a-v1";
export const PREMIUM_KIND = "law-reach-a:leave-premium";

export type ReachTarget =
  | "people"
  | "organizations"
  | "staff"
  | "counted"
  | "estimated"
  | "officeholders"
  /** Chosen by the policy's mechanic (assisted households, hires, funded positions). */
  | "mechanic";

export interface ReachSpec {
  readonly id: string;
  readonly target: ReachTarget;
  readonly select?: {
    readonly ageFrom?: string;
    readonly ageBelow?: string;
    readonly employed?: boolean;
    readonly gender?: string;
    readonly withChildBelow?: string;
    /** Only people who are not citizens (see `isNoncitizen`). */
    readonly noncitizen?: boolean;
    /** Only households that keep a firearm (a drawn fact, `firearm-ownership.ts`). */
    readonly firearmHousehold?: boolean;
    readonly group?: string;
    readonly employing?: boolean;
  };
  readonly share?: string;
  readonly kind:
    | "eligibility"
    | "right"
    | "compliance"
    | "price"
    | "rule"
    | "service"
    | "job";
  readonly what: string;
  readonly enforcer: string;
  readonly penalty: string;
}

export interface PolicySpec {
  readonly source: string;
  readonly mechanic: string;
  readonly stopgapId?: string;
  readonly reaches: readonly ReachSpec[];
}

/** One effect on one named person, organization, seat or counted group. */
export interface ReachRow {
  readonly id: string;
  readonly key: string;
  readonly spec: string;
  readonly lawId: string;
  readonly target: ReachTarget;
  readonly targetId: string;
  readonly kind: ReachSpec["kind"];
  readonly what: string;
  readonly enforcer: string;
  readonly penalty: string;
  /** People in a counted or estimated group. */
  readonly count: number | null;
  readonly since: string;
  readonly endedOn: string | null;
}

/** What a mechanic did and must undo on repeal (a prior wage, a budget delta). */
export interface MechanicRow {
  readonly id: string;
  readonly key: string;
  readonly active: boolean;
  readonly since: string;
  readonly facts: Readonly<Record<string, string | number>>;
}

const data = reach as unknown as {
  selectors: Record<string, readonly string[]>;
  extraSelectors: Record<string, readonly string[]>;
  staffing: Record<string, { employers: string; levels: readonly string[] }>;
  policies: Record<string, PolicySpec>;
};
export const POLICIES = data.policies;
export const STAFFING = data.staffing;
const params = (
  parameters as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters;

export function reachParameter(key: string): number {
  const row = params[key];
  if (!row) throw new Error(`No law-reach parameter: ${key}`);
  return row.value;
}

export function selectorGroup(name: string): readonly string[] {
  return data.selectors[name] ?? data.extraSelectors[name] ?? [];
}

// --- the module --------------------------------------------------------------

type CalendarWorker = (
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
) => void;
type PayrollWorker = (
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
) => void;
const calendarWorkers = new Map<string, CalendarWorker>();
const payrollWorkers: PayrollWorker[] = [];
/** A mechanic's dated work (a hire, a layoff) runs on the module's calendar. */
export function onReachCalendar(kind: string, worker: CalendarWorker): void {
  calendarWorkers.set(kind, worker);
}
/** A mechanic that acts on each payday (a payroll premium). */
export function onReachPayroll(worker: PayrollWorker): void {
  if (!payrollWorkers.includes(worker)) payrollWorkers.push(worker);
}

interface PremiumRecord {
  readonly id: string;
  readonly date: string;
  readonly reason: string;
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function premiumSlot(
  api: CoreAPI,
  id: string,
): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = reachTable(api, "premiums").get(id) as unknown as
    PremiumRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind: PREMIUM_KIND,
    id: row.id,
    date: row.date,
    source: { tag: "SOURCED", citation: row.reason, asOf: row.date },
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

export const REACH_A_MODULE: CoreModule = {
  id: REACH_A_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      reach: {
        indexes: {
          byKey: { fields: ["key", "endedOn"] },
          byTarget: { fields: ["targetId"] },
        },
      },
      mechanics: { indexes: { byKey: { fields: ["key"] } } },
      premiums: { indexes: { byPerson: { fields: ["personId"] } } },
      staffing: {},
    },
  },
  journalSourceProviders: {
    [PREMIUM_KIND]: (api, reference) => premiumSlot(api, reference.id),
  },
  onCalendarWork: (api, work) => calendarWorkers.get(work.kind)?.(api, work),
  onWorkPayroll: (api, receipt) => {
    for (const worker of payrollWorkers) worker(api, receipt);
  },
};

/** Register the module the first time a group-A policy changes in a world. */
export function ensureReachA(api: CoreAPI): void {
  const core = api.state as CoreState;
  if (!core.modules.has(REACH_A_MODULE_ID))
    registerModule(core, REACH_A_MODULE);
}

export function reachTable(api: CoreAPI, name: string) {
  return api.moduleState(REACH_A_MODULE_ID).table(name);
}

export function mechanicRow(api: CoreAPI, id: string): MechanicRow | null {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return null;
  return (
    (reachTable(api, "mechanics").get(id) as unknown as
      MechanicRow | undefined) ?? null
  );
}
export function putMechanic(api: CoreAPI, row: MechanicRow): void {
  reachTable(api, "mechanics").put(row as unknown as ModuleRow);
}

// --- reading the law and the town's records -----------------------------------

const ageOn = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) -
  Number(birthDate.slice(0, 4)) -
  (date.slice(5) < birthDate.slice(5) ? 1 : 0);
export { ageOn };

export const tomorrow = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * The levels (with their jurisdictions) whose latest law in force on a
 * policy says yes: the same reading as the law-reach host's `inForceHere`.
 */
export function yesLevels(
  api: CoreAPI,
  key: string,
): readonly { level: string; jurisdiction: string; lawId: string }[] {
  const date = api.state.date;
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const out: { level: string; jurisdiction: string; lawId: string }[] = [];
  for (const { level, jurisdiction } of lawChain(api).levels) {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (latest?.value === 1)
      out.push({ level, jurisdiction, lawId: latest.id });
  }
  return out;
}

export function townPeople(api: CoreAPI): readonly PersonState[] {
  const town = lawChain(api).townPlaceId;
  return [...api.state.people.values()].filter(
    (p) => p.alive && p.placeId === town,
  );
}

function classified(org: OrganizationInput, prefixes: readonly string[]) {
  const c = org.classification ?? "";
  return prefixes.some((prefix) => c.startsWith(prefix));
}

/** Current jobs at an organization, by commitment (start date, person). */
export function currentStaff(
  api: CoreAPI,
  organizationId: string,
): readonly { jobId: string; personId: string; startsAt: string }[] {
  const state = api.state as CoreState;
  const out: { jobId: string; personId: string; startsAt: string }[] = [];
  const seen = new Set<string>();
  for (const c of state.work.commitments.values()) {
    if (c.organizationId !== organizationId || seen.has(c.jobId)) continue;
    if (c.endsAt !== undefined && c.endsAt <= state.date) continue;
    const job = state.jobs.get(c.jobId);
    if (!job || job.endsAt !== undefined) continue;
    seen.add(c.jobId);
    out.push({ jobId: c.jobId, personId: c.personId, startsAt: c.startsAt });
  }
  return out.sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) || a.jobId.localeCompare(b.jobId),
  );
}

/** The town's organizations whose classification starts with one of the group's prefixes. */
export function townOrganizations(
  api: CoreAPI,
  group: string,
  employing = false,
): readonly OrganizationInput[] {
  const prefixes = selectorGroup(group);
  const town = new Set([
    lawChain(api).townPlaceId,
    ...(api.state as CoreState).visiblePlaceIds,
  ]);
  const state = api.state as CoreState;
  return [...state.organizations.values()]
    .filter((o) => town.has(o.placeId) && classified(o, prefixes))
    .filter(
      (o) =>
        !employing ||
        (state.finance.jobsByOrganization.get(o.id)?.size ?? 0) > 0 ||
        currentStaff(api, o.id).length > 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The share of the town's adults who are citizens: its ACS count, blended with its state's. */
function townCitizenShare(api: CoreAPI): number {
  return citizenShareOf(
    api.state.placeMetadata.placeKey as string | undefined,
    lawChain(api).stateKey.slice(3),
  );
}

function personMatches(
  api: CoreAPI,
  person: Readonly<PersonState>,
  select: NonNullable<ReachSpec["select"]>,
): boolean {
  const date = api.state.date;
  const age = ageOn(person.birthDate, date);
  if (select.ageFrom && age < reachParameter(select.ageFrom)) return false;
  if (select.ageBelow && age >= reachParameter(select.ageBelow)) return false;
  if (select.employed && !person.jobId) return false;
  if (select.gender && person.looks?.gender !== select.gender) return false;
  if (
    select.noncitizen &&
    !isNoncitizen(api.state.seed, person.id, townCitizenShare(api))
  )
    return false;
  if (select.withChildBelow) {
    const below = reachParameter(select.withChildBelow);
    const household = api.state.households.get(person.householdId);
    const hasChild = (household?.memberIds ?? []).some((id) => {
      const member = api.state.people.get(id);
      return member?.alive === true && ageOn(member.birthDate, date) < below;
    });
    if (!hasChild) return false;
  }
  if (
    select.firearmHousehold &&
    !householdOwnsFirearm(api, person.householdId, lawChain(api).stateKey)
  )
    return false;
  return true;
}

/** Adults in the town, named and counted: the base an estimated share applies to. */
export function townAdults(api: CoreAPI): number {
  const adult = reachParameter("adultAge");
  const date = api.state.date;
  const named = townPeople(api).filter(
    (p) => ageOn(p.birthDate, date) >= adult,
  ).length;
  const counted = reachOf(api.state as CoreState, lawChain(api).townPlaceId, {
    ageFrom: adult,
  }).counted.people;
  return named + Math.round(counted);
}

/** The town's counted members a selector reaches (`reachOf`, counted tier), rounded. */
function countedReach(
  api: CoreAPI,
  select: NonNullable<ReachSpec["select"]>,
): number {
  const p = (key: string | undefined) =>
    key === undefined ? undefined : reachParameter(key);
  const reach = reachOf(api.state as CoreState, lawChain(api).townPlaceId, {
    ...(select.ageFrom ? { ageFrom: p(select.ageFrom)! } : {}),
    ...(select.ageBelow ? { ageBelow: p(select.ageBelow)! } : {}),
    ...(select.employed ? { employed: true } : {}),
    ...(select.gender ? { gender: select.gender } : {}),
    ...(select.noncitizen
      ? { noncitizen: { citizenShare: townCitizenShare(api) } }
      : {}),
    ...(select.withChildBelow
      ? { withChildBelow: p(select.withChildBelow)! }
      : {}),
  });
  // Counted households keep a firearm at their state's rate, as a group.
  const share = select.firearmHousehold
    ? firearmOwnershipRate(lawChain(api).stateKey)
    : 1;
  return Math.round(reach.counted.people * share);
}

export interface Target {
  readonly id: string;
  readonly personId: string | null;
  readonly count: number | null;
}

function targetsOf(api: CoreAPI, spec: ReachSpec): readonly Target[] {
  const select = spec.select ?? {};
  switch (spec.target) {
    case "people": {
      // One rule, both tiers: each full person matched one by one, and the
      // counted groups' members matched by the same rule, as one count.
      const named = townPeople(api)
        .filter((p) => personMatches(api, p, select))
        .map((p): Target => ({ id: p.id, personId: p.id, count: null }));
      const counted = countedReach(api, select);
      return counted
        ? [
            ...named,
            { id: `counted:${spec.id}`, personId: null, count: counted },
          ]
        : named;
    }
    case "organizations":
      return townOrganizations(api, select.group ?? "", select.employing).map(
        (o) => ({ id: o.id, personId: null, count: null }),
      );
    case "staff": {
      const out: Target[] = [];
      for (const org of townOrganizations(api, select.group ?? ""))
        for (const s of currentStaff(api, org.id))
          if (api.state.people.has(s.personId))
            out.push({ id: s.personId, personId: s.personId, count: null });
      return out;
    }
    case "counted": {
      const count = countedReach(api, select);
      return count ? [{ id: `counted:${spec.id}`, personId: null, count }] : [];
    }
    case "estimated": {
      const count = Math.round(
        townAdults(api) * reachParameter(spec.share ?? ""),
      );
      return count
        ? [{ id: `estimated:${spec.id}`, personId: null, count }]
        : [];
    }
    case "mechanic":
      return [];
    case "officeholders": {
      if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
      const offices = api.moduleState(OFFICES_MODULE_ID);
      const kinds = select.group ? selectorGroup(select.group) : null;
      const out: Target[] = [];
      for (const term of offices
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]) {
        if (!term.personId || !api.state.people.has(term.personId)) continue;
        const office = offices.table("offices").get(term.officeId) as
          { kind?: string } | undefined;
        if (kinds && !kinds.some((k) => (office?.kind ?? "").startsWith(k)))
          continue;
        out.push({ id: term.personId, personId: term.personId, count: null });
      }
      return out;
    }
  }
}

/** Every open reach row for a policy. */
export function openReach(api: CoreAPI, key: string): readonly ReachRow[] {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return [];
  return reachTable(api, "reach").query("byKey", [
    key,
    null,
  ]) as unknown as ReachRow[];
}

/** Every group-A effect on one person or organization, current and ended. */
export function reachOn(api: CoreAPI, targetId: string): readonly ReachRow[] {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return [];
  return reachTable(api, "reach").query("byTarget", [
    targetId,
  ]) as unknown as ReachRow[];
}

/**
 * Put a policy's record effects on everyone it reaches (in force) or end
 * them (repealed). These records are not delivered notices and create no
 * knowledge; news, conversations and notices own that. Idempotent: a second level saying yes adds no rows.
 */
export function applyRecords(
  api: CoreAPI,
  key: string,
  lawId: string,
  inForce: boolean,
): void {
  const policy = POLICIES[key];
  if (!policy) return;
  ensureReachA(api);
  if (policy.stopgapId) api.stopgap(policy.stopgapId);
  const table = reachTable(api, "reach");
  const date = api.state.date;
  const open = openReach(api, key);
  if (!inForce) {
    for (const row of open) {
      table.put({ ...row, endedOn: date } as unknown as ModuleRow);
    }
    return;
  }
  for (const spec of policy.reaches)
    writeRows(api, key, lawId, spec, targetsOf(api, spec));
  scheduleRefresh(api, key);
}

// --- rows chosen by age or a child in the home follow the records ------------

const REFRESH_KIND = "reach-refresh";

/** A spec whose people change with a birthday, a birth or a move. */
function followsRecords(spec: ReachSpec): boolean {
  const select = spec.select;
  return (
    spec.target === "people" &&
    !!select &&
    !!(
      select.ageFrom ||
      select.ageBelow ||
      select.withChildBelow ||
      select.firearmHousehold
    )
  );
}

/**
 * The first of next month: the records a row was chosen from (a birthday, a
 * birth in the household, a move) are read again, so a person who turned of
 * age gains the row on that month's first day and a household whose last
 * child grew up loses it. Scheduled only for a policy that has such a spec,
 * and again only while the policy still has open rows.
 */
function scheduleRefresh(api: CoreAPI, key: string): void {
  const policy = POLICIES[key];
  if (!policy || !policy.reaches.some(followsRecords)) return;
  const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
  const next = new Date(`${api.state.date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const date = next.toISOString().slice(0, 10);
  const slot = `${REFRESH_KIND}:${key}:${date}`;
  if (calendar.get(slot)) return;
  calendar.schedule({
    key: slot,
    date: date > tomorrow(api.state.date) ? date : tomorrow(api.state.date),
    kind: REFRESH_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "The rows a law put on people chosen by age or a child at home are read again from the people and households as they are.",
      estimatedFrom:
        "A monthly read of the records; a birthday or a birth is reflected on the first of the following month.",
    },
    sourceRecordIds: [key],
  });
}

onReachCalendar(REFRESH_KIND, (api, work) => {
  const key = work.sourceRecordIds[0]!;
  const policy = POLICIES[key];
  const open = openReach(api, key);
  // Repealed since the last read: nothing to keep up.
  if (!policy || !open.length) return;
  for (const spec of policy.reaches.filter(followsRecords)) {
    const lawId =
      open.find((row) => row.spec === spec.id)?.lawId ?? open[0]!.lawId;
    const targets = targetsOf(api, spec);
    writeRows(api, key, lawId, spec, targets);
    endRows(api, key, spec.id, new Set(targets.map((target) => target.id)));
  }
  scheduleRefresh(api, key);
});

/** The spec a mechanic writes its own rows with. */
export function specOf(key: string, specId: string): ReachSpec {
  const spec = POLICIES[key]?.reaches.find((r) => r.id === specId);
  if (!spec) throw new Error(`No reach spec ${specId} for ${key}`);
  return spec;
}

/** Put one spec's rows on targets that don't hold it yet. */
export function writeRows(
  api: CoreAPI,
  key: string,
  lawId: string,
  spec: ReachSpec,
  targets: readonly Target[],
): void {
  ensureReachA(api);
  const table = reachTable(api, "reach");
  const date = api.state.date;
  const holding = new Map(
    openReach(api, key)
      .filter((r) => r.spec === spec.id)
      .map((r) => [r.targetId, r]),
  );
  for (const target of targets) {
    const held = holding.get(target.id);
    // A group's count follows its records; a person or organization's row stands.
    if (held && (held.count === target.count || target.count === null))
      continue;
    const row: ReachRow = {
      id: held?.id ?? `reach:${lawId}:${spec.id}:${target.id}:${date}`,
      key,
      spec: spec.id,
      lawId: held?.lawId ?? lawId,
      target: spec.target,
      targetId: target.id,
      kind: spec.kind,
      what: spec.what,
      enforcer: spec.enforcer,
      penalty: spec.penalty,
      count: target.count,
      since: held?.since ?? date,
      endedOn: null,
    };
    table.put(row as unknown as ModuleRow);
    holding.set(target.id, row);
  }
}

/** End one spec's open rows on targets not in the keep set. */
export function endRows(
  api: CoreAPI,
  key: string,
  specId: string,
  keep: ReadonlySet<string>,
): void {
  const table = reachTable(api, "reach");
  for (const row of openReach(api, key)) {
    if (row.spec !== specId || keep.has(row.targetId)) continue;
    table.put({ ...row, endedOn: api.state.date } as unknown as ModuleRow);
  }
}
