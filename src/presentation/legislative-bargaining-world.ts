import {
  applyCharacterHistoryPlan,
  chamberByKey,
  characterHistoryContextPersonId,
  drawCanonicalName,
  floorStageByKey,
  legislativeBlueprint,
  makeIsoDate,
  measurePosition,
  recordFiledProvision,
  recordRelationshipInteraction,
  recordWorldEvent,
  seatBodyForPack,
  authoredScenarioSeatCount,
  personName,
  SeededRng,
} from "../simulation";
import type {
  EntityId,
  IsoDate,
  LegislativeBlueprint,
  SeatedBody,
  World,
} from "../simulation";
import {
  bargainingBriefSupports,
  bargainingRoomContexts,
  bargainingScenePeople,
  bargainingSubjectFacts,
  FILED_SECTION_BRIEFS,
  FISCAL_NOTE_SUMMARY,
  formatPresentationTime,
  PRIOR_ADVOCATE_HISTORY_SUMMARY,
  PRIOR_GUARDIAN_HISTORY_SUMMARY,
  playerHasReadFiscalNoteFor,
  type LegislativeBargainingSeat,
} from "./legislative-bargaining-brief";
import {
  createLegislativeBargainingProgress,
  withAnalysisSeen,
} from "./legislative-bargaining";
import { resolvePlayerCapabilities, withheldReason } from "./player-capabilities";
import type { LegislativeAssignment } from "./legislation-world";

/**
 * The one question a seated winner's route is allowed to ask:
 *
 *   "Given this canonical player World, does this player currently have a
 *    truthful legislative bargaining context?"
 *
 * Everything in the answer is derived from the world the player actually
 * carries — the seat their election win recorded, the jurisdiction that seat
 * governs (never the one they live in), the measure their own office
 * introduced and walked to the floor, and the colleagues this world models.
 * Nothing is accepted from a caller as a synthetic scenario, and nothing is
 * borrowed from the developer floor fixture, which this module does not
 * import.
 *
 * FAIL CLOSED. Every missing fact returns an explicit reason instead of a
 * substitute: no seat, no rule-pack surface, no authored sitting for this
 * legislature, no bill, or a bill that has not reached the floor. A player who
 * lost the election never gets past the first gate, because losing records no
 * legislative work relationship for capabilities to find.
 */

export type LegislativeBargainingEntry =
  | {
      readonly kind: "available";
      /** The player's world, with the sitting's canonical records ensured. */
      readonly world: World;
      readonly seat: LegislativeBargainingSeat;
    }
  | {
      readonly kind: "unavailable";
      /** Said plainly. Never a fixture, never another jurisdiction's chamber. */
      readonly reason: string;
    };

export interface OpenLegislativeBargainingInput {
  readonly playerPersonId: EntityId;
  /** The bill already opened through the ordinary Work route. */
  readonly assignment: LegislativeAssignment;
}

