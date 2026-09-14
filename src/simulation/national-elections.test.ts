import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
  nationalUnitJurisdiction,
  ensureJurisdiction,
} from "./national-election-geography";
import { describe, it, expect } from "vitest";
import { createLightweightPerson } from "./people";
import { createDemoWorld } from "./demo";
import { makeIsoDate, simulationMomentAtLocalTime } from "./dates";
import {
  registerNationalElection,
  appendNationalRecord,
  nationalAllocation,
  nationalRecords,
  nationalCountProposal,
  recordNationalCount,
  nationalOutcome,
  recordContingentChoice,
} from "./national-elections";
import {
  nationalElectionRules,
  CONTINGENT_STATES,
} from "./national-election-rules";
import { serializeWorld, deserializeWorld } from "./serialization";
import { assertWorldIntegrity, advanceWorld } from "./world";
import { advanceWorldMinutes } from "./time-work";
import { workStatusAt } from "./life";
import {
  scheduleNationalCount,
  planNationalOfficeTerm,
  qualifyNationalOfficeEntry,
  nationalOfficeHolder,
  importNationalContestResult,
  scheduleNationalUnitContest,
} from "./national-election-consumer";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import {
  scheduleElectionContest,
  resolveElectionContest,
} from "./election-contests";
import { projectNationalElectionResults } from "../presentation/national-election-results";
import type { World, EntityId } from "./types";

