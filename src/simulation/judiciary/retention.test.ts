import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { createDemoWorld } from "../demo";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { addJudicialCourt, seatHolderAt, seatJudge } from "./courts";
import {
  JUDICIAL_RETENTION_ELECTION,
  judicialRetentionElectionHandler,
  scheduleJudicialRetentionElection,
} from "./retention";
import { judicialSeatId } from "./types";

describe("judicial retention election", () => {
  it("counts a yes/no ballot on Day and keeps the seat result through a save", () => {
    let world = ensureStateJurisdictionForKey(
      createDemoWorld("judicial-retention-day", { peopleCount: 3 }),
      "US-IL",
    );
    const courtId = "fixture:illinois-highest";
    const seatId = judicialSeatId(courtId, 1);
    const electionDate = addDays(world.currentDate, 1);
    world = addJudicialCourt(world, {
      courtId,
      jurisdictionId: chiefExecutiveJurisdiction("IL")!.id,
      name: "Fixture Court",
      level: "local-highest",
      parentCourtId: null,
      sourceRecordId: "us-il:highest_court",
      identityBasis: "sourced",
      createdAt: world.currentDate,
      rules: {
        authorizedSeats: {
          state: "known",
          value: 1,
          basis: "game-profile",
          referenceId: "fixture:size",
        },
        termYears: {
          state: "known",
          value: 10,
          basis: "sourced",
          referenceId: "us-il:highest_court",
        },
        mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
        caseJurisdiction: { state: "unknown", reason: "fixture" },
        selectionRecordId: "us-il:highest_court",
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    const incumbentId = world.personOrder[0];
    world = seatJudge(world, {
      seatId,
      personId: incumbentId,
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "fixture opening",
      },
      termEndsAt: electionDate,
      retentionDueAt: electionDate,
    });
    world = scheduleJudicialRetentionElection(world, seatId);
    expect(world.judiciary!.retentionContests).toHaveLength(1);
    expect(world.judiciary!.selections.at(-1)!.ballot?.kind).toBe(
      "retention-yes-no",
    );
    const handlers = createFutureTransitionHandlerRegistry([
      [JUDICIAL_RETENTION_ELECTION, judicialRetentionElectionHandler],
    ]);
    world = advanceWorld(world, 1, handlers);
    const result = world.judiciary!.retentionResults.at(-1)!;
    expect(result.yesVotes + result.noVotes).toBeGreaterThan(0);
    expect(result.outcome).toMatch(/retained|rejected/);
    expect(seatHolderAt(world, seatId)?.personId ?? null).toBe(
      result.outcome === "retained" ? incumbentId : null,
    );
    const reopened = deserializeWorld(serializeWorld(world));
    expect(reopened.judiciary!.retentionResults.at(-1)).toEqual(result);
    expect(seatHolderAt(reopened, seatId)?.personId ?? null).toBe(
      result.outcome === "retained" ? incumbentId : null,
    );
  });
});
