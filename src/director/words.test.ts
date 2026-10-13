import { describe, expect, it } from "vitest";
import { schoolName } from "./words";

// School names come from the federal directory, often abbreviated and in
// capitals; people say them in full (seen in a played town's journal:
// "Kennedy Elem").
describe("school names as people say them", () => {
  it("expands a directory abbreviation where it ends the name", () => {
    expect(schoolName("Kennedy Elem")).toBe("Kennedy Elementary");
    expect(schoolName("KENNEDY EL")).toBe("Kennedy Elementary");
    expect(schoolName("JEFFERSON H S")).toBe("Jefferson High School");
    expect(schoolName("LINCOLN J H S")).toBe("Lincoln Junior High School");
    expect(schoolName("ROOSEVELT MS")).toBe("Roosevelt Middle School");
    expect(schoolName("OAK ELEM.")).toBe("Oak Elementary");
  });

  it("keeps words that only look like abbreviations", () => {
    expect(schoolName("EL DORADO HIGH")).toBe("El Dorado High");
    expect(schoolName("Martin Luther King Jr Elementary")).toBe(
      "Martin Luther King Jr Elementary",
    );
    expect(schoolName("WASHINGTON JR HIGH")).toBe("Washington Junior High");
  });

  it("keeps a numbered school's prefix and small words lowercase", () => {
    expect(schoolName("PS 123")).toBe("P.S. 123");
    expect(
      schoolName("SANTA FE COLLEGE ACADEMY OF SCIENCE AND TECHNOLOGY"),
    ).toBe("Santa Fe College Academy of Science and Technology");
  });
});
