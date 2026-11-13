/**
 * One race, one result every reader agrees on
 * (director-concession-received-plays-for-the-loser). In a body's at-large
 * race (several seats filled from one field, "vote for N"), each seat keeps
 * its own result record, but a candidate is named on exactly one of them: a
 * seated winner on their own seat's, a candidate who missed the cut once (on
 * the race's first seat's). So a winner remembers "elected" once and never
 * "lost", a candidate outside the top N remembers "lost" once; the concession
 * call a winner takes comes from a candidate who missed the cut, never from
 * another winner or themselves, and none plays where nobody missed it; and
 * the race reads "won" on the screens for whichever seat the count gave.
 *
 * The case is pinned from data: a small town whose calendar holds an
 * at-large race and a single seat on the same early day, so a failure can
 * only mean the code failed. Residents file one more than the seats, so
 * someone misses the cut, and two for the single seat, whose record keeps
 * every candidate named and the runner-up as the caller.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { electionResults, ownRace } from "../bench/results";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  atLargeGroup,
  checkEligibility,
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
} from "../core2/modules/elections";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { civicFill } from "./civic-roles";
import type { Moment } from "./types";

interface Settled {
  readonly id: string;
  readonly personIds: readonly string[];
  readonly facts?: Readonly<Record<string, string>>;
}

const contestsOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];

const filingsOf = (core: CoreState, contestId: string) =>
  (
    coreAPI(core)
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as { contestId: string; personId: string }[]
  ).filter((f) => f.contestId === contestId);

const recordsOf = (core: CoreState, race: readonly ContestRow[]) =>
  race.map(
    (c) =>
      core.durableLog.get(`election-result:${c.id}` as never) as unknown as
        Settled | undefined,
  );

const callersOf = (core: CoreState, personId: string, causeId: string) =>
  civicFill(
    "opponent",
    core,
    {
      personId: personId as PersonId,
      causeId,
      date: core.date,
    } as unknown as Moment,
    new Set(),
  );

/**
 * Every candidate of a decided at-large race: named once, elected or lost as
 * the count's cut says, a winner's caller one who missed the cut, the race
 * read as won for a seated candidate. Returns the line it logs.
 */
function checkRace(
  core: CoreState,
  race: readonly ContestRow[],
  where: string,
): string {
  const settled = recordsOf(core, race).map((r) => r!);
  const totals = JSON.parse(String(settled[0]!.facts?.totals)) as Record<
    string,
    number
  >;
  const ranked = Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const winners = new Set(settled.map((r) => String(r.facts?.winnerId)));
  const lines: string[] = [];
  for (const [id, votes] of ranked) {
    if (!core.people.has(id as PersonId)) continue;
    const named = settled.filter((r) => r.personIds.includes(id));
    const elected = named.filter((r) => r.facts?.winnerId === id).length;
    const lost = named.filter((r) => r.facts?.winnerId !== id).length;
    const seated = winners.has(id);
    const who = `${where}: ${id} (${votes} votes, ${seated ? "seated" : "missed the cut"})`;
    // One result every reader agrees on: elected once or lost once.
    expect(elected, `${who} remembers "elected"`).toBe(seated ? 1 : 0);
    expect(lost, `${who} remembers "lost"`).toBe(seated ? 0 : 1);
    // Every seat's record agrees on who missed the cut, and names the race.
    for (const r of settled) {
      expect(
        (JSON.parse(String(r.facts?.outIds ?? "[]")) as string[]).includes(id),
        `${who} in ${r.id}'s outIds`,
      ).toBe(!seated);
      expect(r.facts?.race, `${r.id} names its race`).toBe(race[0]!.id);
      expect(r.facts?.seats, `${r.id} names its seats`).toBe(
        String(race.length),
      );
    }
    let callers: PersonId[] = [];
    if (seated) {
      const own = settled.find((r) => r.facts?.winnerId === id)!;
      callers = callersOf(core, id, own.id);
      // A winner's call comes from one who missed the cut, or none.
      for (const caller of callers) {
        expect(caller, `${who} called by themselves`).not.toBe(id);
        expect(winners.has(caller), `${who} called by ${caller}, seated`).toBe(
          false,
        );
      }
      if (ranked.every(([other]) => winners.has(other)))
        expect(callers, `${who}: nobody missed the cut, so no call`).toEqual(
          [],
        );
    }
    // The race reads won on the screens whichever seat they filed for, on
    // election night as on the results screen; and with more than one name
    // in the race, no seat of it is told as unopposed.
    expect(ownRace(core, id)?.won, `${who} own race`).toBe(seated);
    for (const row of electionResults(core, id).filter((r) =>
      race.some((c) => c.id === r.contestId),
    )) {
      expect(row.mine?.won, `${who} on election night, ${row.contestId}`).toBe(
        seated,
      );
      expect(row.unopposed, `${row.contestId} told as unopposed`).toBe(
        ranked.length === 1,
      );
    }
    lines.push(
      `${id} ${votes} ${seated ? "seated" : "out"} elected ${elected} lost ${lost}${callers.length ? ` caller ${callers[0]} (${totals[callers[0]!] ?? 0})` : ""}`,
    );
  }
  return `${race.length} seats on ${race[0]!.electionDate} (${race[0]!.id}); ${lines.join("; ")}`;
}

