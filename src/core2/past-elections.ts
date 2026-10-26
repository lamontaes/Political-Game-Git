/**
 * Elections happened (owner, Oct 14, 2026): the election that seated each
 * day-one officeholder of every office covering the town.
 *
 * Each is a result record with the winner (the holder) and the strongest
 * challenger, their votes and shares, turnout, and the town's voter groups'
 * split. Real anchors hold where the research has them: the November 2024
 * presidential and House results and each senator's last election (Clerk of
 * the House), drifted a little per world. Elsewhere the winner's share sits
 * inside the tenure table's spread for that kind of office, and the ballots
 * come from the state's 2024 presidential total, the county's, or the town's
 * voter groups, scaled for a midterm or a local election.
 *
 * Each group's share for the winner follows its lean against the two
 * candidates' (no group is assigned a vote), centered so a town-wide race
 * adds up to its share. Each winner's campaign promises, on the questions
 * they stand on most strongly, go to the campaigns engine's promise table,
 * where the record engine marks them kept or broken by the prior term's votes
 * and the voting engine weighs them.
 */
import corpus from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import countyVotes from "./data/county-presidential-2024.json" with { type: "json" };
import tenure from "./data/offices/tenure.json" with { type: "json" };
import territoryBallots from "../../data/research/elections/territory-ballots.json" with { type: "json" };
import { partySide } from "./appointments";
import { questionAxis } from "./campaign-views";
import { novemberGeneralElectionDay } from "./gov-rules/town-election-calendar";
import { CAMPAIGNS_MODULE_ID, type PromiseRow } from "./modules/campaigns";
import { leanOf } from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { officialOf } from "./modules/officials";
import { POLICY_QUESTIONS } from "./policy-answers";
import type { ModuleRow } from "./module-data";
import {
  pastIdentityName,
  personName,
  supportOn,
  townOffices,
  type PastOffice,
  type PastTown,
} from "./past-bodies";
import {
  pastParameter,
  putPast,
  seededBetween,
  shiftDays,
  type PastCandidate,
  type PastElectionRow,
} from "./past-module";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { countedResidents } from "./electorate";
import { cpsAgeBand, cpsTurnout } from "./electorate-places";
import { viewOf } from "./modules/views";
import viewsData from "./data/views/views.json" with { type: "json" };
import type { CoreAPI, CoreState } from "./types";

const viewsLeanMax = (): number =>
  (viewsData as unknown as { parameters: Record<string, { value: number }> })
    .parameters.leanMax!.value;

type Corpus = {
  house: {
    seatKey: string;
    stateUsps: string;
    certifiedWinnerParty: string;
    democraticTwoPartyShare: number | null;
    totalVotes: number;
    electionDate: string;
  }[];
  senate: {
    stateUsps: string;
    certifiedWinnerParty: string;
    democraticTwoPartyShare: number | null;
    totalVotes: number;
    lastElectionYear: number;
  }[];
  presidentialByState: {
    stateUsps: string;
    democraticTwoPartyShare: number | null;
    totalVotes: number;
  }[];
};
const CORPUS = corpus as unknown as Corpus;
const CORPUS_CITATION =
  "Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024, and of November 8, 2022 and November 3, 2020 (data/source/electoral-calibration-2024/corpus.json)";
const COUNTY = countyVotes as unknown as {
  byStateCounty: Readonly<Record<string, readonly [number, number]>>;
  citation: string;
};
const TENURE = (
  tenure as unknown as { parameters: Record<string, { value: number }> }
).parameters;

function terms(api: CoreAPI, seatId: string): readonly TermRow[] {
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
}

function seatsOf(api: CoreAPI, officeId: string) {
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("seats")
    .query("byOffice", [officeId]) as unknown as {
    id: string;
    district: string | null;
    coversTown: boolean;
  }[];
}

/** The holder's person id as the legislature and officials engines know it. */
function holderId(api: CoreAPI, term: TermRow): string | null {
  if (term.personId && api.state.people.has(term.personId))
    return term.personId;
  const official = `official:${term.id}`;
  return api.state.people.has(official) ? official : null;
}

function averageShare(office: PastOffice): number {
  const key =
    office.kind === "us-senate"
      ? "usSenateWinnerShare"
      : office.kind.startsWith("us-house")
        ? "usHouseWinnerShare"
        : office.kind.startsWith("legislature-")
          ? "stateLegislatorWinnerShare"
          : office.level === "state" || office.level === "federal"
            ? "statewideExecutiveWinnerShare"
            : "localWinnerShare";
  return TENURE[key]!.value;
}

