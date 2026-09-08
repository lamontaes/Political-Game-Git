import {
  createLegislativeScenario,
  floorStageByKey,
  chamberByKey,
  measurePosition,
  recordEventKnowledge,
  recordFiledProvision,
  recordRelationshipInteraction,
  recordWorldEvent,
  type EntityId,
  type LegislativeScenario,
  type MetricSegmentKey,
  type SeatedBody,
  type World,
} from "../simulation";
import { applyLegislativeStep } from "./legislation-session";
import {
  createLegislativeBargainingProgress,
  type LegislativeBargainingIntent,
} from "./legislative-bargaining";
import type { LegislativeBargainingProgress } from "./run-b-conversation-progress";
import type { ConversationRoomContext } from "./run-b-conversation";
import type { RunBScenePersonContext } from "./run-b-fixture";
import {
  bargainingRoomContexts,
  bargainingScenePeople,
  bargainingSubjectFacts,
  FILED_SECTION_BRIEFS,
  FISCAL_NOTE_SUMMARY,
  formatPresentationTime,
  PRIOR_ADVOCATE_HISTORY_SUMMARY,
  PRIOR_GUARDIAN_HISTORY_SUMMARY,
  requestedProvisionText,
  type LegislativeBargainingSeat,
} from "./legislative-bargaining-brief";

export {
  PROGRAM_PROVISION_KEY,
  REQUESTED_PROVISION_KEY,
  REQUESTED_SEGMENT_KEY,
  requestedProvisionText,
} from "./legislative-bargaining-brief";

/**
 * One bill, two colleagues, and a genuinely open question.
 *
 * HB 214 is on the House floor and still amendable. Section 3 funds the pilot
 * for everyone who qualifies statewide. One member wants a section written for
 * a transit authority in the place they represent; another has already said in
 * public what this session can afford. The player cannot give both of them what
 * they want with one button, and the game does not decide in advance which
 * answer is the right one.
 *
 * Everything institutional here is the merged legislation core doing its
 * ordinary work: the measure is referred, heard, reported and calendared
 * through the same steps the player would take themselves. Only the bill's
 * *text* and the politics around it are new.
 */

export const BARGAINING_SEED = "legislative-bargaining-2026";
export const FISCAL_NOTE_EVENT_STABLE_KEY = "bargaining:hb-214:fiscal-note";

/**
 * The developer fixture is one way of producing a bargaining seat — a whole
 * synthetic world built for the `?view=floor` proof route. Production derives
 * the same seat shape from the player's canonical save instead, and the
 * surface cannot tell the two apart.
 */
export interface LegislativeBargainingFixture extends LegislativeBargainingSeat {
  readonly world: World;
  readonly scenario: LegislativeScenario;
}

export function createLegislativeBargainingFixture(
  seedInput?: string,
): LegislativeBargainingFixture {
  const base = createLegislativeScenario("kentucky");
  const seed = seedInput?.trim() ? seedInput.trim() : BARGAINING_SEED;

  const playerPersonId = base.playerPersonId;
  const advocatePersonId = requirePerson(base.world, 1);
  const guardianPersonId = requirePerson(base.world, 2);
  const analystPersonId = requirePerson(base.world, 3);

  // Only three people in this world sit in the chamber. The rest of the House
  // is seats without minds, and the game says so rather than pretending
  // otherwise.
  const seatedPeople = new Set([
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
  ]);
  const bodies: readonly SeatedBody[] = base.bodies.map((body, index) => ({
    ...body,
    members: body.members.map((member) =>
      index === 0 && member.personId && seatedPeople.has(member.personId)
        ? member
        : { ...member, personId: null },
    ),
  }));
  const scenario: LegislativeScenario = { ...base, bodies };

  const pack = scenario.pack;
  const house = chamberByKey(pack, "house");
  let world = scenario.world;

  world = recordBillText(world, scenario);
  world = recordFiscalNote(world, scenario, analystPersonId);
  world = recordPriorWorkingHistory(
    world,
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
  );

  // The measure walks to the floor through the ordinary steps.
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeStep(scenario, world, step).world;
  }

  const position = measurePosition(world, scenario.measureId);
  if (position.phase !== "on-floor") {
    throw new Error(
      `The bargaining fixture expected a bill on the floor, not '${position.phase}'.`,
    );
  }
  const stage = floorStageByKey(house, position.floorStageKey ?? "");

  const guardian = world.people[guardianPersonId]!;
  const scenePeople = bargainingScenePeople({
    chamberName: house.name,
    advocatePersonId,
    guardianPersonId,
  });

  const { roomContext, privateRoomContext } = bargainingRoomContexts({
    sceneKeyPrefix: `bargaining:${seed}`,
    chamberName: house.name,
    jurisdictionId: scenario.pack.chambers[0]
      ? world.history.legislativeMeasures![0]!.jurisdictionId
      : world.jurisdictionOrder[0]!,
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
    guardianFamilyName: guardian.familyName,
  });

  const progress = createLegislativeBargainingProgress(
    bargainingSubjectFacts({
      measureId: scenario.measureId,
      measureStableKey: "kentucky:measure",
      designation: "HB 214",
      shortTitle: "Transit Access Pilot",
      chamberName: house.name,
      nextStepLabel: stage.label.toLowerCase(),
      fiscalNoteEventStableKey: FISCAL_NOTE_EVENT_STABLE_KEY,
      analystPersonId,
      advocatePersonId,
      guardianPersonId,
    }),
  );

  return {
    world,
    scenario,
    measureId: scenario.measureId,
    measureStableKey: "kentucky:measure",
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
    analystPersonId,
    scenePeople,
    roomContext,
    privateRoomContext,
    progress,
    locationDisplayName: `${world.jurisdictions[roomContext.jurisdictionId]?.name ?? "Kentucky"} State Capitol`,
    locationLabel: "Capitol · Members' room",
    presentationTime: formatPresentationTime(world.currentMoment.minuteOfDay),
    floorIntents: ["offer-targeted-provision", "counter-with-cap"],
  };

  function requirePerson(source: World, index: number): EntityId {
    const personId = source.personOrder[index];
    if (!personId || !source.people[personId]) {
      throw new Error(`The bargaining fixture is missing person ${index}.`);
    }
    return personId;
  }

}


