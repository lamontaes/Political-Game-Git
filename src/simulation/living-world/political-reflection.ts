import { addDays, ageOnDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import type { PropositionExposureRecordInput } from "../history";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
} from "../political-belief-formation";
import type {
  PoliticalBeliefDimensions,
  PoliticalBeliefFormationFactor,
  PoliticalBeliefFormationOutcome,
} from "../political-belief-formation";
import { recordPropositionExposure } from "../politics";
import { latestPrinciple, latestPrivateBelief } from "../queries";
import { SeededRng } from "../rng";
import type {
  BeliefConviction,
  BeliefPosition,
  PrivateBeliefRecord,
  DecisionImportance,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  PrincipleRecord,
  PropositionExposureRecord,
  World,
} from "../types";

/**
 * A person comes to hold a political view, in the ordinary course of living.
 *
 * The weighing engine for this has existed since Stage 4 and has had exactly
 * one caller: `demo.ts`. So a world could load a full catalog of propositions
 * and still contain nobody who held an opinion about any of them, which is the
 * empty-surface pattern — a screen a player reaches that is blank on an
 * ordinary day with nothing saying why.
 *
 * This is the caller. A person turns a question over because they met it:
 * they filed the bill, or somebody told them about it. Each meeting schedules
 * one reflection on that question, the next day, for people who are not the
 * player, and the view is formed only out of what that person actually has.
 * Nobody reconsiders on a timer, and hearing the same bill again from the
 * same event is not a second meeting.
 *
 * WHAT IT DOES NOT DO, DELIBERATELY. It does not read a personality tendency,
 * a value or a party and turn it into a leaning. Nothing in this repository
 * establishes what a temperament implies about a policy question, and inventing
 * a weighting here would be a theory of politics authored by an engineer and
 * then indistinguishable, in a save, from a measured one. That question is
 * filed as `where-a-persons-politics-comes-from` and is settled by D-093:
 * a person's own character and history decide their positions. What this pass
 * can honestly read today is what they hold: the principles on their record
 * and which way the question bears on each, as its pack declares. When more
 * of the weighting lands, it arrives as additional factors in `factorsFor`,
 * and nothing else here moves.
 *
 * A person with nothing bearing on the question forms no opinion, and that is
 * a real answer rather than a gap: the engine's own default consideration says
 * so, and the durable decision trace records that it was considered.
 */

export const POLITICAL_REFLECTION_TRANSITION_KEY =
  "people:political-reflection";

const V = "people-reflection";

/**
 * How many public questions an adult really cares about.
 *
 * PLACEHOLDER, NOT RESEARCHED. The owner's direction: most people hold no view
 * on most questions; of about a hundred issues an average person really cares
 * about a handful, perhaps two to six, and those overlap a great deal (the
 * economy), while some people have a niche concern of their own. The range is
 * his rough figure. Which issues are common and which are niche is not known,
 * so every issue is equally likely here, which gives far less overlap than
 * real people share. Filed as `which-issues-people-care-about`.
 */
export const CARED_ABOUT_ISSUE_COUNT = { min: 2, max: 6 } as const;

/**
 * The few issues this adult really cares about, in catalog order.
 *
 * Drawn once from the world's seed and the person, so it is the same on every
 * reading and in every save, and it writes nothing. Nobody under eighteen has
 * any yet. It says only how much a question matters to them, never which way
 * they lean on it.
 */
export function issuesTheyCareAbout(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const person = world.people[personId];
  if (!person || ageOnDate(person.birthDate, world.currentDate) < 18) return [];
  const pool = [...world.policyCatalog.issueOrder];
  if (pool.length === 0) return [];
  const rng = new SeededRng(world.seed).fork(`${V}:cares:${personId}`);
  const count = Math.min(
    pool.length,
    rng.integer(CARED_ABOUT_ISSUE_COUNT.min, CARED_ABOUT_ISSUE_COUNT.max + 1),
  );
  const chosen = new Set<EntityId>();
  while (chosen.size < count) {
    const remaining = pool.filter((id) => !chosen.has(id));
    chosen.add(rng.pick(remaining));
  }
  return world.policyCatalog.issueOrder.filter((id) => chosen.has(id));
}

/**
 * The proposals an event is about: those of any bill it concerns.
 *
 * A bill's own record says which catalog questions it puts, so a filing, a
 * hearing or a vote on it puts the same ones.
 */
export function proposalsInEvent(
  world: World,
  event: HistoricalEvent,
): readonly EntityId[] {
  const involved = new Set(event.involvedEntityIds);
  return [
    ...new Set(
      (world.history.legislativeMeasures ?? [])
        .filter((measure) => involved.has(measure.id))
        .flatMap((measure) => measure.propositionIds ?? [])
        .filter((id) => world.policyCatalog.propositions[id] !== undefined),
    ),
  ];
}

