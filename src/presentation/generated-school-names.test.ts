import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";

/**
 * A player checking the school they went to was reading "Local Elementary
 * School" — a placeholder, in the one place a player looks for their own past.
 *
 * The names are generated, not sourced: the education directory the repository
 * ships describes one recent academic year and refuses to establish that any
 * real school existed when a grown character was a child. So this asserts the
 * shape of a generated name, that it is different for each of the three
 * schools, and that it is the same school in every save of one world.
 *
 * Six states, none of them Kentucky. The generator is not place-specific and
 * a test that only ever opens in Lexington would not show that.
 */
const PLACES: readonly (readonly [string, string])[] = [
  ["US-IL", "Springfield"],
  ["US-MD", "Baltimore"],
  ["US-AZ", "Phoenix"],
  ["US-ME", "Augusta"],
  ["US-TN", "Nashville"],
  ["US-MT", "Helena"],
];

function schoolsFor(state: string, city: string, seed: string) {
  const home = requireLocalityInState(state, city);
  const created = createNewGameWorld({
    placeKey: home.key,
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  const names = created.world.history.organizationProfiles
    .filter((profile) => profile.classification === "service:school")
    .map((profile) => profile.name);
  return { names, home };
}

describe("the schools a generated childhood went through", () => {
  it.each(PLACES)("are not placeholders in %s %s", (state, city) => {
    const { names } = schoolsFor(state, city, `schools:${state}:${city}`);
    expect(names).toHaveLength(3);
    for (const name of names) {
      expect(name).not.toMatch(/^Local /);
      // A name, not a fragment: something before the level, and the level
      // spelled the way a school spells it.
      expect(name).toMatch(/^\S.*\s(?:Elementary|Middle|High) School$/);
      expect(name.trim()).toBe(name);
    }
  });

  it.each(PLACES)("are three different schools in %s %s", (state, city) => {
    const { names } = schoolsFor(state, city, `schools:${state}:${city}`);
    expect(new Set(names).size).toBe(3);
    expect(
      names.filter((name) => name.endsWith("Elementary School")),
    ).toHaveLength(1);
    expect(names.filter((name) => name.endsWith("Middle School"))).toHaveLength(
      1,
    );
    expect(names.filter((name) => name.endsWith("High School"))).toHaveLength(
      1,
    );
  });

  it("names the same schools every time one world is built", () => {
    const first = schoolsFor("US-IL", "Springfield", "stable-seed");
    const again = schoolsFor("US-IL", "Springfield", "stable-seed");
    expect(again.names).toEqual(first.names);
  });

  it("does not hand every town the same three schools", () => {
    const drawn = PLACES.map(
      ([state, city]) => schoolsFor(state, city, "one-seed").names,
    );
    const distinct = new Set(drawn.map((names) => [...names].sort().join("|")));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("keeps the census filing label out of a school's name", () => {
    const { names } = schoolsFor("US-TN", "Nashville", "nashville");
    for (const name of names) {
      expect(name).not.toContain("(balance)");
      expect(name).not.toContain("metropolitan government");
    }
  });
});
