import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { currentPresidentOf } from "../crisis/offices";
import { deserializeWorld, serializeWorld } from "../serialization";
import { addJudicialCourt } from "./courts";
import {
  JUDICIAL_ROSTER_REVIEW_EVENT,
  publicSeatedJudges,
  reviewFederalJudicialVacancy,
} from "./candidate-discovery";
import { judicialSeatId } from "./types";

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
    const judge = publicSeatedJudges(controlled)[0]!;
    expect(judge.courtName).toBeTruthy();
    expect(() =>
      reviewFederalJudicialVacancy(controlled, {
        seatId: judge.seatId,
        candidatePersonIds: [judge.personId],
      }),
    ).toThrow("not vacant");

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
