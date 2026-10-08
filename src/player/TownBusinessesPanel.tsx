import type { EntityId, World } from "../simulation";
import { projectTownBusinesses } from "../presentation/town-businesses-view";
import { proseDate } from "../presentation/prose-dates";

/**
 * The businesses in the town the player lives in. A business that has closed
 * stays on the list, struck through, with the day it closed. Reads only.
 */
export function TownBusinessesPanel({
  world,
  jurisdictionId,
}: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
}) {
  const businesses = projectTownBusinesses(world, jurisdictionId);
  if (businesses.length === 0) return null;
  return (
    <section aria-label="Businesses in town" data-testid="town-businesses">
      <h4>Businesses in town</h4>
      <ol>
        {businesses.map((business) =>
          business.closed ? (
            <li
              key={business.organizationId}
              data-closed="true"
              data-closing-reason={business.closed.reason}
            >
              <del>{business.name}</del>{" "}
              <time dateTime={business.closed.on}>
                {proseDate(business.closed.on)}
              </time>
            </li>
          ) : (
            <li key={business.organizationId}>
              <strong>{business.name}</strong>
              {business.ownerLine && <> · {business.ownerLine}</>}
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
