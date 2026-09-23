import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import {
  advanceWorldMinutes,
  CONTINGENT_STATES,
  deserializeWorld,
  nationalElectionRules,
  nationalOutcome,
  nationalRecords,
  presidentialTermsCounted,
  serializeWorld,
  simulationMinutesBetween,
} from "../simulation";
import type { EntityId, NationalUnitResult, World } from "../simulation";
import { currentPublicOfficeholders } from "./opening-officeholders";

function holder(world: World, officeKey: string) {
  return (
    currentPublicOfficeholders(world).find(
      (record) => record.officeKey === officeKey,
    ) ?? null
  );
}

function election(world: World, cycle: number) {
  return (world.history.nationalElections ?? []).find(
    (record) => record.cycle === cycle,
  );
}

describe("PRESIDENTIAL CONTINUITY: the presidency is elected on the clock", () => {
  it("holds 2028 with nobody played, seats each winner at noon on January 20, and puts 2032 on the calendar", () => {
    const { world } = adultLifeIn("MT", "presidential-continuity");
    const opening = holder(world, "us-president")!;
    expect(opening).not.toBeNull();
    expect(holder(world, "us-vice-president")).not.toBeNull();

    // Before the field closes nothing is decided, but the closing is on the
    // calendar, so time stops there.
    const summer = passUntil(world, "2028-08-01");
    expect(election(summer, 2028)).toBeUndefined();
    expect(
      summer.history.futureDueItems.some(
        (due) => due.stableKey === "presidential-turnover/v1:2028:field-close",
      ),
    ).toBe(true);

    // Just before noon on inauguration day the old term still runs.
    const eve = passUntil(summer, "2029-01-19");
    const held = election(eve, 2028)!;
    expect(held.tickets).toHaveLength(2);
    // Twelfth Amendment: no ticket's two nominees share a state.
    for (const ticket of held.tickets)
      expect(ticket.presidentState).not.toBe(ticket.vicePresidentState);
    const records = nationalRecords(eve, held.id);
    expect(
      records.filter((record) => record.kind === "unit-result"),
    ).toHaveLength(56);
    expect(
      records.filter((record) => record.kind === "certification"),
    ).toHaveLength(56);
    expect(records.filter((record) => record.kind === "ballot")).toHaveLength(
      538,
    );
    const count = records.find((record) => record.kind === "count");
    expect(count).toBeDefined();
    const president = nationalOutcome(eve, held.id, "president");
    const vicePresident = nationalOutcome(eve, held.id, "vice-president");
    // A two-ticket race can tie at 269; this seed does not.
    expect(president).not.toBeNull();
    expect(vicePresident).not.toBeNull();
    expect(holder(eve, "us-president")?.personId).toBe(opening.personId);
    const types = new Set(eve.history.events.map((event) => event.type));
    for (const type of [
      "election.presidential-nomination",
      "election.presidential-popular-vote",
      "election.presidential-electoral-count",
    ])
      expect(types.has(type)).toBe(true);

    // Noon on January 20 is crossed within one day: one minute before, the
    // winner has not taken the oath; one minute after, the winner holds the
    // office. Neither step changes the date, so the oath cannot wait for
    // midnight. (The opening tenure is dated by day, so it ends at the start
    // of January 20, not at noon; that is the tenure record's granularity.)
    const plan = nationalRecords(eve, held.id).find(
      (record) => record.kind === "term-plan" && record.office === "president",
    );
    expect(plan?.kind).toBe("term-plan");
    const noon = plan!.kind === "term-plan" ? plan!.startsAt : null;
    const beforeNoon = advanceWorldMinutes(
      eve,
      simulationMinutesBetween(eve.currentMoment, noon!) - 1,
    );
    expect(beforeNoon.currentDate).toBe("2029-01-20");
    expect(
      nationalRecords(beforeNoon, held.id).some(
        (record) => record.kind === "qualification",
      ),
    ).toBe(false);
    const afterNoon = advanceWorldMinutes(beforeNoon, 2);
    expect(afterNoon.currentDate).toBe("2029-01-20");
    expect(holder(afterNoon, "us-president")?.personId).toBe(
      president!.personId,
    );
    expect(holder(afterNoon, "us-vice-president")?.personId).toBe(
      vicePresident!.personId,
    );
    const reloadedAtNoon = deserializeWorld(serializeWorld(afterNoon));
    expect(holder(reloadedAtNoon, "us-president")?.personId).toBe(
      president!.personId,
    );
    expect(holder(reloadedAtNoon, "us-vice-president")?.personId).toBe(
      vicePresident!.personId,
    );

    // After noon on January 20 the winners hold the offices.
    const inaugurated = passUntil(eve, "2029-01-22");
    expect(holder(inaugurated, "us-president")?.personId).toBe(
      president!.personId,
    );
    expect(holder(inaugurated, "us-vice-president")?.personId).toBe(
      vicePresident!.personId,
    );
    expect(
      inaugurated.history.events.some(
        (event) =>
          event.type === "election.national-office-entered" &&
          event.tags.includes("office:us-president"),
      ),
    ).toBe(true);
    expect(presidentialTermsCounted(inaugurated, president!.personId)).toBe(
      president!.personId === opening.personId ? 2 : 1,
    );

    // A saved game reopens with the same holders and the next field closing.
    const reopened = deserializeWorld(serializeWorld(inaugurated));
    expect(holder(reopened, "us-president")?.personId).toBe(
      president!.personId,
    );
    expect(
      reopened.history.futureDueItems.some(
        (due) => due.stableKey === "presidential-turnover/v1:2032:field-close",
      ),
    ).toBe(true);
  }, 900_000);

  it("sends a 269-269 tie to the House, one vote per state, and the Vice President to the Senate", () => {
    const { world } = adultLifeIn("OR", "presidential-tie");
    // The day after the 2028 election, before the states certify.
    const counted = passUntil(world, "2028-11-09");
    const held = election(counted, 2028)!;
    const [first, second] = held.tickets;
    // Test fixture only: the reported unit winners are reassigned so the two
    // tickets carry exactly 269 electors each. The simulation's own swing
    // rarely lands here, and the tie path is what this test is about.
    const units = nationalElectionRules(2028).units;
    let remaining = 269;
    const firstUnits = new Set<string>();
    for (const unit of [...units].sort((a, b) => b.electors - a.electors))
      if (unit.electors <= remaining) {
        firstUnits.add(unit.key);
        remaining -= unit.electors;
      }
    expect(remaining).toBe(0);
    const tied: World = {
      ...counted,
      history: {
        ...counted.history,
        nationalElectionRecords: (
          counted.history.nationalElectionRecords ?? []
        ).map((record) =>
          record.kind === "unit-result" && record.electionId === held.id
            ? ({
                ...record,
                allocationWinnerPersonId: firstUnits.has(record.unitKey)
                  ? first!.presidentPersonId
                  : second!.presidentPersonId,
              } satisfies NationalUnitResult)
            : record,
        ),
      },
    };

    const afterCount = passUntil(tied, "2029-01-08");
    const records = nationalRecords(afterCount, held.id);
    const count = records.find((record) => record.kind === "count");
    expect(count?.kind).toBe("count");
    if (count?.kind !== "count") return;
    expect(count.presidentPersonId).toBeNull();
    expect([...count.presidentialChoicePersonIds].sort()).toEqual(
      [first!.presidentPersonId, second!.presidentPersonId].sort(),
    );
    const house = records.find(
      (record) =>
        record.kind === "contingent-choice" && record.office === "president",
    );
    expect(house?.kind).toBe("contingent-choice");
    if (house?.kind !== "contingent-choice") return;
    expect(house.wholeNumber).toBe(50);
    // One vote per state; the District has none.
    for (const vote of house.votes)
      expect(CONTINGENT_STATES).toContain(vote.voterKey);
    const senate = records.find(
      (record) =>
        record.kind === "contingent-choice" &&
        record.office === "vice-president",
    );
    expect(senate?.kind).toBe("contingent-choice");
    if (senate?.kind !== "contingent-choice") return;
    expect(senate.wholeNumber).toBe(100);

    const president = nationalOutcome(afterCount, held.id, "president");
    const vicePresident = nationalOutcome(
      afterCount,
      held.id,
      "vice-president",
    );
    // Whoever each body chose (or nobody, when a body deadlocks) is what the
    // term plans follow.
    const planned = (office: string): EntityId | null => {
      const plan = records.find(
        (record) => record.kind === "term-plan" && record.office === office,
      );
      return plan?.kind === "term-plan" ? plan.personId : null;
    };
    expect(planned("president")).toBe(house.chosenPersonId);
    expect(planned("vice-president")).toBe(senate.chosenPersonId);
    expect(president?.personId ?? null).toBe(house.chosenPersonId);
    expect(vicePresident?.personId ?? null).toBe(senate.chosenPersonId);
    expect(
      afterCount.history.events.some((event) =>
        event.tags.includes("contingent:house"),
      ),
    ).toBe(true);

    const inaugurated = passUntil(afterCount, "2029-01-22");
    if (house.chosenPersonId)
      expect(holder(inaugurated, "us-president")?.personId).toBe(
        house.chosenPersonId,
      );
    const reopened = deserializeWorld(serializeWorld(inaugurated));
    expect(
      nationalOutcome(reopened, held.id, "president")?.personId ?? null,
    ).toBe(house.chosenPersonId);
  }, 900_000);
});
