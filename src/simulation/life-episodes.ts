import type { AdultAftermathKind, LifeStakesTier } from "./adult-situations";
import {
  applyCharacterHistoryPlan,
  type CharacterHistoryTransition,
} from "./character-history";
import { ageOnDate, daysBetween } from "./dates";
import { createStableId } from "./ids";
import { activeIncidentsAt } from "./incidents";
import {
  activeAuthoritiesHeldByPersonAt,
  activeCareResponsibilitiesAt,
  activeChildAuthoritiesAt,
  activeEducationEnrollmentsAt,
  activeLifeCommitmentsAt,
  activeOrganizationParticipationsAt,
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  narrativeThreads,
  type NarrativeThread,
  type NarrativeThreadFamily,
  type ThreadAnchor,
} from "./narrative-threads";
import { personName } from "./people";
import { describePersonContext, introducePerson } from "./person-context";
import { personPronouns } from "./person-identity";
import type {
  DimensionNudge,
  HypothesisSupport,
  InterestTension,
} from "./player-model";
import {
  activeResourceObligationsForOwner,
  currentResourceCutoff,
} from "./resource-queries";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  LifeCommitmentKind,
  Person,
  World,
} from "./types";

/**
 * Episodes, composed rather than scripted.
 *
 * The complaint this module answers is precise: eligibility and ranking were
 * already dynamic, but the content underneath was a flat bank of situation
 * cards, so a life came out as a shuffle of independent moments. An episode
 * family is the other thing — a reusable set of stages, prerequisites, roles,
 * pressures, continuations and exits — from which a concrete beat is
 * instantiated using people, relationships, obligations, institutions and
 * prior decisions that are already in the world.
 *
 * Four rules keep that from becoming a story engine, and each is enforced by
 * the types rather than by discipline:
 *
 * *A stage is eligible or it is not, and the world decides.* Every requirement
 * is answered from a canonical record, and the records that answered it are
 * returned with the beat. There is no authored "and then" — a stage lists what
 * MAY follow it, and whether any of those is actually offered is recomputed
 * from state every time.
 *
 * *Causes stack, and stay separable.* A beat's `causalInputs` is a list, one
 * entry per satisfied requirement, each naming its own records. Collapsing a
 * situation to a single "because of X" tag is exactly the flattening that
 * makes a simulation look scripted, so the shape does not permit it.
 *
 * *No destination is authored.* Nothing here can say a chain ends in a
 * particular outcome. A family describes what states are possible and what
 * would have to be true to reach them; escalation, recovery, dormancy,
 * substitution and nothing-at-all are all reached the same way, by the
 * requirements being met or not met later.
 *
 * *The adaptive model ranks, and does nothing else.* It is not an input to any
 * function in this file. What the player model may do is choose among the
 * beats this module already found eligible, which happens in
 * `situation-selection.ts` and on the presentation surface — never here.
 */

/* -------------------------------------------------------------------------- */
/* Facts                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The conditions an episode may ask about.
 *
 * Each is answerable from a store, and answering it produces the records that
 * answered it. Nothing here is a flag written by content: a fact is true
 * because the world contains the thing, and false otherwise.
 */
export type EpisodeFactKey =
  | "household.shared"
  | "household.alone"
  | "kin.present"
  | "school.enrolled"
  | "work.employed"
  | "money.obligation"
  | "care.responsibility"
  | "civic.participation"
  | "political.participation"
  | "commitment.open"
  | "incident.active"
  | "person.recurring"
  | "thread.pressing";

/**
 * What a character is actually in a position to do.
 *
 * Distinct from a fact and from an age, and the distinction is the repair the
 * playtest asked for. A ten-year-old is in a household, so `household.shared`
 * holds; they are ten, so an age gate lets them through; and neither of those
 * says whether they are the person who decides what happens about the furnace.
 * Somebody holds parental authority over them, and that is what settles it.
 *
 * Every one of these is read off a record. None of them is a difficulty
 * setting or a permission the game grants; they are descriptions of a position
 * the world has already put the character in.
 */
export type EpisodeCapabilityKey =
  /**
   * Nobody holds parental authority over this character, so decisions about
   * the household are theirs to make rather than theirs to be told about.
   */
  | "answers-for-themselves"
  /** An active work relationship: there is a job, with hours and a place. */
  | "paid-work"
  /** They hold authority or a care responsibility over somebody else. */
  | "responsible-for-somebody"
  /** An active education enrollment: there is a school, and they attend it. */
  | "in-school";

export interface EpisodeCapability {
  readonly key: EpisodeCapabilityKey;
  readonly holds: boolean;
  readonly anchors: readonly ThreadAnchor[];
  readonly detail: string;
}

export type EpisodeCapabilities = ReadonlyMap<
  EpisodeCapabilityKey,
  EpisodeCapability
>;

export interface EpisodeFact {
  readonly key: EpisodeFactKey;
  readonly holds: boolean;
  /** The records that answered it. Empty exactly when it does not hold. */
  readonly anchors: readonly ThreadAnchor[];
  readonly detail: string;
}

export type EpisodeFacts = ReadonlyMap<EpisodeFactKey, EpisodeFact>;

/* -------------------------------------------------------------------------- */
/* Capabilities                                                                */
/* -------------------------------------------------------------------------- */

/**
 * What this character is in a position to do, and the records that say so.
 *
 * Every entry is present in the map whether it holds or not, with the detail
 * either way, so a stage that was withheld can say what withheld it rather
 * than reporting an absence.
 */
