import {
  ageOnDate,
  deriveRelationshipSummary,
  describePersonContext,
  explicitPerceptionHistory,
  factsForPerson,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  measureById,
  peopleInHouseholdAt,
  personName,
  scheduledActivitiesVisibleTo,
  type EntityId,
  type World,
} from "../simulation";
import type { ShellRef } from "./shell-navigation";
import { municipalGovernmentByKey } from "../simulation/municipal-government";

/**
 * What the player makes of somebody, read from the records they can see.
 *
 * The correction this exists for is epistemic, not cosmetic. The dossier used
 * to prefix every line with "You know" or "Public record", which made ordinary
 * sentences read like database rows and, worse, flattened three different kinds
 * of claim into one badge vocabulary. So: a fact the player established by
 * living beside somebody carries no badge at all, because that is simply what
 * they know; a fact that stands on the public record says so; a fact somebody
 * else asserted is attributed to them and stays an assertion. Nothing here
 * promotes one to another to tidy the layout, and nothing hidden is revealed —
 * a category with no record produces a plain sentence saying it is not known,
 * which is a truthful line rather than a gap.
 */

export type FactAttribution =
  /** Established by the player's own life. Said plainly, with no badge. */
  | "known"
  /** On the record, whoever has or has not read it. */
  | "record"
  /** Somebody's account of them, and attributed to that somebody. */
  | "reported";

export interface DossierFact {
  readonly key: string;
  readonly text: string;
  readonly attribution: FactAttribution;
}

export interface PersonDossier {
  readonly personId: EntityId;
  readonly name: string;
  readonly shortName: string;
  /** "your mother", when a record establishes one. Never inferred. */
  readonly relationship: string | null;
  /** The record that established it. Developer-facing. */
  readonly relationshipBasis: string;
  readonly age: number | null;
  /** True only when this moment's scene puts them in the room. */
  readonly presentNow: boolean;
  /**
   * What they are doing this minute, which is a different kind of claim from
   * who they are — so it sits beside the identity rather than joining the
   * lasting details, and is absent when nothing establishes it.
   */
  readonly rightNow: string | null;
  readonly details: readonly DossierFact[];
  /** Said out loud rather than left as an empty section. */
  readonly notKnown: readonly string[];
  readonly lastInteraction: string;
  /** Canonical entities this dossier can route to. */
  readonly links: readonly ShellRef[];
}

function describeInteraction(
  world: World,
  playerId: EntityId,
  personId: EntityId,
): string {
  const summary = deriveRelationshipSummary(world, playerId, personId);
  if (summary.interactionCount === 0) {
    return "Nothing between you is written down yet.";
  }
  const when = summary.lastInteractionAt;
  return when === null
    ? `${summary.interactionCount} exchanges are on the record.`
    : `Last on the record: ${when}.`;
}

/**
 * The lasting details, in the order a person would actually give them.
 *
 * Household and kinship come from the player's own life, so they carry no
 * attribution. The player's own biography stays known. Other people's biography
 * requires an access-aware adapter; raw World facts are not public records. A perception someone
 * expressed about them is attributed to that person and never merged into the
 * other two.
 */
function buildDetails(
  world: World,
  playerId: EntityId,
  personId: EntityId,
): { details: readonly DossierFact[]; notKnown: readonly string[] } {
  const details: DossierFact[] = [];
  const notKnown: string[] = [];

  const playerHouseholdId = householdIdFor(world, playerId);
  const sharedHousehold =
    playerHouseholdId !== null &&
    peopleInHouseholdAt(world, playerHouseholdId).includes(personId);
  if (sharedHousehold) {
    details.push({
      key: "household",
      text: "You live in the same household.",
      attribution: "known",
    });
  }

  const kin = kinshipRelationshipsAt(world, playerId).find((record) =>
    record.personIds.includes(personId),
  );
  if (kin) {
    const context = describePersonContext(world, playerId, personId);
    if (context?.relationship) {
      details.push({
        key: `kin-${kin.id}`,
        text: `They are ${context.relationship}.`,
        attribution: "known",
      });
    }
  }

  const subject = world.people[personId];
  if (subject && personId === playerId) {
    let occupation = false;
    let education = false;
    for (const fact of factsForPerson(subject)) {
      if (fact.kind === "occupation" && !occupation) {
        occupation = true;
        details.push({
          key: `fact-${fact.id}`,
          text:
            fact.status === "ongoing"
              ? `${fact.title} at ${fact.employer}.`
              : `Worked as ${fact.title} at ${fact.employer}.`,
          attribution: "known",
        });
      }
      if (fact.kind === "education" && !education) {
        education = true;
        details.push({
          key: `fact-${fact.id}`,
          text: `${fact.institution}${fact.field ? `, ${fact.field}` : ""}.`,
          attribution: "known",
        });
      }
    }
    if (!occupation)
      notKnown.push("What they do for a living is not recorded.");
  }

  if (personId !== playerId) {
    // Biography truth has no access grant. Display only explicitly public
    // statements until a knowledge-aware biography adapter supplies more.
    const position = [...world.history.publicPositions]
      .reverse()
      .find(
        (record) =>
          record.personId === personId && record.audience === "public",
      );
    if (position)
      details.push({
        key: `position-${position.id}`,
        text: position.statement,
        attribution: "record",
      });
    notKnown.push(
      "Their education and work history are not known to you here.",
    );
  }

  /*
   * What somebody else asserted about them, kept as an assertion. Matched on
   * the perception's own subject entity rather than on a guessed subject key,
   * so a record about a different person can never be attached to this one.
   */
  for (const perception of explicitPerceptionHistory(world, playerId)
    .filter((record) => record.subjectEntityId === personId)
    .slice(-2)) {
    details.push({
      key: `perception-${perception.id}`,
      text: perception.assertion,
      attribution: "reported",
    });
  }

  return { details, notKnown };
}

