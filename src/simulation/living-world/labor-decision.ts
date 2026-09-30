/** Continuous time allocation. The coefficients describe a game model; the
 * empirical employment shares validate its totals and do not choose actors. */
export interface LaborDemandInput {
  readonly age: number;
  readonly householdMonthlyNeedsMinor: number;
  readonly otherHouseholdIncomeMinor: number;
  readonly expectedMonthlyPayMinor: number;
  readonly savingsMinor: number;
  readonly retirementMonthlyIncomeMinor: number;
  readonly schoolHours: number;
  readonly caregivingHours: number;
  readonly childcareMonthlyCostMinor: number;
  /** Zero to one: impaired health and physical demands of the actual job. */
  readonly healthBurden: number;
  readonly physicalDemand: number;
  /** Zero to one: recorded commitment and value orientation. */
  readonly workCommitment: number;
  readonly caregivingPreference: number;
  readonly employerHours: number;
}
export interface LaborDemand {
  readonly weeklyHours: number;
  readonly competingHours: Readonly<{
    school: number;
    retirement: number;
    caregiving: number;
  }>;
  readonly principalActivity: "work" | "student" | "retired" | "parent-at-home";
}
const unit = (value: number) => Math.max(0, Math.min(1, value));
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

/** More support reduces financial necessity continuously. Age carries no
 * retirement switch: eligibility, money, health and the job shape its hours.
 * The dominant activity names the allocation; it never rolls employment. */
export function laborDemand(input: LaborDemandInput): LaborDemand {
  const needs = Math.max(1, input.householdMonthlyNeedsMinor);
  const support = Math.max(0, input.otherHouseholdIncomeMinor);
  const ownPay = Math.max(1, input.expectedMonthlyPayMinor);
  const financialNecessity = needs / (needs + support);
  const commitment = unit(input.workCommitment);
  const schoolHoursNeeded = Math.max(0, input.schoolHours);
  const independentNeed =
    financialNecessity + (1 - financialNecessity) * commitment;
  const schoolReduction =
    schoolHoursNeeded / (schoolHoursNeeded + 40 * independentNeed);
  // Savings are a continuing source of support, amortized over remaining
  // retirement years rather than triggering retirement at a bank balance.
  const remainingYears = 5 + 20 * sigmoid((80 - input.age) / 8);
  const retirementResources =
    Math.max(0, input.retirementMonthlyIncomeMinor) +
    Math.max(0, input.savingsMinor) / (12 * remainingYears) +
    support;
  const coverage = retirementResources / (needs + retirementResources);
  const health = unit(input.healthBurden);
  const physical = unit(input.physicalDemand);
  const retirement =
    sigmoid(
      (input.age - (65 + 2 * (1 - physical) - 4 * health * physical)) / 3,
    ) *
    coverage *
    (1 - 0.2 * commitment);
  const childcareBurden =
    Math.max(0, input.childcareMonthlyCostMinor) /
    (ownPay + Math.max(0, input.childcareMonthlyCostMinor));
  const careDemand =
    Math.max(0, input.caregivingHours) /
    (Math.max(0, input.caregivingHours) + 40 * financialNecessity);
  const care =
    careDemand *
    (support / (needs + support)) *
    (0.5 + 0.5 * childcareBurden) *
    (0.5 + 0.5 * unit(input.caregivingPreference));
  const hours = Math.max(0, input.employerHours);
  const schoolHours = hours * schoolReduction;
  const retirementHours = (hours - schoolHours) * retirement;
  const careHours = (hours - schoolHours - retirementHours) * care;
  const weeklyHours =
    (hours - schoolHours - retirementHours - careHours) *
    (1 - 0.5 * health * physical);
  const allocation: readonly (readonly [
    LaborDemand["principalActivity"],
    number,
  ])[] = [
    ["work", weeklyHours],
    ["student", schoolHours],
    ["retired", retirementHours],
    ["parent-at-home", careHours],
  ];
  const principalActivity = [...allocation].sort((a, b) => b[1] - a[1])[0]![0];
  return {
    weeklyHours,
    competingHours: {
      school: schoolHours,
      retirement: retirementHours,
      caregiving: careHours,
    },
    principalActivity,
  };
}

