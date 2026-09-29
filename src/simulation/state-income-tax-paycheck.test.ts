import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import {
  enterLifePath,
  LIFE_PATHS2_HANDLERS,
  performLifePathSession,
  scheduleLifePathSession,
} from "./life-paths2";
import { deserializeWorld, serializeWorld } from "./serialization";
import type * as TaxLaw from "./state-income-tax-law";
import {
  stateIncomeTaxUnderLaw,
  type StateIncomeTaxUnderLaw,
} from "./state-income-tax-law";
import { residenceStateKey } from "./statutory-tax";
import type { EntityId, World } from "./types";
import { advanceWorld } from "./world";

/**
 * What the income tax law rule decides reaches a real paycheck: the rule's
 * answer is set here, because a law enacted in play needs a full legislative
 * history, and the rule itself is read over hand-written laws in
 * `state-income-tax-law.test.ts`. Everything after the answer is the real
 * pay, withholding and save.
 */

vi.mock("./state-income-tax-law", async (importOriginal) => ({
  ...(await importOriginal<typeof TaxLaw>()),
  stateIncomeTaxUnderLaw: vi.fn(),
}));

const rule = vi.mocked(stateIncomeTaxUnderLaw);
const actual = await vi.importActual<typeof TaxLaw>("./state-income-tax-law");
const LAW = "measure_state-income-tax-test" as EntityId;

beforeEach(() => {
  rule.mockReset();
  rule.mockImplementation(actual.stateIncomeTaxUnderLaw);
});

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

describe("a paycheck under a state's new income tax law", () => {
  it("withholds Nevada's newly adopted income tax, sends it to Nevada, and keeps the estimate's label", () => {
    const start = newLife("3223500", "state-income-tax-law-ely");
    expect(residenceStateKey(start.world, start.personId)).toBe("US-NV");
    rule.mockImplementation((_world, stateKey): StateIncomeTaxUnderLaw => {
      if (stateKey !== "US-NV") return { kind: "as-begun" };
      return {
        kind: "estimated",
        shape: "graduated",
        lawMeasureIds: [LAW],
        schedule: {
          standardDeductionMinor: 800_000,
          brackets: [
            { overMinor: 0, rateBasisPoints: 300 },
            { overMinor: 2_000_000, rateBasisPoints: 500 },
          ],
          sourceUrl: "https://taxfoundation.org/",
        },
        estimatedFromAverage: "ESTIMATED FROM AVERAGE: test.",
      };
    });
    const worked = workOneShift(start.world);
    const nevada = worked.history.statutoryTaxLiabilities!.find(
      (row) => row.taxKey === "us-nv:wage-income-tax",
    )!;
    // $72.00 a shift is $18,720.00 a year; less $8,000.00 is $10,720.00,
    // at 3% $321.60 a year, $1.2369 a shift: $1.24.
    expect(nevada.status).toBe("assessed");
    expect(nevada.liability!.minorUnits).toBe(124);
    expect(nevada.lawMeasureIds).toEqual([LAW]);
    expect(nevada.estimatedFromAverage).toBe("ESTIMATED FROM AVERAGE: test.");
    const toNevada = worked.history.resourceTransferOutcomes.find(
      (row) => row.note === "Withheld from pay for state income tax.",
    );
    expect(toNevada?.transferredAmount.minorUnits).toBe(124);
    const reloaded = deserializeWorld(serializeWorld(worked));
    expect(
      reloaded.history.statutoryTaxLiabilities!.find(
        (row) => row.id === nevada.id,
      ),
    ).toEqual(nevada);
  });

  it("stops withholding Minnesota's income tax after a repeal", () => {
    const start = newLife("2743000", "state-income-tax-law-minneapolis");
    expect(residenceStateKey(start.world, start.personId)).toBe("US-MN");
    rule.mockImplementation((_world, stateKey) =>
      stateKey === "US-MN"
        ? { kind: "repealed", lawMeasureIds: [LAW] }
        : { kind: "as-begun" },
    );
    const worked = workOneShift(start.world);
    const minnesota = worked.history.statutoryTaxLiabilities!.find(
      (row) => row.taxKey === "us-mn:wage-income-tax",
    )!;
    expect(minnesota.status).toBe("not-imposed");
    expect(minnesota.liability!.minorUnits).toBe(0);
    expect(minnesota.lawMeasureIds).toEqual([LAW]);
    expect(
      worked.history.resourceTransferOutcomes.some(
        (row) => row.note === "Withheld from pay for state income tax.",
      ),
    ).toBe(false);
  });

  it("leaves a paycheck as it was where no law changed the state's tax", () => {
    const start = newLife("2743000", "state-income-tax-law-minneapolis-2");
    const worked = workOneShift(start.world);
    const minnesota = worked.history.statutoryTaxLiabilities!.find(
      (row) => row.taxKey === "us-mn:wage-income-tax",
    )!;
    expect(minnesota.liability!.minorUnits).toBe(70);
    expect(minnesota.lawMeasureIds).toBeUndefined();
    expect(minnesota.estimatedFromAverage).toBeUndefined();
  });
});
