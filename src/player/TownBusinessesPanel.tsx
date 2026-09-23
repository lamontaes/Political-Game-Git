import type { EntityId, World } from "../simulation";
import { projectTownBusinesses } from "../presentation/town-businesses-view";

/** The businesses in the town the player lives in. Reads only. */
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
        {businesses.map((business) => (
          <li key={business.organizationId}>
            <strong>{business.name}</strong>
            {business.ownerLine && <> · {business.ownerLine}</>}.{" "}
            {business.staffLine}
          </li>
        ))}
      </ol>
    </section>
  );
}
