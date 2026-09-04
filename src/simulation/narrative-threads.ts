import { addDays, ageOnDate, daysBetween } from "./dates";
import {
  activeCareResponsibilitiesAt,
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
import { personName } from "./people";
import {
  activeResourceObligationsForOwner,
  currentResourceCutoff,
} from "./resource-queries";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  Person,
  World,
} from "./types";

/**
 * The threads a life is currently carrying, read off the record.
 *
 * A life told as a stack of independent cards is the defect this module
 * exists to answer. What it adds is not a second history and not a story
 * engine: it is an index. Every thread here is a grouping of records that are
 * ALREADY in `world.history`, and every grouping is justified by an identity
 * those records explicitly share — the same counterpart person named in the
 * participants, the same organization on the work relationship, the same
 * commitment the due item was scheduled against, the same event id in a
 * scheduled item's provenance.
 *
 * That restriction is the whole design, and it is worth stating as a rule
 * because the tempting version of this module violates it on the first day:
 *
 *   Two records being near each other in time is not a link.
 *
 * Nothing here draws an edge from adjacency, from a shared tag prefix that any
 * two situations of a kind would share, or from "these both happened in
 * March". Where the repository does not record a link, this module reports no
 * link, and a thread that cannot be justified is not emitted. The anchors on
 * every thread name the store, the record id and the stable key they came
 * from, so a reader — or the development causal inspector, which owns the
 * inspection surface and is deliberately not rebuilt here — can check each one
 * against the record rather than believing this file.
 *
 * A thread is also allowed to be over. Most of them end without a payoff:
 * a job ends, somebody moves out, a commitment lapses, an argument stops
 * mattering. `standing` says which of those happened and `standingReason` says
 * why in a sentence that names the canonical reason rather than a mood.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * What a thread is about.
 *
 * Deliberately coarse. These are the domains the world already keeps records
 * in, so each family maps onto stores rather than onto a genre of story.
 */
export type NarrativeThreadFamily =
  | "household"
  | "kin"
  | "companionship"
  | "school"
  | "work"
  | "money"
  | "care"
  | "civic"
  | "political"
  | "promise"
  | "incident";

/** The canonical stores a thread anchor may come from. */
export type ThreadAnchorStore =
  | "events"
  | "memories"
  | "relationshipInteractions"
  | "lifeCommitments"
  | "organizationParticipations"
  | "workRelationships"
  | "householdMemberships"
  | "kinshipRelationships"
  | "partnerships"
  | "careResponsibilities"
  | "educationEnrollments"
  | "resourceObligations"
  | "futureDueItems"
  | "incidents";

/**
 * Why this record is in this thread.
 *
 * `origin` is the record that made the thread exist at all. `continuation` is
 * a later record that names the same identity. `escalation` is a continuation
 * the record itself marks as harder — a due item coming round, an obligation
 * going into arrears. `resolution` is a record that ends the subject.
 * `context` is a standing fact the thread is about but which did not move.
 */
export type ThreadAnchorRole =
  "origin" | "continuation" | "escalation" | "resolution" | "context";

export interface ThreadAnchor {
  readonly store: ThreadAnchorStore;
  readonly recordId: EntityId;
  /** Null where the store does not carry one; never invented. */
  readonly stableKey: string | null;
  readonly at: IsoDate;
  /**
   * History sequence where the store carries one, else null. Present so a
   * later reader can order anchors the way the record orders them rather than
   * by date alone, which ties for anything that happened on the same day.
   */
  readonly sequence: number | null;
  readonly role: ThreadAnchorRole;
  /**
   * What this record contributes, said plainly. Not prose for a player: this
   * is the sentence a developer reads next to the record id.
   */
  readonly note: string;
}

/**
 * How the identity linking a thread's anchors is established.
 *
 * Emitted so that nothing has to trust the grouping. A reader with the world
 * in hand can re-derive the same set from this one field.
 */
