/**
 * Draws places for a law already in force at the opening in the audit towns:
 * fresh seeds, one after another, until each named question is not in force
 * in the drawn place, so the checker can enact it there. Prints every place
 * drawn and whether each question was in force, so none is passed over unseen.
 *
 *   node --import tsx scripts/law-wiring/draw-not-in-force.ts <base> <key,...> [max]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { inForceHere } from "../../src/core2/law-reach/host";
import { coreAPI } from "../../src/core2/state";
import { drawLawPlace } from "./check";

const [base, keyList, max] = process.argv.slice(2);
if (!base || !keyList) throw new Error("usage: <base> <key,...> [max]");
setBookkeeping(false);
const wanted = new Set(keyList.split(","));
for (let i = 1; i <= Number(max ?? 12) && wanted.size; i += 1) {
  const seed = `${base}${i}`;
  const drawn = drawLawPlace(seed);
  const w = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const api = coreAPI(w.core);
  const inForce = Object.fromEntries(
    [...wanted].map((k) => [k, inForceHere(api, k)]),
  );
  console.log(JSON.stringify({ seed, place: drawn, inForce }));
  for (const [k, on] of Object.entries(inForce)) if (!on) wanted.delete(k);
}
