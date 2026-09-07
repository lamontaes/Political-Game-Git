import {
  adoptProvisionRevision,
  bodyForChamber,
  chamberByKey,
  deriveMemberDisposition,
  dispositionsFromCounts,
  floorStageByKey,
  measurePosition,
  nextMeasureStableKey,
  offerFloorAmendment,
  takeFloorVote,
  votePlanKeyForAmendment,
  votePlanKeyForFloor,
  type AuthoredVoteCounts,
  type EntityId,
  type LegislativeMemberDisposition,
  type LegislativeQuestionIdentity,
  type LegislativeVoteDisposition,
  type SeatedMember,
  type World,
} from "../simulation";
import {
  REQUESTED_PROVISION_KEY,
  REQUESTED_SEGMENT_KEY,
  requestedProvisionText,
  type LegislativeBargainingFixture,
} from "./legislative-bargaining-fixture";
import type { LegislativeBargainingProgress } from "./run-b-conversation-progress";

/**
 * The two moves that actually change something.
 *
 * Everything the player says in the members' room is talk. These two functions
 * are where talk either becomes law or does not: an amendment is offered to the
 * chamber and decided by recorded vote, and only if it carries does the
 * negotiated language enter the bill. The people the game has actually modelled
 * decide for themselves; the rest of the chamber votes as the scenario says it
 * does, because a hundred authored minds is a different project.
 */

export type AmendmentVariant = "as-asked" | "capped";

export interface AmendmentResult {
  readonly world: World;
  readonly adopted: boolean;
  /** What the record will say happened, in plain language. */
  readonly message: string;
  /** How each simulated member decided, and why they would say they did. */
  readonly memberAccounts: readonly MemberAccount[];
}

export interface MemberAccount {
  readonly personId: EntityId;
  readonly disposition: LegislativeMemberDisposition;
  readonly account: string;
}

export interface FloorVoteResult {
  readonly world: World;
  readonly passed: boolean;
  readonly message: string;
  readonly memberAccounts: readonly MemberAccount[];
}

/**
 * Offers the negotiated section as a floor amendment and lets the chamber
 * decide it. Adoption is what puts the language in the bill; nothing said in
 * conversation does.
 */
export function offerNegotiatedAmendment(
  world: World,
  fixture: LegislativeBargainingFixture,
  progress: LegislativeBargainingProgress,
  variant: AmendmentVariant,
): AmendmentResult {
  const facts = progress.subjectFacts;
  const scenario = fixture.scenario;
  const position = measurePosition(world, fixture.measureId);
  const chamberKey = position.chamberKey ?? "house";
  const chamber = chamberByKey(scenario.pack, chamberKey);
  const body = bodyForChamber(scenario, chamberKey);
  const amountMinorUnits =
    variant === "capped"
      ? facts.cappedAmountMinorUnits
      : facts.requestedAmountMinorUnits;
  const amountLabel =
    variant === "capped" ? facts.cappedAmountLabel : facts.requestedAmountLabel;
  const stableKey = nextMeasureStableKey(
    world,
    fixture.measureId,
    `amendment:${chamberKey}`,
  );

  const derived = deriveSimulatedMembers(world, fixture, progress, {
    identity: {
      measureId: fixture.measureId,
      purpose: "amendment",
      forumKey: chamberKey,
      floorStageKey: position.floorStageKey,
      amendmentStableKey: stableKey,
      provisionKey: REQUESTED_PROVISION_KEY,
    },
    questionLabel: `Adoption of the ${amountLabel} local match amendment`,
    pendingChange: {
      provisionKey: REQUESTED_PROVISION_KEY,
      beneficiaryLabels: [facts.requestedBeneficiaryLabel],
      addsExposureMinorUnits: amountMinorUnits,
    },
  });

  const next = offerFloorAmendment(derived.world, {
    stableKey,
    measureId: fixture.measureId,
    description: `Add Section 4, a local project match of not more than ${amountLabel} for ${facts.requestedBeneficiaryLabel}.`,
    offeredByPersonId: fixture.playerPersonId,
    offeredByLabel: "Floor sponsor",
    dispositions: blendDispositions(
      body.members,
      countsFor(scenario.votePlan, votePlanKeyForAmendment(chamberKey)),
      derived.byPerson,
    ),
    presentMembers: body.members.length,
    electedMembers: body.members.length,
    provenance: {
      method: "member-decisions",
      note: "The three seated members this world actually models decided for themselves; the remaining seats vote as this scenario records.",
      sourceEntityIds: derived.traceIds,
    },
  });

  const amendment = (next.history.legislativeAmendments ?? []).at(-1);
  if (!amendment || amendment.stableKey !== stableKey) {
    throw new Error("The amendment was not recorded where it was expected.");
  }
  if (amendment.status !== "adopted") {
    return {
      world: next,
      adopted: false,
      message: `The ${chamber.name} rejected the amendment. Section 4 is not in the bill, and nothing anybody said about it changed the text.`,
      memberAccounts: derived.accounts,
    };
  }

  const withText = adoptProvisionRevision(next, {
    stableKey: `${stableKey}:section-4`,
    measureId: fixture.measureId,
    amendmentId: amendment.id,
    supersedesProvisionId: null,
    provisionKey: REQUESTED_PROVISION_KEY,
    sectionNumber: facts.requestedSectionNumber,
    heading: facts.requestedHeading,
    text: requestedProvisionText(amountMinorUnits),
    beneficiary: {
      kind: "particularized",
      particularization: "named-project",
      beneficiaryLabel: facts.requestedBeneficiaryLabel,
      placeLabel: facts.requestedPlaceLabel,
      statedGround: facts.requestedStatedGround,
    },
    applicationScope: {
      jurisdictionId: scopeJurisdiction(world, fixture),
      segmentKey: REQUESTED_SEGMENT_KEY,
    },
    fiscalExposureLabel: `${amountLabel} local match`,
    fiscalExposureMinorUnits: amountMinorUnits,
  });

  return {
    world: withText,
    adopted: true,
    message: `The ${chamber.name} adopted the amendment. Section 4 is now in the bill, and it names ${facts.requestedBeneficiaryLabel} at ${amountLabel}.`,
    memberAccounts: derived.accounts,
  };
}

