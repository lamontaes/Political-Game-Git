import {
  electionContestResult,
  requireElectionContest,
} from "./election-contests";
import { personName } from "./people";
import { addDays } from "./dates";
import { recordWorldEvent } from "./world";
import { LIFE_MIND_IDS } from "./life-mind-content";
import { parentsOf } from "./people-family";
import { latestPersonalValue } from "./queries";
import {
  SPEECH_MOVES_TAG,
  SPEECH_REGISTER_TAG,
  type ElectionSpeechMove,
} from "./speech-moves";
import {
  recordSpeechReception,
  electionNightWitnesses,
} from "./speech-reception";
import { rememberSpeech } from "./speech-retelling";
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

/**
 * Where election night is held. The speech event carries it as a `place:` tag,
 * and the presentation layer turns the key into the venue picture, the same
 * way a scheduled activity's location key becomes its picture.
 */
export const ELECTION_NIGHT_LOCATION_KEY = "campaign-election-night";

export type ElectionSpeechKind = "victory" | "concession";

export {
  SPEECH_MOVES_TAG,
  SPEECH_REGISTER_TAG,
  speechMovesOf,
  type ElectionSpeechMove,
} from "./speech-moves";

/**
 * A parent the speaker lost, if they would say so in public. Whether they do
 * is theirs: a person who holds their privacy close keeps it out of a speech.
 * No share of speakers is set; it follows each person's recorded values.
 */
function lostParentMove(
  world: World,
  personId: EntityId,
): ElectionSpeechMove | null {
  if (
    latestPersonalValue(world, personId, LIFE_MIND_IDS.privacy)?.orientation ===
    "embraces"
  )
    return null;
  for (const parentId of parentsOf(world, personId)) {
    const death = world.history.personDeaths.find(
      (row) => row.personId === parentId && row.diedAt <= world.currentDate,
    );
    const kinship = world.history.kinshipRelationships.find(
      (row) =>
        row.personIds.includes(personId) &&
        row.personIds.includes(parentId) &&
        row.kind.startsWith("lineal:"),
    );
    if (death && kinship)
      return {
        move: "lost-parent",
        personId: parentId,
        kinshipId: kinship.id,
        deathId: death.id,
      };
  }
  return null;
}

function electionSpeechMoves(
  world: World,
  personId: EntityId,
  won: boolean,
  winnerId: EntityId,
  opponentIds: readonly EntityId[],
): ElectionSpeechMove[] {
  const lost = lostParentMove(world, personId);
  return [
    { move: "thanks" },
    ...(won
      ? opponentIds.slice(0, 1).map((id) => ({
          move: "opponent" as const,
          personId: id,
        }))
      : [{ move: "congratulate" as const, personId: winnerId }]),
    ...(lost ? [lost] : []),
    { move: won ? "the-work" : "keep-going" },
    { move: "close" },
  ];
}

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
 * How long after the result an election-night speech can still be given.
 *
 * A victory speech or a concession belongs to the night the result came in
 * and the day or two after; three months on it is not election night any
 * more (San Antonio, Texas House, 2026-09-23). Three days, counted from the
 * result's own recorded date, is the whole rule.
 */
export const ELECTION_SPEECH_WINDOW_DAYS = 3;

/**
 * Whether the player can still choose to give their election-night speech:
 * the race is decided, they have not spoken, and the window is open.
 */
export function electionSpeechOpen(
  world: World,
  contestId: EntityId,
  personId: EntityId,
): boolean {
  const result = electionContestResult(world, contestId);
  if (!result) return false;
  if (electionSpeechGiven(world, contestId, personId)) return false;
  return (
    world.currentDate <= addDays(result.resolvedAt, ELECTION_SPEECH_WINDOW_DAYS)
  );
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
  const moves = electionSpeechMoves(
    world,
    personId,
    won,
    winner.id,
    contest.candidatePersonIds.filter((id) => id !== personId),
  );
  const moveEntityIds = moves.flatMap((move) =>
    "personId" in move ? [move.personId] : [],
  );
  // Step 4: who was in the room, from the record. They are in the speech's
  // own record, since they were there when it was given.
  const witnessIds = electionNightWitnesses(world, personId, contestId);
  const spoken = recordWorldEvent(world, {
    stableKey: speechKey(contestId, personId),
    type: won ? VICTORY_SPEECH_EVENT : CONCESSION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: contest.jurisdictionId,
    involvedEntityIds: [
      contest.id,
      result.id,
      personId,
      winner.id,
      ...moveEntityIds,
      ...witnessIds,
    ].filter((id, index, all) => all.indexOf(id) === index),
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
    tags: [
      "campaign.election-night",
      `election.contest:${contest.id}`,
      `place:${ELECTION_NIGHT_LOCATION_KEY}`,
      `${SPEECH_REGISTER_TAG}election-night`,
      `${SPEECH_MOVES_TAG}${JSON.stringify(moves)}`,
    ],
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
  // Steps 5 and 6: the people who were there each take it their own way,
  // and each keeps a memory of it as strong as it mattered to them.
  const speech = electionSpeechGiven(spoken, contestId, personId)!;
  const received = recordSpeechReception(
    spoken,
    speech,
    personId,
    witnessIds,
    won ? "victory" : "concession",
  );
  return rememberSpeech(received, speech, witnessIds);
}
