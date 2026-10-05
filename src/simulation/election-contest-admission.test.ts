import { describe, expect, it } from "vitest";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { createDemoWorld } from "./demo";
import {
  electionContestResult,
  resolveElectionContest,
  scheduleElectionContest,
} from "./election-contests";
import { isEligibleVoterIn } from "./issue-record";
import { officialOpinionSubject } from "./political-opinion-subjects";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { recordPersonDeath } from "./vitality";
import { districtIdentityCatalog } from "../districts/catalog";
import { bindingFromIdentity } from "../districts/query";

function ballot() {
  let world = createDemoWorld("session13-recorded-ballot-admission");
  const jurisdictionId = world.jurisdictionOrder[0]!;
  const candidates = world.personOrder.slice(0, 2);
  const electionDate = addDays(world.currentDate, 1);
  const voters = world.personOrder.filter(
    (id) =>
      !candidates.includes(id) &&
      isEligibleVoterIn(world, id, jurisdictionId, world.currentDate),
  );
  expect(voters.length).toBeGreaterThan(1);
  for (const voter of voters) {
    for (const [index, candidate] of candidates.entries()) {
      world = recordPrivateBelief(world, {
        stableKey: `admission-fixture:${voter}:${candidate}`,
        personId: voter,
        propositionId: null,
        subject: officialOpinionSubject(candidate),
        formedAt: world.currentDate,
        position: "support",
        conviction: "strong",
        salience: index === 0 ? "central" : "moderate",
        flexibility: "firm",
        rationale:
          "The fixture voter prefers the first candidate's recorded work.",
        formation: createFormationContext("reflection:fixture", {
          note: "Authored voter evidence for ballot admission.",
        }),
        supersedesBeliefId: null,
      });
    }
  }
  world = scheduleElectionContest(world, {
    stableKey: "admission-fixture:ballot",
    jurisdictionId,
    office: {
      officeKey: "council",
      title: "Council",
      seatKey: null,
      occupationClassification: null,
    },
    electionDate,
    candidatePersonIds: candidates,
    provenance: { method: "authored", sourceEntityIds: [], note: null },
  });
  world = {
    ...world,
    currentDate: electionDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      electionDate,
    ),
  };
  const contest = world.history.electionContests!.at(-1)!;
  return { world, contest, voters, candidates };
}

describe("shared contest ballot admission", () => {
  it("does not count statewide residence as unrecorded district membership", () => {
    const { world, contest } = ballot();
    const district = districtIdentityCatalog().find(
      (identity) =>
        identity.chamber === "congressional" &&
        identity.stateUsps === "KY" &&
        !identity.isUnassignedResidual,
    )!;
    const previousDate = addDays(world.currentDate, -1);
    const scheduled = scheduleElectionContest(
      {
        ...world,
        currentDate: previousDate,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          previousDate,
        ),
      },
      {
        stableKey: "admission-fixture:district-ballot",
        jurisdictionId: contest.jurisdictionId,
        office: {
          ...contest.office,
          districtBinding: bindingFromIdentity(district),
        },
        electionDate: contest.electionDate,
        candidatePersonIds: contest.candidatePersonIds,
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      },
    );
    const onElectionDay = {
      ...scheduled,
      currentDate: world.currentDate,
      currentMoment: world.currentMoment,
    };
    const districtContest = scheduled.history.electionContests!.at(-1)!;
    expect(
      resolveElectionContest(onElectionDay, { contestId: districtContest.id }),
    ).toBe(onElectionDay);
  });

  it("counts only admitted voters through the shared resolver", () => {
    const { world, contest, voters } = ballot();
    const all = resolveElectionContest(world, { contestId: contest.id });
    const ward = resolveElectionContest(world, {
      contestId: contest.id,
      admitVoter: (id) => id === voters[0],
    });
    expect(electionContestResult(all, contest.id)!.tallies[0]!.votes).toBe(
      voters.length,
    );
    expect(electionContestResult(ward, contest.id)!.tallies[0]!.votes).toBe(1);
    expect(electionContestResult(ward, contest.id)!.winnerPersonId).toBe(
      electionContestResult(all, contest.id)!.winnerPersonId,
    );
  });

  it("keeps an unread ward or a ballot with no admitted voters pending without a partial result", () => {
    const { world, contest } = ballot();
    expect(
      resolveElectionContest(world, {
        contestId: contest.id,
        admitVoter: () => null,
      }),
    ).toBe(world);
    expect(
      resolveElectionContest(world, {
        contestId: contest.id,
        admitVoter: () => false,
      }),
    ).toBe(world);
  });

  it("retains a deceased candidate on the ballot with zero votes and counts the living candidate", () => {
    const fixture = ballot();
    const world = recordPersonDeath(fixture.world, {
      stableKey: "admission-fixture:death",
      personId: fixture.candidates[0]!,
      diedAt: fixture.world.currentDate,
      causeKey: "custom:fixture",
      sourceEntityIds: [fixture.world.id],
      summary: "The candidate died before the vote.",
      provenance: {
        kind: "authored",
        note: "Authored death for ballot admission.",
      },
    });
    const resolved = resolveElectionContest(world, {
      contestId: fixture.contest.id,
    });
    const result = electionContestResult(resolved, fixture.contest.id)!;
    expect(result.winnerPersonId).toBe(fixture.candidates[1]);
    expect(
      result.tallies.find(
        (row) => row.candidatePersonId === fixture.candidates[0],
      )!.votes,
    ).toBe(0);
  });
});