/** The winner's real two-party share where the research has this race. */
function realResult(
  town: PastTown,
  office: PastOffice,
  seat: { id: string },
  party: string | null,
  date: string,
): { share: number; total: number } | null {
  const year = Number(date.slice(0, 4));
  const side = partySide(party);
  const fromDemShare = (
    dem: number | null,
    winner: string,
    total: number,
  ): { share: number; total: number } | null => {
    if (dem === null || side === 0 || partySide(winner) !== side) return null;
    return { share: side < 0 ? dem : 1 - dem, total };
  };
  if (office.kind === "us-house") {
    const key = `us-house:${town.usps}-${seat.id.split(":").at(-1)}`;
    const row = CORPUS.house.find((r) => r.seatKey === key);
    return row && row.electionDate.startsWith(String(year))
      ? fromDemShare(
          row.democraticTwoPartyShare,
          row.certifiedWinnerParty,
          row.totalVotes,
        )
      : null;
  }
  if (office.kind === "us-senate") {
    const rows = CORPUS.senate.filter(
      (r) => r.stateUsps === town.usps && r.lastElectionYear === year,
    );
    const row = rows.find((r) => partySide(r.certifiedWinnerParty) === side);
    return row
      ? fromDemShare(
          row.democraticTwoPartyShare,
          row.certifiedWinnerParty,
          row.totalVotes,
        )
      : null;
  }
  if (office.kind === "president" || office.kind === "vice-president") {
    if (year !== pastParameter(null, "pastPresidentialElectionYear"))
      return null;
    let total = 0;
    let dem = 0;
    for (const row of CORPUS.presidentialByState) {
      if (row.democraticTwoPartyShare === null) continue;
      total += row.totalVotes;
      dem += row.democraticTwoPartyShare * row.totalVotes;
    }
    return side === 0 ? null : fromDemShare(dem / total, party ?? "", total);
  }
  return null;
}

/** Ballots in the state in the presidential year. */
function stateBallots(town: PastTown): number {
  return (
    CORPUS.presidentialByState.find((r) => r.stateUsps === town.usps)
      ?.totalVotes ?? 0
  );
}

/**
 * The town's voters by the census age bands the electorate engine reads, on
 * a date: its counted residents and its full people old enough to vote, and
 * each band's lean from the full people's own views where the town has them.
 */
interface TownBand {
  readonly band: string;
  readonly adults: number;
  readonly turnout: number;
  readonly lean: number;
}

const bandCache = new WeakMap<object, Map<string, readonly TownBand[]>>();

function townBands(
  api: CoreAPI,
  town: PastTown,
  date: string,
): readonly TownBand[] {
  let byDate = bandCache.get(api.state);
  if (!byDate) bandCache.set(api.state, (byDate = new Map()));
  const hit = byDate.get(date);
  if (hit) return hit;
  const at = makeIsoDate(date);
  const voting = pastParameter(api, "pastVotingAge");
  const counts = new Map<
    string,
    { adults: number; lean: number; leans: number }
  >();
  const count = (birthDate: string, lean: number | null, weight = 1) => {
    const age = ageOnDate(makeIsoDate(birthDate), at);
    if (age < voting) return;
    const band = cpsAgeBand(age);
    if (!band) return;
    const row = counts.get(band) ?? { adults: 0, lean: 0, leans: 0 };
    row.adults += weight;
    if (lean !== null) {
      row.lean += lean * weight;
      row.leans += weight;
    }
    counts.set(band, row);
  };
  for (const voter of countedResidents(api.state as CoreState))
    if (voter.placeId === town.townPlaceId)
      count(voter.birthDate, null, voter.weight);
  const leanMax = viewsLeanMax();
  for (const id of api.state.peopleByPlace.get(town.townPlaceId) ?? []) {
    const person = api.state.people.get(id);
    if (!person?.alive) continue;
    const view = viewOf(api, id);
    count(person.birthDate, view ? view.lean / leanMax : null);
  }
  const all = cpsTurnout(town.usps);
  const citizens = all?.citizenShare ?? 1;
  const rows = [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([band, row]) => ({
      band,
      adults: row.adults,
      turnout:
        (cpsTurnout(town.usps, band)?.turnout ?? all?.turnout ?? 0) * citizens,
      lean: row.leans ? row.lean / row.leans : 0,
    }));
  byDate.set(date, rows);
  return rows;
}

/** The town's ballots in a presidential year (CPS November 2024 turnout by age). */
function townBallots(api: CoreAPI, town: PastTown, date: string): number {
  return townBands(api, town, date).reduce(
    (sum, b) => sum + b.adults * b.turnout,
    0,
  );
}

