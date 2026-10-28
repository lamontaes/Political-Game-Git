/**
 * Every unemployment rate the opening night says names where it applies
 * (pool item play-stop-10-two-unemployment-rates-one-night): the President
 * gives the nation's, and News's economy rows give the town's region's under
 * that area's name (a metro, a state outside its metros, or a whole state or
 * territory). The evening newscast's own rate went with the opening's own
 * news writer (row W2 of docs/reports/duplicates-on-main-2026-10-28.md). Played in the world
 * the player gets (`buildBenchWorld`, two-level) in places drawn from all 56,
 * redrawn (bounded, each named) until the address says the national rate.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { economyView } from "../bench/economy";
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
    const area = regionName(regionOfPlace(placeId) ?? "");
    const rate = /\bunemploy\w*\b.*\d/i;
    const speech = story.address.sentences
      .map((line) => line.text)
      .filter((text) => rate.test(text));
    // The President speaks for the country, and says so.
    for (const text of speech)
      expect(text, `${where}: ${text}`).toMatch(
        /\bnational\b|\bacross the country\b/i,
      );
    if (!speech.length) {
      tried.push(`${where}: no national rate said`);
      continue;
    }
    // News's economy rows a week on, once the region has a month: the
    // region's rate under the same area.
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const economy = economyView(core, placeId);
    expect(economy.region?.name, where).toBe(area);
    process.stdout.write(
      `opening unemployment scope: ${where}: President "${speech.join(" | ")}"; News row "${economy.region?.name}" on ${core.date}; passed over: ${tried.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place's address said the national rate (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_200_000);
