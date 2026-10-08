import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
import recipientAgeCohorts from "../../../data/research/outcome-web/person-recipient-age-cohorts.json" with { type: "json" };
import schoolAges from "../../../data/research/education/compulsory-school-ages-2020.json" with { type: "json" };
import { ageOnDate } from "../dates";
import { createStableId } from "../ids";
import { lifePlaceByJurisdictionId } from "../life-places";
import { recordedMonthlyPayByPerson } from "../household-pay";
import { householdMembershipsAt } from "../life-queries";
import {
  holdsPackCondition,
  SUBSTANCE_USE_DISORDER_KEY,
} from "../crisis/condition-pack";
import { snapParticipationRecords } from "../crisis/snap-participation";
import { scheduleLivedOutcomeReflection } from "../law-exposure";
import { officialAnsweringFor } from "../living-world/lived-outcomes";
import { RENT_EVENTS } from "../living-world/town-rent";
import type {
  EducationEnrollmentStateRecord,
  EntityId,
  IsoDate,
  World,
} from "../types";
import {
  placeOutcomeAt,
  placeOutcomeKey,
  placeOutcomeRecordId,
  type PlaceOutcomeLandingRecord,
} from "./place-outcome-store";

export type OutcomeRecipientRule =
  | "recorded-school-enrollment-or-compulsory-age-estimate"
  | "infant-mortality-cohort-estimate"
  | "working-age-adult-cohort-estimate"
  | "older-adult-medicare-cohort-estimate"
  | "adult-substance-use-condition-estimate"
  | "youth-cannabis-cohort-estimate"
  | "child-asthma-cohort-estimate"
  | "jurisdiction-resident-estimate"
  | "household-resident-estimate"
  | "snap-enrolled-household-member-estimate"
  | "recorded-wage-family-member-estimate"
  | "adult-school-completer-estimate"
  | "retirement-age-adult-cohort-estimate"
  | "active-renter-household-member-estimate"
  | "snap-enrolled-renter-household-member-estimate"
  | "evicted-household-without-home-member-estimate"
  | "retirement-policy-age-cohort-estimate"
  | "recorded-married-woman-estimate"
  | "recorded-parent-of-young-child-estimate"
  | "recorded-parent-of-infant-estimate";

type AgeBoundedOutcomeRecipientRule = Exclude<
  OutcomeRecipientRule,
  | "recorded-school-enrollment-or-compulsory-age-estimate"
  | "jurisdiction-resident-estimate"
  | "household-resident-estimate"
  | "snap-enrolled-household-member-estimate"
  | "recorded-wage-family-member-estimate"
  | "active-renter-household-member-estimate"
  | "snap-enrolled-renter-household-member-estimate"
  | "evicted-household-without-home-member-estimate"
  | "recorded-married-woman-estimate"
  | "recorded-parent-of-young-child-estimate"
  | "recorded-parent-of-infant-estimate"
>;

interface CompulsorySchoolAgeRange {
  readonly minimumAge: number;
  readonly maximumAge: number;
  readonly estimatedFrom: string;
}

const COMPULSORY_SCHOOL_AGES = schoolAges.agesByJurisdictionKey as Readonly<
  Record<string, CompulsorySchoolAgeRange>
>;

interface RecipientAgeCohort {
  readonly minimumAge: number;
  readonly maximumAge: number | null;
  readonly estimatedFrom: string;
}

const RECIPIENT_AGE_COHORTS = recipientAgeCohorts.cohortsByRule as Readonly<
  Record<AgeBoundedOutcomeRecipientRule, RecipientAgeCohort>
>;

type ParentChildOutcomeRecipientRule = Extract<
  OutcomeRecipientRule,
  | "recorded-parent-of-young-child-estimate"
  | "recorded-parent-of-infant-estimate"
>;

const RECIPIENT_CHILD_COHORTS =
  recipientAgeCohorts.childCohortsByRule as Readonly<
    Record<ParentChildOutcomeRecipientRule, RecipientAgeCohort>
  >;

interface PlannedLanding {
  readonly key: string;
  readonly outcome: string;
  readonly policyArea: string;
  readonly currentStatus: string;
  readonly landingPath?: string;
  readonly recipientRule: OutcomeRecipientRule | null;
  readonly outcomeDirection: "higher-is-better" | "higher-is-worse" | null;
  readonly estimatedFrom: string | null;
}

