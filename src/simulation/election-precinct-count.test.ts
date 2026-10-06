import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { officialOpinionSubject } from "./political-opinion-subjects";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { isEligibleVoterIn } from "./issue-record";
import { deserializeWorld, serializeWorld } from "./serialization";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { registerNationalElection } from "./national-elections";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { projectNationalElectionResults } from "../presentation/national-election-results";
import {
  countRecordedVoterBallots,
  electionContestResult,
  resolveElectionContest,
  scheduleElectionContest,
} from "./election-contests";
import { establishVotingPrecinctMembership } from "./living-world/town-wards";

function ballot() {
  const draw = drawRandomPlace("session13-saved-precinct-count");
  const fixture = smallWorld({
    place: draw.key,
    people: 12,
    date: "2026-01-05",
  });
  let world = fixture.world;
  const candidates = world.personOrder.slice(0, 2);
  const voters = world.personOrder.filter(
    (id) =>
      !candidates.includes(id) &&
      isEligibleVoterIn(world, id, fixture.jurisdictionId, world.currentDate),
  );
  expect(voters.length).toBeGreaterThan(1);
  for (const voter of voters) {
    world = recordPrivateBelief(world, {
      stableKey: `precinct-test:${voter}`,
      personId: voter,
      propositionId: null,
      subject: officialOpinionSubject(candidates[0]!),
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: "Authored support for the precinct counting regression.",
      formation: createFormationContext("reflection:fixture"),
      supersedesBeliefId: null,
    });
  }
  world = scheduleElectionContest(world, {
    stableKey: "precinct-test:council",
    jurisdictionId: fixture.jurisdictionId,
    electionDate: addDays(world.currentDate, 1),
    candidatePersonIds: candidates,
    office: {
      officeKey: "council",
      title: "Council",
      seatKey: null,
      occupationClassification: null,
    },
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Counting fixture, not a played election.",
    },
  });
  const contest = world.history.electionContests!.at(-1)!;
  world = {
    ...world,
    currentDate: contest.electionDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      contest.electionDate,
    ),
  };
  const input = {
    stableKey: contest.stableKey,
    jurisdictionId: contest.jurisdictionId,
    electionDate: contest.electionDate,
    candidatePersonIds: candidates,
  };
  console.log(
    `Precinct count draw: ${draw.displayName}; seed session13-saved-precinct-count`,
  );
  return { world, contest, input, voters };
}

it("groups the same ballots, saves the same winner and exact sums, and reloads unchanged", () => {
  const fixture = ballot();
  const before = countRecordedVoterBallots(fixture.world, fixture.input)!;
  expect(before.byPrecinct).toBeNull();
  const world = establishVotingPrecinctMembership(
    fixture.world,
    fixture.contest.jurisdictionId,
  );
  const counted = countRecordedVoterBallots(world, fixture.input)!;
  expect(counted.winnerPersonId).toBe(before.winnerPersonId);
  expect(counted.tallies).toEqual(before.tallies);
  expect(counted.byPrecinct).not.toBeNull();
  expect(counted.byPrecinct!.reduce((n, row) => n + row.ballotsCast, 0)).toBe(
    counted.tallies.reduce((n, row) => n + row.votes, 0),
  );
  for (const tally of counted.tallies)
    expect(
      counted.byPrecinct!.reduce(
        (n, row) =>
          n +
          row.tallies.find(
            (t) => t.candidatePersonId === tally.candidatePersonId,
          )!.votes,
        0,
      ),
    ).toBe(tally.votes);
  const resolved = resolveElectionContest(world, {
    contestId: fixture.contest.id,
  });
  const result = electionContestResult(resolved, fixture.contest.id)!;
  expect(result.precinctTallies).toEqual(counted.byPrecinct);
  expect(
    electionContestResult(
      deserializeWorld(serializeWorld(resolved)),
      fixture.contest.id,
    ),
  ).toEqual(result);
  expect(
    countRecordedVoterBallots(
      deserializeWorld(serializeWorld(world)),
      fixture.input,
    ),
  ).toEqual(counted);
});

