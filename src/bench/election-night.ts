/**
 * Election day and night as the player lives them (owner, Oct 26, 2026:
 * "about five minutes of scenes"). On election morning a candidate's
 * volunteer comes by to canvass, and the day asks whether the player goes to
 * vote: going opens the ballot at the polling place, staying home casts
 * nothing (the engine never votes for the player). That night the returns
 * come in place by place from the count's own records, smallest place first,
 * as a small place's tally is done first, until the race is called. The
 * narrator's words come from the election-day bank (english-election-day);
 * the screen shows the count's numbers and names as record data.
 */
import type { PollingVisit } from "../director/polling-place";
import { electionDayLine, type DayFact } from "../english/english-election-day";
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import { candidateIdentity, placesOf, resultOf } from "../core2/modules/voting";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { EntityId } from "../core2/kernel/brands";
import type { CoreAPI, CoreState } from "../core2/types";
import { electionResults, governorRacesTonight, resultsScene } from "./results";

type Line = { text: string; sourceRecordIds: string[] };

const fact = (text: string | number, ...ids: string[]): DayFact => ({
  text: String(text),
  sourceRecordIds: ids.filter(Boolean),
});
const count = (n: number) => n.toLocaleString("en-US");

function townName(api: CoreAPI): string | null {
  const town = corePlaceByJurisdictionId(lawChain(api).townPlaceId as EntityId);
  return town ? (town.formalName ?? town.displayName.split(",")[0]!) : null;
}

function nameOf(api: CoreAPI, id: string): string | null {
  const who = candidateIdentity(api, id);
  return who ? `${who.givenName} ${who.familyName}` : null;
}

/** The player's own filing on a ballot that day, if they are a candidate. */
function ownFiling(
  api: CoreAPI,
  personId: string,
  date: string,
): { filing: FilingRow; contest: ContestRow } | null {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  for (const filing of elections
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[]) {
    if (filing.status !== "on-ballot") continue;
    const contest = elections.table("contests").get(filing.contestId) as
      ContestRow | undefined;
    if (contest?.electionDate === date) return { filing, contest };
  }
  return null;
}

/**
 * Who comes by to canvass: the campaign's first volunteer or staffer, in the
 * order they signed on, who is alive and in town. None, and the candidate
 * goes alone.
 */
function canvasser(api: CoreAPI, filingId: string, personId: string) {
  const row = (api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? api.moduleState(CAMPAIGNS_MODULE_ID).table("campaigns").get(filingId)
    : undefined) as unknown as CampaignRow | undefined;
  const town = lawChain(api).townPlaceId;
  return (
    [...(row?.staffIds ?? []), ...(row?.volunteerIds ?? [])].find((id) => {
      const person = api.state.people.get(id as EntityId);
      return id !== personId && person?.alive && person.placeId === town;
    }) ?? null
  );
}

/**
 * Election morning: what the narrator says, and whether the player, as a
 * candidate, can canvass before going (or not going) to vote.
 */
export function electionDay(
  core: CoreState,
  personId: string,
  visit: PollingVisit,
  canvassed: boolean,
) {
  const api = coreAPI(core);
  const date = visit.record.electionDate;
  const moment = {
    key: `${personId}:${date}`,
    worldSeed: core.seed,
    recordIds: visit.contests.map((row) => row.id),
  };
  const own = ownFiling(api, personId, date);
  const place = townName(api);
  const lines: Line[] = [];
  const say = (role: string, facts: Record<string, DayFact>) => {
    const line = electionDayLine(role, facts, moment);
    if (line) lines.push(line);
  };
  say("morning", place ? { place: fact(place) } : {});
  if (own) {
    const rival = ballot(api, own.contest.id).find(
      (row) => row.personId !== personId,
    );
    const rivalName = rival ? nameOf(api, rival.personId) : null;
    say("ballot", {
      candidate: fact("yes", own.filing.id),
      office: fact(own.contest.title, own.contest.id),
      ...(rival && rivalName ? { opponent: fact(rivalName, rival.id) } : {}),
    });
  } else {
    const races = visit.contests.length;
    say("ballot", {
      number: fact(count(races), ...visit.contests.map((row) => row.id)),
      [races === 1 ? "one" : "several"]: fact("yes"),
      ...(races === 1
        ? { office: fact(visit.contests[0]!.title, visit.contests[0]!.id) }
        : {}),
    });
  }
  const helper = own ? canvasser(api, own.filing.id, personId) : null;
  if (own && !canvassed)
    say("canvass", {
      ...(helper ? { helper: fact("yes", helper) } : {}),
      ...(helper ? { name: fact(nameOf(api, helper) ?? "", helper) } : {}),
    });
  const withName = visit.withIds.length ? nameOf(api, visit.withIds[0]!) : null;
  return {
    date,
    contestIds: visit.contests.map((row) => row.id),
    lines,
    canvass:
      own && !canvassed ? { filingId: own.filing.id, helperId: helper } : null,
    // The choice itself is asked after the canvass, or at once.
    ask: [
      electionDayLine(
        "vote-ask",
        withName
          ? { with: fact("yes"), companion: fact(withName, visit.withIds[0]!) }
          : {},
        moment,
      ),
    ].filter((line): line is Line => line !== null),
  };
}

/** What the narrator says after the canvass, from the campaign day's result. */
export function canvassedLine(
  core: CoreState,
  personId: string,
  date: string,
  filingId: string,
  result: { doorsKnocked: number; reached: number },
): Line | null {
  const doors = result.doorsKnocked;
  return electionDayLine(
    "canvassed",
    {
      ...(doors > 0 ? { number: fact(count(doors)) } : {}),
      [doors === 0 ? "none" : doors === 1 ? "one" : "several"]: fact("yes"),
      ...(doors > 0
        ? {
            [result.reached > 0 ? "talked" : "nobody"]: fact("yes"),
            reached: fact(count(result.reached)),
          }
        : {}),
    },
    {
      key: `${personId}:${date}:canvassed`,
      worldSeed: core.seed,
      recordIds: [filingId],
    },
  );
}

