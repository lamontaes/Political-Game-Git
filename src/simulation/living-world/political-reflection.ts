import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
} from "../political-belief-formation";
import type { PoliticalBeliefFormationFactor } from "../political-belief-formation";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  PropositionExposureRecord,
  World,
} from "../types";
import { politicalCultureFactors } from "../nationwide-world/political-culture";
import { principledLeaning } from "../governing/officeholder-principles";
import {
  exposureReflectionKey,
  POLITICAL_REFLECTION_TRANSITION_KEY,
} from "./political-reflection-schedule";
export {
  POLITICAL_REFLECTION_TRANSITION_KEY,
  schedulePoliticalReflectionForExposure,
} from "./political-reflection-schedule";

/**
 * A person comes to hold a political view, in the ordinary course of living.
 *
 * The weighing engine for this has existed since Stage 4 and has had exactly
 * one caller: `demo.ts`. So a world could load a full catalog of propositions
 * and still contain nobody who held an opinion about any of them, which is the
 * empty-surface pattern — a screen a player reaches that is blank on an
 * ordinary day with nothing saying why.
 *
 * This is the caller. It runs on the ordinary clock, it runs for people who
 * are not the player, and it forms a view only out of what that person
 * actually has.
 *
 * A directly encountered proposition can prompt a dated reflection when the
 * person's saved principles have an explicit bearing on that proposition.
 * Personality, values and party are not silently mapped to a policy leaning.
 * The strength of this first principle consideration uses the modest,
 * revisable starting position recorded below, while its direction and source
 * records come from the existing catalog and the person's own append-only
 * history.
 *
 * A person with nothing bearing on a newly encountered question gets no
 * scheduled reflection and no invented opinion. A legacy periodic reflection
 * can still record the engine's no-opinion outcome in its decision trace.
 */

const V = "people-reflection";

// One newly encountered question starts or revisits the recorded modest,
// revisable position; conviction follows the decision's actual outcome.
const REFLECTION_DIMENSIONS = {
  conflicted: {
    conviction: "moderate",
    salience: "moderate",
    flexibility: "open",
  },
  "tentative-support": {
    conviction: "tentative",
    salience: "moderate",
    flexibility: "open",
  },
  support: {
    conviction: "moderate",
    salience: "moderate",
    flexibility: "open",
  },
  "tentative-opposition": {
    conviction: "tentative",
    salience: "moderate",
    flexibility: "open",
  },
  opposition: {
    conviction: "moderate",
    salience: "moderate",
    flexibility: "open",
  },
} as const;

/** How often somebody revisits where they stand. */
export const POLITICAL_REFLECTION_CADENCE_DAYS = 90;

export function schedulePoliticalReflection(
  world: World,
  personId: EntityId,
  from: IsoDate = world.currentDate,
): World {
  const n = reflectionCount(world, personId) + 1;
  return scheduleFutureDueItem(world, {
    stableKey: `${V}:reflect:${personId}:${n}`,
    dueAt: addDays(from, POLITICAL_REFLECTION_CADENCE_DAYS),
    transitionKey: POLITICAL_REFLECTION_TRANSITION_KEY,
    entityIds: [personId],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: `${V}:reflect` },
  });
}

function reflectionCount(world: World, personId: EntityId): number {
  return world.history.futureDueItems.filter(
    (item: FutureDueItem) =>
      item.transitionKey === POLITICAL_REFLECTION_TRANSITION_KEY &&
      item.entityIds.includes(personId),
  ).length;
}

