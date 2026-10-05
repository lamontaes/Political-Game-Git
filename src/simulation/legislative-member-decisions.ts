import { considerationScore, recordDurableDecisionTrace } from "./decisions";
import { decideMemberVote } from "./governing/member-vote-decision";
import { favorRecords, favorStandingBetween } from "./favors";
import { requireMeasure } from "./legislation";
import { lawInForce } from "./governing/law-in-force";
import { measurePropositionAnswer } from "./issue-record";
import { membersAgainstLaw, netViewOnLaw } from "./official-view-reads";
import {
  assessCommitment,
  commitmentObligation,
  commitmentsHeldBy,
  currentMeasureProvisions,
  currentProvisionByKey,
  legislativeQuestionAnswers,
  reachInSummary,
} from "./legislative-politics";
import { currentHistoricalCutoff, latestPrivateBelief } from "./queries";
import { measureAnswersAt } from "./vote-bundle";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  LegislativeMemberDisposition,
  LegislativeQuestionIdentity,
  PropositionAnswerRef,
  PublicPositionRecord,
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
 * the game has never modeled does not acquire a mind because a neighboring
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
    /**
     * The catalog questions the amendment's sections answer, and which way.
     * A member with a view on one of them weighs the amendment by it, so an
     * amendment the public likes costs a member who votes it down. Omitted
     * for an amendment whose text answers no catalog question.
     */
    readonly answers?: readonly PropositionAnswerRef[];
  } | null;
  /**
   * A bill question asked as if the bill also carried these parts: what a
   * colleague weighing an amendment predicts the bill's vote would be once it
   * is adopted. Answers here govern over the bill's own on the same question.
   */
  readonly billAsItWouldRead?: readonly PropositionAnswerRef[];
  /**
   * Ask the question as this person would predict it, from what they can
   * know. Another member's private view is not known to them: only a view the
   * member has stated in public counts, and what people privately told that
   * member about a law does not. The person's own view counts as their own.
   * Omitted for the vote itself, where each member decides from their own
   * mind.
   */
  readonly knownTo?: EntityId;
  /**
   * Who offered the amendment on an amendment question. Colleagues take
   * their party cue from the author of the amendment, not from the bill's
   * sponsor. Omitted where the author is not recorded as a person.
   */
  readonly offeredBy?: EntityId;
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
  const { evaluation, disposition } = decideMemberVote(world, {
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

  const decisive = considerations
    .filter((consideration) => consideration.optionKey === selected)
    .sort(
      (a, b) =>
        Math.abs(considerationScore(b)) - Math.abs(considerationScore(a)),
    )
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

/**
 * The reasons a member has on one question, as considerations for the shared
 * evaluator. Exported so a whole chamber can be asked the same way one
 * bargaining colleague is, without each caller rebuilding the reasons.
 */
export function memberVoteConsiderations(
  world: World,
  input: DeriveMemberDispositionInput,
): readonly DecisionConsideration[] {
  return memberConsiderations(world, input);
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

  // A catalog question alone does not say which way this bill answers it.
  // Only an explicit answer can connect a formed private view to this vote:
  // the answers the bill was filed with and the ones its sections carry, on a
  // question about the bill; the amendment's own sections' answers, on an
  // amendment. An amendment that says nothing borrows nothing from the bill.
  const answersOnTable: readonly PropositionAnswerRef[] =
    asked.purpose === "amendment" || pending !== null
      ? (pending?.answers ?? [])
      : withParts(
          measureAnswersAt(world, measureId, undefined, "all"),
          input.question.billAsItWouldRead ?? [],
        );
  const predictor = input.question.knownTo ?? null;
  const guessed = predictor !== null && predictor !== input.personId;
  for (const answer of answersOnTable) {
    if (guessed) {
      const stated = statedPositionConsideration(world, input.personId, answer);
      if (stated) considerations.push(stated);
      continue;
    }
    const belief = latestPrivateBelief(
      world,
      input.personId,
      answer.propositionId,
    );
    if (belief?.position !== "support" && belief?.position !== "oppose")
      continue;
    const proposition = world.policyCatalog.propositions[answer.propositionId];
    if (!proposition) continue;
    const agrees =
      (belief.position === "support" && answer.answer === "yes") ||
      (belief.position === "oppose" && answer.answer === "no");
    // PLACEHOLDER(overnight): map recorded conviction and salience to the
    // decision engine's ordinal weight until voting calibration is approved.
    const importance =
      belief.salience === "central"
        ? "decisive"
        : belief.salience === "high"
          ? "strong"
          : belief.salience === "moderate"
            ? "moderate"
            : "slight";
    const confidence =
      belief.conviction === "settled" || belief.conviction === "strong"
        ? "high"
        : belief.conviction === "moderate"
          ? "medium"
          : "low";
    considerations.push({
      stableKey: `member:private-belief:${answer.propositionId}`,
      optionKey: agrees ? "vote-yea" : "vote-nay",
      sourceType: "belief:formed-position",
      direction: "supports",
      importance,
      confidence,
      explanation: agrees
        ? `The member's own view agrees with the bill's answer to ${proposition.question}`
        : `The member's own view conflicts with the bill's answer to ${proposition.question}`,
      sourceRefs: [{ kind: "private-belief", beliefId: belief.id }],
    });
  }

  // Spec 5: what the people an existing law reached told this member about
  // their part in it. A bill that would change that law answers them: blame
  // argues for changing it, credit for keeping it.
  if (asked.purpose !== "amendment" && pending === null && !guessed) {
    const measure = requireMeasure(world, measureId);
    for (const answer of answersOnTable) {
      const law = lawInForce(
        world,
        measure.jurisdictionId,
        answer.propositionId,
      );
      if (!law || law.measureId === measureId) continue;
      const billAnswerForGroups = measurePropositionAnswer(
        measure,
        answer.propositionId,
      );
      // Organized interests: the groups a law's cost-bearers formed lobby
      // every member to change it.
      const lobbying = membersAgainstLaw(world, law.measureId);
      if (lobbying > 0 && billAnswerForGroups) {
        const changesLaw = law.answer !== billAnswerForGroups;
        considerations.push({
          stableKey: `member:organized-interest:${law.measureId}:${answer.propositionId}`,
          optionKey: changesLaw ? "vote-yea" : "vote-nay",
          sourceType: "context:organized-interest",
          direction: "supports",
          // PLACEHOLDER: group members to the engine's ordinal weight.
          importance:
            lobbying >= 30 ? "strong" : lobbying >= 10 ? "moderate" : "slight",
          confidence: "medium",
          explanation: `Groups of people the current law cost want it ${changesLaw ? "changed, as this bill would" : "changed, and this bill would keep it"}.`,
          sourceRefs: [],
        });
      }
      const net = netViewOnLaw(world, input.personId, law.measureId);
      if (net === 0) continue;
      const changes = law.answer !== answer.answer;
      const yea = net < 0 ? changes : !changes;
      const proposition =
        world.policyCatalog.propositions[answer.propositionId];
      // PLACEHOLDER: net view points to the engine's ordinal weight.
      const size = Math.abs(net);
      considerations.push({
        stableKey: `member:constituents:${law.measureId}:${answer.propositionId}`,
        optionKey: yea ? "vote-yea" : "vote-nay",
        sourceType: "context:constituents-view",
        direction: "supports",
        importance: size >= 60 ? "strong" : size >= 20 ? "moderate" : "slight",
        confidence: "medium",
        explanation: `People the current law on ${proposition?.question ?? "this question"} reached ${net < 0 ? "blame" : "credit"} the member for it, and this bill would ${changes ? "change" : "keep"} that law.`,
        sourceRefs: [],
      });
    }
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
      explanation: `${capitalize(billLabel)} carries ${reachInSummary({ relation: "written-for", who: local.join(" and ") })}.`,
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

  // Who the member has actually been working with on this: the person
  // carrying the bill, not anyone at all. A strengthened relationship with a
  // neighbor is no reason to vote for a stranger's bill.
  const sponsorPersonId = requireMeasure(world, measureId).sponsorPersonId;
  const interaction = sponsorPersonId
    ? [...world.history.relationshipInteractions]
        .reverse()
        .find(
          (record) =>
            record.personIds.includes(input.personId) &&
            record.personIds.includes(sponsorPersonId) &&
            record.change === "strengthened",
        )
    : undefined;
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

  // What the member owes the person carrying the bill: an appointment, a job,
  // help when it counted (appointments-v1, through the one favor record). The
  // debt is read as it stands today, faded or held, never as a count.
  if (sponsorPersonId && sponsorPersonId !== input.personId) {
    const standing = favorStandingBetween(
      world,
      input.personId,
      sponsorPersonId,
      world.currentDate,
    );
    const owed = standing.receiverDebt;
    // Cite the open help that produced this debt, rather than the latest
    // favors, which may have been repaid or may be dated after this vote.
    const openFavorIds = new Set(standing.openFavorIds);
    const refs = favorRecords(world)
      .filter((favor) => openFavorIds.has(favor.id))
      .map((favor) => ({
        kind: "historical-event" as const,
        eventId: favor.eventId,
      }));
    // A debt with no recorded moment behind it is not cited.
    if (owed !== "none" && refs.length > 0)
      considerations.push({
        stableKey: "member:owes-sponsor",
        optionKey: "vote-yea",
        sourceType: "social:favor",
        direction: "supports",
        importance:
          owed === "strong"
            ? "strong"
            : owed === "marked"
              ? "moderate"
              : "slight",
        confidence: "medium",
        explanation:
          "The member owes the person carrying this bill for past help.",
        sourceRefs: refs,
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

/** The bill's answers with hypothetical parts laid over them. */
export function withParts(
  answers: readonly PropositionAnswerRef[],
  parts: readonly PropositionAnswerRef[],
): readonly PropositionAnswerRef[] {
  if (parts.length === 0) return answers;
  const byQuestion = new Map(
    answers.map((answer) => [answer.propositionId, answer]),
  );
  for (const part of parts) byQuestion.set(part.propositionId, part);
  return [...byQuestion.values()];
}

/**
 * What a colleague can read of a member's view on a question: the member's
 * latest public statement of it. Weighed as a moderate reason, because a
 * public statement says which way a member leans and not how much it matters
 * to them. PLACEHOLDER(build-25): the ordinal weight is the game's own until
 * the research question on how legislators whip a count is answered.
 */
function statedPositionConsideration(
  world: World,
  personId: EntityId,
  answer: PropositionAnswerRef,
): DecisionConsideration | null {
  let latest: PublicPositionRecord | null = null;
  for (const record of world.history.publicPositions) {
    if (
      record.personId !== personId ||
      record.propositionId !== answer.propositionId ||
      record.audience !== "public" ||
      record.statedAt > world.currentDate
    )
      continue;
    if (!latest || record.sequence > latest.sequence) latest = record;
  }
  if (latest?.stance !== "support" && latest?.stance !== "oppose") return null;
  const agrees = (latest.stance === "support") === (answer.answer === "yes");
  return {
    stableKey: `member:stated-position:${answer.propositionId}`,
    optionKey: agrees ? "vote-yea" : "vote-nay",
    sourceType: "context:stated-position",
    direction: "supports",
    importance: "moderate",
    confidence: "medium",
    explanation: agrees
      ? "The member has said in public that they back what this part does."
      : "The member has said in public that they oppose what this part does.",
    sourceRefs: [],
  };
}
