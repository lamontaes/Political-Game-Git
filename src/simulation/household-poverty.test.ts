import { describe, expect, it } from "vitest";

import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { annualPovertyLineMinor } from "./crisis/health-coverage";
import { addDays, makeIsoDate } from "./dates";
import {
  HOUSEHOLD_POVERTY_TRANSITION_KEY,
  personPovertyStatusAt,
  recordedPovertyShare,
} from "./household-poverty";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { OUTCOME_MEASURES } from "./outcome-web";
import { SeededRng } from "./rng";
import { assertWorldIntegrityFully, deserializeWorld, serializeWorld } from ".";

/**
 * Slice 1, "Your money": each household's month measured against the federal
 * poverty guideline, from what its members were actually paid.
 */

const DOLLARS = (cents: number) => cents / 100;

describe("the HHS 2026 poverty guideline (91 FR 1797)", () => {
  // The three published tables, sizes 1 to 8, read from the notice.
  const TABLES: Readonly<Record<string, readonly number[]>> = {
    "US-OH": [15960, 21640, 27320, 33000, 38680, 44360, 50040, 55720],
    "US-AK": [19950, 27050, 34150, 41250, 48350, 55450, 62550, 69650],
    "US-HI": [18360, 24890, 31420, 37950, 44480, 51010, 57540, 64070],
  };

  it("matches every published figure for the 48 states and D.C., Alaska and Hawaii", () => {
    for (const [stateKey, amounts] of Object.entries(TABLES))
      amounts.forEach((amount, index) =>
        expect(
          DOLLARS(
            annualPovertyLineMinor(
              stateKey,
              index + 1,
              makeIsoDate("2026-06-01"),
            ),
          ),
          `${stateKey}, ${index + 1} people`,
        ).toBe(amount),
      );
    // Past eight, each added person adds the published increment.
    expect(
      DOLLARS(annualPovertyLineMinor("US-HI", 9, makeIsoDate("2026-06-01"))),
    ).toBe(64070 + 6530);
    expect(
      DOLLARS(annualPovertyLineMinor("US-AK", 9, makeIsoDate("2026-06-01"))),
    ).toBe(69650 + 7100);
  });

  it("applies one rule to every place: the territories read the 48-state table", () => {
    for (const { jurisdictionKey } of lifePlaceStateIdentities()) {
      const line = annualPovertyLineMinor(
        jurisdictionKey,
        3,
        makeIsoDate("2026-06-01"),
      );
      const name = stateJurisdictionForKey(jurisdictionKey)?.name;
      const expected =
        name === "Alaska" ? 34150 : name === "Hawaii" ? 31420 : 27320;
      expect(DOLLARS(line), jurisdictionKey).toBe(expected);
    }
  });

  it("takes effect on January 13, 2026; the 2025 guideline holds before it", () => {
    expect(
      DOLLARS(annualPovertyLineMinor("US-OH", 1, makeIsoDate("2026-01-12"))),
    ).toBe(15650);
    expect(
      DOLLARS(annualPovertyLineMinor("US-OH", 1, makeIsoDate("2026-01-13"))),
    ).toBe(15960);
  });
});

/**
 * A new life in a state drawn by a named seed from all 56, played on the real
 * clock across two month boundaries: payday pays the town, and each first of
 * the month saves every household's status for the month before.
 */
const DRAW_SEED = "slice1:household-poverty:1";

describe("each household's month, saved on the clock", () => {
  const states = lifePlaceStateIdentities();
  const state = states[new SeededRng(DRAW_SEED).integer(0, states.length)]!;
  const label = `${state.name} (seed ${DRAW_SEED})`;
  const { world: opened, personId } = adultLifeIn(state.usps, DRAW_SEED);
  // From the opening to just past the second first-of-month.
  const firstPass = makeIsoDate(
    `${opened.currentDate.slice(0, 5)}${String(Number(opened.currentDate.slice(5, 7)) + 1).padStart(2, "0")}-01`,
  );
  const days =
    (Date.parse(addDays(firstPass, 32).slice(0, 7) + "-02") -
      Date.parse(opened.currentDate)) /
    86_400_000;
  const world = passOrdinaryDays(opened, days);
  const rows = world.history.householdPoverty ?? [];
  const months = [...new Set(rows.map((row) => row.month))].sort();

  it(`schedules itself at the opening and records two months (${label})`, () => {
    expect(
      opened.history.futureDueItems.some(
        (item) => item.transitionKey === HOUSEHOLD_POVERTY_TRANSITION_KEY,
      ),
    ).toBe(true);
    expect(months).toHaveLength(2);
    expect(months[0]).toBe(opened.currentDate.slice(0, 7));
    // Every household with living members has a row in each month, once.
    for (const month of months) {
      const ids = rows
        .filter((row) => row.month === month)
        .map((row) => row.householdId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  it(`reads recorded pay: statuses follow the paychecks, unknown is never zero (${label})`, () => {
    const second = rows.filter((row) => row.month === months[1]);
    const known = second.filter((row) => row.status !== "pay-unrecorded");
    // By the second month payday has paid, so most households' pay is known.
    expect(known.length).toBeGreaterThan(0);
    expect(second.some((row) => (row.monthlyPayMinor ?? 0) > 0)).toBe(true);
    for (const row of rows) {
      if (row.status === "pay-unrecorded")
        expect(row.monthlyPayMinor).toBeNull();
      else
        expect(row.status).toBe(
          row.monthlyPayMinor! < row.monthlyGuidelineMinor
            ? "below"
            : "at-or-above",
        );
      // The guideline is the published one for this size and state, a month's share.
      expect(row.monthlyGuidelineMinor).toBe(
        Math.round(
          annualPovertyLineMinor(
            row.stateKey,
            row.memberIds.length,
            addDays(makeIsoDate(`${row.month}-01`), 27),
          ) / 12,
        ),
      );
    }
  });

  it(`is readable by the outcome web and the opinion code (${label})`, () => {
    const measure = OUTCOME_MEASURES["household.recorded-poverty-share"];
    expect(measure).toBeDefined();
    const stateId = stateJurisdictionForKey(state.jurisdictionKey)!.id;
    const share = measure!.read(world, stateId, world.currentDate);
    expect(share).not.toBeNull();
    expect(share).toBeGreaterThanOrEqual(0);
    expect(share).toBeLessThanOrEqual(1);
    expect(share).toBe(recordedPovertyShare(world, stateId, world.currentDate));
    // Before the first month is saved, unknown, never zero.
    expect(measure!.read(opened, stateId, opened.currentDate)).toBeNull();
    expect(personPovertyStatusAt(world, personId)).toMatch(
      /^(below|at-or-above|pay-unrecorded)$/,
    );
  });

  it(`survives integrity and a save and reload unchanged (${label})`, () => {
    expect(() => assertWorldIntegrityFully(world)).not.toThrow();
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(reloaded.history.householdPoverty).toEqual(rows);
  });
});