const PERSON_LANDING_PATH =
  "src/simulation/outcome-web/person-outcome-landings.ts -> src/simulation/living-world/lived-outcomes.ts -> src/simulation/living-world/official-views.ts";
const PERSON_LANDINGS = (landingPlan.links as readonly PlannedLanding[]).filter(
  (row) =>
    row.landingPath === PERSON_LANDING_PATH && row.recipientRule !== null,
);

export interface OutcomeLandingPerson {
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly age: number;
  readonly activeEducationEnrollment: boolean;
  readonly hasRecordedEducationEnrollment: boolean;
  readonly compulsorySchoolAge: CompulsorySchoolAgeRange | null;
  readonly activeSubstanceUseCondition: boolean;
  readonly hasCurrentHouseholdResidence: boolean;
  readonly hasSnapEnrolledHousehold: boolean;
  readonly hasRecordedWageHousehold: boolean;
  readonly completedSchooling: boolean;
  readonly hasActiveRenterHousehold: boolean;
  readonly hasSnapEnrolledRenterHousehold: boolean;
  readonly hasEvictedHouseholdWithoutHome: boolean;
  readonly hasActiveLegalMarriage: boolean;
  readonly hasRecordedFemaleIdentity: boolean;
  readonly hasActiveParentOfYoungChild: boolean;
  readonly hasActiveParentOfInfant: boolean;
}

/** Match a person to the estimate's cohort, using recorded facts when present. */
export function matchesOutcomeRecipientRule(
  rule: OutcomeRecipientRule,
  person: Pick<
    OutcomeLandingPerson,
    | "age"
    | "activeEducationEnrollment"
    | "hasRecordedEducationEnrollment"
    | "compulsorySchoolAge"
    | "activeSubstanceUseCondition"
    | "hasCurrentHouseholdResidence"
    | "hasSnapEnrolledHousehold"
    | "hasRecordedWageHousehold"
    | "completedSchooling"
    | "hasActiveRenterHousehold"
    | "hasSnapEnrolledRenterHousehold"
    | "hasEvictedHouseholdWithoutHome"
    | "hasActiveLegalMarriage"
    | "hasRecordedFemaleIdentity"
    | "hasActiveParentOfYoungChild"
    | "hasActiveParentOfInfant"
  >,
): boolean {
  switch (rule) {
    case "recorded-school-enrollment-or-compulsory-age-estimate":
      if (person.hasRecordedEducationEnrollment)
        return person.activeEducationEnrollment;
      return (
        person.compulsorySchoolAge !== null &&
        person.age >= person.compulsorySchoolAge.minimumAge &&
        person.age <= person.compulsorySchoolAge.maximumAge
      );
    case "jurisdiction-resident-estimate":
      return true;
    case "household-resident-estimate":
      return person.hasCurrentHouseholdResidence;
    case "snap-enrolled-household-member-estimate":
      return person.hasSnapEnrolledHousehold;
    case "recorded-wage-family-member-estimate":
      return person.hasRecordedWageHousehold;
    case "active-renter-household-member-estimate":
      return person.hasActiveRenterHousehold;
    case "snap-enrolled-renter-household-member-estimate":
      return person.hasSnapEnrolledRenterHousehold;
    case "evicted-household-without-home-member-estimate":
      return person.hasEvictedHouseholdWithoutHome;
    case "recorded-married-woman-estimate":
      return person.hasActiveLegalMarriage && person.hasRecordedFemaleIdentity;
    case "recorded-parent-of-young-child-estimate":
      return person.hasActiveParentOfYoungChild;
    case "recorded-parent-of-infant-estimate":
      return person.hasActiveParentOfInfant;
    case "adult-school-completer-estimate": {
      const cohort = RECIPIENT_AGE_COHORTS[rule];
      return (
        person.completedSchooling &&
        person.age >= cohort.minimumAge &&
        (cohort.maximumAge === null || person.age <= cohort.maximumAge)
      );
    }
  }
  const ageRange = RECIPIENT_AGE_COHORTS[rule];
  return (
    person.age >= ageRange.minimumAge &&
    (ageRange.maximumAge === null || person.age <= ageRange.maximumAge) &&
    (rule === "adult-substance-use-condition-estimate"
      ? person.activeSubstanceUseCondition
      : true)
  );
}

