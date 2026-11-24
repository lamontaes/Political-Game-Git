import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { NEWS_MODULE_ID } from "./modules/news";
import { followersOf, outletsHere } from "./modules/press";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// P51: the played person does their own reading, so a story an outlet they
// follow prints in the week reaches them in that week (the delay another
// person's habits give was weeks for a young reader at low engagement).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a story printed by an outlet the player follows is heard that week (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "followed-delivery");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      warmUpDays: OPENING_WARMUP_DAYS,
    });
    const { core } = world;
    const api = coreAPI(core);
    const player = world.playerId as PersonId;
    const start = makeIsoDate(core.date);
    const followed = outletsHere(api)
      .filter((o) => followersOf(api, o.id).includes(player))
      .map((o) => o.organizationId);
    advanceCore(core, addDays(start, 8));
    const printed = [
      ...api.moduleState(NEWS_MODULE_ID).table("stories").rows(),
    ].filter(
      (row) =>
        followed.includes(String((row as { outletId?: string }).outletId)) &&
        String((row as { date: string }).date) > start,
    ) as unknown as { id: string; date: string }[];
    if (!printed.length) {
      tried.push(`${where}: its followed outlets printed nothing in 8 days`);
      continue;
    }
    const heardOn = new Map(
      (
        api.moduleState(NEWS_MODULE_ID).table("heard").rows() as unknown as {
          personId: string;
          storyId: string;
          date: string;
        }[]
      )
        .filter((row) => row.personId === player)
        .map((row) => [row.storyId, row.date]),
    );
    for (const story of printed)
      expect(
        heardOn.get(story.id),
        `${where}: ${story.id} printed ${story.date}`,
      ).toBe(story.date);
    return;
  }
  throw new Error(
    `No drawn place printed a followed story: ${tried.join("; ")}`,
  );
}, 900_000);
