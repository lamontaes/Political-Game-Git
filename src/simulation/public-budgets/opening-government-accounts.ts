import { makeIsoDate } from "../dates";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { ensurePublicGovernmentAccount } from "../tax-policy";
import type { World } from "../types";
import { worldOpeningRecord } from "../world-setup/conditions";
import { PUBLIC_CASH_OPENING_PROFILE_VERSION } from "../world-setup/types";
import { budgetCandidates, openGovernmentBudget } from "./opening";

/** Materializes the existing researched opening stock once, never a receipt. */
export function ensureOpeningGovernmentAccounts(world: World): World {
  let next = world;
  for (const candidate of budgetCandidates(world).candidates) {
    if (candidate.level !== "state") continue;
    const opening = openGovernmentBudget(
      world,
      candidate,
      makeIsoDate(world.currentDate),
    );
    if (typeof opening === "string") continue;
    const minorUnits = Math.round((opening.balance + opening.reserve) * 100);
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0)
      throw new Error(`Invalid researched opening cash for ${candidate.key}.`);
    next = ensureStateJurisdictionForKey(next, candidate.key);
    next = ensurePublicGovernmentAccount(
      next,
      {
        kind: "jurisdiction",
        jurisdictionId: candidate.jurisdictionId,
      },
      {
        amountMinorUnits: minorUnits,
        sourceNote: `ESTIMATED FROM RESEARCH: opening modeled public cash equals the existing general-fund balance plus rainy-day reserve estimate (${candidate.key}); not an observed treasury cash balance or tax receipt. Source: data/research/money/public-budget-bases.json, derived from government-budgets-2026.json (NASBO fiscal 2026). ${opening.openingNotes.filter((note) => /balance|reserve|island areas/i.test(note)).join(" ")}`,
      },
    );
  }
  // The nation's stock is an existing saved game assumption, not a new level.
  // Without that actual source record, a missing treasury remains unsupported.
  if (
    worldOpeningRecord(world)?.publicCashOpening?.contractVersion ===
    PUBLIC_CASH_OPENING_PROFILE_VERSION
  ) {
    next = ensureNationalElectionJurisdiction(next);
    next = ensurePublicGovernmentAccount(next, {
      kind: "jurisdiction",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    });
  }
  return next;
}
