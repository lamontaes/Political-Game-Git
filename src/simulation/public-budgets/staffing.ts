import { hasLifePathCredential } from "../life-paths2";
import { recordWorkStatus } from "../life";
import { organizationClosingAt, organizationProfileAt } from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import type {
  EducationProgramKind,
  EntityId,
  OrganizationClassification,
  World,
  WorkStatusRecord,
} from "../types";
import {
  fillTownJobs,
  laborStatus,
  townOrganizationsOf,
  townResidents,
} from "../living-world/town-employment";
import type { Resident } from "../living-world/town-employment";
import { TOWN_JOB_END_REASONS } from "../living-world/town-labor-market";
import type { TownJob } from "../living-world/town-labor-market";
import { CRUNCH46_PROVISIONAL_POLICY } from "../macro-economy/policy";
import { nominalEconomyIndex } from "./fiscal";
import { servingGovernment } from "./opening";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";
import type {
  BudgetProgram,
  PublicBudgetGovernment,
  StaffingBaseline,
} from "./store";

/**
 * Budgets reach people: the watched town's police officers and teachers are
 * the positions its budgets fund.
 *
 * The town's staff on the first day it is staffed from a budget are the
 * funded positions at that day's funding. From then on the funded count moves
 * with the program's real funding: the adopted amount after any mid-year cut,
 * in the economy of the year it was adopted (`nominalEconomyIndex`), so a
 * budget that only keeps up with prices and pay funds the same staff. When the
 * funded count rises, the town hires; when it falls, it lays off.
 *
 * - Police follow the police line of the government that serves the town: its
 *   own city, or else its county, Puerto Rico municipio, consolidated
 *   government, New England town or state (`servingGovernment`).
 * - Teachers follow the state's school line. The school districts that employ
 *   teachers are not governments the world holds yet, and the state is their
 *   largest single funder in the game's books.
 *
 * Layoffs go by seniority, the newest hire first, as police and teacher
 * contracts and many state teacher-layoff laws order them. Hiring recalls
 * those laid off from the same employer first, the most recent first; then
 * the town's job seekers who meet the job's age and credential, in a fixed
 * order until applicants are compared (HARDWIRED, below). A teacher's
 * bachelor's degree is checked wherever the person's schooling is on record.
 */

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
    // Every state licenses public school teachers, and every license
    // requires a bachelor's degree.
    credential: "postsecondary:bachelors-degree",
  },
];

/** The budget that funds a program in this town, or null. */
export function fundingGovernment(
  world: World,
  town: EntityId,
  funder: StaffedProgram["funder"],
): PublicBudgetGovernment | null {
  const store = world.publicBudgets;
  const place = lifePlaceByJurisdictionId(town);
  const stateKey = place?.stateJurisdictionKey;
  if (!store || !place?.sourceGeoid || !stateKey) return null;
  const find = (key: string) =>
    store.governments.find((government) => government.key === key) ?? null;
  if (funder === "state") return find(stateKey);
  const own = find(`place:${place.sourceGeoid}`);
  if (own) return own;
  const serving = servingGovernment(place.sourceGeoid, stateKey, town);
  return typeof serving === "string" ? null : find(serving.key);
}

/**
 * A program's funding in the government's current year, after any mid-year
 * cut, divided by the economy index the year was adopted in. The year the
 * world opened in was adopted before the game began, so its index is the one
 * on the day the town was first staffed from it (kept in `baseline`), or
 * today's.
 */
export function realProgramFunding(
  world: World,
  government: PublicBudgetGovernment,
  program: BudgetProgram,
  baseline: StaffingBaseline | null = null,
): { readonly funding: number; readonly economyIndex: number } | null {
  const year = government.years.at(-1);
  if (!year) return null;
  const planned = year.appropriations[BUDGET_PROGRAMS.indexOf(program)] ?? 0;
  const state = stateJurisdictionForKey(government.stateKey);
  const economyIndex =
    year.economyAtAdoption ??
    (baseline?.yearStartsOn === year.startsOn
      ? baseline.economyIndex
      : state
        ? (nominalEconomyIndex(world, state.id, world.currentDate) ??
          openingEconomyIndex(world))
        : null);
  if (!economyIndex) return null;
  return {
    funding: (planned * (1 - government.cut)) / economyIndex,
    economyIndex,
  };
}

/**
 * Before the economy's first monthly record it stands at its month-zero
 * state (`macro-economy/producer.ts`, `startState`): the baseline output
 * index at a price index of 100.
 */
function openingEconomyIndex(world: World): number | null {
  return world.macroEconomy
    ? CRUNCH46_PROVISIONAL_POLICY.baseline.realOutputIndex * 100
    : null;
}

function latestRoleTitles(world: World): ReadonlyMap<EntityId, string> {
  const titles = new Map<EntityId, string>();
  for (const row of world.history.workRoles)
    if (row.effectiveAt <= world.currentDate)
      titles.set(row.workRelationshipId, row.title);
  return titles;
}

/**
 * Everyone living in the town who holds the program's funded role at one of
 * its funded employers today, however the job was first written: at the
 * opening, in an earlier life, or by the town's job market.
 */
