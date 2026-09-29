import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import {
  fractionOf,
  resolveRequiredVotes,
} from "../simulation/legislature-rules";
import { rulePackById } from "../simulation/legislature-rule-packs";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { LegislativeVoteRecord, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * A save made before the September 29, 2026 override correction still loads.
 *
 * The first legislature profile drew each generated state's override bar
 * and wrote it as "N of D of the members elected to each chamber". The
 * correction read each bar from the state's constitution under the same pack
 * id, and a save holding an override vote taken under the old bar was then
 * refused at load (Build 9's report: a Maine world saved at 8a13dd1, whose
 * votes recorded "1 of 2 of the members elected to each chamber" where the
 * pack now says "2 of 3 of that House").
 *
 * A Maine save made at 8a13dd1 was loaded at the corrected head by hand.
 * This test rebuilds the same shape in Arizona, whose legislature takes an
 * override vote in its first session (Maine's now closes before a veto comes
 * back): the vote is rewritten to the old bar, every count recomputed from
 * it, as the old code would have recorded it.
 */

function worldWithOverrideVote(): {
  world: World;
  vote: LegislativeVoteRecord;
} {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-AZ",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "oldsave-AZ",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  let world = openOrdinaryLife(game.world, game.playerPersonId);
  for (let month = 0; month < 12; month += 1) {
    world = passOrdinaryDays(world, 30);
    const vote = (world.history.legislativeVotes ?? []).find(
      (candidate) =>
        candidate.purpose === "veto-override" &&
        rulePackById(
          world.history.legislativeMeasures!.find(
            (measure) => measure.id === candidate.measureId,
          )!.rulePackId,
        ).basis === "game-profile",
    );
    if (vote) return { world, vote };
  }
  throw new Error("No override vote in a generated legislature in 12 months.");
}

/** The vote as the first profile would have recorded it under `n of d`. */
function underOldBar(
  vote: LegislativeVoteRecord,
  numerator: number,
  denominatorParts: number,
): LegislativeVoteRecord {
  const label = `${numerator} of ${denominatorParts} of the members elected to each chamber`;
  const required = resolveRequiredVotes(
    fractionOf(numerator, denominatorParts, "members-elected", label, {
      authority: "game-profile",
      citation: "test",
      sourceTitle: "test",
      sourceUrl: null,
      retrievedAt: null,
      verification: "game-profile",
      note: null,
    }),
    vote.eligibleMembers,
  ).requiredVotes;
  return {
    ...vote,
    thresholdLabel: label,
    denominatorKind: "members-elected",
    denominatorValue: vote.eligibleMembers,
    requiredVotes: required,
  };
}

function withVote(world: World, vote: LegislativeVoteRecord): World {
  return {
    ...world,
    history: {
      ...world.history,
      legislativeVotes: world.history.legislativeVotes!.map((candidate) =>
        candidate.id === vote.id ? vote : candidate,
      ),
    },
  };
}

describe("a save made under the first profile's override bar", () => {
  const { world, vote } = worldWithOverrideVote();
  // The old bar the first profile could draw that leaves this vote's
  // recorded outcome as it was.
  const old = [
    [1, 2],
    [3, 5],
    [2, 3],
    [3, 4],
  ]
    .map(([n, d]) => underOldBar(vote, n!, d!))
    .find(
      (candidate) =>
        candidate.thresholdLabel !== vote.thresholdLabel &&
        vote.tally.yea >= candidate.requiredVotes ===
          (vote.outcome === "passed"),
    )!;

  it("loads, keeping the bar the vote was taken under", () => {
    expect(old).toBeDefined();
    const loaded = deserializeWorld(serializeWorld(withVote(world, old)));
    expect(
      loaded.history.legislativeVotes!.find(
        (candidate) => candidate.id === vote.id,
      ),
    ).toEqual(old);
  }, 900_000);

  it("still refuses a vote whose count does not follow from its own bar", () => {
    const wrong = { ...old, requiredVotes: old.requiredVotes + 1 };
    expect(() =>
      deserializeWorld(serializeWorld(withVote(world, wrong))),
    ).toThrow(/required-vote count does not follow from its threshold/);
  });

  it("still refuses a bar the first profile never wrote", () => {
    const foreign = { ...old, thresholdLabel: "three-fifths of those voting" };
    expect(() =>
      deserializeWorld(serializeWorld(withVote(world, foreign))),
    ).toThrow(/records a threshold its rule pack does not impose/);
  });
});
