/**
 * The player's money over a played year, by kind, through dev mode's money
 * view: pay, taxes, rent, purchases and benefits in and out, cash then and
 * now, the job, and the acts done. For questions like "why does the player
 * have $0 after two years".
 * Run: node --import tsx scripts/core2-year/money-year.ts <seed> [days]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? "78f9ea4a3073";
const days = Number(process.argv[3] ?? 365);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const playerId = core.playerId!;
const player = core.people.get(playerId)!;
console.log(
  `${world.place.displayName}, seed ${seed}: player ${playerId}, born ${player.birthDate}, cash ${player.liquidMinor / 100}, job ${player.jobId ?? "none"}`,
);
dev.advance(addDays(makeIsoDate(core.date), days));
const view = dev.money(playerId);
const $ = (minor: number) => (minor / 100).toFixed(2);
console.log(
  `${view.since} to ${view.through}: cash ${$(view.openingMinor ?? 0)} -> ${$(view.cashMinor ?? 0)}; in ${$(view.inMinor ?? 0)}, out ${$(view.outMinor ?? 0)}`,
);
console.log("job", JSON.stringify(view.job));
for (const line of view.lines ?? [])
  console.log(
    `  ${line.kind}: in ${$(line.inMinor)}, out ${$(line.outMinor)}, ${line.entries} entries, latest ${line.latestId}`,
  );
console.log("acts", JSON.stringify(view.acts));
