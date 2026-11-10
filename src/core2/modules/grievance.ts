/**
 * Grievances between two people (world-police-patrol-and-grievance-causes,
 * part 2; design: docs/design/proposals/movements-and-unrest-2026-10-14.md,
 * unrest arises from conditions between people). A grievance is written only
 * because a recorded event hurt a named person, through the events the
 * engines that create the conflict already emit:
 *
 * - a layoff: the jobs engine's `work.job-lost` (src/core2/modules/jobs.ts
 *   `layOff`). The laid-off worker holds it against the person who decided
 *   (the employer's owner, or the best-paid worker who runs an ownerless
 *   firm). The cause record is the jobs engine's `job-change` row.
 * - an eviction: the housing engine's `housing.eviction`
 *   (src/core2/modules/housing.ts `remove`). The evicted household's head
 *   (its oldest member) holds it against the landlord's owner. The cause
 *   record is the housing engine's eviction case.
 *
 * A grievance ends when its cause is undone: the same employer hires the
 * worker again (the jobs engine's `hire` change), or the household rents
 * again from the same landlord (the housing engine's `housing.status-changed`
 * to housed, with the lease it signed).
 *
 * Detail only where the player can see it (owner, Nov 10, through the CTO:
 * "it has to perform like a game"): a grievance row is written only where at
 * least one party is a full person (the people a scene, a card or the trace
 * can show). A dispute among the counted population writes no row: it adds
 * to one count per place, month and cause, on the event as it fires. By the
 * same rule for both tiers, a row and a count stand for the people the cause
 * record stood for (`heads`, the job change's own count).
 */
import { registerModule } from "../state";
import { HOUSING_STATUS_EVENT } from "../housing-homeless";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreEventInput, CoreModule, CoreState } from "../types";
import { ownerOf } from "./business";
import { JOBS_MODULE_ID } from "./jobs";
import { residentFacts, residentsRuntime } from "./residents";

export const GRIEVANCE_MODULE_ID = "grievance";
const JOB_LOST = "work.job-lost";
const EVICTION = "housing.eviction";

/** One dispute between two people, by record id, with the record that caused it. */
export interface GrievanceRow {
  /** `grievance:` and the cause event's id. */
  readonly id: string;
  readonly kind: "layoff" | "eviction";
  /** The person the cause hurt (full, husk or counted, by record id). */
  readonly aggrievedId: string;
  /** The person they hold it against, or the business where it has no owner (SG-WORLD-grievance-ownerless-landlord). */
  readonly againstId: string;
  /** The employer or landlord whose act caused it: the act undone by the same one ends it. */
  readonly organizationId: string;
  /** The engine's own record of the cause: a job change or an eviction case. */
  readonly causeId: string;
  /** The event that carried the cause. */
  readonly causeEventId: string;
  /** The evicted household (an eviction only): its new lease is read to end it. */
  readonly householdId: string | null;
  readonly date: string;
  /** The people the cause record stands for: one for a full person, a counted job's heads. */
  readonly heads: number;
  readonly open: boolean;
  readonly endedAt?: string;
  /** The record that undid the cause: the rehire's job change, or the new lease. */
  readonly endedBy?: string;
}

const table = (api: CoreAPI) =>
  api.moduleState(GRIEVANCE_MODULE_ID).table("grievances");

/** The grievances not yet ended. */
export function grievancesOpen(api: CoreAPI): GrievanceRow[] {
  if (!api.state.modules.has(GRIEVANCE_MODULE_ID)) return [];
  return table(api).query("byOpen", [true]) as unknown as GrievanceRow[];
}

/** One count per place, month and cause of the disputes among counted people. */
export interface GrievanceCountRow {
  /** The place, the month (`YYYY-MM`) and the cause. */
  readonly id: string;
  readonly placeId: string;
  readonly month: string;
  readonly kind: GrievanceRow["kind"];
  /** The people the month's disputes stood for. */
  readonly count: number;
}

/** Whether an id names a full person (not a husk, not counted). */
function isFull(c: CoreState, id: string): boolean {
  const person = c.people.get(id);
  return !!person && person.tier !== "husk";
}

/** A dispute among counted people: added to its place's count for the month. */
function tally(
  api: CoreAPI,
  placeId: string,
  kind: GrievanceRow["kind"],
  heads: number,
): void {
  const month = api.state.date.slice(0, 7);
  const counts = api.moduleState(GRIEVANCE_MODULE_ID).table("counts");
  const id = `${placeId}:${month}:${kind}`;
  const last = counts.get(id) as unknown as GrievanceCountRow | undefined;
  counts.put({
    id,
    placeId,
    month,
    kind,
    count: (last?.count ?? 0) + heads,
  } as unknown as ModuleRow);
}

/** Whether an id names a person the world keeps (full, husk or counted). */
function isPerson(c: CoreState, id: string | undefined): id is string {
  return (
    id !== undefined &&
    (c.people.has(id) || c.husks.has(id) || residentFacts(c, id) !== undefined)
  );
}

function birthOf(c: CoreState, id: string): string | undefined {
  return (
    c.people.get(id)?.birthDate ??
    c.husks.get(id)?.birthDate ??
    residentFacts(c, id)?.birthDate
  );
}

