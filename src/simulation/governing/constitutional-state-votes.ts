import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
  recordArticleVRatification,
} from "../constitutional-process";
import type { ConstitutionalRatificationChamberVote } from "../constitutional-types";
import {
  stateRatificationChambers,
  stateRatificationRule,
} from "../constitutional-ratification-rules";
import { currentPresidentOf } from "../crisis/offices";
import { buildLegislativeVoteRecord, tallyDispositions } from "../legislation";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { resolveRequiredVotes } from "../legislature-rules";
import { stateJurisdictionForKey } from "../life-places";
import { PRESIDENT_OFFICE_KEY } from "../nationwide-world/presidential-turnover";
import type {
  DecisionConsideration,
  EntityId,
  LegislativeVoteDisposition,
  World,
} from "../types";
import { decideChamberVote, stateConstitutionalRoster } from "./chamber-votes";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";

/**
 * Decide actual state members on a saved Article V proposal. This supplies
 * member ballots, not state approval: ratification thresholds and chamber
 * aggregation require their own sourced binding, not the proposal rule.
 * Missing state institutions or a current subject holder stay unsupported.
 */
export function decideArticleVStateMemberVotes(
  world: World,
  measureId: EntityId,
  jurisdictionId: EntityId,
  considerationsForMember: (
    world: World,
    member: { readonly memberKey: string; readonly personId: EntityId },
  ) => readonly DecisionConsideration[],
): {
  readonly world: World;
  readonly chambers: readonly {
    readonly bodyKey: string;
    readonly eligibleMembers: number;
    readonly sourceRecordIds: readonly EntityId[];
    readonly dispositions: readonly LegislativeVoteDisposition[];
  }[];
} | null {
  const measure = world.history.constitutionalMeasures?.find(
    (row) => row.id === measureId,
  );
  const pack = legislativePackForJurisdiction(jurisdictionId);
  const holder = currentPresidentOf(world)?.personId;
  const delta = measure?.ruleDelta;
  if (
    !measure ||
    measure.processKind !== "federal-amendment" ||
    measure.ratificationMode !== "state-legislatures" ||
    constitutionalPosition(world, measureId).phase !== "ratification" ||
    !pack ||
    !ARTICLE_V_STATE_KEYS.includes(pack.jurisdictionKey) ||
    (delta?.kind !== "policy-provision" &&
      (!holder ||
        delta?.kind !== "rule-field" ||
        delta.officeKey !== PRESIDENT_OFFICE_KEY ||
        delta.field !== "executive.term.limit"))
  )
    return null;
  const rosters = pack.chambers.map((body) => ({
    bodyKey: body.chamberKey,
    roster: stateConstitutionalRoster(
      world,
      jurisdictionId,
      body.chamberKey,
      "ratification",
    ),
  }));
  if (!rosters.length || rosters.some(({ roster }) => roster === null))
    return null;
  const next = ensureOfficeholderPrinciples(
    world,
    rosters.flatMap(({ roster }) =>
      roster!.seated.body.members.flatMap((member) =>
        member.personId ? [member.personId] : [],
      ),
    ),
  );
  return {
    world: next,
    chambers: rosters.map(({ bodyKey, roster }) => {
      const members = roster!.seated.body.members;
      return {
        bodyKey,
        eligibleMembers: members.filter((member) => member.personId !== null)
          .length,
        sourceRecordIds: [measure.id, ...roster!.sourceRecordIds],
        dispositions: decideChamberVote(next, {
          kind: "constitutional",
          stableKey: `${measure.stableKey}:${jurisdictionId}:${bodyKey}:ratification`,
          constitutionalMeasureId: measure.id,
          ratificationJurisdictionId: jurisdictionId,
          bodyKey,
          purpose: "ratification",
          members,
          playerPersonId:
            next.control.kind === "person" ? next.control.personId : null,
          considerationsByMember: new Map(
            members.flatMap((member) =>
              member.personId
                ? [
                    [
                      member.memberKey,
                      considerationsForMember(next, {
                        memberKey: member.memberKey,
                        personId: member.personId,
                      }),
                    ] as const,
                  ]
                : [],
            ),
          ),
        }),
      };
    }),
  };
}

/** Record the state's actual separate chambers only when all their legal
 * requirements are admitted. A missing rule/body/quorum leaves it pending. */
export function recordArticleVStateMemberVote(
  world: World,
  measureId: EntityId,
  stateKey: string,
  considerationsForMember: (
    world: World,
    member: { readonly memberKey: string; readonly personId: EntityId },
  ) => readonly DecisionConsideration[],
): World | null {
  if (
    constitutionalActions(world, measureId).some(
      (row) =>
        row.detail.kind === "state-ratification" &&
        row.detail.stateKey === stateKey,
    )
  )
    return world;
  const bodies = stateRatificationChambers(stateKey);
  const jurisdiction = stateJurisdictionForKey(stateKey);
  if (!bodies || !jurisdiction) return null;
  const prepared = decideArticleVStateMemberVotes(
    world,
    measureId,
    jurisdiction.id,
    considerationsForMember,
  );
  if (!prepared || prepared.chambers.length !== bodies.length) return null;
  const votes: ConstitutionalRatificationChamberVote[] = [];
  for (const chamber of prepared.chambers) {
    const rule = stateRatificationRule(stateKey, chamber.bodyKey);
    const organization = prepared.world.history.organizations.find((row) =>
      chamber.sourceRecordIds.includes(row.id),
    );
    const tally = tallyDispositions(chamber.dispositions);
    const present = tally.yea + tally.nay + tally.presentNotVoting;
    // Vacancy semantics beyond the complete actual seating remain unsupported
    // rather than silently borrowing the authorized seat count as a denominator.
    if (
      !bodies.includes(chamber.bodyKey) ||
      !rule ||
      !organization ||
      chamber.dispositions.some((row) => row.personId === null) ||
      present <
        resolveRequiredVotes(rule.quorum, chamber.eligibleMembers).requiredVotes
    )
      return null;
    votes.push({
      bodyKey: chamber.bodyKey,
      organizationId: organization.id,
      sourceRecordIds: chamber.sourceRecordIds,
      vote: buildLegislativeVoteRecord(prepared.world, {
        stableKey: `${measureId}:${stateKey}:${chamber.bodyKey}:ratification`,
        measureId,
        forum: { kind: "chamber", chamberKey: chamber.bodyKey },
        purpose: "constitutional-ratification",
        threshold: rule.threshold,
        eligibleMembers: chamber.eligibleMembers,
        presentMembers: present,
        dispositions: chamber.dispositions,
        provenance: {
          method: "member-decisions",
          note: "Actual state members use the shared chamber vote and sourced ratification rule.",
          sourceEntityIds: [...chamber.sourceRecordIds],
        },
      }),
    });
  }
  return recordArticleVRatification(prepared.world, measureId, {
    kind: "state-ratification",
    stateKey,
    body: "state-legislature",
    approved: votes.every((row) => row.vote.outcome === "passed"),
    authenticationKey: `${measureId}:${stateKey}:${prepared.world.currentDate}`,
    jurisdictionId: jurisdiction.id,
    chamberVotes: votes,
  });
}
