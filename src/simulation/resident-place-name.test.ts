import { describe, expect, it } from "vitest";

import { residentNameForJurisdiction, residentPlaceName } from "./life-places";
import { requireLocalityInState } from "../presentation/new-game-geography";

/**
 * A player reads the name a resident uses, never the Gazetteer's filing label.
 *
 * Walked in Nashville: "Nashville-Davidson metropolitan government (balance),
 * Tennessee" appeared on the home screen, the campaigns screen, six times on
 * the parties screen, and inside the sentence that opens the day. Recorded in
 * `docs/playtest/census-names-on-player-surfaces-2026-09-22.md`.
 */
describe("the name a resident uses", () => {
  it.each([
    ["Nashville-Davidson metropolitan government (balance)", "TN", "Nashville"],
    [
      "Louisville/Jefferson County metro government (balance)",
      "KY",
      "Louisville",
    ],
    ["Athens-Clarke County unified government (balance)", "GA", "Athens"],
    [
      "Augusta-Richmond County consolidated government (balance)",
      "GA",
      "Augusta",
    ],
    ["Butte-Silver Bow (balance)", "MT", "Butte"],
    ["Indianapolis city (balance)", "IN", "Indianapolis"],
    ["Milford city (balance)", "DE", "Milford"],
    // A county-wide unified government is the county, so it keeps the word.
    ["Greeley County unified government (balance)", "KS", "Greeley County"],
  ])("reads %s as %s", (census, usps, expected) => {
    expect(residentPlaceName(census, usps)).toBe(expected);
  });

  it.each([
    // Ordinary places must be untouched, including real names that end in a
    // word the Gazetteer also uses as a unit type.
    ["Springfield", "IL"],
    ["Kansas City", "MO"],
    ["Oklahoma City", "OK"],
    ["Salt Lake City", "UT"],
    ["Winston-Salem", "NC"],
    ["Wilkes-Barre", "PA"],
  ])("leaves %s alone", (name, usps) => {
    expect(residentPlaceName(name, usps)).toBe(name);
  });

  it("keeps the formal label reachable rather than discarding it", () => {
    const nashville = requireLocalityInState("US-TN", "Nashville");
    expect(nashville.displayName).toBe("Nashville, Tennessee");
    expect(nashville.formalName).toBe(
      "Nashville-Davidson metropolitan government (balance), Tennessee",
    );
  });

  it("does not disturb a town that was already right", () => {
    const springfield = requireLocalityInState("US-IL", "Springfield");
    expect(springfield.displayName).toBe("Springfield, Illinois");
  });
});

describe("the town name inside a jurisdiction record", () => {
  it.each([
    // The government keeps its own real name; a person is from the town.
    ["Lexington-Fayette, Kentucky", "Kentucky", "Lexington"],
    [
      "Nashville-Davidson metropolitan government (balance), Tennessee",
      "Tennessee",
      "Nashville",
    ],
    ["Springfield, Illinois", "Illinois", "Springfield"],
    ["Sangamon County, Illinois", "Illinois", "Sangamon County"],
    // A parent the state table does not carry leaves the stem alone rather
    // than guessing at a state.
    ["Somewhere, Freedonia", "Freedonia", "Somewhere"],
    ["Somewhere", null, "Somewhere"],
  ])("reads %s as %s", (name, parent, expected) => {
    expect(residentNameForJurisdiction(name, parent)).toBe(expected);
  });
});
