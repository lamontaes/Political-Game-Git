import { describe, expect, it } from "vitest";
import { buildProductionWorld } from "./production-world";
import { buildLifeIntroduction } from "./life-introduction";
import { requireLifePlace } from "../simulation/life-places";
import {
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../simulation/life";
import { householdMembershipsAt } from "../simulation/life-queries";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";

function make(
  household: "lives-alone" | "shares-a-home",
  version: "context-v2" | undefined = "context-v2",
) {
  return buildProductionWorld({
    seed: "household-positive-fact",
    place: requireLifePlace("2309585"),
    age: 34,
    givenName: "Alex",
    familyName: "Lane",
    household,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    earlierLifeGenerationVersion: version,
  });
}
describe("explicit current single-resident introduction", () => {
  it("renders the actual answer without changing a saved life on read", () => {
    const game = make("lives-alone");
    const saved = serializeWorld(game.world);
    const loaded = deserializeWorld(saved);
    expect(
      buildLifeIntroduction(loaded, game.playerPersonId)?.sentences,
    ).toContain("You live alone.");
    expect(serializeWorld(loaded)).toBe(saved);
    expect(
      game.world.history.events.filter(
        (event) => event.type === "life.household-composition",
      ),
    ).toHaveLength(1);
  });
  it("preserves unknown wording for legacy and incomplete shared households", () => {
    // Explicit omission, rather than the helper's default parameter.
    const old = buildProductionWorld({
      seed: "legacy-alone",
      place: requireLifePlace("2309585"),
      age: 34,
      givenName: "Alex",
      familyName: "Lane",
      household: "lives-alone",
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
    });
    expect(
      buildLifeIntroduction(old.world, old.playerPersonId)?.sentences,
    ).toContain("No one else is recorded in your current household.");
    const shared = make("shares-a-home");
    const incomplete = {
      ...shared.world,
      history: {
        ...shared.world.history,
        householdMemberships: shared.world.history.householdMemberships.filter(
          (member) => member.personId === shared.playerPersonId,
        ),
      },
    };
    expect(
      buildLifeIntroduction(incomplete, shared.playerPersonId)?.sentences,
    ).toContain("No one else is recorded in your current household.");
    expect(
      buildLifeIntroduction(shared.world, shared.playerPersonId)?.sentences,
    ).not.toContain("You live alone.");
  });
  it("does not carry the old claim through a moved home or new co-resident", () => {
    const game = make("lives-alone");
    const home = householdMembershipsAt(game.world, game.playerPersonId).find(
      (entry) => entry.state.residenceRole === "primary",
    )!;
    const moved = recordHouseholdLocation(game.world, {
      stableKey: "fixture:changed-home",
      householdId: home.household.id,
      supersedesLocationId: home.location!.id,
      effectiveAt: game.world.currentDate,
      jurisdictionId: home.location!.jurisdictionId,
      label: "A new home",
      kind: "residence:home",
      provenance: { kind: "authored", note: "Move regression fixture" },
    });
    expect(
      buildLifeIntroduction(moved, game.playerPersonId)?.sentences,
    ).not.toContain("You live alone.");
    const other = game.world.personOrder.find(
      (id) => id !== game.playerPersonId,
    )!;
    const joined = startHouseholdMembership(game.world, {
      stableKey: "fixture:new-housemate",
      personId: other,
      householdId: home.household.id,
      startedAt: game.world.currentDate,
      residenceRole: "secondary",
      kind: "resident:member",
      provenance: { kind: "authored", note: "Co-resident regression fixture" },
    });
    expect(
      buildLifeIntroduction(joined, game.playerPersonId)?.sentences,
    ).not.toContain("You live alone.");
  });
});
