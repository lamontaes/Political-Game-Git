import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import {
  addJointJudicialSeatAllocation,
  buildOpeningCourtCatalog,
  seatHolderAt,
  seatJudge,
  seatsForCourt,
  vacateJudicialSeat,
} from "./courts";
import { judicialSeatId } from "./types";

describe("opening court catalog", () => {
  it("uses admitted identities nationwide and labels unresolved state trial geography", () => {
    const opened = buildOpeningCourtCatalog(
      createDemoWorld("judiciary-catalog"),
    );
    const courts = Object.values(opened.judiciary!.courts);
    expect(
      courts.filter((court) => court.level === "federal-appellate"),
    ).toHaveLength(13);
    expect(
      courts.filter((court) => court.level === "federal-district"),
    ).toHaveLength(94);
    expect(
      courts.filter(
        (court) =>
          court.level === "local-general-trial" &&
          court.sourceRecordId !== null,
      ),
    ).toHaveLength(50);
    expect(
      courts.find((court) => court.courtId === "us-ak:general_trial")
        ?.geographyDetail,
    ).toBe("office-family-only");
    expect(
      courts.filter(
        (court) =>
          court.jurisdictionId === null && court.level === "federal-district",
      ),
    ).toHaveLength(0);
    expect(
      courts.filter(
        (court) =>
          court.name.includes("American Samoa") &&
          court.level === "federal-district",
      ),
    ).toHaveLength(0);
    expect(
      courts.filter((court) => court.courtId.startsWith("us-tx:highest_court")),
    ).toHaveLength(2);
    expect(
      courts.filter((court) => court.courtId.startsWith("us-ok:highest_court")),
    ).toHaveLength(2);
    expect(
      opened.judiciary?.seats["us-supreme-court:seat:1"].linkedOfficeId,
    ).toBe("us-chief-justice");
    expect(buildOpeningCourtCatalog(opened)).toBe(opened);
  });
});

describe("shared statutory district seat allocation", () => {
  it("has one holder and one vacancy across every served district", () => {
    let world = buildOpeningCourtCatalog(
      createDemoWorld("judiciary-joint-seat"),
    );
    const allocationRecordId = "fixture:ky-east-west-joint";
    const eastern = "d-kentucky-eastern";
    const western = "d-kentucky-western";
    world = addJointJudicialSeatAllocation(world, {
      allocationRecordId,
      servedCourtIds: [eastern, western],
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "sourced",
        referenceId: "28-usc-133:fixture",
      },
      effectiveAt: world.currentDate,
    });
    const seatId = judicialSeatId(
      `judicial-allocation:${allocationRecordId}`,
      1,
    );
    expect(seatsForCourt(world, eastern).map((seat) => seat.seatId)).toContain(
      seatId,
    );
    expect(seatsForCourt(world, western).map((seat) => seat.seatId)).toContain(
      seatId,
    );
    expect(
      Object.values(world.judiciary!.seats).filter(
        (seat) => seat.seatId === seatId,
      ),
    ).toHaveLength(1);
    world = seatJudge(world, {
      seatId,
      personId: world.personOrder[0],
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "fixture shared appointment",
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    expect(seatHolderAt(world, seatId)?.personId).toBe(world.personOrder[0]);
    world = vacateJudicialSeat(world, {
      seatId,
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    expect(seatHolderAt(world, seatId)).toBeNull();
    expect(world.judiciary?.seats[seatId].retiredAt).toBeNull();
    expect(
      world.judiciary?.seatTenures.filter((tenure) => tenure.seatId === seatId),
    ).toHaveLength(1);
  });
});
