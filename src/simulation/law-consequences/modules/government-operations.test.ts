import { describe, expect, it } from "vitest";
import startingLawResearch from "../../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { applyLawConsequences } from "../../enacted-law-effects";
import { lawInForce } from "../../governing/law-in-force";
import { lifePlaces } from "../../life-places";
import {
  householdLocationAt,
  householdMembershipsAt,
} from "../../life-queries";
import { createLawConsequenceRegistry } from "../../law-consequence-registry";
import { validateLawConsequences } from "../../law-consequence-validation";
import type { World } from "../../types";
import { deserializeWorld, serializeWorld } from "../../serialization";
import { lawPermissionRecords } from "../permission-records";
import { lawExposuresOf } from "../../law-exposure";
import {
  GOVERNMENT_OPERATIONS_LAW_ROWS,
  GOVERNMENT_OPERATIONS_QUESTION_KEYS,
} from "../government-operations-rows";
import { GOVERNMENT_OPERATIONS_REGISTRATION } from "./government-operations/index";

const { photoId, lobbying, sameDayRegistration } =
  GOVERNMENT_OPERATIONS_QUESTION_KEYS;
const research = startingLawResearch as {
  questions: Record<string, { answers: Record<string, { answer: string }> }>;
};

/** Session20's manifest/catalog admission is pending; this is the explicit local test stub. */
function includeGovernmentOperationsRows(world: World): World {
  const propositions = { ...world.policyCatalog.propositions };
  for (const [questionKey, row] of Object.entries(
    GOVERNMENT_OPERATIONS_LAW_ROWS,
  )) {
    const proposition = Object.values(propositions).find(
      (entry) => entry.stableKey === questionKey,
    );
    if (!proposition) throw new Error(`Missing proposition ${questionKey}`);
    propositions[proposition.id] = {
      ...proposition,
      consequences: [...(proposition.consequences ?? []), row],
    };
  }
  return {
    ...world,
    policyCatalog: { ...world.policyCatalog, propositions },
  };
}

function seededState(
  seed: string,
  questionKey: string,
): (typeof stateStarts)[number] {
  const eligible = stateStarts.filter(
    (place) =>
      place.stateJurisdictionKey !== null &&
      research.questions[questionKey]?.answers[place.stateJurisdictionKey]
        ?.answer === "yes",
  );
  if (!eligible.length)
    throw new Error(`No supported state starts with ${questionKey}`);
  const draw = [...seed].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );
  return eligible[draw % eligible.length]!;
}

const stateStarts = lifePlaces()
  .filter((place) => place.scope === "state")
  .sort((left, right) => left.key.localeCompare(right.key));

