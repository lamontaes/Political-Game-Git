import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
  type LifePlace,
} from "../simulation/life-places";

let localities: readonly LifePlace[] | undefined;

/** The old list() API is the authored shortlist; the accepted search corpus contains all 56. */
export function realLocalities(): readonly LifePlace[] {
  if (!localities) {
    const limit = lifePlaceCoverage().placeCount;
    localities = lifePlaceStateIdentities().flatMap((state) =>
      lifePlaceSearch("", limit, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      }),
    );
  }
  return localities;
}
