import { makeIsoDate } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { createStableId } from "./ids";
import {
  chamberByKey,
  committeeByKey,
  floorStageByKey,
  nextChamberKey,
  nextFloorStageKey,
  originChamber,
  requireKnown,
  resolveRequiredVotes,
  type ChamberRule,
  type LegislativeRulePack,
  type VoteDenominator,
  type VoteThresholdRule,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import { personName } from "./people";
import type {
  CommitteeActionRecord,
  CommitteeReferralRecord,
  CommitteeReportKind,
  EntityId,
  EventParticipant,
  ExecutiveActionKind,
  ExecutiveDispositionRecord,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeActionKind,
  LegislativeActionRecord,
  LegislativeAmendmentRecord,
  LegislativeEnactmentRecord,
  LegislativeMeasureOrigin,
  LegislativeMeasureRecord,
  LegislativeSubjectClass,
  LegislativeTerminalOutcome,
  LegislativeVoteDisposition,
  LegislativeVoteForum,
  LegislativeVotePurpose,
  LegislativeVoteProvenance,
  LegislativeVoteRecord,
  LegislativeVoteTally,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * Canonical legislative process.
 *
 * A measure's position is never stored as a bucket: it is derived by replaying
 * the measure's append-only action record against its rule pack. Every
 * consequential transition writes an ordinary historical event plus one action,
 * so the institutional story survives save, reload and replay.
 *
 * Votes here are records of named members with an explicit denominator,
 * threshold and rounding rule. They deliberately share nothing with the
 * election substrate's vote shares and floating tallies: a legislative question
 * either reaches its required number of votes or it does not.
 */

export const COMMITTEE_HEARING_TRANSITION_KEY =
  "legislation:committee-hearing" as const;

// ---------------------------------------------------------------------------
// Derived position
// ---------------------------------------------------------------------------

export type MeasurePhase =
  | "drafting"
  | "awaiting-referral"
  | "in-committee"
  | "awaiting-floor"
  | "on-floor"
  | "awaiting-transmittal"
  | "awaiting-concurrence"
  | "awaiting-enrollment"
  | "awaiting-presentation"
  | "awaiting-executive"
  | "awaiting-override"
  | "awaiting-enactment"
  | "enacted"
  | "failed";

export interface MeasurePosition {
  readonly phase: MeasurePhase;
  readonly chamberKey: string | null;
  readonly committeeKey: string | null;
  readonly floorStageKey: string | null;
  readonly terminal: boolean;
  readonly outcome: LegislativeTerminalOutcome | null;
}

const TERMINAL_PHASES: ReadonlySet<MeasurePhase> = new Set([
  "enacted",
  "failed",
]);

export function measureActions(
  world: World,
  measureId: EntityId,
): readonly LegislativeActionRecord[] {
  return (world.history.legislativeActions ?? [])
    .filter((action) => action.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Replays a measure's actions against its rule pack to determine exactly where
 * it now sits. Pure derivation; no stored status is consulted.
 */
export function measurePosition(
  world: World,
  measureId: EntityId,
): MeasurePosition {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  const actions = measureActions(world, measureId);

  let phase: MeasurePhase = "drafting";
  let chamberKey: string | null = measure.originChamberKey;
  let committeeKey: string | null = null;
  let floorStageKey: string | null = null;
  let outcome: LegislativeTerminalOutcome | null = null;

  for (const action of actions) {
    switch (action.kind) {
      case "introduced":
        phase = "awaiting-referral";
        chamberKey = action.chamberKey ?? chamberKey;
        break;
      case "referred":
        phase = "in-committee";
        committeeKey = action.committeeKey;
        break;
      case "committee-hearing-held":
        phase = "in-committee";
        break;
      case "committee-reported":
        phase = "awaiting-floor";
        committeeKey = null;
        break;
      case "committee-rejected":
        phase = "failed";
        outcome = "failed-in-committee";
        break;
      case "placed-on-calendar": {
        phase = "on-floor";
        const chamber = chamberByKey(
          pack,
          chamberKey ?? measure.originChamberKey,
        );
        floorStageKey = chamber.floorStages[0]?.stageKey ?? null;
        break;
      }
      case "amendment-adopted":
      case "amendment-rejected":
        break;
      case "floor-stage-passed": {
        const chamber = chamberByKey(
          pack,
          chamberKey ?? measure.originChamberKey,
        );
        const next = action.floorStageKey
          ? nextFloorStageKey(chamber, action.floorStageKey)
          : null;
        if (next) {
          floorStageKey = next;
          phase = "on-floor";
        } else {
          floorStageKey = null;
          const onward = nextChamberKey(pack, chamber.chamberKey);
          phase = onward ? "awaiting-transmittal" : "awaiting-enrollment";
        }
        break;
      }
      case "floor-stage-failed":
        phase = "failed";
        outcome = "failed-on-floor";
        break;
      case "transmitted":
        chamberKey = action.chamberKey;
        committeeKey = null;
        floorStageKey = null;
        phase = "awaiting-referral";
        break;
      case "concurred":
        phase = "awaiting-enrollment";
        break;
      case "concurrence-failed":
        phase = "failed";
        outcome = "failed-concurrence";
        break;
      case "enrolled":
        phase = "awaiting-presentation";
        floorStageKey = null;
        break;
      case "presented-to-executive":
        phase = "awaiting-executive";
        chamberKey = null;
        break;
      case "signed":
        phase = "awaiting-enactment";
        break;
      case "vetoed":
        phase = "awaiting-override";
        break;
      case "override-chamber-recorded":
        // One chamber has voted; the veto stays live until every chamber has.
        break;
      case "override-succeeded":
        phase = "awaiting-enactment";
        break;
      case "override-failed":
        phase = "failed";
        outcome = "vetoed-and-sustained";
        break;
      case "enacted":
        phase = "enacted";
        outcome = "enacted";
        break;
      case "died-on-adjournment":
        phase = "failed";
        outcome = "died-on-adjournment";
        break;
    }
    if (TERMINAL_PHASES.has(phase)) break;
  }

  return {
    phase,
    chamberKey,
    committeeKey,
    floorStageKey,
    terminal: TERMINAL_PHASES.has(phase),
    outcome,
  };
}

/** The institution or actor that controls the measure's next gate. */
export interface MeasureGate {
  readonly actorLabel: string;
  readonly description: string;
  readonly thresholdLabel: string | null;
}

export function measureGate(world: World, measureId: EntityId): MeasureGate {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  const position = measurePosition(world, measureId);
  const chamber = position.chamberKey
    ? chamberByKey(pack, position.chamberKey)
    : null;

  switch (position.phase) {
    case "drafting":
      return {
        actorLabel: "Sponsor",
        description: "The measure has not been filed yet.",
        thresholdLabel: null,
      };
    case "awaiting-referral":
      return {
        actorLabel: chamber?.referral.authorityLabel ?? "Referral authority",
        description: `${chamber?.referral.authorityLabel ?? "The referral authority"} decides which committee takes the measure.`,
        thresholdLabel: null,
      };
    case "in-committee": {
      const committee =
        chamber && position.committeeKey
          ? committeeByKey(chamber, position.committeeKey)
          : null;
      return {
        actorLabel: committee?.name ?? "Committee",
        description: `The committee decides whether to report the measure to the floor.`,
        thresholdLabel: committee?.reportThreshold.label ?? null,
      };
    }
    case "awaiting-floor":
      return {
        actorLabel: `${chamber?.name ?? "Chamber"} leadership`,
        description: "The measure needs to be placed on the floor calendar.",
        thresholdLabel: null,
      };
    case "on-floor": {
      const stage =
        chamber && position.floorStageKey
          ? floorStageByKey(chamber, position.floorStageKey)
          : null;
      const threshold =
        stage && stage.vote.kind === "known" ? stage.vote.value.label : null;
      return {
        actorLabel: chamber?.name ?? "Chamber",
        description: `The measure is at ${stage?.label ?? "a floor stage"}.`,
        thresholdLabel: threshold,
      };
    }
    case "awaiting-transmittal": {
      const onward = nextChamberKey(pack, position.chamberKey ?? "");
      const onwardChamber = onward ? chamberByKey(pack, onward) : null;
      return {
        actorLabel: chamber?.name ?? "Chamber",
        description: `The measure passed and now goes to the ${onwardChamber?.name ?? "second chamber"}.`,
        thresholdLabel: null,
      };
    }
    case "awaiting-concurrence":
      return {
        actorLabel: chamber?.name ?? "Originating chamber",
        description:
          "The originating chamber decides whether to accept the other chamber's changes.",
        thresholdLabel:
          pack.interChamber.kind === "second-chamber"
            ? pack.interChamber.concurrenceThreshold.label
            : null,
      };
    case "awaiting-enrollment":
      return {
        actorLabel: "Enrolling clerk",
        description: "The measure is being prepared in its final form.",
        thresholdLabel: null,
      };
    case "awaiting-enactment":
      return {
        actorLabel: pack.displayName,
        description:
          "The measure has cleared every step and is being recorded as law.",
        thresholdLabel: null,
      };
    case "awaiting-presentation":
      return {
        actorLabel: "Enrolling clerk",
        description: `The measure goes to the ${pack.executive.titleLabel}.`,
        thresholdLabel: null,
      };
    case "awaiting-executive":
      return {
        actorLabel: pack.executive.titleLabel,
        description: `The ${pack.executive.titleLabel} decides whether to sign or veto.`,
        thresholdLabel: null,
      };
    case "awaiting-override": {
      const override = pack.executive.override;
      if (override.kind === "joint-session") {
        const threshold =
          measure.subjectClass === "general-policy"
            ? override.threshold
            : override.appropriationsThreshold.kind === "known"
              ? override.appropriationsThreshold.value
              : override.threshold;
        return {
          actorLabel: override.forumName,
          description: `Both houses sit together to reconsider the veto.`,
          thresholdLabel: threshold.label,
        };
      }
      return {
        actorLabel: "Each chamber",
        description: "Each chamber votes separately on overriding the veto.",
        thresholdLabel: override.threshold.label,
      };
    }
    case "enacted":
      return {
        actorLabel: "None",
        description: "The measure is law.",
        thresholdLabel: null,
      };
    case "failed":
      return {
        actorLabel: "None",
        description: "The measure is finished.",
        thresholdLabel: null,
      };
  }
}

/** Procedural steps the rules permit next, independent of who takes them. */
export function availableMeasureSteps(
  world: World,
  measureId: EntityId,
): readonly LegislativeActionKind[] {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  const position = measurePosition(world, measureId);
  switch (position.phase) {
    case "drafting":
      return ["introduced"];
    case "awaiting-referral":
      return ["referred"];
    case "in-committee":
      return [
        "committee-hearing-held",
        "committee-reported",
        "committee-rejected",
      ];
    case "awaiting-floor":
      return ["placed-on-calendar"];
    case "on-floor": {
      const chamber = chamberByKey(pack, position.chamberKey ?? "");
      const stage = position.floorStageKey
        ? floorStageByKey(chamber, position.floorStageKey)
        : null;
      const steps: LegislativeActionKind[] = [
        "floor-stage-passed",
        "floor-stage-failed",
      ];
      if (stage?.amendable) {
        steps.unshift("amendment-adopted", "amendment-rejected");
      }
      return steps;
    }
    case "awaiting-transmittal":
      return ["transmitted"];
    case "awaiting-concurrence":
      return ["concurred", "concurrence-failed"];
    case "awaiting-enrollment":
      return ["enrolled"];
    case "awaiting-presentation":
      return ["presented-to-executive"];
    case "awaiting-executive":
      return ["signed", "vetoed"];
    case "awaiting-override":
      return ["override-succeeded", "override-failed"];
    case "awaiting-enactment":
      return ["enacted"];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export function tallyDispositions(
  dispositions: readonly LegislativeVoteDisposition[],
): LegislativeVoteTally {
  const tally = {
    yea: 0,
    nay: 0,
    presentNotVoting: 0,
    absent: 0,
    excused: 0,
  };
  for (const entry of dispositions) {
    switch (entry.disposition) {
      case "yea":
        tally.yea += 1;
        break;
      case "nay":
        tally.nay += 1;
        break;
      case "present-not-voting":
        tally.presentNotVoting += 1;
        break;
      case "absent":
        tally.absent += 1;
        break;
      case "excused":
        tally.excused += 1;
        break;
    }
  }
  return tally;
}

function denominatorValueFor(
  denominator: VoteDenominator,
  context: {
    readonly eligibleMembers: number;
    readonly presentMembers: number | null;
    readonly tally: LegislativeVoteTally;
    readonly committeeMembers: number | null;
    readonly jointSeats: number | null;
    readonly label: string;
  },
): number {
  switch (denominator) {
    case "members-elected":
      return context.eligibleMembers;
    case "members-present":
      if (context.presentMembers === null) {
        throw new Error(
          `${context.label} counts against members present, but this vote does not record presence.`,
        );
      }
      return context.presentMembers;
    case "members-voting":
      return context.tally.yea + context.tally.nay;
    case "committee-members-appointed":
      if (context.committeeMembers === null) {
        throw new Error(
          `${context.label} counts against committee membership outside a committee.`,
        );
      }
      return context.committeeMembers;
    case "joint-total-membership":
      if (context.jointSeats === null) {
        throw new Error(
          `${context.label} counts against a joint sitting outside one.`,
        );
      }
      return context.jointSeats;
  }
}

export interface RecordVoteInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly forum: LegislativeVoteForum;
  readonly purpose: LegislativeVotePurpose;
  readonly floorStageKey?: string | null;
  readonly threshold: VoteThresholdRule;
  readonly eligibleMembers: number;
  /** Omit or pass null when the record does not represent presence. */
  readonly presentMembers?: number | null;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly committeeMembers?: number | null;
  readonly jointSeats?: number | null;
  readonly takenAt?: IsoDate;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Builds a legislative vote record and decides it structurally. The caller
 * supplies member dispositions; this function never invents them.
 */
function buildVote(
  world: World,
  input: RecordVoteInput,
): LegislativeVoteRecord {
  if (input.dispositions.length === 0) {
    throw new Error("A legislative vote must record member dispositions.");
  }
  const seen = new Set<string>();
  for (const entry of input.dispositions) {
    if (entry.memberKey.trim().length === 0) {
      throw new Error("Every vote disposition needs a member key.");
    }
    if (seen.has(entry.memberKey)) {
      throw new Error(`Member voted twice on one question: ${entry.memberKey}`);
    }
    seen.add(entry.memberKey);
    if (entry.personId && !world.people[entry.personId]) {
      throw new Error(
        `Vote disposition references a missing person: ${entry.personId}`,
      );
    }
  }
  if (
    !Number.isSafeInteger(input.eligibleMembers) ||
    input.eligibleMembers <= 0
  ) {
    throw new Error("A legislative vote needs a positive eligible membership.");
  }
  if (input.dispositions.length > input.eligibleMembers) {
    throw new Error(
      "A legislative vote recorded more members than are eligible to vote.",
    );
  }

  const tally = tallyDispositions(input.dispositions);
  const presentMembers = input.presentMembers ?? null;
  if (presentMembers !== null) {
    const actuallyPresent = tally.yea + tally.nay + tally.presentNotVoting;
    if (presentMembers < actuallyPresent) {
      throw new Error(
        "Recorded presence is smaller than the number of members who acted.",
      );
    }
    if (presentMembers > input.eligibleMembers) {
      throw new Error("More members were present than are eligible to vote.");
    }
  }

  const resolution = resolveRequiredVotes(
    input.threshold,
    denominatorValueFor(input.threshold.countedAgainst, {
      eligibleMembers: input.eligibleMembers,
      presentMembers,
      tally,
      committeeMembers: input.committeeMembers ?? null,
      jointSeats: input.jointSeats ?? null,
      label: `Threshold '${input.threshold.label}'`,
    }),
  );

  return {
    id: createStableId(
      "legislative-vote",
      `${input.measureId}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: input.measureId,
    forum: input.forum,
    purpose: input.purpose,
    floorStageKey: input.floorStageKey ?? null,
    takenAt: input.takenAt ?? world.currentDate,
    eligibleMembers: input.eligibleMembers,
    presentMembers,
    dispositions: input.dispositions.map((entry) => ({ ...entry })),
    tally,
    thresholdLabel: input.threshold.label,
    denominatorKind: input.threshold.countedAgainst,
    denominatorValue: resolution.denominatorValue,
    requiredVotes: resolution.requiredVotes,
    outcome: tally.yea >= resolution.requiredVotes ? "passed" : "failed",
    provenance: {
      method: input.provenance.method,
      note: input.provenance.note,
      sourceEntityIds: [...input.provenance.sourceEntityIds],
    },
  };
}

// ---------------------------------------------------------------------------
// Internal append helpers
// ---------------------------------------------------------------------------

interface AppendActionInput {
  readonly measure: LegislativeMeasureRecord;
  readonly kind: LegislativeActionKind;
  readonly stableKey: string;
  readonly chamberKey: string | null;
  readonly committeeKey: string | null;
  readonly floorStageKey: string | null;
  readonly actorLabel: string;
  readonly rationale: string;
  readonly summary: string;
  readonly eventType: string;
  readonly tags: readonly string[];
  readonly participants?: readonly EventParticipant[];
  readonly involvedEntityIds?: readonly EntityId[];
  readonly vote?: LegislativeVoteRecord | null;
  readonly amendment?: LegislativeAmendmentRecord | null;
  readonly occurredAt?: IsoDate;
}

function appendAction(world: World, input: AppendActionInput): World {
  const measure = input.measure;
  const jurisdiction = world.jurisdictions[measure.jurisdictionId];
  const occurredAt = input.occurredAt ?? world.currentDate;
  const eventStableKey = `event:${input.stableKey}`;

  let next = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: input.eventType as `${string}.${string}`,
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        measure.id,
        measure.jurisdictionId,
        ...(input.involvedEntityIds ?? []),
        ...(input.participants ?? []).map(
          (participant) => participant.personId,
        ),
      ]),
    ],
    participants: input.participants ?? [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", ...input.tags],
    summary: input.summary,
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: jurisdiction?.name ?? "jurisdiction",
        setting: null,
      },
      socialContext: input.rationale,
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
    throw new Error("Failed to record the legislative event.");
  }

  let voteRecord: LegislativeVoteRecord | null = null;
  if (input.vote) {
    voteRecord = { ...input.vote, sequence: next.history.nextSequence };
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        legislativeVotes: [
          ...(next.history.legislativeVotes ?? []),
          voteRecord,
        ],
      },
    };
  }

  let amendmentRecord: LegislativeAmendmentRecord | null = null;
  if (input.amendment) {
    amendmentRecord = {
      ...input.amendment,
      sequence: next.history.nextSequence,
      voteId: voteRecord?.id ?? input.amendment.voteId,
    };
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        legislativeAmendments: [
          ...(next.history.legislativeAmendments ?? []),
          amendmentRecord,
        ],
      },
    };
  }

  const action: LegislativeActionRecord = {
    id: createStableId(
      "legislative-action",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    measureId: measure.id,
    kind: input.kind,
    occurredAt,
    chamberKey: input.chamberKey,
    committeeKey: input.committeeKey,
    floorStageKey: input.floorStageKey,
    actorLabel: input.actorLabel,
    rationale: input.rationale,
    eventId: event.id,
    voteId: voteRecord?.id ?? null,
    amendmentId: amendmentRecord?.id ?? null,
  };

  return {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      legislativeActions: [...(next.history.legislativeActions ?? []), action],
    },
  };
}

function assertPhase(
  world: World,
  measureId: EntityId,
  allowed: readonly MeasurePhase[],
  attempted: string,
): MeasurePosition {
  const position = measurePosition(world, measureId);
  if (!allowed.includes(position.phase)) {
    throw new Error(
      `Cannot ${attempted}: the measure is currently ${position.phase}.`,
    );
  }
  return position;
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[] | undefined,
  stableKey: string,
  label: string,
): void {
  if (stableKey.trim().length === 0) {
    throw new Error(`${label} stable key must not be empty.`);
  }
  if ((records ?? []).some((record) => record.stableKey === stableKey)) {
    throw new Error(`${label} stable key already exists: ${stableKey}`);
  }
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

export interface IntroduceMeasureInput {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  readonly origin: LegislativeMeasureOrigin;
  readonly subjectClass: LegislativeSubjectClass;
  readonly originChamberKey?: string;
  readonly sponsorPersonId?: EntityId | null;
  readonly sourceDocumentKey?: string | null;
  readonly policyAlternativeIds?: readonly EntityId[];
}

/** Files a measure and gives it institutional identity. */
export function introduceMeasure(
  world: World,
  input: IntroduceMeasureInput,
): World {
  assertUniqueStableKey(
    world.history.legislativeMeasures,
    input.stableKey,
    "Legislative measure",
  );
  if (!world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      `Measure references a missing jurisdiction: ${input.jurisdictionId}`,
    );
  }
  const pack = rulePackById(input.rulePackId);
  const chamberKey = input.originChamberKey ?? originChamber(pack).chamberKey;
  const chamber = chamberByKey(pack, chamberKey);
  if (!chamber.introductionAllowed) {
    throw new Error(`Measures cannot be introduced in the ${chamber.name}.`);
  }
  if (input.designation.trim().length === 0) {
    throw new Error("A measure needs an institutional designation.");
  }
  if (input.sponsorPersonId && !world.people[input.sponsorPersonId]) {
    throw new Error(
      `Measure references a missing sponsor: ${input.sponsorPersonId}`,
    );
  }
  for (const alternativeId of input.policyAlternativeIds ?? []) {
    const exists = world.history.policyAlternatives.some(
      (record) => record.id === alternativeId,
    );
    if (!exists) {
      throw new Error(
        `Measure references a missing policy alternative: ${alternativeId}`,
      );
    }
  }

  const measure: LegislativeMeasureRecord = {
    id: createStableId(
      "legislative-measure",
      `${world.id}:${input.jurisdictionId}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    jurisdictionId: input.jurisdictionId,
    rulePackId: pack.packId,
    designation: input.designation,
    shortTitle: input.shortTitle,
    summary: input.summary,
    origin: input.origin,
    subjectClass: input.subjectClass,
    originChamberKey: chamberKey,
    sponsorPersonId: input.sponsorPersonId ?? null,
    introducedAt: world.currentDate,
    sourceDocumentKey: input.sourceDocumentKey ?? null,
    policyAlternativeIds: [...(input.policyAlternativeIds ?? [])],
  };

  const withMeasure: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
    },
  };

  const sponsor = measure.sponsorPersonId
    ? withMeasure.people[measure.sponsorPersonId]
    : null;

  return appendAction(withMeasure, {
    measure,
    kind: "introduced",
    stableKey: `${input.stableKey}:introduced`,
    chamberKey,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: sponsor ? personName(sponsor) : chamber.name,
    rationale: `Filed in the ${chamber.name}.`,
    summary: `${measure.designation} — ${measure.shortTitle} — was filed in the ${chamber.name}.`,
    eventType: "legislation.measure-introduced",
    tags: ["legislation.introduced", `chamber:${chamberKey}`],
    participants: measure.sponsorPersonId
      ? [
          {
            personId: measure.sponsorPersonId,
            role: "agency:sponsor" as EventParticipant["role"],
            detail: `Sponsor of ${measure.designation}`,
          },
        ]
      : [],
  });
}

export interface ReferMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly committeeKey: string;
}

export function referMeasure(world: World, input: ReferMeasureInput): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-referral"],
    "refer the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const committee = committeeByKey(chamber, input.committeeKey);
  assertUniqueStableKey(
    world.history.committeeReferrals,
    input.stableKey,
    "Committee referral",
  );

  const priorReferrals = (world.history.committeeReferrals ?? []).filter(
    (record) => record.measureId === measure.id,
  );

  const referral: CommitteeReferralRecord = {
    id: createStableId(
      "legislative-referral",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    chamberKey: chamber.chamberKey,
    committeeKey: committee.committeeKey,
    referredAt: world.currentDate,
    referredByLabel: chamber.referral.authorityLabel,
    order: priorReferrals.length + 1,
  };

  const withReferral: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      committeeReferrals: [
        ...(world.history.committeeReferrals ?? []),
        referral,
      ],
    },
  };

  return appendAction(withReferral, {
    measure,
    kind: "referred",
    stableKey: `${input.stableKey}:referred`,
    chamberKey: chamber.chamberKey,
    committeeKey: committee.committeeKey,
    floorStageKey: null,
    actorLabel: chamber.referral.authorityLabel,
    rationale: `${chamber.referral.authorityLabel} sent the measure to ${committee.name}.`,
    summary: `${measure.designation} was referred to the ${committee.name}.`,
    eventType: "legislation.measure-referred",
    tags: ["legislation.referred", `committee:${committee.committeeKey}`],
    involvedEntityIds: [referral.id],
  });
}

export interface ScheduleCommitteeHearingInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly hearingDate: string;
}

/**
 * Schedules a committee hearing through the world's existing future-due
 * substrate. Legislative activity never runs on a second clock.
 */
export function scheduleCommitteeHearing(
  world: World,
  input: ScheduleCommitteeHearingInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(world, input.measureId, ["in-committee"], "schedule a hearing");
  const hearingDate = makeIsoDate(input.hearingDate);
  if (hearingDate <= world.currentDate) {
    throw new Error("A committee hearing must be scheduled for a future date.");
  }
  return scheduleFutureDueItem(world, {
    stableKey: input.stableKey,
    dueAt: hearingDate,
    transitionKey: COMMITTEE_HEARING_TRANSITION_KEY,
    entityIds: [measure.id],
    jurisdictionId: measure.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [measure.id] },
  });
}

