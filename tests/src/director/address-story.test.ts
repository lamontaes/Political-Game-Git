import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { MacroMonth } from "../../../src/core2/macro-model";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { economyRun, STORIES } from "../../../src/director/address-story";
import OUTLINES from "../../../data/english/outlines.json" with { type: "json" };

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
 * where the record holds one, as its own section, told from the story's own
 * fact.
 * Checked on the plan's sections, not on bank keys (CTO, Nov 24, 21:40Z on
 * #9750: "#10390 approved (address-story.test.ts checks the plan's story
 * section and order, not old keys)"): the sections in one of the orders
 * the row allows, the story where that order puts it. Replay with
 * ADDRESS_STORY_SEED. A world
 * whose story is steady is passed over and named.
 */
const base = process.env.ADDRESS_STORY_SEED || randomBytes(8).toString("hex");

/**
 * The section orders an address kind's outline row allows, as the planner
 * builds them (outlines.json `orders`: the movable sections take an order's
 * places in turn; the rest keep theirs).
 */
const ALLOWED_ORDERS = (kind: string): string[][] => {
  const row = (
    OUTLINES as unknown as {
      kinds: Record<
        string,
        {
          sections: { name: string }[];
          orders?: { sections: string[] }[];
        }
      >;
    }
  ).kinds[kind]!;
  const names = row.sections.map((section) => section.name);
  const orders = row.orders?.length ? row.orders : [{ sections: [] }];
  return orders.map((order) => {
    const movable = new Set(order.sections);
    let next = 0;
    return names.map((name) =>
      movable.has(name) ? order.sections[next++]! : name,
    );
  });
};

/** Whether the sections told follow this order (sections the record could not say are skipped). */
const sameOrder = (order: readonly string[], told: readonly string[]) => {
  const kept = order.filter((name) => told.includes(name));
  return kept.join(",") === told.join(",");
};

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
      // The sections come in one of the orders the row allows (the speaker's
      // traits pick which; an assertive speaker puts the theme first), with
      // the story where that order puts it.
      const told = [...new Set(sentences.map((row) => row.section ?? ""))];
      expect(
        ALLOWED_ORDERS(story!.speechKind).some((order) =>
          sameOrder(order, told),
        ),
        `${where}: sections told as ${told.join(", ")}`,
      ).toBe(true);
      // The story section is told from the world's own story.
      const storyTold = sentences.filter((row) => row.section === "story");
      expect(
        storyTold.some((row) => row.facts.includes(STORY_FACT[story!.story]!)),
        `${where}: story ${story!.story} not told from ${STORY_FACT[story!.story]}`,
      ).toBe(true);
    }
    expect(storied, `seed ${base}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(was);
  }
}, 300_000);
