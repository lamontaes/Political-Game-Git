/**
 * A closed race's door rows and pledges go once its election day has passed,
 * and word of a rival goes once no reader can reach it (governing lead, Oct 30
 * and Nov 1), in a played world (a random place and seed each run, named so a
 * failure can be replayed): the campaign rows keep their door counts, an open
 * race's door rows stay, a race under way reads the same word before and
 * after the fold, a closed contest's pledges go while every other contest's
 * stay (a voter who gave a yes in both keeps the other), the causes its
 * pledges name stay in `foldedCauses`, and a closed race's messages and word
 * are gone once its last week has left word's window. A place whose races
 * knock no doors, read no word, keep no old newest word, or hold no pledges
 * in two contests from one voter and no pledged cause tests nothing, so up to
 * six are drawn; each passed over is named with why.
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
  closeRace,
  foldRivalWord,
  raceReading,
  type PledgeRow,
} from "./modules/campaigns";
import { ballot, ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const runSeed = process.env.DOORS_FOLD_SEED ?? randomBytes(8).toString("hex");
const draws = 6;

interface Word {
  readonly id: string;
  readonly candidateId: string;
  readonly date: string;
  readonly contestId?: string;
  readonly rivalId?: string;
}

describe(`campaign doors and word fold (run seed ${runSeed})`, () => {
  it("a closed race's doors and word go, and a race under way reads the same word", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < draws; attempt += 1) {
      // The first draw is the run seed itself, so an earlier run's seed
      // replays its place.
      const seed = attempt ? `${runSeed}:${attempt}` : runSeed;
      const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
      const core = world.core,
        api = coreAPI(core);
      const where = `${world.place.displayName} (seed ${seed})`;
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
        campaigns.table("town").get("town") as unknown as {
          townPlaceId: string;
        }
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
      // Every living world candidate in a race under way whose campaign is
      // working, with the word they read and their reading of the race, as
      // the campaign turn reads it (`rivalDay`).
      const readings = () =>
        (races.rows() as unknown as { id: string }[]).flatMap((race) =>
          ballot(api, race.id)
            .filter(
              (f) =>
                f.filedOn <= core.date &&
                f.personId !== core.playerId &&
                core.people.get(f.personId)?.alive === true &&
                campaigns.table("campaigns").get(f.id),
            )
            .map((f) => ({
              filing: f.id,
              word: newest(f.personId, race.id),
              reading: raceReading(
                api,
                f.id,
                core.people.get(f.personId)!,
                town,
              ),
            })),
        );

      // Each day of the race's last weeks the fold runs by hand as well: the
      // races under way read the same word and the same reading after it, a
      // second fold changes nothing, and every word row older than the
      // window left is a race's newest.
      let removed = 0,
        keptOld = 0,
        read = 0;
      advanceCore(core, addDays(makeIsoDate(first), -45));
      while (core.date < addDays(makeIsoDate(first), -1)) {
        const before = readings();
        const sizes = [messages.size, words.size];
        foldRivalWord(api);
        removed += sizes[0]! + sizes[1]! - messages.size - words.size;
        expect(readings(), where).toEqual(before);
        read += before.filter((r) => r.word).length;
        const folded = [messages.size, words.size];
        foldRivalWord(api);
        expect([messages.size, words.size], where).toEqual(folded);
        for (const row of words.rows() as unknown as Word[]) {
          if (row.date > since()) continue;
          keptOld += 1;
          expect(row.contestId && races.get(row.contestId), where).toBeTruthy();
          expect(newest(row.candidateId, row.contestId!), where).toBe(row.id);
        }
        for (const row of messages.rows() as unknown as Word[])
          expect(row.date > since(), where).toBe(true);
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      }

      // Election day itself is a day of the race (its volunteers may walk
      // doors), and the race closes at the first campaign turn after it, so
      // the door rows and counts are read once election day has passed.
      advanceCore(core, first);
      const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
      const contestOf = (campaignId: string) =>
        (
          filings.get(campaignId) as unknown as
            { contestId: string } | undefined
        )?.contestId ?? "";
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
      const wordOnDay = (words.rows() as unknown as Word[]).filter(
        closed,
      ).length;

      // The day's count is in and no race of the day has closed yet. The
      // contest with the most pledges is closed here by hand (`closeRace`, the
      // step a campaign turn takes after election day): its pledges go, every
      // other contest's stay as they were (the day's other races still under
      // way among them, and the yes a voter of this contest gave in another),
      // and the causes its pledges name as their visit stay in
      // `foldedCauses`. A cause row is kept only where the why is kept
      // (`keepCause`), so a pledge whose visit kept no row names nothing to
      // keep; and the player's own causes stay as rows, so theirs are not
      // counted.
      const pledges = campaigns.table("pledges"),
        causes = campaigns.table("causes"),
        foldedCauses = campaigns.table("foldedCauses");
      const allPledges = () =>
        (pledges.rows() as unknown as PledgeRow[])
          .slice()
          .sort((a, b) => a.id.localeCompare(b.id));
      const byContest = new Map<string, number>();
      for (const row of allPledges())
        if (closed(row))
          byContest.set(row.contestId, (byContest.get(row.contestId) ?? 0) + 1);
      const one = [...byContest].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0]?.[0];
      const ofOne = allPledges().filter((row) => row.contestId === one);
      const others = allPledges().filter((row) => row.contestId !== one);
      const inOne = new Set(ofOne.map((row) => row.voterId));
      const shared = others.filter((row) => inOne.has(row.voterId)).length;
      const pledgedCauses = (rows: readonly PledgeRow[]) =>
        rows.flatMap((row) =>
          row.causeId &&
          row.candidateId !== core.playerId &&
          (causes.get(row.causeId) || foldedCauses.get(row.causeId))
            ? [row.causeId]
            : [],
        );
      const causesOfOne = pledgedCauses(ofOne);
      // Every closed contest's kept pledged causes, read again after play
      // closes them all.
      const causesOfDay = pledgedCauses(allPledges().filter(closed));
      console.log(
        `${where}: ${closing.length} door rows and ${wordOnDay} word rows in races on ${first}; by hand the fold took ${removed} rows, kept ${keptOld} old newest words and left ${read} races' word read; ${ofOne.length} pledges in ${one ?? "no contest"} naming ${causesOfOne.length} kept causes, ${others.length} pledges in other contests, ${shared} of them from its voters`,
      );
      if (
        !closing.length ||
        !read ||
        !keptOld ||
        !ofOne.length ||
        !shared ||
        !causesOfOne.length
      ) {
        tried.push(
          `${where}: ${closing.length} door rows in the races on ${first}, ${read} races' word read, ${keptOld} old newest words kept, ${ofOne.length} pledges in the contest closed by hand naming ${causesOfOne.length} kept causes, and ${shared} pledges its voters gave in another contest`,
        );
        continue;
      }
      // A cause from a door walked on election day after the count is not
      // folded yet; the close folds it before its pledge goes.
      const unfolded = causesOfOne.filter((id) => !foldedCauses.get(id)).length;
      closeRace(api, one!);
      expect(
        allPledges().filter((row) => row.contestId === one),
        where,
      ).toEqual([]);
      expect(allPledges(), where).toEqual(others);
      expect(
        causesOfOne.filter((id) => !foldedCauses.get(id)),
        where,
      ).toEqual([]);
      for (const [campaignId, count] of counts)
        expect(knocked(campaignId), where).toBe(count);
      console.log(
        `closed ${one} by hand: ${ofOne.length} pledges went, ${others.length} in other contests stayed, ${causesOfOne.length} pledged causes in foldedCauses (${unfolded} folded at the close)`,
      );

      // A week on, word of the closed race may still pass on (its filings
      // stay on the ballot); a further week and a turn on, all of it has
      // gone.
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
      expect(
        (messages.rows() as unknown as Word[]).filter(closed),
        where,
      ).toEqual([]);
      expect((words.rows() as unknown as Word[]).filter(closed), where).toEqual(
        [],
      );
      // Play closed every race of the day: none of their pledges is left,
      // and every cause those pledges named is still in `foldedCauses`.
      expect(allPledges().filter(closed), where).toEqual([]);
      expect(
        causesOfDay.filter((id) => !foldedCauses.get(id)),
        where,
      ).toEqual([]);
      console.log(
        `play closed the races of ${first}: ${causesOfDay.length} pledged causes kept in foldedCauses`,
      );

      const contestRows = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests");
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
        where,
      ).toEqual([]);
      expect(
        left.some((row) => closing.some((c) => c.id === row.id)),
        where,
      ).toBe(false);
      for (const [campaignId, count] of counts)
        expect(knocked(campaignId), where).toBe(count);
      return;
    }
    throw new Error(
      `no drawn place knocked doors, read word and kept an old newest word in ${draws} draws (run seed ${runSeed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
