import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../../tests/fixtures/state-executive-entry";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { currentGovernorOf } from "../crisis/offices";
import { ageOnDate } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { activeWorkRelationshipsAt, workStatusHistory } from "../life-queries";
import { viewOfOfficial } from "../official-view-reads";
import {
  createFormationContext,
  recordPrivateBelief,
  recordPublicPosition,
} from "../politics";
import { recordWorldEvent } from "../world";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
} from "../public-information-integrity";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  closeKin,
  hearersOfPerson,
  livedOutcomeReflectionEventKey,
  recordStoryHeardOfficialViews,
} from "./official-views";
import {
  jobsLostBy,
  recordTownJobLoss,
  TOWN_JOB_END_REASONS,
} from "./town-labor-market";

const SEED = "b07-p2-word-of-mouth-20261006";

/** A state or territory from all 56, named by its seed. */
function drawState(seed: string): string {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  return states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!
    .jurisdictionKey;
}

function layOff(world: World, workerId: EntityId): World {
  const job = activeWorkRelationshipsAt(world, workerId)[0]!.relationship;
  const latest = workStatusHistory(world, job.id).at(-1)!;
  return recordTownJobLoss(world, {
    stableKey: `word-of-mouth-test:layoff:${job.id}`,
    workRelationshipId: job.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: TOWN_JOB_END_REASONS.laidOff,
    supersedesStatusId: latest.id,
    provenance: { kind: "authored", note: "A layoff for the test." },
  });
}

/**
 * A grown resident with a job, who is not the player or the governor, and who
 * still talks politics with a relative or housemate once the job has ended (a
 * coworker stops being someone they know through work), in an ordinary
 * opening life in the drawn place.
 */
function talkativeWorkerIn(seed: string) {
  const stateKey = drawState(seed);
  const { world, personId } = adultLifeIn(stateKey.slice(3), seed);
  const governor = currentGovernorOf(world, stateKey.slice(3));
  const workerId = world.personOrder
    .filter(
      (id) =>
        id !== personId &&
        id !== governor?.personId &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
        activeWorkRelationshipsAt(world, id).length > 0,
    )
    .find((id) => {
      const laidOff = layOff(world, id);
      return hearersOfPerson(laidOff, id).some(
        (hearer) =>
          hearer !== governor?.personId &&
          hearer !== personId &&
          closeKin(laidOff, id, hearer),
      );
    });
  return { world, playerId: personId, stateKey, governor, workerId };
}

