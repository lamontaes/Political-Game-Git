import { ageOnDate } from "../dates";
import {
  LIVED_OUTCOME_REFLECTION_PREFIX,
  OFFICIAL_VIEW_TRANSITION_KEY,
  lawExposureFeltSize,
  livedOutcomeReflectionKey,
  monthlyPay,
  type LawExposureFeltSize,
  officialViewReflectionKey,
  recordHeardExposure,
} from "../law-exposure";
import {
  officialViewReflectionEventKey,
  viewOfOfficial,
} from "../official-view-reads";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
  type PoliticalBeliefDimensions,
  type PoliticalBeliefFormationFactor,
  type PoliticalBeliefFormationOutcome,
} from "../political-belief-formation";
import { officialOpinionSubject } from "../political-opinion-subjects";
import { recordWorldEvent } from "../world";
import { recordEventKnowledge } from "../records";
import { joinLawInterestGroup } from "./law-interest-groups";
import {
  LIVED_OUTCOME_ANSWERED_BY,
  LIVED_OUTCOME_SUMMARY,
  livedOutcomesOf,
  officialAnsweringFor,
  type LivedOutcome,
} from "./lived-outcomes";
import { confidantsOf } from "../confidants";
import {
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
} from "../life-queries";
import { SYNTHETIC_MIND_IDS } from "../mind-catalog";
import { latestPersonalityTendency } from "../queries";
import {
  readRelationshipStanding,
  type StandingBand,
} from "../relationship-standing";
import { sharedPlaceAcquaintances } from "../shared-places";
import type {
  DecisionImportance,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  LawExposureRecord,
  OfficialViewRecord,
  PoliticalSalience,
  PrivateBeliefRecord,
  World,
} from "../types";
import { affiliationAt } from "./party-evolution";

/**
 * People credit or blame the officials behind a law that reached them
 * (spec 5, "Views of officials").
 *
 * A few days after a law reaches someone, they reflect on it: the executive
 * who signed it, and the legislators whose votes they know of. The
 * reflection is a dated event in their life. For each official, what the law
 * did to them is a factor in the one belief pipeline
 * (`evaluatePoliticalBeliefFormation`), weighed with the view of that official
 * they already hold, and the view the pipeline decides is saved as a private
 * belief whose subject is the official, with its decision trace. The view
 * never fades on its own; only new evidence moves it. Nothing here is shown as
 * a number: readers turn it into votes and talk.
 *
 * The weights are the provisional ones Claude CTO approved on September 28,
 * 2026 (00:35 EDT), each labeled below. Their sources stay in the research
 * checkpoint, not on player screens.
 */

const V = "official-view";

export {
  OFFICIAL_VIEW_TRANSITION_KEY,
  scheduleOfficialViewReflection,
} from "../law-exposure";

export const LIVED_OUTCOME_REFLECTION_EVENT_TYPE =
  "people.lived-outcome-reflection";
/** Prefix of the reflection's tag naming the record it reflects on. */
export const LIVED_OUTCOME_SOURCE_TAG = "lived-outcome-source:";

/** The dated event of a person thinking over one thing that happened to them. */
export function livedOutcomeReflectionEventKey(
  personId: EntityId,
  outcome: Pick<LivedOutcome, "sourceRecordId">,
): string {
  return `${V}:lived-outcome-reflection:${outcome.sourceRecordId}:${personId}`;
}
export {
  assertOfficialViewIntegrity,
  netViewOnLaw,
  townSupportFromViews,
  viewOfOfficial,
} from "../official-view-reads";

