import { describe, expect, it } from "vitest";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { createDemoWorld } from "./demo";
import {
  electionContestResult,
  evaluateDeterministicContestOutcome,
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

  it("reuses recorded ballots after a voter changes their candidate opinion", () => {
    const { world, contest, voters, candidates } = ballot();
    const originalTraces = [...world.history.decisionTraces];
    const resolved = resolveElectionContest(world, {
      contestId: contest.id,
      admitVoter: (id) => voters.includes(id),
    });
    const recorded = resolved.history.decisionTraces.filter(
      (trace) =>
        trace.context.subject.kind === "context:election" &&
        trace.context.subject.key === contest.stableKey,
    );
    expect(recorded).toHaveLength(voters.length);
    expect(
      recorded.every((trace) => trace.context.retention === "durable"),
    ).toBe(true);
    const changed = recordPrivateBelief(resolved, {
      stableKey: "admission-fixture:changed-opinion",
      personId: voters[0]!,
      propositionId: null,
      subject: officialOpinionSubject(candidates[0]!),
      formedAt: resolved.currentDate,
      position: "oppose",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale:
        "The voter now opposes the candidate after casting the ballot.",
      formation: createFormationContext("reflection:fixture", {
        note: "A subsequent opinion must not rewrite a recorded vote.",
      }),
      supersedesBeliefId: resolved.history.privateBeliefs.find(
        (belief) =>
          belief.personId === voters[0] &&
          belief.subject?.kind === "official" &&
          belief.subject.personId === candidates[0],
      )!.id,
    });
    expect(
      evaluateDeterministicContestOutcome(changed, contest, (id) =>
        voters.includes(id),
      ),
    ).toEqual({
      winnerPersonId: electionContestResult(resolved, contest.id)!
        .winnerPersonId,
      tallies: electionContestResult(resolved, contest.id)!.tallies,
    });
    expect(world.history.decisionTraces).toEqual(originalTraces);
  });

  it("uses the complete recorded donor cohort independent of voter order", () => {
    const { world, contest } = ballot();
    const preview = evaluateDeterministicContestOutcome(world, contest);
    const reordered = {
      ...world,
      personOrder: [...world.personOrder].reverse(),
    };
    const counted = resolveElectionContest(reordered, {
      contestId: contest.id,
    });
    const result = electionContestResult(counted, contest.id)!;
    expect(preview).toEqual({
      winnerPersonId: result.winnerPersonId,
      tallies: result.tallies,
    });
    const estimated = counted.history.decisionTraces.filter(
      (trace) =>
        trace.context.subject.kind === "context:election" &&
        trace.context.subject.key === contest.stableKey &&
        trace.context.peerEstimates,
    );
    expect(estimated.length).toBeGreaterThan(0);
    for (const trace of estimated) {
      for (const estimate of trace.context.peerEstimates!) {
        expect(
          estimate.samples.every(
            (sample) =>
              counted.history.decisionTraces.find(
                (row) => row.id === sample.decisionTraceId,
              )!.context.considerations.length > 0,
          ),
        ).toBe(true);
      }
    }
  });

  it("counts only admitted voters through the shared resolver", () => {
    const { world, contest, voters } = ballot();
    const all = resolveElectionContest(world, {
      contestId: contest.id,
      admitVoter: (id) => voters.includes(id),
    });
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
