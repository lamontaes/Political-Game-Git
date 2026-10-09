import { describe, expect, it } from "vitest";
import { districtIdentityCatalog } from "../districts/catalog";
import { bindingFromIdentity } from "../districts/query";
import { contestDistrictGeography } from "./campaign-geography";
import { stateNameForUsps } from "./state-reference";

describe("a bound legislative district is named as its state names it", () => {
  it("reads the state's name and the district's own census name, never its code", () => {
    const records = districtIdentityCatalog().filter(
      (record) =>
        record.chamber !== "congressional" && !record.isUnassignedResidual,
    );
    expect(records.length).toBeGreaterThan(6000);
    for (const record of records) {
      const label = contestDistrictGeography({
        officeKey: `test:${record.recordId}`,
        title: "Seat in the legislature",
        seatKey: null,
        districtBinding: bindingFromIdentity(record),
        occupationClassification: null,
      })?.label;
      const state = stateNameForUsps(record.stateUsps);
      expect(state, record.recordId).not.toBeNull();
      expect(record.sourceName, record.recordId).not.toBeNull();
      expect(label, record.recordId).toBe(`${state} ${record.sourceName}`);
      expect(label, record.recordId).not.toContain(record.geoid);
    }
  });
});
