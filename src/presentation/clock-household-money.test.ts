import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { addDays } from "../simulation/dates";
import { LIVING_COSTS_BASIS } from "../simulation/cost-of-living";
import { refreshLifeOpportunities } from "../simulation/life-opportunities";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";

describe("ordinary opening household bills belong to the clock", () => {
  it("records monthly bills once across sixty ordinary days and reload", () => {
    const seed = "team7-a5-clock-household-money";
    const place = drawRandomPlace(seed);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
      }),
    ).game!;
    let world = game.world;
    const openedAt = world.currentDate;
    const bills = world.history.resourceFlows.filter((flow) =>
      flow.basisKind.startsWith(LIVING_COSTS_BASIS),
    );
    expect(bills.length).toBeGreaterThan(0);
    const ids = new Set(bills.map((flow) => flow.id));
    const officeFlowIds = new Set(
      world.history.resourceFlows
        .filter((flow) => flow.stableKey.startsWith("office-salary:"))
        .map((flow) => flow.id),
    );
    expect(officeFlowIds.size).toBeGreaterThan(0);
    for (let day = 1; day <= 60; day += 1) {
      const priorOutcomeCount = world.history.resourceTransferOutcomes.length;
      world = passOrdinaryDays(world, 1);
      expect(world.currentDate).toBe(addDays(openedAt, day));
      const officePayments = world.history.resourceTransferOutcomes
        .slice(priorOutcomeCount)
        .filter((row) => officeFlowIds.has(row.resourceFlowId));
      for (const payment of officePayments) {
        expect(payment.occurredAt).toBe(world.currentDate);
        expect(addDays(payment.periodStartsAt, 7)).toBe(payment.occurredAt);
      }
      if (day === 6 || day === 30)
        world = deserializeWorld(serializeWorld(world));
      const before = world.history.resourceTransferOutcomes;
      const refreshed = refreshLifeOpportunities(world, game.playerPersonId);
      expect(refreshed.history.resourceTransferOutcomes).toEqual(before);
      world = refreshed;
    }
    const officeRows = world.history.resourceTransferOutcomes.filter((row) =>
      officeFlowIds.has(row.resourceFlowId),
    );
    expect(officeRows.length).toBeGreaterThan(0);
    expect(
      officeRows.some((row) => {
        const date = row.occurredAt;
        return (
          new Date(`${date}T12:00:00Z`).getUTCDay() !== 5 &&
          !date.endsWith("-15") &&
          addDays(date, 1).slice(0, 7) === date.slice(0, 7)
        );
      }),
    ).toBe(true);
    expect(new Set(officeRows.map((row) => row.stableKey)).size).toBe(
      officeRows.length,
    );
    const outcomes = world.history.resourceTransferOutcomes.filter((row) =>
      ids.has(row.resourceFlowId),
    );
    const dueDates = [...new Set(outcomes.map((row) => row.occurredAt))];
    expect(dueDates).toHaveLength(2);
    expect(dueDates.every((date) => date.endsWith("-01"))).toBe(true);
    for (const id of ids) {
      const rows = outcomes.filter((row) => row.resourceFlowId === id);
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((row) => row.stableKey)).size).toBe(2);
      expect(rows.every((row) => row.status === "completed")).toBe(true);
    }
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(
      refreshLifeOpportunities(reloaded, game.playerPersonId).history
        .resourceTransferOutcomes,
    ).toEqual(world.history.resourceTransferOutcomes);
  });
});
