import { describe, expect, it } from "vitest";

import { legislativeBlueprint, lifePlaceByKey } from "../simulation";
import {
  BARGAINING_BRIEF_SCENARIO_KEY,
  BENEFICIARY_LABEL,
  PLACE_LABEL,
  REQUESTED_MATCH_PLACE_GEOID,
} from "./legislative-bargaining-brief";

/**
 * DIRECTOR42 ROLE B — the place this sitting names is a place the game knows.
 *
 * The authored sitting asks a member to write a local match for a named
 * transit authority in a named city. Both were free-standing text: nothing
 * connected "Ashland" in a player-visible clause to the location corpus, so
 * the clause could have been about a place the game has no record of, and
 * nothing would have said so.
 *
 * This holds the labels to the corpus record they claim to be about. It does
 * not widen the sitting — the cast and place are still written for one
 * Kentucky measure, and that remains open work — but a player-visible clause
 * can no longer name a place the game does not have, and if the record moves
 * or the sitting changes legislature, this fails rather than the prose
 * quietly becoming untrue.
 */

describe("the local match names a real place", () => {
  it("resolves to a record in the location corpus", () => {
    const place = lifePlaceByKey(REQUESTED_MATCH_PLACE_GEOID);
    expect(
      place,
      `no place in the corpus is keyed ${REQUESTED_MATCH_PLACE_GEOID}`,
    ).not.toBeNull();
    expect(place!.sourceGeoid).toBe(REQUESTED_MATCH_PLACE_GEOID);
    expect(place!.scope).toBe("locality");
  });

  it("is the city the authored clauses actually name", () => {
    const place = lifePlaceByKey(REQUESTED_MATCH_PLACE_GEOID)!;
    // The corpus names a locality "City, State"; the clause says the city.
    expect(place.displayName).toBe(`${PLACE_LABEL}, ${place.withinName}`);
    expect(BENEFICIARY_LABEL).toContain(PLACE_LABEL);
  });

  it("sits in the legislature this sitting belongs to", () => {
    const place = lifePlaceByKey(REQUESTED_MATCH_PLACE_GEOID)!;
    const sitting = legislativeBlueprint(BARGAINING_BRIEF_SCENARIO_KEY);
    // A local match written into one state's bill has to be a place in that
    // state. This is the check that would catch the sitting being pointed at
    // another legislature while its clauses stayed where they were.
    expect(place.stateJurisdictionKey).toBe(sitting.pack.jurisdictionKey);
  });
});
