/**
 * Proves a couple's move-in follows through the household writer in a played
 * world (Lives, Nov 8, 2026): for each `family.moved-in` in the years run, the
 * mover's old household, the household they joined, its dwelling, and cash.
 *   node --import tsx scripts/dialogue-batch/move-in-proof.ts --seed <s> [--years 3]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { registerModule, coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { OPENING_DATE } from "./play-lives";
const at = process.argv.indexOf("--seed");
const seed = at >= 0 ? process.argv[at + 1]! : "move-in";
const yi = process.argv.indexOf("--years");
const years = yi >= 0 ? Number(process.argv[yi + 1]) : 3;
const place = drawPlace(seed, "move-in");
setBookkeeping(false);
const { core } = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const rows: string[] = [];
registerModule(core, {
  id: "move-in:watch",
  eventKinds: ["family.moved-in"],
  onEvent: (a, event) => {
    const [mover, host] = event.personIds.map((id) => core.people.get(id)!);
    const home = core.households.get(host!.householdId)!;
    const dw = core.modules.has("housing")
      ? a
          .moduleState("housing")
          .table("dwellings")
          .get(`dwelling:${host!.householdId}`)
      : undefined;
    rows.push(
      `${event.id}: ${mover!.givenName} (cash ${mover!.liquidMinor}) joined ${host!.givenName}'s household ${home.id} (${home.memberIds.length} members now), dwelling ${JSON.stringify(dw ? { tenure: (dw as { tenure?: string }).tenure } : null)}, mover.householdId===host ${mover!.householdId === host!.householdId}`,
    );
  },
});
advanceCore(core, addDays(makeIsoDate(core.date), years * 365));
void api;
console.log(
  `${place.name} (${place.key}), seed ${place.seed}: ${rows.length} move-ins`,
);
for (const r of rows.slice(0, 6)) console.log(r);
