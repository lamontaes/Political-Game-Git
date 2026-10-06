import { describe, expect, it } from "vitest";
import {
  addDays,
  applyCharacterHistoryPlan,
  assertWorldIntegrity,
  characterHistoryContextPersonId,
  createEducationEnrollment,
  createOrganization,
  makeIsoDate,
} from "../simulation";
import { recordFamilyAddition } from "../simulation/people-family";
import type { EntityId, World } from "../simulation";
import { upbringingFor } from "../simulation/people-upbringing";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  caregiverFor,
  playChildhoodMoment,
  projectChildhoodMoment,
} from "./childhood";

function parentLife(seed: string, childAge = 6) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 30 }),
  ).game!;
  const parentId = game.playerPersonId;
  const family = recordFamilyAddition(game.world, {
    kind: "birth",
    stableKey: `b21-parent-moment:${seed}:child`,
    occurredAt: addDays(game.world.currentDate, -childAge * 366),
    parentPersonIds: [parentId],
  });
  return {
    parentId,
    childId: family.childPersonId,
    world:
      childAge > 7
        ? addSchoolPeer(family.world, family.childPersonId, seed)
        : family.world,
  };
}

function addSchoolPeer(world: World, childId: EntityId, seed: string): World {
  const peerId = characterHistoryContextPersonId(
    world,
    `b21-parent-moment:${seed}:peer`,
  );
  const child = world.people[childId]!;
  const formed = createOrganization(world, {
    stableKey: `b21-parent-moment:${seed}:school`,
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: "A local primary school for this fixture.",
    },
    initialProfile: {
      name: "Local Primary School",
      classification: "service:school",
      locationJurisdictionId: child.homeJurisdictionId,
    },
  });
  const peerBorn = makeIsoDate(child.birthDate);
  const result = applyCharacterHistoryPlan(formed, {
    stableKey: `b21-parent-moment:${seed}:school-mates`,
    mode: "quick-generated",
    personId: childId,
    transitions: [
      {
        kind: "context-person",
        input: {
          stableKey: `b21-parent-moment:${seed}:peer`,
          givenName: "Taylor",
          familyName: "Lane",
          birthDate: peerBorn,
          homeJurisdictionId: child.homeJurisdictionId,
        },
      },
    ],
  });
  const schoolId = result.world.history.organizations.at(-1)!.id;
  let enrolled = createEducationEnrollment(result.world, {
    stableKey: `b21-parent-moment:${seed}:child-enrollment`,
    personId: childId,
    organizationId: schoolId,
    startedAt: world.currentDate,
    programKind: "schooling:elementary",
    contextKind: "stage:primary",
    provenance: {
      kind: "authored",
      note: "School enrollment in test fixture.",
    },
  });
  enrolled = createEducationEnrollment(enrolled, {
    stableKey: `b21-parent-moment:${seed}:peer-enrollment`,
    personId: peerId,
    organizationId: schoolId,
    startedAt: world.currentDate,
    programKind: "schooling:elementary",
    contextKind: "stage:primary",
    provenance: {
      kind: "authored",
      note: "Same-class enrollment in test fixture.",
    },
  });
  return enrolled;
}

describe("B21 childhood moments with the player as caregiver", () => {
  it("lets the parent choose in caregiver-led years and records their agency", () => {
    const { parentId, childId, world } = parentLife("b21-parent-moment");
    expect(caregiverFor(world, childId)).toBe(parentId);

    const moment = projectChildhoodMoment(world, childId)!;
    expect(moment.agency).toBe("caregiver-led");
    expect(moment.action).toBe("choose");
    expect(moment.note).toMatch(/You are raising/);
    const optionKey = moment.scene!.options[0]!.key;

    const played = playChildhoodMoment(world, { personId: childId, optionKey });

    expect(played.history.events.length).toBeGreaterThan(
      world.history.events.length,
    );
    const caregiverEvent = played.history.events.find(
      (event) =>
        event.type === "life.formative-caregiver-choice" &&
        event.tags.includes("caregiver-choice"),
    )!;
    expect(caregiverEvent).toMatchObject({
      involvedEntityIds: expect.arrayContaining([childId, parentId]),
      tags: expect.arrayContaining([
        `caregiver-choice.subject:${childId}`,
        `caregiver-choice.caregiver:${parentId}`,
        `choice.${optionKey}`,
      ]),
    });
    expect(upbringingFor(played, childId).caregiving).not.toBe(
      "estimated-care",
    );
    expect(
      played.history.knowledge.some(
        (record) =>
          record.personId === childId && record.eventId === caregiverEvent.id,
      ),
    ).toBe(true);
    expect(
      played.history.memories.some(
        (memory) =>
          memory.personId === parentId &&
          memory.eventId === caregiverEvent.id &&
          memory.rememberedSummary.includes("You chose"),
      ),
    ).toBe(true);
    assertWorldIntegrity(played);
  });

  it("lets the child decide in shared years while the parent gives a steer", () => {
    const { parentId, childId, world } = parentLife(
      "b21-shared-parent-moment",
      10,
    );
    const moment = projectChildhoodMoment(world, childId)!;
    expect(moment.agency).toBe("shared");
    expect(moment.actionLabel).toBe("Guide");
    const steerOptionKey = moment.scene!.options.at(-1)!.key;

    const played = playChildhoodMoment(world, {
      personId: childId,
      optionKey: steerOptionKey,
    });

    expect(played.history.events).toContainEqual(
      expect.objectContaining({
        type: "life.formative-caregiver-choice",
        involvedEntityIds: expect.arrayContaining([childId, parentId]),
        tags: expect.arrayContaining([
          "caregiver-choice.decision-maker:child",
          `caregiver-choice.steer:${steerOptionKey}`,
        ]),
      }),
    );
    expect(
      played.history.decisionTraces.some(
        (trace) =>
          trace.context.actorPersonId === childId &&
          trace.context.decisionType === "people.shared-caregiver-choice",
      ),
    ).toBe(true);
    assertWorldIntegrity(played);
  });
});
