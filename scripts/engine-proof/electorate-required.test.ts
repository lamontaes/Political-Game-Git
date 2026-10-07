import { beforeAll, describe, expect, it } from "vitest";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { createDemoWorld } from "../../src/simulation/demo";
import {
  electionContestResult,
  electionContestStatus,
  electionContestTransitionHandler,
  evaluateDeterministicContestOutcome,
  requireElectionContest,
  resolveElectionContest,
  scheduleElectionContest,
} from "../../src/simulation/election-contests";
import {
  createLightweightPerson,
  personName,
} from "../../src/simulation/people";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { statewideElectorate } from "../../src/simulation/statewide-electorate";
import { isTerritoryUsps } from "../../src/simulation/state-reference";
import { chiefExecutiveJurisdictionId } from "../../src/simulation/nationwide-world/government-jurisdiction";
import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  stateExecutiveIdentity,
} from "../../src/simulation/nationwide-world/state-executive-candidacy-packs";
import type {
  ElectionContestRecord,
  EntityId,
  World,
} from "../../src/simulation/types";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
} from "../../src/simulation/world";

let fixture: World;
beforeAll(() => {
  fixture = createDemoWorld("audit-a110-no-fabricated-electorate");
});

/** Authored on-date snapshot for direct writer tests, not a natural clock run. */
function onElectionDate(world: World): World {
  const contest = world.history.electionContests!.at(-1)!;
  return {
    ...world,
    currentDate: contest.electionDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      contest.electionDate,
    ),
  };
}

function localContest(candidates: number): World {
  return scheduleElectionContest(fixture, {
    stableKey: `a110:no-electorate:${candidates}`,
    jurisdictionId: fixture.jurisdictionOrder[0]!,
    office: {
      officeKey: "a110-authored-mayor",
      title: "Authored mayor fixture",
      seatKey: null,
      occupationClassification: "occupation:elected-official",
    },
    electionDate: addDays(fixture.currentDate, 1),
    candidatePersonIds: fixture.personOrder.slice(0, candidates),
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "The Lexington-Fayette placeholder has no admitted electorate; this does not assert local authority.",
    },
  });
}