/**
 * Somebody meets the proposals an event puts, and will think them over.
 *
 * One record per question per event: hearing about the same filing twice is
 * not new evidence, so the second telling writes nothing. The player meets
 * them too, but decides their own mind, so only somebody else is scheduled to
 * reflect.
 */
export function encounterProposalsInEvent(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly event: HistoricalEvent;
    readonly summary: string;
    readonly provenance: PropositionExposureRecordInput["provenance"];
  },
): World {
  let next = world;
  for (const propositionId of proposalsInEvent(world, input.event)) {
    const stableKey = `${V}:met:${input.personId}:${propositionId}:${input.event.id}`;
    if (
      next.history.propositionExposures.some(
        (exposure) => exposure.stableKey === stableKey,
      )
    )
      continue;
    next = recordPropositionExposure(next, {
      stableKey,
      personId: input.personId,
      propositionId,
      encounteredAt: next.currentDate,
      summary: input.summary,
      provenance: input.provenance,
    });
    const exposure = next.history.propositionExposures.at(-1)!;
    const controlled =
      next.control.kind === "person" &&
      next.control.personId === input.personId;
    // Two tellings on one day are one evening's thinking, not two.
    const alreadyDue = next.history.futureDueItems.some(
      (item) =>
        item.transitionKey === POLITICAL_REFLECTION_TRANSITION_KEY &&
        item.entityIds.includes(input.personId) &&
        item.dueAt === addDays(exposure.encounteredAt, 1) &&
        next.history.propositionExposures.some(
          (other) =>
            item.stableKey === `${V}:considers:${other.id}` &&
            other.propositionId === propositionId,
        ),
    );
    if (!controlled && !alreadyDue)
      next = schedulePoliticalReflection(next, exposure);
  }
  return next;
}

/**
 * Thinking a question over, the day after meeting it.
 *
 * The next day is the soonest the clock allows (a due item falls after the day
 * it is scheduled), not a researched pace of deliberation.
 */
