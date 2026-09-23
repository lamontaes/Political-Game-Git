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
import { activePartnershipsAt } from "../life-queries";
import { politicalCultureFactors } from "../nationwide-world/political-culture";
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
 * they filed the bill, somebody told them about it, the bill later passed or
 * died, or something in their own life brought it back (`VIEW_TRIGGERS`).
 * Each meeting has them think it over after a while, or leave it until the
 * next such moment (`reflectionDelayDays`), for people who are not the
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
    // Somebody already turning this question over does not start again
    // because they heard it twice before sitting down with it.
    const pending = next.history.futureDueItems.some(
      (item) =>
        item.transitionKey === POLITICAL_REFLECTION_TRANSITION_KEY &&
        item.entityIds.includes(input.personId) &&
        item.dueAt > next.currentDate &&
        next.history.propositionExposures.some(
          (other) =>
            item.stableKey === `${V}:considers:${other.id}` &&
            other.propositionId === propositionId,
        ),
    );
    if (!controlled && !pending)
      next = schedulePoliticalReflection(next, exposure);
  }
  return next;
}

/**
 * How long somebody takes to think a question over, or whether they leave it
 * until something later brings it back.
 *
 * PLACEHOLDER, NOT RESEARCHED. The owner's direction: sometimes a day,
 * sometimes a week, sometimes it is triggered by something later on. The
 * shares below only put that in order: half the time the next day, a third of
 * the time within a week, and otherwise not until they meet the question
 * again. Filed as `what-starts-and-paces-a-political-view`. Drawn once per
 * meeting from the world's seed, so a save always reads the same.
 */
export const REFLECTION_PACE = {
  nextDayShare: 0.5,
  withinWeekShare: 0.35,
  longestDays: 7,
} as const;

export function reflectionDelayDays(
  world: World,
  exposure: PropositionExposureRecord,
): number | null {
  const rng = new SeededRng(world.seed).fork(`${V}:pace:${exposure.id}`);
  const roll = rng.next();
  if (roll < REFLECTION_PACE.nextDayShare) return 1;
  if (roll < REFLECTION_PACE.nextDayShare + REFLECTION_PACE.withinWeekShare)
    return rng.integer(2, REFLECTION_PACE.longestDays + 1);
  return null;
}

/**
 * Thinking a question over, a while after meeting it — or not until
 * something later brings it back (see `reflectionDelayDays`).
 */
export function schedulePoliticalReflection(
  world: World,
  exposure: PropositionExposureRecord,
): World {
  const delay = reflectionDelayDays(world, exposure);
  if (delay === null) return world;
  return scheduleFutureDueItem(world, {
    stableKey: `${V}:considers:${exposure.id}`,
    dueAt: addDays(exposure.encounteredAt, delay),
    transitionKey: POLITICAL_REFLECTION_TRANSITION_KEY,
    entityIds: [exposure.personId],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: `${V}:considers` },
  });
}

/**
 * Something in a life that brings back questions a person has already met.
 *
 * A trigger names an event type, whose life it happens in (the person's own,
 * or also their close family's), and the policy domains it bears on. When it
 * happens, each question in those domains the person has met before comes
 * back to mind and is thought over again, paced as a first meeting is. It
 * never tells anybody about a bill they have not heard of.
 *
 * SCAFFOLDING. The one row below is the owner's own example (a parent's
 * cancer and health care), recorded as such; the rest of the list — a rally,
 * a job loss, a disaster, a tax bill, a school closing — and what each bears
 * on are filed as `what-starts-and-paces-a-political-view`, for ChatGPT to
 * put to the owner. A new row needs no other code. Family is reached only
 * once they know what happened.
 */
export interface ViewTrigger {
  readonly key: string;
  readonly eventType: string;
  /** When present, the event must carry one of these tags. */
  readonly anyTag?: readonly string[];
  readonly reaches: "the-person" | "the-person-and-close-family";
  readonly domainKeys: readonly string[];
  readonly status: "owner-example-placeholder" | "researched";
}

export const VIEW_TRIGGERS: readonly ViewTrigger[] = [
  {
    key: "serious-illness-close-to-home",
    eventType: "health.episode-began",
    anyTag: ["severity:serious", "severity:chronic"],
    reaches: "the-person-and-close-family",
    domainKeys: ["health-human-services"],
    status: "owner-example-placeholder",
  },
];