/**
 * Canonical entities a dossier can hand the router.
 *
 * Only things this world actually holds: people the household record puts
 * beside them, and commitments the player is allowed to see them in. A link the
 * world cannot resolve is never offered, so following one always arrives
 * somewhere and Back always returns.
 */
function buildLinks(
  world: World,
  playerId: EntityId,
  personId: EntityId,
): readonly ShellRef[] {
  const links: ShellRef[] = [];
  const seen = new Set<string>([`person:${personId}`, `person:${playerId}`]);

  const householdId = householdIdFor(world, personId);
  for (const member of householdId === null ||
  householdId !== householdIdFor(world, playerId)
    ? []
    : peopleInHouseholdAt(world, householdId)) {
    const key = `person:${member}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ kind: "person", id: member });
    if (links.length >= 3) break;
  }

  for (const activity of scheduledActivitiesVisibleTo(world, playerId)) {
    if (!activity.participantPersonIds.includes(personId)) continue;
    const key = `commitment:${activity.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ kind: "commitment", id: activity.id });
    break;
  }

  return links;
}

/**
 * Builds one person's dossier, or null when the world has no such person.
 *
 * Null is the correct answer rather than an empty card: a screen asking about
 * somebody this world never had is a routing mistake, and inventing a blank
 * record for them would hide it.
 */
export function projectPersonDossier(
  world: World,
  playerId: EntityId,
  personId: EntityId,
  options: {
    readonly presentNow?: boolean;
    readonly rightNow?: string | null;
  } = {},
): PersonDossier | null {
  const subject = world.people[personId];
  if (!subject) return null;
  const context = describePersonContext(world, playerId, personId);
  const { details, notKnown } = buildDetails(world, playerId, personId);

  return {
    personId,
    name: personName(subject),
    shortName: subject.givenName,
    relationship: context?.relationship ?? null,
    relationshipBasis:
      context?.basis ?? "No record establishes a relationship.",
    age: ageOnDate(subject.birthDate, world.currentDate),
    presentNow: options.presentNow ?? false,
    rightNow: options.rightNow ?? null,
    details,
    notKnown,
    lastInteraction: describeInteraction(world, playerId, personId),
    links: buildLinks(world, playerId, personId),
  };
}

/** Whether the world still holds every person, commitment and measure pinned. */
export function shellRefIsResolvable(world: World, ref: ShellRef): boolean {
  /*
   * A government resolves against the compiled registry rather than the save.
   * Without this it fell through to the measure lookup, found nothing, and a
   * pinned government would have been pruned the moment the world reloaded —
   * a shortcut that quietly deleted itself.
   */
  if (ref.kind === "government") {
    return municipalGovernmentByKey(ref.id) !== null;
  }
  if (ref.kind === "person") return world.people[ref.id] !== undefined;
  if (ref.kind === "commitment") {
    return world.history.scheduledActivities.some(
      (activity) => activity.id === ref.id,
    );
  }
  return measureById(world, ref.id) !== null;
}

/** The player-facing name of whatever a reference points at. */
export function labelForRef(world: World, ref: ShellRef): string | null {
  /*
   * A pinned government resolves through the government registry, not the
   * world's entities: it is a real organization this repository has compiled,
   * and the pin points at that organization rather than at anything the save
   * happens to contain. A key that no longer resolves returns null and shows as
   * an unavailable reference, the same as any other pin whose target is gone.
   */
  if (ref.kind === "government") {
    return municipalGovernmentByKey(ref.id)?.displayName ?? null;
  }
  if (ref.kind === "person") {
    const person = world.people[ref.id];
    return person ? personName(person) : null;
  }
  if (ref.kind === "commitment") {
    return (
      world.history.scheduledActivities.find(
        (activity) => activity.id === ref.id,
      )?.title ?? null
    );
  }
  const measure = measureById(world, ref.id);
  return measure ? measure.shortTitle : null;
}

/** Where the household record puts this person, when it puts them anywhere. */
export function householdIdFor(
  world: World,
  personId: EntityId,
): EntityId | null {
  const memberships = householdMembershipsAt(world, personId);
  const primary =
    memberships.find((entry) => entry.state.residenceRole === "primary") ??
    memberships[0];
  return primary?.household.id ?? null;
}
