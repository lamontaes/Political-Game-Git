import { describe, expect, it, vi } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import {
  addDays,
  advanceWorldMinutes,
  cancelFutureDueItem,
  futureDueItemStateAt,
  CONTINGENT_STATES,
  deserializeWorld,
  nationalAllocation,
  nationalElectionRules,
  nationalOutcome,
  nationalRecords,
  presidentialTermsCounted,
  serializeWorld,
  simulationMinutesBetween,
  simulationMomentOnLocalDate,
} from "../simulation";
import type {
  EntityId,
  FutureDueItem,
  NationalUnitResult,
  World,
} from "../simulation";
import {
  applyPresidentialTurnover,
  presidentialElectionDayHandler,
  presidentialElectorsMeetHandler,
  presidentialFieldCloseHandler,
} from "../simulation/nationwide-world/presidential-turnover";
import type * as PoliticalStart from "../simulation/world-setup/political-start";
import { currentPublicOfficeholders } from "./opening-officeholders";

// Test fixture only: when `tiedState` is set, that state's certified 2024
// row reads as an exact 50-50 split, so the tie path can be exercised.
// Every other read is the real row.
const fixture = vi.hoisted(() => ({ tiedState: null as string | null }));
vi.mock("../simulation/world-setup/political-start", async (importOriginal) => {
  const real = await importOriginal<typeof PoliticalStart>();
  return {
    ...real,
    calibrationRow: (contestKey: string) => {
      const row = real.calibrationRow(contestKey);
      return row && contestKey === `us-president:${fixture.tiedState}`
        ? { ...row, democraticTwoPartyShare: 0.5 }
        : row;
    },
  };
});

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

/**
 * Runs one 2028 presidential step the way the clock delivers it, on the
 * item's due date. Test fixture only: the world's other business due before
 * then is canceled, not run, so no other days are lived between.
 */
function step(
  world: World,
  key: string,
  handler: (world: World, due: FutureDueItem) => { world: World },
): World {
  const due = world.history.futureDueItems.find(
    (item) => item.stableKey === `presidential-turnover/v1:2028:${key}`,
  )!;
  let isolated = world;
  for (const item of world.history.futureDueItems) {
    if (
      item.id === due.id ||
      item.dueAt >= due.dueAt ||
      futureDueItemStateAt(isolated, item.id, {
        asOfDate: isolated.currentDate,
        historySequenceExclusive: isolated.history.nextSequence,
      })?.status !== "scheduled"
    )
      continue;
    isolated = cancelFutureDueItem(isolated, {
      stableKey: `test:a113:isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: isolated.currentDate,
      reasonKey: "civic:fixture-isolation",
      context:
        "Scoped presidential due-handler fixture; other due families are canceled, not skipped.",
    });
  }
  return handler(
    {
      ...isolated,
      currentDate: due.dueAt,
      currentMoment: simulationMomentOnLocalDate(
        isolated.currentMoment,
        due.dueAt,
      ),
    },
    due,
  ).world;
}

/** The 2028 field closes and the states vote. */
function electionDay(seed: string) {
  const opening = adultLifeIn("MT", seed).world;
  // The clock's own hook puts the field closing on the calendar.
  const world = applyPresidentialTurnover(
    addDays(opening.currentDate, -1),
    opening,
  );
  const set = step(world, "field-close", presidentialFieldCloseHandler);
  const voted = step(set, "election-day", presidentialElectionDayHandler);
  return { world: voted, held: election(voted, 2028)! };
}

describe("A113: the presidential vote is read from the records, not drawn", () => {
  it("gives two seeds the same winner and the same margin in every state", () => {
    const byParty = (seed: string) => {
      const { world, held } = electionDay(seed);
      const party = (personId: EntityId | null) =>
        held.tickets.findIndex(
          (ticket) => ticket.presidentPersonId === personId,
        );
      return nationalRecords(world, held.id).flatMap((record) =>
        record.kind === "unit-result"
          ? [
              {
                unit: record.unitKey,
                winner: party(record.allocationWinnerPersonId),
                votes: record.tallies.map((tally) => [
                  party(tally.candidatePersonId),
                  tally.votes,
                ]),
              },
            ]
          : [],
      );
    };
    const first = byParty("a113-first-seed");
    const second = byParty("a113-second-seed");
    expect(first).toHaveLength(56);
    expect(first.every((unit) => unit.winner >= 0)).toBe(true);
    expect(second).toEqual(first);
  }, 120_000);

  it("records an exact tie in a state as unresolved: no coin, no electors", () => {
    fixture.tiedState = "WY";
    try {
      const { world, held } = electionDay("a113-tie");
      const wyoming = nationalRecords(world, held.id).find(
        (record): record is NationalUnitResult =>
          record.kind === "unit-result" && record.unitKey === "WY",
      )!;
      expect(wyoming.allocationWinnerPersonId).toBeNull();
      const [democratic, republican] = wyoming.tallies;
      expect(democratic!.votes).toBe(republican!.votes);
      const certified = step(
        world,
        "electors-meet",
        presidentialElectorsMeetHandler,
      );
      const allocation = nationalAllocation(certified, held.id);
      expect(allocation.units.find((unit) => unit.key === "WY")?.status).toBe(
        "unresolved-winner",
      );
      expect(
        allocation.electors.some((elector) => elector.state === "WY"),
      ).toBe(false);
      expect(allocation.complete).toBe(false);
    } finally {
      fixture.tiedState = null;
    }
  }, 120_000);
});

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