export type ThreadLinkBasis =
  /** Every anchor names this person among its participants or subjects. */
  | { readonly kind: "shared-person"; readonly personId: EntityId }
  /** Every anchor names this organization. */
  | { readonly kind: "shared-organization"; readonly organizationId: EntityId }
  /** Every anchor is the record with this id, or names it explicitly. */
  | { readonly kind: "shared-record"; readonly recordId: EntityId }
  /** Every anchor's stable key begins with this prefix, written by one writer. */
  | { readonly kind: "shared-stable-key"; readonly prefix: string };

export type ThreadStanding =
  /** One anchor so far. Something started; nothing has followed yet. */
  | "opening"
  /** More than one anchor, and the most recent is recent. */
  | "running"
  /** The record says something is due, owed, overdue or unclosed. */
  | "pressing"
  /** The subject still exists, but nothing has moved for a long while. */
  | "dormant"
  /** A record closed it. */
  | "settled"
  /** The thing it was about is gone: the job ended, the person left. */
  | "moot";

/** After this long with no anchor, a running thread is called dormant. */
export const THREAD_DORMANT_AFTER_DAYS = 400;

export interface NarrativeThread {
  /**
   * Stable across reads of the same world, and derived from the identity that
   * links the anchors rather than from their order, so a thread keeps its key
   * when a new anchor arrives.
   */
  readonly key: string;
  readonly family: NarrativeThreadFamily;
  readonly subjectPersonId: EntityId;
  /** Everyone else the record names in this thread, in canonical id order. */
  readonly withPersonIds: readonly EntityId[];
  readonly organizationId: EntityId | null;
  /** Composed from canonical names. Never a placeholder when a name exists. */
  readonly title: string;
  readonly standing: ThreadStanding;
  /** Why it has that standing, in the record's own terms. */
  readonly standingReason: string;
  readonly linkBasis: ThreadLinkBasis;
  readonly openedAt: IsoDate;
  readonly lastMovedAt: IsoDate;
  readonly daysSinceMoved: number;
  /** Anchors oldest first. */
  readonly anchors: readonly ThreadAnchor[];
  /** Whether the record leaves something open. */
  readonly unresolved: boolean;
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every thread this life is carrying, most recently moved first.
 *
 * Pure, and a projection: calling it twice on the same world gives the same
 * answer, and calling it never changes anything.
 */
export function narrativeThreads(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly NarrativeThread[] {
  const person = world.people[personId];
  if (!person) return [];

  const threads: NarrativeThread[] = [
    ...personThreads(world, person, asOfDate),
    ...workThreads(world, person, asOfDate),
    ...schoolThreads(world, person, asOfDate),
    ...civicThreads(world, person, asOfDate),
    ...commitmentThreads(world, person, asOfDate),
    ...obligationThreads(world, person, asOfDate),
    ...incidentThreads(world, person, asOfDate),
  ];

  return threads.sort((left, right) => {
    const byDate = right.lastMovedAt.localeCompare(left.lastMovedAt);
    if (byDate !== 0) return byDate;
    return left.key.localeCompare(right.key);
  });
}

/** The threads that are still live, in the order a narrator should prefer them. */
export function liveNarrativeThreads(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly NarrativeThread[] {
  const rank: Readonly<Record<ThreadStanding, number>> = {
    pressing: 0,
    running: 1,
    opening: 2,
    dormant: 3,
    settled: 4,
    moot: 5,
  };
  return narrativeThreads(world, personId, asOfDate)
    .filter(
      (thread) => thread.standing !== "settled" && thread.standing !== "moot",
    )
    .sort((left, right) => {
      const byStanding = rank[left.standing] - rank[right.standing];
      if (byStanding !== 0) return byStanding;
      const byDate = right.lastMovedAt.localeCompare(left.lastMovedAt);
      if (byDate !== 0) return byDate;
      return left.key.localeCompare(right.key);
    });
}

/** One thread by key, or null. */
export function narrativeThread(
  world: World,
  personId: EntityId,
  key: string,
  asOfDate: IsoDate = world.currentDate,
): NarrativeThread | null {
  return (
    narrativeThreads(world, personId, asOfDate).find(
      (thread) => thread.key === key,
    ) ?? null
  );
}

/* -------------------------------------------------------------------------- */
/* Person-keyed threads                                                        */
/* -------------------------------------------------------------------------- */

/**
 * One thread per other person this life has a record with.
 *
 * The link is that every anchor names both people. An event qualifies when
 * both ids are among its participants or involved entities; a relationship
 * interaction when it is between the two; a household, kinship, partnership or
 * care record when it names the pair. None of that is inference: each is a
 * field the record already carries.
 */
function personThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const cutoff = currentLifeCutoff(world);
  const personId = person.id;
  const byPerson = new Map<EntityId, ThreadAnchor[]>();
  const family = new Map<EntityId, NarrativeThreadFamily>();
  const settled = new Map<EntityId, string>();

  function add(otherId: EntityId, anchor: ThreadAnchor): void {
    if (otherId === personId || !world.people[otherId]) return;
    const existing = byPerson.get(otherId);
    if (existing) existing.push(anchor);
    else byPerson.set(otherId, [anchor]);
  }

  function claimFamily(
    otherId: EntityId,
    candidate: NarrativeThreadFamily,
  ): void {
    // Household beats kin beats companionship, because it is the strongest
    // thing the record actually says about the pair.
    const order: readonly NarrativeThreadFamily[] = [
      "companionship",
      "kin",
      "household",
      "care",
    ];
    const current = family.get(otherId);
    if (
      current === undefined ||
      order.indexOf(candidate) > order.indexOf(current)
    ) {
      family.set(otherId, candidate);
    }
  }

  for (const entry of householdMembershipsAt(world, personId, cutoff)) {
    const membership = entry.membership;
    for (const otherId of peopleInHouseholdAt(
      world,
      membership.householdId,
      cutoff,
    )) {
      if (otherId === personId) continue;
      claimFamily(otherId, "household");
      add(otherId, {
        store: "householdMemberships",
        recordId: membership.id,
        stableKey: membership.stableKey,
        at: membership.startedAt,
        sequence: membership.sequence,
        role: "context",
        note: "They live in the same household, on the membership record.",
      });
    }
  }

  for (const kinship of kinshipRelationshipsAt(world, personId, cutoff)) {
    const otherId = kinship.personIds.find((id) => id !== personId) ?? null;
    if (otherId === null) continue;
    claimFamily(otherId, "kin");
    add(otherId, {
      store: "kinshipRelationships",
      recordId: kinship.id,
      stableKey: kinship.stableKey,
      at: kinship.establishedAt,
      sequence: kinship.sequence,
      role: "context",
      note: `The record calls the relation ${kinship.kind}.`,
    });
  }

  for (const partnership of activePartnershipsAt(world, personId, cutoff)) {
    const otherId = partnership.personIds.find((id) => id !== personId) ?? null;
    if (otherId === null) continue;
    claimFamily(otherId, "household");
    add(otherId, {
      store: "partnerships",
      recordId: partnership.id,
      stableKey: partnership.stableKey,
      at: partnership.startedAt,
      sequence: partnership.sequence,
      role: "context",
      note: "A partnership record names the two of them.",
    });
  }

  for (const care of activeCareResponsibilitiesAt(world, personId, cutoff)) {
    const responsibility = care.responsibility;
    const otherId =
      responsibility.caregiverPersonId === personId
        ? responsibility.recipientPersonId
        : responsibility.caregiverPersonId;
    claimFamily(otherId, "care");
    add(otherId, {
      store: "careResponsibilities",
      recordId: responsibility.id,
      stableKey: responsibility.stableKey,
      at: responsibility.startedAt,
      sequence: responsibility.sequence,
      role: "context",
      note: "A care responsibility record names the two of them.",
    });
  }

  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    const pair = interaction.personIds.find((id) => id !== personId) ?? null;
    if (pair === null) continue;
    if (interaction.occurredAt > asOfDate) continue;
    claimFamily(pair, "companionship");
    add(pair, {
      store: "relationshipInteractions",
      recordId: interaction.id,
      stableKey: interaction.stableKey,
      at: interaction.occurredAt,
      sequence: interaction.sequence,
      role: "continuation",
      note: `A recorded interaction of kind ${interaction.kind}: ${interaction.summary}`,
    });
  }

  for (const event of eventsInvolving(world, personId, asOfDate)) {
    for (const otherId of otherPeopleIn(event, personId)) {
      claimFamily(otherId, "companionship");
      add(otherId, {
        store: "events",
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: anchorRoleForEvent(event),
        note: `Both are named on the event: ${event.summary}`,
      });
      if (isDepartureEvent(event)) {
        settled.set(otherId, event.summary);
      }
    }
  }

  const threads: NarrativeThread[] = [];
  for (const [otherId, anchors] of byPerson) {
    // A pair whose only record is a standing fact — they live in the same
    // house, they are related — is not yet a thread. Nothing has happened
    // between them, and claiming otherwise would put a story where the record
    // has a household.
    if (!anchors.some((anchor) => anchor.role !== "context")) continue;
    const other = world.people[otherId];
    if (!other) continue;
    const kind = family.get(otherId) ?? "companionship";
    const closing = settled.get(otherId) ?? null;
    threads.push(
      buildThread({
        world,
        personId,
        family: kind,
        key: `person:${kind}:${otherId}`,
        title: `${personName(other)}`,
        withPersonIds: [otherId],
        organizationId: null,
        linkBasis: { kind: "shared-person", personId: otherId },
        anchors,
        asOfDate,
        forcedStanding: closing === null ? null : "moot",
        forcedReason:
          closing === null ? null : `The record closes it: ${closing}`,
      }),
    );
  }
  return threads;
}

/* -------------------------------------------------------------------------- */
/* Organization-keyed threads                                                  */
/* -------------------------------------------------------------------------- */

function workThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const cutoff = currentLifeCutoff(world);
  const active = activeWorkRelationshipsAt(world, person.id, cutoff);
  const threads: NarrativeThread[] = [];
  for (const entry of active) {
    const relationship = entry.relationship;
    // Self-employment and unattached work carry no organization, so there is
    // no shared identity to group later records by. Rather than fall back on
    // "these both mention work", which is the adjacency rule this file
    // refuses, such a relationship contributes no thread.
    const organizationId = relationship.organizationId;
    if (organizationId === null) continue;
    const anchors: ThreadAnchor[] = [
      {
        store: "workRelationships",
        recordId: relationship.id,
        stableKey: relationship.stableKey,
        at: relationship.startedAt,
        sequence: relationship.sequence,
        role: "origin",
        note: "The work relationship itself.",
      },
    ];
    for (const event of eventsInvolving(world, person.id, asOfDate)) {
      if (!event.involvedEntityIds.includes(organizationId)) continue;
      anchors.push({
        store: "events",
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: anchorRoleForEvent(event),
        note: `The event names the same organization: ${event.summary}`,
      });
    }
    const profile = organizationLabel(world, organizationId);
    threads.push(
      buildThread({
        world,
        personId: person.id,
        family: "work",
        key: `work:${relationship.id}`,
        title: profile ?? "Work",
        withPersonIds: [],
        organizationId,
        linkBasis: {
          kind: "shared-organization",
          organizationId,
        },
        anchors,
        asOfDate,
        forcedStanding: null,
        forcedReason: null,
      }),
    );
  }
  return threads;
}

function schoolThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const cutoff = currentLifeCutoff(world);
  return activeEducationEnrollmentsAt(world, person.id, cutoff).map((entry) => {
    const enrollment = entry.enrollment;
    const anchors: ThreadAnchor[] = [
      {
        store: "educationEnrollments",
        recordId: enrollment.id,
        stableKey: enrollment.stableKey,
        at: enrollment.startedAt,
        sequence: enrollment.sequence,
        role: "origin",
        note: "The enrollment record itself.",
      },
    ];
    for (const event of eventsInvolving(world, person.id, asOfDate)) {
      if (!event.involvedEntityIds.includes(enrollment.organizationId))
        continue;
      anchors.push({
        store: "events",
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: anchorRoleForEvent(event),
        note: `The event names the same school: ${event.summary}`,
      });
    }
    return buildThread({
      world,
      personId: person.id,
      family: "school",
      key: `school:${enrollment.id}`,
      title: organizationLabel(world, enrollment.organizationId) ?? "School",
      withPersonIds: [],
      organizationId: enrollment.organizationId,
      linkBasis: {
        kind: "shared-organization",
        organizationId: enrollment.organizationId,
      },
      anchors,
      asOfDate,
      forcedStanding: null,
      forcedReason: null,
    });
  });
}

function civicThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const cutoff = currentLifeCutoff(world);
  return activeOrganizationParticipationsAt(world, person.id, cutoff).map(
    (entry) => {
      const participation = entry.participation;
      const anchors: ThreadAnchor[] = [
        {
          store: "organizationParticipations",
          recordId: participation.id,
          stableKey: participation.stableKey,
          at: participation.startedAt,
          sequence: participation.sequence,
          role: "origin",
          note: `Participation of kind ${participation.kind}.`,
        },
      ];
      for (const event of eventsInvolving(world, person.id, asOfDate)) {
        if (!event.involvedEntityIds.includes(participation.organizationId)) {
          continue;
        }
        anchors.push({
          store: "events",
          recordId: event.id,
          stableKey: event.stableKey,
          at: event.occurredAt,
          sequence: event.sequence,
          role: anchorRoleForEvent(event),
          note: `The event names the same organization: ${event.summary}`,
        });
      }
      // A participation whose kind or role names politics is a political
      // thread; anything else civic. Read off the record's own vocabulary
      // rather than guessed from the label a generator wrote.
      const political =
        participation.kind.includes("political") ||
        participation.kind.includes("campaign") ||
        participation.kind.includes("party");
      return buildThread({
        world,
        personId: person.id,
        family: political ? "political" : "civic",
        key: `civic:${participation.id}`,
        title:
          organizationLabel(world, participation.organizationId) ??
          "Something in the neighbourhood",
        withPersonIds: [],
        organizationId: participation.organizationId,
        linkBasis: {
          kind: "shared-organization",
          organizationId: participation.organizationId,
        },
        anchors,
        asOfDate,
        forcedStanding: null,
        forcedReason: null,
      });
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Record-keyed threads                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A promise, and whatever the record says has happened to it since.
 *
 * The link here is the strongest one in the file: a scheduled callback names
 * its originating event in `provenance.sourceEntityIds`, and the commitment
 * carries the stable key the situation wrote it under. Nothing is matched by
 * time.
 */
function commitmentThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const cutoff = currentLifeCutoff(world);
  const threads: NarrativeThread[] = [];
  for (const commitment of activeLifeCommitmentsAt(world, person.id, cutoff)) {
    const prefix = commitmentPrefix(commitment.stableKey);
    const anchors: ThreadAnchor[] = [
      {
        store: "lifeCommitments",
        recordId: commitment.id,
        stableKey: commitment.stableKey,
        at: commitment.startsAt,
        sequence: commitment.sequence,
        role: "origin",
        note: `${commitment.label} — a commitment of kind ${commitment.kind}.`,
      },
    ];
    for (const event of eventsInvolving(world, person.id, asOfDate)) {
      if (!event.stableKey.startsWith(prefix)) continue;
      anchors.push({
        store: "events",
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: anchorRoleForEvent(event),
        note: `Written under the same stable key: ${event.summary}`,
      });
    }
    for (const due of world.history.futureDueItems) {
      if (!due.stableKey.startsWith(prefix)) continue;
      anchors.push({
        store: "futureDueItems",
        recordId: due.id,
        stableKey: due.stableKey,
        at: due.dueAt,
        sequence: due.sequence,
        role: due.dueAt <= asOfDate ? "escalation" : "context",
        note:
          due.dueAt <= asOfDate
            ? "A scheduled item on this commitment has come due."
            : `A scheduled item falls due on ${due.dueAt}.`,
      });
    }
    threads.push(
      buildThread({
        world,
        personId: person.id,
        family: "promise",
        key: `commitment:${commitment.id}`,
        title: commitment.label,
        withPersonIds: [],
        organizationId: null,
        linkBasis: { kind: "shared-stable-key", prefix },
        anchors,
        asOfDate,
        forcedStanding: null,
        forcedReason: null,
      }),
    );
  }

  // Callbacks scheduled by `life-callbacks.ts` name their originating event
  // explicitly. Each is a thread in its own right when it is not already
  // carried by a commitment above: something was decided, and the world put a
  // date on whether it comes back.
  const carried = new Set(
    threads.flatMap((thread) =>
      thread.anchors.map((anchor) => anchor.recordId),
    ),
  );
  for (const due of world.history.futureDueItems) {
    if (due.transitionKey !== "life:callback") continue;
    if (!due.entityIds.includes(person.id)) continue;
    if (carried.has(due.id)) continue;
    const originId =
      due.provenance.kind === "simulated"
        ? (due.provenance.sourceEntityIds[0] ?? null)
        : null;
    const origin = originId
      ? (world.history.events.find((event) => event.id === originId) ?? null)
      : null;
    if (!origin) continue;
    const anchors: ThreadAnchor[] = [
      {
        store: "events",
        recordId: origin.id,
        stableKey: origin.stableKey,
        at: origin.occurredAt,
        sequence: origin.sequence,
        role: "origin",
        note: `What was decided: ${origin.summary}`,
      },
      {
        store: "futureDueItems",
        recordId: due.id,
        stableKey: due.stableKey,
        at: due.dueAt,
        sequence: due.sequence,
        role: due.dueAt <= asOfDate ? "escalation" : "context",
        note:
          due.dueAt <= asOfDate
            ? "The scheduled follow-up has come due."
            : `Scheduled to come round on ${due.dueAt}; its provenance names the event above.`,
      },
    ];
    const counterpartIds = otherPeopleIn(origin, person.id);
    threads.push(
      buildThread({
        world,
        personId: person.id,
        family: "promise",
        key: `callback:${due.id}`,
        title:
          counterpartIds
            .map((id) => world.people[id])
            .filter((candidate): candidate is Person => candidate !== undefined)
            .map((candidate) => personName(candidate))
            .join(" and ") || "Something decided earlier",
        withPersonIds: counterpartIds,
        organizationId: null,
        linkBasis: { kind: "shared-record", recordId: origin.id },
        anchors,
        asOfDate,
        forcedStanding: null,
        forcedReason: null,
      }),
    );
  }
  return threads;
}

function obligationThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const cutoff = currentResourceCutoff(world);
  return activeResourceObligationsForOwner(
    world,
    { kind: "person", personId: person.id },
    cutoff,
  ).map((obligation) => {
    const anchors: ThreadAnchor[] = [
      {
        store: "resourceObligations",
        recordId: obligation.id,
        stableKey: obligation.stableKey,
        at: obligation.establishedAt,
        sequence: obligation.sequence,
        role: "origin",
        note: `An obligation on a ${obligation.basisKind} basis.`,
      },
    ];
    for (const event of eventsInvolving(world, person.id, asOfDate)) {
      if (!event.involvedEntityIds.includes(obligation.id)) continue;
      anchors.push({
        store: "events",
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: anchorRoleForEvent(event),
        note: `The event names the obligation: ${event.summary}`,
      });
    }
    return buildThread({
      world,
      personId: person.id,
      family: "money",
      key: `obligation:${obligation.id}`,
      title: "Money owed",
      withPersonIds: [],
      organizationId: null,
      linkBasis: { kind: "shared-record", recordId: obligation.id },
      anchors,
      asOfDate,
      forcedStanding: null,
      forcedReason: null,
    });
  });
}

