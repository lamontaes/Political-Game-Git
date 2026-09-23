import { proseDate } from "./prose-dates";
import {
  ageOnDate,
  candidacyEligibility,
  candidacyPackForJurisdiction,
  personName,
} from "../simulation";
import type { EntityId, GoalStateRecord, World } from "../simulation";
import {
  activePartnershipsAt,
  kinshipRelationshipsAt,
} from "../simulation/life-queries";
import { createMindProvenance, recordGoalState } from "../simulation/mind";
import { latestGoalStatesForPerson } from "../simulation/queries";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { campaignForCandidate, campaignState } from "../simulation";
import { availablePlayerConversations } from "./player-conversation";

/**
 * Private aims (CRUNCH46 P2).
 *
 * A goal is something the player's character privately means to do: run for
 * office, get back in touch with someone, pursue a relationship with an adult
 * they know, or follow a civic matter. It is an ordinary `GoalStateRecord`,
 * held by that person alone. Nobody else learns of it unless the character
 * acts on it, and setting one announces nothing.
 *
 * There is no quest score. A goal's projection lists the concrete things the
 * world actually offers toward it right now — an office the character is
 * eligible to file for, a conversation that person is reachable in — and says
 * plainly when it offers nothing.
 */

export const PEOPLE_GOAL_VERSION = "people-goal-v1";

export const PERSONAL_GOAL_FAMILIES = [
  "seek-office",
  "reconnect",
  "adult-relationship",
  "civic-issue",
] as const;
export type PersonalGoalFamily = (typeof PERSONAL_GOAL_FAMILIES)[number];

export type PersonalGoalStatus = "active" | "paused" | "abandoned" | "achieved";

const FAMILY_LABEL: Readonly<Record<PersonalGoalFamily, string>> = {
  "seek-office": "Run for office",
  reconnect: "Get back in touch",
  "adult-relationship": "Pursue a relationship",
  "civic-issue": "Follow a public matter",
};

/** How long without contact before someone counts as out of touch. */
const OUT_OF_TOUCH_DAYS = 365;

function controlled(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function goalKey(family: PersonalGoalFamily, target: EntityId | null): string {
  return `${PEOPLE_GOAL_VERSION}:${family}:${target ?? "any"}`;
}

function familyOf(record: GoalStateRecord): PersonalGoalFamily | null {
  const [version, family] = record.goalKey.split(":");
  return version === PEOPLE_GOAL_VERSION &&
    (PERSONAL_GOAL_FAMILIES as readonly string[]).includes(family ?? "")
    ? (family as PersonalGoalFamily)
    : null;
}

function statusOf(record: GoalStateRecord): PersonalGoalStatus {
  switch (record.status) {
    case "active":
      return "active";
    case "completed":
      return "achieved";
    case "abandoned":
      return "abandoned";
    default:
      // `proposed` after having been active is how a pause is recorded: the
      // aim is still held, and not being pursued now.
      return "paused";
  }
}

function objectiveFor(
  world: World,
  family: PersonalGoalFamily,
  target: EntityId | null,
): string {
  const name =
    target && world.people[target] ? personName(world.people[target]!) : null;
  switch (family) {
    case "seek-office":
      return "Run for public office.";
    case "reconnect":
      return `Get back in touch with ${name}.`;
    case "adult-relationship":
      return `See whether a relationship with ${name} could work.`;
    case "civic-issue": {
      const event = world.history.events.find((entry) => entry.id === target);
      return `Follow what happens with: ${event?.summary ?? "a public matter"}`;
    }
  }
}

/** People the character knows but has not been in touch with for a year. */
function outOfTouch(world: World, personId: EntityId): readonly EntityId[] {
  const lastContact = new Map<EntityId, string>();
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    const other = interaction.personIds.find((id) => id !== personId)!;
    const seen = lastContact.get(other);
    if (!seen || seen < interaction.occurredAt) {
      lastContact.set(other, interaction.occurredAt);
    }
  }
  const cutoff = shiftDays(world.currentDate, -OUT_OF_TOUCH_DAYS);
  return [...lastContact.entries()]
    .filter(([other, date]) => date < cutoff && alive(world, other))
    .map(([other]) => other)
    .sort();
}

