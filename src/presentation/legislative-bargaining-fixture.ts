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
export const PROGRAM_PROVISION_KEY = "pilot-support-limit";
export const REQUESTED_PROVISION_KEY = "local-project-match";
export const FISCAL_NOTE_EVENT_STABLE_KEY = "bargaining:hb-214:fiscal-note";
export const REQUESTED_SEGMENT_KEY: MetricSegmentKey =
  "transit.ashland-boyd-local-match";

const PROGRAM_AMOUNT_MINOR_UNITS = 800_000_000;
const REQUESTED_AMOUNT_MINOR_UNITS = 140_000_000;
const CAPPED_AMOUNT_MINOR_UNITS = 60_000_000;

const BENEFICIARY_LABEL = "the Ashland–Boyd County Transit Authority";
const PLACE_LABEL = "Ashland";

export interface LegislativeBargainingFixture {
  readonly world: World;
  readonly scenario: LegislativeScenario;
  readonly measureId: EntityId;
  readonly measureStableKey: string;
  readonly playerPersonId: EntityId;
  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
  readonly analystPersonId: EntityId;
  readonly scenePeople: readonly [
    RunBScenePersonContext,
    RunBScenePersonContext,
  ];
  readonly roomContext: ConversationRoomContext;
  readonly privateRoomContext: ConversationRoomContext;
  readonly progress: LegislativeBargainingProgress;
  readonly locationDisplayName: string;
  readonly locationLabel: string;
  readonly presentationTime: string;
  /** Moves the workspace offers outside the conversation strip. */
  readonly floorIntents: readonly LegislativeBargainingIntent[];
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
  const scenePeople = [
    {
      personId: advocatePersonId,
      title: `Member, ${house.name}`,
      role: `Represents ${PLACE_LABEL} and the counties around it`,
      qualitativeRead: "You have worked together before",
      inferredRead: `Direct about what ${PLACE_LABEL} needs and unembarrassed about asking. You do not know how far they will go for it.`,
      anchorId: "primary-desk-chair",
      visualVariant: "primary",
    },
    {
      personId: guardianPersonId,
      title: `Member, ${house.name}`,
      role: "Has said in public what this session can commit",
      qualitativeRead: "Cordial, and not on your side yet",
      inferredRead:
        "Reads bills closely and remembers numbers. You have no idea whether the objection is about money or about you.",
      anchorId: "left-guest-chair",
      visualVariant: "guest",
    },
  ] as const satisfies readonly [
    RunBScenePersonContext,
    RunBScenePersonContext,
  ];

  const present = [playerPersonId, advocatePersonId, guardianPersonId];
  const roomContext: ConversationRoomContext = {
    sceneKey: `bargaining:${seed}:both-present`,
    briefingLeadPersonId: advocatePersonId,
    referralVerifierPersonId: guardianPersonId,
    locationLabel: "Members' room off the House floor",
    jurisdictionId: scenario.pack.chambers[0]
      ? world.history.legislativeMeasures![0]!.jurisdictionId
      : world.jurisdictionOrder[0]!,
    playerPersonId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: [advocatePersonId, guardianPersonId],
    normalHearingPersonIds: [advocatePersonId, guardianPersonId],
    quietAmbientHearingPersonIds: [],
    privateAvailable: false,
    privateUnavailableReason: `Nothing said here is private while ${guardian.familyName} is standing four feet away.`,
  };
  const privateRoomContext: ConversationRoomContext = {
    ...roomContext,
    sceneKey: `bargaining:${seed}:advocate-only`,
    locationLabel: `Members' room after ${guardian.familyName} stepped out`,
    physicallyPresentPersonIds: [playerPersonId, advocatePersonId],
    activeParticipantPersonIds: [playerPersonId, advocatePersonId],
    eligibleAddresseePersonIds: [advocatePersonId],
    normalHearingPersonIds: [advocatePersonId],
    privateAvailable: true,
    privateUnavailableReason: null,
  };

