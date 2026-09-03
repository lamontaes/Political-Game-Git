export type RunBConversationPhase =
  | "opening"
  | "clarifying-condition"
  | "awaiting-verification"
  | "coordinating-briefing"
  | "settled";

// Legacy-named keys below are stable fixture/session vocabulary, not person
// identity or display names. Resolve prose from the room's canonical role IDs.
export type RunBCollinsSupport = "undecided" | "conditional" | "committed";
export type RunBReedVerification = "unoffered" | "promised";

export type RunBConversationProposition =
  | "collins-back-checklist"
  | "reed-verify-last-case"
  | "joint-commitment"
  | "keep-recommendation-narrow"
  | "press-for-answer";

export type RunBPendingContribution =
  | "collins-explain-condition"
  | "reed-offer-verification"
  | "collins-respond-to-reed";

export interface RunBConversationSubjectFacts {
  readonly constituentDescription: "three Lexington tenants";
  readonly officeRole: "constituent-services referral";
  readonly referralDestination: "county emergency-rent program";
  readonly requiredDocument: "proof-of-income form";
  readonly knownAffectedReferralCount: 2;
  readonly unresolvedReferralOrdinal: 3;
  readonly proposedOfficeProcedure: "pre-referral document checklist";
}

/**
 * Fixture-specific conversational continuity for the bounded office briefing.
 * This is presentation/session state, not a second canonical truth store.
 */
export interface RunBConversationProgress {
  readonly subject: "shared-intake-checklist";
  readonly subjectFacts: RunBConversationSubjectFacts;
  readonly phase: RunBConversationPhase;
  readonly collinsSupport: RunBCollinsSupport;
  readonly reedVerification: RunBReedVerification;
  readonly latestProposition: RunBConversationProposition | null;
  readonly pendingContributions: readonly RunBPendingContribution[];
  readonly silenceSettled: boolean;
}

export interface RunCLegislativeConversationSubjectFacts {
  readonly documentId: string;
  readonly provisionId: string;
  readonly selectionId: string;
  readonly currentAmount: "$8,000,000";
  readonly preparedAmount: "$4,000,000";
  readonly currentAlternativeId: EntityId;
  readonly currentOperationId: EntityId;
  readonly currentEstimateId: EntityId;
  readonly preparedAlternativeId: EntityId;
  readonly preparedOperationId: EntityId;
  readonly preparedEstimateId: EntityId;
  readonly analysisKnowledgeId: EntityId;
  readonly targetScopeLabel: string;
}

/**
 * One bounded Run C subject carried by the accepted conversation session. It
 * references canonical policy and knowledge records without copying them.
 */
export interface RunCLegislativeConversationProgress {
  readonly subject: "transit-access-pilot-provision";
  readonly subjectFacts: RunCLegislativeConversationSubjectFacts;
  readonly phase: "opening" | "discussed";
  readonly latestProposition: "compare-prepared-cap" | null;
  readonly pendingContributions: readonly [];
  readonly silenceSettled: true;
}

// ---------------------------------------------------------------------------
// Measure bargaining — the third bounded conversation subject
// ---------------------------------------------------------------------------

/**
 * Everything a bargaining beat needs to speak concretely, resolved once when
 * the session opens. These are references and labels drawn from canonical
 * records; nothing here is a second store of truth, and nothing here is hidden
 * state about what anyone believes.
 */
export interface LegislativeBargainingSubjectFacts {
  readonly measureId: EntityId;
  readonly measureStableKey: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly chamberName: string;
  /** The next procedural step, in the words the chamber uses. */
  readonly nextStepLabel: string;

  /** The broadly applicable programme section the bill already carries. */
  readonly programProvisionKey: string;
  readonly programSectionLabel: string;
  readonly programHeading: string;
  readonly programReach: string;
  /** What the whole bill commits as it currently reads. */
  readonly billAmountLabel: string;

