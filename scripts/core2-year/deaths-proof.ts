/**
 * Deaths reach the town's record (trace audit defect 6): a played year,
 * every person who died against the death records in the log, and what read
 * them (the news, a seat's vacancy).
 * Run: node --import tsx scripts/core2-year/deaths-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const aliveAtStart = new Set(
  [...core.people.values()].filter((p) => p.alive).map((p) => p.id),
);
console.log(
  `${world.place.displayName}, seed ${seed}, ${aliveAtStart.size} alive`,
);
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
dev.advance(addDays(makeIsoDate(core.date), 365));
const died = [...aliveAtStart].filter(
  (id) => !core.people.get(id)?.alive && !core.husks.has(id),
);
const records = [...(core.logByKind.get("life.death") ?? [])]
  .map((id) => core.durableLog.get(id))
  .filter(Boolean) as {
  id: string;
  personIds: string[];
  placeId: string;
  visibility?: string;
}[];
const recorded = new Set(records.flatMap((row) => row.personIds));
console.log(
  `${died.length} died; ${records.length} death records; ${died.filter((id) => recorded.has(id)).length} of the dead are in the record`,
);
for (const row of records.slice(0, 5))
  console.log(`  ${row.id} (${row.visibility}, ${row.placeId})`);
const stories = core.modules.has("news")
  ? (
      api.moduleState("news").table("stories").rows() as {
        id: string;
        kind: string;
      }[]
    ).filter((row) => row.kind === "life.death")
  : [];
console.log(
  `${stories.length} news stories of a death; first: ${stories
    .slice(0, 2)
    .map((row) => row.id)
    .join(", ")}`,
);
const vacated = [...(core.logByKind.get("seat-vacated") ?? [])].filter(
  (id) =>
    (core.durableLog.get(id) as { facts?: Record<string, string> } | undefined)
      ?.facts?.cause === "death",
);
console.log(
  `${vacated.length} seats vacated by a death in the log; first: ${vacated.slice(0, 2).join(", ")}`,
);
const printed = core.modules.has("news")
  ? (
      api.moduleState("news").table("stories").rows() as {
        id: string;
        kind: string;
      }[]
    ).filter((row) => row.id.includes("life.death"))
  : [];
console.log(
  `${printed.length} printed stories name a death; first: ${printed
    .slice(0, 2)
    .map((row) => `${row.id} (${row.kind})`)
    .join(", ")}`,
);
