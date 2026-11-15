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
describe("a filing counter whose office is a rule is cast at the body it points to", () => {
  it(
    "South Vienna, Ohio: Franklin County board of elections",
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
          expect(clerk?.title).toBe("Franklin County board of elections");
          const visit = openBenchFilingVisit(
            core,
            playerId!,
            filingOfficeFor(api, row.id).filedWith,
            600,
          );
          const said = visit.visit.lines.map((line) => line.text).join(" ");
          expect(said).toContain("Franklin County board of elections");
          expect(said).not.toContain("most populous");
          // The state races at the same town resolve too: each district's
          // most populous county, estimated from its places.
          const boards = playerContests(api)
            .filter((other) => other.family === "stateLegislative")
            .map((other) => filingClerkFor(api, other.id)?.title);
          expect(boards).toContain("Clark County board of elections");
          expect(boards).toContain("Greene County board of elections");
          return;
        }
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
      }
      throw new Error("no race filed with the rule office opened in 60 weeks");
    },
  );
});
