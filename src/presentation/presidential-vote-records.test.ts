import { describe, expect, it, vi } from "vitest";
import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";
import {
  addDays,
  cancelFutureDueItem,
  futureDueItemStateAt,
  nationalAllocation,
  nationalElectionRules,
  nationalRecords,
  simulationMomentOnLocalDate,
} from "../simulation";
import type {
  EntityId,
  FutureDueItem,
  NationalUnitResult,
  World,
} from "../simulation";
import { createStableId } from "../simulation/ids";
import {
  applyPresidentialTurnover,
  presidentialElectionDayHandler,
  presidentialElectorsMeetHandler,
  presidentialFieldCloseHandler,
} from "../simulation/nationwide-world/presidential-turnover";
import { STATES } from "../simulation/state-reference";
import type * as PoliticalStart from "../simulation/world-setup/political-start";
import { calibrationRow } from "../simulation/world-setup/political-start";

/**
 * A113: the presidential vote on election day, read from the records with no
 * dice. Kept apart from the long continuity cases in
 * `presidential-elections.test.ts`: the political-start mock below applies to
 * a whole file, and these cases build their own opening worlds.
 */

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

// The places under test are drawn from all 56 by this seed: the world opens
// in the first, and the tie fixture uses the first that casts electoral votes
// with an even vote total, so an exact half is a whole number of votes.
const PLACE_SEED = "a113-places";
const PLACES = Object.keys(STATES).sort((a, b) =>
  createStableId("decision", `${PLACE_SEED}:${a}`).localeCompare(
    createStableId("decision", `${PLACE_SEED}:${b}`),
  ),
);
const OPENING_PLACE = PLACES[0]!;
const TIED_STATE = PLACES.find(
  (usps) =>
    nationalElectionRules(2028).units.some((unit) => unit.key === usps) &&
    (calibrationRow(`us-president:${usps}`)?.totalVotes ?? 1) % 2 === 0,
)!;

/** The 2028 field closes and the states vote. */
function electionDay(seed: string) {
  const opening = adultLifeIn(OPENING_PLACE, seed).world;
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
  it(`gives two seeds the same winner and the same margin in every state (opening in ${OPENING_PLACE}, place seed ${PLACE_SEED})`, () => {
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

  it(`records an exact tie in a state as unresolved: no coin, no electors (${TIED_STATE} tied)`, () => {
    fixture.tiedState = TIED_STATE;
    try {
      const { world, held } = electionDay("a113-tie");
      const tied = nationalRecords(world, held.id).find(
        (record): record is NationalUnitResult =>
          record.kind === "unit-result" && record.unitKey === TIED_STATE,
      )!;
      expect(tied.allocationWinnerPersonId).toBeNull();
      const [democratic, republican] = tied.tallies;
      expect(democratic!.votes).toBe(republican!.votes);
      const certified = step(
        world,
        "electors-meet",
        presidentialElectorsMeetHandler,
      );
      const allocation = nationalAllocation(certified, held.id);
      expect(
        allocation.units.find((unit) => unit.key === TIED_STATE)?.status,
      ).toBe("unresolved-winner");
      expect(
        allocation.electors.some((elector) => elector.state === TIED_STATE),
      ).toBe(false);
      expect(allocation.complete).toBe(false);
    } finally {
      fixture.tiedState = null;
    }
  }, 120_000);
});
