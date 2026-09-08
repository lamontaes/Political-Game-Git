import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { requireMeasure } from "./legislation";
import {
  assessCommitment,
  commitmentObligation,
  commitmentsHeldBy,
  currentMeasureProvisions,
  currentProvisionByKey,
  legislativeQuestionAnswers,
} from "./legislative-politics";
import { currentHistoricalCutoff } from "./queries";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  LegislativeMemberDisposition,
  LegislativeQuestionIdentity,
  World,
} from "./types";

/**
 * How one simulated member decides one question.
 *
 * This is deliberately not a whip count. It answers a narrower question — what
 * does *this* person do on *this* question, given what is actually in the bill,
 * what they said, and who they have been working with — and it answers it
 * through the same deterministic decision evaluator every other character
 * choice goes through, so the reasoning is inspectable and the outcome is not
 * a fixed number sitting in a fixture.
 *
 * Seats without a simulated person keep their authored dispositions. A member
 * the game has never modelled does not acquire a mind because a neighbouring
 * seat has one; extending this to a whole chamber is a separate piece of work
 * with its own content problem, and the seam is here rather than a guess.
 */

export interface MemberVoteQuestion {
  /**
   * Exactly which question is being put.
   *
   * The same canonical identity a promise names, so the two can be compared:
   * a member who said they would not join an override has not thereby said
   * anything about whether the bill should pass.
   */
  readonly question: LegislativeQuestionIdentity;
  /** The question in the words the chamber puts it. */
  readonly questionLabel: string;
  /**
   * What the question would do if it carried.
   *
   * A vote on an amendment is not a vote on the bill as it currently reads: the
   * whole point is that it would change it. Without this, a member would vote
   * against the very section they asked for, on the ground that it is not in
   * the bill yet.
   */
  readonly pendingChange?: {
    readonly provisionKey: string;
    readonly beneficiaryLabels: readonly string[];
    readonly addsExposureMinorUnits: number;
  } | null;
}

export interface DeriveMemberDispositionInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly question: MemberVoteQuestion;
  /**
   * Beneficiary names this member speaks for. Supplied by the scenario rather
   * than inferred: the game has no district ontology, and inventing one to make
   * a vote look sophisticated would be worse than saying so.
   */
  readonly localBeneficiaryLabels?: readonly string[];
  /**
   * The exposure above which this member has said the bill costs too much.
   * Null when the member has no stated fiscal limit.
   */
  readonly fiscalConcernCeilingMinorUnits?: number | null;
}

export interface DerivedMemberDisposition {
  readonly world: World;
  readonly disposition: LegislativeMemberDisposition;
  readonly evaluation: DecisionEvaluation;
  /**
   * What the member would say about it. Built from the considerations that were
   * put in, never from the ranking that came out: the player reads reasons, not
   * scores.
   */
  readonly account: string;
}

const OPTIONS = [
  {
    key: "vote-yea",
    label: "Vote yes",
    description: "Vote for the question as the bill now reads.",
  },
  {
    key: "vote-nay",
    label: "Vote no",
    description: "Vote against the question as the bill now reads.",
  },
  {
    key: "withhold",
    label: "Answer present",
    description: "Be recorded present without voting either way.",
  },
] as const;

export function deriveMemberDisposition(
  world: World,
  input: DeriveMemberDispositionInput,
): DerivedMemberDisposition {
  const measure = requireMeasure(world, input.question.question.measureId);
  if (!world.people[input.personId]) {
    throw new Error(
      `A derived member disposition needs a canonical person: ${input.personId}`,
    );
  }

  const considerations = memberConsiderations(world, input);
  const evaluation = evaluateDecision(world, {
    stableKey: `${input.stableKey}:member-decision`,
    decisionType: "legislation.member-vote",
    actorPersonId: input.personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:legislative-question",
      key: `${measure.stableKey}:${input.question.question.purpose}`,
      entityId: measure.id,
    },
    options: [...OPTIONS],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });

  const selected = evaluation.selectedOptionKey ?? "withhold";
  const disposition: LegislativeMemberDisposition =
    selected === "vote-yea"
      ? "yea"
      : selected === "vote-nay"
        ? "nay"
        : "present-not-voting";

  const decisive = considerations
    .filter((consideration) => consideration.optionKey === selected)
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, 2)
    .map((consideration) => consideration.explanation);

  return {
    world: recordDurableDecisionTrace(world, evaluation),
    disposition,
    evaluation,
    account:
      decisive.length > 0
        ? decisive.join(" ")
        : "Nothing in the current bill moved the member either way.",
  };
}

