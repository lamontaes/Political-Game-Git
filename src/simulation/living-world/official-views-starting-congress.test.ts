import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import { currentPresidentOf } from "../crisis/offices";
import type { EntityId } from "../types";
import { projectCongress } from "./congress";
import { officialsBehind } from "./official-views";

describe("starting federal laws name the actual officials who can repeal them", () => {
  const places = lifePlaceStateIdentities();
  it("covers all 56 jurisdictions", () => {
    expect(places).toHaveLength(56);
  });

  it.each(places)("reads seated people in $jurisdictionKey", (place) => {
    const { world } = smallWorld({
      place: place.jurisdictionKey,
      seed: `au4-07-starting-congress:${place.jurisdictionKey}`,
      offices: ["congress"],
    });
    const congress = projectCongress(world)!;
    const members = [...congress.house.seats, ...congress.senate.seats].flatMap(
      (seat) =>
        seat.occupant.kind === "member" ? [seat.occupant.member.personId] : [],
    );
    expect(members).toHaveLength(535);
    const president = currentPresidentOf(world)!.personId;
    const acts = officialsBehind(
      world,
      "starting-law:US:us-tax-terms:federal.income-tax-terms" as EntityId,
    );
    expect(new Set(acts.map((act) => act.officialId))).toEqual(
      new Set([...members, president]),
    );
    for (const act of acts) {
      expect(world.people[act.officialId]).toBeDefined();
      expect(act.role).toBe("could-repeal");
    }
  });
});
