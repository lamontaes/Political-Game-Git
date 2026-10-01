/** Frozen original date chain from git ab4ac1b8839456a8d662b0e3c2da84288798bb47:src/simulation/world.ts.
 * Original source SHA-256: a1a496d9fa54b0df885f6130de82663e96d2090e2b3e0ac40a1c63e1ab2496d1.
 * Original wrapper/chain logic is retained; the chain is extracted below for
 * explicit candidate injection before production deletion. Dependencies
 * remain shared current modules: this isolates date-chain composition, not all
 * historical production semantics. */
import { applySpeechRetelling } from "../../src/simulation/speech-retelling";
import { applyEnactedCourtSizes } from "../../src/simulation/governing/court-size-law";
import { applyJudicialReview } from "../../src/simulation/judiciary/judicial-review";
import { applyCrisisOfficeContinuity } from "../../src/simulation/crisis-office-continuity";
import { applyCrisisRepairFunding } from "../../src/simulation/governing/repair-funding";
import { applyCongressTurnover } from "../../src/simulation/living-world/congress-turnover";
import { applyStateLegislatureTurnover } from "../../src/simulation/nationwide-world/state-legislature-turnover";
import { applyGovernorTurnover } from "../../src/simulation/nationwide-world/state-executive-turnover-calendar";
import { applyCongressLawmaking } from "../../src/simulation/governing/congress-lawmaking";
import { applyConstitutionalReform } from "../../src/simulation/living-world/constitutional-reform";
import { applyFederalReform } from "../../src/simulation/living-world/federal-reform";
import { applyArticleV } from "../../src/simulation/governing/article-v";
import { applyPresidentialTurnover } from "../../src/simulation/nationwide-world/presidential-turnover";
import { applyNationalTermTransitions } from "../../src/simulation/national-election-consumer";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  EMPTY_FUTURE_TRANSITION_HANDLERS,
  resolveFutureDueItemsThrough,
} from "../../src/simulation/future-transitions";
import {
  assertWorldIntegrity,
  advanceWithWorldIntegrityAtEnd,
  recordWorldEvent,
} from "../../src/simulation/world";
import type {
  World,
  IsoDate,
  FutureTransitionHandlerRegistry,
} from "../../src/simulation/types";

export function baselineAdvanceWorld(
  world: World,
  days: number,
  transitionHandlers: FutureTransitionHandlerRegistry = EMPTY_FUTURE_TRANSITION_HANDLERS,
  chain: DateBoundaryChain = baselineApplyDateBoundary,
): World {
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error(
      "Time advancement must be a positive whole number of days.",
    );
  }

  assertWorldIntegrity(world);
  // Every writer inside a day advance skips the whole-world check; the
  // advanced World is checked once at the end, as a clock press is.
  return advanceWithWorldIntegrityAtEnd(
    () => advanceWorldUnchecked(world, days, transitionHandlers, chain),
    world,
  );
}

function advanceWorldUnchecked(
  world: World,
  days: number,
  transitionHandlers: FutureTransitionHandlerRegistry,
  chain: DateBoundaryChain,
): World {
  const actionSequence = world.actionSequence;
  const nextDate = addDays(world.currentDate, days);
  const nextMoment = simulationMomentOnLocalDate(world.currentMoment, nextDate);
  const primaryJurisdictionId = world.jurisdictionOrder[0] ?? null;
  const transitioned = resolveFutureDueItemsThrough(
    world,
    nextDate,
    transitionHandlers,
  );
  const advanced: World = {
    ...transitioned,
    currentDate: nextDate,
    currentMoment: nextMoment,
    actionSequence: actionSequence + 1,
  };

  const continued = chain(world.currentDate, advanced);
  return recordWorldEvent(continued, {
    stableKey: `action:${actionSequence}:time-advanced:${world.currentDate}:${days}:${nextDate}`,
    type: "simulation.time-advanced",
    occurredAt: nextDate,
    recordedAt: nextDate,
    jurisdictionId: primaryJurisdictionId,
    involvedEntityIds: primaryJurisdictionId ? [primaryJurisdictionId] : [],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.time"],
    summary: `Simulation time advanced ${days} days to ${nextDate}.`,
    context: {
      location: primaryJurisdictionId
        ? {
            jurisdictionId: primaryJurisdictionId,
            label: "Primary simulation jurisdiction",
            setting: null,
          }
        : null,
      socialContext: "Deterministic simulation clock transition.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export type DateBoundaryChain = (previousDate: IsoDate, world: World) => World;
/** Original fourteen-step expression from the pinned source, with its old
 * date argument and already advanced world supplied explicitly. */
export function baselineApplyDateBoundary(
  previousDate: IsoDate,
  advanced: World,
): World {
  return applyJudicialReview(
    previousDate,
    applySpeechRetelling(
      previousDate,
      applyCrisisRepairFunding(
        applyEnactedCourtSizes(
          applyCrisisOfficeContinuity(
            applyCongressLawmaking(
              previousDate,
              applyFederalReform(
                previousDate,
                applyArticleV(
                  previousDate,
                  applyConstitutionalReform(
                    previousDate,
                    applyPresidentialTurnover(
                      previousDate,
                      applyGovernorTurnover(
                        previousDate,
                        applyCongressTurnover(
                          previousDate,
                          applyStateLegislatureTurnover(
                            previousDate,
                            applyNationalTermTransitions(advanced),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
