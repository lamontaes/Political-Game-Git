import { dollars } from "../presentation/campaign-life-surface";
import { estimatedHouseholdLivingCostsAt } from "../simulation/cost-of-living";
import { money } from "../simulation/resources";
import type { EntityId, World } from "../simulation/types";

export function HouseholdLivingCostsPanel({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const costs = estimatedHouseholdLivingCostsAt(world, personId);
  if (!costs) return null;
  return (
    <section
      className="pg-personal-section"
      aria-label="Household costs"
      data-testid="household-living-costs"
      data-basis="ESTIMATED FROM AVERAGE"
    >
      <h3>Monthly household costs</h3>
      <ul>
        {costs.categories.map((category) => {
          const monthlyMinor = Math.round(
            ((category.annualMeanUsd * 100) / 12) *
              (costs.monthlyMinor / costs.averageMonthlyMinor),
          );
          return (
            <li key={category.key} data-category={category.key}>
              <strong>{category.label}</strong>
              <span>{dollars(money(monthlyMinor, "USD"))}</span>
              <small data-linked-measure={category.linkedMeasure}>
                Based on the national price index
              </small>
            </li>
          );
        })}
      </ul>
      <p>Household total: {dollars(money(costs.monthlyMinor, "USD"))}</p>
    </section>
  );
}
