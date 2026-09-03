import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  assessCommitment,
  commitmentObligation,
  deriveMemberDisposition,
  isDecidableConditionKind,
  LEGISLATIVE_COMMITMENT_CONDITION_KINDS,
  legislativeQuestionAnswers,
  questionPutByVote,
  recordLegislativeCommitment,
  sameLegislativeQuestion,
  type DecisionConsideration,
  type EntityId,
  type LegislativeCommitmentCondition,
  type LegislativeCommitmentRecord,
  type LegislativeCommitmentStance,
  type LegislativeQuestionIdentity,
  type World,
} from "../simulation";
import {
  createLegislativeBargainingFixture,
  REQUESTED_PROVISION_KEY,
} from "./legislative-bargaining-fixture";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
} from "./legislative-bargaining-actions";

/**
 * What a promise is worth before the thing it was conditioned on happens.
 *
 * Every case here reproduces a defect an independent audit found in the first
 * cut of this system, and each one is written the way the audit found it —
 * drive the world to the state, ask the system what it thinks, and check the
 * answer against what a person in that room would say. A member who has said
 * "I'm with you if the analysis lands" has not said they are against the bill;
 * a member whose objection has been answered has not thereby endorsed
 * anything; and a promise about passing a bill is not a promise about
 * overriding a veto of it.
 *
 * These are deliberately at the semantic layer rather than through the
 * conversation, because the defects were in what the system concluded, not in
 * what it said.
 */

const ANALYSIS_NEVER_DELIVERED: LegislativeCommitmentCondition = {
  key: "independent-analysis",
  kind: "analysis-delivered",
  analysisEventStableKey: "no-such-analysis-exists",
  description: "The independent analysis this member asked for is delivered.",
};

function passageQuestion(measureId: EntityId): LegislativeQuestionIdentity {
  return {
    measureId,
    purpose: "floor-stage",
    forumKey: null,
    floorStageKey: null,
    amendmentStableKey: null,
    provisionKey: null,
  };
}

function overrideQuestion(measureId: EntityId): LegislativeQuestionIdentity {
  return { ...passageQuestion(measureId), purpose: "veto-override" };
}

/**
 * Records a promise directly, so a test can put a member in a stated position
 * the fixture's own conversation happens not to reach.
 */
function say(
  world: World,
  input: {
    readonly key: string;
    readonly holderPersonId: EntityId;
    readonly question: LegislativeQuestionIdentity;
    readonly questionLabel: string;
    readonly stance: LegislativeCommitmentStance;
    readonly conditions?: readonly LegislativeCommitmentCondition[];
    readonly statement: string;
    readonly heardByPersonIds: readonly EntityId[];
  },
): { readonly world: World; readonly commitment: LegislativeCommitmentRecord } {
  // A commitment cites the occasion it was made at, and a member can only
  // reason from an occasion they were part of — the same epistemic rule that
  // governs every other source.
  const occasion = world.history.events.findLast((event) =>
    event.involvedEntityIds.includes(input.holderPersonId),
  );
  if (!occasion) {
    throw new Error("This member has not been anywhere yet.");
  }
  const eventId = occasion.id;
  const next = recordLegislativeCommitment(world, {
    stableKey: input.key,
    holderPersonId: input.holderPersonId,
    subject: { question: input.question, questionLabel: input.questionLabel },
    stance: input.stance,
    firmness: "explicit",
    conditions: input.conditions ?? [],
    audience: "private",
    eventId,
    claimId: null,
    heardByPersonIds: [...input.heardByPersonIds],
    statement: input.statement,
  });
  assertWorldIntegrity(next);
  return {
    world: next,
    commitment: next.history.legislativeCommitments!.at(-1)!,
  };
}

