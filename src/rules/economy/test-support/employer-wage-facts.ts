import { lifePlaceByJurisdictionId } from "../../../simulation/life-places";
import { countyGeoidsForPlace } from "../../../simulation/government-units";
import * as source from "../../../simulation/living-world/town-pay.generated";
import { TOWN_JOB_SOC } from "../../../simulation/living-world/town-job-soc";
import { workRoleAt, workStatusAt } from "../../../simulation/life-queries";
import { resourceFlowTermsAt } from "../../../simulation/resource-queries";
import { recordedPayReceiptKey, type RecordedPayFacts } from "../recorded-pay";
import type { EmployerWageFacts } from "../employer-wage";
import type { WageSourceFacts } from "../wage-source";
import type { World } from "../../../simulation/types";
export function employerWageFacts(world: World): EmployerWageFacts {
  const places = new Map(
    world.jurisdictionOrder.map((id) => [id, lifePlaceByJurisdictionId(id)]),
  );
  const wage: WageSourceFacts = {
    places,
    counties: new Map(
      [...places.values()].flatMap((p) =>
        p?.sourceGeoid
          ? [[p.sourceGeoid, countyGeoidsForPlace(p.sourceGeoid)] as const]
          : [],
      ),
    ),
    countyAreas: source.TOWN_PAY_COUNTY_AREAS,
    occupations: TOWN_JOB_SOC,
    percentiles: source.TOWN_PAY_PERCENTILES,
    minimumWages: source.TOWN_MINIMUM_WAGES,
    federalMinimum: source.FEDERAL_MINIMUM_HOURLY,
  };
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const pay: RecordedPayFacts = {
    onDate: world.currentDate,
    nextSequence: world.history.nextSequence,
    work: world.history.workRelationships,
    flows: world.history.resourceFlows,
    roles: new Map(
      world.history.workRelationships.map((w) => [
        recordedPayReceiptKey(w.id, cutoff),
        workRoleAt(world, w.id, cutoff) ?? null,
      ]),
    ),
    statuses: new Map(
      world.history.workRelationships.map((w) => [
        recordedPayReceiptKey(w.id, cutoff),
        workStatusAt(world, w.id, cutoff) ?? null,
      ]),
    ),
    terms: new Map(
      world.history.resourceFlows.map((f) => [
        recordedPayReceiptKey(f.id, cutoff),
        resourceFlowTermsAt(world, f.id, cutoff) ?? null,
      ]),
    ),
  };
  return { wage, pay };
}
