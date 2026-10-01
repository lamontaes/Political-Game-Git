import { describe, expect, it } from "vitest";

import { annualPovertyLineMinor } from "./household-pay";
import {
  lifePlaceByKey,
  lifePlaces,
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { homeStateKey } from "./state-jurisdiction-id";
import type { EntityId, World } from "./types";

/** A world holding one person living in one jurisdiction record. */
function livingIn(jurisdiction: World["jurisdictions"][EntityId]): World {
  return {
    people: {
      ["p" as EntityId]: { homeJurisdictionId: jurisdiction.id },
    },
    jurisdictions: { [jurisdiction.id]: jurisdiction },
  } as unknown as World;
}

/**
 * The one home-state reader reads the jurisdiction record, without the place
 * list. Every place the list holds, in all 56 states and territories, must
 * get the state the place list itself gives it.
 */
describe("one home-state reader and one poverty line, all 56 places", () => {
  it("every place on the list reads its own state from its record", () => {
    const states = new Set<string>();
    let places = 0;
    const listed = [
      ...lifePlaces(),
      ...lifePlaceStateIdentities().flatMap((identity) =>
        searchLifePlaces("", 25, {
          stateJurisdictionKey: identity.jurisdictionKey,
        }).map((found) => lifePlaceByKey(found.key)!),
      ),
    ];
    for (const place of listed) {
      if (!place.stateJurisdictionKey) continue;
      places += 1;
      states.add(place.stateJurisdictionKey);
      expect(
        homeStateKey(livingIn(place.context.jurisdiction), "p" as EntityId),
        place.key,
      ).toBe(place.stateJurisdictionKey);
    }
    expect(states.size).toBe(56);
    expect(places).toBeGreaterThan(56);
  });

  it("each state's own record reads itself, and the guideline names match", () => {
    const identities = lifePlaceStateIdentities();
    expect(identities).toHaveLength(56);
    for (const identity of identities) {
      const state = stateJurisdictionForKey(identity.jurisdictionKey)!;
      expect(homeStateKey(livingIn(state), "p" as EntityId)).toBe(
        identity.jurisdictionKey,
      );
      // The guideline is keyed by the state's own name.
      expect(state.name, identity.usps).toBe(identity.name);
    }
    // Alaska and Hawaii have guidelines of their own; the rest share one.
    const day = "2026-06-01" as Parameters<typeof annualPovertyLineMinor>[2];
    expect(annualPovertyLineMinor("US-AK", 3, day)).toBeGreaterThan(
      annualPovertyLineMinor("US-OH", 3, day),
    );
    expect(annualPovertyLineMinor("US-OH", 3, day)).toBe(
      annualPovertyLineMinor("US-GU", 3, day),
    );
  });
});
