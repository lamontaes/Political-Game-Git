/**
 * A closed race's door rows and pledges go once its election day has passed,
 * and word of a rival goes once no reader can reach it (governing lead, Oct 30
 * and Nov 1), in a played world (a random place and seed each run, named so a
 * failure can be replayed): the campaign rows keep their door counts, an open
 * race's door rows stay, a race under way reads the same word before and
 * after the fold, a closed contest's pledges go while every other contest's
 * stay (a voter who gave a yes in both keeps the other), no visit its pledges
 * named is left in `foldedCauses` unless a fact names it while
 * `causeSummaries` still counts those contacts (governing lead, Nov 1 21:22),
 * a closed race's messages and word stay while word's window reads them and
 * are gone once its last week has left it, and a race the player filed in
 * keeps every pledge, its rivals' too (CTO, Nov 1 21:25). A place whose races
 * knock no doors, read no word, keep no old newest word, or hold no pledges
 * in two contests from one voter and no folded pledged visit, or where the
 * player can enter no race or their race holds no rival's pledge, tests
 * nothing, so up to six are drawn for each check; each passed over is named
 * with why.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignParameter } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  causeSummaryOf,
  closeRace,
  foldRivalWord,
  knockDoors,
  raceReading,
  type CauseRow,
  type CauseSummaryRow,
  type PledgeRow,
} from "./modules/campaigns";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openContests,
  playerMayFileFor,
  type FilingRow,
} from "./modules/elections";
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
  it("a closed race's doors, pledges and word go, and a race under way reads the same word", () => {
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

      // The day before the count: each pledge of the day's races that names a
      // world candidate's visit still kept as a row, and how many contacts of
      // each kind that voter and candidate had then (their summary's and their
      // rows), so the count's fold can be followed once the pledges go. A
      // cause row is kept only where the why is kept (`keepCause`), so a
      // pledge whose visit kept no row names nothing; the player's own causes
      // stay as rows, so theirs are not counted. A race the player filed in
      // keeps its pledges (the second check), so it is left out here.
      const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
      const playerFiled = (contestId: string) =>
        (
          filings.query("byContest", [contestId]) as unknown as {
            personId: string;
          }[]
        ).some((f) => f.personId === core.playerId);
      const ofDay = new Set(
        [...contests]
          .filter(([id, date]) => date === first && !playerFiled(id))
          .map(([id]) => id),
      );
      const closed = (row: { contestId?: string }) =>
        !!row.contestId && ofDay.has(row.contestId);
      const pledges = campaigns.table("pledges"),
        causes = campaigns.table("causes"),
        foldedCauses = campaigns.table("foldedCauses");
      const allPledges = () =>
        (pledges.rows() as unknown as PledgeRow[])
          .slice()
          .sort((a, b) => a.id.localeCompare(b.id));
      const visits = new Map<string, PledgeRow>();
      const reachedBefore = new Map<string, Record<string, number>>();
      for (const row of allPledges()) {
        if (
          !closed(row) ||
          !row.causeId ||
          row.candidateId === core.playerId ||
          !causes.get(row.causeId)
        )
          continue;
        visits.set(row.causeId, row);
        const pair = `${row.voterId}|${row.candidateId}`;
        if (reachedBefore.has(pair)) continue;
        const reached: Record<string, number> = {};
        for (const [act, count] of Object.entries(
          causeSummaryOf(api, row.voterId, row.candidateId)?.acts ?? {},
        ))
          reached[act] = count.reached;
        for (const cause of causes.query("byVoter", [
          row.voterId,
        ]) as unknown as CauseRow[])
          if (cause.candidateId === row.candidateId)
            reached[cause.act] = (reached[cause.act] ?? 0) + 1;
        reachedBefore.set(pair, reached);
      }
      // A visit a closed contest's pledge named, once folded, is left in
      // `foldedCauses` only where a fact the voter knows names it (read on
      // the day of the fold, before a later fact can replace it; after that,
      // no visit the count left out may come back), and its voter and
      // candidate's summary still counts every contact they had the day
      // before the count. Returns how many such visits had folded.
      const knows = (voterId: string, causeId: string) =>
        [...(core.knowledgeByPerson.get(voterId)?.values() ?? [])].some(
          (fact) => fact.sourceId === causeId,
        );
      const keptAtCount = new Set<string>();
      const foldedVisits = (
        contestIds: ReadonlySet<string>,
        dayOfFold: boolean,
      ) => {
        let folded = 0;
        for (const [causeId, pledge] of visits) {
          if (!contestIds.has(pledge.contestId) || causes.get(causeId))
            continue;
          folded += 1;
          if (foldedCauses.get(causeId))
            if (dayOfFold) {
              expect(
                knows(pledge.voterId, causeId),
                `${where}: ${causeId} kept in foldedCauses with no fact naming it`,
              ).toBe(true);
              keptAtCount.add(causeId);
            } else
              expect(
                keptAtCount.has(causeId),
                `${where}: ${causeId} in foldedCauses after the close`,
              ).toBe(true);
          const acts: CauseSummaryRow["acts"] =
            causeSummaryOf(api, pledge.voterId, pledge.candidateId)?.acts ?? {};
          for (const [act, reached] of Object.entries(
            reachedBefore.get(`${pledge.voterId}|${pledge.candidateId}`)!,
          ))
            expect(
              acts[act]?.reached ?? 0,
              `${where}: ${pledge.voterId} and ${pledge.candidateId}, ${act}`,
            ).toBeGreaterThanOrEqual(reached);
        }
        return folded;
      };

      // Election day itself is a day of the race (its volunteers may walk
      // doors), and the race closes at the first campaign turn after it, so
      // the door rows and counts are read once election day has passed.
      advanceCore(core, first);
      const contestOf = (campaignId: string) =>
        (
          filings.get(campaignId) as unknown as
            { contestId: string } | undefined
        )?.contestId ?? "";
      const doors = campaigns.table("doors");
      const doorRows = () =>
        doors.rows() as unknown as { id: string; campaignId: string }[];
      const knocked = (campaignId: string) =>
        (
          campaigns.table("campaigns").get(campaignId) as unknown as
            { doorsKnockedCount?: number } | undefined
        )?.doorsKnockedCount;
      const closing = doorRows().filter(
        (row) => contests.get(contestOf(row.campaignId)) === first,
      );
      const counts = new Map(
        closing.map((row) => [row.campaignId, knocked(row.campaignId)]),
      );
      const wordOnDay = (words.rows() as unknown as Word[]).filter(
        closed,
      ).length;
      // The day's races' messages and word as election day ends, to be read
      // again at the first campaign turn after it.
      const dayMessages = (messages.rows() as unknown as Word[]).filter(closed);
      const dayWords = (words.rows() as unknown as Word[]).filter(closed);

      // The day's count is in and no race of the day has closed yet. The
      // contest with the most pledges is closed here by hand (`closeRace`, the
      // step a campaign turn takes after election day): its pledges and door
      // rows go, every other contest's stay as they were (the day's other
      // races still under way among them, and the yes a voter of this
      // contest gave in another), its messages and word stay, and the visits
      // its pledges named, folded at the count, are left in `foldedCauses`
      // only where a fact names them while their summaries count them.
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
      const visitsOfOne = [...visits.values()].filter(
        (row) => row.contestId === one && !causes.get(row.causeId!),
      ).length;
      // Every race of the day has counted: the visits the count folded are
      // read against the voters' facts today.
      const dayFolded = foldedVisits(ofDay, true);
      console.log(
        `${where}: ${closing.length} door rows and ${wordOnDay} word rows in races on ${first}; by hand the fold took ${removed} rows, kept ${keptOld} old newest words and left ${read} races' word read; ${ofOne.length} pledges in ${one ?? "no contest"} naming ${visitsOfOne} visits folded at the count, ${others.length} pledges in other contests, ${shared} of them from its voters`,
      );
      if (
        !closing.length ||
        !read ||
        !keptOld ||
        !ofOne.length ||
        !shared ||
        !visitsOfOne
      ) {
        tried.push(
          `${where}: ${closing.length} door rows in the races on ${first}, ${read} races' word read, ${keptOld} old newest words kept, ${ofOne.length} pledges in the contest closed by hand naming ${visitsOfOne} folded visits, and ${shared} pledges its voters gave in another contest`,
        );
        continue;
      }
      const elsewhere = () =>
        doorRows()
          .filter((row) => contestOf(row.campaignId) !== one)
          .map((row) => row.id)
          .sort();
      const doorsElsewhere = elsewhere();
      const idsOfOne = (rows: readonly Word[]) =>
        rows
          .filter((row) => row.contestId === one)
          .map((row) => row.id)
          .sort();
      const messagesOfOne = idsOfOne(messages.rows() as unknown as Word[]),
        wordOfOne = idsOfOne(words.rows() as unknown as Word[]);
      closeRace(api, one!);
      expect(
        allPledges().filter((row) => row.contestId === one),
        where,
      ).toEqual([]);
      expect(allPledges(), where).toEqual(others);
      expect(
        doorRows().filter((row) => contestOf(row.campaignId) === one),
        where,
      ).toEqual([]);
      expect(elsewhere(), where).toEqual(doorsElsewhere);
      expect(idsOfOne(messages.rows() as unknown as Word[]), where).toEqual(
        messagesOfOne,
      );
      expect(idsOfOne(words.rows() as unknown as Word[]), where).toEqual(
        wordOfOne,
      );
      expect(foldedVisits(new Set([one!]), true), where).toBe(visitsOfOne);
      for (const [campaignId, count] of counts)
        expect(knocked(campaignId), where).toBe(count);
      console.log(
        `closed ${one} by hand: ${ofOne.length} pledges went, ${others.length} in other contests stayed, ${doorsElsewhere.length} door rows of other races stayed, ${messagesOfOne.length} messages and ${wordOfOne.length} word rows stayed, ${visitsOfOne} pledged visits left only in causeSummaries`,
      );

      // At the first campaign turn after election day every race of the day
      // has closed, and its messages and word still inside word's window
      // stay: a filing stays on the ballot after the count, so word of it
      // may still pass on.
      advanceCore(core, addDays(makeIsoDate(first), turnDays));
      expect(
        [...ofDay].filter((id) => races.get(id)),
        where,
      ).toEqual([]);
      const inWindow = (rows: readonly Word[]) =>
        rows.filter((row) => row.date > since()).map((row) => row.id);
      const messagesRead = inWindow(dayMessages),
        wordRead = inWindow(dayWords);
      expect(
        messagesRead.filter((id) => !messages.get(id)),
        where,
      ).toEqual([]);
      expect(
        wordRead.filter((id) => !words.get(id)),
        where,
      ).toEqual([]);
      console.log(
        `the races of ${first} closed by ${core.date}: ${messagesRead.length} of their messages and ${wordRead.length} word rows still in word's window stayed`,
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
      // no visit they named is left in `foldedCauses` unless a fact names it,
      // and the summaries count those contacts.
      expect(allPledges().filter(closed), where).toEqual([]);
      const dayVisits = foldedVisits(ofDay, false);
      console.log(
        `play closed the races of ${first}: ${dayVisits} pledged visits folded (${dayFolded} at the count), ${keptAtCount.size} of them kept in foldedCauses for a fact, none for its pledge`,
      );

      const contestRows = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests");
      const electionOf = (campaignId: string) =>
        (
          contestRows.get(contestOf(campaignId)) as unknown as
            { electionDate: string } | undefined
        )?.electionDate;
      const left = doorRows();
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

  it("a race the player filed in keeps every pledge after it closes, its rivals' too", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < draws; attempt += 1) {
      const seed = `${runSeed}:player${attempt ? `:${attempt}` : ""}`;
      // A player made forty at the creator (`playerBirthDate`), so no race's
      // age bar keeps them out: the player drawn by default is seventeen on
      // the first day.
      const start = gameStartDate();
      const world = buildBenchWorld(seed, start, {
        twoLevel: true,
        playerBirthDate: `${Number(start.slice(0, 4)) - 40}-06-15`,
      });
      const core = world.core,
        api = coreAPI(core);
      const where = `${world.place.displayName} (seed ${seed})`;
      const me = core.playerId!;
      // The earliest race the player may enter, filed for at once, as the
      // filing screen files (`fileForOffice`).
      let filing: FilingRow | undefined;
      for (const contest of openContests(api)
        .filter((c) => playerMayFileFor(api, c.id))
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        )) {
        const result = fileForOffice(core, me, contest.id);
        if (result.status === "refused") continue;
        filing = result.filing;
        break;
      }
      if (!filing) {
        tried.push(`${where}: no race the player could enter`);
        continue;
      }
      const contestId = filing.contestId;
      const elections = api.moduleState(ELECTIONS_MODULE_ID),
        campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
      const electionDate = (
        elections.table("contests").get(contestId) as unknown as {
          electionDate: string;
        }
      ).electionDate;
      const turnDays = campaignParameter("campaignTurnDays");
      // A week out, the player walks an evening of their own doors if they
      // are on the ballot by then (a door while a petition circulates asks
      // for a signature, not the vote).
      const weekOut = addDays(makeIsoDate(electionDate), -7);
      if (weekOut > core.date) advanceCore(core, weekOut);
      const mine = elections
        .table("filings")
        .get(filing.id) as unknown as FilingRow;
      if (mine.status === "on-ballot")
        knockDoors(api, {
          filingId: filing.id,
          canvasserId: me,
          hours: 4,
          fillCounted: 2,
        });
      advanceCore(core, makeIsoDate(electionDate));
      const pledges = campaigns.table("pledges"),
        doors = campaigns.table("doors"),
        races = campaigns.table("races");
      const pledgesOf = (ids: ReadonlySet<string>) =>
        (pledges.rows() as unknown as PledgeRow[])
          .filter((row) => ids.has(row.contestId))
          .sort((a, b) => a.id.localeCompare(b.id));
      const raceFilings = elections
        .table("filings")
        .query("byContest", [contestId]) as unknown as FilingRow[];
      const raceDoors = () =>
        raceFilings.flatMap((f) => doors.query("byCampaign", [f.id])).length;
      const ours = new Set([contestId]);
      const kept = pledgesOf(ours);
      const doorsOnDay = raceDoors();
      const underWay = !!races.get(contestId);
      // The same day's races under way the player did not file in, whose
      // pledges go at the same turn.
      const sameDay = new Set(
        (
          elections.table("contests").rows() as unknown as {
            id: string;
            electionDate: string;
          }[]
        )
          .filter(
            (c) =>
              c.electionDate === electionDate &&
              c.id !== contestId &&
              races.get(c.id) &&
              !(
                elections
                  .table("filings")
                  .query("byContest", [c.id]) as unknown as FilingRow[]
              ).some((f) => f.personId === me),
          )
          .map((c) => c.id),
      );
      const elsewhere = pledgesOf(sameDay).length;
      const rivals = kept.filter((row) => row.candidateId !== me).length;
      console.log(
        `${where}: the player filed for ${contestId} (${mine.status} a week out); on ${electionDate} it holds ${kept.length} pledges, ${rivals} of them to rivals, and ${doorsOnDay} door rows; ${elsewhere} pledges in ${sameDay.size} other races that day`,
      );
      if (!underWay || !rivals) {
        tried.push(
          `${where}: the player's race ${contestId} ${underWay ? "was" : "was not"} under way on election day and held ${rivals} pledges to rivals`,
        );
        continue;
      }
      // The first campaign turn after election day closes the race: its door
      // rows go, and every pledge in it stays, the rivals' too; the day's
      // other races' pledges go.
      advanceCore(core, addDays(makeIsoDate(electionDate), turnDays));
      expect(races.get(contestId), `${where}: still under way`).toBeFalsy();
      expect(raceDoors(), where).toBe(0);
      expect(pledgesOf(ours), where).toEqual(kept);
      expect(pledgesOf(sameDay), where).toEqual([]);
      console.log(
        `${where}: closed by ${core.date}: ${kept.length} pledges stayed, ${doorsOnDay} door rows and ${elsewhere} pledges in the day's other races went`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a race the player filed in with a rival's pledge in ${draws} draws (run seed ${runSeed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
