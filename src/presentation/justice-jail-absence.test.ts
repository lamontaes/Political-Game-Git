import { describe, expect, it } from "vitest";

import { workStatusAt } from "../simulation/life-queries";
import { IN_JAIL_REASON } from "../simulation/justice/jail-absence";
import {
  enterPlea,
  jailTermOn,
  referForProsecution,
  PROSECUTION_TIMING_PROFILE,
} from "../simulation/justice/prosecution";
import type { EntityId, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { observerPlace } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * Somebody in jail cannot come to work: a job held when the term begins goes
 * on leave, and comes back when the term ends. The court decides the term
 * (the defendant's plea, then the judge). The place is drawn from all 56 by
 * the seed.
 */
describe("a jail term keeps a person from work", () => {
  const seed = "jail-absence-1";
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const playerId = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, playerId);

  function activeJobs(world: World, personId: EntityId) {
    return world.history.workRelationships.filter(
      (work) =>
        work.personId === personId &&
        workStatusAt(world, work.id)?.status === "active",
    );
  }

  // The first adult who holds a job, other than the player. They plead
  // guilty through the same action the player has; the judge sets the term.
  const workerId = Object.keys(opened.people)
    .sort()
    .find(
      (id) => id !== playerId && activeJobs(opened, id as EntityId).length > 0,
    ) as EntityId | undefined;

  it(`puts a worker's jobs on leave for the term (${place.key})`, () => {
    expect(workerId).toBeDefined();
    const referred = referForProsecution(opened, {
      stableKey: `jail-absence:${seed}`,
      subjectPersonId: workerId!,
      jurisdictionId: opened.people[workerId!]!.homeJurisdictionId,
      offenseKey: "campaign-funds-personal-use",
      referredBy: {
        kind: "regulator",
        label: "state regulator",
        personId: null,
      },
      basisEventIds: [],
      evidence: "documentary",
      standingFindings: 2,
    });
    const charged = passOrdinaryDays(
      referred.world,
      PROSECUTION_TIMING_PROFILE.chargeDecisionDays + 14,
    );
    const pleaded = enterPlea(charged, {
      personId: workerId!,
      referralId: referred.referralId,
      plea: "guilty",
    });
    expect(pleaded.ok).toBe(true);
    const sentenced = passOrdinaryDays(
      pleaded.world,
      PROSECUTION_TIMING_PROFILE.resolveAfterDays + 14,
    );
    const term = jailTermOn(sentenced, workerId!);
    expect(term, "the judge chose jail in this life").not.toBeNull();

    // Nobody in jail is at work, and each job held when the term began is on
    // leave for it rather than ended.
    expect(activeJobs(sentenced, workerId!)).toEqual([]);
    const onLeave = sentenced.history.workRelationships.filter(
      (work) =>
        work.personId === workerId &&
        workStatusAt(sentenced, work.id)?.reason === IN_JAIL_REASON,
    );
    expect(onLeave.length).toBeGreaterThan(0);
    for (const work of onLeave) {
      const status = workStatusAt(sentenced, work.id)!;
      expect(status.status).toBe("temporarily-inactive");
      expect(status.effectiveAt >= term!.from).toBe(true);
    }

    const released = passOrdinaryDays(
      sentenced,
      Math.ceil(
        (Date.parse(`${term!.until}T00:00:00Z`) -
          Date.parse(`${sentenced.currentDate}T00:00:00Z`)) /
          86_400_000,
      ) + 35,
    );
    expect(jailTermOn(released, workerId!)).toBeNull();
    // No pay for a pay period spent wholly in jail, and pay again after.
    const flows = new Set(
      released.history.resourceFlows
        .filter(
          (flow) =>
            flow.basisReference.kind === "work" &&
            onLeave.some(
              (work) => work.id === flow.basisReference.workRelationshipId,
            ),
        )
        .map((flow) => flow.id),
    );
    const paidInJail = released.history.resourceTransferOutcomes.filter(
      (outcome) =>
        flows.has(outcome.resourceFlowId) &&
        outcome.periodStartsAt >= term!.from &&
        outcome.periodEndsAt < term!.until &&
        outcome.transferredAmount.minorUnits > 0,
    );
    expect(paidInJail).toEqual([]);
    const paid = (from: string) =>
      released.history.resourceTransferOutcomes.some(
        (outcome) =>
          flows.has(outcome.resourceFlowId) &&
          outcome.periodStartsAt >= from &&
          outcome.transferredAmount.minorUnits > 0,
      );
    expect(paid(term!.until)).toBe(true);
    for (const work of onLeave) {
      const status = workStatusAt(released, work.id)!;
      expect(status.status).toBe("active");
      expect(status.effectiveAt >= term!.until).toBe(true);
    }
  }, 900_000);
});
