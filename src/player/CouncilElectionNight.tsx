import type { EntityId, World } from "../simulation/types";
import {
  councilElectionNight,
  returnFromCouncilElectionNight,
} from "../presentation/election-night-scene";

/** Additive result block for the shared foreground. The room, cast, art,
 * spoken words and central turn recorder remain the shared scene's concern.
 */
export function CouncilElectionNight({
  world,
  playerPersonId,
  contestId,
  onWorldChange,
  onReturn,
}: {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly contestId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onReturn: () => void;
}) {
  const night = councilElectionNight(world, playerPersonId, contestId);
  if (!night) return null;
  return (
    <section
      aria-label="Council election result"
      data-testid="council-election-night"
      data-result-id={night.resultId}
    >
      <h2>{night.officeTitle}</h2>
      <p>Winner: {night.winnerName}</p>
      <table>
        <caption>Recorded election result</caption>
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Votes</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {night.tallies.map((row) => (
            <tr
              key={row.candidatePersonId}
              data-winner={row.candidatePersonId === night.winnerPersonId}
            >
              <th scope="row">{row.name ?? row.candidatePersonId}</th>
              <td>{row.votes.toLocaleString("en-US")}</td>
              <td>{row.displayedSharePercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          const next = returnFromCouncilElectionNight(
            world,
            playerPersonId,
            night.resultId,
          );
          onWorldChange(next);
          onReturn();
        }}
      >
        Return
      </button>
    </section>
  );
}
