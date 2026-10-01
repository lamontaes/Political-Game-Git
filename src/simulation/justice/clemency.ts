import { addDays, daysBetween } from "../dates";
import { ensureClemencyPetitionSchedule } from "./clemency-transitions";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { eventById } from "../event-index";
import {
  electedExecutiveTermForRelationship,
  recordedExecutiveQualification,
} from "../executive-work-context";
import {
  currentGoverningOffices,
  governingMatters,
  openClemencyMatter,
  type GoverningOffice,
} from "../governing/state-governing";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import { currentLifeCutoff, workStatusAt } from "../life-queries";
import { ensurePeopleTraits } from "../people-traits";
import { personName } from "../people";
import { deriveRelationshipSummary } from "../queries";
import { recordEventKnowledge } from "../records";
import { registeredTraitConsiderations } from "../trait-readings";
import { traitRegistryFor } from "../trait-registry";
import type {
  DecisionConsideration,
  EntityId,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { recordWorldEvent } from "../world";
import { CLEMENCY_PETITION_DECISION } from "./clemency-decisions";
import { CLEMENCY_GRANT } from "./clemency-reasoning";
import { settleJailAbsences } from "./jail-absence";
import {
  ANSWER_TAG,
  ANSWERED_BY_TAG,
  answersTo,
  BODY_TAG,
  CLEMENCY_ANSWER_EVENT,
  CLEMENCY_DENIED_EVENT,
  CLEMENCY_PETITION_EVENT,
  CLEMENCY_VERSION,
  PETITION_PLACE_TAG,
  PETITION_TAG,
  PETITIONER_ROLE,
  petitionerOf,
  ROLE_TAG,
  tagValue,
} from "./clemency-records";
import {
  clemencyAuthorityFor,
  clemencyBody,
  clemencyGateFor,
  EXECUTIVE_BODY,
  type ClemencyAuthority,
  type ClemencyBody,
  type ClemencyGate,
} from "./clemency-rules";
import {
  CLEMENCY_GRANTED_EVENT,
  CLEMENCY_KIND_TAG,
  CLEMENCY_SENTENCE_TAG,
  eventsOfType,
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_KIND_TAG,
  sentencedPersonOf,
  sentencesOf,
  type ClemencyKind,
  type Sentence,
} from "./jail-terms";

/**
 * CLEMENCY — a person under sentence asks, and whoever the place's law says
 * must agree answers, in the law's order (D-6, approved 2026-09-28).
 *
 * 1. Only a recorded sentence can be the subject of a request. Nobody with no
 *    conviction on record can ask, and nothing here invents one.
 * 2. A person the game plays decides whether to ask from their own situation
 *    and temperament, and decides again only when the person who would answer
 *    changes (a new governor). The player asks with `fileClemencyPetition`.
 * 3. The request goes to each body in `clemency-rules.ts`: a board the law
 *    makes the grantor hear from, then every body whose yes is needed.
 * 4. The executive answers at the office's desk: the player decides it, and a
 *    governor the game plays reasons from their principles, relationships,
 *    the case and the calendar (`clemency-reasoning.ts`). No grant rate.
 * 5. A grant is written against the sentence, which then ends on the grant's
 *    day (`jail-terms.ts`): out of jail, able to campaign and serve again.
 *
 * PLACEHOLDER: boards, councils, cabinet members and courts are not seated
 * people yet. Until an appointments build seats them, an unseated body
 * answers from the case record by `UNSEATED_BODY_READING`, and says so.
 */

/**
 * PLACEHOLDER (hand-set, not measured). How a body whose members the game has
 * not seated answers, read from the case alone:
 * - it takes a request up no sooner than `answersAfterDays` after the
 *   request reached it, and not until half the sentence has been served
 *   (a waiting period, as many real boards have);
 * - then it says no to a violent offense and no while a later case has been
 *   opened against the person, and yes otherwise.
 * Replaced by the members' own reasoning when an appointments build seats
 * them (Build 20).
 */
export const UNSEATED_BODY_READING = {
  version: "clemency-unseated-body-placeholder-v1",
  servedShareBeforeTakenUp: 0.5,
  violentOffenses: ["crime:assault", "crime:robbery"] as readonly string[],
  answersAfterDays: 30,
} as const;

/**
 * PLACEHOLDER (hand-set): a sentence this close to its end is not worth a
 * request to the person serving it.
 */
export const NEARLY_SERVED_DAYS = 60;

const OFFENSE_TAG = "justice.offense:";
const REFERRAL_TAG = "justice.referral:";

export type ClemencyActionResult =
  | { readonly ok: true; readonly world: World; readonly petitionId: EntityId }
  | { readonly ok: false; readonly world: World; readonly reason: string };

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/** The place whose clemency power reaches a sentence: where the case was. */
export function clemencyPlaceKeyFor(
  world: World,
  sentenced: HistoricalEvent,
): string | null {
  const jurisdictionId = sentenced.jurisdictionId;
  if (!jurisdictionId) return null;
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (place?.stateJurisdictionKey) return place.stateJurisdictionKey;
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
}

/** The referral a sentence came from, and so when the case began. */
function referralOf(world: World, sentenced: HistoricalEvent) {
  const id = tagValue(sentenced, REFERRAL_TAG);
  return id ? eventById(world, id as EntityId) : null;
}

interface CaseRoute {
  readonly placeKey: string;
  readonly authority: ClemencyAuthority;
  readonly gate: ClemencyGate;
  /** Advisory body first (where it is heard), then each body that must agree. */
  readonly steps: readonly {
    readonly body: ClemencyBody | null;
    readonly key: string;
    readonly role: "advisory" | "consent";
  }[];
  /** The office whose holder answers for the executive, if one is seated. */
  readonly office: GoverningOffice | null;
}

function officeFor(world: World, placeKey: string): GoverningOffice | null {
  return (
    currentGoverningOffices(world).find(
      (office) => `US-${office.stateUsps}` === placeKey,
    ) ?? null
  );
}

/**
 * Which law routes a sentence, or why none can. The offense's date is the
 * referral's (an offense the game records happens in play, so its referral
 * dates it closely enough for the only dated rule, Arizona's 1994 line).
 * Earlier sentences the game cannot classify as felonies, so a rule that
 * counts prior felonies can be applied only when there are too few earlier
 * sentences for it to matter.
 */
function routeFor(
  world: World,
  sentenced: HistoricalEvent,
  personId: EntityId,
): CaseRoute | string {
  const placeKey = clemencyPlaceKeyFor(world, sentenced);
  if (!placeKey)
    return "The game does not know which government's clemency power reaches this sentence.";
  const authority = clemencyAuthorityFor(placeKey);
  if (!authority)
    return "Who grants clemency in this place has not been read yet.";
  const referral = referralOf(world, sentenced);
  const earlier = sentencesOf(world, personId).filter(
    (sentence) => sentence.from < sentenced.occurredAt,
  ).length;
  // The game does not record whether a sentence was for a felony, so a rule
  // that counts earlier felonies can only be applied when there are too few
  // earlier sentences of any kind to reach its count.
  const unclassified = authority.gates.some(
    (gate) =>
      gate.offenses.kind === "prior-felony-convictions-at-least" &&
      earlier >= gate.offenses.count,
  );
  const gate = unclassified
    ? null
    : clemencyGateFor(authority, {
        committedAt: referral?.occurredAt ?? sentenced.occurredAt,
        priorFelonyConvictions: earlier,
      });
  if (!gate)
    return "Which clemency rule applies to this sentence cannot be told from the record.";
  const needsExecutive =
    gate.mustAgree.includes(EXECUTIVE_BODY) ||
    gate.mustAgree.some(
      (key) => clemencyBody(authority, key)?.includesExecutive,
    );
  const office = needsExecutive ? officeFor(world, placeKey) : null;
  if (needsExecutive && !office)
    return authority.executiveTitle === "President"
      ? "The President's clemency desk is not in the game yet."
      : `No ${authority.executiveTitle.toLowerCase()} is seated to answer.`;
  const advisory =
    gate.advisory && gate.advisory.referral !== "optional"
      ? [
          {
            body: clemencyBody(authority, gate.advisory.body),
            key: gate.advisory.body,
            role: "advisory" as const,
          },
        ]
      : [];
  return {
    placeKey,
    authority,
    gate,
    steps: [
      ...advisory,
      ...gate.mustAgree.map((key) => ({
        body: key === EXECUTIVE_BODY ? null : clemencyBody(authority, key),
        key,
        role: "consent" as const,
      })),
    ],
    office,
  };
}

/** Every petition on record, oldest first. */
export function clemencyPetitions(world: World): readonly HistoricalEvent[] {
  return eventsOfType(world, CLEMENCY_PETITION_EVENT);
}

function closingEventFor(
  world: World,
  petitionId: EntityId,
): HistoricalEvent | null {
  const tag = `${PETITION_TAG}${petitionId}`;
  const closing = [
    eventsOfType(world, CLEMENCY_GRANTED_EVENT).find((event) =>
      event.tags.includes(tag),
    ),
    eventsOfType(world, CLEMENCY_DENIED_EVENT).find((event) =>
      event.tags.includes(tag),
    ),
  ].filter((event): event is HistoricalEvent => event !== undefined);
  // The earlier of the two, as a scan of history in order finds it.
  return closing.sort((a, b) => a.sequence - b.sequence)[0] ?? null;
}

export type ClemencyPetitionStatus = "open" | "granted" | "denied";

export function clemencyPetitionStatus(
  world: World,
  petitionId: EntityId,
): ClemencyPetitionStatus {
  const closing = closingEventFor(world, petitionId);
  return !closing
    ? "open"
    : closing.type === CLEMENCY_GRANTED_EVENT
      ? "granted"
      : "denied";
}

/**
 * Who would answer, as a key: the seated executive where the law needs them,
 * or the place's bodies. A request is made once to each; a new governor is a
 * new person to ask.
 */
function answererKey(route: CaseRoute): string {
  return route.office
    ? `executive:${route.office.holderPersonId}`
    : `bodies:${route.placeKey}`;
}

function runningSentence(
  world: World,
  personId: EntityId,
  sentencedId: EntityId,
): Sentence | null {
  return (
    sentencesOf(world, personId).find(
      (sentence) => sentence.sentencedEventId === sentencedId,
    ) ?? null
  );
}

function recordPetition(
  world: World,
  personId: EntityId,
  sentenced: HistoricalEvent,
  route: CaseRoute,
  kind: ClemencyKind,
): { world: World; petitionId: EntityId } {
  const person = world.people[personId]!;
  const stableKey = `${CLEMENCY_VERSION}:petition:${sentenced.id}:${answererKey(route)}`;
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing) return { world, petitionId: existing.id };
  const asked =
    kind === "commutation"
      ? "to shorten the jail term to the time already served"
      : "for a pardon";
  let next = recordWorldEvent(world, {
    stableKey,
    type: CLEMENCY_PETITION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: sentenced.jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: PETITIONER_ROLE, detail: "Asked for clemency" },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      CLEMENCY_VERSION,
      `${CLEMENCY_SENTENCE_TAG}${sentenced.id}`,
      `${CLEMENCY_KIND_TAG}${kind}`,
      `${PETITION_PLACE_TAG}${route.placeKey}`,
      ...route.steps.map(
        (step, index) => `justice.clemency-step:${index}:${step.key}`,
      ),
    ],
    summary: `${personName(person)} asked ${route.authority.place}'s clemency authority ${asked}.`,
    context: {
      location: null,
      socialContext: "Clemency request",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const petition = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:known`,
    personId,
    eventId: petition.id,
    learnedAt: next.currentDate,
    believedSummary: petition.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return {
    world: ensureClemencyPetitionSchedule(next, petition.id),
    petitionId: petition.id,
  };
}

/**
 * A person asks for clemency on one of their own sentences. The player's
 * route; the game's people ask through `advanceClemency`. Refused, with the
 * reason, when there is no such sentence, when it has already ended, or when
 * the law of the place cannot be read.
 */
export function fileClemencyPetition(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly sentencedEventId: EntityId;
  },
): ClemencyActionResult {
  const refuse = (reason: string): ClemencyActionResult => ({
    ok: false,
    world,
    reason,
  });
  if (!world.people[input.personId])
    return refuse("That person is not on record.");
  const sentenced = eventById(world, input.sentencedEventId);
  if (
    !sentenced ||
    sentenced.type !== PROSECUTION_SENTENCED_EVENT ||
    sentencedPersonOf(sentenced) !== input.personId
  )
    return refuse("There is no recorded conviction to ask about.");
  const sentence = runningSentence(world, input.personId, sentenced.id);
  if (!sentence) return refuse("There is no recorded conviction to ask about.");
  if (sentence.clemency)
    return refuse("Clemency has already been granted on this sentence.");
  if (sentence.until <= world.currentDate)
    return refuse("The sentence has already been served.");
  const route = routeFor(world, sentenced, input.personId);
  if (typeof route === "string") return refuse(route);
  const open = clemencyPetitions(world).find(
    (petition) =>
      petition.tags.includes(`${CLEMENCY_SENTENCE_TAG}${sentenced.id}`) &&
      clemencyPetitionStatus(world, petition.id) === "open",
  );
  if (open) return refuse("A request on this sentence is already waiting.");
  const stableKey = `${CLEMENCY_VERSION}:petition:${sentenced.id}:${answererKey(route)}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return refuse(
      "The same people have already answered a request on this sentence.",
    );
  const kind: ClemencyKind =
    sentence.kind === "jail" && sentence.from <= world.currentDate
      ? "commutation"
      : "pardon";
  const recorded = recordPetition(
    world,
    input.personId,
    sentenced,
    route,
    kind,
  );
  return { ok: true, world: recorded.world, petitionId: recorded.petitionId };
}

/* ------------------------------------------------------------------ *
 * Whether the game's people ask
 * ------------------------------------------------------------------ */

function petitionDecisionKey(sentencedId: EntityId, answerer: string): string {
  return `${CLEMENCY_VERSION}:ask:${sentencedId}:${answerer}`;
}

/**
 * Whether one person under sentence asks, through the shared decision
 * engine. What argues for asking is their situation; what argues against is
 * the attention a request draws; their own temperament leans either way
 * through the trait packs. Nothing here is a share of people who ask, and
 * no seeded draw settles a close call: an exact tie falls to the first option
 * key, "petition", since asking costs the person nothing the record shows.
 */
function decideWhetherToAsk(
  world: World,
  personId: EntityId,
  sentenced: HistoricalEvent,
  sentence: Sentence,
  route: CaseRoute,
): World {
  const key = petitionDecisionKey(sentenced.id, answererKey(route));
  if (
    world.history.decisionTraces.some(
      (trace) => trace.context.stableKey === key,
    )
  )
    return world;
  const withTraits = ensurePeopleTraits(world, [personId]);
  const considerations: DecisionConsideration[] = [];
  const inJail =
    sentence.kind === "jail" &&
    sentence.from <= withTraits.currentDate &&
    withTraits.currentDate < sentence.until;
  considerations.push({
    stableKey: `${key}:serving`,
    optionKey: "petition",
    sourceType: "context:sentence",
    direction: "supports",
    importance: inJail ? "moderate" : "slight",
    confidence: "high",
    explanation: inJail ? "They are in jail." : "They are on probation.",
    sourceRefs: [],
  });
  if (addDays(withTraits.currentDate, NEARLY_SERVED_DAYS) >= sentence.until)
    considerations.push({
      stableKey: `${key}:nearly-served`,
      optionKey: "wait",
      sourceType: "context:sentence",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "The sentence is nearly over.",
      sourceRefs: [],
    });
  if (sentenced.visibility === "public")
    considerations.push({
      stableKey: `${key}:public`,
      optionKey: "wait",
      sourceType: "context:public-record",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "Asking would put the case back in the papers.",
      sourceRefs: [],
    });
  const holder = route.office?.holderPersonId ?? null;
  if (holder && holder !== personId) {
    const closeness = deriveRelationshipSummary(
      withTraits,
      personId,
      holder,
    ).closeness;
    if (closeness === "close" || closeness === "estranged")
      considerations.push({
        stableKey: `${key}:knows-decider`,
        optionKey: closeness === "close" ? "petition" : "wait",
        sourceType: "context:relationship",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation:
          closeness === "close"
            ? `They know the ${route.authority.executiveTitle.toLowerCase()} well.`
            : `They and the ${route.authority.executiveTitle.toLowerCase()} are on bad terms.`,
        sourceRefs: [],
      });
  }
  considerations.push(
    ...registeredTraitConsiderations(
      withTraits,
      traitRegistryFor(withTraits),
      personId,
      key,
      CLEMENCY_PETITION_DECISION.id,
    ),
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: key,
    decisionType: "justice.clemency-petition",
    actorPersonId: personId,
    cutoff: currentLifeCutoff(withTraits),
    subject: {
      kind: "context:clemency-petition",
      key: sentenced.stableKey,
      entityId: null,
    },
    options: [
      {
        key: "petition",
        label: "Ask for clemency",
        description:
          "Ask whoever holds the clemency power to end the sentence.",
      },
      {
        key: "wait",
        label: "Serve it out",
        description: "Let the sentence run.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const traced = recordDurableDecisionTrace(withTraits, evaluation);
  if (evaluation.selectedOptionKey !== "petition") return traced;
  const kind: ClemencyKind = inJail ? "commutation" : "pardon";
  return recordPetition(traced, personId, sentenced, route, kind).world;
}

/** Every sentence still running today, with the person serving it. */
function runningSentences(world: World) {
  const out: {
    personId: EntityId;
    sentenced: HistoricalEvent;
    sentence: Sentence;
  }[] = [];
  for (const event of eventsOfType(world, PROSECUTION_SENTENCED_EVENT)) {
    if (!event.tags.some((tag) => tag.startsWith(SENTENCE_KIND_TAG))) continue;
    const personId = sentencedPersonOf(event);
    if (!personId || !world.people[personId]) continue;
    const sentence = runningSentence(world, personId, event.id);
    if (!sentence || sentence.clemency) continue;
    if (!(
      sentence.from <= world.currentDate && world.currentDate < sentence.until
    ))
      continue;
    out.push({ personId, sentenced: event, sentence });
  }
  return out;
}

/** A saved sentence wakes only its actual NPC's existing petition decision. */
export function considerClemencyAfterSentence(
  world: World,
  sentenceId: EntityId,
): World {
  const sentenced = eventById(world, sentenceId);
  if (sentenced?.type !== PROSECUTION_SENTENCED_EVENT) return world;
  const personId = sentencedPersonOf(sentenced);
  if (
    !personId ||
    !world.people[personId] ||
    controlledPersonId(world) === personId ||
    !isPersonAliveAt(world, personId, currentLifeCutoff(world))
  )
    return world;
  const sentence = runningSentence(world, personId, sentenced.id);
  if (
    !sentence ||
    sentence.clemency ||
    sentence.from > world.currentDate ||
    sentence.until <= world.currentDate
  )
    return world;
  const route = routeFor(world, sentenced, personId);
  if (typeof route === "string") return world;
  if (
    clemencyPetitions(world).some(
      (petition) =>
        petition.tags.includes(`${CLEMENCY_SENTENCE_TAG}${sentenced.id}`) &&
        clemencyPetitionStatus(world, petition.id) === "open",
    )
  )
    return world;
  const decided = decideWhetherToAsk(
    world,
    personId,
    sentenced,
    sentence,
    route,
  );
  const stableKey = `${CLEMENCY_VERSION}:petition:${sentenced.id}:${answererKey(route)}`;
  const petition = clemencyPetitions(decided).find(
    (row) => row.stableKey === stableKey,
  );
  return petition ? advanceClemencyPetition(decided, petition.id) : decided;
}

/** The real desk's saved term, not a planned winner or a home-place proxy. */
export function considerClemencyAfterExecutiveDesk(
  world: World,
  termId: EntityId,
): World {
  const office = currentGoverningOffices(world).find(
    (row) => row.termId === termId,
  );
  if (!office) return world;
  let next = world;
  for (const { sentenced } of runningSentences(world)) {
    if (clemencyPlaceKeyFor(world, sentenced) !== `US-${office.stateUsps}`)
      continue;
    next = considerClemencyAfterSentence(next, sentenced.id);
  }
  return next;
}

function produceRequests(world: World): World {
  let next = world;
  for (const { personId, sentenced, sentence } of runningSentences(world)) {
    if (controlledPersonId(next) === personId) continue;
    if (!isPersonAliveAt(next, personId, currentLifeCutoff(next))) continue;
    const route = routeFor(next, sentenced, personId);
    if (typeof route === "string") continue;
    const waiting = clemencyPetitions(next).some(
      (petition) =>
        petition.tags.includes(`${CLEMENCY_SENTENCE_TAG}${sentenced.id}`) &&
        clemencyPetitionStatus(next, petition.id) === "open",
    );
    if (waiting) continue;
    next = decideWhetherToAsk(next, personId, sentenced, sentence, route);
  }
  return next;
}

/* ------------------------------------------------------------------ *
 * Answers
 * ------------------------------------------------------------------ */

/**
 * The case-record answer of a body the game has not seated (PLACEHOLDER; see
 * `UNSEATED_BODY_READING`). Returns the answer and the reason in plain words,
 * or null while the body has not taken the request up.
 */
export function unseatedBodyReading(
  world: World,
  personId: EntityId,
  sentenced: HistoricalEvent,
  sentence: Sentence,
): { readonly favorable: boolean; readonly reason: string } | null {
  const rule = UNSEATED_BODY_READING;
  const total =
    new Date(`${sentence.until}T00:00:00Z`).getTime() -
    new Date(`${sentence.from}T00:00:00Z`).getTime();
  const served =
    new Date(`${world.currentDate}T00:00:00Z`).getTime() -
    new Date(`${sentence.from}T00:00:00Z`).getTime();
  if (total > 0 && served / total < rule.servedShareBeforeTakenUp) return null;
  const offense = tagValue(sentenced, OFFENSE_TAG) ?? "";
  if (rule.violentOffenses.includes(offense))
    return { favorable: false, reason: "The offense was violent." };
  const later = world.history.events.some(
    (event) =>
      event.type === "justice.prosecution-referred" &&
      event.occurredAt > sentenced.occurredAt &&
      event.participants.some(
        (entry) =>
          entry.role === "focus:subject" && entry.personId === personId,
      ),
  );
  if (later)
    return {
      favorable: false,
      reason: "A new case was opened against them after the sentence.",
    };
  return {
    favorable: true,
    reason: "Half the sentence has been served with nothing new against them.",
  };
}

/** One plain sentence for an answer: a governor agrees, a board votes. */
function answerSentence(
  label: string,
  role: "advisory" | "consent",
  answeredBy: "case-record" | "officeholder" | "board-vote",
  favorable: boolean,
): string {
  if (answeredBy === "officeholder")
    return favorable
      ? `The ${label} agreed to the request.`
      : `The ${label} turned the request down.`;
  if (role === "advisory")
    return favorable
      ? `The ${label} recommended granting the request.`
      : `The ${label} recommended against the request.`;
  return `The ${label} voted ${favorable ? "for" : "against"} the request.`;
}

function recordAnswer(
  world: World,
  petition: HistoricalEvent,
  step: CaseRoute["steps"][number],
  label: string,
  favorable: boolean,
  answeredBy: "case-record" | "officeholder" | "board-vote",
  reason: string,
  deciderPersonId: EntityId | null,
): World {
  const petitionerId = petitionerOf(petition)!;
  return recordWorldEvent(world, {
    stableKey: `${petition.stableKey}:answer:${step.key}`,
    type: CLEMENCY_ANSWER_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [
      petitionerId,
      ...(deciderPersonId && deciderPersonId !== petitionerId
        ? [deciderPersonId]
        : []),
    ],
    participants: [
      { personId: petitionerId, role: PETITIONER_ROLE, detail: null },
      ...(deciderPersonId && deciderPersonId !== petitionerId
        ? [
            {
              personId: deciderPersonId,
              role: "agency:decider" as const,
              detail: label,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      CLEMENCY_VERSION,
      `${PETITION_TAG}${petition.id}`,
      `${BODY_TAG}${step.key}`,
      `${ROLE_TAG}${step.role}`,
      `${ANSWER_TAG}${favorable ? "favorable" : "unfavorable"}`,
      `${ANSWERED_BY_TAG}${answeredBy}`,
      ...(answeredBy === "case-record" ? [UNSEATED_BODY_READING.version] : []),
    ],
    summary:
      `${answerSentence(label, step.role, answeredBy, favorable)} ${reason}`.trim(),
    context: {
      location: null,
      socialContext: label,
      pressure: null,
      choice: favorable ? "For" : "Against",
      motivation: reason.length > 0 ? reason : null,
      immediateReaction: null,
    },
  });
}

/** The executive's own answer from the desk, once it is decided. */
function executiveAnswer(
  world: World,
  route: CaseRoute,
  petition: HistoricalEvent,
  instance: string,
): { readonly world: World; readonly favorable: boolean | null } {
  const office = route.office!;
  const matter = governingMatters(world, office.officeKey).find(
    (candidate) =>
      candidate.family === "clemency" &&
      candidate.openedEvent.tags.includes(`source-event:${petition.id}`) &&
      candidate.stableKey.endsWith(`:clemency:${instance}`),
  );
  if (!matter) {
    const petitionerId = petitionerOf(petition)!;
    const kind = (tagValue(petition, CLEMENCY_KIND_TAG) ??
      "pardon") as ClemencyKind;
    return {
      world: openClemencyMatter(world, office.officeKey, {
        instance,
        petitionEventId: petition.id,
        petitionerId,
        kind,
      }),
      favorable: null,
    };
  }
  if (matter.status === "open") return { world, favorable: null };
  return {
    world,
    favorable:
      matter.decision?.tags.includes(`choice:${CLEMENCY_GRANT}`) ?? false,
  };
}

function lastMovedAt(world: World, petition: HistoricalEvent) {
  return (
    answersTo(world, petition.id).at(-1)?.event.occurredAt ??
    petition.occurredAt
  );
}

/** Next existing legal/writer boundary; an undecided executive gets no retry. */
export function nextClemencyPetitionDueAt(
  world: World,
  petitionId: EntityId,
): IsoDate | null {
  const petition = eventById(world, petitionId);
  if (
    petition?.type !== CLEMENCY_PETITION_EVENT ||
    clemencyPetitionStatus(world, petitionId) !== "open"
  )
    return null;
  const personId = petitionerOf(petition);
  const sentenceId = tagValue(
    petition,
    CLEMENCY_SENTENCE_TAG,
  ) as EntityId | null;
  const sentenced = sentenceId && eventById(world, sentenceId);
  if (!personId || !sentenced) return null;
  const sentence = runningSentence(world, personId, sentenced.id);
  if (!sentence || sentence.until <= world.currentDate) return null;
  const dates = [sentence.until];
  const route = routeFor(world, sentenced, personId);
  if (typeof route !== "string") {
    const answered = answersTo(world, petitionId);
    const step = route.steps.find(
      (entry) => !answered.some((answer) => answer.bodyKey === entry.key),
    );
    if (step && step.key !== EXECUTIVE_BODY) {
      const wait = addDays(
        lastMovedAt(world, petition),
        UNSEATED_BODY_READING.answersAfterDays,
      );
      const served = addDays(
        sentence.from,
        Math.ceil(
          daysBetween(sentence.from, sentence.until) *
            UNSEATED_BODY_READING.servedShareBeforeTakenUp,
        ),
      );
      const hearing = wait > served ? wait : served;
      if (hearing > world.currentDate) dates.push(hearing);
      const cap =
        step.role === "advisory"
          ? route.gate.advisory?.reportWithinDays
          : undefined;
      if (cap !== undefined) {
        const report = addDays(petition.occurredAt, cap);
        if (report > world.currentDate) dates.push(report);
      }
    }
  }
  return dates.sort()[0]!;
}

/** Review only this saved petition; leave request creation on its current caller. */
export function advanceClemencyPetition(
  world: World,
  petitionId: EntityId,
): World {
  const petition = eventById(world, petitionId);
  if (
    petition?.type !== CLEMENCY_PETITION_EVENT ||
    clemencyPetitionStatus(world, petitionId) !== "open"
  )
    return world;
  const advanced = advancePetition(world, petition);
  const scheduled = ensureClemencyPetitionSchedule(advanced, petitionId);
  return advanced === world ? scheduled : settleJailAbsences(scheduled);
}

/** Review saved requests only after this recorded elected office became active.
 * Request creation stays on its existing caller; asked-holder identity never moves.
 */
export function advanceClemencyAfterExecutiveEntry(
  world: World,
  relationshipId: EntityId,
): World {
  const term = electedExecutiveTermForRelationship(world, relationshipId);
  if (
    !term ||
    workStatusAt(world, relationshipId)?.status !== "active" ||
    world.currentDate < term.startsAt ||
    world.currentDate >= term.endsAt ||
    !recordedExecutiveQualification(world, relationshipId) ||
    !isPersonAliveAt(
      world,
      term.relationship.personId,
      currentLifeCutoff(world),
    )
  )
    return world;
  const placeKey = stateKeyForJurisdiction(term.governing);
  if (!placeKey) return world;
  let next = world;
  for (const petition of clemencyPetitions(world)) {
    if (tagValue(petition, PETITION_PLACE_TAG) !== placeKey) continue;
    if (clemencyPetitionStatus(next, petition.id) !== "open") continue;
    const before = next;
    const advanced = advancePetition(
      next,
      petition,
      term.relationship.personId,
    );
    next = ensureClemencyPetitionSchedule(advanced, petition.id);
    if (advanced !== before) next = settleJailAbsences(next);
  }
  return next;
}

/** Moves one open petition as far as today allows. */
function advancePetition(
  world: World,
  petition: HistoricalEvent,
  enteringExecutiveId?: EntityId,
): World {
  const petitionerId = petitionerOf(petition);
  const sentencedId = tagValue(
    petition,
    CLEMENCY_SENTENCE_TAG,
  ) as EntityId | null;
  const sentenced = sentencedId ? eventById(world, sentencedId) : null;
  if (!petitionerId || !sentenced) return world;
  const sentence = runningSentence(world, petitionerId, sentenced.id);
  if (!sentence) return world;
  // A saved sentence end does not need a sitting executive to close its request.
  if (sentence.until <= world.currentDate)
    return closePetition(
      world,
      petition,
      null,
      "The sentence ended before an answer came.",
    );
  // Entry callers have just saved active work. The general office reader sees
  // the resolved due item / late-entry event only after this hook returns.
  // This actual elected term can lapse its predecessor's request without
  // opening a new request or pretending the new desk is already composed.
  const asked = petition.stableKey.split(":").at(-1);
  if (
    enteringExecutiveId &&
    petition.stableKey.includes(":executive:") &&
    asked !== enteringExecutiveId
  )
    return closePetition(
      world,
      petition,
      null,
      "The officeholder who was asked has left office.",
    );
  const route = routeFor(world, sentenced, petitionerId);
  const answered = answersTo(world, petition.id);
  if (typeof route === "string") return world;
  // The executive who received the request has left: the request lapses.
  if (route.office && asked !== route.office.holderPersonId)
    return closePetition(
      world,
      petition,
      null,
      "The officeholder who was asked has left office.",
    );
  let next = world;
  for (const step of route.steps) {
    if (answered.some((answer) => answer.bodyKey === step.key)) continue;
    const label =
      step.key === EXECUTIVE_BODY
        ? route.authority.executiveTitle
        : (step.body?.label ?? step.key);
    if (step.key === EXECUTIVE_BODY) {
      const result = executiveAnswer(
        next,
        route,
        petition,
        `${petition.id}:${step.key}`,
      );
      next = result.world;
      if (result.favorable === null) return next;
      next = recordAnswer(
        next,
        petition,
        step,
        label,
        result.favorable,
        "officeholder",
        "",
        route.office!.holderPersonId,
      );
    } else {
      // Where the law caps the wait for an advising board's report (Kansas:
      // 120 days, K.S.A. 22-3701(d)), the request moves on without it.
      const cap =
        step.role === "advisory"
          ? route.gate.advisory?.reportWithinDays
          : undefined;
      const waitedOut =
        cap !== undefined &&
        addDays(petition.occurredAt, cap) <= next.currentDate;
      if (
        addDays(
          lastMovedAt(next, petition),
          UNSEATED_BODY_READING.answersAfterDays,
        ) > next.currentDate
      ) {
        if (waitedOut) continue;
        return next;
      }
      const reading = unseatedBodyReading(
        next,
        petitionerId,
        sentenced,
        sentence,
      );
      if (!reading) {
        if (waitedOut) continue;
        return next;
      }
      if (step.body?.includesExecutive) {
        // The executive votes in this body at the desk; the other seats are
        // not seated people yet and answer from the case record.
        const result = executiveAnswer(
          next,
          route,
          petition,
          `${petition.id}:${step.key}`,
        );
        next = result.world;
        if (result.favorable === null) return next;
        const seats = Array.isArray(step.body.members)
          ? step.body.members.length
          : // PLACEHOLDER: an appointed board's size is not in the table yet;
            // every board that seats the executive today lists its offices.
            3;
        const yes =
          (result.favorable ? 1 : 0) + (reading.favorable ? seats - 1 : 0);
        const favorable =
          step.body.vote === "majority-including-executive"
            ? result.favorable && yes * 2 > seats
            : yes * 2 > seats;
        next = recordAnswer(
          next,
          petition,
          step,
          label,
          favorable,
          "board-vote",
          `The ${route.authority.executiveTitle.toLowerCase()} voted ${result.favorable ? "for" : "against"} it. ${reading.reason}`,
          route.office!.holderPersonId,
        );
      } else {
        next = recordAnswer(
          next,
          petition,
          step,
          label,
          reading.favorable,
          "case-record",
          reading.reason,
          null,
        );
      }
    }
    const latest = answersTo(next, petition.id).at(-1)!;
    if (step.role === "consent" && !latest.favorable)
      return closePetition(next, petition, latest, null);
  }
  return grant(next, petition, route, sentenced);
}

function closePetition(
  world: World,
  petition: HistoricalEvent,
  answer: ReturnType<typeof answersTo>[number] | null,
  lapsedReason: string | null,
): World {
  const petitionerId = petitionerOf(petition)!;
  const person = world.people[petitionerId];
  const name = person ? personName(person) : "The person asking";
  const summary = answer
    ? `${name}'s request for clemency was turned down by the ${answer.bodyLabel}.`
    : `${name}'s request for clemency lapsed. ${lapsedReason ?? ""}`.trim();
  let next = recordWorldEvent(world, {
    stableKey: `${petition.stableKey}:denied`,
    type: CLEMENCY_DENIED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [petitionerId],
    participants: [
      { personId: petitionerId, role: PETITIONER_ROLE, detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      CLEMENCY_VERSION,
      `${PETITION_TAG}${petition.id}`,
      ...(answer
        ? [`${BODY_TAG}${answer.bodyKey}`]
        : ["justice.clemency-lapsed"]),
    ],
    summary,
    context: {
      location: null,
      socialContext: "Clemency request",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const closed = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${closed.stableKey}:known`,
    personId: petitionerId,
    eventId: closed.id,
    learnedAt: next.currentDate,
    believedSummary: closed.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return next;
}

/**
 * Everyone whose yes was needed said yes: the grant is written against the
 * sentence, which ends today. A grant is public, like the sentence it ends.
 */
function grant(
  world: World,
  petition: HistoricalEvent,
  route: CaseRoute,
  sentenced: HistoricalEvent,
): World {
  const petitionerId = petitionerOf(petition)!;
  const person = world.people[petitionerId]!;
  const kind = (tagValue(petition, CLEMENCY_KIND_TAG) ??
    "pardon") as ClemencyKind;
  const holder = route.office?.holderPersonId ?? null;
  const holderPerson = holder ? world.people[holder] : undefined;
  const grantor =
    route.gate.mustAgree[0] === EXECUTIVE_BODY && holderPerson
      ? `${route.authority.executiveTitle} ${personName(holderPerson)}`
      : `${route.authority.place}'s ${clemencyBody(route.authority, route.gate.mustAgree[0]!)?.label ?? "clemency authority"}`;
  const what =
    kind === "commutation"
      ? `shortened ${personName(person)}'s jail term to the time already served`
      : `pardoned ${personName(person)}`;
  let next = recordWorldEvent(world, {
    stableKey: `${petition.stableKey}:granted`,
    type: CLEMENCY_GRANTED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [
      petitionerId,
      ...(holder && holder !== petitionerId ? [holder] : []),
    ],
    participants: [
      { personId: petitionerId, role: "impact:recipient", detail: kind },
      ...(holder && holder !== petitionerId
        ? [
            {
              personId: holder,
              role: "agency:decider" as const,
              detail: route.authority.executiveTitle,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CLEMENCY_VERSION,
      `${PETITION_TAG}${petition.id}`,
      `${CLEMENCY_SENTENCE_TAG}${sentenced.id}`,
      `${CLEMENCY_KIND_TAG}${kind}`,
      `${PETITION_PLACE_TAG}${route.placeKey}`,
    ],
    summary: `${grantor} ${what}.`,
    context: {
      location: null,
      socialContext: "Clemency",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const granted = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${granted.stableKey}:known`,
    personId: petitionerId,
    eventId: granted.id,
    learnedAt: next.currentDate,
    believedSummary: granted.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return next;
}

/**
 * The weekly step: the game's people under sentence decide whether to ask,
 * and every open request moves as far as its law and today allow; then the
 * jobs of anyone whose jail term began or ended go on leave or come back
 * (`jail-absence.ts`). Runs on the press desk's weekly sweep, beside
 * `advanceProsecutions`.
 */
export function advanceClemency(world: World): World {
  let next = produceRequests(world);
  for (const petition of clemencyPetitions(next)) {
    if (clemencyPetitionStatus(next, petition.id) !== "open") continue;
    next = ensureClemencyPetitionSchedule(
      advancePetition(next, petition),
      petition.id,
    );
  }
  // Last, so a term that began or was cut short this week moves its jobs.
  return settleJailAbsences(next);
}