function incidentThreads(
  world: World,
  person: Person,
  asOfDate: IsoDate,
): readonly NarrativeThread[] {
  const threads: NarrativeThread[] = [];
  for (const incident of world.history.incidents) {
    const events = eventsInvolving(world, person.id, asOfDate).filter((event) =>
      event.involvedEntityIds.includes(incident.id),
    );
    if (events.length === 0) continue;
    const anchors: ThreadAnchor[] = [
      {
        store: "incidents",
        recordId: incident.id,
        stableKey: incident.stableKey,
        at: incident.onsetAt,
        sequence: incident.sequence,
        role: "origin",
        note: `An incident of kind ${incident.incidentKind}.`,
      },
      ...events.map((event) => ({
        store: "events" as const,
        recordId: event.id,
        stableKey: event.stableKey,
        at: event.occurredAt,
        sequence: event.sequence,
        role: anchorRoleForEvent(event),
        note: `The event names the incident: ${event.summary}`,
      })),
    ];
    threads.push(
      buildThread({
        world,
        personId: person.id,
        family: "incident",
        key: `incident:${incident.id}`,
        title: "What happened here",
        withPersonIds: [],
        organizationId: null,
        linkBasis: { kind: "shared-record", recordId: incident.id },
        anchors,
        asOfDate,
        forcedStanding: null,
        forcedReason: null,
      }),
    );
  }
  return threads;
}

