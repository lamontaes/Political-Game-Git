import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import { advanceWorld } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";
import { resourcePositionAt } from "./resource-queries";
import { money } from "./resources";
import {
  enterLifePath,
  performLifePathSession,
  scheduleLifePathSession,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import {
  residenceStateKey,
  statutoryTaxBalances,
  taxAt,
  taxableWages,
} from "./statutory-tax";
import {
  RESEARCHED_PLACE_KEYS,
  placeWageIncomeTax,
} from "./statutory-tax-rules";
import type { EntityId, World } from "./types";

const ELY_NEVADA = "3223500";
const MINNEAPOLIS = "2743000";

function newLife(placeKey: string, seed: string) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 30,
    placeKey,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    priors: [],
    seed,
  } as NewGameSetup);
  return { world: created.world, personId: created.playerPersonId };
}

const cash = (world: World, personId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "person", personId },
    money(0, "USD").currency,
  )?.liquidBalance.minorUnits ?? 0;

/** Takes the shop job and works one shift; the pay arrives the next day. */
function workOneShift(world: World): World {
  const entered = enterLifePath(world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  const workId = entered.world.history.workRelationships.at(-1)!.id;
  const scheduled = scheduleLifePathSession(entered.world, workId);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
  const worked = performLifePathSession(scheduled.world, activityId);
  expect(worked.ok, worked.message).toBe(true);
  return advanceWorld(worked.world, 1, LIFE_PATHS2_HANDLERS);
}

describe("a paycheck in Ely, Nevada", () => {
  it("withholds Social Security and Medicare, owes Nevada nothing, and survives a reload", () => {
    const start = newLife(ELY_NEVADA, "statutory-tax-ely");
    expect(residenceStateKey(start.world, start.personId)).toBe("US-NV");
    const paid = workOneShift(start.world);

    const pay = paid.history.resourceTransferOutcomes.find((row) =>
      row.note?.startsWith("Payment for the completed shift"),
    )!;
    expect(pay.transferredAmount.minorUnits).toBe(7_200);
    const rows = (paid.history.statutoryTaxLiabilities ?? []).filter(
      (row) => row.sourceOutcomeId === pay.id,
    );
    const byKey = Object.fromEntries(rows.map((row) => [row.taxKey, row]));

    // $72.00 of wages: 6.2% is $4.464, rounded to $4.46; 1.45% is $1.044, $1.04.
    expect(
      byKey["us-federal:social-security-employee"]!.liability?.minorUnits,
    ).toBe(446);
    expect(byKey["us-federal:medicare-employee"]!.liability?.minorUnits).toBe(
      104,
    );
    expect(
      byKey["us-federal:additional-medicare-withholding"]!.liability
        ?.minorUnits,
    ).toBe(0);
    expect(byKey["us-federal:social-security-employer"]!.payer.kind).toBe(
      "organization",
    );
    expect(
      byKey["us-federal:social-security-employer"]!.liability?.minorUnits,
    ).toBe(446);
    expect(byKey["us-federal:medicare-employer"]!.liability?.minorUnits).toBe(
      104,
    );

    // A lawful zero is a recorded $0, with its source.
    const nevada = byKey["us-nv:wage-income-tax"]!;
    expect(nevada.status).toBe("not-imposed");
    expect(nevada.liability?.minorUnits).toBe(0);
    expect(nevada.sourceUrl).toContain("tax.nv.gov");

    // What the research cannot price is UNKNOWN, never zero.
    for (const taxKey of [
      "us-federal:income-tax-withholding",
      "us-federal:futa",
      "us-nv:local-wage-taxes",
      "us-nv:modified-business-tax",
    ]) {
      expect(byKey[taxKey]!.liability, taxKey).toBeNull();
      expect(byKey[taxKey]!.researchQuestionId, taxKey).toBeTruthy();
    }

    // Withholding moved $5.50 out of the $72.00, and paid the employee's share.
    expect(cash(paid, start.personId)).toBe(7_200 - 550);
    const mine = statutoryTaxBalances(paid, {
      kind: "person",
      personId: start.personId,
    });
    expect(mine.reduce((sum, row) => sum + row.paid.minorUnits, 0)).toBe(550);
    expect(mine.every((row) => row.unpaid.minorUnits === 0)).toBe(true);

    // The employer's share is owed, with no due date the research can give.
    const employer = statutoryTaxBalances(paid).filter(
      (row) => row.liability.payer.kind === "organization",
    );
    expect(employer.map((row) => row.unpaid.minorUnits).sort()).toEqual([
      104, 446,
    ]);
    expect(
      employer.every((row) => !row.overdue && row.liability.dueAt === null),
    ).toBe(true);

    // The save keeps all of it, and a reload assesses nothing twice.
    const reloaded = deserializeWorld(serializeWorld(paid));
    expect(reloaded.history.statutoryTaxLiabilities).toEqual(
      paid.history.statutoryTaxLiabilities,
    );
    expect(reloaded.history.statutoryTaxPayments).toEqual(
      paid.history.statutoryTaxPayments,
    );
    const later = advanceWorld(reloaded, 7, LIFE_PATHS2_HANDLERS);
    expect(later.history.statutoryTaxLiabilities).toHaveLength(rows.length);
    expect(cash(later, start.personId)).toBeLessThanOrEqual(7_200 - 550);
  });
});

describe("a paycheck in Minneapolis", () => {
  it("records Minnesota's tax as existing but not yet priced", () => {
    const start = newLife(MINNEAPOLIS, "statutory-tax-minneapolis");
    expect(residenceStateKey(start.world, start.personId)).toBe("US-MN");
    const paid = workOneShift(start.world);
    const minnesota = paid.history.statutoryTaxLiabilities!.find(
      (row) => row.taxKey === "us-mn:wage-income-tax",
    )!;
    expect(minnesota.status).toBe("rule-unknown");
    expect(minnesota.liability).toBeNull();
    expect(minnesota.researchQuestionId).toBe(
      "state-wage-income-tax-withholding",
    );
    expect(
      paid.history.statutoryTaxLiabilities!.some(
        (row) => row.taxKey === "us-nv:modified-business-tax",
      ),
    ).toBe(false);
  });
});

describe("the arithmetic", () => {
  it("stops Social Security at the wage base and starts Additional Medicare above $200,000", () => {
    const socialSecurity = {
      annualWageCapMinor: 18_450_000,
      annualWageFloorMinor: null,
    };
    expect(taxableWages(socialSecurity, 18_400_000, 100_000)).toBe(50_000);
    expect(taxableWages(socialSecurity, 18_450_000, 100_000)).toBe(0);
    const additional = {
      annualWageCapMinor: null,
      annualWageFloorMinor: 20_000_000,
    };
    expect(taxableWages(additional, 19_950_000, 100_000)).toBe(50_000);
    expect(taxableWages(additional, 20_000_000, 100_000)).toBe(100_000);
    expect(taxableWages(additional, 0, 100_000)).toBe(0);
    expect(taxAt(7_200, 620)).toBe(446);
    expect(taxAt(50, 90)).toBe(0);
    expect(taxAt(56, 90)).toBe(1);
  });

  it("covers the 56 places, with a source for every lawful zero", () => {
    expect(RESEARCHED_PLACE_KEYS).toHaveLength(56);
    expect(new Set(RESEARCHED_PLACE_KEYS).size).toBe(56);
    for (const key of RESEARCHED_PLACE_KEYS) {
      const place = placeWageIncomeTax(key);
      if (place.status === "not-imposed")
        expect(place.sourceUrl, key).toBeTruthy();
    }
    expect(placeWageIncomeTax("US-MT").status).toBe("unknown");
    expect(placeWageIncomeTax("US-XX").status).toBe("unknown");
  });
});
