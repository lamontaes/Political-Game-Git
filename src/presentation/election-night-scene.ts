import { campaignForCandidate } from "../simulation/campaign-queries";
import {
  electionContestById,
  electionContestResult,
} from "../simulation/election-contests";
import { eventById } from "../simulation/event-index";
import { recordsWithFieldValue } from "../simulation/history-index";
import { localGoverningBodyIdentityForOfficeKey } from "../simulation/nationwide-world/local-governing-body-candidacy-packs";
import { personName } from "../simulation/people";
import { recordWorldEvent } from "../simulation/world";
import type { EntityId, World } from "../simulation/types";
import { displayedSharePercents } from "./campaign-projection";

/** Council result authority only. National count and contingent-choice records
 * are a separate authority and never fall through to this reader.
 */
export function councilElectionNight(
  world: World,
  playerPersonId: EntityId,
  recordedContestId?: EntityId,
) {
  const campaign = campaignForCandidate(world, playerPersonId);
  const contestId = recordedContestId ?? campaign?.contestId;
  if (!contestId) return null;
  const contest = electionContestById(world, contestId);
  if (
    !contest ||
    contest.scheduledAt > world.currentDate ||
    contest.sequence >= world.history.nextSequence
  )
    return null;
  const office = localGoverningBodyIdentityForOfficeKey(
    contest.office.officeKey,
  );
  if (
    office?.unit.unitType !== "municipality" ||
    office.seat !== "governing-body"
  )
    return null;
  const result = electionContestResult(world, contest.id);
  if (
    !result ||
    result.resolvedAt > world.currentDate ||
    result.sequence >= world.history.nextSequence
  )
    return null;
  const outcome = eventById(world, result.outcomeEventId);
  if (
    !outcome ||
    outcome.type !== "election.contest-resolved" ||
    outcome.occurredAt > world.currentDate ||
    outcome.recordedAt > world.currentDate ||
    outcome.sequence >= world.history.nextSequence
  )
    return null;
  if (
    !contest.candidatePersonIds.includes(playerPersonId) ||
    !world.people[result.winnerPersonId]
  )
    return null;
  const percentages = displayedSharePercents(
    result.tallies.map((row) => row.voteShare),
  );
  const returned = recordsWithFieldValue(
    world.history.events,
    "type",
    "election.night-returned",
  ).find(
    (event) =>
      event.occurredAt <= world.currentDate &&
      event.recordedAt <= world.currentDate &&
      event.sequence < world.history.nextSequence &&
      event.tags.includes(`result:${result.id}`) &&
      event.participants.some((person) => person.personId === playerPersonId),
  );
  return {
    version: 1 as const,
    playerPersonId,
    officeKey: contest.office.officeKey,
    officeTitle: contest.office.title,
    contestId: contest.id,
    resultId: result.id,
    outcomeEventId: outcome.id,
    electionDate: contest.electionDate,
    resolvedAt: result.resolvedAt,
    winnerPersonId: result.winnerPersonId,
    winnerName: personName(world.people[result.winnerPersonId]!),
    won: result.winnerPersonId === playerPersonId,
    tallies: result.tallies.map((row, index) => ({
      ...row,
      name: world.people[row.candidatePersonId]
        ? personName(world.people[row.candidatePersonId]!)
        : null,
      displayedSharePercent: percentages[index]!,
    })),
    sourceRecordIds: [
      ...(campaign?.contestId === contest.id ? [campaign.id] : []),
      contest.id,
      result.id,
      outcome.id,
    ],
    // The outcome event's candidate participants are not room attendance.
    presenceEventId: null,
    returnedEventId: returned?.id ?? null,
    action: {
      kind: "election-night.return" as const,
      officeKey: contest.office.officeKey,
      contestId: contest.id,
      resultId: result.id,
    },
  };
}

/** Read-only result inspection never creates this receipt. The actual player's
 * return does, preserving the existing World and all result/save identities.
 */
export function returnFromCouncilElectionNight(
  world: World,
  playerPersonId: EntityId,
  resultId: EntityId,
): World {
  const savedResult = world.history.electionContestResults?.find(
    (result) => result.id === resultId,
  );
  const night = savedResult
    ? councilElectionNight(world, playerPersonId, savedResult.contestId)
    : null;
  if (!night || night.resultId !== resultId)
    throw new Error(
      "That council result is no longer the current recorded result.",
    );
  if (night.returnedEventId) return world;
  return recordWorldEvent(world, {
    stableKey: `election-night:return:${resultId}:${playerPersonId}`,
    type: "election.night-returned",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[playerPersonId]!.homeJurisdictionId,
    involvedEntityIds: [playerPersonId],
    participants: [
      {
        personId: playerPersonId,
        role: "other:result-viewer",
        detail: night.officeKey,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `office:${night.officeKey}`,
      `contest:${night.contestId}`,
      `result:${night.resultId}`,
      `outcome:${night.outcomeEventId}`,
    ],
    summary:
      "The candidate returned from the recorded council election result.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
