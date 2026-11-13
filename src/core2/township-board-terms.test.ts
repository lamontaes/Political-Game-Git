/**
 * A town or township board's seats follow the term and turns its state's
 * statute sets (elections-at-large-count-disagrees-with-per-seat-filing-and-ballot).
 * Before, a township board had no term, so every seat came up at every
 * election and the voting engine pooled them into one race: a member who
 * lost their own seat's race was seated and an unopposed one was not.
 *
 * 1. The playtest's own world (Playtester P3, Nov 13, 2026): a board whose
 *    statute elects one member a year for three years has one seat up each
 *    March for three years, each won by the top of its own count, each
 *    winner serving the full term, nobody holding two seats.
 * 2. A place drawn from all 56 whose board's seats take turns: its seats
 *    are not all up on one day, and each sitting member's term ends at their
 *    own seat's election.
 * 3. A place drawn from all 56 whose board is elected all at once: every
 *    seat is up on one day and counted as one race.
 * Set GOLDEN_PATH_SEED to reproduce a draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { localOfficesForPlace, type OfficeInput } from "./offices-local";
import {
  atLargeGroup,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { VOTING_MODULE_ID, type ResultRow } from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function townBoard(key: string): OfficeInput | undefined {
  try {
    return localOfficesForPlace(key).find(
      (o) => o.level === "township" && o.kind === "township-board",
    );
  } catch {
    return undefined;
  }
}

function openingBoard(placeKey: string, worldSeed: string, where: string) {
  process.stdout.write(`BUILDING ${where}\n`);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const office = townBoard(placeKey)!;
  const contests = () =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .query("byOffice", [office.id]) as unknown as ContestRow[]
    ).filter((c) => !c.special);
  const terms = () =>
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[]
    ).filter((t) => t.officeId === office.id && !t.id.includes(":past:"));
  return { core, api, office, contests, terms };
}

const years = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / (365.25 * 86_400_000);

it("the playtest's board elects one seat a year, each won by the top of its own count (North Hyde Park, seed a6b481a5)", () => {
  setBookkeeping(false);
  const placeKey = "5050725";
  const worldSeed = "a6b481a5-c6c9-432b-8cca-c0463c518da8";
  const where = `North Hyde Park (${placeKey}), world seed ${worldSeed}`;
  const { core, api, office, contests, terms } = openingBoard(
    placeKey,
    worldSeed,
    where,
  );
  expect(office.termYears, where).toBe(3);
  // At the opening: one seat a year, never two on one day.
  const days = contests().map((c) => c.electionDate);
  expect(new Set(days).size, `${where}: ${days.join(", ")}`).toBe(days.length);
  for (const c of contests())
    expect(atLargeGroup(api, c).length, `${where}: ${c.id}`).toBe(1);
  // Each sitting member's term ends just after their own seat's election.
  for (const term of terms()) {
    const own = contests().find((c) => c.seatId === term.seatId)!;
    expect(own, `${where}: ${term.id}`).toBeTruthy();
    expect(term.endDate! > own.electionDate, `${where}: ${term.id}`).toBe(true);
    expect(years(own.electionDate, term.endDate!), where).toBeLessThan(1);
  }
  advanceCore(core, makeIsoDate("2027-04-30"));
  const results = (
    api
      .moduleState(VOTING_MODULE_ID)
      .table("results")
      .rows() as unknown as ResultRow[]
  ).filter((r) => r.contestId.includes(`${office.id.slice(7)}:`));
  const decided = results.map((r) => r.contestId.slice(-10).slice(0, 4));
  // Exactly one seat decided each March of 2025, 2026 and 2027.
  expect(decided.sort(), `${where}: ${decided.join(", ")}`).toEqual([
    "2025",
    "2026",
    "2027",
  ]);
  for (const r of results) {
    if (!r.winnerId) continue;
    const top = Math.max(...Object.values(r.totals));
    expect(r.totals[r.winnerId], `${where}: ${r.contestId}`).toBe(top);
  }
  // Every member elected serves the three-year term, and nobody holds two
  // seats of the board at once.
  const all = terms();
  for (const term of all.filter((t) => t.status === "serving")) {
    if (term.reached?.startsWith("elected"))
      expect(
        Math.round(years(term.startDate, term.endDate!)),
        `${where}: ${term.id}`,
      ).toBe(3);
    const twice = all.filter(
      (t) =>
        t.status === "serving" &&
        t.personId === term.personId &&
        t.seatId !== term.seatId,
    );
    expect(
      twice.map((t) => t.id),
      `${where}: ${term.id}`,
    ).toEqual([]);
  }
  process.stdout.write(
    `TOWN BOARD ${where}: ${results.map((r) => `${r.contestId} won by ${r.winnerId} (${JSON.stringify(r.totals)})`).join("; ")}\n`,
  );
}, 1_800_000);

it(`a drawn board whose seats take turns is not all up on one day (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "township-board-staggered", (key) => {
    const board = townBoard(key);
    return !!board && board.seats > 1 && board.staggered !== false;
  });
  const where = `${place.name} (${place.key}), run seed ${seed}, world seed ${place.seed}`;
  const { office, contests, terms } = openingBoard(
    place.key,
    place.seed,
    where,
  );
  const days = new Set(contests().map((c) => c.electionDate));
  expect(days.size, `${where}: ${[...days].join(", ")}`).toBeGreaterThan(1);
  for (const term of terms()) {
    const own = contests().find((c) => c.seatId === term.seatId);
    if (!own) continue;
    expect(term.endDate! > own.electionDate, `${where}: ${term.id}`).toBe(true);
    expect(years(own.electionDate, term.endDate!), where).toBeLessThan(1);
  }
  process.stdout.write(
    `STAGGERED ${where}: ${office.seats} seats, ${office.termYears}-year terms, up on ${[...days].sort().join(", ")}\n`,
  );
}, 600_000);

it(`a drawn board elected all at once is one race on one day (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "township-board-together", (key) => {
    const board = townBoard(key);
    return !!board && board.seats > 1 && board.staggered === false;
  });
  const where = `${place.name} (${place.key}), run seed ${seed}, world seed ${place.seed}`;
  const { api, office, contests } = openingBoard(place.key, place.seed, where);
  const first = contests().sort((a, b) =>
    a.electionDate.localeCompare(b.electionDate),
  )[0]!;
  const sameDay = contests().filter(
    (c) => c.electionDate === first.electionDate,
  );
  expect(sameDay.length, where).toBe(office.seats);
  expect(atLargeGroup(api, first).length, where).toBe(office.seats);
  process.stdout.write(
    `TOGETHER ${where}: ${office.seats} seats, ${office.termYears}-year terms, all up on ${first.electionDate}\n`,
  );
}, 600_000);
