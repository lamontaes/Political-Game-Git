import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import {
  createResourcePosition,
  createResourceFlow,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcome,
} from "./resources";
import { monthlyIncomeByPerson, payPeriodsPerYear } from "./resource-income";
import { makeIsoDate } from "./dates";
import type { ResourceFlowBasisKind } from "./types";

describe("all recorded pay uses the same income reader", () => {
  it("counts wages, work and owner draws, but excludes loan proceeds", () => {
    let world = createDemoWorld("common-income");
    const personId = world.personOrder[0]!;
    const recipient = { kind: "person" as const, personId };
    const starting =
      monthlyIncomeByPerson(world, world.currentDate).get(personId) ?? 0;
    for (const [index, basisKind] of (
      [
        "compensation:work",
        "compensation:wages",
        "compensation:owner-draw",
        "obligation:loan",
      ] as ResourceFlowBasisKind[]
    ).entries()) {
      world = createResourceFlow(world, {
        stableKey: `income:${index}`,
        source: { kind: "person", personId: world.personOrder[1]! },
        recipient,
        startsAt: world.currentDate,
        amount: money(100_000, "USD"),
        cadenceKind:
          index === 0 ? "schedule:town-biweekly-0" : "schedule:monthly",
        basisKind,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: { kind: "authored", note: "Income classification fixture" },
      });
    }
    expect(
      monthlyIncomeByPerson(world, world.currentDate).get(personId),
    ).toBeCloseTo(starting + (100_000 * 26) / 12 + 200_000);
    const work = world.history.resourceFlows.find(
      (row) => row.stableKey === "income:0",
    )!;
    world = recordResourceFlowTerms(world, {
      stableKey: "income:ended",
      resourceFlowId: work.id,
      effectiveAt: world.currentDate,
      status: "ended",
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:monthly",
      reason: "Fixture job ended",
      supersedesTermsId: world.history.resourceFlowTerms.find(
        (row) => row.resourceFlowId === work.id,
      )!.id,
      provenance: { kind: "authored", note: "Income fixture" },
    });
    expect(monthlyIncomeByPerson(world, world.currentDate).get(personId)).toBe(
      starting + 200_000,
    );
  });
  it("keeps cadence parsing distinct and does not annualize one-time capital", () => {
    expect(payPeriodsPerYear("schedule:town-biweekly-1")).toBe(26);
    expect(payPeriodsPerYear("schedule:weekly")).toBe(52);
    expect(payPeriodsPerYear("schedule:one-time")).toBeNull();
  });
  it("counts paid shifts from actual receipts without forecasting unworked shifts", () => {
    let world = createDemoWorld("income-shift");
    const personId = world.personOrder[0]!;
    const starting =
      monthlyIncomeByPerson(world, world.currentDate).get(personId) ?? 0;
    const payerId = world.personOrder.find(
      (id) =>
        id !== personId &&
        !world.history.resourcePositions.some(
          (row) =>
            row.owner.kind === "person" &&
            row.owner.personId === id &&
            row.openingBalance.currency === "USD",
        ),
    );
    if (!payerId)
      throw new Error(
        "Demo fixture needs a payer without an existing cash position",
      );
    const payer = { owner: { kind: "person" as const, personId: payerId } };
    world = createResourcePosition(world, {
      stableKey: "income:shift-payer-cash",
      owner: payer.owner,
      openedAt: world.currentDate,
      openingBalance: money(10_000, "USD"),
      provenance: { kind: "authored", note: "Funded shift-payer fixture" },
    });
    world = createResourceFlow(world, {
      stableKey: "income:shift",
      source: payer.owner,
      recipient: { kind: "person", personId },
      startsAt: world.currentDate,
      amount: money(100, "USD"),
      cadenceKind: "work:completed-shift",
      basisKind: "compensation:wages",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: { kind: "authored", note: "Paid shift fixture" },
    });
    expect(
      monthlyIncomeByPerson(world, world.currentDate).get(personId) ?? 0,
    ).toBe(starting);
    const flow = world.history.resourceFlows.find(
      (row) => row.stableKey === "income:shift",
    )!;
    world = recordResourceTransferOutcome(world, {
      stableKey: "income:shift-paid",
      resourceFlowId: flow.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: money(100, "USD"),
      transferredAmount: money(100, "USD"),
      reasonKind: null,
      note: "One shift actually paid",
      provenance: { kind: "authored", note: "Paid shift fixture" },
    });
    expect(
      monthlyIncomeByPerson(world, world.currentDate).get(personId),
    ).toBeCloseTo(starting + (100 * 365.25) / (12 * 30));
  });
  it("requires a dated actual-receipts window", () => {
    expect(() =>
      monthlyIncomeByPerson(
        createDemoWorld("income-window"),
        makeIsoDate("2026-01-05"),
        { mode: "received" },
      ),
    ).toThrow("earlier window start");
  });
});
