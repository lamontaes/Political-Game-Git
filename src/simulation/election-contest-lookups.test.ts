import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { createDemoWorld } from "./demo";
import {
  cancelElectionContest,
  electionContestById,
  electionContestResult,
  electionContestStatus,
  scheduleElectionContest,
} from "./election-contests";
import { appendedList } from "./history-index";
import { createStableId } from "./ids";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { ElectionContestResultRecord, World } from "./types";

function scheduledWorld() {
  const base = createDemoWorld("session5-election-lookup");
  return scheduleElectionContest(base, {
    stableKey: "lookup:mayor",
    jurisdictionId: base.jurisdictionOrder[0]!,
    office: {
      officeKey: "mayor",
      title: "Mayor",
      seatKey: null,
      occupationClassification: "occupation:elected-official",
    },
    electionDate: addDays(base.currentDate, 30),
    candidatePersonIds: base.personOrder.slice(0, 2),
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Lookup control",
    },
  });
}

function cancelled(world: World, stableKey: string) {
  return cancelElectionContest(world, {
    stableKey,
    contestId: world.history.electionContests![0]!.id,
    effectiveAt: world.currentDate,
    reason: "Lookup control cancellation",
  });
}

describe("append-aware election contest lookups", () => {
  it("preserves original snapshots, divergent appends and canonical reload", () => {
    const original = scheduledWorld();
    const contest = original.history.electionContests![0]!;
    expect(electionContestStatus(original, contest.id)).toBe("pending");
    const left = cancelled(original, "lookup:left");
    expect(electionContestStatus(left, contest.id)).toBe("cancelled");
    expect(electionContestStatus(original, contest.id)).toBe("pending");
    const right = cancelled(original, "lookup:right");
    expect(electionContestStatus(right, contest.id)).toBe("cancelled");
    expect(electionContestStatus(left, contest.id)).toBe("cancelled");
    const loaded = deserializeWorld(serializeWorld(right));
    expect(electionContestStatus(loaded, contest.id)).toBe("cancelled");
    expect(electionContestById(loaded, contest.id)).toEqual(contest);
    expect(electionContestResult(loaded, contest.id)).toBeNull();
    expect(
      electionContestById(loaded, createStableId("lookup", "missing")),
    ).toBeNull();
    expect(
      electionContestResult(loaded, createStableId("lookup", "missing")),
    ).toBeNull();
  });

  it("preserves first contest/result/due-item order even in duplicate reader inputs", () => {
    const world = scheduledWorld();
    const contest = world.history.electionContests![0]!;
    const item = world.history.futureDueItems.find(
      (row) => row.entityIds[0] === contest.id,
    )!;
    const result: ElectionContestResultRecord = {
      id: createStableId("lookup", "lookup:result"),
      stableKey: "lookup:result",
      sequence: 1,
      contestId: contest.id,
      resolvedAt: contest.electionDate,
      winnerPersonId: contest.candidatePersonIds[0]!,
      tallies: [],
      outcomeEventId: createStableId("lookup", "lookup:outcome"),
      provenance: contest.provenance,
    };
    // Deliberately malformed reader controls; these are never canonical writer inputs.
    const input: World = {
      ...world,
      history: {
        ...world.history,
        electionContests: appendedList(world.history.electionContests!, [
          { ...contest, stableKey: "duplicate" },
        ]),
        electionContestResults: [
          result,
          { ...result, id: createStableId("lookup", "lookup:later-result") },
        ],
        futureDueItems: appendedList(world.history.futureDueItems, [
          { ...item, id: createStableId("lookup", "lookup:later-item") },
        ]),
        futureDueItemStates: [
          {
            ...world.history.futureDueItemStates[0]!,
            dueItemId: createStableId("lookup", "lookup:later-item"),
            status: "cancelled",
          },
        ],
      },
    };
    expect(electionContestById(input, contest.id)).toBe(contest);
    expect(electionContestResult(input, contest.id)).toBe(result);
    expect(electionContestStatus(input, contest.id)).toBe("resolved");
    const cancelledInput: World = {
      ...input,
      history: {
        ...input.history,
        futureDueItemStates: [
          {
            ...world.history.futureDueItemStates[0]!,
            dueItemId: item.id,
            status: "cancelled",
          },
        ],
      },
    };
    expect(electionContestStatus(cancelledInput, contest.id)).toBe("cancelled");
    const absentFamilies: World = {
      ...world,
      history: {
        ...world.history,
        electionContests: undefined,
        electionContestResults: undefined,
      },
    };
    expect(electionContestById(absentFamilies, contest.id)).toBeNull();
    expect(electionContestResult(absentFamilies, contest.id)).toBeNull();
  });

  it("selects greatest sequence and the last equal sequence, with cancellation before result", () => {
    const world = scheduledWorld();
    const contest = world.history.electionContests![0]!;
    const state = world.history.futureDueItemStates[0]!;
    const read = (statuses: readonly ("scheduled" | "cancelled")[]) => ({
      ...world,
      history: {
        ...world.history,
        futureDueItemStates: statuses.map((status, at) => ({
          ...state,
          id: createStableId("lookup", `state:${at}`),
          sequence: at === 0 ? 99 : 50,
          status,
        })),
      },
    });
    expect(
      electionContestStatus(read(["cancelled", "scheduled"]), contest.id),
    ).toBe("cancelled");
    const tied: World = {
      ...world,
      history: {
        ...world.history,
        futureDueItemStates: [
          { ...state, sequence: 99, status: "cancelled" },
          { ...state, sequence: 99, status: "scheduled" },
        ],
      },
    };
    expect(electionContestStatus(tied, contest.id)).toBe("pending");
    const appended: World = {
      ...tied,
      history: {
        ...tied.history,
        futureDueItemStates: appendedList(tied.history.futureDueItemStates, [
          { ...state, sequence: 99, status: "cancelled" },
        ]),
      },
    };
    expect(electionContestStatus(appended, contest.id)).toBe("cancelled");
    expect(electionContestStatus(tied, contest.id)).toBe("pending");
  });
});
