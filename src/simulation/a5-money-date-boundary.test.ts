import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { SeededRng } from "./rng";
import { addDays, makeIsoDate, simulationMomentAtLocalTime } from "./dates";
import { householdMembershipsAt } from "./life-queries";
import { createOrganization, createWorkRelationship } from "./life";
import {
  createResourceFlow,
  createResourceObligation,
  createResourcePosition,
  createWorkCompensation,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import {
  initializeLivingCostsFlow,
  livingCostsFlowFor,
} from "./cost-of-living";
import { MORTGAGE_BASIS } from "./home-purchase";
import { advanceWorldMinutes } from "./time-work";
import { refreshLifeOpportunities } from "./life-opportunities";
import { serializeWorld, deserializeWorld } from "./serialization";
import type { World } from "./types";

const SEED = "a5-clock-money";
const places = PLACE_POPULATION_ROWS.split(";").map(
  (row) => row.split(":")[0]!,
);
const placeKey = places[new SeededRng(SEED).integer(0, places.length)]!;
const provenance = {
  kind: "authored" as const,
  note: "Funded clock settlement fixture.",
};

function fixture() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey,
    seed: SEED,
    startAge: 30,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
  });
  const personId = game.playerPersonId;
  const [year, month] = game.world.currentDate.split("-").map(Number) as [
    number,
    number,
  ];
  const dueOn = makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
  const openingOn = addDays(dueOn, -7);
  let world: World = {
    ...game.world,
    currentDate: openingOn,
    currentMoment: simulationMomentAtLocalTime({
      date: openingOn,
      minuteOfDay: 0,
      timeZone: game.world.currentMoment.timeZone,
    }),
  };
  const householdId = householdMembershipsAt(world, personId).find(
    (row) => row.state.residenceRole === "primary",
  )!.household.id;
  for (const [key, owner] of [
    ["person", { kind: "person" as const, personId }],
    ["household", { kind: "household" as const, householdId }],
  ] as const) {
    if (
      !world.history.resourcePositions.some(
        (row) =>
          row.owner.kind === owner.kind &&
          (row.owner.kind === "person"
            ? row.owner.personId === personId
            : row.owner.kind === "household" &&
              row.owner.householdId === householdId),
      )
    )
      world = createResourcePosition(world, {
        stableKey: `a5:${key}:cash`,
        owner,
        openedAt: openingOn,
        openingBalance: money(100_000_000, "USD"),
        provenance,
      });
  }
  world = createOrganization(world, {
    stableKey: "a5:employer-and-lender",
    formedAt: openingOn,
    provenance,
    initialProfile: {
      name: "Recorded fixture employer and lender",
      classification: "sector:government",
      locationJurisdictionId: null,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a5:employer:cash",
    owner: { kind: "organization", organizationId },
    openedAt: openingOn,
    openingBalance: money(100_000_000, "USD"),
    provenance,
  });
  for (const [key, recipient] of [
    ["person", { kind: "person" as const, personId }],
    ["household", { kind: "household" as const, householdId }],
  ] as const) {
    world = createResourceFlow(world, {
      stableKey: `a5:${key}:funding`,
      source: { kind: "organization", organizationId },
      recipient,
      startsAt: openingOn,
      amount: money(10_000_000, "USD"),
      cadenceKind: "schedule:one-time",
      basisKind: "custom:fixture-funding",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: `a5:${key}:funding:paid`,
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: openingOn,
      periodEndsAt: openingOn,
      occurredAt: openingOn,
      status: "completed",
      attemptedAmount: money(10_000_000, "USD"),
      transferredAmount: money(10_000_000, "USD"),
      reasonKind: null,
      note: null,
      provenance,
    });
  }
  world = createWorkRelationship(world, {
    stableKey: "a5:office",
    personId,
    organizationId,
    startedAt: openingOn,
    kind: "employment:congress-member",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Member of Congress",
      occupationClassification: null,
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
  const workId = world.history.workRelationships.at(-1)!.id;
  world = createWorkCompensation(world, {
    stableKey: `office-salary:${workId}`,
    workRelationshipId: workId,
    startsAt: openingOn,
    amount: money(100_000, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const salaryId = world.history.resourceFlows.at(-1)!.id;
  world = createResourceFlow(world, {
    stableKey: "a5:mortgage",
    source: { kind: "person", personId },
    recipient: { kind: "organization", organizationId },
    startsAt: openingOn,
    amount: money(10_000, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: MORTGAGE_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const mortgageId = world.history.resourceFlows.at(-1)!.id;
  world = createResourceObligation(world, {
    stableKey: "a5:mortgage:debt",
    resourceFlowId: mortgageId,
    establishedAt: openingOn,
    basisKind: MORTGAGE_BASIS,
    principal: money(100_000, "USD"),
    careResponsibilityId: null,
    housingTenureId: null,
    provenance,
  });
  world = initializeLivingCostsFlow(world, personId);
  const livingId = livingCostsFlowFor(world, personId)!.id;
  const beforeDue = addDays(dueOn, -1);
  // Place the saved fixture just before midnight. The actual minute clock
  // crosses the due date; it does not need a menu refresh to collect money.
  world = {
    ...world,
    currentDate: beforeDue,
    currentMoment: simulationMomentAtLocalTime({
      date: beforeDue,
      minuteOfDay: 1435,
      timeZone: world.currentMoment.timeZone,
    }),
  };
  return { world, personId, dueOn, ids: [salaryId, mortgageId, livingId] };
}

function payments(world: World, ids: readonly string[]) {
  return world.history.resourceTransferOutcomes.filter((row) =>
    ids.includes(row.resourceFlowId),
  );
}

describe("A5 money follows the shared date boundary", () => {
  it("pays saved salary, mortgage and living bills through the minute clock after reload", () => {
    const { world, dueOn, ids } = fixture();
    const paid = advanceWorldMinutes(
      deserializeWorld(serializeWorld(world)),
      10,
    );
    expect(paid.currentDate).toBe(dueOn);
    for (const id of ids) {
      const rows = payments(paid, [id]);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe("completed");
      expect(rows[0]!.occurredAt).toBe(dueOn);
      expect(rows[0]!.transferredAmount.minorUnits).toBeGreaterThan(0);
    }
    const sameDay = advanceWorldMinutes(paid, 10);
    expect(payments(sameDay, ids)).toEqual(payments(paid, ids));
  });

  it("a refresh on a due date cannot settle those saved agreements", () => {
    const { world, personId, dueOn, ids } = fixture();
    const due: World = {
      ...world,
      currentDate: dueOn,
      currentMoment: simulationMomentAtLocalTime({
        date: dueOn,
        minuteOfDay: 5,
        timeZone: world.currentMoment.timeZone,
      }),
    };
    expect(payments(refreshLifeOpportunities(due, personId), ids)).toEqual(
      payments(due, ids),
    );
  });
});
