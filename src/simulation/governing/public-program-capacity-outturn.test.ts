import { describe, expect, it } from "vitest";

import { addDays } from "../dates";
import { money } from "../resources";
import { advanceWorld } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { eventById } from "../event-index";
import type {
  PublicProgramCapacityOutturnContext,
  PublicProgramCapacityOutturnReceiverRegistration,
} from "../public-program-capacity-outturn";
import { publicProgramRecords } from "../public-program-integrity";
import type {
  FutureTransitionHandlerRegistry,
  FutureTransitionKey,
  World,
} from "../types";
import {
  commitPublicProgram,
  declareProgramCapacity,
  PUBLIC_PROGRAM_DELIVERY,
  PUBLIC_PROGRAM_INSTALLMENT,
  programDeliveryHandler,
  programInstallmentHandler,
  recordProgramAppropriation,
} from "./public-program";
import { programOperatorOrganization } from "./program-governing";
import {
  FIXTURE,
  PARKS,
  city,
} from "../../../tests/fixtures/public-program-fixture";

const UNIT_COST = money(150_000_00, "USD");

function fixture(
  seed: string,
  options: {
    readonly amount?: number;
    readonly afterDays?: number;
    readonly availableCash?: number;
    readonly capacity?: boolean;
    readonly deliveryLeadDays?: number | null;
    readonly restorationCostPerUnit?: typeof UNIT_COST | null;
  } = {},
) {
  const g = city(seed, options.availableCash ?? 2_500_000_00);
  let world = g.world;
  if (options.capacity !== false)
    world = declareProgramCapacity(world, {
      edition: `${seed}:capacity`,
      programKey: PARKS,
      jurisdictionId: g.jurisdictionId,
      serviceLabel: "Neighborhood park maintenance",
      unitLabel: "park sections",
      unitsTotal: 10,
      unitsOperational: 8,
      monthlyOperatingNeed: money(1_000_00, "USD"),
      completedPermille: null,
      restorationCostPerUnit:
        options.restorationCostPerUnit === undefined
          ? UNIT_COST
          : options.restorationCostPerUnit,
      basis: FIXTURE,
    }).world;
  const appropriation = recordProgramAppropriation(world, {
    edition: `${seed}:appropriation`,
    programKey: PARKS,
    jurisdictionId: g.jurisdictionId,
    accountOrganizationId: g.account,
    amount: money(200_000_00, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 30),
    basis: FIXTURE,
  });
  const operator = programOperatorOrganization(
    appropriation.world,
    PARKS,
    g.jurisdictionId,
  );
  const committed = commitPublicProgram(operator.world, {
    appropriationId: appropriation.id,
    alternative: {
      key: `${seed}:repair`,
      title: "Repair neighborhood parks",
      installments: [
        {
          afterDays: options.afterDays ?? 0,
          amount: money(options.amount ?? 150_000_00, "USD"),
          purpose: "maintenance",
        },
      ],
      deliveryLeadDays: options.deliveryLeadDays ?? null,
    },
    personId: g.manager,
    office: { kind: "municipal", governmentKey: g.governmentKey },
    recipientOrganizationId: operator.organizationId,
  });
  if (!committed.ok) throw new Error(committed.reason);
  return {
    ...g,
    world: committed.world,
    commitmentId: committed.recordId,
    appropriationId: appropriation.id,
  };
}

function observingReceivers(
  order: string[],
  contexts: PublicProgramCapacityOutturnContext[],
): readonly PublicProgramCapacityOutturnReceiverRegistration[] {
  return [
    {
      key: "first",
      receive(world, context) {
        order.push("first");
        contexts.push(context);
        return world;
      },
    },
    {
      key: "second",
      receive(world) {
        order.push("second");
        return world;
      },
    },
  ];
}

function registryWithReceivers(
  receivers: readonly PublicProgramCapacityOutturnReceiverRegistration[],
): FutureTransitionHandlerRegistry {
  const base = createCampaignElectionTransitionRegistry();
  return {
    ...base,
    get(key: FutureTransitionKey) {
      if (key === PUBLIC_PROGRAM_INSTALLMENT)
        return (world, due) => programInstallmentHandler(world, due, receivers);
      if (key === PUBLIC_PROGRAM_DELIVERY)
        return (world, due) => programDeliveryHandler(world, due, receivers);
      return base.get(key);
    },
  };
}

function installmentDue(world: World, commitmentId: string) {
  const commitment = publicProgramRecords(world).find(
    (record) => record.kind === "commitment" && record.id === commitmentId,
  );
  if (!commitment || commitment.kind !== "commitment")
    throw new Error("The fixture commitment was not saved.");
  const due = world.history.futureDueItems.find(
    (item) => item.stableKey === `${commitment.stableKey}:installment:0`,
  );
  if (!due) throw new Error("The fixture installment due item was not saved.");
  return due;
}

