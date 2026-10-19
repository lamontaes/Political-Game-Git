import { describe, expect, it } from "vitest";
import {
  corePlaceByJurisdictionId,
  corePlaceByKey,
  corePlaceStateIdentities,
  coreSeatOfGovernmentPlace,
  coreStateJurisdiction,
  searchCorePlaces,
} from "./place-lookup";
import { realLocalities } from "./places";

describe("core place lookup", () => {
  it("lists every locality in the search corpus's order", () => {
    const search = corePlaceStateIdentities().flatMap((state) =>
      searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      }),
    );
    expect(JSON.stringify(realLocalities())).toBe(JSON.stringify(search));
  }, 300_000);

  it("finds each place again by its jurisdiction, and every state its seat", () => {
    for (const place of realLocalities().slice(0, 2000))
      expect(
        corePlaceByJurisdictionId(place.context.jurisdiction.id)?.key,
      ).toBe(place.key);
    for (const state of corePlaceStateIdentities()) {
      expect(coreStateJurisdiction(state.jurisdictionKey)?.name).toBe(
        state.name,
      );
      const seat = coreSeatOfGovernmentPlace(state.jurisdictionKey);
      if (seat)
        expect(seat.place.stateJurisdictionKey).toBe(state.jurisdictionKey);
    }
    expect(corePlaceByKey("no-such-place")).toBeNull();
    expect(coreStateJurisdiction("US-XX")).toBeNull();
  });
});