import workResearch from "../../../data/research/labor/work-participation-2026.json" with { type: "json" };
import { monthlyIncomeByPerson } from "../resource-income";
import {
  householdMembershipsAt,
  peopleInHouseholdAt,
  activeWorkRelationshipsAt,
  assessLifeLoadAt,
  workRelationshipHistoryForPerson,
  workStatusHistory,
} from "../life-queries";
import { routineWeeklyLoad } from "../education-study-progression";
import { ageOnDate, daysBetween } from "../dates";
import { makeCurrencyCode } from "../resources";
import { resourcePositionAt } from "../resource-queries";
import {
  activeHealthEpisodes,
  latestHealthState,
} from "../crisis/health-queries";
import { annualPovertyLineMinor } from "../crisis/health-coverage";
import { primaryInsuranceAmountMinor } from "../public-benefit-formulas";
import { personTrait } from "../people-traits";
import { latestPersonalValuesForPerson } from "../queries";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";

export interface LaborResident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}
export interface ResidentLaborPlan {
  readonly input: LaborDemandInput;
  readonly demand: LaborDemand;
  readonly estimates: readonly string[];
}
interface CachedTownPlan {
  readonly expectedPay: number;
  readonly residentIds: ReadonlySet<EntityId>;
  readonly plans: ReadonlyMap<EntityId, ResidentLaborPlan>;
}
const PLANS = new WeakMap<World, Map<EntityId, CachedTownPlan>>();

/** Freeze household resources, settle unencumbered earners first, then other
 * members in stable order. Forecasts are never money transfers or benefits. */