export function politicalReflectionTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== POLITICAL_REFLECTION_TRANSITION_KEY) {
    throw new Error(
      "The political reflection handler received another transition.",
    );
  }
  const personId = dueItem.entityIds[0];
  const done = (
    next: World,
    reason: string,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: `${V}:${reason}`,
    context: null,
    outcomeEventId: null,
  });
  if (!personId || !world.people[personId]) {
    return done(world, "person-not-present");
  }
  const targeted = dueItem.stableKey.startsWith(`${V}:exposure:`);
  const exposure = targeted
    ? (world.history.propositionExposures.find(
        (row) => exposureReflectionKey(row) === dueItem.stableKey,
      ) ?? null)
    : null;
  if (targeted && (!exposure || exposure.personId !== personId))
    return done(world, "exposure-not-present");
  // The player decides their own mind. The engine refuses this anyway; saying
  // so here keeps a scheduled item from throwing when control moves.
  if (world.control.kind === "person" && world.control.personId === personId) {
    return done(
      targeted ? world : schedulePoliticalReflection(world, personId),
      "controlled-person",
    );
  }
  if (
    targeted &&
    exposure &&
    world.history.privateBeliefs.some(
      (belief) =>
        belief.personId === personId &&
        belief.propositionId === exposure.propositionId &&
        belief.sequence >= exposure.sequence,
    )
  )
    return done(world, "already-held-view");
  const subject = exposure ?? openQuestionFor(world, personId);
  if (!subject) {
    return done(
      targeted ? world : schedulePoliticalReflection(world, personId),
      "nothing-encountered",
    );
  }
  const factors = factorsFor(world, personId, subject);
  if (targeted && factors.length === 0)
    return done(world, "no-grounded-factor");
  const proposal = evaluatePoliticalBeliefFormation(world, {
    stableKey: `${V}:${dueItem.stableKey}`,
    personId,
    propositionId: subject.propositionId,
    factors,
    beliefDimensionsByOutcome: REFLECTION_DIMENSIONS,
    // No dice: only the person's saved facts decide, and a tie stays undecided.
    randomness: "none",
  });
  const next = applyNpcPoliticalBeliefFormation(world, proposal);
  return done(
    targeted ? next : schedulePoliticalReflection(next, personId),
    proposal.outcome === "no-opinion" || proposal.outcome === "defer"
      ? "considered-no-view"
      : "view-formed",
  );
}

/**
 * The question somebody is actually turning over: one they have encountered,
 * and whose exposure is newer than whatever they last concluded about it. A
 * person does not reconsider a settled view for no reason, so a proposition
 * with no new exposure since the belief is left alone.
 */
function openQuestionFor(
  world: World,
  personId: EntityId,
): PropositionExposureRecord | null {
  const beliefs = world.history.privateBeliefs.filter(
    (belief) => belief.personId === personId,
  );
  const candidates = world.history.propositionExposures
    .filter(
      (exposure) =>
        exposure.personId === personId &&
        world.policyCatalog.propositions[exposure.propositionId] !== undefined,
    )
    .filter((exposure) => {
      const latest = beliefs
        .filter((belief) => belief.propositionId === exposure.propositionId)
        .at(-1);
      return !latest || latest.sequence < exposure.sequence;
    });
  return candidates.at(-1) ?? null;
}

/**
 * What this person has that bears on this question.
 *
 * A saved principle whose catalog bearing names this proposition can matter.
 * The place's political culture remains empty until its research question is
 * answered (`nationwide-world/political-culture.ts`).
 *
 * A memory or temperament still carries no inherent direction. The engine
 * separately reads an existing belief and a trusted cue; this adapter adds
 * only the recorded principle bearing, with references in the decision trace.
 *
 * Everything below a principle waits on the answer to
 * `where-a-persons-politics-comes-from` being turned into inputs.
 */
function factorsFor(
  world: World,
  personId: EntityId,
  exposure: PropositionExposureRecord,
): readonly PoliticalBeliefFormationFactor[] {
  const leaning = principledLeaning(world, personId, exposure.propositionId);
  const principle: PoliticalBeliefFormationFactor[] =
    leaning.score === 0
      ? []
      : [
          {
            stableKey: `recorded-principles:${exposure.id}`,
            favors: leaning.score > 0 ? "support" : "opposition",
            sourceType: "belief:political-principle",
            importance: "strong",
            confidence: "high",
            explanation:
              "This encountered question bears on principles the person already holds.",
            sourceRefs: [
              { kind: "proposition-exposure", exposureId: exposure.id },
              ...leaning.recordIds.map((principleRecordId) => ({
                kind: "political-principle" as const,
                principleRecordId,
              })),
            ],
          },
        ];
  return [
    ...principle,
    ...politicalCultureFactors(world, personId, exposure.propositionId),
  ];
}