const provenance = {
  method: "authored" as const,
  sourceEntityIds: [],
  note: "Supplied fictional test result, not an observed election or a voter forecast.",
};
function at(world: World, date: string, minute = 0): World {
  return {
    ...world,
    currentDate: makeIsoDate(date),
    currentMoment: simulationMomentAtLocalTime({
      date,
      minuteOfDay: minute,
      timeZone: "America/New_York",
    }),
  };
}
function setup(seed = "national-election-proof") {
  let world = ensureNationalElectionJurisdiction(
    at(createDemoWorld(seed), "2028-10-01"),
  );
  const [a, av, b, bv] = world.personOrder;
  if (!a || !av || !b || !bv)
    throw new Error("Fixture needs four canonical people.");
  world = registerNationalElection(world, {
    stableKey: "presidential-2028",
    cycle: 2028,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    tickets: [
      {
        presidentPersonId: a,
        vicePresidentPersonId: av,
        presidentState: "CA",
        vicePresidentState: "NY",
      },
      {
        presidentPersonId: b,
        vicePresidentPersonId: bv,
        presidentState: "TX",
        vicePresidentState: "FL",
      },
    ],
    provenance,
  });
  return {
    world,
    electionId: world.history.nationalElections![0]!.id,
    a,
    av,
    b,
    bv,
  };
}
function results(
  world: World,
  electionId: EntityId,
  a: EntityId,
  b: EntityId,
  winners: (unit: string) => EntityId = () => a,
) {
  let next = at(world, "2028-11-08");
  for (const unit of nationalElectionRules(2028).units) {
    const winner = winners(unit.key);
    next = appendNationalRecord(next, {
      stableKey: `result:${unit.key}`,
      electionId,
      kind: "unit-result",
      unitKey: unit.key,
      sourceContestResultId: null,
      allocationWinnerPersonId: winner,
      tallies: [
        { candidatePersonId: a, votes: winner === a ? 2 : 1 },
        {
          candidatePersonId: b,
          votes: winner === b ? (unit.key === "CA" ? 10000 : 2) : 1,
        },
      ],
      provenance,
    });
    const result = nationalRecords(next, electionId).at(-1)!;
    next = appendNationalRecord(next, {
      stableKey: `certification:${unit.key}`,
      electionId,
      kind: "certification",
      resultId: result.id,
      disposition: "certified",
      allocationWinnerPersonId: winner,
      authorityNote:
        "Supplied fixture state counting and certification disposition.",
      provenance,
    });
  }
  return next;
}
function ballots(
  world: World,
  electionId: EntityId,
  a: EntityId,
  av: EntityId,
  b: EntityId,
  bv: EntityId,
  split = false,
) {
  let next = at(world, "2028-12-19");
  for (const [i, elector] of nationalAllocation(
    next,
    electionId,
  ).electors.entries()) {
    const p = split ? (i < 269 ? a : b) : elector.allocatedTicketPresidentId;
    next = appendNationalRecord(next, {
      kind: "ballot",
      stableKey: `ballot:${elector.key}`,
      electionId,
      electorKey: elector.key,
      presidentPersonId: p,
      vicePresidentPersonId: p === a ? av : bv,
      disposition: "accepted",
      provenance,
    });
  }
  return next;
}
describe("National electoral resolution (supplied fictional results)", () => {
  it("versions the lawful allocation and refuses unsourced cycles", () => {
    expect(
      nationalElectionRules(2024).units.reduce((sum, u) => sum + u.electors, 0),
    ).toBe(538);
    expect(
      nationalElectionRules(2028).units.find((u) => u.key === "DC")?.electors,
    ).toBe(3);
    expect(() => nationalElectionRules(2032)).toThrow(/unsupported/);
  });
  it("keeps popular totals, certification, allocation, ballots, count and possession distinct with divergence and district splits", () => {
    const { world, electionId, a, av, b, bv } = setup();
    let next = results(world, electionId, a, b, (unit) =>
      ["CA", "ME-2", "NE-2"].includes(unit) ? b : a,
    );
    const allocation = nationalAllocation(next, electionId);
    expect(allocation.units.find((u) => u.key === "ME")?.winnerPersonId).toBe(
      a,
    );
    expect(allocation.units.find((u) => u.key === "ME-2")?.winnerPersonId).toBe(
      b,
    );
    expect(allocation.units.find((u) => u.key === "NE-2")?.electors).toBe(1);
    const before = projectNationalElectionResults(next, electionId);
    expect(
      before.tickets.find((t) => t.presidentPersonId === b)!.popularVotes,
    ).toBeGreaterThan(
      before.tickets.find((t) => t.presidentPersonId === a)!.popularVotes,
    );
    expect(before.mediaProjection).toBeNull();
    expect(before.tickets[0]!.countedPresidentialBallots).toBeNull();
    expect(nationalOutcome(next, electionId, "president")).toBeNull();
    next = ballots(next, electionId, a, av, b, bv);
    expect(nationalCountProposal(next, electionId).ready).toBe(true);
    expect(() =>
      recordNationalCount(next, {
        stableKey: "early-count",
        electionId,
        provenance,
      }),
    ).toThrow(/before/);
    next = recordNationalCount(at(next, "2029-01-06"), {
      stableKey: "count",
      electionId,
      provenance,
    });
    expect(nationalOutcome(next, electionId, "president")?.personId).toBe(a);
    expect(nationalOutcome(next, electionId, "vice-president")?.personId).toBe(
      av,
    );
    expect(nationalOfficeHolder(next, "president")).toBeNull();
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
    expect(() =>
      recordNationalCount(next, {
        stableKey: "double-count",
        electionId,
        provenance,
      }),
    ).toThrow(/closed/);
    assertWorldIntegrity(next);
  });
  it("missing results and contested certification/ballots block only national resolution", () => {
    const { world, electionId, a, b } = setup();
    const allocation = nationalAllocation(world, electionId);
    expect(allocation.complete).toBe(false);
    let next = appendNationalRecord(at(world, "2028-11-08"), {
      kind: "unit-result",
      stableKey: "raw",
      electionId,
      unitKey: "ME",
      allocationWinnerPersonId: null,
      sourceContestResultId: null,
      tallies: [
        { candidatePersonId: a, votes: 1 },
        { candidatePersonId: b, votes: 1 },
      ],
      provenance,
    });
    expect(
      nationalAllocation(next, electionId).units.find((u) => u.key === "ME")
        ?.status,
    ).toBe("uncertified");
    next = appendNationalRecord(next, {
      kind: "certification",
      stableKey: "contested",
      electionId,
      resultId: nationalRecords(next).at(-1)!.id,
      disposition: "contested",
      allocationWinnerPersonId: null,
      authorityNote: "Fixture contested state certification, unresolved.",
      provenance,
    });
    expect(
      nationalAllocation(next, electionId).units.find((u) => u.key === "ME")
        ?.status,
    ).toBe("contested");
    expect(() =>
      recordNationalCount(at(next, "2029-01-06"), {
        stableKey: "count",
        electionId,
        provenance,
      }),
    ).toThrow(/pending/);
    expect(() =>
      appendNationalRecord(next, {
        kind: "unit-result",
        stableKey: "duplicate",
        electionId,
        unitKey: "ME",
        allocationWinnerPersonId: a,
        sourceContestResultId: null,
        tallies: [
          { candidatePersonId: a, votes: 1 },
          { candidatePersonId: b, votes: 1 },
        ],
        provenance,
      }),
    ).toThrow(/duplicate/);
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
  });
  it("refuses duplicate elector slots, preserves contested ballots and consumes a Maine resolved winner separately from raw totals", () => {
    const { world, electionId, a, av, b } = setup("duplicate-national-ballots");
    let next = results(world, electionId, a, b);
    next = at(next, "2028-12-19");
    const elector = nationalAllocation(next, electionId).electors[0]!;
    const input = {
      kind: "ballot" as const,
      stableKey: "first-elector",
      electionId,
      electorKey: elector.key,
      presidentPersonId: a,
      vicePresidentPersonId: av,
      disposition: "contested" as const,
      provenance,
    };
    next = appendNationalRecord(next, input);
    expect(() =>
      appendNationalRecord(next, { ...input, stableKey: "same-elector-again" }),
    ).toThrow(/duplicate elector/);
    expect(nationalCountProposal(next, electionId).objections).toBe(true);
    expect(nationalCountProposal(next, electionId).ready).toBe(false);
    const separate = setup("maine-resolved-result");
    let maine = appendNationalRecord(at(separate.world, "2028-11-08"), {
      kind: "unit-result",
      stableKey: "maine-raw",
      electionId: separate.electionId,
      unitKey: "ME",
      allocationWinnerPersonId: null,
      sourceContestResultId: null,
      tallies: [
        { candidatePersonId: separate.a, votes: 1000 },
        { candidatePersonId: separate.b, votes: 900 },
      ],
      provenance,
    });
    const resultId = nationalRecords(maine).at(-1)!.id;
    maine = appendNationalRecord(maine, {
      kind: "certification",
      stableKey: "maine-certified",
      electionId: separate.electionId,
      resultId,
      disposition: "certified",
      allocationWinnerPersonId: separate.b,
      authorityNote:
        "Supplied fictional state-resolved counting disposition; raw first-choice totals are distinct.",
      provenance,
    });
    expect(
      nationalAllocation(maine, separate.electionId).units.find(
        (unit) => unit.key === "ME",
      )?.winnerPersonId,
    ).toBe(separate.b);
    expect(
      projectNationalElectionResults(maine, separate.electionId).tickets.find(
        (ticket) => ticket.presidentPersonId === separate.a,
      )?.popularVotes,
    ).toBe(1000);
    expect(deserializeWorld(serializeWorld(maine))).toEqual(maine);
  });
  it("a tie/no majority uses distinct House and Senate bodies and whole-body denominators", () => {
    const { world, electionId, a, av, b, bv } = setup();
    let next = ballots(
      results(world, electionId, a, b),
      electionId,
      a,
      av,
      b,
      bv,
      true,
    );
    next = recordNationalCount(at(next, "2029-01-06"), {
      stableKey: "tied-count",
      electionId,
      presidentialChoicePersonIds: [a, b],
      vicePresidentialChoicePersonIds: [av, bv],
      provenance,
    });
    expect(nationalOutcome(next, electionId, "president")).toBeNull();
    const countId = nationalRecords(next).at(-1)!.id;
    const votes = CONTINGENT_STATES.slice(0, 34).map((state, i) => ({
      voterKey: state,
      candidatePersonId: i < 26 ? a : b,
    }));
    expect(() =>
      recordContingentChoice(next, {
        stableKey: "dc-house",
        electionId,
        countId,
        office: "president",
        wholeNumber: 50,
        senatorPersonIds: [],
        votes: [
          ...votes.slice(0, 33),
          { voterKey: "DC", candidatePersonId: a },
        ],
        provenance,
      }),
    ).toThrow(/DC/);
    const noQuorum = recordContingentChoice(next, {
      stableKey: "no-quorum",
      electionId,
      countId,
      office: "president",
      wholeNumber: 50,
      senatorPersonIds: [],
      votes: votes.slice(0, 33),
      provenance,
    });
    expect(nationalOutcome(noQuorum, electionId, "president")).toBeNull();
    next = recordContingentChoice(noQuorum, {
      stableKey: "house-choice",
      electionId,
      countId,
      office: "president",
      wholeNumber: 50,
      senatorPersonIds: [],
      votes,
      provenance,
    });
    expect(nationalOutcome(next, electionId, "president")?.personId).toBe(a);
    expect(nationalOutcome(next, electionId, "vice-president")).toBeNull();
    const senators: EntityId[] = [];
    for (let i = 0; i < 100; i++) {
      const person = createLightweightPerson({
        worldId: next.id,
        worldSeed: next.seed,
        index: 1000 + i,
        currentDate: next.currentDate,
        homeJurisdictionId: next.jurisdictionOrder[0]!,
      });
      const id = person.id;
      next = {
        ...next,
        people: { ...next.people, [id]: person },
        personOrder: [...next.personOrder, id],
      };
      senators.push(id);
    }
    const senateVotes = senators
      .slice(0, 67)
      .map((id, i) => ({ voterKey: id, candidatePersonId: i < 51 ? av : bv }));
    next = recordContingentChoice(next, {
      stableKey: "senate-choice",
      electionId,
      countId,
      office: "vice-president",
      wholeNumber: 100,
      senatorPersonIds: senators,
      votes: senateVotes,
      provenance,
    });
    expect(nationalOutcome(next, electionId, "vice-president")?.personId).toBe(
      av,
    );
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
  });
  it("the actual schedule seats rival officeholders independently and expires only their own work at noon", () => {
    const { world: fixtureWorld, electionId, a, av, b, bv } = setup();
    const world: World = {
      ...fixtureWorld,
      control: { kind: "person", personId: a },
    };
    const playerWork = world.history.workRelationships.filter(
      (work) => work.personId === a,
    );
    expect(playerWork.length).toBeGreaterThan(0);
    const playerWorkIds = new Set(playerWork.map((work) => work.id));
    const playerStatuses = world.history.workStatuses.filter((status) =>
      playerWorkIds.has(status.workRelationshipId),
    );
    const originalControl = world.control;
    let next = scheduleNationalCount(world, electionId);
    next = ballots(
      results(next, electionId, a, b, () => b),
      electionId,
      a,
      av,
      b,
      bv,
    );
    next = advanceWorld(next, 18, createCampaignElectionTransitionRegistry());
    expect(next.currentDate).toBe("2029-01-06");
    expect(nationalOutcome(next, electionId, "president")?.personId).toBe(b);
    next = planNationalOfficeTerm(next, {
      stableKey: "presidential-term",
      electionId,
      office: "president",
      qualificationNote: "Expected term, not a recorded oath.",
      workTimeDemand: {
        expectedWeekly: { minimumHours: 10, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      },
      provenance,
    });
    const planId = nationalRecords(next).at(-1)!.id;
    next = at(next, "2029-01-20", 719);
    expect(() =>
      qualifyNationalOfficeEntry(next, {
        stableKey: "early-oath",
        electionId,
        planId,
        personId: b,
        disposition: "qualified-and-sworn",
        authorityNote: "Fixture qualification and oath disposition.",
        provenance,
      }),
    ).toThrow(/after/);
    next = advanceWorldMinutes(
      next,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(nationalOfficeHolder(next, "president")).toBeNull();
    next = qualifyNationalOfficeEntry(next, {
      stableKey: "oath",
      electionId,
      planId,
      personId: b,
      disposition: "qualified-and-sworn",
      authorityNote:
        "Supplied canonical qualification and actually recorded oath disposition.",
      provenance,
    });
    const holder = nationalOfficeHolder(next, "president")!;
    expect(holder.plan.personId).toBe(b);
    expect(
      next.history.workRelationships.some(
        (work) =>
          work.id === holder.state.workRelationshipId && work.personId === b,
      ),
    ).toBe(true);
    expect(nationalOfficeHolder(next, "vice-president")).toBeNull();
    expect(nationalOutcome(next, electionId, "vice-president")?.personId).toBe(
      bv,
    );
    next = planNationalOfficeTerm(next, {
      stableKey: "vice-presidential-term",
      electionId,
      office: "vice-president",
      qualificationNote: "Separate supplied vice-presidential qualification.",
      workTimeDemand: holder.plan.workTimeDemand,
      provenance,
    });
    const vicePlanId = nationalRecords(next).at(-1)!.id;
    expect(nationalOfficeHolder(next, "vice-president")).toBeNull();
    next = qualifyNationalOfficeEntry(next, {
      stableKey: "vice-presidential-oath",
      electionId,
      planId: vicePlanId,
      personId: bv,
      disposition: "qualified-and-sworn",
      authorityNote: "Separate actually recorded vice-presidential oath.",
      provenance,
    });
    const viceHolder = nationalOfficeHolder(next, "vice-president")!;
    expect(viceHolder.plan.personId).toBe(bv);
    expect(
      next.history.workRelationships.find(
        (work) => work.id === viceHolder.state.workRelationshipId,
      )?.kind,
    ).toBe("employment:vice-presidential-officeholder");
    expect(next.control).toEqual(originalControl);
    expect(
      next.history.workRelationships.filter((work) =>
        playerWorkIds.has(work.id),
      ),
    ).toEqual(playerWork);
    expect(
      next.history.workStatuses.filter((status) =>
        playerWorkIds.has(status.workRelationshipId),
      ),
    ).toEqual(playerStatuses);
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
    // Authored fixture positioning avoids a four-year wait; the final minute
    // must still flow through the actual shared clock and expiry consumer.
    next = at(next, "2033-01-20", 719);
    expect(nationalOfficeHolder(next, "president")?.plan.personId).toBe(b);
    expect(nationalOfficeHolder(next, "vice-president")?.plan.personId).toBe(
      bv,
    );
    expect(workStatusAt(next, holder.state.workRelationshipId!)?.status).toBe(
      "active",
    );
    const ended = advanceWorldMinutes(
      next,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(ended.currentDate).toBe("2033-01-20");
    expect(nationalOfficeHolder(ended, "president")).toBeNull();
    expect(nationalOfficeHolder(ended, "vice-president")).toBeNull();
    expect(
      workStatusAt(ended, viceHolder.state.workRelationshipId!)?.status,
    ).toBe("ended");
    expect(
      ended.history.workStatuses.filter((status) =>
        playerWorkIds.has(status.workRelationshipId),
      ),
    ).toEqual(playerStatuses);
    expect(ended.control).toEqual(originalControl);
    expect(
      projectNationalElectionResults(ended, electionId).president.state,
    ).toBe("Chosen; term period ended");
    expect(
      ended.history.workStatuses.findLast(
        (state) => state.workRelationshipId === holder.state.workRelationshipId,
      )?.status,
    ).toBe("ended");
    expect(deserializeWorld(serializeWorld(ended))).toEqual(ended);
  });
  it("imports the existing canonical producer without certifying it and guards presidential direct contests", () => {
    const { world, electionId, a, b } = setup();
    const input = {
      stableKey: "unit-contest",
      jurisdictionId: nationalUnitJurisdiction(2028, "NE-2").id,
      office: {
        officeKey: "electors:NE-2",
        title: "Presidential electors, Nebraska district 2",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate: "2028-11-07",
      candidatePersonIds: [a, b],
      provenance,
    };
    expect(() =>
      scheduleElectionContest(
        ensureJurisdiction(world, nationalUnitJurisdiction(2028, "NE-2")),
        {
          ...input,
          office: { ...input.office, officeKey: "us-federal-president" },
        },
      ),
    ).toThrow(/national electoral/);
    let next = scheduleElectionContest(
      ensureJurisdiction(world, nationalUnitJurisdiction(2028, "NE-2")),
      input,
    );
    const contestId = next.history.electionContests!.at(-1)!.id;
    next = resolveElectionContest(at(next, "2028-11-07"), {
      contestId,
      winnerPersonId: b,
      tallies: [
        { candidatePersonId: a, votes: 1, voteShare: 0.25 },
        { candidatePersonId: b, votes: 3, voteShare: 0.75 },
      ],
      provenance,
    });
    const contestResultId = next.history.electionContestResults!.at(-1)!.id;
    next = importNationalContestResult(next, {
      stableKey: "imported",
      electionId,
      unitKey: "NE-2",
      contestResultId,
    });
    expect(
      nationalAllocation(next, electionId).units.find((u) => u.key === "NE-2")
        ?.status,
    ).toBe("uncertified");
    expect(() =>
      importNationalContestResult(next, {
        stableKey: "wrong-unit",
        electionId,
        unitKey: "CA",
        contestResultId,
      }),
    ).toThrow(/does not match/);
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
  });
  it("scheduled unit producer imports an existing supplied result and refuses a missing raw producer", () => {
    const { world, electionId, a, b } = setup("linked-national-producer");
    const scheduled = scheduleNationalUnitContest(world, {
      stableKey: "national-ne-2",
      electionId,
      unitKey: "NE-2",
      jurisdictionId: nationalUnitJurisdiction(2028, "NE-2").id,
      provenance,
    });
    const contestId = scheduled.history.electionContests!.at(-1)!.id;
    const unresolved = advanceWorld(
      scheduled,
      37,
      createCampaignElectionTransitionRegistry(),
    );
    expect(unresolved.history.electionContestResults ?? []).toHaveLength(0);
    expect(unresolved.history.futureDueItemStates.at(-1)?.reasonKey).toBe(
      "election:national-unit-result-missing",
    );
    let supplied = resolveElectionContest(at(scheduled, "2028-11-07"), {
      contestId,
      winnerPersonId: a,
      tallies: [
        { candidatePersonId: a, votes: 2, voteShare: 2 / 3 },
        { candidatePersonId: b, votes: 1, voteShare: 1 / 3 },
      ],
      provenance,
    });
    supplied = advanceWorld(
      supplied,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(
      nationalAllocation(supplied, electionId).units.find(
        (unit) => unit.key === "NE-2",
      )?.status,
    ).toBe("uncertified");
    expect(
      nationalRecords(supplied, electionId).filter(
        (record) => record.kind === "unit-result",
      ),
    ).toHaveLength(1);
    expect(deserializeWorld(serializeWorld(supplied))).toEqual(supplied);
  });
  it("legacy snapshots stay unchanged and missing count inputs become an explicit scheduled refusal", () => {
    const old = createDemoWorld("legacy-national-no-op");
    expect(deserializeWorld(serializeWorld(old))).toEqual(old);
    const { world, electionId } = setup();
    const next = advanceWorld(
      scheduleNationalCount(world, electionId),
      97,
      createCampaignElectionTransitionRegistry(),
    );
    expect(next.history.futureDueItemStates.at(-1)?.status).toBe("blocked");
    expect(nationalOutcome(next, electionId, "president")).toBeNull();
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
  });
});
