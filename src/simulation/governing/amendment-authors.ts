import {
  buildLegislativeVoteRecord,
  measureAmendments,
  offerFloorAmendment,
  requireMeasure,
} from "../legislation";
import {
  adoptProvisionRevisions,
  currentMeasureProvisions,
} from "../legislative-politics";
import type { MemberVoteQuestion } from "../legislative-member-decisions";
import type { SeatedMember } from "../legislation-scenarios";
import type { ChamberRule, FloorStageRule } from "../legislature-rules";
import { latestPrivateBelief } from "../queries";
import type {
  EntityId,
  LegislativeAmendmentMotive,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  PoliticalSalience,
  PropositionAnswerRef,
  World,
} from "../types";
import { measureAnswersAt } from "../vote-bundle";
import {
  decideChamberVote,
  publicPartyOf,
  type ChamberVoteInput,
} from "./chamber-votes";
import { holdsPrinciples, principleView } from "./officeholder-principles";

/**
 * Legislators who offer amendments for their own reasons (Build 25 step 3,
 * design D-5, approved by lamontae on September 28, 2026).
 *
 * Before this, only the player and fixed scenarios offered amendments, so no
 * computer-run legislature produced a poison pill, a sweetener, a messaging
 * amendment or a rider. Here any seated member may offer one, and why they do
 * is one of the four motives Research 6 found in the real cases:
 *
 * 1. "pass": a supporter adds a part that brings wavering colleagues on board,
 *    because the count says the bill fails as it reads and passes with it.
 * 2. "sink": an opponent adds a part the chamber will adopt but that splits
 *    the bill's coalition, because the count says the bill passes as it reads
 *    and fails with it (the Powell amendment, 1956).
 * 3. "record": a member who cares most about a question offers a part
 *    expected to fail, so the other side's no is on the record for later
 *    (messaging amendments; the motion to recommit).
 * 4. "ride": a member attaches what they care about to a bill that has to
 *    pass, because voting down the whole bill costs more than taking the part
 *    (the Hyde Amendment on every appropriation since 1976).
 *
 * Nothing picks a motive by a share of legislators. A member acts only where
 * their own view, their own lean on the bill and their own count of the
 * chamber line up. The count is a prediction made from what the author can
 * know: their own mind, and each colleague's public statements and party.
 * Colleagues' private views are not known to the author, so the prediction
 * can be wrong and an amendment can backfire, as real ones do.
 */

export const AMENDMENT_AUTHORS_VERSION = "amendment-authors/v1";

export type AmendmentMotive = LegislativeAmendmentMotive;

/** A predicted roll call: how many yeas, how many nays, and the result. */
export interface PredictedCount {
  readonly yea: number;
  readonly nay: number;
  readonly passes: boolean;
}

export interface AmendmentPlan {
  readonly authorPersonId: EntityId;
  readonly authorMemberKey: string;
  readonly motive: AmendmentMotive;
  readonly part: PropositionAnswerRef;
  /** The author's own count of the chamber, from what they can know. */
  readonly predicted: {
    readonly billAsItReads: PredictedCount;
    readonly billWithPart: PredictedCount;
    readonly amendment: PredictedCount;
  };
  /** Why, in the words the record keeps. */
  readonly reasoning: string;
}

export interface AmendmentAuthorsInput {
  readonly measureId: EntityId;
  readonly chamber: ChamberRule;
  readonly stage: FloorStageRule;
  readonly members: readonly SeatedMember[];
  /** Stable key of the floor question the amendment would come before. */
  readonly stableKey: string;
  /**
   * Whether an amendment answering this question may be offered to this bill
   * in this chamber. Supplied by the chamber's rules (step 4); absent, every
   * question may be offered.
   */
  readonly admissible?: (
    measure: LegislativeMeasureRecord,
    part: PropositionAnswerRef,
  ) => boolean;
  /** The chamber's members are elected without party labels (Nebraska). */
  readonly nonpartisan?: boolean;
}

/**
 * How many questions a chamber's members are counted on per floor stage.
 * PLACEHOLDER(build-25): a speed limit, set by hand, not a behavior. The
 * questions most members hold strong views on are counted first, so the
 * limit drops the questions fewest members care about.
 */
const CANDIDATE_QUESTIONS_COUNTED = 6;

const SALIENCE_RANK: Readonly<Record<PoliticalSalience, number>> = {
  low: 0,
  moderate: 1,
  high: 2,
  central: 3,
};

/** A member's own settled view on a question, or null. */
function ownView(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): {
  readonly answer: "yes" | "no";
  readonly salience: PoliticalSalience;
} | null {
  const belief = latestPrivateBelief(world, personId, propositionId);
  if (belief?.position === "support" || belief?.position === "oppose")
    return {
      answer: belief.position === "support" ? "yes" : "no",
      salience: belief.salience,
    };
  // No formed view: the member's principles, where they lean on it. A
  // formed view governs over them, as it would in the member's own vote.
  if (belief) return null;
  return principleView(world, personId, propositionId);
}