  /** The narrower section one member wants written in. */
  readonly requestedProvisionKey: string;
  readonly requestedSectionNumber: number;
  readonly requestedSectionLabel: string;
  readonly requestedHeading: string;
  readonly requestedText: string;
  readonly requestedBeneficiaryLabel: string;
  readonly requestedPlaceLabel: string;
  readonly requestedStatedGround: string;
  readonly requestedAmountLabel: string;
  readonly requestedAmountMinorUnits: number;
  readonly requestedSegmentKey: MetricSegmentKey;

  /** The same section written to a ceiling the fiscal side could carry. */
  readonly cappedText: string;
  readonly cappedAmountLabel: string;
  readonly cappedAmountMinorUnits: number;

  /** The staff fiscal note, which the player has to actually read. */
  readonly fiscalNoteEventStableKey: string;
  readonly analystPersonId: EntityId;

  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
  readonly advocateVoice: LegislativeVoice;
  readonly guardianVoice: LegislativeVoice;
}

export type LegislativeBargainingPhase =
  | "opening"
  | "position-heard"
  | "proposal-on-table"
  | "counter-offered"
  | "answered"
  | "after-the-vote";

export type LegislativeBargainingProposition =
  | "write-in-the-local-section"
  | "cap-the-local-section"
  | "leave-the-bill-alone"
  | "support-asked"
  | "analysis-asked"
  | "inducement-refused"
  | "commitment-recalled";

/**
 * Session continuity for one bargaining conversation.
 *
 * Like the other two subjects, this is presentation state. What was promised,
 * what was asked for, and what the bill now says all live in canonical records;
 * this only remembers where the conversation itself has got to, so the next
 * line does not repeat the last one.
 */
export interface LegislativeBargainingProgress {
  readonly subject: "measure-bargaining";
  readonly subjectFacts: LegislativeBargainingSubjectFacts;
  readonly phase: LegislativeBargainingPhase;
  readonly latestProposition: LegislativeBargainingProposition | null;
  /** The last move each person made, so replies answer rather than restate. */
  readonly lastFamilyByPerson: Readonly<Record<string, LegislativeMotifFamily>>;
  readonly analysisSeen: boolean;
  readonly playerOffer: "none" | "as-asked" | "capped" | "refused";
  readonly inducementRefused: boolean;
  readonly pendingContributions: readonly [];
  readonly silenceSettled: boolean;
}

export type ConversationProgress =
  | RunBConversationProgress
  | RunCLegislativeConversationProgress
  | LegislativeBargainingProgress;

export function isLegislativeBargainingProgress(
  progress: ConversationProgress,
): progress is LegislativeBargainingProgress {
  return progress.subject === "measure-bargaining";
}

export function createRunBConversationProgress(): RunBConversationProgress {
  return {
    subject: "shared-intake-checklist",
    subjectFacts: {
      constituentDescription: "three Lexington tenants",
      officeRole: "constituent-services referral",
      referralDestination: "county emergency-rent program",
      requiredDocument: "proof-of-income form",
      knownAffectedReferralCount: 2,
      unresolvedReferralOrdinal: 3,
      proposedOfficeProcedure: "pre-referral document checklist",
    },
    phase: "opening",
    collinsSupport: "undecided",
    reedVerification: "unoffered",
    latestProposition: null,
    pendingContributions: [
      "collins-explain-condition",
      "reed-offer-verification",
    ],
    silenceSettled: false,
  };
}

export function isRunCLegislativeConversationProgress(
  progress: ConversationProgress,
): progress is RunCLegislativeConversationProgress {
  return progress.subject === "transit-access-pilot-provision";
}

export function canListenToRunBConversation(
  progress: RunBConversationProgress,
): boolean {
  return progress.pendingContributions.length > 0 || !progress.silenceSettled;
}
import type { EntityId, MetricSegmentKey } from "../simulation";
import type {
  LegislativeMotifFamily,
  LegislativeVoice,
} from "./legislative-dialogue-motifs";
