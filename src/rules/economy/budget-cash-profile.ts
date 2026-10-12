// STOPGAP: economy.public-opening-cash-cohort Equal-state cash/outlay ratios scale the federal outlay source; local stocks use an unweighted researched cohort mean and national fallback.
/** Full retained researched public opening-cash source aggregation, including the no-local-government source cohort fallback. */
import { makeIsoDate } from "../../simulation/dates";
import {
  budgetCandidates,
  openGovernmentBudget,
  type OpeningBudgetFacts,
} from "./budget-opening";
import type { EntityId, IsoDate } from "../../simulation/types";
import type { BudgetCandidate } from "../../simulation/public-budgets/opening";
import type { PublicCashOpeningProfile } from "../../simulation/world-setup/types";
import type { municipalGovernments } from "../../simulation/municipal-government";
export interface PublicCashProfileFacts {
  readonly onDate: IsoDate;
  readonly opening: OpeningBudgetFacts;
  readonly municipalGovernments: ReturnType<typeof municipalGovernments>;
  readonly stateUsps: readonly string[];
  readonly stateIds: ReadonlyMap<string, EntityId | null>;
  readonly federalOutlays: number;
  readonly contractVersion: PublicCashOpeningProfile["contractVersion"];
}
export function researchedPublicCashOpeningProfile(
  facts: PublicCashProfileFacts,
): PublicCashOpeningProfile {
  const today = makeIsoDate(facts.onDate);
  const candidates = budgetCandidates(facts.opening).candidates;
  const cash = (candidate: BudgetCandidate): number | null => {
    const opening = openGovernmentBudget(facts.opening, candidate, today);
    if (typeof opening === "string") return null;
    const amount = Math.round((opening.balance + opening.reserve) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error(`Invalid researched opening cash for ${candidate.key}.`);
    return amount;
  };
  let localAmounts = candidates
    .filter((candidate) => candidate.level !== "state")
    .map(cash)
    .filter((amount): amount is number => amount !== null);
  if (localAmounts.length === 0) {
    localAmounts = facts.municipalGovernments.flatMap((government) => {
      const place = government.placeGeoid
        ? facts.opening.views.lifePlaceByKey(government.placeGeoid)
        : null;
      if (!place?.stateJurisdictionKey) return [];
      const amount = cash({
        key: `place:${government.placeGeoid}`,
        jurisdictionId: place.context.jurisdiction.id,
        lawJurisdictionId: place.context.jurisdiction.id,
        level: "city",
        name: government.displayName,
        stateKey: place.stateJurisdictionKey,
        geoid: government.placeGeoid,
      });
      return amount === null ? [] : [amount];
    });
  }
  if (localAmounts.length === 0)
    throw new Error("No researched local opening estimates are available.");
  const stateCash = facts.stateUsps.map((usps) => {
    const id = facts.stateIds.get(usps);
    if (!id) throw new Error(`Missing state identity for ${usps}.`);
    const candidate = candidates.find((row) => row.jurisdictionId === id);
    if (!candidate)
      throw new Error(`Missing researched opening cash for ${usps}.`);
    const opening = openGovernmentBudget(facts.opening, candidate, today);
    if (typeof opening === "string") throw new Error(opening);
    const outlays = opening.years[0]!.appropriations.reduce(
      (total, amount) => total + amount,
      0,
    );
    const amount = cash(candidate);
    if (amount === null || !Number.isFinite(outlays) || outlays <= 0)
      throw new Error(`Invalid researched cash/outlays ratio for ${usps}.`);
    return { id, amount, ratio: (opening.balance + opening.reserve) / outlays };
  });
  const averageStateCashToOutlays =
    stateCash.reduce((total, state) => total + state.ratio, 0) /
    stateCash.length;
  const federalMinorUnits = Math.round(
    facts.federalOutlays * averageStateCashToOutlays * 100,
  );
  if (!Number.isSafeInteger(federalMinorUnits) || federalMinorUnits <= 0)
    throw new Error("Invalid estimated federal opening cash.");
  return {
    contractVersion: facts.contractVersion,
    federalMinorUnits,
    stateByJurisdictionId: Object.fromEntries(
      stateCash.map(({ id, amount }) => [id, amount]),
    ),
    localMinorUnits: Math.round(
      localAmounts.reduce((total, amount) => total + amount, 0) /
        localAmounts.length,
    ),
  };
}
