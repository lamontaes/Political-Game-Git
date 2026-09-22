import { describe, expect, it } from "vitest";

import {
  LEGISLATIVE_RULE_PACKS,
  candidacyAuthority,
  candidacyPackForJurisdiction,
  candidacyPacks,
  legislatureForState,
  lifePlaceByKey,
  requireLifePlace,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./index";
import type { LifePlace } from "./index";

/**
 * A city is inside its state.
 *
 * The owner play started a life in Lexington, opened the day, and was told
 * nobody had written down the elected offices there and the game would not
 * borrow another state's rules. Both halves of that sentence were wrong for
 * the situation: Kentucky's General Assembly is an accepted pack, and reaching
 * it from a Kentucky city is not borrowing anything.
 *
 * These tests hold the repaired boundary: state authority is inherited through
 * a declared parent-state key, local authority is not inherited at all, and a
 * state with no accepted pack still gives nothing.
 */

function localityIn(query: string, displayName: string): LifePlace {
  const place = searchLifePlaces(query, 80).find(
    (candidate) => candidate.displayName === displayName,
  );
  if (!place) throw new Error(`The corpus has no ${displayName}.`);
  return place;
}

/** The states whose own law has actually been compiled. */
function compiledPackJurisdictions(): ReadonlySet<string> {
  return new Set(LEGISLATIVE_RULE_PACKS.map((pack) => pack.jurisdictionKey));
}

function unsupportedLocality(): LifePlace {
  // "Unsupported" means the state's own law has not been COMPILED. It no
  // longer means the state has nothing: every state has a legislature now.
  const supported = compiledPackJurisdictions();
  const place = searchLifePlaces("a", 500).find(
    (candidate) =>
      candidate.scope === "locality" &&
      candidate.stateJurisdictionKey !== null &&
      !supported.has(candidate.stateJurisdictionKey),
  );
  if (!place) throw new Error("The place corpus has no unsupported locality.");
  return place;
}

describe("a locality reaches its own state, and no other", () => {
  it("resolves governing state identities without adding municipal or UI capabilities", () => {
    const before = requireLifePlace("lexington-fayette").capabilities;
    for (const pack of candidacyPacks()) {
      const state = stateJurisdictionForKey(pack.jurisdictionKey);
      expect(state).not.toBeNull();
      expect(state!.kind).toBe("state-placeholder");
      expect(state!.id).not.toBe(
        requireLifePlace("lexington-fayette").context.jurisdiction.id,
      );
      expect(stateJurisdictionForKey(pack.jurisdictionKey)).toStrictEqual(
        state,
      );
    }
    expect(stateJurisdictionForKey("US-KY")).toStrictEqual(
      requireLifePlace("kentucky").context.jurisdiction,
    );
    expect(stateJurisdictionForKey("unknown")).toBeNull();
    expect(requireLifePlace("lexington-fayette").capabilities).toBe(before);
    expect(before.legislativeScenarioKey).toBeNull();
  });
  it("gives a Lexington life Kentucky's state offices", () => {
    const lexington = requireLifePlace("lexington-fayette");
    expect(lexington.scope).toBe("locality");
    expect(lexington.stateJurisdictionKey).toBe("US-KY");
    // The city itself still declares nothing. That has not changed.
    expect(lexington.capabilities.candidacyPackId).toBeNull();

    const authority = candidacyAuthority(lexington.context.jurisdiction.id);
    expect(authority.pack?.packId).toBe("us-ky-general-assembly-v1:candidacy");
    expect(authority.scope).toBe("state");
    expect(authority.pack?.jurisdictionKey).toBe("US-KY");
  });

  it.each([
    ["Chicago", "Chicago, Illinois", "US-IL", "us-il-general-assembly-v1"],
    ["Minneapolis", "Minneapolis, Minnesota", "US-MN", "us-mn-legislature-v1"],
    ["Omaha", "Omaha, Nebraska", "US-NE", "us-ne-legislature-v1"],
    ["Anchorage", "Anchorage, Alaska", "US-AK", "us-ak-legislature-v1"],
  ])("maps %s to its own state pack", (query, name, stateKey, packId) => {
    const place = localityIn(query, name);
    expect(place.stateJurisdictionKey).toBe(stateKey);
    const authority = candidacyAuthority(place.context.jurisdiction.id);
    expect(authority.pack?.packId).toBe(`${packId}:candidacy`);
    expect(authority.scope).toBe("state");
  });

  it("gives a place in a state with no compiled pack the game's own, never another state's", () => {
    // This used to assert nothing at all, and "nothing at all" was the bug: a
    // state whose law had not been compiled had no office anybody could stand
    // for, so the absence of research read as the absence of government. It
    // now gets a legislature and offices of the game's own, and what this test
    // protects is the thing that must still never happen — the pack being some
    // OTHER state's.
    const unsupported = unsupportedLocality();
    const authority = candidacyAuthority(unsupported.context.jurisdiction.id);
    expect(authority.pack).not.toBeNull();
    expect(authority.scope).toBe("state");
    expect(authority.pack!.jurisdictionKey).toBe(
      unsupported.stateJurisdictionKey,
    );
    expect(
      candidacyPackForJurisdiction(unsupported.context.jurisdiction.id),
    ).not.toBeNull();

    // And it is visibly the game's own rather than a reading of this state.
    const generated = legislatureForState(unsupported.stateJurisdictionKey!)!;
    expect(generated.basis).toBe("game-profile");
    expect(
      compiledPackJurisdictions().has(unsupported.stateJurisdictionKey!),
    ).toBe(false);
  });

  it("never resolves a place to a different state's pack", () => {
    // Every place the corpus can produce, checked against its own state key.
    const probes = [
      localityIn("Chicago", "Chicago, Illinois"),
      localityIn("Anchorage", "Anchorage, Kentucky"),
      localityIn("Omaha", "Omaha, Illinois"),
      requireLifePlace("lexington-fayette"),
    ];
    for (const place of probes) {
      const authority = candidacyAuthority(place.context.jurisdiction.id);
      if (authority.pack === null) continue;
      expect(authority.pack.jurisdictionKey).toBe(place.stateJurisdictionKey);
    }
  });

  it("keeps local office missingness separate from state office missingness", () => {
    // A Kentucky city: the state answers, the city still does not.
    const lexington = candidacyAuthority(
      requireLifePlace("lexington-fayette").context.jurisdiction.id,
    );
    expect(lexington.pack).not.toBeNull();
    expect(lexington.localOfficesUnsourced).toBe(true);

    // A city in a state with no compiled pack: the state answers with the
    // game's own rules, and the city still does not answer at all. The two
    // facts stay distinct, which is the whole point of this test — a state
    // supplying an office has never said anything about a city's council.
    const unsupportedPlace = unsupportedLocality();
    const unsupported = candidacyAuthority(
      unsupportedPlace.context.jurisdiction.id,
    );
    expect(unsupported.pack).not.toBeNull();
    expect(unsupported.localOfficesUnsourced).toBe(true);
    expect(
      legislatureForState(unsupportedPlace.stateJurisdictionKey!)!.basis,
    ).toBe("game-profile");
  });

  it("keeps an authored state entry a state, not a hometown", () => {
    const kentucky = lifePlaceByKey("kentucky");
    expect(kentucky?.scope).toBe("state");
    expect(kentucky?.stateJurisdictionKey).toBe("US-KY");
  });
});