describe("A110 automatic counts require an electorate", () => {
  it.each([1, 2])(
    "does not invent ballots for %i unsupported candidate(s)",
    (candidates) => {
      const world = localContest(candidates);
      const contest = world.history.electionContests!.at(-1)!;
      console.log(
        JSON.stringify({
          a110Unsupported: {
            place: world.jurisdictions[contest.jurisdictionId]!.name,
            candidates: contest.candidatePersonIds.map((id) => ({
              id,
              name: personName(world.people[id]!),
            })),
            result: evaluateDeterministicContestOutcome(world, contest),
          },
        }),
      );
      expect(evaluateDeterministicContestOutcome(world, contest)).toBeNull();
    },
  );

  it("keeps unsupported automatic resolution pending with no event or result, including after reload", () => {
    const world = onElectionDate(localContest(2));
    const contest = world.history.electionContests!.at(-1)!;
    const saved = serializeWorld(world);
    const next = resolveElectionContest(world, { contestId: contest.id });
    expect(next).toBe(world);
    expect(electionContestStatus(next, contest.id)).toBe("pending");
    expect(electionContestResult(next, contest.id)).toBeNull();
    expect(next.history.events).toEqual(world.history.events);
    expect(next.history.nextSequence).toBe(world.history.nextSequence);
    const loaded = deserializeWorld(saved);
    expect(
      serializeWorld(resolveElectionContest(loaded, { contestId: contest.id })),
    ).toBe(saved);
  });

  it("blocks the existing scheduled handler without manufacturing a winner or future retry", () => {
    const world = onElectionDate(localContest(2));
    const due = world.history.futureDueItems.at(-1)!;
    const result = electionContestTransitionHandler(world, due);
    expect(result.status).toBe("blocked");
    expect(result.reasonKey).toBe("election:count-unavailable");
    expect(result.outcomeEventId).toBeNull();
    expect(result.world).toBe(world);
    expect(result.world.history.futureDueItems).toEqual(
      world.history.futureDueItems,
    );
    expect(electionContestResult(result.world, due.entityIds[0]!)).toBeNull();
    expect(electionContestTransitionHandler(result.world, due)).toEqual(result);
  });

  it("still accepts an explicit supplied tally and preserves duplicate-result protection", () => {
    const world = onElectionDate(localContest(2));
    const contest = world.history.electionContests!.at(-1)!;
    const [winner, loser] = contest.candidatePersonIds;
    const resolved = resolveElectionContest(world, {
      contestId: contest.id,
      winnerPersonId: winner!,
      tallies: [
        { candidatePersonId: winner!, votes: 3, voteShare: 0.75 },
        { candidatePersonId: loser!, votes: 1, voteShare: 0.25 },
      ],
      provenance: {
        method: "manual",
        sourceEntityIds: [contest.id],
        note: "Explicit authored tally; no turnout estimate.",
      },
    });
    expect(electionContestResult(resolved, contest.id)!.winnerPersonId).toBe(
      winner,
    );
    expect(
      electionContestResult(resolved, contest.id)!.tallies.map(
        (row) => row.votes,
      ),
    ).toEqual([3, 1]);
    expect(electionContestStatus(resolved, contest.id)).toBe("resolved");
    expect(
      resolved.history.events.filter(
        (row) => row.type === "election.contest-resolved",
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(resolved);
    expect(() =>
      resolveElectionContest(resolved, { contestId: contest.id }),
    ).toThrow("already resolved");
  });

  it("retains the supplied-tally highest-vote guard", () => {
    const world = onElectionDate(localContest(2));
    const contest = world.history.electionContests!.at(-1)!;
    const [lower, higher] = contest.candidatePersonIds;
    expect(() =>
      resolveElectionContest(world, {
        contestId: contest.id,
        winnerPersonId: lower!,
        tallies: [
          { candidatePersonId: lower!, votes: 1, voteShare: 0.25 },
          { candidatePersonId: higher!, votes: 3, voteShare: 0.75 },
        ],
      }),
    ).toThrow("does not match highest vote tally");
    expect(electionContestResult(world, contest.id)).toBeNull();
  });

  it.each([1, 2])(
    "does not borrow statewide ballots for %i candidate(s) in an unknown office or seat",
    (candidates) => {
      const world = localContest(candidates);
      const contest = world.history.electionContests!.at(-1)!;
      const jurisdictionId = chiefExecutiveJurisdictionId("OR")!;
      expect(
        evaluateDeterministicContestOutcome(world, {
          ...contest,
          jurisdictionId,
        }),
      ).toBeNull();
      expect(
        evaluateDeterministicContestOutcome(world, {
          ...contest,
          jurisdictionId,
          office: {
            ...contest.office,
            officeKey: stateExecutiveIdentity("OR")!.officeKey,
            seatKey: "a110:no-recorded-seat",
          },
        }),
      ).toBeNull();
    },
  );

  it("uses existing calibrated ballots for a single supported candidate in 51 jurisdictions and refuses the five unsupported territories", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    const scheduled = localContest(1);
    const template = requireElectionContest(
      scheduled,
      scheduled.history.electionContests!.at(-1)!.id,
    );
    let supported = 0;
    let unsupported = 0;
    for (const usps of CHIEF_EXECUTIVE_JURISDICTIONS) {
      const jurisdictionId = chiefExecutiveJurisdictionId(usps)!;
      const contest: ElectionContestRecord = {
        ...template,
        jurisdictionId,
        office: {
          ...template.office,
          officeKey: stateExecutiveIdentity(usps)!.officeKey,
        },
      };
      const outcome = evaluateDeterministicContestOutcome(scheduled, contest);
      if (isTerritoryUsps(usps)) {
        unsupported++;
        expect(outcome, usps).toBeNull();
      } else {
        supported++;
        const electorate = statewideElectorate(scheduled, jurisdictionId)!;
        expect(outcome, usps).not.toBeNull();
        expect(outcome!.winnerPersonId, usps).toBe(
          template.candidatePersonIds[0],
        );
        expect(outcome!.tallies, usps).toEqual([
          {
            candidatePersonId: template.candidatePersonIds[0] as EntityId,
            votes: electorate.ballots,
            voteShare: 1,
          },
        ]);
      }
    }
    expect(supported).toBe(51);
    expect(unsupported).toBe(5);
  });
});

describe("A110 saved unsupported contests across all 56 jurisdictions", () => {
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "%s preserves actual pending contests, due items and reload without invented ballots",
    (usps) => {
      const seed = `a110-saved-electorate-refusal:${usps}`;
      const currentDate = fixture.currentDate;
      const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
      expect(jurisdiction, usps).toBeDefined();
      const initial = createWorld({
        seed,
        currentDate,
        jurisdictions: [jurisdiction!],
        people: [0, 1].map((index) =>
          createLightweightPerson({
            worldId: createWorldId(seed),
            worldSeed: seed,
            index,
            profile: "stress",
            currentDate,
            homeJurisdictionId: jurisdiction!.id,
          }),
        ),
      });
      for (const candidates of [1, 2]) {
        const scheduled = scheduleElectionContest(initial, {
          stableKey: `a110:saved-refusal:${candidates}`,
          jurisdictionId: jurisdiction!.id,
          office: {
            officeKey: "a110-authored-no-electorate",
            title: "Authored unsupported-office fixture",
            seatKey: null,
            occupationClassification: "occupation:elected-official",
          },
          electionDate: addDays(currentDate, 1),
          candidatePersonIds: initial.personOrder.slice(0, candidates),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "This fixture proves missing-electorate refusal, not local-office authority or turnout.",
          },
        });
        const world = onElectionDate(scheduled);
        const contest = world.history.electionContests!.at(-1)!;
        const due = world.history.futureDueItems.at(-1)!;
        expect(
          evaluateDeterministicContestOutcome(world, contest),
          usps,
        ).toBeNull();
        const saved = serializeWorld(world);
        expect(resolveElectionContest(world, { contestId: contest.id })).toBe(
          world,
        );
        const blocked = electionContestTransitionHandler(world, due);
        expect(blocked.status).toBe("blocked");
        expect(blocked.reasonKey).toBe("election:count-unavailable");
        expect(blocked.outcomeEventId).toBeNull();
        expect(blocked.world).toBe(world);
        expect(electionContestStatus(world, contest.id)).toBe("pending");
        expect(electionContestResult(world, contest.id)).toBeNull();
        expect(world.history.futureDueItems).toEqual(
          scheduled.history.futureDueItems,
        );
        expect(serializeWorld(world)).toBe(saved);
        const continued = deserializeWorld(saved);
        const continuedDue = continued.history.futureDueItems.find(
          (row) => row.id === due.id,
        )!;
        expect(
          electionContestTransitionHandler(continued, continuedDue).status,
        ).toBe("blocked");
        expect(
          serializeWorld(
            resolveElectionContest(continued, { contestId: contest.id }),
          ),
        ).toBe(saved);
        expect(serializeWorld(continued)).toBe(saved);
      }
    },
  );

  it.todo(
    "ordinary local election play counts from an admitted town electorate and candidate support; the missing electorate producer is not replaced by a tally fixture",
  );
});