  const progress = createLegislativeBargainingProgress({
    measureId: scenario.measureId,
    measureStableKey: "kentucky:measure",
    designation: "HB 214",
    shortTitle: "Transit Access Pilot",
    chamberName: house.name,
    nextStepLabel: stage.label.toLowerCase(),

    programProvisionKey: PROGRAM_PROVISION_KEY,
    programSectionLabel: "Section 3",
    programHeading: "Pilot support limit",
    programReach:
      "language reaching every rider enrolled in a state assistance programme",
    billAmountLabel: "$8,000,000",

    requestedProvisionKey: REQUESTED_PROVISION_KEY,
    requestedSectionNumber: 4,
    requestedSectionLabel: "Section 4",
    requestedHeading: "Local project match",
    requestedText: requestedProvisionText(REQUESTED_AMOUNT_MINOR_UNITS),
    requestedBeneficiaryLabel: BENEFICIARY_LABEL,
    requestedPlaceLabel: PLACE_LABEL,
    requestedStatedGround:
      "The authority is the only fixed-route provider in the region and cannot raise the pilot's local match from fare revenue.",
    requestedAmountLabel: "$1,400,000",
    requestedAmountMinorUnits: REQUESTED_AMOUNT_MINOR_UNITS,
    requestedSegmentKey: REQUESTED_SEGMENT_KEY,

    cappedText: requestedProvisionText(CAPPED_AMOUNT_MINOR_UNITS),
    cappedAmountLabel: "$600,000",
    cappedAmountMinorUnits: CAPPED_AMOUNT_MINOR_UNITS,

    fiscalNoteEventStableKey: FISCAL_NOTE_EVENT_STABLE_KEY,
    analystPersonId,

    advocatePersonId,
    guardianPersonId,
    advocateVoice: "district-advocate",
    guardianVoice: "fiscal-guardian",
  });

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
    presentationTime: formatTime(world.currentMoment.minuteOfDay),
    floorIntents: ["offer-targeted-provision", "counter-with-cap"],
  };

  function requirePerson(source: World, index: number): EntityId {
    const personId = source.personOrder[index];
    if (!personId || !source.people[personId]) {
      throw new Error(`The bargaining fixture is missing person ${index}.`);
    }
    return personId;
  }

  function formatTime(minuteOfDay: number): string {
    const hour24 = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour = hour24 % 12 || 12;
    return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
  }
}

export function requestedProvisionText(amountMinorUnits: number): string {
  const amount = `$${(amountMinorUnits / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
  return `Of the amounts appropriated by Section 3 of this Act, not more than ${amount} may be awarded to ${BENEFICIARY_LABEL} as the local match required for pilot participation, and an award under this section shall not reduce the amount available to any other participating provider.`;
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

  let next = recordFiledProvision(world, {
    stableKey: "bargaining:hb-214:section-1",
    measureId: measure.id,
    provisionKey: "purpose",
    sectionNumber: 1,
    heading: "Purpose and construction",
    text: "It is the purpose of this Act to test whether removing the fare barrier increases access to work, care and school for riders who already qualify for state assistance. Nothing in this Act creates an entitlement to service.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "everyone the Act reaches",
    },
    applicationScope: scope,
  });

  next = recordFiledProvision(next, {
    stableKey: "bargaining:hb-214:section-2",
    measureId: measure.id,
    provisionKey: "eligibility",
    sectionNumber: 2,
    heading: "Eligible riders",
    text: "A rider is eligible under this Act if the rider is enrolled in a state assistance programme administered under KRS Chapter 205 at the time of boarding. A participating provider shall not require a separate application.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "every rider enrolled in a state assistance programme",
    },
    applicationScope: scope,
  });

  next = recordFiledProvision(next, {
    stableKey: "bargaining:hb-214:section-3",
    measureId: measure.id,
    provisionKey: PROGRAM_PROVISION_KEY,
    sectionNumber: 3,
    heading: "Pilot support limit",
    text: "There is appropriated for the two-year pilot a sum not to exceed $8,000,000, to be distributed among participating providers in proportion to eligible boardings. No provider is named in this section.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel:
        "every participating provider, in proportion to eligible boardings",
    },
    applicationScope: scope,
    fiscalExposureLabel: "$8,000,000 over the two-year pilot",
    fiscalExposureMinorUnits: PROGRAM_AMOUNT_MINOR_UNITS,
  });

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
    summary:
      "A fiscal note on HB 214 as filed put the two-year exposure at $8,000,000, with the caveat that a named local match would sit on top of that figure rather than inside it.",
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
    summary:
      "The two carried a road-fund bill together last session and neither of them had to be chased for a vote.",
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
    summary:
      "They sit two seats apart in committee and have never worked on anything together.",
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