export function committeeHearingTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== COMMITTEE_HEARING_TRANSITION_KEY) {
    throw new Error("Committee hearing handler received another transition.");
  }
  const measureId = dueItem.entityIds[0];
  if (!measureId) {
    throw new Error("Committee hearing due item lacks a measure reference.");
  }
  const measure = requireMeasure(world, measureId);
  const position = measurePosition(world, measureId);
  if (position.phase !== "in-committee") {
    return {
      world,
      status: "cancelled",
      reasonKey: "legislation:hearing-obsolete",
      context: "The measure left committee before the hearing date.",
      outcomeEventId: null,
    };
  }
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const committee = position.committeeKey
    ? committeeByKey(chamber, position.committeeKey)
    : null;

  const next = appendAction(world, {
    measure,
    kind: "committee-hearing-held",
    stableKey: `${dueItem.stableKey}:hearing`,
    chamberKey: chamber.chamberKey,
    committeeKey: position.committeeKey,
    floorStageKey: null,
    actorLabel: committee?.name ?? "Committee",
    rationale: "The committee took public testimony on the measure.",
    summary: `${measure.designation} received a public hearing in the ${committee?.name ?? "committee"}.`,
    eventType: "legislation.committee-hearing",
    tags: ["legislation.hearing"],
    occurredAt: dueItem.dueAt,
  });

  const event = next.history.events.find(
    (candidate) => candidate.stableKey === `event:${dueItem.stableKey}:hearing`,
  );

  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Committee hearing held for ${measure.designation}.`,
    outcomeEventId: event?.id ?? null,
  };
}

export interface CommitteeDispositionInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly report: CommitteeReportKind;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  readonly rationale: string;
  readonly provenance: LegislativeVoteProvenance;
}

/** Records a committee's recorded vote and its report. */
export function recordCommitteeDisposition(
  world: World,
  input: CommitteeDispositionInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["in-committee"],
    "report the measure out of committee",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const committee = committeeByKey(chamber, position.committeeKey ?? "");
  assertUniqueStableKey(
    world.history.committeeActions,
    input.stableKey,
    "Committee action",
  );

  const referral = (world.history.committeeReferrals ?? [])
    .filter(
      (record) =>
        record.measureId === measure.id &&
        record.committeeKey === committee.committeeKey,
    )
    .slice()
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (!referral) {
    throw new Error("The measure has no referral to this committee.");
  }

  const hearingHeld = measureActions(world, measure.id).some(
    (action) => action.kind === "committee-hearing-held",
  );
  const mustBeHeard = chamber.referral.everyMeasureMustBeHeard;
  if (mustBeHeard.kind === "known" && mustBeHeard.value && !hearingHeld) {
    throw new Error(
      `${chamber.name} rules guarantee every referred measure a public hearing; hold the hearing before reporting.`,
    );
  }

  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: {
      kind: "committee",
      chamberKey: chamber.chamberKey,
      committeeKey: committee.committeeKey,
    },
    purpose: "committee-report",
    threshold: committee.reportThreshold,
    eligibleMembers: committee.appointedMembers,
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    committeeMembers: committee.appointedMembers,
    provenance: input.provenance,
  });

  const reported = vote.outcome === "passed";
  if (reported && input.report === "unfavorable") {
    // An unfavorable report still reaches the floor in some chambers, but the
    // vote must match the report the caller claims.
    throw new Error(
      "A committee vote that carried cannot be recorded as an unfavorable report.",
    );
  }

  const withVoteWorld = appendAction(world, {
    measure,
    kind: reported ? "committee-reported" : "committee-rejected",
    stableKey: `${input.stableKey}:${reported ? "reported" : "rejected"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: committee.committeeKey,
    floorStageKey: null,
    actorLabel: committee.name,
    rationale: input.rationale,
    summary: reported
      ? `The ${committee.name} reported ${measure.designation} to the floor (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${committee.name} did not report ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}); it needed ${vote.requiredVotes}.`,
    eventType: reported
      ? "legislation.committee-reported"
      : "legislation.committee-rejected",
    tags: [
      reported ? "legislation.reported" : "legislation.failed",
      `committee:${committee.committeeKey}`,
    ],
    involvedEntityIds: [referral.id],
    vote,
  });

  const storedVote = (withVoteWorld.history.legislativeVotes ?? []).find(
    (record) => record.stableKey === vote.stableKey,
  );
  if (!storedVote) {
    throw new Error("Failed to store the committee vote.");
  }

  const committeeAction: CommitteeActionRecord = {
    id: createStableId(
      "legislative-committee-action",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: withVoteWorld.history.nextSequence,
    measureId: measure.id,
    referralId: referral.id,
    actedAt: withVoteWorld.currentDate,
    report: reported ? input.report : "unfavorable",
    hearingHeld,
    voteId: storedVote.id,
  };

  return {
    ...withVoteWorld,
    history: {
      ...withVoteWorld.history,
      nextSequence: withVoteWorld.history.nextSequence + 1,
      committeeActions: [
        ...(withVoteWorld.history.committeeActions ?? []),
        committeeAction,
      ],
    },
  };
}

