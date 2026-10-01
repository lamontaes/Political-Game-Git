import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../../tests/fixtures/state-executive-entry";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { officialViewLine } from "../../presentation/small-talk-english";
import { schoolYearMovesOf } from "../childhood-record";
import { currentGovernorOf } from "../crisis/offices";
import { ageOnDate } from "../dates";
import { stableHash } from "../ids";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import {
  deadPeople,
  moveTieReader,
  planMove,
  playerHouseholdPeople,
  relocateHousehold,
} from "../migration";
import { childrenOf, parentsOf } from "../people-family";
import { currentSchooling, schoolTermOn } from "../school-stages";
import { activeWorkRelationshipsAt, workStatusHistory } from "../life-queries";
import { townSupportFromViews, viewOfOfficial } from "../official-view-reads";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { livedOutcomeReflectionKey } from "../law-exposure";
import { livedOutcomesOf, officialAnsweringFor } from "./lived-outcomes";
import {
  LIVED_OUTCOME_REFLECTION_EVENT_TYPE,
  livedOutcomeReflectionEventKey,
} from "./official-views";
import {
  jobsLostBy,
  recordTownJobLoss,
  TOWN_JOB_END_REASONS,
} from "./town-labor-market";

/** A state or territory from all 56, named by its seed. */
function drawState(seed: string): string {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  return states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!
    .jurisdictionKey;
}

/**
 * A grown resident who is not the player, holds a job today and is not the
 * governor, in an ordinary opening life in the drawn place.
 */
function workerIn(seed: string) {
  const stateKey = drawState(seed);
  const { world, personId } = adultLifeIn(stateKey.slice(3), seed);
  const governor = currentGovernorOf(world, stateKey.slice(3));
  const workerId = world.personOrder.find(
    (id) =>
      id !== personId &&
      id !== governor?.personId &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
      activeWorkRelationshipsAt(world, id).length > 0,
  );
  return { world, playerId: personId, stateKey, governor, workerId };
}

/** The worker's job ends in a layoff, through the writer every layoff uses. */
function layOff(world: World, workerId: EntityId): World {
  const job = activeWorkRelationshipsAt(world, workerId)[0]!.relationship;
  const latest = workStatusHistory(world, job.id).at(-1)!;
  return recordTownJobLoss(world, {
    stableKey: `lived-outcomes-test:layoff:${job.id}`,
    workRelationshipId: job.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: TOWN_JOB_END_REASONS.laidOff,
    supersedesStatusId: latest.id,
    provenance: { kind: "authored", note: "A layoff for the test." },
  });
}

const SEED = "lives-step-3-job-loss";

describe(`a resident's lost job shifts their view of the governor (seed ${SEED})`, () => {
  it("the layoff schedules a reflection, which saves a view of the governor through the belief pipeline", () => {
    const { world, playerId, stateKey, governor, workerId } = workerIn(SEED);
    const label = `${stateKey}, seed ${SEED}`;
    expect(governor, label).not.toBeNull();
    expect(workerId, label).toBeDefined();
    const before = viewOfOfficial(world, workerId!, governor!.personId);
    expect(before.belief, label).toBeNull();

    const laidOff = layOff(world, workerId!);
    const [lost] = jobsLostBy(laidOff, workerId!);
    expect(lost, label).toBeDefined();
    expect(livedOutcomesOf(laidOff, workerId!)).toEqual([
      {
        kind: "job-lost",
        at: laidOff.currentDate,
        sourceRecordId: lost!.id,
        direction: "cost",
        felt: { share: 1, estimated: false },
      },
    ]);
    const key = livedOutcomeReflectionKey(workerId!, lost!.id);
    const due = laidOff.history.futureDueItems.find(
      (item) => item.stableKey === key,
    )?.dueAt;
    expect(due, label).toBeDefined();

    // Days pass the way the player passes them.
    const after = passOrdinaryDays(laidOff, 4);
    expect(after.currentDate > due, label).toBe(true);
    const reflection = after.history.events.find(
      (event) =>
        event.stableKey ===
        livedOutcomeReflectionEventKey(workerId!, { sourceRecordId: lost!.id }),
    );
    expect(reflection?.type, label).toBe(LIVED_OUTCOME_REFLECTION_EVENT_TYPE);
    const view = viewOfOfficial(after, workerId!, governor!.personId);
    expect(view.belief, label).not.toBeNull();
    expect(view.belief!.formation.relevantEventIds).toContain(reflection!.id);
    const trace = after.history.decisionTraces.find(
      (row) => row.id === view.belief!.formation.decisionTraceIds[0],
    )!;
    expect(trace.context.decisionType).toBe("political-belief-formation");
    expect(trace.context.subject.entityId).toBe(governor!.personId);
    expect(
      trace.context.considerations.some(
        (row) => row.stableKey === `factor:lived-outcome:${lost!.id}`,
      ),
    ).toBe(true);
    // A cost the governor answers for is blame, or leaves the person torn
    // when their party anchors them; never credit.
    expect(view.belief!.position, label).not.toBe("support");
    expect(view.points, label).toBeLessThan(0);
    // The town's count of the governor reads the saved view.
    const town = after.people[workerId!]!.homeJurisdictionId!;
    expect(
      townSupportFromViews(after, town, governor!.personId, after.currentDate),
      label,
    ).toBeLessThan(
      townSupportFromViews(world, town, governor!.personId, world.currentDate),
    );
    assertWorldIntegrity(after);
    // Asked about the people in office, the worker says it.
    const official = after.people[governor!.personId]!;
    const line = officialViewLine(after, workerId!, playerId, []);
    console.log(`${label}: ${line?.text}`);
    expect(line?.text, label).toContain(
      `${official.givenName} ${official.familyName}`,
    );
  }, 60_000);
});