/** How the member decides the bill as it now reads, and on what grounds. */
function decidePassage(
  world: World,
  personId: EntityId,
  measureId: EntityId,
  fiscalConcernCeilingMinorUnits: number | null,
) {
  return deriveMemberDisposition(world, {
    stableKey: `probe:${personId}:${world.history.nextSequence}`,
    personId,
    question: {
      question: passageQuestion(measureId),
      questionLabel: "Final passage",
      pendingChange: null,
    },
    localBeneficiaryLabels: [],
    fiscalConcernCeilingMinorUnits,
  });
}

function commitmentConsiderations(
  considerations: readonly DecisionConsideration[],
): readonly DecisionConsideration[] {
  return considerations.filter(
    (consideration) =>
      consideration.sourceType === "institution:stated-commitment",
  );
}

/** The fiscal limit this member stated in public before the bill was filed. */
const GUARDIAN_CEILING = 860_000_000;

// 1 --------------------------------------------------------------------------
describe("a conditional promise says nothing until its condition happens", () => {
  it("does not turn an unmet 'support if' into a reason to vote against", () => {
    const fixture = createLegislativeBargainingFixture();
    const measureId = fixture.measureId;
    const member = fixture.guardianPersonId;

    // The same member, twice: once having said nothing, once having said they
    // would support the bill if an analysis arrived that never arrives.
    const silent = decidePassage(
      fixture.world,
      member,
      measureId,
      GUARDIAN_CEILING,
    );
    const said = say(fixture.world, {
      key: "probe:support-if-analysis",
      holderPersonId: member,
      question: passageQuestion(measureId),
      questionLabel: "Final passage",
      stance: "support-if",
      conditions: [ANALYSIS_NEVER_DELIVERED],
      statement:
        "Get me the independent analysis and I'm with you on this bill.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    const promised = decidePassage(
      said.world,
      member,
      measureId,
      GUARDIAN_CEILING,
    );

    // Saying a conditional yes cannot make a member more opposed than saying
    // nothing at all. This is the audit's exact reproduction: yea while
    // silent, nay after promising conditional support.
    expect(silent.disposition).toBe("yea");
    expect(promised.disposition).toBe("yea");

    // Not merely a tie broken the right way — the promise contributes nothing.
    expect(
      commitmentConsiderations(promised.evaluation.context.considerations),
    ).toHaveLength(0);
    expect(promised.account).not.toMatch(/has not happened/i);
  });

  it("counts the promise once the thing asked for has actually happened", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:support-if-section",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "support-if",
      conditions: [
        {
          key: "section-4",
          kind: "provision-adopted",
          provisionKey: REQUESTED_PROVISION_KEY,
          description: "Section 4 is adopted by the House.",
        },
      ],
      statement: "Write Section 4 and you have my vote on the bill.",
      heardByPersonIds: [fixture.playerPersonId],
    });

    const before = commitmentObligation(
      "support-if",
      assessCommitment(said.world, said.commitment.id).conditions,
    );
    expect(before.kind).toBe("not-yet-owed");

    const amended = offerNegotiatedAmendment(
      said.world,
      fixture,
      fixture.progress,
      "capped",
    );
    expect(amended.adopted).toBe(true);

    const after = commitmentObligation(
      "support-if",
      assessCommitment(amended.world, said.commitment.id).conditions,
    );
    expect(after).toEqual({ kind: "owed", direction: "yea" });
    const considerations = commitmentConsiderations(
      decidePassage(
        amended.world,
        fixture.guardianPersonId,
        fixture.measureId,
        GUARDIAN_CEILING,
      ).evaluation.context.considerations,
    );
    expect(considerations).toHaveLength(1);
    expect(considerations[0]!.optionKey).toBe("vote-yea");
  });
});

