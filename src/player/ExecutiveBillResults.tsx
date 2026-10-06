import { projectExecutiveBillResults } from "../presentation/executive-bill-results";
import { proseDate } from "../presentation/prose-dates";
import type { EntityId, World } from "../simulation/types";

export function ExecutiveBillResults({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const results = projectExecutiveBillResults(world, personId);
  if (!results.length) return null;
  return (
    <section data-testid="executive-bill-results">
      <h4>Bills at this desk</h4>
      <ul className="office-desk-list">
        {results.map((result) => (
          <li key={result.matterId} data-testid="executive-bill-result">
            <strong>{`${result.designation}, ${result.shortTitle}`}</strong>
            {result.actionWindow ? (
              <p className="game-note">{`You may act through ${proseDate(result.actionWindow.lastActionDate)}.`}</p>
            ) : null}
            {result.overrideForecast ? (
              <div data-testid="executive-override-forecast">
                <p className="game-note">Override forecast, before a vote</p>
                <ul>
                  {result.overrideForecast.forums.map((forum) => (
                    <li
                      key={forum.forumKey}
                    >{`${forum.label}: ${forum.yea} expected yes; ${forum.required} needed.`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.executiveActions.map((action) => (
              <p
                key={action.id}
              >{`${action.kind === "signed" ? "Signed" : "Vetoed"} on ${proseDate(action.occurredAt)}.`}</p>
            ))}
            {result.itemVetoes.map((item) => (
              <p key={item.id} data-testid="executive-item-veto-result">
                {item.rationale}
              </p>
            ))}
            {result.overrideVotes.length ? (
              <div data-testid="executive-override-roll-calls">
                <p>Recorded override votes</p>
                <ul>
                  {result.overrideVotes.map((vote) => (
                    <li
                      key={vote.id}
                    >{`${vote.forumLabel}, ${proseDate(vote.takenAt)}: ${vote.tally.yea} yes, ${vote.tally.nay} no; ${vote.requiredVotes} needed. ${vote.outcome === "passed" ? "Passed" : "Failed"}.`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.overrideActions.map((action) => (
              <p key={action.id} data-testid="executive-override-result">
                {action.kind === "override-succeeded"
                  ? "The legislature overrode the veto."
                  : action.kind === "override-period-expired"
                    ? "The override period ended."
                    : "The override failed."}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
