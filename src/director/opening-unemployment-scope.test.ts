/**
 * Every unemployment rate the opening night says names where it applies
 * (pool item play-stop-10-two-unemployment-rates-one-night). The President's
 * address says no figure at all (owner, Oct 27: "none of that real data in
 * there"; Nov 1: "I don't like where this part of the speech where it just
 * laces statistics"), so the night's one rate is News's: its economy rows
 * give the town's region's under that area's name (a metro, a state outside
 * its metros, or a whole state or territory). The evening newscast's own
 * rate went with the opening's own news writer (row W2 of
 * docs/reports/duplicates-on-main-2026-10-28.md). Played in the world the
 * player gets (`buildBenchWorld`, two-level) in a place drawn from all 56.
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
it(`the opening night says one unemployment rate, News's, under its area, seed ${seed}`, () => {
  setBookkeeping(false);
  const place = drawPlace(`${seed}:0`, "opening-unemployment-scope");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director, placeId } = world;
  const story = director.ledger.opening!;
  const area = regionName(regionOfPlace(placeId) ?? "");
  // The President says no rate at all, so none can be mistaken for the town's.
  for (const line of story.address.sentences)
    expect(line.text, `${where}: ${line.text}`).not.toMatch(/\d|percent/);
  // News's economy rows a week on, once the region has a month: the
  // region's rate under the same area.
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const economy = economyView(core, placeId);
  expect(economy.region?.name, where).toBe(area);
  process.stdout.write(
    `opening unemployment scope: ${where}: President says no figure; News row "${economy.region?.name}" on ${core.date}\n`,
  );
}, 1_200_000);
