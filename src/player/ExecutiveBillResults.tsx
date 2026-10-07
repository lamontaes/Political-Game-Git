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
      <ul className="office-desk-list">
        {results.map((result) => (
          <li key={result.matterId} data-testid="executive-bill-result">
            <strong>{`${result.designation}, ${result.shortTitle}`}</strong>
            {result.actionWindow ? (
              <time
                className="game-note"
                dateTime={result.actionWindow.lastActionDate}
              >
                {proseDate(result.actionWindow.lastActionDate)}
              </time>
            ) : null}
            {result.overrideForecast ? (
              <div data-testid="executive-override-forecast">
                <ul>
                  {result.overrideForecast.forums.map((forum) => (
                    <li
                      key={forum.forumKey}
                    >{`${forum.label} · ${forum.yea} · ${forum.required}`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.executiveActions.map((action) => (
              <p
                key={action.id}
              >{`${action.kind} · ${proseDate(action.occurredAt)}`}</p>
            ))}
            {result.itemVetoes.map((item) => (
              <p
                key={item.id}
                data-testid="executive-item-veto-result"
                data-reason={item.rationale}
              />
            ))}
            {result.overrideVotes.length ? (
              <div data-testid="executive-override-roll-calls">
                <ul>
                  {result.overrideVotes.map((vote) => (
                    <li
                      key={vote.id}
                    >{`${vote.forumLabel} · ${proseDate(vote.takenAt)} · ${vote.tally.yea} · ${vote.tally.nay} · ${vote.requiredVotes} · ${vote.outcome}`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.overrideActions.map((action) => (
              <p key={action.id} data-testid="executive-override-result">
                {action.kind}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
