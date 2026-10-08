import { describe, expect, it } from "vitest";

import { allGovernmentUnits } from "../government-units";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./state-executive-candidacy-packs";
import { localGoverningBodyIdentity } from "./local-governing-body-candidacy-packs";
import {
  localGoverningBodySeatKind,
  localGoverningBodySeatKindFromComposition,
} from "./local-governing-body-rules";

describe("local governing-body seat labels", () => {
  it("uses the recorded seat composition and district when it is unknown", () => {
    const composition = (
      pattern: string,
      values: {
        districtSeats: number | null;
        atLargeSeats: number | null;
        wardSeats: number | null;
      },
    ) => ({ pattern, ...values, note: "recorded composition" });

    expect(
      localGoverningBodySeatKindFromComposition(
        composition("WARD", {
          districtSeats: 0,
          atLargeSeats: 0,
          wardSeats: 8,
        }),
        8,
      ),
    ).toBe("ward");
    expect(
      localGoverningBodySeatKindFromComposition(
        composition("HYBRID_DISTRICT_AT_LARGE", {
          districtSeats: 2,
          atLargeSeats: 1,
          wardSeats: 0,
        }),
        3,
      ),
    ).toBe("at-large");
    expect(
      localGoverningBodySeatKindFromComposition(
        composition("OTHER", {
          districtSeats: null,
          atLargeSeats: null,
          wardSeats: null,
        }),
        1,
      ),
    ).toBe("district");
    expect(localGoverningBodySeatKindFromComposition(null, 1)).toBe("district");
  });

  it("runs the same recorded-structure path across all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    const unitsByState = new Map<
      string,
      ReturnType<typeof allGovernmentUnits>[number]
    >();
    const fallbackUnitsByState = new Map<
      string,
      ReturnType<typeof allGovernmentUnits>[number]
    >();
    for (const candidate of allGovernmentUnits()) {
      if (!localGoverningBodyIdentity(candidate)) continue;
      if (!fallbackUnitsByState.has(candidate.stateUsps)) {
        fallbackUnitsByState.set(candidate.stateUsps, candidate);
      }
      const government = municipalGovernmentForUnit(candidate);
      if (
        government?.readings.some((reading) => reading.composition) &&
        !unitsByState.has(candidate.stateUsps)
      ) {
        unitsByState.set(candidate.stateUsps, candidate);
      }
    }
    const kinds = CHIEF_EXECUTIVE_JURISDICTIONS.map((state) => {
      const unit = unitsByState.get(state) ?? fallbackUnitsByState.get(state);
      return unit
        ? localGoverningBodySeatKind(unit, 1)
        : localGoverningBodySeatKindFromComposition(null, 1);
    });

    expect(kinds).toHaveLength(56);
    expect(kinds).toEqual(
      expect.arrayContaining(["district", "ward", "at-large"]),
    );
    expect(
      kinds.every((kind) => ["district", "ward", "at-large"].includes(kind)),
    ).toBe(true);
  });
});