describe("government-operations law consequences", () => {
  it("validates all three rows against the module's explicit pending-registry stub", () => {
    const registry = createLawConsequenceRegistry([
      GOVERNMENT_OPERATIONS_REGISTRATION,
    ]);
    expect(
      validateLawConsequences(
        Object.values(GOVERNMENT_OPERATIONS_LAW_ROWS),
        registry.capabilities,
      ),
    ).toEqual([]);
  });

  it("applies and preserves supported voter-rule effects in seeded new games without inventing missing persons or events", () => {
    const seed = "lw01-random-place-cause-chain";
    const photoPlace = seededState(seed, photoId);
    const photoGame = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: photoPlace.key,
      startAge: 28,
      givenName: "LW01",
      familyName: "Resident",
    });
    const photoWorld = includeGovernmentOperationsRows(photoGame.world);
    const personId = photoGame.playerPersonId;
    const cutoff = {
      asOfDate: photoWorld.currentDate,
      historySequenceExclusive: photoWorld.history.nextSequence,
    };
    const membership = householdMembershipsAt(photoWorld, personId, cutoff)[0]!;
    const location = householdLocationAt(
      photoWorld,
      membership.membership.householdId,
      cutoff,
    )!;
    const photoQuestion = Object.values(
      photoWorld.policyCatalog.propositions,
    ).find((entry) => entry.stableKey === photoId)!;
    const photoLaw = lawInForce(
      photoWorld,
      location.jurisdictionId!,
      photoQuestion.id,
      photoWorld.currentDate,
    );
    expect(photoLaw?.answer).toBe("yes");
    const photoResult = applyLawConsequences(
      photoWorld,
      {
        onDate: photoWorld.currentDate,
        activity: "effective",
        activityId: membership.membership.id,
        subjectIds: [personId],
        questionKey: photoId,
      },
      [GOVERNMENT_OPERATIONS_REGISTRATION],
    );
    const photoRecord = lawPermissionRecords(photoResult).find(
      (record) =>
        record.subject.id === personId &&
        record.permissionKey === "election.vote-without-photo-id-requirement",
    );
    expect(photoRecord).toMatchObject({
      status: "prohibited",
      effectiveAt: photoWorld.currentDate,
      lawEffectStamps: [
        {
          governingLawKey: photoLaw!.measureId,
          questionKey: photoId,
          jurisdictionId: location.jurisdictionId,
          sourceRecordIds: [membership.membership.id, location.id],
        },
      ],
    });
    const photoEffect = photoResult.history.events.find((event) =>
      event.tags.includes(`permission:${photoRecord!.id}`),
    )!;
    const photoExposure = lawExposuresOf(photoResult, personId).find(
      (exposure) => exposure.measureId === photoLaw!.measureId,
    );
    expect(photoExposure).toMatchObject({
      measureId: photoLaw!.measureId,
      channel: "public-service",
      direction: "none",
      amount: null,
      sourceRecordId: photoEffect.id,
    });
    const reopenedPhoto = deserializeWorld(serializeWorld(photoResult));
    expect(
      lawPermissionRecords(reopenedPhoto).find(
        (record) => record.stableKey === photoRecord!.stableKey,
      ),
    ).toEqual(photoRecord);

    const registrationSeed = `${seed}:same-day-registration`;
    const registrationPlace = seededState(
      registrationSeed,
      sameDayRegistration,
    );
    const registrationGame = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: registrationSeed,
      placeKey: registrationPlace.key,
      startAge: 28,
      givenName: "LW01",
      familyName: "Resident",
    });
    const registrationWorld = includeGovernmentOperationsRows(
      registrationGame.world,
    );
    const residentId = registrationGame.playerPersonId;
    const registrationCutoff = {
      asOfDate: registrationWorld.currentDate,
      historySequenceExclusive: registrationWorld.history.nextSequence,
    };
    const residentMembership = householdMembershipsAt(
      registrationWorld,
      residentId,
      registrationCutoff,
    )[0]!;
    const residentLocation = householdLocationAt(
      registrationWorld,
      residentMembership.membership.householdId,
      registrationCutoff,
    )!;
    const registrationQuestion = Object.values(
      registrationWorld.policyCatalog.propositions,
    ).find((entry) => entry.stableKey === sameDayRegistration)!;
    const registrationLaw = lawInForce(
      registrationWorld,
      residentLocation.jurisdictionId!,
      registrationQuestion.id,
      registrationWorld.currentDate,
    );
    expect(registrationLaw?.answer).toBe("yes");
    const registrationResult = applyLawConsequences(
      registrationWorld,
      {
        onDate: registrationWorld.currentDate,
        activity: "effective",
        activityId: residentMembership.membership.id,
        subjectIds: [residentId],
        questionKey: sameDayRegistration,
      },
      [GOVERNMENT_OPERATIONS_REGISTRATION],
    );
    const registrationRecord = lawPermissionRecords(registrationResult).find(
      (record) =>
        record.subject.id === residentId &&
        record.permissionKey === "election.same-day-registration",
    );
    expect(registrationRecord?.status).toBe("permitted");
    const registrationEffect = registrationResult.history.events.find((event) =>
      event.tags.includes(`permission:${registrationRecord!.id}`),
    )!;
    const registrationExposure = lawExposuresOf(
      registrationResult,
      residentId,
    ).find((exposure) => exposure.measureId === registrationLaw!.measureId);
    expect(registrationExposure).toMatchObject({
      measureId: registrationLaw!.measureId,
      channel: "public-service",
      direction: "none",
      amount: null,
      sourceRecordId: registrationEffect.id,
    });
    const reopenedRegistration = deserializeWorld(
      serializeWorld(registrationResult),
    );
    expect(
      lawPermissionRecords(reopenedRegistration).find(
        (record) => record.stableKey === registrationRecord!.stableKey,
      ),
    ).toEqual(registrationRecord);

    const photoPerson = reopenedPhoto.people[personId]!;
    const voter = reopenedRegistration.people[residentId]!;
    console.log(
      `LW-01 cause chain: ${photoPlace.displayName}: ${photoId} (${photoLaw!.measureId}) → photo ID required to vote → ${photoPerson.givenName} ${photoPerson.familyName} (${personId})`,
    );
    console.log(
      `LW-01 cause chain: ${registrationPlace.displayName}: ${sameDayRegistration} (${registrationLaw!.measureId}) → same-day registration permitted → ${voter.givenName} ${voter.familyName} (${residentId})`,
    );

    const lobbyPlace = seededState(seed, lobbying);
    const lobbyGame = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `${seed}:lobbying`,
      placeKey: lobbyPlace.key,
      startAge: 28,
      givenName: "LW01",
      familyName: "Resident",
    });
    const lobbyWorld = includeGovernmentOperationsRows(lobbyGame.world);
    const lobbyPersonId = lobbyGame.playerPersonId;
    const lobbyCutoff = {
      asOfDate: lobbyWorld.currentDate,
      historySequenceExclusive: lobbyWorld.history.nextSequence,
    };
    const lobbyMembership = householdMembershipsAt(
      lobbyWorld,
      lobbyPersonId,
      lobbyCutoff,
    )[0]!;
    const lobbyLocation = householdLocationAt(
      lobbyWorld,
      lobbyMembership.membership.householdId,
      lobbyCutoff,
    )!;
    const lobbyLaw = lawInForce(
      lobbyWorld,
      lobbyLocation.jurisdictionId!,
      Object.values(lobbyWorld.policyCatalog.propositions).find(
        (entry) => entry.stableKey === lobbying,
      )!.id,
      lobbyWorld.currentDate,
    );
    expect(lobbyLaw?.answer).toBe("yes");
    const recordedFormerOfficials = lobbyGame.world.history.workRelationships
      .filter(
        (relationship) =>
          relationship.kind === "employment:legislative-member" ||
          relationship.kind === "employment:executive-office",
      )
      .filter((relationship) =>
        lobbyGame.world.history.workStatuses.some(
          (status) =>
            status.workRelationshipId === relationship.id &&
            status.status === "ended",
        ),
      );
    expect(recordedFormerOfficials).toEqual([]);
    expect(
      lawPermissionRecords(lobbyWorld).some(
        (record) => record.permissionKey === "lobbying.former-public-official",
      ),
    ).toBe(false);
    const lobbyResult = applyLawConsequences(
      lobbyWorld,
      {
        onDate: lobbyWorld.currentDate,
        activity: "effective",
        activityId: lobbyMembership.membership.id,
        subjectIds: [lobbyPersonId],
        questionKey: lobbying,
      },
      [GOVERNMENT_OPERATIONS_REGISTRATION],
    );
    expect(lawPermissionRecords(lobbyResult)).toEqual(
      lawPermissionRecords(lobbyWorld),
    );
    expect(lobbyResult.history.lawExposures).toEqual(
      lobbyWorld.history.lawExposures,
    );
    console.log(
      `LW-01 lobbying proof gap: ${lobbyPlace.displayName} has the law in force, but the fresh world has no recorded former public official; the module writes no person effect without that source record.`,
    );
  });
});
