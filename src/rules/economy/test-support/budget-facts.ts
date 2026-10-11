/** Raw same-World records plus separately owned geography, authority and final-term receipts; no budget math preselection. */
import * as geo from "../../../simulation/government-units";
import * as place from "../../../simulation/life-places";
import * as municipal from "../../../simulation/municipal-government";
import { chiefExecutiveJurisdiction } from "../../../simulation/nationwide-world/government-jurisdiction";
import { placePopulation } from "../../../simulation/nationwide-world/place-population";
import { unincorporatedCountyJurisdictionIds } from "../../../simulation/nationwide-world/local-governments";
import { STATES } from "../../../simulation/state-reference";
import { NATIONAL_ELECTION_JURISDICTION } from "../../../simulation/national-election-geography";
import { mayAnswerQuestion } from "../../../simulation/governing/question-authority";
import { lawInForce } from "../../../simulation/governing/law-in-force";
import { readFinalEnactedLawTerm } from "../../../simulation/governing/final-law-term-query";
import { lawFacts } from "../../laws/test-support/law-facts";
import { authorityReceiptKey } from "../../laws/dated-law";
import { legalTermReceiptKey } from "../../laws/minimum-authority";
import { BUDGET_LAW_KEYS, BUDGET_ALLOCATION_TERM_KEYS } from "../budget-policy";
import { budgetAuthorityReceiptKey } from "../budget-fiscal";
import type {
  OpeningBudgetFacts,
  BudgetGeographyViews,
} from "../budget-opening";
import type { World, EntityId, IsoDate } from "../../../simulation/types";
const views: BudgetGeographyViews = {
  allGovernmentUnits: geo.allGovernmentUnits,
  countyGeoidsForPlace: geo.countyGeoidsForPlace,
  countyGovernmentUnit: geo.countyGovernmentUnit,
  governmentUnitJurisdictionId: geo.governmentUnitJurisdictionId,
  governmentUnitsForPlace: geo.governmentUnitsForPlace,
  governmentUnitsForState: geo.governmentUnitsForState,
  lifePlaceByJurisdictionId: place.lifePlaceByJurisdictionId,
  lifePlaceByKey: place.lifePlaceByKey,
  stateJurisdictionForKey: place.stateJurisdictionForKey,
  municipalGovernmentForPlaceGeoid: municipal.municipalGovernmentForPlaceGeoid,
  primaryReading: municipal.primaryReading,
  chiefExecutiveJurisdiction,
  placePopulation,
  states: STATES,
  federalId: NATIONAL_ELECTION_JURISDICTION.id,
};
export function budgetFacts(
  world: World,
  additionalIds: readonly EntityId[],
  dates: readonly IsoDate[],
  additionalQuestionKeys: readonly string[] = [],
): OpeningBudgetFacts {
  const questions = Object.values(world.policyCatalog.propositions).filter(
    (q) =>
      [...Object.values(BUDGET_LAW_KEYS), ...additionalQuestionKeys].includes(
        q.stableKey,
      ),
  );
  const laws = lawFacts(
    world,
    questions.map((q) => q.id),
    dates,
    [undefined],
  );
  const ids = [...new Set([...laws.counties.keys(), ...additionalIds])];
  const authority = new Map(laws.authority);
  const placeContexts = new Map(laws.placeContexts);
  const counties = new Map(laws.counties);
  const ownAuthority = new Map<string, boolean>();
  const finalTerms = new Map<
    string,
    ReturnType<typeof readFinalEnactedLawTerm>
  >();
  for (const id of ids) {
    const p = place.lifePlaceByJurisdictionId(id);
    if (p)
      placeContexts.set(id, { stateJurisdictionKey: p.stateJurisdictionKey });
    counties.set(id, unincorporatedCountyJurisdictionIds(id));
    for (const q of questions) {
      ownAuthority.set(
        budgetAuthorityReceiptKey(id, q.id),
        mayAnswerQuestion(world, id, q.id),
      );
      const name = (
        Object.keys(BUDGET_LAW_KEYS) as (keyof typeof BUDGET_LAW_KEYS)[]
      ).find((n) => BUDGET_LAW_KEYS[n] === q.stableKey)!;
      const termKey = name ? BUDGET_ALLOCATION_TERM_KEYS[name] : undefined;
      for (const date of dates) {
        authority.set(
          authorityReceiptKey(id, q.id, date, undefined),
          mayAnswerQuestion(world, id, q.id, date),
        );
        const law = lawInForce(world, id, q.id, date);
        // Native own-budget ordinances can outrank the general law reader. Supply every saved measure's compiler receipt without selecting the controlling ordinance.
        if (termKey)
          for (const enactment of world.history.legislativeEnactments ?? []) {
            const measure = world.history.legislativeMeasures?.find(
              (row) => row.id === enactment.measureId,
            );
            if (
              measure?.jurisdictionId !== id ||
              !(measure.propositionIds ?? []).includes(q.id)
            )
              continue;
            const savedLaw = {
              answer: "yes" as const,
              measureId: measure.id,
              level: "local-ordinance" as const,
              origin: "enacted" as const,
              operativeAt: enactment.effectiveAt ?? enactment.resolvedAt,
              operativeBasis: "enacted-date" as const,
            };
            const query = {
              questionKey: q.stableKey,
              termKey,
              unit: "ratio" as const,
              onDate: date,
            };
            finalTerms.set(
              legalTermReceiptKey(savedLaw, query),
              readFinalEnactedLawTerm(world, savedLaw, query),
            );
          }
        if (law && termKey) {
          const query = {
            questionKey: q.stableKey,
            termKey,
            unit: "ratio" as const,
            onDate: date,
          };
          finalTerms.set(
            legalTermReceiptKey(law, query),
            readFinalEnactedLawTerm(world, law, query),
          );
        }
      }
    }
  }
  return {
    jurisdictionOrder: world.jurisdictionOrder,
    jurisdictions: world.jurisdictions,
    views,
    fiscal: {
      laws: { ...laws, authority, placeContexts, counties },
      months: world.macroEconomy?.months ?? [],
      finalTerms,
      ownAuthority,
    },
  };
}
