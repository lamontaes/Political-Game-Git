import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  PoliticalSalience,
  PropositionAnswerRef,
  PrivateBeliefRecord,
  LegislativeAmendmentMotive,
} from "../../simulation/types";
import type {
  AmendmentAuthorsInput,
  AmendmentPlan,
} from "../../simulation/governing/amendment-authors";
import type { SeatedMember } from "../../simulation/legislation-scenarios";
import type { MemberVoteQuestion } from "../../simulation/legislative-member-decisions";
import type { ChamberBillVoteInput } from "../../simulation/governing/chamber-votes";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
import { buildLegislativeVoteRecord } from "./vote-record";
type AmendmentMotive = LegislativeAmendmentMotive;
type PredictedCount = {
  readonly yea: number;
  readonly nay: number;
  readonly passes: boolean;
};
export interface AmendmentPlanningFacts {
  readonly onDate: IsoDate;
  readonly measure: LegislativeMeasureRecord;
  readonly answers: readonly PropositionAnswerRef[];
  readonly beliefs: readonly PrivateBeliefRecord[];
  readonly playerPersonId: EntityId | null;
  readonly parties: ReadonlyMap<EntityId, string | null>;
  readonly personIds: ReadonlySet<EntityId>;
  readonly votes: ReadonlyMap<string, ChamberDecisionFacts>;
}
export function amendmentVoteFactKey(input: ChamberBillVoteInput): string {
  return input.stableKey + JSON.stringify(input.question);
}
function readVote(facts: AmendmentPlanningFacts, input: ChamberBillVoteInput) {
  return decideChamberVote(
    facts.votes.get(amendmentVoteFactKey(input))!,
    input,
  );
}
export const AMENDMENT_AUTHORS_VERSION = "amendment-authors/v1";

const CANDIDATE_QUESTIONS_COUNTED = 6;

const SALIENCE_RANK: Readonly<Record<PoliticalSalience, number>> = {
  low: 0,
  moderate: 1,
  high: 2,
  central: 3,
};

function ownView(
  facts: AmendmentPlanningFacts,
  personId: EntityId,
  propositionId: EntityId,
): {
  readonly answer: "yes" | "no";
  readonly salience: PoliticalSalience;
} | null {
  const belief = facts.beliefs
    .filter(
      (row) =>
        row.personId === personId &&
        row.propositionId === propositionId &&
        row.formedAt <= facts.onDate,
    )
    .sort(
      (a, b) => a.formedAt.localeCompare(b.formedAt) || a.sequence - b.sequence,
    )
    .at(-1);
  if (belief?.position === "support" || belief?.position === "oppose")
    return {
      answer: belief.position === "support" ? "yes" : "no",
      salience: belief.salience,
    };
  return null;
}

function strongViews(facts: AmendmentPlanningFacts, personId: EntityId) {
  const found = new Map<
    EntityId,
    {
      readonly answer: "yes" | "no";
      readonly salience: PoliticalSalience;
    }
  >();
  const questions = new Set<EntityId>();
  for (const belief of facts.beliefs)
    if (belief.personId === personId && belief.propositionId !== null)
      questions.add(belief.propositionId);
  for (const propositionId of questions) {
    const view = ownView(facts, personId, propositionId);
    if (view && SALIENCE_RANK[view.salience] >= SALIENCE_RANK.high)
      found.set(propositionId, view);
  }
  return found;
}

function count(
  facts: AmendmentPlanningFacts,
  input: AmendmentAuthorsInput,
  measure: LegislativeMeasureRecord,
  purpose: "floor-stage" | "amendment",
  dispositions: readonly LegislativeVoteDisposition[],
): PredictedCount {
  const threshold = input.stage.vote;
  if (threshold.kind !== "known") {
    return { yea: 0, nay: 0, passes: false };
  }
  const record = buildLegislativeVoteRecord(
    {
      personIds: facts.personIds,
      onDate: facts.onDate,
      nextSequence: 0,
      recordId: measure.id,
    },
    {
      stableKey: `${input.stableKey}:prediction:${purpose}`,
      measureId: measure.id,
      forum: { kind: "chamber", chamberKey: input.chamber.chamberKey },
      purpose,
      floorStageKey: input.stage.stageKey,
      threshold: threshold.value,
      eligibleMembers: input.members.length,
      presentMembers: dispositions.filter(
        (row) => row.disposition !== "absent" && row.disposition !== "excused",
      ).length,
      dispositions,
      provenance: {
        method: "member-decisions",
        note: "A member's own count of the chamber.",
        sourceEntityIds: [],
      },
    },
  );
  return {
    yea: record.tally.yea,
    nay: record.tally.nay,
    passes: record.outcome === "passed",
  };
}

