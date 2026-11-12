/**
 * Words builder W3's proof for bring-it-up (Nov 12, 2026): plays a place
 * drawn from all 56 for some days, then has each full person who knows of a
 * change bring it up to someone they know, through the director's own
 * bringItUp, and prints what they said, how they hold the cause, and whether
 * a blame reached the listener.
 * Usage: node --import tsx scripts/words/w3-bring-it-up.ts <seed> [days]
 */
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import type { PersonId } from "../../src/core2/types";
import { buildBenchWorld } from "../../src/bench/world";
import {
  believedCause,
  bringItUp,
  changesKnownTo,
} from "../../src/director/bring-it-up";

const seed = process.argv[2] ?? "w3-bring";
const days = Number(process.argv[3] ?? 120);
const place = drawPlace(seed, "w3-bring-it-up");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
advanceCore(core, addDays(makeIsoDate(core.date), days));
console.log(`Place: ${place.name} (${place.key}), seed ${seed}, ${core.date}`);
let shown = 0;
for (const person of [...core.people.values()].sort((a, b) =>
  a.id.localeCompare(b.id),
)) {
  if (shown >= 15) break;
  const known = changesKnownTo(core, person.id as PersonId);
  if (!known.length) continue;
  const listener = [...(person.knownIds ?? [])]
    .sort()
    .find((id) => core.people.has(id)) as PersonId | undefined;
  if (!listener) continue;
  const how = believedCause(core, person.id as PersonId, known[0]!).how;
  const said = bringItUp(core, person.id as PersonId, listener);
  // A printed story never carries a blame: only a change in town is shown.
  if (!said || /news/.test(said.change.kind)) continue;
  shown += 1;
  console.log(
    `${person.givenName} ${person.familyName} (${how}) to ${listener}: ${said.lines.map((l) => l.text).join(" ")}`,
  );
}
