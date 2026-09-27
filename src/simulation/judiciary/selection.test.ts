import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { currentPresidentOf } from "../crisis/offices";
import { createDemoWorld } from "../demo";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import { recordWorldEvent } from "../world";
import { addJudicialCourt } from "./courts";
import {
  judicialSelectionById,
  judicialSelectionProgress,
  judicialRetentionPasses,
  judicialRetentionThreshold,
  openJudicialSelection,
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
  recordJudicialSelectionStage,
  resolveJudicialSelectionPlan,
} from "./selection";
import type { JudicialSelectionPlan } from "./selection";
import { judicialSeatId } from "./types";

const courtId = "fixture:judicial-selection";
const sourceRecordId = "us-ak:highest_court";
const seatId = judicialSeatId(courtId, 1);
const plan: JudicialSelectionPlan = {
  sourceRecordId,
  pathId: "default",
  stages: [
    {
      order: 1,
      mechanism: "MERIT_COMMISSION_SHORTLIST",
      actor: { state: "KNOWN", value: "Alaska Judicial Council" },
    },
    {
      order: 2,
      mechanism: "EXECUTIVE_APPOINTMENT",
      actor: { state: "KNOWN", value: "Governor" },
    },
  ],
};

function opening(recordId = sourceRecordId) {
  const usps = recordId.slice(3, 5).toUpperCase();
  const world = ensureStateJurisdictionForKey(
    createDemoWorld("judicial-selection-stage-order", { peopleCount: 3 }),
    `US-${usps}`,
  );
  return addJudicialCourt(world, {
    courtId,
    jurisdictionId: chiefExecutiveJurisdiction(usps)!.id,
    name: "Fixture Court",
    level: "local-highest",
    parentCourtId: null,
    sourceRecordId: recordId,
    identityBasis: "sourced",
    createdAt: world.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "fixture:size",
      },
      termYears: { state: "unknown", reason: "fixture" },
      mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
      caseJurisdiction: { state: "unknown", reason: "fixture" },
      selectionRecordId: recordId,
      amendmentRoute: { state: "unknown", reason: "fixture" },
    },
  });
}

