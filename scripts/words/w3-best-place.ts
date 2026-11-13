/**
 * Words builder W3's proof for a race result's "best place" (Nov 13, 2026):
 * in places drawn from all 56, one race of each kind on record is listed with
 * the places its count is kept over, and whether each place's name may be
 * said in "{best_place} gave {winner} the most" (`placeIsSaid`). Before, a
 * legislative district's place was said by its record key.
 * Usage: node --import tsx scripts/words/w3-best-place.ts <seed> [draws]
 */
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../../src/core2/modules/elections";
import { basePlaces } from "../../src/core2/race-places";
import { coreAPI } from "../../src/core2/state";
import { buildBenchWorld } from "../../src/bench/world";
import { placeIsSaid } from "../../src/director/race-turnout-facts";

const seed = process.argv[2] ?? "w3-best-place";
const draws = Number(process.argv[3] ?? 3);
setBookkeeping(false);
for (let attempt = 0; attempt < draws; attempt += 1) {
  const place = drawPlace(seed, `w3-best-place:${attempt}`);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  console.log(`${place.name} (${place.key}), seed ${seed}, draw ${attempt}`);
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  const seen = new Set<string>();
  for (const contest of contests) {
    if (seen.has(contest.family ?? "")) continue;
    seen.add(contest.family ?? "");
    const { places } = basePlaces(api, contest);
    if (!places.length) continue;
    const names = places.slice(0, 3).map((row) => row.name);
    const said = names.filter(placeIsSaid);
    console.log(
      `  ${contest.id}: ${places.length} place(s), e.g. ${names.join(" | ")}; said: ${said.length ? said.join(" | ") : "none (the line is told without a place)"}`,
    );
  }
}
