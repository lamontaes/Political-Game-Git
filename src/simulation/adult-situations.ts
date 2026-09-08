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
  const employerIds = new Set(
    work.map((entry) => entry.relationship.organizationId),
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

function tension(
  first: PlayerModelDimension,
  firstPole: number,
  second: PlayerModelDimension,
  secondPole: number,
  note: string,
): InterestTension {
  return { between: [first, second], poles: [firstPole, secondPole], note };
}

function nudge(dimension: PlayerModelDimension, magnitude: number) {
  return { dimension, magnitude };
}

/* -------------------------------------------------------------------------- */
/* The bank                                                                    */
/* -------------------------------------------------------------------------- */

const always = (): boolean => true;

const ADULT_SITUATIONS: readonly AdultSituation[] = [
  /* ---------------------------------------------------------------- home -- */
  {
    key: "adult.household-standing",
    companion: "household-member",
    stakes: "notable",
    // The active, accessible errands item establishes these tasks; it does
    // not establish past burden, anyone's silence or an agreed division.
    prose:
      "The shopping and two appointments still need to be covered. How do you want to handle them?",
    tensions: [
      tension(
        "personal-ties",
        1,
        "care-obligation",
        -1,
        "Keeping the peace, against saying what you are actually carrying.",
      ),
    ],
    available: (context) =>
      context.householdCompanionIds.length > 0 && context.hasHouseholdWorkItem,
    options: [
      {
        key: "say-it",
        label: "Discuss the errands",
        description:
          "Talk about who will handle the shopping and two appointments.",
        memory: "You brought up the shopping and two appointments.",
        witnessed: "They raised who was covering the week.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "conflict:household",
        nudges: [
          nudge("care-obligation", -0.45),
          nudge("privacy-preference", -0.5),
          nudge("personal-ties", -0.15),
        ],
        aftermath: "grievance",
      },
      {
        key: "absorb-it",
        label: "Handle the errands yourself",
        description:
          "Decide to do the shopping and cover the two appointments yourself.",
        memory: "You decided to handle the shopping and appointments yourself.",
        witnessed: null,
        stance: "withdrawn",
        relationalChange: "maintained",
        interactionKind: "support:household",
        nudges: [
          nudge("care-obligation", 0.55),
          nudge("privacy-preference", 0.4),
          nudge("personal-ties", 0.2),
        ],
        hypotheses: [
          { hypothesisKey: "care.welfare-first", support: 0.5 },
          { hypothesisKey: "style.avoids-confrontation", support: 0.7 },
        ],
        aftermath: null,
      },
      {
        key: "set-it-out",
        label: "Propose a split",
        description: "Suggest dividing the shopping and two appointments.",
        memory: "You proposed sharing the shopping and appointments.",
        witnessed: "They suggested splitting the week between you.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "exchange:household",
        nudges: [nudge("decision-style", 0.5), nudge("care-obligation", 0.2)],
        aftermath: "obligation",
      },
    ],
  },
  {
    key: "adult.household-repair",
    companion: null,
    stakes: "ordinary",
    withheld:
      "The scene depends on a specific broken household object, and the world keeps no record that could name one. Until a canonical household object or repair record exists, an unnamed broken 'something' cannot be grounded, and a prettier synonym for 'thing' would not ground it either.",
    prose:
      "Something in the place has stopped working properly. It is not urgent, and it will not fix itself.",
    tensions: [
      tension(
        "security-stability",
        1,
        "risk-appetite",
        -1,
        "Sorting it now, against leaving it and finding out.",
      ),
    ],
    available: (context) => context.householdIds.length > 0,
    options: [
      {
        key: "fix-it",
        label: "Fix it this afternoon",
        description: "Spend the afternoon and the money now.",
        memory: "You worked on the repair.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.4),
          nudge("risk-appetite", -0.25),
        ],
        aftermath: null,
      },
      {
        key: "leave-it",
        label: "Leave it for now",
        description: "It works well enough.",
        memory: "You left the repair for now.",
        stance: "withdrawn",
        nudges: [
          nudge("risk-appetite", 0.3),
          nudge("security-stability", -0.3),
        ],
        aftermath: null,
      },
      {
        key: "ask-for-help",
        label: "Ask someone who knows",
        description: "Get somebody involved rather than guessing.",
        memory: "You asked for help with the repair.",
        stance: "engaged",
        nudges: [
          nudge("personal-ties", 0.3),
          nudge("privacy-preference", -0.3),
        ],
        aftermath: "goodwill",
      },
    ],
  },
  {
    key: "adult.household-money-shortfall",
    companion: null,
    stakes: "notable",
    withheld:
      "The scene depends on the month's arithmetic having moved, and the world keeps no monthly income or spending record that could say so. Grounded money pressure lives in adult.debt-call and adult.housing-cost-change, which read recorded obligations.",
    prose:
      "The month does not add up the way it did. Nothing has gone wrong; the numbers have simply moved.",
    tensions: [
      tension(
        "security-stability",
        1,
        "personal-ties",
        1,
        "Cutting back where it shows, against cutting back where it costs somebody else.",
      ),
    ],
    available: (context) => context.householdIds.length > 0,
    relevance: (context) => (context.obligationCount > 0 ? 0.9 : 0.5),
    options: [
      {
        key: "cut-back",
        label: "Cut back quietly",
        description: "Take it out of what only you would miss.",
        memory: "You cut back on your own spending and said nothing about it.",
        stance: "withdrawn",
        nudges: [
          nudge("privacy-preference", 0.5),
          nudge("care-obligation", 0.4),
          nudge("security-stability", 0.3),
        ],
        aftermath: null,
      },
      {
        key: "say-so",
        label: "Say the month is tight",
        description: "Put it in front of whoever else it affects.",
        memory: "You said that money was tight that month.",
        stance: "engaged",
        nudges: [
          nudge("privacy-preference", -0.55),
          nudge("personal-ties", 0.3),
        ],
        aftermath: null,
      },
      {
        key: "take-the-work",
        label: "Find the difference",
        description: "Pick up whatever makes up the shortfall.",
        memory: "You went looking for extra work to cover the shortfall.",
        stance: "engaged",
        nudges: [
          nudge("achievement-ambition", 0.35),
          nudge("risk-appetite", 0.2),
          nudge("security-stability", 0.35),
        ],
        aftermath: "obligation",
      },
    ],
  },
  {
    key: "adult.household-quiet-evening",
    // The free evening, the other person being in, and their being willing to
    // spend it are three separate claims, and all three now come from the same
    // canonical record: the household-evening opportunity is written by the
    // person who lives here saying they will be in for it.
    opportunity: "household-evening",
    companion: "household-member",
    stakes: "ordinary",
    prose:
      "The evening is free, and the person you live with said they would be in for it.",
    tensions: [],
    available: (context) => context.householdCompanionIds.length > 0,
    options: [
      {
        key: "spend-it-together",
        label: "Spend it together",
        description: "Nothing in particular, with company.",
        memory: "You spent the evening at home with company.",
        witnessed: "They stayed in, and the evening was an easy one.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "contact:household",
        nudges: [nudge("personal-ties", 0.4)],
        aftermath: "goodwill",
      },
      {
        key: "keep-it-yours",
        label: "Keep the evening",
        description: "Take the evening back for your own.",
        memory: "You spent the evening on your own.",
        witnessed: null,
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "contact:household",
        nudges: [
          nudge("privacy-preference", 0.4),
          nudge("personal-ties", -0.2),
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.family-request",
    withheld:
      "Kinship does not establish a two-week request or a conflicting plan. The request and its terms need an actual record.",
    companion: "kin",
    stakes: "pressing",
    prose:
      "Somebody in the family needs two weeks of your time, and those two weeks are ones you had already given to something else.",
    tensions: [
      tension(
        "personal-ties",
        1,
        "achievement-ambition",
        1,
        "The people you came from, against the thing you were building.",
      ),
      tension(
        "care-obligation",
        1,
        "security-stability",
        1,
        "Carrying it, against what carrying it costs the rest of the month.",
      ),
    ],
    available: (context) => context.kinIds.length > 0,
    options: [
      {
        key: "go",
        label: "Give the two weeks",
        description: "Give the two weeks and deal with the rest afterwards.",
        memory: "You agreed to give the requested two weeks.",
        witnessed: "They came, and stayed the two weeks.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "care:family",
        nudges: [
          nudge("personal-ties", 0.6),
          nudge("care-obligation", 0.55),
          nudge("achievement-ambition", -0.3),
        ],
        hypotheses: [{ hypothesisKey: "ties.family-first", support: 0.85 }],
        aftermath: "goodwill",
      },
      {
        key: "stay",
        label: "Stay with what you had",
        description: "Hold the plan and say you cannot.",
        memory: "You said you couldn't come and kept your existing plan.",
        witnessed: "They said they could not come.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "conflict:family",
        nudges: [
          nudge("achievement-ambition", 0.55),
          nudge("personal-ties", -0.5),
          nudge("care-obligation", -0.4),
        ],
        aftermath: "grievance",
      },
      {
        key: "split-it",
        label: "Split the two weeks",
        description: "Half of each, and neither done properly.",
        memory: "You offered part of the requested two weeks.",
        witnessed: "They came for part of it and left again.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "care:family",
        nudges: [nudge("decision-style", 0.55), nudge("care-obligation", 0.2)],
        aftermath: "obligation",
      },
      {
        key: "find-someone-else",
        label: "Find somebody else to go",
        description: "Arrange cover rather than provide it.",
        memory: "You offered to find somebody else to go.",
        witnessed: "They arranged for somebody else to come instead.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:family",
        nudges: [
          nudge("decision-style", 0.4),
          nudge("care-obligation", -0.2),
          nudge("privacy-preference", 0.25),
        ],
        hypotheses: [
          { hypothesisKey: "style.delegation-as-competence", support: 0.7 },
          { hypothesisKey: "style.avoids-confrontation", support: 0.35 },
        ],
        aftermath: "obligation",
      },
    ],
  },
  {
    key: "adult.care-request",
    withheld:
      "Kinship and no current care responsibility do not establish a care need or a discussion. A named recipient and actual care request are missing; a commitment written after choosing cannot establish them.",
    companion: "kin",
    stakes: "pressing",
    prose:
      "Somebody in the family is going to need regular looking after, and nobody has said yet who is going to do it.",
    tensions: [
      tension(
        "care-obligation",
        1,
        "achievement-ambition",
        1,
        "Being the one who does it, against the rest of what you were doing.",
      ),
    ],
    available: (context) =>
      context.kinIds.length > 0 && context.careCount === 0,
    options: [
      {
        key: "take-it-on",
        label: "Take it on",
        description: "Say you will, and mean the standing version.",
        memory: "You agreed to help take care of someone in your family.",
        witnessed: "They said they would take it on.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "care:family",
        nudges: [
          nudge("care-obligation", 0.65),
          nudge("achievement-ambition", -0.25),
        ],
        aftermath: "obligation",
        writes: {
          kind: "take-on-commitment",
          // The scene is gated on kin, so "in the family" is a recorded fact;
          // "at home" was not — the person needing care may live elsewhere.
          label: "Looking after somebody in the family",
          commitmentKind: "personal:care",
          weeklyHours: [6, 14],
        },
      },
      {
        key: "name-the-limit",
        label: "Say what you can manage",
        description:
          "Offer to take a share of the looking-after, and say how much you can manage.",
        memory:
          "You offered to take a share of looking after your relative, and said how much.",
        witnessed: "They named the part they could take and no more.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:family",
        nudges: [
          nudge("care-obligation", 0.2),
          nudge("privacy-preference", -0.3),
          nudge("decision-style", 0.3),
        ],
        aftermath: "obligation",
      },
      {
        key: "wait",
        label: "Wait for somebody else",
        description: "Let the silence run and see who breaks it.",
        memory:
          "You waited to see whether anybody else in the family would offer.",
        witnessed: null,
        stance: "withdrawn",
        relationalChange: "strained",
        interactionKind: "experience:family",
        nudges: [
          nudge("care-obligation", -0.5),
          nudge("privacy-preference", 0.4),
        ],
        hypotheses: [
          { hypothesisKey: "style.avoids-confrontation", support: 0.8 },
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.partner-plan",
    withheld:
      "A partnership does not establish two conflicting plans or an imminent decision. The plans and the partner proposal are missing.",
    companion: "partner",
    stakes: "notable",
    prose:
      "The two of you want the next few years in slightly different places, and it has stopped being a hypothetical.",
    tensions: [
      tension(
        "personal-ties",
        1,
        "achievement-ambition",
        1,
        "Where the two of you are, against where the work is.",
      ),
    ],
    available: (context) => context.partnerIds.length > 0,
    options: [
      {
        key: "their-way",
        label: "Go their way",
        description: "Take the version that suits them.",
        memory: "You agreed to the plan your partner preferred.",
        witnessed: "They agreed to the plan the other one wanted.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "commitment:partnership",
        nudges: [
          nudge("personal-ties", 0.55),
          nudge("achievement-ambition", -0.35),
        ],
        aftermath: "goodwill",
      },
      {
        key: "your-way",
        label: "Hold out for yours",
        description: "Say plainly that yours is the one that works.",
        memory: "You asked to go with your plan.",
        witnessed: "They held out for their own plan.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "conflict:partnership",
        nudges: [
          nudge("achievement-ambition", 0.5),
          nudge("personal-ties", -0.4),
          nudge("decision-style", -0.35),
        ],
        aftermath: "grievance",
      },
      {
        key: "postpone",
        label: "Put it off",
        description: "Neither, for now.",
        memory: "You asked to postpone deciding between the plans.",
        witnessed: "They agreed to leave it for now.",
        stance: "withdrawn",
        relationalChange: "maintained",
        interactionKind: "experience:partnership",
        nudges: [
          nudge("risk-appetite", -0.3),
          nudge("privacy-preference", 0.3),
        ],
        aftermath: null,
      },
    ],
  },

  /* ---------------------------------------------------------------- work -- */
  {
    key: "adult.work-rule-pressure",
    withheld:
      "Employment and a colleague do not establish a conflicting work rule or a senior request. The rule, conflict and request are missing.",
    companion: "colleague",
    stakes: "notable",
    prose:
      "There is a way the place actually runs and a way it is supposed to, and today somebody senior wants the second one, in front of everybody.",
    tensions: [
      tension(
        "institutional-trust",
        1,
        "personal-ties",
        1,
        "The rule as written, against the people who work around it every day.",
      ),
    ],
    available: (context) =>
      context.workCount > 0 && context.colleagueIds.length > 0,
    options: [
      {
        key: "by-the-book",
        label: "Do it by the book",
        description: "Follow the rule as stated.",
        memory: "You followed the stated work rule.",
        witnessed: "They did it exactly as the rule says.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "work:colleague",
        nudges: [
          nudge("institutional-trust", 0.5),
          nudge("civic-order", 0.3),
          nudge("personal-ties", -0.3),
        ],
        aftermath: "grievance",
      },
      {
        key: "the-usual-way",
        label: "Do it the usual way",
        description: "Do what the place actually does.",
        memory: "You followed the usual practice at work.",
        witnessed: "They did it the way everyone here does it.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "work:colleague",
        nudges: [
          nudge("institutional-trust", -0.5),
          nudge("personal-ties", 0.35),
        ],
        hypotheses: [
          { hypothesisKey: "trust.rules-are-obstacles", support: 0.7 },
          { hypothesisKey: "ties.loyalty-first", support: 0.55 },
        ],
        aftermath: null,
      },
      {
        key: "raise-it",
        label: "Say the rule is wrong",
        description: "Take the disagreement upward rather than sideways.",
        memory: "You challenged the work rule with a senior person.",
        witnessed: "They said the rule was the problem, and said it upward.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "conflict:workplace",
        nudges: [
          nudge("institutional-trust", -0.2),
          nudge("privacy-preference", -0.5),
          nudge("risk-appetite", 0.35),
        ],
        aftermath: "standing",
      },
    ],
  },
  {
    key: "adult.work-extra-hours",
    // The ask and its terms are the extra-hours opportunity, written by
    // somebody the player actually works with. Employment alone still
    // establishes neither, which is why the gate reads both.
    opportunity: "extra-hours-request",
    companion: null,
    stakes: "notable",
    prose:
      "Work has asked you to take on more hours, and they would have to come out of everything that is not work.",
    tensions: [
      tension(
        "achievement-ambition",
        1,
        "personal-ties",
        1,
        "What the job would notice, against what home would.",
      ),
      tension(
        "achievement-ambition",
        1,
        "security-stability",
        1,
        "Taking it on, against keeping the week the shape it was.",
      ),
    ],
    available: (context) => context.workCount > 0,
    relevance: (context) => (context.careCount > 0 ? 0.9 : 0.6),
    options: [
      {
        key: "take-them",
        label: "Take the hours",
        description: "Absorb the difference.",
        memory: "You agreed to work the extra hours.",
        stance: "engaged",
        nudges: [
          nudge("achievement-ambition", 0.55),
          nudge("personal-ties", -0.3),
          nudge("care-obligation", -0.2),
        ],
        aftermath: "goodwill",
      },
      {
        key: "decline",
        label: "Keep your week",
        description: "Keep the week you have.",
        memory: "You declined the requested extra hours.",
        stance: "engaged",
        nudges: [
          nudge("privacy-preference", -0.25),
          nudge("achievement-ambition", -0.35),
          nudge("security-stability", 0.4),
        ],
        aftermath: "grievance",
      },
      {
        key: "trade",
        label: "Take some, trade the rest",
        description: "Give what you can and hand back what you cannot.",
        memory:
          "You offered to take some of the extra hours and declined the rest.",
        stance: "engaged",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("achievement-ambition", 0.2),
        ],
        aftermath: "obligation",
      },
    ],
  },
  {
    key: "adult.work-credit",
    withheld:
      "Shared employment does not establish authorship, misattributed credit or who heard the claim. Those occurrences need records.",
    companion: "colleague",
    stakes: "notable",
    prose:
      "Something you did most of has been described upward as somebody else's, and the person who described it that way is standing next to you.",
    tensions: [
      tension(
        "achievement-ambition",
        1,
        "personal-ties",
        1,
        "Being seen to have done it, against what correcting it does to them.",
      ),
    ],
    available: (context) =>
      context.workCount > 0 && context.colleagueIds.length > 0,
    options: [
      {
        key: "correct-it",
        label: "Correct it there and then",
        description: "Say whose it was, while everyone is still in the room.",
        memory: "You corrected the claim about whose work it was.",
        witnessed: "They corrected the account in front of everyone.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "conflict:workplace",
        nudges: [
          nudge("achievement-ambition", 0.45),
          nudge("privacy-preference", -0.55),
          nudge("personal-ties", -0.3),
        ],
        aftermath: "grievance",
      },
      {
        key: "let-it-go",
        label: "Let them have it",
        description: "It is not worth the room.",
        memory: "You let the claim about whose work it was stand.",
        witnessed: null,
        stance: "withdrawn",
        relationalChange: "maintained",
        interactionKind: "experience:workplace",
        nudges: [
          nudge("privacy-preference", 0.5),
          nudge("achievement-ambition", -0.3),
        ],
        hypotheses: [
          { hypothesisKey: "style.avoids-confrontation", support: 0.8 },
          { hypothesisKey: "ties.loyalty-first", support: 0.4 },
        ],
        aftermath: null,
      },
      {
        key: "say-it-later",
        label: "Say it to them afterwards",
        description: "Have the conversation, but not in public.",
        memory:
          "You raised the credit issue privately with your colleague afterwards.",
        witnessed: "They raised it privately afterwards.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "conflict:colleague",
        nudges: [
          nudge("privacy-preference", 0.35),
          nudge("decision-style", 0.35),
          nudge("personal-ties", 0.15),
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.work-colleague-struggling",
    withheld:
      "Shared employment does not establish a colleague difficulty, a disclosure, or the player knowing about it. Those facts are missing.",
    companion: "colleague",
    stakes: "notable",
    prose:
      "Somebody you work with is not managing, and so far you are the only one who has noticed.",
    tensions: [
      tension(
        "care-obligation",
        1,
        "achievement-ambition",
        1,
        "Covering for them, against what covering costs you.",
      ),
    ],
    available: (context) =>
      context.workCount > 0 && context.colleagueIds.length > 0,
    options: [
      {
        key: "cover",
        label: "Take up the slack",
        description: "Quietly take up the slack.",
        memory:
          "You took on some of your colleague’s work without discussing it.",
        witnessed: null,
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "support:colleague",
        nudges: [
          nudge("care-obligation", 0.55),
          nudge("privacy-preference", 0.35),
        ],
        aftermath: "goodwill",
      },
      {
        key: "ask-them",
        label: "Ask them about it",
        description: "Say what you have seen, to them.",
        memory: "You asked your colleague what was going on.",
        witnessed: "They asked what was going on.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "support:colleague",
        nudges: [
          nudge("care-obligation", 0.4),
          nudge("personal-ties", 0.35),
          nudge("privacy-preference", -0.3),
        ],
        aftermath: "goodwill",
      },
      {
        key: "tell-someone",
        label: "Tell somebody who can act",
        description: "Put it where it can actually be dealt with.",
        memory: "You raised the problem with someone senior at work.",
        witnessed: "They raised it with somebody senior.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "other:referral",
        nudges: [
          nudge("institutional-trust", 0.45),
          nudge("personal-ties", -0.35),
        ],
        hypotheses: [
          { hypothesisKey: "trust.process-delivers", support: 0.6 },
          { hypothesisKey: "care.welfare-first", support: 0.5 },
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.work-offer-elsewhere",
    withheld:
      "Employment does not establish another offer, better terms or coworkers being unaware. An actual offer and the player knowledge of it are missing.",
    companion: null,
    stakes: "pressing",
    prose:
      "A better-paid job somewhere else has been mentioned to you, and nobody at work knows it was.",
    tensions: [
      tension(
        "achievement-ambition",
        1,
        "security-stability",
        1,
        "The move, against the ground you are standing on.",
      ),
      tension(
        "achievement-ambition",
        1,
        "personal-ties",
        1,
        "What it would do for you, against what it would do to everyone arranged around you.",
      ),
    ],
    available: (context) => context.workCount > 0,
    options: [
      {
        key: "go-for-it",
        label: "Go after it",
        description: "Follow it up properly.",
        memory: "You followed up on the other job offer.",
        stance: "engaged",
        nudges: [
          nudge("achievement-ambition", 0.6),
          nudge("risk-appetite", 0.45),
          nudge("security-stability", -0.35),
        ],
        aftermath: "standing",
      },
      {
        key: "stay",
        label: "Keep the job you have",
        description: "Keep the thing that already works.",
        memory: "You kept the job you had, and let the other thing pass.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.5),
          nudge("risk-appetite", -0.45),
          nudge("personal-ties", 0.25),
        ],
        aftermath: null,
      },
      {
        key: "use-it",
        label: "Use it where you are",
        description: "Take the offer to the people you already work for.",
        memory: "You brought up the other offer with your current employer.",
        stance: "engaged",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("achievement-ambition", 0.4),
          nudge("risk-appetite", 0.25),
        ],
        aftermath: "standing",
      },
      {
        key: "say-nothing",
        label: "Say nothing to anyone",
        description: "Let it pass without it becoming a conversation.",
        memory: "You let it pass without telling anybody it had happened.",
        stance: "withdrawn",
        nudges: [
          nudge("privacy-preference", 0.6),
          nudge("risk-appetite", -0.3),
        ],
        hypotheses: [
          { hypothesisKey: "style.avoids-confrontation", support: 0.7 },
          { hypothesisKey: "image.manage-exposure", support: 0.5 },
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.work-good-week",
    withheld:
      "Employment does not establish a successful week, completed work or available time. The achievements and circumstances are missing.",
    companion: null,
    stakes: "ordinary",
    prose: "The week went well. Nothing dramatic; it simply worked.",
    tensions: [],
    available: (context) => context.workCount > 0,
    options: [
      {
        key: "enjoy-it",
        label: "Take the win",
        description: "Let it be a good week.",
        memory: "You took time to enjoy the good week at work.",
        stance: "engaged",
        nudges: [nudge("achievement-ambition", 0.2)],
        aftermath: null,
      },
      {
        key: "press-on",
        label: "Push while it is going well",
        description: "Use the run rather than enjoy it.",
        memory: "You kept working through the good week.",
        stance: "engaged",
        nudges: [
          nudge("achievement-ambition", 0.4),
          nudge("risk-appetite", 0.2),
        ],
        aftermath: null,
      },
    ],
  },

  /* ------------------------------------------------------ money and home -- */
  {
    key: "adult.housing-cost-change",
    withheld:
      "Tenure and a housing payment do not establish an increase. Changed payment terms and notice to the player are missing.",
    companion: null,
    stakes: "pressing",
    prose:
      "What it costs to stay where you are is going up, and staying is now a decision rather than a default.",
    tensions: [
      tension(
        "security-stability",
        1,
        "personal-ties",
        1,
        "The place itself, against everything that is arranged around it.",
      ),
    ],
    // A tenure alone does not put a price on staying; a recorded housing
    // payment does. The gate reads both, so the scene's "what it costs" is a
    // fact the record carries rather than an assumption about the tenure.
    available: (context) =>
      context.hasHousingTenure && context.hasHousingObligation,
    options: [
      {
        key: "absorb",
        label: "Find the money",
        description: "Stay, and make the rest fit.",
        memory: "You decided to stay despite the increased housing cost.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.5),
          nudge("personal-ties", 0.25),
        ],
        aftermath: null,
      },
      {
        key: "move",
        label: "Look for somewhere else",
        description: "Take the disruption rather than the cost.",
        memory: "You started looking for somewhere else.",
        stance: "engaged",
        nudges: [
          nudge("risk-appetite", 0.4),
          nudge("security-stability", -0.45),
        ],
        aftermath: null,
      },
      {
        key: "push-back",
        label: "Push back on it",
        description: "Argue the increase rather than accept it.",
        memory: "You challenged the housing cost increase.",
        stance: "engaged",
        nudges: [
          nudge("institutional-trust", -0.3),
          nudge("privacy-preference", -0.35),
          nudge("risk-appetite", 0.25),
        ],
        aftermath: "standing",
      },
    ],
  },
  {
    key: "adult.housing-repair-standoff",
    companion: null,
    stakes: "notable",
    withheld:
      "The scene depends on a specific unrepaired defect and a recorded repair-responsible counterpart, and the world contains neither: dwellings carry no defect records and tenures name no landlord. Withheld rather than rewritten around an unnamed broken 'something'.",
    prose:
      "Something that is not yours to fix has not been fixed, and the person whose job it is has stopped replying.",
    tensions: [
      tension(
        "institutional-trust",
        1,
        "security-stability",
        1,
        "Doing it the proper way, against how long the proper way takes.",
      ),
    ],
    available: (context) => context.hasHousingTenure && context.hasDwelling,
    options: [
      {
        key: "formal",
        label: "Put it in writing",
        description: "Do it through the process that exists.",
        memory: "You put the repair request in writing.",
        stance: "engaged",
        nudges: [
          nudge("institutional-trust", 0.5),
          nudge("decision-style", 0.25),
        ],
        aftermath: "standing",
      },
      {
        key: "fix-it-yourself",
        label: "Just fix it",
        description: "Sort it and stop thinking about it.",
        memory: "You did the repair yourself.",
        stance: "engaged",
        nudges: [
          nudge("institutional-trust", -0.4),
          nudge("security-stability", 0.3),
        ],
        aftermath: null,
      },
      {
        key: "withhold",
        label: "Stop paying until it is done",
        description: "Make the silence expensive.",
        memory: "You stopped paying until the repair is done.",
        stance: "engaged",
        nudges: [
          nudge("risk-appetite", 0.5),
          nudge("institutional-trust", -0.45),
          nudge("civic-order", -0.3),
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.debt-call",
    withheld:
      "A resource obligation need not be debt and establishes no payment demand or call. Debt terms, a demand and the resources needed by the payment choices are missing.",
    companion: null,
    stakes: "pressing",
    prose:
      "Somebody wants what is owed, on a schedule that is not the one you had in mind.",
    tensions: [
      tension(
        "security-stability",
        1,
        "privacy-preference",
        1,
        "Dealing with it, against who has to find out that it exists.",
      ),
    ],
    available: (context) => context.obligationCount > 0,
    relevance: () => 0.95,
    options: [
      {
        key: "pay-it",
        label: "Pay what you can now",
        description: "Take the hit and clear it.",
        memory: "You paid what you could towards the debt.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.4),
          nudge("risk-appetite", -0.3),
        ],
        aftermath: null,
      },
      {
        key: "negotiate",
        label: "Ask for different terms",
        description: "Have the conversation rather than the payment.",
        memory: "You asked for different debt repayment terms.",
        stance: "engaged",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("privacy-preference", -0.4),
        ],
        aftermath: "obligation",
      },
      {
        key: "borrow",
        label: "Borrow it from someone",
        description: "Move the problem, and owe a person instead.",
        memory: "You borrowed the amount from somebody.",
        stance: "engaged",
        nudges: [
          nudge("personal-ties", 0.3),
          nudge("privacy-preference", -0.45),
          nudge("risk-appetite", 0.3),
        ],
        aftermath: "obligation",
      },
    ],
  },
  {
    key: "adult.unexpected-expense",
    companion: null,
    stakes: "notable",
    withheld:
      "The scene depends on a specific object having broken and on the month's arithmetic, and the world records neither objects nor monthly amounts. An unnamed broken 'something' with an unstated cost cannot be grounded.",
    prose:
      "Something has broken that has to be replaced, and it was not in the month's arithmetic.",
    tensions: [],
    available: (context) => context.householdIds.length > 0,
    options: [
      {
        key: "handle-it",
        label: "Replace it now",
        description: "Replace it and move on.",
        memory: "You replaced the broken item.",
        stance: "engaged",
        nudges: [nudge("security-stability", 0.3)],
        aftermath: null,
      },
      {
        key: "make-do",
        label: "Go without it",
        description: "Go without and see how long it lasts.",
        memory: "You went without it.",
        stance: "engaged",
        nudges: [
          nudge("risk-appetite", 0.25),
          nudge("security-stability", -0.2),
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.small-windfall",
    companion: null,
    stakes: "ordinary",
    withheld:
      "A money scene needs the amount, the source and whether anything already claims it, and the world records no receipt this could read. Money that arrives from nowhere in no amount cannot be grounded.",
    prose:
      "A small amount of money has arrived that nothing is already claiming.",
    tensions: [],
    available: (context) => context.householdIds.length > 0,
    options: [
      {
        key: "put-it-away",
        label: "Put it away",
        description: "Keep it for something later.",
        memory: "You put the money away for later.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.35),
          nudge("risk-appetite", -0.2),
        ],
        aftermath: null,
      },
      {
        key: "spend-it",
        label: "Spend it on something good",
        description: "Enjoy it while it is here.",
        memory: "You spent the money on something you wanted.",
        stance: "engaged",
        nudges: [
          nudge("risk-appetite", 0.2),
          nudge("security-stability", -0.2),
        ],
        aftermath: null,
      },
      {
        key: "give-it",
        label: "Give it to somebody who needs it",
        description: "Pass it on.",
        memory: "You gave the money to somebody who needed it.",
        stance: "engaged",
        nudges: [
          nudge("care-obligation", 0.4),
          nudge("econ-distribution", 0.2),
        ],
        aftermath: "goodwill",
      },
    ],
  },

  /* ------------------------------------------------ friends and the area -- */
  {
    key: "adult.friend-favour",
    // The request and the one thing it is for come from the record. What the
    // scene will not claim is that it is easy: nothing establishes what this
    // would cost the player, and a scene that told them it was nothing would
    // be making their decision for them.
    opportunity: "favour-request",
    companion: "other-household",
    stakes: "notable",
    prose:
      "Somebody you know has asked you for a hand with one thing, and said it matters to them.",
    tensions: [
      tension(
        "personal-ties",
        1,
        "privacy-preference",
        1,
        "Helping, against what helping puts your name to.",
      ),
    ],
    available: (context) => context.familiarPersonIds.length > 0,
    // An easy favour is easier when nothing is owed either way, and heavier
    // when it is not.
    relevance: (context) => Math.min(1, 0.5 + context.strongestDependency / 2),
    options: [
      {
        key: "do-it",
        label: "Say yes and do it",
        description: "Say yes and get on with it.",
        memory: "You agreed to do the requested favour.",
        witnessed: "They said yes straight away.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "support:friendship",
        nudges: [nudge("personal-ties", 0.5), nudge("care-obligation", 0.3)],
        aftermath: "goodwill",
      },
      {
        key: "conditions",
        label: "Do it, with conditions",
        description: "Yes, and be clear about where it stops.",
        memory: "You said yes, and said where it stopped.",
        witnessed: "They agreed, and said what they would not do.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:friendship",
        nudges: [
          nudge("decision-style", 0.45),
          nudge("privacy-preference", 0.2),
        ],
        aftermath: "obligation",
      },
      {
        key: "decline",
        label: "Tell them you cannot",
        description: "Not this one.",
        memory: "You declined the favour.",
        witnessed: "They said no.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "experience:friendship",
        nudges: [
          nudge("personal-ties", -0.4),
          nudge("privacy-preference", 0.35),
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.help-with-strings",
    withheld:
      "Dependency does not establish an offer of help or the concrete problem it would solve. The offer and terms are missing.",
    companion: "community-member",
    stakes: "pressing",
    prose:
      "Somebody who already has a good deal of say over how your week goes has offered to sort out the thing you have been unable to sort out. They have not asked for anything.",
    tensions: [
      tension(
        "security-stability",
        1,
        "privacy-preference",
        1,
        "Having the problem gone, against owing it to somebody who is already owed.",
      ),
      tension(
        "personal-ties",
        1,
        "achievement-ambition",
        1,
        "Taking the help, against being somebody who took the help.",
      ),
    ],
    // Only when the world already says this person is meaningfully relied on.
    // There is no leverage score anywhere; this reads roof, income, care,
    // belonging and money owed, on the spot, and asks which way they run.
    available: (context) => context.strongestDependency >= 0.3,
    relevance: (context) => Math.min(1, 0.5 + context.strongestDependency),
    options: [
      {
        key: "take-it",
        label: "Take the help",
        description: "Let them sort it out.",
        memory: "You accepted the offer of help.",
        witnessed: "They accepted the offer.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "support:community",
        nudges: [
          nudge("security-stability", 0.45),
          nudge("personal-ties", 0.3),
          nudge("privacy-preference", -0.35),
        ],
        aftermath: "obligation",
      },
      {
        key: "pay-for-it",
        label: "Take it, and settle up",
        description: "Accept, and insist on paying your way.",
        memory: "You accepted the help and insisted on paying for it.",
        witnessed: "They accepted, and insisted on paying their way.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:community",
        nudges: [
          nudge("privacy-preference", 0.4),
          nudge("decision-style", 0.35),
          nudge("personal-ties", -0.15),
        ],
        aftermath: null,
      },
      {
        key: "decline",
        label: "Refuse the help",
        description: "Keep the problem, and keep the ledger clear.",
        memory: "You turned the help down and kept the problem.",
        witnessed: "They turned the offer down.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "experience:community",
        nudges: [
          nudge("privacy-preference", 0.55),
          nudge("security-stability", -0.35),
          nudge("personal-ties", -0.3),
        ],
        hypotheses: [
          { hypothesisKey: "image.manage-exposure", support: 0.5 },
          { hypothesisKey: "style.avoids-confrontation", support: 0.2 },
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.friend-in-difficulty",
    // All three of the missing facts are now one record: the disclosure is a
    // private event with two people in it, and the player's knowledge of it is
    // written separately. "Rather than anybody else" is read off that — nobody
    // else is a participant and nobody else was told — rather than asserted.
    opportunity: "confidence-disclosed",
    companion: "other-household",
    stakes: "pressing",
    prose:
      "Somebody you know has got themselves into something, and they have told you rather than anybody else.",
    tensions: [
      tension(
        "personal-ties",
        1,
        "institutional-trust",
        1,
        "Keeping what you were told, against what the rest of it says you should do with it.",
      ),
    ],
    available: (context) => context.familiarPersonIds.length > 0,
    options: [
      {
        key: "keep-it",
        label: "Tell nobody else",
        description: "They told you, and that is where it stops.",
        memory: "You kept the personal matter private.",
        witnessed: null,
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "support:friendship",
        nudges: [
          nudge("personal-ties", 0.55),
          nudge("privacy-preference", 0.5),
          nudge("institutional-trust", -0.25),
        ],
        hypotheses: [
          { hypothesisKey: "ties.loyalty-first", support: 0.85 },
          { hypothesisKey: "style.avoids-confrontation", support: 0.25 },
        ],
        aftermath: "obligation",
      },
      {
        key: "push-them",
        label: "Push them to sort it",
        description: "Say you will not carry it for them.",
        memory:
          "You told them you would not carry it for them, and to go and deal with it.",
        witnessed: "They told them to go and deal with it.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "conflict:friendship",
        nudges: [
          nudge("care-obligation", 0.3),
          nudge("personal-ties", 0.15),
          nudge("privacy-preference", -0.2),
        ],
        aftermath: "obligation",
      },
      {
        key: "step-back",
        label: "Keep your distance",
        description: "This is not somewhere you can be.",
        memory:
          "You told them this was not somewhere you could be, and stepped back.",
        witnessed: "They stepped back from it.",
        stance: "withdrawn",
        relationalChange: "strained",
        interactionKind: "experience:friendship",
        nudges: [
          nudge("personal-ties", -0.45),
          nudge("privacy-preference", 0.4),
          nudge("risk-appetite", -0.3),
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.friend-good-news",
    withheld:
      "Prior interaction does not establish good news or an invitation. The actual news and invitation are missing.",
    companion: "community-member",
    stakes: "ordinary",
    prose: "Somebody you know has had a piece of luck, and wants you there.",
    tensions: [],
    available: (context) => context.familiarPersonIds.length > 0,
    options: [
      {
        key: "go",
        label: "Turn up for them",
        description: "Turn up for it.",
        memory: "You attended the celebration.",
        witnessed: "They came.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "contact:friendship",
        nudges: [nudge("personal-ties", 0.4)],
        aftermath: "goodwill",
      },
      {
        key: "send-word",
        label: "Send word instead",
        description: "Mean it from here.",
        memory: "You sent congratulations instead of going.",
        witnessed: "They sent word rather than coming.",
        stance: "withdrawn",
        relationalChange: "maintained",
        interactionKind: "contact:friendship",
        nudges: [
          nudge("privacy-preference", 0.3),
          nudge("personal-ties", -0.15),
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.local-dispute",
    withheld:
      "A posted meeting and another household do not establish a proposal or its cost to that household. The agenda item and effects are missing.",
    companion: "other-household",
    stakes: "notable",
    prose:
      "Another household here has put something on the agenda of the posted meeting that would cost you if it passed.",
    tensions: [
      tension(
        "civic-order",
        1,
        "personal-ties",
        1,
        "Settling it through the meeting, against settling it with the people themselves.",
      ),
    ],
    available: (context) =>
      context.hasPostedMeeting && context.otherHouseholdMemberIds.length > 0,
    options: [
      {
        key: "speak-at-the-meeting",
        label: "Speak against it at the meeting",
        description: "Take it to the room it was put in.",
        memory: "You spoke against the proposal at the meeting.",
        witnessed: "They spoke against it at the meeting.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "conflict:community",
        nudges: [
          nudge("civic-order", 0.35),
          nudge("privacy-preference", -0.55),
          nudge("institutional-trust", 0.3),
        ],
        aftermath: "standing",
      },
      {
        key: "talk-to-them",
        label: "Talk to them first",
        description: "Try to settle it before the meeting does.",
        memory: "You went and talked to them before the meeting could.",
        witnessed: "They came to talk before it reached the meeting.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:community",
        nudges: [nudge("decision-style", 0.5), nudge("personal-ties", 0.25)],
        aftermath: "goodwill",
      },
      {
        key: "let-it-run",
        label: "Let it run",
        description: "It may not pass, and it may not matter.",
        memory: "You stayed out of the proposal.",
        witnessed: null,
        stance: "withdrawn",
        relationalChange: "maintained",
        interactionKind: "experience:community",
        nudges: [
          nudge("privacy-preference", 0.45),
          nudge("risk-appetite", 0.25),
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.community-meeting",
    withheld:
      "A posted work item does not establish a meeting tonight, an available agenda item for these decisions or completed minutes to read. The meeting and document states needed by the choices are missing.",
    companion: null,
    stakes: "ordinary",
    prose:
      "The meeting on the calendar is tonight. Nobody has asked you to go, and the agenda is public.",
    tensions: [],
    available: (context) => context.hasPostedMeeting,
    options: [
      {
        key: "go",
        label: "Go to the meeting",
        description: "Give it the evening.",
        memory: "You went to the meeting.",
        stance: "engaged",
        nudges: [
          nudge("institutional-trust", 0.2),
          nudge("privacy-preference", -0.25),
        ],
        aftermath: null,
      },
      {
        key: "read-it-after",
        label: "Read the minutes afterwards",
        description: "Know what happened without spending the evening.",
        memory: "You read the minutes afterwards instead of going.",
        stance: "engaged",
        nudges: [
          nudge("privacy-preference", 0.3),
          nudge("institutional-trust", -0.15),
        ],
        aftermath: null,
      },
      {
        key: "skip-it",
        label: "Give it a miss",
        description: "It is an evening.",
        memory: "You skipped the meeting.",
        stance: "withdrawn",
        nudges: [nudge("privacy-preference", 0.35)],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.volunteer-ask",
    withheld:
      "A posted meeting and no civic participation do not establish a staffing shortage or a Saturday request. The organization and actual request must precede the option; joining an organization afterwards is not evidence.",
    companion: null,
    stakes: "ordinary",
    // The group the sign-up option writes is the ask's own subject, so the
    // scene names it as what it is rather than as "something local".
    prose:
      "A local volunteer group is short of hands for Saturdays, and somebody has asked for yours.",
    tensions: [],
    available: (context) =>
      context.hasPostedMeeting && context.civicParticipationCount === 0,
    options: [
      {
        key: "sign-up",
        label: "Put your name down",
        description: "Give it the Saturdays and see.",
        memory: "You signed up to volunteer.",
        stance: "engaged",
        nudges: [nudge("care-obligation", 0.35), nudge("personal-ties", 0.2)],
        aftermath: "obligation",
        writes: {
          kind: "join-community-organization",
          organizationLabel: "Local volunteer group",
          participationKind: "membership:volunteer",
          roleKind: "member:volunteer",
        },
      },
      {
        key: "once",
        label: "Help this Saturday",
        description: "This Saturday, and no undertaking beyond it.",
        memory: "You offered to help for just that Saturday.",
        stance: "engaged",
        nudges: [
          nudge("privacy-preference", 0.25),
          nudge("care-obligation", 0.2),
        ],
        aftermath: null,
      },
      {
        key: "no",
        label: "Not this time",
        description: "Keep the Saturdays.",
        memory: "You declined the volunteer request.",
        stance: "withdrawn",
        nudges: [
          nudge("privacy-preference", 0.35),
          nudge("care-obligation", -0.3),
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.community-building",
    withheld:
      "Group participation does not establish a building closure, an expiring charge or who pays. The building decision and payment terms are missing.",
    companion: null,
    stakes: "pressing",
    prose:
      "The place the group meets in is going to close. Keeping it open means keeping a charge alive that everybody was told would end this year, and the people who would pay it are not the people who use it.",
    tensions: [
      tension(
        "econ-distribution",
        1,
        "personal-ties",
        1,
        "Who ends up paying, against the place the people you know actually meet in.",
      ),
      tension(
        "security-stability",
        1,
        "econ-distribution",
        -1,
        "Keeping the thing that is there, against having said the charge would stop.",
      ),
    ],
    available: (context) => context.civicParticipationCount > 0,
    options: [
      {
        key: "keep-the-charge",
        label: "Keep the charge going",
        description: "Extend what was supposed to end.",
        memory:
          "You argued for continuing the charge that supports the building.",
        stance: "engaged",
        nudges: [
          nudge("econ-distribution", 0.5),
          nudge("security-stability", 0.35),
          nudge("institutional-trust", -0.2),
        ],
        hypotheses: [
          { hypothesisKey: "econ.redistributive-conviction", support: 0.55 },
          { hypothesisKey: "culture.continuity-matters", support: 0.6 },
        ],
        aftermath: "standing",
      },
      {
        key: "move-it",
        label: "Move somewhere cheaper",
        description: "Keep the group, lose the building.",
        memory:
          "You argued for moving somewhere cheaper and keeping the group together.",
        stance: "engaged",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("econ-distribution", -0.2),
          nudge("security-stability", -0.25),
        ],
        aftermath: null,
      },
      {
        key: "cut-something-else",
        label: "Pay for it out of something else",
        description: "Keep the building; something else goes.",
        memory:
          "You proposed cutting another expense to cover the building cost.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.4),
          nudge("privacy-preference", 0.2),
          nudge("decision-style", 0.2),
        ],
        aftermath: "grievance",
      },
      {
        key: "find-the-money",
        label: "Go and find the money",
        description: "Take it to people who might fund it, with no promises.",
        memory:
          "You argued for going to find the money instead, with no promises attached.",
        stance: "engaged",
        nudges: [
          nudge("risk-appetite", 0.45),
          nudge("achievement-ambition", 0.35),
          nudge("econ-distribution", -0.25),
        ],
        aftermath: "obligation",
      },
    ],
  },

  /* --------------------------------------------------------- and beyond -- */
  {
    key: "adult.local-issue-position",
    // A posted meeting is not a read agenda item. The opportunity writes the
    // published item and the player's knowledge of it separately, and only the
    // second is what this scene stands on. What the player makes of it is the
    // choice below, so the prose stops short of telling them they have a view.
    opportunity: "meeting-agenda-item",
    companion: null,
    stakes: "notable",
    prose:
      "You have read the agenda item in full. Nobody has asked what you make of it.",
    tensions: [
      tension(
        "privacy-preference",
        1,
        "institutional-trust",
        1,
        "Keeping your own counsel, against thinking somebody ought to say it.",
      ),
    ],
    available: (context) => context.hasPostedMeeting,
    options: [
      {
        key: "settle-on-it",
        label: "Make your mind up about it",
        description: "Decide what you actually think, for yourself.",
        memory:
          "You worked out what you actually thought about it, on your own, and told nobody.",
        stance: "engaged",
        nudges: [
          nudge("privacy-preference", 0.55),
          nudge("institutional-trust", 0.3),
          nudge("civic-order", 0.2),
        ],
        // Nothing follows from this and nothing should. A view arrived at
        // privately, that nobody heard, has nowhere to go — and the model
        // still learns from it, which is the separation this wave exists to
        // keep.
        aftermath: null,
      },
      {
        key: "leave-it-open",
        label: "Leave it open",
        description: "Decide it when it matters.",
        memory: "You left your position on the issue undecided.",
        stance: "withdrawn",
        nudges: [nudge("decision-style", 0.4), nudge("risk-appetite", -0.2)],
        aftermath: null,
      },
      {
        key: "against-your-side",
        label: "Admit you disagree with your own side",
        description: "Work out that the people you agree with are wrong here.",
        memory:
          "You worked out that the people you usually agree with had this one wrong, and kept that to yourself as well.",
        stance: "engaged",
        nudges: [
          nudge("decision-style", -0.45),
          nudge("institutional-trust", -0.2),
          nudge("privacy-preference", 0.3),
        ],
        hypotheses: [
          { hypothesisKey: "trust.record-must-be-true", support: 0.6 },
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.petition-ask",
    withheld:
      "Group participation does not establish a petition or a request to sign. The petition, request and disclosure terms are missing.",
    companion: "community-member",
    stakes: "notable",
    prose:
      "Somebody wants your name on something. It is public, it is local, and it will be read by people who know you.",
    tensions: [
      tension(
        "privacy-preference",
        1,
        "personal-ties",
        1,
        "Staying out of it, against the person asking.",
      ),
    ],
    available: (context) =>
      context.civicParticipationCount > 0 &&
      context.communityMemberIds.length > 0,
    options: [
      {
        key: "sign",
        label: "Add your name",
        description: "Put your name to it.",
        memory: "You signed the petition.",
        witnessed: "They signed it.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "commitment:community",
        nudges: [
          nudge("privacy-preference", -0.5),
          nudge("personal-ties", 0.3),
        ],
        aftermath: "standing",
      },
      {
        key: "help-quietly",
        label: "Help without signing",
        description: "Do the work, keep the name off it.",
        memory: "You did the work and kept your name off the sheet.",
        witnessed: "They helped without putting their name to it.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "support:community",
        nudges: [
          nudge("privacy-preference", 0.55),
          nudge("care-obligation", 0.25),
        ],
        hypotheses: [
          { hypothesisKey: "image.manage-exposure", support: 0.6 },
          { hypothesisKey: "style.avoids-confrontation", support: 0.5 },
        ],
        aftermath: "goodwill",
      },
      {
        key: "refuse",
        label: "Decline the petition",
        description: "Not something you will put your name to.",
        memory: "You declined to sign the petition.",
        witnessed: "They declined to sign.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "experience:community",
        nudges: [nudge("decision-style", -0.4), nudge("personal-ties", -0.35)],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.candidacy-approach",
    // The approach is a record now, made by somebody the player takes part in
    // something with. It says running for public office in those words: "stand
    // for anything" was the flagged control, and a player deciding whether to
    // put their name on a ballot has to be told that is what this is.
    opportunity: "candidacy-approach",
    companion: "community-member",
    stakes: "pressing",
    prose:
      "Somebody has asked you outright whether you would ever run for public office.",
    tensions: [
      tension(
        "achievement-ambition",
        1,
        "privacy-preference",
        1,
        "Wanting the job, against everything having your name on it would cost.",
      ),
      tension(
        "achievement-ambition",
        1,
        "personal-ties",
        1,
        "Standing, against what standing does to everybody arranged around you.",
      ),
    ],
    available: (context) =>
      context.age >= 21 && context.civicParticipationCount > 0,
    options: [
      {
        key: "say-maybe",
        label: "Say you would think about it",
        description: "Do not close it off.",
        memory: "You said you would think about running for office.",
        witnessed: "They said they would think about it.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "commitment:community",
        nudges: [
          nudge("achievement-ambition", 0.55),
          nudge("privacy-preference", -0.3),
        ],
        hypotheses: [
          { hypothesisKey: "ambition.advancement-first", support: 0.7 },
          { hypothesisKey: "duty.civic-obligation", support: 0.5 },
        ],
        aftermath: "standing",
      },
      {
        key: "say-no",
        label: "Rule it out now",
        description: "Close it off, plainly.",
        memory: "You said no, plainly.",
        witnessed: "They said no.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "experience:community",
        nudges: [
          nudge("achievement-ambition", -0.5),
          nudge("privacy-preference", 0.5),
        ],
        aftermath: null,
      },
      {
        key: "ask-what-for",
        label: "Ask what they actually want",
        description: "Find out whose idea this is before answering.",
        memory: "You asked whose idea it actually was before you answered.",
        witnessed: "They asked who wanted this.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:community",
        nudges: [
          nudge("institutional-trust", -0.25),
          nudge("decision-style", 0.4),
        ],
        aftermath: null,
      },
    ],
  },

  /* ------------------------------------------------------- after events -- */
  {
    key: "adult.incident-aftermath",
    withheld:
      "An active incident anywhere in the World does not establish local impact, recovery, or player knowledge. The affected household, recovery state and acquired knowledge are missing.",
    companion: null,
    stakes: "pressing",
    prose:
      "The worst of it is over. What is left is the part you have to do something about.",
    tensions: [
      tension(
        "care-obligation",
        1,
        "security-stability",
        1,
        "Helping with the clearing up, against getting your own back in order.",
      ),
    ],
    // Offered only because the incident engine already produced one. Nothing
    // here creates an incident, raises its likelihood, or claims a rate.
    available: (context) => context.activeIncidentCount > 0,
    relevance: () => 1,
    options: [
      {
        key: "sort-your-own",
        label: "Sort out your own first",
        description: "Get your household straight before anything else.",
        memory: "You put your own household first.",
        stance: "engaged",
        nudges: [
          nudge("security-stability", 0.5),
          nudge("care-obligation", -0.3),
        ],
        aftermath: null,
      },
      {
        key: "help-clear-up",
        label: "Help with the clearing up",
        description: "Yours can wait a day.",
        memory: "You put helping the other households first.",
        stance: "engaged",
        nudges: [nudge("care-obligation", 0.55), nudge("personal-ties", 0.3)],
        aftermath: "goodwill",
      },
      {
        key: "push-for-answers",
        label: "Ask who was supposed to have prevented it",
        description: "Turn it into a question somebody has to answer.",
        memory: "You started asking who was supposed to have stopped it.",
        stance: "engaged",
        nudges: [
          nudge("institutional-trust", -0.45),
          nudge("privacy-preference", -0.4),
          nudge("civic-order", -0.2),
        ],
        hypotheses: [
          { hypothesisKey: "trust.government-competence-doubt", support: 0.7 },
          { hypothesisKey: "style.public-pressure-works", support: 0.55 },
        ],
        aftermath: "standing",
      },
    ],
  },
  {
    key: "adult.incident-neighbour-help",
    withheld:
      "An active incident and another household do not establish comparative damage or a request for help. The impact, request and player knowledge are missing.",
    companion: "other-household",
    stakes: "notable",
    prose:
      "Another household here came off worse than yours did, and somebody is going round asking.",
    tensions: [],
    available: (context) =>
      context.activeIncidentCount > 0 &&
      context.otherHouseholdMemberIds.length > 0,
    options: [
      {
        key: "help",
        label: "Give what you can",
        description: "Time, space, or what is in the cupboard.",
        memory: "You offered what you could to help the other household.",
        witnessed: "They gave what they had.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "support:community",
        nudges: [nudge("care-obligation", 0.45), nudge("personal-ties", 0.3)],
        aftermath: "goodwill",
      },
      {
        key: "keep-yours",
        label: "Keep what you have",
        description: "You may need it.",
        memory: "You kept what you had, on the grounds that you might need it.",
        witnessed: null,
        stance: "withdrawn",
        relationalChange: "maintained",
        interactionKind: "experience:community",
        nudges: [
          nudge("security-stability", 0.4),
          nudge("care-obligation", -0.4),
        ],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.promise-comes-due",
    withheld:
      "An active player commitment does not establish that it is due or conflicts with something else. The due terms and actual conflict are missing.",
    companion: null,
    stakes: "pressing",
    prose:
      "Something you said you would do has arrived, and it is less convenient than it was when you said it.",
    tensions: [
      tension(
        "personal-ties",
        1,
        "security-stability",
        1,
        "Having said you would, against what doing it now actually costs.",
      ),
    ],
    // Only when the player actually undertook something. A promise they never
    // made cannot come due, and a commitment written into a generated
    // background is not a promise they made.
    available: (context) => context.playerMadeCommitmentCount > 0,
    relevance: () => 0.9,
    options: [
      {
        key: "keep-it",
        label: "Do it anyway",
        description: "You said you would.",
        memory: "You kept your earlier promise.",
        stance: "engaged",
        nudges: [nudge("personal-ties", 0.5), nudge("decision-style", -0.35)],
        aftermath: "goodwill",
      },
      {
        key: "renegotiate",
        label: "Ask to move it",
        description: "Say why, and offer something else.",
        memory: "You asked to move the commitment and offered an alternative.",
        stance: "engaged",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("privacy-preference", -0.25),
        ],
        aftermath: "obligation",
      },
      {
        key: "drop-it",
        label: "Leave it unsaid",
        // Was "It will probably not be raised." — a description that told the
        // player the outcome before they chose it, which is the one thing an
        // option description must never do. It says what the choice is now.
        description: "Say nothing about it, and see whether they do.",
        // "…and it was not" claimed an outcome that belongs to the callback
        // machinery, which may in fact raise it. The memory stops where the
        // player's knowledge stops.
        memory: "You did not raise the commitment.",
        stance: "withdrawn",
        nudges: [
          nudge("personal-ties", -0.45),
          nudge("privacy-preference", 0.4),
        ],
        aftermath: "grievance",
      },
    ],
  },
  {
    key: "adult.old-favour-returns",
    withheld:
      "An earlier favour-family choice may be a refusal. It does not establish help given, a new larger request or a recurrence count. The actual prior action and new request are missing.",
    companion: "community-member",
    stakes: "notable",
    prose:
      "Somebody you helped once, a long time ago and without making anything of it, has turned up needing something rather larger.",
    tensions: [
      tension(
        "personal-ties",
        1,
        "security-stability",
        1,
        "What you did once, against what it is now being read as meaning.",
      ),
    ],
    // Reachable only from something ordinary that already happened. This is
    // the callback: the earlier moment was small, was not signposted, and is
    // what makes this one possible at all.
    available: (context) =>
      context.familiarPersonIds.length > 0 &&
      (context.recallableKeys.has("adult.friend-favour") ||
        context.recallableKeys.has("adult.household-repair") ||
        context.recallableKeys.has("adult.work-colleague-struggling") ||
        context.recallableKeys.has("adult.incident-neighbour-help")),
    options: [
      {
        key: "help-again",
        label: "Help again",
        description: "It is larger, and it is still them.",
        memory: "You agreed to help with the new request.",
        witnessed: "They helped again.",
        stance: "engaged",
        relationalChange: "strengthened",
        interactionKind: "support:friendship",
        nudges: [nudge("personal-ties", 0.55), nudge("care-obligation", 0.4)],
        aftermath: "obligation",
      },
      {
        key: "name-the-difference",
        label: "Say this is a different thing",
        description: "Help, and say plainly that it is not the same favour.",
        memory: "You helped, and said plainly that it was not the same favour.",
        witnessed: "They helped, and said it was a different thing.",
        stance: "engaged",
        relationalChange: "maintained",
        interactionKind: "exchange:friendship",
        nudges: [
          nudge("decision-style", 0.45),
          nudge("privacy-preference", -0.3),
        ],
        aftermath: "obligation",
      },
      {
        key: "no",
        label: "Not for this one",
        description: "The first one did not buy this one.",
        memory: "You declined the new request.",
        witnessed: "They said no.",
        stance: "engaged",
        relationalChange: "strained",
        interactionKind: "conflict:friendship",
        nudges: [
          nudge("personal-ties", -0.4),
          nudge("security-stability", 0.3),
        ],
        aftermath: "grievance",
      },
    ],
  },

  /* -------------------------------------------------------- plain good -- */
  {
    key: "adult.ordinary-good-day",
    companion: null,
    stakes: "ordinary",
    prose:
      "The week's errands are still yours to fit in somewhere. How do you want to spend the day?",
    tensions: [],
    available: (context) => context.hasHouseholdWorkItem,
    options: [
      {
        key: "go-out",
        label: "Spend time outside",
        description: "Spend the day outside.",
        memory: "You spent the day outside.",
        stance: "engaged",
        nudges: [nudge("risk-appetite", 0.15)],
        aftermath: null,
      },
      {
        key: "get-things-done",
        label: "Get things done",
        description: "Work on your shopping and appointments.",
        memory: "You spent the day on the shopping and the appointments.",
        stance: "engaged",
        nudges: [
          nudge("achievement-ambition", 0.25),
          nudge("security-stability", 0.2),
        ],
        aftermath: null,
      },
      {
        key: "do-nothing",
        label: "Do nothing at all",
        description: "Waste it deliberately.",
        memory: "You did nothing at all with it, on purpose.",
        stance: "engaged",
        nudges: [nudge("privacy-preference", 0.25)],
        aftermath: null,
      },
    ],
  },
  {
    key: "adult.weekend-invitation",
    // The invitation, the day it is for and the fact that nobody is required
    // there are the social-occasion opportunity's own three facts. It expires
    // when the Saturday it names goes past, which the provider reads from the
    // occasion rather than from a countdown kept here.
    opportunity: "social-occasion",
    // The person who asked. They were anonymous here while the scene had no
    // record behind it; now there is one, and a goodwill that nobody is
    // recorded as holding is a goodwill that quietly goes nowhere.
    companion: "other-household",
    stakes: "ordinary",
    prose:
      "Somebody local asked you to something on Saturday. Nobody needs you there.",
    tensions: [],
    available: always,
    options: [
      {
        key: "say-yes",
        label: "Say you will come",
        description: "Go, and see who is there.",
        memory: "You told them you would come on Saturday.",
        witnessed: "They said they would come.",
        relationalChange: "strengthened",
        interactionKind: "contact:neighbourhood",
        stance: "engaged",
        nudges: [
          nudge("personal-ties", 0.3),
          nudge("privacy-preference", -0.25),
        ],
        aftermath: "goodwill",
      },
      {
        key: "stay-in",
        label: "Keep the weekend",
        description: "Keep the weekend as it is.",
        memory: "You told them you would not be coming on Saturday.",
        witnessed: "They said they would not be coming.",
        relationalChange: "maintained",
        interactionKind: "contact:neighbourhood",
        stance: "engaged",
        nudges: [nudge("privacy-preference", 0.35)],
        aftermath: null,
      },
    ],
  },
];

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
  });
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