// 2 --------------------------------------------------------------------------
describe("whether a promise was owed is settled before whether it was kept", () => {
  it("does not read a coincidentally matching vote as honoring an unmet promise", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:unmet-then-yea",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "support-if",
      conditions: [ANALYSIS_NEVER_DELIVERED],
      statement:
        "Get me the independent analysis and I'm with you on this bill.",
      heardByPersonIds: [fixture.playerPersonId],
    });

    const vote = takeNegotiatedFloorVote(said.world, fixture, fixture.progress);
    const recorded = vote.world
      .history!.legislativeVotes!.at(-1)!
      .dispositions.find(
        (record) => record.personId === fixture.guardianPersonId,
      )!;
    // The member did vote the way they said they would — and was never owed.
    expect(recorded.disposition).toBe("yea");

    const assessment = assessCommitment(vote.world, said.commitment.id);
    expect(assessment.standing).not.toBe("honored");
    expect(assessment.standing).toBe("conditions-unmet");
    expect(assessment.account).toMatch(/not met|nothing is owed/i);
  });

  it("still reads a kept promise as kept once it was genuinely owed", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:unconditional-support",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "support",
      statement: "I'm a yes on this bill. You can count it.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    const vote = takeNegotiatedFloorVote(said.world, fixture, fixture.progress);
    expect(assessCommitment(vote.world, said.commitment.id).standing).toBe(
      "honored",
    );
  });
});

// 3 --------------------------------------------------------------------------
describe("an answered objection is released, not reversed", () => {
  it("binds an 'oppose unless' to no while the thing asked for is missing", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:oppose-unless-open",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "oppose-unless",
      conditions: [
        {
          key: "section-4",
          kind: "provision-adopted",
          provisionKey: REQUESTED_PROVISION_KEY,
          description: "Section 4 is adopted by the House.",
        },
      ],
      statement: "Without Section 4 in the bill I am a no.",
      heardByPersonIds: [fixture.playerPersonId],
    });

    const considerations = commitmentConsiderations(
      decidePassage(
        said.world,
        fixture.guardianPersonId,
        fixture.measureId,
        GUARDIAN_CEILING,
      ).evaluation.context.considerations,
    );
    expect(considerations).toHaveLength(1);
    expect(considerations[0]!.optionKey).toBe("vote-nay");
  });

  it("returns the commitment to neutral when the objection is answered", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:oppose-unless-answered",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "oppose-unless",
      conditions: [
        {
          key: "section-4",
          kind: "provision-adopted",
          provisionKey: REQUESTED_PROVISION_KEY,
          description: "Section 4 is adopted by the House.",
        },
      ],
      statement: "Without Section 4 in the bill I am a no.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    const amended = offerNegotiatedAmendment(
      said.world,
      fixture,
      fixture.progress,
      "capped",
    );
    expect(amended.adopted).toBe(true);

    const assessment = assessCommitment(amended.world, said.commitment.id);
    expect(
      commitmentObligation("oppose-unless", assessment.conditions).kind,
    ).toBe("released");

    // Released means released. The member never promised to vote for this
    // bill, and delivering what they asked for does not manufacture a promise
    // they did not make.
    const considerations = commitmentConsiderations(
      decidePassage(
        amended.world,
        fixture.guardianPersonId,
        fixture.measureId,
        GUARDIAN_CEILING,
      ).evaluation.context.considerations,
    );
    expect(considerations).toHaveLength(0);

    expect(assessment.standing).toBe("conditions-met");
    expect(assessment.standing).not.toBe("honored");
  });

  it("keeps an unconditional 'oppose' binding against the bill", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:plain-oppose",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "oppose",
      statement: "I am against this bill and I am not going to be talked out.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    const decided = decidePassage(
      said.world,
      fixture.guardianPersonId,
      fixture.measureId,
      GUARDIAN_CEILING,
    );
    const considerations = commitmentConsiderations(
      decided.evaluation.context.considerations,
    );
    expect(considerations).toHaveLength(1);
    expect(considerations[0]!.optionKey).toBe("vote-nay");
    expect(decided.disposition).toBe("nay");
  });
});

