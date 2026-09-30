import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "../presentation/new-game";
import { advanceWorld } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  enterLifePath,
  performLifePathSession,
  scheduleLifePathSession,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import { FEDERAL_INCOME_TAX_KEY } from "./statutory-tax";
import type { EntityId, World } from "./types";
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

import * as federalReader from "./federal-top-income-tax-law";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "./federal-top-income-tax-law";
import { makeIsoDate } from "./dates";

describe("federal law attribution on a saved paycheck", () => {
  afterEach(() => vi.restoreAllMocks());
  for (const placeKey of [
    "3223500",
    "2743000",
    "5363000",
    "3755000",
    "1235000",
  ]) {
    it(`keeps the governing law and actual payment IDs in ${placeKey}`, () => {
      const start = newLife(placeKey, `federal-stamp-${placeKey}`);
      const id = `legislative-measure_fixture_${placeKey}` as EntityId;
      const operativeAt = makeIsoDate(
        `${start.world.currentDate.slice(0, 4)}-01-01`,
      );
      const readFederal = federalReader.federalIncomeTaxUnderLaw;
      // This unit fixture supplies the legal reader's result; the saved tax
      // assessment, withholding transfer and serialization remain real writers.
      vi.spyOn(federalReader, "federalIncomeTaxUnderLaw").mockImplementation(
        (world, status, paidAt) => ({
          ...readFederal(world, status, paidAt),
          lawMeasureIds: [id],
          governingLaw: {
            answer: "yes",
            measureId: id,
            origin: "enacted",
            level: "federal-statute",
            operativeAt,
          },
        }),
      );
      const world = start.world;
      const paid = workOneShift(world);
      const row = paid.history.statutoryTaxLiabilities?.find(
        (r) =>
          r.taxKey === FEDERAL_INCOME_TAX_KEY &&
          r.lawEffectStamps?.some((s) => s.governingLawKey === id),
      );
      expect(row).toBeDefined();
      const stamp = row!.lawEffectStamps![0]!;
      expect(stamp.appliedAt).toBe(row!.occurredAt);
      expect(stamp.sourceRecordIds).toContain(row!.sourceOutcomeId);
      expect(stamp.questionKey).toBe(RAISE_TOP_FEDERAL_RATE_QUESTION);
      const restored = deserializeWorld(serializeWorld(paid));
      expect(
        restored.history.statutoryTaxLiabilities?.find((r) => r.id === row!.id)
          ?.lawEffectStamps,
      ).toEqual(row!.lawEffectStamps);
    });
  }
});
