/**
 * M2-07 elections and the town's part of M2-10, in a random place.
 *
 * Election day falls on the place's real date; named people vote as
 * themselves, each vote from what that person knows and thinks and turnout
 * from their own circumstances, with no roll; the wider electorate votes as
 * groups; exit polls report what voters told the pollster; the winner takes
 * the seat on the start date. State and federal races covering the town run
 * on the same engine in the same year.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import {
  OFFICES_MODULE_ID,
  openOffices,
  type TermRow,
} from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  fileCandidacy,
  openContests,
  openElections,
  requestSignature,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { knockDoors, openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  VOTING_MODULE_ID,
  ballotOf,
  candidateIdentity,
  openVoting,
  resultOf,
  type BallotRow,
} from "./modules/voting";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`voting:${Date.now()}`).digest("hex");
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(attempt = 0) {
  const state = pick(states, attempt ? `state:${attempt}` : "state");
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, attempt ? `place:${attempt}` : "place");
}

describe("M2-07 elections", () => {
  it("votes come from each person's own reasons, groups vote as groups, and the winner takes the seat on its date", () => {
    // A town too small to gather a race's signatures has no race two residents
    // can reach the ballot for; try other generated towns (bounded).
    let place = "";
    let core!: ReturnType<typeof createLifeCore>;
    let api!: ReturnType<typeof coreAPI>;
    let filed: FilingRow[] = [];
    let contest: ContestRow | undefined;
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6 && !contest; attempt += 1) {
      place = process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace(attempt).key;
      tried.push(place);
      core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: place,
          startedAt: START,
          // A small town: the year of daily work the election runs through
          // costs time per person.
          minimumPeople: 60,
        }),
      );
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      api = coreAPI(core);
      // Two residents file for the soonest open race they qualify for.
      const adults = [...core.people.values()]
        .filter(
          (p) =>
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        );
      const platform = [`${pick(PLATFORM_QUESTIONS, "q1")}=1`];
      filed = [];
      contest = undefined;
      for (const open of openContests(api).filter(
        (c) => c.level !== "federal",
      )) {
        filed = [];
        for (const person of adults.slice(0, 2)) {
          const result = fileCandidacy(api, {
            personId: person.id,
            contestId: open.id,
            platform,
            payFee: true,
          });
          if (result.status === "refused") break;
          let filing = result.filing;
          for (const neighbor of [...core.people.keys()].sort()) {
            if (filing.status === "on-ballot") break;
            requestSignature(api, filing.id, neighbor);
            filing = api
              .moduleState(ELECTIONS_MODULE_ID)
              .table("filings")
              .get(filing.id) as unknown as FilingRow;
          }
          if (filing.status === "on-ballot") filed.push(filing);
        }
        if (filed.length === 2) {
          contest = open;
          break;
        }
      }
      if (process.env.GOLDEN_PATH_PLACE_KEY) break;
    }
    expect(
      contest,
      `no open local or state race in ${tried.join(", ")}`,
    ).toBeDefined();
    openVoting(core);
    knockDoors(api, {
      filingId: filed[0]!.id,
      canvasserId: filed[0]!.personId,
      hours: 4,
    });
    knockDoors(api, {
      filingId: filed[1]!.id,
      canvasserId: filed[1]!.personId,
      hours: 2,
    });
    // Advance to the day after the election.
    const after = new Date(
      Date.parse(`${contest!.electionDate}T00:00:00Z`) + 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    advanceCore(core, after);
    const result = resultOf(api, contest!.id)!;
    expect(result.date).toBe(contest!.electionDate);
    // Two candidates on the same platform can tie, or draw no votes in a
    // nonpartisan race; a tie goes to the state's tie rule (a second
    // election), and no one wins on no votes.
    if (result.winnerId === null) {
      const totals = Object.values(result.totals).sort((a, b) => b - a);
      expect(
        totals[0] === 0 || totals[0] === totals[1],
        `${place}: no winner with ${JSON.stringify(result.totals)}`,
      ).toBe(true);
      return;
    }
    const candidates = ballot(api, contest!.id).map((f) => f.personId);
    // Every candidate, resident or official, has a name to show.
    for (const id of candidates)
      expect(candidateIdentity(api, id)?.familyName, id).toBeTruthy();
    // A filer is on the November ballot, or a top-two or top-four primary
    // (where the contest holds one) sent them home: never lost any other way.
    for (const f of filed) {
      if (candidates.includes(f.personId)) continue;
      const now = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(f.id) as unknown as FilingRow;
      expect(now.status, `${f.personId} in ${contest!.id}`).toBe("withdrawn");
      expect(
        contest!.primaryDate,
        `${contest!.id} held no primary`,
      ).not.toBeNull();
    }
    // Every named adult has a ballot with their own reasons; votes add up.
    const ballots = api
      .moduleState(VOTING_MODULE_ID)
      .table("ballots")
      .query("byContest", [contest!.id]) as unknown as BallotRow[];
    expect(ballots.length).toBe(result.namedEligible);
    const cast = ballots.filter((b) => b.voted);
    expect(cast.length).toBe(result.namedTurnout);
    for (const b of cast.filter((x) => x.choice !== null)) {
      const best = Object.entries(b.appeal).sort(
        (x, y) => y[1].total - x[1].total || x[0].localeCompare(y[0]),
      )[0]![0];
      expect(b.choice).toBe(best);
    }
    const exitTotal = Object.values(result.exitPoll).reduce((a, c) => a + c, 0);
    expect(exitTotal).toBe(result.namedTurnout);
    const chose = Object.values(result.namedVotes).reduce((a, c) => a + c, 0);
    expect(chose).toBe(cast.filter((b) => b.choice !== null).length);
    expect(
      Object.values(result.totals).reduce((a, c) => a + c, 0),
    ).toBeGreaterThanOrEqual(chose);
    // State and federal races on the same day ran on the same engine.
    const sameDay = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter(
      (c) => c.electionDate === contest!.electionDate && c.id !== contest!.id,
    );
    for (const other of sameDay) expect(resultOf(api, other.id)).not.toBeNull();
    // The winner takes the seat on its start date.
    if (result.takesOffice) {
      advanceCore(core, result.takesOffice);
      const serving = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          contest!.seatId,
          "serving",
        ]) as unknown as TermRow[];
      expect(serving).toHaveLength(1);
      expect(serving[0]!.startDate).toBe(result.takesOffice);
      expect(serving[0]!.reached).toBe(`elected ${contest!.electionDate}`);
    }
    const voter = cast[0];
    govReport(
      "voting",
      JSON.stringify({
        place,
        seed,
        contest: contest!.title,
        electionDate: contest!.electionDate,
        totals: result.totals,
        named: `${result.namedTurnout} of ${result.namedEligible}`,
        electorate: result.electorate,
        exitPoll: result.exitPoll,
        sameDayRaces: sameDay.map(
          (c) => `${c.title}: ${JSON.stringify(resultOf(api, c.id)?.totals)}`,
        ),
        takesOffice: result.takesOffice,
        whyOneVoter: voter ? ballotOf(api, contest!.id, voter.voterId) : null,
      }),
    );
  }, 300_000);
});
