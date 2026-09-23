import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import {
  advanceWorldMinutes,
  deserializeWorld,
  nationalOutcome,
  nationalRecords,
  presidentialTermsCounted,
  serializeWorld,
  simulationMinutesBetween,
} from "../simulation";
import type { World } from "../simulation";
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
    // old term still runs; one minute after, the winner holds the office.
    // Neither step changes the date, so the oath cannot wait for midnight.
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
    expect(holder(beforeNoon, "us-president")?.personId).toBe(opening.personId);
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
});
