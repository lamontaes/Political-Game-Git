import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

// A cabinet nominee, a confirmation and a rejection are stories the press can
// tell (Nation, Nov 9: they were printing with no words). No played year
// writes the three records for a town's world (the unplayed President's
// cabinet is not run there), so they are written the way the federal
// president's engine writes them (office-day-federal-president.ts emitCabinet)
// and worded as the press would print them: an edge proof of the words.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DEVELOPER = /[{}_]|\b[a-z]+:[a-z]|\bcabinet-[a-z]+/;

describe("cabinet records as news", () => {
  it("words a nomination, a confirmation and a rejection with the nominee, the office and the vote", () => {
    setBookkeeping(false);
    const place = drawPlace(`${seed}:0`, "printed-cabinet");
    const where = `${place.name} (${place.key}), seed ${seed}:0`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const [president, nominee] = [...core.people.values()]
      .filter((row) => row.alive)
      .slice(0, 2);
    const day = makeIsoDate(core.date);
    const told: string[] = [];
    for (const [kind, facts] of [
      ["cabinet-nominated", { voteOn: "2025-02-01" }],
      ["cabinet-confirmed", { yes: "58", no: "41" }],
      ["cabinet-rejected", { yes: "44", no: "55" }],
    ] as const) {
      const id = `${kind}:secretary-of-state:${core.date}`;
      api.emit({
        id,
        date: day,
        kind,
        personIds: [president!.id, nominee!.id],
        placeId: president!.placeId,
        source: { tag: "SOURCED", citation: "Test.", asOf: day },
        publicRecord: true,
        news: true,
        facts: {
          postId: "secretary-of-state",
          title: "Secretary of State",
          nomineeId: nominee!.id,
          ...facts,
        },
      });
      const worded = wordPrintedStory(core, {
        id: `printed:test:${id}`,
        kind: "press.printed",
        date: core.date,
        facts: { sourceRecordId: id },
      } as never);
      expect(worded, `${where}: ${kind} is not worded`).toBeTruthy();
      // A headline and a lede, both (a word like "rejected" or "lost" in a news line
      // is only said of a record with that outcome, so a rejected nominee is "turned down").
      expect(worded!.headline, kind).toBeTruthy();
      expect(worded!.lede, kind).toBeTruthy();
      const text = `${worded!.headline} ${worded!.lede}`;
      expect(text, kind).not.toMatch(DEVELOPER);
      expect(text, kind).toContain(nominee!.familyName);
      expect(text, kind).toContain("Secretary of State");
      expect(worded!.sourceRecordIds, kind).toContain(id);
      told.push(`${kind}: ${worded!.headline} / ${worded!.lede}`);
    }
    process.stdout.write(`PRINTED CABINET ${where}\n  ${told.join("\n  ")}\n`);
  }, 300_000);
});
