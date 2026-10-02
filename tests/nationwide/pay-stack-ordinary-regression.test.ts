import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawRandomPlace } from "../support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { createOpeningLifeController } from "../../src/presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";
import { daysBetween } from "../../src/simulation/dates";

it("pays ordinary town work through thirty days without a payer crash", () => {
  const seed = "overflow2:pay-stack:current-main-thirty-days";
  const place = drawRandomPlace(seed);
  const game = createOpeningLifeController({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    questionnaire: "skipped",
  }).finishTransition().game!;
  expect(game).toBeDefined();
  const opened = openOrdinaryLife(game.world, game.playerPersonId);
  const later = passOrdinaryDays(opened, 30);
  expect(daysBetween(opened.currentDate, later.currentDate)).toBe(30);
  const flows = new Set(
    later.history.resourceFlows
      .filter(
        (flow) =>
          flow.stableKey.startsWith("town-pay-v2:job-pay:") &&
          flow.basisKind === "compensation:work",
      )
      .map((flow) => flow.id),
  );
  const outcomes = later.history.resourceTransferOutcomes.filter(
    (outcome) =>
      flows.has(outcome.resourceFlowId) &&
      outcome.occurredAt > opened.currentDate,
  );
  const completed = outcomes.filter(
    (outcome) => outcome.status === "completed",
  );
  const receipt = {
    seed,
    placeKey: place.key,
    place: place.displayName,
    start: opened.currentDate,
    end: later.currentDate,
    completed: completed.length,
    paidMinor: completed.reduce(
      (sum, outcome) => sum + outcome.transferredAmount.minorUnits,
      0,
    ),
    blocked: outcomes.filter((outcome) => outcome.status === "blocked").length,
  };
  if (process.env.O2_PAY_RECEIPT_PATH)
    writeFileSync(
      process.env.O2_PAY_RECEIPT_PATH,
      JSON.stringify(receipt, null, 2),
    );
  expect(receipt.completed).toBeGreaterThan(0);
  expect(receipt.blocked).toBe(0);
  if (process.env.O2_PAY_BASELINE_PATH) {
    const baseline = JSON.parse(
      readFileSync(process.env.O2_PAY_BASELINE_PATH, "utf8"),
    );
    expect(receipt.placeKey).toBe(baseline.placeKey);
    expect(receipt.completed).toBe(baseline.completed);
    expect(receipt.paidMinor).toBe(baseline.paidMinor);
  }
}, 120_000);
