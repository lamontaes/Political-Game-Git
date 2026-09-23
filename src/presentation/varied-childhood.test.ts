import { describe, expect, it } from "vitest";

import {
  CHILDHOOD_GENERATION_V3,
  generateQuickCharacterHistory,
  type EntityId,
  type World,
} from "../simulation";
import { searchLifePlaces } from "../simulation/life-places";
import { describePersonContext } from "../simulation/person-context";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

/**
 * Two lives in two states used to come out line for line alike: a move at
 * six, a transfer at seven, the lunch table at ten, a store job at sixteen
 * that ended the day they graduated, every one of them on their birthday.
 */

function placeKey(name: string, state: string): string {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name));
  expect(place, `${name}, ${state}`).toBeDefined();
  return place!.key;
}

function start(name: string, state: string, seed: string, startAge = 30) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: placeKey(name, state),
    household: "shares-a-home",
  });
  return { world: game.world, playerId: game.playerPersonId };
}

const childhoodEvents = (world: World, personId: EntityId) =>
  world.history.events.filter(
    (event) =>
      event.type.startsWith("life.") &&
      event.involvedEntityIds.includes(personId),
  );

function schooling(world: World, personId: EntityId) {
  const enrollments = world.history.educationEnrollments.filter(
    (row) => row.personId === personId,
  );
  return enrollments.map((enrollment) => ({
    programKind: enrollment.programKind,
    startedAt: enrollment.startedAt,
    completedAt:
      world.history.educationEnrollmentStates.find(
        (state) =>
          state.enrollmentId === enrollment.id && state.status === "completed",
      )?.effectiveAt ?? null,
  }));
}