function billQuestion(
  input: AmendmentAuthorsInput,
  extra: PropositionAnswerRef | null,
  knownTo: EntityId | undefined,
): MemberVoteQuestion {
  return {
    question: {
      measureId: input.measureId,
      purpose: "floor-stage",
      forumKey: input.chamber.chamberKey,
      floorStageKey: input.stage.stageKey,
      amendmentStableKey: null,
      provisionKey: null,
    },
    questionLabel: `${input.stage.label} in the ${input.chamber.name}`,
    ...(extra ? { billAsItWouldRead: [extra] } : {}),
    ...(knownTo ? { knownTo } : {}),
  };
}

export function amendmentQuestion(
  input: AmendmentAuthorsInput,
  part: PropositionAnswerRef,
  amendmentStableKey: string,
  offeredBy: EntityId,
  knownTo: EntityId | undefined,
): MemberVoteQuestion {
  return {
    question: {
      measureId: input.measureId,
      purpose: "amendment",
      forumKey: input.chamber.chamberKey,
      floorStageKey: input.stage.stageKey,
      amendmentStableKey,
      provisionKey: partKey(part),
    },
    questionLabel: "On adopting the amendment",
    pendingChange: {
      provisionKey: partKey(part),
      beneficiaryLabels: [],
      addsExposureMinorUnits: 0,
      answers: [part],
    },
    offeredBy,
    ...(knownTo ? { knownTo } : {}),
  };
}

export function partKey(part: PropositionAnswerRef): string {
  return `answers:${part.propositionId}:${part.answer}`;
}

function seatedMinds(
  facts: AmendmentPlanningFacts,
  members: readonly SeatedMember[],
): (SeatedMember & {
  personId: EntityId;
})[] {
  return members.filter(
    (
      member,
    ): member is SeatedMember & {
      personId: EntityId;
    } => member.personId !== null && facts.playerPersonId !== member.personId,
  );
}

function candidateParts(
  facts: AmendmentPlanningFacts,
  input: AmendmentAuthorsInput,
  measure: LegislativeMeasureRecord,
  seated: readonly (SeatedMember & {
    personId: EntityId;
  })[],
): PropositionAnswerRef[] {
  const answered = new Set(facts.answers.map((row) => row.propositionId));
  const views = new Map(
    seated.map((member) => [
      member.personId,
      strongViews(facts, member.personId),
    ]),
  );
  const holders = new Map<
    string,
    {
      part: PropositionAnswerRef;
      holders: number;
      weight: number;
    }
  >();
  for (const [, held] of views) {
    for (const [propositionId, view] of held) {
      if (answered.has(propositionId)) continue;
      const part = { propositionId, answer: view.answer } as const;
      if (input.admissible && !input.admissible(measure, part)) continue;
      const key = partKey(part);
      const entry = holders.get(key) ?? { part, holders: 0, weight: 0 };
      holders.set(key, {
        part,
        holders: entry.holders + 1,
        weight: entry.weight + SALIENCE_RANK[view.salience],
      });
    }
  }
  return [...holders.entries()]
    .sort(
      ([lk, l], [rk, r]) =>
        r.weight - l.weight || r.holders - l.holders || lk.localeCompare(rk),
    )
    .slice(0, CANDIDATE_QUESTIONS_COUNTED)
    .map(([, entry]) => entry.part);
}

