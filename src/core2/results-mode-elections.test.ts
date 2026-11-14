/**
 * The fast clock, part 4: in skipped time (results mode) every race is still
 * decided by the one election engine's count, from the voters' standing
 * views and the candidates' records, with no campaign day played. Skipped
 * time from the game's start holds a general election and local ones; every seat
 * on a ballot in them has a winner and a serving term that a later race
 * reads.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  standing,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { resultOf } from "./modules/voting";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/**
 * Places pinned by their seed, each one a place where a race read four years
 * after its day once showed nobody on the ballot because the one filer had died
 * since (a dead filer leaves `ballot`, but not the filing or the count).
 */
const PINNED_SEEDS: readonly string[] = [
  "aa11bb22cc33dd44", // Ririe, Idaho: the 2027 council race's only filer died by 2029
  "59a5f208ec60b2e40ea8f4744156f4b9a484124b", // Maybeury, West Virginia: a coroner race
];
/**
 * Through the first days of December 2027 from the game's start: the 2026 general
 * election and the 2027 local ones. The four-year run (the 2028 general too) passed at
 * both pinned places before this test was shortened; its output is in the pull request.
 */
const SKIPPED_DAYS = 680;
/** The first general election of the game. */
const FIRST_GENERAL = "2026-11-03";

const build = (place: ReturnType<typeof drawPlace>) => {
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

const run = (runSeed: string) => {
  const place = drawPlace(runSeed, "results-mode-elections");
  const where = `${place.name} (${place.key}), seed ${runSeed}, world seed ${place.seed}`;
  const skipped = build(place);
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
    // Read the race as it was held: the filings on it and the candidates the
    // count counted, however long ago a filer died (`ballot` drops the dead,
    // so a race read years later can look empty when it was not).
    const filings = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byContest", [contest.id]) as unknown as FilingRow[]
    ).filter(standing);
    expect(filings.length, `${label}: someone filed`).toBeGreaterThan(0);
    expect(
      Object.keys(result?.totals ?? {}).length,
      `${label}: the count had candidates`,
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
  process.stdout.write(
    `results-mode elections in ${where}: ${held.length} races in ${SKIPPED_DAYS} skipped days, each with a winner and a count.\n`,
  );
};

for (const pinned of PINNED_SEEDS)
  it(
    `races in skipped time are counted from the voters, in the place pinned by seed ${pinned}`,
    () => run(pinned),
    600_000,
  );
