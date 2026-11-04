import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { electionNight, resultMomentOf } from "./election-night";
import { buildBenchWorld } from "./world";

// The night of the count, once the returns close, the bench stages the
// director's scene of the player's own result (Lane 3's concession call,
// words-venue-speeches-delivered): election night for a candidate who ran
// carries the moment the race's result record caused, with its scene bound.
// Drawn places and a fresh seed (the setup is concession-reported.test.ts's).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const YEAR = 365;

it("election night carries the scene of the candidate's own result", () => {
  const notes: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "result-night");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), YEAR);
    const townId = core.people.get(core.playerId!)?.placeId;
    for (let day = 0; !openContests(api).length && day < YEAR; day += 7)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    let contest: ContestRow | undefined;
    let filings: FilingRow[] = [];
    for (const race of [...openContests(api)]
      .filter((row) => addDays(makeIsoDate(row.electionDate), 2) <= end)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      const clerkId = filingClerkFor(api, race.id)?.personId;
      const town = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.placeId === townId &&
            p.id !== core.playerId &&
            p.id !== clerkId &&
            p.birthDate < "2000-01-01",
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 40);
      filings = [];
      for (const person of town) {
        if (filings.length >= 3) break;
        director.watch(core, person.id);
        const filed = fileCandidacy(api, {
          personId: person.id,
          contestId: race.id,
          platform: [],
        });
        if (["petitioning", "on-ballot"].includes(filed.status ?? ""))
          filings.push(filed.filing);
      }
      if (filings.length >= 2) {
        contest = race;
        break;
      }
    }
    if (!contest) {
      notes.push(`${where}: fewer than two filers`);
      continue;
    }
    gatherSignatures(core, ...filings.map((f) => f.id));
    advanceCore(core, makeIsoDate(contest.electionDate));
    for (let day = 0; day < 3 && !resultOf(api, contest.id); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const result = resultOf(api, contest.id);
    const loser = filings.find((f) => f.personId !== result?.winnerId)
      ?.personId as PersonId | undefined;
    if (!result?.winnerId || !loser) {
      notes.push(`${where}: no winner or loser`);
      continue;
    }
    // The candidate who lost is the one playing tonight.
    core.playerId = loser;
    const night = electionNight(core, loser);
    expect(night?.contestId, where).toBe(contest.id);
    const momentId = resultMomentOf(director, loser, night!.recordId);
    expect(momentId, `${where}: no scene of the result`).toBeTruthy();
    expect(momentId, where).toContain(night!.recordId);
    const entry = director.ledger.people
      .get(loser)!
      .schedule.find((row) => row.momentId === momentId)!;
    expect(entry.bindings.length, where).toBeGreaterThan(0);
    console.log(
      `${where}: ${loser} lost ${contest.id}; the night stages ${momentId} (${entry.bindings.map((b) => b.typeKey).join(", ")})`,
    );
    return;
  }
  throw new Error(`no decided race with a loser: ${notes.join("; ")}`);
}, 1_800_000);
