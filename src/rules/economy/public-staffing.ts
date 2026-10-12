/** Full retained funded staffing, seniority, recall/eligibility and employer balancing, delegating only to complete lifted hiring math. */
import type {
  World,
  EducationProgramKind,
  EntityId,
  OrganizationClassification,
  WorkStatusRecord,
} from "../../simulation/types";
import type {
  BudgetProgram,
  PublicBudgetGovernment,
  StaffingBaseline,
} from "../../simulation/public-budgets/store";
import type { TownJob } from "../../simulation/living-world/town-labor-market";
import type { recordTownJobLoss } from "../../simulation/living-world/town-labor-market";
import { BUDGET_PROGRAMS } from "./budget-policy";
import { CRUNCH46_PROVISIONAL_POLICY } from "./macro-policy";
import { nominalEconomyIndex as economyIndexOf } from "./budget-fiscal";
import {
  servingGovernment as serving,
  type BudgetGeographyViews,
} from "./budget-opening";
import {
  laborStatus as labor,
  townResidents as residents,
  TOWN_JOB_END_REASONS,
  type LaborReadingFacts,
} from "./labor-readings";
import {
  fillTownJobs as fill,
  townOrganizationsOf,
  type EmploymentFacts,
  type EmploymentRequest,
  type Resident,
} from "./employment";
import type { hasLifePathCredential as nativeCredential } from "../../simulation/life-paths2";
export const PUBLIC_BUDGETS_VERSION = "public-budgets-v1" as const;
export interface StaffingFacts extends EmploymentFacts {
  readonly macroEconomy: World["macroEconomy"];
  readonly labor: LaborReadingFacts;
  readonly budgetViews: BudgetGeographyViews;
  readonly credentials: ReadonlyMap<
    string,
    ReturnType<typeof nativeCredential>
  >;
}
export type StaffingRequest =
  | EmploymentRequest
  | {
      readonly kind: "recordTownJobLoss";
      readonly input: Parameters<typeof recordTownJobLoss>[1];
    }
  | {
      // STOPGAP: economy.staffing-baseline-public-receipt
      readonly kind: "recordStaffingBaseline";
      readonly row: StaffingBaseline;
    };
