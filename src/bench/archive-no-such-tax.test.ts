import { describe, expect, it } from "vitest";
import startingLaw from "../core2/data/laws/starting-law.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { placeLocalities } from "../core2/places";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

// A place whose starting law records that it has no such tax or program (terms
// system "none") has no story of that law taking effect on day one's News.
const rows = startingLaw.jurisdictions as unknown as Record<
  string,
  { series: string; level: string; terms?: { system?: string } }[]
>;
const without = Object.entries(rows)
  .filter(([, list]) => list.some((row) => row.terms?.system === "none"))
  .map(([jurisdiction]) => jurisdiction);
const keys = new Set(
  without.flatMap((j) => placeLocalities(j).map((p) => p.key)),
);

describe.each(["no-such-tax-a", "no-such-tax-b"])("(%s)", (salt) => {
  const place = drawPlace(salt, "words-no-wage-tax-story", (key) =>
    keys.has(key),
  );
  it(`tells no law taking effect for a tax the place does not have (${place.name}, ${place.key}, seed ${place.seed})`, () => {
    expect(without.length).toBeGreaterThan(0);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const none = new Set(
      (rows[place.state] ?? [])
        .filter((row) => row.terms?.system === "none")
        .map((row) => row.series),
    );
    expect(none.size, "the place's state records a no-tax row").toBeGreaterThan(
      0,
    );
    const stories = coreAPI(world.core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as { id: string; facts: Record<string, string> }[];
    const told = stories.filter(
      (row) =>
        row.facts.recordKind === "law-took-effect" &&
        row.facts.jurisdiction === place.state &&
        none.has(row.facts.series ?? ""),
    );
    expect(told.map((row) => row.id)).toEqual([]);
  }, 120_000);
});
