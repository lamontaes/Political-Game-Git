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
 * The mayor's address and the player's campaign speech are recorded the same
 * way (the campaign speech for the player as a candidate for the town's
 * executive seat, no filed race needed).
 *
 * Run: node --import tsx scripts/sameness/record-address-inputs.mts
 *   SEEDS=aecea4,66265b,... to choose the worlds (the six packet worlds by default).
 *   DRAWN=1 appends one freshly drawn world to the `-drawn.jsonl` files
 *   instead, so a shell loop gathers 60 lives one process at a time.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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
import { campaignSpeechTelling } from "../../src/director/local-speeches";
import { townSeats } from "../../src/core2/modules/offices";
import { headsLocalExecutive } from "../../src/core2/offices-executives";

setBookkeeping(false);
const drawn = !!process.env.DRAWN;
const seeds = drawn
  ? [randomBytes(8).toString("hex")]
  : (process.env.SEEDS ?? "aecea4,66265b,bd3806,2d2283,3c42e6,d8e52e").split(
      ",",
    );
// DRAWN_DIR records elsewhere (a long run that should not touch the
// repository until it ends); the inputs folder otherwise.
const dir = process.env.DRAWN_DIR ?? "scripts/sameness/inputs";
const file = (kind: string) =>
  `${dir}/${kind}-${drawn ? "drawn" : "six"}.jsonl`;
const out = {
  "state-of-the-union": file("state-of-the-union"),
  "state-of-the-state": file("state-of-the-state"),
  "town-address": file("town-address"),
  "campaign-speech": file("campaign-speech"),
};
if (!drawn) for (const path of Object.values(out)) writeFileSync(path, "");

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
  const town = localAddressTelling(core, "town");
  // The campaign speech needs no filed race to be planned: the player is asked
  // as a candidate for the town's executive seat, on the day the world opens.
  const seat = townSeats(coreAPI(core)).find((row) =>
    headsLocalExecutive(row.office.kind),
  );
  const campaign =
    seat && core.playerId
      ? campaignSpeechTelling(core, core.playerId, seat.office.id, null)
      : null;
  if (union) appendFileSync(out["state-of-the-union"], line(union));
  if (state) appendFileSync(out["state-of-the-state"], line(state));
  if (town) appendFileSync(out["town-address"], line(town));
  if (campaign) appendFileSync(out["campaign-speech"], line(campaign));
  console.log(
    `${seed} ${world.place.displayName} ${core.date}: union ${union ? Object.keys(union.input.facts).length : "none"} facts, state ${state ? Object.keys(state.input.facts).length : "none"} facts, town ${town ? Object.keys(town.input.facts).length : "none"} facts, campaign ${campaign ? Object.keys(campaign.input.facts).length : "none"} facts`,
  );
}