/**
 * Adults the character has actually met, outside the family, both unpartnered.
 *
 * Somebody the character has not spoken to in over a year is deliberately not
 * here. They are a `reconnect` target instead, and they were appearing under
 * both families at once — "Get back in touch with them" and "Pursue a
 * relationship with them" offered side by side about a person the character has
 * not seen in years. That reads as the game not knowing who these people are,
 * and it is most visible on the first day, when every seeded acquaintance is
 * out of touch by construction. The precedence is the honest one rather than a
 * tie-break: getting back in touch is what comes first, and the relationship
 * aim becomes offerable once contact has actually resumed.
 */
function metUnpartneredAdults(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const person = world.people[personId]!;
  if (ageOnDate(person.birthDate, world.currentDate) < 18) return [];
  if (activePartnershipsAt(world, personId).length > 0) return [];
  const kin = new Set(
    kinshipRelationshipsAt(world, personId).flatMap((entry) => entry.personIds),
  );
  const met = new Set<EntityId>();
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    met.add(interaction.personIds.find((id) => id !== personId)!);
  }
  return [...met]
    .filter((other) => {
      const candidate = world.people[other];
      return (
        candidate !== undefined &&
        !kin.has(other) &&
        alive(world, other) &&
        ageOnDate(candidate.birthDate, world.currentDate) >= 18 &&
        activePartnershipsAt(world, other).length === 0
      );
    })
    .sort();
}

/** Of those, the ones a relationship aim may actually be set about today. */
function possiblePartners(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const stale = new Set(outOfTouch(world, personId));
  return metUnpartneredAdults(world, personId).filter(
    (other) => !stale.has(other),
  );
}

/** And the ones held back only because contact has lapsed. Said, not hidden. */
function partnersOutOfTouch(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const stale = new Set(outOfTouch(world, personId));
  return metUnpartneredAdults(world, personId).filter((other) =>
    stale.has(other),
  );
}

/** Public matters this person actually knows about. */
function knownPublicMatters(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const known = new Set(
    world.history.knowledge
      .filter((entry) => entry.personId === personId)
      .map((entry) => entry.eventId),
  );
  return world.history.events
    .filter(
      (event) =>
        event.visibility === "public" &&
        known.has(event.id) &&
        !event.type.startsWith("conversation."),
    )
    .map((event) => event.id)
    .slice(-12);
}

/**
 * The offices the game actually knows about where this character lives.
 *
 * Read at call time rather than captured, because which jurisdictions have an
 * accepted pack changes as sourced research lands, and an aim that baked in
 * today's coverage would go stale silently.
 */
function officesKnownHere(world: World, personId: EntityId) {
  const person = world.people[personId]!;
  return candidacyPackForJurisdiction(person.homeJurisdictionId)?.offices ?? [];
}

/**
 * Why this character cannot stand for anything here, in the candidacy rules'
 * own words. Empty means at least one office here is open to them today.
 *
 * The sentences are not written here. They come back from `candidacyEligibility`
 * as `CandidacyBlock` reasons, which already distinguish a state the game has
 * never read from a city whose council it has never read from the game's own
 * adult rule — and already refuse to borrow another jurisdiction's rules to
 * cover the gap. Asking with an empty office key is how that module is asked
 * "is there anything at all to stand for here", and it is the same question the
 * campaign surface asks when it has no offices to assess.
 */
function seekOfficeRefusals(
  world: World,
  personId: EntityId,
): readonly string[] {
  const person = world.people[personId]!;
  const jurisdictionId = person.homeJurisdictionId;
  const offices = officesKnownHere(world, personId);
  const assessments = (
    offices.length > 0 ? offices.map((office) => office.officeKey) : [""]
  ).map((officeKey) =>
    candidacyEligibility(world, {
      personId,
      jurisdictionId,
      officeKey,
      alreadyACandidate: false,
    }),
  );
  if (assessments.some((assessment) => assessment.eligible)) return [];
  return [
    ...new Set(
      assessments.flatMap((assessment) =>
        assessment.blocks.map((block) => block.reason),
      ),
    ),
  ];
}

