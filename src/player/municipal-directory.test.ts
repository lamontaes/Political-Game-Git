import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import {
  filterMunicipalGovernmentEntries,
  formatMunicipalHomePlaceLabel,
  groupMunicipalGovernmentEntries,
  municipalSelectionOnExternalPin,
  municipalSelectionOnUserPick,
  projectMunicipalGovernmentEntries,
  projectMunicipalHomeContext,
  resolveMunicipalInspectionKey,
} from "./municipal-directory";
import { lifePlaceByKey } from "../simulation/life-places";

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

describe("formatMunicipalHomePlaceLabel", () => {
  it("names a state-scope home once", () => {
    expect(formatMunicipalHomePlaceLabel(lifePlaceByKey("kentucky"))).toBe(
      "Kentucky",
    );
  });

  it("keeps locality display names that already include the state", () => {
    expect(
      formatMunicipalHomePlaceLabel(lifePlaceByKey("lexington-fayette")),
    ).toBe("Lexington, Kentucky");
    expect(formatMunicipalHomePlaceLabel(lifePlaceByKey("5114968"))).toContain(
      "Charlottesville",
    );
    expect(formatMunicipalHomePlaceLabel(lifePlaceByKey("5114968"))).toContain(
      "Virginia",
    );
  });

  it("keeps county display names that already include the state", () => {
    expect(formatMunicipalHomePlaceLabel(lifePlaceByKey("county:51059"))).toBe(
      "Fairfax County, Virginia",
    );
  });

  it("returns null when the home place is unknown", () => {
    expect(formatMunicipalHomePlaceLabel(null)).toBeNull();
    expect(formatMunicipalHomePlaceLabel(undefined)).toBeNull();
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
    expect(context.homePlaceLabel).toContain("Charlottesville");
    expect(context.homePlaceLabel).not.toMatch(/Virginia, Virginia/);
    expect(context.stateCode).toBe("VA");
    expect(context.governmentKey).toBe("us-va-charlottesville");
    expect(context.governmentName).toContain("Charlottesville");
  });

  it("does not duplicate Kentucky for a state-scope home", () => {
    const place = lifePlaceByKey("kentucky")!;
    const generated = createScenarioWorld(
      "municipal-state-home",
      place.context,
      {
        peopleCount: 6,
      },
    );
    const world = {
      ...generated,
      control: {
        kind: "person" as const,
        personId: generated.personOrder[0]!,
      },
    };
    expect(projectMunicipalHomeContext(world).homePlaceLabel).toBe("Kentucky");
  });

  it("does not relabel home when inspecting another government", async () => {
    const { municipalWorkspaceFor } =
      await import("../presentation/municipal-workspace");
    const place = requireLifePlace("5114968");
    const generated = createScenarioWorld("municipal-visitor", place.context, {
      peopleCount: 8,
    });
    const world = {
      ...generated,
      control: {
        kind: "person" as const,
        personId: generated.personOrder[0]!,
      },
    };
    const home = projectMunicipalHomeContext(world);
    expect(
      municipalWorkspaceFor(world, "us-nv-carson-city")?.isHomeGovernment,
    ).toBe(false);
    expect(projectMunicipalHomeContext(world)).toEqual(home);
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
    expect(groups[1]!.entries.every((entry) => entry.state === "VA")).toBe(
      true,
    );
    expect(groups[2]!.entries.length).toBeGreaterThan(0);
  });
});
