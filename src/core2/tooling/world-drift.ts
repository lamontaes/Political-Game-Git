/**
 * The long-run drift check: the whole economy in a drawn town, with the
 * town's own income feeding the national step, for many years. Prints every
 * simulated month outside the 1990-2026 bands (when, how far, and the
 * national state behind it) and each year's levels, as JSON.
 *
 *   node --max-old-space-size=8192 --import tsx src/core2/tooling/world-drift.ts <seed> <key> [years]
 */
import { advanceCore, createLifeCore } from "../life";
import { checkBands, type MacroMonth } from "../macro-model";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { parameter } from "../parameters";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const [seed, key, yearsArg] = process.argv.slice(2);
if (!seed || !key)
  throw new Error("Usage: world-drift.ts <seed> <key> [years]");
const years = Number(yearsArg ?? 20);
const data = worldCoreData(),
  p = (k: string) => parameter(k, data.parameters);
const t0 = Date.now();
const input = withWorldEconomy(
  generatedOpening({ seed, key }, { twoLevel: true }),
);
const core = createLifeCore(input, { data, modules: [...WORLD_MODULES] });
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + years);
advanceCore(core, end.toISOString().slice(0, 10));
const api = coreAPI(core);
const months = [...api.moduleState("macro").table("months").rows()].sort(
  (a, b) => String(a.month).localeCompare(String(b.month)),
) as unknown as (MacroMonth & { townIncomeGrowthPct?: number })[];
const byMonth = new Map(months.map((row) => [row.month, row]));
const bands = checkBands(months, p).filter((row) => !row.baseIsHistory);
const exits = bands
  .filter((row) => !row.inside)
  .map((row) => {
    const m = byMonth.get(row.at)!;
    return {
      measure: row.measure,
      month: row.at,
      value: Number(row.value.toFixed(2)),
      band: [row.low, row.high],
      beyondBy: Number(
        (row.value < row.low
          ? row.value - row.low
          : row.value - row.high
        ).toFixed(2),
      ),
      // The national state that month: what drove it.
      state: {
        unemploymentPct: Number(m.unemploymentPct.toFixed(2)),
        inflationPct: Number(m.inflationPct.toFixed(2)),
        outputGapPct: Number(m.outputGapPct.toFixed(2)),
        policyRatePct: Number(m.policyRatePct.toFixed(2)),
        townIncomeGrowthPct:
          m.townIncomeGrowthPct === undefined
            ? null
            : Number(m.townIncomeGrowthPct.toFixed(2)),
      },
    };
  });
const yearly = months
  .filter((row) => row.kind === "simulated" && row.month.endsWith("-12"))
  .map((row) => ({
    year: row.month.slice(0, 4),
    unemploymentPct: Number(row.unemploymentPct.toFixed(2)),
    inflationPct: Number(row.inflationPct.toFixed(2)),
    outputGapPct: Number(row.outputGapPct.toFixed(2)),
    policyRatePct: Number(row.policyRatePct.toFixed(2)),
    mortgage30Pct: Number(row.mortgage30Pct.toFixed(2)),
    townIncomeGrowthPct:
      row.townIncomeGrowthPct === undefined
        ? null
        : Number(row.townIncomeGrowthPct.toFixed(2)),
  }));
let cash = 0,
  outside = 0;
for (const row of core.people.values()) cash += row.liquidMinor;
for (const row of core.organizations.values()) cash += row.liquidMinor;
for (const row of core.cashJournal.externalFlowsByOwner.values())
  outside += row.netMinor;
console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      years,
      seconds: Math.round((Date.now() - t0) / 1000),
      bandRows: bands.length,
      exits,
      yearly,
      townCashMinor: cash,
      outsideNetMinor: outside,
    },
    null,
    1,
  ),
);
