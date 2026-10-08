import type { SeatedBody, SeatedMember } from "../legislation-scenarios";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import { personName } from "../people";
import type {
  DecisionConsideration,
  DecisionImportance,
  DecisionOption,
  DecisionConstraint,
  EntityId,
  IsoDate,
  World,
} from "../types";
import {
  committeeSeatAssignments,
  memberCommitteeRequests,
  recordMemberCommitteeRequest,
  recordCommitteeSeatAssignment,
  type CommitteeSeatAssignment,
} from "./committee-assignment-records";
import { relationshipConsiderations } from "./standing-considerations";

/** Committee membership reads durable, seat-by-seat appointment decisions. */
export const COMMITTEE_ASSIGNMENT_PROFILE =
  "governing-committee-assignment/v3-seat-decision-records";

export interface AssignableCommittee {
  readonly committeeKey: string;
  readonly appointedMembers: number;
  readonly name?: string;
}

export type CommitteePartyRatioRule = "proportional" | "majority-controls";

export interface CommitteeDistrictFit {
  readonly memberKey: string;
  readonly committeeKey: string;
  readonly importance: DecisionImportance;
  readonly confidence: DecisionConsideration["confidence"];
  readonly explanation: string;
  readonly sourceRefs: DecisionConsideration["sourceRefs"];
}

/** Recorded district, work, or prior-service evidence that shapes an NPC request. */
export interface CommitteePreferenceEvidence {
  readonly memberKey: string;
  readonly committeeKey: string;
  readonly importance: DecisionImportance;
  readonly confidence: DecisionConsideration["confidence"];
  readonly explanation: string;
  readonly sourceRefs: DecisionConsideration["sourceRefs"];
}

/** Persisted assignments travel with the body the existing reader signatures accept. */
export interface CommitteeAssignmentBody extends SeatedBody {
  readonly committeeAssignmentRecords?: readonly CommitteeSeatAssignment[];
}

export interface CommitteeAssignmentRun {
  readonly world: World;
  readonly body: CommitteeAssignmentBody;
  readonly assignments: readonly CommitteeSeatAssignment[];
}

export interface CommitteeSeatedChamber {
  readonly body: SeatedBody;
  readonly seats: number;
}

export interface CommitteePreferenceRun {
  readonly world: World;
  readonly requestEventIds: readonly EntityId[];
}

export interface PlayerCommitteeRequestRun {
  readonly world: World;
  readonly requestEventId: EntityId;
  readonly preferences: readonly string[];
}

