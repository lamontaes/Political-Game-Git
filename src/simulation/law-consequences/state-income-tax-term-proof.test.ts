import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { observerSetup } from "../../presentation/observer-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { makeIsoDate } from "../dates";
import {
  enterLifePath,
  lifePaths2Handlers,
  performLifePathSession,
  scheduleLifePathSession,
} from "../life-paths2";
import { taxPowerEvidenceFor } from "../tax-policy";
import { stateJurisdictionForKey } from "../life-places";
import { advanceWorld } from "../world";
import type { World } from "../types";

const SEED = "session9-mn-0";
const TAX_DATE = makeIsoDate("2026-10-01");

const place = drawRandomPlace(
  SEED,
  (candidate) =>
    candidate.stateJurisdictionKey === "US-MN" &&
    ["2743000", "2758000"].includes(candidate.key) &&
    taxPowerEvidenceFor(candidate.stateJurisdictionKey, {
      instrument: "wage-income",
      asOf: TAX_DATE,
    }) !== null,
);

const stateJurisdictionKey = place.stateJurisdictionKey;
if (!stateJurisdictionKey) {
  throw new Error("The LW-04 proof place must have a state jurisdiction.");
}

function workOneShift(world: World, personId: World["personOrder"][number]) {
  const entered = enterLifePath(world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  const workId = entered.world.history.workRelationships.at(-1)!.id;
  const scheduled = scheduleLifePathSession(entered.world, workId);
  expect(scheduled.ok, scheduled.message).toBe(true);
  expect(scheduled.world.history.workRelationships.at(-1)!.personId).toBe(
    personId,
  );
  const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
  const worked = performLifePathSession(scheduled.world, activityId);
  expect(worked.ok, worked.message).toBe(true);
  return advanceWorld(worked.world, 1, lifePaths2Handlers());
}

describe("LW-04 state income terms and real paycheck payer records", () => {
  it("opens a random-place new game and records the actual supported-state payer and wage base", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...observerSetup(SEED, place.key),
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const paid = workOneShift(game.world, personId);
    const paycheck = paid.history.resourceTransferOutcomes.find((row) =>
      row.note?.startsWith("Payment for the completed shift"),
    );
    expect(paycheck?.transferredAmount.minorUnits).toBeGreaterThan(0);
    const liabilities = paid.history.statutoryTaxLiabilities!.filter(
      (row) => row.sourceOutcomeId === paycheck!.id,
    );
    const stateIncome = liabilities.find(
      (row) =>
        row.taxKey === `${stateJurisdictionKey.toLowerCase()}:wage-income-tax`,
    );
    expect(stateIncome?.payer).toEqual({ kind: "person", personId });
    expect(stateIncome?.status).toBe("assessed");
    const wageBase = paid.history.taxBases!.find(
      (row) => row.sourceEventId === stateIncome?.id,
    );
    expect(wageBase).toMatchObject({
      payer: { kind: "person", personId },
      jurisdictionId: stateJurisdictionForKey(stateJurisdictionKey)!.id,
      baseKey: "tax-base:wages",
      amount: paycheck!.transferredAmount,
    });
    console.info(
      "LW04 state-income random-place payer receipt",
      JSON.stringify({
        seed: SEED,
        place: place.key,
        state: stateJurisdictionKey,
        playerPersonId: personId,
        paycheckId: paycheck!.id,
        liabilityId: stateIncome!.id,
        taxBaseId: wageBase!.id,
      }),
    );
  }, 120_000);
});
