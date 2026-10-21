import { describe, expect, it } from "vitest";
import { openingOrganizationProfiles } from "./opening-org-profiles";

const record = (
  organizationId: string,
  effectiveAt: string,
  sequence: number,
) => ({
  organizationId,
  effectiveAt,
  sequence,
  name: `${organizationId}@${effectiveAt}#${sequence}`,
});

describe("the opening's organization profiles", () => {
  it("take the latest record in force today, by effective date then sequence", () => {
    const world = {
      currentDate: "2026-01-01",
      history: {
        nextSequence: 10,
        organizationProfiles: [
          record("a", "2020-01-01", 1),
          record("a", "2024-06-01", 3),
          record("a", "2024-06-01", 2),
          record("a", "2027-01-01", 4), // takes effect after today
          record("a", "2025-01-01", 12), // written after the history's end
          record("b", "2019-05-05", 5),
        ],
      },
    };
    const latest = openingOrganizationProfiles(world);
    expect(latest.get("a")?.name).toBe("a@2024-06-01#3");
    expect(latest.get("b")?.name).toBe("b@2019-05-05#5");
    expect(latest.get("c")).toBeUndefined();
  });
});
