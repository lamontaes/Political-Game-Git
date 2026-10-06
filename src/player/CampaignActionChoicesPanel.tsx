import { useMemo, useState } from "react";
import {
  chooseCampaignWeekAction,
  projectCampaignWeekActions,
  type EntityId,
  type World,
} from "../simulation";
import { campaignLifeCatalogEntry } from "../simulation/campaign-life-catalog";
import { readableMoment } from "../presentation/campaign-life-surface";
import { displayMoney } from "../presentation/money-display";
import { proseDate } from "../presentation/prose-dates";

/** Campaign work offered as dated, hosted choices from the saved World. */
export function CampaignActionChoicesPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const view = useMemo(
    () => projectCampaignWeekActions(world, personId),
    [world, personId],
  );
  const [message, setMessage] = useState<string | null>(null);
  if (!view) return null;

  function book(choiceId: EntityId) {
    try {
      const next = chooseCampaignWeekAction(world, personId, {
        campaignId: view!.campaignId,
        choiceId,
        revision: view!.revision,
      });
      if (next === world) {
        setMessage("The calendar did not change. Review this week's choices.");
        return;
      }
      setMessage("Added to your calendar. Open the activity there to go.");
      onWorldChange(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section
      className="game-campaign-strategy game-campaign-action-choices"
      data-testid="campaign-action-choices"
      aria-labelledby="campaign-action-choices-title"
    >
      <h3 id="campaign-action-choices-title">Campaign choices this week</h3>
      <p>
        {proseDate(view.weekStart)} through {proseDate(view.weekEnd)}
      </p>
      {view.proposerName ? <p>Campaign staff: {view.proposerName}</p> : null}
      <p>Committee balance: {displayMoney(view.committeeTreasury)}</p>
      {view.committeeTreasury.minorUnits === 0 ? (
        <p>
          The committee opened with no money. Its balance rises when it receives
          a contribution.
        </p>
      ) : null}
      {view.choices.length === 0 ? (
        <p data-testid="campaign-action-choices-empty">
          {view.availabilityReason === "needs-host" ? (
            <>
              No one has agreed to host campaign work yet. Ask a local chapter
              organizer for support in{" "}
              <a href="#party-work-title">Party and community work</a>.
            </>
          ) : view.availabilityReason === "calendar-full" ? (
            "No campaign activity fits the open calendar this week."
          ) : (
            "No campaign activity is offered this week."
          )}
        </p>
      ) : (
        <ul className="game-campaign-action-list">
          {view.choices.map((choice) => (
            <li key={choice.id} data-testid={`campaign-choice-${choice.form}`}>
              <h4>{campaignLifeCatalogEntry(choice.form).title}</h4>
              <p>
                With {choice.hostName} · {choice.organizationName}
              </p>
              <p>At {choice.place}</p>
              <p>
                {readableMoment(choice.start)} to {readableMoment(choice.end)}
              </p>
              {/* The recorded campaign-life choice has no cash cost. */}
              {choice.outboundTravelMinutes > 0 ? (
                <p>
                  A {choice.outboundTravelMinutes}-minute journey there is
                  included when you go.
                </p>
              ) : null}
              <button
                type="button"
                className="ui-action ui-action--primary"
                data-testid={`campaign-book-${choice.form}`}
                onClick={() => book(choice.id)}
              >
                Put on calendar
              </button>
            </li>
          ))}
        </ul>
      )}
      {view.recentResults.length > 0 ? (
        <section
          aria-label="Recent campaign activity"
          data-testid="campaign-recent-results"
        >
          <h4>What happened</h4>
          <ul className="game-campaign-action-results">
            {view.recentResults.map((result) => (
              <li key={result.activityId}>
                <strong>{campaignLifeCatalogEntry(result.form).title}</strong>
                <p>Held {proseDate(result.completedAt)}.</p>
                {result.contactNames.length > 0 ? (
                  <p>
                    {result.form === "door-canvass" ||
                    result.form === "phone-shift"
                      ? "Worked with"
                      : "Met"}
                    : {result.contactNames.join(", ")}
                  </p>
                ) : null}
                {result.fieldReach?.estimatedCompletedConversations ? (
                  <p data-testid={`campaign-result-reach-${result.activityId}`}>
                    Estimated conversations:{" "}
                    {result.fieldReach.estimatedCompletedConversations.min}–
                    {result.fieldReach.estimatedCompletedConversations.max}
                  </p>
                ) : null}
                {result.raisedAmount !== null ? (
                  <p>Raised: {displayMoney(result.raisedAmount)}</p>
                ) : result.form === "fundraiser" ? (
                  <p>
                    No contribution was received by the committee at this
                    gathering.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