/** A metric movement as a named person's estimated gain or cost. */
export function outcomeLandingDirection(
  previousFactor: number,
  currentFactor: number,
  outcomeDirection: "higher-is-better" | "higher-is-worse",
): "gain" | "cost" {
  const increased = currentFactor > previousFactor;
  const improved =
    outcomeDirection === "higher-is-better" ? increased : !increased;
  return improved ? "gain" : "cost";
}

export function outcomeLandingStableKey(
  personId: EntityId,
  linkKey: string,
  outcomeRecordId: EntityId,
): string {
  return `${personId}|${linkKey}|${outcomeRecordId}`;
}

/**
 * Route each place measure to the people represented by its recipient rule.
 * Place estimates remain estimates, not personal test scores, diagnoses,
 * coverage decisions, or enrollment facts.
 */
export function recordPlannedPersonOutcomeLandings(
  world: World,
  month: IsoDate,
): World {
  if (PERSON_LANDINGS.length === 0 || !world.placeOutcomes) return world;
  const previousMonth = world.placeOutcomes.months
    .filter((entry) => entry.month < month)
    .at(-1)?.month;
  const needsEducationEnrollment = PERSON_LANDINGS.some(
    (row) =>
      row.recipientRule ===
      "recorded-school-enrollment-or-compulsory-age-estimate",
  );
  const needsSubstanceUseCondition = PERSON_LANDINGS.some(
    (row) => row.recipientRule === "adult-substance-use-condition-estimate",
  );
  const needsHouseholdMemberships = PERSON_LANDINGS.some(
    (row) =>
      row.recipientRule === "household-resident-estimate" ||
      row.recipientRule === "snap-enrolled-household-member-estimate" ||
      row.recipientRule === "recorded-wage-family-member-estimate" ||
      row.recipientRule === "active-renter-household-member-estimate" ||
      row.recipientRule === "snap-enrolled-renter-household-member-estimate" ||
      row.recipientRule === "evicted-household-without-home-member-estimate",
  );
  const needsSnapParticipation = PERSON_LANDINGS.some(
    (row) =>
      row.recipientRule === "snap-enrolled-household-member-estimate" ||
      row.recipientRule === "snap-enrolled-renter-household-member-estimate",
  );
  const needsRecordedWage = PERSON_LANDINGS.some(
    (row) => row.recipientRule === "recorded-wage-family-member-estimate",
  );
  const adultConditionMinimumAge =
    RECIPIENT_AGE_COHORTS["adult-substance-use-condition-estimate"].minimumAge;
  const education = needsEducationEnrollment
    ? educationEnrollmentsAt(world, month)
    : {
        active: new Set<EntityId>(),
        recorded: new Set<EntityId>(),
        completedSchooling: new Set<EntityId>(),
      };
  const membershipsByPerson = new Map(
    needsHouseholdMemberships
      ? world.personOrder.map((personId) => [
          personId,
          householdMembershipsAt(world, personId, {
            asOfDate: month,
            historySequenceExclusive: world.history.nextSequence,
          }),
        ])
      : [],
  );
  const snapHouseholds = new Set<EntityId>();
  if (needsSnapParticipation) {
    const latestSnapByHousehold = new Map<
      EntityId,
      ReturnType<typeof snapParticipationRecords>[number]
    >();
    for (const record of snapParticipationRecords(world)) {
      if (record.effectiveAt > month) continue;
      const prior = latestSnapByHousehold.get(record.householdId);
      if (
        !prior ||
        record.effectiveAt > prior.effectiveAt ||
        (record.effectiveAt === prior.effectiveAt &&
          record.sequence > prior.sequence)
      )
        latestSnapByHousehold.set(record.householdId, record);
    }
    for (const [householdId, record] of latestSnapByHousehold)
      if (record.enrolled) snapHouseholds.add(householdId);
  }
  const wageHouseholds = new Set<EntityId>();
  if (needsRecordedWage) {
    const workers = recordedMonthlyPayByPerson(world, month, "work");
    for (const personId of workers.keys())
      for (const membership of membershipsByPerson.get(personId) ?? [])
        wageHouseholds.add(membership.membership.householdId);
  }
  const marriedPeople = new Set<EntityId>();
  if (
    PERSON_LANDINGS.some(
      (row) => row.recipientRule === "recorded-married-woman-estimate",
    )
  ) {
    const latestPartnershipStates = new Map<
      EntityId,
      (typeof world.history.partnershipStates)[number]
    >();
    for (const state of world.history.partnershipStates) {
      if (state.effectiveAt > month) continue;
      const prior = latestPartnershipStates.get(state.partnershipId);
      if (
        !prior ||
        state.effectiveAt > prior.effectiveAt ||
        (state.effectiveAt === prior.effectiveAt &&
          state.sequence > prior.sequence)
      )
        latestPartnershipStates.set(state.partnershipId, state);
    }
    for (const partnership of world.history.partnerships) {
      if (
        partnership.kind !== "legal:marriage" ||
        partnership.startedAt > month ||
        latestPartnershipStates.get(partnership.id)?.status !== "active"
      )
        continue;
      for (const personId of partnership.personIds) marriedPeople.add(personId);
    }
  }
  const parentsOfYoungChildren = new Set<EntityId>();
  const parentsOfInfants = new Set<EntityId>();
  if (
    PERSON_LANDINGS.some(
      (row) =>
        row.recipientRule === "recorded-parent-of-young-child-estimate" ||
        row.recipientRule === "recorded-parent-of-infant-estimate",
    )
  ) {
    const latestChildAuthorityStates = new Map<
      EntityId,
      (typeof world.history.childAuthorityStates)[number]
    >();
    for (const state of world.history.childAuthorityStates) {
      if (state.effectiveAt > month) continue;
      const prior = latestChildAuthorityStates.get(state.childAuthorityId);
      if (
        !prior ||
        state.effectiveAt > prior.effectiveAt ||
        (state.effectiveAt === prior.effectiveAt &&
          state.sequence > prior.sequence)
      )
        latestChildAuthorityStates.set(state.childAuthorityId, state);
    }
    const youngChildCohort =
      RECIPIENT_CHILD_COHORTS["recorded-parent-of-young-child-estimate"];
    const infantCohort =
      RECIPIENT_CHILD_COHORTS["recorded-parent-of-infant-estimate"];
    for (const authority of world.history.childAuthorities) {
      if (
        authority.holder.kind !== "person" ||
        !authority.kind.startsWith("parental:") ||
        authority.establishedAt > month ||
        latestChildAuthorityStates.get(authority.id)?.status !== "active"
      )
        continue;
      const child = world.people[authority.childPersonId];
      if (!child) continue;
      const childAge = ageOnDate(child.birthDate, month);
      if (
        childAge >= youngChildCohort.minimumAge &&
        (youngChildCohort.maximumAge === null ||
          childAge <= youngChildCohort.maximumAge)
      )
        parentsOfYoungChildren.add(authority.holder.personId);
      if (
        childAge >= infantCohort.minimumAge &&
        (infantCohort.maximumAge === null ||
          childAge <= infantCohort.maximumAge)
      )
        parentsOfInfants.add(authority.holder.personId);
    }
  }
  const renterHouseholds = new Set<EntityId>();
  if (
    PERSON_LANDINGS.some(
      (row) =>
        row.recipientRule === "active-renter-household-member-estimate" ||
        row.recipientRule === "snap-enrolled-renter-household-member-estimate",
    )
  ) {
    const latestTenureStates = new Map<
      EntityId,
      (typeof world.history.housingTenureStates)[number]
    >();
    for (const state of world.history.housingTenureStates) {
      if (state.effectiveAt > month) continue;
      const prior = latestTenureStates.get(state.housingTenureId);
      if (!prior || state.sequence > prior.sequence)
        latestTenureStates.set(state.housingTenureId, state);
    }
    for (const tenure of world.history.housingTenures) {
      if (
        tenure.startedAt <= month &&
        tenure.holder.kind === "household" &&
        tenure.kind.startsWith("lease:") &&
        latestTenureStates.get(tenure.id)?.status === "active"
      )
        renterHouseholds.add(tenure.holder.householdId);
    }
  }
  const evictedHouseholdsWithoutHome = new Set<EntityId>();
  if (
    PERSON_LANDINGS.some(
      (row) =>
        row.recipientRule === "evicted-household-without-home-member-estimate",
    )
  ) {
    const householdIds = new Set(world.history.households.map((row) => row.id));
    const activePrimaryHomes = new Set<EntityId>();
    const latestOccupancyStates = new Map<
      EntityId,
      (typeof world.history.dwellingOccupancyStates)[number]
    >();
    for (const state of world.history.dwellingOccupancyStates) {
      if (state.effectiveAt > month) continue;
      const prior = latestOccupancyStates.get(state.dwellingOccupancyId);
      if (!prior || state.sequence > prior.sequence)
        latestOccupancyStates.set(state.dwellingOccupancyId, state);
    }
    for (const occupancy of world.history.dwellingOccupancies) {
      const state = latestOccupancyStates.get(occupancy.id);
      if (
        occupancy.startedAt <= month &&
        occupancy.occupant.kind === "household" &&
        state?.status === "active" &&
        state.residenceRole === "primary"
      )
        activePrimaryHomes.add(occupancy.occupant.householdId);
    }
    for (const event of world.history.events) {
      if (event.type !== RENT_EVENTS.evicted || event.occurredAt > month)
        continue;
      for (const householdId of event.involvedEntityIds)
        if (
          householdIds.has(householdId) &&
          !activePrimaryHomes.has(householdId)
        )
          evictedHouseholdsWithoutHome.add(householdId);
    }
  }
  const alreadyLanded = new Set(
    (world.placeOutcomes.landings ?? []).map(
      (row) => `${row.personId}|${row.linkKey}`,
    ),
  );
  const stableKeys = new Set(
    (world.placeOutcomes.landings ?? []).map((row) => row.stableKey),
  );
  const pending: PlaceOutcomeLandingRecord[] = [];
  const currentOutcomes = new Map<string, ReturnType<typeof placeOutcomeAt>>();
  const priorOutcomes = new Map<string, ReturnType<typeof placeOutcomeAt>>();
  const outcomeFor = (
    cache: Map<string, ReturnType<typeof placeOutcomeAt>>,
    jurisdictionId: EntityId,
    outcomeMonth: IsoDate,
    measure: string,
  ) => {
    const key = `${jurisdictionId}|${measure}|${outcomeMonth}`;
    if (!cache.has(key))
      cache.set(
        key,
        placeOutcomeAt(world, measure, jurisdictionId, outcomeMonth),
      );
    return cache.get(key) ?? null;
  };

  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person) continue;
    const stateKey = placeOutcomeKey(person.homeJurisdictionId);
    const age = ageOnDate(person.birthDate, month);
    const recipient: OutcomeLandingPerson = {
      personId,
      jurisdictionId: person.homeJurisdictionId,
      age,
      activeEducationEnrollment: education.active.has(personId),
      hasRecordedEducationEnrollment: education.recorded.has(personId),
      compulsorySchoolAge: stateKey
        ? (COMPULSORY_SCHOOL_AGES[stateKey] ?? null)
        : null,
      activeSubstanceUseCondition:
        needsSubstanceUseCondition && age >= adultConditionMinimumAge
          ? holdsPackCondition(world, personId, SUBSTANCE_USE_DISORDER_KEY)
          : false,
      hasCurrentHouseholdResidence:
        (membershipsByPerson.get(personId)?.length ?? 0) > 0,
      hasSnapEnrolledHousehold: (membershipsByPerson.get(personId) ?? []).some(
        (membership) => snapHouseholds.has(membership.membership.householdId),
      ),
      hasRecordedWageHousehold: (membershipsByPerson.get(personId) ?? []).some(
        (membership) => wageHouseholds.has(membership.membership.householdId),
      ),
      completedSchooling: education.completedSchooling.has(personId),
      hasActiveRenterHousehold: (membershipsByPerson.get(personId) ?? []).some(
        (membership) => renterHouseholds.has(membership.membership.householdId),
      ),
      hasSnapEnrolledRenterHousehold: (
        membershipsByPerson.get(personId) ?? []
      ).some(
        (membership) =>
          renterHouseholds.has(membership.membership.householdId) &&
          snapHouseholds.has(membership.membership.householdId),
      ),
      hasEvictedHouseholdWithoutHome: (
        membershipsByPerson.get(personId) ?? []
      ).some((membership) =>
        evictedHouseholdsWithoutHome.has(membership.membership.householdId),
      ),
      hasActiveLegalMarriage: marriedPeople.has(personId),
      hasRecordedFemaleIdentity: person.identity?.gender === "female",
      hasActiveParentOfYoungChild: parentsOfYoungChildren.has(personId),
      hasActiveParentOfInfant: parentsOfInfants.has(personId),
    };
    for (const row of PERSON_LANDINGS) {
      if (
        !row.recipientRule ||
        !row.outcomeDirection ||
        !row.estimatedFrom ||
        !matchesOutcomeRecipientRule(row.recipientRule, recipient)
      )
        continue;
      const outcome = outcomeFor(
        currentOutcomes,
        recipient.jurisdictionId,
        month,
        row.outcome,
      );
      if (!outcome) continue;
      const currentFactor =
        outcome.causes.find((cause) => cause.key === row.key)?.factor ?? 1;
      const prior = previousMonth
        ? outcomeFor(
            priorOutcomes,
            recipient.jurisdictionId,
            previousMonth,
            row.outcome,
          )
        : null;
      const previousFactor =
        prior?.causes.find((cause) => cause.key === row.key)?.factor ?? 1;
      const changed = Math.abs(currentFactor - previousFactor) > 1e-9;
      const hasPriorLanding = alreadyLanded.has(`${personId}|${row.key}`);
      if (!hasPriorLanding && currentFactor === 1) continue;
      const firstExposureToPresentEffect =
        currentFactor !== 1 && !hasPriorLanding;
      if (!changed && !firstExposureToPresentEffect) continue;

      const outcomeRecordId = placeOutcomeRecordId(outcome);
      const stableKey = outcomeLandingStableKey(
        personId,
        row.key,
        outcomeRecordId,
      );
      if (stableKeys.has(stableKey)) continue;
      const place = lifePlaceByJurisdictionId(outcome.jurisdictionId);
      const answeringPersonId = officialAnsweringFor(
        world,
        personId,
        place?.scope === "state" ? "state-executive" : "local-executive",
      );
      pending.push({
        id: createStableId("place-outcome-landing", stableKey),
        stableKey,
        personId,
        linkKey: row.key,
        measure: row.outcome,
        outcomeRecordId,
        jurisdictionId: outcome.jurisdictionId,
        answeringPersonId,
        month,
        direction: outcomeLandingDirection(
          changed ? previousFactor : 1,
          currentFactor,
          row.outcomeDirection,
        ),
        previousCauseFactor: changed ? previousFactor : 1,
        currentCauseFactor: currentFactor,
        recipientRule: row.recipientRule,
        estimatedFrom: row.estimatedFrom,
      });
      stableKeys.add(stableKey);
      alreadyLanded.add(`${personId}|${row.key}`);
    }
  }
  if (pending.length === 0) return world;

  let next: World = {
    ...world,
    placeOutcomes: {
      ...world.placeOutcomes,
      landings: [...(world.placeOutcomes.landings ?? []), ...pending],
    },
  };
  for (const landing of pending)
    next = scheduleLivedOutcomeReflection(next, landing.personId, landing.id);
  return next;
}

