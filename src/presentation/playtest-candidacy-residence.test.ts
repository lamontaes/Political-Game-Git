import { describe, expect, it } from "vitest";

import { candidacyEligibility, searchLifePlaces } from "../simulation";
import { createExplicitGeographyLife } from "./new-game-geography";
import { letAdultTimePass } from "./adult-life";

/**
 * Found by playing, not by reading: in Alaska, Nebraska, Ohio and the
 * Minnesota House a character could never stand for anything, at any date,
 * with any seed. The screen said "the game has not recorded when this
 * character came to live here" about a character whose home the world had
 * recorded on its first day.
 *
 * Two separate causes sat behind that one sentence, and both are pinned here.
 */

function lifeIn(placeKey: string, seed: string, months: number) {
  const created = createExplicitGeographyLife({
    placeKey,
    seed,
    startAge: 40,
    startKind: "normal",
    depth: "begin-adult-life",
  });
  let world = created.game.world;
  for (let step = 0; step < months; step += 1) {
    world = letAdultTimePass(world, 30);
  }
  return { world, personId: created.game.playerPersonId };
}

function eligibility(
  world: ReturnType<typeof lifeIn>["world"],
  personId: string,
  officeKey: string,
) {
  return candidacyEligibility(world, {
    personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    officeKey,
    alreadyACandidate: false,
  });
}

describe("standing for a seat in the state you have always lived in", () => {
  /*
   * Eighteen months, because the sourced provisions for these states were
   * observed in September 2026 and play opens in January — the rule is not
   * established on the opening date, which is its own finding and not this
   * one.
   */
  const MONTHS_PAST_OBSERVATION = 18;

  it.each([
    ["Nebraska", "3100205", "us-ne-legislature-v1:legislature"],
    ["Alaska", "0200650", "us-ak-legislature-v1:house"],
    ["Minnesota's House", "2700172", "us-mn-legislature-v1:house"],
  ])("lets a lifelong resident stand in %s", (_name, placeKey, officeKey) => {
    const { world, personId } = lifeIn(
      placeKey,
      `playtest-${officeKey}`,
      MONTHS_PAST_OBSERVATION,
    );
    const result = eligibility(world, personId, officeKey);
    expect(result.blocks.map((block) => block.reason)).toEqual([]);
    expect(result.eligible).toBe(true);
  });

  it("still refuses when the world never recorded which district this is", () => {
    // Columbus is split across more than one district, so the whole-place join
    // cannot say which one its resident lives in. Unknown stays unknown.
    const { world, personId } = lifeIn("3918000", "playtest-split", 18);
    const result = eligibility(
      world,
      personId,
      "us-oh-general-assembly-v1:house",
    );
    expect(result.eligible).toBe(false);
    expect(result.blocks.map((block) => block.reason).join(" ")).toContain(
      "has not recorded when this character came to live here",
    );
  });

  it("leaves a state without a district requirement exactly as it was", () => {
    const { world, personId } = lifeIn("2100694", "playtest-ky", 0);
    expect(
      eligibility(world, personId, "us-ky-general-assembly-v1:house").eligible,
    ).toBe(true);
  });
});

describe("requirements a player has to be able to read", () => {
  it("reads a requirement stated in months rather than rounding it away", () => {
    const { world, personId } = lifeIn("2700172", "playtest-months", 18);
    const reasons = eligibility(
      world,
      personId,
      "us-mn-legislature-v1:house",
    ).blocks.map((block) => block.reason);
    expect(reasons.join(" ")).not.toContain("cannot read");
  });

  it("never prints a transport value at a player", () => {
    const { world, personId } = lifeIn("3900198", "playtest-raw", 18);
    const reasons = eligibility(
      world,
      personId,
      "us-oh-general-assembly-v1:house",
    ).blocks.map((block) => block.reason);
    const shown = reasons.join(" ");
    expect(shown).not.toContain("RESIDENT_1_YEAR");
    expect(shown).not.toContain("requires true");
    expect(shown).toContain("qualified elector");
  });
});

describe("finding the town you typed", () => {
  it.each([
    ["Columbus", "US-OH"],
    ["Charleston", "US-WV"],
    ["Kansas City", "US-MO"],
    ["Portland", "US-ME"],
  ])(
    "offers %s itself before a longer name containing it",
    (town, stateKey) => {
      const hits = searchLifePlaces(town, 5, {
        stateJurisdictionKey: stateKey,
        scope: "locality",
      });
      expect(hits[0]?.displayName.split(",")[0]).toBe(town);
    },
  );

  it("leaves a whole-state listing alphabetical", () => {
    const listed = searchLifePlaces("", 3, {
      stateJurisdictionKey: "US-OH",
      scope: "locality",
    }).map((place) => place.displayName);
    expect(listed).toEqual(
      [...listed].sort((a, b) => a.localeCompare(b, "en")),
    );
  });
});
