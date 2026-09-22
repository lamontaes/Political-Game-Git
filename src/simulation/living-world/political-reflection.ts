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

/**
 * A person comes to hold a political view, in the ordinary course of living.
 *
 * The weighing engine for this has existed since Stage 4 and has had exactly
 * one caller: `demo.ts`. So a world could load a full catalogue of propositions
 * and still contain nobody who held an opinion about any of them, which is the
 * empty-surface pattern — a screen a player reaches that is blank on an
 * ordinary day with nothing saying why.
 *
 * This is the caller. It runs on the ordinary clock, it runs for people who
 * are not the player, and it forms a view only out of what that person
 * actually has.
 *
 * WHAT IT DOES NOT DO, DELIBERATELY. It does not read a personality tendency,
 * a value or a party and turn it into a leaning. Nothing in this repository
 * establishes what a temperament implies about a policy question, and inventing
 * a weighting here would be a theory of politics authored by an engineer and
 * then indistinguishable, in a save, from a measured one. That question is
 * filed as `where-a-persons-politics-comes-from` and is settled by D-093:
 * a person's own character and history decide their positions. What this pass
 * can honestly read today is the history half — what happened to them and what
 * they made of it — so that is all it reads. When the weighting lands, it
 * arrives as additional factors in `factorsFor`, and nothing else here moves.
 *
 * A person with nothing bearing on the question forms no opinion, and that is
 * a real answer rather than a gap: the engine's own default consideration says
 * so, and the durable decision trace records that it was considered.
 */

export const POLITICAL_REFLECTION_TRANSITION_KEY =
  "people:political-reflection";

const V = "people-reflection";

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
  // The player decides their own mind. The engine refuses this anyway; saying
  // so here keeps a scheduled item from throwing when control moves.
  if (world.control.kind === "person" && world.control.personId === personId) {
    return done(
      schedulePoliticalReflection(world, personId),
      "controlled-person",
    );
  }
  const subject = openQuestionFor(world, personId);
  if (!subject) {
    return done(
      schedulePoliticalReflection(world, personId),
      "nothing-encountered",
    );
  }
  const proposal = evaluatePoliticalBeliefFormation(world, {
    stableKey: `${V}:${dueItem.stableKey}`,
    personId,
    propositionId: subject.propositionId,
    factors: factorsFor(world, personId, subject),
  });
  const next = applyNpcPoliticalBeliefFormation(world, proposal);
  return done(
    schedulePoliticalReflection(next, personId),
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
 * NOTHING, TODAY, AND THAT IS THE FINDING RATHER THAN A STUB. A factor has to
 * favour one of the engine's outcomes, so supplying one means asserting which
 * way something points. The only recorded thing a person holds that carries
 * its own direction is a `PrincipleRecord` — they endorse or reject a named
 * principle — and no proposition declares which principles it engages, so
 * there is no join from a person's convictions to a question. A memory does
 * not carry a direction; neither does a temperament. Mapping either to
 * support or oppose would be a theory of politics written by an engineer and
 * then, in a save, indistinguishable from a measured one.
 *
 * So this pass reads what the engine already derives honestly — a prior belief
 * and a trusted cue — and adds nothing of its own. Most people will form no
 * view, which is true of them today and is recorded as having been considered
 * rather than left blank.
 *
 * Two things unblock it, in this order: the pack declaring, per proposition,
 * which principles it engages; and the answer to
 * `where-a-persons-politics-comes-from` for everything below a principle.
 */
function factorsFor(
  world: World,
  personId: EntityId,
  exposure: PropositionExposureRecord,
): readonly PoliticalBeliefFormationFactor[] {
  void world;
  void personId;
  void exposure;
  return [];
}
