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
 * The drawn case draws from all 56 until a race has more candidates than
 * seats, naming what it passed over (GOLDEN_PATH_SEED reproduces a run). The
 * two fixed cases are the replays that showed the fault on main (every
 * winner also "lost", another winner calling). A single seat's record keeps
 * every candidate named and the runner-up as the caller.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { electionResults, ownRace } from "../bench/results";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  atLargeGroup,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { civicFill } from "./civic-roles";
import type { Moment } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
// The window a race must be decided in: two years from the start.
const WINDOW = "2027-01-01";

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

/** Local races decided in the window, earliest first, each as the engine groups it. */
function racesIn(core: CoreState): ContestRow[][] {
  const api = coreAPI(core);
  return contestsOf(core)
    .filter(
      (c) =>
        ["city", "township", "county"].includes(c.level) &&
        !c.special &&
        !c.primaryDate &&
        c.electionDate < WINDOW,
    )
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate))
    .map((c) => [...atLargeGroup(api, c)])
    .filter(
      (group, n, all) =>
        all.findIndex((other) => other[0]!.id === group[0]!.id) === n,
    );
}

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

it(`a drawn at-large race with someone outside the cut names each candidate once (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "at-large-result");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    process.stdout.write(`BUILD ${where}\n`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const races = racesIn(core).filter((group) => group.length > 1);
    if (!races.length) {
      tried.push(`${where}: no local at-large race before ${WINDOW}`);
      continue;
    }
    // Played to two days past each race, until one has more candidates than
    // seats (someone missed the cut).
    for (const race of races) {
      advanceCore(core, addDays(makeIsoDate(race[0]!.electionDate), 2));
      const field = new Set(race.flatMap((c) => filingsOf(core, c.id)));
      if (recordsOf(core, race).some((r) => !r)) {
        tried.push(`${where}: ${race[0]!.id} and its seats not all decided`);
        continue;
      }
      if (field.size <= race.length) {
        tried.push(
          `${where}: ${race[0]!.id} had ${field.size} candidates for ${race.length} seats`,
        );
        continue;
      }
      process.stdout.write(
        `AT LARGE RESULT ${where}: ${checkRace(core, race, where)}${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
      );
      return;
    }
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);

// The replays that showed the fault on main 48296b91: a council and a town
// board where every winner was also told they lost and another winner
// called. Nobody missed the cut in either, so nobody calls; the first plain
// single-seat local race of the same world keeps every candidate named and
// the runner-up as its winner's caller, as before.
for (const [name, key, worldSeed] of [
  [
    "Dandridge, Tennessee",
    "4719380",
    "619f499e38d2ac287d8c108c08b9fcee9de55646cdcc6aa1beff906b4bfd8237",
  ],
  ["Newport East, Rhode Island", "4450140", "t20:4450140"],
] as const)
  it(`${name}: every winner of the pooled race is elected once and lost never; a single seat is unchanged`, () => {
    setBookkeeping(false);
    const where = `${name} (${key}), world seed ${worldSeed}`;
    process.stdout.write(`BUILD ${where}\n`);
    const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    });
    const races = racesIn(core);
    const race = races.find((group) => group.length > 1);
    expect(race, `${where}: an at-large race before ${WINDOW}`).toBeDefined();
    advanceCore(core, addDays(makeIsoDate(race![0]!.electionDate), 2));
    const line = checkRace(core, race!, where);
    // A single seat decided by then, with a rival, reads as it did.
    const single = races
      .filter(
        (group) => group.length === 1 && group[0]!.electionDate <= core.date,
      )
      .map((group) => recordsOf(core, group)[0])
      .find(
        (r) =>
          !!r?.facts?.winnerId &&
          Object.keys(JSON.parse(String(r.facts.totals))).length > 1,
      );
    let alone = "no single seat with a rival decided";
    if (single) {
      const totals = JSON.parse(String(single.facts!.totals)) as Record<
        string,
        number
      >;
      const winnerId = String(single.facts!.winnerId);
      const others = Object.keys(totals)
        .filter((id) => id !== winnerId && core.people.has(id as PersonId))
        .sort();
      expect(single.facts?.race, `${single.id} is no pooled race`).toBe(
        undefined,
      );
      expect(
        [...single.personIds].filter((id) => id !== winnerId).sort(),
        `${single.id} names every candidate`,
      ).toEqual(others);
      expect(
        JSON.parse(String(single.facts!.outIds)),
        `${single.id} outIds`,
      ).toEqual(others);
      const runnerUp = Object.entries(totals)
        .filter(([id]) => id !== winnerId && core.people.has(id as PersonId))
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
      expect(
        callersOf(core, winnerId, single.id),
        `${single.id} caller`,
      ).toEqual(runnerUp ? [runnerUp] : []);
      alone = `${single.id}: ${others.length + 1} named, caller ${runnerUp}`;
    }
    process.stdout.write(`AT LARGE FIXED ${where}: ${line}; single ${alone}\n`);
  }, 3_600_000);