function strongViews(world: World, personId: EntityId) {
  const found = new Map<
    EntityId,
    { readonly answer: "yes" | "no"; readonly salience: PoliticalSalience }
  >();
  const questions = new Set<EntityId>();
  for (const belief of world.history.privateBeliefs)
    if (belief.personId === personId) questions.add(belief.propositionId);
  if (holdsPrinciples(world, personId))
    for (const propositionId of world.policyCatalog.propositionOrder)
      if (world.policyCatalog.propositions[propositionId]?.principles?.length)
        questions.add(propositionId);
  for (const propositionId of questions) {
    const view = ownView(world, personId, propositionId);
    if (view && SALIENCE_RANK[view.salience] >= SALIENCE_RANK.high)
      found.set(propositionId, view);
  }
  return found;
}

function count(
  world: World,
  input: AmendmentAuthorsInput,
  measure: LegislativeMeasureRecord,
  purpose: "floor-stage" | "amendment",
  dispositions: readonly LegislativeVoteDisposition[],
): PredictedCount {
  const threshold = input.stage.vote;
  if (threshold.kind !== "known") {
    // An unresolved threshold cannot be counted against; a member cannot
    // predict what they cannot measure, and plans nothing on it.
    return { yea: 0, nay: 0, passes: false };
  }
  const record = buildLegislativeVoteRecord(world, {
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
  });
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

function amendmentQuestion(
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

function partKey(part: PropositionAnswerRef): string {
  return `answers:${part.propositionId}:${part.answer}`;
}

/**
 * Whether a seated member would offer an amendment before this floor question,
 * and if so which, and why. Pure: the world is read, not changed. Null when no
 * member's view, lean and count line up.
 */
export function planFloorAmendment(
  world: World,
  input: AmendmentAuthorsInput,
): AmendmentPlan | null {
  const measure = requireMeasure(world, input.measureId);
  const seated = input.members.filter(
    (member): member is SeatedMember & { personId: EntityId } =>
      member.personId !== null &&
      !(
        world.control.kind === "person" &&
        world.control.personId === member.personId
      ),
  );
  if (seated.length === 0) return null;
  const answered = new Set(
    measureAnswersAt(world, measure.id).map((row) => row.propositionId),
  );

  // Every member's strong views on questions the bill does not yet answer.
  const views = new Map(
    seated.map((member) => [
      member.personId,
      strongViews(world, member.personId),
    ]),
  );
  const holders = new Map<
    string,
    { part: PropositionAnswerRef; holders: number; weight: number }
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
  const candidates = [...holders.entries()]
    .sort(
      ([lk, l], [rk, r]) =>
        r.weight - l.weight || r.holders - l.holders || lk.localeCompare(rk),
    )
    .slice(0, CANDIDATE_QUESTIONS_COUNTED)
    .map(([, entry]) => entry.part);
  if (candidates.length === 0) return null;

  // Each member's own lean on the bill as it reads, from their own mind.
  const ownLean = new Map(
    decideChamberVote(world, {
      stableKey: `${input.stableKey}:own-lean`,
      question: billQuestion(input, null, undefined),
      members: seated,
      nonpartisan: input.nonpartisan ?? false,
    }).map((row) => [row.personId, row.disposition]),
  );

  // Each member counts the chamber as they know it: their own vote from their
  // own mind, each colleague's from what that colleague is known to stand for.
  // A colleague's vote on a reading of the bill is the same whoever counts
  // it, so each reading is decided for the whole chamber once; only the
  // member counting and the member it was first decided for are decided
  // again. On an amendment, the reading also carries its author's party and
  // whether the author is the bill's sponsor, which set every colleague's cue.
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
    vote: Omit<ChamberVoteInput, "members" | "only">,
  ): readonly LegislativeVoteDisposition[] => {
    const first = readings.get(reading);
    if (!first || first.by === member.memberKey) {
      const rows = decideChamberVote(world, {
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
      decideChamberVote(world, {
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
  const authorReading = (member: SeatedMember & { personId: EntityId }) =>
    `${
      member.partyKey !== undefined
        ? member.partyKey
        : publicPartyOf(world, member.personId)
    }:${member.personId === measure.sponsorPersonId}`;

  const plans: (AmendmentPlan & { readonly rank: number })[] = [];
  for (const member of seated) {
    const lean = ownLean.get(member.personId);
    const knownTo = member.personId;
    let billNow: PredictedCount | null = null;
    for (const part of candidates) {
      const mine = ownView(world, member.personId, part.propositionId);
      // Nobody offers a part they oppose, whatever it would do to the count.
      if (mine && mine.answer !== part.answer) continue;
      billNow ??= count(
        world,
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
        world,
        input,
        measure,
        "floor-stage",
        countedBy(`with:${partKey(part)}`, member, {
          stableKey: `${input.stableKey}:count-with:${member.memberKey}`,
          question: billQuestion(input, part, knownTo),
        }),
      );
      const amendment = count(
        world,
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
        reasoning: reasoningFor(motive, billNow, withPart, amendment),
        // The member who cares most acts first; a member with no view of
        // their own acts only on the count.
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
  // A bill the legislature must pass carries what a member cares about.
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

function reasoningFor(
  motive: AmendmentMotive,
  billNow: PredictedCount,
  withPart: PredictedCount,
  amendment: PredictedCount,
): string {
  const tally = (count: PredictedCount) => `${count.yea} to ${count.nay}`;
  switch (motive) {
    case "pass":
      return `The author counted the bill failing ${tally(billNow)} as it read and passing ${tally(withPart)} with this part, so offered it to bring colleagues on board.`;
    case "sink":
      return `The author, who opposed the bill, counted it passing ${tally(billNow)} as it read and failing ${tally(withPart)} with this part, which the chamber would adopt ${tally(amendment)}.`;
    case "record":
      return `The author cares most about this question and expected the amendment to fail ${tally(amendment)}, putting those who voted no on the record.`;
    case "ride":
      return `The author attached this part to a bill the legislature has to pass, counting the amendment adopted ${tally(amendment)} and the bill still passing ${tally(withPart)}.`;
  }
}

/**
 * Offers the planned amendment, lets the chamber decide it member by member,
 * and carries an adopted amendment's section into the bill. The world is
 * returned unchanged when no member plans one, or when this floor question
 * already had its amendment.
 */
export function offerPlannedAmendment(
  world: World,
  input: AmendmentAuthorsInput,
): World {
  const stableKey = `${input.stableKey}:${AMENDMENT_AUTHORS_VERSION}`;
  if (
    measureAmendments(world, input.measureId).some(
      (record) => record.stableKey === stableKey,
    )
  )
    return world;
  const plan = planFloorAmendment(world, input);
  if (!plan) return world;
  const proposition = world.policyCatalog.propositions[plan.part.propositionId];
  if (!proposition) return world;
  const author = input.members.find(
    (member) => member.personId === plan.authorPersonId,
  )!;
  const heading = proposition.name;
  const dispositions = decideChamberVote(world, {
    stableKey: `${stableKey}:vote`,
    question: amendmentQuestion(
      input,
      plan.part,
      stableKey,
      plan.authorPersonId,
      undefined,
    ),
    members: input.members,
    nonpartisan: input.nonpartisan ?? false,
    playerPersonId:
      world.control.kind === "person" ? world.control.personId : null,
    playerBallot: null,
  });
  let next = offerFloorAmendment(world, {
    stableKey,
    measureId: input.measureId,
    description:
      plan.part.answer === "yes"
        ? `Adds a section: ${heading}.`
        : `Adds a section barring: ${heading}.`,
    offeredByPersonId: plan.authorPersonId,
    offeredByLabel: author.name,
    dispositions,
    presentMembers: dispositions.filter(
      (row) => row.disposition !== "absent" && row.disposition !== "excused",
    ).length,
    electedMembers: input.members.length,
    provenance: {
      method: "member-decisions",
      note: `Members' recorded decisions on an amendment offered for this reason: ${plan.reasoning}`,
      sourceEntityIds: [plan.authorPersonId],
    },
    proposedSections: [
      {
        provisionKey: partKey(plan.part),
        heading,
        supersedesProvisionId: null,
        answers: plan.part,
      },
    ],
    authorMotive: plan.motive,
  });
  const amendment = measureAmendments(next, input.measureId).find(
    (record) => record.stableKey === stableKey,
  );
  if (amendment?.status !== "adopted") return next;
  const measure = requireMeasure(next, input.measureId);
  const sectionNumber =
    Math.max(
      0,
      ...currentMeasureProvisions(next, measure.id).map(
        (record) => record.sectionNumber,
      ),
    ) + 1;
  next = adoptProvisionRevisions(next, [
    {
      stableKey: `${stableKey}:section`,
      measureId: measure.id,
      amendmentId: amendment.id,
      supersedesProvisionId: null,
      provisionKey: partKey(plan.part),
      sectionNumber,
      heading,
      // PLACEHOLDER(build-25): the operative words name the catalog question
      // the section answers. Written statutory language for a question comes
      // from the drafting bank once it has a clause family for it.
      text:
        plan.part.answer === "yes"
          ? `This section enacts the following: ${proposition.question} Yes.`
          : `This section enacts the following: ${proposition.question} No.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: `everyone within ${world.jurisdictions[measure.jurisdictionId]?.name ?? "the jurisdiction"} the question reaches`,
      },
      applicationScope: {
        jurisdictionId: measure.jurisdictionId,
        segmentKey: null,
      },
      answers: plan.part,
    },
  ]);
  return next;
}
