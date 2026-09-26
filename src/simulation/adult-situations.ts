import {
  hasActiveHouseholdWeek,
  lifeOpportunitiesFor,
  PUBLIC_MEETING_KEY,
  type LifeOpportunityKind,
} from "./life-opportunities";
import { ageOnDate, makeIsoDate } from "./dates";
import { activeIncidentsAt } from "./incidents";
import {
  activeCareResponsibilitiesAt,
  activeLifeCommitmentsAt,
  activeOrganizationParticipationsAt,
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdLocationAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import type { InterestTension, PlayerModelDimension } from "./player-model";
import { relationshipLeverage } from "./relationship-leverage";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  activeResourceObligationsForOwner,
  currentResourceCutoff,
} from "./resource-queries";
import type {
  AdultLifeSituationKey,
  AvailableLifeSituation,
  EntityId,
  IsoDate,
  LifeCommitmentKind,
  LifeSituationKey,
  LifeSituationOption,
  World,
} from "./types";

/**
 * Adult scenes must read their premises from existing canonical records.
 * Presence of a job, relative, obligation or posted meeting does not establish
 * a new request or occurrence. The withheld entries retain their old predicates
 * as inspectable evidence, but the provider excludes them before selection and
 * the write boundary checks the same provider before any option-specific write.
 *
 * The fixed authored errands key identifies the shopping and two appointments;
 * its active state, assignment and access also have to belong to this person.
 * A sparse World may therefore have no eligible adult scene. Restoring withheld
 * opportunities requires the missing records named on each entry, not broader
 * gates or invented scene premises.
 *
 * A chosen action and its possible callback are separate records. A choice
 * recap does not prove an unrecorded result, another person's consent or work
 * completion. Historical keys remain readable even when new offers are withheld.
 */

/* -------------------------------------------------------------------------- */
/* Internal rationing vocabulary — never rendered                              */
/* -------------------------------------------------------------------------- */

/**
 * How much this situation asks of the player, for pacing only.
 *
 * This is not a forecast. It says "how much does this put your own priorities
 * against each other", which is a statement about the *moment*; whether
 * anything comes of it is decided later, from the world, and the two are
 * allowed to disagree completely. That disagreement is the point: a player who
 * could read consequence off the presentation would stop making choices and
 * start reading the presentation.
 *
 * It exists so that a life is not all turning points. It must never reach a
 * rendered surface, and a test pins that.
 */
export type LifeStakesTier = "ordinary" | "notable" | "pressing";

/**
 * What a choice can leave behind, as a kind rather than an outcome.
 *
 * A situation's option says at most "this is the sort of thing that can come
 * back". Whether it does is answered later by `life-callbacks.ts` from world
 * state — whether the other person is still around, whether the issue still
 * exists, whether anybody ever knew.
 */
export type AdultAftermathKind =
  /** Something was promised, and somebody may expect it. */
  | "obligation"
  /** Somebody was let down, and may or may not still mind. */
  | "grievance"
  /** Somebody was helped, and may or may not remember it when it counts. */
  | "goodwill"
  /** A position was taken where people could hear it. */
  | "standing";

/** What the option needs written into the world beyond the ordinary record. */
export type AdultOptionWrite =
  | {
      readonly kind: "join-community-organization";
      readonly organizationLabel: string;
      readonly participationKind: `${"membership" | "activity" | "leadership"}:${string}`;
      readonly roleKind: `${"member" | "participant" | "leader"}:${string}`;
    }
  | {
      readonly kind: "take-on-commitment";
      readonly label: string;
      readonly commitmentKind: LifeCommitmentKind;
      readonly weeklyHours: readonly [number, number];
    };

/** Who else the scene needs, resolved from the world and never created. */
export type AdultCompanionRole =
  | "household-member"
  | "kin"
  | "partner"
  | "colleague"
  | "community-member"
  | "other-household"
  | null;