/** NPC members decide and record an ordered preference list from supplied facts. */
export function recordComputerCommitteeRequests(
  world: World,
  input: {
    readonly stableKey: string;
    readonly jurisdictionId: EntityId;
    readonly assignerPersonId: EntityId;
    readonly assignmentRoundKey: string;
    readonly body: SeatedBody;
    readonly committees: readonly AssignableCommittee[];
    readonly preferenceEvidence: readonly CommitteePreferenceEvidence[];
  },
): CommitteePreferenceRun {
  let next = world;
  const requestEventIds: EntityId[] = [];
  const player = next.control.kind === "person" ? next.control.personId : null;
  const committeeKeys = new Set(
    input.committees.map((committee) => committee.committeeKey),
  );
  for (const evidence of input.preferenceEvidence) {
    if (
      !committeeKeys.has(evidence.committeeKey) ||
      !input.body.members.some(
        (member) => member.memberKey === evidence.memberKey,
      )
    )
      throw new Error(
        "Committee preference evidence names an unknown seat or committee.",
      );
  }
  for (const member of input.body.members) {
    if (
      !member.personId ||
      member.personId === player ||
      !next.people[member.personId]
    )
      continue;
    const stableKey = `${input.stableKey}:request:${member.memberKey}`;
    const existing = memberCommitteeRequests(next, {
      jurisdictionId: input.jurisdictionId,
      chamberKey: input.body.chamberKey,
      assignmentRoundKey: input.assignmentRoundKey,
      memberKey: member.memberKey,
    }).at(-1);
    if (existing) {
      requestEventIds.push(existing.eventId);
      continue;
    }
    const preferences: string[] = [];
    const decisionTraceIds: EntityId[] = [];
    let decisionWorld = next;
    const remaining = new Set(committeeKeys);
    for (let preferenceNumber = 1; remaining.size > 0; preferenceNumber += 1) {
      const options: DecisionOption[] = input.committees
        .filter((committee) => remaining.has(committee.committeeKey))
        .map((committee) => ({
          key: committee.committeeKey,
          label: committee.name ?? committee.committeeKey,
          description: `Request a seat on ${committee.name ?? committee.committeeKey}.`,
        }));
      options.push({
        key: "stop-requesting",
        label: "Make no further committee request",
        description: "Stop the ordered committee request list here.",
      });
      const considerations: DecisionConsideration[] = input.preferenceEvidence
        .filter(
          (row) =>
            row.memberKey === member.memberKey &&
            remaining.has(row.committeeKey),
        )
        .map((row) => ({
          stableKey: `committee:preference-fit:${member.memberKey}:${preferenceNumber}:${row.committeeKey}`,
          optionKey: row.committeeKey,
          sourceType: "context:district-economy-and-member-work" as const,
          direction: "supports" as const,
          importance: row.importance,
          confidence: row.confidence,
          explanation: row.explanation,
          sourceRefs: row.sourceRefs,
        }));
      const evaluation = evaluateDecision(decisionWorld, {
        stableKey: `${stableKey}:rank:${preferenceNumber}`,
        decisionType: "legislature.request-committee-membership",
        actorPersonId: member.personId,
        cutoff: currentHistoricalCutoff(decisionWorld),
        subject: {
          kind: "context:committee-request",
          key: `${input.body.chamberKey}:${input.assignmentRoundKey}`,
          entityId: null,
        },
        options,
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
      decisionWorld = recordDurableDecisionTrace(decisionWorld, evaluation);
      decisionTraceIds.push(decisionWorld.history.decisionTraces.at(-1)!.id);
      const selected = evaluation.selectedOptionKey;
      if (
        evaluation.outcomeKind !== "selected" ||
        !selected ||
        selected === "stop-requesting"
      )
        break;
      preferences.push(selected);
      remaining.delete(selected);
    }
    const selectedReasons = input.preferenceEvidence
      .filter(
        (row) =>
          row.memberKey === member.memberKey &&
          preferences.includes(row.committeeKey),
      )
      .map((row) => row.explanation);
    next = recordMemberCommitteeRequest(decisionWorld, {
      stableKey,
      jurisdictionId: input.jurisdictionId,
      chamberKey: input.body.chamberKey,
      assignmentRoundKey: input.assignmentRoundKey,
      memberKey: member.memberKey,
      memberPersonId: member.personId,
      assignerPersonId: input.assignerPersonId,
      preferences,
      decisionTraceIds,
      reason:
        selectedReasons.join("; ") ||
        "No further committee preference was supported by the recorded district, work, or service evidence.",
    });
    const saved = memberCommitteeRequests(next, {
      jurisdictionId: input.jurisdictionId,
      chamberKey: input.body.chamberKey,
      assignmentRoundKey: input.assignmentRoundKey,
      memberKey: member.memberKey,
    }).at(-1);
    if (saved) requestEventIds.push(saved.eventId);
  }
  return { world: next, requestEventIds };
}

/** Record the controlled member's ordered requests from their played choices. */
export function recordPlayerCommitteeRequest(
  world: World,
  input: {
    readonly stableKey: string;
    readonly jurisdictionId: EntityId;
    readonly chamberKey: string;
    readonly assignmentRoundKey: string;
    readonly body: SeatedBody;
    readonly memberKey: string;
    readonly assignerPersonId: EntityId;
    /** Durable traces produced by the request conversation, in played order. */
    readonly decisionTraceIds: readonly EntityId[];
    readonly committeeKeys: readonly string[];
  },
): PlayerCommitteeRequestRun {
  if (world.control.kind !== "person")
    throw new Error("A player committee request requires person control.");
  const playerPersonId = world.control.personId;
  const member = input.body.members.find(
    (candidate) => candidate.memberKey === input.memberKey,
  );
  if (
    input.body.chamberKey !== input.chamberKey ||
    member?.personId !== playerPersonId
  )
    throw new Error(
      "A player committee request must come from their seated member record.",
    );
  const prior = memberCommitteeRequests(world, {
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
    memberKey: input.memberKey,
  }).at(-1);
  if (prior)
    return {
      world,
      requestEventId: prior.eventId,
      preferences: prior.preferences,
    };
  if (input.decisionTraceIds.length === 0)
    throw new Error("A player committee request needs played decision traces.");
  if (new Set(input.decisionTraceIds).size !== input.decisionTraceIds.length)
    throw new Error(
      "A player committee request cannot repeat a decision trace.",
    );
  const knownCommitteeKeys = new Set(input.committeeKeys);
  const preferences: string[] = [];
  let stopped = false;
  for (const decisionTraceId of input.decisionTraceIds) {
    const trace = world.history.decisionTraces.find(
      (candidate) => candidate.id === decisionTraceId,
    );
    if (
      !trace ||
      trace.context.actorPersonId !== playerPersonId ||
      trace.context.decisionType !==
        "legislature.request-committee-membership" ||
      trace.context.subject.kind !== "context:committee-request" ||
      trace.context.subject.key !==
        `${input.chamberKey}:${input.assignmentRoundKey}` ||
      trace.context.retention !== "durable" ||
      trace.outcomeKind !== "selected" ||
      !trace.selectedOptionKey ||
      !trace.context.options.some(
        (option) => option.key === trace.selectedOptionKey,
      )
    )
      throw new Error(
        "A player request must cite its exact played request trace.",
      );
    if (trace.selectedOptionKey === "stop-requesting") {
      if (stopped || decisionTraceId !== input.decisionTraceIds.at(-1))
        throw new Error("Stop-requesting must be the final request choice.");
      stopped = true;
      continue;
    }
    if (
      !knownCommitteeKeys.has(trace.selectedOptionKey) ||
      preferences.includes(trace.selectedOptionKey)
    )
      throw new Error(
        "A player request trace selected an unknown or repeated committee.",
      );
    preferences.push(trace.selectedOptionKey);
  }
  const next = recordMemberCommitteeRequest(world, {
    stableKey: input.stableKey,
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
    memberKey: input.memberKey,
    memberPersonId: playerPersonId,
    assignerPersonId: input.assignerPersonId,
    preferences,
    decisionTraceIds: input.decisionTraceIds,
    reason: `Played request decisions: ${input.decisionTraceIds.join(", ")}.`,
  });
  const recorded = memberCommitteeRequests(next, {
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
    memberKey: input.memberKey,
  }).at(-1);
  if (!recorded)
    throw new Error("The player committee request was not recorded.");
  return {
    world: next,
    requestEventId: recorded.eventId,
    preferences,
  };
}

/** Attach one exact saved round to a body for the unchanged roster readers. */
export function committeeAssignmentBodyForRound(
  world: World,
  body: SeatedBody,
  input: {
    readonly jurisdictionId: EntityId;
    readonly assignmentRoundKey: string;
  },
): CommitteeAssignmentBody {
  return {
    ...body,
    committeeAssignmentRecords: committeeSeatAssignments(world, {
      jurisdictionId: input.jurisdictionId,
      chamberKey: body.chamberKey,
      assignmentRoundKey: input.assignmentRoundKey,
    }),
  };
}

/**
 * STUB until Session 24 wires saved assignments into seatedChamberForPack.
 * This adapter enriches the real seated body only with seat events already in
 * world history for the caller's exact organizing round; it preserves the
 * current member keys and never guesses an assignment round or seat.
 */
export function committeeSeatedChamberWithRecordedAssignments(
  world: World,
  chamber: CommitteeSeatedChamber,
  jurisdictionId: EntityId,
  assignmentRoundKey: string,
): CommitteeSeatedChamber {
  return {
    ...chamber,
    body: committeeAssignmentBodyForRound(world, chamber.body, {
      jurisdictionId,
      assignmentRoundKey,
    }),
  };
}

interface PartySeatQuota {
  readonly party: string;
  readonly seats: number;
  readonly remainder: number;
}

function partyOf(member: SeatedMember): string {
  const key = member.partyKey ?? member.caucusLabel;
  const normalized = key.trim().toLocaleLowerCase("en-US");
  return normalized && normalized !== "no party" && normalized !== "independent"
    ? normalized
    : "independent";
}

function partySeatQuotas(
  members: readonly SeatedMember[],
  committeeSeats: number,
  rule: CommitteePartyRatioRule,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const member of members)
    counts.set(partyOf(member), (counts.get(partyOf(member)) ?? 0) + 1);
  const parties = [...counts.entries()].sort(
    ([partyA, countA], [partyB, countB]) =>
      countB - countA || partyA.localeCompare(partyB),
  );
  if (!parties.length || committeeSeats <= 0) return new Map();
  let majorityParty: string | null = null;
  if (rule === "majority-controls" && parties.length > 1) {
    const [first, second] = parties;
    if (first && second && first[1] > second[1]) majorityParty = first[0];
  }
  if (!majorityParty) return proportionalQuotas(parties, committeeSeats);
  const majoritySeats = Math.ceil(committeeSeats / 2);
  const quotas = new Map<string, number>([[majorityParty, majoritySeats]]);
  const remaining = parties.filter(([party]) => party !== majorityParty);
  const remainderQuotas = proportionalQuotas(
    remaining,
    committeeSeats - majoritySeats,
  );
  for (const [party, seats] of remainderQuotas) quotas.set(party, seats);
  return quotas;
}

function proportionalQuotas(
  parties: readonly (readonly [string, number])[],
  seats: number,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  const total = parties.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0 || seats === 0) return result;
  const rows: PartySeatQuota[] = parties.map(([party, count]) => {
    const exact = (count / total) * seats;
    const base = Math.floor(exact);
    result.set(party, base);
    return { party, seats: base, remainder: exact - base };
  });
  let remainder = seats - rows.reduce((sum, row) => sum + row.seats, 0);
  // Largest-remainder apportionment is the ordinary seat arithmetic; any
  // remaining tie is resolved by stable party key, never member/list order.
  for (const row of [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.party.localeCompare(b.party),
  )) {
    if (remainder <= 0) break;
    result.set(row.party, (result.get(row.party) ?? 0) + 1);
    remainder -= 1;
  }
  return result;
}