describe("judicial selection lifecycle", () => {
  it("uses the reported retention threshold without turning one incumbent into an automatic winner", () => {
    const world = opening("us-il:highest_court");
    const resolved = judicialRetentionThreshold(world, seatId);
    expect(resolved.state).toBe("ready");
    if (resolved.state !== "ready") return;
    expect(resolved.threshold).toEqual({
      kind: "percent",
      percent: 60,
      reportedToken: "60%_supermajority",
    });
    expect(judicialRetentionPasses(60, 40, resolved.threshold)).toBe(true);
    expect(judicialRetentionPasses(59, 41, resolved.threshold)).toBe(false);
    expect(judicialRetentionPasses(0, 0, resolved.threshold)).toBe(false);
  });

  it("records a Presidential nominee but waits for the Senate to confirm", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judicial-federal-nomination",
        startAge: 40,
      }),
    ).game!;
    let world = openOrdinaryLife(game.world, game.playerPersonId);
    const federalCourtId = "fixture:federal-district";
    const federalSeatId = judicialSeatId(federalCourtId, 1);
    world = addJudicialCourt(world, {
      courtId: federalCourtId,
      jurisdictionId: null,
      name: "Fixture United States District Court",
      level: "federal-district",
      parentCourtId: null,
      sourceRecordId: "us-fed:general_trial",
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
          value: null,
          basis: "sourced",
          referenceId: "us-fed:general_trial",
        },
        mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
        caseJurisdiction: { state: "unknown", reason: "fixture" },
        selectionRecordId: "us-fed:general_trial",
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    const president = currentPresidentOf(world)!;
    const nomineeId = world.personOrder.find(
      (personId) =>
        personId !== president.personId && personId !== game.playerPersonId,
    )!;
    world = openJudicialSelectionFromProfile(world, {
      seatId: federalSeatId,
      kind: "new-seat",
      candidatePersonIds: [nomineeId],
    });
    const selection = world.judiciary!.selections.at(-1)!;
    expect(() =>
      recordFederalJudicialNomination(world, {
        selectionRecordId: selection.recordId,
        presidentPersonId: nomineeId,
        nomineePersonId: nomineeId,
      }),
    ).toThrow("Only the sitting President");
    world = recordFederalJudicialNomination(world, {
      selectionRecordId: selection.recordId,
      presidentPersonId: president.personId,
      nomineePersonId: nomineeId,
    });
    expect(world.judiciary!.selectionStages.at(-1)!.mechanism).toBe(
      "EXECUTIVE_NOMINATION",
    );
    expect(world.judiciary!.seatTenures).toHaveLength(0);
    const resolved = resolveJudicialSelectionPlan(
      world,
      federalSeatId,
      "new-seat",
    );
    expect(resolved.state).toBe("ready");
    if (resolved.state !== "ready") return;
    expect(
      judicialSelectionProgress(world, selection.recordId, resolved.plan),
    ).toEqual({
      status: "pending",
      nextOrder: 2,
    });
  });

  it("holds an unresolved county branch instead of choosing a path", () => {
    const world = opening("us-az:general_trial");
    expect(resolveJudicialSelectionPlan(world, seatId, "new-seat")).toEqual({
      state: "unresolved",
      reason:
        "The reported path is missing or needs a jurisdiction branch that the saved seat has not resolved.",
    });
  });

  it("keeps later unknown actors visible without erasing earlier vacancy stages", () => {
    const world = opening();
    const resolved = resolveJudicialSelectionPlan(world, seatId, "vacancy");
    expect(resolved.state).toBe("ready");
    if (resolved.state !== "ready") return;
    expect(resolved.plan.stages.map((stage) => stage.mechanism)).toEqual([
      "MERIT_COMMISSION_SHORTLIST",
      "EXECUTIVE_APPOINTMENT",
      "RETENTION_ELECTION",
    ]);
    expect(resolved.plan.stages[2]!.actor.state).toBe("UNKNOWN");
    expect(resolved.primaryAuthorityStatus).toBe(
      "CITATIONS_REPORTED_NOT_RETRIEVED",
    );
  });

  it("preserves the ordered path and leaves an unconfirmed seat vacant", () => {
    let world = opening();
    const candidateId = world.personOrder[0];
    world = openJudicialSelection(world, {
      seatId,
      kind: "new-seat",
      plan,
      candidatePersonIds: [candidateId],
    });
    const selection = world.judiciary!.selections[0]!;
    expect(judicialSelectionById(world, selection.recordId)).toEqual(selection);
    expect(judicialSelectionProgress(world, selection.recordId, plan)).toEqual({
      status: "pending",
      nextOrder: 1,
    });
    expect(() =>
      openJudicialSelection(world, {
        seatId,
        kind: "new-seat",
        plan,
        candidatePersonIds: [candidateId],
      }),
    ).toThrow("already pending");
    expect(() =>
      recordJudicialSelectionStage(world, {
        selectionRecordId: selection.recordId,
        plan,
        occurredAt: world.currentDate,
        actorPersonId: world.personOrder[1],
        candidatePersonId: candidateId,
        outcome: "completed",
        decisionRecordId: null,
        electionContestId: null,
        outcomeEventId: null,
      }),
    ).toThrow("needs a recorded decision");
    world = recordWorldEvent(world, {
      stableKey: "fixture:judicial-nomination",
      type: "judicial.fixture-nomination",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0],
      involvedEntityIds: [candidateId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "A fixture nomination occurred.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordJudicialSelectionStage(world, {
      selectionRecordId: selection.recordId,
      plan,
      occurredAt: world.currentDate,
      actorPersonId: world.personOrder[1],
      candidatePersonId: candidateId,
      outcome: "completed",
      decisionRecordId: null,
      electionContestId: null,
      outcomeEventId: world.history.events.at(-1)!.id,
    });
    expect(world.judiciary!.selectionStages[0]!.mechanism).toBe(
      "MERIT_COMMISSION_SHORTLIST",
    );
    expect(judicialSelectionProgress(world, selection.recordId, plan)).toEqual({
      status: "pending",
      nextOrder: 2,
    });
    expect(world.judiciary!.seatTenures).toHaveLength(0);
  });
});