export interface PlaceOnCalendarInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly rationale?: string;
}

export function placeMeasureOnCalendar(
  world: World,
  input: PlaceOnCalendarInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-floor"],
    "place the measure on the calendar",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const firstStage = chamber.floorStages[0];
  if (!firstStage) {
    throw new Error(`The ${chamber.name} declares no floor stage.`);
  }
  return appendAction(world, {
    measure,
    kind: "placed-on-calendar",
    stableKey: input.stableKey,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: firstStage.stageKey,
    actorLabel: `${chamber.name} leadership`,
    rationale:
      input.rationale ?? `Scheduled for ${firstStage.label} on the floor.`,
    summary: `${measure.designation} was placed on the ${chamber.name} calendar for ${firstStage.label}.`,
    eventType: "legislation.placed-on-calendar",
    tags: ["legislation.calendar", `chamber:${chamber.chamberKey}`],
  });
}

export interface OfferAmendmentInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly description: string;
  readonly offeredByPersonId?: EntityId | null;
  readonly offeredByLabel: string;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  readonly provenance: LegislativeVoteProvenance;
}

/** Offers a floor amendment and decides it by recorded vote. */
export function offerFloorAmendment(
  world: World,
  input: OfferAmendmentInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["on-floor"],
    "amend the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
  if (!stage.amendable) {
    throw new Error(`${stage.label} does not accept amendments.`);
  }
  const allowed = chamber.amendments.floorAmendmentsAllowed;
  if (allowed.kind === "known" && !allowed.value) {
    throw new Error(`The ${chamber.name} does not permit floor amendments.`);
  }
  assertUniqueStableKey(
    world.history.legislativeAmendments,
    input.stableKey,
    "Amendment",
  );

  const threshold = requireKnown(stage.vote, `${stage.label} vote threshold`);
  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: { kind: "chamber", chamberKey: chamber.chamberKey },
    purpose: "amendment",
    floorStageKey: stage.stageKey,
    threshold,
    eligibleMembers: chamber.seats,
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    provenance: input.provenance,
  });

  const adopted = vote.outcome === "passed";
  const amendment: LegislativeAmendmentRecord = {
    id: createStableId(
      "legislative-amendment",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: 0,
    measureId: measure.id,
    chamberKey: chamber.chamberKey,
    floorStageKey: stage.stageKey,
    offeredAt: world.currentDate,
    offeredByPersonId: input.offeredByPersonId ?? null,
    offeredByLabel: input.offeredByLabel,
    description: input.description,
    status: adopted ? "adopted" : "rejected",
    voteId: vote.id,
  };

  return appendAction(world, {
    measure,
    kind: adopted ? "amendment-adopted" : "amendment-rejected",
    stableKey: `${input.stableKey}:${adopted ? "adopted" : "rejected"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: stage.stageKey,
    actorLabel: input.offeredByLabel,
    rationale: input.description,
    summary: adopted
      ? `The ${chamber.name} adopted an amendment to ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${chamber.name} rejected an amendment to ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`,
    eventType: adopted
      ? "legislation.amendment-adopted"
      : "legislation.amendment-rejected",
    tags: ["legislation.amendment", `chamber:${chamber.chamberKey}`],
    vote,
    amendment,
  });
}

export interface FloorVoteInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  readonly rationale?: string;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Takes the recorded vote at the measure's current floor stage. Where a
 * constitution requires several separate floor stages, each one is its own
 * recorded vote and the measure advances one stage at a time.
 */
export function takeFloorVote(world: World, input: FloorVoteInput): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["on-floor"],
    "take a floor vote",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
  const threshold = requireKnown(stage.vote, `${stage.label} vote threshold`);

  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: { kind: "chamber", chamberKey: chamber.chamberKey },
    purpose: "floor-stage",
    floorStageKey: stage.stageKey,
    threshold,
    eligibleMembers: chamber.seats,
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    provenance: input.provenance,
  });

  const passed = vote.outcome === "passed";
  const onward = nextFloorStageKey(chamber, stage.stageKey);
  const summary = passed
    ? onward
      ? `${measure.designation} advanced past ${stage.label} in the ${chamber.name} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${chamber.name} passed ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`
    : `${measure.designation} failed at ${stage.label} in the ${chamber.name} (${vote.tally.yea}-${vote.tally.nay}); it needed ${vote.requiredVotes}.`;

  return appendAction(world, {
    measure,
    kind: passed ? "floor-stage-passed" : "floor-stage-failed",
    stableKey: `${input.stableKey}:${passed ? "passed" : "failed"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: stage.stageKey,
    actorLabel: chamber.name,
    rationale:
      input.rationale ??
      `${stage.label} required ${vote.requiredVotes} of ${vote.denominatorValue} (${threshold.label}).`,
    summary,
    eventType: passed
      ? "legislation.floor-stage-passed"
      : "legislation.floor-stage-failed",
    tags: [
      passed ? "legislation.passed-stage" : "legislation.failed",
      `chamber:${chamber.chamberKey}`,
      `stage:${stage.stageKey}`,
    ],
    vote,
  });
}

export interface TransmitMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
}

