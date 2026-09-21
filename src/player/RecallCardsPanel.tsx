import { useMemo } from "react";
import type { EntityId, World } from "../simulation";
import { projectRecallCards } from "../presentation/people-recall-cards";
import { projectContinuingLifeCards } from "../presentation/people-continuing-life";
import type { ShellRef } from "../presentation/shell-navigation";

/**
 * What this life can be expected to remember.
 *
 * The mount for PEOPLE's `projectRecallCards` seam (CRUNCH47 B1/P4). A card is
 * one thing somebody asked of them, or one thing they said, with the day it
 * happened. It is not a transcript and it reveals nothing: every card is
 * already the played person's own knowledge.
 *
 * Two rules this surface keeps:
 *
 * - The day is shown as `onSpoken`, the way a person says it. The ISO `on` is
 *   a key for sorting and is never drawn.
 * - A card's drilldown opens the existing person view through the shell's own
 *   `open-entity`, which pushes onto the navigation stack, so Back returns to
 *   the card that opened it. Where a card has no other person, there is no
 *   control rather than a dead one: this game has no ShellRef for a historical
 *   event, so an event-level drilldown has nothing to open.
 */
export function RecallCardsPanel({
  world,
  personId,
  onOpenEntity,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenEntity: (ref: ShellRef) => void;
}) {
  const cards = useMemo(
    () => projectRecallCards(world, personId),
    [world, personId],
  );
  const continuing = useMemo(
    () => projectContinuingLifeCards(world, personId),
    [world, personId],
  );
  return (
    <section
      className="pg-personal-section"
      data-testid="recall-cards"
      aria-labelledby="recall-cards-title"
    >
      <h3 id="recall-cards-title">What you remember</h3>
      {continuing.length > 0 ? (
        <section aria-labelledby="continuing-life-title">
          <h4 id="continuing-life-title">What’s open between you</h4>
          <ul className="pg-recall-list">
            {continuing.map((card) => (
              <li
                key={card.eventId}
                data-testid={`continuing-card-${card.eventId}`}
                data-kind={card.kind}
                data-open-question={card.openQuestion ? "true" : "false"}
              >
                <strong>{card.title}</strong>
                <span className="pg-recall-line">{card.onSpoken}</span>
                <span className="pg-recall-line">{card.detail}</span>
                {card.otherPersonId ? (
                  <button
                    type="button"
                    className="ui-action ui-action--subtle"
                    data-testid={`continuing-open-${card.eventId}`}
                    onClick={() =>
                      onOpenEntity({
                        kind: "person",
                        id: card.otherPersonId!,
                      })
                    }
                  >
                    Open {card.otherPersonName}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {cards.length === 0 ? (
        <p data-testid="recall-cards-empty">
          Nothing has been asked of you yet, and you have not gone on the record
          with anybody.
        </p>
      ) : (
        <ul className="pg-recall-list">
          {cards.map((card) => (
            <li
              key={card.eventId}
              data-testid={`recall-card-${card.eventId}`}
              data-kind={card.kind}
              data-open-question={card.openQuestion ? "true" : "false"}
            >
              <strong>{card.title}</strong>
              <span className="pg-recall-line">{card.onSpoken}</span>
              <span className="pg-recall-line">{card.detail}</span>
              {card.otherPersonId ? (
                <button
                  type="button"
                  className="ui-action ui-action--subtle"
                  data-testid={`recall-open-${card.eventId}`}
                  onClick={() =>
                    onOpenEntity({
                      kind: "person",
                      id: card.otherPersonId!,
                    })
                  }
                >
                  Open {card.otherPersonName}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