/** Close family for a trigger: parents, children, siblings and partners. */
function closeFamilyOf(world: World, personId: EntityId): readonly EntityId[] {
  const kin = world.history.kinshipRelationships
    .filter(
      (entry) =>
        entry.personIds.includes(personId) &&
        entry.establishedAt <= world.currentDate &&
        (/^lineal:(.*parent-child|child)$/.test(entry.kind) ||
          entry.kind === "collateral:sibling"),
    )
    .flatMap((entry) => entry.personIds);
  const partners = activePartnershipsAt(world, personId).flatMap(
    (entry) => entry.personIds,
  );
  return [...new Set([...kin, ...partners])].filter((id) => id !== personId);
}

/**
 * Brings back questions for everyone an event reaches under `VIEW_TRIGGERS`.
 * Cheap when nothing matches, which is nearly always.
 */
export function reconsiderAfterEvent(
  world: World,
  event: HistoricalEvent,
): World {
  const triggers = VIEW_TRIGGERS.filter(
    (trigger) =>
      trigger.eventType === event.type &&
      (!trigger.anyTag ||
        trigger.anyTag.some((tag) => event.tags.includes(tag))),
  );
  if (triggers.length === 0) return world;
  let next = world;
  for (const trigger of triggers) {
    const domainIds = new Set(
      // A domain key names the domain in any pack: "health-human-services"
      // is the state-and-local pack's and any other pack's of that name.
      next.policyCatalog.domainOrder.filter((id) => {
        const key = next.policyCatalog.domains[id]!.stableKey;
        return trigger.domainKeys.some(
          (wanted) => key === wanted || key.endsWith(`:${wanted}`),
        );
      }),
    );
    const subjects = event.participants.map((entry) => entry.personId);
    for (const subject of subjects) {
      const reached = new Set<EntityId>([subject]);
      if (trigger.reaches === "the-person-and-close-family")
        // Family is reached only once they know: an illness kept private
        // changes nobody else's mind.
        for (const id of closeFamilyOf(next, subject))
          if (
            next.history.knowledge.some(
              (record) =>
                record.personId === id &&
                record.eventId === event.id &&
                record.learnedAt <= next.currentDate,
            )
          )
            reached.add(id);
      for (const personId of reached) {
        const met = [
          ...new Set(
            next.history.propositionExposures
              .filter((exposure) => exposure.personId === personId)
              .map((exposure) => exposure.propositionId),
          ),
        ].filter((id) => {
          const proposition = next.policyCatalog.propositions[id];
          const issue = proposition
            ? next.policyCatalog.issues[proposition.issueId]
            : undefined;
          return issue !== undefined && domainIds.has(issue.domainId);
        });
        for (const propositionId of met) {
          const stableKey = `${V}:again:${personId}:${propositionId}:${event.id}`;
          if (
            next.history.propositionExposures.some(
              (exposure) => exposure.stableKey === stableKey,
            )
          )
            continue;
          next = recordPropositionExposure(next, {
            stableKey,
            personId,
            propositionId,
            encounteredAt: next.currentDate,
            summary: event.summary,
            provenance:
              personId === subject
                ? { kind: "direct-experience", eventId: event.id }
                : { kind: "told-by", sourcePersonId: subject, claimId: null },
          });
          const exposure = next.history.propositionExposures.at(-1)!;
          const controlled =
            next.control.kind === "person" &&
            next.control.personId === personId;
          if (!controlled) next = schedulePoliticalReflection(next, exposure);
        }
      }
    }
  }
  return next;
}

/**
 * A bill somebody has met reaches its end — signed, vetoed, enacted or dead —
 * and they think it over again. That is the "later on" a view waits for.
 */
export function reconsiderOnBillOutcome(
  world: World,
  event: HistoricalEvent,
): World {
  if (!BILL_OUTCOME_EVENTS.has(event.type)) return world;
  const propositions = new Set(proposalsInEvent(world, event));
  if (propositions.size === 0) return world;
  const people = [
    ...new Set(
      world.history.propositionExposures
        .filter((exposure) => propositions.has(exposure.propositionId))
        .map((exposure) => exposure.personId),
    ),
  ];
  let next = world;
  for (const personId of people)
    next = encounterProposalsInEvent(next, {
      personId,
      event,
      summary: event.summary,
      provenance: {
        kind: "public-record",
        reference: `${event.type}:${event.id}`,
      },
    });
  return next;
}

const BILL_OUTCOME_EVENTS = new Set([
  "legislation.measure-signed",
  "legislation.measure-vetoed",
  "legislation.measure-enacted",
  "legislation.measure-died",
]);

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
    factors: [
      ...factors.map((entry) => entry.factor),
      // Where they live, once a place's culture is researched. Every culture
      // is empty until `political-culture-of-each-jurisdiction` is answered,
      // so this adds nothing today; see `nationwide-world/political-culture.ts`.
      ...politicalCultureFactors(world, personId, exposure.propositionId),
    ],
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
