import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { addDays, makeIsoDate } from "../dates";
import { evaluateDecision } from "../decisions";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { stableHash } from "../ids";
import {
  createOrganization,
  createOrganizationParticipation,
  recordOrganizationParticipationState,
  recordOrganizationProfile,
} from "../life";
import { organizationParticipationStateAt } from "../life-queries";
import { drawCanonicalNamedIdentity } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LifeRecordProvenance,
  MindStrength,
  OrganizationParticipation,
  World,
} from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { partyRecords } from "../world-setup/integrity";
import { appendPartyRecords, partyRecordId } from "../world-setup/party-store";
import type {
  PartyActorAuthority,
  PartyBodyDecisionRecord,
  PartyEvolutionChange,
  PartyEvolutionRecord,
  PartyInitiativeKind,
  PartyInitiativeRecord,
  PartyInitiativeResponseKind,
  PartyInitiativeResponseRecord,
  PartyPlatformPosition,
  PartyPlatformRecord,
  PartyUnitLevel,
} from "../world-setup/types";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { publicPartyAffiliation } from "./congress";
import type { LivingWorldReadOptions } from "./congress";
import { PARTY_AFFILIATION_KIND } from "./opening";
import { CHAPTER_ORGANIZER_KIND, homePartyChapters } from "./party-chapters";
import {
  partyUnit,
  partyUnitStatusAt,
  partyUnits,
  type PartyUnitView,
} from "./party-registry";

/**
 * Political organizations change through dated decisions by actual people:
 * a founding needs a founder, a consenting co-organizer and a public
 * organizing decision; a split needs a disputed decision and named members
 * who elect to leave; a merger needs every side's authorized leader; a
 * dissolution needs its decision or inactivity finding and handles what the
 * unit held. This is a fictional organizational model, not a legal ballot
 * access standard. No quota, no forced split, no two-party rebalancing.
 */
export const PARTY_EVOLUTION_VERSION = "party-evolution-v1";
const V = PARTY_EVOLUTION_VERSION;

export const PARTY_BODY_REVIEW_TRANSITION_KEY = "party-life:body-review";
export const PARTY_OFFICER_KIND = "leadership:party-officer" as const;
export const PARTY_COMMITTEE_KIND = "membership:party-committee" as const;
export const PARTY_BODY_DECISION_EVENT = "party.body-decision";
export const PARTY_ORGANIZING_DECISION_EVENT = "party.organizing-decision";
export const PARTY_EVOLUTION_EVENT = "party.organization-changed";

/**
 * Authored organizational questions a governing body actually decides. They
 * are strategy and procedure, never a real party's ideology.
 */
export const PARTY_QUESTIONS = [
  {
    key: "strategy:cross-party-cooperation",
    label: "Working with other parties",
    options: [
      { key: "cooperate", label: "Cooperate on shared measures" },
      { key: "keep-distance", label: "Keep a clear distance" },
    ],
  },
  {
    key: "procedure:candidate-selection",
    label: "Choosing candidates",
    options: [
      { key: "open-contests", label: "Open contests" },
      { key: "committee-slate", label: "Committee slate" },
    ],
  },
  {
    key: "platform:first-priority",
    label: "First priority",
    options: [
      { key: "institutional-reform", label: "Institutional reform first" },
      { key: "household-costs", label: "Household costs first" },
      { key: "local-services", label: "Local services first" },
    ],
  },
  {
    key: "procedure:local-autonomy",
    label: "Local positions",
    options: [
      { key: "chapters-decide", label: "Chapters set their own line" },
      { key: "follow-party-line", label: "Follow the wider party line" },
    ],
  },
] as const;

export type PartyQuestionKey = (typeof PARTY_QUESTIONS)[number]["key"];

/** Authored cadence for these fictional bodies; not a claim about any party. */
export const PARTY_BODY_CADENCE = {
  reviewEveryMonths: 3,
  standingCommitteeSize: 4,
  /** A national committee materialized when a national action needs one. */
  nationalCommitteeSize: 5,
  /** A unit with no active participant this long is found inactive. */
  inactivityDays: 180,
  /** A dispute must recur at least this often before anyone considers leaving. */
  repeatedDisputes: 2,
} as const;

const STRENGTHS: readonly MindStrength[] = [
  "subtle",
  "moderate",
  "strong",
  "defining",
];

export interface PartyActorStance {
  readonly questionKey: string;
  readonly optionKey: string;
  readonly strength: MindStrength;
}