export const staffingSourceKey = (...keys: unknown[]) => JSON.stringify(keys);
function organizationProfileAt(facts: StaffingFacts, id: EntityId) {
  if (!facts.profiles.has(id)) throw Error("Missing staffing life profile");
  return facts.profiles.get(id)!;
}
function organizationClosingAt(facts: StaffingFacts, id: EntityId) {
  if (!facts.closings.has(id)) throw Error("Missing staffing life closing");
  return facts.closings.get(id)!;
}
function hasLifePathCredential(
  facts: StaffingFacts,
  id: EntityId,
  program: EducationProgramKind,
) {
  const key = staffingSourceKey(id, program);
  if (!facts.credentials.has(key)) throw Error("Missing staffing credential");
  return facts.credentials.get(key)!;
}
function lifePlaceByJurisdictionId(facts: StaffingFacts, id: EntityId) {
  if (!facts.places.has(id)) throw Error("Missing staffing raw place");
  return facts.places.get(id)!;
}
function stateJurisdictionForKey(facts: StaffingFacts, key: string) {
  return facts.budgetViews.stateJurisdictionForKey(key);
}
function servingGovernment(
  facts: StaffingFacts,
  geoid: string,
  key: string,
  id: EntityId,
) {
  return serving({ views: facts.budgetViews }, geoid, key, id);
}
function nominalEconomyIndex(
  facts: StaffingFacts,
  id: EntityId,
  date: World["currentDate"],
) {
  return economyIndexOf({ months: facts.macroEconomy?.months ?? [] }, id, date);
}
function laborStatus(facts: StaffingFacts, resident: Resident) {
  return labor(facts.labor, resident);
}
function townResidents(facts: StaffingFacts, town: EntityId) {
  return residents(facts.labor, town);
}
function* fillTownJobs(
  facts: StaffingFacts,
  ...args: Parameters<typeof fill> extends [unknown, ...infer R] ? R : never
): Generator<StaffingRequest, StaffingFacts, StaffingFacts> {
  const gen = fill(facts, ...args);
  let step = gen.next();
  while (!step.done) {
    facts = yield step.value;
    step = gen.next(facts);
  }
  return facts;
}
interface StaffedProgram {
  readonly program: BudgetProgram;
  readonly funder: "serving-local" | "state";
  readonly workplace: string;
  readonly classification: OrganizationClassification;
  readonly role: string;
  readonly minAge: number;
  readonly credential: EducationProgramKind | null;
}
export const STAFFED_PROGRAMS: readonly StaffedProgram[] = [
  {
    program: "police",
    funder: "serving-local",
    workplace: "police",
    classification: "service:police",
    role: "Police officer",
    minAge: 21,
    credential: null,
  },
  {
    program: "schools",
    funder: "state",
    workplace: "public-school",
    classification: "service:school",
    role: "Teacher",
    minAge: 22,
    credential: "postsecondary:bachelors-degree",
  },
];
// STOPGAP: economy.staffing-state-geoid-guard
export function fundingGovernment(
  facts: StaffingFacts,
  town: EntityId,
  funder: StaffedProgram["funder"],
): PublicBudgetGovernment | null {
  const store = facts.publicBudgets;
  const place = lifePlaceByJurisdictionId(facts, town);
  const stateKey = place?.stateJurisdictionKey;
  if (!store || !place?.sourceGeoid || !stateKey) return null;
  const find = (key: string) =>
    store.governments.find((government) => government.key === key) ?? null;
  if (funder === "state") return find(stateKey);
  const own = find(`place:${place.sourceGeoid}`);
  if (own) return own;
  const serving = servingGovernment(facts, place.sourceGeoid, stateKey, town);
  return typeof serving === "string" ? null : find(serving.key);
}
export function realProgramFunding(
  facts: StaffingFacts,
  government: PublicBudgetGovernment,
  program: BudgetProgram,
  baseline: StaffingBaseline | null = null,
): {
  readonly funding: number;
  readonly economyIndex: number;
} | null {
  const year = government.years.at(-1);
  if (!year) return null;
  const planned = year.appropriations[BUDGET_PROGRAMS.indexOf(program)] ?? 0;
  const state = stateJurisdictionForKey(facts, government.stateKey);
  const economyIndex =
    year.economyAtAdoption ??
    (baseline?.yearStartsOn === year.startsOn
      ? baseline.economyIndex
      : state
        ? (nominalEconomyIndex(facts, state.id, facts.currentDate) ??
          openingEconomyIndex(facts))
        : null);
  if (!economyIndex) return null;
  return {
    funding: (planned * (1 - government.cut)) / economyIndex,
    economyIndex,
  };
}
function openingEconomyIndex(facts: StaffingFacts): number | null {
  return facts.macroEconomy
    ? CRUNCH46_PROVISIONAL_POLICY.baseline.realOutputIndex * 100
    : null;
}
function latestRoleTitles(facts: StaffingFacts): ReadonlyMap<EntityId, string> {
  const titles = new Map<EntityId, string>();
  for (const row of facts.records.workRoles)
    if (row.effectiveAt <= facts.currentDate)
      titles.set(row.workRelationshipId, row.title);
  return titles;
}
export function fundedStaff(
  facts: StaffingFacts,
  town: EntityId,
  staffed: StaffedProgram,
): readonly TownJob[] {
  const titles = latestRoleTitles(facts);
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of facts.records.workStatuses)
    if (status.effectiveAt <= facts.currentDate)
      latest.set(status.workRelationshipId, status);
  const classifications = new Map<EntityId, boolean>();
  const funds = (organizationId: EntityId) => {
    let found = classifications.get(organizationId);
    if (found === undefined) {
      found =
        organizationProfileAt(facts, organizationId)?.classification ===
        staffed.classification;
      classifications.set(organizationId, found);
    }
    return found;
  };
  const jobs: TownJob[] = [];
  for (const relationship of facts.records.workRelationships) {
    const status = latest.get(relationship.id);
    if (status?.status !== "active") continue;
    if (titles.get(relationship.id) !== staffed.role) continue;
    if (facts.people[relationship.personId]?.homeJurisdictionId !== town)
      continue;
    if (!relationship.organizationId || !funds(relationship.organizationId))
      continue;
    jobs.push({
      relationshipId: relationship.id,
      personId: relationship.personId,
      status,
    });
  }
  return jobs;
}
export function* staffPublicJobs(
  facts: StaffingFacts,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): Generator<StaffingRequest, StaffingFacts, StaffingFacts> {
  let next = facts;
  for (const staffed of STAFFED_PROGRAMS)
    next = yield* staffProgram(next, town, playerPersonId, round, staffed);
  return next;
}
// STOPGAP: economy.staffing-baseline-rounding
function* staffProgram(
  facts: StaffingFacts,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
  staffed: StaffedProgram,
): Generator<StaffingRequest, StaffingFacts, StaffingFacts> {
  const store = facts.publicBudgets;
  const government = fundingGovernment(facts, town, staffed.funder);
  if (!store || !government) return facts;
  const baseline =
    (store.staffing ?? []).find(
      (row) =>
        row.town === town &&
        row.program === staffed.program &&
        row.governmentKey === government.key,
    ) ?? null;
  const real = realProgramFunding(facts, government, staffed.program, baseline);
  if (!real || real.funding <= 0) return facts;
  const funding = real.funding;
  const staff = fundedStaff(facts, town, staffed);
  if (!baseline) {
    const row: StaffingBaseline = {
      town,
      program: staffed.program,
      governmentKey: government.key,
      workplace: staffed.workplace,
      role: staffed.role,
      headcount: staff.length,
      realFunding: funding,
      yearStartsOn: government.years.at(-1)!.startsOn,
      economyIndex: real.economyIndex,
      since: facts.currentDate,
    };
    return yield {
      kind: "recordStaffingBaseline",
      row: row,
    };
  }
  if (baseline.headcount === 0 || baseline.realFunding <= 0) return facts;
  const funded = Math.round(
    (baseline.headcount * funding) / baseline.realFunding,
  );
  const key = `${PUBLIC_BUDGETS_VERSION}:staffing:${town}:${staffed.program}:${round}`;
  if (funded < staff.length) return yield* layOff(facts, staff, funded, key);
  if (funded > staff.length)
    return yield* hire(
      facts,
      town,
      playerPersonId,
      staffed,
      funded - staff.length,
      `budget-${staffed.program}-${round}`,
    );
  return facts;
}
function* layOff(
  facts: StaffingFacts,
  staff: readonly TownJob[],
  funded: number,
  key: string,
): Generator<StaffingRequest, StaffingFacts, StaffingFacts> {
  const relationships = new Map(
    facts.records.workRelationships.map((row) => [row.id, row]),
  );
  const newestFirst = [...staff].sort((a, b) => {
    const left = relationships.get(a.relationshipId)!;
    const right = relationships.get(b.relationshipId)!;
    return (
      right.startedAt.localeCompare(left.startedAt) ||
      right.sequence - left.sequence
    );
  });
  let next = facts;
  for (const job of newestFirst.slice(0, staff.length - funded))
    next = yield {
      kind: "recordTownJobLoss",
      input: {
        stableKey: `${key}:end:${job.relationshipId}`,
        workRelationshipId: job.relationshipId,
        effectiveAt: facts.currentDate,
        status: "ended",
        reason: TOWN_JOB_END_REASONS.laidOff,
        supersedesStatusId: job.status.id,
        provenance: { kind: "generated", generatorKey: PUBLIC_BUDGETS_VERSION },
      },
    };
  return next;
}
// STOPGAP: economy.staffing-seniority-recall
function* hire(
  facts: StaffingFacts,
  town: EntityId,
  playerPersonId: EntityId | null,
  staffed: StaffedProgram,
  openings: number,
  round: string,
): Generator<StaffingRequest, StaffingFacts, StaffingFacts> {
  const employers = townOrganizationsOf(
    facts,
    town,
    staffed.classification,
  ).filter((id) => !organizationClosingAt(facts, id));
  if (employers.length === 0) return facts;
  const today = facts.currentDate;
  const latest = new Map<
    EntityId,
    {
      status: string;
      reason: string | null;
      on: string;
    }
  >();
  for (const row of facts.records.workStatuses)
    if (row.effectiveAt <= today)
      latest.set(row.workRelationshipId, {
        status: row.status,
        reason: row.reason,
        on: row.effectiveAt,
      });
  const working = new Set<EntityId>();
  const laidOffHere = new Map<EntityId, string>();
  const employerSet = new Set(employers);
  for (const relationship of facts.records.workRelationships) {
    const state = latest.get(relationship.id);
    if (state?.status === "active") working.add(relationship.personId);
    if (
      state?.status === "ended" &&
      state.reason === TOWN_JOB_END_REASONS.laidOff &&
      relationship.organizationId &&
      employerSet.has(relationship.organizationId)
    ) {
      const before = laidOffHere.get(relationship.personId);
      if (!before || state.on > before)
        laidOffHere.set(relationship.personId, state.on);
    }
  }
  const eligible = townResidents(facts, town).filter((resident) => {
    if (resident.personId === playerPersonId) return false;
    if (working.has(resident.personId)) return false;
    if (resident.age < staffed.minAge) return false;
    if (
      staffed.credential &&
      !hasLifePathCredential(facts, resident.personId, staffed.credential)
    )
      return false;
    if (laidOffHere.has(resident.personId)) return true;
    const status = laborStatus(facts, resident);
    return status === "looking-for-work" || status === "employed";
  });
  const chosen = [...eligible]
    .sort((a, b) => {
      const left = laidOffHere.get(a.personId) ?? "";
      const right = laidOffHere.get(b.personId) ?? "";
      return right.localeCompare(left) || a.personId.localeCompare(b.personId);
    })
    .slice(0, openings);
  const staffAt = new Map<EntityId, number>(employers.map((id) => [id, 0]));
  const relationships = new Map(
    facts.records.workRelationships.map((row) => [row.id, row]),
  );
  for (const job of fundedStaff(facts, town, staffed)) {
    const at = relationships.get(job.relationshipId)?.organizationId;
    if (at && staffAt.has(at)) staffAt.set(at, staffAt.get(at)! + 1);
  }
  let next = facts;
  for (const resident of chosen) {
    const [at] = [...staffAt.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
    )[0]!;
    next = yield* fillTownJobs(next, town, [resident as Resident], {
      round,
      into: {
        workplace: staffed.workplace,
        organizationId: at,
        role: staffed.role,
      },
    });
    staffAt.set(at, staffAt.get(at)! + 1);
  }
  return next;
}
