import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";

import {
  currentStateExecutiveHolders,
  electionContestResult,
  stateExecutiveOffice,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  fileForStateExecutiveOffice,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";

/**
 * Filing for governor used to open the player's own contest with one invented
 * rival, and the regular contest, which is where the sitting governor's
 * decision to run again was made, then never opened. The incumbent simply
 * vanished from the race. A governor who stands again is now the opponent.
 */
const STATES = ["OR", "NV", "OH", "PA", "WI", "MI", "NM", "CO"] as const;

function holder(world: World, usps: string): EntityId | null {
  const office = stateExecutiveOffice(usps)!;
  return (
    currentStateExecutiveHolders(world).find(
      (record) => record.officeKey === office.officeKey,
    )?.personId ?? null
  );
}

/** Filing, or null where this state's rules do not let this life stand. */
function tryFiling(world: World, personId: EntityId): World | null {
  try {
    return fileForStateExecutiveOffice(world, personId);
  } catch (error) {
    if (error instanceof Error && /does not record that/.test(error.message))
      return null;
    throw error;
  }
}

function intent(world: World) {
  return world.history.events.find(
    (event) => event.type === "election.governor-candidacy-intent",
  );
}

describe("a sitting governor who runs again is the opponent", () => {
  it("puts the incumbent in the player's race, or records why the seat is open", () => {
    let running = 0;
    for (const usps of STATES) {
      const { world, personId } = adultLifeIn(usps, `incumbent-rival-${usps}`);
      const sitting = holder(world, usps);
      const filed = tryFiling(world, personId);
      if (!filed) continue;
      const contest = filed.history.electionContests!.at(-1)!;
      const rivals = contest.candidatePersonIds.filter((id) => id !== personId);
      expect(rivals).toHaveLength(1);
      const decision = intent(filed);
      expect(decision).toBeDefined();
      const seeking = decision!.participants.some(
        (participant) => participant.detail === "seeking-another-term",
      );
      if (seeking) {
        running += 1;
        expect(rivals[0]).toBe(sitting);
      } else {
        expect(rivals[0]).not.toBe(sitting);
      }
    }
    // The profile has most sitting governors stand again, so a run over eight
    // states that never meets one has stopped asking.
    expect(running).toBeGreaterThan(0);
  }, 900_000);

  it("keeps the incumbent in office when they beat the player", () => {
    for (const usps of STATES) {
      const { world, personId } = adultLifeIn(usps, `incumbent-rival-${usps}`);
      const sitting = holder(world, usps);
      const filed = tryFiling(world, personId);
      if (!filed) continue;
      const contest = filed.history.electionContests!.at(-1)!;
      if (!sitting || !contest.candidatePersonIds.includes(sitting)) continue;
      const decided = runToElection(filed, personId, suppliedWin(sitting));
      expect(electionContestResult(decided, contest.id)?.winnerPersonId).toBe(
        sitting,
      );
      const calendar = stateExecutiveOfficeCalendar(world, usps)!;
      const later = passUntil(decided, calendar.termStartsAt);
      expect(holder(later, usps)).toBe(sitting);
      return;
    }
    throw new Error("No sampled state had a sitting governor running again.");
  }, 900_000);
});
