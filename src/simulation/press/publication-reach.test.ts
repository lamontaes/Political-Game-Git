import { describe, expect, it } from "vitest";
import { hasModeledOutletAudience, sharesPlayerLocalArea } from "./desk";
import { lifePlaceByKey } from "../life-places";
import type { EntityId, World } from "../types";
import type { LifePlace } from "../life-places";

describe("publication reader boundary", () => {
  it("requires an existing person and a recorded outlet habit", () => {
    expect(
      hasModeledOutletAudience({} as World, "reader" as EntityId, "media:test"),
    ).toBe(false);
  });

  it("includes a county shared by the player's town and a modeled county home", () => {
    const town = lifePlaceByKey("2146027");
    const county = lifePlaceByKey("county:21067");
    expect(town?.scope).toBe("locality");
    expect(county?.scope).toBe("county");
    expect(
      sharesPlayerLocalArea(
        "town" as EntityId,
        "county" as EntityId,
        town as LifePlace,
        county as LifePlace,
      ),
    ).toBe(true);
  });
});
