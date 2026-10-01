import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../../tests/fixtures/state-executive-entry";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { officialViewLine } from "../../presentation/small-talk-english";
import { currentGovernorOf } from "../crisis/offices";
import { ageOnDate } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { activeWorkRelationshipsAt, workStatusHistory } from "../life-queries";
import { townSupportFromViews, viewOfOfficial } from "../official-view-reads";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { livedOutcomeReflectionKey } from "../law-exposure";
import { livedOutcomesOf } from "./lived-outcomes";
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
