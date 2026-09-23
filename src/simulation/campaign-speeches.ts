import {
  electionContestResult,
  requireElectionContest,
} from "./election-contests";
import { personName } from "./people";
import { recordWorldEvent } from "./world";
import type { EntityId, World } from "./types";

/**
 * Election night, said out loud.
 *
 * A winner gives a victory speech and a loser concedes to the person who beat
 * them. Each is a public event about the person who gave it, written from the
 * recorded result: who won, who conceded to whom, and for what office. Nothing
 * is said that the result does not contain.
 *
 * A rival gives theirs when the race closes. The player gives theirs only by
 * choosing to, from the result screen; the game never speaks for them.
 */
export const VICTORY_SPEECH_EVENT = "campaign.victory-speech";
export const CONCESSION_EVENT = "campaign.concession";

export type ElectionSpeechKind = "victory" | "concession";

function speechKey(contestId: EntityId, personId: EntityId): string {
  return `campaign-speech:${contestId}:${personId}`;
}

/** The speech this person gave after this contest, if they gave one. */
export function electionSpeechGiven(
  world: World,
  contestId: EntityId,
  personId: EntityId,
) {
  const key = speechKey(contestId, personId);
  return world.history.events.find((event) => event.stableKey === key) ?? null;
}

/**
 * Records the speech this candidate gives now that the contest is decided:
 * victory for its winner, a concession to the winner for anyone else.
 */
export function recordElectionSpeech(
  world: World,
  contestId: EntityId,
  personId: EntityId,
): World {
  if (electionSpeechGiven(world, contestId, personId)) return world;
  const contest = requireElectionContest(world, contestId);
  const result = electionContestResult(world, contestId);
  if (!result)
    throw new Error("A speech about a result needs the result first.");
  if (!contest.candidatePersonIds.includes(personId))
    throw new Error("Only a candidate in this race gives a speech about it.");
  const speaker = world.people[personId];
  const winner = world.people[result.winnerPersonId];
  if (!speaker || !winner) return world;
  const won = result.winnerPersonId === personId;
  const office = contest.office.title;
  return recordWorldEvent(world, {
    stableKey: speechKey(contestId, personId),
    type: won ? VICTORY_SPEECH_EVENT : CONCESSION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: contest.jurisdictionId,
    involvedEntityIds: [contest.id, result.id, personId, winner.id].filter(
      (id, index, all) => all.indexOf(id) === index,
    ),
    participants: [
      {
        personId,
        role: "focus:subject",
        detail: won ? "gave a victory speech" : "conceded",
      },
      ...(won
        ? []
        : [
            {
              personId: winner.id,
              role: "presence:named" as const,
              detail: "the winner conceded to",
            },
          ]),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.election-night", `election.contest:${contest.id}`],
    summary: won
      ? `${personName(speaker)} gave a victory speech after winning the race for ${office}.`
      : `${personName(speaker)} conceded the race for ${office} to ${personName(winner)}.`,
    context: {
      location: {
        jurisdictionId: contest.jurisdictionId,
        label: world.jurisdictions[contest.jurisdictionId]?.name ?? office,
        setting: "Election night",
      },
      socialContext: "In public, in front of supporters and the press.",
      pressure: null,
      choice: won ? "Thank the voters." : `Concede to ${personName(winner)}.`,
      motivation: null,
      immediateReaction: null,
    },
  });
}