/* -------------------------------------------------------------------------- */
/* Shared construction                                                         */
/* -------------------------------------------------------------------------- */

interface BuildThreadInput {
  readonly world: World;
  readonly personId: EntityId;
  readonly family: NarrativeThreadFamily;
  readonly key: string;
  readonly title: string;
  readonly withPersonIds: readonly EntityId[];
  readonly organizationId: EntityId | null;
  readonly linkBasis: ThreadLinkBasis;
  readonly anchors: readonly ThreadAnchor[];
  readonly asOfDate: IsoDate;
  readonly forcedStanding: ThreadStanding | null;
  readonly forcedReason: string | null;
}

function buildThread(input: BuildThreadInput): NarrativeThread {
  const anchors = [...input.anchors].sort(compareAnchors);
  const moving = anchors.filter((anchor) => anchor.role !== "context");
  const openedAt = anchors[0]?.at ?? input.asOfDate;
  const lastMovedAt = moving.at(-1)?.at ?? openedAt;
  const daysSinceMoved = Math.max(0, daysBetween(lastMovedAt, input.asOfDate));
  const due = anchors.some((anchor) => anchor.role === "escalation");
  const resolved = anchors.some((anchor) => anchor.role === "resolution");

  let standing: ThreadStanding;
  let standingReason: string;
  if (input.forcedStanding !== null) {
    standing = input.forcedStanding;
    standingReason = input.forcedReason ?? "The record closes it.";
  } else if (resolved) {
    standing = "settled";
    standingReason = "A record on this thread closes it.";
  } else if (due) {
    standing = "pressing";
    standingReason = "Something on this thread has come due and is unanswered.";
  } else if (moving.length <= 1) {
    standing = "opening";
    standingReason = "One record so far. Nothing has followed it yet.";
  } else if (daysSinceMoved > THREAD_DORMANT_AFTER_DAYS) {
    standing = "dormant";
    standingReason = `Nothing has moved on it since ${lastMovedAt}, and the subject is still there.`;
  } else {
    standing = "running";
    standingReason = `${moving.length} records name it, most recently on ${lastMovedAt}.`;
  }

  return {
    key: input.key,
    family: input.family,
    subjectPersonId: input.personId,
    withPersonIds: [...input.withPersonIds].sort(),
    organizationId: input.organizationId,
    title: input.title,
    standing,
    standingReason,
    linkBasis: input.linkBasis,
    openedAt,
    lastMovedAt,
    daysSinceMoved,
    anchors,
    unresolved: standing !== "settled" && standing !== "moot",
  };
}

