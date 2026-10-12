import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import { createOrganization } from "../../simulation/life";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "../../simulation/resources";
import { resourcePositionAt as nativePosition } from "../../simulation/resource-queries";
import {
  paymentFromDatedCash as nativePayment,
  createDatedCashPaymentReader as nativeReader,
} from "../../simulation/resource-payments";
import { resourcePositionAt, type CashFacts } from "./cash-positions";
import {
  paymentFromDatedCash,
  createDatedCashPaymentReader,
} from "./dated-cash";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit saved cash controls; not ordinary NPC payment or business finance.",
};
function facts(world: World): CashFacts {
  return {
    id: world.id,
    onDate: world.currentDate,
    records: {
      resourcePositions: world.history.resourcePositions,
      resourceFlows: world.history.resourceFlows,
      resourceTransferOutcomes: world.history.resourceTransferOutcomes,
      nextSequence: world.history.nextSequence,
    },
  };
}
function on(world: World, date: string): World {
  const currentDate = makeIsoDate(date);
  return {
    ...world,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      currentDate,
    ),
  };
}
describe("economy dated cash through unchanged public native readers on the same generated World", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:cash:" + usps,
      });
      const owner = { kind: "person" as const, personId: base.personId };
      const unknown = base.world.personOrder.find(
        (id) => id !== base.personId,
      )!;
      const currency = money(0, "USD").currency;
      let world = createOrganization(base.world, {
        stableKey: "rules2:cash:recipient",
        formedAt: base.world.currentDate,
        provenance,
        initialProfile: {
          name: "Controlled cash recipient",
          classification: "sector:private",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const recipient = {
        kind: "organization" as const,
        organizationId: world.history.organizations.at(-1)!.id,
      };
      world = createResourcePosition(world, {
        stableKey: "rules2:cash:position",
        owner,
        openedAt: world.currentDate,
        openingBalance: money(1000, "USD"),
        provenance,
      });
      world = createResourceFlow(world, {
        stableKey: "rules2:cash:flow",
        startsAt: world.currentDate,
        source: owner,
        recipient,
        basisKind: "custom:controlled-cash",
        basisReference: { kind: "general" },
        amount: money(700, "USD"),
        cadenceKind: "custom:controlled",
        restrictionKind: null,
        jurisdictionId: base.jurisdictionId,
        provenance,
      });
      const flow = world.history.resourceFlows.at(-1)!;
      const initial = world;
      const ownReader = createDatedCashPaymentReader(facts(world));
      const read = nativeReader(world);
      const savedOwn = resourcePositionAt(facts(world), owner, currency)!;
      const savedNative = nativePosition(world, owner, currency)!;
      for (const [index, date] of [
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
      ].entries()) {
        world = on(world, date);
        for (const payer of [
          owner,
          recipient,
          { kind: "person" as const, personId: unknown },
        ])
          for (const amount of [0, 1, 400, 1001])
            for (const due of [initial.currentDate, world.currentDate]) {
              expect(resourcePositionAt(facts(world), payer, currency)).toEqual(
                nativePosition(world, payer, currency),
              );
              expect(
                paymentFromDatedCash(
                  facts(world),
                  payer,
                  money(amount, "USD"),
                  due,
                ),
              ).toEqual(nativePayment(world, payer, money(amount, "USD"), due));
              expect(
                ownReader(facts(world), payer, money(amount, "USD"), due),
              ).toEqual(read(world, payer, money(amount, "USD"), due));
            }
        const paid = index === 0 ? 600 : index === 1 ? 300 : 0;
        world = recordResourceTransferOutcome(world, {
          stableKey: "rules2:cash:outcome:" + index,
          resourceFlowId: flow.id,
          periodStartsAt: world.currentDate,
          periodEndsAt: world.currentDate,
          occurredAt: world.currentDate,
          status: paid ? "partial" : "missed",
          attemptedAmount: money(700, "USD"),
          transferredAmount: money(paid, "USD"),
          reasonKind: "custom:controlled-cash",
          note: "Explicit partial/missed saved payment.",
          provenance,
        });
        const cutoffs = [
          {
            asOfDate: world.currentDate,
            historySequenceExclusive: world.history.nextSequence,
          },
          {
            asOfDate: initial.currentDate,
            historySequenceExclusive: world.history.nextSequence,
          },
          {
            asOfDate: world.currentDate,
            historySequenceExclusive: initial.history.nextSequence,
          },
        ];
        for (const cutoff of cutoffs)
          expect(
            resourcePositionAt(facts(world), owner, currency, cutoff),
          ).toEqual(nativePosition(world, owner, currency, cutoff));
        expect(savedOwn).toEqual(savedNative);
      }
      // A changed history/frontier falls back to an uncached read; no payment writer is duplicated.
      for (const branch of [
        initial,
        world,
        {
          ...world,
          history: {
            ...world.history,
            resourceTransferOutcomes: [
              ...initial.history.resourceTransferOutcomes,
            ],
          },
        },
      ])
        expect(
          ownReader(
            facts(branch),
            owner,
            money(1000, "USD"),
            initial.currentDate,
          ),
        ).toEqual(read(branch, owner, money(1000, "USD"), initial.currentDate));
    });
});
