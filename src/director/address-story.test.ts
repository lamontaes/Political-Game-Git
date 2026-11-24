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
 * Played: the President's address in drawn worlds tells the world's story
 * where the record holds one, as its own section right after the greeting and
 * the occasion (the outline planner's order, from real inaugurals: the oath
 * and the charge, then the state of the country), with the story's own fact.
 * Checked on the plan's sections, not on bank keys (CTO, Nov 24, 21:40Z on
 * #9750: "#10390 approved (address-story.test.ts checks the plan's story
 * section and order, not old keys)"). Replay with ADDRESS_STORY_SEED. A world
 * whose story is steady is passed over and named.
 */
const base = process.env.ADDRESS_STORY_SEED || randomBytes(8).toString("hex");

/** The fact each story's section is told from (opening-address.json `stories.rows`, `gate`). */
const STORY_FACT: Readonly<Record<string, string>> = {
  "hard-run": "run-hard",
  "good-run": "run-good",
  disaster: "story-disaster",
  scandal: "story-scandal",
};

it(`the President's address tells the world's story in drawn worlds (seed ${base})`, () => {
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
      const sentences = story!.address.sentences;
      const first = sentences.findIndex((row) => row.section === "story");
      expect(first, `${where}: no story section`).toBeGreaterThan(-1);
      // Only the greeting and the occasion come before it.
      for (const row of sentences.slice(0, first))
        expect(["greeting", "occasion"], `${where}: ${row.text}`).toContain(
          row.section,
        );
      // The story section is told from the world's own story.
      const told = sentences.filter((row) => row.section === "story");
      expect(
        told.some((row) => row.facts.includes(STORY_FACT[story!.story]!)),
        `${where}: story ${story!.story} not told from ${STORY_FACT[story!.story]}`,
      ).toBe(true);
    }
    expect(storied, `seed ${base}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(was);
  }
}, 300_000);