function educationEnrollmentsAt(
  world: World,
  through: IsoDate,
): {
  readonly active: ReadonlySet<EntityId>;
  readonly recorded: ReadonlySet<EntityId>;
  readonly completedSchooling: ReadonlySet<EntityId>;
} {
  const latest = new Map<EntityId, EducationEnrollmentStateRecord>();
  for (const state of world.history.educationEnrollmentStates) {
    if (state.effectiveAt > through) continue;
    const prior = latest.get(state.enrollmentId);
    if (
      !prior ||
      state.effectiveAt > prior.effectiveAt ||
      (state.effectiveAt === prior.effectiveAt &&
        state.sequence > prior.sequence)
    )
      latest.set(state.enrollmentId, state);
  }
  const active = new Set<EntityId>();
  const recorded = new Set<EntityId>();
  const completedSchooling = new Set<EntityId>();
  for (const enrollment of world.history.educationEnrollments) {
    if (
      (!enrollment.programKind.startsWith("schooling:") &&
        !enrollment.programKind.startsWith("postsecondary:")) ||
      enrollment.recordedAt > through
    )
      continue;
    recorded.add(enrollment.personId);
    if (
      enrollment.programKind.startsWith("schooling:") &&
      latest.get(enrollment.id)?.status === "completed"
    )
      completedSchooling.add(enrollment.personId);
    if (
      enrollment.startedAt <= through &&
      latest.get(enrollment.id)?.status === "active"
    )
      active.add(enrollment.personId);
  }
  return { active, recorded, completedSchooling };
}