export function episodeCapabilities(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): EpisodeCapabilities {
  const capabilities = new Map<EpisodeCapabilityKey, EpisodeCapability>();
  const person = world.people[personId];
  if (!person) return capabilities;
  const cutoff = currentLifeCutoff(world);
  void asOfDate;

  function record(
    key: EpisodeCapabilityKey,
    holds: boolean,
    anchors: readonly ThreadAnchor[],
    detail: string,
  ): void {
    capabilities.set(key, { key, holds, anchors, detail });
  }

  const authorities = activeChildAuthoritiesAt(world, personId, cutoff);
  record(
    "answers-for-themselves",
    authorities.length === 0,
    authorities.map(({ authority }) => ({
      store: "childAuthorities" as const,
      recordId: authority.id,
      stableKey: authority.stableKey,
      at: authority.establishedAt,
      sequence: authority.sequence,
      role: "context" as const,
      note: "The authority record that makes somebody else responsible for them.",
    })),
    authorities.length === 0
      ? "No active parental authority over them."
      : `${authorities.length} active parental authority record(s) over them.`,
  );

  const work = activeWorkRelationshipsAt(world, personId, cutoff);
  record(
    "paid-work",
    work.length > 0,
    work.map(({ relationship }) => ({
      store: "workRelationships" as const,
      recordId: relationship.id,
      stableKey: relationship.stableKey,
      at: relationship.startedAt,
      sequence: relationship.sequence,
      role: "context" as const,
      note: "The work relationship.",
    })),
    work.length > 0
      ? `${work.length} active work relationship(s).`
      : "No active work relationship.",
  );

  const held = activeAuthoritiesHeldByPersonAt(world, personId, cutoff);
  const care = activeCareResponsibilitiesAt(world, personId, cutoff);
  record(
    "responsible-for-somebody",
    held.length > 0 || care.length > 0,
    [
      ...held.map(({ authority }) => ({
        store: "childAuthorities" as const,
        recordId: authority.id,
        stableKey: authority.stableKey,
        at: authority.establishedAt,
        sequence: authority.sequence,
        role: "context" as const,
        note: "Authority they hold over somebody else.",
      })),
      ...care.map(({ responsibility }) => ({
        store: "careResponsibilities" as const,
        recordId: responsibility.id,
        stableKey: responsibility.stableKey,
        at: responsibility.startedAt,
        sequence: responsibility.sequence,
        role: "context" as const,
        note: "A care responsibility they carry.",
      })),
    ],
    held.length > 0 || care.length > 0
      ? `${held.length} authority and ${care.length} care record(s) they hold.`
      : "Nobody is recorded as their responsibility.",
  );

  const school = activeEducationEnrollmentsAt(world, personId, cutoff);
  record(
    "in-school",
    school.length > 0,
    school.map(({ enrollment }) => ({
      store: "educationEnrollments" as const,
      recordId: enrollment.id,
      stableKey: enrollment.stableKey,
      at: enrollment.startedAt,
      sequence: enrollment.sequence,
      role: "context" as const,
      note: "The enrollment.",
    })),
    school.length > 0
      ? `${school.length} active enrollment(s).`
      : "No active enrollment.",
  );

  return capabilities;
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Who an episode needs, described by their relation to the player rather than
 * by name. Bound to a real person at composition time, or the beat is not
 * offered.
 */
export type EpisodeRoleKey =
  /** Somebody on the same household record. */
  | "household-companion"
  /**
   * The adult responsible for the player, from the authority record that says
   * so — not from "the older person in the house".
   */
  | "guardian"
  /**
   * Somebody the player lives with who is neither responsible for them nor
   * their responsibility. A sibling, a housemate, a partner.
   *
   * This role exists because `household-companion` binds everybody under the
   * roof, and for a ten-year-old that is their own parent. The playtest hit
   * exactly that: a scene written for somebody your own age offered a child
   * the job of deciding whether to report their guardian to an adult. A part
   * written for a peer must be able to say it needs one.
   */
  | "household-peer"
  /** Somebody the kinship or partnership records name. */
  | "relative"
  /**
   * Somebody this life keeps a running record with who is NOT family and does
   * not live here — a friend, in other words, established as one by the number
   * of records naming the pair rather than by a label.
   *
   * The exclusion is load-bearing. Without it the role binds whoever the world
   * has most records with, which in a young character's life is a parent, and
   * a family about drifting apart from an old friend gets told about their
   * mother.
   */
  | "familiar"
  | "colleague"
  | "community-member";

export interface EpisodeRoleBinding {
  readonly role: EpisodeRoleKey;
  readonly personId: EntityId;
  readonly personName: string;
  /**
   * The person's age at the date the bindings were taken, read off their own
   * birth record. It lets a stage require not just that somebody can play a
   * part but that they are old enough for the part to be plausible — so a
   * scenario about a sibling out on their own is not handed to a younger child.
   */
  readonly age: number;
  /** Why this person can play this part, read off the record. */
  readonly basis: string;
  readonly anchors: readonly ThreadAnchor[];
}

/* -------------------------------------------------------------------------- */
/* Requirements                                                                */
/* -------------------------------------------------------------------------- */

export type EpisodeRequirement =
  | { readonly kind: "withheld"; readonly reason: string }
  | { readonly kind: "fact"; readonly fact: EpisodeFactKey }
  | { readonly kind: "absent"; readonly fact: EpisodeFactKey }
  | { readonly kind: "age-at-least"; readonly age: number }
  | { readonly kind: "age-below"; readonly age: number }
  | { readonly kind: "role"; readonly role: EpisodeRoleKey }
  /**
   * A role that can be filled by somebody at least this old.
   *
   * The plain `role` requirement asks only that somebody can play the part.
   * This asks that somebody old enough for the part exists — the gate a
   * scenario about an independently mobile household member needs, so a young
   * sibling is never cast as one. It is satisfied only when a binding of the
   * role meets the age, and the same binding is what the copy is composed
   * around.
   */
  | {
      readonly kind: "role-age-at-least";
      readonly role: EpisodeRoleKey;
      readonly age: number;
    }
  /**
   * A role that can be filled by somebody UNDER this age.
   *
   * The exact mirror of `role-age-at-least`, and needed for the same reason
   * pointing the other way. A scene about a much younger child in the house —
   * the one who takes a thing out of your hands and cannot yet be reasoned
   * with — is only that scene if the person bound to it is actually younger.
   * Without this the part is filled by whichever household peer the world
   * happens to list first, which in a household with an older sibling casts a
   * teenager as a toddler.
   *
   * Like its mirror it reads the person's own birth record and asserts nothing
   * else about them; it is not a claim that being younger makes somebody a
   * different kind of person.
   */
  | {
      readonly kind: "role-age-below";
      readonly role: EpisodeRoleKey;
      readonly age: number;
    }
  /** Something the character is in a position to do, read off the record. */
  | {
      readonly kind: "capability";
      readonly capability: EpisodeCapabilityKey;
    }
  /**
   * Something they are deliberately NOT in a position to do.
   *
   * The mirror matters as much as the positive: a scene about being told what
   * is happening rather than deciding it needs a character who does not answer
   * for the household, and offering it to somebody who does is the same defect
   * pointing the other way.
   */
  | {
      readonly kind: "without-capability";
      readonly capability: EpisodeCapabilityKey;
    }
  /** A named earlier stage of THIS instance is on the record. */
  | { readonly kind: "after-stage"; readonly stage: string }
  | { readonly kind: "without-stage"; readonly stage: string }
  /** A named earlier stage was answered a particular way. */
  | {
      readonly kind: "after-choice";
      readonly stage: string;
      readonly option: string;
    }
  | {
      readonly kind: "without-choice";
      readonly stage: string;
      readonly option: string;
    }
  /** Time the record shows has passed since a named stage. */
  | {
      readonly kind: "days-since-stage";
      readonly stage: string;
      readonly days: number;
    };

export interface EpisodeCausalInput {
  readonly requirement: EpisodeRequirement;
  /** The records that satisfied it. Empty for a purely negative requirement. */
  readonly satisfiedBy: readonly ThreadAnchor[];
  readonly detail: string;
}

/** Why a stage was not offered. Kept for the development report, never shown. */
export interface EpisodeExclusion {
  readonly episodeKey: string;
  readonly stageKey: string;
  readonly requirement: EpisodeRequirement;
  readonly detail: string;
}

/* -------------------------------------------------------------------------- */
/* Authored shape                                                              */
/* -------------------------------------------------------------------------- */

/** Where a family's copy came from, so a reviewer can find it again. */
export interface EpisodeAuthority {
  readonly sourceDocument: string;
  readonly reference: string;
}

/** What choosing an option asks to be written beyond the record of the choice. */
export type EpisodeWrite =
  | {
      readonly kind: "take-on-commitment";
      readonly label: string;
      readonly commitmentKind: LifeCommitmentKind;
      readonly weeklyHours: readonly [number, number];
    }
  | {
      readonly kind: "join-community-organization";
      readonly organizationLabel: string;
      readonly participationKind: `${"membership" | "activity" | "leadership"}:${string}`;
      readonly roleKind: `${"member" | "participant" | "leader"}:${string}`;
    };

export interface EpisodeOption {
  readonly key: string;
  /** Short and actionable. What the player is doing, not why. */
  readonly label: string;
  /** One clause of context. Never a promise about what follows. */
  readonly description: string;
  readonly nudges: readonly DimensionNudge[];
  readonly hypotheses?: readonly HypothesisSupport[];
  /** The kind of thing this may leave behind, or null. Null must stay common. */
  readonly aftermath: AdultAftermathKind | null;
  /** The remembered sentence. Slots are substituted like the prose. */
  readonly memory: string;
  readonly writes?: EpisodeWrite | null;
}

export interface EpisodeStage {
  readonly key: string;
  /** Copy authority for a bounded stage that extends an accepted family. */
  readonly authority?: EpisodeAuthority;
  /** Every requirement must hold. An empty list means the stage may open. */
  readonly requires: readonly EpisodeRequirement[];
  /**
   * Sentences, joined with a space. Slots: `{self}`, `{place}`, `{age}`, and
   * `{role:<role-key>}` for a bound person's name.
   */
  readonly lines: readonly string[];
  /** Preserve this proposed immediate scene in the ordinary resolution event. */
  readonly recordSceneContext?: boolean;
  readonly options: readonly EpisodeOption[];
  readonly stakes: LifeStakesTier;
  readonly tensions: readonly InterestTension[];
  /**
   * Stages that MAY follow. Advisory: it documents the family's shape for a
   * reader and is not consulted when deciding eligibility, which is computed
   * from the requirements alone. A stage listed here is not promised.
   */
  readonly mayLeadTo: readonly string[];
}

/** A condition under which the whole instance stops being offered. */
export interface EpisodeExit {
  readonly key: string;
  readonly when: readonly EpisodeRequirement[];
  /** What the record says happened to it. Reported, never rendered. */
  readonly reason: string;
}

export interface EpisodeFamily {
  readonly key: string;
  readonly family: NarrativeThreadFamily;
  readonly authority: EpisodeAuthority;
  /** Roles this family may bind. A stage asks for the ones it needs. */
  readonly roles: readonly EpisodeRoleKey[];
  /** Birth-cohort restriction applied before both instance identity and casting. */
  readonly peerRoles?: readonly EpisodeRoleKey[];
  readonly stages: readonly EpisodeStage[];
  readonly exits: readonly EpisodeExit[];
}

/* -------------------------------------------------------------------------- */
/* Composed beats                                                              */
/* -------------------------------------------------------------------------- */

export interface EpisodeSceneOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface EpisodeBeat {
  readonly episodeKey: string;
  /**
   * This run of this family, in this life, with these people. Stable across
   * reads, and what later stages are matched against.
   */
  readonly instanceKey: string;
  readonly stageKey: string;
  readonly family: NarrativeThreadFamily;
  readonly prose: string;
  readonly options: readonly EpisodeSceneOption[];
  readonly bindings: readonly EpisodeRoleBinding[];
  /** One entry per satisfied requirement. Never collapsed into one cause. */
  readonly causalInputs: readonly EpisodeCausalInput[];
  readonly stakes: LifeStakesTier;
  readonly tensions: readonly InterestTension[];
  /** Stage keys of this instance already on the record, oldest first. */
  readonly priorStageKeys: readonly string[];
  /** True when at least one prior stage of this instance exists. */
  readonly continues: boolean;
}

/* -------------------------------------------------------------------------- */
/* Reading the world                                                           */
/* -------------------------------------------------------------------------- */

const EPISODE_TAG = "episode";
const STAGE_TAG = "episode-stage";
const INSTANCE_TAG = "episode-instance";

/** Facts about this life right now, each with the records that answered it. */
export function episodeFacts(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): EpisodeFacts {
  const person = world.people[personId];
  const facts = new Map<EpisodeFactKey, EpisodeFact>();
  if (!person) return facts;
  const cutoff = currentLifeCutoff(world);
  const threads = narrativeThreads(world, personId, asOfDate);

  function record(
    key: EpisodeFactKey,
    anchors: readonly ThreadAnchor[],
    detail: string,
  ): void {
    facts.set(key, {
      key,
      holds: anchors.length > 0,
      anchors,
      detail,
    });
  }

  const householdAnchors: ThreadAnchor[] = [];
  for (const entry of householdMembershipsAt(world, personId, cutoff)) {
    const others = peopleInHouseholdAt(
      world,
      entry.membership.householdId,
      cutoff,
    ).filter((id) => id !== personId);
    if (others.length === 0) continue;
    householdAnchors.push({
      store: "householdMemberships",
      recordId: entry.membership.id,
      stableKey: entry.membership.stableKey,
      at: entry.membership.startedAt,
      sequence: entry.membership.sequence,
      role: "context",
      note: `${others.length} other person(s) on the same household record.`,
    });
  }
  record(
    "household.shared",
    householdAnchors,
    "Somebody else is on the household record.",
  );

  const aloneAnchors: ThreadAnchor[] =
    householdAnchors.length === 0
      ? householdMembershipsAt(world, personId, cutoff).map((entry) => ({
          store: "householdMemberships" as const,
          recordId: entry.membership.id,
          stableKey: entry.membership.stableKey,
          at: entry.membership.startedAt,
          sequence: entry.membership.sequence,
          role: "context" as const,
          note: "A household record with nobody else resident on it.",
        }))
      : [];
  record(
    "household.alone",
    aloneAnchors,
    "A household record with nobody else on it.",
  );

  record(
    "kin.present",
    kinshipRelationshipsAt(world, personId, cutoff)
      .filter((kinship) =>
        kinship.personIds.some(
          (id) => id !== personId && world.people[id] !== undefined,
        ),
      )
      .map((kinship) => ({
        store: "kinshipRelationships" as const,
        recordId: kinship.id,
        stableKey: kinship.stableKey,
        at: kinship.establishedAt,
        sequence: kinship.sequence,
        role: "context" as const,
        note: `A kinship record of kind ${kinship.kind}.`,
      })),
    "A living relative is on the record.",
  );

  record(
    "school.enrolled",
    activeEducationEnrollmentsAt(world, personId, cutoff).map((entry) => ({
      store: "educationEnrollments" as const,
      recordId: entry.enrollment.id,
      stableKey: entry.enrollment.stableKey,
      at: entry.enrollment.startedAt,
      sequence: entry.enrollment.sequence,
      role: "context" as const,
      note: `An active enrollment in a ${entry.enrollment.programKind} program.`,
    })),
    "An active education enrollment.",
  );

  record(
    "work.employed",
    activeWorkRelationshipsAt(world, personId, cutoff).map((entry) => ({
      store: "workRelationships" as const,
      recordId: entry.relationship.id,
      stableKey: entry.relationship.stableKey,
      at: entry.relationship.startedAt,
      sequence: entry.relationship.sequence,
      role: "context" as const,
      note: `An active work relationship of kind ${entry.relationship.kind}.`,
    })),
    "An active work relationship.",
  );

  record(
    "money.obligation",
    activeResourceObligationsForOwner(
      world,
      { kind: "person", personId },
      currentResourceCutoff(world),
    ).map((obligation) => ({
      store: "resourceObligations" as const,
      recordId: obligation.id,
      stableKey: obligation.stableKey,
      at: obligation.establishedAt,
      sequence: obligation.sequence,
      role: "context" as const,
      note: `An open obligation on a ${obligation.basisKind} basis.`,
    })),
    "An open resource obligation.",
  );

  record(
    "care.responsibility",
    activeCareResponsibilitiesAt(world, personId, cutoff).map((entry) => ({
      store: "careResponsibilities" as const,
      recordId: entry.responsibility.id,
      stableKey: entry.responsibility.stableKey,
      at: entry.responsibility.startedAt,
      sequence: entry.responsibility.sequence,
      role: "context" as const,
      note: `An active care responsibility of kind ${entry.responsibility.kind}.`,
    })),
    "An active care responsibility.",
  );

  const participations = activeOrganizationParticipationsAt(
    world,
    personId,
    cutoff,
  );
  const political = participations.filter((entry) =>
    isPoliticalParticipation(entry.participation.kind),
  );
  record(
    "civic.participation",
    participations.map((entry) => ({
      store: "organizationParticipations" as const,
      recordId: entry.participation.id,
      stableKey: entry.participation.stableKey,
      at: entry.participation.startedAt,
      sequence: entry.participation.sequence,
      role: "context" as const,
      note: `Participation of kind ${entry.participation.kind}.`,
    })),
    "An active participation in a local organization.",
  );
  record(
    "political.participation",
    political.map((entry) => ({
      store: "organizationParticipations" as const,
      recordId: entry.participation.id,
      stableKey: entry.participation.stableKey,
      at: entry.participation.startedAt,
      sequence: entry.participation.sequence,
      role: "context" as const,
      note: `Participation the record itself calls ${entry.participation.kind}.`,
    })),
    "A participation whose own kind names politics.",
  );

  record(
    "commitment.open",
    activeLifeCommitmentsAt(world, personId, cutoff).map((commitment) => ({
      store: "lifeCommitments" as const,
      recordId: commitment.id,
      stableKey: commitment.stableKey,
      at: commitment.startsAt,
      sequence: commitment.sequence,
      role: "context" as const,
      note: `${commitment.label}, a ${commitment.kind} commitment.`,
    })),
    "An open life commitment.",
  );

  record(
    "incident.active",
    activeIncidentsAt(world, cutoff).map((incident) => ({
      store: "incidents" as const,
      recordId: incident.id,
      stableKey: incident.stableKey,
      at: incident.onsetAt,
      sequence: incident.sequence,
      role: "context" as const,
      note: `An active incident of kind ${incident.incidentKind}.`,
    })),
    "An active incident in this world.",
  );

  const recurring = threads.filter(
    (thread) =>
      thread.withPersonIds.length > 0 &&
      thread.unresolved &&
      thread.anchors.filter((anchor) => anchor.role !== "context").length >= 2,
  );
  record(
    "person.recurring",
    recurring.flatMap((thread) => thread.anchors.slice(0, 2)),
    "Somebody this life already has more than one record with.",
  );

  record(
    "thread.pressing",
    threads
      .filter((thread) => thread.standing === "pressing")
      .flatMap((thread) =>
        thread.anchors.filter((anchor) => anchor.role === "escalation"),
      ),
    "Something on an open thread has come due.",
  );

  return facts;
}

function isPoliticalParticipation(kind: string): boolean {
  return (
    kind.includes("political") ||
    kind.includes("campaign") ||
    kind.includes("party")
  );
}

/* -------------------------------------------------------------------------- */
/* Role binding                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Who could play each part, in a stable order.
 *
 * A role is filled by the person the record most strongly attaches to it, and
 * ties are broken by entity id so that the same world binds the same person
 * every time. Nobody is created to fill a role: an unbindable role means the
 * stage is not offered, which is the honest answer for a life that does not
 * contain that person.
 */
export function episodeRoleBindings(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly EpisodeRoleBinding[] {
  const person = world.people[personId];
  if (!person) return [];
  const cutoff = currentLifeCutoff(world);
  const bindings: EpisodeRoleBinding[] = [];
  const seen = new Set<string>();

  function bind(
    role: EpisodeRoleKey,
    candidateId: EntityId,
    basis: string,
    anchors: readonly ThreadAnchor[],
  ): void {
    if (candidateId === personId) return;
    const other = world.people[candidateId];
    if (!other) return;
    if (
      world.history.personDeaths.some((rec) => rec.personId === candidateId)
    ) {
      return;
    }
    const token = `${role}:${candidateId}`;
    if (seen.has(token)) return;
    seen.add(token);
    bindings.push({
      role,
      personId: candidateId,
      personName: personName(other),
      age: ageOnDate(other.birthDate, asOfDate),
      basis,
      anchors,
    });
  }

  // Who is responsible for whom, before anything about who lives where. A
  // part written for a peer must not be filled by a parent, and the only
  // truthful way to tell them apart is the authority record that says so.
  const guardianIds = new Set<EntityId>();
  const dependentIds = new Set<EntityId>();
  for (const { authority } of activeChildAuthoritiesAt(
    world,
    personId,
    cutoff,
  )) {
    if (authority.holder.kind !== "person") continue;
    guardianIds.add(authority.holder.personId);
    bind(
      "guardian",
      authority.holder.personId,
      `A ${authority.kind} authority record over the player.`,
      [
        {
          store: "childAuthorities",
          recordId: authority.id,
          stableKey: authority.stableKey,
          at: authority.establishedAt,
          sequence: authority.sequence,
          role: "context",
          note: "The authority record that makes them the adult responsible.",
        },
      ],
    );
  }
  for (const { authority } of activeAuthoritiesHeldByPersonAt(
    world,
    personId,
    cutoff,
  )) {
    dependentIds.add(authority.childPersonId);
  }

  for (const entry of householdMembershipsAt(world, personId, cutoff)) {
    for (const otherId of peopleInHouseholdAt(
      world,
      entry.membership.householdId,
      cutoff,
    )) {
      if (!guardianIds.has(otherId) && !dependentIds.has(otherId)) {
        bind(
          "household-peer",
          otherId,
          "Resident on the same household record, with no authority either way between them.",
          [
            {
              store: "householdMemberships",
              recordId: entry.membership.id,
              stableKey: entry.membership.stableKey,
              at: entry.membership.startedAt,
              sequence: entry.membership.sequence,
              role: "context",
              note: "The household membership that puts them under one roof.",
            },
          ],
        );
      }
      bind(
        "household-companion",
        otherId,
        "Resident on the same household record.",
        [
          {
            store: "householdMemberships",
            recordId: entry.membership.id,
            stableKey: entry.membership.stableKey,
            at: entry.membership.startedAt,
            sequence: entry.membership.sequence,
            role: "context",
            note: "The household membership that puts them under one roof.",
          },
        ],
      );
    }
  }

  for (const partnership of activePartnershipsAt(world, personId, cutoff)) {
    for (const otherId of partnership.personIds) {
      bind("household-peer", otherId, "An active partnership record.", [
        {
          store: "partnerships",
          recordId: partnership.id,
          stableKey: partnership.stableKey,
          at: partnership.startedAt,
          sequence: partnership.sequence,
          role: "context",
          note: "The partnership record.",
        },
      ]);
      bind("household-companion", otherId, "An active partnership record.", [
        {
          store: "partnerships",
          recordId: partnership.id,
          stableKey: partnership.stableKey,
          at: partnership.startedAt,
          sequence: partnership.sequence,
          role: "context",
          note: "The partnership record.",
        },
      ]);
    }
  }

  for (const kinship of kinshipRelationshipsAt(world, personId, cutoff)) {
    for (const otherId of kinship.personIds) {
      bind("relative", otherId, `A kinship record of kind ${kinship.kind}.`, [
        {
          store: "kinshipRelationships",
          recordId: kinship.id,
          stableKey: kinship.stableKey,
          at: kinship.establishedAt,
          sequence: kinship.sequence,
          role: "context",
          note: "The kinship record.",
        },
      ]);
    }
  }

  for (const entry of activeWorkRelationshipsAt(world, personId, cutoff)) {
    const organizationId = entry.relationship.organizationId;
    if (organizationId === null) continue;
    for (const other of Object.values(world.people)) {
      if (other.id === personId) continue;
      const shares = activeWorkRelationshipsAt(world, other.id, cutoff).some(
        (candidate) => candidate.relationship.organizationId === organizationId,
      );
      if (!shares) continue;
      bind("colleague", other.id, "Active work at the same organization.", [
        {
          store: "workRelationships",
          recordId: entry.relationship.id,
          stableKey: entry.relationship.stableKey,
          at: entry.relationship.startedAt,
          sequence: entry.relationship.sequence,
          role: "context",
          note: "The work relationship they share an employer through.",
        },
      ]);
    }
  }

  for (const entry of activeOrganizationParticipationsAt(
    world,
    personId,
    cutoff,
  )) {
    for (const other of Object.values(world.people)) {
      if (other.id === personId) continue;
      const shares = activeOrganizationParticipationsAt(
        world,
        other.id,
        cutoff,
      ).some(
        (candidate) =>
          candidate.participation.organizationId ===
          entry.participation.organizationId,
      );
      if (!shares) continue;
      bind(
        "community-member",
        other.id,
        "Active participation in the same organization.",
        [
          {
            store: "organizationParticipations",
            recordId: entry.participation.id,
            stableKey: entry.participation.stableKey,
            at: entry.participation.startedAt,
            sequence: entry.participation.sequence,
            role: "context",
            note: "The participation they share.",
          },
        ],
      );
    }
  }

  // Somebody this life already has a running thread with who is not family and
  // does not live here — the recurring person a later beat should prefer over
  // a stranger. Ordered by how recently the record moved, so "the friend who
  // is currently in your life" beats one last seen a decade ago, without
  // either being invented.
  const closeToHome = new Set(
    bindings
      .filter(
        (binding) =>
          binding.role === "household-companion" ||
          binding.role === "household-peer" ||
          binding.role === "guardian" ||
          binding.role === "relative",
      )
      .map((binding) => binding.personId),
  );
  for (const thread of narrativeThreads(world, personId, asOfDate)) {
    if (!thread.unresolved) continue;
    if (thread.family === "household" || thread.family === "kin") continue;
    const moving = thread.anchors.filter((anchor) => anchor.role !== "context");
    if (moving.length === 0) continue;
    for (const otherId of thread.withPersonIds) {
      if (closeToHome.has(otherId)) continue;
      bind(
        "familiar",
        otherId,
        `${moving.length} record(s) name the two of them, none of them family or household; the most recent is ${thread.lastMovedAt}.`,
        moving.slice(-2),
      );
    }
  }

  return bindings.sort((left, right) => {
    const byRole = left.role.localeCompare(right.role);
    if (byRole !== 0) return byRole;
    return left.personId.localeCompare(right.personId);
  });
}

/* -------------------------------------------------------------------------- */
/* Instances and the record of them                                            */
/* -------------------------------------------------------------------------- */

export interface PlayedEpisodeStage {
  readonly instanceKey: string;
  readonly episodeKey: string;
  readonly stageKey: string;
  readonly optionKey: string | null;
  readonly occurredAt: IsoDate;
  readonly eventId: EntityId;
  readonly sequence: number;
}

/**
 * Stages already played, read off the events they wrote.
 *
 * The tags are written by `playEpisodeOption` and by nothing else, so this is
 * the writer reading its own record rather than a heuristic over summaries.
 */
export function playedEpisodeStages(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly PlayedEpisodeStage[] {
  return world.history.events
    .filter(
      (event) =>
        event.occurredAt <= asOfDate &&
        event.involvedEntityIds.includes(personId) &&
        event.tags.some((tag) => tag.startsWith(`${INSTANCE_TAG}:`)),
    )
    .flatMap((event) => {
      const instanceKey = tagValue(event, INSTANCE_TAG);
      const episodeKey = tagValue(event, EPISODE_TAG);
      const stageKey = tagValue(event, STAGE_TAG);
      if (!instanceKey || !episodeKey || !stageKey) return [];
      const choice = event.tags.find((tag) => tag.startsWith("choice."));
      return [
        {
          instanceKey,
          episodeKey,
          stageKey,
          optionKey: choice ? choice.slice("choice.".length) : null,
          occurredAt: event.occurredAt,
          eventId: event.id,
          sequence: event.sequence,
        },
      ];
    })
    .sort((left, right) => left.sequence - right.sequence);
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) =>
    candidate.startsWith(`${prefix}:`),
  );
  return tag ? tag.slice(prefix.length + 1) : null;
}

/**
 * The instance key for a family bound to a particular cast.
 *
 * The cast is part of the identity, so the same family running with a
 * different person is a different episode rather than a continuation of the
 * first — which is what stops "your friend asked again" from being told about
 * somebody the player has never met.
 */
export function episodeInstanceKey(
  episodeKey: string,
  bindings: readonly EpisodeRoleBinding[],
  neededRoles: readonly EpisodeRoleKey[],
): string {
  const cast = neededRoles
    .map((role) => {
      const binding = bindings.find((candidate) => candidate.role === role);
      return binding ? `${role}=${binding.personId}` : `${role}=?`;
    })
    .sort()
    .join(",");
  return cast.length > 0 ? `${episodeKey}[${cast}]` : episodeKey;
}

/* -------------------------------------------------------------------------- */
/* Eligibility                                                                 */
/* -------------------------------------------------------------------------- */

export interface EpisodeEligibility {
  readonly beats: readonly EpisodeBeat[];
  /** Why each rejected stage was rejected. For the development report only. */
  readonly exclusions: readonly EpisodeExclusion[];
}

export interface EpisodeEligibilityInput {
  readonly world: World;
  readonly personId: EntityId;
  readonly families: readonly EpisodeFamily[];
  readonly asOfDate?: IsoDate;
}

/**
 * Every beat this life could be shown right now, with the records that made
 * each one possible.
 *
 * Ranking is deliberately absent. This answers "what is causally available",
 * and something else decides which of those to put in front of the player.
 */
export function eligibleEpisodeBeats(
  input: EpisodeEligibilityInput,
): EpisodeEligibility {
  const { world, personId, families } = input;
  const asOfDate = input.asOfDate ?? world.currentDate;
  const person = world.people[personId];
  if (!person) return { beats: [], exclusions: [] };

  const facts = episodeFacts(world, personId, asOfDate);
  const capabilities = episodeCapabilities(world, personId, asOfDate);
  const allBindings = episodeRoleBindings(world, personId, asOfDate);
  const played = playedEpisodeStages(world, personId, asOfDate);
  const age = ageOnDate(person.birthDate, asOfDate);

  const beats: EpisodeBeat[] = [];
  const exclusions: EpisodeExclusion[] = [];

  for (const family of families) {
    // Cohort membership is anchored to birth dates, so growing older cannot
    // change a childhood cast. Unrelated familiar adults never enter it.
    const bindings = allBindings.filter((binding) => {
      if (!family.peerRoles?.includes(binding.role)) return true;
      const other = world.people[binding.personId];
      if (!other) return false;
      const earlier =
        person.birthDate < other.birthDate ? person.birthDate : other.birthDate;
      const later =
        person.birthDate < other.birthDate ? other.birthDate : person.birthDate;
      return ageOnDate(earlier, later) < 2;
    });
    const instanceKey = episodeInstanceKey(family.key, bindings, family.roles);
    const instanceStages = played.filter(
      (entry) => entry.instanceKey === instanceKey,
    );

    // An exit closes the whole instance. Checked before any stage, because a
    // family whose subject has gone should not offer a middle chapter.
    const exit = family.exits.find((candidate) =>
      candidate.when.every(
        (requirement) =>
          checkRequirement({
            requirement,
            facts,
            capabilities,
            bindings,
            instanceStages,
            age,
            asOfDate,
          }).satisfied,
      ),
    );
    if (exit) {
      exclusions.push({
        episodeKey: family.key,
        stageKey: "*",
        requirement: exit.when[0] ?? { kind: "fact", fact: "thread.pressing" },
        detail: `Instance closed: ${exit.reason}`,
      });
      continue;
    }

    for (const stage of family.stages) {
      // A stage is played once per instance. Coming round again is what a
      // later stage is for.
      if (instanceStages.some((entry) => entry.stageKey === stage.key))
        continue;

      const causalInputs: EpisodeCausalInput[] = [];
      let blocked = false;
      for (const requirement of stage.requires) {
        const outcome = checkRequirement({
          requirement,
          facts,
          capabilities,
          bindings,
          instanceStages,
          age,
          asOfDate,
        });
        if (!outcome.satisfied) {
          exclusions.push({
            episodeKey: family.key,
            stageKey: stage.key,
            requirement,
            detail: outcome.detail,
          });
          blocked = true;
          break;
        }
        causalInputs.push({
          requirement,
          satisfiedBy: outcome.anchors,
          detail: outcome.detail,
        });
      }
      if (blocked) continue;

      const neededRoles = rolesUsedBy(stage);
      const stageBindings = neededRoles.flatMap((role) => {
        const binding = bindingForStageRole(bindings, stage, role);
        return binding ? [binding] : [];
      });
      if (stageBindings.length !== neededRoles.length) continue;

      // Persistent roles keep the existing first-binding identity. A stage's
      // age gates may select somebody else; withholding is safer than writing
      // that person's choice under an instance that later recalls another.
      // playEpisodeOption revalidates through this same eligibility boundary.
      const mismatchedCast = stageBindings.find(
        (cast) =>
          family.roles.includes(cast.role) &&
          bindings.find((binding) => binding.role === cast.role)?.personId !==
            cast.personId,
      );
      if (mismatchedCast) {
        exclusions.push({
          episodeKey: family.key,
          stageKey: stage.key,
          requirement: { kind: "role", role: mismatchedCast.role },
          detail: `The age-qualified ${mismatchedCast.role} does not match the persistent instance person.`,
        });
        continue;
      }

      beats.push({
        episodeKey: family.key,
        instanceKey,
        stageKey: stage.key,
        family: family.family,
        prose: substituteSlots(stage.lines.join(" "), {
          world,
          person,
          bindings: stageBindings,
          asOfDate,
        }),
        options: stage.options.map((option) => ({
          key: option.key,
          label: substituteSlots(option.label, {
            world,
            person,
            bindings: stageBindings,
            asOfDate,
          }),
          description: substituteSlots(option.description, {
            world,
            person,
            bindings: stageBindings,
            asOfDate,
          }),
        })),
        bindings: stageBindings,
        causalInputs,
        stakes: stage.stakes,
        tensions: stage.tensions,
        priorStageKeys: instanceStages.map((entry) => entry.stageKey),
        continues: instanceStages.length > 0,
      });
    }
  }

  return {
    beats: beats.sort((left, right) => {
      const byEpisode = left.episodeKey.localeCompare(right.episodeKey);
      if (byEpisode !== 0) return byEpisode;
      return left.stageKey.localeCompare(right.stageKey);
    }),
    exclusions,
  };
}

/**
 * The person a stage's copy is composed around, for one role.
 *
 * Age-bounded role requirements are satisfied by *a* binding that meets the
 * bound, and the copy has to be about that same person — the documented claim
 * of `role-age-at-least`, which the plain by-role lookup here quietly did not
 * honour. In a household holding both a teenager and a toddler, a stage that
 * asked for a household peer over thirteen was satisfied by the teenager and
 * then narrated about whichever peer the bindings happened to list first. The
 * mirror kind makes the same gap worse, because a scene written for a small
 * child would otherwise be handed a sibling old enough to drive.
 *
 * So the stage's own age bounds for the role are applied to the choice of
 * binding, not only to the decision to offer the stage at all. When several
 * people qualify the first still wins, which keeps selection deterministic.
 */
function bindingForStageRole(
  bindings: readonly EpisodeRoleBinding[],
  stage: EpisodeStage,
  role: EpisodeRoleKey,
): EpisodeRoleBinding | undefined {
  const atLeast = stage.requires
    .filter(
      (requirement) =>
        requirement.kind === "role-age-at-least" && requirement.role === role,
    )
    .map((requirement) => (requirement as { readonly age: number }).age);
  const below = stage.requires
    .filter(
      (requirement) =>
        requirement.kind === "role-age-below" && requirement.role === role,
    )
    .map((requirement) => (requirement as { readonly age: number }).age);
  return bindings.find(
    (candidate) =>
      candidate.role === role &&
      atLeast.every((age) => candidate.age >= age) &&
      below.every((age) => candidate.age < age),
  );
}

/** The roles a stage's copy actually names, so nothing is bound needlessly. */
function rolesUsedBy(stage: EpisodeStage): readonly EpisodeRoleKey[] {
  const roles = new Set<EpisodeRoleKey>();
  for (const requirement of stage.requires) {
    if (
      requirement.kind === "role" ||
      requirement.kind === "role-age-at-least" ||
      requirement.kind === "role-age-below"
    ) {
      roles.add(requirement.role);
    }
  }
  const text = [
    ...stage.lines,
    ...stage.options.flatMap((option) => [
      option.label,
      option.description,
      option.memory,
    ]),
  ].join(" ");
  // Every slot that names a role counts, not only `{role:}`. A stage whose
  // only mention of somebody is `{they:household-peer}` still needs that role
  // bound, and before Packet 72 it would have been composed without one and
  // thrown at substitution time.
  for (const match of text.matchAll(
    /\{(?:role|who|they|them|their|theirs|themselves|s|es|is|has|was|does):([a-z-]+)\}/g,
  )) {
    roles.add(match[1] as EpisodeRoleKey);
  }
  return [...roles].sort();
}

interface RequirementCheckInput {
  readonly requirement: EpisodeRequirement;
  readonly facts: EpisodeFacts;
  readonly capabilities: EpisodeCapabilities;
  readonly bindings: readonly EpisodeRoleBinding[];
  readonly instanceStages: readonly PlayedEpisodeStage[];
  readonly age: number;
  readonly asOfDate: IsoDate;
}

interface RequirementOutcome {
  readonly satisfied: boolean;
  readonly anchors: readonly ThreadAnchor[];
  readonly detail: string;
}

function checkRequirement(input: RequirementCheckInput): RequirementOutcome {
  const {
    requirement,
    facts,
    capabilities,
    bindings,
    instanceStages,
    age,
    asOfDate,
  } = input;
  switch (requirement.kind) {
    case "withheld":
      return { satisfied: false, anchors: [], detail: requirement.reason };
    case "fact": {
      const fact = facts.get(requirement.fact);
      return {
        satisfied: fact?.holds === true,
        anchors: fact?.anchors ?? [],
        detail:
          fact?.holds === true
            ? `${requirement.fact}: ${fact.detail}`
            : `${requirement.fact} does not hold.`,
      };
    }
    case "absent": {
      const fact = facts.get(requirement.fact);
      return {
        satisfied: fact?.holds !== true,
        anchors: [],
        detail:
          fact?.holds === true
            ? `${requirement.fact} holds, and this stage needs it not to.`
            : `${requirement.fact} does not hold, as required.`,
      };
    }
    case "age-at-least":
      return {
        satisfied: age >= requirement.age,
        anchors: [],
        detail: `Age ${age}; needs at least ${requirement.age}.`,
      };
    case "age-below":
      return {
        satisfied: age < requirement.age,
        anchors: [],
        detail: `Age ${age}; needs to be under ${requirement.age}.`,
      };
    case "role": {
      const binding = bindings.find(
        (candidate) => candidate.role === requirement.role,
      );
      return {
        satisfied: binding !== undefined,
        anchors: binding?.anchors ?? [],
        detail: binding
          ? `${requirement.role} is ${binding.personName}: ${binding.basis}`
          : `Nobody in this world can be the ${requirement.role}.`,
      };
    }
    case "role-age-at-least": {
      const binding = bindings.find(
        (candidate) =>
          candidate.role === requirement.role &&
          candidate.age >= requirement.age,
      );
      return {
        satisfied: binding !== undefined,
        anchors: binding?.anchors ?? [],
        detail: binding
          ? `${requirement.role} is ${binding.personName}, ${binding.age}, old enough (needs ${requirement.age}).`
          : `No ${requirement.role} is at least ${requirement.age}, so this moment — which needs one who is — is not offered.`,
      };
    }
    case "role-age-below": {
      const binding = bindings.find(
        (candidate) =>
          candidate.role === requirement.role &&
          candidate.age < requirement.age,
      );
      return {
        satisfied: binding !== undefined,
        anchors: binding?.anchors ?? [],
        detail: binding
          ? `${requirement.role} is ${binding.personName}, ${binding.age}, young enough (under ${requirement.age}).`
          : `No ${requirement.role} is under ${requirement.age}, so this moment — which needs one who is — is not offered.`,
      };
    }
    case "capability": {
      const capability = capabilities.get(requirement.capability);
      return {
        satisfied: capability?.holds === true,
        anchors: capability?.anchors ?? [],
        detail:
          capability?.holds === true
            ? `${requirement.capability}: ${capability.detail}`
            : `${requirement.capability} does not hold: ${
                capability?.detail ?? "nothing on the record establishes it."
              }`,
      };
    }
    case "without-capability": {
      const capability = capabilities.get(requirement.capability);
      return {
        satisfied: capability?.holds !== true,
        anchors: [],
        detail:
          capability?.holds === true
            ? `${requirement.capability} holds, and this stage is written for somebody it does not.`
            : `${requirement.capability} does not hold, as required.`,
      };
    }
    case "after-stage": {
      const entry = instanceStages.find(
        (candidate) => candidate.stageKey === requirement.stage,
      );
      return {
        satisfied: entry !== undefined,
        anchors: entry ? [stageAnchor(entry, "origin")] : [],
        detail: entry
          ? `Stage ${requirement.stage} was played on ${entry.occurredAt}.`
          : `Stage ${requirement.stage} has not been played in this run.`,
      };
    }
    case "without-stage": {
      const entry = instanceStages.find(
        (candidate) => candidate.stageKey === requirement.stage,
      );
      return {
        satisfied: entry === undefined,
        anchors: [],
        detail: entry
          ? `Stage ${requirement.stage} has already happened, and this needs it not to have.`
          : `Stage ${requirement.stage} has not happened, as required.`,
      };
    }
    case "after-choice": {
      const entry = instanceStages.find(
        (candidate) =>
          candidate.stageKey === requirement.stage &&
          candidate.optionKey === requirement.option,
      );
      return {
        satisfied: entry !== undefined,
        anchors: entry ? [stageAnchor(entry, "continuation")] : [],
        detail: entry
          ? `At ${requirement.stage} they chose ${requirement.option}, on ${entry.occurredAt}.`
          : `${requirement.option} was not the choice at ${requirement.stage}.`,
      };
    }
    case "without-choice": {
      const entry = instanceStages.find(
        (candidate) =>
          candidate.stageKey === requirement.stage &&
          candidate.optionKey === requirement.option,
      );
      return {
        satisfied: entry === undefined,
        anchors: [],
        detail: entry
          ? `${requirement.option} was the choice at ${requirement.stage}, and this needs it not to have been.`
          : `${requirement.option} was not chosen at ${requirement.stage}, as required.`,
      };
    }
    case "days-since-stage": {
      const entry = instanceStages.find(
        (candidate) => candidate.stageKey === requirement.stage,
      );
      if (!entry) {
        return {
          satisfied: false,
          anchors: [],
          detail: `Stage ${requirement.stage} has not been played, so no time has passed since it.`,
        };
      }
      const elapsed = daysBetween(entry.occurredAt, asOfDate);
      return {
        satisfied: elapsed >= requirement.days,
        anchors: [stageAnchor(entry, "continuation")],
        detail: `${elapsed} day(s) since ${requirement.stage}; needs ${requirement.days}.`,
      };
    }
  }
}

function stageAnchor(
  entry: PlayedEpisodeStage,
  role: ThreadAnchor["role"],
): ThreadAnchor {
  return {
    store: "events",
    recordId: entry.eventId,
    stableKey: null,
    at: entry.occurredAt,
    sequence: entry.sequence,
    role,
    note: `Episode ${entry.episodeKey}, stage ${entry.stageKey}${
      entry.optionKey ? `, chosen ${entry.optionKey}` : ""
    }.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Prose composition                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Slots that resolve against a bound person's pronouns.
 *
 * Deliberately no capitalised forms. A sentence that starts with a pronoun
 * would need one, and authored copy is expected to start with a name instead —
 * which reads better anyway, and keeps the substitution from having to know
 * about sentence position.
 */
const PRONOUN_SLOTS: ReadonlySet<string> = new Set([
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "s",
  "es",
  "is",
  "has",
  "was",
  "does",
]);

interface SlotContext {
  readonly world: World;
  readonly person: Person;
  readonly bindings: readonly EpisodeRoleBinding[];
  readonly asOfDate: IsoDate;
}

/**
 * Substitutes the named slots, and only the named slots.
 *
 * An unfilled slot is an authoring error rather than a runtime surprise: the
 * substitution throws, so a family whose copy names a role its requirements do
 * not bind fails in a test rather than reaching a player as `{role:friend}`.
 *
 * The pronoun and relationship slots are Packet 72's. The playtest read a
 * scene that named Maya in the narration and then offered "Ask them where
 * they've been" as a button — a sentence with no antecedent in it, sitting
 * next to one that had a name. Authored copy can now say who somebody is and
 * refer to them the way the record says, so the two agree:
 *
 *   `{role:household-peer}`  Aiden Spears
 *   `{who:household-peer}`   Aiden Spears, your older brother
 *   `{they:household-peer}`  he      `{them:...}` him
 *   `{their:household-peer}` his     `{theirs:...}` his
 *
 * Everything comes from canonical records. Where the record does not say, the
 * pronoun slots produce they/them for that person and keep producing it, so a
 * line never mixes a guess with a fact.
 */
export function substituteSlots(text: string, context: SlotContext): string {
  function bindingFor(detail: unknown): EpisodeRoleBinding {
    const binding = context.bindings.find(
      (candidate) => candidate.role === detail,
    );
    if (!binding) {
      throw new Error(
        `Episode copy names the role ${String(detail)}, which this beat did not bind.`,
      );
    }
    return binding;
  }

  return text.replace(/\{([a-z]+)(?::([a-z-]+))?\}/g, (match, slot, detail) => {
    if (slot === "self") return personName(context.person);
    if (slot === "age") {
      return String(ageOnDate(context.person.birthDate, context.asOfDate));
    }
    if (slot === "place") {
      const place = lifePlaceByJurisdictionId(
        context.person.homeJurisdictionId,
      );
      return place?.displayName ?? "town";
    }
    if (slot === "role") return bindingFor(detail).personName;
    if (slot === "who") {
      const binding = bindingFor(detail);
      const described = describePersonContext(
        context.world,
        context.person.id,
        binding.personId,
        context.asOfDate,
      );
      return described ? introducePerson(described) : binding.personName;
    }
    if (PRONOUN_SLOTS.has(slot as string)) {
      const binding = bindingFor(detail);
      const pronouns = personPronouns(context.world.people[binding.personId]);
      switch (slot) {
        case "they":
          return pronouns.subject;
        case "them":
          return pronouns.object;
        case "their":
          return pronouns.possessive;
        case "theirs":
          return pronouns.possessivePronoun;
        case "themselves":
          return pronouns.reflexive;
        // Verb agreement. The reason the pronoun set is a closed vocabulary
        // rather than three strings: "he asks" and "they ask" are different
        // sentences, and a game that substitutes the pronoun without the verb
        // writes one of them wrong every time.
        case "s":
          return pronouns.pluralVerb ? "" : "s";
        case "es":
          return pronouns.pluralVerb ? "" : "es";
        case "is":
          return pronouns.pluralVerb ? "are" : "is";
        case "has":
          return pronouns.pluralVerb ? "have" : "has";
        case "was":
          return pronouns.pluralVerb ? "were" : "was";
        case "does":
          return pronouns.pluralVerb ? "do" : "does";
        default:
          return pronouns.subject;
      }
    }
    throw new Error(`Episode copy uses an unknown slot: ${match}`);
  });
}

/* -------------------------------------------------------------------------- */
/* Playing a beat                                                              */
/* -------------------------------------------------------------------------- */

export interface PlayEpisodeOptionInput {
  readonly personId: EntityId;
  readonly beat: EpisodeBeat;
  readonly optionKey: string;
  readonly families: readonly EpisodeFamily[];
}

export interface PlayedEpisodeResult {
  readonly world: World;
  readonly eventId: EntityId;
  readonly option: EpisodeOption;
}

const EPISODE_PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "life-episode-v1",
};

/**
 * Writes the choice as ordinary canonical records.
 *
 * The event carries three tags nothing else writes — the family, the stage and
 * the instance — and those tags are the entire mechanism by which a later
 * stage knows this one happened. No separate episode store exists, so there is
 * nothing to fall out of step with history.
 */
export function playEpisodeOption(
  world: World,
  input: PlayEpisodeOptionInput,
): PlayedEpisodeResult {
  const family = input.families.find(
    (candidate) => candidate.key === input.beat.episodeKey,
  );
  const stage = family?.stages.find(
    (candidate) => candidate.key === input.beat.stageKey,
  );
  const option = stage?.options.find(
    (candidate) => candidate.key === input.optionKey,
  );
  if (!family || !stage || !option) {
    throw new Error("That option is not part of this episode beat.");
  }
  const currentBeat = eligibleEpisodeBeats({
    world,
    personId: input.personId,
    families: input.families,
  }).beats.find(
    (beat) =>
      beat.episodeKey === input.beat.episodeKey &&
      beat.stageKey === input.beat.stageKey &&
      beat.instanceKey === input.beat.instanceKey,
  );
  if (
    !currentBeat ||
    JSON.stringify(currentBeat) !== JSON.stringify(input.beat)
  ) {
    throw new Error("This episode beat is no longer eligible.");
  }
  const person = world.people[input.personId];
  if (!person) throw new Error("This character is not in the world.");
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;

  const ordinal = playedEpisodeStages(world, input.personId).filter(
    (entry) => entry.instanceKey === input.beat.instanceKey,
  ).length;
  const stableKey = `life-episode:${input.personId}:${input.beat.instanceKey}:${ordinal}:${stage.key}`;
  const eventStableKey = `${stableKey}:event`;
  const memory = substituteSlots(option.memory, {
    world,
    person,
    bindings: input.beat.bindings,
    asOfDate: world.currentDate,
  });
  const companions = input.beat.bindings.map((binding) => binding.personId);

  const transitions: CharacterHistoryTransition[] = [
    ...writeTransitions(
      world,
      input.personId,
      option,
      stableKey,
      jurisdictionId,
    ),
    {
      kind: "event",
      input: {
        stableKey: eventStableKey,
        type: `life.episode.${family.family}`,
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId,
        involvedEntityIds: [input.personId, ...companions],
        participants: [
          {
            personId: input.personId,
            role: "agency:actor",
            detail: option.label,
          },
          ...companions.map((companionId) => ({
            personId: companionId,
            role: "presence:participant" as const,
            detail: "Present for it.",
          })),
        ],
        personFactConstraints: [],
        visibility: "limited",
        tags: [
          `${EPISODE_TAG}:${family.key}`,
          `${STAGE_TAG}:${stage.key}`,
          `${INSTANCE_TAG}:${input.beat.instanceKey}`,
          `choice.${option.key}`,
          `thread.${family.family}`,
        ],
        summary: memory,
        context: {
          location: jurisdictionId
            ? {
                jurisdictionId,
                label: "Life context",
                setting: null,
              }
            : null,
          socialContext: family.key,
          pressure: stage.recordSceneContext ? input.beat.prose : null,
          choice: option.label,
          motivation: null,
          immediateReaction: null,
        },
      },
    },
    {
      kind: "knowledge",
      input: {
        stableKey: `${stableKey}:knowledge:${input.personId}`,
        personId: input.personId,
        eventStableKey,
        learnedAt: world.currentDate,
        believedSummary: memory,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      },
    },
    {
      kind: "memory",
      input: {
        stableKey: `${stableKey}:memory:${input.personId}`,
        personId: input.personId,
        eventStableKey,
        formedAt: world.currentDate,
        rememberedSummary: memory,
        interpretation: memory,
        strength: stage.stakes === "ordinary" ? "faint" : "moderate",
        relevanceTags: [
          `${EPISODE_TAG}:${family.key}`,
          `${INSTANCE_TAG}:${input.beat.instanceKey}`,
          `thread.${family.family}`,
        ],
        supersedesMemoryId: null,
      },
    },
    ...companions.map((companionId) => ({
      kind: "interaction" as const,
      input: {
        stableKey: `${stableKey}:interaction:${companionId}`,
        personIds: [input.personId, companionId] as readonly [
          EntityId,
          EntityId,
        ],
        eventStableKey,
        occurredAt: world.currentDate,
        // What passed between them, described as what it was: time spent on
        // the same thing. Whether it strengthened or strained anything is not
        // this writer's to claim, so the change is the neutral one.
        kind: "experience:shared" as const,
        change: "maintained" as const,
        significance: "minor" as const,
        summary: memory,
        tags: [
          `${EPISODE_TAG}:${family.key}`,
          `${INSTANCE_TAG}:${input.beat.instanceKey}`,
        ],
      },
    })),
  ];

  const applied = applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "played",
    personId: input.personId,
    transitions,
  });
  const eventId = applied.eventIds[eventStableKey];
  if (eventId === undefined) {
    throw new Error("The episode beat did not write its own event.");
  }
  return { world: applied.world, eventId, option };
}

function writeTransitions(
  world: World,
  personId: EntityId,
  option: EpisodeOption,
  stableKey: string,
  jurisdictionId: EntityId | null,
): readonly CharacterHistoryTransition[] {
  const write = option.writes ?? null;
  if (write === null) return [];
  if (write.kind === "take-on-commitment") {
    return [
      {
        kind: "commitment",
        input: {
          stableKey: `${stableKey}:commitment`,
          personId,
          startsAt: world.currentDate,
          endsAt: null,
          kind: write.commitmentKind,
          label: write.label,
          timeDemand: {
            expectedWeekly: {
              minimumHours: write.weeklyHours[0],
              maximumHours: write.weeklyHours[1],
            },
            attention: "moderate",
            concurrency: "partly-concurrent",
            scheduleRigidity: "mixed",
            interruptibility: "interruptible",
            locationJurisdictionId: jurisdictionId,
          },
          provenance: EPISODE_PROVENANCE,
        },
      },
    ];
  }
  const organizationKey = `${stableKey}:organization`;
  // The id the organization writer will derive for that stable key, computed
  // the same way here so the participation can name it in the same plan.
  const organizationId = createStableId(
    "organization",
    `${world.id}:${organizationKey}`,
  );
  return [
    {
      kind: "organization",
      input: {
        stableKey: organizationKey,
        formedAt: world.currentDate,
        provenance: EPISODE_PROVENANCE,
        initialProfile: {
          name: write.organizationLabel,
          classification: "community:voluntary",
          locationJurisdictionId: jurisdictionId,
        },
      },
    },
    {
      kind: "participation",
      input: {
        stableKey: `${stableKey}:participation`,
        personId,
        organizationId,
        startedAt: world.currentDate,
        kind: write.participationKind,
        roleKind: write.roleKind,
        context: null,
        provenance: EPISODE_PROVENANCE,
      },
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Reporting                                                                   */
/* -------------------------------------------------------------------------- */

export interface EpisodeInstanceSummary {
  readonly instanceKey: string;
  readonly episodeKey: string;
  readonly stageKeys: readonly string[];
  readonly optionKeys: readonly (string | null)[];
  readonly firstPlayedAt: IsoDate;
  readonly lastPlayedAt: IsoDate;
}

/** Every episode this life has actually run, for proofs and the dev report. */
export function episodeInstances(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly EpisodeInstanceSummary[] {
  const grouped = new Map<string, PlayedEpisodeStage[]>();
  for (const entry of playedEpisodeStages(world, personId, asOfDate)) {
    const existing = grouped.get(entry.instanceKey);
    if (existing) existing.push(entry);
    else grouped.set(entry.instanceKey, [entry]);
  }
  return [...grouped.entries()]
    .map(([instanceKey, entries]) => ({
      instanceKey,
      episodeKey: entries[0]!.episodeKey,
      stageKeys: entries.map((entry) => entry.stageKey),
      optionKeys: entries.map((entry) => entry.optionKey),
      firstPlayedAt: entries[0]!.occurredAt,
      lastPlayedAt: entries.at(-1)!.occurredAt,
    }))
    .sort((left, right) => left.instanceKey.localeCompare(right.instanceKey));
}

/** Which thread an episode beat belongs to, when the life already has one. */
export function threadForEpisodeBeat(
  threads: readonly NarrativeThread[],
  beat: EpisodeBeat,
): NarrativeThread | null {
  const castIds = new Set(beat.bindings.map((binding) => binding.personId));
  if (castIds.size === 0) return null;
  return (
    threads.find(
      (thread) =>
        thread.family === beat.family &&
        thread.withPersonIds.some((id) => castIds.has(id)),
    ) ?? null
  );
}
