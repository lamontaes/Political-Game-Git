/**
 * Terms end on schedule, vacancies open, and the player votes (the
 * three-year trace of the played world, items 3, 8 and 9).
 *
 * In random places drawn from all 56: every local term in progress at the
 * opening ends with its seat's election already on the calendar, the term won
 * there starts on the office's own start day after the election, and the next
 * one comes a full term on; a holder who moves out of the office's
 * jurisdiction leaves the seat, which is filled by the office's rule and never
 * by someone who moved away; and a player who didn't mark a ballot didn't
 * vote (the engine never casts the player's ballot), while a ballot marked
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
  vacateSeat,
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
  corePlaceByKey,
  searchCorePlaces,
  corePlaceStateIdentities,
} from "./place-lookup";
import type { CoreState } from "./types";

const START = "2026-10-12";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`terms:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(salt: string) {
  const state = pick(states, `${salt}:state`);
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
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
/**
 * A world in the first drawn place that has what a test reads (a place the
 * golden path pins is the only one tried); none having it fails by name.
 */
function worldWith(
  salt: string,
  has: (core: ReturnType<typeof world>) => boolean,
) {
  const tried: string[] = [];
  const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
  for (let attempt = 0; attempt < (pinned ? 1 : 8); attempt += 1) {
    const placeKey =
      pinned ?? randomPlace(attempt ? `${salt}:${attempt}` : salt).key;
    const core = world(placeKey);
    if (has(core)) return { placeKey, core };
    tried.push(placeKey);
  }
  throw new Error(
    `no place had the case for "${salt}" (seed ${seed}): ${tried.join("; ")}`,
  );
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
    const place = corePlaceByKey(placeKey)!;
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
    const heldIn = (api: ReturnType<typeof coreAPI>) =>
      townSeats(api).filter(
        (s) => s.holder?.personId && LOCAL.includes(s.office.level),
      );
    const { placeKey, core } = worldWith(
      "moves",
      (c) => heldIn(coreAPI(c)).length > 0,
    );
    const api = coreAPI(core);
    const held = heldIn(api);
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

  it("every state and federal seat left vacant has a vacancy record, and an appointment record or a special election", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("vacated").key;
    const core = world(placeKey);
    const api = coreAPI(core);
    const held = townSeats(api).filter(
      (s) => s.holder && !LOCAL.includes(s.office.level),
    );
    expect(
      held.length,
      `${placeKey}: state and federal seats held`,
    ).toBeGreaterThan(0);
    const vacancies = () =>
      api.moduleState(OFFICES_MODULE_ID).table("vacancies") as unknown as {
        get(id: string): VacancyRow | undefined;
      };
    for (const { seat, office } of held) {
      const left = vacateSeat(api, seat.id, "resigned");
      const where = `${placeKey} (seed ${seed}), ${office.kind} ${seat.id}`;
      expect(left, where).not.toBeNull();
      const vacancy = vacancies().get(left!.id)!;
      expect(vacancy, `${where}: a vacancy record`).toBeDefined();
      if (vacancy.status === "filled") {
        // Filled by appointment, or by the stand-in for a special election:
        // the record that the new holder took office. A holder the law names
        // (the line of succession) has the succession record instead.
        const took = core.durableLog.get(`took-office:${seat.id}:${core.date}`);
        const succeeded = core.durableLog.get(
          `succession:${seat.id}:${core.date}:0`,
        );
        expect(
          took ?? succeeded,
          `${where}: a took-office or succession record for the fill`,
        ).toBeDefined();
        if (took) {
          expect(took.facts?.vacancyId, where).toBe(vacancy.id);
          expect(took.facts?.seatId, where).toBe(seat.id);
        }
        const term = (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("terms")
            .rows() as unknown as TermRow[]
        ).find((t) => t.id === vacancy.filledBy);
        expect(term?.status, `${where}: the fill's term`).toBe("serving");
      } else if (vacancy.status === "awaiting-election") {
        expect(
          vacancy.electionDate,
          `${where}: a special election date`,
        ).toBeTruthy();
        expect(vacancy.electionDate! > core.date, where).toBe(true);
      } else {
        // Only a rule that leaves the seat empty may do so.
        expect(vacancy.rule.method, where).toBe("remains-vacant");
      }
    }
  }, 600_000);

  it("a player who didn't mark a ballot didn't vote; one marked at the polls counts", () => {
    // The first election day with more than one race on the ballot.
    const dayWithRaces = (api: ReturnType<typeof coreAPI>) => {
      const days = [...new Set(contestsOf(api).map((c) => c.electionDate))];
      return days
        .sort()
        .find(
          (d) => contestsOf(api).filter((c) => c.electionDate === d).length > 1,
        );
    };
    const { placeKey, core } = worldWith(
      "player",
      (c) => dayWithRaces(coreAPI(c)) !== undefined,
    );
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const on = (day: string) =>
      contestsOf(api)
        .filter((c) => c.electionDate === day)
        .sort((a, b) => a.id.localeCompare(b.id));
    const day = dayWithRaces(api)!;
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
    // marking a ballot: the engine never casts the player's ballot (CTO,
    // player-path audit, Oct 14), so they didn't vote.
    (core as CoreState).playerId = voter!.voterId;
    holdElection(api, races[1]!.id);
    const own = ballots(races[1]!.id).find(
      (b) => b.voterId === voter!.voterId,
    )!;
    expect(own.voted).toBe(false);
    expect(own.choice).toBeNull();
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
