/** Retained raw resident/recorded job/labor/turnover/hourly-pay readers. Life-status frontiers are separately owned raw receipts. */
import { ageOnDate } from "../../simulation/dates";
import { macroConditionsAt as macroOf } from "./macro-readings";
import {
  growingIndex,
  recordsWithFieldValue,
  type GrowingIndexKind,
} from "./raw-record-index";
import type {
  World,
  EntityId,
  IsoDate,
  WorkStatusRecord,
  WorkRoleRecord,
  ResourceFlow,
  ResourceFlowTermsRecord,
} from "../../simulation/types";
import type * as life from "../../simulation/life-queries";
import type { MacroScopeKey } from "../../simulation/macro-economy/types";
export interface LaborReadingFacts {
  readonly onDate: IsoDate;
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "personDeaths"
    | "educationEnrollments"
    | "householdMemberships"
    | "partnerships"
    | "workRelationships"
    | "workStatuses"
    | "workRoles"
    | "resourceFlows"
    | "resourceFlowTerms"
  >;
  readonly people: World["people"];
  readonly personOrder: World["personOrder"];
  readonly macroEconomy: World["macroEconomy"];
  readonly work: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.activeWorkRelationshipsAt>
  >;
  readonly enrollment: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.activeEducationEnrollmentsAt>
  >;
  readonly care: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.activeCareResponsibilitiesAt>
  >;
  readonly workHistory: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.workRelationshipHistoryForPerson>
  >;
  readonly statusHistory: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.workStatusHistory>
  >;
}
function requireReceipt<V>(map: ReadonlyMap<EntityId, V>, id: EntityId) {
  if (!map.has(id)) throw Error("Missing life record frontier: " + id);
  return map.get(id)!;
}
function activeWorkRelationshipsAt(facts: LaborReadingFacts, id: EntityId) {
  return requireReceipt(facts.work, id);
}
function activeEducationEnrollmentsAt(facts: LaborReadingFacts, id: EntityId) {
  return requireReceipt(facts.enrollment, id);
}
function activeCareResponsibilitiesAt(facts: LaborReadingFacts, id: EntityId) {
  return requireReceipt(facts.care, id);
}
function workRelationshipHistoryForPerson(
  facts: LaborReadingFacts,
  id: EntityId,
) {
  return requireReceipt(facts.workHistory, id);
}
function workStatusHistory(facts: LaborReadingFacts, id: EntityId) {
  return requireReceipt(facts.statusHistory, id);
}
function macroConditionsAt(
  facts: LaborReadingFacts,
  ...args: Parameters<typeof macroOf> extends [unknown, ...infer R] ? R : never
) {
  return macroOf(
    { months: facts.macroEconomy?.months ?? [], releases: [] },
    ...args,
  );
}
const macroScopeForJurisdiction = (id: string): MacroScopeKey =>
  `jurisdiction:${id}`;
export const TOWN_EMPLOYMENT_VERSION = "town-employment-v1";
export const WORKING_AGE_MIN = 18;
export const WORKING_AGE_MAX = 66;
export type TownLaborStatus =
  "employed" | "student" | "retired" | "parent-at-home" | "looking-for-work";
