import { describe, expect, it } from "vitest";
import { describesByRule, ruleOfficeBody } from "./filing-rule-office";

const OHIO_HOUSE =
  "Board of elections of the most populous county in the district";
const REGISTRAR = "General registrar of the city or county where the town lies";

describe("an office given as a rule resolves to the body it points to", () => {
  it("names the most populous county of the town's congressional district", () => {
    // South Vienna, Ohio is in district 15; Franklin County is its most populous county.
    expect(ruleOfficeBody(OHIO_HOUSE, "usHouse", "3973796")).toBe(
      "Franklin County board of elections",
    );
  });
  it("estimates the most populous county of a state legislative district from its places", () => {
    // South Vienna, Ohio: state Senate district 010 and state House district 071.
    expect(
      ruleOfficeBody(OHIO_HOUSE, "stateLegislative", "3973796", {
        chamber: "upper",
        code: "010",
      }),
    ).toBe("Clark County board of elections");
    expect(
      ruleOfficeBody(OHIO_HOUSE, "stateLegislative", "3973796", {
        chamber: "lower",
        code: "071",
      }),
    ).toBe("Greene County board of elections");
  });
  it("has no body where the race names no district", () => {
    expect(
      ruleOfficeBody(OHIO_HOUSE, "stateLegislative", "3973796"),
    ).toBeNull();
  });
  it("names the county or city where a town lies", () => {
    expect(ruleOfficeBody(REGISTRAR, "municipalOffice", "5148952")).toBe(
      "Manassas city general registrar",
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