function compareAnchors(left: ThreadAnchor, right: ThreadAnchor): number {
  const byDate = left.at.localeCompare(right.at);
  if (byDate !== 0) return byDate;
  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;
  if (leftSequence !== rightSequence) return leftSequence - rightSequence;
  return left.recordId.localeCompare(right.recordId);
}

/* -------------------------------------------------------------------------- */
/* Record reading helpers                                                      */
/* -------------------------------------------------------------------------- */

function eventsInvolving(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate,
): readonly HistoricalEvent[] {
  return world.history.events
    .filter(
      (event) =>
        event.occurredAt <= asOfDate &&
        (event.involvedEntityIds.includes(personId) ||
          event.participants.some(
            (participant) => participant.personId === personId,
          )),
    )
    .sort((left, right) => left.sequence - right.sequence);
}

function otherPeopleIn(
  event: HistoricalEvent,
  personId: EntityId,
): readonly EntityId[] {
  const ids = new Set<EntityId>();
  for (const participant of event.participants) {
    if (participant.personId !== personId) ids.add(participant.personId);
  }
  return [...ids].sort();
}

/**
 * What an event contributes to a thread, read off the event.
 *
 * Only the callback transition and the tags a writer explicitly sets are
 * consulted. An event is never called an escalation because it happened to be
 * the third one.
 */