/** What the narrator says when the player stays home. */
export function stayedHomeLine(
  core: CoreState,
  personId: string,
  date: string,
  contestIds: readonly string[],
): Line | null {
  return electionDayLine(
    "stayed-home",
    {},
    {
      key: `${personId}:${date}:home`,
      worldSeed: core.seed,
      recordIds: contestIds,
    },
  );
}

/**
 * Election night for the player: the newest night's race they ran in, else
 * the first race on their ballot, its returns place by place, and the call.
 * Null when the newest night is not theirs (they neither ran nor voted).
 */
export function electionNight(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const races = electionResults(core, personId);
  const night = races.filter((race) => race.date === races[0]?.date);
  const race =
    night.find((row) => row.mine) ??
    night.find((row) => row.ballot?.voted) ??
    null;
  if (!race) return null;
  const result = resultOf(api, race.contestId);
  if (!result) return null;
  const recordId = `election-result:${race.contestId}`;
  const moment = (step: string) => ({
    key: `${personId}:${race.contestId}:${step}`,
    worldSeed: core.seed,
    recordIds: [recordId],
  });
  const place = townName(api);
  const office = fact(race.title, race.contestId);
  const names = new Map(race.candidates.map((row) => [row.id, row.name]));
  const steps: { lines: Line[]; totals: { name: string; votes: number }[] }[] =
    [];
  const open = electionDayLine(
    "returns-open",
    { office, ...(place ? { place: fact(place) } : {}) },
    moment("open"),
  );
  // The places report smallest first: a small place's tally is done first.
  const places = [...placesOf(api, race.contestId)]
    .filter((row) => row.cast > 0)
    .sort((a, b) => a.cast - b.cast || a.placeId.localeCompare(b.placeId));
  const running = new Map(race.candidates.map((row) => [row.id, 0]));
  const board = () =>
    race.candidates.map((row) => ({
      name: row.name,
      votes: running.get(row.id) ?? 0,
    }));
  steps.push({ lines: open ? [open] : [], totals: board() });
  if (!race.unopposed)
    places.forEach((row, index) => {
      for (const [id, votes] of Object.entries(row.votes))
        if (running.has(id)) running.set(id, running.get(id)! + votes);
      const here = Object.entries(row.votes)
        .filter(([id]) => names.has(id))
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const [first, second] = here;
      const lines: Line[] = [];
      const where = fact(row.name, recordId);
      const step = electionDayLine(
        "returns-step",
        first && second && first[1] === second[1]
          ? { where, tied: fact("yes"), lead: fact(count(first[1])) }
          : first && second
            ? {
                where,
                contested: fact("yes"),
                leader: fact(names.get(first[0])!, first[0]),
                lead: fact(count(first[1])),
                trail: fact(count(second[1])),
              }
            : { where, uncontested: fact("yes"), cast: fact(count(row.cast)) },
        moment(`place:${row.placeId}`),
      );
      if (step) lines.push(step);
      const order = [...running].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      const margin = (order[0]?.[1] ?? 0) - (order[1]?.[1] ?? 0);
      if (index < places.length - 1) {
        const lead = electionDayLine(
          "returns-lead",
          {
            in: fact(count(index + 1)),
            all: fact(count(places.length)),
            ...(margin > 0
              ? {
                  ahead: fact("yes"),
                  leader: fact(names.get(order[0]![0])!, order[0]![0]),
                  margin: fact(count(margin)),
                }
              : { even: fact("yes") }),
          },
          moment(`lead:${row.placeId}`),
        );
        if (lead) lines.push(lead);
      }
      steps.push({ lines, totals: board() });
    });
  // The call: the count's own totals, every ballot in the race.
  const winnerName = result.winnerId ? nameOf(api, result.winnerId) : null;
  const callLines: Line[] = [];
  const winner = winnerName ? fact(winnerName, recordId) : null;
  const call = winner
    ? electionDayLine(
        race.unopposed ? "returns-unopposed" : "returns-call",
        {
          winner,
          office,
          cast: fact(count(race.electorate), recordId),
        },
        moment("call"),
      )
    : null;
  if (call) callLines.push(call);
  if (race.mine) {
    const mine = electionDayLine(
      "returns-mine",
      {
        [race.mine.won ? "won" : "lost"]: fact("yes", recordId),
        ...(winner ? { winner } : {}),
      },
      moment("mine"),
    );
    if (mine) callLines.push(mine);
  }
  // Around the country: the other states' governor races that night.
  const nation = governorRacesTonight(core).filter(
    (row) => row.date === race.date,
  );
  const elsewhere = nation.length
    ? electionDayLine(
        "returns-nation",
        {
          count: fact(count(nation.length)),
          [nation.length === 1 ? "one" : "several"]: fact("yes"),
        },
        moment("nation"),
      )
    : null;
  steps.push({
    lines: callLines,
    totals: race.candidates.map((row) => ({
      name: row.name,
      votes: row.votes,
    })),
  });
  return {
    contestId: race.contestId,
    recordId,
    title: race.title,
    date: race.date,
    mine: race.mine,
    steps,
    nation: {
      lines: elsewhere ? [elsewhere] : [],
      races: nation.map((row) => ({
        state: row.state,
        winnerParty: row.winnerParty,
        marginPoints: Math.round(row.marginPoints * 10) / 10,
      })),
    },
    scene: resultsScene(core, personId),
  };
}
