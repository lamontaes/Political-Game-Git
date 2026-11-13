/**
 * The fast clock, part 4: in skipped time (results mode) every race is still
 * decided by the one election engine's count, from the voters' standing
 * views and the candidates' records, with no campaign day played. Four
 * skipped years from the game's start hold two general elections; every seat
 * on a ballot in them has a winner and a serving term that a later race
 * reads. Three races are printed beside the same races played day by day,
 * with turnout and the winner's share.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { resultOf, type ResultRow } from "./modules/voting";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "results-mode-elections");
const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
/** Four years from the game's start: the 2026 and 2028 general elections. */
const SKIPPED_DAYS = 1461;
/** The day-by-day world plays to the morning after the first general election. */
const FIRST_GENERAL = "2026-11-03";

const build = () => {
  setBookkeeping(false);
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
};

const contestsOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];

const turnoutAndShare = (result: ResultRow | null) => {
  if (!result) return "no count";
  const total = Object.values(result.totals).reduce((n, v) => n + v, 0);
  const share =
    result.winnerCandidateId && total
      ? (result.totals[result.winnerCandidateId] ?? 0) / total
      : 0;
  return `${Math.round(result.electorate).toLocaleString("en-US")} voted, winner ${(share * 100).toFixed(1)}%`;
};

it(`races in four skipped years are counted from the voters, in ${where}`, () => {
  const skipped = build();
  const api = coreAPI(skipped);
  const end = addDays(makeIsoDate(skipped.date), SKIPPED_DAYS);
  const skip = advanceCore(skipped, end, { results: true });
  expect(
    skip.decisions + skip.acts,
    `no person's day was played, in ${where}`,
  ).toBe(0);
  const held = contestsOf(skipped).filter((c) => c.electionDate < end);
  expect(
    held.some((c) => c.electionDate === FIRST_GENERAL),
    `the skip held the 2026 general election, in ${where}`,
  ).toBe(true);
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  for (const contest of held) {
    const result = resultOf(api, contest.id);
    const label = `${contest.title} on ${contest.electionDate}, in ${where}`;
    expect(
      ballot(api, contest.id).length,
      `${label}: someone filed`,
    ).toBeGreaterThan(0);
    expect(result?.winnerId, `${label}: a winner`).toBeTruthy();
    if (!result?.takesOffice || result.takesOffice >= end) continue;
    const serving = (
      terms.query("bySeatStatus", [
        contest.seatId,
        "serving",
      ]) as unknown as TermRow[]
    )[0];
    expect(serving, `${label}: a serving term on the seat`).toBeTruthy();
    // The winner serves, or someone who took the seat after them.
    expect(
      serving!.personId === result.winnerId ||
        serving!.startDate >= result.takesOffice,
      `${label}: the seat's term is the winner's or a later one`,
    ).toBe(true);
  }
  // Three races of the first general election beside the same races played
  // day by day.
  const daily = build();
  advanceCore(daily, addDays(makeIsoDate(FIRST_GENERAL), 1));
  const dailyApi = coreAPI(daily);
  const compared = held
    .filter((c) => c.electionDate === FIRST_GENERAL)
    .slice(0, 3)
    .map(
      (c) =>
        `${c.title}: skipped ${turnoutAndShare(resultOf(api, c.id))}; day by day ${turnoutAndShare(resultOf(dailyApi, c.id))}`,
    );
  process.stdout.write(
    `results-mode elections in ${where}: ${held.length} races in ${SKIPPED_DAYS} skipped days, each with a winner. ${compared.join(". ")}.\n`,
  );
  expect(compared.length).toBeGreaterThan(0);
}, 3_000_000);