function anchorRoleForEvent(event: HistoricalEvent): ThreadAnchorRole {
  if (event.tags.includes("life.callback")) return "escalation";
  if (isDepartureEvent(event)) return "resolution";
  return "continuation";
}

/** Events whose own tags say a relationship or a role ended. */
function isDepartureEvent(event: HistoricalEvent): boolean {
  return event.tags.some(
    (tag) =>
      tag === "life.relationship-ended" ||
      tag === "life.moved-away" ||
      tag === "life.person-died",
  );
}

function organizationLabel(
  world: World,
  organizationId: EntityId,
): string | null {
  const profiles = world.history.organizationProfiles
    .filter((profile) => profile.organizationId === organizationId)
    .sort((left, right) => left.sequence - right.sequence);
  return profiles.at(-1)?.name ?? null;
}

/**
 * The stable-key prefix a commitment and its follow-ups share.
 *
 * Commitments written by the life surfaces carry keys shaped
 * `<writer>:<person>:<ordinal>:<situation>:commitment`, and the situation's own
 * event and its callback share every segment before the last. Taking the
 * prefix is therefore reading the writer's own naming rather than guessing:
 * where a key does not have that shape the whole key is used, which links the
 * commitment to itself and to nothing else.
 */
function commitmentPrefix(stableKey: string): string {
  const marker = ":commitment";
  return stableKey.endsWith(marker)
    ? stableKey.slice(0, -marker.length)
    : stableKey;
}