/**
 * A pupil in school today, outside the player's household, whose household
 * (with a grown parent of theirs) can move to the state's own jurisdiction.
 */
function movingFamilyIn(seed: string) {
  const stateKey = drawState(seed);
  const { world, personId: playerId } = adultLifeIn(stateKey.slice(3), seed);
  const to = stateJurisdictionForKey(stateKey)!.id;
  const context = {
    ties: moveTieReader(world),
    playerHousehold: playerHouseholdPeople(world),
    dead: deadPeople(world),
  };
  for (const pupilId of [
    ...new Set(world.history.educationEnrollments.map((row) => row.personId)),
  ].sort()) {
    if (currentSchooling(world, pupilId)?.status !== "active") continue;
    if (world.people[pupilId]!.homeJurisdictionId === to) continue;
    const plan = planMove(
      world,
      {
        stableKey: "probe",
        personId: pupilId,
        toJurisdictionId: to,
        reason: "life-course:unrecorded",
        waveKey: null,
        endsHousing: true,
      },
      context,
    );
    if (plan.kind !== "planned") continue;
    const parentId = parentsOf(world, pupilId).find(
      (id) =>
        plan.move.personIds.includes(id) &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
    );
    if (parentId) return { world, playerId, stateKey, to, pupilId, parentId };
  }
  return { world, playerId, stateKey, to, pupilId: null, parentId: null };
}

/** How many of a parent's children have a school-year move on record. */
function parentsOfMoved(world: World, parentId: EntityId): number {
  return childrenOf(world, parentId).filter(
    (childId) => schoolYearMovesOf(world, childId).length > 0,
  ).length;
}

const SCHOOL_SEED = "lives-step-3b-school-move";

describe(`a child pulled out of school mid-year shifts a parent's view (seed ${SCHOOL_SEED})`, () => {
  it("the move writes the child's entry, the parent reflects on it, and says so", () => {
    const { world, playerId, stateKey, to, pupilId, parentId } =
      movingFamilyIn(SCHOOL_SEED);
    const label = `${stateKey}, seed ${SCHOOL_SEED}, opening ${world.currentDate}`;
    expect(schoolTermOn(world.currentDate), label).not.toBeNull();
    expect(pupilId, label).not.toBeNull();
    const moved = relocateHousehold(world, {
      stableKey: "lives-3b-move",
      personId: pupilId!,
      toJurisdictionId: to,
      reason: "life-course:unrecorded",
      waveKey: null,
      endsHousing: true,
    });
    const [entry] = schoolYearMovesOf(moved, pupilId!);
    expect(entry, label).toBeDefined();
    // One outcome for each of the parent's children who left school in the
    // move, each read from that child's own entry.
    const children = parentsOfMoved(moved, parentId!);
    expect(
      livedOutcomesOf(moved, parentId!).filter(
        (row) => row.kind === "school-move",
      ),
      label,
    ).toHaveLength(children);
    expect(livedOutcomesOf(moved, parentId!), label).toContainEqual({
      kind: "school-move",
      at: moved.currentDate,
      sourceRecordId: entry!.id,
      direction: "cost",
      felt: { share: 0.1, estimated: true },
    });
    expect(
      moved.history.futureDueItems.some(
        (item) =>
          item.stableKey === livedOutcomeReflectionKey(parentId!, entry!.id),
      ),
      label,
    ).toBe(true);

    const after = passOrdinaryDays(moved, 4);
    const officialId = officialAnsweringFor(
      after,
      parentId!,
      "local-executive",
    );
    // The family now lives at the state's own jurisdiction, where no local
    // government is recorded, so the view falls to the governor.
    expect(officialId, label).toBe(
      currentGovernorOf(after, stateKey.slice(3))?.personId,
    );
    const reflection = after.history.events.find(
      (event) =>
        event.stableKey ===
        livedOutcomeReflectionEventKey(parentId!, {
          sourceRecordId: entry!.id,
        }),
    );
    expect(reflection?.type, label).toBe(LIVED_OUTCOME_REFLECTION_EVENT_TYPE);
    // The parent thinks over each child's move; the saved view is the latest.
    const reflections = livedOutcomesOf(after, parentId!)
      .filter((row) => row.kind === "school-move")
      .map(
        (row) =>
          after.history.events.find(
            (event) =>
              event.stableKey ===
              livedOutcomeReflectionEventKey(parentId!, row),
          )!.id,
      );
    expect(reflections, label).toHaveLength(children);
    const view = viewOfOfficial(after, parentId!, officialId!);
    expect(
      view.belief?.formation.relevantEventIds.some((id) =>
        reflections.includes(id),
      ),
      label,
    ).toBe(true);
    expect(view.belief!.position, label).not.toBe("support");
    assertWorldIntegrity(after);
    const official = after.people[officialId!]!;
    const line = officialViewLine(after, parentId!, playerId, []);
    console.log(
      `${label}: ${official.givenName} ${official.familyName} answers; points ${view.points.toFixed(2)}; "${line?.text}"`,
    );
    expect(view.points, label).toBeLessThan(0);
    // The child named is the one whose move the latest view weighed.
    const named = childrenOf(after, parentId!)
      .filter((childId) => schoolYearMovesOf(after, childId).length > 0)
      .map((childId) => after.people[childId]!.givenName);
    expect(
      named.some((name) => line?.text.includes(name)),
      label,
    ).toBe(true);
    expect(line?.text, label).toContain(
      `${official.givenName} ${official.familyName}`,
    );
  }, 60_000);
});
