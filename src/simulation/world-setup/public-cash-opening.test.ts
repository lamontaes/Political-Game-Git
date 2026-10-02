import { describe, expect, it } from "vitest";
import federalBudget from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { governmentUnitsForPlace } from "../government-units";
import { makeIsoDate } from "../dates";
import {
  budgetCandidates,
  openGovernmentBudget,
} from "../public-budgets/opening";
import { requireLifePlace } from "../life-places";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { ensureStateJurisdiction } from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import { canonicalStateJurisdictionId } from "../state-jurisdiction-id";
import { ensurePublicGovernmentAccount } from "../tax-policy";
import type { PublicGovernmentIdentity, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "./conditions";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  PUBLIC_CASH_OPENING_PROFILE_VERSION,
} from "./types";

const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;

function openingWorld(): World {
  const world = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "public-cash-opening-proof",
    placeKey: place.key,
    startAge: 34,
    questionnaire: "skipped",
  }).world;
  return ensureWorldStartingConditions(world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
}

function cashOpening(world: World, identity: PublicGovernmentIdentity) {
  const key =
    identity.kind === "local-government"
      ? `public-government:local:${encodeURIComponent(identity.governmentKey)}`
      : `public-government:${identity.jurisdictionId}`;
  const organization = world.history.organizations.find(
    (row) => row.stableKey === key,
  );
  return world.history.resourcePositions.find(
    (row) =>
      row.owner.kind === "organization" &&
      row.owner.organizationId === organization?.id &&
      row.openingBalance.currency === "USD",
  )?.openingBalance.minorUnits;
}

describe("researched and estimated opening public cash", () => {
  it("saves all fifty state amounts and materializes federal, state and local accounts once", () => {
    let world = openingWorld();
    const profile = worldOpeningRecord(world)?.publicCashOpening;
    expect(profile?.contractVersion).toBe(PUBLIC_CASH_OPENING_PROFILE_VERSION);
    expect(Object.keys(profile?.stateByJurisdictionId ?? {})).toHaveLength(50);

    world = ensureNationalElectionJurisdiction(world);
    world = ensureStateJurisdiction(world, "AK");
    world = ensureStateJurisdiction(world, "KY");
    const federal: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    };
    const alaska: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: canonicalStateJurisdictionId("US-AK")!,
    };
    const kentucky: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: canonicalStateJurisdictionId("US-KY")!,
    };
    const local: PublicGovernmentIdentity = {
      kind: "local-government",
      governmentKey: city.id,
      jurisdictionId: place.context.jurisdiction.id,
    };
    for (const identity of [federal, alaska, kentucky, local]) {
      world = ensurePublicGovernmentAccount(world, identity);
    }
    const candidates = budgetCandidates(world).candidates;
    const localAmounts: number[] = [];
    const stateRatios: number[] = [];
    for (const candidate of candidates) {
      const budget = openGovernmentBudget(
        world,
        candidate,
        makeIsoDate(world.currentDate),
      );
      if (typeof budget === "string") continue;
      const amount = Math.round((budget.balance + budget.reserve) * 100);
      if (candidate.level === "state") {
        if (candidate.jurisdictionId in profile!.stateByJurisdictionId) {
          stateRatios.push(
            (budget.balance + budget.reserve) /
              budget.years[0]!.appropriations.reduce(
                (sum, amount) => sum + amount,
                0,
              ),
          );
          expect(profile!.stateByJurisdictionId[candidate.jurisdictionId]).toBe(
            amount,
          );
        }
      } else localAmounts.push(amount);
    }
    expect(stateRatios).toHaveLength(50);
    expect(cashOpening(world, federal)).toBe(
      Math.round(
        federalBudget.outlaysTotal *
          (stateRatios.reduce((sum, ratio) => sum + ratio, 0) /
            stateRatios.length) *
          100,
      ),
    );
    expect(cashOpening(world, alaska)).toBe(
      profile!.stateByJurisdictionId[alaska.jurisdictionId],
    );
    expect(cashOpening(world, kentucky)).toBe(
      profile!.stateByJurisdictionId[kentucky.jurisdictionId],
    );
    expect(localAmounts.length).toBeGreaterThan(0);
    expect(cashOpening(world, local)).toBe(
      Math.round(
        localAmounts.reduce((sum, amount) => sum + amount, 0) /
          localAmounts.length,
      ),
    );

    const reloaded = deserializeWorld(serializeWorld(world));
    expect(worldOpeningRecord(reloaded)?.publicCashOpening).toEqual(profile);
    for (const identity of [federal, alaska, kentucky, local]) {
      expect(ensurePublicGovernmentAccount(reloaded, identity)).toBe(reloaded);
    }
  });

  it("keeps old openings at zero and rejects incomplete new profiles", () => {
    let legacy = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "public-cash-legacy-proof",
      placeKey: place.key,
    }).world;
    legacy = ensureNationalElectionJurisdiction(legacy);
    const federal: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    };
    legacy = ensurePublicGovernmentAccount(legacy, federal);
    expect(cashOpening(legacy, federal)).toBe(0);

    const current = openingWorld();
    const records = [...current.history.worldConditions!];
    const openingIndex = records.findIndex(
      (row) => row.kind === "world-opening",
    );
    const opening = records[openingIndex]!;
    if (opening.kind !== "world-opening" || !opening.publicCashOpening)
      throw new Error("Missing saved cash profile in test world.");
    const remaining = {
      ...opening.publicCashOpening.stateByJurisdictionId,
    };
    delete remaining[canonicalStateJurisdictionId("US-KY")!];
    records[openingIndex] = {
      ...opening,
      publicCashOpening: {
        ...opening.publicCashOpening,
        stateByJurisdictionId: remaining,
      },
    };
    expect(() =>
      assertWorldIntegrity({
        ...current,
        history: { ...current.history, worldConditions: records },
      }),
    ).toThrow("fictional public cash opening is invalid");
  });
});