/** A place and its at-large race, pinned from the calendar the world is built with. */
interface Pin {
  readonly name: string;
  readonly key: string;
  readonly worldSeed: string;
  /** The race's first seat. */
  readonly raceId: string;
  /** A single seat decided the same day. */
  readonly singleId: string;
}

// A five-seat council and the mayor on one August day, in a small town:
// read without playing a day, by building drawn places and listing their
// contests.
const NORTH_COURTLAND: Pin = {
  name: "North Courtland, Alabama",
  key: "0155044",
  worldSeed: "57991bf91d582506371821c6dd040c6557845a437a8b2035954fde34881fd75a",
  raceId: "contest:seat:gus2025:160661:council:0:2025-08-26",
  singleId: "contest:seat:gus2025:160661:mayor:0:2025-08-26",
};

/** Residents of the town who may run for `seatId` and are not running, in id order. */
function residentsFor(core: CoreState, seatId: string): string[] {
  const api = coreAPI(core);
  const townId = core.people.get(core.playerId!)?.placeId;
  return [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townId &&
        p.id !== core.playerId &&
        !(
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byPerson", [p.id]) as unknown as { status: string }[]
        ).some((row) => ["petitioning", "on-ballot"].includes(row.status)) &&
        !checkEligibility(api, p.id, seatId, null).some((c) => !c.met),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => p.id);
}

it(`${NORTH_COURTLAND.name}: every candidate of an at-large race is named once, elected or lost as the cut says; a single seat is unchanged`, () => {
  setBookkeeping(false);
  const pin = NORTH_COURTLAND;
  const where = `${pin.name} (${pin.key}), world seed ${pin.worldSeed}`;
  const { core } = buildBenchWorld(pin.worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: pin.key,
  });
  const api = coreAPI(core);
  const first = contestsOf(core).find((c) => c.id === pin.raceId);
  expect(first, `${where}: ${pin.raceId} on the calendar`).toBeDefined();
  const race = [...atLargeGroup(api, first!)];
  expect(race.length, `${where}: ${pin.raceId} is pooled`).toBeGreaterThan(1);
  // Residents file the day filing opens: one more than the seats, spread
  // over the seats, so someone misses the cut whoever else files; and two
  // for the single seat, so it has a rival.
  advanceToRaceFiling(core, first!);
  const filed: string[] = [];
  const fileFor = (personId: string, seatId: string) => {
    const result = fileCandidacy(api, {
      personId,
      contestId: seatId,
      platform: [],
    });
    if (["petitioning", "on-ballot"].includes(result.status ?? ""))
      filed.push(result.filing.id);
  };
  for (const id of residentsFor(core, race[0]!.id)) {
    if (filed.length > race.length) break;
    fileFor(id, race[filed.length % race.length]!.id);
  }
  expect(filed.length, `${where}: residents filed for the council`).toBe(
    race.length + 1,
  );
  for (const id of residentsFor(core, pin.singleId).slice(0, 2))
    fileFor(id, pin.singleId);
  gatherSignatures(core, ...filed);
  advanceCore(core, addDays(makeIsoDate(race[0]!.electionDate), 2));
  expect(
    recordsOf(core, race).every((r) => !!r),
    `${where}: every seat of ${race[0]!.id} decided`,
  ).toBe(true);
  const field = new Set(
    race.flatMap((c) => filingsOf(core, c.id).map((f) => f.personId)),
  );
  expect(field.size, `${where}: someone misses the cut`).toBeGreaterThan(
    race.length,
  );
  const line = checkRace(core, race, where);
  // The single seat keeps every candidate named and the runner-up as its
  // winner's caller, as before.
  const single = core.durableLog.get(
    `election-result:${pin.singleId}` as never,
  ) as unknown as Settled | undefined;
  expect(
    single?.facts?.winnerId,
    `${where}: ${pin.singleId} decided`,
  ).toBeTruthy();
  const totals = JSON.parse(String(single!.facts!.totals)) as Record<
    string,
    number
  >;
  const winnerId = String(single!.facts!.winnerId);
  const others = Object.keys(totals)
    .filter((id) => id !== winnerId && core.people.has(id as PersonId))
    .sort();
  expect(
    others.length,
    `${where}: ${pin.singleId} has a rival`,
  ).toBeGreaterThan(0);
  expect(single!.facts?.race, `${single!.id} is no pooled race`).toBe(
    undefined,
  );
  expect(
    [...single!.personIds].filter((id) => id !== winnerId).sort(),
    `${single!.id} names every candidate`,
  ).toEqual(others);
  expect(
    JSON.parse(String(single!.facts!.outIds)),
    `${single!.id} outIds`,
  ).toEqual(others);
  const runnerUp = Object.entries(totals)
    .filter(([id]) => id !== winnerId && core.people.has(id as PersonId))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  expect(callersOf(core, winnerId, single!.id), `${single!.id} caller`).toEqual(
    runnerUp ? [runnerUp] : [],
  );
  process.stdout.write(
    `AT LARGE ${where}: ${line}; single ${single!.id}: ${others.length + 1} named, caller ${runnerUp}\n`,
  );
}, 600_000);
