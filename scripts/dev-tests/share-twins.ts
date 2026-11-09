/* eslint-disable @typescript-eslint/no-explicit-any */
// Which sitting holders share one winning share: tsx share-twins.ts <seed> <placeKey>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
setBookkeeping(false);
const [seed = "470ee38255a8031d", key = "1931035", suffix = "a"] =
  process.argv.slice(2);
const { core } = buildBenchWorld(`${seed}:${suffix}`, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
advanceCore(core, addDays(makeIsoDate(core.date), 2));
const terms = coreAPI(core)
  .moduleState(OFFICES_MODULE_ID)
  .table("terms")
  .rows() as any[];
const by = new Map<number, any[]>();
for (const t of terms)
  if (t.elected)
    (
      by.get(t.elected.share) ??
      by.set(t.elected.share, []).get(t.elected.share)!
    ).push(t);
console.log(
  "terms with a share",
  [...by.values()].flat().length,
  "distinct",
  by.size,
);
for (const [share, ts] of by)
  if (ts.length > 1)
    for (const t of ts)
      console.log(
        "TWIN",
        share,
        t.id,
        t.seatId,
        t.personId,
        JSON.stringify(t.elected),
      );
