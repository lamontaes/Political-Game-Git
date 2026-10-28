import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { heardOn } from "../core2/past-news";
import { coreAPI } from "../core2/state";
import { heardItems } from "./calendar";
import { buildBenchWorld } from "./world";

// The first night's paper is the news engine's (engine map line 2): what the
// player heard by the opening evening, worded by the archive and press words
// the News sheet reads, each a story in the news engine's own store.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the opening night's paper is the news engine's stories, in a drawn place (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "opening-news");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const stories = api.moduleState("news").table("stories");
  const paper = heardItems(core, playerId!).filter(
    (row) => "headline" in row || "lede" in row,
  );
  for (const row of paper)
    expect(stories.get(row.id), `${where}: ${row.id}`).toBeTruthy();
  // Someone who reads no paper hears none, by the news engine's own rule.
  if (!paper.length)
    expect(
      heardOn(api, core.people.get(playerId!)!, core.date),
      where,
    ).toBeNull();
  console.log(
    `${where}: ${paper.length} stories, lead ${paper[0]?.id ?? "none"}`,
  );
}, 600_000);
