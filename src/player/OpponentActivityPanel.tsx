import { useMemo } from "react";

import "./campaign-workspace.css";
import { projectOpponentActivityPanel } from "../presentation/campaign-life-surface";
import type { EntityId, World } from "../simulation";

/**
 * What the other campaigns in this race have done in public, as far as this
 * person has heard. Only public steps the person actually learned of appear; a
 * rival's private plans and money never do, and neither do rivals from the
 * person's earlier races.
 */
export function OpponentActivityPanel({
  world,
  personId,
  campaignId,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly campaignId: EntityId;
}) {
  const rows = useMemo(
    () => projectOpponentActivityPanel(world, personId, campaignId),
    [world, personId, campaignId],
  );
  return (
    <section
      className="game-campaign-opponent-activity"
      data-testid="opponent-activity"
      aria-labelledby="opponent-activity-title"
    >
      <h3 id="opponent-activity-title">
        What the other campaigns have done (public)
      </h3>
      {rows.length === 0 ? (
        <p className="game-note" data-testid="opponent-activity-empty">
          You have not heard of anything the other campaigns in this race did in
          public yet.
        </p>
      ) : (
        <ul className="game-campaign-opponent-list">
          {rows.map((row) => (
            <li
              key={row.eventId}
              data-testid={`opponent-activity-${row.eventId}`}
            >
              <strong>{row.opponentName}</strong> · {row.kindLabel} ·{" "}
              {row.dateLabel}
              <span> — {row.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