export function schedulePoliticalReflection(
  world: World,
  exposure: PropositionExposureRecord,
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${V}:considers:${exposure.id}`,
    dueAt: addDays(exposure.encounteredAt, 1),
    transitionKey: POLITICAL_REFLECTION_TRANSITION_KEY,
    entityIds: [exposure.personId],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: `${V}:considers` },
  });
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
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  ) {
    return done(world, "person-died");
  }
  // The player decides their own mind. The engine refuses this anyway; saying
  // so here keeps a scheduled item from throwing when control moves.
  if (world.control.kind === "person" && world.control.personId === personId) {
    return done(world, "controlled-person");
  }
  const exposureId = dueItem.stableKey.slice(`${V}:considers:`.length);
  const exposure = world.history.propositionExposures.find(
    (record) => record.id === exposureId && record.personId === personId,
  );
  if (!exposure || !world.policyCatalog.propositions[exposure.propositionId]) {
    return done(world, "nothing-encountered");
  }
  const factors = factorsFor(world, personId, exposure);
  const proposal = evaluatePoliticalBeliefFormation(world, {
    stableKey: `${V}:${dueItem.stableKey}`,
    personId,
    propositionId: exposure.propositionId,
    factors: factors.map((entry) => entry.factor),
    beliefDimensionsFor: (outcome) =>
      dimensionsFor(
        outcome,
        factors,
        issuesTheyCareAbout(world, personId).includes(
          world.policyCatalog.propositions[exposure.propositionId]!.issueId,
        ),
        latestPrivateBelief(world, personId, exposure.propositionId) ?? null,
      ),
  });
  const next = applyNpcPoliticalBeliefFormation(world, proposal);
  return done(
    next,
    proposal.outcome === "no-opinion" || proposal.outcome === "defer"
      ? "considered-no-view"
      : "view-formed",
  );
}

interface PrincipleFactor {
  readonly factor: PoliticalBeliefFormationFactor;
  readonly principle: PrincipleRecord;
}

/**
 * What this person has that bears on this question: the principles they hold
 * that the question engages.
 *
 * The pack declares, per question, which principles agreeing with it is
 * consistent with or against; the person's record says whether they endorse,
 * reject or are torn over each. Those two together point one way, and only
 * those two. A question whose pack declares no principles, or a person who
 * holds none of the ones it engages, yields nothing, and the engine's own
 * default then records that they had no settled reason to take a side.
 *
 * A memory does not carry a direction; neither does a temperament or a value
 * on its own, and nothing in the repository says which way either points on a
 * policy question. Those wait on `where-a-persons-politics-comes-from`.
 */
function factorsFor(
  world: World,
  personId: EntityId,
  exposure: PropositionExposureRecord,
): readonly PrincipleFactor[] {
  const proposition = world.policyCatalog.propositions[exposure.propositionId]!;
  const factors: PrincipleFactor[] = [];
  for (const bearing of proposition.principles ?? []) {
    const principle = latestPrinciple(world, personId, bearing.principleId);
    if (!principle || principle.formedAt > world.currentDate) continue;
    const definition = world.policyCatalog.principles[bearing.principleId];
    const name = definition?.name ?? "a principle they hold";
    const tentative = principle.conviction === "tentative";
    const favors: PoliticalBeliefFormationOutcome =
      principle.stance === "conflicted"
        ? "conflicted"
        : (principle.stance === "endorses") ===
            (bearing.bearing === "consistent-with")
          ? tentative
            ? "tentative-support"
            : "support"
          : tentative
            ? "tentative-opposition"
            : "opposition";
    factors.push({
      principle,
      factor: {
        stableKey: `principle:${principle.id}`,
        favors,
        sourceType: "belief:political-principle",
        importance: IMPORTANCE_BY_CONVICTION[principle.conviction],
        confidence: "medium",
        explanation:
          principle.stance === "conflicted"
            ? `They are torn over ${name}, which this question turns on.`
            : `They ${principle.stance === "endorses" ? "hold to" : "reject"} ${name}, and agreeing with this question is ${bearing.bearing === "consistent-with" ? "consistent with" : "against"} it.`,
        sourceRefs: [
          { kind: "political-principle", principleRecordId: principle.id },
        ],
      },
    });
  }
  return factors;
}

/**
 * How much a principle weighs, by how firmly it is held.
 *
 * PRIVATE CALIBRATION, NOT RESEARCHED: this lines two existing scales up in
 * order and claims nothing more.
 */
const IMPORTANCE_BY_CONVICTION: Readonly<
  Record<BeliefConviction, DecisionImportance>
> = {
  tentative: "slight",
  moderate: "moderate",
  strong: "strong",
  settled: "strong",
};

const POSITION_OF: Readonly<
  Record<
    Exclude<PoliticalBeliefFormationOutcome, "no-opinion" | "defer">,
    BeliefPosition
  >
> = {
  support: "support",
  "tentative-support": "support",
  opposition: "oppose",
  "tentative-opposition": "oppose",
  conflicted: "conflicted",
};

const CONVICTION_ORDER: readonly BeliefConviction[] = [
  "tentative",
  "moderate",
  "strong",
  "settled",
];

/**
 * How firmly a new view is held, from the principles that carried it.
 *
 * Conviction and flexibility come from the firmest principle pointing that
 * way; a view cannot be firmer than what it rests on. Salience — how much the
 * question matters to them — is "high" when it falls under one of the few
 * issues they care about and "low" otherwise; both steps are placeholders
 * filed with `which-issues-people-care-about`.
 */
function dimensionsFor(
  outcome: Exclude<PoliticalBeliefFormationOutcome, "no-opinion" | "defer">,
  factors: readonly PrincipleFactor[],
  caresAboutIssue: boolean,
  prior: PrivateBeliefRecord | null,
): PoliticalBeliefDimensions {
  // Meeting a question again and landing where they already stood, for no
  // reason of principle, keeps the view as firmly as it was held: hearing
  // about a bill once more does not wear a conviction down.
  const tentativeOutcome =
    outcome === "tentative-support" || outcome === "tentative-opposition";
  if (
    prior &&
    prior.position === POSITION_OF[outcome] &&
    (prior.conviction === "tentative") === tentativeOutcome &&
    !factors.some((entry) => entry.factor.favors === outcome)
  )
    return {
      conviction: prior.conviction,
      salience: prior.salience,
      flexibility: prior.flexibility,
    };
  const carried = factors
    .filter((entry) => entry.factor.favors === outcome)
    .map((entry) => entry.principle)
    .sort(
      (a, b) =>
        CONVICTION_ORDER.indexOf(b.conviction) -
        CONVICTION_ORDER.indexOf(a.conviction),
    );
  const firmest = carried[0];
  const tentative =
    outcome === "tentative-support" || outcome === "tentative-opposition";
  const conviction: BeliefConviction = tentative
    ? "tentative"
    : firmest && firmest.conviction !== "tentative"
      ? firmest.conviction
      : "moderate";
  return {
    conviction,
    salience: caresAboutIssue ? "high" : "low",
    flexibility: firmest?.flexibility ?? "open",
  };
}