export function townLaborPlan(
  world: World,
  town: EntityId,
  residents: readonly LaborResident[],
  expectedMonthlyPayMinor: number,
): ReadonlyMap<EntityId, ResidentLaborPlan> {
  let towns = PLANS.get(world);
  if (!towns) {
    towns = new Map();
    PLANS.set(world, towns);
  }
  const cached = towns.get(town);
  if (
    cached &&
    cached.expectedPay === expectedMonthlyPayMinor &&
    cached.residentIds.size === residents.length &&
    residents.every((row) => cached.residentIds.has(row.personId))
  )
    return cached.plans;
  const pay = new Map(monthlyIncomeByPerson(world, world.currentDate));
  const forecast = new Map(pay);
  const plans = new Map<EntityId, ResidentLaborPlan>();
  const jurisdiction = world.jurisdictions[town];
  const stateKey =
    lifePlaceByJurisdictionId(town)?.stateJurisdictionKey ??
    (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null) ??
    "";
  const stateName = STATES[stateKey.replace(/^US-/, "")]?.name;
  const prices = workResearch.childcare.rows.find(
    (row) => row.state === stateName && row.setting === "Center",
  );
  const childrenOf = new Map<EntityId, Set<EntityId>>();
  for (const kinship of world.history.kinshipRelationships) {
    if (
      !/parent-child$/.test(kinship.kind) ||
      kinship.establishedAt > world.currentDate
    )
      continue;
    const [a, b] = kinship.personIds;
    const personA = world.people[a],
      personB = world.people[b];
    if (!personA || !personB) continue;
    const [parent, child] =
      personA.birthDate <= personB.birthDate ? [a, b] : [b, a];
    const children = childrenOf.get(parent) ?? new Set<EntityId>();
    children.add(child);
    childrenOf.set(parent, children);
  }
  const dead = new Set(
    world.history.personDeaths
      .filter((row) => row.diedAt <= world.currentDate)
      .map((row) => row.personId),
  );
  const order = [...residents].sort(
    (a, b) =>
      Number(a.enrolled || a.parentOfYoungChild) -
        Number(b.enrolled || b.parentOfYoungChild) ||
      a.personId.localeCompare(b.personId),
  );
  for (const resident of order) {
    const estimates: string[] = [];
    const membership = householdMembershipsAt(world, resident.personId)[0];
    const members = membership
      ? peopleInHouseholdAt(world, membership.membership.householdId)
      : [resident.personId];
    const children = members
      .filter(
        (id) => childrenOf.get(resident.personId)?.has(id) && !dead.has(id),
      )
      .map((id) => world.people[id])
      .filter(
        (person) =>
          person && ageOnDate(person.birthDate, world.currentDate) < 5,
      );
    const youngest = children.length
      ? Math.min(
          ...children.map((person) =>
            ageOnDate(person!.birthDate, world.currentDate),
          ),
        )
      : null;
    const otherIncome = members
      .filter((id) => id !== resident.personId)
      .reduce((sum, id) => sum + (forecast.get(id) ?? 0), 0);
    const actualPay = pay.get(resident.personId);
    const expectedPay = actualPay ?? expectedMonthlyPayMinor;
    if (actualPay === undefined)
      estimates.push("offered pay from place wage average");
    const works = activeWorkRelationshipsAt(world, resident.personId);
    const occupation = works[0]?.role.occupationClassification ?? "";
    const physicalDemand = occupation.startsWith("trade:")
      ? 0.8
      : occupation.includes("nurse") || occupation.includes("care")
        ? 0.6
        : 0.15;
    estimates.push("job exertion from occupation class");
    const episodes = activeHealthEpisodes(world, resident.personId);
    const healthBurden = episodes.reduce((burden, episode) => {
      const limitation = latestHealthState(
        world,
        episode.id,
      )?.functionalLimitation;
      return Math.max(
        burden,
        limitation === "incapacitated" ? 1 : limitation === "limited" ? 0.6 : 0,
      );
    }, 0);
    const reliability = personTrait(world, resident.personId, "reliability");
    const commitment =
      reliability.recordId === null ? 0.5 : (reliability.value + 2) / 4;
    if (reliability.recordId === null)
      estimates.push("work commitment from average");
    const familyValue = latestPersonalValuesForPerson(
      world,
      resident.personId,
    ).find(
      (row) => world.mindCatalog.values[row.valueId]?.stableKey === "family",
    );
    const valueWeight =
      familyValue?.salience === "central"
        ? 1
        : familyValue?.salience === "high"
          ? 0.75
          : familyValue?.salience === "moderate"
            ? 0.5
            : 0.25;
    const caregivingPreference = familyValue
      ? 0.5 +
        ((familyValue.orientation === "embraces"
          ? 1
          : familyValue.orientation === "rejects"
            ? -1
            : 0) *
          valueWeight) /
          2
      : 0.5;
    if (!familyValue) estimates.push("caregiving preference from average");
    const load = assessLifeLoadAt(world, resident.personId);
    const actualSchool = Math.max(
      0,
      routineWeeklyLoad(world, resident.personId).minimumHours -
        load.expectedWeekly.minimumHours,
    );
    const schoolHours = resident.enrolled ? actualSchool || 36 : 0;
    if (resident.enrolled && !actualSchool)
      estimates.push("school timetable from full-time study average");
    const actualCare = load.contributors
      .filter((row) => row.kind === "care-responsibility")
      .reduce(
        (sum, row) => sum + row.timeDemand.expectedWeekly.minimumHours,
        0,
      );
    const caregivingHours =
      actualCare || (youngest === null ? 0 : 98 * Math.exp(-youngest / 3));
    if (caregivingHours && !actualCare)
      estimates.push("young-child care time from age-scaled waking hours");
    let childcareWeekly = 0;
    if (youngest !== null) {
      // Interpolation avoids a child's birthday flipping the parent's decision.
      const infant =
        prices?.infantWeeklyUsd ??
        workResearch.childcare.fallbackCandidate.Center.infantWeeklyUsd.value;
      const preschool =
        prices?.preschoolWeeklyUsd ??
        workResearch.childcare.fallbackCandidate.Center.preschoolWeeklyUsd
          .value;
      childcareWeekly =
        preschool + (infant - preschool) * Math.exp(-youngest / 2);
      if (!prices?.infantWeeklyUsd || !prices?.preschoolWeeklyUsd)
        estimates.push("childcare price ESTIMATED FROM AVERAGE");
    }
    const position = resourcePositionAt(
      world,
      { kind: "person", personId: resident.personId },
      makeCurrencyCode("USD"),
    );
    const adults = members.filter(
      (id) =>
        world.people[id] &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
    ).length;
    const savings =
      position?.liquidBalance.minorUnits ??
      (workResearch.retirementCashEstimate.nationalConditionalMedianUsd * 100) /
        Math.max(1, adults);
    if (!position)
      estimates.push(
        "retirement cash ESTIMATED FROM AVERAGE: 2022 family transaction-account median per adult; no age calibration",
      );
    const longestCareer = recordedPaidCareerYears(world, resident.personId);
    // This is planning support, never a claim of40 credits or a benefit payment.
    const coveredCareer = 1 - Math.exp(-Math.max(0, longestCareer) / 10);
    const benefit =
      primaryInsuranceAmountMinor(
        expectedPay * Math.min(1, longestCareer / 35),
        {
          bendPointsMinor: [128_600, 774_900],
          factorsBasisPoints: [9000, 3200, 1500],
        },
      ) * coveredCareer;
    estimates.push(
      "retirement support estimated from recorded career, not credited entitlement",
    );
    const input: LaborDemandInput = {
      age: resident.age,
      householdMonthlyNeedsMinor:
        annualPovertyLineMinor(stateKey, members.length, world.currentDate) /
        12,
      otherHouseholdIncomeMinor: otherIncome,
      expectedMonthlyPayMinor: expectedPay,
      savingsMinor: savings,
      retirementMonthlyIncomeMinor: benefit,
      schoolHours,
      caregivingHours,
      childcareMonthlyCostMinor: (childcareWeekly * 52) / 12,
      healthBurden,
      physicalDemand,
      workCommitment: commitment,
      caregivingPreference,
      employerHours: 40,
    };
    const demand = laborDemand(input);
    plans.set(resident.personId, { input, demand, estimates });
    if (!pay.has(resident.personId) && works.length > 0)
      forecast.set(
        resident.personId,
        (expectedPay *
          (works[0]!.role.timeDemand.expectedWeekly.minimumHours +
            works[0]!.role.timeDemand.expectedWeekly.maximumHours)) /
          80,
      );
  }
  towns.set(town, {
    expectedPay: expectedMonthlyPayMinor,
    residentIds: new Set(residents.map((row) => row.personId)),
    plans,
  });
  return plans;
}

