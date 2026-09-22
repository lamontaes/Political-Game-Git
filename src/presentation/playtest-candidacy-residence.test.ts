import { describe, expect, it } from "vitest";

import { candidacyEligibility, searchLifePlaces } from "../simulation";
import { recordedDistrictResidenceSince } from "../simulation/district-residence";
import { stateResidenceSince } from "../simulation/nationwide-world/residence-duration";
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

  it("refuses a split city by naming the district as the thing it cannot say", () => {
    // Columbus is split across more than one district, so the whole-place join
    // cannot say which one its resident lives in. Unknown stays unknown — and
    // the refusal says which unknown it is. Telling a lifelong Columbus
    // resident the game never recorded when they came to live there would be
    // untrue: it recorded that, and only the district is missing.
    const { world, personId } = lifeIn("3918000", "playtest-split", 18);
    const result = eligibility(
      world,
      personId,
      "us-oh-general-assembly-v1:house",
    );
    expect(result.eligible).toBe(false);
    const reasons = result.blocks.map((block) => block.reason).join(" ");
    expect(reasons).toContain(
      "lies across more than one district, so the game cannot say which one they live in",
    );
    expect(reasons).not.toContain(
      "has not recorded when this character came to live here",
    );
  });

  it("gives the district the same start date the state already has", () => {
    // One home, two clocks. The state clock reads the household records and
    // answers with a date decades back; the district interval used to start
    // on the day the world was written, so the same life was resident in
    // Alaska since childhood and in its own house district for zero days.
    // Nothing in the world's records says that, and a residence rule measured
    // against it refuses a lifelong resident.
    const { world, personId } = lifeIn("0200650", "playtest-clocks", 0);
    const state = stateResidenceSince(world, personId, "US-AK");
    const district = recordedDistrictResidenceSince(
      world,
      personId,
      "state-lower",
      world.currentDate,
    );
    expect(state).not.toBeNull();
    expect(district).not.toBeNull();
    expect(district).toBe(state);
    expect(district! < world.currentDate).toBe(true);
  });

  it("lets a lifelong resident stand for their own seat on day one", () => {
    // The same seat as the Alaska row above, with no months let pass. A
    // forty-year-old who has lived in Sitka all their life is no longer told
    // the world has no start date for that interval; it has one, from the
    // household records, and it is decades old.
    //
    // This test used to pin a SECOND blocker as well: Alaska's provisions were
    // read from the source in September 2026, and that reading did not reach a
    // January start, so the seat still refused for a dating reason rather than
    // a residence one. Both were pinned so the two would not be confused for
    // one. The dating has since been fixed on this branch's base, so the
    // refusal is gone and the whole journey opens — which is the thing the
    // residence work was for. What remains pinned is the outcome, and the two
    // specific sentences that must never come back.
    const { world, personId } = lifeIn("0200650", "playtest-day-zero", 0);
    const verdict = eligibility(world, personId, "us-ak-legislature-v1:house");
    const reasons = verdict.blocks.map((block) => block.reason).join(" ");
    expect(reasons).not.toContain("no proved start date");
    expect(reasons).not.toContain(
      "has not recorded when this character came to live here",
    );
    expect(verdict.blocks).toEqual([]);
    expect(verdict.eligible).toBe(true);
  });

  it("still refuses where the district genuinely cannot be established", () => {
    // Nothing above was loosened. A town split across several districts still
    // refuses, and still says the district is what it cannot establish.
    const { world, personId } = lifeIn("3918000", "playtest-split-town", 0);
    const reasons = eligibility(
      world,
      personId,
      "us-oh-general-assembly-v1:house",
    )
      .blocks.map((block) => block.reason)
      .join(" ");
    expect(reasons).not.toContain(
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

  /**
   * The band nothing had ever been measured in.
   *
   * Every candidacy case here and every figure the playtest lane has reported
   * used either no residence at all or 700 days, and 700 days clears six
   * months and a year alike however the number is rounded. Between the two
   * cutoffs is the only place a whole-year model gives a different answer, so
   * it is the only place this can be held.
   *
   * Ten months of residence in Minnesota, where the House asks for six. The
   * date is also past the September observation, so the rule is established
   * and the refusal, if one came, would be about the duration and nothing
   * else. Rounding the requirement up to a year refuses this character.
   */
  it("admits somebody past a six-month cutoff but short of a year", () => {
    const { world, personId } = lifeIn("2700172", "playtest-band", 10);
    const result = eligibility(world, personId, "us-mn-legislature-v1:house");
    expect(result.blocks.map((block) => block.reason)).toEqual([]);
    expect(result.eligible).toBe(true);
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
