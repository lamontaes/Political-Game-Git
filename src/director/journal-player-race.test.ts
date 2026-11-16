import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import {
  checkEligibility,
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { composeJournal } from "./journal";

// The golden path's own race, in the journal: the player turns 18, files for
// the first race they can enter, and the day after the count their journal
// tells how it went, citing the result, whether anyone ran against them or
// not.
// Three named places on fixed draws, never red by draw (skill pinned-tests):
// the draw for each is `drawPlace(draw, "journal-player-race:0")`. The player
// files for the first race they can enter and gathers the signatures the
// clerk's check asks for, and nothing more (they do not campaign), then the
// count comes. A race is not one filed contest and one result: an at-large
// race of several seats keeps one result record per seat, and the one that
// names the player may be another seat's than the contest they filed for
// (the old premise of this test, which looked up only the filed contest's
// record and judged the player's win or loss by that contest's winner alone,
// called a win a loss and found no line at Duryea). The record to read is
// the result event whose contest, or whose race, is the filed contest and
// that names the player.
// The wait for the first race is the game's own played days (44 weeks at
// Fenwick Island, 13 at Woodruff, 2 at Duryea), advanced a week at a time as
// the player waits at the clerk's door, so a case can run longer than a
// minute; the limit is near twice the slowest of the three measured alone
// (49 s, 79 s and 159 s at Woodruff, Fenwick Island and Duryea).
// The win case was found by a scan outside the test (draws 0 to 62 of
// `jpr-pin`, one hour, three at a time): Duryea is the one win in 34 races
// read, and its third seat is held by 173 votes to 124 and 76 for the next
// two, a margin no small change moves. The first pick, New Llano, Louisiana,
// won the third seat by 51 votes to 63 and lost it after unrelated train
// changes, so it was dropped.
const CASES = [
  {
    draw: "jpr-pin:2",
    where: "Woodruff, Utah",
    outcome: "lost",
    why: "a single seat, one rival: the player loses",
  },
  {
    draw: "jpr-pin:8",
    where: "Fenwick Island, Delaware",
    outcome: "lost",
    why: "a single seat, three rivals: the player loses",
  },
  {
    draw: "jpr-pin:37",
    where: "Duryea, Pennsylvania",
    outcome: "won",
    why: "an at-large race of three seats: the player filed under the first seat and is elected to the third",
  },
] as const;
const WEEKS = 104;
const TIMEOUT = 330_000;

describe("the player's journal tells their own first race the day after the count", () => {
  it.each(CASES)(
    "$where: $why",
    (row) => {
      setBookkeeping(false);
      try {
        const place = drawPlace(row.draw, "journal-player-race:0");
        expect(place.name, row.draw).toBe(row.where);
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core, director } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const api = coreAPI(core);
        const playerId = core.playerId!;
        // As play does when a life starts (src/bench/player.ts, select).
        director.watch(core, playerId);
        for (const id of core.households.get(
          core.people.get(playerId)!.householdId,
        )?.memberIds ?? [])
          if (id !== playerId && core.people.get(id)?.alive)
            director.watch(core, id);
        let contest: ReturnType<typeof openContests>[number] | undefined;
        for (let week = 0; week < WEEKS && !contest; week += 1) {
          contest = openContests(api).find(
            (c) =>
              !checkEligibility(api, playerId, c.id, null).some(
                (check) => !check.met,
              ),
          );
          if (!contest) advanceCore(core, addDays(makeIsoDate(core.date), 7));
        }
        expect(
          contest,
          `${where}: a race the player could enter`,
        ).toBeDefined();
        const filed = fileCandidacy(api, {
          personId: playerId,
          contestId: contest!.id,
          platform: [],
        });
        expect(["petitioning", "on-ballot"], where).toContain(filed.status);
        // Filing is a petition: the player canvasses for signatures until the
        // clerk's check puts them on the ballot.
        const petition = gatherSignatures(
          core,
          `filing:${contest!.id}:${playerId}`,
        );
        expect(
          !petition ||
            (petition.check && petition.check.valid >= petition.needed),
          `${where}: the petition for ${contest!.id}`,
        ).toBeTruthy();
        advanceCore(core, addDays(makeIsoDate(contest!.electionDate), 1));
        expect(
          resultOf(api, contest!.id),
          `${where}: ${contest!.id} was counted`,
        ).toBeDefined();
        const rivals = (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .rows() as unknown as FilingRow[]
        ).filter(
          (f) =>
            f.contestId === contest!.id &&
            f.personId !== playerId &&
            f.status !== "withdrawn",
        );
        // The count's result records that name the player for this race.
        const records = [...api.state.durableLog.values()].filter(
          (e) =>
            e.kind === "election-result" &&
            e.personIds.includes(playerId) &&
            (e.facts?.contestId === contest!.id ||
              e.facts?.race === contest!.id),
        );
        expect(
          records.length,
          `${where}: a result record naming the player`,
        ).toBeGreaterThan(0);
        const won = records.some((e) => e.facts?.winnerId === playerId);
        expect(won ? "won" : "lost", where).toBe(row.outcome);
        const lines = composeJournal(core, director, playerId).flatMap(
          (chapter) => chapter.lines,
        );
        const line = lines.find((l) =>
          records.some((e) => l.sourceRecordIds.includes(e.id)),
        );
        expect(
          line,
          `${where}: the player ${won ? "won" : "lost"} ${contest!.id} against ${rivals.length} others; journal: ${lines.map((l) => l.text).join(" | ") || "(empty)"}`,
        ).toBeDefined();
        expect(line!.text).not.toMatch(won ? /\blost\b/ : /\bwon\b/);
        console.log(
          `JOURNAL PLAYER RACE ${where}: ${playerId} ${won ? "won" : "lost"} ${contest!.id} against ${rivals.length} others: "${line!.text}" cites ${line!.sourceRecordIds.filter((id) => records.some((e) => e.id === id)).join(", ")}`,
        );
      } finally {
        setBookkeeping(true);
      }
    },
    TIMEOUT,
  );
});