/** Union actual active paid-work periods. Concurrent jobs do not double
 * credited time; ended or expected work does not keep accruing years. This
 * remains planning evidence, not Social Security earnings or credit history. */
export function recordedPaidCareerYears(
  world: World,
  personId: EntityId,
): number {
  const periods: { start: IsoDate; end: IsoDate }[] = [];
  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    if (work.compensation !== "paid" && work.compensation !== "mixed") continue;
    const states = workStatusHistory(world, work.id);
    for (let i = 0; i < states.length; i++) {
      const state = states[i]!;
      if (state.status !== "active") continue;
      const start =
        state.effectiveAt > work.startedAt ? state.effectiveAt : work.startedAt;
      const end = states[i + 1]?.effectiveAt ?? world.currentDate;
      if (end > start) periods.push({ start, end });
    }
  }
  periods.sort((a, b) => a.start.localeCompare(b.start));
  let totalDays = 0,
    start: IsoDate | null = null,
    end: IsoDate | null = null;
  for (const period of periods) {
    if (start === null || end === null) {
      start = period.start;
      end = period.end;
      continue;
    }
    if (period.start <= end) {
      if (period.end > end) end = period.end;
    } else {
      totalDays += daysBetween(start, end);
      start = period.start;
      end = period.end;
    }
  }
  if (start !== null && end !== null) totalDays += daysBetween(start, end);
  return totalDays / 365.25;
}
