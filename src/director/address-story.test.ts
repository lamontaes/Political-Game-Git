import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { MacroMonth } from "../core2/macro-model";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { economyRun, STORIES } from "./address-story";

/**
 * The world's story an address opens on (Story thread #9750, part 4; owner,
 * Nov 16: "maybe it's warning because ... the economy's been terrible").
 * The economy's run is read from the macro months, never rolled: prices that
 * outran pay make it hard, pay that outran prices make it good, and a run
 * the speaker did not govern is inherited.
 */
const month = (
  at: string,
  priceIndex: number,
  hourlyEarnings: number,
  unemploymentPct: number,
): MacroMonth =>
  ({
    id: `macro:${at}`,
    month: at,
    kind: "history",
    priceIndex,
    hourlyEarnings,
    unemploymentPct,
  }) as MacroMonth;
const P: Record<string, number> = {
  macroMonthsPerYear: 12,
  macroHundred: 100,
  daysPerMeanYear: 365.25,
  one: 1,
  zero: 0,
};
const p = (key: string) => P[key]!;

describe("the economy's run", () => {
  it("is hard when prices outran pay over the span, and inherited by a speaker sworn in today", () => {
    const run = economyRun(
      [month("2021-01", 100, 100, 6), month("2024-12", 124, 116, 6)],
      "2025-01-20",
      "2025-01-20",
      p,
    );
    expect(Object.keys(run.facts).sort()).toEqual(
      [
        "run-hard",
        "run-inherited",
        "run-prices-ahead",
        "run-sharp",
        "run-span",
      ].sort(),
    );
    expect(run.facts["run-span"]!.text).toBe("four years");
    expect(run.facts["run-hard"]!.sourceRecordIds).toEqual([
      "macro:2021-01",
      "macro:2024-12",
    ]);
  });

  it("is good, and the speaker's own, when pay outran prices on their watch", () => {
    const run = economyRun(
      [month("2021-01", 100, 100, 6), month("2024-12", 110, 114, 5)],
      "2025-01-20",
      "2021-01-20",
      p,
    );
    expect(run.facts["run-good"]).toBeTruthy();
    expect(run.facts["run-own"]).toBeTruthy();
    expect(run.facts["run-pay-ahead"]).toBeTruthy();
    expect(run.facts["run-jobs-gained"]).toBeTruthy();
  });

  it("is no story when pay and prices moved together", () => {
    const run = economyRun(
      [month("2021-01", 100, 100, 5), month("2024-12", 110, 110.5, 5)],
      "2025-01-20",
      "2025-01-20",
      p,
    );
    expect(run.amount).toBeLessThan(STORIES.runLeast.value);
    expect(run.facts).toEqual({});
  });
});

/**
 * Played: the President's address in drawn worlds opens on the world's story
 * where the record holds one, right after the greeting, in the story's own
 * order. Replay with
 * ADDRESS_STORY_SEED. A world whose story is steady is passed over and named.
 */
const base = process.env.ADDRESS_STORY_SEED || randomBytes(8).toString("hex");

it(`the President's address opens on the world's story in drawn worlds (seed ${base})`, () => {
  const was = setBookkeeping(false);
  try {
    let storied = 0;
    for (let at = 0; at < 4 && storied < 2; at += 1) {
      const seed = createHash("sha256").update(`${base}:${at}`).digest("hex");
      const place = drawPlace(seed, "address-story");
      const where = `${place.name} (${place.key}), seed ${base}:${at}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const story = world.director.ledger.opening;
      expect(story, where).toBeTruthy();
      if (story!.story === "steady") {
        console.log(`address-story: passed over ${where}, story steady`);
        continue;
      }
      storied += 1;
      const pieces = story!.address.sentences.map((row) => row.pieces);
      const first = pieces.findIndex((keys) =>
        keys.some((key) => key.includes(".story-open.")),
      );
      expect(first, `${where}: no story-open sentence`).toBeGreaterThan(-1);
      // Only the greeting comes before it.
      for (const keys of pieces.slice(0, first))
        expect(keys.join(" "), where).toMatch(/\.salutation\./);
      expect(
        pieces[first]!.some((key) => key.includes(`-${story!.story}-`)),
        where,
      ).toBe(true);
    }
    expect(storied, `seed ${base}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(was);
  }
}, 300_000);
