/**
 * The sameness gate's input for the loading story (the Story lead, Nov 24):
 * one drawn world per run, appending the outline input the loading card tells
 * the player's life from (`loadingTelling`, src/bench/loading.ts), one line
 * per world. Run once per world, so memory frees between worlds:
 *   for i in $(seq 60); do node --import tsx scripts/sameness/record-loading-inputs.mts; done
 * SEED=<hex> chooses the world; with none it draws one, and the line names it.
 * Output: scripts/sameness/inputs/loading-story-drawn.jsonl (OUT= to change).
 */
import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { loadingTelling } from "../../src/bench/loading";

setBookkeeping(false);
const seed = process.env.SEED ?? randomBytes(8).toString("hex");
const out =
  process.env.OUT ?? "scripts/sameness/inputs/loading-story-drawn.jsonl";
const world = await buildBenchWorldInStages(
  seed,
  gameStartDate(),
  { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
  () => undefined,
);
const { core } = world;
const input = core.playerId ? loadingTelling(core, core.playerId) : null;
if (!input) {
  console.error(`${seed} ${world.place.displayName}: no player`);
  process.exit(0);
}
appendFileSync(
  out,
  `${JSON.stringify({
    facts: input.facts,
    traits: input.traits,
    momentKey: input.momentKey,
    worldSeed: input.worldSeed,
    place: world.place.displayName,
  })}\n`,
);
console.error(
  `${seed} ${world.place.displayName}: ${Object.keys(input.facts).length} facts`,
);
