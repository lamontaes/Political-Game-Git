/**
 * Does every employer pay its counted workers? For each drawn place, the played
 * world for 120 days, then every counted-flow wage payroll (the residents
 * runtime's wage flows; the work engine's full workers are not read here)
 * whose last payday paid nothing, by employer: its name, whether it has a
 * public pay authority, its cash, and how many counted jobs it holds.
 *
 * Run: node --import tsx scripts/core2-year/wages-unpaid-check.ts [seed ...]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { drawPlace } from "./place";

const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [randomBytes(6).toString("hex")];
for (const seed of seeds) {
  const place = drawPlace(seed, "wages-unpaid");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const rt = residentsRuntime(core)!;
  const unpaid = new Map<string, { jobs: number; asked: number }>();
  let wageFlows = 0;
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "wages" || flow.endedAt) continue;
    wageFlows += 1;
    if ((flow.lastRequestedMinor ?? 0) > 0 && (flow.lastPaidMinor ?? 0) === 0) {
      const row = unpaid.get(flow.payerId) ?? { jobs: 0, asked: 0 };
      row.jobs += flow.jobIds?.length ?? 0;
      row.asked += flow.lastRequestedMinor ?? 0;
      unpaid.set(flow.payerId, row);
    }
  }
  console.log(
    `${place.name} (${place.key}), seed ${seed}: ${wageFlows} counted wage flows, ${unpaid.size} employers paid nothing at their last payday`,
  );
  for (const [id, row] of unpaid) {
    const org = core.organizations.get(id);
    console.log(
      `   ${org?.name ?? id}: ${row.jobs} counted jobs, asked ${Math.round(row.asked / 100)}, cash ${Math.round((org?.liquidMinor ?? 0) / 100)}, public pay authority ${org?.publicPayAuthority ? "yes" : "no"}`,
    );
  }
}
