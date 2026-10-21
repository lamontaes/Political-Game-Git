/**
 * How a played year's hires, quits, layoffs and separations land against the
 * BLS JOLTS 2025 annual averages and the CPS absence rate, in a place drawn
 * from all 56 on a seed nobody chose (pool item research-residents-cadence-
 * sourced). The bands check totals; they never decide one worker's outcome.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { absenceRate, joltsRate, turnoverReport } from "./turnover-check";

const seed = process.env.TURNOVER_SEED ?? randomBytes(8).toString("hex");

it("the data carries every JOLTS industry row for each of the four rates, and the CPS absence rows", () => {
  for (const kind of [
    "hires",
    "totalSeparations",
    "quits",
    "layoffsAndDischarges",
  ] as const) {
    expect(joltsRate(kind), kind).toBeGreaterThan(0);
    expect(
      joltsRate(kind, "Accommodation and food services"),
      kind,
    ).toBeGreaterThan(0);
    expect(joltsRate(kind, "Government"), kind).toBeGreaterThan(0);
  }
  // Quits and layoffs are parts of separations, in every row.
  for (const industry of ["Total", "Retail trade", "Government"])
    expect(
      joltsRate("quits", industry)! +
        joltsRate("layoffsAndDischarges", industry)!,
      industry,
    ).toBeLessThanOrEqual(joltsRate("totalSeparations", industry)! + 0.15);
  expect(absenceRate("Public sector")).toBeGreaterThan(
    absenceRate("Private sector")!,
  );
});

it("reports a played year's monthly turnover rates against JOLTS, by record id", () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "residents-turnover");
  const where = `seed ${seed}, ${place.name} (${place.key}), world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const from = core.date;
  const to = addDays(makeIsoDate(from), 365);
  advanceCore(core, to);
  const report = turnoverReport(core, from, to);
  const lines = Object.entries(report.rates).map(
    ([kind, r]) =>
      `${kind}: ${r.town.toFixed(2)} a month against JOLTS ${r.jolts}`,
  );
  console.log(
    `turnover: ${where}; ${report.employed} employed; changes ${JSON.stringify(report.counts)}; ${lines.join("; ")}; ids ${JSON.stringify(report.ids)}`,
  );
  expect(report.employed, where).toBeGreaterThan(0);
  expect(Object.keys(report.counts).length, where).toBeGreaterThan(0);
  for (const r of Object.values(report.rates))
    expect(Number.isFinite(r.town), where).toBe(true);
}, 3_600_000);
