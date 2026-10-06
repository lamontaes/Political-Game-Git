import { describe, expect, it } from "vitest";

import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { searchLifePlaces } from "../simulation";
import { OFFICE_EMPLOYMENT_KINDS } from "../simulation/governing/office-consequence";
import { workStatusAt } from "../simulation/life-queries";
import {
  HELD_BEFORE_TRIAL_REASON,
  IN_JAIL_REASON,
} from "../simulation/justice/jail-absence";
import {
  eventsOfType,
  PRETRIAL_HELD_EVENT,
  PRETRIAL_RELEASED_EVENT,
  PROSECUTION_ENDED_EVENT,
  REFERRAL_TAG,
} from "../simulation/justice/jail-terms";
import { pretrialLawAt } from "../simulation/justice/pretrial";
import {
  referForProsecution,
  PROSECUTION_TIMING_PROFILE,
} from "../simulation/justice/prosecution";
import { SeededRng } from "../simulation/rng";
import type { EntityId, HistoricalEvent, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { observerPlace } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * Cash bail, watched. Four working adults in the player's town are charged
 * with robbery. Where the law in force sets money bail, each goes home only
 * if they have the tenth of it that it takes; where the law has ended money
 * bail, a judge decides, and may hold someone only for a violent offense.
 * Whoever is held is away from work until the case ends. One world is drawn
 * from all 56 places by the seed; the other from the places whose starting
 * law has already ended money bail, also by the seed.
 */

const CASH_BAIL = "us-policy-positions:justice-public-safety.end-cash-bail";
const DEFENDANTS = 4;

function noMoneyBailPlace(seed: string) {
  const answers = (
    startingLaw as unknown as {
      questions: Record<
        string,
        { answers: Record<string, { answer: string }> }
      >;
    }
  ).questions[CASH_BAIL]!.answers;
  const rng = new SeededRng(`pretrial-place:${seed}`);
  const states = Object.keys(answers)
    .filter((key) => answers[key]!.answer === "yes")
    .sort();
  const towns = searchLifePlaces("", 5000, {
    stateJurisdictionKey: rng.pick(states),
    scope: "locality",
  });
  return rng.pick(towns);
}

function isOffice(kind: string): boolean {
  return OFFICE_EMPLOYMENT_KINDS.includes(kind) || kind.startsWith("office:");
}

/** A person's ordinary jobs at work today; a public office is not one. */
function activeJobs(world: World, personId: EntityId) {
  return world.history.workRelationships.filter(
    (work) =>
      work.personId === personId &&
      !isOffice(work.kind) &&
      workStatusAt(world, work.id)?.status === "active",
  );
}

function tagged(
  world: World,
  type: HistoricalEvent["type"],
  referralId: EntityId,
) {
  return eventsOfType(world, type).find((event) =>
    event.tags.includes(`${REFERRAL_TAG}${referralId}`),
  );
}

function watch(seed: string, placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const playerId = game.playerPersonId;
  let world = openOrdinaryLife(game.world, playerId);
  const workers = Object.keys(world.people)
    .sort()
    .filter(
      (id) => id !== playerId && activeJobs(world, id as EntityId).length > 0,
    )
    .slice(0, DEFENDANTS) as EntityId[];
  const referrals: EntityId[] = [];
  for (const personId of workers) {
    const referred = referForProsecution(world, {
      stableKey: `pretrial:${seed}:${personId}`,
      subjectPersonId: personId,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      offenseKey: "crime:robbery",
      referredBy: { kind: "police", label: "police", personId: null },
      basisEventIds: [],
      evidence: "testimony",
      standingFindings: 0,
    });
    world = referred.world;
    referrals.push(referred.referralId);
  }
  const charged = passOrdinaryDays(
    world,
    PROSECUTION_TIMING_PROFILE.chargeDecisionDays + 14,
  );
  const ended = passOrdinaryDays(
    charged,
    PROSECUTION_TIMING_PROFILE.resolveAfterDays + 14,
  );
  return { workers, referrals, charged, ended };
}

function checkWatchedWorld(
  label: string,
  seed: string,
  placeKey: string,
  expectedLaw: "money-bail" | "no-money-bail" | null,
) {
  it(`decides release before trial by the law in force, and keeps the held from work (${label} ${placeKey}, seed ${seed})`, () => {
    const { workers, referrals, charged, ended } = watch(seed, placeKey);
    expect(workers).toHaveLength(DEFENDANTS);
    for (const [index, personId] of workers.entries()) {
      const referralId = referrals[index]!;
      const referral = charged.history.events.find(
        (event) => event.id === referralId,
      )!;
      const law = pretrialLawAt(charged, referral.jurisdictionId);
      if (expectedLaw) expect(law).toBe(expectedLaw);
      const held = tagged(charged, PRETRIAL_HELD_EVENT, referralId);
      const released = tagged(charged, PRETRIAL_RELEASED_EVENT, referralId);
      if (!law) {
        expect(held ?? released).toBeUndefined();
        continue;
      }
      // Every charged defendant has one answer before trial.
      expect([held, released].filter(Boolean)).toHaveLength(1);
      const decided = (held ?? released)!;
      if (law === "money-bail") {
        expect(decided.summary).toMatch(/bail/);
        expect(
          decided.tags.some((tag) => tag.startsWith("justice.bail:")),
        ).toBe(true);
      } else {
        expect(decided.summary).not.toMatch(/could not pay/);
      }
      console.log(`${placeKey} ${decided.occurredAt}: ${decided.summary}`);
      console.log(`  because: ${decided.context.motivation}`);

      if (held) {
        // Held before trial: every job they held is on leave, not ended. A
        // public office stays theirs until the law says otherwise.
        expect(activeJobs(charged, personId)).toEqual([]);
        const onLeave = charged.history.workRelationships.filter(
          (work) =>
            work.personId === personId &&
            workStatusAt(charged, work.id)?.reason === HELD_BEFORE_TRIAL_REASON,
        );
        expect(onLeave.length).toBeGreaterThan(0);
        // When the case ends, the job is back, or on leave for the term.
        const end = tagged(ended, PROSECUTION_ENDED_EVENT, referralId);
        expect(end).toBeDefined();
        for (const work of onLeave) {
          const status = workStatusAt(ended, work.id)!;
          expect(
            status.status === "active" || status.reason === IN_JAIL_REASON,
          ).toBe(true);
        }
      } else {
        expect(activeJobs(charged, personId).length).toBeGreaterThan(0);
      }
    }
  }, 900_000);
}

describe("cash bail in a watched world", () => {
  const seed = "pretrial-watch-1";
  checkWatchedWorld("drawn from all 56:", seed, observerPlace(seed).key, null);
  const other = "pretrial-watch-2";
  checkWatchedWorld(
    "where money bail has ended:",
    other,
    noMoneyBailPlace(other).key,
    "no-money-bail",
  );
});
