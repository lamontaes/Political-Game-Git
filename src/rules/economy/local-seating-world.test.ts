import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { seatLocalBusinesses as native } from "../../simulation/local-economy";
import { createCharacterHistoryContextPeople } from "../../simulation/character-history";
import {
  createOrganization,
  createWorkRelationships,
} from "../../simulation/life";
import { createResourceFlows } from "../../simulation/resources";
import { writeWithWorldIntegrityOnce } from "../../simulation/world";
import { seatLocalBusinesses } from "./local-seating";
import { localSeatingFacts } from "./test-support/local-seating-facts";
import type { World, EntityId } from "../../simulation/types";
function run(world: World, town: EntityId) {
  const expected = native(world, town),
    gen = seatLocalBusinesses(localSeatingFacts(world, town), town);
  let current = world,
    step = gen.next();
  writeWithWorldIntegrityOnce(world, () => {
    while (!step.done) {
      const r = step.value;
      switch (r.kind) {
        case "createCharacterHistoryContextPeople":
          current = createCharacterHistoryContextPeople(current, r.input);
          break;
        case "createOrganization":
          current = createOrganization(current, r.input);
          break;
        case "createWorkRelationships":
          current = createWorkRelationships(current, r.input);
          break;
        case "createResourceFlows":
          current = createResourceFlows(current, r.input);
          break;
      }
      step = gen.next(localSeatingFacts(current, town));
    }
    return current;
  });
  expect(current).toEqual(expected);
  return current;
}
describe.each(Object.keys(STATES))(
  "complete local business public owner in US-%s",
  (usps) => {
    it("matches all canonical people/businesses/jobs/flows, formation and service dates and repeat seating", () => {
      const f = smallWorld({
        place: "US-" + usps,
        people: 4,
        date: "2026-01-05",
        seed: "rules2:local-seating:" + usps,
      });
      const result = run(f.world, f.jurisdictionId);
      run(result, f.jurisdictionId);
      // Raw chronology control changes the input date before canonical producers; no later records or NPC claim.
      const old = smallWorld({
        place: "US-" + usps,
        people: 4,
        date: "2024-02-29",
        seed: "rules2:local-seating-leap:" + usps,
      });
      run(old.world, old.jurisdictionId);
    }, 120000);
  },
);
