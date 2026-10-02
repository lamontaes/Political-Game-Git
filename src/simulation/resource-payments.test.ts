import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { createOrganization } from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import { paymentFromDatedCash } from "./resource-payments";
import {
  createResourceFlows,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { ResourcePositionOwner } from "./types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled payment fixture; not observed income or a production clock receipt.",
};

const seed = "a58-shared-dated-cash-20261002";
const catalog = lifePlaceStateIdentities();
const cases = pickDistinct(new SeededRng(seed), catalog, 3).flatMap((place) =>
  (["person", "household", "organization"] as const).map((kind) => ({
    kind,
    place: place.jurisdictionKey,
  })),
);
describe.each(cases)("dated cash for $kind in $place", ({ kind, place }) => {
  function fixture() {
    expect(catalog).toHaveLength(56);
    const small = smallWorld({
      place,
      seed,
      date: "2026-01-01",
      household: true,
    });
    const world = createOrganization(small.world, {
      stableKey: "dated-cash:organization",
      formedAt: small.world.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Payment fixture",
        classification: "enterprise:retail",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    const payer: ResourcePositionOwner =
      kind === "person"
        ? { kind, personId: small.personId }
        : kind === "household"
          ? { kind, householdId: world.history.households.at(-1)!.id }
          : { kind, organizationId: world.history.organizations.at(-1)!.id };
    return { world, payer, small };
  }

  it("distinguishes unknown cash from recorded zero without writing", () => {
    const { payer, world: initial } = fixture();
    let world = initial;
    const before = serializeWorld(world);
    expect(
      paymentFromDatedCash(world, payer, money(100, "USD"), world.currentDate),
    ).toMatchObject({
      status: "blocked",
      availableMinor: null,
      reasonKind: "capacity:money-unknown",
    });
    expect(serializeWorld(world)).toBe(before);
    world = createResourcePosition(world, {
      stableKey: "dated-cash:position",
      owner: payer,
      openedAt: world.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    expect(
      paymentFromDatedCash(world, payer, money(100, "USD"), world.currentDate),
    ).toMatchObject({
      status: "missed",
      availableMinor: 0,
      reasonKind: "capacity:insufficient-funds",
    });
  });

  it.each(["2026-01-10", "2026-01-20"])(
    "retains an intervening expense after income on %s and save/reload",
    (incomeDate) => {
      const { payer, small, world: initial } = fixture();
      let world = initial;
      const other = {
        kind: "person" as const,
        personId: world.personOrder[1]!,
      };
      world = createResourcePosition(world, {
        stableKey: "dated-cash:position",
        owner: payer,
        openedAt: world.currentDate,
        openingBalance: money(100, "USD"),
        provenance,
      });
      for (const [key, day, source, recipient] of [
        ["expense", "2026-01-10", payer, other],
        ["income", incomeDate, other, payer],
      ] as const) {
        const date = makeIsoDate(day);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = createResourceFlows(world, [
          {
            stableKey: `dated-cash:${key}`,
            source,
            recipient,
            startsAt: date,
            amount: money(80, "USD"),
            cadenceKind: "schedule:once",
            basisKind: "custom:payment-fixture",
            basisReference: { kind: "general" },
            restrictionKind: null,
            jurisdictionId: small.jurisdictionId,
            provenance,
          },
        ]);
        world = recordResourceTransferOutcome(world, {
          stableKey: `dated-cash:${key}:paid`,
          resourceFlowId: world.history.resourceFlows.at(-1)!.id,
          periodStartsAt: date,
          periodEndsAt: date,
          occurredAt: date,
          status: "completed",
          attemptedAmount: money(80, "USD"),
          transferredAmount: money(80, "USD"),
          reasonKind: null,
          note: "Recorded fixture transfer.",
          provenance,
        });
      }
      const reopened = deserializeWorld(serializeWorld(world));
      const before = serializeWorld(reopened);
      const payment = paymentFromDatedCash(
        reopened,
        payer,
        money(100, "USD"),
        makeIsoDate("2026-01-05"),
      );
      expect(payment.status).toBe("partial");
      expect(payment.availableMinor).toBe(20);
      expect(payment.transferredAmount.minorUnits).toBe(20);
      expect(serializeWorld(reopened)).toBe(before);
    },
  );
});
