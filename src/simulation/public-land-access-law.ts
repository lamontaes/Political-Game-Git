import research from "../../data/research/laws/public-land-access.json" with { type: "json" };
import { policyTermsInForce } from "./governing/policy-bill-terms";
import { lifePlaceByJurisdictionId } from "./life-places";
import { townRoster } from "./living-world/town-residents";
import { SeededRng } from "./rng";
import type { EntityId, IsoDate, World } from "./types";
import type { PublicBudgetGovernment } from "./public-budgets/store";

export const PUBLIC_LAND_ACCESS_QUESTION =
  "us-policy-positions:agriculture-natural-resources.expand-public-land-access";
const places = research.places as Readonly<
  Record<
    string,
    {
      acresByAccess: Readonly<Record<string, number>>;
      population: number | null;
    }
  >
>;

export function publicLandAcres(stateKey: string, population: number): number {
  const held = places[stateKey];
  return held
    ? Object.values(held.acresByAccess).reduce((sum, acres) => sum + acres, 0)
    : population * research.nationalAcresPerResident;
}

/** A saved world's stable geography estimate; no individual's travel decision is drawn. */
export function nearbyPublicLandAcres(world: World, town: EntityId): number {
  const place = lifePlaceByJurisdictionId(town);
  const population = townRoster(town).population;
  const held = place?.stateJurisdictionKey
    ? places[place.stateJurisdictionKey]
    : undefined;
  const perResident = held?.population
    ? publicLandAcres(place!.stateJurisdictionKey!, held.population) /
      held.population
    : research.nationalAcresPerResident;
  const spread =
    research.nearbySpread[0]! +
    new SeededRng(`${world.seed}:public-land:${town}`).next() *
      (research.nearbySpread[1]! - research.nearbySpread[0]!);
  return population * perResident * spread;
}

/** New guest demand for an existing kind of town business, annual dollars. */
export function publicLandVisitorSales(
  world: World,
  town: EntityId,
  kind: string,
): number {
  const weight = (research.businessWeights as Readonly<Record<string, number>>)[
    kind
  ];
  if (weight === undefined) return 0;
  const reading = policyTermsInForce(
    world,
    town,
    PUBLIC_LAND_ACCESS_QUESTION,
    world.currentDate,
  );
  const fraction = reading?.terms?.values.accessIncreaseBasisPoints;
  if (fraction === undefined) return 0;
  const visits =
    ((nearbyPublicLandAcres(world, town) * fraction) / 10_000) *
    research.visitsPerAcreAnnual;
  return Math.round(visits * research.visitorSpendingCents * weight) / 100;
}

/** State management spending follows the bill's service acreage and annual price. */
export function publicLandManagementSpending(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
): number {
  if (government.level !== "state") return 0;
  const reading = policyTermsInForce(
    world,
    government.lawJurisdictionId,
    PUBLIC_LAND_ACCESS_QUESTION,
    month,
  );
  const terms = reading?.terms?.values;
  if (
    terms?.accessIncreaseBasisPoints === undefined ||
    terms.annualManagementCostPerAcreCents === undefined
  )
    return 0;
  return Math.round(
    (((publicLandAcres(government.stateKey, government.population) *
      terms.accessIncreaseBasisPoints) /
      10_000) *
      terms.annualManagementCostPerAcreCents) /
      100 /
      12,
  );
}
