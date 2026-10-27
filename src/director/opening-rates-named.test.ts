import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { regionName, regionOfPlace } from "../core2/modules/regional";

// Two different unemployment rates on one night (the nation's in the
// address, the town's area in the news) each name where they apply.
// Worlds are drawn from all 56 places on fresh seeds.
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const NATION = /\b(?:national|nationwide|across the country)\b/i;

describe("the opening night's unemployment rates", () => {
  for (const n of [1, 2, 3]) {
    const seed = `${base}-${n}`;
    const place = drawPlace(seed, "opening-rates-named");
    it(`names where each rate applies: ${place.name} (${place.key}), seed ${place.seed}`, () => {
      const { director, core, playerId } = buildBenchWorld(
        place.seed,
        "2025-01-20",
        {
          twoLevel: true,
          placeKey: place.key,
        },
      );
      const story = director.ledger.opening!;
      const lines = [
        ...story.address.sentences.map((row) => row.text),
        ...story.newscast.flatMap((item) =>
          item.broadcast.map((line) => line.text),
        ),
      ];
      const rates = lines.filter(
        (text) => /unemployment/i.test(text) && /\d/.test(text),
      );
      expect(
        rates.length,
        "the opening contains a numbered unemployment rate",
      ).toBeGreaterThan(0);
      expect(
        rates.some((text) => NATION.test(text)),
        "the address carries the national rate",
      ).toBe(true);
      const townId = core.people.get(playerId!)!.placeId;
      const region = regionName(regionOfPlace(townId) ?? "");
      const state = place.name.split(", ").pop()!;
      for (const text of rates) {
        const named =
          NATION.test(text) ||
          text.includes(place.name) ||
          text.includes(state) ||
          (region !== undefined && text.includes(region));
        expect(named, `a rate that names no place: "${text}"`).toBe(true);
      }
      // A populated area report is checked independently of the address.
      const areaRates = story.newscast
        .filter((item) => item.kind === "jobs-report")
        .flatMap((item) => item.broadcast)
        .filter(
          (line) => /unemployment/i.test(line.text) && /\d/.test(line.text),
        );
      expect(
        areaRates.length,
        "the newscast carries the area rate",
      ).toBeGreaterThan(0);
      for (const line of areaRates) expect(line.text).not.toMatch(NATION);
    }, 180_000);
  }
});
