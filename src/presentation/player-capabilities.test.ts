import { describe, expect, it } from "vitest";

import { lifePlaceByKey } from "../simulation";
import type { World } from "../simulation";
import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import {
  resolvePlayerCapabilities,
  withheldReason,
} from "./player-capabilities";

/**
 * Which surfaces a life is allowed to reach, and on what authority.
 *
 * The interesting cases are the ones where the address and the job disagree.
 * People commute across a state line; people move house without changing
 * chambers. Reading the home jurisdiction and calling it the workplace hands
 * somebody a rule pack that does not govern their work, which is worse than
 * showing them nothing.
 */

const BASE: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "legislative-office",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
};

function start(overrides: Partial<NewGameSetup> = {}) {
  return createNewGameWorld({ ...BASE, seed: "capabilities", ...overrides });
}

/**
 * Moves the character's home address into another place, leaving the job
 * exactly where it was. This is a house move, not a job change.
 */
function moveHouseTo(world: World, placeKey: string): World {
  const destination = lifePlaceByKey(placeKey);
  if (!destination) throw new Error(`No place named '${placeKey}'.`);
  const jurisdiction = destination.context.jurisdiction;
  if (world.control.kind !== "person") throw new Error("No controlled person.");
  const person = world.people[world.control.personId]!;
  return {
    ...world,
    jurisdictions: { ...world.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
    people: {
      ...world.people,
      [person.id]: { ...person, homeJurisdictionId: jurisdiction.id },
    },
  };
}

describe("What a life is allowed to reach", () => {
  it("gives a staffer the legislature they actually work for", () => {
    const capabilities = resolvePlayerCapabilities(start().world);
    expect(capabilities.office).toBe(true);
    expect(capabilities.legislation).toBe(true);
    expect(capabilities.legislativeScenarioKey).toBe("kentucky");
    expect(capabilities.commutes).toBe(false);
  });

  it("keeps the workplace legislature when the character moves house", () => {
    // Moving to Nebraska does not move a Kentucky job to Nebraska. Before this
    // was resolved from the role's location, the character silently acquired
    // the Nebraska rule pack by changing address.
    const moved = moveHouseTo(start().world, "nebraska");
    const capabilities = resolvePlayerCapabilities(moved);

    expect(capabilities.homePlace?.key).toBe("nebraska");
    expect(capabilities.workPlace?.key).toBe("kentucky");
    expect(capabilities.legislativeScenarioKey).toBe("kentucky");
    expect(capabilities.commutes).toBe(true);
  });

  it("does not borrow a nearby legislature for a place that has none", () => {
    // Lexington-Fayette has no accepted rule pack. A character living there
    // must not be handed Kentucky's procedure with the name swapped.
    const moved = moveHouseTo(start().world, "lexington-fayette");
    const capabilities = resolvePlayerCapabilities(moved);
    expect(capabilities.homePlace?.key).toBe("lexington-fayette");
    expect(capabilities.workPlace?.key).toBe("kentucky");
    expect(capabilities.legislativeScenarioKey).toBe("kentucky");
  });

  it("withholds the legislature from an ordinary adult, with a reason", () => {
    const { world } = start({ startingLife: "ordinary-life" });
    const capabilities = resolvePlayerCapabilities(world);
    expect(capabilities.office).toBe(false);
    expect(capabilities.legislation).toBe(false);
    expect(capabilities.legislativeScenarioKey).toBeNull();
    expect(capabilities.legislativeJurisdictionId).toBeNull();
    expect(withheldReason(capabilities, "legislation")).toBe(
      "This character does not work in a legislature.",
    );
  });

  it("withholds both surfaces from a child, saying why rather than nothing", () => {
    const { world } = start({
      startAge: 9,
      startingLife: "ordinary-life",
      household: "shares-a-home",
      depth: "play-formative-years",
    });
    const capabilities = resolvePlayerCapabilities(world);
    expect(capabilities.formativeYears).toBe(true);
    expect(capabilities.office).toBe(false);
    expect(capabilities.legislation).toBe(false);
    expect(withheldReason(capabilities, "office")).toBe(
      "There is no job yet. These are still the growing-up years.",
    );
    for (const withheld of capabilities.withheld) {
      expect(withheld.reason.trim().length).toBeGreaterThan(0);
      expect(withheld.reason).not.toMatch(/fixture|synthetic|TODO/i);
    }
  });

  it("names the jurisdiction the legislative surface answers to", () => {
    const capabilities = resolvePlayerCapabilities(start().world);
    expect(capabilities.legislativeJurisdictionId).toBe(
      lifePlaceByKey("kentucky")!.context.jurisdiction.id,
    );
  });
});
