/**
 * The four thresholds the game once read in a fixed year's dollars (the Census
 * poverty line, the HHS poverty guideline every means test reads, the income
 * fifth limits and the award a new retirement claim sets) stand as written on
 * day one and then move with this world's own prices or pay, read from the
 * economy's own months (SG-WORLD-tax-index-january). Played in a place drawn
 * from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import thresholds from "./data/world-metrics/poverty-thresholds-2024.json" with { type: "json" };
import COUNTED from "./data/counted/parameters.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { incomeBandOf } from "./counted-income-fifth";
import { lawChain } from "./modules/laws";
import { advanceCore } from "./life";
import { povertyLineDollars as hhsLineDollars } from "./law-reach/poverty-line";
import {
  placesFacts,
  povertyLineDollars as reachLineDollars,
} from "./law-reach/group-b-people";
import {
  groupKeyOf,
  householdIncome,
  residentsRuntime,
} from "./modules/residents";
import { retirementAwardMonthlyMinor } from "./modules/retirement-claims";
import { coreAPI } from "./state";
import { sinceOpeningIndex, taxIndexOf } from "./tax-index";
import { householdPoverty, povertyThresholdMinor } from "./world-poverty";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "thresholds-follow-the-world");
const where = `${place.name} (${place.key}), replay ${replay}`;
const near = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(0.001 * Math.abs(b), 1);

describe("thresholds follow the world's own prices and pay", () => {
  it(`${where}: day one as written, a year on as this world's economy moved`, () => {
    setBookkeeping(false);
    try {
      const opening = gameStartDate();
      const { core } = buildBenchWorld(place.seed, opening, {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const chain = lawChain(api);
      const openingYear = Number(core.startedAt.slice(0, 4));
      const rt = residentsRuntime(core)!;
      const households = [...rt.store.liveHouseholds()].slice(0, 300);
      const claimant = {
        birthDate: "1950-01-01",
        traits: {} as Record<string, number>,
      };
      const dayOne = () => ({
        poverty: householdPoverty(core)
          .slice(0, 40)
          .map((row) => ({ ...row })),
        guideline: reachLineDollars(chain.stateKey, 3, 1),
        fifthBands: households.map((h) => incomeBandOf(householdIncome(rt, h))),
        award: retirementAwardMonthlyMinor(api, claimant, 1)!.monthlyMinor,
      });

      // Day one: each threshold is its data file's own number.
      const t = thresholds as unknown as {
        minorPerDollar: number;
        bySize: Record<string, number[]>;
      };
      expect(
        povertyThresholdMinor(3, 1, 40),
        `${where}: day-one poverty line is the table's`,
      ).toBe(t.bySize["3"]![1]! * t.minorPerDollar);
      const first = dayOne();
      for (const row of first.poverty)
        expect(
          row.thresholdMinor,
          `${where}: day-one household ${row.householdId} line`,
        ).toBe(povertyThresholdMinor(row.size, row.children, row.eldestAge, 1));
      expect(
        sinceOpeningIndex(api, "prices"),
        `${where}: day-one price index`,
      ).toBe(1);
      expect(
        sinceOpeningIndex(api, "wages"),
        `${where}: day-one wage index`,
      ).toBe(1);
      expect(
        retirementAwardMonthlyMinor(api, claimant)!.monthlyMinor,
        `${where}: day-one award`,
      ).toBe(first.award);
      const dayOneFacts = placesFacts(api, [chain.townPlaceId]);
      expect(dayOneFacts.priceIndex, `${where}: day-one facts index`).toBe(1);
      expect(
        hhsLineDollars(chain.stateKey, 3, dayOneFacts.priceIndex),
        `${where}: day-one guideline`,
      ).toBe(hhsLineDollars(chain.stateKey, 3));

      // A year and about a month on, in February of the next year.
      advanceCore(core, addDays(makeIsoDate(`${openingYear + 1}-02-10`), 0));
      const index = taxIndexOf(api)!;
      const prices = index("prices", openingYear);
      const wages = index("wages", openingYear);
      expect(
        prices,
        `${where}: prices ${prices} did not move, so this proves nothing`,
      ).not.toBe(1);
      expect(
        wages,
        `${where}: wages ${wages} did not move, so this proves nothing`,
      ).not.toBe(1);

      // 1. The Census poverty line, every household's, by the prices.
      const rows = householdPoverty(core).slice(0, 40);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows)
        expect(
          near(
            row.thresholdMinor,
            povertyThresholdMinor(row.size, row.children, row.eldestAge, 1) *
              prices,
          ),
          `${where}: household ${row.householdId} line ${row.thresholdMinor} against base times ${prices}`,
        ).toBe(true);

      // 2. The HHS guideline every means test reads, by the prices.
      const facts = placesFacts(api, [chain.townPlaceId]);
      expect(
        near(facts.priceIndex, prices),
        `${where}: facts index ${facts.priceIndex} against ${prices}`,
      ).toBe(true);
      expect(
        near(
          reachLineDollars(chain.stateKey, 3, facts.priceIndex),
          first.guideline * prices,
        ),
        `${where}: reach guideline ${reachLineDollars(chain.stateKey, 3, facts.priceIndex)} against ${first.guideline} times ${prices}`,
      ).toBe(true);
      expect(
        near(
          hhsLineDollars(chain.stateKey, 3, facts.priceIndex),
          hhsLineDollars(chain.stateKey, 3) * prices,
        ),
        `${where}: HHS guideline`,
      ).toBe(true);

      // 3. The income fifth limits, by the pay. A pay between the old and
      // the moved first limit sits one fifth apart; the caller reads the same index.
      const limit =
        (COUNTED as unknown as Record<string, { value: number }>)[
          "countedIncomeFifthLimit1Dollars"
        ]!.value * 100;
      const between = (limit * (1 + wages)) / 2;
      expect(
        incomeBandOf(between, wages),
        `${where}: a pay between the day-one and moved limit`,
      ).toBe(incomeBandOf(between, 1) + (wages > 1 ? -1 : 1));
      expect(
        incomeBandOf(limit * wages * 0.999, wages),
        `${where}: just under the moved limit`,
      ).toBe(0);
      expect(
        incomeBandOf(limit * wages * 1.001, wages),
        `${where}: just over the moved limit`,
      ).toBeGreaterThanOrEqual(1);
      const date = core.date;
      for (const h of households)
        expect(
          groupKeyOf(rt, h, date).incomeBand,
          `${where}: household ${h.id} band read with the pay index ${wages}`,
        ).toBe(incomeBandOf(householdIncome(rt, h), wages));

      // 4. The award a new claim sets, by the pay.
      const base = retirementAwardMonthlyMinor(api, claimant, 1)!;
      const now = retirementAwardMonthlyMinor(api, claimant)!;
      expect(
        near(now.monthlyMinor, Math.floor(base.monthlyMinor * wages)),
        `${where}: award ${now.monthlyMinor} against base ${base.monthlyMinor} times ${wages}`,
      ).toBe(true);
      process.stderr.write(
        `thresholds ${where}: prices ${prices}, wages ${wages}; ` +
          `poverty ${first.poverty[0]!.thresholdMinor} -> ${rows[0]!.thresholdMinor}; ` +
          `guideline ${first.guideline} -> ${reachLineDollars(chain.stateKey, 3, facts.priceIndex)}; ` +
          `award ${first.award} -> ${now.monthlyMinor}\n`,
      );
    } finally {
      setBookkeeping(true);
    }
  }, 600_000);
});
