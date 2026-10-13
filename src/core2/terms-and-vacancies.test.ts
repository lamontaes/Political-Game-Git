/**
 * Terms end on schedule, vacancies open, and the player votes (the
 * three-year trace of the played world, items 3, 8 and 9).
 *
 * In random places drawn from all 56: every local term in progress at the
 * opening ends with its seat's election already on the calendar, the term won
 * there starts on the office's own start day after the election, and the next
 * one comes a full term on; a holder who moves out of the office's
 * jurisdiction leaves the seat, which is filled by the office's rule and never
 * by someone who moved away; and a player who didn't mark a ballot votes or
 * stays home on their own reasons, like everyone else, while a ballot marked
 * by hand still counts as marked.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import {
  OFFICES_MODULE_ID,
  openOffices,
  townSeats,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  VOTING_MODULE_ID,
  castBallot,
  fileStandingCandidates,
  holdElection,
  openVoting,
  type BallotRow,
} from "./modules/voting";
import { MOVED_AWAY_EVENT } from "./modules/moves";
import {
  nextElectionForSeat,
  termEndAfter,
  termStartAfter,
} from "./elections-calendar";
import {
  lifePlaceByKey,
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import type { CoreState } from "./types";

const START = "2026-10-12";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`terms:${Date.now()}`).digest("hex");
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(salt: string) {
  const state = pick(states, `${salt}:state`);
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, `${salt}:place`);
}
function world(placeKey: string) {
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt: START, minimumPeople: 60 }),
  );
  openOffices(core, seed);
  openElections(core);
  return core;
}
const contestsOf = (api: ReturnType<typeof coreAPI>) =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
const LOCAL = ["city", "county", "township"];

describe("terms end on schedule, vacancies open, and the player votes", () => {
  it("every local term ends with its election held first, and the next comes a full term on", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("calendar").key;
    const core = world(placeKey);
    const api = coreAPI(core);
    const place = lifePlaceByKey(placeKey)!;
    const contests = contestsOf(api);
    const checked: string[] = [];
    for (const { office, seat, holder } of townSeats(api)) {
      if (!LOCAL.includes(office.level) || !office.elected) continue;
      if (!holder?.endDate || !office.termYears) continue;
      const contest = contests.find((c) => c.seatId === seat.id);
      if (!contest) continue;
      // The seat is decided before its term runs out, and the winner starts
      // the day the term ends: no seat goes unelected, and no winner takes
      // office on election day.
      expect(
        contest.electionDate < holder.endDate,
        `${placeKey} ${seat.id}: elected ${contest.electionDate}, term ends ${holder.endDate}`,
      ).toBe(true);
      expect(termStartAfter(office, contest.electionDate)).toBe(holder.endDate);
      // The term won then runs a full term, and that seat's next regular
      // election is the one a full term later, not the next one on the
      // calendar.
      const end = termEndAfter(office, contest.electionDate)!;
      const next = nextElectionForSeat({
        office,
        stateKey: place.stateJurisdictionKey!,
        placeGeoid: place.sourceGeoid ?? place.key,
        termEnd: end,
        onDate: contest.electionDate,
      });
      if (next)
        expect(Number(next.electionDate.slice(0, 4)), seat.id).toBe(
          Number(contest.electionDate.slice(0, 4)) + office.termYears,
        );
      checked.push(
        `${office.title} ${seat.id}: elected ${contest.electionDate}, term ${holder.endDate} to ${end}`,
      );
    }
    govReport("terms", JSON.stringify({ placeKey, seed, checked }));
  });

  it("a holder who moves out of the office's area leaves the seat, filled by the office's rule", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("moves").key;
    const core = world(placeKey);
    const api = coreAPI(core);
    const held = townSeats(api).filter(
      (s) => s.holder?.personId && LOCAL.includes(s.office.level),
    );
    if (!held.length) return;
    const { office, seat, holder } = pick(held, "seat");
    const personId = holder!.personId!;
    // The moves engine marks the mover inactive, then records the move; with
    // no relative or county flow to name a place, the record names only
    // somewhere else in the state, by the town's own id.
    const elsewhere = core.people.get(personId)!.placeId;
    api.updatePerson(personId, { tier: "husk" });
    api.emit({
      id: `${MOVED_AWAY_EVENT}:${personId}:${START}`,
      date: START,
      kind: MOVED_AWAY_EVENT,
      personIds: [personId],
      placeId: elsewhere,
      topic: elsewhere,
      source: { tag: "ESTIMATED", citation: "test", asOf: START },
      facts: { [`person:${personId}:residence`]: elsewhere },
    });
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[];
    expect(terms.every((t) => t.status === "ended")).toBe(true);
    expect(terms.find((t) => t.id === holder!.id)!.endedBy).toBe("moved away");
    const vacancy = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("vacancies")
        .rows() as unknown as VacancyRow[]
    ).find((v) => v.seatId === seat.id)!;
    expect(vacancy.cause).toBe("moved away");
    expect(vacancy.rule.method).toBe(office.vacancyRule.method);
    const now = townSeats(api).find((s) => s.seat.id === seat.id)!.holder;
    if (vacancy.status === "filled") {
      expect(now!.personId).not.toBe(personId);
      // No one who moved away is appointed.
      if (now!.personId)
        expect(core.people.get(now!.personId)!.tier).not.toBe("husk");
      // The appointee serves out the term; that seat's election is still on.
      expect(now!.endDate).toBe(holder!.endDate);
    }
    // At filing close the person who left doesn't stand again.
    const contest = contestsOf(api).find((c) => c.seatId === seat.id);
    if (contest) {
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      fileStandingCandidates(api, contest.id);
      expect(
        ballot(api, contest.id).map((f) => f.personId),
        seat.id,
      ).not.toContain(personId);
    }
    govReport(
      "terms",
      JSON.stringify({
        placeKey,
        seed,
        seat: seat.id,
        vacancy: vacancy.status,
        holder: now?.identity.familyName ?? null,
      }),
    );
  });

  it("a player who didn't mark a ballot votes or stays home on their own reasons", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("player").key;
    const core = world(placeKey);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    // The first election day with more than one race on the ballot.
    const days = [...new Set(contestsOf(api).map((c) => c.electionDate))];
    const on = (day: string) =>
      contestsOf(api)
        .filter((c) => c.electionDate === day)
        .sort((a, b) => a.id.localeCompare(b.id));
    const day = days.sort().find((d) => on(d).length > 1);
    if (!day) return;
    const races = on(day);
    for (const c of races) fileStandingCandidates(api, c.id);
    const ballots = (contestId: string) =>
      api
        .moduleState(VOTING_MODULE_ID)
        .table("ballots")
        .query("byContest", [contestId]) as unknown as BallotRow[];
    // The first race, counted with no player: someone whose reasons take
    // them to the polls.
    holdElection(api, races[0]!.id);
    const voter = ballots(races[0]!.id).find((b) => b.voted);
    expect(voter, `${placeKey}: someone votes`).toBeDefined();
    // That person is now the player and skips past election day without
    // marking a ballot: they still go and vote, from the same reasons.
    (core as CoreState).playerId = voter!.voterId;
    holdElection(api, races[1]!.id);
    const own = ballots(races[1]!.id).find(
      (b) => b.voterId === voter!.voterId,
    )!;
    expect(own.voted).toBe(true);
    expect(own.turnoutReasons).toEqual(voter!.turnoutReasons);
    // A ballot marked by hand counts as marked.
    const third = races[2];
    if (third) {
      const candidate = ballot(api, third.id)[0];
      castBallot(api, voter!.voterId, third.id, candidate?.personId ?? null);
      holdElection(api, third.id);
      const marked = ballots(third.id).find(
        (b) => b.voterId === voter!.voterId,
      )!;
      expect(marked.voted).toBe(true);
      expect(marked.choice).toBe(candidate?.personId ?? null);
    }
    govReport(
      "terms",
      JSON.stringify({ placeKey, seed, day, player: voter!.voterId }),
    );
  });
});