// RECORDED GAME VALUES: executive visibility is 1.0 for a signed law; a
// legislator's single vote has 0.6 visibility.
const EXECUTIVE_VISIBILITY = 1;
const LEGISLATOR_VISIBILITY = 0.6;
// SET BY HAND from the finding that people have about 2 to 4 political
// discussion partners (Huckfeldt and Sprague, 1995): someone tells at most
// the three people closest to them.
const DISCUSSION_PARTNERS = 3;
// SET BY HAND from Pew (2024): 35 percent of people 65 and older follow local
// news very closely, against 9 percent at 18 to 29. From this age someone with
// no job to go to has the time and the habit of the older news audience.
const RETIREMENT_AGE = 65;
// SET BY HAND: what someone else went through moves a view as much as the
// hearer cares about the teller. People feel more for those they are closer to
// (Cialdini and others, 1997), so a strong tie passes on half of it, a marked
// one a quarter, and a slight one or none an eighth.
const HEARD_BY_WARMTH: Readonly<Record<StandingBand, number>> = {
  strong: 1 / 2,
  marked: 1 / 4,
  slight: 1 / 8,
  none: 1 / 8,
};
// RECORDED GAME VALUE: own-party blame and other-party credit count half.
const PARTY_ANCHOR = 0.5;
// RECORDED GAME VALUE: a lived outcome carries 0.4 visibility for the office
// responsible, compared with 1.0 for an executive who signed a visible law.
const ANSWERING_OFFICE_VISIBILITY = 0.4;
// ESTIMATED FROM THE GAME'S FULL-WEIGHT BASELINE: an unmeasured money effect
// carries 0.25 weight rather than inventing an amount; no place is singled out.
const UNMEASURED_WEIGHT = 0.25;
// RECORDED GAME SCALE: a law costing a tenth of a month's pay is felt in full.
// The existing belief scale maps 1 to decisive, 0.4 to strong, 0.1 to moderate,
// and smaller nonzero effects to slight; zero leaves no view.
const IMPORTANCE_FROM: readonly (readonly [number, DecisionImportance])[] = [
  [1, "decisive"],
  [0.4, "strong"],
  [0.1, "moderate"],
  [0, "slight"],
];
// RECORDED GAME SCALE: felt weight maps to high, moderate, or low salience.
const SALIENCE_FROM: readonly (readonly [number, PoliticalSalience])[] = [
  [1, "high"],
  [0.4, "moderate"],
  [0, "low"],
];
const SALIENCE_ORDER: readonly PoliticalSalience[] = [
  "low",
  "moderate",
  "high",
  "central",
];
// RECORDED LEGACY-SAVE VALUE: twenty stored reflection points carry the same
// weight as one strong prior belief.
const LEGACY_POINTS_FOR_STRONG = 20;

interface OfficialAct {
  readonly officialId: EntityId;
  readonly act: OfficialViewRecord["act"];
  readonly executive: boolean;
}

export function officialViewReflectionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== OFFICIAL_VIEW_TRANSITION_KEY)
    throw new Error("The official view handler received another transition.");
  if (dueItem.stableKey.startsWith(LIVED_OUTCOME_REFLECTION_PREFIX))
    return reflectOnLivedOutcome(world, dueItem);
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
  const exposure = (world.history.lawExposures ?? []).find(
    (row) => officialViewReflectionKey(row) === dueItem.stableKey,
  );
  if (!exposure || !world.people[exposure.personId])
    return done(world, "exposure-not-present");
  if (
    world.control.kind === "person" &&
    world.control.personId === exposure.personId
  )
    return done(world, "controlled-person");
  const weighed = officialsBehind(world, exposure.measureId).filter(
    (act) =>
      act.officialId !== exposure.personId &&
      (act.executive || knowsVote(world, exposure, act.officialId)),
  );
  let next = world;
  if (weighed.length > 0) {
    for (const act of weighed) {
      if (act.executive) continue;
      const event = voteEvent(next, exposure, act.officialId);
      if (!event || voteKnowledge(next, exposure.personId, event.id)) continue;
      next = recordEventKnowledge(next, {
        stableKey: `${V}:vote-knowledge:${exposure.personId}:${event.id}`,
        personId: exposure.personId,
        eventId: event.id,
        learnedAt: next.currentDate,
        believedSummary: event.summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "public-record", reference: event.id },
      });
    }
    next = recordReflection(next, exposure);
    const eventId = next.history.events.at(-1)!.id;
    for (const act of weighed)
      next = formViewOfOfficial(next, exposure, act, eventId);
  }
  next = joinLawInterestGroup(next, exposure);
  if (exposure.relation === "own")
    for (const hearerId of hearersOf(world, exposure))
      next = recordHeardExposure(next, exposure, hearerId);
  return done(next, "reflected");
}