function alive(world: World, personId: EntityId): boolean {
  return isPersonAliveAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}

function shiftDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

export interface GoalTargetChoice {
  readonly targetEntityId: EntityId | null;
  readonly label: string;
}

export interface GoalFamilyChoice {
  readonly family: PersonalGoalFamily;
  readonly label: string;
  /** Who or what the aim can be about; empty when nothing fits right now. */
  readonly targets: readonly GoalTargetChoice[];
  readonly unavailableReason: string | null;
}

export interface GoalOpportunity {
  readonly kind: "file-for-office" | "talk" | "campaign" | "read-news";
  readonly label: string;
  readonly personId: EntityId | null;
  readonly officeKey: string | null;
  readonly subject: string | null;
}

export interface PersonalGoalView {
  readonly goalId: EntityId;
  readonly family: PersonalGoalFamily;
  readonly label: string;
  readonly objective: string;
  readonly status: PersonalGoalStatus;
  readonly since: string;
  readonly targetEntityId: EntityId | null;
  /** What the world offers toward it now. Empty is a real answer. */
  readonly opportunities: readonly GoalOpportunity[];
  /**
   * Why it offers nothing, when it offers nothing. Empty otherwise.
   *
   * An empty opportunity list is a real answer, and an unexplained one is not:
   * a player holding "Run for office" with nothing under it cannot tell whether
   * they are too young, have not lived here long enough, or live somewhere the
   * game has read no elected office at all. These are the candidacy rules' own
   * sentences, not a restatement of them.
   */
  readonly obstacles: readonly string[];
  /** Records that show progress, e.g. a filing. */
  readonly progress: readonly string[];
}

export interface PersonalGoalsProjection {
  readonly goals: readonly PersonalGoalView[];
  readonly choices: readonly GoalFamilyChoice[];
}

/** What this character privately aims at, and what they could aim at. Pure. */
export function projectPersonalGoals(
  world: World,
  personId: EntityId,
): PersonalGoalsProjection {
  const records = latestGoalStatesForPerson(world, personId).filter(
    (record) => familyOf(record) !== null,
  );
  const goals = records.map((record): PersonalGoalView => {
    const family = familyOf(record)!;
    const opportunities =
      record.status === "active"
        ? opportunitiesFor(world, personId, family, record.targetEntityId)
        : [];
    return {
      goalId: record.goalId,
      family,
      label: FAMILY_LABEL[family],
      objective: record.objective,
      status: statusOf(record),
      since: record.createdAt,
      targetEntityId: record.targetEntityId,
      opportunities,
      obstacles:
        opportunities.length === 0 && record.status === "active"
          ? obstaclesFor(world, personId, family)
          : [],
      progress: progressFor(world, personId, family, record),
    };
  });
  const held = new Set(
    goals
      .filter((goal) => goal.status === "active" || goal.status === "paused")
      .map((goal) => goalKey(goal.family, goal.targetEntityId)),
  );
  const choices = PERSONAL_GOAL_FAMILIES.map((family): GoalFamilyChoice => {
    const targets = targetsFor(world, personId, family).filter(
      (target) => !held.has(goalKey(family, target.targetEntityId)),
    );
    return {
      family,
      label: FAMILY_LABEL[family],
      targets,
      unavailableReason:
        targets.length > 0 ? null : unavailableReason(world, personId, family),
    };
  });
  return { goals, choices };
}