/** Sends a measure that cleared one chamber to the next one. */
export function transmitMeasure(
  world: World,
  input: TransmitMeasureInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-transmittal"],
    "transmit the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  if (pack.interChamber.kind !== "second-chamber") {
    throw new Error(
      `${pack.displayName} has one chamber, so there is nowhere to transmit a measure.`,
    );
  }
  const fromKey = position.chamberKey ?? measure.originChamberKey;
  const onward = nextChamberKey(pack, fromKey);
  if (!onward) {
    throw new Error("The measure has already cleared every chamber.");
  }
  const target = chamberByKey(pack, onward);
  return appendAction(world, {
    measure,
    kind: "transmitted",
    stableKey: input.stableKey,
    chamberKey: target.chamberKey,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: chamberByKey(pack, fromKey).name,
    rationale: `Sent to the ${target.name} for its own consideration.`,
    summary: `${measure.designation} was transmitted to the ${target.name}.`,
    eventType: "legislation.measure-transmitted",
    tags: ["legislation.transmitted", `chamber:${target.chamberKey}`],
  });
}

export interface EnrollMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
}

export function enrollMeasure(world: World, input: EnrollMeasureInput): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-enrollment"],
    "enroll the measure",
  );
  return appendAction(world, {
    measure,
    kind: "enrolled",
    stableKey: input.stableKey,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: "Enrolling clerk",
    rationale: "The measure was prepared in its final form.",
    summary: `${measure.designation} was enrolled.`,
    eventType: "legislation.measure-enrolled",
    tags: ["legislation.enrolled"],
  });
}