export interface Resident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}
// stopgapId: "economy.labor-eligibility-label"
export function laborStatus(
  facts: LaborReadingFacts,
  resident: Resident,
): TownLaborStatus {
  if (activeWorkRelationshipsAt(facts, resident.personId).length > 0)
    return "employed";
  if (activeEducationEnrollmentsAt(facts, resident.personId).length > 0)
    return "student";
  if (
    resident.parentOfYoungChild &&
    activeCareResponsibilitiesAt(facts, resident.personId).some(
      ({ state }) => state.share === "primary",
    )
  )
    return "parent-at-home";
  return "employed";
}
// stopgapId: "economy.labor-resident-age-history-frontier"
export function townResidents(
  facts: LaborReadingFacts,
  town: EntityId,
): readonly Resident[] {
  const dead = new Set(facts.records.personDeaths.map((row) => row.personId));
  const enrolled = new Set(
    facts.records.educationEnrollments.map((row) => row.personId),
  );
  const householdOf = new Map<EntityId, EntityId[]>();
  for (const membership of facts.records.householdMemberships) {
    const list = householdOf.get(membership.householdId) ?? [];
    list.push(membership.personId);
    householdOf.set(membership.householdId, list);
  }
  const youngChildHouseholds = new Set<EntityId>();
  const partnered = new Set(
    facts.records.partnerships.flatMap((row) => row.personIds),
  );
  const householdsOf = new Map<EntityId, EntityId[]>();
  for (const [household, members] of householdOf)
    for (const member of members) {
      const person = facts.people[member];
      if (person && ageOnDate(person.birthDate, facts.onDate) < 6)
        youngChildHouseholds.add(household);
      const list = householdsOf.get(member) ?? [];
      list.push(household);
      householdsOf.set(member, list);
    }
  const residents: Resident[] = [];
  for (const personId of facts.personOrder) {
    const person = facts.people[personId];
    if (!person || person.homeJurisdictionId !== town || dead.has(personId))
      continue;
    const age = ageOnDate(person.birthDate, facts.onDate);
    if (age < WORKING_AGE_MIN || age > WORKING_AGE_MAX) continue;
    residents.push({
      personId,
      age,
      enrolled: enrolled.has(personId),
      parentOfYoungChild:
        partnered.has(personId) &&
        (householdsOf.get(personId) ?? []).some((household) =>
          youngChildHouseholds.has(household),
        ),
    });
  }
  return residents;
}
export function activeWorkers(facts: LaborReadingFacts): ReadonlySet<EntityId> {
  const personOf = new Map(
    facts.records.workRelationships.map((row) => [row.id, row.personId]),
  );
  const latest = new Map<EntityId, string>();
  for (const row of facts.records.workStatuses)
    if (row.effectiveAt <= facts.onDate)
      latest.set(row.workRelationshipId, row.status);
  const working = new Set<EntityId>();
  for (const [relationshipId, status] of latest)
    if (status === "active") working.add(personOf.get(relationshipId)!);
  return working;
}
export interface TownMeasureReading {
  readonly value: number | null;
  readonly basis: number;
}
const unknown: TownMeasureReading = { value: null, basis: 0 };
export function townUnemploymentRate(
  facts: LaborReadingFacts,
  town: EntityId,
): TownMeasureReading {
  const working = activeWorkers(facts);
  let force = 0;
  let unemployed = 0;
  for (const resident of townResidents(facts, town)) {
    const status = laborStatus(facts, resident);
    if (status !== "employed" && status !== "looking-for-work") continue;
    force += 1;
    if (!working.has(resident.personId)) unemployed += 1;
  }
  if (force === 0) return unknown;
  return { value: (100 * unemployed) / force, basis: force };
}
export function townMedianHourlyPay(
  facts: LaborReadingFacts,
  town: EntityId,
): TownMeasureReading {
  const rates = [...townHourlyPayCents(facts, town)].sort((a, b) => a - b);
  if (rates.length === 0) return unknown;
  const middle = Math.floor(rates.length / 2);
  const value =
    rates.length % 2 === 1
      ? rates[middle]!
      : Math.round((rates[middle - 1]! + rates[middle]!) / 2);
  return { value, basis: rates.length };
}
export const TOWN_PAY_VERSION = "town-pay-v2";
const PAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:job-pay:`;
export type TownPayPeriod = "weekly" | "biweekly" | "semimonthly" | "monthly";
const PERIODS_PER_YEAR: Readonly<Record<TownPayPeriod, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
// stopgapId: "economy.labor-pay-history-frontier"
function latestRoles(
  facts: LaborReadingFacts,
): ReadonlyMap<EntityId, WorkRoleRecord> {
  const roles = new Map<EntityId, WorkRoleRecord>();
  for (const role of facts.records.workRoles)
    roles.set(role.workRelationshipId, role);
  return roles;
}
export function weeklyHoursOf(role: WorkRoleRecord): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
}
const PAY_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (flow.stableKey.startsWith(PAY_KEY_PREFIX)) flows.push(flow);
  },
};
function townPayFlows(facts: LaborReadingFacts): readonly ResourceFlow[] {
  return growingIndex(PAY_FLOWS, facts.records.resourceFlows);
}
function termsByPayFlow(
  facts: LaborReadingFacts,
): ReadonlyMap<EntityId, readonly ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, readonly ResourceFlowTermsRecord[]>();
  for (const flow of townPayFlows(facts)) {
    const terms = recordsWithFieldValue(
      facts.records.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    );
    if (terms.length > 0) byFlow.set(flow.id, terms);
  }
  return byFlow;
}
function termsOn(
  history: readonly ResourceFlowTermsRecord[],
  date: IsoDate,
): ResourceFlowTermsRecord | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1)
    if (history[index]!.effectiveAt <= date) return history[index];
  return undefined;
}
interface PayNote {
  readonly period: TownPayPeriod;
  readonly phase: number;
}
function payNoteOf(cadenceKind: string): PayNote | null {
  const match =
    /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
      cadenceKind,
    );
  if (!match) return null;
  return {
    period: match[1] as TownPayPeriod,
    phase: Number(match[2] ?? 0),
  };
}
export function townHourlyPayCents(
  facts: LaborReadingFacts,
  town: EntityId,
): readonly number[] {
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}:job:`;
  const latest = new Map<EntityId, string>();
  for (const status of facts.records.workStatuses)
    if (status.effectiveAt <= facts.onDate)
      latest.set(status.workRelationshipId, status.status);
  const held = new Set(
    facts.records.workRelationships
      .filter(
        (work) =>
          work.stableKey.startsWith(prefix) && latest.get(work.id) === "active",
      )
      .map((work) => work.id),
  );
  if (held.size === 0) return [];
  const roles = latestRoles(facts);
  const terms = termsByPayFlow(facts);
  const rates: number[] = [];
  for (const flow of facts.records.resourceFlows) {
    if (!flow.stableKey.startsWith(PAY_KEY_PREFIX)) continue;
    const basis = flow.basisReference;
    if (basis?.kind !== "work" || !held.has(basis.workRelationshipId)) continue;
    const workId = basis.workRelationshipId;
    const role = roles.get(workId);
    const current = termsOn(terms.get(flow.id) ?? [], facts.onDate);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!role || !current || !note || current.status === "ended") continue;
    const hours = weeklyHoursOf(role);
    if (hours <= 0) continue;
    rates.push(
      Math.round(
        (current.amount.minorUnits * PERIODS_PER_YEAR[note.period]) /
          (52 * hours),
      ),
    );
  }
  return rates;
}
export const TOWN_JOB_TURNOVER = {
  quitPerQuarter: 3 * 0.02,
  layoffPerQuarter: 3 * 0.011,
  hirePerQuarter: 0.55,
  referenceUnemploymentPct: 4.2,
} as const;
export const TOWN_JOB_END_REASONS = {
  quit: "labor:quit",
  laidOff: "labor:laid-off",
  businessClosed: "labor:business-closed",
  retired: "labor:retired",
  died: "labor:died",
} as const;
export const TOWN_JOB_LOSS_REASONS: ReadonlySet<string> = new Set([
  TOWN_JOB_END_REASONS.laidOff,
  TOWN_JOB_END_REASONS.businessClosed,
]);
export function jobsLostBy(
  facts: LaborReadingFacts,
  personId: EntityId,
  through = facts.onDate,
): readonly WorkStatusRecord[] {
  return workRelationshipHistoryForPerson(facts, personId).flatMap(
    (relationship) =>
      workStatusHistory(facts, relationship.id).filter(
        (status) =>
          status.status === "ended" &&
          status.reason !== null &&
          TOWN_JOB_LOSS_REASONS.has(status.reason) &&
          status.effectiveAt <= through,
      ),
  );
}
// stopgapId: "economy.labor-unemployment-pressure-clamp"
export function townUnemploymentPressure(
  facts: LaborReadingFacts,
  town: EntityId,
): number {
  const local = macroConditionsAt(
    facts,
    macroScopeForJurisdiction(town),
    facts.onDate,
  );
  const months = facts.macroEconomy?.months ?? [];
  let national: number | null = null;
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const month = months[index]!;
    if (month.scope === "national" && month.recordedAt <= facts.onDate) {
      national = month.unemploymentPct;
      break;
    }
  }
  const rate = local?.unemploymentPct ?? national;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return 1;
  return Math.min(
    3,
    Math.max(0.5, rate / TOWN_JOB_TURNOVER.referenceUnemploymentPct),
  );
}