/** Who signed a law and how each simulated member voted on its passage. */
export function officialsBehind(
  world: World,
  measureId: EntityId,
): readonly OfficialAct[] {
  const acts: OfficialAct[] = [];
  for (const disposition of world.history.executiveDispositions ?? []) {
    if (disposition.measureId !== measureId || disposition.action !== "signed")
      continue;
    const signer = world.history.events
      .find((event) => event.involvedEntityIds.includes(disposition.id))
      ?.participants.find((row) => row.role === "focus:subject");
    if (signer && world.people[signer.personId])
      acts.push({
        officialId: signer.personId,
        act: "signed",
        executive: true,
      });
  }
  // A member's last passage or override vote on the law is the one they
  // answer for.
  const latest = new Map<EntityId, OfficialViewRecord["act"]>();
  for (const vote of world.history.legislativeVotes ?? []) {
    if (
      vote.measureId !== measureId ||
      (vote.purpose !== "floor-stage" && vote.purpose !== "veto-override")
    )
      continue;
    for (const row of vote.dispositions) {
      if (!row.personId || !world.people[row.personId]) continue;
      if (row.disposition === "yea") latest.set(row.personId, "voted-for");
      else if (row.disposition === "nay")
        latest.set(row.personId, "voted-against");
    }
  }
  for (const [officialId, act] of latest)
    if (!acts.some((row) => row.officialId === officialId))
      acts.push({ officialId, act, executive: false });
  return acts;
}

/** The recorded event for the member's latest vote available at reflection time. */
function voteEvent(
  world: World,
  exposure: LawExposureRecord,
  officialId: EntityId,
) {
  const vote = [...(world.history.legislativeVotes ?? [])]
    .filter(
      (row) =>
        row.measureId === exposure.measureId &&
        row.takenAt <= world.currentDate &&
        row.dispositions.some(
          (member) =>
            member.personId === officialId &&
            (member.disposition === "yea" || member.disposition === "nay"),
        ),
    )
    .sort(
      (a, b) => b.takenAt.localeCompare(a.takenAt) || b.sequence - a.sequence,
    )[0];
  if (!vote) return null;
  const action = world.history.legislativeActions?.find(
    (row) => row.voteId === vote.id && row.occurredAt <= world.currentDate,
  );
  return (
    world.history.events.find(
      (row) =>
        row.id === action?.eventId && row.occurredAt <= world.currentDate,
    ) ?? null
  );
}

function voteKnowledge(world: World, personId: EntityId, eventId: EntityId) {
  return world.history.knowledge.find(
    (row) =>
      row.personId === personId &&
      row.eventId === eventId &&
      row.learnedAt <= world.currentDate,
  );
}

/** Public roll calls can be read or heard; private votes require recorded knowledge. */
export function knowsVote(
  world: World,
  exposure: LawExposureRecord,
  officialId: EntityId,
): boolean {
  const event = voteEvent(world, exposure, officialId);
  if (!event) return false;
  return (
    !!voteKnowledge(world, exposure.personId, event.id) ||
    (event.visibility === "public" &&
      (followsNewsClosely(world, exposure.personId) ||
        peopleKnownTo(world, exposure.personId).includes(officialId)))
  );
}

/**
 * A person's news habit: whether they follow local news very closely. It
 * comes from who they are: someone curious seeks the news out, and someone of
 * retirement age with no job to go to has the time and the habit of the older
 * news audience.
 */
export function followsNewsClosely(world: World, personId: EntityId): boolean {
  const person = world.people[personId];
  if (!person) return false;
  const curiosity = latestPersonalityTendency(
    world,
    personId,
    SYNTHETIC_MIND_IDS.tendencies.curiosity,
  )?.expressionKey;
  if (curiosity === "curious") return true;
  return (
    ageOnDate(person.birthDate, world.currentDate) >= RETIREMENT_AGE &&
    activeWorkRelationshipsAt(world, personId).length === 0
  );
}

/**
 * The people someone knows, from the game's own records: the others in their
 * home who are not their partner (a partner already feels the law as family),
 * the people they work alongside, anyone they have a recorded moment with, and
 * the people they share a room with now: a council, a congregation, a club, or
 * a child's class at school (`sharedPlaceAcquaintances`).
 */