export interface AdultSituationOption extends LifeSituationOption {
  /**
   * What choosing this teaches the adaptive layer. Gameplay strength, because
   * this is something the player did in a world that could answer back.
   */
  readonly nudges: readonly {
    readonly dimension: PlayerModelDimension;
    readonly magnitude: number;
  }[];
  readonly hypotheses?: readonly {
    readonly hypothesisKey: string;
    readonly support: number;
  }[];
  /**
   * The sort of thing this may leave behind, or null when the choice is
   * genuinely finished when it is made. Null is common and must stay common.
   */
  readonly aftermath: AdultAftermathKind | null;
  readonly writes?: AdultOptionWrite | null;
}

export interface AdultSituation {
  readonly key: AdultLifeSituationKey;
  readonly prose: string;
  readonly options: readonly AdultSituationOption[];
  readonly companion: AdultCompanionRole;
  readonly stakes: LifeStakesTier;
  /** Which of the player's own priorities this moment sets against each other. */
  readonly tensions: readonly InterestTension[];
  /**
   * Why this situation is currently withheld from play, or absent when it is
   * offered normally.
   *
   * A withheld situation stays authored — its key remains valid for saves that
   * already carry it and for scheduled callbacks that still name it — but it is
   * never offered again until the world actually contains the fact it is
   * about. This is the same first-class withholding the episode banks use: the
   * reason is written here, in the bank, and read by the corpus rather than
   * inferred by it. P2 prose migration, following the PROSE-RESET rule that a
   * scene which fundamentally depends on an object, amount or record the world
   * does not contain is withheld rather than rewritten into prettier vagueness.
   */
  readonly withheld?: string;
  /**
   * The canonical opportunity this scene is an answer to, when it is one.
   *
   * Named here rather than folded into `available`, because two different
   * readers need it: the provider, which will not offer a scene whose request
   * is not open, and the companion resolver, which takes the other person from
   * the request itself so the scene is with whoever actually asked. Inferring
   * either from a pool would let the person in the prose and the person in the
   * record drift apart, which is the class of defect this wave is repairing.
   */
  readonly opportunity?: LifeOpportunityKind;
  /** Whether the world currently contains the thing this is about. */
  readonly available: (context: AdultLifeContext) => boolean;
  /**
   * How much this matters to this life *right now*, on [0, 1]. Read from world
   * state — a debt call is more relevant to somebody carrying a debt — and not
   * from anything the player answered at setup.
   */
  readonly relevance?: (context: AdultLifeContext) => number;
}

/* -------------------------------------------------------------------------- */
/* Reading the life                                                            */
/* -------------------------------------------------------------------------- */

export interface AdultLifeContext {
  readonly world: World;
  readonly personId: EntityId;
  readonly asOfDate: IsoDate;
  readonly age: number;
  readonly householdIds: readonly EntityId[];
  readonly householdCompanionIds: readonly EntityId[];
  readonly kinIds: readonly EntityId[];
  readonly partnerIds: readonly EntityId[];
  readonly colleagueIds: readonly EntityId[];
  readonly communityMemberIds: readonly EntityId[];
  readonly otherHouseholdMemberIds: readonly EntityId[];
  readonly familiarPersonIds: readonly EntityId[];
  /**
   * How lopsided the most lopsided relationship in this life currently is, on
   * [-1, +1], read from roof, income, care, belonging and money owed.
   *
   * Derived on the spot and never stored. It is here so a situation can ask
   * "would this ask be uncomfortable" without anybody keeping a leverage score
   * about anybody — see `relationship-leverage.ts` for why that distinction is
   * the whole design.
   */
  readonly strongestDependency: number;
  /** Who that reading is against, when there is one. */
  readonly reliedOnPersonId: EntityId | null;
  readonly workCount: number;
  readonly careCount: number;
  readonly commitmentCount: number;
  /**
   * Commitments this player undertook in play, as opposed to ones the
   * summarized earlier life wrote down for them.
   *
   * The distinction matters for exactly one situation: "something you said you
   * would do has arrived" is a lie if they never said it. A commitment carried
   * in from a generated background is a fact about the character, not a promise
   * the player made, and the two must not be confused.
   */
  readonly playerMadeCommitmentCount: number;
  readonly obligationCount: number;
  /**
   * Whether an active obligation with a `housing:` basis exists. A scene about
   * what it costs to stay somewhere is offered only when the record actually
   * carries a housing payment, not merely a tenure.
   */
  readonly hasHousingObligation: boolean;
  readonly civicParticipationCount: number;
  readonly hasDwelling: boolean;
  readonly hasHousingTenure: boolean;
  readonly hasPostedMeeting: boolean;
  readonly hasHouseholdWorkItem: boolean;
  /**
   * The requests, invitations and notices this life is currently carrying an
   * answer for, read from `life-opportunities.ts`.
   *
   * A scene that needs somebody to have asked something reads this and nothing
   * else. It is the difference between "you have a job and a colleague" and
   * "somebody asked you to work extra hours on these terms", and the second is
   * the only one that grounds a scene about the second.
   */
  readonly openOpportunityKinds: ReadonlySet<LifeOpportunityKind>;
  /** Who asked, per open kind, taken from the request rather than a pool. */
  readonly opportunityCounterparts: Readonly<
    Partial<Record<LifeOpportunityKind, EntityId | null>>
  >;
  readonly activeIncidentCount: number;
  readonly playedKeys: ReadonlySet<string>;
  /** Ordinary things already on the record that a later moment can call back. */
  readonly recallableKeys: ReadonlySet<string>;
}

