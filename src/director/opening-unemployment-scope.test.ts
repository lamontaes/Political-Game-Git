/**
 * Every unemployment rate the opening night says names where it applies
 * (pool item play-stop-10-two-unemployment-rates-one-night): the President
 * gives the nation's, the evening news gives the town's region's under that
 * area's name (a metro, a state outside its metros, or a whole state or
 * territory), and News's economy rows say the same area. Played in the world
 * the player gets (`buildBenchWorld`, two-level) in places drawn from all 56,
 * redrawn (bounded, each named) until a night says both rates.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { economyView } from "../bench/economy";
import { openingFrames } from "../bench/opening";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { regionName, regionOfPlace } from "../core2/modules/regional";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

it(`every unemployment rate on the opening night names its scope, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "opening-unemployment-scope");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, "2025-01-20", {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director, placeId } = world;
    const story = director.ledger.opening!;
    const opening = openingFrames(core, world.playerId!, story);
    const area = regionName(regionOfPlace(placeId) ?? "");
    const rate = /\bunemploy\w*\b.*\d/i;
    const speech = opening.frames
      .flatMap((frame) => frame.lines)
      .map((line) => line.text)
      .filter((text) => rate.test(text));
    const news = opening.news.stories
      .flatMap((item) => [
        ...item.broadcast.map((line) => line.text),
        item.headline ?? "",
        item.lede ?? "",
      ])
      .filter((text) => rate.test(text));
    // The President speaks for the country, and says so.
    for (const text of speech)
      expect(text, `${where}: ${text}`).toMatch(
        /\bnational\b|\bacross the country\b/i,
      );
    // The news gives the region's rate under the region's name.
    for (const text of news) {
      expect(area, where).toBeTruthy();
      expect(text, `${where}: ${text}`).toContain(area!);
    }
    if (!speech.length || !news.length) {
      tried.push(
        `${where}: ${speech.length ? "" : "no national rate said"}${!speech.length && !news.length ? ", " : ""}${news.length ? "" : "no regional rate said"}`,
      );
      continue;
    }
    // News's economy rows a week on, once the region has a month: the
    // region's rate under the same area.
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const economy = economyView(core, placeId, world.playerId!);
    expect(economy.region?.name, where).toBe(area);
    process.stdout.write(
      `opening unemployment scope: ${where}: President "${speech.join(" | ")}"; news "${news.join(" | ")}"; News row "${economy.region?.name}" on ${core.date}; passed over: ${tried.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place's opening night said both rates (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_200_000);
