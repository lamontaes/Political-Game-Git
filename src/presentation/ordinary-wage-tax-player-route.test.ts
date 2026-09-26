import { expect, it } from "vitest";
import { enterLifePath } from "../simulation/life-paths2";
import { searchLifePlaces } from "../simulation/life-places";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { stateTaxServiceProfileForJurisdictionKey } from "../simulation/world-setup/state-tax-service-profiles";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { submitTimeCommand } from "./time-command";

it("starts an ordinary California life, accepts work, and reaches taxed pay through Day and Week", () => {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-CA",
    scope: "locality",
  })[0]!;
  const opened = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey: place.key,
      startingLife: "ordinary-life",
      questionnaire: "skipped",
      priors: [],
      seed: "ordinary-ca-wage-tax-player-route",
    }),
  ).game!;
  const personId = opened.playerPersonId;
  const profile = stateTaxServiceProfileForJurisdictionKey(
    opened.world,
    "US-CA",
  );
  expect(profile).not.toBeNull();
  const accepted = enterLifePath(opened.world, "shop-assistant");
  expect(accepted.ok, accepted.message).toBe(true);
  let world = accepted.world;
  const baselinePay = world.history.resourceTransferOutcomes.filter((row) =>
    row.note?.startsWith("Payment for the completed shift"),
  ).length;
  let dayPresses = 0;
  for (; dayPresses < 14; dayPresses += 1) {
    const result = submitTimeCommand(world, {
      requestId: `ordinary-ca-wage-day:${dayPresses}`,
      personId,
      sourceMoment: world.currentMoment,
      command: { kind: "days", days: 1 },
    });
    expect(result.receipt.status).toBe("accepted");
    world = result.world;
    if (
      world.history.resourceTransferOutcomes.filter((row) =>
        row.note?.startsWith("Payment for the completed shift"),
      ).length > baselinePay
    )
      break;
  }
  const pay = world.history.resourceTransferOutcomes.find((row) =>
    row.note?.startsWith("Payment for the completed shift"),
  );
  expect(
    pay,
    "A Day press must reach an actual paid work window",
  ).toBeDefined();
  expect(dayPresses).toBeLessThan(14);
  const liability = world.history.statutoryTaxLiabilities?.find(
    (row) =>
      row.sourceOutcomeId === pay!.id && row.taxKey === "us-ca:wage-income-tax",
  );
  expect(liability?.status).toBe("assessed");
  expect(liability?.liability?.minorUnits).toBeGreaterThan(0);
  const account = publicTaxAccountForJurisdiction(
    world,
    profile!.jurisdictionId,
  );
  expect(account).not.toBeNull();
  expect(
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: account!.organizationId },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits,
  ).toBeGreaterThanOrEqual(liability!.liability!.minorUnits);
  const reloaded = deserializeWorld(serializeWorld(world));
  const week = submitTimeCommand(reloaded, {
    requestId: "ordinary-ca-wage-week",
    personId,
    sourceMoment: reloaded.currentMoment,
    command: { kind: "days", days: 7 },
  });
  expect(week.receipt.status).toBe("accepted");
  expect(
    week.world.history.statutoryTaxLiabilities?.filter(
      (row) =>
        row.sourceOutcomeId === pay!.id && row.taxKey === liability!.taxKey,
    ),
  ).toHaveLength(1);
}, 60_000);
