/**
 * The records group B policies leave (audit item 13): on each named person
 * a policy reaches (with what it means for them and its terms), on each
 * employer it binds, and the count of the town's counted residents it
 * reaches. A repeal ends each record on its date; a monthly review keeps the
 * reach current as ages, incomes and work hours change.
 */
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { addMonths } from "./group-b-dates";

export const REACH_B_MODULE_ID = "core2-law-reach-b-v1";
const REVIEW_KIND = "law-reach-b-review";

export interface PersonReach {
  readonly id: string;
  readonly key: string;
  readonly personId: string;
  readonly effect: string;
  readonly kind: string;
  readonly lawId: string;
  readonly since: string;
  readonly endedOn: string | null;
  readonly terms: Readonly<Record<string, number>>;
}

export interface OrganizationReach {
  readonly id: string;
  readonly key: string;
  readonly organizationId: string;
  readonly effect: string;
  readonly kind: string;
  readonly lawId: string;
  readonly since: string;
  readonly endedOn: string | null;
  readonly terms: Readonly<Record<string, number>>;
}

/** The counted residents (wider population) a policy reaches in a place. */
export interface GroupReach {
  readonly id: string;
  readonly key: string;
  readonly placeId: string;
  readonly effect: string;
  readonly lawId: string;
  readonly reached: number;
  readonly of: number;
  readonly since: string;
  readonly endedOn: string | null;
  readonly terms: Readonly<Record<string, number>>;
}

/** What one policy reaches now: named people (with their terms), employers, counts. */
export interface Reach {
  readonly named: ReadonlyMap<string, Readonly<Record<string, number>>>;
  readonly organizations: ReadonlyMap<string, Readonly<Record<string, number>>>;
  readonly counted: number;
  readonly countedOf: number;
  readonly terms: Readonly<Record<string, number>>;
}

let review: ((api: CoreAPI) => void) | null = null;
/** group-b.ts registers the review that re-runs every active policy. */
export function setReachReview(run: (api: CoreAPI) => void): void {
  review = run;
}

const MODULE: CoreModule = {
  id: REACH_B_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      people: {
        indexes: {
          byKey: { fields: ["key", "endedOn"] },
          byPerson: { fields: ["personId"] },
        },
      },
      organizations: { indexes: { byKey: { fields: ["key", "endedOn"] } } },
      groups: { indexes: { byKey: { fields: ["key"] } } },
      /** Policies in force for the town, re-run on each review. */
      active: {},
      /** Engine actions a policy took (a law row, a budget move, a reserve), for its repeal. */
      taken: { indexes: { byKey: { fields: ["key"] } } },
      /** Each budget line's level for the town against its base. */
      services: {},
    },
  },
  onCalendarWork: (api, work) => runReview(api, work),
};

/** Register the records module the first time a group B policy acts. */
export function reachTable(api: CoreAPI, name: string) {
  const core = api.state as CoreState;
  if (!core.modules.has(REACH_B_MODULE_ID)) registerModule(core, MODULE);
  return api.moduleState(REACH_B_MODULE_ID).table(name);
}

export function rowsOf<T>(api: CoreAPI, name: string): T[] {
  return reachTable(api, name).rows() as unknown as T[];
}

export function putRow(api: CoreAPI, name: string, row: object): void {
  reachTable(api, name).put(row as unknown as ModuleRow);
}

export function getRow<T>(
  api: CoreAPI,
  name: string,
  id: string,
): T | undefined {
  return reachTable(api, name).get(id) as unknown as T | undefined;
}

const sameTerms = (
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);

/**
 * Bring a policy's records in line with what it reaches today: new records
 * for people and employers newly reached, ended records for those no longer
 * reached (or everyone, when `reach` is null: a repeal), and the counted
 * residents' row. Named people learn of it as a public fact.
 */
