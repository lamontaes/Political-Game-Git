import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { corePlaceByKey } from "../core2/place-lookup";
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
// not. In a place drawn from all 56; a place with no race the player can
// enter within two years stands aside for the next draw, named.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// A place to replay first, as the golden-path runner binds one.
const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
const WEEKS = 104;

it(`the player's journal tells their own first race the day after the count, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const place =
        attempt === 0 && pinned
          ? {
              key: pinned,
              seed,
              name: corePlaceByKey(pinned)?.displayName ?? pinned,
            }
          : drawPlace(seed, `journal-player-race:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
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
          (row) =>
            !checkEligibility(api, playerId, row.id, null).some((c) => !c.met),
        );
        if (!contest) advanceCore(core, addDays(makeIsoDate(core.date), 7));
      }
      if (!contest) {
        tried.push(`${where}: no race the player could enter`);
        continue;
      }
      const filed = fileCandidacy(api, {
        personId: playerId,
        contestId: contest.id,
        platform: [],
      });
      if (!["petitioning", "on-ballot"].includes(filed.status ?? "")) {
        tried.push(`${where}: filing for ${contest.id} was ${filed.status}`);
        continue;
      }
      // Filing is a petition: the player canvasses for signatures until the
      // clerk's check puts them on the ballot.
      const petition = gatherSignatures(
        core,
        `filing:${contest.id}:${playerId}`,
      );
      if (
        petition &&
        !(petition.check && petition.check.valid >= petition.needed)
      ) {
        tried.push(`${where}: the petition for ${contest.id} came up short`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(contest.electionDate), 1));
      const result = resultOf(api, contest.id);
      expect(result, `${where}: ${contest.id} was counted`).toBeDefined();
      const rivals = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]
      ).filter(
        (row) => row.contestId === contest!.id && row.personId !== playerId,
      );
      const resultId = `election-result:${contest.id}`;
      const lines = composeJournal(core, director, playerId).flatMap(
        (chapter) => chapter.lines,
      );
      const line = lines.find((row) => row.sourceRecordIds.includes(resultId));
      const won = result!.winnerId === playerId;
      expect(
        line,
        `${where}: the player ${won ? "won" : "lost"} ${contest.id} against ${rivals.length} others; journal: ${lines.map((row) => row.text).join(" | ") || "(empty)"}`,
      ).toBeDefined();
      expect(line!.text).not.toMatch(won ? /\blost\b/ : /\bwon\b/);
      console.log(
        `JOURNAL PLAYER RACE ${where}: ${playerId} ${won ? "won" : "lost"} ${contest.id} against ${rivals.length} others: "${line!.text}" cites ${resultId}`,
      );
      return;
    }
    throw new Error(
      `No drawn place gave the player a race: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
