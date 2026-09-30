import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { createOrganization, createWorkRelationship } from "../life";
import {
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceFlowTerms,
} from "../resources";
import { addDays } from "../dates";
import { resourcePositionAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  settleTownCompensation,
  settleTownCompensations,
} from "./town-compensation";

function employee() {
  let world = createDemoWorld("shared-compensation");
  const personId = world.personOrder[0]!;
  const start = addDays(world.currentDate, -6);
  const home = world.people[personId]!.homeJurisdictionId;
  const provenance = {
    kind: "authored" as const,
    note: "Bounded compensation fixture",
  };
  world = createOrganization(world, {
    stableKey: "compensation:employer",
    formedAt: start,
    provenance,
    initialProfile: {
      name: "Fixture employer",
      classification: "enterprise:company",
      locationJurisdictionId: home,
    },
  });
  const employer = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "compensation:job",
    personId,
    organizationId: employer,
    startedAt: start,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Clerk",
      occupationClassification: "occupation:clerk",
      locationJurisdictionId: home,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: home,
      },
    },
  });
  world = createWorkCompensation(world, {
    stableKey: "compensation:weekly",
    workRelationshipId: world.history.workRelationships.at(-1)!.id,
    startsAt: start,
    amount: money(100_000, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: home,
    provenance,
  });
  const flowId = world.history.resourceFlows.at(-1)!.id;
  return {
    world,
    personId,
    employer,
    flowId,
    period: {
      flowId,
      onDate: world.currentDate,
      periodStart: start,
      periodEnd: world.currentDate,
    },
  };
}

describe("one compensation settlement for existing pay routes", () => {
  it("records one gross paycheck, assesses it once, and survives Save/Continue", () => {
    const f = employee();
    const paid = settleTownCompensation(f.world, f.period);
    const outcomes = paid.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === f.flowId,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.transferredAmount.minorUnits).toBe(100_000);
    const taxes = (paid.history.statutoryTaxLiabilities ?? []).filter(
      (row) => row.sourceOutcomeId === outcomes[0]!.id,
    );
    expect(taxes.length).toBeGreaterThan(0);
    expect(settleTownCompensation(paid, f.period)).toBe(paid);
    const saved = serializeWorld(paid);
    const restored = deserializeWorld(saved);
    expect(serializeWorld(settleTownCompensation(restored, f.period))).toBe(
      saved,
    );
  });
  it("records a short funded payment instead of overdrawing the employer", () => {
    const f = employee();
    const world = createResourcePosition(f.world, {
      stableKey: "compensation:employer-cash",
      owner: { kind: "organization", organizationId: f.employer },
      openedAt: f.period.periodStart,
      openingBalance: money(20_000, "USD"),
      provenance: { kind: "authored", note: "Recorded employer cash" },
    });
    const paid = settleTownCompensation(world, f.period);
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === f.flowId,
    )!;
    expect(outcome.attemptedAmount.minorUnits).toBe(100_000);
    expect(outcome.transferredAmount.minorUnits).toBe(20_000);
    expect(outcome.status).toBe("partial");
    expect(
      resourcePositionAt(
        paid,
        { kind: "organization", organizationId: f.employer },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBeGreaterThanOrEqual(0);
  });
  it("selects the terms at period start and rejects an unfinished period", () => {
    const f = employee();
    const old = f.world.history.resourceFlowTerms.find(
      (row) => row.resourceFlowId === f.flowId,
    )!;
    const raised = recordResourceFlowTerms(f.world, {
      stableKey: "compensation:later-raise",
      resourceFlowId: f.flowId,
      effectiveAt: f.world.currentDate,
      status: "active",
      amount: money(120_000, "USD"),
      cadenceKind: old.cadenceKind,
      reason: "Raise begins today",
      supersedesTermsId: old.id,
      provenance: { kind: "authored", note: "Recorded raise" },
    });
    // Canonical resource settlement refuses an ambiguous within-period change.
    expect(() => settleTownCompensation(raised, f.period)).toThrow();
    expect(() =>
      settleTownCompensation(f.world, {
        ...f.period,
        periodEnd: addDays(f.world.currentDate, 1),
      }),
    ).toThrow("completed before payment");
  });
  it("deduplicates batch periods and does not classify owner draws as employee payroll", () => {
    const f = employee();
    const world = createResourceFlow(f.world, {
      stableKey: "compensation:owner-draw",
      source: { kind: "organization", organizationId: f.employer },
      recipient: { kind: "person", personId: f.personId },
      startsAt: f.period.periodStart,
      amount: money(1000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "compensation:owner-draw",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: { kind: "authored", note: "Recorded owner draw" },
    });
    const period = {
      ...f.period,
      flowId: world.history.resourceFlows.at(-1)!.id,
    };
    const paid = settleTownCompensations(world, [period, period]);
    const outcomes = paid.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === period.flowId,
    );
    expect(outcomes).toHaveLength(1);
    expect(
      (paid.history.statutoryTaxLiabilities ?? []).some(
        (row) => row.sourceOutcomeId === outcomes[0]!.id,
      ),
    ).toBe(false);
  });
});
