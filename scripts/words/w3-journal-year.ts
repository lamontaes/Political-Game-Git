/**
 * Words builder W3's proof for the Journal (Nov 12, 2026): plays a place
 * drawn from all 56 and prints the player's Journal ("My life") and the
 * Journal of each person the director watches, as composeJournal words it,
 * with the place and the seed.
 * Usage: node --import tsx scripts/words/w3-journal-year.ts <seed> [days]
 */
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import type { PersonId } from "../../src/core2/types";
import { buildBenchWorld } from "../../src/bench/world";
import { composeJournal } from "../../src/director/journal";

const seed = process.argv[2] ?? "w3-journal";
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(seed, "w3-journal-year");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
// The director keeps a Journal only for those it watches: the player and
// everyone in their household, from the first day.
const playerId = world.playerId as PersonId | undefined;
if (!playerId) throw new Error(`${place.name}: no player`);
const home = core.people.get(playerId)?.householdId;
for (const person of core.people.values())
  if (person.id === playerId || (home && person.householdId === home))
    world.director.watch(core, person.id as PersonId);
advanceCore(core, addDays(makeIsoDate(core.date), days));
console.log(`Place: ${place.name} (${place.key}), seed ${seed}, ${core.date}`);
for (const personId of [...world.director.ledger.people.keys()].sort()) {
  const person = core.people.get(personId as PersonId);
  if (!person) continue;
  const chapters = composeJournal(core, world.director, personId as PersonId);
  console.log(`\n== ${person.givenName} ${person.familyName}`);
  for (const chapter of chapters) {
    console.log(`  # ${chapter.title}`);
    for (const line of chapter.lines)
      console.log(`    ${line.date} ${line.text}`);
  }
}
