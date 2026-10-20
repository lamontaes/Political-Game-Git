/**
 * The filing visit's last words, in the played world: a random place from all
 * 56 (buildBenchWorld, two-level). The person at the counter picks an office
 * they may enter and files; they say it in words about the office, and the
 * clerk's word that the papers are in cites the filing record the filing wrote.
 * Seed and place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { governmentView } from "./government";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("filing for office in the played world", () => {
  it("the player files in words about the office and the clerk confirms from the filing record", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "filing-words");
    const where = `place ${place.key}, seed ${seed}`;
    console.log(`filing-words: ${where}`);
    const w = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const people = [w.playerId!, ...w.core.people.keys()];
    for (const me of people.slice(0, 400)) {
      const enterable = governmentView(w.core, me).contests.find((c) =>
        c.checks.every((k) => k.met),
      );
      if (!enterable) continue;
      let visit = openBenchFilingVisit(
        w.core,
        me,
        enterable.filingOffice.filedWith,
        0,
      );
      const pick = visit.visit.choices.find(
        (row) =>
          row.action.kind === "pick" &&
          row.action.contestId === enterable.contest.id,
      );
      if (!pick) continue;
      visit = chooseAtCounter(w.core, visit, pick.key);
      const file = visit.visit.choices.find(
        (row) => row.action.kind === "file",
      );
      if (!file) continue;
      expect(file.text, where).toMatch(/\.$/);
      expect(file.text, where).not.toBe("I understand.");
      visit = chooseAtCounter(w.core, visit, file.key);
      const result = visit.result as { filing?: { id: string } } | undefined;
      if (!result?.filing) continue;
      const last = visit.visit.lines.at(-1)!;
      expect(last.speaker, where).toBe("clerk");
      expect(last.sourceRecordIds, where).toContain(result.filing.id);
      console.log(
        `filing-words: ${me} filed ${result.filing.id}: "${last.text}"`,
      );
      return;
    }
    console.log(`filing-words: nobody here could file in ${where}`);
  }, 300_000);
});
