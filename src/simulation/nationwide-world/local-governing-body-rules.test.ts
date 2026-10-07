import { describe, expect, it } from "vitest";
import type { MunicipalCompositionValue } from "../municipal-government";
import {
  localGoverningBodySeatLabel,
  localGoverningBodySeatWordFromComposition,
} from "./local-governing-body-seat-word";

const composition = (
  values: Partial<MunicipalCompositionValue>,
): MunicipalCompositionValue => ({
  pattern: "MIXED",
  districtSeats: null,
  atLargeSeats: null,
  wardSeats: null,
  note: "",
  ...values,
});

describe("localGoverningBodySeatWordFromComposition", () => {
  it("uses the recorded ward, district, and at-large seat counts", () => {
    const recorded = composition({
      wardSeats: 2,
      districtSeats: 1,
      atLargeSeats: 2,
    });

    expect(
      [1, 2, 3, 4, 5].map((seat) =>
        localGoverningBodySeatWordFromComposition(recorded, seat),
      ),
    ).toEqual(["ward", "ward", "district", "at-large", "at-large"]);
  });

  it("uses at-large for a recorded all-at-large body", () => {
    expect(
      localGoverningBodySeatWordFromComposition(
        composition({ pattern: "AT_LARGE", atLargeSeats: 5 }),
        1,
      ),
    ).toBe("at-large");
  });

  it("uses a recorded ward structure when the ward count is not compiled", () => {
    expect(
      localGoverningBodySeatWordFromComposition(
        composition({ pattern: "WARD" }),
        1,
      ),
    ).toBe("ward");
  });

  it("places recorded at-large seats after the represented seats", () => {
    const hybrid = composition({
      pattern: "HYBRID_DISTRICT_AT_LARGE",
      atLargeSeats: 2,
    });
    expect(
      [1, 2, 3, 4, 5].map((seat) =>
        localGoverningBodySeatWordFromComposition(hybrid, seat, 5),
      ),
    ).toEqual(["district", "district", "district", "at-large", "at-large"]);
  });

  it("falls back to district when composition is absent or does not name a seat", () => {
    expect(localGoverningBodySeatWordFromComposition(null, 1)).toBe("district");
    expect(
      localGoverningBodySeatWordFromComposition(
        composition({ wardSeats: 2, atLargeSeats: 1 }),
        9,
      ),
    ).toBe("district");
  });

  it("keeps seat labels readable and numbered for generated and elected members", () => {
    expect(localGoverningBodySeatLabel("Council member", 2, "ward")).toBe(
      "Council member, Ward 2, seat 2",
    );
    expect(localGoverningBodySeatLabel("Trustee", 3, "district")).toBe(
      "Trustee, District seat 3",
    );
    expect(localGoverningBodySeatLabel("Council member", 4, "at-large")).toBe(
      "Council member, At-large seat 4",
    );
  });
});
