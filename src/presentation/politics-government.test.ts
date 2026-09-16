import { describe, expect, it } from "vitest";

import { lifePlaceSearch } from "../simulation";
import { createNewGameWorld } from "./new-game";
import {
  GOVERNMENT_SCOPES,
  projectGovernmentBrowser,
} from "./politics-government";

function newLife(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

describe("Politics hub government browser", () => {
  it("gives every scope exactly its three branches, each recorded or plainly absent", () => {
    const { world, personId } = newLife("ui-follow-government");
    for (const scope of GOVERNMENT_SCOPES) {
      const view = projectGovernmentBrowser(world, personId, { scope });
      expect(view.scope).toBe(scope);
      expect(view.branches.map((branch) => branch.branch)).toEqual([
        "legislative",
        "executive",
        "judicial",
      ]);
      for (const branch of view.branches) {
        expect(branch.entries.length > 0).toBe(branch.absent === null);
        const text = [
          branch.absent ?? "",
          ...branch.entries.flatMap((entry) => [
            entry.title,
            entry.detail ?? "",
          ]),
        ].join(" ");
        expect(text).not.toMatch(/vacan/i);
      }
      for (const entry of view.branches.flatMap((branch) => branch.entries)) {
        expect(entry.holderPersonId === null).toBe(entry.holderName === null);
        if (entry.holderPersonId) {
          expect(world.people[entry.holderPersonId]).toBeDefined();
        }
      }
    }
  });

  it("defaults to where the character is and labels any other chosen place", () => {
    const { world, personId } = newLife("ui-follow-government-place");
    const here = projectGovernmentBrowser(world, personId);
    expect(here.browsing.isHere).toBe(true);
    expect(here.browsing.jurisdictionId).toBe(here.here.jurisdictionId);

    const alamo = lifePlaceSearch("Alamo", 5, {
      stateJurisdictionKey: "US-NV",
      scope: "locality",
    })[0];
    expect(alamo).toBeDefined();
    const before = JSON.stringify(world);
    const elsewhere = projectGovernmentBrowser(world, personId, {
      scope: "state",
      jurisdictionId: alamo!.context.jurisdiction.id,
    });
    expect(JSON.stringify(world)).toBe(before);
    expect(elsewhere.browsing.isHere).toBe(false);
    expect(elsewhere.browsing.isHome).toBe(false);
    expect(elsewhere.browsing.label).toBe(alamo!.displayName);
    expect(elsewhere.governs).toBe("Nevada");
  });

  it("never gives a state-scope place a local institution", () => {
    const { world, personId } = newLife("ui-follow-government-state");
    const nevada = lifePlaceSearch("Nevada", 20, { scope: "state" }).find(
      (place) => place.stateJurisdictionKey === "US-NV",
    );
    if (!nevada) return;
    const view = projectGovernmentBrowser(world, personId, {
      scope: "local",
      jurisdictionId: nevada.context.jurisdiction.id,
    });
    expect(view.branches.every((branch) => branch.entries.length === 0)).toBe(
      true,
    );
  });
});
