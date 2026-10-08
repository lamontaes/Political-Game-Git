import environmentalLawLandings from "../../../data/research/outcome-web/environment-law-landings.json" with { type: "json" };
import { lawInForce } from "../governing/law-in-force";
import { recordLawExposure } from "../law-exposure";
import type { EntityId, World } from "../types";
import { outcomeFactor } from ".";

/**
 * Give each resident one record when a place's measured environmental outcome
 * first moves because of an in-force law. The shared place measure is the
 * evidence: these are public exposure changes, not a claim about an
 * individual's home, purchases, or medical history.
 */
export function recordEnvironmentEnergyLandings(
  world: World,
  sourceRecordId: EntityId,
): World {
  let next = world;
  const peopleByJurisdiction = new Map<EntityId, EntityId[]>();
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person) continue;
    const residents = peopleByJurisdiction.get(person.homeJurisdictionId) ?? [];
    residents.push(personId);
    peopleByJurisdiction.set(person.homeJurisdictionId, residents);
  }
  const propositions = new Map(
    Object.values(world.policyCatalog.propositions).map((row) => [
      row.stableKey,
      row,
    ]),
  );
  for (const [jurisdictionId, residents] of peopleByJurisdiction) {
    for (const landing of environmentalLawLandings.rows) {
      const proposition = propositions.get(landing.questionKey);
      if (!proposition) continue;
      const cause = outcomeFactor(
        next,
        jurisdictionId,
        landing.outcome,
        next.currentDate,
      ).causes.find((row) => row.key === landing.causeKey);
      if (!cause || cause.factor === 1) continue;
      const law = lawInForce(
        next,
        jurisdictionId,
        proposition.id,
        next.currentDate,
      );
      if (!law) continue;
      for (const personId of residents) {
        next = recordLawExposure(next, {
          stableKey: `environment-law:${law.measureId}:${landing.causeKey}:${personId}`,
          personId,
          measureId: law.measureId,
          channel: "environmental-condition",
          direction: cause.factor < 1 ? "gain" : "cost",
          amount: null,
          cadence: null,
          sourceRecordId,
          includeFamily: false,
        });
      }
    }
  }
  return next;
}
