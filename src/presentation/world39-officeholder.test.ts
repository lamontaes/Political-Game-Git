import { describe, expect, it } from "vitest";

import { institutionRestatesTitle } from "./world39-news";

describe("officeholder employer", () => {
  it("does not name the same office twice", () => {
    expect(
      institutionRestatesTitle(
        "President of the United States",
        "Presidency of the United States",
      ),
    ).toBe(true);
  });

  it("still names a distinct institution", () => {
    expect(institutionRestatesTitle("Clerk", "Hart County Library")).toBe(
      false,
    );
  });

  it("recognizes restatement by shared tail or containment, not by name lists", () => {
    expect(
      institutionRestatesTitle(
        "Governor of Nevada",
        "Office of the Governor of Nevada",
      ),
    ).toBe(true);
    expect(
      institutionRestatesTitle("Mayor of Alamo", "Mayoralty of Alamo"),
    ).toBe(true);
    expect(
      institutionRestatesTitle("Member of the Assembly", "Nevada Legislature"),
    ).toBe(false);
    expect(
      institutionRestatesTitle(
        "Secretary of State",
        "Department of Motor Vehicles",
      ),
    ).toBe(false);
  });
});
