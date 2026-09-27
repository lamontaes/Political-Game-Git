import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { currentPresidentOf } from "../crisis/offices";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { deserializeWorld, serializeWorld } from "../serialization";
import { interviewFederalJudicialCandidate } from "./candidate-interview";
import { addJudicialCourt, seatJudge, vacateJudicialSeat } from "./courts";
import {
  federalRosterReviewStatus,
  JUDICIAL_ROSTER_REVIEW_EVENT,
  publicSeatedJudges,
  reviewFederalJudicialVacancy,
} from "./candidate-discovery";
import { judicialSeatId } from "./types";
import {
  recordFederalJudicialNomination,
  resolveJudicialSelectionPlan,
} from "./selection";

describe("Presidential review of a real judicial roster", () => {
  it("opens only a vacant federal selection with identified living seated judges and saved knowledge", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judicial-vacancy-roster-review",
      }),
    ).game!;
    const presidentId = currentPresidentOf(game.world)!.personId;
    const controlled = {
      ...game.world,
      control: { kind: "person" as const, personId: presidentId },
    };
    for (const level of [
      "federal-supreme",
      "federal-appellate",
      "federal-district",
    ] as const) {
      const seat = Object.values(controlled.judiciary!.seats).find((item) => {
        const court = controlled.judiciary!.courts[item.courtId]!;
        return (
          court.level === level &&
          court.rules.termYears.state === "known" &&
          court.rules.termYears.value === null
        );
      })!;
      const court = controlled.judiciary!.courts[seat.courtId]!;
      expect(court.sourceRecordId).not.toBe(court.rules.selectionRecordId);
      expect(
        resolveJudicialSelectionPlan(controlled, seat.seatId, "vacancy"),
      ).toMatchObject({
        state: "ready",
        plan: {
          pathId: "article-iii-vacancy",
          stages: [
            {
              mechanism: "EXECUTIVE_NOMINATION",
              actor: { value: "President of the United States" },
            },
            {
              mechanism: "LEGISLATIVE_CONFIRMATION",
              actor: { value: "United States Senate" },
            },
          ],
        },
      });
    }
    const territorial = resolveJudicialSelectionPlan(
      controlled,
      "d-gu:seat:1",
      "vacancy",
    );
    expect(territorial.state).toBe("ready");
    if (territorial.state === "ready") {
      expect(territorial.plan.pathId).not.toBe("article-iii-vacancy");
      expect(territorial.plan.stages[0]?.actor.value).not.toBe(
        "President of the United States",
      );
    }
    const judge = publicSeatedJudges(controlled)[0]!;
    expect(judge.courtName).toBeTruthy();
    expect(() =>
      reviewFederalJudicialVacancy(controlled, {
        seatId: judge.seatId,
        candidatePersonIds: [judge.personId],
      }),
    ).toThrow("not vacant");
    const federalJudge = publicSeatedJudges(controlled).find((row) =>
      controlled.judiciary!.courts[
        controlled.judiciary!.seats[row.seatId]!.courtId
      ]!.level.startsWith("federal-"),
    )!;
    const actualFormerSeat = vacateJudicialSeat(controlled, {
      seatId: federalJudge.seatId,
      vacatedAt: controlled.currentDate,
      reason: "retirement",
    });
    const genuineVacancy = federalRosterReviewStatus(
      actualFormerSeat,
      federalJudge.seatId,
    );
    expect(genuineVacancy).toEqual({ state: "ready", kind: "vacancy" });
    const replacementJudge = publicSeatedJudges(actualFormerSeat)[0]!;
    expect(
      actualFormerSeat.history.personalValues.some(
        (value) =>
          value.personId === replacementJudge.personId &&
          value.valueId === LIFE_MIND_IDS.privacy,
      ),
    ).toBe(false);
    const noValueReview = reviewFederalJudicialVacancy(actualFormerSeat, {
      seatId: federalJudge.seatId,
      candidatePersonIds: [replacementJudge.personId],
    });
    expect(noValueReview.judiciary!.selections.at(-1)).toMatchObject({
      seatId: federalJudge.seatId,
      kind: "vacancy",
      pathId: "article-iii-vacancy",
      candidatePersonIds: [replacementJudge.personId],
    });
    const noValueSelectionId =
      noValueReview.judiciary!.selections.at(-1)!.recordId;
    const noValueInterview = interviewFederalJudicialCandidate(noValueReview, {
      selectionRecordId: noValueSelectionId,
      candidatePersonId: replacementJudge.personId,
    });
    const ownAnswer = noValueInterview.history.events.at(-1)!;
    expect(ownAnswer.type).toBe("judicial.candidate-interview");
    expect(ownAnswer.context.choice).not.toBeNull();
    const ownTrace = noValueInterview.history.decisionTraces.at(-1)!;
    expect(ownTrace.context.actorPersonId).toBe(replacementJudge.personId);
    expect(ownAnswer.tags).toContain(`decision:${ownTrace.id}`);
    expect(ownTrace.context.considerations).toHaveLength(0);
    const savedNoValue = deserializeWorld(serializeWorld(noValueInterview));
    expect(savedNoValue.history.events.at(-1)!.id).toBe(ownAnswer.id);
    expect(() =>
      interviewFederalJudicialCandidate(savedNoValue, {
        selectionRecordId: noValueSelectionId,
        candidatePersonId: replacementJudge.personId,
      }),
    ).toThrow();
    const statedView = noValueInterview.judiciary!.philosophies.at(-1)!;
    expect(statedView.personId).toBe(replacementJudge.personId);
    expect(statedView.dimensions.rights).not.toBeNull();
    expect(statedView.dimensions.reading).toBeNull();
    expect(statedView.dimensions.deference).toBeNull();
    expect(statedView.dimensions.federalism).toBeNull();
    expect(statedView.dimensions.precedent).toBeNull();
    expect(
      statedView.dimensionEvidence?.rights?.map((source) => source.kind),
    ).toEqual(["decision-trace", "historical-event"]);
    const nominated = recordFederalJudicialNomination(savedNoValue, {
      selectionRecordId: noValueSelectionId,
      presidentPersonId: presidentId,
      nomineePersonId: replacementJudge.personId,
    });
    expect(nominated.judiciary!.selectionStages.at(-1)).toMatchObject({
      selectionRecordId: noValueSelectionId,
      mechanism: "EXECUTIVE_NOMINATION",
      actorPersonId: presidentId,
      candidatePersonId: replacementJudge.personId,
    });
    expect(actualFormerSeat.judiciary!.selections).toHaveLength(0);

    const courtId = "fixture:vacant-federal-district";
    const seatId = judicialSeatId(courtId, 1);
    const world = addJudicialCourt(controlled, {
      courtId,
      jurisdictionId: null,
      name: "Fixture United States District Court",
      level: "federal-district",
      parentCourtId: null,
      sourceRecordId: "us-fed:general_trial",
      identityBasis: "sourced",
      createdAt: controlled.currentDate,
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
    const occupiedFixture = seatJudge(world, {
      seatId,
      personId: game.playerPersonId,
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: "us-fed:general_trial",
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "Test fixture tenure",
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    const formerlyOccupiedFixture = vacateJudicialSeat(occupiedFixture, {
      seatId,
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    expect(federalRosterReviewStatus(formerlyOccupiedFixture, seatId)).toEqual({
      state: "ready",
      kind: "vacancy",
    });
    expect(() =>
      reviewFederalJudicialVacancy(
        {
          ...world,
          control: { kind: "person", personId: game.playerPersonId },
        },
        { seatId, candidatePersonIds: [judge.personId] },
      ),
    ).toThrow("Only the player serving as President");
    expect(() =>
      reviewFederalJudicialVacancy(world, {
        seatId,
        candidatePersonIds: [game.playerPersonId],
      }),
    ).toThrow("living seated judge");

    const reviewed = reviewFederalJudicialVacancy(world, {
      seatId,
      candidatePersonIds: [judge.personId],
    });
    const selection = reviewed.judiciary!.selections.at(-1)!;
    const event = reviewed.history.events.at(-1)!;
    expect(selection.seatId).toBe(seatId);
    expect(selection.kind).toBe("new-seat");
    expect(selection.candidatePersonIds).toEqual([judge.personId]);
    expect(event.type).toBe(JUDICIAL_ROSTER_REVIEW_EVENT);
    expect(event.tags).toContain(`selection:${selection.recordId}`);
    expect(reviewed.history.knowledge).toContainEqual(
      expect.objectContaining({
        personId: presidentId,
        eventId: event.id,
        accuracy: "accurate",
      }),
    );
    expect(
      reviewed.history.events.some(
        (row) => row.type === "judicial.confirmation-hearing",
      ),
    ).toBe(false);
    const reloaded = deserializeWorld(serializeWorld(reviewed));
    expect(reloaded.judiciary!.selections.at(-1)!.recordId).toBe(
      selection.recordId,
    );
    expect(() =>
      reviewFederalJudicialVacancy(reloaded, {
        seatId,
        candidatePersonIds: [judge.personId],
      }),
    ).toThrow("already pending");
  });
});
