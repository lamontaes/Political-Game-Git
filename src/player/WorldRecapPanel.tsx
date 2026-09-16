import "./world-orientation.css";

import { proseDate } from "../presentation/prose-dates";
import type { WorldRecap } from "../presentation/world-recap";
import type { EntityId } from "../simulation";

/**
 * A brief note of what changed while time passed.
 *
 * It sits beside the room rather than over it: routine news does not stop
 * play or open a conversation. Reading it changes nothing; "Got it" records
 * only that the player has caught up, through the sequence this recap was read
 * at, so anything that happens afterwards still gets its own note.
 */
export function WorldRecapPanel({
  recap,
  onDismiss,
  onOpenNews,
  onOpenPerson,
}: {
  readonly recap: WorldRecap;
  readonly onDismiss: (throughSequence: number) => void;
  readonly onOpenNews: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  return (
    <section
      className="pg-recap"
      aria-labelledby="pg-recap-title"
      data-testid="world-recap"
    >
      <h2 id="pg-recap-title" className="pg-recap-title">
        While you were away
      </h2>
      <ul className="pg-recap-list">
        {recap.entries.map((entry) => (
          <li
            key={entry.key}
            className="pg-recap-entry"
            data-testid={`recap-entry-${entry.eventId}`}
          >
            <p className="pg-recap-headline">{entry.headline}</p>
            <p className="pg-recap-meta">
              {proseDate(entry.at)}
              {entry.attribution ? ` · ${entry.attribution}` : ""}
              {entry.updates > 1 ? ` · ${entry.updates} updates` : ""}
            </p>
            {entry.people.length > 0 ? (
              <p className="pg-recap-people">
                {entry.people.slice(0, 3).map((person) => (
                  <button
                    key={person.personId}
                    type="button"
                    className="pg-link-button"
                    onClick={() => onOpenPerson(person.personId)}
                  >
                    {person.label}
                  </button>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="pg-recap-actions">
        {recap.more > 0 || recap.entries.some((entry) => entry.inNews) ? (
          <button
            type="button"
            className="ui-action"
            data-testid="recap-open-news"
            onClick={onOpenNews}
          >
            {recap.more > 0 ? `${recap.more} more in News` : "Open News"}
          </button>
        ) : null}
        <button
          type="button"
          className="ui-action ui-action--primary"
          data-testid="recap-dismiss"
          onClick={() => onDismiss(recap.throughSequence)}
        >
          Got it
        </button>
      </div>
    </section>
  );
}
