import { describe, expect, it } from "vitest";

import { candidacyEligibility } from "../simulation";
import { createExplicitGeographyLife } from "./new-game-geography";

/**
 * Found by playing Puerto Rico, not by reading: the pack for a state nobody
 * has read records a minimum age drawn from the national spread, discloses it
 * as the game's own, and nothing held anyone to it. A twenty-one-year-old
 * stood for the Senate of Puerto Rico with no blocks at all, under a generic
 * floor whose refusal said the game had not read a minimum age for this state
 * — while a drawn minimum age sat in the record beside it.
 *
 * A drawn rule that is recorded and never enforced is not the middle of the
 * three states a rule can be in. It is the refusal wearing the generated
 * rule's label, which is worse than the refusal, because the record says
 * otherwise.
 */

function lifeAged(placeKey: string, startAge: number) {
  const created = createExplicitGeographyLife({
    placeKey,
    seed: `drawn-age-${placeKey}-${startAge}`,
    startAge,
    startKind: "normal",
    depth: "begin-adult-life",
  });
  return { world: created.game.world, personId: created.game.playerPersonId };
}

function verdict(placeKey: string, startAge: number, officeKey: string) {
  const { world, personId } = lifeAged(placeKey, startAge);
  return candidacyEligibility(world, {
    personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    officeKey,
    alreadyACandidate: false,
  });
}

/** San Juan. Puerto Rico's own law is unread, so its pack is drawn. */
const SAN_JUAN = "7276770";
/** Akhiok. Alaska's constitution has been read, so its pack is sourced. */
const AKHIOK = "0200650";

const PR_SENATE = "us-pr-legislature-profile-v1:senate";
const PR_HOUSE = "us-pr-legislature-profile-v1:house";
const AK_SENATE = "us-ak-legislature-v1:senate";

describe("a drawn minimum age binds", () => {
  it("refuses a candidate below the age the pack records", () => {
    const blocked = verdict(SAN_JUAN, 21, PR_SENATE);
    expect(blocked.eligible).toBe(false);
    expect(blocked.blocks.map((block) => block.kind)).toContain(
      "profile-minimum-age",
    );
  });

  it("holds to the pack's own number rather than a generic adult floor", () => {
    // The whole defect was a floor of 21 standing in for a recorded 30, so a
    // test that only checked "refused at 18" would have passed throughout.
    // These two ages sit either side of the drawn value and nowhere near the
    // floor.
    expect(verdict(SAN_JUAN, 29, PR_SENATE).eligible).toBe(false);
    expect(verdict(SAN_JUAN, 40, PR_SENATE).eligible).toBe(true);
  });

  it("draws each chamber separately, so a house is not its senate", () => {
    // Pinned because a single drawn value shared across both chambers would
    // satisfy every other assertion here.
    expect(verdict(SAN_JUAN, 24, PR_HOUSE).eligible).toBe(true);
    expect(verdict(SAN_JUAN, 24, PR_SENATE).eligible).toBe(false);
  });

  it("says the requirement and nothing about where it came from", () => {
    const reason =
      verdict(SAN_JUAN, 21, PR_SENATE).blocks.find(
        (block) => block.kind === "profile-minimum-age",
      )?.reason ?? "";
    expect(reason).not.toBe("");
    // A player is never told the game's research state, which states the
    // spread was read from, or that this office's rule was generated at all.
    // All of that survives in the pack's own record, which is where an auditor
    // looks.
    for (const leak of [
      "drawn",
      "spread",
      "profile",
      "game-profile",
      "not a claim",
      "has not read",
      "Minnesota",
      "MN",
      "NJ",
    ]) {
      expect(reason).not.toContain(leak);
    }
  });
});

describe("the sourced path is untouched", () => {
  it("still refuses on Alaska's own constitutional age, in its own words", () => {
    const blocked = verdict(AKHIOK, 24, AK_SENATE);
    expect(blocked.eligible).toBe(false);
    const kinds = blocked.blocks.map((block) => block.kind);
    expect(kinds).toContain("sourced-minimum-age");
    // A read value must never travel through the generated path. If it did, a
    // candidate would be held to the same number twice and told the wrong
    // thing about where it came from.
    expect(kinds).not.toContain("profile-minimum-age");
  });

  it("admits at the sourced age rather than at any drawn one", () => {
    expect(verdict(AKHIOK, 29, AK_SENATE).eligible).toBe(true);
  });
});