export function planFloorAmendment(
  facts: AmendmentPlanningFacts,
  input: AmendmentAuthorsInput,
): AmendmentPlan | null {
  const measure = facts.measure;
  const seated = seatedMinds(facts, input.members);
  if (seated.length === 0) return null;
  const candidates = candidateParts(facts, input, measure, seated);
  if (candidates.length === 0) return null;
  const ownLean = new Map(
    readVote(facts, {
      stableKey: `${input.stableKey}:own-lean`,
      question: billQuestion(input, null, undefined),
      members: seated,
      nonpartisan: input.nonpartisan ?? false,
    }).map((row) => [row.personId, row.disposition]),
  );
  const readings = new Map<
    string,
    {
      readonly by: string;
      readonly rows: ReadonlyMap<string, LegislativeVoteDisposition>;
    }
  >();
  const countedBy = (
    reading: string,
    member: SeatedMember,
    vote: Omit<ChamberBillVoteInput, "members" | "only">,
  ): readonly LegislativeVoteDisposition[] => {
    const first = readings.get(reading);
    if (!first || first.by === member.memberKey) {
      const rows = readVote(facts, {
        ...vote,
        members: seated,
        nonpartisan: input.nonpartisan ?? false,
      });
      if (!first)
        readings.set(reading, {
          by: member.memberKey,
          rows: new Map(rows.map((row) => [row.memberKey, row])),
        });
      return rows;
    }
    const again = new Map(
      readVote(facts, {
        ...vote,
        members: seated,
        nonpartisan: input.nonpartisan ?? false,
        only: new Set([first.by, member.memberKey]),
      }).map((row) => [row.memberKey, row]),
    );
    return seated.map(
      (seat) => again.get(seat.memberKey) ?? first.rows.get(seat.memberKey)!,
    );
  };
  const authorReading = (
    member: SeatedMember & {
      personId: EntityId;
    },
  ) =>
    `${
      member.partyKey !== undefined
        ? member.partyKey
        : (facts.parties.get(member.personId) ?? null)
    }:${member.personId === measure.sponsorPersonId}`;
  const plans: (AmendmentPlan & {
    readonly rank: number;
  })[] = [];
  for (const member of seated) {
    const lean = ownLean.get(member.personId);
    const knownTo = member.personId;
    let billNow: PredictedCount | null = null;
    for (const part of candidates) {
      const mine = ownView(facts, member.personId, part.propositionId);
      if (mine && mine.answer !== part.answer) continue;
      billNow ??= count(
        facts,
        input,
        measure,
        "floor-stage",
        countedBy("bill", member, {
          stableKey: `${input.stableKey}:count:${member.memberKey}`,
          question: billQuestion(input, null, knownTo),
        }),
      );
      const amendmentKey = `${input.stableKey}:${AMENDMENT_AUTHORS_VERSION}`;
      const withPart = count(
        facts,
        input,
        measure,
        "floor-stage",
        countedBy(`with:${partKey(part)}`, member, {
          stableKey: `${input.stableKey}:count-with:${member.memberKey}`,
          question: billQuestion(input, part, knownTo),
        }),
      );
      const amendment = count(
        facts,
        input,
        measure,
        "amendment",
        countedBy(
          `amendment:${partKey(part)}:${authorReading(member)}`,
          member,
          {
            stableKey: `${input.stableKey}:count-amendment:${member.memberKey}`,
            question: amendmentQuestion(
              input,
              part,
              amendmentKey,
              member.personId,
              knownTo,
            ),
          },
        ),
      );
      const motive = chooseMotive(
        measure,
        lean ?? "present-not-voting",
        mine,
        billNow,
        withPart,
        amendment,
      );
      if (!motive) continue;
      plans.push({
        authorPersonId: member.personId,
        authorMemberKey: member.memberKey,
        motive,
        part,
        predicted: {
          billAsItReads: billNow,
          billWithPart: withPart,
          amendment,
        },
        reasoning: motive,
        rank: mine ? SALIENCE_RANK[mine.salience] : -1,
      });
    }
  }
  if (plans.length === 0) return null;
  const chosen = plans.sort(
    (l, r) =>
      r.rank - l.rank ||
      l.authorMemberKey.localeCompare(r.authorMemberKey) ||
      partKey(l.part).localeCompare(partKey(r.part)),
  )[0]!;
  return {
    authorPersonId: chosen.authorPersonId,
    authorMemberKey: chosen.authorMemberKey,
    motive: chosen.motive,
    part: chosen.part,
    predicted: chosen.predicted,
    reasoning: chosen.reasoning,
  };
}

function chooseMotive(
  measure: LegislativeMeasureRecord,
  lean: LegislativeVoteDisposition["disposition"],
  mine: {
    readonly answer: "yes" | "no";
    readonly salience: PoliticalSalience;
  } | null,
  billNow: PredictedCount,
  withPart: PredictedCount,
  amendment: PredictedCount,
): AmendmentMotive | null {
  if (
    measure.subjectClass === "appropriation" &&
    mine &&
    lean === "yea" &&
    amendment.passes &&
    withPart.passes
  )
    return "ride";
  if (lean === "yea" && !billNow.passes && withPart.passes && amendment.passes)
    return "pass";
  if (lean === "nay" && billNow.passes && !withPart.passes && amendment.passes)
    return "sink";
  if (mine?.salience === "central" && !amendment.passes && amendment.nay > 0)
    return "record";
  return null;
}

// stopgapId: "SG-P14-legislatures-amendment-ranking"
