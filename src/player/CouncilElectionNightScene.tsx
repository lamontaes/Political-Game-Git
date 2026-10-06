import { useState } from "react";
import {
  campaignForCandidate,
  personName,
  type EntityId,
  type World,
} from "../simulation";
import { electionSpeechOpen } from "../simulation/campaign-speeches";
import {
  displayedSharePercents,
  giveElectionSpeech,
} from "../presentation/campaign-projection";
import {
  councilElectionNightRoomPacket,
  returnFromCouncilElectionNight,
} from "../presentation/election-night-scene";
import { projectPlayedSceneExchange } from "../presentation/scene-conversation";
import {
  electionNightViewedBeat,
  recordElectionNightReportView,
} from "../presentation/election-night-progress";
import { PersonPortrait } from "./PersonPortrait";
import { SceneConversation } from "./SceneConversation";

/** Saved council returns for the candidate who is actually home on election night. */
export function CouncilElectionNightScene({
  world,
  personId,
  contestId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly contestId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [conversationPersonId, setConversationPersonId] =
    useState<EntityId | null>(null);
  const packet = councilElectionNightRoomPacket(world, personId, contestId);
  if (!packet || packet.reportingReady !== true || !packet.reports) return null;

  const viewed = electionNightViewedBeat(world, personId, contestId);
  const beat = packet.reports.beats[viewed];
  if (!beat) return null;
  const candidates = beat.runningTallies.map(
    (tally) => world.people[tally.candidatePersonId],
  );
  if (candidates.some((candidate) => !candidate)) return null;
  const shares =
    beat.runningBallotsCast > 0
      ? displayedSharePercents(
          beat.runningTallies.map((tally) => tally.voteShare),
        )
      : [];
  const final = beat.final;
  const campaign = campaignForCandidate(world, personId);
  const canSpeak =
    campaign?.contestId === contestId &&
    electionSpeechOpen(world, contestId, personId);
  const present = packet.participantPersonIds.filter(
    (id) => id !== personId && world.people[id],
  );
  const conversationPeople = present.filter(
    (id) =>
      projectPlayedSceneExchange(world, personId, id)?.contributions.length,
  );
  const selectedConversation = conversationPersonId
    ? conversationPeople.includes(conversationPersonId)
      ? conversationPersonId
      : null
    : null;

  const advance = (action: "next" | "skip") => {
    try {
      onWorldChange(
        recordElectionNightReportView(world, personId, contestId, action),
      );
      setFailure(null);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The returns could not be opened.",
      );
    }
  };
  const returnToGame = () => {
    try {
      onWorldChange(
        returnFromCouncilElectionNight(world, personId, packet.resultId),
      );
      setFailure(null);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "You could not leave the room.",
      );
    }
  };
  const speak = () => {
    try {
      onWorldChange(giveElectionSpeech(world, personId));
      setFailure(null);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The speech could not be recorded.",
      );
    }
  };

  return (
    <section
      aria-labelledby="council-election-night-title"
      data-testid="council-election-night"
      data-result-id={packet.resultId}
      data-source-record-ids={packet.sourceRecordIds.join(" ")}
    >
      <h2 id="council-election-night-title">Election night at home</h2>
      <p>
        {beat.reportedPrecincts} of {beat.totalPrecincts} precincts reported;{" "}
        {beat.runningBallotsCast.toLocaleString()} ballots counted.
      </p>
      <table aria-label="Running council election returns">
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Votes</th>
            {beat.runningBallotsCast > 0 ? <th scope="col">Share</th> : null}
          </tr>
        </thead>
        <tbody>
          {beat.runningTallies.map((tally, index) => {
            const candidate = candidates[index]!;
            return (
              <tr key={tally.candidatePersonId}>
                <th scope="row">{personName(candidate)}</th>
                <td>{tally.votes.toLocaleString()}</td>
                {beat.runningBallotsCast > 0 ? <td>{shares[index]}%</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {final ? (
        <p>Final unofficial returns name {packet.winnerName} as the winner.</p>
      ) : null}

      {present.length ? (
        <div
          aria-label="People here with you"
          data-testid="election-night-present-people"
        >
          <h3>People here with you</h3>
          {present.map((id) => (
            <PersonPortrait key={id} world={world} personId={id} size="small" />
          ))}
        </div>
      ) : null}

      {conversationPeople.length ? (
        <div
          aria-label="Conversations"
          data-testid="election-night-conversations"
        >
          {conversationPeople.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setConversationPersonId(id)}
            >
              Talk with {personName(world.people[id]!)}
            </button>
          ))}
        </div>
      ) : null}
      {selectedConversation ? (
        <SceneConversation
          world={world}
          playerPersonId={personId}
          subject="life-talk"
          addressee={selectedConversation}
          presentPersonIds={packet.participantPersonIds}
          onWorldChange={onWorldChange}
          onChange={() => {}}
          onBack={() => setConversationPersonId(null)}
        />
      ) : null}

      {failure ? <p role="alert">{failure}</p> : null}
      {!final ? (
        <div>
          <button
            type="button"
            data-testid="election-night-next"
            onClick={() => advance("next")}
          >
            Next returns
          </button>
          <button
            type="button"
            data-testid="election-night-skip"
            onClick={() => advance("skip")}
          >
            Skip to result
          </button>
        </div>
      ) : (
        <div>
          {canSpeak ? (
            <button
              type="button"
              data-testid="election-night-speech"
              onClick={speak}
            >
              Give your election speech
            </button>
          ) : null}
          <button
            type="button"
            data-testid="election-night-return"
            onClick={returnToGame}
          >
            Return to the campaign
          </button>
        </div>
      )}
    </section>
  );
}
