import { describe, expect, it } from "vitest";

import {
  economyVisibilityForOfficeScope,
  type PlayerOfficeScopeEntry,
} from "../../src/presentation/budget-economy";

describe("office-level economy visibility table", () => {
  it("uses the resident row when there is no office", () => {
    const visibility = economyVisibilityForOfficeScope([], "town:one");

    expect(visibility.officeLevels).toEqual(["resident"]);
    expect(visibility.lookItUp).toBe("full");
    expect(visibility.projections.has("home-town-conditions")).toBe(true);
    expect(visibility.projections.has("government-budget")).toBe(false);
  });

  it("grants budget and macro projections only for matching office scopes", () => {
    const offices: PlayerOfficeScopeEntry[] = [
      {
        officeKey: "mayor:one",
        title: "Mayor",
        jurisdictionId: "town:one",
        level: "town",
      },
      {
        officeKey: "governor:two",
        title: "Governor",
        jurisdictionId: "state:two",
        level: "state-executive",
      },
    ];

    const town = economyVisibilityForOfficeScope(offices, "town:one");
    expect(town.officeLevels).toEqual(["town"]);
    expect(town.projections.has("government-budget")).toBe(true);
    expect(town.projections.has("account-history")).toBe(false);

    const state = economyVisibilityForOfficeScope(offices, "state:two");
    expect(state.officeLevels).toEqual(["state-executive"]);
    expect(state.projections.has("state-macro-series")).toBe(true);
    expect(state.projections.has("account-history")).toBe(true);
  });

  it("unions the visibility rows of multiple offices", () => {
    const offices: PlayerOfficeScopeEntry[] = [
      {
        officeKey: "member:town",
        title: "State legislator",
        jurisdictionId: "state:one",
        level: "state-legislature",
      },
      {
        officeKey: "governor:state",
        title: "Governor",
        jurisdictionId: "state:one",
        level: "state-executive",
      },
    ];

    const visibility = economyVisibilityForOfficeScope(offices, "state:one");
    expect(visibility.officeLevels).toEqual([
      "state-legislature",
      "state-executive",
    ]);
    expect(visibility.projections.has("bill-fiscal-notes")).toBe(true);
    expect(visibility.projections.has("account-history")).toBe(true);
    expect(visibility.projections.has("state-macro-series")).toBe(true);
  });

  it("limits federal projections to the national scope", () => {
    const office: PlayerOfficeScopeEntry = {
      officeKey: "us-house:one",
      title: "Member of Congress",
      jurisdictionId: null,
      level: "congress",
    };
    const national = economyVisibilityForOfficeScope([office], null);
    expect(national.officeLevels).toContain("congress");
    expect(national.projections.has("federal-budget-categories")).toBe(true);
    expect(national.projections.has("national-macro-series")).toBe(true);
    const state = economyVisibilityForOfficeScope([office], "state:one");
    expect(state.officeLevels).toEqual(["resident"]);
    expect(state.projections.has("federal-budget-categories")).toBe(false);
  });
});