function partyRatioConstraints(
  candidates: readonly SeatedMember[],
  allowedParties: ReadonlySet<string>,
  committeeKey: string,
): readonly DecisionConstraint[] {
  if (allowedParties.size === 0) return [];
  return candidates
    .filter((candidate) => !allowedParties.has(partyOf(candidate)))
    .map((candidate) => ({
      stableKey: `committee:party-ratio:${committeeKey}:${candidate.memberKey}`,
      optionKey: candidate.memberKey,
      kind: "committee:party-ratio",
      explanation:
        "The committee's recorded party-ratio rule reserves this seat for another caucus.",
      sourceRefs: [],
    }));
}

function assignmentConsiderations(input: {
  readonly member: SeatedMember & { readonly personId: EntityId };
  readonly committee: AssignableCommittee;
  readonly seniorityImportance: DecisionImportance;
  readonly allowedParties: ReadonlySet<string>;
  readonly oldestServiceDate: string | null;
  readonly request: ReturnType<typeof memberCommitteeRequests>[number] | null;
  readonly relationshipReasons: readonly DecisionConsideration[];
  readonly partyLine: { readonly aligned: number; readonly opposed: number };
  readonly owedFavors: NonNullable<World["history"]["favors"]>;
  readonly districtFitConsiderations: readonly DecisionConsideration[];
}): DecisionConsideration[] {
  const optionKey = input.member.memberKey;
  const reasons: DecisionConsideration[] = [];
  if (input.allowedParties.has(partyOf(input.member)))
    reasons.push({
      stableKey: `committee:party-ratio:${input.committee.committeeKey}:${optionKey}`,
      optionKey,
      sourceType: "context:committee-party-ratio",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "This assignment preserves the chamber's party-ratio rule.",
      sourceRefs: [],
    });
  const request = input.request;
  const preferenceIndex =
    request?.preferences.indexOf(input.committee.committeeKey) ?? -1;
  if (request && preferenceIndex >= 0)
    reasons.push({
      stableKey: `committee:member-request:${request.eventId}:${optionKey}`,
      optionKey,
      sourceType: "institution:member-request",
      direction: "supports",
      importance:
        preferenceIndex === 0
          ? "strong"
          : preferenceIndex === 1
            ? "moderate"
            : "slight",
      confidence: "high",
      explanation: `The member requested ${input.committee.name ?? input.committee.committeeKey}: ${request.reason}`,
      sourceRefs: [{ kind: "historical-event", eventId: request.eventId }],
    });
  if (input.member.tenureStartedAt && input.oldestServiceDate) {
    if (input.oldestServiceDate === input.member.tenureStartedAt)
      reasons.push({
        stableKey: `committee:seniority:${optionKey}`,
        optionKey,
        sourceType: "context:seniority",
        direction: "supports",
        importance: input.seniorityImportance,
        confidence: "high",
        explanation:
          "The member has the longest recorded service in the chamber.",
        sourceRefs: input.member.seatingEventId
          ? [{ kind: "historical-event", eventId: input.member.seatingEventId }]
          : [],
      });
  }
  reasons.push(
    ...input.relationshipReasons.map((reason) => ({ ...reason, optionKey })),
  );
  if (input.partyLine.aligned !== input.partyLine.opposed) {
    const { aligned, opposed } = input.partyLine;
    reasons.push({
      stableKey: `committee:party-line:${input.member.personId}`,
      optionKey,
      sourceType: "context:party-line-record",
      direction: aligned > opposed ? "supports" : "opposes",
      importance: "slight",
      confidence: "high",
      explanation: `The member voted with their caucus on ${aligned} of ${aligned + opposed} recorded party-divided roll calls.`,
      sourceRefs: [],
    });
  }
  for (const favor of input.owedFavors) {
    reasons.push({
      stableKey: `committee:owed-favor:${favor.id}:${optionKey}`,
      optionKey,
      sourceType: "social:favor",
      direction: "supports",
      importance: favorImportance(favor.weight),
      confidence: "high",
      explanation: `The assigner owes the member a favor: ${favor.description}`,
      sourceRefs: [{ kind: "historical-event", eventId: favor.eventId }],
    });
  }
  reasons.push(
    ...input.districtFitConsiderations.map((reason) => ({
      ...reason,
      optionKey,
    })),
  );
  return reasons;
}

