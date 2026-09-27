import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { currentPresidentOf } from "../crisis/offices";
import { addDays } from "../dates";
import { createDemoWorld } from "../demo";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
  ensureStateJurisdictionForKey,
} from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld, recordWorldEvent } from "../world";
import { addJudicialCourt, seatHolderAt, seatJudge } from "./courts";
import {
  interviewFederalJudicialCandidate,
  recordFederalJudicialCandidateResponse,
} from "./candidate-interview";
import {
  completeStateJudicialSelection,
  judicialSelectionById,
  judicialSelectionProgress,
  judicialRetentionPasses,
  judicialRetentionThreshold,
  openJudicialSelection,
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
  recordJudicialSelectionStage,
  resolveJudicialSelectionPlan,
  screenFederalJudicialNominee,
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

function opening(recordId = sourceRecordId, termYears?: number) {
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
      termYears:
        termYears === undefined
          ? { state: "unknown", reason: "fixture" }
          : {
              state: "known",
              value: termYears,
              basis: "sourced",
              referenceId: recordId,
            },
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
    const openingTenureCount = world.judiciary!.seatTenures.length;
    const president = currentPresidentOf(world)!;
    const nomineeId = world.personOrder.find(
      (personId) =>
        personId !== president.personId &&
        personId !== game.playerPersonId &&
        world.history.personalValues.some(
          (value) =>
            value.personId === personId &&
            value.valueId === LIFE_MIND_IDS.privacy &&
            value.orientation === "embraces",
        ),
    )!;
    const unansweredId = world.personOrder.find(
      (personId) =>
        personId !== president.personId &&
        personId !== game.playerPersonId &&
        personId !== nomineeId &&
        world.history.personalValues.some(
          (value) =>
            value.personId === personId &&
            value.valueId === LIFE_MIND_IDS.privacy &&
            value.orientation === "conflicted",
        ),
    )!;
    world = openJudicialSelectionFromProfile(world, {
      seatId: federalSeatId,
      kind: "new-seat",
      candidatePersonIds: [nomineeId, unansweredId],
    });
    const selection = world.judiciary!.selections.at(-1)!;
    expect(() =>
      recordFederalJudicialNomination(world, {
        selectionRecordId: selection.recordId,
        presidentPersonId: nomineeId,
        nomineePersonId: nomineeId,
      }),
    ).toThrow("Only the sitting President");
    expect(screenFederalJudicialNominee(world, nomineeId)).toEqual({
      state: "unresolved",
      reason: "This person has no recorded judicial philosophy.",
    });
    expect(() =>
      recordFederalJudicialNomination(world, {
        selectionRecordId: selection.recordId,
        presidentPersonId: president.personId,
        nomineePersonId: nomineeId,
      }),
    ).toThrow("no recorded judicial philosophy");
    expect(() =>
      interviewFederalJudicialCandidate(world, {
        selectionRecordId: selection.recordId,
        candidatePersonId: nomineeId,
      }),
    ).toThrow("Only the player serving as President");
    const unanswered = recordFederalJudicialCandidateResponse(world, {
      selectionRecordId: selection.recordId,
      candidatePersonId: unansweredId,
    });
    expect(unanswered.judiciary!.philosophies).toHaveLength(0);
    expect(screenFederalJudicialNominee(unanswered, unansweredId).state).toBe(
      "unresolved",
    );
    world = unanswered;
    world = recordFederalJudicialCandidateResponse(world, {
      selectionRecordId: selection.recordId,
      candidatePersonId: nomineeId,
    });
    expect(
      world.judiciary!.philosophies.at(-1)!.dimensions.rights,
    ).not.toBeNull();
    expect(world.judiciary!.philosophies.at(-1)!.dimensions.reading).toBeNull();
    expect(
      world
        .judiciary!.philosophies.at(-1)!
        .dimensionEvidence?.rights?.map((source) => source.kind),
    ).toEqual(["personal-value", "decision-trace", "historical-event"]);
    const interview = world.history.events.find(
      (event) =>
        event.type === "judicial.candidate-interview" &&
        event.tags.includes(`candidate:${nomineeId}`),
    )!;
    expect(
      world.history.knowledge.some(
        (row) =>
          row.personId === president.personId && row.eventId === interview.id,
      ),
    ).toBe(true);
    world = deserializeWorld(serializeWorld(world));
    expect(screenFederalJudicialNominee(world, nomineeId).state).toBe("ready");
    expect(() =>
      recordFederalJudicialCandidateResponse(world, {
        selectionRecordId: selection.recordId,
        candidatePersonId: nomineeId,
      }),
    ).toThrow("already has a supported judicial philosophy");
    world = recordFederalJudicialNomination(world, {
      selectionRecordId: selection.recordId,
      presidentPersonId: president.personId,
      nomineePersonId: nomineeId,
    });
    expect(world.judiciary!.selectionStages.at(-1)!.mechanism).toBe(
      "EXECUTIVE_NOMINATION",
    );
    expect(world.judiciary!.seatTenures).toHaveLength(openingTenureCount);
    expect(seatHolderAt(world, federalSeatId)).toBeNull();
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

  it("seats a completed state selection once and closes a due prior tenure", () => {
    let world = opening("us-ct:highest_court", 8);
    const priorId = world.personOrder[0]!;
    const successorId = world.personOrder[1]!;
    const actorId = world.personOrder[2]!;
    world = ensureStateExecutiveIncumbent(world, priorId, "CT");
    const governorId = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === "CT",
    )!.personId;
    world = seatJudge(world, {
      seatId,
      personId: priorId,
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "Fixture incumbent",
      },
      termEndsAt: addDays(world.currentDate, 1),
      retentionDueAt: null,
    });
    world = advanceWorld(world, 1);
    expect(seatHolderAt(world, seatId)).toBeNull();
    expect(world.judiciary!.seatTenures[0]!.endedAt).toBeNull();
    world = openJudicialSelectionFromProfile(world, {
      seatId,
      kind: "vacancy",
      candidatePersonIds: [successorId],
    });
    const selectionRecordId = world.judiciary!.selections.at(-1)!.recordId;
    const resolved = resolveJudicialSelectionPlan(world, seatId, "vacancy");
    expect(resolved.state).toBe("ready");
    if (resolved.state !== "ready") return;
    expect(resolved.plan.stages.map((stage) => stage.mechanism)).toEqual([
      "MERIT_COMMISSION_SHORTLIST",
      "EXECUTIVE_APPOINTMENT",
      "LEGISLATIVE_CONFIRMATION",
    ]);
    const stage = (
      before: World,
      order: number,
      outcome: "completed" | "rejected",
      actorPersonId = order === 2 ? governorId : actorId,
    ) => {
      const withEvent = recordWorldEvent(before, {
        stableKey: `fixture:state-stage:${order}:${outcome}`,
        type: "judicial.fixture-stage",
        occurredAt: before.currentDate,
        recordedAt: before.currentDate,
        jurisdictionId: before.judiciary!.courts[courtId]!.jurisdictionId,
        involvedEntityIds: [successorId, actorId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [`selection:${selectionRecordId}`],
        summary: "A fixture state selection stage was recorded.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      return recordJudicialSelectionStage(withEvent, {
        selectionRecordId,
        plan: resolved.plan,
        occurredAt: withEvent.currentDate,
        actorPersonId,
        candidatePersonId: successorId,
        outcome,
        decisionRecordId: null,
        electionContestId: null,
        outcomeEventId: withEvent.history.events.at(-1)!.id,
      });
    };
    expect(() =>
      completeStateJudicialSelection(world, selectionRecordId),
    ).toThrow("not completed");
    const failed = stage(world, 1, "rejected");
    expect(() =>
      completeStateJudicialSelection(failed, selectionRecordId),
    ).toThrow("not completed");
    expect(seatHolderAt(failed, seatId)).toBeNull();
    expect(failed.judiciary!.seatTenures[0]!.endedAt).toBeNull();

    world = stage(world, 1, "completed");
    expect(() =>
      completeStateJudicialSelection(world, selectionRecordId),
    ).toThrow("not completed");
    expect(() => stage(world, 2, "completed", actorId)).toThrow(
      "not the sitting state executive",
    );
    world = stage(world, 2, "completed");
    world = stage(world, 3, "completed");
    const before = world;
    world = completeStateJudicialSelection(world, selectionRecordId);
    expect(before.judiciary!.seatTenures[0]!.endedAt).toBeNull();
    expect(world.judiciary!.seatTenures[0]).toMatchObject({
      personId: priorId,
      endedAt: world.currentDate,
      endReason: "term-expired",
    });
    expect(seatHolderAt(world, seatId)?.personId).toBe(successorId);
    expect(world.judiciary!.seatTenures.at(-1)!.selection).toMatchObject({
      path: "appointment",
      selectionRecordId,
      selectingPersonId: actorId,
    });
    expect(world.judiciary!.seatTenures.at(-1)!.retentionDueAt).toBeNull();
    const reopened = deserializeWorld(serializeWorld(world));
    expect(seatHolderAt(reopened, seatId)?.personId).toBe(successorId);
    expect(() =>
      completeStateJudicialSelection(reopened, selectionRecordId),
    ).toThrow("already began a judicial tenure");
  });
});
