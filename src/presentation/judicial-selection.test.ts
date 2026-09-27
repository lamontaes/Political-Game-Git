import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import { chiefExecutiveJurisdiction } from "../simulation/nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../simulation/nationwide-world/state-executives";
import { addJudicialCourt } from "../simulation/judiciary/courts";
import { openJudicialSelectionFromProfile } from "../simulation/judiciary/selection";
import { judicialSeatId } from "../simulation/judiciary/types";
import { projectJudicialSelection } from "./judicial-selection";

describe("judicial selection presentation", () => {
  it("shows the saved next stage and research status without moving time", () => {
    let world = ensureStateJurisdictionForKey(
      createDemoWorld("judicial-selection-view", { peopleCount: 3 }),
      "US-AK",
    );
    const courtId = "fixture:alaska-highest";
    const seatId = judicialSeatId(courtId, 1);
    world = addJudicialCourt(world, {
      courtId,
      jurisdictionId: chiefExecutiveJurisdiction("AK")!.id,
      name: "Fixture Alaska Supreme Court",
      level: "local-highest",
      parentCourtId: null,
      sourceRecordId: "us-ak:highest_court",
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
        selectionRecordId: "us-ak:highest_court",
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    world = openJudicialSelectionFromProfile(world, {
      seatId,
      kind: "new-seat",
      candidatePersonIds: [world.personOrder[0]],
    });
    const before = world.currentDate;
    const view = projectJudicialSelection(world, seatId)!;
    expect(view.status).toBe("pending");
    expect(view.nextStage).toEqual({
      order: 1,
      mechanism: "MERIT_COMMISSION_SHORTLIST",
      actor: "Alaska Judicial Council",
    });
    expect(view.playerMayNominate).toBe(false);
    expect(view.sourceNote).toContain(
      "primary authorities have not been retrieved",
    );
    expect(world.currentDate).toBe(before);
  });
});
