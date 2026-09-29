import { describe, expect, it, vi } from "vitest";

import type { EntityId, World } from "../../src/simulation";

// Only the readers the governing rows use; each returns what a seated world
// records for D.C. and for Ohio.
vi.mock("../../src/simulation/outcome-web/place-outcomes", async (actual) => ({
  ...(await actual<object>()),
  placeOutcomeKey: (town: string) => (town === "town_dc" ? "US-DC" : "US-OH"),
}));
vi.mock("../../src/simulation/nationwide-world/state-executives", () => ({
  currentStateExecutiveHolders: () => [
    {
      stateUsps: "DC",
      title: "Mayor of the District of Columbia",
      personId: "person_mayor",
      personName: "Avery Stone",
    },
    {
      stateUsps: "OH",
      title: "Governor of Ohio",
      personId: "person_governor",
      personName: "Jordan Rios",
    },
  ],
}));
vi.mock("../../src/simulation/nationwide-world/local-governments", () => ({
  // D.C. has its own municipal government; the Ohio town has none.
  homeLocalGovernmentUnits: (_world: World, anchor: string) => ({
    municipal: anchor === "person_dc" ? [{ id: "unit_dc" }] : [],
  }),
}));
vi.mock("../../src/simulation/living-world/local-government-seats", () => ({
  sittingLocalOfficers: () => [],
}));
vi.mock(
  "../../src/simulation/nationwide-world/state-legislature-opening",
  () => ({
    stateLegislators: () => [],
  }),
);
vi.mock("../../src/simulation/living-world/congress", () => ({
  publicPartyAffiliation: () => "organization_democratic",
}));
vi.mock("../../src/simulation/living-world/party-registry", () => ({
  organizationNameAt: () => "Democratic",
}));

const { governingParty } = await import("./vital-statistics");

const rows = (town: "dc" | "oh") =>
  governingParty(
    {} as World,
    `town_${town}` as EntityId,
    `person_${town}` as EntityId,
  );

describe("the governing rows of the vital statistics", () => {
  it("names D.C.'s executive as its mayor and fills the mayor row from the same holder", () => {
    const [executive, , mayor] = rows("dc");
    expect(executive!.label).toBe("Mayor of the District of Columbia's party");
    expect(executive!.value).toBe("Democratic (Avery Stone)");
    expect(mayor!.value).toBe("Democratic");
    expect(mayor!.missing).toBeUndefined();
  });

  it("keeps a state's governor on the governor row, and a town with no government has no mayor", () => {
    const [executive, , mayor] = rows("oh");
    expect(executive!.label).toBe("Governor's party");
    expect(mayor!.value).toBeNull();
    expect(mayor!.missing).toBe(
      "the place has no municipal government on record",
    );
  });
});
