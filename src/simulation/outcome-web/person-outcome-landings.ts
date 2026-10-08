import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
import schoolAges from "../../../data/research/education/compulsory-school-ages-2020.json" with { type: "json" };
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
  placeOutcomeKey,
  placeOutcomeRecordId,
  type PlaceOutcomeLandingRecord,
} from "./place-outcome-store";

export type OutcomeRecipientRule =
  "recorded-school-enrollment-or-compulsory-age-estimate";

interface CompulsorySchoolAgeRange {
  readonly minimumAge: number;
  readonly maximumAge: number;
  readonly estimatedFrom: string;
}

const COMPULSORY_SCHOOL_AGES = schoolAges.agesByJurisdictionKey as Readonly<
  Record<string, CompulsorySchoolAgeRange>
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
  readonly activeEducationEnrollment: boolean;
  readonly hasRecordedEducationEnrollment: boolean;
  readonly compulsorySchoolAge: CompulsorySchoolAgeRange | null;
}

/** Use a recorded enrollment, or the jurisdiction's sourced age estimate. */
export function matchesOutcomeRecipientRule(
  rule: OutcomeRecipientRule,
  person: Pick<
    OutcomeLandingPerson,
    | "age"
    | "activeEducationEnrollment"
    | "hasRecordedEducationEnrollment"
    | "compulsorySchoolAge"
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
 * Route school measures through recorded enrollments where available, then
 * use the state's sourced compulsory-attendance ages for unrecorded residents.
 * The place estimate is not a personal test score, diploma or enrollment fact.
 */
export function recordPlannedPersonOutcomeLandings(
  world: World,
  month: IsoDate,
): World {
  if (EDUCATION_LANDINGS.length === 0 || !world.placeOutcomes) return world;
  const previousMonth = world.placeOutcomes.months
    .filter((entry) => entry.month < month)
    .at(-1)?.month;
  const education = educationEnrollmentsAt(world, month);
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
    const stateKey = placeOutcomeKey(person.homeJurisdictionId);
    const recipient: OutcomeLandingPerson = {
      personId,
      jurisdictionId: person.homeJurisdictionId,
      age: ageOnDate(person.birthDate, month),
      activeEducationEnrollment: education.active.has(personId),
      hasRecordedEducationEnrollment: education.recorded.has(personId),
      compulsorySchoolAge: stateKey
        ? (COMPULSORY_SCHOOL_AGES[stateKey] ?? null)
        : null,
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

function educationEnrollmentsAt(
  world: World,
  through: IsoDate,
): {
  readonly active: ReadonlySet<EntityId>;
  readonly recorded: ReadonlySet<EntityId>;
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
  for (const enrollment of world.history.educationEnrollments) {
    if (
      (!enrollment.programKind.startsWith("schooling:") &&
        !enrollment.programKind.startsWith("postsecondary:")) ||
      enrollment.recordedAt > through
    )
      continue;
    recorded.add(enrollment.personId);
    if (
      enrollment.startedAt <= through &&
      latest.get(enrollment.id)?.status === "active"
    )
      active.add(enrollment.personId);
  }
  return { active, recorded };
}
