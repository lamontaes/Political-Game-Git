/** Test-only raw source records and separately owned legal/life/resource-query receipts; no economy math preselection. */
import { lifePlaceByJurisdictionId } from "../../../simulation/life-places";
import { countyGeoidsForPlace } from "../../../simulation/government-units";
import {
  resourceFlowTermsAt,
  activeHousingTenuresAt,
} from "../../../simulation/resource-queries";
import { householdMembershipsAt } from "../../../simulation/life-queries";
import { COUNTY_HOME_VALUE_ROWS } from "../../../simulation/county-home-value.generated";
import source from "../../../../data/research/housing/nar-2025-down-payments.json";
import { lawFacts } from "../../laws/test-support/law-facts";
import { HOUSING_SUPPLY_LAWS } from "../housing-prices";
import { downPaymentReceiptKey, type DownPaymentFacts } from "../down-payments";
import type { HomePurchaseFacts } from "../home-purchase-records";
import type { World, IsoDate } from "../../../simulation/types";
export function downFacts(world: World): DownPaymentFacts {
  const dates = [
    ...new Set(world.history.resourceObligations.map((d) => d.establishedAt)),
  ];
  const terms = new Map();
  for (const flow of world.history.resourceFlows)
    for (const asOfDate of dates)
      terms.set(
        downPaymentReceiptKey(flow.id, asOfDate, world.history.nextSequence),
        resourceFlowTermsAt(world, flow.id, {
          asOfDate,
          historySequenceExclusive: world.history.nextSequence,
        }),
      );
  return {
    onDate: world.currentDate,
    nextSequence: world.history.nextSequence,
    memberships: world.history.householdMemberships,
    tenures: world.history.housingTenures,
    obligations: world.history.resourceObligations,
    flows: world.history.resourceFlows,
    outcomes: world.history.resourceTransferOutcomes,
    terms,
    source,
  };
}
export function housingFacts(
  world: World,
  additionalDates: readonly IsoDate[] = [],
): HomePurchaseFacts {
  const dates = [
    ...new Set([
      world.currentDate,
      ...(world.macroEconomy?.months ?? []).map((m) => m.recordedAt),
      ...additionalDates,
    ]),
  ];
  const questions = Object.values(world.policyCatalog.propositions)
    .filter((q) =>
      (HOUSING_SUPPLY_LAWS as readonly string[]).includes(q.stableKey),
    )
    .map((q) => q.id);
  const laws = lawFacts(world, questions, dates, [undefined]);
  const ids = [
    ...new Set([
      ...world.jurisdictionOrder,
      ...world.personOrder.map((id) => world.people[id]!.homeJurisdictionId),
    ]),
  ];
  const places = new Map(ids.map((id) => [id, lifePlaceByJurisdictionId(id)]));
  const geoids = [...places.values()].flatMap((p) =>
    p?.sourceGeoid ? [p.sourceGeoid] : [],
  );
  return {
    onDate: world.currentDate,
    control: world.control,
    people: world.people,
    memberships: new Map(
      world.personOrder.map((id) => [id, householdMembershipsAt(world, id)]),
    ),
    activeTenures: new Map(
      dates.map((asOfDate) => [
        JSON.stringify([asOfDate, world.history.nextSequence]),
        activeHousingTenuresAt(world, {
          asOfDate,
          historySequenceExclusive: world.history.nextSequence,
        }),
      ]),
    ),
    places,
    cash: {
      id: world.id,
      onDate: world.currentDate,
      records: {
        nextSequence: world.history.nextSequence,
        resourcePositions: world.history.resourcePositions,
        resourceFlows: world.history.resourceFlows,
        resourceTransferOutcomes: world.history.resourceTransferOutcomes,
      },
    },
    prices: { months: world.macroEconomy?.months ?? [], laws },
    values: {
      countyRows: COUNTY_HOME_VALUE_ROWS,
      places,
      countiesByGeoid: new Map(geoids.map((g) => [g, countyGeoidsForPlace(g)])),
    },
    down: downFacts(world),
    mortgage: { onDate: world.currentDate, store: world.macroEconomy },
  };
}