function question(key: string) {
  const found = PARTY_QUESTIONS.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Unknown party question: ${key}`);
  return found;
}

/**
 * A person's persistent stance on one question: the same person gives the
 * same answer every time, from their own seeded stream. Never shown to the
 * player as a number, and never assigned to the controlled person.
 */
export function partyActorStance(
  world: World,
  personId: EntityId,
  questionKey: string,
): PartyActorStance {
  const rng = new SeededRng(world.seed).fork(
    `${V}:stance:${personId}:${questionKey}`,
  );
  const options = question(questionKey).options.map((option) => option.key);
  return {
    questionKey,
    optionKey: rng.fork("option").pick(options),
    strength: rng.fork("strength").pick(STRENGTHS),
  };
}

const STRENGTH_RANK: Readonly<Record<MindStrength, number>> = {
  subtle: 0,
  moderate: 1,
  strong: 2,
  defining: 3,
};

function controlled(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function living(world: World, personId: EntityId, date: IsoDate): boolean {
  return (
    !!world.people[personId] &&
    !world.history.personDeaths.some(
      (death) => death.personId === personId && death.diedAt <= date,
    )
  );
}

function activeParticipations(
  world: World,
  organizationId: EntityId,
  kinds: readonly string[],
): readonly OrganizationParticipation[] {
  return world.history.organizationParticipations.filter(
    (participation) =>
      participation.organizationId === organizationId &&
      kinds.includes(participation.kind) &&
      participation.startedAt <= world.currentDate &&
      organizationParticipationStateAt(world, participation.id)?.status ===
        "active",
  );
}

const LEADER_KINDS = [PARTY_OFFICER_KIND, CHAPTER_ORGANIZER_KIND];
const BODY_KINDS = [...LEADER_KINDS, PARTY_COMMITTEE_KIND];

/** The unit's governing body today: its officers and standing committee. */
export function partyBodyMembers(
  world: World,
  organizationId: EntityId,
): readonly EntityId[] {
  return [
    ...new Set(
      activeParticipations(world, organizationId, BODY_KINDS)
        .map((participation) => participation.personId)
        .filter((personId) => living(world, personId, world.currentDate)),
    ),
  ].sort();
}

/** People authorized to act for the unit: its officers or organizers. */
export function partyUnitLeaders(
  world: World,
  organizationId: EntityId,
): readonly EntityId[] {
  return [
    ...new Set(
      activeParticipations(world, organizationId, LEADER_KINDS)
        .map((participation) => participation.personId)
        .filter((personId) => living(world, personId, world.currentDate)),
    ),
  ].sort();
}

/**
 * A national party's committee, materialized only when an action needs it.
 *
 * The setting parties start with no national officers: nobody has been asked
 * to act for them. When a national action actually requires an authorized
 * leader, this materializes a small committee through the common person
 * generator, with the same historical constraints as any other generated
 * person, and gives each member a public affiliation. It is idempotent, and
 * it never runs on a read.
 */
export function ensurePartyLeadership(
  world: World,
  organizationId: EntityId,
): World {
  const unit = requireActiveUnit(world, organizationId);
  if (partyUnitLeaders(world, organizationId).length > 0) return world;
  const date = world.currentDate;
  const rng = new SeededRng(world.seed).fork(
    `${V}:committee:${organizationId}`,
  );
  const memberKey = (index: number) =>
    `${V}:committee:${organizationId}:${index}`;
  const size = PARTY_BODY_CADENCE.nationalCommitteeSize;
  let next = createCharacterHistoryContextPeople(
    world,
    Array.from({ length: size }, (_, index) => {
      const personRng = rng.fork(memberKey(index));
      return {
        stableKey: memberKey(index),
        ...drawCanonicalNamedIdentity(
          personRng.fork("name"),
          generatePersonIdentity(personRng.fork("identity")),
        ),
        // Adults only: an officer must have been able to hold the role.
        birthDate: makeIsoDate(
          `${Number(date.slice(0, 4)) - personRng.integer(30, 76)}-${String(personRng.integer(1, 13)).padStart(2, "0")}-${String(personRng.integer(1, 29)).padStart(2, "0")}`,
        ),
        homeJurisdictionId: unit.jurisdictionId ?? world.jurisdictionOrder[0]!,
      };
    }),
  );
  const provenance = { kind: "generated" as const, generatorKey: V };
  const transitions = Array.from({ length: size }, (_, index) => {
    const personId = characterHistoryContextPersonId(next, memberKey(index));
    return [
      {
        kind: "participation" as const,
        input: {
          stableKey: `${memberKey(index)}:officer`,
          personId,
          organizationId,
          startedAt: date,
          initialStatus: "active" as const,
          kind: PARTY_OFFICER_KIND,
          roleKind: "leader:officer" as const,
          context: "Acts for the national organization.",
          provenance,
        },
      },
      {
        kind: "participation" as const,
        input: {
          stableKey: `${memberKey(index)}:affiliation`,
          personId,
          organizationId,
          startedAt: date,
          initialStatus: "active" as const,
          kind: PARTY_AFFILIATION_KIND,
          roleKind: "member:public-affiliation" as const,
          context: "Public party affiliation",
          provenance,
        },
      },
    ];
  }).flat();
  next = applyCharacterHistoryPlan(next, {
    stableKey: `${V}:committee:${organizationId}:plan`,
    mode: "quick-generated",
    personId: characterHistoryContextPersonId(next, memberKey(0)),
    transitions,
  }).world;
  return recordWorldEvent(next, {
    stableKey: `${V}:committee:${organizationId}`,
    type: "party.committee-formed",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: unit.jurisdictionId,
    involvedEntityIds: [organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V, `party:${unit.partyKey}`],
    summary: `${unit.name} named a national committee.`,
    context: EVENT_CONTEXT,
  });
}

export interface PartyOfficerView {
  readonly personId: EntityId;
  readonly role: string;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
}

/** Officers and organizers of a unit on a date, from their participations. */
export function partyUnitOfficersAt(
  world: World,
  organizationId: EntityId,
  date: IsoDate = world.currentDate,
): readonly PartyOfficerView[] {
  return world.history.organizationParticipations
    .filter(
      (participation) =>
        participation.organizationId === organizationId &&
        LEADER_KINDS.includes(
          participation.kind as (typeof LEADER_KINDS)[number],
        ) &&
        participation.startedAt <= date,
    )
    .flatMap((participation) => {
      const state = organizationParticipationStateAt(world, participation.id, {
        asOfDate: date,
        historySequenceExclusive: world.history.nextSequence,
      });
      if (state?.status !== "active") return [];
      const ended = world.history.organizationParticipationStates.find(
        (record) =>
          record.participationId === participation.id &&
          record.status === "ended" &&
          record.effectiveAt > date,
      );
      return [
        {
          personId: participation.personId,
          role: state.roleKind ?? participation.kind,
          effectiveFrom: participation.startedAt,
          effectiveTo: ended?.effectiveAt ?? null,
        },
      ];
    });
}

export interface AffiliationAtView {
  readonly partyOrganizationId: EntityId | null;
  readonly source: "participation" | "seat-roll" | "none";
}

/**
 * A person's public party affiliation on a date. Separate from membership in
 * a unit's body and from ballot or committee status, which are never implied.
 */
export function affiliationAt(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): AffiliationAtView {
  const options: LivingWorldReadOptions = { asOf: date };
  const partyOrganizationId = publicPartyAffiliation(world, personId, options);
  const hasParticipation = world.history.organizationParticipations.some(
    (participation) =>
      participation.personId === personId &&
      participation.kind === PARTY_AFFILIATION_KIND &&
      participation.startedAt <= date,
  );
  return {
    partyOrganizationId,
    source:
      partyOrganizationId === null
        ? "none"
        : hasParticipation
          ? "participation"
          : "seat-roll",
  };
}

/** No registered committee or ballot access is represented; a label grants neither. */
export function partyBallotStatusAt(): "not-represented" {
  return "not-represented";
}

export function partyPlatformAt(
  world: World,
  organizationId: EntityId,
  date: IsoDate = world.currentDate,
): PartyPlatformRecord | null {
  let latest: PartyPlatformRecord | null = null;
  for (const record of partyRecords(world)) {
    if (
      record.kind === "party-platform" &&
      record.organizationId === organizationId &&
      record.effectiveDate <= date
    )
      latest = record;
  }
  return latest;
}

export function partyBodyDecisions(
  world: World,
  organizationId?: EntityId,
): readonly PartyBodyDecisionRecord[] {
  return partyRecords(world).filter(
    (record): record is PartyBodyDecisionRecord =>
      record.kind === "party-body-decision" &&
      (organizationId === undefined ||
        record.organizationId === organizationId),
  );
}

export function partyEvolutionRecords(
  world: World,
): readonly PartyEvolutionRecord[] {
  return partyRecords(world).filter(
    (record): record is PartyEvolutionRecord =>
      record.kind === "party-evolution",
  );
}

function requireActiveUnit(
  world: World,
  organizationId: EntityId,
): PartyUnitView {
  const unit = partyUnit(world, organizationId);
  if (!unit) throw new Error(`Not a party unit: ${organizationId}`);
  if (partyUnitStatusAt(world, organizationId).kind !== "active") {
    throw new Error(`The party unit is no longer active: ${organizationId}`);
  }
  return unit;
}

const EVENT_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

// ---------------------------------------------------------------------------
// Body decisions
// ---------------------------------------------------------------------------

export interface RecordPartyBodyDecisionInput {
  readonly organizationId: EntityId;
  readonly questionKey: string;
  /** The controlled person's own choice, if they sit on the body. */
  readonly controlledChoice?: string;
  readonly stableKey?: string;
}

/**
 * The body decides one question. Each member present takes their own stance;
 * the controlled person counts only through an explicit choice. The plurality
 * is adopted; a tie keeps the unit's current line, else the catalog order.
 * A member whose stance lost and who holds it strongly is a recorded dissent.
 */
export function recordPartyBodyDecision(
  world: World,
  input: RecordPartyBodyDecisionInput,
): World {
  const unit = requireActiveUnit(world, input.organizationId);
  const catalog = question(input.questionKey);
  const members = partyBodyMembers(world, unit.organizationId);
  const votes = new Map<EntityId, PartyActorStance>();
  for (const personId of members) {
    if (controlled(world, personId)) {
      if (input.controlledChoice === undefined) continue;
      if (
        !catalog.options.some((option) => option.key === input.controlledChoice)
      ) {
        throw new Error(`Unknown option: ${input.controlledChoice}`);
      }
      votes.set(personId, {
        questionKey: catalog.key,
        optionKey: input.controlledChoice,
        strength: "defining",
      });
    } else {
      votes.set(personId, partyActorStance(world, personId, catalog.key));
    }
  }
  if (votes.size === 0) {
    throw new Error("A body decision needs at least one participating member.");
  }
  const tally = new Map<string, number>();
  for (const stance of votes.values()) {
    tally.set(stance.optionKey, (tally.get(stance.optionKey) ?? 0) + 1);
  }
  const top = Math.max(...tally.values());
  const tied = catalog.options
    .map((option): string => option.key)
    .filter((key) => tally.get(key) === top);
  const current = partyPlatformAt(world, unit.organizationId)?.positions.find(
    (position) => position.questionKey === catalog.key,
  )?.optionKey;
  const adopted = current && tied.includes(current) ? current : tied[0]!;
  const participants = [...votes.keys()].sort();
  const dissenters = participants.filter((personId) => {
    const stance = votes.get(personId)!;
    return (
      stance.optionKey !== adopted &&
      (controlled(world, personId) || STRENGTH_RANK[stance.strength] >= 2)
    );
  });
  const count = partyBodyDecisions(world, unit.organizationId).length;
  const stableKey =
    input.stableKey ?? `${V}:decision:${unit.organizationId}:${count + 1}`;
  const adoptedLabel = catalog.options.find((o) => o.key === adopted)!.label;
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type: PARTY_BODY_DECISION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: unit.jurisdictionId,
    involvedEntityIds: [unit.organizationId, ...participants],
    participants: participants.map((personId) => ({
      personId,
      role: "agency:actor" as const,
      detail: dissenters.includes(personId) ? "Dissented" : "Took part",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [V, `question:${catalog.key}`, `adopted:${adopted}`],
    summary: `${unit.name} decided: ${catalog.label} — ${adoptedLabel}.`,
    context: EVENT_CONTEXT,
  });
  const eventId = next.history.events.at(-1)!.id;
  const decisionId = partyRecordId(next, stableKey);
  const previous = partyPlatformAt(next, unit.organizationId);
  const positions: PartyPlatformPosition[] = [
    ...(previous?.positions ?? []).filter(
      (position) => position.questionKey !== catalog.key,
    ),
    { questionKey: catalog.key, optionKey: adopted },
  ].sort((a, b) => a.questionKey.localeCompare(b.questionKey));
  next = appendPartyRecords(next, [
    {
      kind: "party-body-decision",
      stableKey,
      organizationId: unit.organizationId,
      questionKey: catalog.key,
      adoptedOptionKey: adopted,
      decidedAt: makeIsoDate(world.currentDate),
      participantPersonIds: participants,
      dissentingPersonIds: dissenters,
      publicEventId: eventId,
    },
    {
      kind: "party-platform",
      stableKey: `${stableKey}:platform`,
      organizationId: unit.organizationId,
      effectiveDate: makeIsoDate(world.currentDate),
      positions,
      decisionId,
      supersedesPlatformId: previous?.id ?? null,
    },
  ]);
  return next;
}

// ---------------------------------------------------------------------------
// Initiatives
// ---------------------------------------------------------------------------

export interface InitiativeAssessment {
  readonly kind: "none" | "founding" | "split";
  readonly questionKey: string | null;
  readonly disputedDecisionIds: readonly EntityId[];
  readonly allies: readonly EntityId[];
  readonly reasonKeys: readonly string[];
}

const NONE: InitiativeAssessment = {
  kind: "none",
  questionKey: null,
  disputedDecisionIds: [],
  allies: [],
  reasonKeys: [],
};

function openInitiativeFor(world: World, personId: EntityId): boolean {
  const records = partyRecords(world);
  return records.some(
    (record) =>
      record.kind === "party-initiative" &&
      record.proposerPersonId === personId &&
      !records.some(
        (other) =>
          other.kind === "party-evolution" && other.initiativeId === record.id,
      ) &&
      !records.some(
        (other) =>
          other.kind === "party-initiative-response" &&
          other.initiativeId === record.id &&
          other.personId === personId &&
          other.response === "reject",
      ),
  );
}

/**
 * An actor's own consideration of leaving to organize. Only their recorded,
 * repeated disagreement with this body's actual decisions counts, together
 * with whether anyone else on it shares that view. Staying is always there.
 */
export function assessPartyInitiative(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  decisionStableKey: string,
): InitiativeAssessment {
  if (controlled(world, personId)) return NONE;
  if (!living(world, personId, world.currentDate)) return NONE;
  if (openInitiativeFor(world, personId)) return NONE;
  const decisions = partyBodyDecisions(world, organizationId);
  const disputes = new Map<string, PartyBodyDecisionRecord[]>();
  for (const decision of decisions) {
    if (!decision.dissentingPersonIds.includes(personId)) continue;
    disputes.set(decision.questionKey, [
      ...(disputes.get(decision.questionKey) ?? []),
      decision,
    ]);
  }
  const ranked = [...disputes.entries()]
    .filter(([, list]) => list.length >= PARTY_BODY_CADENCE.repeatedDisputes)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (ranked.length === 0) return NONE;
  const [questionKey, disputed] = ranked[0]!;
  const stance = partyActorStance(world, personId, questionKey);
  if (stance.strength !== "defining") return NONE;
  const members = partyBodyMembers(world, organizationId);
  const allies = members.filter(
    (other) =>
      other !== personId &&
      !controlled(world, other) &&
      partyActorStance(world, other, questionKey).optionKey ===
        stance.optionKey &&
      disputed.some((decision) => decision.dissentingPersonIds.includes(other)),
  );
  if (allies.length === 0) return NONE;
  const refs = disputed.map((decision) => ({
    kind: "historical-event" as const,
    eventId: decision.publicEventId!,
  }));
  const considerations: DecisionConsideration[] = [
    {
      stableKey: "ties",
      optionKey: "stay",
      sourceType: "context:organizational-ties",
      direction: "supports",
      importance: "strong",
      confidence: "medium",
      explanation: "They have worked inside this organization.",
      sourceRefs: [],
    },
    {
      stableKey: "starting-over",
      optionKey: "stay",
      sourceType: "context:opinion-readiness",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation: "Building a new organization is slow and uncertain.",
      sourceRefs: [],
    },
  ];
  const leave = allies.length >= 2 ? "split" : "found";
  considerations.push(
    {
      stableKey: "repeated-dispute",
      optionKey: leave,
      sourceType: "institution:party-body-decision",
      direction: "supports",
      importance: "strong",
      confidence: disputed.length >= 3 ? "high" : "medium",
      explanation:
        "The body keeps deciding against what they hold most firmly.",
      sourceRefs: refs,
    },
    {
      stableKey: "allies",
      optionKey: leave,
      sourceType: "context:shared-view",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation: "Others on the body share the same view.",
      sourceRefs: [],
    },
  );
  const evaluation = evaluateDecision(world, {
    stableKey: `${decisionStableKey}:initiative:${personId}`,
    decisionType: "party.consider-leaving",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "party-organization",
      entityId: null,
    },
    options: [
      { key: "stay", label: "Stay", description: "Keep working inside." },
      {
        key: leave,
        label: leave === "split" ? "Lead a faction out" : "Organize anew",
        description:
          leave === "split"
            ? "Leave with others who share the view."
            : "Start a new organization with a co-organizer.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  if (evaluation.selectedOptionKey === "stay") return NONE;
  return {
    kind: leave === "split" ? "split" : "founding",
    questionKey,
    disputedDecisionIds: disputed.map((decision) => decision.id),
    allies,
    reasonKeys: [
      `repeated-dispute:${questionKey}:${disputed.length}`,
      `allies:${allies.length}`,
    ],
  };
}

export interface ProposePartyInitiativeInput {
  readonly initiativeKind: PartyInitiativeKind;
  readonly proposerPersonId: EntityId;
  readonly subjectOrganizationIds: readonly EntityId[];
  readonly questionKey?: string | null;
  readonly disputedDecisionIds?: readonly EntityId[];
  readonly proposedName?: string | null;
  readonly proposedPositions?: readonly PartyPlatformPosition[];
  readonly level?: PartyUnitLevel;
  readonly jurisdictionId?: EntityId | null;
  readonly reasonKeys?: readonly string[];
  readonly stableKey?: string;
}

export function proposePartyInitiative(
  world: World,
  input: ProposePartyInitiativeInput,
): { readonly world: World; readonly initiativeId: EntityId } {
  if (!living(world, input.proposerPersonId, world.currentDate)) {
    throw new Error("An initiative needs a living proposer.");
  }
  for (const id of input.subjectOrganizationIds) requireActiveUnit(world, id);
  const kind = input.initiativeKind;
  if (kind === "merger" && input.subjectOrganizationIds.length < 2) {
    throw new Error("A merger names at least two units.");
  }
  // These actions need somebody authorized to answer for the unit. A national
  // party that has never had officers gets its committee now, not a refusal.
  let world_ = world;
  if (
    kind === "merger" ||
    kind === "rename" ||
    kind === "platform-change" ||
    kind === "dissolution"
  ) {
    for (const organizationId of input.subjectOrganizationIds) {
      world_ = ensurePartyLeadership(world_, organizationId);
    }
  }
  if (
    (kind === "founding" || kind === "rename") &&
    !input.proposedName?.trim()
  ) {
    throw new Error("A founding or rename needs a name.");
  }
  if (kind === "split") {
    // An actual dispute: decisions of this unit that the proposer lost.
    const source = input.subjectOrganizationIds[0];
    const disputed = (input.disputedDecisionIds ?? []).map((id) =>
      partyBodyDecisions(world, source).find((decision) => decision.id === id),
    );
    if (
      disputed.length === 0 ||
      disputed.some(
        (decision) =>
          !decision ||
          !decision.dissentingPersonIds.includes(input.proposerPersonId),
      )
    ) {
      throw new Error(
        "A split needs this unit's decisions that the proposer actually disputed.",
      );
    }
  }
  const count = partyRecords(world_).filter(
    (record) => record.kind === "party-initiative",
  ).length;
  const stableKey =
    input.stableKey ??
    `${V}:initiative:${kind}:${input.proposerPersonId}:${count + 1}`;
  const next = appendPartyRecords(world_, [
    {
      kind: "party-initiative",
      stableKey,
      initiativeKind: kind,
      proposerPersonId: input.proposerPersonId,
      subjectOrganizationIds: [...input.subjectOrganizationIds],
      questionKey: input.questionKey ?? null,
      disputedDecisionIds: [...(input.disputedDecisionIds ?? [])],
      proposedName: input.proposedName?.trim() ?? null,
      proposedPositions: [...(input.proposedPositions ?? [])],
      level: input.level ?? "national",
      jurisdictionId: input.jurisdictionId ?? null,
      reasonKeys: [
        ...(input.reasonKeys ??
          (controlled(world, input.proposerPersonId)
            ? ["controlled-person-choice"]
            : [])),
      ],
    },
  ]);
  return { world: next, initiativeId: partyRecordId(world_, stableKey) };
}

function requireInitiative(world: World, id: EntityId): PartyInitiativeRecord {
  const record = partyRecords(world).find((candidate) => candidate.id === id);
  if (!record || record.kind !== "party-initiative") {
    throw new Error(`Unknown party initiative: ${id}`);
  }
  return record;
}

function responsesTo(
  world: World,
  initiativeId: EntityId,
): readonly PartyInitiativeResponseRecord[] {
  return partyRecords(world).filter(
    (record): record is PartyInitiativeResponseRecord =>
      record.kind === "party-initiative-response" &&
      record.initiativeId === initiativeId,
  );
}

export interface RespondToPartyInitiativeInput {
  readonly initiativeId: EntityId;
  readonly personId: EntityId;
  readonly response: PartyInitiativeResponseKind;
  readonly authority: PartyActorAuthority;
  readonly actingForOrganizationId?: EntityId | null;
}

/** A person's own answer. Leaders may answer only for units they lead. */
export function respondToPartyInitiative(
  world: World,
  input: RespondToPartyInitiativeInput,
): World {
  const initiative = requireInitiative(world, input.initiativeId);
  if (!living(world, input.personId, world.currentDate)) {
    throw new Error("A response needs a living person.");
  }
  const actingFor = input.actingForOrganizationId ?? null;
  if (input.authority === "authorized-leader") {
    if (
      actingFor === null ||
      !initiative.subjectOrganizationIds.includes(actingFor) ||
      !partyUnitLeaders(world, actingFor).includes(input.personId)
    ) {
      throw new Error(
        "Only an actual leader of a named unit can answer for it.",
      );
    }
  }
  if (
    responsesTo(world, initiative.id).some(
      (record) =>
        record.personId === input.personId &&
        record.actingForOrganizationId === actingFor,
    )
  ) {
    throw new Error("That person has already answered this initiative.");
  }
  return appendPartyRecords(world, [
    {
      kind: "party-initiative-response",
      stableKey: `${initiative.stableKey}:response:${input.personId}:${actingFor ?? "self"}`,
      initiativeId: initiative.id,
      personId: input.personId,
      actingForOrganizationId: actingFor,
      authority: input.authority,
      response: input.response,
      respondedAt: makeIsoDate(world.currentDate),
      decisionTraceId: null,
    },
  ]);
}

/** A non-controlled person answers from their own stance on the disputed question. */
export function npcInitiativeResponse(
  world: World,
  initiativeId: EntityId,
  personId: EntityId,
): PartyInitiativeResponseKind {
  if (controlled(world, personId)) {
    throw new Error("The controlled person answers for themself.");
  }
  const initiative = requireInitiative(world, initiativeId);
  if (!initiative.questionKey) return "decline";
  const theirs = partyActorStance(world, personId, initiative.questionKey);
  const proposers = partyActorStance(
    world,
    initiative.proposerPersonId,
    initiative.questionKey,
  );
  const agrees =
    theirs.optionKey === proposers.optionKey &&
    STRENGTH_RANK[theirs.strength] >= 2;
  if (initiative.initiativeKind === "split")
    return agrees ? "elect-to-leave" : "remain";
  return agrees ? "consent" : "decline";
}

// ---------------------------------------------------------------------------
// Adoption: the dated change itself
// ---------------------------------------------------------------------------

function provenanceFor(eventId: EntityId): LifeRecordProvenance {
  return { kind: "simulated-event", eventId };
}

function endParticipation(
  world: World,
  participation: OrganizationParticipation,
  stableKey: string,
  eventId: EntityId,
  context: string,
): World {
  const state = organizationParticipationStateAt(world, participation.id);
  if (!state || state.status === "ended") return world;
  return recordOrganizationParticipationState(world, {
    stableKey,
    participationId: participation.id,
    effectiveAt: world.currentDate,
    status: "ended",
    roleKind: state.roleKind,
    context,
    provenance: provenanceFor(eventId),
    supersedesStateId: state.id,
  });
}

function currentAffiliationRecords(
  world: World,
  personId: EntityId,
): readonly OrganizationParticipation[] {
  return world.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      participation.kind === PARTY_AFFILIATION_KIND &&
      organizationParticipationStateAt(world, participation.id)?.status ===
        "active",
  );
}

/**
 * Moves a person's public affiliation to a unit from today. Their seat, term,
 * caucus and every earlier roll, vote and result stay exactly as recorded.
 */
function moveAffiliation(
  world: World,
  personId: EntityId,
  toOrganizationId: EntityId,
  stableKey: string,
  eventId: EntityId,
): World {
  let next = world;
  for (const record of currentAffiliationRecords(next, personId)) {
    if (record.organizationId === toOrganizationId) return next;
    next = endParticipation(
      next,
      record,
      `${stableKey}:ended:${record.id}`,
      eventId,
      "Affiliation changed by a recorded organizational decision.",
    );
  }
  // A member who only ever had a seat-roll label gets an explicit close of
  // that label by the new record, which wins from its start date.
  return createOrganizationParticipation(next, {
    stableKey: `${stableKey}:affiliation`,
    personId,
    organizationId: toOrganizationId,
    startedAt: next.currentDate,
    kind: PARTY_AFFILIATION_KIND,
    roleKind: "member:public-affiliation",
    context: "Public party affiliation",
    provenance: provenanceFor(eventId),
  });
}

function addRole(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  kind: typeof PARTY_OFFICER_KIND | typeof PARTY_COMMITTEE_KIND,
  stableKey: string,
  eventId: EntityId,
): World {
  return createOrganizationParticipation(world, {
    stableKey,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind,
    roleKind:
      kind === PARTY_OFFICER_KIND ? "leader:officer" : "member:committee",
    context:
      kind === PARTY_OFFICER_KIND
        ? "Acts for the organization."
        : "Sits on the organization's governing body.",
    provenance: provenanceFor(eventId),
  });
}

function leaveBody(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  stableKey: string,
  eventId: EntityId,
): World {
  let next = world;
  for (const participation of activeParticipations(
    next,
    organizationId,
    BODY_KINDS,
  )) {
    if (participation.personId !== personId) continue;
    next = endParticipation(
      next,
      participation,
      `${stableKey}:left:${participation.id}`,
      eventId,
      "Left the governing body by a recorded decision.",
    );
  }
  return next;
}

function publicEvent(
  world: World,
  stableKey: string,
  type: string,
  organizationIds: readonly EntityId[],
  personIds: readonly EntityId[],
  summary: string,
  tags: readonly string[],
  jurisdictionId: EntityId | null,
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey,
    type: type as `${string}.${string}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [...new Set([...organizationIds, ...personIds])],
    participants: [...new Set(personIds)].map((personId) => ({
      personId,
      role: "agency:actor" as const,
      detail: "Took part in the decision",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [V, ...tags],
    summary,
    context: EVENT_CONTEXT,
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

function newPartyUnit(
  world: World,
  initiative: PartyInitiativeRecord,
  origin: "founded" | "split" | "merger",
  name: string,
  eventId: EntityId,
): { world: World; organizationId: EntityId } {
  const stableKey = `${initiative.stableKey}:organization`;
  let next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: provenanceFor(eventId),
    initialProfile: {
      name,
      classification: "membership:political-party",
      locationJurisdictionId: initiative.jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = appendPartyRecords(
    next,
    [
      {
        kind: "party-unit",
        stableKey: `${initiative.stableKey}:unit`,
        organizationId,
        partyKey: `organized:${stableHash(`${world.id}:${stableKey}`)}`,
        level: initiative.level,
        parentOrganizationId: null,
        jurisdictionId: initiative.jurisdictionId,
        establishedAt: makeIsoDate(world.currentDate),
        origin,
      },
    ],
    { validate: false },
  );
  return { world: next, organizationId };
}

function evolutionRecord(
  world: World,
  initiative: PartyInitiativeRecord,
  change: PartyEvolutionChange,
  fields: Omit<
    PartyEvolutionRecord,
    | "id"
    | "sequence"
    | "recordedAt"
    | "kind"
    | "stableKey"
    | "initiativeId"
    | "change"
    | "effectiveDate"
  >,
): World {
  return appendPartyRecords(world, [
    {
      kind: "party-evolution",
      stableKey: `${initiative.stableKey}:evolution`,
      change,
      initiativeId: initiative.id,
      effectiveDate: makeIsoDate(world.currentDate),
      ...fields,
    },
  ]);
}

export type AdoptionResult =
  | {
      readonly kind: "adopted";
      readonly world: World;
      readonly organizationIds: readonly EntityId[];
    }
  | {
      readonly kind: "not-met";
      readonly world: World;
      readonly reason: string;
    };

/**
 * Applies an initiative whose requirements are actually met. Otherwise the
 * World is returned unchanged with the unmet requirement named.
 */
export function adoptPartyInitiative(
  world: World,
  initiativeId: EntityId,
): AdoptionResult {
  const initiative = requireInitiative(world, initiativeId);
  if (
    partyEvolutionRecords(world).some(
      (record) => record.initiativeId === initiative.id,
    )
  ) {
    return { kind: "not-met", world, reason: "already-adopted" };
  }
  const responses = responsesTo(world, initiative.id);
  const says = (kind: PartyInitiativeResponseKind) =>
    responses
      .filter((record) => record.response === kind)
      .map((record) => record.personId)
      .filter((personId) => living(world, personId, world.currentDate));
  const key = initiative.stableKey;
  switch (initiative.initiativeKind) {
    case "founding": {
      const coOrganizers = says("consent").filter(
        (id) => id !== initiative.proposerPersonId,
      );
      if (coOrganizers.length === 0) {
        return { kind: "not-met", world, reason: "no-consenting-co-organizer" };
      }
      const founders = [initiative.proposerPersonId, ...coOrganizers];
      const name = initiative.proposedName!;
      const published = publicEvent(
        world,
        `${key}:organizing-decision`,
        PARTY_ORGANIZING_DECISION_EVENT,
        [],
        founders,
        `${founders.length} organizers publicly decided to form ${name}.`,
        ["change:founded"],
        initiative.jurisdictionId,
      );
      const eventId = published.eventId;
      let next = published.world;
      const created = newPartyUnit(next, initiative, "founded", name, eventId);
      next = created.world;
      for (const [index, personId] of founders.entries()) {
        next = moveAffiliation(
          next,
          personId,
          created.organizationId,
          `${key}:founder:${index}`,
          eventId,
        );
        next = addRole(
          next,
          personId,
          created.organizationId,
          PARTY_OFFICER_KIND,
          `${key}:founder:${index}:officer`,
          eventId,
        );
        for (const unitId of initiative.subjectOrganizationIds) {
          next = leaveBody(
            next,
            personId,
            unitId,
            `${key}:founder:${index}`,
            eventId,
          );
        }
      }
      next = seedPlatform(next, initiative, created.organizationId);
      next = evolutionRecord(next, initiative, "founded", {
        fromOrganizationIds: [],
        toOrganizationIds: [created.organizationId],
        movedPersonIds: founders,
        name,
        obligations: null,
        publicEventId: eventId,
      });
      next = scheduleBodyReview(next, created.organizationId, founders[0]!);
      return {
        kind: "adopted",
        world: next,
        organizationIds: [created.organizationId],
      };
    }
    case "split": {
      const source = initiative.subjectOrganizationIds[0]!;
      if (initiative.disputedDecisionIds.length === 0) {
        return { kind: "not-met", world, reason: "no-disputed-decision" };
      }
      const leavers = [
        initiative.proposerPersonId,
        ...says("elect-to-leave").filter(
          (id) => id !== initiative.proposerPersonId,
        ),
      ];
      if (leavers.length < 2) {
        return { kind: "not-met", world, reason: "no-faction" };
      }
      const sourceUnit = requireActiveUnit(world, source);
      const name = initiative.proposedName ?? `${sourceUnit.name} (reform)`;
      const published = publicEvent(
        world,
        `${key}:split-decision`,
        PARTY_EVOLUTION_EVENT,
        [source],
        leavers,
        `${leavers.length} members left ${sourceUnit.name} to form ${name}.`,
        ["change:split-off"],
        sourceUnit.jurisdictionId,
      );
      const eventId = published.eventId;
      let next = published.world;
      const created = newPartyUnit(next, initiative, "split", name, eventId);
      next = created.world;
      for (const [index, personId] of leavers.entries()) {
        next = leaveBody(
          next,
          personId,
          source,
          `${key}:leaver:${index}`,
          eventId,
        );
        next = moveAffiliation(
          next,
          personId,
          created.organizationId,
          `${key}:leaver:${index}`,
          eventId,
        );
        next = addRole(
          next,
          personId,
          created.organizationId,
          index === 0 ? PARTY_OFFICER_KIND : PARTY_COMMITTEE_KIND,
          `${key}:leaver:${index}:role`,
          eventId,
        );
      }
      next = seedPlatform(next, initiative, created.organizationId);
      next = evolutionRecord(next, initiative, "split-off", {
        fromOrganizationIds: [source],
        toOrganizationIds: [created.organizationId],
        movedPersonIds: leavers,
        name,
        obligations: null,
        publicEventId: eventId,
      });
      next = scheduleBodyReview(next, created.organizationId, leavers[0]!);
      return {
        kind: "adopted",
        world: next,
        organizationIds: [created.organizationId],
      };
    }
    case "merger": {
      const units = initiative.subjectOrganizationIds.map((id) =>
        requireActiveUnit(world, id),
      );
      for (const unit of units) {
        const accepted = responses.some(
          (record) =>
            record.actingForOrganizationId === unit.organizationId &&
            record.authority === "authorized-leader" &&
            record.response === "accept",
        );
        if (!accepted) {
          return {
            kind: "not-met",
            world,
            reason: `no-acceptance:${unit.organizationId}`,
          };
        }
      }
      const leaders = responses
        .filter((record) => record.response === "accept")
        .map((record) => record.personId);
      const absorbing = initiative.proposedName === null;
      const label = initiative.proposedName ?? units[0]!.name;
      const published = publicEvent(
        world,
        `${key}:merger-decision`,
        PARTY_EVOLUTION_EVENT,
        units.map((unit) => unit.organizationId),
        leaders,
        `${units.map((unit) => unit.name).join(" and ")} agreed to merge as ${label}.`,
        ["change:merged"],
        units[0]!.jurisdictionId,
      );
      const eventId = published.eventId;
      let next = published.world;
      let successor = units[0]!.organizationId;
      if (!absorbing) {
        const created = newPartyUnit(
          next,
          initiative,
          "merger",
          label,
          eventId,
        );
        next = created.world;
        successor = created.organizationId;
      }
      const absorbed = units
        .map((unit) => unit.organizationId)
        .filter((id) => id !== successor);
      const moved: EntityId[] = [];
      const ended: EntityId[] = [];
      for (const unitId of absorbed) {
        const affiliated = world.history.organizationParticipations.filter(
          (participation) =>
            participation.organizationId === unitId &&
            participation.kind === PARTY_AFFILIATION_KIND &&
            organizationParticipationStateAt(world, participation.id)
              ?.status === "active",
        );
        for (const participation of affiliated) {
          moved.push(participation.personId);
          next = moveAffiliation(
            next,
            participation.personId,
            successor,
            `${key}:merge:${participation.id}`,
            eventId,
          );
          ended.push(participation.id);
        }
        for (const participation of activeParticipations(
          next,
          unitId,
          BODY_KINDS,
        )) {
          next = endParticipation(
            next,
            participation,
            `${key}:merge-body:${participation.id}`,
            eventId,
            "The unit merged.",
          );
          ended.push(participation.id);
          next = addRole(
            next,
            participation.personId,
            successor,
            participation.kind === PARTY_COMMITTEE_KIND
              ? PARTY_COMMITTEE_KIND
              : PARTY_OFFICER_KIND,
            `${key}:merge-role:${participation.id}`,
            eventId,
          );
        }
      }
      const cancelled: EntityId[] = [];
      for (const unitId of absorbed) {
        const result = cancelUnitDueItems(next, unitId, key, eventId);
        next = result.world;
        cancelled.push(...result.cancelled);
      }
      next = evolutionRecord(next, initiative, "merged", {
        fromOrganizationIds: units.map((unit) => unit.organizationId),
        toOrganizationIds: [successor],
        movedPersonIds: [...new Set(moved)].sort(),
        name: label,
        obligations: {
          participationsEnded: ended,
          dueItemsCancelled: cancelled,
          otherResources: "none-represented",
          successorOrganizationId: successor,
        },
        publicEventId: eventId,
      });
      if (!absorbing) next = scheduleBodyReview(next, successor, leaders[0]!);
      return { kind: "adopted", world: next, organizationIds: [successor] };
    }
    case "rename":
    case "platform-change": {
      const unit = requireActiveUnit(
        world,
        initiative.subjectOrganizationIds[0]!,
      );
      const leader = responses.find(
        (record) =>
          record.actingForOrganizationId === unit.organizationId &&
          record.authority === "authorized-leader" &&
          record.response === "accept",
      );
      if (!leader)
        return { kind: "not-met", world, reason: "no-leader-acceptance" };
      const renamed = initiative.initiativeKind === "rename";
      const published = publicEvent(
        world,
        `${key}:decision`,
        PARTY_EVOLUTION_EVENT,
        [unit.organizationId],
        [leader.personId],
        renamed
          ? `${unit.name} is now ${initiative.proposedName}.`
          : `${unit.name} changed its platform.`,
        [renamed ? "change:renamed" : "change:platform-changed"],
        unit.jurisdictionId,
      );
      const eventId = published.eventId;
      let next = published.world;
      if (renamed) {
        const profile = world.history.organizationProfiles
          .filter((record) => record.organizationId === unit.organizationId)
          .at(-1)!;
        next = recordOrganizationProfile(next, {
          stableKey: `${key}:profile`,
          organizationId: unit.organizationId,
          effectiveAt: next.currentDate,
          name: initiative.proposedName!,
          classification: profile.classification,
          locationJurisdictionId: profile.locationJurisdictionId,
          provenance: provenanceFor(eventId),
          supersedesProfileId: profile.id,
        });
      } else {
        next = seedPlatform(next, initiative, unit.organizationId);
      }
      next = evolutionRecord(
        next,
        initiative,
        renamed ? "renamed" : "platform-changed",
        {
          fromOrganizationIds: [unit.organizationId],
          toOrganizationIds: [unit.organizationId],
          movedPersonIds: [],
          name: renamed ? initiative.proposedName : null,
          obligations: null,
          publicEventId: eventId,
        },
      );
      return {
        kind: "adopted",
        world: next,
        organizationIds: [unit.organizationId],
      };
    }
    case "dissolution": {
      const unit = requireActiveUnit(
        world,
        initiative.subjectOrganizationIds[0]!,
      );
      const inactive = initiative.reasonKeys.includes("inactivity-finding");
      const leader = responses.find(
        (record) =>
          record.actingForOrganizationId === unit.organizationId &&
          record.authority === "authorized-leader" &&
          record.response === "accept",
      );
      if (!leader && !(inactive && unitInactive(world, unit.organizationId))) {
        return { kind: "not-met", world, reason: "no-dissolution-basis" };
      }
      const published = publicEvent(
        world,
        `${key}:dissolution`,
        PARTY_EVOLUTION_EVENT,
        [unit.organizationId],
        leader ? [leader.personId] : [initiative.proposerPersonId],
        leader
          ? `${unit.name} voted to dissolve.`
          : `${unit.name} was found inactive and wound up.`,
        ["change:dissolved"],
        unit.jurisdictionId,
      );
      const eventId = published.eventId;
      let next = published.world;
      const ended: EntityId[] = [];
      for (const participation of world.history.organizationParticipations) {
        if (participation.organizationId !== unit.organizationId) continue;
        if (
          organizationParticipationStateAt(next, participation.id)?.status !==
          "active"
        )
          continue;
        next = endParticipation(
          next,
          participation,
          `${key}:wind-up:${participation.id}`,
          eventId,
          "The organization dissolved.",
        );
        ended.push(participation.id);
      }
      const cancelled = cancelUnitDueItems(
        next,
        unit.organizationId,
        key,
        eventId,
      );
      next = cancelled.world;
      next = evolutionRecord(next, initiative, "dissolved", {
        fromOrganizationIds: [unit.organizationId],
        toOrganizationIds: [],
        movedPersonIds: [],
        name: null,
        obligations: {
          participationsEnded: ended,
          dueItemsCancelled: cancelled.cancelled,
          otherResources: "none-represented",
          successorOrganizationId: null,
        },
        publicEventId: eventId,
      });
      return { kind: "adopted", world: next, organizationIds: [] };
    }
  }
}

function seedPlatform(
  world: World,
  initiative: PartyInitiativeRecord,
  organizationId: EntityId,
): World {
  const positions = initiative.proposedPositions.length
    ? initiative.proposedPositions
    : initiative.questionKey
      ? [
          {
            questionKey: initiative.questionKey,
            optionKey: partyActorStance(
              world,
              initiative.proposerPersonId,
              initiative.questionKey,
            ).optionKey,
          },
        ]
      : [];
  if (positions.length === 0) return world;
  const previous = partyPlatformAt(world, organizationId);
  return appendPartyRecords(world, [
    {
      kind: "party-platform",
      stableKey: `${initiative.stableKey}:platform`,
      organizationId,
      effectiveDate: makeIsoDate(world.currentDate),
      positions: [...positions].sort((a, b) =>
        a.questionKey.localeCompare(b.questionKey),
      ),
      decisionId: null,
      supersedesPlatformId: previous?.id ?? null,
    },
  ]);
}

function unitInactive(world: World, organizationId: EntityId): boolean {
  const since = addDays(world.currentDate, -PARTY_BODY_CADENCE.inactivityDays);
  const unit = partyUnit(world, organizationId);
  if (!unit || unit.establishedAt > since) return false;
  const anyActive = world.history.organizationParticipations.some(
    (participation) =>
      participation.organizationId === organizationId &&
      organizationParticipationStateAt(world, participation.id)?.status ===
        "active",
  );
  const recentDecision = partyBodyDecisions(world, organizationId).some(
    (decision) => decision.decidedAt > since,
  );
  return !anyActive && !recentDecision;
}

function cancelUnitDueItems(
  world: World,
  organizationId: EntityId,
  key: string,
  eventId: EntityId,
): { world: World; cancelled: EntityId[] } {
  let next = world;
  const cancelled: EntityId[] = [];
  for (const item of world.history.futureDueItems) {
    if (!item.entityIds.includes(organizationId)) continue;
    if (
      futureDueItemStateAt(next, item.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      })?.status !== "scheduled"
    )
      continue;
    next = cancelFutureDueItem(next, {
      stableKey: `${key}:cancel:${item.id}`,
      dueItemId: item.id,
      effectiveAt: next.currentDate,
      reasonKey: "party-life:unit-ended",
      context: `The organization's change ended this (${eventId}).`,
    });
    cancelled.push(item.id);
  }
  return { world: next, cancelled };
}

// ---------------------------------------------------------------------------
// Standing bodies and their periodic review
// ---------------------------------------------------------------------------

function firstOfMonthAfter(date: IsoDate, months: number): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + months;
  const y = year + Math.floor(month / 12);
  const m = (month % 12) + 1;
  return makeIsoDate(`${y}-${String(m).padStart(2, "0")}-01`);
}

function reviewCount(world: World, organizationId: EntityId): number {
  return world.history.futureDueItems.filter(
    (item) =>
      item.transitionKey === PARTY_BODY_REVIEW_TRANSITION_KEY &&
      item.entityIds.includes(organizationId),
  ).length;
}

export function scheduleBodyReview(
  world: World,
  organizationId: EntityId,
  anchorPersonId: EntityId,
): World {
  const n = reviewCount(world, organizationId) + 1;
  return scheduleFutureDueItem(world, {
    stableKey: `${V}:review:${organizationId}:${n}`,
    dueAt: firstOfMonthAfter(
      world.currentDate,
      PARTY_BODY_CADENCE.reviewEveryMonths,
    ),
    transitionKey: PARTY_BODY_REVIEW_TRANSITION_KEY,
    entityIds: [organizationId, anchorPersonId].sort(),
    jurisdictionId: partyUnit(world, organizationId)?.jurisdictionId ?? null,
    provenance: { kind: "initialization", reference: `${V}:review` },
  });
}

/**
 * A standing committee for each home chapter of a current opening, so a local
 * body can actually decide something. Materialized once; legacy saves and
 * replays are left exactly as they were.
 */
export function ensurePartyGoverningBodies(
  world: World,
  playerPersonId: EntityId,
): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  const player = world.people[playerPersonId];
  if (!player) throw new Error("Party bodies need an existing player.");
  const marker = `${V}:bodies`;
  if (world.history.events.some((event) => event.stableKey === marker))
    return world;
  const chapters = homePartyChapters(world);
  if (chapters.length === 0) return world;
  const date = world.currentDate;
  const rng = new SeededRng(world.seed).fork(marker);
  const memberKey = (chapterId: EntityId, index: number) =>
    `${marker}:${chapterId}:member:${index}`;
  let next = createCharacterHistoryContextPeople(
    world,
    chapters.flatMap((chapter) =>
      Array.from(
        { length: PARTY_BODY_CADENCE.standingCommitteeSize },
        (_, index) => {
          const personRng = rng.fork(memberKey(chapter.organizationId, index));
          return {
            stableKey: memberKey(chapter.organizationId, index),
            ...drawCanonicalNamedIdentity(
              personRng.fork("name"),
              generatePersonIdentity(personRng.fork("identity")),
            ),
            birthDate: makeIsoDate(
              `${Number(date.slice(0, 4)) - personRng.integer(21, 78)}-${String(personRng.integer(1, 13)).padStart(2, "0")}-${String(personRng.integer(1, 29)).padStart(2, "0")}`,
            ),
            homeJurisdictionId: player.homeJurisdictionId,
          };
        },
      ),
    ),
  );
  const provenance = { kind: "generated" as const, generatorKey: V };
  const transitions = chapters.flatMap((chapter) =>
    Array.from(
      { length: PARTY_BODY_CADENCE.standingCommitteeSize },
      (_, index) => {
        const personId = characterHistoryContextPersonId(
          next,
          memberKey(chapter.organizationId, index),
        );
        return [
          {
            kind: "participation" as const,
            input: {
              stableKey: `${memberKey(chapter.organizationId, index)}:committee`,
              personId,
              organizationId: chapter.organizationId,
              startedAt: date,
              initialStatus: "active" as const,
              kind: PARTY_COMMITTEE_KIND,
              roleKind: "member:committee" as const,
              context: "Sits on the chapter's governing body.",
              provenance,
            },
          },
          {
            kind: "participation" as const,
            input: {
              stableKey: `${memberKey(chapter.organizationId, index)}:affiliation`,
              personId,
              organizationId: chapter.partyOrganizationId,
              startedAt: date,
              initialStatus: "active" as const,
              kind: PARTY_AFFILIATION_KIND,
              roleKind: "member:public-affiliation" as const,
              context: "Public party affiliation",
              provenance,
            },
          },
        ];
      },
    ).flat(),
  );
  next = applyCharacterHistoryPlan(next, {
    stableKey: `${marker}:plan`,
    mode: "quick-generated",
    personId: playerPersonId,
    transitions,
  }).world;
  for (const chapter of chapters) {
    next = scheduleBodyReview(
      next,
      chapter.organizationId,
      chapter.organizerPersonId ??
        characterHistoryContextPersonId(
          next,
          memberKey(chapter.organizationId, 0),
        ),
    );
  }
  next = recordWorldEvent(next, {
    stableKey: marker,
    type: "setup.party-governing-bodies",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: player.homeJurisdictionId,
    involvedEntityIds: chapters.map((chapter) => chapter.organizationId),
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V],
    summary: "Local party chapters have standing committees.",
    context: EVENT_CONTEXT,
  });
  assertWorldIntegrity(next);
  return next;
}

/**
 * The quarterly meeting: the body decides its next question, and any member
 * whose firm view keeps losing may, with others, act on it. At most one
 * initiative per meeting; nothing happens if nobody chooses to.
 */
export function partyBodyReviewTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PARTY_BODY_REVIEW_TRANSITION_KEY) {
    throw new Error("The party body handler received another transition.");
  }
  const unit = partyUnits(world).find((candidate) =>
    dueItem.entityIds.includes(candidate.organizationId),
  );
  const done = (
    next: World,
    reason: string,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: `party-life:${reason}`,
    context: null,
    outcomeEventId: null,
  });
  if (
    !unit ||
    partyUnitStatusAt(world, unit.organizationId).kind !== "active"
  ) {
    return {
      world,
      status: "blocked",
      reasonKey: "party-life:unit-not-active",
      context: null,
      outcomeEventId: null,
    };
  }
  const members = partyBodyMembers(world, unit.organizationId);
  if (members.filter((id) => !controlled(world, id)).length === 0) {
    if (unitInactive(world, unit.organizationId)) {
      const proposed = proposePartyInitiative(world, {
        initiativeKind: "dissolution",
        proposerPersonId: dueItem.entityIds.find((id) => world.people[id])!,
        subjectOrganizationIds: [unit.organizationId],
        reasonKeys: ["inactivity-finding"],
        level: unit.level,
        jurisdictionId: unit.jurisdictionId,
      });
      const adopted = adoptPartyInitiative(
        proposed.world,
        proposed.initiativeId,
      );
      return done(adopted.world, "inactive-unit-wound-up");
    }
    const anchor = dueItem.entityIds.find((id) => world.people[id]);
    return done(
      anchor ? scheduleBodyReview(world, unit.organizationId, anchor) : world,
      "no-members-present",
    );
  }
  const n = partyBodyDecisions(world, unit.organizationId).length;
  const questionKey = PARTY_QUESTIONS[n % PARTY_QUESTIONS.length]!.key;
  const decisionKey = `${dueItem.stableKey}:decision`;
  let next = recordPartyBodyDecision(world, {
    organizationId: unit.organizationId,
    questionKey,
    stableKey: decisionKey,
  });
  const decision = partyBodyDecisions(next, unit.organizationId).at(-1)!;
  for (const personId of decision.dissentingPersonIds) {
    const assessment = assessPartyInitiative(
      next,
      personId,
      unit.organizationId,
      decisionKey,
    );
    if (assessment.kind === "none") continue;
    const stance = partyActorStance(next, personId, assessment.questionKey!);
    const optionLabel = question(assessment.questionKey!)
      .options.find((option) => option.key === stance.optionKey)!
      .label.toLowerCase();
    const proposed = proposePartyInitiative(next, {
      initiativeKind: assessment.kind,
      proposerPersonId: personId,
      subjectOrganizationIds: [unit.organizationId],
      questionKey: assessment.questionKey,
      disputedDecisionIds: assessment.disputedDecisionIds,
      proposedName:
        assessment.kind === "founding" ? `League for ${optionLabel}` : null,
      level: unit.level,
      jurisdictionId: unit.jurisdictionId,
      reasonKeys: assessment.reasonKeys,
      stableKey: `${decisionKey}:initiative`,
    });
    next = proposed.world;
    for (const ally of assessment.allies) {
      next = respondToPartyInitiative(next, {
        initiativeId: proposed.initiativeId,
        personId: ally,
        response: npcInitiativeResponse(next, proposed.initiativeId, ally),
        authority:
          assessment.kind === "split" ? "faction-member" : "co-organizer",
      });
    }
    next = adoptPartyInitiative(next, proposed.initiativeId).world;
    break;
  }
  const anchor = partyBodyMembers(next, unit.organizationId)[0];
  return done(
    anchor ? scheduleBodyReview(next, unit.organizationId, anchor) : next,
    "body-met",
  );
}