function partyLineByMember(
  world: World,
  members: readonly SeatedMember[],
  chamberKey: string,
): ReadonlyMap<
  EntityId,
  { readonly aligned: number; readonly opposed: number }
> {
  const counts = new Map<EntityId, { aligned: number; opposed: number }>();
  const membersByKey = new Map(
    members.map((member) => [member.memberKey, member] as const),
  );
  for (const vote of world.history.legislativeVotes ?? []) {
    if (
      vote.forum.kind === "joint-session" ||
      vote.forum.chamberKey !== chamberKey
    )
      continue;
    const partyVotes = new Map<string, { yea: number; nay: number }>();
    for (const disposition of vote.dispositions) {
      if (!disposition.personId) continue;
      const member = membersByKey.get(disposition.memberKey);
      if (
        !member ||
        member.personId !== disposition.personId ||
        (disposition.disposition !== "yea" && disposition.disposition !== "nay")
      )
        continue;
      const party = partyOf(member);
      if (party === "independent") continue;
      const tally = partyVotes.get(party) ?? { yea: 0, nay: 0 };
      tally[disposition.disposition] += 1;
      partyVotes.set(party, tally);
    }
    for (const disposition of vote.dispositions) {
      if (!disposition.personId) continue;
      const member = membersByKey.get(disposition.memberKey);
      if (
        !member ||
        member.personId !== disposition.personId ||
        (disposition.disposition !== "yea" && disposition.disposition !== "nay")
      )
        continue;
      const party = partyOf(member);
      if (party === "independent") continue;
      const tally = partyVotes.get(party);
      if (!tally || tally.yea === tally.nay) continue;
      const count = counts.get(disposition.personId) ?? {
        aligned: 0,
        opposed: 0,
      };
      if (
        (tally.yea > tally.nay && disposition.disposition === "yea") ||
        (tally.nay > tally.yea && disposition.disposition === "nay")
      )
        count.aligned += 1;
      else count.opposed += 1;
      counts.set(disposition.personId, count);
    }
  }
  return counts;
}