/** A layoff: the worker against the person who decided it. */
function fromLayoff(api: CoreAPI, event: CoreEventInput): void {
  const c = api.state as CoreState;
  const facts = event.facts ?? {};
  const causeId = facts.jobChangeId;
  // Work lost elsewhere has no employer in the world's records to hold it against.
  if (!causeId) return;
  const aggrievedId = event.personIds[0] ?? facts["counted-subject"];
  const againstId = facts.decidedBy;
  // A firm with no one left to decide lets its last worker go as itself (it
  // is closing): there is no person to hold it against.
  if (!isPerson(c, aggrievedId) || !isPerson(c, againstId)) return;
  // An owner who ends their own job holds it against no one.
  if (againstId === aggrievedId) return;
  const change = api
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .get(causeId) as unknown as { heads?: number } | undefined;
  const heads = change?.heads ?? api.parameter("one");
  if (!isFull(c, aggrievedId) && !isFull(c, againstId))
    return tally(api, event.placeId, "layoff", heads);
  write(api, {
    id: `grievance:${event.id}`,
    kind: "layoff",
    aggrievedId,
    againstId,
    organizationId: facts.organizationId ?? "",
    causeId,
    causeEventId: event.id,
    householdId: null,
    date: event.date,
    heads,
    open: true,
  });
}

/** An eviction: the household's head against the landlord's owner. */
function fromEviction(api: CoreAPI, event: CoreEventInput): void {
  const c = api.state as CoreState;
  const facts = event.facts ?? {};
  const causeId = facts.caseId;
  const landlordId = event.topic;
  if (!causeId || !landlordId) return;
  const counted = facts["counted-subjects"]
    ? (JSON.parse(facts["counted-subjects"]) as string[])
    : [];
  // The head is the oldest member the event names, ties by id.
  const head = [...event.personIds, ...counted]
    .map((id) => ({ id, born: birthOf(c, id) }))
    .filter((row): row is { id: string; born: string } => !!row.born)
    .sort(
      (a, b) => a.born.localeCompare(b.born) || a.id.localeCompare(b.id),
    )[0];
  if (!head) return;
  // stopgapId: SG-WORLD-grievance-ownerless-landlord
  const owner = ownerOf(api, landlordId);
  if (!owner) api.stopgap("SG-WORLD-grievance-ownerless-landlord");
  if (!isFull(c, head.id) && !(owner && isFull(c, owner)))
    return tally(api, event.placeId, "eviction", api.parameter("one"));
  const householdId =
    facts["counted-household"] ??
    c.people.get(head.id)?.householdId ??
    residentFacts(c, head.id)?.householdId;
  write(api, {
    id: `grievance:${event.id}`,
    kind: "eviction",
    aggrievedId: head.id,
    againstId: owner ?? landlordId,
    organizationId: landlordId,
    causeId,
    causeEventId: event.id,
    householdId: householdId ?? null,
    date: event.date,
    heads: api.parameter("one"),
    open: true,
  });
}

function write(api: CoreAPI, row: GrievanceRow): void {
  if (table(api).get(row.id)) return;
  table(api).put(row as unknown as ModuleRow);
}

function end(api: CoreAPI, row: GrievanceRow, endedBy: string): void {
  table(api).put({
    ...row,
    open: false,
    endedAt: api.state.date,
    endedBy,
  } as unknown as ModuleRow);
}

/** A household housed again: an eviction grievance ends where the lease it signed is the same landlord's. */
function fromHoused(api: CoreAPI, event: CoreEventInput): void {
  const facts = event.facts ?? {};
  const leaseId = facts.leaseId;
  const householdId = event.topic;
  if (facts.status !== "housed" || !leaseId || !householdId) return;
  const c = api.state as CoreState;
  const payee =
    c.finance.contracts.get(leaseId)?.payeeId ??
    residentsRuntime(c)?.flows.get(leaseId)?.payeeId;
  for (const row of table(api).query("byHousehold", [
    householdId,
  ]) as unknown as GrievanceRow[])
    if (row.open && row.organizationId === payee) end(api, row, leaseId);
}

/**
 * A laid-off worker hired again by the same employer: the grievance ends,
 * read from the jobs engine's own hire records once a month (the engine
 * emits no event for a hire).
 */
function endRehired(api: CoreAPI): void {
  if (!api.state.modules.has(JOBS_MODULE_ID)) return;
  const changes = api.moduleState(JOBS_MODULE_ID).table("changes");
  // stopgapId: SG-WORLD-grievance-no-fold
  api.stopgap("SG-WORLD-grievance-no-fold");
  for (const row of grievancesOpen(api)) {
    if (row.kind !== "layoff") continue;
    const hire = (
      changes.query("byPerson", [row.aggrievedId]) as unknown as {
        id: string;
        kind: string;
        organizationId: string;
        date: string;
      }[]
    )
      .filter(
        (change) =>
          change.kind === "hire" &&
          change.organizationId === row.organizationId &&
          change.date >= row.date,
      )
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
      )[0];
    if (hire) end(api, row, hire.id);
  }
}

export const GRIEVANCE_MODULE: CoreModule = {
  id: GRIEVANCE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      grievances: {
        indexes: {
          byOpen: { fields: ["open"] },
          byHousehold: { fields: ["householdId"] },
        },
      },
      counts: {},
    },
  },
  eventKinds: [JOB_LOST, EVICTION, HOUSING_STATUS_EVENT],
  onEvent(api, event) {
    if (event.kind === JOB_LOST) fromLayoff(api, event);
    else if (event.kind === EVICTION) fromEviction(api, event);
    else fromHoused(api, event);
  },
  onDay(api) {
    if (api.state.date.endsWith("-01")) endRehired(api);
    return undefined;
  },
  onResultsMonth(api) {
    endRehired(api);
  },
};

export function openGrievance(core: CoreState): void {
  if (core.modules.has(GRIEVANCE_MODULE_ID)) return;
  registerModule(core, GRIEVANCE_MODULE);
}