export function openLegislativeBargaining(
  world: World,
  input: OpenLegislativeBargainingInput,
): LegislativeBargainingEntry {
  const capabilities = resolvePlayerCapabilities(world);
  if (capabilities.personId !== input.playerPersonId) {
    throw new Error(
      "The bargaining route can only be opened for the controlled character.",
    );
  }
  if (!capabilities.legislation) {
    return {
      kind: "unavailable",
      reason:
        withheldReason(capabilities, "legislation") ??
        "This character holds no legislative seat.",
    };
  }
  const scenarioKey = capabilities.legislativeScenarioKey;
  const governingJurisdictionId = capabilities.legislativeJurisdictionId;
  if (!scenarioKey || !governingJurisdictionId) {
    return {
      kind: "unavailable",
      reason: "This legislature has no accepted rule-pack surface.",
    };
  }
  if (!bargainingBriefSupports(scenarioKey)) {
    return {
      kind: "unavailable",
      reason: `No bargaining sitting is authored for the ${capabilities.workPlace?.displayName ?? scenarioKey} legislature yet.`,
    };
  }
  if (input.assignment.scenarioKey !== scenarioKey) {
    return {
      kind: "unavailable",
      reason: "The open bill does not belong to this character's legislature.",
    };
  }

  const blueprint = legislativeBlueprint(scenarioKey);
  const measureId = input.assignment.measureId;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === measureId,
  );
  if (!measure) {
    return {
      kind: "unavailable",
      reason: `${blueprint.designation} has not been taken up in this world.`,
    };
  }
  if (measure.jurisdictionId !== governingJurisdictionId) {
    return {
      kind: "unavailable",
      reason: "The bill on file belongs to a different jurisdiction.",
    };
  }

  const position = measurePosition(world, measureId);
  if (position.phase !== "on-floor") {
    return {
      kind: "unavailable",
      reason: `${blueprint.designation} is not on the floor yet; the members' room has nothing to bargain over until it is.`,
    };
  }
  const chamberKey = position.chamberKey ?? blueprint.pack.chamberOrder[0]!;
  const chamber = chamberByKey(blueprint.pack, chamberKey);
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");

  // The colleagues this sitting models, persisted through the same accepted
  // context-person seam the sponsoring member already uses. Created once,
  // found thereafter — a reload reaches the same people by the same stable
  // keys.
  let next = world;
  next = ensureContextPerson(next, {
    stableKey: `legislative-work:${scenarioKey}:advocate`,
    playerPersonId: input.playerPersonId,
    jurisdictionId: governingJurisdictionId,
  });
  next = ensureContextPerson(next, {
    stableKey: `legislative-work:${scenarioKey}:guardian`,
    playerPersonId: input.playerPersonId,
    jurisdictionId: governingJurisdictionId,
  });
  next = ensureContextPerson(next, {
    stableKey: `legislative-work:${scenarioKey}:analyst`,
    playerPersonId: input.playerPersonId,
    jurisdictionId: governingJurisdictionId,
  });
  const advocatePersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:advocate`,
  );
  const guardianPersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:guardian`,
  );
  const analystPersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:analyst`,
  );

  next = ensureFiledBillText(next, scenarioKey, measureId, measure.jurisdictionId);
  next = ensureFiscalNote(next, {
    scenarioKey,
    measureId,
    jurisdictionId: measure.jurisdictionId,
    analystPersonId,
  });
  next = ensurePriorWorkingHistory(next, {
    scenarioKey,
    playerPersonId: input.playerPersonId,
    advocatePersonId,
    guardianPersonId,
  });

  const bodies = seatBargainingBodies(next, blueprint, {
    playerPersonId: input.playerPersonId,
    sponsorPersonId: input.assignment.sponsorPersonId,
    advocatePersonId,
    guardianPersonId,
  });

  const facts = bargainingSubjectFacts({
    measureId,
    measureStableKey: measure.stableKey,
    designation: blueprint.designation,
    shortTitle: blueprint.shortTitle,
    chamberName: chamber.name,
    nextStepLabel: stage.label.toLowerCase(),
    fiscalNoteEventStableKey: fiscalNoteStableKey(scenarioKey),
    analystPersonId,
    advocatePersonId,
    guardianPersonId,
  });
  let progress = createLegislativeBargainingProgress(facts);

  const guardian = next.people[guardianPersonId]!;
  const { roomContext, privateRoomContext } = bargainingRoomContexts({
    sceneKeyPrefix: `legislative-work:${scenarioKey}:floor`,
    chamberName: chamber.name,
    jurisdictionId: measure.jurisdictionId,
    playerPersonId: input.playerPersonId,
    advocatePersonId,
    guardianPersonId,
    guardianFamilyName: guardian.familyName,
  });

  const seat: LegislativeBargainingSeat = {
    scenario: {
      ...input.assignment.procedure,
      bodies,
    },
    measureId,
    measureStableKey: measure.stableKey,
    playerPersonId: input.playerPersonId,
    advocatePersonId,
    guardianPersonId,
    analystPersonId,
    scenePeople: bargainingScenePeople({
      chamberName: chamber.name,
      advocatePersonId,
      guardianPersonId,
    }),
    roomContext,
    privateRoomContext,
    progress,
    locationDisplayName: `${next.jurisdictions[measure.jurisdictionId]?.name ?? blueprint.label} State Capitol`,
    locationLabel: "Capitol · Members' room",
    presentationTime: formatPresentationTime(next.currentMoment.minuteOfDay),
    floorIntents: ["offer-targeted-provision", "counter-with-cap"],
  };

  // What the player already canonically knows survives a save and a reload;
  // the sitting's opening state reads it back rather than starting the memory
  // over.
  if (playerHasReadFiscalNoteFor(next, seat)) {
    progress = withAnalysisSeen(progress);
  }

  return { kind: "available", world: next, seat: { ...seat, progress } };
}

/* -------------------------------------------------------------------------- */
/* Canonical record seeding, all idempotent                                    */
/* -------------------------------------------------------------------------- */

function fiscalNoteStableKey(scenarioKey: string): string {
  return `legislative-work:${scenarioKey}:fiscal-note`;
}

function ensureContextPerson(
  world: World,
  input: {
    readonly stableKey: string;
    readonly playerPersonId: EntityId;
    readonly jurisdictionId: EntityId;
  },
): World {
  const personId = characterHistoryContextPersonId(world, input.stableKey);
  if (world.people[personId]) return world;
  const rng = new SeededRng(world.seed).fork(input.stableKey);
  const name = drawCanonicalName(rng);
  return applyCharacterHistoryPlan(world, {
    stableKey: input.stableKey,
    mode: "quick-generated",
    personId: input.playerPersonId,
    transitions: [
      {
        kind: "context-person",
        input: {
          stableKey: input.stableKey,
          givenName: name.givenName,
          familyName: name.familyName,
          birthDate: colleagueBirthDate(world.currentDate),
          homeJurisdictionId: input.jurisdictionId,
        },
      },
    ],
  }).world;
}

/** An adult old enough to be seated. No other claim is made about them. */
function colleagueBirthDate(currentDate: IsoDate): IsoDate {
  return makeIsoDate(
    `${Number(currentDate.slice(0, 4)) - 51}${currentDate.slice(4)}`,
  );
}

function ensureFiledBillText(
  world: World,
  scenarioKey: string,
  measureId: EntityId,
  jurisdictionId: EntityId,
): World {
  const scope = { jurisdictionId, segmentKey: null };
  let next = world;
  for (const section of FILED_SECTION_BRIEFS) {
    const stableKey = `legislative-work:${scenarioKey}:${section.keySuffix}`;
    const exists = (next.history.legislativeProvisions ?? []).some(
      (record) => record.stableKey === stableKey,
    );
    if (exists) continue;
    next = recordFiledProvision(next, {
      stableKey,
      measureId,
      provisionKey: section.provisionKey,
      sectionNumber: section.sectionNumber,
      heading: section.heading,
      text: section.text,
      beneficiary: section.beneficiary,
      applicationScope: scope,
      ...(section.fiscalExposureLabel
        ? {
            fiscalExposureLabel: section.fiscalExposureLabel,
            fiscalExposureMinorUnits: section.fiscalExposureMinorUnits,
          }
        : {}),
    });
  }
  return next;
}

function ensureFiscalNote(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly measureId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly analystPersonId: EntityId;
  },
): World {
  const stableKey = fiscalNoteStableKey(input.scenarioKey);
  if (world.history.events.some((record) => record.stableKey === stableKey)) {
    return world;
  }
  return recordWorldEvent(world, {
    stableKey,
    type: "legislation.fiscal-note-prepared",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.measureId,
      input.jurisdictionId,
      input.analystPersonId,
    ],
    participants: [
      {
        personId: input.analystPersonId,
        role: "agency:analyst",
        detail: "Prepared the fiscal note on the measure as filed",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["legislation", "legislation.fiscal-note"],
    summary: FISCAL_NOTE_SUMMARY,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: "Legislative staff office",
        setting: null,
      },
      socialContext: "Routine staff work on a filed bill.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function ensurePriorWorkingHistory(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly playerPersonId: EntityId;
    readonly advocatePersonId: EntityId;
    readonly guardianPersonId: EntityId;
  },
): World {
  let next = world;
  const advocateKey = `legislative-work:${input.scenarioKey}:prior:advocate`;
  if (
    !next.history.relationshipInteractions.some(
      (record) => record.stableKey === advocateKey,
    )
  ) {
    next = recordRelationshipInteraction(next, {
      stableKey: advocateKey,
      personIds: canonicalPair(input.playerPersonId, input.advocatePersonId),
      eventId: null,
      occurredAt: next.currentDate,
      kind: "work:co-sponsored-bill",
      change: "strengthened",
      significance: "meaningful",
      summary: PRIOR_ADVOCATE_HISTORY_SUMMARY,
      tags: ["relationship.shared-work", "legislation.bargaining"],
    });
  }
  const guardianKey = `legislative-work:${input.scenarioKey}:prior:guardian`;
  if (
    !next.history.relationshipInteractions.some(
      (record) => record.stableKey === guardianKey,
    )
  ) {
    next = recordRelationshipInteraction(next, {
      stableKey: guardianKey,
      personIds: canonicalPair(input.playerPersonId, input.guardianPersonId),
      eventId: null,
      occurredAt: next.currentDate,
      kind: "contact:committee-acquaintance",
      change: "maintained",
      significance: "minor",
      summary: PRIOR_GUARDIAN_HISTORY_SUMMARY,
      tags: ["relationship.shared-work"],
    });
  }
  return next;
}

function canonicalPair(
  first: EntityId,
  second: EntityId,
): readonly [EntityId, EntityId] {
  return first.localeCompare(second) <= 0 ? [first, second] : [second, first];
}

/**
 * Seats the chambers with every member this world actually models: the player
 * (an elected member, not a staffer, on this route), the sponsoring colleague,
 * and the sitting's two counterparts. Every other seat stays authored, and the
 * vote writer still refuses a disposition naming somebody the world does not
 * contain.
 */
function seatBargainingBodies(
  world: World,
  blueprint: LegislativeBlueprint,
  people: {
    readonly playerPersonId: EntityId;
    readonly sponsorPersonId: EntityId;
    readonly advocatePersonId: EntityId;
    readonly guardianPersonId: EntityId;
  },
): readonly SeatedBody[] {
  const linked = [
    people.playerPersonId,
    people.sponsorPersonId,
    people.advocatePersonId,
    people.guardianPersonId,
  ]
    .filter((personId, index, all) => all.indexOf(personId) === index)
    .map((personId) => world.people[personId])
    .filter((person) => person !== undefined)
    .map((person) => ({ personId: person.id, name: personName(person) }));
  return blueprint.pack.chambers.map((chamber, index) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
      index === 0 ? linked : [],
      blueprint.nonpartisan,
    ),
  );
}
