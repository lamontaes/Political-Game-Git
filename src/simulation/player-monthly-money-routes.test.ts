import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { submitTimeCommand } from "../presentation/time-command";
import { createOrganization, createWorkRelationship } from "./life";
import {
  initializeOfficeSalaryFlows,
  settleOfficeSalaries,
} from "./office-salary";
import {
  initializeLivingCostsFlow,
  livingCostsFlowFor,
  settleLivingCosts,
} from "./cost-of-living";
import {
  buyHome,
  homePurchaseReason,
  MORTGAGE_BASIS,
  settleMortgages,
} from "./home-purchase";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import {
  ensurePlayerMonthlyMoneySchedule,
  PLAYER_MONTHLY_MONEY_KEY,
} from "./player-monthly-money";
import { composeWorldTimeHandlers } from "./campaigns";
import { refreshLifeOpportunities } from "./life-opportunities";
import { advanceWorld } from "./world";
import { addDays, daysBetween } from "./dates";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, IsoDate, World } from "./types";

let starting: World;
let playerId: EntityId;
let first: IsoDate;
let mortgageId: EntityId;
let livingId: EntityId;
let salaryId: EntityId;
let newOfficeWorld: World;
let newOfficeWorkId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "c9-monthly-money-routes",
      placeKey: "3502000",
      startAge: 35,
      questionnaire: "skipped",
    }),
  ).game!;
  playerId = game.playerPersonId;
  const provenance = {
    kind: "authored" as const,
    note: "Recorded funded mortgage route fixture.",
  };
  let world = createOrganization(game.world, {
    stableKey: "c9:funding-source",
    formedAt: game.world.currentDate,
    provenance,
    initialProfile: {
      name: "Fixture funding source",
      classification: "custom:fixture",
      locationJurisdictionId: null,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const funding = money(100_000_000, "USD");
  world = createResourcePosition(world, {
    stableKey: "c9:source-cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: funding,
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: "c9:buyer-funding",
    source: { kind: "organization", organizationId },
    recipient: { kind: "person", personId: playerId },
    startsAt: world.currentDate,
    amount: funding,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:fixture-funding",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "c9:buyer-funded",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: funding,
    transferredAmount: funding,
    reasonKind: null,
    note: "Actual recorded transfer to the existing player USD position.",
    provenance,
  });
  expect(
    world.history.resourcePositions.filter(
      (position) =>
        position.owner.kind === "person" &&
        position.owner.personId === playerId &&
        position.openingBalance.currency === funding.currency,
    ),
  ).toHaveLength(1);
  expect(homePurchaseReason(world, playerId)).toBeNull();
  const purchase = buyHome(world, playerId);
  expect(purchase.status).toBe("bought");
  world = createOrganization(purchase.world, {
    stableKey: "c9:office-employer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Recorded paid-office fixture." },
    initialProfile: {
      name: "Fixture congressional office",
      classification: "sector:government",
      locationJurisdictionId: null,
    },
  });
  world = createWorkRelationship(world, {
    stableKey: "c9:office-work",
    personId: playerId,
    organizationId: world.history.organizations.at(-1)!.id,
    startedAt: world.currentDate,
    kind: "employment:congress-member",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Recorded paid-office fixture." },
    initialRole: {
      title: "Member of Congress",
      occupationClassification: null,
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 60 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
  const workId = world.history.workRelationships.at(-1)!.id;
  newOfficeWorld = world;
  newOfficeWorkId = workId;
  world = initializeOfficeSalaryFlows(world, playerId);
  world = initializeLivingCostsFlow(world, playerId);
  world = ensurePlayerMonthlyMoneySchedule(world, playerId);
  mortgageId = world.history.resourceFlows.find(
    (flow) => flow.basisKind === MORTGAGE_BASIS,
  )!.id;
  livingId = livingCostsFlowFor(world, playerId)!.id;
  salaryId = world.history.resourceFlows.find(
    (flow) => flow.stableKey === `office-salary:${workId}`,
  )!.id;
  first = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === PLAYER_MONTHLY_MONEY_KEY &&
      item.dueAt > world.currentDate,
  )!.dueAt;
  const weekBefore = addDays(first, -7);
  starting = advanceWorld(
    world,
    daysBetween(world.currentDate, weekBefore),
    composeWorldTimeHandlers(),
  );
  expect(starting.currentDate).toBe(weekBefore);
  expect(payments(starting)).toHaveLength(0);
}, 30_000);

function payments(world: World) {
  return world.history.resourceTransferOutcomes.filter((outcome) =>
    [mortgageId, livingId, salaryId].includes(outcome.resourceFlowId),
  );
}

function moneyResult(world: World) {
  return payments(world).map((outcome) => ({
    flow: outcome.resourceFlowId,
    periodStartsAt: outcome.periodStartsAt,
    periodEndsAt: outcome.periodEndsAt,
    occurredAt: outcome.occurredAt,
    status: outcome.status,
    amount: outcome.transferredAmount,
  }));
}

describe("player money on the first through existing time controls", () => {
  it("initializes newly acquired paid office work at the existing refresh boundary without settling salary", () => {
    const key = `office-salary:${newOfficeWorkId}`;
    expect(
      newOfficeWorld.history.resourceFlows.some(
        (flow) => flow.stableKey === key,
      ),
    ).toBe(false);
    const refreshed = refreshLifeOpportunities(newOfficeWorld, playerId);
    const flow = refreshed.history.resourceFlows.find(
      (row) => row.stableKey === key,
    );
    expect(flow).toBeDefined();
    expect(flow!.startsAt).toBe(newOfficeWorld.currentDate);
    expect(
      refreshed.history.resourceTransferOutcomes.filter(
        (outcome) => outcome.resourceFlowId === flow!.id,
      ),
    ).toHaveLength(0);
    for (const world of [
      refreshed,
      deserializeWorld(serializeWorld(refreshed)),
    ]) {
      const repeated = refreshLifeOpportunities(world, playerId);
      expect(
        repeated.history.resourceFlows.filter((row) => row.stableKey === key),
      ).toHaveLength(1);
      expect(
        repeated.history.resourceTransferOutcomes.filter(
          (outcome) => outcome.resourceFlowId === flow!.id,
        ),
      ).toHaveLength(0);
    }
  });

  it("Day, Week and days command settle the same actual mortgage, living costs and salary periods, including after reload", () => {
    let days = starting;
    for (let day = 0; day < 7; day++) {
      days = passOrdinaryDays(days, 1);
      if (day < 6) expect(payments(days)).toHaveLength(0);
    }
    const week = passOrdinaryDays(starting, 7);
    const command = submitTimeCommand(
      starting,
      {
        requestId: "c9:days-seven",
        personId: playerId,
        sourceMoment: starting.currentMoment,
        command: { kind: "days", days: 7 },
      },
      () => 0,
    );
    expect(command.receipt.status).toBe("accepted");
    const reopened = passOrdinaryDays(
      deserializeWorld(serializeWorld(starting)),
      7,
    );
    for (const world of [days, week, command.world, reopened]) {
      expect(world.currentDate).toBe(first);
      expect(moneyResult(world)).toEqual(moneyResult(days));
      for (const flowId of [mortgageId, livingId]) {
        const charges = payments(world).filter(
          (outcome) => outcome.resourceFlowId === flowId,
        );
        expect(charges).toHaveLength(1);
        expect(charges[0]!.occurredAt).toBe(first);
        expect(charges[0]!.status).toBe("completed");
        expect(charges[0]!.transferredAmount.minorUnits).toBeGreaterThan(0);
      }
      const flow = world.history.resourceFlows.find(
        (row) => row.id === salaryId,
      )!;
      const weeksDue = Math.floor(daysBetween(flow.startsAt, first) / 7);
      expect(weeksDue).toBeGreaterThan(0);
      expect(
        payments(world).filter(
          (outcome) => outcome.resourceFlowId === salaryId,
        ),
      ).toHaveLength(weeksDue);
      expect(resourceFlowTermsAt(world, salaryId)!.cadenceKind).toBe(
        "schedule:weekly",
      );
      const settled = settleLivingCosts(
        settleMortgages(settleOfficeSalaries(world, playerId), playerId),
        playerId,
      );
      expect(serializeWorld(settled)).toBe(serializeWorld(world));
      const loaded = deserializeWorld(serializeWorld(world));
      expect(
        serializeWorld(ensurePlayerMonthlyMoneySchedule(loaded, playerId)),
      ).toBe(serializeWorld(loaded));
    }
  }, 60_000);
});