export function peopleKnownTo(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const known = new Set<EntityId>();
  const partners = new Set(
    activePartnershipsAt(world, personId).flatMap((row) => row.personIds),
  );
  const homes = new Set(
    householdMembershipsAt(world, personId).map(
      (row) => row.membership.householdId,
    ),
  );
  for (const row of world.history.householdMemberships)
    if (
      homes.has(row.householdId) &&
      !partners.has(row.personId) &&
      world.people[row.personId] &&
      householdMembershipsAt(world, row.personId).some((active) =>
        homes.has(active.membership.householdId),
      )
    )
      known.add(row.personId);
  const workplaces = new Set(
    activeWorkRelationshipsAt(world, personId).flatMap((row) =>
      row.relationship.organizationId ? [row.relationship.organizationId] : [],
    ),
  );
  for (const row of world.history.workRelationships)
    if (
      row.organizationId &&
      workplaces.has(row.organizationId) &&
      world.people[row.personId] &&
      activeWorkRelationshipsAt(world, row.personId).some(
        (active) => active.relationship.organizationId === row.organizationId,
      )
    )
      known.add(row.personId);
  for (const row of world.history.relationshipInteractions)
    if (row.personIds.includes(personId))
      for (const other of row.personIds)
        if (world.people[other] && !partners.has(other)) known.add(other);
  for (const other of sharedPlaceAcquaintances(world, personId))
    if (!partners.has(other)) known.add(other);
  known.delete(personId);
  return [...known].sort();
}

/**
 * Whom a person tells about what a law did to them: the people closest to
 * them among those they know, at most three. Someone who avoids conflict keeps
 * politics to themselves (Ulbig and Funk, 1999, on conflict avoidance and
 * political talk).
 */
function hearersOf(
  world: World,
  exposure: LawExposureRecord,
): readonly EntityId[] {
  const conflict = latestPersonalityTendency(
    world,
    exposure.personId,
    SYNTHETIC_MIND_IDS.tendencies.conflictApproach,
  )?.expressionKey;
  if (conflict === "conflict-averse") return [];
  // The player can hear it too; they just decide for themselves what it means.
  const known = new Set(peopleKnownTo(world, exposure.personId));
  return confidantsOf(world, exposure.personId)
    .filter((personId) => known.has(personId))
    .slice(0, DISCUSSION_PARTNERS);
}

