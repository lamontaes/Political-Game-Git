import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { advanceWorld } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { ensureMacroEconomyStarted } from "./producer";
import { startValuesFromLatents } from "./kernel";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import type { EntityId, World } from "../types";
import { createOrganization } from "../life";
import { recordWorldEvent } from "../world";
import { CHANGE_AUTHORED_IMPULSES } from "./policy";
import { macroScopeForJurisdiction } from "./readers";
import {
  recordWorldMetricState,
  worldMetricDefinitionByStableKey,
} from "../world-metrics";
import { monthStart, monthEnd, monthKeyOf } from "./store";
import { simulationMomentOnLocalDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { SeededRng, pickDistinct } from "../rng";

// Controlled aggregate-income fixture, not a simulation policy or coverage claim.
const TEST_PERSONAL_INCOME_MINOR = 5_000_000_000;

const SLOW = 900_000;
let opening: World;
let home: EntityId;
let playerId: EntityId;

// The consumer needs saved transfers and the canonical monthly macro clock,
// not an unrelated age-40 generated biography or the ordinary-life UI loop.
const registry = createCampaignElectionTransitionRegistry();
const passOrdinaryDays = (world: World, days: number) =>
  advanceWorld(world, days, registry);
beforeAll(() => {
  const place = pickDistinct(
    new SeededRng("public-money-origins"),
    lifePlaceStateIdentities(),
    1,
  )[0]!;
  const small = smallWorld({
    place: place.jurisdictionKey,
    seed: "public-money-origins",
    date: "2026-01-31",
  });
  opening = small.world;
  playerId = small.personId;
  home = stateJurisdictionForKey(place.jurisdictionKey)!.id;
  const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
  opening = ensureMacroEconomyStarted(opening, {
    contractVersion: "crunch46-macro-start/v1",
    policyVersion: "crunch46-provisional-v1",
    regime: "near-reference",
    volatilityScale: 0,
    latents,
    initial: startValuesFromLatents("near-reference", latents),
    effectiveDate: opening.currentDate,
  });
  // Anchor this controlled integration fixture at month end: the canonical
  // writer cannot admit a completed month's aggregate income before then.
  const month = monthKeyOf(opening.currentDate);
  opening = {
    ...opening,
    currentDate: monthEnd(month),
    currentMoment: simulationMomentOnLocalDate(
      opening.currentMoment,
      monthEnd(month),
    ),
  };
  opening = recordWorldMetricState(opening, {
    stableKey: "public-money-test:personal-income",
    metricId: worldMetricDefinitionByStableKey(
      opening,
      "income.aggregate-personal",
    ).id,
    scope: { jurisdictionId: home, segmentKey: null },
    referencePeriod: {
      kind: "interval",
      startsAt: monthStart(month),
      endsAt: monthEnd(month),
    },
    value: { kind: "money", money: money(TEST_PERSONAL_INCOME_MINOR, "USD") },
    recordedAt: opening.currentDate,
    provenance: {
      kind: "authored",
      note: "Controlled monthly personal-income total; not ordinary producer coverage.",
    },
    supersedesStateId: null,
  });
}, SLOW);

/**
 * One completed public transfer, written through the canonical money writers
 * with the basis the real producers use (`public-fiscal.ts` for a payment
 * under an enacted appropriation, `tax-policy.ts` for a collected levy). The
 * producers themselves are exercised in their own suites; this test is about
 * what the economy reads, and says so.
 */
function realizedPublicMoney(
  world: World,
  direction: "spending" | "taxes",
  minorUnits: number,
): World {
  const key = `public-money-test:${direction}:${minorUnits}`;
  // Taxes land in the modeled receipts account. A payment comes from a
  // government payer whose cash is not tracked here, so the test does not
  // have to invent the collections that funded it.
  let next =
    direction === "taxes"
      ? ensureTaxPublicAccount(world, home)
      : createOrganization(world, {
          stableKey: `${key}:payer`,
          formedAt: world.currentDate,
          provenance: { kind: "authored", note: "Test government payer." },
          initialProfile: {
            name: "Test public payer",
            classification: "sector:government",
            locationJurisdictionId: home,
          },
        });
  const account =
    direction === "taxes"
      ? publicTaxAccountForJurisdiction(next, home)!
      : { organizationId: next.history.organizations.at(-1)!.id };
  next = recordWorldEvent(next, {
    stableKey: `${key}:event`,
    type:
      direction === "spending" ? "fiscal.public-payment" : "tax.public-receipt",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: home,
    involvedEntityIds: [account.organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fiscal"],
    summary: "A test record of realized public money.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  const publicSide = {
    kind: "organization" as const,
    organizationId: account.organizationId,
  };
  const privateSide = { kind: "person" as const, personId: playerId };
  const amount = money(minorUnits, "USD");
  next = createResourceFlow(next, {
    stableKey: `${key}:flow`,
    source: direction === "spending" ? publicSide : privateSide,
    recipient: direction === "spending" ? privateSide : publicSide,
    startsAt: next.currentDate,
    amount,
    cadenceKind: "schedule:one-time",
    basisKind:
      direction === "spending"
        ? "custom:authorized-public-payment"
        : "custom:tax-collection",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:public-service",
    jurisdictionId: home,
    provenance: { kind: "simulated-event", eventId },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  return recordResourceTransferOutcome(next, {
    stableKey: `${key}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: amount,
    transferredAmount: amount,
    status: "completed",
    reasonKind: null,
    note: null,
    provenance: { kind: "simulated-event", eventId },
  });
}

const national = (w: World) =>
  JSON.stringify(
    w.macroEconomy!.months.filter((month) => month.scope === "national"),
  );

describe("realized public money reaches the economy", { timeout: SLOW }, () => {
  it("public spending paid lifts that place's own growth, not the nation's", () => {
    const amount = TEST_PERSONAL_INCOME_MINOR / 2;
    const plain = passOrdinaryDays(opening, 40);
    const spent = passOrdinaryDays(
      realizedPublicMoney(opening, "spending", amount),
      40,
    );
    const shock = spent.macroEconomy!.shocks.find(
      (s) => s.kind === "public-spending-paid",
    )!;
    expect(shock.scope).toBe(macroScopeForJurisdiction(home));
    expect(shock.intensity).toBeCloseTo(0.5, 6);
    expect(shock.signedMagnitude.growthPp).toBe(
      CHANGE_AUTHORED_IMPULSES["public-spending-paid"].growthPp,
    );
    expect(national(spent)).toBe(national(plain));
    const local = spent.macroEconomy!.months.find(
      (m) => m.scope === shock.scope,
    )!;
    const sameMonth = spent.macroEconomy!.months.find(
      (m) => m.scope === "national" && m.periodStart === local.periodStart,
    )!;
    expect(local.growthPct).toBeGreaterThan(sameMonth.growthPct);
    expect(local.shockKeys).toEqual([shock.key]);
  });

  it("tax collected takes demand out; it is never a windfall", () => {
    const taxed = passOrdinaryDays(
      realizedPublicMoney(opening, "taxes", TEST_PERSONAL_INCOME_MINOR * 3),
      40,
    );
    const shock = taxed.macroEconomy!.shocks.find(
      (s) => s.kind === "tax-collections-paid",
    )!;
    expect(shock.intensity).toBe(1);
    expect(shock.signedMagnitude.growthPp).toBeLessThan(0);
    const local = taxed.macroEconomy!.months.find(
      (m) => m.scope === shock.scope,
    )!;
    const sameMonth = taxed.macroEconomy!.months.find(
      (m) => m.scope === "national" && m.periodStart === local.periodStart,
    )!;
    expect(local.growthPct).toBeLessThan(sameMonth.growthPct);
  });

  it("records one shock per place, channel and month, exactly once", () => {
    const twice = realizedPublicMoney(
      realizedPublicMoney(opening, "spending", 1_000_000_00),
      "spending",
      2_000_000_00,
    );
    const later = passOrdinaryDays(twice, 70);
    const shocks = later.macroEconomy!.shocks.filter(
      (s) => s.kind === "public-spending-paid",
    );
    expect(shocks).toHaveLength(1);
    expect(shocks[0]!.intensity).toBeCloseTo(
      3_000_000_00 / TEST_PERSONAL_INCOME_MINOR,
      6,
    );
  });

  it("retains small positive recorded income shares", () => {
    const tiny = passOrdinaryDays(
      realizedPublicMoney(opening, "taxes", 1_000),
      40,
    );
    expect(
      tiny.macroEconomy!.shocks.some((s) => s.kind === "tax-collections-paid"),
    ).toBe(true);
  });
});
