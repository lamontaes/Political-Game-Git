import { describe, expect, it } from "vitest";
import {
  describesByRule,
  ruleOfficeBody,
  ruleOfficeCounty,
} from "./filing-rule-office";

const OHIO_HOUSE =
  "Board of elections of the most populous county in the district";
const REGISTRAR = "General registrar of the city or county where the town lies";

describe("an office given as a rule resolves to the body it points to", () => {
  it("names no county the game cannot know: South Vienna's district 15 splits Franklin County with another district", () => {
    // Franklin County is the largest in the district but is split with district 3;
    // its share inside district 15 is not recorded, so no county is named.
    expect(ruleOfficeCounty(OHIO_HOUSE, "usHouse", "3973796")).toBeNull();
    expect(ruleOfficeBody(OHIO_HOUSE, "usHouse", "3973796")).toBe(
      "board of elections",
    );
  });
  it("names no county for a state legislative district, which the game cannot place in a county", () => {
    expect(
      ruleOfficeCounty(OHIO_HOUSE, "stateLegislative", "3973796"),
    ).toBeNull();
    expect(ruleOfficeBody(OHIO_HOUSE, "stateLegislative", "3973796")).toBe(
      "board of elections",
    );
  });
  it("names the county or city where a town lies", () => {
    expect(ruleOfficeBody(REGISTRAR, "municipalOffice", "5148952")).toBe(
      "Manassas city general registrar",
    );
    expect(ruleOfficeBody(REGISTRAR, "municipalOffice", "0000000")).toBe(
      "general registrar",
    );
  });
  it("marks exactly the offices given as a rule", () => {
    expect(describesByRule(OHIO_HOUSE)).toBe(true);
    expect(describesByRule(REGISTRAR)).toBe(true);
    expect(
      describesByRule("County board of elections (counter: director)"),
    ).toBe(false);
    expect(
      describesByRule(
        "Secretary of State (multi-county districts) or the county clerk",
      ),
    ).toBe(false);
  });
});