export interface PresentMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
}

export function presentMeasureToExecutive(
  world: World,
  input: PresentMeasureInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-presentation"],
    "present the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  const required = pack.executive.presentmentRequired;
  if (required.kind === "known" && !required.value) {
    throw new Error(
      `${pack.displayName} does not present measures to the ${pack.executive.titleLabel}.`,
    );
  }
  return appendAction(world, {
    measure,
    kind: "presented-to-executive",
    stableKey: input.stableKey,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: "Enrolling clerk",
    rationale: `Delivered to the ${pack.executive.titleLabel}.`,
    summary: `${measure.designation} was presented to the ${pack.executive.titleLabel}.`,
    eventType: "legislation.measure-presented",
    tags: ["legislation.presented"],
  });
}

export interface ExecutiveActionInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly action: Extract<ExecutiveActionKind, "signed" | "vetoed">;
  readonly rationale: string;
  readonly actedAt?: IsoDate;
}

export function recordExecutiveAction(
  world: World,
  input: ExecutiveActionInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-executive"],
    "record executive action",
  );
  assertUniqueStableKey(
    world.history.executiveDispositions,
    input.stableKey,
    "Executive disposition",
  );
  const pack = rulePackById(measure.rulePackId);
  const signed = input.action === "signed";

  const disposition: ExecutiveDispositionRecord = {
    id: createStableId(
      "executive-disposition",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    actedAt: input.actedAt ?? world.currentDate,
    action: input.action,
    actorLabel: pack.executive.titleLabel,
    rationale: input.rationale,
    actionDeadline: null,
  };

  const withDisposition: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      executiveDispositions: [
        ...(world.history.executiveDispositions ?? []),
        disposition,
      ],
    },
  };

  return appendAction(withDisposition, {
    measure,
    kind: signed ? "signed" : "vetoed",
    stableKey: `${input.stableKey}:${signed ? "signed" : "vetoed"}`,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: pack.executive.titleLabel,
    rationale: input.rationale,
    summary: signed
      ? `The ${pack.executive.titleLabel} signed ${measure.designation}.`
      : `The ${pack.executive.titleLabel} vetoed ${measure.designation}.`,
    eventType: signed
      ? "legislation.measure-signed"
      : "legislation.measure-vetoed",
    tags: [signed ? "legislation.signed" : "legislation.vetoed"],
    involvedEntityIds: [disposition.id],
  });
}

