import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { recordedVoterDecisionContexts } from "../election-contests";
import { isEligibleVoterIn } from "../issue-record";
import type { EntityId, IsoDate, World } from "../types";
import {
  primaryPartyBallotAdmission,
  recordPrimaryBallotSelection,
  recordedPrimaryBallotSelectionAt,
  recordedPrimaryPartyRegistrationAt,
} from "./primary-voter-access";

export interface PrimaryBallotActionField {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly stateUsps: string;
  readonly electionDate: IsoDate;
  readonly entrants: readonly {
    readonly personId: EntityId;
    readonly party: string;
  }[];
}

/** The person's explicit ballot request uses the same legal reader as counting.
 * A request never enrolls the elector in a party or invents an invitation.
 */
export function choosePrimaryPartyBallot(
  world: World,
  input: PrimaryBallotActionField & {
    readonly personId: EntityId;
    readonly selectedPartyId: string;
  },
): World {
  if (
    world.currentDate !== input.electionDate ||
    !isEligibleVoterIn(
      world,
      input.personId,
      input.jurisdictionId,
      input.electionDate,
    ) ||
    !input.entrants.some((entrant) => entrant.party === input.selectedPartyId)
  )
    return world;
  const registration = recordedPrimaryPartyRegistrationAt(world, input);
  if (
    primaryPartyBallotAdmission(
      input.stateUsps,
      input.selectedPartyId,
      registration,
      input.selectedPartyId,
    ) !== "eligible"
  )
    return world;
  return recordPrimaryBallotSelection(world, {
    stableKey: `${input.stableKey}:ballot-choice:${input.personId}`,
    personId: input.personId,
    jurisdictionId: input.jurisdictionId,
    electionStableKey: input.stableKey,
    selectedPartyId: input.selectedPartyId,
    selectedAt: input.electionDate,
  });
}

/** The ordinary primary caller asks actual view holders which legal ballot
 * lets them support their preferred candidate. The existing evaluator decides;
 * a tie, abstention, missing view or unsupported admission produces no choice.
 * The controlled player remains an explicit actor, never an automatic NPC.
 */
export function considerPrimaryPartyBallots(
  world: World,
  input: PrimaryBallotActionField,
): World {
  if (world.currentDate < input.electionDate || input.entrants.length === 0)
    return world;
  const candidateParties = new Map(
    input.entrants.map((entrant) => [entrant.personId, entrant.party]),
  );
  const contexts = recordedVoterDecisionContexts(world, {
    stableKey: `${input.stableKey}:ballot-choice`,
    jurisdictionId: input.jurisdictionId,
    electionDate: input.electionDate,
    candidatePersonIds: [...candidateParties.keys()],
    includeRecordedRelationships: true,
  });
  let next = world;
  for (const [personId, context] of contexts) {
    if (world.control.kind === "person" && world.control.personId === personId)
      continue;
    const action = { ...input, personId };
    if (
      recordedPrimaryBallotSelectionAt(next, {
        ...action,
        electionStableKey: input.stableKey,
      }) != null
    )
      continue;
    const registration = recordedPrimaryPartyRegistrationAt(next, action);
    const legalCandidates = new Set(
      input.entrants
        .filter(
          (entrant) =>
            primaryPartyBallotAdmission(
              input.stateUsps,
              entrant.party,
              registration,
              entrant.party,
            ) === "eligible",
        )
        .map((entrant) => entrant.personId),
    );
    if (legalCandidates.size === 0) continue;
    const evaluation = evaluateDecision(next, {
      ...context,
      decisionType: "election.primary-ballot-choice",
      retention: "durable",
      cutoff: {
        ...context.cutoff,
        historySequenceExclusive: next.history.nextSequence,
      },
      options: context.options.filter(
        (option) =>
          legalCandidates.has(option.key as EntityId) ||
          option.key === "abstain",
      ),
      considerations: context.considerations.filter((row) =>
        legalCandidates.has(row.optionKey as EntityId),
      ),
    });
    if (
      !isSelectedDecision(evaluation) ||
      evaluation.selectedOptionKey === "abstain"
    )
      continue;
    const selectedPartyId = candidateParties.get(
      evaluation.selectedOptionKey as EntityId,
    );
    if (!selectedPartyId) continue;
    next = recordDurableDecisionTrace(next, evaluation);
    next = recordPrimaryBallotSelection(next, {
      stableKey: `${input.stableKey}:ballot-choice:${personId}`,
      personId,
      jurisdictionId: input.jurisdictionId,
      electionStableKey: input.stableKey,
      selectedPartyId,
      selectedAt: input.electionDate,
    });
  }
  return next;
}
