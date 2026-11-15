/**
 * Bookkeeping is a debug switch (AGENTS.md, "Keep it simple"): it checks,
 * copies and freezes, and must never change what happens. The same world
 * advanced the same three days with bookkeeping off (play) and on (tests, the
 * bench) keeps the same records, by id and by the people each names.
 *
 * The first fault this caught (core-bookkeeping-changes-the-played-year): the
 * relatives at home who need care were held for the whole day, keyed by the
 * person's record. Bookkeeping's attendance replaced that record, so it read
 * a relative who fell ill that morning and play did not; the two years then
 * drifted apart from day 1. The second (found the same way over 200 days):
 * bookkeeping predicts every cause holder's act each day, and the prediction
 * took the week's shortlist of ties to visit days before play's first look.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1, which split on
 * day 1 before the fix; Denver, Pennsylvania (4218888), seed cb7367e1.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const DAYS = 3;

/** Each day's new records: their ids and the people each names, hashed. */
function recordsByDay(placeKey: string, seed: string, on: boolean) {
  const previous = setBookkeeping(on);
  try {
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey,
    });
    const seen = new Set(core.durableLog.keys());
    const days: { date: string; count: number; hash: string }[] = [];
    for (let day = 0; day < DAYS; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const fresh = [...core.durableLog.keys()]
        .filter((id) => !seen.has(id))
        .sort();
      const hash = createHash("sha1");
      for (const id of fresh) {
        seen.add(id);
        hash.update(
          id + JSON.stringify(core.durableLog.get(id)?.personIds ?? []),
        );
      }
      days.push({
        date: core.date,
        count: fresh.length,
        hash: hash.digest("hex"),
      });
    }
    return days;
  } finally {
    setBookkeeping(previous);
  }
}

describe("bookkeeping changes no record of three played days", () => {
  for (const [name, placeKey, seed] of [
    ["Edgar, Wisconsin", "5522550", "edgar-petition-1"],
    ["Denver, Pennsylvania", "4218888", "cb7367e1"],
  ] as const)
    it(`${name} (${placeKey}), seed ${seed}: the same records day by day in play and with bookkeeping`, () => {
      const play = recordsByDay(placeKey, seed, false);
      const kept = recordsByDay(placeKey, seed, true);
      expect(play.some((day) => day.count > 0)).toBe(true);
      expect(kept).toEqual(play);
    }, 90_000);
});
