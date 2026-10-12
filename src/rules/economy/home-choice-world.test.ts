import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ageOnDate } from "../../simulation/dates";
import { homeForNewHousehold as native } from "../../simulation/living-world/town-homes";
import { homeForNewHousehold } from "./home-choice";
describe("complete home/tenure carry selector from generated household ages across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          household: true,
          date: "2026-01-05",
          seed: "rules2:economy:home-choice:" + usps,
        });
        const household = {
          members: fixture.world.history.householdMemberships.map((row) => ({
            age: ageOnDate(
              fixture.world.people[row.personId]!.birthDate,
              fixture.world.currentDate,
            ),
          })),
        };
        expect(household.members.length).toBeGreaterThan(0);
        for (const source of [
          household,
          { members: [] },
          { members: [{ age: 59 }] },
          { members: [{ age: 60 }] },
          { members: Array.from({ length: 5 }, () => ({ age: 61 })) },
        ])
          for (const working of [false, true])
            for (const pay of [null, 0, 100000, 1000000])
              for (const payment of [null, 0, 50000])
                for (const mayBorrow of [false, true])
                  for (const farm of [false, true])
                    expect(
                      homeForNewHousehold(
                        source,
                        working,
                        pay,
                        payment,
                        mayBorrow,
                        farm,
                      ),
                    ).toEqual(
                      native(source, working, pay, payment, mayBorrow, farm),
                    ); // Explicit pay/age/count controls; not recorded NPC housing purchases.
      },
      30000,
    );
});
