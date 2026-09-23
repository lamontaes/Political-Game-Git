import { useState } from "react";

import type { EntityId, World } from "../simulation";
import type { OfficeTransitionView } from "../presentation/office-transition";
import { attendOfficeTransitionService } from "../presentation/office-transition";
import { proseDate } from "../presentation/prose-dates";

export interface OfficeTransitionPanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly transition: OfficeTransitionView;
  readonly onWorldChange: (world: World) => void;
}

/**
 * Between the result and the term: what the winner is called, when the term
 * begins, and the services open before then. Attending one is the only write.
 */
export function OfficeTransitionPanel({
  world,
  personId,
  transition,
  onWorldChange,
}: OfficeTransitionPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const days = transition.daysUntilStart;
  return (
    <div data-testid="office-transition">
      <p className="game-note">
        You won on {proseDate(transition.electedOn)} and are{" "}
        {transition.electTitle}. The term begins{" "}
        {proseDate(transition.startsAt)},{" "}
        {days === 1 ? "tomorrow" : `in ${days} days`}. Until then the office and
        its powers are not yours. {transition.entry}
      </p>
      {transition.qualification === "blocked" ? (
        <p className="game-note" data-testid="office-transition-qualify">
          A requirement of the office is not met, and until it is you cannot
          take it up. Campaigns says which.
        </p>
      ) : null}
      {transition.services.length > 0 ? (
        <ul className="office-transition-services">
          {transition.services.map((service) => (
            <li
              key={service.key}
              data-testid={`office-transition-service-${service.key}`}
            >
              <strong>{service.title}</strong>
              <p>{service.description}</p>
              <p className="game-note">
                {service.status === "attended"
                  ? "You went."
                  : service.status === "missed"
                    ? `It closed on ${proseDate(service.closesOn)} without you.`
                    : service.status === "upcoming"
                      ? `Opens ${proseDate(service.opensOn)}, until ${proseDate(service.closesOn)}.`
                      : `Open until ${proseDate(service.closesOn)}.`}
              </p>
              {service.status === "open" ? (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      onWorldChange(
                        attendOfficeTransitionService(
                          world,
                          personId,
                          service.key,
                        ),
                      );
                      setError(null);
                    } catch (caught) {
                      setError(
                        caught instanceof Error ? caught.message : "Refused.",
                      );
                    }
                  }}
                >
                  Attend
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="game-note">
          The term begins too soon for anything to be arranged before it.
        </p>
      )}
      {error ? (
        <p className="game-note" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