/** Turnout against a presidential year, by when the election falls. */
function turnoutRatio(date: string): number {
  const year = Number(date.slice(0, 4));
  if (date !== novemberGeneralElectionDay(year))
    return pastParameter(null, "pastLocalTurnoutRatio");
  return year % pastParameter(null, "pastPresidentialCycleYears") ===
    pastParameter(null, "pastPresidentialElectionYear") %
      pastParameter(null, "pastPresidentialCycleYears")
    ? 1
    : pastParameter(null, "pastMidtermTurnoutRatio");
}

/** Every ballot cast in the race, before turnout: the electorate it covers. */
function electorateBallots(
  api: CoreAPI,
  town: PastTown,
  office: PastOffice,
  date: string,
): number {
  // A territory casts no presidential vote: its own town's ballots stand in
  // for the territory's electorate.
  const reported = stateBallots(town);
  const own = reported
    ? undefined
    : (
        territoryBallots.places as Record<
          string,
          { delegate?: { ballots: number }; governor?: { ballots: number } }
        >
      )[town.usps];
  // A territory's delegate race and governor race count the ballots its own
  // election office reported; where that total isn't in the data, the town's
  // ballots stand in.
  const territory =
    office.level === "federal" && office.kind.startsWith("us-house")
      ? own?.delegate?.ballots
      : office.level === "state" && !office.kind.startsWith("legislature-")
        ? own?.governor?.ballots
        : undefined;
  if (!reported && !territory) api.stopgap("SG-CORE-past-territory-ballots");
  const state = reported || territory || townBallots(api, town, date);
  switch (office.level) {
    case "federal":
      if (office.kind.startsWith("us-house"))
        return state / Math.max(1, office.seats);
      if (office.kind === "us-senate") return state;
      return CORPUS.presidentialByState.reduce((s, r) => s + r.totalVotes, 0);
    case "state":
      return office.kind.startsWith("legislature-")
        ? state / Math.max(1, office.seats)
        : state;
    case "county": {
      const row = COUNTY.byStateCounty[`${town.usps}|${office.governmentName}`];
      const county = row ? row[0] + row[1] : townBallots(api, town, date);
      return office.districted ? county / Math.max(1, office.seats) : county;
    }
    default:
      return townBallots(api, town, date);
  }
}

/** The questions a winner stands on most strongly, their own causes first. */
export function strongestQuestions(
  api: CoreAPI,
  personId: string,
  count: number,
): readonly { question: string; position: number }[] {
  const official = officialOf(api, personId);
  const own = new Set(official?.signature.map((s) => s.question) ?? []);
  return Object.keys(POLICY_QUESTIONS)
    .filter((q) => questionAxis(q) !== 0)
    .map((question) => ({
      question,
      support: supportOn(api, personId, question),
    }))
    .filter((row) => row.support !== 0)
    .sort(
      (a, b) =>
        Number(own.has(b.question)) - Number(own.has(a.question)) ||
        Math.abs(b.support) - Math.abs(a.support) ||
        a.question.localeCompare(b.question),
    )
    .slice(0, count)
    .map((row) => ({
      question: row.question,
      position: Math.sign(row.support),
    }));
}

/**
 * Each of the town's age bands' share for the winner: the seat's share moved
 * by how much nearer the band's lean sits to the winner's than the
 * challenger's, centered on the town where the race is the town's own.
 */
function groupSplit(
  api: CoreAPI,
  town: PastTown,
  date: string,
  share: number,
  winnerLean: number,
  challengerLean: number,
  center: boolean,
  ratio: number,
): PastElectionRow["townGroups"] {
  const slope = pastParameter(api, "pastGroupSplitSlope");
  const rows = townBands(api, town, date).map((b) => ({
    groupId: `${town.townPlaceId}:${b.band}`,
    ballots: b.adults * b.turnout * ratio,
    x: Math.abs(b.lean - challengerLean) - Math.abs(b.lean - winnerLean),
  }));
  const weight = rows.reduce((sum, r) => sum + r.ballots, 0);
  const mean =
    center && weight > 0
      ? rows.reduce((sum, r) => sum + r.x * r.ballots, 0) / weight
      : 0;
  return rows.map((r) => ({
    groupId: r.groupId,
    ballots: Math.round(r.ballots),
    winnerShare: Math.min(
      pastParameter(api, "pastGroupShareMax"),
      Math.max(
        pastParameter(api, "pastGroupShareMin"),
        share + slope * (r.x - mean),
      ),
    ),
  }));
}

