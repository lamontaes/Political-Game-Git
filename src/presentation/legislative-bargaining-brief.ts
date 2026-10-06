import { provisionReach, recordEventKnowledge } from "../simulation";
import type {
  EntityId,
  LegislativeProcedureContext,
  World,
} from "../simulation";
import type {
  LegislativeBargainingProgress,
  LegislativeBargainingSubjectFacts,
} from "./run-b-conversation-progress";
import type { ConversationRoomContext } from "./run-b-conversation";
import type { RunBScenePersonContext } from "./run-b-fixture";
import type { LegislativeBargainingIntent } from "./legislative-bargaining";
import type { PriorWorkEvidence } from "./prior-work-evidence";
import type { CompiledBillDraft } from "../simulation/legislation-drafting";
import { formatMinorUnits } from "../simulation/legislation-program-families";

/**
 * The advocate's history read, by what the record actually establishes.
 *
 * Three evidence classes, three claims, and no claim larger than its class.
 * Shared work is stated as shared work. Acquaintance is stated as
 * acquaintance and stops there — it does not carry a work-history negative
 * the record is not in a position to make exhaustive. No recorded connection
 * at all is stated as not knowing them, which is the read a member walking
 * into the room actually has.
 */
function advocateHistoryRead(evidence: PriorWorkEvidence): string {
  switch (evidence) {
    case "shared-work":
      return "You have worked together before";
    case "acquaintance":
      return "Someone you have met before";
    case "none":
      return "A colleague you do not know";
  }
}

/**
 * A colleague's ask from the measure being discussed. It is supplied from
 * that measure's own compiled amendment invitation.
 */
export interface BargainingAdvocateCause {
  readonly sectionLabel: string;
  readonly beneficiaryLabel: string;
}

/** The reads a colleague walks in with, before anybody has said a word. */
export function bargainingScenePeople(input: {
  readonly chamberName: string;
  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
  /**
   * What the record establishes about the player and the advocate, classified
   * by the contract of the records themselves. The read claims the kind of
   * history the world actually holds and no other: having met somebody is not
   * having worked with them, and the read never widens the one into the other.
   */
  readonly advocatePriorWork: PriorWorkEvidence;
  /** The filed measure's actual requested section and beneficiary. */
  readonly cause: BargainingAdvocateCause;
}): readonly [RunBScenePersonContext, RunBScenePersonContext] {
  const cause = input.cause;
  return [
    {
      personId: input.advocatePersonId,
      title: `Member, ${input.chamberName}`,
      role: `Wants ${cause.sectionLabel} written for ${cause.beneficiaryLabel}`,
      qualitativeRead: advocateHistoryRead(input.advocatePriorWork),
      // The generated read says what it can stand behind. A place label in the
      // bank may be a phrase rather than a town ("statewide", "the counties at
      // the back of the queue"), so the inferred read carries the manner and
      // leaves the specifics to the role line above, rather than bending a
      // phrase into a sentence about what a town needs.
      inferredRead:
        "Direct about the ask and unembarrassed about making it. You do not know how far they will go for it.",
      anchorId: "primary-desk-chair",
      visualVariant: "primary",
    },
    {
      personId: input.guardianPersonId,
      title: `Member, ${input.chamberName}`,
      role: "Has said in public what this session can commit",
      qualitativeRead: "Cordial, and not on your side yet",
      inferredRead:
        "Reads bills closely and remembers numbers. You have no idea whether the objection is about money or about you.",
      anchorId: "left-guest-chair",
      visualVariant: "guest",
    },
  ] as const;
}

/**
 * Everything the floor surface and the two floor actions need to run one
 * bargaining sitting, with no opinion about where the world came from.
 *
 * The developer fixture supplies one of these from its own synthetic world;
 * the production adapter derives one from the player's canonical save. The
 * surface and the actions cannot tell the difference, which is the point: they
 * read the seat, never the constructor behind it.
 */