export interface OverrideAttemptInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  /**
   * Dispositions per forum. For per-chamber override this is keyed by chamber;
   * for a joint sitting there is exactly one entry keyed by the forum name.
   */
  readonly forums: readonly {
    readonly forumKey: string;
    readonly dispositions: readonly LegislativeVoteDisposition[];
    readonly presentMembers?: number | null;
  }[];
  readonly rationale: string;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Reconsiders a vetoed measure. Where the override happens is a structural
 * rule: some legislatures vote separately in each chamber, and others sit
 * jointly as a single larger body with a single threshold.
 */
export function attemptVetoOverride(
  world: World,
  input: OverrideAttemptInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-override"],
    "attempt an override",
  );
  const pack = rulePackById(measure.rulePackId);
  const override = pack.executive.override;

  let next = world;
  let allSucceeded = true;
  const summaries: string[] = [];

  if (override.kind === "joint-session") {
    if (input.forums.length !== 1) {
      throw new Error(
        `${override.forumName} reconsiders a veto as one body; supply exactly one forum.`,
      );
    }
    const entry = input.forums[0]!;
    const threshold =
      measure.subjectClass === "general-policy"
        ? override.threshold
        : requireKnown(
            override.appropriationsThreshold,
            "appropriations override threshold",
          );
    const vote = buildVote(next, {
      stableKey: `${input.stableKey}:${entry.forumKey}:vote`,
      measureId: measure.id,
      forum: { kind: "joint-session", forumName: override.forumName },
      purpose: "veto-override",
      threshold,
      eligibleMembers: override.combinedSeats,
      presentMembers: entry.presentMembers ?? null,
      dispositions: entry.dispositions,
      jointSeats: override.combinedSeats,
      provenance: input.provenance,
    });
    allSucceeded = vote.outcome === "passed";
    summaries.push(
      `${override.forumName}: ${vote.tally.yea}-${vote.tally.nay} (needed ${vote.requiredVotes} of ${vote.denominatorValue})`,
    );
    next = appendAction(next, {
      measure,
      kind: allSucceeded ? "override-succeeded" : "override-failed",
      stableKey: `${input.stableKey}:${allSucceeded ? "override-succeeded" : "override-failed"}`,
      chamberKey: null,
      committeeKey: null,
      floorStageKey: null,
      actorLabel: override.forumName,
      rationale: input.rationale,
      summary: allSucceeded
        ? `${override.forumName} overrode the veto of ${measure.designation}. ${summaries.join("; ")}.`
        : `${override.forumName} failed to override the veto of ${measure.designation}. ${summaries.join("; ")}.`,
      eventType: allSucceeded
        ? "legislation.override-succeeded"
        : "legislation.override-failed",
      tags: [allSucceeded ? "legislation.override" : "legislation.failed"],
      vote,
    });
    return next;
  }

  const expected = pack.chamberOrder;
  const provided = input.forums.map((entry) => entry.forumKey);
  for (const chamberKey of expected) {
    if (!provided.includes(chamberKey)) {
      throw new Error(
        `Each chamber must vote on the override; missing '${chamberKey}'.`,
      );
    }
  }

  const votes: LegislativeVoteRecord[] = [];
  for (const chamberKey of expected) {
    const entry = input.forums.find((item) => item.forumKey === chamberKey)!;
    const chamber = chamberByKey(pack, chamberKey);
    const vote = buildVote(next, {
      stableKey: `${input.stableKey}:${chamberKey}:vote`,
      measureId: measure.id,
      forum: { kind: "chamber", chamberKey },
      purpose: "veto-override",
      threshold: override.threshold,
      eligibleMembers: chamber.seats,
      presentMembers: entry.presentMembers ?? null,
      dispositions: entry.dispositions,
      provenance: input.provenance,
    });
    votes.push(vote);
    if (vote.outcome !== "passed") allSucceeded = false;
    summaries.push(
      `${chamber.name}: ${vote.tally.yea}-${vote.tally.nay} (needed ${vote.requiredVotes} of ${vote.denominatorValue})`,
    );
  }

  votes.forEach((vote, index) => {
    const chamberKey = expected[index]!;
    const chamber = chamberByKey(pack, chamberKey);
    next = appendAction(next, {
      measure,
      kind: "override-chamber-recorded",
      stableKey: `${input.stableKey}:${chamberKey}:result`,
      chamberKey,
      committeeKey: null,
      floorStageKey: null,
      actorLabel: chamber.name,
      rationale: input.rationale,
      summary: `${chamber.name} voted ${vote.tally.yea}-${vote.tally.nay} on overriding the veto of ${measure.designation}; ${vote.requiredVotes} of ${vote.denominatorValue} were required.`,
      eventType:
        vote.outcome === "passed"
          ? "legislation.override-chamber-passed"
          : "legislation.override-chamber-failed",
      tags: ["legislation.override", `chamber:${chamberKey}`],
      vote,
    });
  });

  const failedChamber = expected.find(
    (chamberKey, index) => votes[index]!.outcome !== "passed",
  );
  next = appendAction(next, {
    measure,
    kind: allSucceeded ? "override-succeeded" : "override-failed",
    stableKey: `${input.stableKey}:${allSucceeded ? "override-succeeded" : "override-failed"}`,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: pack.displayName,
    rationale: allSucceeded
      ? "Every chamber reached the threshold required to override."
      : `The ${chamberByKey(pack, failedChamber ?? expected[0]!).name} did not reach the threshold required to override.`,
    summary: allSucceeded
      ? `The veto of ${measure.designation} was overridden. ${summaries.join("; ")}.`
      : `The veto of ${measure.designation} stood. ${summaries.join("; ")}.`,
    eventType: allSucceeded
      ? "legislation.override-succeeded"
      : "legislation.override-failed",
    tags: [allSucceeded ? "legislation.override" : "legislation.failed"],
  });

  return next;
}

