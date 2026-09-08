import { recordEventKnowledge } from "../simulation";
import type {
  EntityId,
  LegislativeProcedureContext,
  LegislativeProvisionBeneficiary,
  MetricSegmentKey,
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
 * The authored substance of the one bargaining sitting the game can hold.
 *
 * HB 214's text, the section a colleague wants written into it, the amounts,
 * and the words the record uses for all of it used to live inside the
 * developer floor fixture. They are authored content, not fixture scaffolding:
 * the production route needs the same bill text against the player's own
 * measure, and duplicating it would make two bills that drift apart. This
 * module owns the content; the fixture and the production adapter both read
 * it, and neither reads the other.
 *
 * Only the scenario this content is written for gets a brief. Any other
 * legislature truthfully has no authored bargaining sitting, and the caller is
 * told so rather than handed Kentucky's politics with the labels changed.
 */

export const BARGAINING_BRIEF_SCENARIO_KEY = "kentucky";

export const PROGRAM_PROVISION_KEY = "pilot-support-limit";
export const REQUESTED_PROVISION_KEY = "local-project-match";
export const REQUESTED_SEGMENT_KEY: MetricSegmentKey =
  "transit.ashland-boyd-local-match";

export const PROGRAM_AMOUNT_MINOR_UNITS = 800_000_000;
export const REQUESTED_AMOUNT_MINOR_UNITS = 140_000_000;
export const CAPPED_AMOUNT_MINOR_UNITS = 60_000_000;

export const BENEFICIARY_LABEL = "the Ashland–Boyd County Transit Authority";
export const PLACE_LABEL = "Ashland";

export function requestedProvisionText(amountMinorUnits: number): string {
  const amount = `$${(amountMinorUnits / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
  return `Of the amounts appropriated by Section 3 of this Act, not more than ${amount} may be awarded to ${BENEFICIARY_LABEL} as the local match required for pilot participation, and an award under this section shall not reduce the amount available to any other participating provider.`;
}

/** True when this legislature has an authored bargaining sitting at all. */
export function bargainingBriefSupports(scenarioKey: string): boolean {
  return scenarioKey === BARGAINING_BRIEF_SCENARIO_KEY;
}

/** One filed section of the bill, said the way the canonical record wants it. */
export interface FiledSectionBrief {
  readonly keySuffix: string;
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  readonly fiscalExposureLabel?: string;
  readonly fiscalExposureMinorUnits?: number;
}

/** HB 214 as filed: three sections, none of which names a provider. */
export const FILED_SECTION_BRIEFS: readonly FiledSectionBrief[] = [
  {
    keySuffix: "section-1",
    provisionKey: "purpose",
    sectionNumber: 1,
    heading: "Purpose and construction",
    text: "It is the purpose of this Act to test whether removing the fare barrier increases access to work, care and school for riders who already qualify for state assistance. Nothing in this Act creates an entitlement to service.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "everyone the Act reaches",
    },
  },
  {
    keySuffix: "section-2",
    provisionKey: "eligibility",
    sectionNumber: 2,
    heading: "Eligible riders",
    text: "A rider is eligible under this Act if the rider is enrolled in a state assistance programme administered under KRS Chapter 205 at the time of boarding. A participating provider shall not require a separate application.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "every rider enrolled in a state assistance programme",
    },
  },
  {
    keySuffix: "section-3",
    provisionKey: PROGRAM_PROVISION_KEY,
    sectionNumber: 3,
    heading: "Pilot support limit",
    text: "There is appropriated for the two-year pilot a sum not to exceed $8,000,000, to be distributed among participating providers in proportion to eligible boardings. No provider is named in this section.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel:
        "every participating provider, in proportion to eligible boardings",
    },
    fiscalExposureLabel: "$8,000,000 over the two-year pilot",
    fiscalExposureMinorUnits: PROGRAM_AMOUNT_MINOR_UNITS,
  },
];

export const FISCAL_NOTE_SUMMARY =
  "A fiscal note on HB 214 as filed put the two-year exposure at $8,000,000, with the caveat that a named local match would sit on top of that figure rather than inside it.";

export const PRIOR_ADVOCATE_HISTORY_SUMMARY =
  "The two carried a road-fund bill together last session and neither of them had to be chased for a vote.";
export const PRIOR_GUARDIAN_HISTORY_SUMMARY =
  "They sit two seats apart in committee and have never worked on anything together.";

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
}): readonly [RunBScenePersonContext, RunBScenePersonContext] {
  return [
    {
      personId: input.advocatePersonId,
      title: `Member, ${input.chamberName}`,
      role: `Represents ${PLACE_LABEL} and the counties around it`,
      qualitativeRead: advocateHistoryRead(input.advocatePriorWork),
      inferredRead: `Direct about what ${PLACE_LABEL} needs and unembarrassed about asking. You do not know how far they will go for it.`,
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

/** The complete subject facts, minus the identities only a world can supply. */
export function bargainingSubjectFacts(input: {
  readonly measureId: EntityId;
  readonly measureStableKey: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly chamberName: string;
  readonly nextStepLabel: string;
  readonly fiscalNoteEventStableKey: string;
  readonly analystPersonId: EntityId;
  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
}): LegislativeBargainingSubjectFacts {
  return {
    measureId: input.measureId,
    measureStableKey: input.measureStableKey,
    designation: input.designation,
    shortTitle: input.shortTitle,
    chamberName: input.chamberName,
    nextStepLabel: input.nextStepLabel,

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

    fiscalNoteEventStableKey: input.fiscalNoteEventStableKey,
    analystPersonId: input.analystPersonId,

    advocatePersonId: input.advocatePersonId,
    guardianPersonId: input.guardianPersonId,
    advocateVoice: "district-advocate",
    guardianVoice: "fiscal-guardian",
  };
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
 * The same sitting, about whichever bill is actually on the floor.
 *
 * `bargainingSubjectFacts` above is the authored Kentucky transit sitting, and
 * it stays exactly as accepted. This builds the same shape from a compiled
 * draft instead, so a broadband bill is bargained over its cooperative-award
 * preference and a water bill over assistance for the smallest systems, rather
 * than over a transit local match with the labels changed.
 *
 * Nothing about the negotiation machinery changes. The facts contract was
 * already parameterised; only its producer was hard-wired to one programme.
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
  const cappedAmountLabel = formatMinorUnits(invitation.cappedMinorUnits, "USD");

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
    programReach: `language reaching ${
      programClause.beneficiary.kind === "general-application"
        ? programClause.beneficiary.appliesToLabel
        : programClause.beneficiary.beneficiaryLabel
    }`,
    // What the bill commits as it reads. Null means it commits nothing, which
    // is a real answer for a mandate and is said rather than shown as zero.
    billAmountLabel:
      draft.authorizedCeilingLabel ?? "nothing; this Act appropriates no money",

    requestedProvisionKey: invitation.provisionKey,
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
