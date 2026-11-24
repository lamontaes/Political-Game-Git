import { expect, it } from "vitest";
import {
  corePlaceStateIdentities,
  coreStateJurisdiction,
} from "../core2/place-lookup";
import { destinationSaid } from "./purpose-scene";

// A goodbye names where the person is going (owner, Nov 8 playtest, P38), in
// all 56 places: a move "somewhere in the state" has a state or territory for
// its destination, and a territory or the District has no place record of its
// own, so its name is the state's (Frederiksted Southeast, U.S. Virgin
// Islands, was the first place that left the farewell nameless).
it("names every state and territory a move can end in", () => {
  const identities = corePlaceStateIdentities();
  expect(identities.length).toBe(56);
  const said = identities.map((row) => {
    const id = coreStateJurisdiction(row.jurisdictionKey)!.id;
    return [row.name, destinationSaid(id as string, "state")] as const;
  });
  for (const [name, where] of said) {
    expect(where, name).toBeTruthy();
    expect(where, name).toMatch(/^another part of /);
    expect(where, name).toContain(name.replace(/^the /, ""));
  }
  expect(destinationSaid("not-a-place", "state")).toBeNull();
  // A move to another place names the place, not the state it is in.
  expect(
    destinationSaid(coreStateJurisdiction("US-KY")!.id as string, "relative"),
  ).toBe("Kentucky");
});
