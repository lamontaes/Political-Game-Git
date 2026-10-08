import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
import { ageOnDate } from "../dates";
import { createStableId } from "../ids";
import { lifePlaceByJurisdictionId } from "../life-places";
import { scheduleLivedOutcomeReflection } from "../law-exposure";
import { officialAnsweringFor } from "../living-world/lived-outcomes";
import type {
  EducationEnrollmentStateRecord,
  EntityId,
  IsoDate,
  World,
} from "../types";
import {
  placeOutcomeAt,
  placeOutcomeRecordId,
  type PlaceOutcomeLandingRecord,
} from "./place-outcome-store";

export type OutcomeRecipientRule =
  | "age-18-to-22-cohort-estimate"
  | "active-school-student-proxy"
  | "age-13-to-15-active-school-proxy"
  | "age-5-to-17-cohort-estimate"
  | "age-13-to-17-active-school-proxy";

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

const EDUCATION_LANDING_PATH =
  "src/simulation/outcome-web/person-outcome-landings.ts -> src/simulation/living-world/lived-outcomes.ts -> src/simulation/living-world/official-views.ts";
const EDUCATION_LANDINGS = (
  landingPlan.links as readonly PlannedLanding[]
).filter(
  (row) =>
    row.policyArea === "education" &&
    row.landingPath === EDUCATION_LANDING_PATH &&
    row.recipientRule !== null,
);

export interface OutcomeLandingPerson {
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly age: number;
  readonly activeSchoolEnrollment: boolean;
}

/** The one cohort rule used by each named person outcome landing. */
export function matchesOutcomeRecipientRule(
  rule: OutcomeRecipientRule,
  person: Pick<OutcomeLandingPerson, "age" | "activeSchoolEnrollment">,
): boolean {
  switch (rule) {
    case "age-18-to-22-cohort-estimate":
      return person.age >= 18 && person.age <= 22;
    case "active-school-student-proxy":
      return person.activeSchoolEnrollment;
    case "age-13-to-15-active-school-proxy":
      return (
        person.age >= 13 && person.age <= 15 && person.activeSchoolEnrollment
      );
    case "age-5-to-17-cohort-estimate":
      return person.age >= 5 && person.age <= 17;
    case "age-13-to-17-active-school-proxy":
      return (
        person.age >= 13 && person.age <= 17 && person.activeSchoolEnrollment
      );
  }
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
 * Route school measures to the people represented by them. The link's named
 * evidence is retained because a place-level estimate is not a personal test
 * score, diploma or enrollment fact.
 */
export function recordPlannedPersonOutcomeLandings(
  world: World,
  month: IsoDate,
): World {
  if (EDUCATION_LANDINGS.length === 0 || !world.placeOutcomes) return world;
  const previousMonth = world.placeOutcomes.months
    .filter((entry) => entry.month < month)
    .at(-1)?.month;
  const activeStudents = activeSchoolStudentsAt(world, month);
  const alreadyLanded = new Set(
    (world.placeOutcomes.landings ?? []).map(
      (row) => `${row.personId}|${row.linkKey}`,
    ),
  );
  const stableKeys = new Set(
    (world.placeOutcomes.landings ?? []).map((row) => row.stableKey),
  );
  const pending: PlaceOutcomeLandingRecord[] = [];

  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person) continue;
    const recipient: OutcomeLandingPerson = {
      personId,
      jurisdictionId: person.homeJurisdictionId,
      age: ageOnDate(person.birthDate, month),
      activeSchoolEnrollment: activeStudents.has(personId),
    };
    for (const row of EDUCATION_LANDINGS) {
      if (
        !row.recipientRule ||
        !row.outcomeDirection ||
        !row.estimatedFrom ||
        !matchesOutcomeRecipientRule(row.recipientRule, recipient)
      )
        continue;
      const outcome = placeOutcomeAt(
        world,
        row.outcome,
        recipient.jurisdictionId,
        month,
      );
      if (!outcome) continue;
      const currentFactor =
        outcome.causes.find((cause) => cause.key === row.key)?.factor ?? 1;
      const prior = previousMonth
        ? placeOutcomeAt(
            world,
            row.outcome,
            recipient.jurisdictionId,
            previousMonth,
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

function activeSchoolStudentsAt(
  world: World,
  through: IsoDate,
): ReadonlySet<EntityId> {
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
  for (const enrollment of world.history.educationEnrollments) {
    if (
      !enrollment.programKind.startsWith("schooling:") ||
      enrollment.startedAt > through ||
      latest.get(enrollment.id)?.status !== "active"
    )
      continue;
    active.add(enrollment.personId);
  }
  return active;
}
