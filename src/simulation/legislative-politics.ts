import { createStableId } from "./ids";
import {
  measureActions,
  measureAmendments,
  measurePosition,
  requireMeasure,
} from "./legislation";
import { personName } from "./people";
import type {
  ClaimAudience,
  EntityId,
  EventParticipant,
  LegislativeCommitmentCondition,
  LegislativeCommitmentConditionKind,
  LegislativeCommitmentFirmness,
  LegislativeCommitmentRecord,
  LegislativeCommitmentStance,
  LegislativeCommitmentSubject,
  LegislativeExchangeCharacter,
  LegislativeNegotiationDisposition,
  LegislativeNegotiationRecord,
  LegislativeProvisionBeneficiary,
  LegislativeProvisionRecord,
  LegislativeQuestionIdentity,
  LegislativeVoteRecord,
  MetricScope,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * The political layer over the legislative process.
 *
 * The merged legislation core answers where a bill is and whether a question
 * carried. It says nothing about what is *in* the bill, what anyone has
 * promised about it, or what was asked for in return. Those three things are
 * most of legislative politics, and they are what this module records.
 *
 * Three rules hold everything else up:
 *
 * 1. Provisions are append-only. A section's text changes only by recording a
 *    new version that names the one it replaces, and only through an amendment
 *    the chamber actually adopted. Conversation cannot edit a bill.
 * 2. A commitment is a claim about the future, not the future. Whether it was
 *    kept is derived from later canonical events and never written back over
 *    the words that were said.
 * 3. Asking for a project in your district, trading support with a colleague,
 *    and taking money for yourself are recorded as different things, because
 *    they are different things.
 */

// ---------------------------------------------------------------------------
// Provisions
// ---------------------------------------------------------------------------

export interface RecordFiledProvisionInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  readonly applicationScope: MetricScope;
  readonly fiscalExposureLabel?: string | null;
  readonly fiscalExposureMinorUnits?: number | null;
}

export interface AdoptProvisionRevisionInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  /** The adopted amendment that carries this text into the bill. */
  readonly amendmentId: EntityId;
  /** The section being rewritten; null when the amendment adds a new one. */
  readonly supersedesProvisionId: EntityId | null;
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  readonly applicationScope: MetricScope;
  readonly fiscalExposureLabel?: string | null;
  readonly fiscalExposureMinorUnits?: number | null;
}

/** Records a section of a measure as filed, before anyone has amended it. */
export function recordFiledProvision(
  world: World,
  input: RecordFiledProvisionInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertUniqueProvisionKey(world, input.stableKey);
  if (
    measureProvisions(world, measure.id).some(
      (record) => record.provisionKey === input.provisionKey,
    )
  ) {
    throw new Error(
      `The measure already has a section keyed '${input.provisionKey}'; a later version must be adopted as an amendment.`,
    );
  }
  return appendProvision(world, {
    ...input,
    supersedesProvisionId: null,
    originAmendmentId: null,
    eventType: "legislation.provision-filed",
    summary: `${measure.designation} was filed with ${describeProvisionReach({
      beneficiary: input.beneficiary,
    })} in ${headingLabel(input.sectionNumber, input.heading)}.`,
  });
}

/**
 * Rewrites a section, but only on the authority of an amendment the chamber
 * actually adopted. A negotiated draft that never carried changes nothing.
 */
export function adoptProvisionRevision(
  world: World,
  input: AdoptProvisionRevisionInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertUniqueProvisionKey(world, input.stableKey);
  const amendment = measureAmendments(world, measure.id).find(
    (record) => record.id === input.amendmentId,
  );
  if (!amendment) {
    throw new Error(
      `Amendment ${input.amendmentId} does not belong to this measure.`,
    );
  }
  if (amendment.status !== "adopted") {
    throw new Error(
      `A rejected amendment cannot change the bill: ${amendment.stableKey}`,
    );
  }
  if (
    (world.history.legislativeProvisions ?? []).some(
      (record) => record.originAmendmentId === amendment.id,
    )
  ) {
    throw new Error(
      `Amendment ${amendment.stableKey} has already been carried into the bill.`,
    );
  }
  if (input.supersedesProvisionId !== null) {
    const superseded = measureProvisions(world, measure.id).find(
      (record) => record.id === input.supersedesProvisionId,
    );
    if (!superseded) {
      throw new Error(
        "A revision must supersede a section of the same measure.",
      );
    }
    if (superseded.provisionKey !== input.provisionKey) {
      throw new Error(
        "A revision must keep the provision key of the section it replaces.",
      );
    }
    if (
      (world.history.legislativeProvisions ?? []).some(
        (record) => record.supersedesProvisionId === superseded.id,
      )
    ) {
      throw new Error(
        "That section has already been superseded by a later version.",
      );
    }
  }
  return appendProvision(world, {
    ...input,
    originAmendmentId: amendment.id,
    eventType: "legislation.provision-revised",
    summary: `An adopted amendment rewrote ${headingLabel(
      input.sectionNumber,
      input.heading,
    )} of ${measure.designation} to carry ${describeProvisionReach({
      beneficiary: input.beneficiary,
    })}.`,
  });
}