export function buildAdultLifeContext(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): AdultLifeContext {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const lifeCutoff = currentLifeCutoff(world);
  const resourceCutoff = currentResourceCutoff(world);

  const memberships = householdMembershipsAt(world, personId, lifeCutoff);
  const householdIds = [
    ...new Set(memberships.map((entry) => entry.membership.householdId)),
  ];
  const householdCompanionIds = [
    ...new Set(
      householdIds.flatMap((householdId) =>
        peopleInHouseholdAt(world, householdId, lifeCutoff).filter(
          (candidate) => candidate !== personId,
        ),
      ),
    ),
  ];

  const kinIds = [
    ...new Set(
      kinshipRelationshipsAt(world, personId, lifeCutoff)
        .flatMap((relationship) => relationship.personIds)
        .filter((candidate) => candidate !== personId),
    ),
  ];
  const partnerIds = [
    ...new Set(
      activePartnershipsAt(world, personId, lifeCutoff)
        .flatMap((partnership) => partnership.personIds)
        .filter((candidate) => candidate !== personId),
    ),
  ];

  const work = activeWorkRelationshipsAt(world, personId, lifeCutoff);
  // Work with no employer on record is nobody's workplace: two people who
  // each have such work do not share one.
  const employerIds = new Set<EntityId | null>(
    work
      .map((entry) => entry.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  const colleagueIds = [
    ...new Set(
      world.personOrder.filter(
        (candidate) =>
          candidate !== personId &&
          activeWorkRelationshipsAt(world, candidate, lifeCutoff).some(
            (entry) => employerIds.has(entry.relationship.organizationId),
          ),
      ),
    ),
  ];

  const participations = activeOrganizationParticipationsAt(
    world,
    personId,
    lifeCutoff,
  );
  const participationOrganizationIds = new Set(
    participations.map((entry) => entry.participation.organizationId),
  );
  const communityMemberIds = [
    ...new Set(
      world.personOrder.filter(
        (candidate) =>
          candidate !== personId &&
          activeOrganizationParticipationsAt(world, candidate, lifeCutoff).some(
            (entry) =>
              participationOrganizationIds.has(
                entry.participation.organizationId,
              ),
          ),
      ),
    ),
  ];

  // Somebody in a different household whose household is recorded in the same
  // jurisdiction. That is a shared place, not a shared wall, and the content
  // that uses it is careful to claim only the first.
  const myJurisdictions = new Set(
    householdIds
      .map(
        (householdId) =>
          householdLocationAt(world, householdId, lifeCutoff)?.jurisdictionId,
      )
      .filter((value): value is EntityId => value !== undefined),
  );
  const householdSet = new Set(householdIds);
  const otherHouseholdMemberIds = [
    ...new Set(
      world.history.householdMemberships
        .filter((membership) => !householdSet.has(membership.householdId))
        .filter((membership) => {
          const location = householdLocationAt(
            world,
            membership.householdId,
            lifeCutoff,
          );
          return (
            location !== null &&
            location !== undefined &&
            myJurisdictions.has(location.jurisdictionId)
          );
        })
        .map((membership) => membership.personId)
        .filter(
          (candidate) =>
            candidate !== personId &&
            !householdCompanionIds.includes(candidate) &&
            (world.people[candidate]?.birthDate ?? "9999-12-31") <= asOfDate,
        ),
    ),
  ];

  // Somebody this person has actually had something to do with. This is what
  // makes a friendship situation possible without the game announcing that
  // two people are friends because they were both in the world.
  const familiarPersonIds = [
    ...new Set(
      world.history.relationshipInteractions
        .filter((interaction) => interaction.personIds.includes(personId))
        .flatMap((interaction) => interaction.personIds)
        .filter((candidate) => candidate !== personId),
    ),
  ];

  // The most lopsided relationship this life currently has. Computed over the
  // people already gathered above rather than over everybody in the world, so
  // it costs nothing on a world with a large population.
  let strongestDependency = 0;
  let reliedOnPersonId: EntityId | null = null;
  for (const candidate of [
    ...householdCompanionIds,
    ...kinIds,
    ...colleagueIds,
    ...communityMemberIds,
  ]) {
    const reading = relationshipLeverage(world, personId, candidate).imbalance;
    if (reading > strongestDependency) {
      strongestDependency = reading;
      reliedOnPersonId = candidate;
    }
  }

  const obligations = activeResourceObligationsForOwner(
    world,
    { kind: "person", personId },
    resourceCutoff,
  );
  const obligationCount = obligations.length;
  const hasHousingObligation = obligations.some((obligation) =>
    obligation.basisKind.startsWith("housing:"),
  );

  const playedKeys = new Set(
    world.history.memories
      .filter((memory) => memory.personId === personId)
      .flatMap((memory) => memory.relevanceTags),
  );

  const opportunities = lifeOpportunitiesFor(world, personId, asOfDate);

  const recallableKeys = new Set(
    world.history.events
      .filter((event) => event.involvedEntityIds.includes(personId))
      .flatMap((event) => event.tags),
  );

  return {
    world,
    personId,
    asOfDate: makeIsoDate(asOfDate),
    age: ageOnDate(person.birthDate, asOfDate),
    householdIds,
    householdCompanionIds,
    kinIds,
    partnerIds,
    colleagueIds,
    communityMemberIds,
    otherHouseholdMemberIds,
    familiarPersonIds,
    strongestDependency,
    reliedOnPersonId,
    workCount: work.length,
    careCount: activeCareResponsibilitiesAt(world, personId, lifeCutoff).length,
    commitmentCount: activeLifeCommitmentsAt(world, personId, lifeCutoff)
      .length,
    playerMadeCommitmentCount: activeLifeCommitmentsAt(
      world,
      personId,
      lifeCutoff,
    ).filter((record) => record.stableKey.startsWith("adult-life:")).length,
    obligationCount,
    hasHousingObligation,
    civicParticipationCount: participations.length,
    hasDwelling: activeDwellingOccupanciesAt(world, resourceCutoff).length > 0,
    hasHousingTenure: activeHousingTenuresAt(world, resourceCutoff).length > 0,
    hasPostedMeeting: world.history.workItems.some(
      (item) => item.stableKey === PUBLIC_MEETING_KEY,
    ),
    hasHouseholdWorkItem: hasActiveHouseholdWeek(world, personId),
    openOpportunityKinds: new Set(opportunities.map((entry) => entry.kind)),
    opportunityCounterparts: Object.fromEntries(
      opportunities.map((entry) => [entry.kind, entry.counterpartPersonId]),
    ),
    activeIncidentCount: activeIncidentsAt(world, lifeCutoff).length,
    playedKeys,
    recallableKeys,
  };
}

/** Whoever the world can put in this scene, or null when nobody can be. */
export function resolveAdultCompanion(
  context: AdultLifeContext,
  role: AdultCompanionRole,
): EntityId | null {
  if (role === null) return null;
  const pool =
    role === "household-member"
      ? context.householdCompanionIds
      : role === "kin"
        ? context.kinIds
        : role === "partner"
          ? context.partnerIds
          : role === "colleague"
            ? context.colleagueIds
            : role === "community-member"
              ? context.communityMemberIds
              : context.otherHouseholdMemberIds;
  // Stable rather than arbitrary: the same scene reaches for the same person
  // on every replay, because the world's own person order decides.
  for (const candidate of context.world.personOrder) {
    if (pool.includes(candidate)) return candidate;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Tension helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Fixed adult scene premises were withdrawn. A request must be rendered
 * from its own saved record by a reviewed English bank before reentering play. */
const ADULT_SITUATIONS: readonly AdultSituation[] = [];

/* -------------------------------------------------------------------------- */
/* The provider                                                                */
/* -------------------------------------------------------------------------- */

export function adultSituationBank(): readonly AdultSituation[] {
  return ADULT_SITUATIONS;
}

export function adultSituation(key: LifeSituationKey): AdultSituation | null {
  return ADULT_SITUATIONS.find((situation) => situation.key === key) ?? null;
}

/**
 * Whether a key names an adult situation from this bank.
 *
 * Takes a plain string rather than a `LifeSituationKey` because the callers
 * that most need it are narrowing something wider — a selector result that can
 * also carry a composed episode key, or a tag read off an event. A guard that
 * only accepts what it is meant to prove is not much of a guard.
 */
export function isAdultSituationKey(key: string): key is AdultLifeSituationKey {
  return key.startsWith("adult.");
}

/**
 * The adult situations this life can currently be offered.
 *
 * Availability, and nothing else. Ranking is somebody else's job — keeping the
 * two apart is what stops "the selector liked this" from turning into "the
 * world made this possible".
 */
export function availableAdultSituations(
  context: AdultLifeContext,
): readonly AdultSituation[] {
  return ADULT_SITUATIONS.filter((situation) => {
    // Withheld content is never offered. The rows stay authored so saves and
    // scheduled callbacks that already name them remain readable.
    if (situation.withheld !== undefined) return false;
    // A scene that answers a request is offered while the request is open and
    // not otherwise. Expiry, and the fact that answering it closes it, are the
    // opportunity record's own business and are read there.
    if (
      situation.opportunity !== undefined &&
      !context.openOpportunityKinds.has(situation.opportunity)
    ) {
      return false;
    }
    if (!situation.available(context)) return false;
    if (situation.companion === null) return true;
    return resolveAdultSituationCompanion(context, situation) !== null;
  }).map((situation) => bindRequestSituation(context, situation));
}

/**
 * Who this scene is with.
 *
 * The person named on the request when the scene answers one, and otherwise
 * the pool the role names. Reaching for the pool first would let the world put
 * one person in the record and a different one on the screen, which is exactly
 * the kind of quiet substitution the grounding rules exist to prevent.
 */
export function resolveAdultSituationCompanion(
  context: AdultLifeContext,
  situation: AdultSituation,
): EntityId | null {
  if (situation.companion === null) return null;
  if (situation.opportunity !== undefined) {
    const asked = context.opportunityCounterparts[situation.opportunity];
    if (asked) return asked;
  }
  return resolveAdultCompanion(context, situation.companion);
}

/** The engine-facing shape, for the generic situation reader and writer. */
export function toAvailableLifeSituation(
  situation: AdultSituation,
): AvailableLifeSituation {
  return {
    key: situation.key,
    band: "adulthood",
    prose: situation.prose,
    options: situation.options,
    needsCompanion: situation.companion !== null,
  };
}

export function adultLifeSituations(
  world: World,
  input: { readonly personId: EntityId; readonly asOfDate: IsoDate },
): readonly AvailableLifeSituation[] {
  const context = buildAdultLifeContext(world, input.personId, input.asOfDate);
  return availableAdultSituations(context).map(toAvailableLifeSituation);
}

/** Existing callers can still look up an old saved key, but no withdrawn
 * scene can supply prose or a new choice. */
export function bindRequestSituation(
  _context: AdultLifeContext,
  situation: AdultSituation,
): AdultSituation {
  return situation;
}