export function reconcile(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly effect: string;
    readonly kind: string;
    readonly lawId: string;
    readonly placeId: string;
    readonly reach: Reach | null;
  },
): void {
  const date = api.state.date;
  const people = reachTable(api, "people");
  const open = people.query("byKey", [
    input.key,
    null,
  ]) as unknown as PersonReach[];
  const named = input.reach?.named ?? new Map();
  for (const row of open) {
    const terms = named.get(row.personId);
    if (terms && sameTerms(terms, row.terms)) continue;
    people.put({
      ...row,
      ...(terms ? { terms } : { endedOn: date }),
    } as unknown as ModuleRow);
    if (!terms) learn(api, row.personId, input.key, "ended", input.lawId);
  }
  const holding = new Set(open.map((row) => row.personId));
  for (const [personId, terms] of named) {
    if (holding.has(personId)) continue;
    const row: PersonReach = {
      id: `${input.key}|${personId}|${date}`,
      key: input.key,
      personId,
      effect: input.effect,
      kind: input.kind,
      lawId: input.lawId,
      since: date,
      endedOn: null,
      terms,
    };
    people.put(row as unknown as ModuleRow);
    learn(api, personId, input.key, input.effect, input.lawId);
  }
  const orgs = reachTable(api, "organizations");
  const openOrgs = orgs.query("byKey", [
    input.key,
    null,
  ]) as unknown as OrganizationReach[];
  const bound = input.reach?.organizations ?? new Map();
  for (const row of openOrgs) {
    const terms = bound.get(row.organizationId);
    if (terms && sameTerms(terms, row.terms)) continue;
    orgs.put({
      ...row,
      ...(terms ? { terms } : { endedOn: date }),
    } as unknown as ModuleRow);
  }
  const boundNow = new Set(openOrgs.map((row) => row.organizationId));
  for (const [organizationId, terms] of bound) {
    if (boundNow.has(organizationId)) continue;
    orgs.put({
      id: `${input.key}|${organizationId}|${date}`,
      key: input.key,
      organizationId,
      effect: input.effect,
      kind: input.kind,
      lawId: input.lawId,
      since: date,
      endedOn: null,
      terms,
    } satisfies OrganizationReach as unknown as ModuleRow);
  }
  const groupId = `${input.key}|${input.placeId}`;
  const prior = getRow<GroupReach>(api, "groups", groupId);
  if (input.reach || prior)
    putRow(api, "groups", {
      id: groupId,
      key: input.key,
      placeId: input.placeId,
      effect: input.effect,
      lawId: input.lawId,
      reached: input.reach?.counted ?? 0,
      of: input.reach?.countedOf ?? prior?.of ?? 0,
      since: input.reach
        ? prior && prior.endedOn === null
          ? prior.since
          : date
        : (prior?.since ?? date),
      endedOn: input.reach ? null : (prior?.endedOn ?? date),
      terms: input.reach?.terms ?? prior?.terms ?? {},
    } satisfies GroupReach);
}

function learn(
  api: CoreAPI,
  personId: string,
  key: string,
  value: string,
  lawId: string,
): void {
  if (!api.state.people.has(personId)) return;
  api.observe(personId, {
    key: `law-reach:${key}`,
    value,
    learnedAt: api.state.date,
    sourceId: lawId,
    access: "public",
  });
}

export interface ActiveRow {
  readonly id: string;
  readonly lawId: string;
  readonly level: string;
  readonly since: string;
}

/** Mark a policy in force (or not) for the monthly review. */
export function setActive(api: CoreAPI, row: ActiveRow | null, key: string) {
  const table = reachTable(api, "active");
  if (!row) {
    table.remove(key);
    return;
  }
  table.put(row as unknown as ModuleRow);
  scheduleReview(api);
}

const source = (api: CoreAPI): Source => ({
  tag: "SOURCED",
  citation:
    "Laws in force for the town (laws module); reach re-checked from residents' records",
  asOf: api.state.date,
});

function scheduleReview(api: CoreAPI): void {
  const calendar = api.moduleCalendar(REACH_B_MODULE_ID);
  if (reachTable(api, "taken").get("review:next")) return;
  const date = addMonths(api.state.date);
  calendar.schedule({
    key: `review:${date}`,
    date,
    kind: REVIEW_KIND,
    source: source(api),
    sourceRecordIds: [REVIEW_KIND],
  });
  putRow(api, "taken", { id: "review:next", key: "review", date });
}

/** Eligibility is refreshed in the calendar phase, before accounts settle a benefit payday. */
export function scheduleBenefitReview(api: CoreAPI, date: string): void {
  const calendar = api.moduleCalendar(REACH_B_MODULE_ID);
  const key = `benefit-review:${date}`;
  if (date <= api.state.date || calendar.get(key)) return;
  calendar.schedule({
    key,
    date,
    kind: REVIEW_KIND,
    source: source(api),
    sourceRecordIds: [REVIEW_KIND],
  });
}

function runReview(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== REVIEW_KIND) return;
  if (work.key.startsWith("benefit-review:")) {
    review?.(api);
    if (
      reachTable(api, "taken")
        .rows()
        .some((row) => String(row.key).startsWith("benefit|"))
    )
      scheduleBenefitReview(api, addMonths(api.state.date));
    return;
  }
  reachTable(api, "taken").remove("review:next");
  review?.(api);
  if (reachTable(api, "active").rows().length) scheduleReview(api);
}