export function measureProvisions(
  world: World,
  measureId: EntityId,
): readonly LegislativeProvisionRecord[] {
  return (world.history.legislativeProvisions ?? [])
    .filter((record) => record.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * The bill as it currently reads: every section whose text no later version has
 * replaced, in printed order.
 */
export function currentMeasureProvisions(
  world: World,
  measureId: EntityId,
): readonly LegislativeProvisionRecord[] {
  const all = measureProvisions(world, measureId);
  const superseded = new Set(
    all.flatMap((record) =>
      record.supersedesProvisionId ? [record.supersedesProvisionId] : [],
    ),
  );
  return all
    .filter((record) => !superseded.has(record.id))
    .slice()
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
}

export function currentProvisionByKey(
  world: World,
  measureId: EntityId,
  provisionKey: string,
): LegislativeProvisionRecord | null {
  return (
    currentMeasureProvisions(world, measureId).find(
      (record) => record.provisionKey === provisionKey,
    ) ?? null
  );
}

export function provisionVersions(
  world: World,
  measureId: EntityId,
  provisionKey: string,
): readonly LegislativeProvisionRecord[] {
  return measureProvisions(world, measureId).filter(
    (record) => record.provisionKey === provisionKey,
  );
}

/** Whether the provision is written for something narrower than everyone. */
export function isParticularizedProvision(provision: {
  readonly beneficiary: LegislativeProvisionBeneficiary;
}): boolean {
  return provision.beneficiary.kind === "particularized";
}

/**
 * Who the provision reaches, in plain language.
 *
 * There is deliberately no judgement in this sentence. A narrowly written
 * provision may be a bad bargain, an obvious local necessity, or both, and the
 * game leaves that to the people arguing about it.
 */
export function describeProvisionReach(provision: {
  readonly beneficiary: LegislativeProvisionBeneficiary;
}): string {
  const beneficiary = provision.beneficiary;
  if (beneficiary.kind === "general-application") {
    return `language reaching ${beneficiary.appliesToLabel}`;
  }
  const place = beneficiary.placeLabel ? ` in ${beneficiary.placeLabel}` : "";
  return `language written for ${beneficiary.beneficiaryLabel}${place}`;
}

// ---------------------------------------------------------------------------
// Which question, exactly
// ---------------------------------------------------------------------------

/**
 * One canonical identity for a legislative question, used everywhere a
 * question has to be recognised as the same question.
 *
 * There are two of those places and they used to disagree. Supersession asked
 * whether a member had said something newer about the same thing, and compared
 * the measure and the section but not the question, so a promise about passage
 * and a promise about the override read as the same promise and one silently
 * replaced the other. The later-vote lookup asked which vote tested a promise,
 * and took the first floor, concurrence or override vote on the measure, so a
 * promise about passage could be graded against the override. Both now compare
 * the same identity, and neither compares it by hand.
 */
export function legislativeQuestionKey(
  question: LegislativeQuestionIdentity,
): string {
  return [
    question.measureId,
    question.purpose,
    question.forumKey ?? "",
    question.floorStageKey ?? "",
    question.amendmentStableKey ?? "",
    question.provisionKey ?? "",
  ].join("|");
}

/** Whether two promises are about exactly the same question. */
export function sameLegislativeQuestion(
  a: LegislativeQuestionIdentity,
  b: LegislativeQuestionIdentity,
): boolean {
  return legislativeQuestionKey(a) === legislativeQuestionKey(b);
}

/**
 * Whether a question the chamber actually put is the question a promise named.
 *
 * The measure, the stage and the object of the question have to be the same
 * thing: a promise about passage is not answered by the override, and a
 * promise about one amendment is not answered by another. Forum and floor
 * stage are refinements — a promise that named one is only answered by that
 * one, and a promise that named neither is answered by the question it was
 * about whichever stage of it came. Leaving them unnamed is not a claim about
 * every chamber; it is a promise that did not distinguish them, which is how
 * people actually talk about a bill they are voting on next.
 */
export function legislativeQuestionAnswers(
  promised: LegislativeQuestionIdentity,
  put: LegislativeQuestionIdentity,
): boolean {
  if (promised.measureId !== put.measureId) return false;
  if (promised.purpose !== put.purpose) return false;
  if (promised.amendmentStableKey !== put.amendmentStableKey) return false;
  if (promised.provisionKey !== put.provisionKey) return false;
  if (promised.forumKey !== null && promised.forumKey !== put.forumKey) {
    return false;
  }
  if (
    promised.floorStageKey !== null &&
    promised.floorStageKey !== put.floorStageKey
  ) {
    return false;
  }
  return true;
}

/** The question a recorded vote actually put, in the same terms. */
export function questionPutByVote(
  world: World,
  vote: LegislativeVoteRecord,
): LegislativeQuestionIdentity {
  const amendment =
    vote.purpose === "amendment"
      ? ((world.history.legislativeAmendments ?? []).find(
          (record) => record.voteId === vote.id,
        ) ?? null)
      : null;
  return {
    measureId: vote.measureId,
    purpose: vote.purpose,
    forumKey: voteForumKey(vote),
    floorStageKey: vote.floorStageKey,
    amendmentStableKey: amendment?.stableKey ?? null,
    provisionKey: amendment
      ? (provisionKeyCarriedBy(world, amendment.id) ?? null)
      : null,
  };
}

function voteForumKey(vote: LegislativeVoteRecord): string {
  const forum = vote.forum;
  switch (forum.kind) {
    case "chamber":
      return forum.chamberKey;
    case "committee":
      return `${forum.chamberKey}:${forum.committeeKey}`;
    case "joint-session":
      return forum.forumName;
  }
}

/** The section an adopted amendment put into the bill, when it put one. */
function provisionKeyCarriedBy(
  world: World,
  amendmentId: EntityId,
): string | null {
  return (
    (world.history.legislativeProvisions ?? []).find(
      (record) => record.originAmendmentId === amendmentId,
    )?.provisionKey ?? null
  );
}

/** Says a question in words, for an account the player reads. */
function questionInWords(question: LegislativeQuestionIdentity): string {
  switch (question.purpose) {
    case "floor-stage":
      return "the bill's passage";
    case "concurrence":
      return "agreeing to the other chamber's changes";
    case "veto-override":
      return "the override";
    case "committee-report":
      return "reporting the bill out of committee";
    case "amendment":
      return "the amendment";
  }
}

// ---------------------------------------------------------------------------
// Commitments
// ---------------------------------------------------------------------------

export interface RecordLegislativeCommitmentInput {
  readonly stableKey: string;
  readonly holderPersonId: EntityId;
  readonly subject: LegislativeCommitmentSubject;
  readonly stance: LegislativeCommitmentStance;
  readonly firmness: LegislativeCommitmentFirmness;
  readonly conditions?: readonly LegislativeCommitmentCondition[];
  readonly audience: ClaimAudience;
  readonly eventId: EntityId;
  readonly claimId?: EntityId | null;
  readonly heardByPersonIds: readonly EntityId[];
  readonly statement: string;
}

export function recordLegislativeCommitment(
  world: World,
  input: RecordLegislativeCommitmentInput,
): World {
  const measure = requireMeasure(world, input.subject.question.measureId);
  if (!world.people[input.holderPersonId]) {
    throw new Error(
      `A legislative commitment needs a canonical holder: ${input.holderPersonId}`,
    );
  }
  if (
    (world.history.legislativeCommitments ?? []).some(
      (record) => record.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Duplicate legislative commitment: ${input.stableKey}`);
  }
  const event = world.history.events.find(
    (record) => record.id === input.eventId,
  );
  if (!event) {
    throw new Error(
      "A legislative commitment must cite the event it was made at.",
    );
  }
  if (input.claimId) {
    const claim = world.history.claims.find(
      (record) => record.id === input.claimId,
    );
    if (!claim || claim.speakerPersonId !== input.holderPersonId) {
      throw new Error("A spoken commitment must cite the holder's own claim.");
    }
  }
  const questionProvisionKey = input.subject.question.provisionKey;
  if (
    questionProvisionKey !== null &&
    provisionVersions(world, measure.id, questionProvisionKey).length === 0 &&
    !input.conditions?.some(
      (condition) =>
        "provisionKey" in condition &&
        condition.provisionKey === questionProvisionKey,
    )
  ) {
    throw new Error(
      `A commitment names a section the measure does not have: ${questionProvisionKey}`,
    );
  }
  for (const personId of input.heardByPersonIds) {
    if (!world.people[personId]) {
      throw new Error(
        `A legislative commitment lists a missing listener: ${personId}`,
      );
    }
  }
  assertConditionsWellFormed(input.conditions ?? []);

  const record: LegislativeCommitmentRecord = {
    id: createStableId(
      "legislative-commitment",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    holderPersonId: input.holderPersonId,
    subject: {
      question: { ...input.subject.question },
      questionLabel: input.subject.questionLabel,
    },
    stance: input.stance,
    firmness: input.firmness,
    conditions: (input.conditions ?? []).map((condition) => ({ ...condition })),
    audience: input.audience,
    statedAt: world.currentDate,
    eventId: input.eventId,
    claimId: input.claimId ?? null,
    heardByPersonIds: [...new Set(input.heardByPersonIds)].sort(),
    statement: input.statement,
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      legislativeCommitments: [
        ...(world.history.legislativeCommitments ?? []),
        record,
      ],
    },
  };
}

export function measureCommitments(
  world: World,
  measureId: EntityId,
): readonly LegislativeCommitmentRecord[] {
  return (world.history.legislativeCommitments ?? [])
    .filter((record) => record.subject.question.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

export function commitmentsHeldBy(
  world: World,
  personId: EntityId,
  measureId?: EntityId,
): readonly LegislativeCommitmentRecord[] {
  return (world.history.legislativeCommitments ?? [])
    .filter(
      (record) =>
        record.holderPersonId === personId &&
        (measureId === undefined ||
          record.subject.question.measureId === measureId),
    )
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

/** Commitments a given person actually heard, rather than all of them. */
export function commitmentsKnownTo(
  world: World,
  listenerPersonId: EntityId,
  measureId?: EntityId,
): readonly LegislativeCommitmentRecord[] {
  return (world.history.legislativeCommitments ?? [])
    .filter(
      (record) =>
        (record.holderPersonId === listenerPersonId ||
          record.heardByPersonIds.includes(listenerPersonId)) &&
        (measureId === undefined ||
          record.subject.question.measureId === measureId),
    )
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

export type LegislativeConditionState = "met" | "unmet" | "undetermined";

export interface LegislativeConditionStanding {
  readonly key: string;
  readonly kind: LegislativeCommitmentCondition["kind"];
  readonly description: string;
  readonly state: LegislativeConditionState;
  /** Why the game says so, in language safe to show the player. */
  readonly basis: string;
}

/**
 * Where a commitment stands now.
 *
 * `open` means the words are still the only fact. Everything past that is
 * derived: it reads later canonical records and reports what they imply, and
 * nothing here edits the commitment itself.
 */
export type LegislativeCommitmentStanding =
  | "open"
  | "conditions-met"
  | "conditions-unmet"
  | "honored"
  | "departed-from"
  | "superseded";

export interface LegislativeCommitmentAssessment {
  readonly commitmentId: EntityId;
  readonly standing: LegislativeCommitmentStanding;
  readonly conditions: readonly LegislativeConditionStanding[];
  /** A sentence the player may read. Never a score, never a probability. */
  readonly account: string;
}

/**
 * Whether a stated commitment actually binds its holder right now, and to what.
 *
 * This is the question that has to be answered before any other, and answering
 * it second was the defect. "I'll support it if you write my section in" says
 * nothing at all until the section is written in: it is not a promise to vote
 * yes, and it is emphatically not a reason to vote no, which is what the
 * evaluator was making of it. Its mirror, "I'm a no unless you write my section
 * in", binds to no while the section is out and is *released* when it goes in —
 * released to nothing, not converted into a promise of support the member never
 * made. Support has to be promised to be owed.
 *
 * So conditions have a polarity that belongs to the stance:
 *
 * - on `oppose-unless` they release an obligation the member already has;
 * - on everything else they activate one the member does not have yet.
 *
 * Undetermined is not met. A promise is owed when the world can show it is,
 * and released when the world can show that too.
 */
export type LegislativeCommitmentObligation =
  | { readonly kind: "owed"; readonly direction: "yea" | "nay" }
  | {
      readonly kind: "not-yet-owed";
      readonly direction: "yea" | "nay";
      readonly outstanding: readonly LegislativeConditionStanding[];
    }
  | {
      readonly kind: "released";
      readonly direction: "yea" | "nay";
    }
  | { readonly kind: "no-direction" };

/** Whether a stance's conditions release an obligation or create one. */
function conditionsRelease(stance: LegislativeCommitmentStance): boolean {
  return stance === "oppose-unless";
}

export function commitmentObligation(
  stance: LegislativeCommitmentStance,
  conditions: readonly LegislativeConditionStanding[],
): LegislativeCommitmentObligation {
  const direction = promisedDirection(stance);
  if (direction === null) return { kind: "no-direction" };
  if (conditions.length === 0) return { kind: "owed", direction };

  const allMet = conditions.every((condition) => condition.state === "met");
  if (conditionsRelease(stance)) {
    return allMet
      ? { kind: "released", direction }
      : { kind: "owed", direction };
  }
  if (allMet) return { kind: "owed", direction };
  return {
    kind: "not-yet-owed",
    direction,
    outstanding: conditions.filter((condition) => condition.state !== "met"),
  };
}

export function assessCommitment(
  world: World,
  commitmentId: EntityId,
): LegislativeCommitmentAssessment {
  const commitment = (world.history.legislativeCommitments ?? []).find(
    (record) => record.id === commitmentId,
  );
  if (!commitment) {
    throw new Error(`No such legislative commitment: ${commitmentId}`);
  }
  const holderName = personName(world.people[commitment.holderPersonId]!);
  const conditions = commitment.conditions.map((condition) =>
    assessCondition(world, commitment, condition),
  );

  // Newer words about exactly the same question replace older ones. Words
  // about a different question do not, which is why this compares the whole
  // question and not the measure it belongs to.
  const superseding = (world.history.legislativeCommitments ?? []).find(
    (record) =>
      record.sequence > commitment.sequence &&
      record.holderPersonId === commitment.holderPersonId &&
      sameLegislativeQuestion(
        record.subject.question,
        commitment.subject.question,
      ),
  );
  if (superseding) {
    return {
      commitmentId,
      standing: "superseded",
      conditions,
      account: `${holderName} has since said something different about the same question.`,
    };
  }

  // Whether anything is owed comes first. A vote cannot honour a promise that
  // was never in force, however neatly it happens to match: a member who votes
  // yes while the thing they asked for is still missing has not kept a promise
  // to vote yes, because there was no such promise to keep yet.
  const obligation = commitmentObligation(commitment.stance, conditions);
  const anyUnmet = conditions.some((state) => state.state === "unmet");

  if (obligation.kind === "no-direction") {
    return {
      commitmentId,
      standing: standingWithoutObligation(conditions, anyUnmet),
      conditions,
      account: `${holderName} did not promise a vote either way, so a recorded vote neither keeps nor breaks it.`,
    };
  }

  if (obligation.kind === "not-yet-owed") {
    const outstanding = obligation.outstanding[0]!;
    return {
      commitmentId,
      standing: anyUnmet ? "conditions-unmet" : "open",
      conditions,
      account: anyUnmet
        ? `What ${holderName} asked for has not happened, so the condition was not met and nothing is owed either way yet: ${outstanding.description}`
        : `${holderName} attached a condition that nothing has settled yet, so nothing is owed either way.`,
    };
  }

  if (obligation.kind === "released") {
    return {
      commitmentId,
      standing: "conditions-met",
      conditions,
      account: `What ${holderName} said they needed has happened, so the objection they stated is answered and they are free either way.`,
    };
  }

  const vote = laterRecordedVoteBy(world, commitment);
  if (vote === null) {
    return {
      commitmentId,
      standing: conditions.length === 0 ? "open" : "conditions-met",
      conditions,
      account:
        conditions.length === 0
          ? `${holderName} said it. Nothing has tested it yet.`
          : `What ${holderName} asked for has happened. The commitment has not yet been tested by a vote.`,
    };
  }
  return vote.disposition === obligation.direction
    ? {
        commitmentId,
        standing: "honored",
        conditions,
        account: `${holderName} voted ${vote.disposition} on ${vote.questionLabel}, which is what was said.`,
      }
    : {
        commitmentId,
        standing: "departed-from",
        conditions,
        account: `${holderName} voted ${vote.disposition} on ${vote.questionLabel} after saying otherwise, and every stated condition had been met.`,
      };
}

/** Where a commitment that promised no vote stands on its own conditions. */
function standingWithoutObligation(
  conditions: readonly LegislativeConditionStanding[],
  anyUnmet: boolean,
): LegislativeCommitmentStanding {
  if (conditions.length === 0) return "open";
  if (anyUnmet) return "conditions-unmet";
  return conditions.every((condition) => condition.state === "met")
    ? "conditions-met"
    : "open";
}

// ---------------------------------------------------------------------------
// Negotiated exchange
// ---------------------------------------------------------------------------

export interface RecordLegislativeNegotiationInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly provisionKey?: string | null;
  readonly initiatorPersonId: EntityId;
  readonly counterpartyPersonId: EntityId;
  readonly character: LegislativeExchangeCharacter;
  readonly request: string;
  readonly disposition: LegislativeNegotiationDisposition;
  readonly audience: ClaimAudience;
  readonly eventId: EntityId;
  readonly decisionTraceId?: EntityId | null;
}

export function recordLegislativeNegotiation(
  world: World,
  input: RecordLegislativeNegotiationInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  if (
    (world.history.legislativeNegotiations ?? []).some(
      (record) => record.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Duplicate legislative negotiation: ${input.stableKey}`);
  }
  for (const personId of [
    input.initiatorPersonId,
    input.counterpartyPersonId,
  ]) {
    if (!world.people[personId]) {
      throw new Error(
        `A legislative negotiation references a missing person: ${personId}`,
      );
    }
  }
  if (input.initiatorPersonId === input.counterpartyPersonId) {
    throw new Error("A negotiation needs two different people.");
  }
  if (!world.history.events.some((record) => record.id === input.eventId)) {
    throw new Error("A legislative negotiation must cite its event.");
  }
  if (
    input.provisionKey &&
    provisionVersions(world, measure.id, input.provisionKey).length === 0
  ) {
    throw new Error(
      `A negotiation names a section the measure does not have: ${input.provisionKey}`,
    );
  }

  const record: LegislativeNegotiationRecord = {
    id: createStableId(
      "legislative-negotiation",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    provisionKey: input.provisionKey ?? null,
    initiatorPersonId: input.initiatorPersonId,
    counterpartyPersonId: input.counterpartyPersonId,
    character: input.character,
    request: input.request,
    disposition: input.disposition,
    audience: input.audience,
    occurredAt: world.currentDate,
    eventId: input.eventId,
    decisionTraceId: input.decisionTraceId ?? null,
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      legislativeNegotiations: [
        ...(world.history.legislativeNegotiations ?? []),
        record,
      ],
    },
  };
}

export function measureNegotiations(
  world: World,
  measureId: EntityId,
): readonly LegislativeNegotiationRecord[] {
  return (world.history.legislativeNegotiations ?? [])
    .filter((record) => record.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Whether an exchange is an offer of personal benefit to the officeholder.
 *
 * Exactly one character means that. Everything else on the list is ordinary
 * legislative politics, and the game does not let the two blur: a district
 * project request is never reported as an inducement, and an inducement is
 * never reported as ordinary bargaining.
 */
export function isPersonalInducement(exchange: {
  readonly character: LegislativeExchangeCharacter;
}): boolean {
  return exchange.character === "personal-inducement";
}

/** How the exchange reads in the record, without editorialising. */
export function describeExchangeCharacter(
  character: LegislativeExchangeCharacter,
): string {
  switch (character) {
    case "policy-bargaining":
      return "a bargain over what the bill says";
    case "targeted-benefit-request":
      return "a request for a provision written for a named beneficiary";
    case "reciprocal-support":
      return "an offer of support in return for support";
    case "coalition-coordination":
      return "coordination with the people counting the votes";
    case "constituent-advocacy":
      return "advocacy on behalf of the people back home";
    case "public-interest-appeal":
      return "an appeal to what the bill would do for everyone";
    case "personal-inducement":
      return "an offer of personal benefit to the officeholder";
  }
}

// ---------------------------------------------------------------------------
// Existence, for integrity and decision subjects
// ---------------------------------------------------------------------------

export function legislativePoliticsHistoryRecords(
  world: World,
): readonly { readonly id: EntityId; readonly sequence: number }[] {
  return [
    ...(world.history.legislativeProvisions ?? []),
    ...(world.history.legislativeCommitments ?? []),
    ...(world.history.legislativeNegotiations ?? []),
  ];
}

export function legislativePoliticsEntityExists(
  world: World,
  id: EntityId,
): boolean {
  return legislativePoliticsHistoryRecords(world).some(
    (record) => record.id === id,
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface AppendProvisionInput extends RecordFiledProvisionInput {
  readonly supersedesProvisionId: EntityId | null;
  readonly originAmendmentId: EntityId | null;
  readonly eventType: `${string}.${string}`;
  readonly summary: string;
}

function appendProvision(world: World, input: AppendProvisionInput): World {
  const measure = requireMeasure(world, input.measureId);
  if (!Number.isSafeInteger(input.sectionNumber) || input.sectionNumber < 1) {
    throw new Error("A provision section number must be a positive integer.");
  }
  if (
    !input.provisionKey.trim() ||
    !input.heading.trim() ||
    !input.text.trim()
  ) {
    throw new Error("A provision needs a key, a heading and operative text.");
  }
  if (input.applicationScope.jurisdictionId !== measure.jurisdictionId) {
    throw new Error(
      "A provision applies within the measure's own jurisdiction.",
    );
  }
  if (!world.jurisdictions[input.applicationScope.jurisdictionId]) {
    throw new Error("A provision references a missing jurisdiction.");
  }
  const exposure = input.fiscalExposureMinorUnits ?? null;
  if (exposure !== null && (!Number.isSafeInteger(exposure) || exposure < 0)) {
    throw new Error("Stated fiscal exposure must be a non-negative integer.");
  }
  if ((exposure === null) !== ((input.fiscalExposureLabel ?? null) === null)) {
    throw new Error(
      "A provision states its fiscal exposure both in words and as an amount, or not at all.",
    );
  }

  const eventStableKey = `event:${input.stableKey}`;
  const participants: readonly EventParticipant[] = measure.sponsorPersonId
    ? [
        {
          personId: measure.sponsorPersonId,
          role: "agency:sponsor",
          detail: "Carries the measure this section belongs to",
        },
      ]
    : [];
  let next = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: input.eventType,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        measure.id,
        measure.jurisdictionId,
        ...participants.map((participant) => participant.personId),
      ]),
    ],
    participants: [...participants],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "legislation",
      "legislation.provision",
      input.beneficiary.kind === "particularized"
        ? "legislation.provision.particularized"
        : "legislation.provision.general-application",
    ],
    summary: input.summary,
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label:
          world.jurisdictions[measure.jurisdictionId]?.name ?? "jurisdiction",
        setting: null,
      },
      socialContext: `${headingLabel(input.sectionNumber, input.heading)} of ${measure.designation}.`,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.find(
    (candidate) => candidate.stableKey === eventStableKey,
  );
  if (!event) {
    throw new Error("Failed to record the provision event.");
  }

  const record: LegislativeProvisionRecord = {
    id: createStableId(
      "legislative-provision",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    measureId: measure.id,
    provisionKey: input.provisionKey,
    sectionNumber: input.sectionNumber,
    heading: input.heading,
    text: input.text,
    beneficiary: { ...input.beneficiary },
    applicationScope: { ...input.applicationScope },
    fiscalExposureLabel: input.fiscalExposureLabel ?? null,
    fiscalExposureMinorUnits: exposure,
    recordedAt: next.currentDate,
    supersedesProvisionId: input.supersedesProvisionId,
    originAmendmentId: input.originAmendmentId,
    eventId: event.id,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      legislativeProvisions: [
        ...(next.history.legislativeProvisions ?? []),
        record,
      ],
    },
  };
  return next;
}

function assertUniqueProvisionKey(world: World, stableKey: string): void {
  if (
    (world.history.legislativeProvisions ?? []).some(
      (record) => record.stableKey === stableKey,
    )
  ) {
    throw new Error(`Duplicate legislative provision: ${stableKey}`);
  }
}

/**
 * Every condition the canonical world can actually decide.
 *
 * The list is exhaustive by construction — the compiler requires an entry per
 * condition kind — and it exists so the promise the contract makes is one the
 * world can keep. A condition offered but never decidable is a promise that
 * reads as checkable and silently is not, which is how `provision-removed`
 * survived: it was a public condition with an assessor branch and no canonical
 * transition anywhere that could make it true for a section the bill carries.
 * A kind that is not in this list does not get recorded.
 */
const DECIDABLE_CONDITION_KINDS: Readonly<
  Record<LegislativeCommitmentConditionKind, true>
> = {
  "provision-adopted": true,
  "scope-narrowed": true,
  "fiscal-ceiling": true,
  "analysis-delivered": true,
  "reciprocal-support": true,
  procedural: true,
};

export const LEGISLATIVE_COMMITMENT_CONDITION_KINDS: readonly LegislativeCommitmentConditionKind[] =
  Object.keys(DECIDABLE_CONDITION_KINDS)
    .slice()
    .sort() as readonly LegislativeCommitmentConditionKind[];

/** Whether the world can say yes or no to a condition of this kind. */
export function isDecidableConditionKind(kind: string): boolean {
  return Object.prototype.hasOwnProperty.call(DECIDABLE_CONDITION_KINDS, kind);
}

function assertConditionsWellFormed(
  conditions: readonly LegislativeCommitmentCondition[],
): void {
  const keys = new Set<string>();
  for (const condition of conditions) {
    if (!condition.key.trim() || !condition.description.trim()) {
      throw new Error("A commitment condition needs a key and a description.");
    }
    if (!isDecidableConditionKind(condition.kind)) {
      throw new Error(
        `Nothing in the world can decide a commitment condition of kind '${condition.kind}'.`,
      );
    }
    if (keys.has(condition.key)) {
      throw new Error(`Duplicate commitment condition: ${condition.key}`);
    }
    keys.add(condition.key);
    if (
      condition.kind === "fiscal-ceiling" &&
      (!Number.isSafeInteger(condition.ceilingMinorUnits) ||
        condition.ceilingMinorUnits < 0)
    ) {
      throw new Error("A fiscal ceiling must be a non-negative integer.");
    }
  }
}

function headingLabel(sectionNumber: number, heading: string): string {
  return `Section ${sectionNumber}, ${heading}`;
}

function assessCondition(
  world: World,
  commitment: LegislativeCommitmentRecord,
  condition: LegislativeCommitmentCondition,
): LegislativeConditionStanding {
  const measureId = commitment.subject.question.measureId;
  const base = {
    key: condition.key,
    kind: condition.kind,
    description: condition.description,
  } as const;

  switch (condition.kind) {
    case "provision-adopted": {
      const current = currentProvisionByKey(
        world,
        measureId,
        condition.provisionKey,
      );
      return {
        ...base,
        state: current && current.originAmendmentId !== null ? "met" : "unmet",
        basis:
          current && current.originAmendmentId !== null
            ? "The chamber adopted an amendment carrying that language into the bill."
            : "No adopted amendment has put that language into the bill.",
      };
    }
    case "scope-narrowed": {
      const versions = provisionVersions(
        world,
        measureId,
        condition.provisionKey,
      );
      const current = versions.at(-1) ?? null;
      const first = versions[0] ?? null;
      if (!current || !first) {
        return {
          ...base,
          state: "undetermined",
          basis: "The bill has no such section to compare.",
        };
      }
      const narrowed =
        current.id !== first.id &&
        current.applicationScope.segmentKey !== null &&
        first.applicationScope.segmentKey === null;
      return {
        ...base,
        state: narrowed ? "met" : "unmet",
        basis: narrowed
          ? "The current version applies to a narrower group than the version as filed."
          : "The section still reaches the same group it did as filed.",
      };
    }
    case "fiscal-ceiling": {
      const current = currentProvisionByKey(
        world,
        measureId,
        condition.provisionKey,
      );
      if (!current) {
        return {
          ...base,
          state: "unmet",
          basis: "The bill does not carry the section the ceiling was set on.",
        };
      }
      const exposure = current.fiscalExposureMinorUnits;
      if (exposure === null) {
        return {
          ...base,
          state: "undetermined",
          basis:
            "That section states no amount, so the ceiling cannot be tested.",
        };
      }
      return {
        ...base,
        state: exposure <= condition.ceilingMinorUnits ? "met" : "unmet",
        basis:
          exposure <= condition.ceilingMinorUnits
            ? "The section now commits no more than the amount that was asked for."
            : "The section still commits more than the amount that was asked for.",
      };
    }
    case "analysis-delivered": {
      const event = world.history.events.find(
        (record) => record.stableKey === condition.analysisEventStableKey,
      );
      if (!event) {
        return {
          ...base,
          state: "unmet",
          basis: "The analysis has not been produced.",
        };
      }
      const known = world.history.knowledge.some(
        (record) =>
          record.eventId === event.id &&
          record.personId === commitment.holderPersonId,
      );
      return {
        ...base,
        state: known ? "met" : "unmet",
        basis: known
          ? "The analysis exists and the person who asked for it has seen it."
          : "The analysis exists, but the person who asked for it has not seen it.",
      };
    }
    case "reciprocal-support": {
      const reciprocal = (world.history.legislativeCommitments ?? []).find(
        (record) =>
          record.sequence > commitment.sequence &&
          record.holderPersonId !== commitment.holderPersonId &&
          record.heardByPersonIds.includes(commitment.holderPersonId) &&
          measureStableKey(world, record.subject.question.measureId) ===
            condition.reciprocalMeasureStableKey,
      );
      return {
        ...base,
        state: reciprocal ? "met" : "unmet",
        basis: reciprocal
          ? "The other side has since said the same thing about the measure it asked about."
          : "Nothing has been said back about the other measure.",
      };
    }
    case "procedural": {
      const taken = measureActions(world, measureId).some(
        (action) => action.kind === condition.requiredBeforeAction,
      );
      return {
        ...base,
        state: taken ? "unmet" : "met",
        basis: taken
          ? "The step the commitment was good before has already been taken."
          : "That step has not been taken yet.",
      };
    }
  }
}

function measureStableKey(world: World, measureId: EntityId): string | null {
  return (
    (world.history.legislativeMeasures ?? []).find(
      (record) => record.id === measureId,
    )?.stableKey ?? null
  );
}

function promisedDirection(
  stance: LegislativeCommitmentStance,
): "yea" | "nay" | null {
  switch (stance) {
    case "support":
    case "support-if":
    case "cosponsor-if-amended":
    case "withdraw-objection":
    case "reciprocal-support":
      return "yea";
    case "oppose":
    case "oppose-unless":
      return "nay";
    case "offer-amendment":
    case "seek-delay":
    case "keep-options-open":
      return null;
  }
}

interface LaterVote {
  readonly disposition: string;
  readonly questionLabel: string;
}

/**
 * The first recorded vote on the commitment's own question that the holder
 * took part in after saying what they said.
 *
 * "Own question" is the whole point. This used to take the first later floor,
 * concurrence or override vote on the measure, which meant a promise about
 * passage could be graded against the override and a promise about one
 * amendment against another. It now asks the same canonical identity
 * supersession asks, so a promise is only ever tested by the question it was
 * actually about.
 */
function laterRecordedVoteBy(
  world: World,
  commitment: LegislativeCommitmentRecord,
): LaterVote | null {
  const votes = (world.history.legislativeVotes ?? [])
    .filter(
      (vote) =>
        vote.sequence > commitment.sequence &&
        legislativeQuestionAnswers(
          commitment.subject.question,
          questionPutByVote(world, vote),
        ),
    )
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
  for (const vote of votes) {
    const disposition = vote.dispositions.find(
      (record) => record.personId === commitment.holderPersonId,
    );
    if (
      disposition &&
      (disposition.disposition === "yea" || disposition.disposition === "nay")
    ) {
      return {
        disposition: disposition.disposition,
        questionLabel: questionInWords(commitment.subject.question),
      };
    }
  }
  return null;
}

/** Re-exported for callers that need the measure's phase alongside its text. */
export function measurePhaseFor(world: World, measureId: EntityId) {
  return measurePosition(world, measureId).phase;
}