/** Takes the recorded floor vote at the measure's current stage. */
export function takeNegotiatedFloorVote(
  world: World,
  fixture: LegislativeBargainingFixture,
  progress: LegislativeBargainingProgress,
): FloorVoteResult {
  const scenario = fixture.scenario;
  const position = measurePosition(world, fixture.measureId);
  const chamberKey = position.chamberKey ?? "house";
  const chamber = chamberByKey(scenario.pack, chamberKey);
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
  const body = bodyForChamber(scenario, chamberKey);

  const derived = deriveSimulatedMembers(world, fixture, progress, {
    identity: {
      measureId: fixture.measureId,
      purpose: "floor-stage",
      forumKey: chamberKey,
      floorStageKey: stage.stageKey,
      amendmentStableKey: null,
      // Passing the bill is a question about the whole bill, not about any
      // one section of it.
      provisionKey: null,
    },
    questionLabel: `${stage.label} of ${progress.subjectFacts.designation}`,
  });

  const next = takeFloorVote(derived.world, {
    stableKey: nextMeasureStableKey(
      world,
      fixture.measureId,
      `floor:${chamberKey}:${stage.stageKey}`,
    ),
    measureId: fixture.measureId,
    dispositions: blendDispositions(
      body.members,
      countsFor(
        scenario.votePlan,
        votePlanKeyForFloor(chamberKey, stage.stageKey),
      ),
      derived.byPerson,
    ),
    presentMembers: body.members.length,
    electedMembers: body.members.length,
    provenance: {
      method: "member-decisions",
      note: "The three seated members this world actually models decided for themselves; the remaining seats vote as this scenario records.",
      sourceEntityIds: derived.traceIds,
    },
  });

  const after = measurePosition(next, fixture.measureId);
  return {
    world: next,
    passed: after.phase !== "failed",
    message:
      after.phase === "failed"
        ? `The ${chamber.name} did not give the bill the votes it needed.`
        : `The ${chamber.name} passed the bill at ${stage.label.toLowerCase()}.`,
    memberAccounts: derived.accounts,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface DerivedMembers {
  readonly world: World;
  readonly byPerson: ReadonlyMap<EntityId, LegislativeMemberDisposition>;
  readonly accounts: readonly MemberAccount[];
  readonly traceIds: readonly EntityId[];
}

function deriveSimulatedMembers(
  world: World,
  fixture: LegislativeBargainingFixture,
  progress: LegislativeBargainingProgress,
  question: {
    readonly identity: LegislativeQuestionIdentity;
    readonly questionLabel: string;
    readonly pendingChange?: {
      readonly provisionKey: string;
      readonly beneficiaryLabels: readonly string[];
      readonly addsExposureMinorUnits: number;
    } | null;
  },
): DerivedMembers {
  const facts = progress.subjectFacts;
  let next = world;
  const byPerson = new Map<EntityId, LegislativeMemberDisposition>();
  const accounts: MemberAccount[] = [];
  const traceIds: EntityId[] = [];

  const seated = [
    {
      personId: fixture.advocatePersonId,
      localBeneficiaryLabels: [facts.requestedBeneficiaryLabel],
      fiscalConcernCeilingMinorUnits: null,
    },
    {
      personId: fixture.guardianPersonId,
      localBeneficiaryLabels: [],
      // What this member said in public before the bill was filed.
      fiscalConcernCeilingMinorUnits: 860_000_000,
    },
    {
      personId: fixture.playerPersonId,
      localBeneficiaryLabels: [],
      fiscalConcernCeilingMinorUnits: null,
    },
  ] as const;

  for (const member of seated) {
    if (member.personId === fixture.playerPersonId) {
      // The sponsor votes for their own bill. That is the player's own choice,
      // not a modelled one, and the game does not put the controlled person
      // through an autonomous decision.
      byPerson.set(member.personId, "yea");
      continue;
    }
    const derived = deriveMemberDisposition(next, {
      stableKey: `${facts.measureStableKey}:${question.identity.purpose}:${next.history.nextSequence}:${member.personId}`,
      personId: member.personId,
      question: {
        question: question.identity,
        questionLabel: question.questionLabel,
        pendingChange: question.pendingChange ?? null,
      },
      localBeneficiaryLabels: member.localBeneficiaryLabels,
      fiscalConcernCeilingMinorUnits: member.fiscalConcernCeilingMinorUnits,
    });
    next = derived.world;
    byPerson.set(member.personId, derived.disposition);
    accounts.push({
      personId: member.personId,
      disposition: derived.disposition,
      account: derived.account,
    });
    const trace = next.history.decisionTraces.at(-1);
    if (trace) traceIds.push(trace.id);
  }

  return { world: next, byPerson, accounts, traceIds };
}

/**
 * Puts the modelled members' own decisions into an otherwise authored chamber.
 *
 * The authored plan describes how the whole body votes. Each member the game
 * actually models is taken out of that plan and replaced by what they decided,
 * and the plan is reduced by the same number of seats so the chamber still adds
 * up to its own size.
 */
function blendDispositions(
  members: readonly SeatedMember[],
  counts: AuthoredVoteCounts,
  derived: ReadonlyMap<EntityId, LegislativeMemberDisposition>,
): readonly LegislativeVoteDisposition[] {
  const modelled = members.filter(
    (member) => member.personId !== null && derived.has(member.personId),
  );
  const remaining = members.filter(
    (member) => member.personId === null || !derived.has(member.personId),
  );
  return [
    ...modelled.map((member) => ({
      memberKey: member.memberKey,
      personId: member.personId,
      disposition: derived.get(member.personId!)!,
    })),
    ...dispositionsFromCounts(remaining, reduceCounts(counts, modelled.length)),
  ];
}

function reduceCounts(
  counts: AuthoredVoteCounts,
  by: number,
): AuthoredVoteCounts {
  let left = by;
  const take = (value: number): number => {
    const taken = Math.min(value, left);
    left -= taken;
    return value - taken;
  };
  const yea = take(counts.yea);
  const nay = take(counts.nay ?? 0);
  const presentNotVoting = take(counts.presentNotVoting ?? 0);
  const absent = take(counts.absent ?? 0);
  const excused = take(counts.excused ?? 0);
  if (left > 0) {
    throw new Error(
      "The authored plan has fewer recorded members than the chamber models.",
    );
  }
  return { yea, nay, presentNotVoting, absent, excused };
}

function countsFor(
  votePlan: Readonly<Record<string, AuthoredVoteCounts>>,
  key: string,
): AuthoredVoteCounts {
  const counts = votePlan[key];
  if (!counts) {
    throw new Error(`This scenario has no recorded decisions for '${key}'.`);
  }
  return counts;
}

function scopeJurisdiction(
  world: World,
  fixture: LegislativeBargainingFixture,
): EntityId {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === fixture.measureId,
  );
  if (!measure) throw new Error("The bargaining fixture lost its measure.");
  return measure.jurisdictionId;
}