/** The dated event of a person thinking over what a law did to them. */
function recordReflection(world: World, exposure: LawExposureRecord): World {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === exposure.measureId,
  );
  return recordWorldEvent(world, {
    stableKey: officialViewReflectionEventKey(exposure),
    type: "people.law-reflection",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [exposure.personId, exposure.measureId],
    participants: [
      { personId: exposure.personId, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["people.official-view"],
    summary: `Thought over what ${measure?.shortTitle ?? "a law"} did ${
      exposure.relation === "own"
        ? "to them"
        : exposure.relation === "family"
          ? "to their household"
          : "to someone they know"
    }, and who was behind it.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * One person's view of one official behind the law, decided by the belief
 * pipeline from what the law did to them and the view they already hold.
 */
function formViewOfOfficial(
  world: World,
  exposure: LawExposureRecord,
  act: OfficialAct,
  eventId: EntityId,
): World {
  const law = lawFactor(world, exposure, act, eventId);
  if (!law) return world;
  return formViewFromFactor(
    world,
    exposure.personId,
    act.officialId,
    law,
    `${V}:${exposure.id}:${act.officialId}`,
    "What this law did runs against the view of this official the person already held.",
  );
}

/**
 * One reason to credit or blame an official, weighed by the belief pipeline
 * with the view of them the person already holds, and saved.
 */
function formViewFromFactor(
  world: World,
  personId: EntityId,
  officialId: EntityId,
  reason: {
    readonly factor: PoliticalBeliefFormationFactor;
    readonly felt: number;
  },
  stableKey: string,
  tornBecause: string,
): World {
  const subject = officialOpinionSubject(officialId);
  const prior = viewOfOfficial(world, personId, officialId).belief;
  const factors: PoliticalBeliefFormationFactor[] = [reason.factor];
  const credit = reason.factor.favors === "support";
  // New evidence against a view already held leaves the person torn, as much
  // as the new evidence weighs.
  const priorSide =
    prior?.position === "support"
      ? "support"
      : prior?.position === "oppose"
        ? "opposition"
        : null;
  if (priorSide && priorSide !== reason.factor.favors)
    factors.push({
      ...reason.factor,
      stableKey: `${reason.factor.stableKey}:torn`,
      favors: "conflicted",
      explanation: tornBecause,
    });
  if (!prior) {
    const legacy = legacyFactor(world, personId, officialId);
    if (legacy) factors.push(legacy);
  }
  const salience = salienceFor(reason.felt, prior, credit);
  const firm: PoliticalBeliefDimensions = {
    conviction: "moderate",
    salience,
    flexibility: "open",
  };
  const byOutcome: Partial<
    Record<PoliticalBeliefFormationOutcome, PoliticalBeliefDimensions>
  > = {
    support: firm,
    opposition: firm,
    conflicted: firm,
    "tentative-support": { ...firm, conviction: "tentative" },
    "tentative-opposition": { ...firm, conviction: "tentative" },
  };
  const proposal = evaluatePoliticalBeliefFormation(world, {
    stableKey,
    personId,
    subject,
    randomness: "none",
    beliefDimensionsByOutcome: byOutcome,
    factors,
  });
  return applyNpcPoliticalBeliefFormation(world, proposal);
}

/**
 * A few days after something happened to a person that an official answers
 * for (a job they did not choose to leave), they think it over: the outcome
 * is a factor in the one belief pipeline for their view of that official,
 * weighed like a law's effect, by how hard it landed next to their pay and
 * through their temperament and party. The reflection is a dated event in
 * their life, and the view is saved as a private belief.
 */
function reflectOnLivedOutcome(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const done = (
    next: World,
    reason: string,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: `${V}:lived-outcome-${reason}`,
    context: null,
    outcomeEventId: null,
  });
  const personId = dueItem.entityIds[0];
  if (!personId || !world.people[personId])
    return done(world, "person-not-present");
  if (world.control.kind === "person" && world.control.personId === personId)
    return done(world, "controlled-person");
  const outcome = livedOutcomesOf(world, personId).find(
    (row) =>
      livedOutcomeReflectionKey(personId, row.sourceRecordId) ===
      dueItem.stableKey,
  );
  if (!outcome) return done(world, "outcome-not-present");
  const officialId = officialAnsweringFor(
    world,
    personId,
    LIVED_OUTCOME_ANSWERED_BY[outcome.kind],
  );
  if (!officialId || officialId === personId || !world.people[officialId])
    return done(world, "no-official");
  let next = recordWorldEvent(world, {
    stableKey: livedOutcomeReflectionEventKey(personId, outcome),
    type: LIVED_OUTCOME_REFLECTION_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId, officialId],
    participants: [{ personId, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    // The record it reflects on is named in a tag: a work status or a
    // coverage row is not an entity an event may involve.
    tags: [
      "people.official-view",
      `lived-outcome:${outcome.kind}`,
      `${LIVED_OUTCOME_SOURCE_TAG}${outcome.sourceRecordId}`,
    ],
    summary: `Thought over ${LIVED_OUTCOME_SUMMARY[outcome.kind]}, and who answers for it.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  const reason = outcomeFactor(next, personId, officialId, outcome, eventId);
  if (!reason) return done(next, "not-felt");
  next = formViewFromFactor(
    next,
    personId,
    officialId,
    reason,
    `${V}:lived-outcome:${outcome.sourceRecordId}:${personId}:${officialId}`,
    "What happened to them runs against the view of this official the person already held.",
  );
  return done(next, "reflected");
}

/**
 * What happened to the person, as a reason to blame (or credit) the official
 * who answers for it: as hard as it landed next to their pay, at the weight
 * an answering office carries, through their temperament, and anchored by
 * party as a law's effect is.
 */
function outcomeFactor(
  world: World,
  personId: EntityId,
  officialId: EntityId,
  outcome: LivedOutcome,
  eventId: EntityId,
): {
  readonly factor: PoliticalBeliefFormationFactor;
  readonly felt: number;
} | null {
  const credit = outcome.direction === "gain";
  let felt =
    feltFromShare(outcome.felt) *
    ANSWERING_OFFICE_VISIBILITY *
    reactionLens(world, personId);
  const mine = affiliationAt(world, personId).partyOrganizationId;
  const theirs = affiliationAt(world, officialId).partyOrganizationId;
  const anchored =
    mine !== null &&
    theirs !== null &&
    ((mine === theirs && !credit) || (mine !== theirs && credit));
  if (anchored) felt *= PARTY_ANCHOR;
  if (felt <= 0) return null;
  return {
    felt,
    factor: {
      stableKey: `lived-outcome:${outcome.sourceRecordId}`,
      favors: credit ? "support" : "opposition",
      sourceType: "information:lived-outcome",
      importance: IMPORTANCE_FROM.find(([from]) => felt >= from)![1],
      confidence: "high",
      explanation: `This official answers for ${LIVED_OUTCOME_SUMMARY[outcome.kind]}${
        anchored ? "; the person's party loyalty tempers it" : ""
      }.`,
      sourceRefs: [{ kind: "historical-event", eventId }],
    },
  };
}

/**
 * What the law did to this person, as a reason to credit or blame one
 * official: a cost blames whoever made it law and credits whoever voted
 * against it, and a gain does the reverse. It weighs as hard as the law
 * landed, for an executive more than for one legislator's vote, through the
 * person's temperament, and for a friend's story as much as they care about
 * the friend. A partisan is anchored: blame for their own party's official,
 * and credit for the other party's, weigh half.
 */
function lawFactor(
  world: World,
  exposure: LawExposureRecord,
  act: OfficialAct,
  eventId: EntityId,
): {
  readonly factor: PoliticalBeliefFormationFactor;
  readonly felt: number;
} | null {
  const made = act.act !== "voted-against";
  const credit = exposure.direction === "gain" ? made : !made;
  let felt =
    felt01(world, exposure) *
    (act.executive ? EXECUTIVE_VISIBILITY : LEGISLATOR_VISIBILITY) *
    reactionLens(world, exposure.personId) *
    heardShare(world, exposure);
  const mine = affiliationAt(world, exposure.personId).partyOrganizationId;
  const theirs = affiliationAt(world, act.officialId).partyOrganizationId;
  const anchored =
    mine !== null &&
    theirs !== null &&
    ((mine === theirs && !credit) || (mine !== theirs && credit));
  if (anchored) felt *= PARTY_ANCHOR;
  if (felt <= 0) return null;
  const importance = IMPORTANCE_FROM.find(([from]) => felt >= from)![1];
  const vote = !act.executive
    ? voteEvent(world, exposure, act.officialId)
    : null;
  const knowledge = vote
    ? voteKnowledge(world, exposure.personId, vote.id)
    : null;
  const what =
    act.act === "signed"
      ? "signed"
      : act.act === "voted-for"
        ? "voted for"
        : "voted against";
  return {
    felt,
    factor: {
      stableKey: `law-exposure:${exposure.id}`,
      favors: credit ? "support" : "opposition",
      sourceType: "information:law-exposure",
      importance,
      confidence: exposure.relation === "friend" ? "medium" : "high",
      explanation: `This official ${what} a law that ${
        exposure.direction === "gain" ? "paid" : "cost"
      } ${
        exposure.relation === "own"
          ? "the person"
          : exposure.relation === "family"
            ? "the person's household"
            : "someone the person knows"
      }${anchored ? "; the person's party loyalty tempers it" : ""}.`,
      sourceRefs: [
        { kind: "historical-event", eventId },
        ...(knowledge
          ? [{ kind: "event-knowledge" as const, knowledgeId: knowledge.id }]
          : []),
      ],
    },
  };
}

/**
 * How much the view matters to the person: as much as the law landed, and a
 * step more when it confirms the view they already held.
 */
function salienceFor(
  felt: number,
  prior: PrivateBeliefRecord | null,
  credit: boolean,
): PoliticalSalience {
  const fresh = SALIENCE_ORDER.indexOf(
    SALIENCE_FROM.find(([from]) => felt >= from)![1],
  );
  if (!prior) return SALIENCE_ORDER[fresh]!;
  const held = SALIENCE_ORDER.indexOf(prior.salience);
  const confirms = prior.position === (credit ? "support" : "oppose");
  return SALIENCE_ORDER[
    Math.min(
      SALIENCE_ORDER.length - 1,
      Math.max(fresh, held) + (confirms ? 1 : 0),
    )
  ]!;
}

/**
 * In a save from before views were saved beliefs, the person's old
 * reflections on this official are what they already thought of them.
 */
function legacyFactor(
  world: World,
  personId: EntityId,
  officialId: EntityId,
): PoliticalBeliefFormationFactor | null {
  const points = (world.history.officialViews ?? [])
    .filter((row) => row.personId === personId && row.officialId === officialId)
    .reduce((sum, row) => sum + row.points, 0);
  if (points === 0) return null;
  const size = Math.abs(points) / LEGACY_POINTS_FOR_STRONG;
  return {
    stableKey: `legacy-official-view:${officialId}`,
    favors: points > 0 ? "support" : "opposition",
    sourceType: "context:earlier-reflections",
    importance: IMPORTANCE_FROM.find(([from]) => size >= from)![1],
    confidence: "medium",
    explanation:
      "What the person had already made of this official from earlier laws.",
    sourceRefs: [],
  };
}

/**
 * How much of what happened to someone else reaches the hearer's own view:
 * all of their own and their household's, and of a friend's story as much as
 * they care about the one who told it.
 */
export function heardShare(world: World, exposure: LawExposureRecord): number {
  if (exposure.relation !== "friend" || exposure.viaPersonId === null) return 1;
  const warmth = readRelationshipStanding(
    world,
    exposure.personId,
    exposure.viaPersonId,
  ).readings.warmth.band;
  return HEARD_BY_WARMTH[warmth];
}

/**
 * How hard the law landed, 0 to 1: its money next to the pay it comes out of.
 * A partner's paycheck lands in a shared household, so a partner weighs it
 * against both their pays together (couples pool their income; Pahl, 1989).
 */
function felt01(world: World, exposure: LawExposureRecord): number {
  const household =
    exposure.relation === "family" &&
    exposure.viaPersonId &&
    exposure.amount !== null
      ? (monthlyPay(world, exposure.viaPersonId, exposure.recordedAt)
          ?.minorUnits ?? 0)
      : 0;
  // A right or an eligibility with no money on record is felt at the one
  // estimated size every reader shares (`lawExposureFeltSize`).
  const felt = lawExposureFeltSize(
    exposure,
    (exposure.monthlyPay?.minorUnits ?? 0) + household,
  );
  return felt === null ? 0 : feltFromShare(felt);
}

/** How hard an effect landed, 0 to 1, from its size next to pay. */
function feltFromShare(felt: Exclude<LawExposureFeltSize, null>): number {
  if (felt === "unmeasured") return UNMEASURED_WEIGHT;
  // RECORDED GAME SCALE: a law costing a tenth of monthly pay is felt fully;
  // the existing square-root curve keeps smaller recorded amounts noticeable.
  return Math.min(1, Math.sqrt(felt.share * 10));
}

/**
 * Personality is the lens, not the side: a reactive or combative person moves
 * further on the same law, a patient or conflict-averse one less.
 */
export function reactionLens(world: World, personId: EntityId): number {
  let factor = 1;
  const tempo = latestPersonalityTendency(
    world,
    personId,
    SYNTHETIC_MIND_IDS.tendencies.responseTempo,
  )?.expressionKey;
  // RECORDED GAME MULTIPLIERS: reactive is 1.5 and patient is 0.75; the
  // conflict-expression multipliers below use the same saved tendency record.
  if (tempo === "reactive") factor *= 1.5;
  if (tempo === "patient") factor *= 0.75;
  const conflict = latestPersonalityTendency(
    world,
    personId,
    SYNTHETIC_MIND_IDS.tendencies.conflictApproach,
  )?.expressionKey;
  if (conflict === "combative") factor *= 1.25;
  if (conflict === "conflict-averse") factor *= 0.85;
  return factor;
}