/** The prior election of every elected seat covering the town. */
export function buildPriorElections(
  api: CoreAPI,
  town: PastTown,
): readonly PastElectionRow[] {
  const out: PastElectionRow[] = [];
  // Challengers, and the people who held a seat before its holder, are
  // named but not people of the world yet.
  api.stopgap("SG-CORE-past-named-only");
  const promisesTable = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? api.moduleState(CAMPAIGNS_MODULE_ID).table("promises")
    : null;
  const perWinner = pastParameter(api, "pastPromisesPerWinner");
  const lead = pastParameter(api, "pastCampaignLeadDays");
  for (const office of townOffices(api)) {
    if (!office.elected) continue;
    for (const seat of seatsOf(api, office.id)) {
      if (!seat.coversTown) continue;
      for (const term of terms(api, seat.id)) {
        const winnerId = holderId(api, term);
        if (!winnerId) continue;
        // The federal executive's term begins on Inauguration Day after the
        // presidential election; every other seat's term records its own.
        const date =
          term.elected?.date ??
          (office.kind === "president" || office.kind === "vice-president"
            ? term.startDate <= town.opening
              ? novemberGeneralElectionDay(
                  Number(term.startDate.slice(0, 4)) - 1,
                )
              : null
            : null);
        if (!date || date >= town.opening) continue;
        const id = `prior-election:${seat.id}:${date}`;
        const key = `${seat.id}:${date}`;
        const real = realResult(town, office, seat, term.party, date);
        const drift = pastParameter(api, "pastRealShareDrift");
        const spread = pastParameter(api, "pastWinnerShareSpread");
        const base = real?.share ?? term.elected?.share ?? averageShare(office);
        const share = Math.min(
          pastParameter(api, "pastWinnerShareMax"),
          Math.max(
            pastParameter(api, "pastWinnerShareMin"),
            seededBetween(
              town.seed,
              `${key}:share`,
              base - (real ? drift : spread),
              base + (real ? drift : spread),
            ),
          ),
        );
        const ratio = turnoutRatio(date);
        const total = Math.round(
          real?.total ?? electorateBallots(api, town, office, date) * ratio,
        );
        const winnerLean = leanOf(api, winnerId);
        const side = partySide(term.party);
        const challengerParty =
          side > 0 ? "Democratic" : side < 0 ? "Republican" : null;
        const challengerLean =
          side !== 0
            ? -side *
              Math.max(
                Math.abs(winnerLean),
                pastParameter(api, "pastChallengerLeanMin"),
              )
            : seededBetween(town.seed, `${key}:challenger-lean`, -1, 1);
        const challengerName = pastIdentityName(
          town,
          `${key}:challenger`,
          date,
        );
        const promises = strongestQuestions(api, winnerId, perWinner).map(
          (stance): PromiseRow => ({
            id: `promise:past:${seat.id}:${date}:${stance.question}`,
            candidateId: winnerId,
            contestId: id,
            date: shiftDays(date, -lead),
            stance,
            venue: "campaign",
            audience: total,
          }),
        );
        for (const promise of promises)
          promisesTable?.put(promise as unknown as ModuleRow);
        // The winner holds more than half the ballots, whole votes: in a
        // town of a few voters a share just over half rounds to a tie, and a
        // tie has no winner.
        const winnerVotes = Math.min(
          total,
          Math.max(Math.round(total * share), Math.floor(total / 2) + 1),
        );
        const winnerShare = total > 0 ? winnerVotes / total : share;
        const candidates: PastCandidate[] = [
          {
            personId: winnerId,
            name: personName(api, winnerId),
            party: term.party,
            lean: winnerLean,
            votes: winnerVotes,
            share: winnerShare,
            incumbent: (term.serviceStart ?? term.startDate) < term.startDate,
          },
          {
            personId: null,
            name: challengerName,
            party: challengerParty,
            lean: challengerLean,
            votes: total - winnerVotes,
            share: 1 - winnerShare,
            incumbent: false,
          },
        ];
        const row: PastElectionRow = {
          id,
          seatId: seat.id,
          officeId: office.id,
          date,
          termId: term.id,
          winnerId,
          candidates,
          totalVotes: total,
          townGroups: groupSplit(
            api,
            town,
            date,
            share,
            winnerLean,
            challengerLean,
            office.level === "city",
            ratio,
          ),
          promiseIds: promises.map((p) => p.id),
          promiseQuestions: promises.map((p) => p.stance.question),
          source: real
            ? {
                tag: "SOURCED",
                citation: `${CORPUS_CITATION}; drifted within pastRealShareDrift`,
              }
            : {
                tag: "ESTIMATED",
                citation:
                  "src/core2/data/offices/tenure.json winner shares within pastWinnerShareSpread; ballots from the state's or county's 2024 presidential total or the town's voter groups, scaled by pastMidtermTurnoutRatio or pastLocalTurnoutRatio",
              },
        };
        putPast(api, "elections", row);
        out.push(row);
      }
    }
  }
  return out;
}
