import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "../presentation/new-game";
import { addDays } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { ensureStartingPersonalMoney } from "./starting-money";

const PROVENANCE = {
  kind: "authored" as const,
  note: "Starting money fixture.",
};

function adult() {
  return createNewGameWorld({
    seed: "starting-money-fixture",
    placeKey: "kentucky",
    startAge: 35,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "lives-alone",
    givenName: "Morgan",
    familyName: "Reed",
  }).world;
}

describe("recorded starting money", () => {
  it("opens one personal position from actual adult work and active USD pay", () => {
    let world = adult();
    if (world.control.kind !== "person") throw new Error("No player.");
    const personId = world.control.personId;
    const startedAt = addDays(world.currentDate, -365 * 4);
    world = createOrganization(world, {
      stableKey: "starting-money:employer",
      formedAt: addDays(startedAt, -1),
      provenance: PROVENANCE,
      initialProfile: {
        name: "Recorded Employer",
        classification: "custom:fixture",
        locationJurisdictionId: world.jurisdictionOrder[0]!,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "starting-money:work",
      personId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt,
      kind: "employment:fixture",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: PROVENANCE,
      initialRole: {
        title: "Recorded worker",
        occupationClassification: "custom:fixture",
        locationJurisdictionId: world.jurisdictionOrder[0]!,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 40 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: world.jurisdictionOrder[0]!,
        },
      },
    });
    world = createWorkCompensation(world, {
      stableKey: "starting-money:pay",
      workRelationshipId: world.history.workRelationships.at(-1)!.id,
      startsAt: startedAt,
      amount: money(280_000, "USD"),
      cadenceKind: "schedule:monthly",
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: PROVENANCE,
    });
    const created = ensureStartingPersonalMoney(world, personId);
    expect(created.status).toBe("created");
    expect(created.annualPayMinorUnits).toBe(3_360_000);
    const position = resourcePositionAt(
      created.world,
      { kind: "person", personId },
      money(0, "USD").currency,
    );
    expect(position?.liquidBalance.minorUnits).toBeGreaterThan(0);
    const repeated = ensureStartingPersonalMoney(created.world, personId);
    expect(repeated.status).toBe("existing");
    expect(repeated.world).toBe(created.world);
  });

  it("leaves an unrecorded balance unknown", () => {
    const world = adult();
    if (world.control.kind !== "person") throw new Error("No player.");
    const result = ensureStartingPersonalMoney(world, world.control.personId);
    expect(result.status).toBe("no-recorded-pay");
    expect(result.world.history.resourcePositions).toEqual(
      world.history.resourcePositions,
    );
  });

  it("preserves an existing personal balance without recalibration", () => {
    let world = adult();
    if (world.control.kind !== "person") throw new Error("No player.");
    const personId = world.control.personId;
    world = createResourcePosition(world, {
      stableKey: "starting-money:known-position",
      owner: { kind: "person", personId },
      openedAt: world.currentDate,
      openingBalance: money(12_345, "USD"),
      provenance: PROVENANCE,
    });
    const result = ensureStartingPersonalMoney(world, personId);
    expect(result.status).toBe("existing");
    expect(result.world).toBe(world);
    expect(
      world.history.resourcePositions.at(-1)?.openingBalance.minorUnits,
    ).toBe(12_345);
  });

  it("carries actual USD transfers and ignores a foreign transfer", () => {
    let world = adult();
    if (world.control.kind !== "person") throw new Error("No player.");
    const personId = world.control.personId;
    world = createOrganization(world, {
      stableKey: "starting-money:transfer-source",
      formedAt: addDays(world.currentDate, -30),
      provenance: PROVENANCE,
      initialProfile: {
        name: "Transfer Source",
        classification: "custom:fixture",
        locationJurisdictionId: world.jurisdictionOrder[0]!,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    for (const [currency, amount] of [
      ["EUR", 999],
      ["USD", 5_000],
    ] as const) {
      world = createResourceFlow(world, {
        stableKey: `starting-money:transfer:${currency}`,
        source: { kind: "organization", organizationId },
        recipient: { kind: "person", personId },
        startsAt: world.currentDate,
        amount: money(amount, currency),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:fixture",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: PROVENANCE,
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: `starting-money:outcome:${currency}`,
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        status: "completed",
        attemptedAmount: money(amount, currency),
        transferredAmount: money(amount, currency),
        reasonKind: null,
        note: null,
        provenance: PROVENANCE,
      });
      if (currency === "EUR") {
        const ignored = ensureStartingPersonalMoney(world, personId);
        expect(ignored.status).toBe("no-recorded-pay");
        expect(ignored.world.history.resourcePositions).toHaveLength(0);
      }
    }
    const result = ensureStartingPersonalMoney(world, personId);
    expect(result.status).toBe("recorded-transfers");
    expect(
      resourcePositionAt(
        result.world,
        { kind: "person", personId },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(5_000);
  });
});
