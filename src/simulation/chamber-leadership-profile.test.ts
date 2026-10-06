import { describe, expect, it } from "vitest";
import { STATES } from "./state-reference";
import { chamberLeadershipProfileFor } from "./chamber-leadership-profile";

describe("chamber leadership profiles cover every generated state chamber", () => {
  it("provides a complete, labeled profile for every state and Puerto Rico", () => {
    for (const jurisdictionKey of Object.keys(STATES)) {
      const house = chamberLeadershipProfileFor({
        jurisdictionKey: `US-${jurisdictionKey}`,
        chamberKey: "house",
        form: "state",
      });
      const senate = chamberLeadershipProfileFor({
        jurisdictionKey: `US-${jurisdictionKey}`,
        chamberKey: "senate",
        form: "state",
      });
      for (const row of [house, senate]) {
        expect(row.posts.length).toBeGreaterThan(0);
        expect(row.assignmentAuthority).toBeTruthy();
        expect(row.chairSelectionAuthority).toBeTruthy();
        expect(row.citations.assignment).toBeTruthy();
        expect(row.citations.hearing).toBeTruthy();
        expect(row.status).toBe("estimated-from-average");
      }
    }
  });

  it("uses chamber rules for Congress and exposes the chair-discretion switch", () => {
    const house = chamberLeadershipProfileFor({
      jurisdictionKey: "US",
      chamberKey: "house",
      form: "federal",
    });
    const senate = chamberLeadershipProfileFor({
      jurisdictionKey: "US",
      chamberKey: "senate",
      form: "federal",
    });
    expect(house.assignmentAuthority).toBe("committee-on-committees");
    expect(senate.assignmentAuthority).toBe("party-caucuses");
    expect(house.status).toBe("researched");
    expect(house.chairMayDeclineBill).toBe(true);
    expect(house.seniorityImportance).toBe("slight");
  });

  it("estimates councils from the form of government and supports elected presidents", () => {
    const elected = chamberLeadershipProfileFor({
      jurisdictionKey: "US-WY-LARAMIE",
      chamberKey: "council",
      form: "council",
      councilForm: "elected-president",
    });
    const manager = chamberLeadershipProfileFor({
      jurisdictionKey: "US-WY-LARAMIE",
      chamberKey: "council",
      form: "council",
      councilForm: "council-manager",
    });
    expect(elected.assignmentAuthority).toBe("council-president");
    expect(elected.posts[0]?.key).toBe("council-president");
    expect(manager.assignmentAuthority).toBe("mayor-pro-tem");
    expect(manager.status).toBe("estimated-from-average");
  });
});
