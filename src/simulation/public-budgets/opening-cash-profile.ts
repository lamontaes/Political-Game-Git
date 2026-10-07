import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { canonicalStateJurisdictionId } from "../state-jurisdiction-id";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { lifePlaceByKey } from "../life-places";
import { municipalGovernments } from "../municipal-government";
import type { World } from "../types";
import {
  PUBLIC_CASH_OPENING_PROFILE_VERSION,
  type PublicCashOpeningProfile,
} from "../world-setup/types";
import {
  budgetCandidates,
  openGovernmentBudget,
  type BudgetCandidate,
} from "./opening";

/** Saves researched balance-plus-reserve estimates once at Begin. */
export function researchedPublicCashOpeningProfile(
  world: World,
): PublicCashOpeningProfile {
  const today = makeIsoDate(world.currentDate);
  const candidates = budgetCandidates(world).candidates;
  const cash = (candidate: BudgetCandidate): number | null => {
    const opening = openGovernmentBudget(world, candidate, today);
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
  // A world with no local government uses the available municipal-profile
  // cohort, each government's existing researched estimate counted once.
  if (localAmounts.length === 0) {
    localAmounts = municipalGovernments().flatMap((government) => {
      const place = government.placeGeoid
        ? lifePlaceByKey(government.placeGeoid)
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
  // Fifty state budgets are comparable annual government outlay estimates.
  // Average each state's cash/outlays ratio equally; do not weight by population.
  const stateCash = US_STATE_USPS.map((usps) => {
    const id = canonicalStateJurisdictionId(`US-${usps}`);
    if (!id) throw new Error(`Missing state identity for ${usps}.`);
    const candidate = candidates.find((row) => row.jurisdictionId === id);
    if (!candidate)
      throw new Error(`Missing researched opening cash for ${usps}.`);
    const opening = openGovernmentBudget(world, candidate, today);
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
    federal.outlaysTotal * averageStateCashToOutlays * 100,
  );
  if (!Number.isSafeInteger(federalMinorUnits) || federalMinorUnits <= 0)
    throw new Error("Invalid estimated federal opening cash.");
  return {
    contractVersion: PUBLIC_CASH_OPENING_PROFILE_VERSION,
    // ESTIMATED FROM AVERAGE: FY2025 federal outlays times the mean of
    // fifty state opening cash/outlays ratios; not observed Treasury cash.
    federalMinorUnits,
    stateByJurisdictionId: Object.fromEntries(
      stateCash.map(({ id, amount }) => [id, amount]),
    ),
    // ESTIMATED FROM AVERAGE: available local budget stocks, not receipts.
    localMinorUnits: Math.round(
      localAmounts.reduce((total, amount) => total + amount, 0) /
        localAmounts.length,
    ),
  };
}
