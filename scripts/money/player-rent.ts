/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** The player's household rent, cash and arrears month by month: npx tsx scripts/money/player-rent.ts <seed> [months] [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const months = Number(process.argv[3] ?? 6);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core: any = world.core;
console.log(`${drawn.name} ${key} seed ${seed} player ${core.playerId}`);
const player = core.people.get(core.playerId);
const hh = player?.householdId;
const report = (label: string) => {
  const members = core.households.get(hh)?.memberIds ?? [];
  const cash = members.reduce(
    (n: number, id: string) => n + (core.people.get(id)?.liquidMinor ?? 0),
    0,
  );
  const leases = [...core.finance.contracts.values()].filter(
    (c: any) => c.householdId === hh && String(c.id).startsWith("lease:"),
  );
  const pay = members.reduce((n: number, id: string) => {
    const j = core.jobs.get(core.people.get(id)?.jobId ?? "");
    return n + (j && !j.endsAt ? j.wageDailyMinor : 0);
  }, 0);
  const plan = core.finance.livingPlans.get(hh);
  console.log(
    label,
    `cash ${cash} dailyPay ${pay} living/mo ${plan?.monthlyMinor ?? 0} leases`,
    leases.map((c: any) => `${c.amountMinor}/mo arrears ${c.arrearsMinor}`),
  );
};
report("start");
for (let m = 1; m <= months; m++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  report(`month ${m} ${core.date}`);
}