// 4 --------------------------------------------------------------------------
describe("supersession works on the exact question, not on the measure", () => {
  it("lets a promise about passage and a promise about the override stand together", () => {
    const fixture = createLegislativeBargainingFixture();
    const onPassage = say(fixture.world, {
      key: "probe:passage-promise",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "support",
      statement: "I'll vote for the bill.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    const onOverride = say(onPassage.world, {
      key: "probe:override-promise",
      holderPersonId: fixture.guardianPersonId,
      question: overrideQuestion(fixture.measureId),
      questionLabel: "Overriding a veto of the bill",
      stance: "oppose",
      statement:
        "Voting for the bill is one thing. I am not overriding the governor.",
      heardByPersonIds: [fixture.playerPersonId],
    });

    expect(
      sameLegislativeQuestion(
        onPassage.commitment.subject.question,
        onOverride.commitment.subject.question,
      ),
    ).toBe(false);

    // Neither replaces the other, and each still says its own thing.
    expect(
      assessCommitment(onOverride.world, onPassage.commitment.id).standing,
    ).not.toBe("superseded");
    expect(
      assessCommitment(onOverride.world, onOverride.commitment.id).standing,
    ).not.toBe("superseded");
  });

  it("still replaces an earlier promise about the very same question", () => {
    const fixture = createLegislativeBargainingFixture();
    const first = say(fixture.world, {
      key: "probe:first-word",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "support",
      statement: "I'll vote for the bill.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    const second = say(first.world, {
      key: "probe:second-word",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "oppose",
      statement: "I've read it again. I'm off it.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    expect(assessCommitment(second.world, first.commitment.id).standing).toBe(
      "superseded",
    );
  });
});

// 5 --------------------------------------------------------------------------
describe("a promise is tested by the question it was actually about", () => {
  it("does not grade an override promise against the passage vote", () => {
    const fixture = createLegislativeBargainingFixture();
    const said = say(fixture.world, {
      key: "probe:override-only",
      holderPersonId: fixture.guardianPersonId,
      question: overrideQuestion(fixture.measureId),
      questionLabel: "Overriding a veto of the bill",
      stance: "oppose",
      statement: "If it comes back vetoed, I am not part of an override.",
      heardByPersonIds: [fixture.playerPersonId],
    });

    const vote = takeNegotiatedFloorVote(said.world, fixture, fixture.progress);
    const recorded = vote.world
      .history!.legislativeVotes!.at(-1)!
      .dispositions.find(
        (record) => record.personId === fixture.guardianPersonId,
      )!;
    // A yea on passage looks exactly like breaking a promise to oppose, until
    // you ask which question the promise was about.
    expect(recorded.disposition).toBe("yea");

    const assessment = assessCommitment(vote.world, said.commitment.id);
    expect(assessment.standing).toBe("open");
    expect(assessment.standing).not.toBe("departed-from");
    expect(assessment.standing).not.toBe("honored");
  });

  it("matches the question a recorded vote actually put", () => {
    const fixture = createLegislativeBargainingFixture();
    const vote = takeNegotiatedFloorVote(
      fixture.world,
      fixture,
      fixture.progress,
    );
    const put = questionPutByVote(
      vote.world,
      vote.world.history.legislativeVotes!.at(-1)!,
    );
    expect(put.purpose).toBe("floor-stage");

    const measureId = fixture.measureId;
    expect(legislativeQuestionAnswers(passageQuestion(measureId), put)).toBe(
      true,
    );
    expect(legislativeQuestionAnswers(overrideQuestion(measureId), put)).toBe(
      false,
    );
    // Nor another provision's amendment question.
    expect(
      legislativeQuestionAnswers(
        {
          ...passageQuestion(measureId),
          purpose: "amendment",
          provisionKey: REQUESTED_PROVISION_KEY,
        },
        put,
      ),
    ).toBe(false);
    // Nor the same stage in the other chamber, when the promise named one.
    expect(
      legislativeQuestionAnswers(
        { ...passageQuestion(measureId), forumKey: "senate" },
        put,
      ),
    ).toBe(false);
  });

  it("tests an amendment promise against that amendment's own vote", () => {
    const fixture = createLegislativeBargainingFixture();
    const amended = offerNegotiatedAmendment(
      fixture.world,
      fixture,
      fixture.progress,
      "capped",
    );
    expect(amended.adopted).toBe(true);
    const amendmentVote = amended.world.history.legislativeVotes!.findLast(
      (vote) => vote.purpose === "amendment",
    )!;
    const put = questionPutByVote(amended.world, amendmentVote);
    expect(put.purpose).toBe("amendment");
    expect(put.provisionKey).toBe(REQUESTED_PROVISION_KEY);
    expect(
      legislativeQuestionAnswers(passageQuestion(fixture.measureId), put),
    ).toBe(false);
    expect(
      legislativeQuestionAnswers(
        {
          ...passageQuestion(fixture.measureId),
          purpose: "amendment",
          provisionKey: REQUESTED_PROVISION_KEY,
          amendmentStableKey: put.amendmentStableKey,
        },
        put,
      ),
    ).toBe(true);
  });
});

// 6 --------------------------------------------------------------------------
describe("the contract only offers conditions the world can decide", () => {
  it("no longer offers a provision removal nothing can perform", () => {
    expect(LEGISLATIVE_COMMITMENT_CONDITION_KINDS).not.toContain(
      "provision-removed",
    );
    expect(isDecidableConditionKind("provision-removed")).toBe(false);
  });

  it("refuses to record a condition nothing can decide", () => {
    const fixture = createLegislativeBargainingFixture();
    expect(() =>
      say(fixture.world, {
        key: "probe:undecidable",
        holderPersonId: fixture.guardianPersonId,
        question: passageQuestion(fixture.measureId),
        questionLabel: "Final passage",
        stance: "support-if",
        conditions: [
          {
            key: "struck",
            kind: "provision-removed",
            provisionKey: REQUESTED_PROVISION_KEY,
            description: "Section 4 comes back out of the bill.",
          } as unknown as LegislativeCommitmentCondition,
        ],
        statement: "Take it back out and I'm with you.",
        heardByPersonIds: [fixture.playerPersonId],
      }),
    ).toThrow(/decide/i);
  });

  it("can decide every condition it does offer", () => {
    const fixture = createLegislativeBargainingFixture();
    // One commitment carrying one condition of every offered kind, assessed.
    const conditions: readonly LegislativeCommitmentCondition[] = [
      {
        key: "adopted",
        kind: "provision-adopted",
        provisionKey: REQUESTED_PROVISION_KEY,
        description: "Section 4 is adopted by the House.",
      },
      {
        key: "narrowed",
        kind: "scope-narrowed",
        provisionKey: REQUESTED_PROVISION_KEY,
        description: "Section 4 reaches fewer people than it did as filed.",
      },
      {
        key: "ceiling",
        kind: "fiscal-ceiling",
        provisionKey: REQUESTED_PROVISION_KEY,
        ceilingMinorUnits: 60_000_000,
        description: "Section 4 stays inside what the member can carry.",
      },
      ANALYSIS_NEVER_DELIVERED,
      {
        key: "reciprocal",
        kind: "reciprocal-support",
        reciprocalMeasureStableKey: "no-such-measure",
        description: "The other side says the same about their own bill.",
      },
      {
        key: "before-the-vote",
        kind: "procedural",
        requiredBeforeAction: "take-floor-vote",
        description: "The promise is only good before the bill is called.",
      },
    ];
    expect(conditions.map((condition) => condition.kind).sort()).toEqual(
      [...LEGISLATIVE_COMMITMENT_CONDITION_KINDS].sort(),
    );

    const said = say(fixture.world, {
      key: "probe:every-kind",
      holderPersonId: fixture.guardianPersonId,
      question: passageQuestion(fixture.measureId),
      questionLabel: "Final passage",
      stance: "support-if",
      conditions,
      statement: "There is a list, and you have it.",
      heardByPersonIds: [fixture.playerPersonId],
    });
    for (const standing of assessCommitment(said.world, said.commitment.id)
      .conditions) {
      expect(["met", "unmet", "undetermined"]).toContain(standing.state);
      expect(standing.basis.trim().length).toBeGreaterThan(10);
    }
  });
});
