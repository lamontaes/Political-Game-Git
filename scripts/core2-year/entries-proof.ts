/**
 * Nobody and nothing enters the world without a record (trace audit item 2):
 * a played year, every person and organization that wasn't there on the
 * opening day, each matched to its entry record or its birth.
 * Run: node --import tsx scripts/core2-year/entries-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
// Everything already there at the end of the opening day.
dev.advance(addDays(makeIsoDate(core.date), 1));
const people = new Set(core.people.keys());
const organizations = new Set(core.organizations.keys());
console.log(
  `${world.place.displayName}, seed ${seed}: ${people.size} people, ${organizations.size} organizations after the opening day`,
);
dev.advance(addDays(makeIsoDate(core.date), 364));
const recorded = new Map<string, string>();
for (const id of core.eventIds) {
  const match = /^(person|organization)\.recorded:(.+):\d{4}-\d{2}-\d{2}$/.exec(
    id,
  );
  if (match) recorded.set(match[2]!, id);
}
const born = new Set(
  [...core.people.values()]
    .filter((row) => row.birthDate > core.startedAt)
    .map((row) => row.id),
);
for (const [label, now, before] of [
  ["people", [...core.people.keys()], people],
  ["organizations", [...core.organizations.keys()], organizations],
] as const) {
  const added = now.filter((id) => !before.has(id));
  const missing = added.filter((id) => !recorded.has(id) && !born.has(id));
  console.log(
    `${label}: ${added.length} entered, ${added.filter((id) => born.has(id)).length} by birth, ${added.filter((id) => recorded.has(id)).length} with an entry record, ${missing.length} without; first records: ${added
      .filter((id) => recorded.has(id))
      .slice(0, 2)
      .map((id) => recorded.get(id))
      .join(
        ", ",
      )}${missing.length ? `; without: ${missing.slice(0, 3).join(", ")}` : ""}`,
  );
}
