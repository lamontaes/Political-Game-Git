/**
 * Do as many people move into a town as move out? One year of the played world
 * in a drawn place: the people the counted-moves engine moved out and in, split
 * by in-state and out-of-state, and the full people who left. A town's net
 * moving should sit near its state's Census net domestic and international
 * migration (see census-components-check.ts), within a percent or two.
 *
 * Run: node --import tsx scripts/core2-year/moves-flow-balance.ts <seed>
 */
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "./place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { makeIsoDate, addDays } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { gameStartDate } from "../../src/core2/game-start";
import { lawChain } from "../../src/core2/modules/laws";
import { countedMoves } from "../../src/core2/modules/counted-moves";
import { departuresOf } from "../../src/core2/modules/moves";
import { coreAPI } from "../../src/core2/state";
const seed = process.argv[2]!;
const d = drawPlace(seed, "census-components");
setBookkeeping(false);
const { core } = buildBenchWorld(d.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: d.key,
});
const api = coreAPI(core);
const st = lawChain(api).stateKey.replace(/^US-/, "");
advanceCore(core, addDays(makeIsoDate(core.date), 365));
const rows = countedMoves(api);
const sum = (f: (r: (typeof rows)[number]) => boolean) =>
  rows.filter(f).reduce((n, r) => n + r.people, 0);
const same = (p: string) =>
  String(p).startsWith(st) || String(p).includes("rest-of-state");
console.log(
  JSON.stringify({
    place: d.name,
    st,
    countedOutToOtherState: sum(
      (r) => r.direction === "out" && !same(r.toPlace),
    ),
    countedOutInState: sum((r) => r.direction === "out" && same(r.toPlace)),
    countedInFromOtherState: sum(
      (r) => r.direction === "in" && !same(r.fromPlace),
    ),
    countedInFromRestOfState: sum(
      (r) => r.direction === "in" && same(r.fromPlace),
    ),
    fullDepartures: departuresOf(api).length,
    sampleTo: rows
      .filter((r) => r.direction === "out")
      .slice(0, 3)
      .map((r) => r.toPlace),
    sampleFrom: rows
      .filter((r) => r.direction === "in")
      .slice(0, 3)
      .map((r) => r.fromPlace),
  }),
);