function targetsFor(
  world: World,
  personId: EntityId,
  family: PersonalGoalFamily,
): readonly GoalTargetChoice[] {
  switch (family) {
    case "seek-office":
      // Offered when the game knows of an office here to mean to stand for —
      // not when the character could file today. Meaning to run before you are
      // old enough, or before you have lived here long enough, is an ordinary
      // private aim and the game should let it be held. What it must not do is
      // offer the aim where it knows of no elected office at all, because the
      // offers list is built from the same packs and would stay empty forever.
      return ageOnDate(world.people[personId]!.birthDate, world.currentDate) >=
        18 && officesKnownHere(world, personId).length > 0
        ? [{ targetEntityId: null, label: "Any office you can run for" }]
        : [];
    case "reconnect":
      return outOfTouch(world, personId).map((id) => ({
        targetEntityId: id,
        label: personName(world.people[id]!),
      }));
    case "adult-relationship":
      return possiblePartners(world, personId).map((id) => ({
        targetEntityId: id,
        label: personName(world.people[id]!),
      }));
    case "civic-issue":
      return knownPublicMatters(world, personId).map((id) => ({
        targetEntityId: id,
        label: world.history.events.find((event) => event.id === id)!.summary,
      }));
  }
}

/**
 * Why a family offers nothing right now.
 *
 * `seek-office` needs the world, because the old sentence blamed the player's
 * age in every case — including for an adult living somewhere the game has
 * never read an elected office, where age had nothing to do with it. Telling a
 * player something untrue about why they cannot do a thing is worse than
 * telling them nothing, so the real reason is asked for and passed through.
 */
function unavailableReason(
  world: World,
  personId: EntityId,
  family: PersonalGoalFamily,
): string {
  switch (family) {
    case "seek-office": {
      if (officesKnownHere(world, personId).length === 0) {
        const refusals = seekOfficeRefusals(world, personId);
        if (refusals.length > 0) return refusals.join(" ");
      }
      return "You need to be an adult to run for office.";
    }
    case "reconnect":
      return "Nobody you know has been out of touch for a year.";
    case "adult-relationship":
      return partnersOutOfTouch(world, personId).length > 0
        ? "The people this could be about are ones you have not spoken to in over a year. Get back in touch first."
        : "There is nobody you have met who is an adult, outside your family, and not already partnered — or you are partnered yourself.";
    case "civic-issue":
      return "You don’t know of any public matter yet. Reading the news helps.";
  }
}

function opportunitiesFor(
  world: World,
  personId: EntityId,
  family: PersonalGoalFamily,
  target: EntityId | null,
): readonly GoalOpportunity[] {
  if (family === "seek-office") {
    const campaign = campaignForCandidate(world, personId);
    if (campaign && campaignState(world, campaign.id).status === "active") {
      return [
        {
          kind: "campaign",
          label: "Work on your campaign",
          personId: null,
          officeKey: campaign.officeKey,
          subject: null,
        },
      ];
    }
    const person = world.people[personId]!;
    const pack = candidacyPackForJurisdiction(person.homeJurisdictionId);
    return (pack?.offices ?? []).flatMap((office) =>
      candidacyEligibility(world, {
        personId,
        jurisdictionId: person.homeJurisdictionId,
        officeKey: office.officeKey,
        alreadyACandidate: false,
      }).eligible
        ? [
            {
              kind: "file-for-office" as const,
              label: `You can file to run for ${office.office.title}`,
              personId: null,
              officeKey: office.officeKey,
              subject: null,
            },
          ]
        : [],
    );
  }
  if (family === "civic-issue") {
    return target
      ? [
          {
            kind: "read-news",
            label: "Look for news on it",
            personId: null,
            officeKey: null,
            subject: target,
          },
        ]
      : [];
  }
  if (!target) return [];
  return availablePlayerConversations(world, personId)
    .filter(
      (entry) =>
        !entry.settled &&
        entry.room.eligibleAddresseePersonIds.includes(target),
    )
    .map((entry) => ({
      kind: "talk" as const,
      label: `Talk with ${personName(world.people[target]!)}: ${entry.topicLabel}`,
      personId: target,
      officeKey: null,
      subject: entry.subject,
    }));
}

/** Why a held aim has nothing under it. Only seek-office can say so far. */
function obstaclesFor(
  world: World,
  personId: EntityId,
  family: PersonalGoalFamily,
): readonly string[] {
  return family === "seek-office" ? seekOfficeRefusals(world, personId) : [];
}