export interface RecordEnactmentInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly actDesignation?: string | null;
  readonly effectiveAt?: string | null;
}

/** Closes out a measure that became law. */
export function recordEnactment(
  world: World,
  input: RecordEnactmentInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const actions = measureActions(world, measure.id);
  const becameLaw = actions.some(
    (action) =>
      action.kind === "signed" || action.kind === "override-succeeded",
  );
  if (!becameLaw) {
    throw new Error(
      "A measure can only be enacted after it is signed or a veto is overridden.",
    );
  }
  assertUniqueStableKey(
    world.history.legislativeEnactments,
    input.stableKey,
    "Enactment",
  );
  const pack = rulePackById(measure.rulePackId);
  const effectiveRule = pack.enactment.defaultEffectiveRule;
  if (input.effectiveAt === undefined && effectiveRule.kind !== "known") {
    // The rule pack does not resolve when acts take effect; the enactment is
    // recorded without inventing an effective date.
  }

  const next = appendAction(world, {
    measure,
    kind: "enacted",
    stableKey: `${input.stableKey}:enacted`,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: pack.displayName,
    rationale: "The measure completed every required step and became law.",
    summary: `${measure.designation} — ${measure.shortTitle} — became law.`,
    eventType: "legislation.measure-enacted",
    tags: ["legislation.enacted"],
  });

  const event = next.history.events.find(
    (candidate) => candidate.stableKey === `event:${input.stableKey}:enacted`,
  );
  if (!event) {
    throw new Error("Failed to record the enactment event.");
  }

  const enactment: LegislativeEnactmentRecord = {
    id: createStableId(
      "legislative-enactment",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    measureId: measure.id,
    resolvedAt: next.currentDate,
    outcome: "enacted",
    actDesignation: input.actDesignation ?? null,
    effectiveAt: input.effectiveAt ? makeIsoDate(input.effectiveAt) : null,
    outcomeEventId: event.id,
  };

  return {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      legislativeEnactments: [
        ...(next.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

export interface RecordAdjournmentDeathInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly rationale?: string;
}

/** Ends a measure that ran out of session. */
export function recordAdjournmentDeath(
  world: World,
  input: RecordAdjournmentDeathInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = measurePosition(world, measure.id);
  if (position.terminal) {
    throw new Error("The measure is already finished.");
  }
  const pack = rulePackById(measure.rulePackId);
  const dies = pack.session.measuresDieAtAdjournment;
  if (dies.kind === "known" && !dies.value) {
    throw new Error(
      `${pack.displayName} measures do not die at adjournment under its rules.`,
    );
  }
  if (dies.kind === "unknown") {
    throw new Error(
      `Whether ${pack.displayName} measures die at adjournment is unresolved, so this cannot be recorded.`,
    );
  }
  return appendAction(world, {
    measure,
    kind: "died-on-adjournment",
    stableKey: input.stableKey,
    chamberKey: position.chamberKey,
    committeeKey: position.committeeKey,
    floorStageKey: position.floorStageKey,
    actorLabel: pack.displayName,
    rationale:
      input.rationale ?? "The session ended before the measure completed.",
    summary: `${measure.designation} died when the session adjourned.`,
    eventType: "legislation.measure-died",
    tags: ["legislation.failed"],
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function measureById(
  world: World,
  measureId: EntityId,
): LegislativeMeasureRecord | null {
  return (
    (world.history.legislativeMeasures ?? []).find(
      (record) => record.id === measureId,
    ) ?? null
  );
}

export function requireMeasure(
  world: World,
  measureId: EntityId,
): LegislativeMeasureRecord {
  const measure = measureById(world, measureId);
  if (!measure) {
    throw new Error(`Legislative measure not found: ${measureId}`);
  }
  return measure;
}

export function measuresForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): readonly LegislativeMeasureRecord[] {
  return (world.history.legislativeMeasures ?? []).filter(
    (record) => record.jurisdictionId === jurisdictionId,
  );
}

export function measureVotes(
  world: World,
  measureId: EntityId,
): readonly LegislativeVoteRecord[] {
  return (world.history.legislativeVotes ?? [])
    .filter((record) => record.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

export function measureAmendments(
  world: World,
  measureId: EntityId,
): readonly LegislativeAmendmentRecord[] {
  return (world.history.legislativeAmendments ?? []).filter(
    (record) => record.measureId === measureId,
  );
}

export function measureEnactment(
  world: World,
  measureId: EntityId,
): LegislativeEnactmentRecord | null {
  return (
    (world.history.legislativeEnactments ?? []).find(
      (record) => record.measureId === measureId,
    ) ?? null
  );
}

export function rulePackForMeasure(
  world: World,
  measureId: EntityId,
): LegislativeRulePack {
  return rulePackById(requireMeasure(world, measureId).rulePackId);
}

export function chamberForPosition(
  pack: LegislativeRulePack,
  position: MeasurePosition,
): ChamberRule | null {
  return position.chamberKey ? chamberByKey(pack, position.chamberKey) : null;
}

/** Every legislative history record, for world-level identity checks. */
export function legislationHistoryRecords(
  world: World,
): readonly { readonly id: EntityId; readonly sequence: number }[] {
  return [
    ...(world.history.legislativeMeasures ?? []),
    ...(world.history.legislativeActions ?? []),
    ...(world.history.committeeReferrals ?? []),
    ...(world.history.committeeActions ?? []),
    ...(world.history.legislativeAmendments ?? []),
    ...(world.history.legislativeVotes ?? []),
    ...(world.history.executiveDispositions ?? []),
    ...(world.history.legislativeEnactments ?? []),
  ];
}

export function legislationEntityExists(world: World, id: EntityId): boolean {
  return legislationHistoryRecords(world).some((record) => record.id === id);
}

export function legislationEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = legislationHistoryRecords(world).find(
    (candidate) => candidate.id === id,
  );
  if (!record || record.sequence >= sequenceExclusive) return false;
  const dated = record as unknown as {
    readonly introducedAt?: IsoDate;
    readonly occurredAt?: IsoDate;
    readonly referredAt?: IsoDate;
    readonly actedAt?: IsoDate;
    readonly offeredAt?: IsoDate;
    readonly takenAt?: IsoDate;
    readonly resolvedAt?: IsoDate;
  };
  const date =
    dated.introducedAt ??
    dated.occurredAt ??
    dated.referredAt ??
    dated.actedAt ??
    dated.offeredAt ??
    dated.takenAt ??
    dated.resolvedAt;
  return date === undefined ? false : date <= asOfDate;
}
