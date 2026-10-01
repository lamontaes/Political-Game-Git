import { describe, expect, it } from "vitest";
import { countyGovernmentUnit } from "../simulation/government-units";
import {
  countySeatCatalog,
  resolveCountySeatBinding,
} from "./county-seat-catalog";
import type {
  CountySeatBinding,
  CountySeatIdentity,
} from "./county-seat-types";
import { LOUDON_SEAT_REVIEW_CANDIDATES } from "./loudon-seat-candidate";

/** Controlled source packet, not an admitted Loudon legal/map profile. */
function fixture(): { seat: CountySeatIdentity; binding: CountySeatBinding } {
  const unit = countyGovernmentUnit("47105")!;
  const seat: CountySeatIdentity = {
    recordId: "controlled-county-seat-a",
    governmentUnitId: unit.id,
    countyGeoid: "47105",
    stateUsps: "TN",
    officeKey: `local-government-${unit.publisherId}-governing-body`,
    seatKey: "controlled-seat-a",
    source: {
      version: "controlled-test-version",
      url: "https://example.invalid/controlled-source",
      documentId: "controlled-test-document",
      readOn: "2026-10-01",
      effectiveFrom: "2026-09-01",
      effectiveUntil: "2030-09-01",
      status: "adopted",
    },
    electorate: { kind: "district", districtRecordId: "controlled-district-a" },
    domicile: { kind: "district", districtRecordId: "controlled-district-a" },
  };
  return {
    seat,
    binding: {
      vintage: "county-seat-source-v1",
      compilerVersion: "county-seat-binding-v1",
      chamber: "county-governing-body",
      geoid: seat.countyGeoid,
      recordId: seat.recordId,
      stateUsps: seat.stateUsps,
      governmentUnitId: seat.governmentUnitId,
      officeKey: seat.officeKey,
      seatKey: seat.seatKey,
      sourceVersion: seat.source.version,
    },
  };
}

describe("county seat source binding", () => {
  it("keeps the ten sourced Loudon review seats outside production admission", () => {
    expect(countySeatCatalog()).toHaveLength(0);
    expect(LOUDON_SEAT_REVIEW_CANDIDATES.map((seat) => seat.seatKey)).toEqual([
      "district-1-seat-A",
      "district-1-seat-B",
      "district-2-seat-A",
      "district-2-seat-B",
      "district-3",
      "district-4",
      "district-5-seat-A",
      "district-5-seat-B",
      "district-6",
      "district-7",
    ]);
    for (const seat of LOUDON_SEAT_REVIEW_CANDIDATES) {
      expect(seat.homeMembership).toBeUndefined();
      const binding: CountySeatBinding = {
        vintage: "county-seat-source-v1",
        compilerVersion: "county-seat-binding-v1",
        chamber: "county-governing-body",
        geoid: seat.countyGeoid,
        recordId: seat.recordId,
        stateUsps: seat.stateUsps,
        governmentUnitId: seat.governmentUnitId,
        officeKey: seat.officeKey,
        seatKey: seat.seatKey,
        sourceVersion: seat.source.version,
      };
      expect(
        resolveCountySeatBinding(
          LOUDON_SEAT_REVIEW_CANDIDATES,
          binding,
          "2026-08-06",
        ).kind,
      ).toBe("accepted");
      expect(
        resolveCountySeatBinding(countySeatCatalog(), binding, "2026-08-06")
          .kind,
      ).toBe("refused");
      expect(
        resolveCountySeatBinding(
          LOUDON_SEAT_REVIEW_CANDIDATES,
          binding,
          "2021-10-31",
        ).kind,
      ).toBe("refused");
      expect(
        resolveCountySeatBinding(
          LOUDON_SEAT_REVIEW_CANDIDATES,
          { ...binding, seatKey: "district-3-seat-A" },
          "2026-08-06",
        ).kind,
      ).toBe("refused");
    }
  });

  it("keeps unsourced production seats refused", () => {
    const { binding } = fixture();
    expect(
      resolveCountySeatBinding(countySeatCatalog(), binding, "2026-10-01").kind,
    ).toBe("refused");
  });

  it("binds only the exact government, office, seat and source version", () => {
    const { seat, binding } = fixture();
    expect(resolveCountySeatBinding([seat], binding, "2026-10-01").kind).toBe(
      "accepted",
    );
    for (const changed of [
      { sourceVersion: "other-version" },
      { seatKey: "another-seat" },
      { governmentUnitId: "gus2025:127794" },
      { geoid: "22031" },
      { officeKey: "a-whole-body-without-this-seat" },
    ]) {
      expect(
        resolveCountySeatBinding(
          [seat],
          { ...binding, ...changed },
          "2026-10-01",
        ).kind,
      ).toBe("refused");
    }
  });

  it("uses the actual assessment date and never admits proposed or enjoined maps", () => {
    const { seat, binding } = fixture();
    for (const date of ["2026-08-31", "2030-09-01", "2026-02-30"]) {
      expect(resolveCountySeatBinding([seat], binding, date).kind).toBe(
        "refused",
      );
    }
    for (const status of ["proposed", "superseded", "enjoined"] as const) {
      expect(
        resolveCountySeatBinding(
          [{ ...seat, source: { ...seat.source, status } }],
          binding,
          "2026-10-01",
        ).kind,
      ).toBe("refused");
    }
  });

  it("does not infer electorate or domicile from a county or district label", () => {
    const { seat, binding } = fixture();
    for (const changed of [
      { electorate: null },
      { domicile: null },
      { electorate: { kind: "countywide" as const, countyGeoid: "22031" } },
      { domicile: { kind: "district" as const, districtRecordId: "" } },
    ]) {
      expect(
        resolveCountySeatBinding(
          [{ ...seat, ...changed }],
          binding,
          "2026-10-01",
        ).kind,
      ).toBe("refused");
    }
    expect(
      resolveCountySeatBinding([seat, seat], binding, "2026-10-01").kind,
    ).toBe("refused");
  });
});
