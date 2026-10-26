import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { composeJournal } from "./journal";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

// A journal says how one's own race was decided only as its result record
// shows it: nobody who ran alone writes "It was very close.", a close line
// needs a lead within the close margin, and "It wasn't close." needs one at
// least the wide margin (the director's parameter table). In a drawn town's
// next election, every candidate who is a full person is watched, and each
// line about their own race is checked against the result's totals.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const { journalRaceCloseMargin, journalRaceWideMargin } =
  DEFAULT_DIRECTOR_DATA.parameters;

it(`a candidate's journal claims only the margin their result shows, seed ${seed}`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 4 && !told.length; attempt += 1) {
      const place = drawPlace(seed, `journal-race-margin:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const elections = api.moduleState(ELECTIONS_MODULE_ID);
      const contests = () =>
        elections.table("contests").rows() as unknown as ContestRow[];
      let day: string | undefined;
      let filings: FilingRow[] = [];
      for (let guard = 0; guard < 8 && !filings.length; guard += 1) {
        day = contests()
          .map((row) => row.electionDate)
          .filter((date) => date > core.date)
          .sort()[0];
        if (!day) break;
        advanceCore(core, addDays(makeIsoDate(day), -1));
        const ids = new Set(
          contests()
            .filter((row) => row.electionDate === day)
            .map((row) => row.id),
        );
        filings = (
          elections.table("filings").rows() as unknown as FilingRow[]
        ).filter(
          (row) => ids.has(row.contestId) && core.people.has(row.personId),
        );
        if (!filings.length) advanceCore(core, day);
      }
      if (!day || !filings.length) {
        tried.push(`${where}: no election with candidates on record`);
        continue;
      }
      for (const filing of filings) director.watch(core, filing.personId);
      advanceCore(core, addDays(makeIsoDate(day), 1));
      for (const filing of filings) {
        if (!resultOf(api, filing.contestId)?.winnerId) continue;
        const resultId = `election-result:${filing.contestId}`;
        const line = composeJournal(core, director, filing.personId)
          .flatMap((chapter) => chapter.lines)
          .find((row) => row.sourceRecordIds.includes(resultId));
        if (!line) continue;
        const votes = Object.values(
          JSON.parse(
            String(core.durableLog.get(resultId)?.facts?.totals ?? "{}"),
          ) as Record<string, number>,
        ).sort((a, b) => b - a);
        const cast = votes.reduce((sum, count) => sum + count, 0);
        const lead =
          votes.length > 1 && cast > 0 ? (votes[0]! - votes[1]!) / cast : null;
        const wide = /\b(?:wasn't|was not|not) close\b|\blandslide\b/i.test(
          line.text,
        );
        const close = !wide && /\bclose\b/i.test(line.text);
        const said = `${where}: ${filing.personId} in ${filing.contestId} (${votes.length} candidates, lead ${lead === null ? "none" : lead.toFixed(3)}): "${line.text}"`;
        if (close)
          expect(
            lead !== null && lead <= journalRaceCloseMargin!.value,
            said,
          ).toBe(true);
        if (wide)
          expect(
            lead !== null && lead >= journalRaceWideMargin!.value,
            said,
          ).toBe(true);
        told.push(said);
      }
      if (!told.length)
        tried.push(`${where}: no candidate's race reached their journal`);
    }
    expect(told.length, tried.join("; ")).toBeGreaterThan(0);
    console.log(`JOURNAL RACE MARGIN\n${told.join("\n")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
