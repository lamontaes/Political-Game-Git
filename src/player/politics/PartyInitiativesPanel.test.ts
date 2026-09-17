import { describe, expect, it } from "vitest";

import type { World } from "../../simulation";
import {
  commandRefusal,
  partyJurisdictionChoices,
} from "./PartyInitiativesPanel";

function worldWith(
  places: readonly {
    id: string;
    name: string;
    kind: string;
    parentName?: string;
  }[],
  home: string,
): World {
  return {
    jurisdictionOrder: places.map((place) => place.id),
    jurisdictions: Object.fromEntries(places.map((place) => [place.id, place])),
    people: { p1: { id: "p1", homeJurisdictionId: home } },
  } as unknown as World;
}

const WORLD = worldWith(
  [
    { id: "us", name: "United States", kind: "federal" },
    { id: "nv", name: "Nevada", kind: "state-placeholder" },
    { id: "ak", name: "Alaska", kind: "state" },
    { id: "zeb", name: "Zebulon, Nevada", kind: "census-place" },
    { id: "alamo", name: "Alamo, Nevada", kind: "census-place" },
    {
      id: "home",
      name: "Tonopah, Nevada",
      kind: "census-place",
      parentName: "Nevada",
    },
  ],
  "home",
);

describe("party jurisdiction choices", () => {
  it("offers no place for a national party", () => {
    expect(partyJurisdictionChoices(WORLD, "p1", "national")).toEqual([]);
  });

  it("offers only states for a state party, the home state first", () => {
    expect(
      partyJurisdictionChoices(WORLD, "p1", "state").map((c) => c.value),
    ).toEqual(["nv", "ak"]);
  });

  it("offers local places with the player's home first, never the nation", () => {
    expect(
      partyJurisdictionChoices(WORLD, "p1", "local").map((c) => c.value),
    ).toEqual(["home", "alamo", "zeb"]);
  });

  it("offers nothing when the World holds no fitting place", () => {
    const empty = worldWith([], "none");
    expect(partyJurisdictionChoices(empty, "p1", "local")).toEqual([]);
  });
});

describe("command refusal", () => {
  it("shows a thrown command's own reason", () => {
    expect(commandRefusal(new Error("A founding needs a name."))).toBe(
      "A founding needs a name.",
    );
  });

  it("falls back to a plain sentence for anything else", () => {
    expect(commandRefusal("nope")).toBe("That could not be done.");
    expect(commandRefusal(new Error("  "))).toBe("That could not be done.");
  });
});
