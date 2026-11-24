import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { filingOfficeFor, playerContests } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { searchCorePlaces } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";
import { openBenchFilingVisit } from "./filing";

/**
 * The U.S. House counter at South Vienna, Ohio (seed greet6) is cast at the
 * body the rule points to, the most populous county of district 15
 * (Words lead, second reader, Nov 15). The wait is the game's own played weeks: the race's filing window opens on its own date.
 */
describe("a filing counter whose office is a rule names no county the game cannot know", () => {
  it(
    "South Vienna, Ohio: a named clerk at the board of elections, no county",
    { timeout: 300_000 },
    () => {
      const place = searchCorePlaces("South Vienna", 3, {
        stateJurisdictionKey: "US-OH",
      })[0]!;
      const { core, playerId } = buildBenchWorld("greet6", gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      for (let week = 0; week < 60; week += 1) {
        const row = playerContests(api).find((c) => c.family === "usHouse");
        if (row) {
          const clerk = filingClerkFor(api, row.id);
          expect(clerk?.title).toBe("board of elections");
          expect(clerk?.basis).toBe("state-appointment");
          const visit = openBenchFilingVisit(
            core,
            playerId!,
            filingOfficeFor(api, row.id).filedWith,
            600,
          );
          const said = visit.visit.lines.map((line) => line.text).join(" ");
          expect(said).toContain("with the board of elections");
          expect(said).not.toContain("most populous");
          expect(said).not.toMatch(/County/);
          // The state races at the same town: the game holds no district-to-county
          // relationship, so each is the same plain board with a named clerk.
          const boards = playerContests(api)
            .filter((other) => other.family === "stateLegislative")
            .map((other) => filingClerkFor(api, other.id)?.title);
          expect(boards.length).toBeGreaterThan(0);
          expect(boards.every((title) => title === "board of elections")).toBe(
            true,
          );
          return;
        }
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
      }
      throw new Error("no race filed with the rule office opened in 60 weeks");
    },
  );
});
