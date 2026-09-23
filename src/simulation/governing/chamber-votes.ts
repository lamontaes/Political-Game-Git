import { evaluateDecision } from "../decisions";
import { requireMeasure } from "../legislation";
import { memberVoteConsiderations } from "../legislative-member-decisions";
import { principleVoteConsideration } from "./officeholder-principles";
import type { MemberVoteQuestion } from "../legislative-member-decisions";
import type { SeatedBody, SeatedMember } from "../legislation-scenarios";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "../living-world/opening";
import {
  stateLegislatureEstablished,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import { activeOrganizationParticipationsAt } from "../life-queries";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import type {
  DecisionConsideration,
  EntityId,
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
  World,
} from "../types";

/**
 * A whole chamber deciding a question, member by member.
 *
 * Before this, every state floor vote was a head count written in advance and
 * dealt out to seats in order. Where the home state's legislature has been
 * seated with real people, each of them now answers the question for their
 * own reasons, through the same evaluator the bargaining colleagues use:
 *
 * - what they have said on the record about this question (a commitment);
 * - whose bill it is: a bill carried by a member of their own party is a
 *   reason to support it. One carried by the other party is no reason to
 *   oppose it, except on an override of the governor's veto, where the
 *   parties do line up against each other. That is an organizational cue,
 *   not a conviction, and it is weighed below a promise, so a member who
 *   made one keeps it over the cue.
 *
 * A member's private belief does not yet decide a vote. A bill records which
 * policy questions it bears on but not which way it answers them, so a view
 * on the question cannot be read as a view on the bill without inventing
 * that direction.
 *
 * PLACEHOLDER until research question
 * how-state-legislators-vote-without-a-stated-position is answered: the
 * party cue, the weights and the rule that only an override divides by party
 * are the game's own, not measured voting behavior.
 *
 * Nothing else is invented to fill the list. A member with no reason at all
 * answers present. A seat with nobody in it is a vacancy, not a voter, and
 * lowers the count of members. The player is never voted for: a player who
 * holds a seat and has not cast a ballot is recorded absent.
 *
 * Returns null where no legislature has been seated, so a caller keeps its
 * authored decisions for an older save rather than inventing a chamber.
 */

export interface SeatedChamber {
  readonly body: SeatedBody;
  /** Seats the chamber has, filled or not. */
  readonly seats: number;
}

export function seatedChamberForPack(
  world: World,
  rulePackId: string,
  chamberKey: string,
  chamberName: string,
): SeatedChamber | null {
  const candidacyPackId = `${rulePackId}:candidacy`;
  if (!stateLegislatureEstablished(world, candidacyPackId)) return null;
  const officeKey = `${rulePackId}:${chamberKey}`;
  const opening = world.history.events.find((event) =>
    event.tags.includes(`pack:${candidacyPackId}`),
  );
  const sizeTag = opening?.tags.find((tag) =>
    tag.startsWith(`chamber:${chamberKey}:`),
  );
  const members = stateLegislators(world, candidacyPackId)
    .filter((member) => member.officeKey === officeKey)
    .sort((l, r) => l.ordinal - r.ordinal);
  if (!sizeTag) return null;
  const seats = Number(sizeTag.split(":")[2]);
  return {
    seats,
    body: {
      chamberKey,
      chamberName,
      members: members.map((member): SeatedMember => ({
        memberKey: `${officeKey}:seat:${member.ordinal}`,
        name: personName(world.people[member.personId]!),
        personId: member.personId,
        caucusLabel: member.party
          ? `${member.party.charAt(0).toUpperCase()}${member.party.slice(1)}`
          : "No party",
      })),
    },
  };
}

/** The public party a person holds now, by the national party they joined. */
export function publicPartyOf(world: World, personId: EntityId): string | null {
  const active = activeOrganizationParticipationsAt(world, personId);
  for (const party of ["democratic", "republican"]) {
    const id = livingWorldOrganizationId(
      world,
      LIVING_WORLD_KEYS.nationalParty(party),
    );
    if (active.some((entry) => entry.participation.organizationId === id)) {
      return party;
    }
  }
  return null;
}

export interface ChamberVoteInput {
  readonly stableKey: string;
  readonly question: MemberVoteQuestion;
  readonly members: readonly SeatedMember[];
  /** The player, who is never voted for. */
  readonly playerPersonId?: EntityId | null;
  /** The player's own ballot, when they cast one. */
  readonly playerBallot?: LegislativeMemberDisposition | null;
}

const OPTIONS = [
  { key: "vote-yea", label: "Vote yes", description: "Vote for the question." },
  { key: "vote-nay", label: "Vote no", description: "Vote against it." },
  {
    key: "withhold",
    label: "Answer present",
    description: "Be recorded present without voting either way.",
  },
] as const;

export function decideChamberVote(
  world: World,
  input: ChamberVoteInput,
): readonly LegislativeVoteDisposition[] {
  const measure = requireMeasure(world, input.question.question.measureId);
  const sponsorParty = measure.sponsorPersonId
    ? publicPartyOf(world, measure.sponsorPersonId)
    : null;
  const cutoff = currentHistoricalCutoff(world);
  return input.members.map((member): LegislativeVoteDisposition => {
    if (member.personId === null) {
      return {
        memberKey: member.memberKey,
        personId: null,
        disposition: "absent",
      };
    }
    if (member.personId === input.playerPersonId) {
      return input.playerBallot
        ? {
            memberKey: member.memberKey,
            personId: member.personId,
            disposition: input.playerBallot,
            reason: "member:own-ballot",
          }
        : {
            memberKey: member.memberKey,
            personId: member.personId,
            disposition: "absent",
            reason: "member:player-not-present",
          };
    }
    const considerations = [
      ...memberVoteConsiderations(world, {
        stableKey: `${input.stableKey}:${member.memberKey}`,
        personId: member.personId,
        question: input.question,
      }).filter(
        (consideration) =>
          consideration.stableKey !== "member:nothing-decisive",
      ),
      ...[principleVoteConsideration(world, member.personId, measure)].filter(
        (consideration) => consideration !== null,
      ),
      ...partyCue(
        world,
        member.personId,
        measure.sponsorPersonId,
        sponsorParty,
        input.question.question.purpose === "veto-override",
      ),
    ];
    if (considerations.length === 0) {
      return {
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: "present-not-voting",
        reason: "member:no-reason",
      };
    }
    const evaluation = evaluateDecision(world, {
      stableKey: `${input.stableKey}:${member.memberKey}:decision`,
      decisionType: "legislation.member-vote",
      actorPersonId: member.personId,
      cutoff,
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
      retention: "ephemeral",
    });
    const selected = evaluation.selectedOptionKey ?? "withhold";
    const decisive = considerations
      .filter((consideration) => consideration.optionKey === selected)
      .sort((l, r) => weight(r) - weight(l))[0];
    return {
      memberKey: member.memberKey,
      personId: member.personId,
      disposition:
        selected === "vote-yea"
          ? "yea"
          : selected === "vote-nay"
            ? "nay"
            : "present-not-voting",
      reason: decisive
        ? decisive.stableKey.startsWith("member:party-cue:") ||
          decisive.stableKey.startsWith("member:principle:")
          ? decisive.stableKey
          : decisive.stableKey.split(":").slice(0, 2).join(":")
        : "member:no-reason",
    };
  });
}

function partyCue(
  world: World,
  personId: EntityId,
  sponsorPersonId: EntityId | null,
  sponsorParty: string | null,
  contested: boolean,
): readonly DecisionConsideration[] {
  if (sponsorPersonId === personId)
    return [
      {
        stableKey: "member:own-bill",
        optionKey: "vote-yea",
        sourceType: "context:own-bill",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: "The member is carrying this bill.",
        sourceRefs: [],
      },
    ];
  const party = publicPartyOf(world, personId);
  // A member with no national party, as in Puerto Rico's chambers, or a bill
  // whose sponsor has none, carries no party cue either way.
  const same = party !== null && party === sponsorParty;
  if (contested && (!party || !sponsorParty)) return [];
  // Most bills pass by wide margins: a member of the other party with no
  // conviction about a bill has no reason to vote it down. Party lines hold
  // where the question is a contest between the parties, an override of the
  // governor's veto.
  if (!same && !contested)
    return [
      {
        stableKey: "member:no-objection",
        optionKey: "vote-yea",
        sourceType: "context:sponsor-party",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation: "The member has no reason to oppose the bill.",
        sourceRefs: [],
      },
    ];
  return [
    {
      stableKey: same ? "member:party-cue:same" : "member:party-cue:other",
      optionKey: same ? "vote-yea" : "vote-nay",
      sourceType: "context:sponsor-party",
      direction: "supports",
      importance: same ? "moderate" : "slight",
      confidence: "medium",
      explanation: same
        ? "The bill is carried by a member of the member's own party."
        : "The bill is carried by a member of the other party.",
      sourceRefs: [],
    },
  ];
}

function weight(consideration: DecisionConsideration): number {
  const importance = { slight: 1, moderate: 2, strong: 4, decisive: 6 }[
    consideration.importance
  ];
  const confidence = { low: 1, medium: 2, high: 3 }[consideration.confidence];
  return importance * confidence;
}