function progressFor(
  world: World,
  personId: EntityId,
  family: PersonalGoalFamily,
  record: GoalStateRecord,
): readonly string[] {
  if (family === "seek-office") {
    const campaign = campaignForCandidate(world, personId);
    return campaign && campaign.filedAt >= record.createdAt
      ? [`You filed on ${proseDate(campaign.filedAt)}.`]
      : [];
  }
  if (!record.targetEntityId || family === "civic-issue") return [];
  const since = world.history.relationshipInteractions.filter(
    (interaction) =>
      interaction.personIds.includes(personId) &&
      interaction.personIds.includes(record.targetEntityId!) &&
      interaction.occurredAt >= record.createdAt,
  );
  // Occasions, not rows. A conversation writes one interaction per turn, all
  // of them on the day it happened, so counting records tells the player they
  // were in touch four times when they spoke to somebody once.
  const occasions = new Set(since.map((interaction) => interaction.occurredAt))
    .size;
  return occasions > 0
    ? [
        `You have been in touch ${occasions === 1 ? "once" : `${occasions} times`} since you set this.`,
      ]
    : [];
}

export interface StartPersonalGoalInput {
  readonly personId: EntityId;
  readonly family: PersonalGoalFamily;
  readonly targetEntityId: EntityId | null;
}

/** Sets a private aim. Only the controlled character's own aims. */
export function startPersonalGoal(
  world: World,
  input: StartPersonalGoalInput,
): World {
  if (!controlled(world, input.personId)) {
    throw new Error("Only your own character's aims can be set.");
  }
  const offered = targetsFor(world, input.personId, input.family).some(
    (target) => target.targetEntityId === input.targetEntityId,
  );
  if (!offered) {
    throw new Error("That aim isn’t available right now.");
  }
  const key = goalKey(input.family, input.targetEntityId);
  const prior = latestGoalStatesForPerson(world, input.personId).find(
    (record) => record.goalKey === key,
  );
  if (prior && (prior.status === "active" || prior.status === "proposed")) {
    return prior.status === "active"
      ? world
      : setPersonalGoalStatus(world, input.personId, prior.goalId, "active");
  }
  if (prior) {
    throw new Error("That aim was already closed; it cannot be reopened.");
  }
  return recordGoalState(world, {
    stableKey: `${key}:${input.personId}:set:${world.currentDate}`,
    goalKey: key,
    personId: input.personId,
    recordedAt: world.currentDate,
    objective: objectiveFor(world, input.family, input.targetEntityId),
    domain: `people.${input.family}`,
    scope: "private",
    priority: "moderate",
    status: "active",
    targetEntityId: input.targetEntityId,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("player-choice", {
      note: "Set privately by the player.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

/** Pause, resume, drop or mark an aim done. Only the character's own aims. */
export function setPersonalGoalStatus(
  world: World,
  personId: EntityId,
  goalId: EntityId,
  status: PersonalGoalStatus,
): World {
  if (!controlled(world, personId)) {
    throw new Error("Only your own character's aims can be changed.");
  }
  const current = latestGoalStatesForPerson(world, personId).find(
    (record) => record.goalId === goalId,
  );
  if (!current || familyOf(current) === null) {
    throw new Error("That aim isn’t yours.");
  }
  if (statusOf(current) === status) return world;
  const recordStatus =
    status === "active"
      ? "active"
      : status === "paused"
        ? "proposed"
        : status === "achieved"
          ? "completed"
          : "abandoned";
  const count = world.history.goalStates.filter(
    (record) => record.goalId === goalId,
  ).length;
  return recordGoalState(world, {
    stableKey: `${current.goalKey}:${personId}:state:${count}`,
    goalKey: current.goalKey,
    personId,
    createdAt: current.createdAt,
    recordedAt: world.currentDate,
    objective: current.objective,
    domain: current.domain,
    scope: current.scope,
    priority: current.priority,
    status: recordStatus,
    targetEntityId: current.targetEntityId,
    deadline: current.deadline,
    outcome:
      status === "achieved"
        ? "Done, by the player's own account."
        : status === "abandoned"
          ? "Dropped by the player."
          : status === "paused"
            ? "Paused by the player."
            : null,
    provenance: createMindProvenance("player-choice", {
      note: "Changed privately by the player.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: current.id,
  });
}