describe(`a view of an official travels to the people its holder talks politics with (seed ${SEED})`, () => {
  it("passes on a view formed from a published story", () => {
    const { world, governor, workerId } = talkativeWorkerIn(
      `${SEED}:published-story`,
    );
    expect(governor).not.toBeNull();
    expect(workerId).toBeDefined();
    const personId = workerId!;
    const officialId = governor!.personId;
    const propositionId = Object.keys(
      world.policyCatalog.propositions,
    )[0]! as EntityId;
    const prior = recordPrivateBelief(world, {
      stableKey: `word-of-mouth:story-prior:${personId}`,
      personId,
      propositionId,
      formedAt: world.currentDate,
      position: "support",
      conviction: "moderate",
      salience: "moderate",
      flexibility: "open",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const basis = recordWorldEvent(prior, {
      stableKey: `word-of-mouth:story-basis:${personId}`,
      type: "fixture.official-act",
      occurredAt: prior.currentDate,
      recordedAt: prior.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [officialId],
      participants: [
        { personId: officialId, role: "agency:actor", detail: null },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "Recorded official act fixture.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const basisEventId = basis.history.events.at(-1)!.id;
    let next = recordPublicPosition(basis, {
      stableKey: `word-of-mouth:story-position:${personId}`,
      personId: officialId,
      propositionId,
      statedAt: basis.currentDate,
      stance: "oppose",
      statement: "Fixture stance.",
      audience: "public",
      venue: null,
      sourceEventId: basisEventId,
      supersedesPublicPositionId: null,
    });
    const leadId = `word-of-mouth:story-lead:${personId}` as EntityId;
    const publicationId = `word-of-mouth:publication:${personId}` as EntityId;
    next = recordWorldEvent(next, {
      stableKey: `word-of-mouth:published-story:${personId}`,
      type: PRESS_STORY_EVENT_TYPE,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "focus:subject", detail: null }],
      personFactConstraints: [],
      visibility: "public",
      tags: [`${PRESS_STORY_LEAD_TAG}${leadId}`],
      summary: "Fixture story.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const story = next.history.events.at(-1)!;
    next = {
      ...next,
      history: {
        ...next.history,
        pressRecords: [
          ...(next.history.pressRecords ?? []),
          { id: leadId, kind: "story-lead", basisEventIds: [basisEventId] },
        ],
        publications: [
          ...(next.history.publications ?? []),
          {
            id: publicationId,
            sourceEventId: story.id,
            kind: "press-story",
            publishedAt: next.currentDate,
            recordedAt: next.currentDate,
          },
        ],
      },
    } as unknown as World;
    const sequence = next.history.nextSequence;
    const knowledge = {
      ...next,
      history: {
        ...next.history,
        nextSequence: sequence + 1,
        knowledge: [
          ...next.history.knowledge,
          {
            id: `word-of-mouth:story-knowledge:${personId}` as EntityId,
            stableKey: `word-of-mouth:story-knowledge:${personId}`,
            sequence,
            personId,
            eventId: story.id,
            learnedAt: next.currentDate,
            believedSummary: "Fixture reported act.",
            accuracy: "accurate",
            confidence: "high",
            source: { kind: "media", reference: publicationId },
          },
        ],
      },
    } as unknown as World;
    const knowledgeId = knowledge.history.knowledge.at(-1)!.id;
    const after = recordStoryHeardOfficialViews(knowledge, knowledgeId);
    const told = after.history.knowledge.filter(
      (row) =>
        row.eventId === story.id &&
        row.source.kind === "told-by" &&
        row.source.sourcePersonId === personId,
    );
    expect(told.length).toBeGreaterThan(0);
    expect(told.some((row) => closeKin(after, personId, row.personId))).toBe(
      true,
    );
    expect(
      viewOfOfficial(after, personId, officialId).belief?.position,
    ).not.toBeNull();
    expect(
      recordStoryHeardOfficialViews(after, knowledgeId).history.knowledge,
    ).toHaveLength(after.history.knowledge.length);
  });

  it("tells each hearer who told them, lets a relative weigh it in their own view, and does not tell it again", () => {
    const { world, playerId, stateKey, governor, workerId } =
      talkativeWorkerIn(SEED);
    const label = `${stateKey}, seed ${SEED}`;
    expect(governor, label).not.toBeNull();
    expect(workerId, label).toBeDefined();
    const laidOff = layOff(world, workerId!);
    const hearers = hearersOfPerson(laidOff, workerId!).filter(
      (id) => id !== governor!.personId,
    );
    const before = new Map(
      hearers.map((id) => [
        id,
        viewOfOfficial(laidOff, id, governor!.personId).belief,
      ]),
    );
    const [lost] = jobsLostBy(laidOff, workerId!);
    const after = passOrdinaryDays(laidOff, 4);
    const reflection = after.history.events.find(
      (event) =>
        event.stableKey ===
        livedOutcomeReflectionEventKey(workerId!, { sourceRecordId: lost!.id }),
    )!;
    expect(reflection, label).toBeDefined();
    const held = viewOfOfficial(after, workerId!, governor!.personId).belief;
    expect(held?.position, label).not.toBeNull();

    let weighed = 0;
    for (const id of hearers) {
      const told = after.history.knowledge.find(
        (row) =>
          row.personId === id &&
          row.eventId === reflection.id &&
          row.source.kind === "told-by" &&
          row.source.sourcePersonId === workerId,
      );
      expect(told, `${label}: ${id} was told`).toBeDefined();
      const mine = viewOfOfficial(after, id, governor!.personId).belief;
      if (id === playerId || !closeKin(after, workerId!, id)) {
        // The player decides for themselves; a warm tie further out knows what
        // the person thinks and has decided nothing from it.
        expect(mine?.id ?? null, `${label}: ${id}`).toBe(
          before.get(id)?.id ?? null,
        );
        continue;
      }
      expect(mine, `${label}: ${id} weighed it`).not.toBeNull();
      const trace = after.history.decisionTraces.find(
        (row) => row.id === mine!.formation.decisionTraceIds[0],
      )!;
      expect(
        trace.context.considerations.some((row) =>
          row.stableKey.includes("told-view:"),
        ),
        label,
      ).toBe(true);
      weighed += 1;
    }
    expect(weighed, label).toBeGreaterThan(0);
    // What was told is not told again: no hearer is the source of anything.
    for (const id of hearers)
      expect(
        after.history.knowledge.some(
          (row) =>
            row.source.kind === "told-by" && row.source.sourcePersonId === id,
        ),
        `${label}: ${id} did not pass it on`,
      ).toBe(false);
    assertWorldIntegrity(after);
  }, 180_000);
});