export interface LegislativeBargainingSeat {
  /**
   * The stable key of the canonical member-seat work relationship this
   * sitting was opened on, when it was opened through the production route.
   * The floor actions re-resolve the seat against the current world before
   * writing, so a seat that has since ended or been contradicted refuses at
   * the write boundary. The developer fixture's synthetic world has no such
   * record and leaves this unset; that route never reaches production (see
   * legislative-bargaining-no-fixture.test.ts).
   */
  readonly memberSeatStableKey?: string;
  /**
   * The chamber this sitting was actually opened on. The floor actions require
   * the bill to still be before it, so a context retained across a transmittal
   * cannot carry a question into the other chamber. Unset on the developer
   * fixture, like the seat key above.
   */
  readonly openedChamberKey?: string;
  readonly scenario: LegislativeProcedureContext;
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

/** The room, described once so the two constructors cannot disagree on it. */
export function bargainingRoomContexts(input: {
  readonly sceneKeyPrefix: string;
  readonly chamberName: string;
  readonly jurisdictionId: EntityId;
  readonly playerPersonId: EntityId;
  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
  readonly guardianFamilyName: string;
}): {
  readonly roomContext: ConversationRoomContext;
  readonly privateRoomContext: ConversationRoomContext;
} {
  const present = [
    input.playerPersonId,
    input.advocatePersonId,
    input.guardianPersonId,
  ];
  const roomContext: ConversationRoomContext = {
    sceneKey: `${input.sceneKeyPrefix}:both-present`,
    // The parts this subject actually has. A bill on the floor has a member
    // asking for something and a member counting the cost; it has no briefing
    // lead and no referral verifier, and saying it does would put a
    // caseworker's office into the record of a chamber.
    roles: {
      "district-advocate": input.advocatePersonId,
      "fiscal-guardian": input.guardianPersonId,
    },
    locationLabel: `Members' room off the ${input.chamberName} floor`,
    jurisdictionId: input.jurisdictionId,
    playerPersonId: input.playerPersonId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: [
      input.advocatePersonId,
      input.guardianPersonId,
    ],
    normalHearingPersonIds: [input.advocatePersonId, input.guardianPersonId],
    quietAmbientHearingPersonIds: [],
    privateAvailable: false,
    privateUnavailableReason: `Nothing said here is private while ${input.guardianFamilyName} is standing four feet away.`,
  };
  const privateRoomContext: ConversationRoomContext = {
    ...roomContext,
    sceneKey: `${input.sceneKeyPrefix}:advocate-only`,
    locationLabel: `Members' room after ${input.guardianFamilyName} stepped out`,
    physicallyPresentPersonIds: [input.playerPersonId, input.advocatePersonId],
    activeParticipantPersonIds: [input.playerPersonId, input.advocatePersonId],
    eligibleAddresseePersonIds: [input.advocatePersonId],
    normalHearingPersonIds: [input.advocatePersonId],
    privateAvailable: true,
    privateUnavailableReason: null,
  };
  return { roomContext, privateRoomContext };
}

export function formatPresentationTime(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

/**
 * Marks that the controlled person has actually read the fiscal note, against
 * whichever world the seat came from. A document in the building is not
 * something you know until you have read it.
 */
export function reviewFiscalNoteFor(
  world: World,
  seat: LegislativeBargainingSeat,
): World {
  const stableKey = seat.progress.subjectFacts.fiscalNoteEventStableKey;
  const event = world.history.events.find(
    (record) => record.stableKey === stableKey,
  );
  if (!event) {
    throw new Error("This sitting's fiscal note is missing from the record.");
  }
  const alreadyKnown = world.history.knowledge.some(
    (record) =>
      record.eventId === event.id && record.personId === seat.playerPersonId,
  );
  if (alreadyKnown) return world;
  return recordEventKnowledge(world, {
    stableKey: `${stableKey}:knowledge:${seat.playerPersonId}`,
    personId: seat.playerPersonId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "public-record",
      reference: `Fiscal note filed with ${seat.progress.subjectFacts.designation}`,
    },
  });
}

export function playerHasReadFiscalNoteFor(
  world: World,
  seat: LegislativeBargainingSeat,
): boolean {
  const event = world.history.events.find(
    (record) =>
      record.stableKey === seat.progress.subjectFacts.fiscalNoteEventStableKey,
  );
  return (
    !!event &&
    world.history.knowledge.some(
      (record) =>
        record.eventId === event.id && record.personId === seat.playerPersonId,
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Bargaining over a bill the player configured                                */
/* -------------------------------------------------------------------------- */

/**
 * Subject facts derived from whichever saved measure is on the floor.
 *
 * The measure's compiled amendment invitation supplies the section, amount,
 * beneficiary, and place; no authored place-specific subject is substituted.
 *
 * Nothing about the negotiation machinery changes. The facts contract was
 * already parameterized; only its producer was hard-wired to one program.
 * The advocate still wants a narrower section, the guardian still counts what
 * the bill commits, and the amendment still has to be adopted by the chamber
 * before it touches the text.
 */
export function bargainingSubjectFactsForDraft(input: {
  readonly draft: CompiledBillDraft;
  readonly measureId: EntityId;
  readonly measureStableKey: string;
  readonly chamberName: string;
  readonly nextStepLabel: string;
  readonly fiscalNoteEventStableKey: string;
  readonly analystPersonId: EntityId;
  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
}): LegislativeBargainingSubjectFacts {
  const draft = input.draft;
  const invitation = draft.amendmentInvitation;

  // The section the advocate is arguing against is the bill's own operative
  // clause, chosen by what the configuration actually carries rather than
  // assumed to be a funding section: an unfunded mandate has no funding
  // section, and its politics are about the duty instead.
  const programClause =
    draft.clauses.find((clause) => clause.dimension === "funding-cap") ??
    draft.clauses.find((clause) => clause.dimension === "oversight") ??
    draft.clauses[draft.clauses.length - 1]!;

  const requestedAmountLabel = formatMinorUnits(
    invitation.requestedMinorUnits,
    "USD",
  );
  const cappedAmountLabel = formatMinorUnits(
    invitation.cappedMinorUnits,
    "USD",
  );

  return {
    measureId: input.measureId,
    measureStableKey: input.measureStableKey,
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    chamberName: input.chamberName,
    nextStepLabel: input.nextStepLabel,

    programProvisionKey: programClause.provisionKey,
    programSectionLabel: `Section ${programClause.sectionNumber}`,
    programHeading: programClause.heading,
    programReach: provisionReach(programClause),
    // What the bill commits as it reads. Null means it commits nothing, which
    // is a real answer for a mandate and is said rather than shown as zero.
    // An appropriation states its amount as money provided, not as a ceiling.
    billAmountLabel:
      draft.appropriatedLabel ??
      draft.authorizedCeilingLabel ??
      "nothing; this Act appropriates no money",

    requestedProvisionKey: invitation.provisionKey,
    // New content has no history to preserve, so its record key is its own
    // provision key and two families cannot collide.
    requestedProvisionStableKeySuffix: invitation.provisionKey,
    requestedExposurePhrase: `under Section ${invitation.sectionNumber}`,
    requestedQuestionSubject: `Section ${invitation.sectionNumber} amendment for ${invitation.beneficiaryLabel}`,
    requestedDescriptionSubject: `Section ${invitation.sectionNumber}, ${invitation.heading}`,
    requestedSectionNumber: invitation.sectionNumber,
    requestedSectionLabel: `Section ${invitation.sectionNumber}`,
    requestedHeading: invitation.heading,
    requestedText: invitation.render(requestedAmountLabel),
    requestedBeneficiaryLabel: invitation.beneficiaryLabel,
    requestedPlaceLabel: invitation.placeLabel,
    requestedStatedGround: invitation.statedGround,
    requestedAmountLabel,
    requestedAmountMinorUnits: invitation.requestedMinorUnits,
    requestedSegmentKey: invitation.segmentKey,

    cappedText: invitation.render(cappedAmountLabel),
    cappedAmountLabel,
    cappedAmountMinorUnits: invitation.cappedMinorUnits,

    fiscalNoteEventStableKey: input.fiscalNoteEventStableKey,
    analystPersonId: input.analystPersonId,

    advocatePersonId: input.advocatePersonId,
    guardianPersonId: input.guardianPersonId,
    advocateVoice: "district-advocate",
    guardianVoice: "fiscal-guardian",
  };
}
