/**
 * The sameness gate's inputs for the State of the Union and the State of the
 * State (the Story lead, Nov 24): for each drawn world, the outline input the
 * one planner tells the address from ({facts, points, traits, momentKey,
 * worldSeed}), one line per world, as `addressTelling`
 * (src/director/address-telling.ts) builds it.
 *
 * Both are recorded on the opening day, with the kind asked for directly:
 * the plan reads the world as it is that day. A world opens on Inauguration
 * Day, a new term's first address to Congress is not a State of the Union
 * (src/core2/office-day-federal-calendar.ts `jointAddress`), and the first
 * one falls a year on, too long a run for six worlds; the governor's falls
 * the day after the opening (src/director/data/local-address.json).
 *
 * Run: node --import tsx scripts/sameness/record-address-inputs.mts
 *   SEEDS=aecea4,66265b,... to choose the worlds (the six packet worlds by default).
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { officialsIn } from "../../src/core2/modules/officials";
import { coreAPI } from "../../src/core2/state";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import {
  addressTelling,
  presidentSpeaker,
  type AddressTelling,
} from "../../src/director/address-telling";
import { OPENING_ADDRESS_EVENT } from "../../src/director/opening-story";
import { localAddressTelling } from "../../src/director/local-address";

setBookkeeping(false);
const seeds = (
  process.env.SEEDS ?? "aecea4,66265b,bd3806,2d2283,3c42e6,d8e52e"
).split(",");
const out = {
  "state-of-the-union": "scripts/sameness/inputs/state-of-the-union-six.jsonl",
  "state-of-the-state": "scripts/sameness/inputs/state-of-the-state-six.jsonl",
};
for (const file of Object.values(out)) writeFileSync(file, "");

/** One gate input line from a telling. */
const line = (telling: AddressTelling) =>
  `${JSON.stringify({
    facts: telling.input.facts,
    ...(telling.input.points ? { points: telling.input.points } : {}),
    traits: telling.input.traits,
    momentKey: telling.input.momentKey,
    worldSeed: telling.input.worldSeed,
  })}\n`;

for (const seed of seeds) {
  const world = await buildBenchWorldInStages(
    seed,
    gameStartDate(),
    { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
    () => undefined,
  );
  const { core } = world;
  const official = officialsIn(coreAPI(core), "US:president")[0];
  const president = official ? core.people.get(official.id) : undefined;
  const union =
    official && president
      ? addressTelling(
          core,
          "state-of-the-union",
          presidentSpeaker(president, official),
          `${OPENING_ADDRESS_EVENT}:${core.date}`,
        )
      : null;
  const state = localAddressTelling(core, "state");
  if (union) appendFileSync(out["state-of-the-union"], line(union));
  if (state) appendFileSync(out["state-of-the-state"], line(state));
  console.log(
    `${seed} ${world.place.displayName} ${core.date}: union ${union ? Object.keys(union.input.facts).length : "none"} facts, state ${state ? Object.keys(state.input.facts).length : "none"} facts`,
  );
}
