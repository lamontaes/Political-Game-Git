/**
 * Pool item macro-mortgage-rate-fhfa-transition-index: an owner who bought
 * from June 2019 on carries the 30-year rate FHFA's MIRS Transition Index
 * gives for June of the year they bought, moved by this world's long-rate
 * offset (housing-mortgages.ts reads worldMortgageRate), and pays it through a played year, at
 * Belfast, Pennsylvania.
 *
 * Pinned (tests-housing-sale-tests-draw-from-the-clock): the old test drew up
 * to eight places from randomBytes until an owner there bought since 2019,
 * on the premise that a few draws always find one, and followed the first
 * such loan by id. Belfast at this seed has 75 such loans; the one followed
 * is named.
 */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { worldMortgageRate } from "./macro-model";
import { housingMacroParameter } from "./modules/housing";

const BELFAST = {
  name: "Belfast, Pennsylvania",
  key: "4205152",
  seed: "3836c2c129d6e60cf20b911e8a17101b163ac9e608d649a65d66135cdc736b0c",
  loanId: "mortgage:household_b744e28931e15936",
};

/** FHFA's index, each value under the month two before its release. */
function transitionIndex(): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of readFileSync(
    new URL(
      "../../data/research/macro/series/mirs-transition-index.csv",
      import.meta.url,
    ),
    "utf8",
  )
    .split(/\r?\n/)
    .slice(1)) {
    const [date, value] = line.split(",");
    if (!date || !value) continue;
    const [month, , year] = date.split("/").map(Number) as [
      number,
      number,
      number,
    ];
    const at = year * 12 + month - 1 - 2;
    out.set(
      `${Math.floor(at / 12)}-${String((at % 12) + 1).padStart(2, "0")}`,
      Number(value),
    );
  }
  return out;
}

interface MortgageRow {
  id: string;
  householdId: string;
  boughtYear: number;
  rate: number;
  balanceMinor: number;
  missedMonths?: number;
}

it("an owner who bought since June 2019 pays FHFA's index rate for that June", () => {
  const index = transitionIndex();
  {
    const place = BELFAST;
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const started = core.date;
    // The housing engine writes the opening's loans on its first day.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const mortgages = () =>
      api
        .moduleState("housing")
        .table("mortgages")
        .rows() as unknown as MortgageRow[];
    const recent = mortgages()
      .filter((row) => row.boughtYear >= 2019 && row.boughtYear <= 2025)
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(recent.length, `${where}: loans bought since 2019`).toBeGreaterThan(
      0,
    );
    // This world's rate that June: FHFA's index moved by the world's own
    // long-rate offset (worldMortgageRate), the rate the economy's past
    // and the home price path read too.
    for (const row of recent) {
      expect(index.get(`${row.boughtYear}-06`), where).toBeDefined();
      expect(
        row.rate * 100,
        `${where} ${row.id} bought ${row.boughtYear}`,
      ).toBeCloseTo(
        worldMortgageRate(
          `${row.boughtYear}-06`,
          started,
          core.seed,
          housingMacroParameter,
        ),
        10,
      );
    }
    const loan = recent.find((row) => row.id === place.loanId)!;
    expect(loan, `${where}: ${place.loanId} bought since 2019`).toBeTruthy();
    const before = loan.balanceMinor;
    advanceCore(core, addDays(makeIsoDate(core.date), 364));
    const after = api
      .moduleState("housing")
      .table("mortgages")
      .get(loan.id) as unknown as MortgageRow;
    // A year's payments at that rate went to the loan.
    expect(after.balanceMinor, `${where} ${loan.id}`).toBeLessThan(before);
    process.stdout.write(
      `MORTGAGE ${where}: ${loan.id} bought ${loan.boughtYear} at ${(loan.rate * 100).toFixed(2)}% (index for ${loan.boughtYear}-06), balance ${before} to ${after.balanceMinor}, missed ${after.missedMonths ?? 0}; ${recent.length} loans bought since 2019\n`,
    );
  }
  // About 104 s measured: building Belfast and its played year (loan payments settle only on played days).
}, 900_000);
