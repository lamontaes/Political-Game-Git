// Profiles consecutive game days on a generated life in a place drawn from all 56.
// Usage: node --import tsx scripts/profile-game-day.ts <seed> [days] [out.cpuprofile]
import inspector from "node:inspector";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { serializeWorld } from "../src/simulation/serialization";
import { DEFAULT_NEW_GAME_SETUP } from "../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../src/presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../src/presentation/ordinary-life";
import { drawRandomPlace } from "../tests/support/random-place";
const seed = process.argv[2] ?? "perf-day-1";
const days = Number(process.argv[3] ?? 10);
const place = drawRandomPlace(seed);
const game = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed,
    startAge: 30,
  }),
).game!;
const pid = game.playerPersonId;
let world = openOrdinaryLife(game.world, pid);
console.log(
  "PLACE",
  place.key,
  place.label ?? "",
  "seed",
  seed,
  "people",
  Object.keys(world.people).length,
  "events",
  world.history.events.length,
);
const session = new inspector.Session();
session.connect();
session.post("Profiler.enable");
session.post("Profiler.start");
const times: number[] = [];
for (let d = 0; d < days; d++) {
  const t = Date.now();
  world = passOrdinaryDays(world, 1);
  times.push(Date.now() - t);
}
session.post("Profiler.stop", (_e, { profile }) => {
  fs.writeFileSync(
    `${process.argv[4] ?? `game-day-${seed}.cpuprofile`}`,
    JSON.stringify(profile),
  );
});
// Two builds that must give the same world print the same hash.
console.log(
  "HASH",
  createHash("sha256").update(serializeWorld(world)).digest("hex").slice(0, 16),
);
console.log(
  "DAYS",
  times.join(" "),
  "total",
  times.reduce((a, b) => a + b, 0),
);