describe("public program capacity outturn receivers", () => {
  it("dispatches the exact saved immediate outturn once in registration order", () => {
    const order: string[] = [];
    const contexts: PublicProgramCapacityOutturnContext[] = [];
    const receivers = observingReceivers(order, contexts);
    const g = fixture("outturn-receiver-immediate", { afterDays: 1 });
    const due = installmentDue(g.world, g.commitmentId);
    const settled = advanceWorld(g.world, 1, registryWithReceivers(receivers));
    const installment = publicProgramRecords(settled).find(
      (record) =>
        record.kind === "installment" && record.commitmentId === g.commitmentId,
    )!;
    const outturn = publicProgramRecords(settled).find(
      (record) =>
        record.kind === "capacity-outturn" &&
        record.installmentId === installment.id,
    );
    const context = contexts[0]!;

    expect(order).toEqual(["first", "second"]);
    expect(context.outturn).toEqual(outturn);
    expect(context.commitment.id).toBe(g.commitmentId);
    expect(context.installment.id).toBe(installment.id);
    expect(context.appropriation.id).toBe(g.appropriationId);
    expect(context.commitment.appropriationId).toBe(context.appropriation.id);
    expect(context.sourceMeasureId).toBeNull();
    expect(context.eventDate).toBe(
      eventById(settled, outturn!.eventId)!.occurredAt,
    );
    expect(context.eventDate).toBe(installment.recordedAt);

    programInstallmentHandler(settled, due, receivers);
    expect(order).toEqual(["first", "second"]);
  });

  it("dispatches the scheduled delivery handler once with its actual saved outturn", () => {
    const order: string[] = [];
    const contexts: PublicProgramCapacityOutturnContext[] = [];
    const receivers = observingReceivers(order, contexts);
    const g = fixture("outturn-receiver-delivery", {
      deliveryLeadDays: 3,
    });
    const due = g.world.history.futureDueItems.find((item) =>
      item.stableKey.endsWith(":installment:0:delivery"),
    )!;
    const result = advanceWorld(g.world, 3, registryWithReceivers(receivers));
    const context = contexts[0]!;
    const outturn = publicProgramRecords(result).find(
      (record) =>
        record.kind === "capacity-outturn" &&
        record.installmentId === context.installment.id,
    );

    expect(order).toEqual(["first", "second"]);
    expect(context.outturn).toEqual(outturn);
    expect(context.commitment.id).toBe(g.commitmentId);
    expect(context.appropriation.id).toBe(g.appropriationId);
    expect(context.eventDate).toBe(
      eventById(result, outturn!.eventId)!.occurredAt,
    );
    expect(context.eventDate).toBe(result.currentDate);

    programDeliveryHandler(result, due, receivers);
    expect(order).toEqual(["first", "second"]);
  });

  it.each([
    { label: "zero restoration", amount: 1, cost: UNIT_COST, expected: 0 },
    { label: "unknown restoration", amount: 1, cost: null, expected: null },
  ])(
    "preserves $label in the saved receiver context",
    ({ label, amount, cost, expected }) => {
      const order: string[] = [];
      const contexts: PublicProgramCapacityOutturnContext[] = [];
      const receivers = observingReceivers(order, contexts);
      const g = fixture(`outturn-receiver-${label}`, {
        amount,
        afterDays: 1,
        restorationCostPerUnit: cost,
      });
      const settled = advanceWorld(
        g.world,
        1,
        registryWithReceivers(receivers),
      );

      expect(order).toEqual(["first", "second"]);
      expect(contexts[0]!.outturn.restoredUnits).toBe(expected);
      expect(
        publicProgramRecords(settled).filter(
          (record) =>
            record.kind === "capacity-outturn" &&
            record.installmentId === contexts[0]!.installment.id,
        ),
      ).toHaveLength(1);
    },
  );

  it("does not dispatch for failed payments or when no outturn was written", () => {
    const failedOrder: string[] = [];
    const failedContexts: PublicProgramCapacityOutturnContext[] = [];
    const failedReceivers = observingReceivers(failedOrder, failedContexts);
    const failed = fixture("outturn-receiver-failed", {
      afterDays: 1,
      availableCash: 1,
      amount: 50_000_00,
    });
    const failedResult = advanceWorld(
      failed.world,
      1,
      registryWithReceivers(failedReceivers),
    );
    expect(
      publicProgramRecords(failedResult).some(
        (record) =>
          record.kind === "installment" &&
          record.commitmentId === failed.commitmentId &&
          record.status === "failed",
      ),
    ).toBe(true);
    expect(failedOrder).toEqual([]);
    expect(failedContexts).toEqual([]);

    const missingOrder: string[] = [];
    const missingContexts: PublicProgramCapacityOutturnContext[] = [];
    const missingReceivers = observingReceivers(missingOrder, missingContexts);
    const missing = fixture("outturn-receiver-no-capacity", {
      afterDays: 1,
      capacity: false,
    });
    const noCapacityResult = advanceWorld(
      missing.world,
      1,
      registryWithReceivers(missingReceivers),
    );
    expect(
      publicProgramRecords(noCapacityResult).some(
        (record) =>
          record.kind === "installment" &&
          record.commitmentId === missing.commitmentId &&
          record.status === "posted",
      ),
    ).toBe(true);
    expect(missingOrder).toEqual([]);
    expect(missingContexts).toEqual([]);
    expect(
      publicProgramRecords(noCapacityResult).some(
        (record) =>
          record.kind === "capacity-outturn" &&
          record.commitmentId === missing.commitmentId,
      ),
    ).toBe(false);
  });
});