function weight(consideration: DecisionConsideration): number {
  const importance = { slight: 1, moderate: 2, strong: 4, decisive: 6 }[
    consideration.importance
  ];
  const confidence = { low: 1, medium: 2, high: 3 }[consideration.confidence];
  return importance * confidence;
}

function memberConsiderations(
  world: World,
  input: DeriveMemberDispositionInput,
): readonly DecisionConsideration[] {
  const considerations: DecisionConsideration[] = [];
  const asked = input.question.question;
  const measureId = asked.measureId;

  const pending = input.question.pendingChange ?? null;
  const currentExposure = currentMeasureProvisions(world, measureId).reduce(
    (total, provision) => total + (provision.fiscalExposureMinorUnits ?? 0),
    0,
  );
  // The bill as this question would leave it, which is the thing being voted on.
  const resultingExposure =
    currentExposure + (pending?.addsExposureMinorUnits ?? 0);
  const beneficiariesAfter = [
    ...currentMeasureProvisions(world, measureId).flatMap((provision) =>
      provision.beneficiary.kind === "particularized"
        ? [provision.beneficiary.beneficiaryLabel]
        : [],
    ),
    ...(pending?.beneficiaryLabels ?? []),
  ];

  // What the member has said about *this* question, and whether what they
  // asked for actually happened. A commitment weighs heavily; it does not
  // decide — and it only weighs on the question it was about. A member who
  // said they would not join an override has said nothing about whether the
  // bill should pass, and reading it as if they had was the same conflation
  // that let a promise be graded against the wrong vote.
  for (const commitment of commitmentsHeldBy(
    world,
    input.personId,
    measureId,
  )) {
    const assessment = assessCommitment(world, commitment.id);
    if (assessment.standing === "superseded") continue;
    const sourceRefs = commitment.claimId
      ? ([{ kind: "claim", claimId: commitment.claimId }] as const)
      : ([{ kind: "historical-event", eventId: commitment.eventId }] as const);

    if (legislativeQuestionAnswers(commitment.subject.question, asked)) {
      const obligation = commitmentObligation(
        commitment.stance,
        assessment.conditions,
      );
      // Only an obligation that is actually owed is a reason to vote.
      //
      // The other three outcomes are silence, deliberately. A "support if X"
      // whose X has not happened is not owed, and the member is free — being
      // free is not the same as being opposed, and turning it into a strong
      // reason to vote no invented an opposition nobody stated. An "oppose
      // unless X" whose X has happened is released, and being released from
      // an objection is not the same as having promised support; if the
      // member wants what is now in the bill, the bill itself says so through
      // the considerations below, which is where an affirmative reason
      // belongs.
      if (obligation.kind !== "owed") continue;
      considerations.push({
        stableKey: `member:commitment:${commitment.stableKey}`,
        optionKey: obligation.direction === "yea" ? "vote-yea" : "vote-nay",
        sourceType: "institution:stated-commitment",
        direction: "supports",
        importance:
          commitment.firmness === "explicit"
            ? "decisive"
            : commitment.firmness === "qualified"
              ? "strong"
              : commitment.firmness === "provisional"
                ? "moderate"
                : "slight",
        confidence: commitment.firmness === "noncommittal" ? "low" : "high",
        explanation: `The member has already said this much on the record: ${commitment.statement}`,
        sourceRefs: [...sourceRefs],
      });
      continue;
    }

    // A different question, but one that would settle something this member
    // said they were waiting for. That is not an obligation to vote a
    // particular way here, and it is not recorded as one — it is the plain
    // fact that the member asked for this section and this is the question
    // that puts it in the bill. Without it a member votes against the very
    // thing they asked for, on the ground that it is not there yet.
    if (pending === null) continue;
    const asksForThisSection = commitment.conditions.some(
      (condition) =>
        condition.kind === "provision-adopted" &&
        condition.provisionKey === pending.provisionKey,
    );
    if (!asksForThisSection) continue;
    considerations.push({
      stableKey: `member:asked-for-this-section:${commitment.stableKey}`,
      optionKey: "vote-yea",
      sourceType: "institution:stated-commitment",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        "This is the question that puts in the bill the section the member asked for.",
      sourceRefs: [...sourceRefs],
    });
  }

  // What the bill would do, if this question carried, for the people this
  // member speaks for.
  const local = (input.localBeneficiaryLabels ?? []).filter((label) =>
    beneficiariesAfter.includes(label),
  );
  const billLabel = pending
    ? "the bill this question would produce"
    : "the bill as it now reads";
  if (local.length > 0) {
    considerations.push({
      stableKey: "member:local-benefit-in-bill",
      optionKey: "vote-yea",
      sourceType: "context:local-beneficiary-in-bill",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `${capitalize(billLabel)} carries language written for ${local.join(" and ")}.`,
      sourceRefs: [],
    });
  } else if ((input.localBeneficiaryLabels ?? []).length > 0) {
    considerations.push({
      stableKey: "member:local-benefit-absent",
      optionKey: "vote-nay",
      sourceType: "context:local-beneficiary-absent",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: `Nothing in ${billLabel} is written for ${(input.localBeneficiaryLabels ?? []).join(" or ")}.`,
      sourceRefs: [],
    });
  }

  // What it would cost, against a limit the member actually stated.
  const ceiling = input.fiscalConcernCeilingMinorUnits ?? null;
  if (ceiling !== null) {
    const over = resultingExposure > ceiling;
    considerations.push({
      stableKey: "member:fiscal-exposure",
      optionKey: over ? "vote-nay" : "vote-yea",
      sourceType: "context:stated-fiscal-limit",
      direction: "supports",
      importance: over ? "strong" : "moderate",
      confidence: "high",
      explanation: over
        ? `${capitalize(billLabel)} commits more than the member said they could carry.`
        : `${capitalize(billLabel)} stays inside the limit the member set out.`,
      sourceRefs: [],
    });
  }

  // Whether the question's own section survived into the bill.
  if (asked.provisionKey !== null && pending === null) {
    const provision = currentProvisionByKey(
      world,
      measureId,
      asked.provisionKey,
    );
    considerations.push({
      stableKey: "member:question-section-present",
      optionKey: provision ? "vote-yea" : "withhold",
      sourceType: "context:question-section",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: provision
        ? `The section the question turns on is in the bill: ${provision.heading}.`
        : "The section the question turns on is not in the bill as it now reads.",
      sourceRefs: [],
    });
  }

  // Who the member has actually been working with on this.
  const interaction = [...world.history.relationshipInteractions]
    .reverse()
    .find(
      (record) =>
        record.personIds.includes(input.personId) &&
        record.change === "strengthened",
    );
  if (interaction) {
    considerations.push({
      stableKey: "member:working-relationship",
      optionKey: "vote-yea",
      sourceType: "social:working-relationship",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation:
        "The member has been working constructively with the people carrying this.",
      sourceRefs: [
        { kind: "relationship-interaction", interactionId: interaction.id },
      ],
    });
  }

  if (considerations.length === 0) {
    considerations.push({
      stableKey: "member:nothing-decisive",
      optionKey: "withhold",
      sourceType: "context:no-stated-position",
      direction: "supports",
      importance: "slight",
      confidence: "low",
      explanation:
        "The member has said nothing about this question and nothing in the bill reaches them.",
      sourceRefs: [],
    });
  }
  return considerations;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
