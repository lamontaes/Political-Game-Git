import { describe, expect, it } from "vitest";

import { addDays } from "./dates";
import { createDemoWorld } from "./demo";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  cancelElectionContest,
  electionContestById,
  electionContestResult,
  electionContestStatus,
  electionContestsForCandidate,
  electionContestsForJurisdiction,
  electionContestTransitionHandler,
  isElectionContestPending,
  isElectionContestResolved,
  pendingElectionContests,
  requireElectionContest,
  resolveElectionContest,
  resolvedElectionContests,
  scheduleElectionContest,
} from "./election-contests";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { createStableId } from "./ids";
import { createPortabilityFixture } from "./portability-fixture";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  EntityId,
  FutureDueItem,
  ResolveElectionContestInput,
  World,
} from "./types";
import { assertWorldIntegrity, advanceWorld } from "./world";
import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";

function getPersonId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing test person at index ${index}`);
  return id;
}

function getJurisdictionId(world: World, index = 0): EntityId {
  const id = world.jurisdictionOrder[index];
  if (!id) throw new Error(`Missing test jurisdiction at index ${index}`);
  return id;
}

function createElectionTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [ELECTION_CONTEST_TRANSITION_KEY, electionContestTransitionHandler],
  ]);
}

describe("Election Contest Substrate", () => {
  it("1. deterministic creation: creates contest records with stable IDs and scheduled future due items", () => {
    const worldA = createDemoWorld("election-deterministic-creation-seed");
    const worldB = createDemoWorld("election-deterministic-creation-seed");

    const jurisdictionId = getJurisdictionId(worldA);
    const candidate1 = getPersonId(worldA, 0);
    const candidate2 = getPersonId(worldA, 1);
    const electionDate = addDays(worldA.currentDate, 30);

    const input = {
      stableKey: "general-election:2026:mayor",
      jurisdictionId,
      office: {
        officeKey: "mayor",
        title: "Mayor",
        seatKey: null,
        occupationClassification: "occupation:elected-official" as const,
      },
      electionDate,
      candidatePersonIds: [candidate1, candidate2],
      provenance: {
        method: "authored" as const,
        sourceEntityIds: [],
        note: "Scheduled mayoral general election",
      },
    };

    const scheduledA = scheduleElectionContest(worldA, input);
    const scheduledB = scheduleElectionContest(worldB, input);

    expect(scheduledA.history.electionContests ?? []).toHaveLength(1);
    expect(scheduledB.history.electionContests ?? []).toHaveLength(1);

    const contestA = (scheduledA.history.electionContests ?? [])[0]!;
    const contestB = (scheduledB.history.electionContests ?? [])[0]!;

    expect(contestA.id).toBe(contestB.id);
    expect(contestA.stableKey).toBe("general-election:2026:mayor");
    expect(contestA.jurisdictionId).toBe(jurisdictionId);
    expect(contestA.office.title).toBe("Mayor");
    expect(contestA.electionDate).toBe(electionDate);
    expect(contestA.candidatePersonIds).toEqual([candidate1, candidate2]);
    expect(contestA.scheduledAt).toBe(worldA.currentDate);

    // Verify corresponding FutureDueItem was scheduled
    const dueItem = scheduledA.history.futureDueItems.find(
      (item) => item.transitionKey === ELECTION_CONTEST_TRANSITION_KEY,
    );
    expect(dueItem).toBeDefined();
    expect(dueItem?.dueAt).toBe(electionDate);
    expect(dueItem?.entityIds).toEqual([contestA.id]);

    assertWorldIntegrity(scheduledA);
    assertWorldIntegrity(scheduledB);
  });

  it("2. valid candidate linkage: correctly links multiple candidates and provides query helpers", () => {
    let world = createDemoWorld("election-candidate-linkage-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const candidate2 = getPersonId(world, 1);
    const candidate3 = getPersonId(world, 2);
    const electionDate = addDays(world.currentDate, 60);

    world = scheduleElectionContest(world, {
      stableKey: "council-election:2026:district-1",
      jurisdictionId,
      office: {
        officeKey: "council:district-1",
        title: "City Council Member, District 1",
        seatKey: "district-1",
        occupationClassification: null,
      },
      electionDate,
      candidatePersonIds: [candidate1, candidate2, candidate3],
      provenance: {
        method: "simulated",
        sourceEntityIds: [],
        note: "3-way council race",
      },
    });

    const contest = (world.history.electionContests ?? [])[0]!;
    expect(electionContestById(world, contest.id)).toEqual(contest);
    expect(requireElectionContest(world, contest.id)).toEqual(contest);
    expect(isElectionContestPending(world, contest.id)).toBe(true);
    expect(isElectionContestResolved(world, contest.id)).toBe(false);

    // Query helpers by candidate and jurisdiction
    expect(electionContestsForCandidate(world, candidate1)).toHaveLength(1);
    expect(electionContestsForCandidate(world, candidate2)).toHaveLength(1);
    expect(electionContestsForCandidate(world, candidate3)).toHaveLength(1);
    expect(
      electionContestsForCandidate(world, getPersonId(world, 3)),
    ).toHaveLength(0);

    expect(electionContestsForJurisdiction(world, jurisdictionId)).toHaveLength(
      1,
    );
    expect(pendingElectionContests(world)).toHaveLength(1);
    expect(resolvedElectionContests(world)).toHaveLength(0);

    assertWorldIntegrity(world);
  });

  it("3. invalid candidate reference rejection: rejects invalid or malformed contest state", () => {
    const world = createDemoWorld("election-validation-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const electionDate = addDays(world.currentDate, 30);

    // Rejects empty candidates list
    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:empty-candidates",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/must contain at least one candidate/i);

    // Rejects duplicate candidate Person IDs
    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:duplicate-candidates",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate1],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/contains duplicate candidate Person IDs/i);

    // Rejects non-existent candidate Person ID
    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:missing-candidate",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [
          candidate1,
          "person_missing_nonexistent" as EntityId,
        ],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/references a missing candidate person/i);

    // Rejects non-existent jurisdiction
    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:missing-jurisdiction",
        jurisdictionId: "jurisdiction_nonexistent" as EntityId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/references a missing jurisdiction/i);

    // Rejects election date in the past or on the same day
    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:past-date",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate: world.currentDate,
        candidatePersonIds: [candidate1],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/must be scheduled for a future date/i);

    // Rejects empty office title or key
    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:empty-office",
        jurisdictionId,
        office: {
          officeKey: "",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/Elective office key must not be empty/i);

    expect(() =>
      scheduleElectionContest(world, {
        stableKey: "test:empty-title",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      }),
    ).toThrow(/Elective office title must not be empty/i);
  });

  it("4. pending → resolved at election moment: resolves contest exactly once at the scheduled date", () => {
    let world = createDemoWorld("election-resolution-moment-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const candidate2 = getPersonId(world, 1);
    const daysUntilElection = 14;
    const electionDate = addDays(world.currentDate, daysUntilElection);

    world = scheduleElectionContest(world, {
      stableKey: "mayoral-race:2026",
      jurisdictionId,
      office: {
        officeKey: "mayor",
        title: "Mayor",
        seatKey: null,
        occupationClassification: "occupation:elected-official" as const,
      },
      electionDate,
      candidatePersonIds: [candidate1, candidate2],
      provenance: {
        method: "simulated",
        sourceEntityIds: [],
        note: "2-candidate mayoral contest",
      },
    });

    const contest = (world.history.electionContests ?? [])[0]!;
    expect(electionContestStatus(world, contest.id)).toBe("pending");
    expect(electionContestResult(world, contest.id)).toBeNull();

    // Advance time to the election day
    const registry = createElectionTransitionRegistry();
    world = advanceWorld(world, daysUntilElection, registry);

    expect(world.currentDate).toBe(electionDate);
    expect(electionContestStatus(world, contest.id)).toBe("resolved");
    expect(isElectionContestResolved(world, contest.id)).toBe(true);
    expect(isElectionContestPending(world, contest.id)).toBe(false);

    const result = electionContestResult(world, contest.id);
    expect(result).not.toBeNull();
    expect(result?.contestId).toBe(contest.id);
    expect(result?.resolvedAt).toBe(electionDate);
    expect([candidate1, candidate2]).toContain(result?.winnerPersonId);
    expect(result?.tallies).toHaveLength(2);

    // Check vote shares sum to approximately 1.0
    const totalShare = result!.tallies.reduce((sum, t) => sum + t.voteShare, 0);
    expect(totalShare).toBeCloseTo(1.0, 2);

    // Check winner is the candidate with the highest votes
    const sortedTallies = [...result!.tallies].sort(
      (a, b) => b.votes - a.votes,
    );
    expect(result?.winnerPersonId).toBe(sortedTallies[0]!.candidatePersonId);

    // Check outcome event is recorded in world history
    const outcomeEvent = world.history.events.find(
      (e) => e.id === result?.outcomeEventId,
    );
    expect(outcomeEvent).toBeDefined();
    expect(outcomeEvent?.type).toBe("election.contest-resolved");
    expect(outcomeEvent?.tags).toContain("election");

    assertWorldIntegrity(world);
  });

  it("5. no early resolution: contest remains pending before the election moment", () => {
    let world = createDemoWorld("election-no-early-resolution-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const candidate2 = getPersonId(world, 1);
    const daysUntilElection = 20;
    const electionDate = addDays(world.currentDate, daysUntilElection);

    world = scheduleElectionContest(world, {
      stableKey: "sheriff-election:2026",
      jurisdictionId,
      office: {
        officeKey: "sheriff",
        title: "County Sheriff",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate,
      candidatePersonIds: [candidate1, candidate2],
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "County sheriff contest",
      },
    });

    const contest = (world.history.electionContests ?? [])[0]!;

    // Advance 10 days (halfway to election)
    const registry = createElectionTransitionRegistry();
    world = advanceWorld(world, 10, registry);

    expect(world.currentDate).not.toBe(electionDate);
    expect(electionContestStatus(world, contest.id)).toBe("pending");
    expect(electionContestResult(world, contest.id)).toBeNull();
    expect(world.history.electionContestResults ?? []).toHaveLength(0);

    assertWorldIntegrity(world);
  });

  it("6. no duplicate resolution: repeated time advancement or handler calls do not duplicate results", () => {
    let world = createDemoWorld("election-no-duplicate-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const candidate2 = getPersonId(world, 1);
    const daysUntilElection = 7;
    const electionDate = addDays(world.currentDate, daysUntilElection);

    world = scheduleElectionContest(world, {
      stableKey: "coroner-election:2026",
      jurisdictionId,
      office: {
        officeKey: "coroner",
        title: "County Coroner",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate,
      candidatePersonIds: [candidate1, candidate2],
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "County coroner contest",
      },
    });

    const contest = (world.history.electionContests ?? [])[0]!;
    const registry = createElectionTransitionRegistry();

    // Advance to election date
    world = advanceWorld(world, daysUntilElection, registry);
    expect(world.history.electionContestResults ?? []).toHaveLength(1);
    const firstResult = electionContestResult(world, contest.id)!;

    // Advance time further (e.g. 14 days after election)
    world = advanceWorld(world, 14, registry);
    expect(world.history.electionContestResults ?? []).toHaveLength(1);
    expect(electionContestResult(world, contest.id)).toEqual(firstResult);

    // Direct resolution call on already resolved contest must throw
    expect(() =>
      resolveElectionContest(world, {
        contestId: contest.id,
      }),
    ).toThrow(/already resolved/i);

    assertWorldIntegrity(world);
  });

  it("7. persistence round trip: contest state survives serialization, SQLite storage, and deserialization", () => {
    let world = createDemoWorld("election-persistence-round-trip-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const candidate2 = getPersonId(world, 1);
    const candidate3 = getPersonId(world, 2);
    const candidate4 = getPersonId(world, 3);

    // Schedule two contests: one pending, one to be resolved
    const electionDate1 = addDays(world.currentDate, 7);
    const electionDate2 = addDays(world.currentDate, 30);

    world = scheduleElectionContest(world, {
      stableKey: "race-1:resolved-later",
      jurisdictionId,
      office: {
        officeKey: "office-1",
        title: "Office 1",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate: electionDate1,
      candidatePersonIds: [candidate1, candidate2],
      provenance: { method: "simulated", sourceEntityIds: [], note: null },
    });

    world = scheduleElectionContest(world, {
      stableKey: "race-2:remains-pending",
      jurisdictionId,
      office: {
        officeKey: "office-2",
        title: "Office 2",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate: electionDate2,
      candidatePersonIds: [candidate3, candidate4],
      provenance: { method: "simulated", sourceEntityIds: [], note: null },
    });

    // Advance 7 days to resolve race 1
    const registry = createElectionTransitionRegistry();
    world = advanceWorld(world, 7, registry);

    const contest1 = (world.history.electionContests ?? [])[0]!;
    const contest2 = (world.history.electionContests ?? [])[1]!;

    expect(electionContestStatus(world, contest1.id)).toBe("resolved");
    expect(electionContestStatus(world, contest2.id)).toBe("pending");

    // Serialization round trip
    const serialized = serializeWorld(world);
    const deserialized = deserializeWorld(serialized);
    expect(deserialized).toStrictEqual(world);
    assertWorldIntegrity(deserialized);

    // SQLite Repository save and load round trip
    const repository = new SqliteWorldRepository(":memory:");
    try {
      repository.save(world);
      const loaded = repository.load(world.id);

      expect(loaded).not.toBeNull();
      expect(loaded).toStrictEqual(world);
      expect(electionContestStatus(loaded!, contest1.id)).toBe("resolved");
      expect(electionContestStatus(loaded!, contest2.id)).toBe("pending");
      expect(electionContestResult(loaded!, contest1.id)).toEqual(
        electionContestResult(world, contest1.id),
      );
      assertWorldIntegrity(loaded!);
    } finally {
      repository.close();
    }
  });

  it("8. deterministic replay: identical inputs from identical seed produce byte-for-byte identical contest records and results", () => {
    function runScenario(seed: string) {
      let world = createDemoWorld(seed);
      const jurisdictionId = getJurisdictionId(world);
      const c1 = getPersonId(world, 0);
      const c2 = getPersonId(world, 1);
      const c3 = getPersonId(world, 2);

      world = scheduleElectionContest(world, {
        stableKey: "replay:council-race",
        jurisdictionId,
        office: {
          officeKey: "council-at-large",
          title: "Council At-Large",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate: addDays(world.currentDate, 10),
        candidatePersonIds: [c1, c2, c3],
        provenance: {
          method: "simulated",
          sourceEntityIds: [],
          note: "Replay test",
        },
      });

      const registry = createElectionTransitionRegistry();
      world = advanceWorld(world, 10, registry);
      return world;
    }

    const runA = runScenario("fixed-replay-seed-42");
    const runB = runScenario("fixed-replay-seed-42");

    expect(serializeWorld(runA)).toBe(serializeWorld(runB));

    const resultA = (runA.history.electionContestResults ?? [])[0]!;
    const resultB = (runB.history.electionContestResults ?? [])[0]!;
    expect(resultA.winnerPersonId).toBe(resultB.winnerPersonId);
    expect(resultA.tallies).toEqual(resultB.tallies);
  });

  it("9. alternate synthetic jurisdiction portability: functions seamlessly in non-Lexington synthetic environment", () => {
    let portabilityWorld = createPortabilityFixture(
      "synthetic-election-portability-seed",
    );
    const jurisdictionId = getJurisdictionId(portabilityWorld);
    const candidate1 = getPersonId(portabilityWorld, 0);
    const candidate2 = getPersonId(portabilityWorld, 1);
    const electionDate = addDays(portabilityWorld.currentDate, 15);

    // Confirm synthetic context
    expect(portabilityWorld.jurisdictions[jurisdictionId]?.slug).toBe(
      "synthetic-tidal-basin",
    );
    expect(portabilityWorld.currentMoment.timeZone).toBe("Pacific/Honolulu");

    portabilityWorld = scheduleElectionContest(portabilityWorld, {
      stableKey: "synthetic-board-election:2026",
      jurisdictionId,
      office: {
        officeKey: "tidal-basin-harbor-commissioner",
        title: "Tidal Basin Harbor Commissioner",
        seatKey: "commissioner-a",
        occupationClassification: "occupation:public-official" as const,
      },
      electionDate,
      candidatePersonIds: [candidate1, candidate2],
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "Synthetic portability election",
      },
    });

    const contest = (portabilityWorld.history.electionContests ?? [])[0]!;
    expect(contest.jurisdictionId).toBe(jurisdictionId);

    const registry = createElectionTransitionRegistry();
    portabilityWorld = advanceWorld(portabilityWorld, 15, registry);

    expect(electionContestStatus(portabilityWorld, contest.id)).toBe(
      "resolved",
    );
    const result = electionContestResult(portabilityWorld, contest.id);
    expect(result).not.toBeNull();
    expect([candidate1, candidate2]).toContain(result?.winnerPersonId);

    // Verify serialization does not introduce unintended Lexington references
    const payload = serializeWorld(portabilityWorld);
    expect(payload).not.toContain("Lexington");
    expect(payload).not.toContain("America/New_York");
    expect(payload).toContain("synthetic-tidal-basin");

    assertWorldIntegrity(portabilityWorld);
  });

  it("10. multiple contests do not collide by ID or state: handles concurrent and staggered contests independently", () => {
    let world = createDemoWorld("election-multiple-contests-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const candidate2 = getPersonId(world, 1);
    const candidate3 = getPersonId(world, 2);
    const candidate4 = getPersonId(world, 3);

    const dateA = addDays(world.currentDate, 7);
    const dateB = addDays(world.currentDate, 14);
    const dateC = addDays(world.currentDate, 21);

    // Schedule 3 separate contests with different offices and dates
    world = scheduleElectionContest(world, {
      stableKey: "multi-contest:seat-1",
      jurisdictionId,
      office: {
        officeKey: "seat-1",
        title: "Seat 1",
        seatKey: "1",
        occupationClassification: null,
      },
      electionDate: dateA,
      candidatePersonIds: [candidate1, candidate2],
      provenance: { method: "authored", sourceEntityIds: [], note: null },
    });

    world = scheduleElectionContest(world, {
      stableKey: "multi-contest:seat-2",
      jurisdictionId,
      office: {
        officeKey: "seat-2",
        title: "Seat 2",
        seatKey: "2",
        occupationClassification: null,
      },
      electionDate: dateB,
      candidatePersonIds: [candidate2, candidate3],
      provenance: { method: "authored", sourceEntityIds: [], note: null },
    });

    world = scheduleElectionContest(world, {
      stableKey: "multi-contest:seat-3",
      jurisdictionId,
      office: {
        officeKey: "seat-3",
        title: "Seat 3",
        seatKey: "3",
        occupationClassification: null,
      },
      electionDate: dateC,
      candidatePersonIds: [candidate3, candidate4],
      provenance: { method: "authored", sourceEntityIds: [], note: null },
    });

    const contests = world.history.electionContests ?? [];
    expect(contests).toHaveLength(3);
    const c1 = contests[0]!;
    const c2 = contests[1]!;
    const c3 = contests[2]!;

    // IDs are strictly unique
    const uniqueIds = new Set([c1.id, c2.id, c3.id]);
    expect(uniqueIds.size).toBe(3);

    const registry = createElectionTransitionRegistry();

    // Advance to date A: only contest 1 resolves
    world = advanceWorld(world, 7, registry);
    expect(electionContestStatus(world, c1.id)).toBe("resolved");
    expect(electionContestStatus(world, c2.id)).toBe("pending");
    expect(electionContestStatus(world, c3.id)).toBe("pending");
    expect(resolvedElectionContests(world)).toHaveLength(1);
    expect(pendingElectionContests(world)).toHaveLength(2);

    // Advance to date B: contest 2 resolves
    world = advanceWorld(world, 7, registry);
    expect(electionContestStatus(world, c1.id)).toBe("resolved");
    expect(electionContestStatus(world, c2.id)).toBe("resolved");
    expect(electionContestStatus(world, c3.id)).toBe("pending");
    expect(resolvedElectionContests(world)).toHaveLength(2);
    expect(pendingElectionContests(world)).toHaveLength(1);

    // Advance to date C: contest 3 resolves
    world = advanceWorld(world, 7, registry);
    expect(electionContestStatus(world, c1.id)).toBe("resolved");
    expect(electionContestStatus(world, c2.id)).toBe("resolved");
    expect(electionContestStatus(world, c3.id)).toBe("resolved");
    expect(resolvedElectionContests(world)).toHaveLength(3);
    expect(pendingElectionContests(world)).toHaveLength(0);

    assertWorldIntegrity(world);
  });

  it("handles uncontested single-candidate elections deterministically", () => {
    let world = createDemoWorld("election-uncontested-seed");
    const jurisdictionId = getJurisdictionId(world);
    const soleCandidate = getPersonId(world, 0);
    const electionDate = addDays(world.currentDate, 5);

    world = scheduleElectionContest(world, {
      stableKey: "uncontested:judge",
      jurisdictionId,
      office: {
        officeKey: "district-judge",
        title: "District Judge",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate,
      candidatePersonIds: [soleCandidate],
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "Uncontested judicial seat",
      },
    });

    const contest = (world.history.electionContests ?? [])[0]!;
    const registry = createElectionTransitionRegistry();
    world = advanceWorld(world, 5, registry);

    const result = electionContestResult(world, contest.id);
    expect(result).not.toBeNull();
    expect(result?.winnerPersonId).toBe(soleCandidate);
    expect(result?.tallies).toEqual([
      {
        candidatePersonId: soleCandidate,
        votes: 1000,
        voteShare: 1.0,
      },
    ]);

    assertWorldIntegrity(world);
  });

  it("supports manual cancellation of a pending contest before election day", () => {
    let world = createDemoWorld("election-cancellation-seed");
    const jurisdictionId = getJurisdictionId(world);
    const candidate1 = getPersonId(world, 0);
    const electionDate = addDays(world.currentDate, 10);

    world = scheduleElectionContest(world, {
      stableKey: "cancelled-race:2026",
      jurisdictionId,
      office: {
        officeKey: "special-commissioner",
        title: "Special Commissioner",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate,
      candidatePersonIds: [candidate1],
      provenance: { method: "authored", sourceEntityIds: [], note: null },
    });

    const contest = (world.history.electionContests ?? [])[0]!;
    expect(electionContestStatus(world, contest.id)).toBe("pending");

    // Cancel contest
    world = cancelElectionContest(world, {
      stableKey: "cancelled-race:2026:cancel",
      contestId: contest.id,
      effectiveAt: world.currentDate,
      reason: "Office was abolished before election",
    });

    expect(electionContestStatus(world, contest.id)).toBe("cancelled");
    expect(isElectionContestPending(world, contest.id)).toBe(false);
    expect(isElectionContestResolved(world, contest.id)).toBe(false);
    expect(electionContestResult(world, contest.id)).toBeNull();

    const dueItem = world.history.futureDueItems.find(
      (item) => item.entityIds[0] === contest.id,
    )!;
    const cancelState = world.history.futureDueItemStates.find(
      (state) => state.dueItemId === dueItem.id && state.status === "cancelled",
    );
    expect(cancelState?.reasonKey).toBe("election:contest-cancelled");

    assertWorldIntegrity(world);
  });

  describe("Blocker 1 Regressions: Election-Date Frontier", () => {
    it("rejects direct resolution before electionDate and leaves World unchanged", () => {
      let world = createDemoWorld("election-early-direct-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 10);

      world = scheduleElectionContest(world, {
        stableKey: "early-test:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;
      const registry = createElectionTransitionRegistry();

      // Advance world 9 days (1 day before electionDate)
      world = advanceWorld(world, 9, registry);
      const preResolveWorld = structuredClone(world);
      const preEventsCount = world.history.events.length;

      // 1. Direct resolution 1 day before electionDate with resolvedAt = currentDate must throw
      expect(() =>
        resolveElectionContest(world, {
          contestId: contest.id,
          resolvedAt: world.currentDate,
        }),
      ).toThrow(/cannot be resolved before its election date/i);

      // 2. Direct resolution 1 day before electionDate with resolvedAt = electionDate must throw (future date relative to world)
      expect(() =>
        resolveElectionContest(world, {
          contestId: contest.id,
          resolvedAt: electionDate,
        }),
      ).toThrow(/cannot be resolved after the current world date/i);

      // World state remains completely unchanged
      expect(world).toStrictEqual(preResolveWorld);
      expect(electionContestStatus(world, contest.id)).toBe("pending");
      expect(electionContestResult(world, contest.id)).toBeNull();
      expect(world.history.electionContestResults ?? []).toHaveLength(0);
      expect(world.history.events).toHaveLength(preEventsCount);
      expect(
        world.history.events.some(
          (e) => e.type === "election.contest-resolved",
        ),
      ).toBe(false);
      assertWorldIntegrity(world);

      // Advance 1 more day to exact electionDate
      world = advanceWorld(world, 1, registry);
      expect(world.currentDate).toBe(electionDate);
      expect(electionContestStatus(world, contest.id)).toBe("resolved");
      expect(electionContestResult(world, contest.id)).not.toBeNull();
      expect(
        world.history.events.filter(
          (e) => e.type === "election.contest-resolved",
        ),
      ).toHaveLength(1);
      assertWorldIntegrity(world);

      // Post-resolution duplicate guard
      expect(() =>
        resolveElectionContest(world, {
          contestId: contest.id,
          resolvedAt: electionDate,
        }),
      ).toThrow(/already resolved/i);
    });

    it("scheduled FutureDue resolves at exact election-date frontier exactly once", () => {
      let world = createDemoWorld("election-future-due-frontier-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "frontier-test:council",
        jurisdictionId,
        office: {
          officeKey: "council",
          title: "Council",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;
      const registry = createElectionTransitionRegistry();

      // Advance 4 days (still pending)
      world = advanceWorld(world, 4, registry);
      expect(electionContestStatus(world, contest.id)).toBe("pending");
      expect(electionContestResult(world, contest.id)).toBeNull();

      // Advance 1 day to election date (resolves exactly once)
      world = advanceWorld(world, 1, registry);
      expect(world.currentDate).toBe(electionDate);
      expect(electionContestStatus(world, contest.id)).toBe("resolved");
      expect(world.history.electionContestResults ?? []).toHaveLength(1);

      // Advance further (remains resolved, exactly 1 result record)
      world = advanceWorld(world, 5, registry);
      expect(electionContestStatus(world, contest.id)).toBe("resolved");
      expect(world.history.electionContestResults ?? []).toHaveLength(1);
      assertWorldIntegrity(world);
    });
  });

  describe("Blocker 2 Regressions: Manual Result Both-Or-Neither Invariant", () => {
    function createManualRegistry(
      override: Partial<ResolveElectionContestInput>,
    ) {
      return createFutureTransitionHandlerRegistry([
        [
          ELECTION_CONTEST_TRANSITION_KEY,
          (w: World, dueItem: FutureDueItem) => {
            const contestId = dueItem.entityIds[0]!;
            const resolvedWorld = resolveElectionContest(w, {
              contestId,
              resolvedAt: dueItem.dueAt,
              ...override,
            });
            const result = electionContestResult(resolvedWorld, contestId)!;
            return {
              world: resolvedWorld,
              status: "resolved",
              reasonKey: null,
              context: "Manual resolution test",
              outcomeEventId: result.outcomeEventId,
            };
          },
        ],
      ]);
    }

    it("rejects winner-only manual result input and leaves World unchanged", () => {
      let world = createDemoWorld("election-winner-only-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "manual-winner-only:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const preState = structuredClone(world);

      // Winner supplied without tallies must throw during resolution transition
      expect(() =>
        advanceWorld(
          world,
          5,
          createManualRegistry({
            winnerPersonId: candidate1,
          }),
        ),
      ).toThrow(/requires both winnerPersonId and tallies/i);

      expect(world).toStrictEqual(preState);
      expect(world.history.electionContestResults ?? []).toHaveLength(0);
      expect(
        world.history.events.some(
          (e) => e.type === "election.contest-resolved",
        ),
      ).toBe(false);
      assertWorldIntegrity(world);
    });

    it("rejects tallies-only manual result input and leaves World unchanged", () => {
      let world = createDemoWorld("election-tallies-only-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "manual-tallies-only:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const preState = structuredClone(world);

      // Tallies supplied without winnerPersonId must throw during transition
      expect(() =>
        advanceWorld(
          world,
          5,
          createManualRegistry({
            tallies: [
              { candidatePersonId: candidate1, votes: 600, voteShare: 0.6 },
              { candidatePersonId: candidate2, votes: 400, voteShare: 0.4 },
            ],
          }),
        ),
      ).toThrow(/requires both winnerPersonId and tallies/i);

      expect(world).toStrictEqual(preState);
      expect(world.history.electionContestResults ?? []).toHaveLength(0);
      expect(
        world.history.events.some(
          (e) => e.type === "election.contest-resolved",
        ),
      ).toBe(false);
      assertWorldIntegrity(world);
    });

    it("rejects mismatch between supplied winner and highest tally and leaves World unchanged", () => {
      let world = createDemoWorld("election-mismatch-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "manual-mismatch:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const preState = structuredClone(world);

      // candidate1 specified as winner, but candidate2 has higher votes
      expect(() =>
        advanceWorld(
          world,
          5,
          createManualRegistry({
            winnerPersonId: candidate1,
            tallies: [
              { candidatePersonId: candidate1, votes: 300, voteShare: 0.3 },
              { candidatePersonId: candidate2, votes: 700, voteShare: 0.7 },
            ],
          }),
        ),
      ).toThrow(/does not match highest vote tally/i);

      expect(world).toStrictEqual(preState);
      expect(world.history.electionContestResults ?? []).toHaveLength(0);
      assertWorldIntegrity(world);
    });

    it("accepts valid both winner and tallies manual override", () => {
      let world = createDemoWorld("election-valid-manual-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "manual-valid:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;

      const manualTallies = [
        { candidatePersonId: candidate1, votes: 750, voteShare: 0.75 },
        { candidatePersonId: candidate2, votes: 250, voteShare: 0.25 },
      ];

      const resolvedWorld = advanceWorld(
        world,
        5,
        createManualRegistry({
          winnerPersonId: candidate1,
          tallies: manualTallies,
        }),
      );

      const result = electionContestResult(resolvedWorld, contest.id);
      expect(result).not.toBeNull();
      expect(result?.winnerPersonId).toBe(candidate1);
      expect(result?.tallies).toEqual(manualTallies);
      assertWorldIntegrity(resolvedWorld);
    });

    it("accepts manual tied maximum with winner listed first or second, and rejects lower vote totals", () => {
      let world = createDemoWorld("election-tied-max-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "tied-max:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;

      // Case 1: Tied max tallies with candidate1 first, candidate1 as winner
      const tiedTalliesOrderA = [
        { candidatePersonId: candidate1, votes: 500, voteShare: 0.5 },
        { candidatePersonId: candidate2, votes: 500, voteShare: 0.5 },
      ];

      const resolvedWorldA = advanceWorld(
        world,
        5,
        createManualRegistry({
          winnerPersonId: candidate1,
          tallies: tiedTalliesOrderA,
        }),
      );

      expect(electionContestStatus(resolvedWorldA, contest.id)).toBe(
        "resolved",
      );
      expect(
        electionContestResult(resolvedWorldA, contest.id)?.winnerPersonId,
      ).toBe(candidate1);
      assertWorldIntegrity(resolvedWorldA);

      // Case 2: Tied max tallies with candidate2 first, candidate1 still as winner
      const tiedTalliesOrderB = [
        { candidatePersonId: candidate2, votes: 500, voteShare: 0.5 },
        { candidatePersonId: candidate1, votes: 500, voteShare: 0.5 },
      ];

      const resolvedWorldB = advanceWorld(
        world,
        5,
        createManualRegistry({
          winnerPersonId: candidate1,
          tallies: tiedTalliesOrderB,
        }),
      );

      expect(electionContestStatus(resolvedWorldB, contest.id)).toBe(
        "resolved",
      );
      expect(
        electionContestResult(resolvedWorldB, contest.id)?.winnerPersonId,
      ).toBe(candidate1);
      assertWorldIntegrity(resolvedWorldB);

      // Verify deserialization and round trip of tied max world
      const reloadedWorldB = deserializeWorld(serializeWorld(resolvedWorldB));
      assertWorldIntegrity(reloadedWorldB);

      // Case 3: Winner has fewer votes than max (499 vs 500) throws
      expect(() =>
        advanceWorld(
          world,
          5,
          createManualRegistry({
            winnerPersonId: candidate1,
            tallies: [
              { candidatePersonId: candidate1, votes: 499, voteShare: 0.499 },
              { candidatePersonId: candidate2, votes: 500, voteShare: 0.501 },
            ],
          }),
        ),
      ).toThrow(/does not match highest vote tally/i);

      // Case 4: Corrupted persisted result where winner has fewer votes than max is rejected by assertWorldIntegrity
      const corruptedWorld = structuredClone(resolvedWorldA);
      const corruptedResult =
        corruptedWorld.history.electionContestResults![0]!;
      // Mutate result tallies so winner (candidate1) has 400 while candidate2 has 600
      (corruptedResult as { tallies: unknown }).tallies = [
        { candidatePersonId: candidate1, votes: 400, voteShare: 0.4 },
        { candidatePersonId: candidate2, votes: 600, voteShare: 0.6 },
      ];

      expect(() => assertWorldIntegrity(corruptedWorld)).toThrow(
        /winner does not match top tally candidate/i,
      );
      const validSnapshotA = JSON.parse(serializeWorld(resolvedWorldA));
      validSnapshotA.world.history.electionContestResults[0].tallies = [
        { candidatePersonId: candidate1, votes: 400, voteShare: 0.4 },
        { candidatePersonId: candidate2, votes: 600, voteShare: 0.6 },
      ];
      expect(() => deserializeWorld(JSON.stringify(validSnapshotA))).toThrow(
        /winner does not match top tally candidate/i,
      );
    });
  });

  describe("Defect 1 Regressions: Persisted Result Chronology Integrity Mirror", () => {
    it("rejects corrupted persisted results resolved before electionDate and accepts valid/later resolutions", () => {
      const dbPath = `:memory:`;
      const repository = new SqliteWorldRepository(dbPath);

      let world = createDemoWorld("election-persisted-chronology-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const scheduledDate = world.currentDate;
      const electionDate = addDays(scheduledDate, 10);

      world = scheduleElectionContest(world, {
        stableKey: "chronology-integrity:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;
      const registry = createElectionTransitionRegistry();

      // Advance to election date (day 10) so it resolves legitimately
      world = advanceWorld(world, 10, registry);
      expect(electionContestStatus(world, contest.id)).toBe("resolved");
      assertWorldIntegrity(world);

      // 1. Corrupt result.resolvedAt to day 5 (after scheduledAt, but before electionDate)
      const corruptedWorld = structuredClone(world);
      const corruptedResult =
        corruptedWorld.history.electionContestResults![0]!;
      const earlyResolvedAt = addDays(scheduledDate, 5);
      (corruptedResult as { resolvedAt: string }).resolvedAt = earlyResolvedAt;

      // Update the outcome event occurredAt to match earlyResolvedAt so event integrity passes
      const outcomeEvent = corruptedWorld.history.events.find(
        (e) => e.id === corruptedResult.outcomeEventId,
      )!;
      (outcomeEvent as { occurredAt: string }).occurredAt = earlyResolvedAt;

      // 2. assertWorldIntegrity() rejects with election date check
      expect(() => assertWorldIntegrity(corruptedWorld)).toThrow(
        /Election contest result resolved before election date/i,
      );

      // 3. deserializeWorld() rejects corrupted serialized payload
      const validSnapshot = JSON.parse(serializeWorld(world));
      validSnapshot.world.history.electionContestResults[0].resolvedAt =
        earlyResolvedAt;
      const outcomeEventId =
        validSnapshot.world.history.electionContestResults[0].outcomeEventId;
      const eventToMutate = validSnapshot.world.history.events.find(
        (e: { id: string }) => e.id === outcomeEventId,
      );
      if (eventToMutate) eventToMutate.occurredAt = earlyResolvedAt;
      expect(() => deserializeWorld(JSON.stringify(validSnapshot))).toThrow(
        /Election contest result resolved before election date/i,
      );

      // 4. Persistence round-trip rejects saving corrupted world
      expect(() => repository.save(corruptedWorld)).toThrow(
        /Election contest result resolved before election date/i,
      );

      // 5. Exact election date result passes cleanly
      assertWorldIntegrity(world);
      const roundTrippedWorld = deserializeWorld(serializeWorld(world));
      assertWorldIntegrity(roundTrippedWorld);

      // 6. Legitimate later resolution (e.g. electionDate + 2 days for certification) passes
      let worldLater = createDemoWorld("election-later-certification-seed");
      const jurisdictionLater = getJurisdictionId(worldLater);
      const candidateLater1 = getPersonId(worldLater, 0);
      const candidateLater2 = getPersonId(worldLater, 1);
      const electionDateLater = addDays(worldLater.currentDate, 10);

      worldLater = scheduleElectionContest(worldLater, {
        stableKey: "later-cert:mayor",
        jurisdictionId: jurisdictionLater,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate: electionDateLater,
        candidatePersonIds: [candidateLater1, candidateLater2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contestLater = (worldLater.history.electionContests ?? [])[0]!;

      // Advance world 12 days (2 days after electionDate) and manually certify on certDate
      const certDate = addDays(electionDateLater, 2);
      const certificationHoldingRegistry =
        createFutureTransitionHandlerRegistry([
          [
            ELECTION_CONTEST_TRANSITION_KEY,
            (w: World) => ({
              world: w,
              status: "resolved" as const,
              reasonKey: null,
              context: "Awaiting post-election manual certification",
              outcomeEventId: null,
            }),
          ],
        ]);

      worldLater = advanceWorld(worldLater, 12, certificationHoldingRegistry);
      expect(worldLater.currentDate).toBe(certDate);

      worldLater = resolveElectionContest(worldLater, {
        contestId: contestLater.id,
        resolvedAt: certDate,
        provenance: {
          method: "manual",
          sourceEntityIds: [],
          note: "Official certification 2 days after election",
        },
      });

      expect(electionContestStatus(worldLater, contestLater.id)).toBe(
        "resolved",
      );
      expect(
        electionContestResult(worldLater, contestLater.id)?.resolvedAt,
      ).toBe(certDate);
      assertWorldIntegrity(worldLater);

      repository.save(worldLater);
      const loadedLater = repository.load(worldLater.id);
      expect(loadedLater).not.toBeNull();
      assertWorldIntegrity(loadedLater!);
    });
  });

  describe("ELEC-004 & ELEC-005: Terminal Cancellation and Correct Semantic Reason Key", () => {
    it("ELEC-004: cancelled contest cannot resolve and rejects corrupted persisted cancelled+resolved state", () => {
      const dbPath = `:memory:`;
      const repository = new SqliteWorldRepository(dbPath);

      let world = createDemoWorld("election-terminal-cancel-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 10);

      // 1. Schedule contest
      world = scheduleElectionContest(world, {
        stableKey: "terminal-cancel:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;

      // 2. Cancel contest
      world = cancelElectionContest(world, {
        stableKey: "terminal-cancel:mayor:cancel",
        contestId: contest.id,
        effectiveAt: world.currentDate,
        reason: "Election cancelled due to charter reform",
      });

      expect(electionContestStatus(world, contest.id)).toBe("cancelled");
      expect(isElectionContestPending(world, contest.id)).toBe(false);
      expect(isElectionContestResolved(world, contest.id)).toBe(false);

      // Advance world to election date
      const registry = createElectionTransitionRegistry();
      world = advanceWorld(world, 10, registry);
      expect(world.currentDate).toBe(electionDate);
      expect(electionContestStatus(world, contest.id)).toBe("cancelled");

      const preResolveAttempt = structuredClone(world);

      // 3. Direct resolve on cancelled contest must throw
      expect(() =>
        resolveElectionContest(world, {
          contestId: contest.id,
          resolvedAt: electionDate,
        }),
      ).toThrow(/Cannot resolve a cancelled election contest/i);

      // 4. Rejected call leaves World unchanged
      expect(world).toStrictEqual(preResolveAttempt);
      expect(electionContestResult(world, contest.id)).toBeNull();
      expect(world.history.electionContestResults ?? []).toHaveLength(0);
      expect(
        world.history.events.some(
          (e) => e.type === "election.contest-resolved",
        ),
      ).toBe(false);
      expect(electionContestStatus(world, contest.id)).toBe("cancelled");

      // 5. Serialization and SQLite round trip preserve cancellation
      const deserializedWorld = deserializeWorld(serializeWorld(world));
      expect(electionContestStatus(deserializedWorld, contest.id)).toBe(
        "cancelled",
      );
      assertWorldIntegrity(deserializedWorld);

      repository.save(world);
      const loadedWorld = repository.load(world.id);
      expect(loadedWorld).not.toBeNull();
      expect(electionContestStatus(loadedWorld!, contest.id)).toBe("cancelled");
      assertWorldIntegrity(loadedWorld!);

      // 6. Corrupted persisted state with both cancellation and result record is rejected by assertWorldIntegrity
      const validWorld = createDemoWorld("election-valid-resolution-seed");
      const cand1 = getPersonId(validWorld, 0);
      const cand2 = getPersonId(validWorld, 1);
      const validElectDate = addDays(validWorld.currentDate, 5);

      let resolvedWorld = scheduleElectionContest(validWorld, {
        stableKey: "corrupt-cancel-test",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate: validElectDate,
        candidatePersonIds: [cand1, cand2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });
      resolvedWorld = advanceWorld(resolvedWorld, 5, registry);
      expect(
        electionContestStatus(
          resolvedWorld,
          resolvedWorld.history.electionContests![0]!.id,
        ),
      ).toBe("resolved");

      // Corrupt the resolved world to mark the due item state as cancelled
      const corruptCancelledAndResolved: World = {
        ...resolvedWorld,
        history: {
          ...resolvedWorld.history,
          nextSequence: resolvedWorld.history.nextSequence + 1,
          futureDueItemStates: [
            ...resolvedWorld.history.futureDueItemStates,
            {
              id: createStableId("future-due-item-state", "corrupt:state"),
              stableKey: "corrupt:state",
              sequence: resolvedWorld.history.nextSequence,
              dueItemId: resolvedWorld.history.futureDueItems[0]!.id,
              effectiveAt: validElectDate,
              status: "cancelled",
              reasonKey: "election:contest-cancelled",
              context: "Corrupted cancellation injection",
              outcomeEventId: null,
              supersedesStateId: null,
            },
          ],
        },
      };

      expect(() => assertWorldIntegrity(corruptCancelledAndResolved)).toThrow(
        /Election contest result exists for cancelled contest/i,
      );
    });

    it("ELEC-005: cancellation records semantic election:contest-cancelled reasonKey", () => {
      let world = createDemoWorld("election-reason-key-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const electionDate = addDays(world.currentDate, 10);

      world = scheduleElectionContest(world, {
        stableKey: "cancel-reason:judge",
        jurisdictionId,
        office: {
          officeKey: "judge",
          title: "Judge",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;
      world = cancelElectionContest(world, {
        stableKey: "cancel-reason:judge:cancel",
        contestId: contest.id,
        effectiveAt: world.currentDate,
        reason: "Judicial seat abolished",
      });

      const dueItem = world.history.futureDueItems.find(
        (item) => item.entityIds[0] === contest.id,
      )!;
      const cancellationState = world.history.futureDueItemStates.find(
        (state) =>
          state.dueItemId === dueItem.id && state.status === "cancelled",
      );

      expect(cancellationState).toBeDefined();
      expect(cancellationState?.reasonKey).toBe("election:contest-cancelled");
      expect(cancellationState?.reasonKey).not.toContain(
        "policy:superseded-estimate",
      );
      assertWorldIntegrity(world);
    });
  });

  describe("ELEC-006 & ELEC-007: Truthful Default Provenance and Tallies Immutability", () => {
    it("ELEC-006: defaults provenance truthfully to manual for manual results and simulated for simulated results", () => {
      let world = createDemoWorld("election-default-provenance-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      // 1. Simulated path (no winner/tallies, no provenance provided)
      world = scheduleElectionContest(world, {
        stableKey: "sim-prov:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contestSim = (world.history.electionContests ?? [])[0]!;
      const holdingRegistry = createFutureTransitionHandlerRegistry([
        [
          ELECTION_CONTEST_TRANSITION_KEY,
          (w) => ({
            world: w,
            status: "resolved" as const,
            reasonKey: null,
            context: "Awaiting manual test invocation",
            outcomeEventId: null,
          }),
        ],
      ]);
      world = advanceWorld(world, 5, holdingRegistry);

      world = resolveElectionContest(world, {
        contestId: contestSim.id,
        resolvedAt: electionDate,
      });

      const simResult = electionContestResult(world, contestSim.id);
      expect(simResult).not.toBeNull();
      expect(simResult?.provenance.method).toBe("simulated");
      expect(simResult?.provenance.note).toBe(
        "Resolved via deterministic contest substrate.",
      );

      // 2. Manual path (winner + tallies provided, provenance omitted)
      const electionDate2 = addDays(world.currentDate, 5);
      world = scheduleElectionContest(world, {
        stableKey: "man-prov:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor-2",
          title: "Mayor 2",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate: electionDate2,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contestManual = (world.history.electionContests ?? [])[1]!;
      world = advanceWorld(world, 5, holdingRegistry);

      world = resolveElectionContest(world, {
        contestId: contestManual.id,
        resolvedAt: electionDate2,
        winnerPersonId: candidate1,
        tallies: [
          {
            candidatePersonId: candidate1,
            votes: 700,
            voteShare: 0.7,
          },
          {
            candidatePersonId: candidate2,
            votes: 300,
            voteShare: 0.3,
          },
        ],
      });

      const manualResult = electionContestResult(world, contestManual.id);
      expect(manualResult).not.toBeNull();
      expect(manualResult?.provenance.method).toBe("manual");
      expect(manualResult?.provenance.note).toBe(
        "Resolved via manual candidate tally override.",
      );
      assertWorldIntegrity(world);
    });

    it("ELEC-007: clones caller-owned manual tallies and isolates World from subsequent caller mutation", () => {
      let world = createDemoWorld("election-tally-cloning-seed");
      const jurisdictionId = getJurisdictionId(world);
      const candidate1 = getPersonId(world, 0);
      const candidate2 = getPersonId(world, 1);
      const electionDate = addDays(world.currentDate, 5);

      world = scheduleElectionContest(world, {
        stableKey: "tally-clone:mayor",
        jurisdictionId,
        office: {
          officeKey: "mayor",
          title: "Mayor",
          seatKey: null,
          occupationClassification: null,
        },
        electionDate,
        candidatePersonIds: [candidate1, candidate2],
        provenance: { method: "authored", sourceEntityIds: [], note: null },
      });

      const contest = (world.history.electionContests ?? [])[0]!;

      const callerTally1 = {
        candidatePersonId: candidate1,
        votes: 800,
        voteShare: 0.8,
      };
      const callerTally2 = {
        candidatePersonId: candidate2,
        votes: 200,
        voteShare: 0.2,
      };
      const callerTallies = [callerTally1, callerTally2];

      const resolvedWorld = advanceWorld(
        world,
        5,
        createFutureTransitionHandlerRegistry([
          [
            ELECTION_CONTEST_TRANSITION_KEY,
            (w, dueItem) => {
              const resolved = resolveElectionContest(w, {
                contestId: dueItem.entityIds[0]!,
                resolvedAt: dueItem.dueAt,
                winnerPersonId: candidate1,
                tallies: callerTallies,
              });
              const res = electionContestResult(
                resolved,
                dueItem.entityIds[0]!,
              )!;
              return {
                world: resolved,
                status: "resolved",
                reasonKey: null,
                context: "Tally cloning test",
                outcomeEventId: res.outcomeEventId,
              };
            },
          ],
        ]),
      );

      const initialSnapshot = serializeWorld(resolvedWorld);

      // Mutate the caller's original objects and array
      callerTally1.votes = 0;
      callerTally1.voteShare = 0;
      callerTally2.votes = 999999;
      callerTallies.reverse();
      callerTallies.push({
        candidatePersonId: candidate1,
        votes: 12345,
        voteShare: 0.5,
      });

      // Canonical World result remains byte-for-byte identical
      const postMutationSnapshot = serializeWorld(resolvedWorld);
      expect(postMutationSnapshot).toBe(initialSnapshot);

      const result = electionContestResult(resolvedWorld, contest.id);
      expect(result?.tallies[0]?.votes).toBe(800);
      expect(result?.tallies[1]?.votes).toBe(200);
      expect(result?.tallies).toHaveLength(2);
      assertWorldIntegrity(resolvedWorld);
    });
  });
});