it("keeps the existing ward admission and does not save invented rows in old/manual results", () => {
  const fixture = ballot();
  const world = establishVotingPrecinctMembership(
    fixture.world,
    fixture.contest.jurisdictionId,
  );
  const counted = countRecordedVoterBallots(world, {
    ...fixture.input,
    admitVoter: (id) => id === fixture.voters[0],
  })!;
  expect(counted.byPrecinct!.reduce((n, row) => n + row.ballotsCast, 0)).toBe(
    1,
  );
  expect(
    countRecordedVoterBallots(world, {
      ...fixture.input,
      admitVoter: () => null,
    }),
  ).toBeNull();
  const resolved = resolveElectionContest(fixture.world, {
    contestId: fixture.contest.id,
    winnerPersonId: counted.winnerPersonId,
    tallies: counted.tallies,
  });
  expect(
    electionContestResult(resolved, fixture.contest.id)!.precinctTallies,
  ).toBeUndefined();
});

it("rejects duplicated, mismatched and future-map returns before saving a result", () => {
  const fixture = ballot();
  const world = establishVotingPrecinctMembership(
    fixture.world,
    fixture.contest.jurisdictionId,
  );
  const count = countRecordedVoterBallots(world, fixture.input)!;
  const input = {
    contestId: fixture.contest.id,
    winnerPersonId: count.winnerPersonId,
    tallies: count.tallies,
  };
  const rows = count.byPrecinct!;
  expect(() =>
    resolveElectionContest(world, {
      ...input,
      precinctTallies: [...rows, rows[0]!],
    }),
  ).toThrow("Duplicate precinct");
  expect(() =>
    resolveElectionContest(world, {
      ...input,
      precinctTallies: rows.map((row, i) =>
        i ? row : { ...row, ballotsCast: row.ballotsCast + 1 },
      ),
    }),
  ).toThrow("ballots cast");
  expect(() =>
    resolveElectionContest(fixture.world, { ...input, precinctTallies: rows }),
  ).toThrow("saved map");
  const lateDate = addDays(fixture.world.currentDate, 1);
  const futureMap = establishVotingPrecinctMembership(
    {
      ...fixture.world,
      currentDate: lateDate,
      currentMoment: simulationMomentOnLocalDate(
        fixture.world.currentMoment,
        lateDate,
      ),
    },
    fixture.contest.jurisdictionId,
  );
  expect(() =>
    resolveElectionContest(futureMap, { ...input, precinctTallies: rows }),
  ).toThrow("saved map");
  expect(() =>
    resolveElectionContest(world, { ...input, precinctTallies: [] }),
  ).toThrow("same aggregate");
});

it("leaves the separate national result projection and records unchanged", () => {
  const fixture = ballot();
  const people = fixture.world.personOrder;
  const national = registerNationalElection(
    ensureNationalElectionJurisdiction(fixture.world),
    {
      stableKey: "precinct-test:national",
      cycle: 2028,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      tickets: [
        {
          presidentPersonId: people[0]!,
          vicePresidentPersonId: people[1]!,
          presidentState: "CA",
          vicePresidentState: "NY",
        },
        {
          presidentPersonId: people[2]!,
          vicePresidentPersonId: people[3]!,
          presidentState: "TX",
          vicePresidentState: "FL",
        },
      ],
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "National projection isolation fixture.",
      },
    },
  );
  const electionId = national.history.nationalElections!.at(-1)!.id;
  const before = projectNationalElectionResults(national, electionId);
  const withMap = establishVotingPrecinctMembership(
    national,
    fixture.contest.jurisdictionId,
  );
  const resolved = resolveElectionContest(withMap, {
    contestId: fixture.contest.id,
  });
  expect(projectNationalElectionResults(resolved, electionId)).toEqual(before);
  expect(resolved.history.nationalElectionRecords).toEqual(
    national.history.nationalElectionRecords,
  );
});
