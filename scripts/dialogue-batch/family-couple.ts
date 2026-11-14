import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { makeIsoDate } from "../../src/core2/kernel/dates";
import { moduleState } from "../../src/core2/module-state";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";
const [seed, until] = process.argv.slice(2);
const place = drawPlace(seed!, "family-life");
setBookkeeping(false);
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const core: any = w.core; const pid = w.playerId!;
for (const d of ["2027-06-01", "2028-06-01", until!]) {
  advanceCore(core, makeIsoDate(d));
  const store = core.moduleStates?.get?.("partnerships") ?? core.modules?.get?.("partnerships")?.state;
  const link = [...core.familyLinks.values()].find((l: any) => l.kind === "partner" && l.personIds.includes(pid));
  let row: any = null;
  try { row = moduleState(core, "partnerships").table("couples").get(link?.id); } catch (e) { row = String(e); }
  console.log(d, "link", link?.id, "player hh members", core.households.get(core.people.get(pid).householdId)?.memberIds.length, "partner hh", link ? core.people.get(link.personIds.find((x: string) => x !== pid)).householdId : "-", "row", JSON.stringify(row));
}
