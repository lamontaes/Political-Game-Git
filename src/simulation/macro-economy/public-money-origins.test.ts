import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { searchLifePlaces } from "../index";
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
import {
  CHANGE_AUTHORED_IMPULSES,
  UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS,
} from "./policy";
import { macroScopeForJurisdiction } from "./readers";

const SLOW = 900_000;
let opening: World;
let home: EntityId;
let playerId: EntityId;

// An Oregon life: the reader is jurisdiction-neutral, so the test says so.
beforeAll(() => {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "public-money-origins",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped" as const,
    }),
  ).game!;
  opening = game.world;
  playerId = game.playerPersonId;
  home = opening.people[playerId]!.homeJurisdictionId;
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
    const amount = UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS / 2;
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
      realizedPublicMoney(
        opening,
        "taxes",
        UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS * 3,
      ),
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
      3_000_000_00 / UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS,
      6,
    );
  });

  it("ignores amounts too small to register", () => {
    const tiny = passOrdinaryDays(
      realizedPublicMoney(opening, "taxes", 1_000),
      40,
    );
    expect(
      tiny.macroEconomy!.shocks.some((s) => s.kind === "tax-collections-paid"),
    ).toBe(false);
  });
});
