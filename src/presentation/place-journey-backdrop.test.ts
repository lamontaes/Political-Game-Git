import { describe, expect, it } from "vitest";
import {
  locationKeyForJourney,
  placeForJourneyLocationKey,
} from "./place-journey-backdrop";

describe("place journey backdrops", () => {
  it("withholds main-street art only for recorded neighborhood journeys", () => {
    const neighborhoodKey = locationKeyForJourney("neighborhood", "local-walk");

    expect(neighborhoodKey).toBe("journey-to-neighborhood:local-walk");
    expect(placeForJourneyLocationKey(neighborhoodKey)).toBeNull();
    const homeKey = locationKeyForJourney("home", "home-walk");
    expect(homeKey).toBe("journey:home-walk");
    expect(placeForJourneyLocationKey(homeKey)).toBe("main-street");
    expect(placeForJourneyLocationKey("journey:old-save")).toBe("main-street");
  });
});
