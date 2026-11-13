/**
 * Who fills people in over a played year: every fill-in, by the engine step
 * that called `fillInPerson`, with the people it brought in, and the full
 * people at the opening and the end.
 *   node --import tsx scripts/speed-years/probe-fill-ins.ts <seed> <placeKey> [days]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { registerModule } from "../../src/core2/state";

const [seed = "", placeKey = "", daysText = "365"] = process.argv.slice(2);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core = world.core;
const callers = new Map<string, { fills: number; people: number }>();
registerModule(core, {
  id: "probe-fill-ins",
  onFillIn: (_api, filled) => {
    const frames = (new Error().stack ?? "").split("\n").slice(2);
    const at = frames.find(
      (f) => !/fillInPerson|probe-fill-ins|onFillIn/.test(f),
    );
    const name = /at (?:Object\.)?([\w$.]+)/.exec(at ?? "")?.[1] ?? "?";
    const row = callers.get(name) ?? { fills: 0, people: 0 };
    row.fills += 1;
    row.people += filled.memberIds.length;
    callers.set(name, row);
  },
} as never);
const opening = core.people.size;
const started = performance.now();
advanceCore(core, addDays(makeIsoDate(core.date), Number(daysText)));
const seconds = (performance.now() - started) / 1000;
console.log(
  `${seed} ${placeKey}: ${daysText} days in ${seconds.toFixed(0)} s; full people ${opening} -> ${core.people.size}`,
);
for (const [name, row] of [...callers].sort(
  (a, b) => b[1].people - a[1].people,
))
  console.log(
    `  ${String(row.fills).padStart(5)} fill-ins ${String(row.people).padStart(6)} people  ${name}`,
  );
