/**
 * Another state's act is one national event record (Nation, Nov 8): the day
 * it takes effect, a public, newsworthy `law-took-effect` event is emitted
 * for national:<state> with who passed it and what it does, and the press
 * reads it as a national story. Nothing in the player's town moves. Played
 * in a place drawn from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { PRESS_MODULE_ID } from "./modules/press";
import { coreAPI } from "./state";
import type { CoreEventInput } from "./types";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("a state's act outside the town's chain is a national event the press reads", () => {
  const place = drawPlace(seed, "outside-act");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const seen: CoreEventInput[] = [];
  api.subscribeEvents("nation-test", ["law-took-effect"], (_api, event) => {
    if (String(event.placeId).startsWith("national:")) seen.push(event);
  });
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 200);
  while (day < end && seen.length === 0) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
  }
  const where = `${place.name}, seed ${seed}`;
  expect(
    seen.length,
    `${where}: an outside act took effect by ${end}`,
  ).toBeGreaterThan(0);
  const event = seen[0]!;
  expect(event.publicRecord).toBe(true);
  expect(event.facts?.jurisdiction).toBeTruthy();
  expect(event.facts?.lawId).toBeTruthy();
  const item = api
    .moduleState(PRESS_MODULE_ID)
    .table("wire")
    .get(event.id) as unknown as { level: string } | undefined;
  expect(item?.level, `${where}: ${event.id} is on the press wire`).toBe(
    "nation",
  );
});
