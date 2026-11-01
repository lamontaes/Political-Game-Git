/**
 * A closed race's door rows go once its election day has passed, and word of
 * a rival goes once no reader can reach it (governing lead, Oct 30), in a
 * played world (a random place and seed each run, named so a failure can be
 * replayed): the campaign rows keep their door counts, an open race's door
 * rows stay, a race under way reads the same word before and after the fold,
 * and a closed race's messages and word are gone once its last week has left
 * word's window.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignParameter } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  foldRivalWord,
  raceReading,
} from "./modules/campaigns";
import { ballot, ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const seed = process.env.DOORS_FOLD_SEED ?? randomBytes(8).toString("hex");

interface Word {
  readonly id: string;
  readonly candidateId: string;
  readonly date: string;
  readonly contestId?: string;
  readonly rivalId?: string;
}

describe(`campaign doors and word fold (seed ${seed})`, () => {
  it("a closed race's doors and word go, and a race under way reads the same word", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core,
      api = coreAPI(core);
    const contests = new Map(
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as { id: string; electionDate: string }[]
      ).map((c) => [c.id, c.electionDate]),
    );
    const first = [...contests.values()]
      .filter((d) => d > core.date)
      .sort()[0]!;
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
    const words = campaigns.table("rivalWord"),
      messages = campaigns.table("messages"),
      races = campaigns.table("races");
    const town = (
      campaigns.table("town").get("town") as unknown as { townPlaceId: string }
    ).townPlaceId;
    const windowDays = campaignParameter("rivalWordDays"),
      turnDays = campaignParameter("campaignTurnDays");
    const since = () => addDays(makeIsoDate(core.date), -windowDays);
    // The word `raceReading` takes: a candidate's newest in the contest, by
    // date and then id.
    const newest = (candidateId: string, contestId: string) =>
      (words.query("byCandidate", [candidateId]) as unknown as Word[])
        .filter((row) => row.rivalId && row.contestId === contestId)
        .sort(
          (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
        )[0]?.id;
    // Every world candidate in a race under way whose campaign is working,
    // with the word they read and their reading of the race.
    const readings = () =>
      (races.rows() as unknown as { id: string }[]).flatMap((race) =>
        ballot(api, race.id)
          .filter(
            (f) =>
              f.filedOn <= core.date &&
              f.personId !== core.playerId &&
              campaigns.table("campaigns").get(f.id),
          )
          .map((f) => {
            const candidate = core.people.get(f.personId)!;
            return {
              filing: f.id,
              word: newest(f.personId, race.id),
              reading: raceReading(api, f.id, candidate, town),
            };
          }),
      );

    // Each day of the race's last weeks the fold runs by hand as well: the
    // races under way read the same word and the same reading after it, a
    // second fold changes nothing, and every word row older than the window
    // left is a race's newest.
    let removed = 0,
      keptOld = 0,
      read = 0;
    advanceCore(core, addDays(makeIsoDate(first), -45));
    while (core.date < addDays(makeIsoDate(first), -1)) {
      const before = readings();
      const sizes = [messages.size, words.size];
      foldRivalWord(api);
      removed += sizes[0]! + sizes[1]! - messages.size - words.size;
      expect(readings()).toEqual(before);
      read += before.filter((r) => r.word).length;
      const folded = [messages.size, words.size];
      foldRivalWord(api);
      expect([messages.size, words.size]).toEqual(folded);
      for (const row of words.rows() as unknown as Word[]) {
        if (row.date > since()) continue;
        keptOld += 1;
        expect(row.contestId && races.get(row.contestId)).toBeTruthy();
        expect(newest(row.candidateId, row.contestId!)).toBe(row.id);
      }
      for (const row of messages.rows() as unknown as Word[])
        expect(row.date > since()).toBe(true);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }

    const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
    const contestOf = (campaignId: string) =>
      (filings.get(campaignId) as unknown as { contestId: string } | undefined)
        ?.contestId ?? "";
    const doors = campaigns.table("doors");
    const knocked = (campaignId: string) =>
      (
        campaigns.table("campaigns").get(campaignId) as unknown as
          { doorsKnockedCount?: number } | undefined
      )?.doorsKnockedCount;
    const closing = (
      doors.rows() as unknown as { id: string; campaignId: string }[]
    ).filter((row) => contests.get(contestOf(row.campaignId)) === first);
    const counts = new Map(
      closing.map((row) => [row.campaignId, knocked(row.campaignId)]),
    );
    const closed = (row: { contestId?: string }) =>
      !!row.contestId && contests.get(row.contestId) === first;
    const wordOnDay = (words.rows() as unknown as Word[]).filter(closed).length;
    console.log(
      `${world.place.displayName}: ${closing.length} door rows and ${wordOnDay} word rows in races on ${first}; by hand the fold took ${removed} rows, kept ${keptOld} old newest words and left ${read} races' word read`,
    );
    expect(closing.length).toBeGreaterThan(0);

    // A week on, word of the closed race may still pass on (its filings stay
    // on the ballot); a further week and a turn on, all of it has gone.
    advanceCore(core, addDays(makeIsoDate(first), windowDays));
    const after = (words.rows() as unknown as Word[]).filter(
      (row) => closed(row) && row.date > first,
    ).length;
    advanceCore(
      core,
      addDays(makeIsoDate(first), 2 * windowDays + turnDays + 1),
    );
    console.log(
      `${after} word rows of those races were passed on after election day`,
    );
    expect((messages.rows() as unknown as Word[]).filter(closed)).toEqual([]);
    expect((words.rows() as unknown as Word[]).filter(closed)).toEqual([]);

    const contestRows = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
    const electionOf = (campaignId: string) =>
      (
        contestRows.get(contestOf(campaignId)) as unknown as
          { electionDate: string } | undefined
      )?.electionDate;
    const left = doors.rows() as unknown as {
      id: string;
      campaignId: string;
    }[];
    // A race closes at the first campaign turn after its election day.
    const turned = addDays(makeIsoDate(core.date), -turnDays);
    expect(
      left.filter((row) => {
        const day = electionOf(row.campaignId);
        return day !== undefined && day <= turned;
      }),
    ).toEqual([]);
    expect(left.some((row) => closing.some((c) => c.id === row.id))).toBe(
      false,
    );
    for (const [campaignId, count] of counts)
      expect(knocked(campaignId)).toBe(count);
  }, 1_800_000);
});
