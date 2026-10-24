/**
 * Pool item macro-mortgage-rate-fhfa-transition-index: an owner who bought
 * from June 2019 on carries the 30-year rate FHFA's MIRS Transition Index
 * gives for June of the year they bought (housing-mortgages.ts reads
 * historicalMortgageRate), and pays it through a played year. A place is
 * drawn from all 56 on a seed nobody chose (MORTGAGE_HISTORY_SEED pins one),
 * redrawn (bounded) until an owner there bought since 2019.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const seed =
  process.env.MORTGAGE_HISTORY_SEED ?? randomBytes(8).toString("hex");

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

it(
  "an owner who bought since June 2019 pays FHFA's index rate for that June",
  () => {
    const index = transitionIndex();
    const tried: string[] = [];
    for (let draw = 0; draw < 8; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "mortgage-history");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
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
      tried.push(
        `${where}: ${recent.length} of ${mortgages().length} bought since 2019`,
      );
      if (!recent.length) continue;
      for (const row of recent)
        expect(
          row.rate * 100,
          `${where} ${row.id} bought ${row.boughtYear}`,
        ).toBeCloseTo(index.get(`${row.boughtYear}-06`)!, 10);
      const loan = recent[0]!;
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
      return;
    }
    throw new Error(
      `no owner who bought since 2019 in 8 places (${seed}): ${tried.join("; ")}`,
    );
    // A drawn town's year took 50 to 190 seconds on a 4-core container.
  },
  8 * 240_000,
);
