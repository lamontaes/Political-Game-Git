import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGN_MENTORSHIP } from "./modules/candidacy";
import { coreAPI } from "./state";

// A campaign worked is shared history: staff of a winning campaign are taken
// under the winner's wing (`campaign.mentorship-formed`), with the first
// sit-down hours on their tie, whether or not a party ever asked.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "campaign-mentor");

it(`staff of a winning campaign are taken under the winner's wing in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const formed: { id: string; staffer: string; mentor: string }[] = [];
  coreAPI(core).subscribeEvents(
    "campaign-mentor-test",
    [CAMPAIGN_MENTORSHIP],
    (_api, e) =>
      formed.push({
        id: e.id,
        staffer: e.personIds[0]!,
        mentor: e.personIds[1]!,
      }),
  );
  for (let month = 0; month < 60 && !formed.length; month++)
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
  expect(
    formed.length,
    `${where}: a winning campaign had staff to take under a wing`,
  ).toBeGreaterThan(0);
  const first = formed[0]!;
  expect(
    closenessBetween(core, first.staffer as never, first.mentor as never),
    `${where}: ${first.id}`,
  ).toBeGreaterThan(0);
}, 1_800_000);