describe("a summarized childhood of the person's own", () => {
  it("is declared by a new game", () => {
    expect(DEFAULT_NEW_GAME_SETUP.childhoodGenerationVersion).toBe(
      CHILDHOOD_GENERATION_V3,
    );
  });

  it("gives two people in two states different childhoods, dated through the year", () => {
    const rugby = start("Rugby", "ND", "varied-childhood:rugby");
    const houma = start("Houma", "LA", "varied-childhood:houma");
    const shape = ({ world, playerId }: ReturnType<typeof start>) =>
      childhoodEvents(world, playerId).map(
        (event) =>
          `${event.type} at ${
            Number(event.occurredAt.slice(0, 4)) -
            Number(world.people[playerId]!.birthDate.slice(0, 4))
          }: ${event.summary}`,
      );
    expect(shape(rugby).length).toBeGreaterThanOrEqual(3);
    expect(shape(houma).length).toBeGreaterThanOrEqual(3);
    expect(shape(rugby)).not.toEqual(shape(houma));

    for (const { world, playerId } of [rugby, houma]) {
      const birthday = world.people[playerId]!.birthDate.slice(5);
      const events = childhoodEvents(world, playerId);
      // Not every one of them on the birthday, which is what every one was.
      expect(
        events.filter((event) => event.occurredAt.slice(5) !== birthday).length,
      ).toBeGreaterThanOrEqual(events.length - 1);
      // Nothing in a summarized past has happened yet on the first day.
      for (const event of events) {
        expect(event.occurredAt < world.currentDate).toBe(true);
      }
      // School years on a school calendar: a late-summer start and a spring
      // finish, not the birthday.
      const schools = schooling(world, playerId);
      expect(schools.map((school) => school.programKind)).toEqual([
        "schooling:elementary",
        "schooling:middle",
        "schooling:secondary",
      ]);
      for (const school of schools) {
        expect(school.startedAt.slice(5) >= "08-15").toBe(true);
        expect(school.startedAt.slice(5) <= "09-09").toBe(true);
        expect(school.completedAt).not.toBeNull();
        expect(school.completedAt!.slice(5) >= "05-20").toBe(true);
        expect(school.completedAt!.slice(5) <= "06-16").toBe(true);
      }
      // One school ends before the next begins, never overlapping it.
      expect(schools[0]!.completedAt! < schools[1]!.startedAt).toBe(true);
      expect(schools[1]!.completedAt! < schools[2]!.startedAt).toBe(true);
      // The teacher taught at a school this child attended, and is still
      // somebody the player knows as their teacher.
      const schoolIds = new Set(
        world.history.educationEnrollments
          .filter((row) => row.personId === playerId)
          .map((row) => row.organizationId),
      );
      const teaching = world.history.workRelationships.filter(
        (work) =>
          work.personId !== playerId && work.kind === "employment:education",
      );
      expect(teaching).toHaveLength(1);
      expect(schoolIds.has(teaching[0]!.organizationId)).toBe(true);
      expect(
        describePersonContext(world, playerId, teaching[0]!.personId)
          ?.relationship,
      ).toBe("your former teacher");
    }
  }, 120_000);

  it("draws the move, the job and the moments rather than fixing them", () => {
    const { world, playerId } = start("Rugby", "ND", "varied-childhood:draws");
    const plans = Array.from({ length: 24 }, (_, index) =>
      generateQuickCharacterHistory(world, {
        stableKey: `varied-childhood:${index}`,
        personId: playerId,
        jurisdictionId: world.people[playerId]!.homeJurisdictionId!,
        childhoodGenerationVersion: CHILDHOOD_GENERATION_V3,
      }),
    );
    const has = (plan: (typeof plans)[number], stableKeySuffix: string) =>
      plan.transitions.some(
        (transition) =>
          "stableKey" in transition.input &&
          transition.input.stableKey.endsWith(stableKeySuffix),
      );
    const moved = plans.filter((plan) => has(plan, ":event:move")).length;
    const worked = plans.filter((plan) => has(plan, ":work:teen")).length;
    // Some households move and some do not; some teenagers work and some do not.
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(plans.length);
    expect(worked).toBeGreaterThan(0);
    expect(worked).toBeLessThan(plans.length);
    const moments = new Set(
      plans.flatMap((plan) =>
        plan.transitions.flatMap((transition) =>
          transition.kind === "event" ? [transition.input.type] : [],
        ),
      ),
    );
    expect(moments.size).toBeGreaterThanOrEqual(8);
    // And a job that ends does not end on the day school does.
    let compared = 0;
    for (const plan of plans) {
      const graduated = plan.transitions.find(
        (transition) =>
          transition.kind === "education-state" &&
          transition.input.enrollmentStableKey.endsWith(
            ":education:high-school",
          ),
      );
      const left = plan.transitions.find(
        (transition) =>
          transition.kind === "work-status" &&
          transition.input.workStableKey.endsWith(":work:teen"),
      );
      if (graduated?.kind !== "education-state" || left?.kind !== "work-status")
        continue;
      expect(left.input.effectiveAt).not.toBe(graduated.input.effectiveAt);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(0);
  }, 120_000);

  it("gives the classmate what they saw, not the player's own memory", () => {
    const { world, playerId } = start(
      "Houma",
      "LA",
      "varied-childhood:classmate",
    );
    const classmate = childhoodEvents(world, playerId).find((event) =>
      ["life.lunch-table", "life.friend-conflict"].includes(event.type),
    );
    expect(classmate).toBeDefined();
    const others = classmate!.involvedEntityIds.filter((id) => id !== playerId);
    expect(others).toHaveLength(1);
    const seen = world.history.knowledge.filter(
      (row) => row.personId === others[0] && row.eventId === classmate!.id,
    );
    expect(seen).toHaveLength(1);
    for (const other of others) {
      expect(
        world.history.memories.filter(
          (memory) =>
            memory.personId === other && memory.eventId === classmate!.id,
        ),
      ).toEqual([]);
      for (const known of world.history.knowledge.filter(
        (row) => row.personId === other && row.eventId === classmate!.id,
      )) {
        expect(known.believedSummary).not.toBe(classmate!.summary);
      }
    }
  }, 120_000);

  it.each([
    // Born in May: five by September 1, so their last school year ended the
    // spring before play begins.
    ["Flagstaff", "AZ", "varied-childhood:eighteen", false],
    // Born in September, after the cutoff: a year later into school, and still
    // in their last year when play begins in January.
    ["Rugby", "ND", "x", true],
  ] as const)(
    "puts an eighteen-year-old in %s, %s through the school year they are in",
    (name, state, seed, stillEnrolled) => {
      const { world, playerId } = start(name, state, seed, 18);
      const born = world.people[playerId]!.birthDate;
      expect(born.slice(5) > "09-01").toBe(stillEnrolled);
      const high = schooling(world, playerId).find(
        (school) => school.programKind === "schooling:secondary",
      );
      expect(high).toBeDefined();
      expect(high!.completedAt === null).toBe(stillEnrolled);
      for (const event of childhoodEvents(world, playerId)) {
        expect(event.occurredAt < world.currentDate).toBe(true);
      }
    },
    120_000,
  );
});
