/**
 * An at-large race is one race (elections-at-large-race-pooled): in a played
 * world, a body's at-large seats up on one day are counted together. Every
 * seat's contest counts the same field with the same totals, each voter
 * votes for up to as many as there are seats, the top finishers are seated
 * (each in one seat, a holder among them in their own), and no one wins two
 * seats. A place drawn from all 56; one with no such race decided in the
 * window is passed over by name. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import {
  atLargeGroup,
  VOTING_MODULE_ID,
  type ResultRow,
} from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it(`a body's at-large seats up on one day are one race, the top finishers seated (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "at-large-race");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const contests = () =>
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
    // The first local at-large race of two seats or more on the calendar.
    const race = contests()
      .filter((c) => ["city", "township", "county"].includes(c.level))
      .sort((a, b) => a.electionDate.localeCompare(b.electionDate))
      .map((c) => atLargeGroup(api, c))
      .find((group) => group.length > 1);
    if (!race) {
      tried.push(`${where}: no local at-large race of two seats`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(race[0]!.electionDate), 2));
    const results = api.moduleState(VOTING_MODULE_ID).table("results");
    const rows = race.map(
      (c) => results.get(`result:${c.id}`) as unknown as ResultRow | undefined,
    );
    if (rows.some((r) => !r)) {
      tried.push(`${where}: ${race[0]!.id} and its seats not all decided`);
      continue;
    }
    const counted = rows as ResultRow[];
    const totals = counted[0]!.totals;
    const field = Object.keys(totals);
    // One race: every seat counted the same field to the same totals.
    for (const row of counted) {
      expect(Object.keys(row.totals).sort(), where).toEqual([...field].sort());
      for (const id of field)
        expect(row.totals[id], `${where}: ${row.id} ${id}`).toBe(totals[id]);
    }
    // Each voter votes for up to as many as there are seats: with more
    // candidates than seats, the votes outnumber the voters.
    const votes = field.reduce((n, id) => n + totals[id]!, 0);
    if (field.length > race.length)
      expect(votes, where).toBeGreaterThan(counted[0]!.electorate);
    // The top finishers are seated, one seat each.
    const winners = counted.map((r) => r.winnerId).filter(Boolean) as string[];
    expect(new Set(winners).size, where).toBe(winners.length);
    const ranked = [...field].sort((a, b) => totals[b]! - totals[a]!);
    for (const id of winners)
      expect(
        ranked.indexOf(id),
        `${where}: ${id} seated from place ${ranked.indexOf(id) + 1}`,
      ).toBeLessThan(race.length);
    process.stdout.write(
      `AT LARGE ${where}: ${race.length} seats on ${race[0]!.electionDate} (${race.map((c) => c.id).join(", ")}); ${field.length} candidates, ${votes} votes from ${counted[0]!.electorate} voters; seated ${counted.map((r) => `${r.contestId.split(":").slice(-2, -1)[0]}: ${r.winnerId} (${totals[r.winnerId ?? ""] ?? 0})`).join("; ")}${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
