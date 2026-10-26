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

// One's own race is told in the journal the day after the count, won or lost,
// even against a rival the candidate never knew by name: its own lines say
// only how it went ("I won.", "It wasn't close."). In a drawn town, every
// candidate in its next election who is a full person is watched, and each
// whose race the director made a moment of must have it in their journal,
// whether they knew the rival or not.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a candidate's journal tells their own race, even against a rival they never knew, seed ${seed}`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const outcomes = { unknownWins: 0, unknownLosses: 0 };
  const tried: string[] = [];
  try {
    for (
      let attempt = 0;
      attempt < 4 && (!outcomes.unknownWins || !outcomes.unknownLosses);
      attempt += 1
    ) {
      const place = drawPlace(seed, `journal-own-race:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const elections = api.moduleState(ELECTIONS_MODULE_ID);
      const contests = () =>
        elections.table("contests").rows() as unknown as ContestRow[];
      // The town's next election day with candidates who are full people.
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
      // The day after the count: a watched person who is not the player
      // keeps only their strongest older moments.
      advanceCore(core, addDays(makeIsoDate(day), 1));
      for (const filing of filings) {
        const result = resultOf(api, filing.contestId);
        if (!result?.winnerId) continue;
        const person = core.people.get(filing.personId)!;
        const rivals = filings
          .filter(
            (row) =>
              row.contestId === filing.contestId &&
              row.personId !== filing.personId,
          )
          .map((row) => row.personId);
        const strangers =
          rivals.length > 0 && rivals.every((id) => !person.knownIds.has(id));
        const resultId = `election-result:${filing.contestId}`;
        const book = director.ledger.people.get(filing.personId);
        const moment = [...(book?.momentsById.values() ?? [])].find(
          (row) => row.causeId === resultId,
        );
        // A candidate the director saw the count reach.
        if (!moment) continue;
        const lines = composeJournal(core, director, filing.personId).flatMap(
          (chapter) => chapter.lines,
        );
        const line = lines.find((row) =>
          row.sourceRecordIds.includes(resultId),
        );
        const won = result.winnerId === filing.personId;
        expect(
          line,
          `${where}: ${filing.personId} ${won ? "won" : "lost"} ${filing.contestId} against ${rivals.join(", ") || "nobody"}${strangers ? ", none known" : ""}; journal: ${lines.map((row) => row.text).join(" | ") || "(empty)"}`,
        ).toBeDefined();
        if (won) expect(line!.text).not.toMatch(/\blost\b/);
        else expect(line!.text).not.toMatch(/\b(?:I|We) won\b/i);
        if (strangers) {
          if (won) outcomes.unknownWins += 1;
          else outcomes.unknownLosses += 1;
        }
        told.push(
          `${where}: ${filing.personId} ${won ? "won" : "lost"} ${filing.contestId}${strangers ? " against a rival never met" : ""}: "${line!.text}" cites ${resultId}`,
        );
      }
      if (!told.length)
        tried.push(`${where}: no candidate's race became a moment`);
    }
    expect(told.length, tried.join("; ")).toBeGreaterThan(0);
    const evidence = [...tried, ...told].join("; ");
    expect(
      outcomes.unknownWins,
      `no unknown-rival win: ${evidence}`,
    ).toBeGreaterThan(0);
    expect(
      outcomes.unknownLosses,
      `no unknown-rival loss: ${evidence}`,
    ).toBeGreaterThan(0);
    console.log(`JOURNAL OWN RACE\n${told.join("\n")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