export function fundedStaff(
  world: World,
  town: EntityId,
  staffed: StaffedProgram,
): readonly TownJob[] {
  const titles = latestRoleTitles(world);
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= world.currentDate)
      latest.set(status.workRelationshipId, status);
  const classifications = new Map<EntityId, boolean>();
  const funds = (organizationId: EntityId) => {
    let found = classifications.get(organizationId);
    if (found === undefined) {
      found =
        organizationProfileAt(world, organizationId)?.classification ===
        staffed.classification;
      classifications.set(organizationId, found);
    }
    return found;
  };
  const jobs: TownJob[] = [];
  for (const relationship of world.history.workRelationships) {
    const status = latest.get(relationship.id);
    if (status?.status !== "active") continue;
    if (titles.get(relationship.id) !== staffed.role) continue;
    if (world.people[relationship.personId]?.homeJurisdictionId !== town)
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

/**
 * Staff the watched town's funded public jobs to what its budgets fund
 * today. `round` names the review, so its records are keyed by it.
 */
export function staffPublicJobs(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): World {
  let next = world;
  for (const staffed of STAFFED_PROGRAMS)
    next = staffProgram(next, town, playerPersonId, round, staffed);
  return next;
}

function staffProgram(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
  staffed: StaffedProgram,
): World {
  const store = world.publicBudgets;
  const government = fundingGovernment(world, town, staffed.funder);
  if (!store || !government) return world;
  const baseline =
    (store.staffing ?? []).find(
      (row) =>
        row.town === town &&
        row.program === staffed.program &&
        row.governmentKey === government.key,
    ) ?? null;
  const real = realProgramFunding(world, government, staffed.program, baseline);
  if (!real || real.funding <= 0) return world;
  const funding = real.funding;
  const staff = fundedStaff(world, town, staffed);
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
      since: world.currentDate,
    };
    return {
      ...world,
      publicBudgets: { ...store, staffing: [...(store.staffing ?? []), row] },
    };
  }
  if (baseline.headcount === 0 || baseline.realFunding <= 0) return world;
  const funded = Math.round(
    (baseline.headcount * funding) / baseline.realFunding,
  );
  const key = `${PUBLIC_BUDGETS_VERSION}:staffing:${town}:${staffed.program}:${round}`;
  if (funded < staff.length)
    return layOff(world, staff, funded, key, playerPersonId);
  if (funded > staff.length)
    return hire(
      world,
      town,
      playerPersonId,
      staffed,
      funded - staff.length,
      `budget-${staffed.program}-${round}`,
    );
  return world;
}

function layOff(
  world: World,
  staff: readonly TownJob[],
  funded: number,
  key: string,
  playerPersonId: EntityId | null,
): World {
  const relationships = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  // Seniority: the newest hire goes first.
  // The player's own job is the player's career to decide, never this
  // review's (HARDWIRED): the next newest goes instead.
  const newestFirst = [...staff]
    .filter((job) => job.personId !== playerPersonId)
    .sort((a, b) => {
      const left = relationships.get(a.relationshipId)!;
      const right = relationships.get(b.relationshipId)!;
      return (
        right.startedAt.localeCompare(left.startedAt) ||
        right.sequence - left.sequence
      );
    });
  let next = world;
  for (const job of newestFirst.slice(0, staff.length - funded))
    next = recordWorkStatus(next, {
      stableKey: `${key}:end:${job.relationshipId}`,
      workRelationshipId: job.relationshipId,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      supersedesStatusId: job.status.id,
      provenance: { kind: "generated", generatorKey: PUBLIC_BUDGETS_VERSION },
    });
  return next;
}

function hire(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  staffed: StaffedProgram,
  openings: number,
  round: string,
): World {
  const employers = townOrganizationsOf(
    world,
    town,
    staffed.classification,
  ).filter((id) => !organizationClosingAt(world, id));
  if (employers.length === 0) return world;
  const today = world.currentDate;
  const latest = new Map<
    EntityId,
    { status: string; reason: string | null; on: string }
  >();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= today)
      latest.set(row.workRelationshipId, {
        status: row.status,
        reason: row.reason,
        on: row.effectiveAt,
      });
  const working = new Set<EntityId>();
  // When each person was last laid off by one of these employers.
  const laidOffHere = new Map<EntityId, string>();
  const employerSet = new Set(employers);
  for (const relationship of world.history.workRelationships) {
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
  // The town's generated residents carry no schooling record, so the degree
  // is checked only for people whose schooling is written; the rest are held
  // to the rule the town itself staffs by (town-employment.ts, "Teacher").
  const schooled = new Set(
    world.history.educationEnrollments.map((row) => row.personId),
  );
  const eligible = townResidents(world, town).filter((resident) => {
    if (resident.personId === playerPersonId) return false;
    if (working.has(resident.personId)) return false;
    if (resident.age < staffed.minAge) return false;
    if (
      staffed.credential &&
      schooled.has(resident.personId) &&
      !hasLifePathCredential(world, resident.personId, staffed.credential)
    )
      return false;
    if (laidOffHere.has(resident.personId)) return true;
    const status = laborStatus(world, resident);
    return status === "looking-for-work" || status === "employed";
  });
  // Recall first, the most recently laid off first; then the rest in a fixed
  // order (HARDWIRED until applicants are compared).
  const chosen = [...eligible]
    .sort((a, b) => {
      const left = laidOffHere.get(a.personId) ?? "";
      const right = laidOffHere.get(b.personId) ?? "";
      return right.localeCompare(left) || a.personId.localeCompare(b.personId);
    })
    .slice(0, openings);
  // Each hire goes to the employer with the fewest in the role.
  const staffAt = new Map<EntityId, number>(employers.map((id) => [id, 0]));
  const relationships = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  for (const job of fundedStaff(world, town, staffed)) {
    const at = relationships.get(job.relationshipId)?.organizationId;
    if (at && staffAt.has(at)) staffAt.set(at, staffAt.get(at)! + 1);
  }
  let next = world;
  for (const resident of chosen) {
    const [at] = [...staffAt.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
    )[0]!;
    next = fillTownJobs(next, town, [resident as Resident], {
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