// ---------------------------------------------------------------------------
// The bill as filed
// ---------------------------------------------------------------------------

function recordBillText(world: World, scenario: LegislativeScenario): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === scenario.measureId,
  );
  if (!measure) throw new Error("The bargaining fixture lost its measure.");
  const scope = { jurisdictionId: measure.jurisdictionId, segmentKey: null };

  let next = world;
  for (const section of FILED_SECTION_BRIEFS) {
    next = recordFiledProvision(next, {
      stableKey: `bargaining:hb-214:${section.keySuffix}`,
      measureId: measure.id,
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

/**
 * The fiscal note exists whether or not the player reads it.
 *
 * Recording it here and gating knowledge on an explicit review is the same
 * pattern the office working document uses: a document in the building is not
 * something you know until you have actually read it.
 */
function recordFiscalNote(
  world: World,
  scenario: LegislativeScenario,
  analystPersonId: EntityId,
): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === scenario.measureId,
  )!;
  return recordWorldEvent(world, {
    stableKey: FISCAL_NOTE_EVENT_STABLE_KEY,
    type: "legislation.fiscal-note-prepared",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id, measure.jurisdictionId, analystPersonId],
    participants: [
      {
        personId: analystPersonId,
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
        jurisdictionId: measure.jurisdictionId,
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

/**
 * A little shared history, so the decision evaluator has something real to read
 * rather than deciding in a vacuum.
 */
function recordPriorWorkingHistory(
  world: World,
  playerPersonId: EntityId,
  advocatePersonId: EntityId,
  guardianPersonId: EntityId,
): World {
  let next = recordRelationshipInteraction(world, {
    stableKey: "bargaining:prior:advocate",
    personIds: canonicalPair(playerPersonId, advocatePersonId),
    eventId: null,
    occurredAt: world.currentDate,
    kind: "work:co-sponsored-bill",
    change: "strengthened",
    significance: "meaningful",
    summary: PRIOR_ADVOCATE_HISTORY_SUMMARY,
    tags: ["relationship.shared-work", "legislation.bargaining"],
  });
  next = recordRelationshipInteraction(next, {
    stableKey: "bargaining:prior:guardian",
    personIds: canonicalPair(playerPersonId, guardianPersonId),
    eventId: null,
    occurredAt: world.currentDate,
    kind: "contact:committee-acquaintance",
    change: "maintained",
    significance: "minor",
    summary: PRIOR_GUARDIAN_HISTORY_SUMMARY,
    tags: ["relationship.shared-work"],
  });
  return next;
}

function canonicalPair(
  first: EntityId,
  second: EntityId,
): readonly [EntityId, EntityId] {
  return first.localeCompare(second) <= 0 ? [first, second] : [second, first];
}

/** Records that the controlled person has actually read the fiscal note. */
export function reviewFiscalNote(
  world: World,
  fixture: LegislativeBargainingFixture,
): World {
  const event = world.history.events.find(
    (record) => record.stableKey === FISCAL_NOTE_EVENT_STABLE_KEY,
  );
  if (!event) throw new Error("The bargaining fixture lost its fiscal note.");
  const alreadyKnown = world.history.knowledge.some(
    (record) =>
      record.eventId === event.id && record.personId === fixture.playerPersonId,
  );
  if (alreadyKnown) return world;
  return recordEventKnowledge(world, {
    stableKey: `bargaining:fiscal-note:knowledge:${fixture.playerPersonId}`,
    personId: fixture.playerPersonId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "public-record",
      reference: "Fiscal note filed with HB 214",
    },
  });
}

export function playerHasReadFiscalNote(
  world: World,
  fixture: LegislativeBargainingFixture,
): boolean {
  const event = world.history.events.find(
    (record) => record.stableKey === FISCAL_NOTE_EVENT_STABLE_KEY,
  );
  return (
    !!event &&
    world.history.knowledge.some(
      (record) =>
        record.eventId === event.id &&
        record.personId === fixture.playerPersonId,
    )
  );
}