function favorImportance(
  weight: "slight" | "moderate" | "great" | "life-changing",
): DecisionImportance {
  if (weight === "great") return "strong";
  if (weight === "life-changing") return "decisive";
  return weight;
}

/**
 * Assign committee seats once, through the actual assigning member's evaluator.
 * Profile-specific party ratios and seniority customs are explicit inputs so
 * this path can be wired to each chamber's leadership data without guessing.
 */
export function assignCommitteeSeats(
  world: World,
  input: {
    readonly stableKey: string;
    readonly jurisdictionId: EntityId;
    readonly assignmentRoundKey: string;
    readonly assignerPersonId: EntityId;
    readonly body: SeatedBody;
    readonly committees: readonly AssignableCommittee[];
    readonly partyRatioRule: CommitteePartyRatioRule;
    readonly seniorityImportance: DecisionImportance;
    /** Evidence adapter for district economic and member-work fit, when available. */
    readonly districtFit?: readonly CommitteeDistrictFit[];
    /** Actual player selections from the appointing conversation, if controlled. */
    readonly playerSelections?: readonly {
      readonly committeeKey: string;
      readonly seatNumber: number;
      readonly memberKey: string;
      readonly decisionTraceId: EntityId;
    }[];
  },
): CommitteeAssignmentRun {
  const members = input.body.members.filter(
    (member): member is SeatedMember & { readonly personId: EntityId } =>
      member.personId !== null && world.people[member.personId] !== undefined,
  );
  const uniqueMembers = new Set(members.map((member) => member.memberKey));
  if (uniqueMembers.size !== members.length)
    throw new Error(
      "Committee assignment requires unique chamber member keys.",
    );
  const priorAssignments = committeeSeatAssignments(world, {
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.body.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
  });
  let next = world;
  const player = next.control.kind === "person" ? next.control.personId : null;
  if (player === input.assignerPersonId && !input.playerSelections)
    return {
      world: next,
      body: { ...input.body, committeeAssignmentRecords: priorAssignments },
      assignments: priorAssignments,
    };

  const requests = memberCommitteeRequests(next, {
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.body.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
  });
  const requestByMember = new Map<string, (typeof requests)[number]>();
  for (const request of requests)
    requestByMember.set(request.memberKey, request);
  const lineByPerson = partyLineByMember(next, members, input.body.chamberKey);
  const owedFavors = (next.history.favors ?? []).filter(
    (favor) => favor.giverPersonId === input.assignerPersonId,
  );
  const relationshipByMember = new Map(
    members.map(
      (member) =>
        [
          member.memberKey,
          relationshipConsiderations(
            next,
            input.assignerPersonId,
            member.personId,
            {
              optionKey: member.memberKey,
              fond: {
                stableKey: `committee:assigner-relationship:${member.personId}`,
                explanation:
                  "The assigner has a positive recorded relationship with the member.",
              },
              strain: {
                stableKey: `committee:assigner-strain:${member.personId}`,
                explanation:
                  "The assigner has a strained recorded relationship with the member.",
              },
            },
          ),
        ] as const,
    ),
  );
  const oldestServiceDate =
    members
      .map((member) => member.tenureStartedAt ?? null)
      .filter((date): date is IsoDate => date !== null)
      .sort((a, b) => a.localeCompare(b))[0] ?? null;
  const districtFit = new Map<string, CommitteeDistrictFit[]>();
  for (const fit of input.districtFit ?? []) {
    const key = `${fit.memberKey}:${fit.committeeKey}`;
    const rows = districtFit.get(key) ?? [];
    rows.push(fit);
    districtFit.set(key, rows);
  }

  for (const committee of input.committees) {
    const existing = priorAssignments.filter(
      (assignment) => assignment.committeeKey === committee.committeeKey,
    );
    const already = new Set(existing.map((assignment) => assignment.memberKey));
    const seats = Math.min(
      committee.appointedMembers,
      members.filter((member) => !already.has(member.memberKey)).length +
        existing.length,
    );
    const quota = partySeatQuotas(members, seats, input.partyRatioRule);
    const seatedByParty = new Map<string, number>();
    for (const assignment of existing) {
      const member = members.find(
        (candidate) => candidate.memberKey === assignment.memberKey,
      );
      if (!member) continue;
      const party = partyOf(member);
      seatedByParty.set(party, (seatedByParty.get(party) ?? 0) + 1);
    }
    const nextSeatNumber =
      Math.max(0, ...existing.map((row) => row.seatNumber)) + 1;
    for (
      let seatNumber = nextSeatNumber;
      seatNumber <= seats;
      seatNumber += 1
    ) {
      const remaining = members.filter(
        (member) => !already.has(member.memberKey),
      );
      if (remaining.length === 0) break;
      const openParties = [...quota.entries()].filter(
        ([party, count]) => (seatedByParty.get(party) ?? 0) < count,
      );
      const allowedParties = new Set(openParties.map(([party]) => party));
      if (allowedParties.size === 0) break;
      const candidates = remaining;
      const options: DecisionOption[] = candidates.map((member) => ({
        key: member.memberKey,
        label: personName(next.people[member.personId]!),
        description: `Assign to ${committee.name ?? committee.committeeKey}.`,
      }));
      options.push({
        key: "leave-vacant",
        label: "Leave this committee seat vacant",
        description: "Do not appoint a member to this seat.",
      });
      const constraints = partyRatioConstraints(
        candidates,
        allowedParties,
        committee.committeeKey,
      );
      const considerations = candidates.flatMap((member) =>
        assignmentConsiderations({
          member,
          committee,
          seniorityImportance: input.seniorityImportance,
          allowedParties,
          oldestServiceDate,
          request: requestByMember.get(member.memberKey) ?? null,
          relationshipReasons: relationshipByMember.get(member.memberKey) ?? [],
          partyLine: lineByPerson.get(member.personId) ?? {
            aligned: 0,
            opposed: 0,
          },
          owedFavors: owedFavors.filter(
            (favor) => favor.receiverPersonId === member.personId,
          ),
          districtFitConsiderations: (
            districtFit.get(`${member.memberKey}:${committee.committeeKey}`) ??
            []
          ).map((fit) => ({
            stableKey: `committee:district-fit:${member.memberKey}:${committee.committeeKey}`,
            optionKey: member.memberKey,
            sourceType: "context:district-economy-and-member-work",
            direction: "supports",
            importance: fit.importance,
            confidence: fit.confidence,
            explanation: fit.explanation,
            sourceRefs: fit.sourceRefs,
          })),
        }),
      );
      const stableKey = `${input.stableKey}:${committee.committeeKey}:seat:${seatNumber}`;
      let selectedMemberKey: string | null = null;
      if (input.assignerPersonId === player) {
        const choice = input.playerSelections?.find(
          (selection) =>
            selection.committeeKey === committee.committeeKey &&
            selection.seatNumber === seatNumber,
        );
        const trace = choice
          ? next.history.decisionTraces.find(
              (row) => row.id === choice.decisionTraceId,
            )
          : null;
        if (
          choice &&
          trace?.context.actorPersonId === input.assignerPersonId &&
          trace.context.stableKey === stableKey &&
          trace.context.decisionType === "legislature.assign-committee-seat" &&
          trace.outcomeKind === "selected" &&
          trace.selectedOptionKey === choice.memberKey &&
          candidates.some(
            (candidate) => candidate.memberKey === choice.memberKey,
          ) &&
          allowedParties.has(
            partyOf(
              candidates.find(
                (candidate) => candidate.memberKey === choice.memberKey,
              )!,
            ),
          )
        ) {
          selectedMemberKey = choice.memberKey;
          const chosen = candidates.find(
            (candidate) => candidate.memberKey === selectedMemberKey,
          )!;
          next = recordCommitteeSeatAssignment(next, {
            jurisdictionId: input.jurisdictionId,
            chamberKey: input.body.chamberKey,
            assignmentRoundKey: input.assignmentRoundKey,
            committeeKey: committee.committeeKey,
            memberKey: chosen.memberKey,
            memberPersonId: chosen.personId,
            assignerPersonId: input.assignerPersonId,
            seatNumber,
            reasons: [
              `Decision trace ${choice.decisionTraceId}`,
              ...considerations
                .filter((reason) => reason.optionKey === chosen.memberKey)
                .map((reason) => reason.stableKey),
            ],
          });
          already.add(chosen.memberKey);
          seatedByParty.set(
            partyOf(chosen),
            (seatedByParty.get(partyOf(chosen)) ?? 0) + 1,
          );
          continue;
        }
        break;
      }
      const evaluation = evaluateDecision(next, {
        stableKey,
        decisionType: "legislature.assign-committee-seat",
        actorPersonId: input.assignerPersonId,
        cutoff: currentHistoricalCutoff(next),
        subject: {
          kind: "context:committee-seat",
          key: `${input.body.chamberKey}:${committee.committeeKey}:${seatNumber}`,
          entityId: null,
        },
        options,
        constraints,
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
      if (
        evaluation.outcomeKind !== "selected" ||
        !evaluation.selectedOptionKey
      )
        break;
      next = recordDurableDecisionTrace(next, evaluation);
      selectedMemberKey =
        candidates.find(
          (candidate) => candidate.memberKey === evaluation.selectedOptionKey,
        )?.memberKey ?? null;
      if (!selectedMemberKey) break;
      const selected = candidates.find(
        (candidate) => candidate.memberKey === selectedMemberKey,
      )!;
      const reasons = considerations
        .filter((reason) => reason.optionKey === selected.memberKey)
        .map((reason) => reason.stableKey);
      next = recordCommitteeSeatAssignment(next, {
        jurisdictionId: input.jurisdictionId,
        chamberKey: input.body.chamberKey,
        assignmentRoundKey: input.assignmentRoundKey,
        committeeKey: committee.committeeKey,
        memberKey: selected.memberKey,
        memberPersonId: selected.personId,
        assignerPersonId: input.assignerPersonId,
        seatNumber,
        reasons: [`Decision trace ${evaluation.decisionId}`, ...reasons],
      });
      already.add(selected.memberKey);
      seatedByParty.set(
        partyOf(selected),
        (seatedByParty.get(partyOf(selected)) ?? 0) + 1,
      );
    }
  }
  const assignments = committeeSeatAssignments(next, {
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.body.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
  });
  return {
    world: next,
    body: { ...input.body, committeeAssignmentRecords: assignments },
    assignments,
  };
}

/** Reads recorded seat decisions. A body without appointment records has no roster. */
export function committeeRosters(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  seedKey: string,
): ReadonlyMap<string, readonly SeatedMember[]> {
  const rosters = new Map<string, readonly SeatedMember[]>();
  // Retained caller argument identifies the institution, never a random order.
  void seedKey;
  const records = (body as CommitteeAssignmentBody).committeeAssignmentRecords;
  for (const committee of committees) {
    const assigned = (records ?? [])
      .filter((record) => record.committeeKey === committee.committeeKey)
      .sort((a, b) => a.seatNumber - b.seatNumber)
      .flatMap((record) => {
        const member = body.members.find(
          (candidate) =>
            candidate.memberKey === record.memberKey &&
            candidate.personId === record.memberPersonId,
        );
        return member ? [member] : [];
      });
    rosters.set(committee.committeeKey, assigned);
  }
  return rosters;
}

/** One committee's roster, or the empty roster for a committee not compiled. */
export function committeeRoster(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  committeeKey: string,
  seedKey: string,
): readonly SeatedMember[] {
  return committeeRosters(body, committees, seedKey).get(committeeKey) ?? [];
}

/** The committees one seated member sits on, in compiled order. */
export function committeesForMember(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  memberKey: string,
  seedKey: string,
): readonly string[] {
  const rosters = committeeRosters(body, committees, seedKey);
  return committees
    .filter((committee) =>
      (rosters.get(committee.committeeKey) ?? []).some(
        (member) => member.memberKey === memberKey,
      ),
    )
    .map((committee) => committee.committeeKey);
}

/** The committees a person sits on, where the body seats them at all. */
export function committeesForPerson(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  personId: string,
  seedKey: string,
): readonly string[] {
  const seat = body.members.find((member) => member.personId === personId);
  return seat
    ? committeesForMember(body, committees, seat.memberKey, seedKey)
    : [];
}
