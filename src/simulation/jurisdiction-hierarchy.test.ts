import { describe, expect, it } from "vitest";

import {
  candidacyAuthority,
  candidacyPackForJurisdiction,
  candidacyPacks,
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

function unsupportedLocality(): LifePlace {
  const supported = new Set(
    candidacyPacks().map((pack) => pack.jurisdictionKey),
  );
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

  it("gives a place in a state with no accepted pack nothing at all", () => {
    const unsupported = unsupportedLocality();
    const authority = candidacyAuthority(unsupported.context.jurisdiction.id);
    expect(authority.pack).toBeNull();
    expect(authority.scope).toBeNull();
    expect(
      candidacyPackForJurisdiction(unsupported.context.jurisdiction.id),
    ).toBeNull();
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

    // A city in a currently unsupported state: neither answers, and the two
    // facts are still distinct.
    const unsupported = candidacyAuthority(
      unsupportedLocality().context.jurisdiction.id,
    );
    expect(unsupported.pack).toBeNull();
    expect(unsupported.localOfficesUnsourced).toBe(true);
  });

  it("keeps an authored state entry a state, not a hometown", () => {
    const kentucky = lifePlaceByKey("kentucky");
    expect(kentucky?.scope).toBe("state");
    expect(kentucky?.stateJurisdictionKey).toBe("US-KY");
  });
});
