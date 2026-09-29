import { projectPlaceConditions } from "../presentation/place-conditions";
import type { EntityId, World } from "../simulation";

/**
 * Politics → Issues → Conditions: how the player's state is doing on each
 * condition the world keeps, and what is moving it. A law the player helped
 * pass shows here by name beside the condition it moves. Reading it spends no
 * time and changes nothing.
 */
export function PlaceConditionsPanel({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const home = world.people[personId]?.homeJurisdictionId;
  const conditions = home ? projectPlaceConditions(world, home) : null;
  if (!conditions)
    return (
      <p className="game-note" data-testid="place-conditions-none">
        No conditions are kept for this place yet.
      </p>
    );
  return (
    <section className="pg-conditions" data-testid="place-conditions">
      <h3 className="pg-conditions-heading">
        How {conditions.placeName} is doing
      </h3>
      <ul className="pg-conditions-list">
        {conditions.rows.map((row) => (
          <li
            key={row.measure}
            className="pg-condition"
            data-testid={`place-condition-${row.measure}`}
          >
            <p className="pg-condition-name">{row.name}</p>
            <p className="pg-condition-values">
              <span data-testid="place-condition-now">{row.now}</span>
              <span className="pg-condition-start">
                {row.change === "steady"
                  ? `, the same as in ${row.startMonth}`
                  : `, ${row.change === "up" ? "up" : "down"} from ${row.atStart} in ${row.startMonth}`}
              </span>
            </p>
            {row.causes.length > 0 ? (
              <ul className="pg-condition-causes">
                {row.causes.map((cause) => (
                  <li
                    key={cause.label}
                    className={cause.law ? "pg-condition-law" : undefined}
                    data-testid={
                      cause.law
                        ? "place-condition-law"
                        : "place-condition-cause"
                    }
                  >
                    {cause.direction === "raised" ? "Raised" : "Lowered"}{" "}
                    {cause.size} by {cause.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
