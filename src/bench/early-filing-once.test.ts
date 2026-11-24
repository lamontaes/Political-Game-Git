import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  openContests,
  playerMayFileFor,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { applyChosenPerson } from "./creator";
import { fileForOffice } from "./government";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("a player who files early for a later race files once (owner, Oct 14: the player's choices are the player's)", () => {
  it("has one filing record and one result for the race, whatever opens later", () => {
    const places = [seed, `${seed}-1`];
    // The Tutu, U.S. Virgin Islands draw the words lead found it in is run too.
    if (!process.env.GOLDEN_PATH_SEED) places.push("1d8f65cb19633445477d:0");
    let proven = 0;
    for (const draw of places) {
      const place = drawPlace(draw, "campaign-season");
      const where = `${place.name} (${place.key}), seed ${draw}`;
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const me = world.playerId as PersonId;
      applyChosenPerson(core, me, {
        givenName: "Pat",
        familyName: core.people.get(me)!.familyName,
        gender: "female",
        birthYear: 1985,
        birthMonth: 6,
        birthDay: 1,
      });
      const api = coreAPI(core);
      // The earliest race two months out the player may enter, filed for at once.
      const race = [...openContests(api)]
        .filter(
          (c) =>
            c.electionDate >= addDays(makeIsoDate(core.date), 60) &&
            playerMayFileFor(api, c.id),
        )
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        )
        .find((c) =>
          ["petitioning", "on-ballot"].includes(
            (fileForOffice(core, me, c.id) as { filing?: { status?: string } })
              .filing?.status ?? "",
          ),
        );
      if (!race) {
        process.stdout.write(
          `${where}: no race the player could enter, redrawn\n`,
        );
        continue;
      }
      // Play through the later filing period and election day.
      while (core.date <= addDays(makeIsoDate(race.electionDate), 10))
        advanceCore(core, addDays(makeIsoDate(core.date), 60));
      const mine = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]
      ).filter((f) => f.personId === me && f.contestId === race.id);
      expect(mine.length, `${where}: filings for ${race.id}`).toBe(1);
      const records = [...core.durableLog.values()].filter((r) =>
        (r.personIds ?? []).includes(me as never),
      );
      const filedRecords = records.filter((r) => r.kind === "candidate-filed");
      expect(
        filedRecords.map((r) => r.id),
        `${where}: candidate-filed records for the player`,
      ).toHaveLength(1);
      const results = records.filter((r) => r.kind === "election-result");
      expect(
        results.length,
        `${where}: results for the player's race`,
      ).toBeLessThanOrEqual(1);
      proven += 1;
      process.stdout.write(
        `${where}: filed ${race.id} once (${filedRecords[0]!.id}); ${results.length} result record\n`,
      );
    }
    expect(proven, `some drawn place proved it: ${places}`).toBeGreaterThan(0);
  }, 1_800_000);
});
