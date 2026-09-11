import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "./catalog";
import {
  DISTRICT_MEMBERSHIP_REFUSAL,
  bindingFromIdentity,
  districtIdentityByRecordId,
  districtMembershipFromInteriorPoint,
  listDistrictIdentities,
  resolveDistrictBinding,
} from "./query";

describe("district identity catalog", () => {
  const catalog = districtIdentityCatalog();

  it("covers every Gazetteer chamber across states, not Alaska only", () => {
    const states = new Set(catalog.map((row) => row.stateUsps));
    expect(states.has("AK")).toBe(true);
    expect(states.has("KY")).toBe(true);
    expect(states.has("VT")).toBe(true);
    expect(states.has("NE")).toBe(true);
    expect(states.size).toBeGreaterThan(50);
    expect(
      catalog.some(
        (row) => row.chamber === "congressional" && row.stateUsps === "WY",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (row) => row.chamber === "state-upper" && row.stateUsps === "NE",
      ),
    ).toBe(true);
    expect(JSON.stringify(catalog).includes("interiorPoint")).toBe(false);
    expect(JSON.stringify(catalog).includes("latitude")).toBe(false);
  });

  it("keeps Vermont hyphenated house codes and refuses residuals", () => {
    const vermont = districtIdentityByRecordId(catalog, "state-lower:50A-1");
    expect(vermont?.districtCode).toBe("A-1");
    const residual = districtIdentityByRecordId(catalog, "state-lower:25ZZZ");
    expect(residual?.isUnassignedResidual).toBe(true);
    const refused = resolveDistrictBinding(
      catalog,
      bindingFromIdentity(residual!),
    );
    expect(refused.kind).toBe("refused");
    if (refused.kind === "refused") {
      expect(refused.refusalKind).toBe("residual-unassigned");
    }
    expect(
      listDistrictIdentities(catalog, {
        stateUsps: "MA",
        chamber: "state-lower",
      }).some((row) => row.isUnassignedResidual),
    ).toBe(false);
  });

  it("refuses mismatched vintage, chamber, and state", () => {
    const house = districtIdentityByRecordId(catalog, "state-lower:02001")!;
    const binding = bindingFromIdentity(house);
    const mismatched = {
      ...binding,
      vintage: "not-the-gazetteer-vintage",
    };
    expect(
      resolveDistrictBinding(catalog, mismatched as typeof binding).kind,
    ).toBe("refused");
    expect(
      resolveDistrictBinding(catalog, binding, { chamber: "state-upper" }).kind,
    ).toBe("refused");
    expect(
      resolveDistrictBinding(catalog, binding, { stateUsps: "KY" }).kind,
    ).toBe("refused");
  });

  it("never treats an interior point as membership", () => {
    const result = districtMembershipFromInteriorPoint({
      latitude: 61.2,
      longitude: -149.9,
      catalog,
    });
    expect(result).toEqual({
      kind: "refused",
      reason: DISTRICT_MEMBERSHIP_REFUSAL,
    });
  });
});
