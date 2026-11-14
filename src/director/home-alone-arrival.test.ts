import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { wordSceneLine } from "../english/scene-words";
import { composeScene } from "./scene";
import { homeAloneDayFacts } from "./day-part";
import type { PersonId } from "../core2/types";

// The arrival line of a scene at home alone is worded from the same day facts
// whether it is the opening's landing or a later scene (#8647, second reader,
// Nov 14): the part of the day after "It's", the date with no ordinal, and
// "The day is done." only from the evening on. Pinned: Mason, Texas (geoid
// 4846968), seed 8647-mason, the opening day.
const world = buildBenchWorld("8647-mason", "2025-01-20", {
  twoLevel: true,
  placeKey: "4846968",
});
const { core, director } = world;
const playerId = world.playerId as PersonId;
new BenchPlayer(core, director).select(playerId);

/** The arrival line of every scene at home on the day, played at one minute. */
function arrivals(minute: number) {
  const book = director.ledger.people.get(playerId)!;
  const lines: string[] = [];
  for (const entry of book.schedule) {
    const scene = composeScene(
      core,
      director,
      playerId,
      entry,
      undefined,
      minute,
    );
    if (scene?.arrival && entry.bindings[0]?.setting.kind === "home")
      lines.push(scene.arrival.text);
  }
  return lines;
}

/** The home-alone arrival the bank gives at a minute, for many moments. */
function bankLines(minute: number) {
  const seen = new Set<string>();
  for (let i = 0; i < 60; i += 1) {
    const line = wordSceneLine({
      seed: "8647-mason",
      move: { part: "arrival", kind: "home" },
      viewerId: playerId,
      facts: { ...homeAloneDayFacts("2025-01-20", minute, `moment-${i}`) },
      stage: () => "alone",
      momentKey: `moment-${i}`,
      fallbackSourceId: `moment-${i}`,
    });
    if (line) seen.add(line.text);
  }
  return [...seen];
}

describe("a scene at home alone says its day one way, from every caller", () => {
  it("plays a later scene at home with the landing's day form", () => {
    for (const [minute, part] of [
      [8 * 60, "early on"],
      [10 * 60, "the morning of"],
      [14 * 60, "the afternoon of"],
      [19 * 60, "the evening of"],
      [22 * 60, "late on"],
    ] as const) {
      const lines = arrivals(minute);
      expect(lines.length, `minute ${minute}`).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line).toContain(`It's ${part} January 20. `);
        expect(line).not.toMatch(/\d(?:st|nd|rd|th)\b/);
        if (minute < 17 * 60) expect(line).not.toMatch(/day is done/i);
      }
    }
  }, 120_000);
  it('never draws "The day is done." before the evening, and can draw it in the evening', () => {
    for (const minute of [8 * 60, 10 * 60, 14 * 60, 16 * 60])
      for (const line of bankLines(minute))
        expect(line, `minute ${minute}`).not.toMatch(/day is done/i);
    expect(bankLines(19 * 60).some((line) => /day is done/i.test(line))).toBe(
      true,
    );
  });
});
