import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { requireLifePlace } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { FDIC_SMALL_BANK_SHAPES } from "./town-bank-shapes.generated";
import { TOWN_WORKPLACES, writeTownEmployer } from "./town-employment";
import {
  drawBankShape,
  TOWN_FINANCES_VERSION,
  uninsuredDepositShare,
} from "./town-finances";

const rows = (text: string) =>
  text.split(";").map((cell) => {
    const [cushion, otherAssets, uninsured] = cell.split(",").map(Number) as [
      number,
      number,
      number,
    ];
    return { cushion, otherAssets, uninsured };
  });

describe("bank-shape replacement preserves existing FDIC row references", () => {
  it("keeps every saved state and national row's paired uninsured share", () => {
    const national = Object.keys(FDIC_SMALL_BANK_SHAPES)
      .sort()
      .flatMap((state) => rows(FDIC_SMALL_BANK_SHAPES[state]!));
    // A new selector must not reorder the backing arrays used by old saves.
    for (const state of Object.keys(FDIC_SMALL_BANK_SHAPES))
      drawBankShape(state, 0.5);
    for (const [state, text] of Object.entries(FDIC_SMALL_BANK_SHAPES))
      for (const [index, row] of rows(text).entries())
        expect(uninsuredDepositShare({ state, index, ...row })).toBe(
          row.uninsured,
        );
    for (const [index, row] of national.entries())
      expect(uninsuredDepositShare({ state: null, index, ...row })).toBe(
        row.uninsured,
      );
  });

  it("keeps a saved bank's original shape and books through canonical reload", () => {
    const place = requireLifePlace("4177250");
    let world = createScenarioWorld("team6-a61-legacy-bank", place.context, {
      peopleCount: 3,
    });
    const town = place.context.jurisdiction.id;
    const workplace = TOWN_WORKPLACES.find((row) => row.key === "bank")!;
    world = writeTownEmployer(world, town, workplace, 91, world.currentDate);
    const organizationId = world.history.organizations.at(-1)!.id;
    const original = rows(FDIC_SMALL_BANK_SHAPES.Oregon!)[0]!;
    // Explicit legacy-book fixture; these balances are not a real bank's data
    // or production opening amounts. Only its paired FDIC ratios are sourced.
    world = {
      ...world,
      townFinances: {
        version: TOWN_FINANCES_VERSION,
        businesses: {},
        markets: {},
        banks: {
          [organizationId]: {
            organizationId,
            openedAt: world.currentDate,
            shape: {
              state: "Oregon",
              index: 0,
              cushion: original.cushion,
              otherAssets: original.otherAssets,
            },
            deposits: 100,
            liquid: 10,
            loans: 90,
            capital: 10,
            businessLoans: 0,
            lastQuarterLosses: 0,
            runAt: null,
            failed: null,
            lastRound: "authored-legacy-book",
          },
        },
      },
    };
    const bytes = serializeWorld(world);
    const restored = deserializeWorld(bytes);
    const bank = restored.townFinances!.banks[organizationId]!;
    drawBankShape("Oregon", 0.75);
    expect(uninsuredDepositShare(bank.shape)).toBe(original.uninsured);
    expect(bank).toEqual(world.townFinances!.banks[organizationId]);
    expect(serializeWorld(restored)).toBe(bytes);
    expect(restored.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
  });
});