/* -------------------------------------------------------------------------- */
/* Summaries                                                                   */
/* -------------------------------------------------------------------------- */

export interface ThreadPresence {
  readonly total: number;
  readonly live: number;
  readonly pressing: number;
  readonly dormant: number;
  readonly settled: number;
  readonly families: readonly NarrativeThreadFamily[];
  readonly recurringPersonIds: readonly EntityId[];
}

/**
 * What the life currently has running, in numbers.
 *
 * Used by the play-proof fixtures and the development calibration report. Not
 * shown to a player: a count of open threads is a diagnostic, and a player who
 * could see it would be reading the machine rather than the life.
 */
export function threadPresence(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): ThreadPresence {
  const threads = narrativeThreads(world, personId, asOfDate);
  const recurring = new Set<EntityId>();
  for (const thread of threads) {
    const moving = thread.anchors.filter((anchor) => anchor.role !== "context");
    if (moving.length < 2) continue;
    for (const id of thread.withPersonIds) recurring.add(id);
  }
  return {
    total: threads.length,
    live: threads.filter((thread) => thread.unresolved).length,
    pressing: threads.filter((thread) => thread.standing === "pressing").length,
    dormant: threads.filter((thread) => thread.standing === "dormant").length,
    settled: threads.filter((thread) => thread.standing === "settled").length,
    families: [...new Set(threads.map((thread) => thread.family))].sort(),
    recurringPersonIds: [...recurring].sort(),
  };
}

/** How old the subject was when a thread opened, for retrospective surfaces. */
export function threadOpenedAtAge(
  world: World,
  thread: NarrativeThread,
): number | null {
  const person = world.people[thread.subjectPersonId];
  if (!person) return null;
  return ageOnDate(person.birthDate, thread.openedAt);
}

/** The date a dormant thread would stop being called running, for tests. */
export function threadDormantFrom(thread: NarrativeThread): IsoDate {
  return addDays(thread.lastMovedAt, THREAD_DORMANT_AFTER_DAYS + 1);
}
