import { describe, expect, it } from "vitest";
import {
  projectHometownPage,
  HOMETOWN_PAGE_SIZE,
} from "./creator-hometown-page";

describe("hometown pagination", () => {
  it("does not present a short Nevada page as the whole country", () => {
    const nevada = projectHometownPage("", 0, {
      stateJurisdictionKey: "US-NV",
      scope: "locality",
    });
    expect(nevada.places.length).toBeGreaterThan(0);
    expect(nevada.places.length).toBeLessThanOrEqual(HOMETOWN_PAGE_SIZE);
    expect(nevada.status.toLowerCase()).not.toContain(
      "every town in the country",
    );
    if (nevada.total > HOMETOWN_PAGE_SIZE) {
      expect(nevada.status).toContain("This is not every place in the country");
      expect(nevada.pageCount).toBeGreaterThan(1);
    } else {
      expect(nevada.status).toMatch(
        /all \d+ towns the game lists in this state/,
      );
    }
  });

  it("pages a large state instead of claiming the first slice is complete", () => {
    const kentucky = projectHometownPage("", 0, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    expect(kentucky.total).toBeGreaterThan(HOMETOWN_PAGE_SIZE);
    expect(kentucky.places).toHaveLength(HOMETOWN_PAGE_SIZE);
    expect(kentucky.status).toContain("This is not every place in the country");
    const next = projectHometownPage("", kentucky.limit, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    expect(next.page).toBe(2);
    expect(next.places[0]?.key).not.toBe(kentucky.places[0]?.key);
  });
});
