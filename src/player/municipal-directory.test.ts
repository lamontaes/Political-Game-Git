import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import {
  filterMunicipalGovernmentEntries,
  groupMunicipalGovernmentEntries,
  municipalSelectionOnExternalPin,
  municipalSelectionOnUserPick,
  projectMunicipalGovernmentEntries,
  projectMunicipalHomeContext,
  resolveMunicipalInspectionKey,
} from "./municipal-directory";

describe("resolveMunicipalInspectionKey", () => {
  it("uses the shell pin until the player deliberately selects another government", () => {
    expect(
      resolveMunicipalInspectionKey({
        openGovernmentKey: "us-va-charlottesville",
        selectedKey: "us-nv-carson-city",
        userOverride: false,
      }),
    ).toBe("us-va-charlottesville");
    expect(
      resolveMunicipalInspectionKey({
        openGovernmentKey: "us-va-charlottesville",
        selectedKey: "us-nv-carson-city",
        userOverride: true,
      }),
    ).toBe("us-nv-carson-city");
  });

  it("follows a new external pin after a deliberate dropdown selection", () => {
    let selectedKey = "us-nv-carson-city";
    let userOverride = true;
    expect(
      resolveMunicipalInspectionKey({
        openGovernmentKey: "us-va-charlottesville",
        selectedKey,
        userOverride,
      }),
    ).toBe("us-nv-carson-city");

    const external = municipalSelectionOnExternalPin("us-nd-fargo");
    selectedKey = external.selectedKey;
    userOverride = external.userOverride;
    expect(
      resolveMunicipalInspectionKey({
        openGovernmentKey: "us-nd-fargo",
        selectedKey,
        userOverride,
      }),
    ).toBe("us-nd-fargo");
  });

  it("defaults to home when no pin or selection is active", () => {
    expect(
      resolveMunicipalInspectionKey({
        selectedKey: "",
        userOverride: false,
      }),
    ).toBe("");
  });
});

describe("municipal selection helpers", () => {
  it("records deliberate dropdown picks and clears them on external pin changes", () => {
    expect(municipalSelectionOnUserPick("us-nv-carson-city")).toEqual({
      selectedKey: "us-nv-carson-city",
      userOverride: true,
    });
    expect(municipalSelectionOnExternalPin("us-va-charlottesville")).toEqual({
      selectedKey: "us-va-charlottesville",
      userOverride: false,
    });
    expect(municipalSelectionOnExternalPin()).toEqual({
      selectedKey: "",
      userOverride: false,
    });
  });
});

describe("projectMunicipalHomeContext", () => {
  it("leads with the saved home place and linked government", () => {
    const place = requireLifePlace("5114968");
    const generated = createScenarioWorld("municipal-home", place.context, {
      peopleCount: 8,
    });
    const world = {
      ...generated,
      control: {
        kind: "person" as const,
        personId: generated.personOrder[0]!,
      },
    };
    const context = projectMunicipalHomeContext(world);
    expect(context.placeLabel).toContain("Charlottesville");
    expect(context.stateCode).toBe("VA");
    expect(context.governmentKey).toBe("us-va-charlottesville");
    expect(context.governmentName).toContain("Charlottesville");
  });
});

describe("filterMunicipalGovernmentEntries", () => {
  const entries = projectMunicipalGovernmentEntries(
    "us-va-charlottesville",
    "VA",
  );

  it("returns every entry for empty or whitespace-only queries", () => {
    expect(filterMunicipalGovernmentEntries(entries, "")).toEqual(entries);
    expect(filterMunicipalGovernmentEntries(entries, "   ")).toEqual(entries);
  });

  it("matches display names, state codes, and state names", () => {
    const carson = filterMunicipalGovernmentEntries(entries, "carson");
    expect(carson.some((entry) => entry.key === "us-nv-carson-city")).toBe(
      true,
    );
    expect(
      filterMunicipalGovernmentEntries(entries, "kentucky").some(
        (entry) => entry.state === "KY",
      ),
    ).toBe(true);
    expect(
      filterMunicipalGovernmentEntries(entries, "KY").some(
        (entry) => entry.state === "KY",
      ),
    ).toBe(true);
  });

  it("reports no matches honestly", () => {
    expect(
      filterMunicipalGovernmentEntries(entries, "zzzz-not-a-government"),
    ).toEqual([]);
  });
});

describe("groupMunicipalGovernmentEntries", () => {
  it("groups home, home-state, and other supported governments separately", () => {
    const entries = projectMunicipalGovernmentEntries(
      "us-va-charlottesville",
      "VA",
    );
    const groups = groupMunicipalGovernmentEntries(entries);
    expect(groups.map((group) => group.group)).toEqual([
      "home",
      "home-state",
      "other",
    ]);
    expect(groups[0]!.entries.map((entry) => entry.key)).toEqual([
      "us-va-charlottesville",
    ]);
    expect(
      groups[1]!.entries.every((entry) => entry.state === "VA"),
    ).toBe(true);
    expect(groups[2]!.entries.length).toBeGreaterThan(0);
  });
});
