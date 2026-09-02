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

/**
 * A household deciding who carries the week.
 *
 * The third subject family, and the one the ordinary-life spine uses. It has
 * nothing to do with an office, which is the point: the conversation engine's
 * room, hearing and commitment rules are general, and only the subject is not.
 */
export interface HouseholdObligationSubjectFacts {
  readonly obligation: "the week's shopping and the two appointments after it";
  readonly shortObligation: "the week's errands";
}

export type HouseholdObligationCover =
  "unsettled" | "shared" | "taken-by-other" | "taken-by-player";

export type HouseholdObligationProposition =
  "share-the-week" | "ask-them-to-take-it" | "take-it-yourself";

export interface HouseholdObligationConversationProgress {
  readonly subject: "household-obligation";
  readonly subjectFacts: HouseholdObligationSubjectFacts;
  readonly phase: "opening" | "raised" | "settled";
  readonly cover: HouseholdObligationCover;
  readonly latestProposition: HouseholdObligationProposition | null;
  readonly pendingContributions: readonly [];
  readonly silenceSettled: boolean;
}

export type ConversationProgress =
  | RunBConversationProgress
  | RunCLegislativeConversationProgress
  | HouseholdObligationConversationProgress;

/** Every subject family the game can currently hold a conversation about. */
export type ConversationSubjectKey = ConversationProgress["subject"];

export function createHouseholdObligationProgress(): HouseholdObligationConversationProgress {
  return {
    subject: "household-obligation",
    subjectFacts: {
      obligation: "the week's shopping and the two appointments after it",
      shortObligation: "the week's errands",
    },
    phase: "opening",
    cover: "unsettled",
    latestProposition: null,
    pendingContributions: [],
    silenceSettled: false,
  };
}

export function isHouseholdObligationConversationProgress(
  progress: ConversationProgress,
): progress is HouseholdObligationConversationProgress {
  return progress.subject === "household-obligation";
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

export function isRunBReferralConversationProgress(
  progress: ConversationProgress,
): progress is RunBConversationProgress {
  return progress.subject === "shared-intake-checklist";
}

export function canListenToRunBConversation(
  progress: RunBConversationProgress,
): boolean {
  return progress.pendingContributions.length > 0 || !progress.silenceSettled;
}
import type { EntityId } from "../simulation";
