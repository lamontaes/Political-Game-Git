/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** What the sewer slice collected against what its payers could owe, by draw: npx tsx scripts/money/sewer-bounds.ts <seed> [draws] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import {
  serviceChargeShares,
  serviceChargesPaidBy,
  townPayers,
} from "../../src/core2/budgets-service-charges";
import { lawChain } from "../../src/core2/modules/laws";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "sb";
const draws = Number(process.argv[3] ?? 3);
setBookkeeping(false);
for (let i = 0; i < draws; i++) {
  const draw = drawPlace(
    seed,
    process.env.DRAW_PREFIX
      ? `${process.env.DRAW_PREFIX}${i + Number(process.env.DRAW_FROM ?? 0)}`
      : `sewer-bounds-${i}`,
  );
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api: any = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 75));
  const use = townPayers(api, lawChain(api).townPlaceId);
  for (const row of serviceChargeShares(api).filter((r) => r.share > 0)) {
    const months = serviceChargesPaidBy(api, row.governmentId);
    const full = months[months.length - 1];
    if (!full) continue;
    const sewer = full.byService["sewerage-and-solid-waste"] ?? 0;
    const cap =
      use.dwellings * row.sewerPerDwellingMinor +
      use.firms.size * row.sewerPerFirmMinor;
    console.log(
      `${draw.key} ${draw.state} ${row.governmentId}: paid ${full.paidMinor} target ${row.targetMonthlyMinor} living ${row.livingMonthlyMinor} | sewer ${sewer} cap ${cap} (dwellings ${use.dwellings} x ${row.sewerPerDwellingMinor}, counted ${use.counted.size}, firms ${use.firms.size} x ${row.sewerPerFirmMinor})`,
    );
  }
}
