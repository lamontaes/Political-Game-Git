import { deathCausePhrase } from "./crisis/death-causes";
import { crisisPersonDeathRecipientNotices } from "./crisis/death-notices";
import { eventById } from "./event-index";
import { addDays, spokenDate } from "./dates";
import { personName } from "./people";
import { describePersonContext } from "./person-context";
import { recordEventKnowledge } from "./records";
import { recordSceneBinding } from "./scene-bindings";
import { currentLifeCutoff } from "./life-queries";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, World } from "./types";

/**
 * What a family learns when somebody dies, and what they are offered
 * (CRUNCH47 B1).
 *
 * CRISIS decides who died and when; this decides who comes to know it and what
 * the people left can do about it. The two are deliberately separate: one
 * death is one occurrence with several different consequences, and the office,
 * the estate and the family each read it in their own way.
 *
 * Three rules hold here.
 *
 * A notice is not knowledge. A person learns of a death through the supported
 * disclosure path, once, and a recipient who already knew is left alone rather
 * than told twice.
 *
 * The cause is a separate fact from the death. A privately disclosed illness
 * stays private unless its own disclosure reached that person; the notice says
 * so, and this module never guesses from the cause key.
 *
 * Grief is not a penalty. Nothing here changes capacity, work or time. What it
 * writes is an offer to say or do something, which the player may ignore, and
 * an NPC's own life continues either way.
 */

export const BEREAVEMENT_NOTICE_EVENT = "life.death-learned";
export const BEREAVEMENT_TAG = "bereavement.v1";

/**
 * One person's notice of one death, as CRISIS supplies it.
 *
 * Declared structurally rather than imported so this module compiles and is
 * testable on its own; the crisis reader satisfies it exactly.
 */
export interface PersonDeathRecipientNotice {
  /** Stable per death, recipient and relation. Deduplication key. */
  readonly effectKey: string;
  readonly sequence: number;
  readonly deathEventId: EntityId;
  readonly deathRecordId: EntityId;
  /** Who died. */
  readonly personId: EntityId;
  readonly diedAt: IsoDate;
  readonly recipientPersonId: EntityId;
  readonly relationKind: string;
  readonly controlledPerson: boolean;
  readonly causeKey: string;
  readonly causeResolved: boolean;
  /** Whether the CAUSE may be told to this recipient. */
  readonly disclosable: boolean;
  readonly disclosureRecordId: EntityId | null;
  readonly alreadyKnew: boolean;
}

/** The plainest true name for a relation, for a sentence a person would say. */
export function relationWord(relationKind: string): string {
  const [, detail = ""] = relationKind.split(":");
  const word = detail.replace(/-/g, " ").trim();
  if (!word || word === "member") return "someone in the household";
  if (word === "parent child") return "family";
  return word;
}

export function bereavementNoticeApplied(
  world: World,
  effectKey: string,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === BEREAVEMENT_NOTICE_EVENT &&
      event.tags.includes(`bereavement.effect:${effectKey}`),
  );
}

/**
 * Writes what each person came to know, once per notice.
 *
 * A recipient who was already told keeps their own record: nothing is written
 * twice for one death, and re-running the same notices changes nothing.
 */
export function applyDeathNotices(
  world: World,
  notices: readonly PersonDeathRecipientNotice[],
): World {
  let next = world;
  for (const notice of notices) {
    if (bereavementNoticeApplied(next, notice.effectKey)) continue;
    if (notice.alreadyKnew) continue;
    const recipient = next.people[notice.recipientPersonId];
    const deceased = next.people[notice.personId];
    if (!recipient || !deceased) continue;
    if (
      !isPersonAliveAt(next, notice.recipientPersonId, currentLifeCutoff(next))
    ) {
      continue;
    }
    const death = eventById(next, notice.deathEventId);
    if (!death) continue;
    const name = personName(deceased);
    const relation = relationWord(notice.relationKind);
    next = recordWorldEvent(next, {
      stableKey: `bereavement:${notice.effectKey}`,
      type: BEREAVEMENT_NOTICE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: recipient.homeJurisdictionId,
      involvedEntityIds: [notice.recipientPersonId, notice.personId],
      participants: [
        {
          personId: notice.recipientPersonId,
          role: "focus:told",
          detail: `Heard that ${name} had died`,
        },
        {
          personId: notice.personId,
          role: "focus:subject",
          detail: "Whose death it was",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        BEREAVEMENT_TAG,
        `bereavement.effect:${notice.effectKey}`,
        `bereavement.relation:${notice.relationKind}`,
        ...(notice.disclosable ? ["bereavement.cause-known"] : []),
      ],
      summary: `${personName(recipient)} learned that ${name} had died.`,
      context: {
        location: null,
        socialContext:
          relation === "someone in the household"
            ? "A death in the household, heard by someone who lived there."
            : `A death in the family, heard by their ${relation}.`,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    // What they know is that the person died. The cause travels only where its
    // own disclosure already reached them.
    next = recordEventKnowledge(next, {
      stableKey: `bereavement:${notice.effectKey}:knowledge`,
      personId: notice.recipientPersonId,
      eventId: notice.deathEventId,
      learnedAt: next.currentDate,
      believedSummary: deathNoticeSentence(next, notice, death.summary),
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: "Family notice" },
    });
  }
  return next;
}

/**
 * What a recipient is told, as they would hear it: "Your sister, Lily Norris,
 * died after a serious illness on March 3, 2052." The relation is the one the
 * record establishes from the recipient's side, and none is claimed without
 * it. The cause is said only when a disclosure reached this recipient; a
 * disclosed cause with no plain wording keeps the death's own summary.
 */
export function deathNoticeSentence(
  world: World,
  notice: PersonDeathRecipientNotice,
  deathSummary: string,
): string {
  const deceased = world.people[notice.personId];
  const name = deceased ? personName(deceased) : "Someone";
  const relation = describePersonContext(
    world,
    notice.recipientPersonId,
    notice.personId,
    notice.diedAt,
  )?.relationship;
  const who = relation
    ? `${relation.charAt(0).toUpperCase()}${relation.slice(1)}, ${name},`
    : name;
  const date = spokenDate(notice.diedAt);
  if (!notice.disclosable) return `${who} died on ${date}.`;
  const phrase = deathCausePhrase(notice.causeKey);
  return phrase ? `${who} died ${phrase} on ${date}.` : deathSummary;
}

/**
 * Tells the people the record says would know that this death happened, on
 * the day it is written. Called by the writers that record a death during
 * play, so a death reaches the family when it happens and never later, and a
 * death already in a save before this existed is never announced after the
 * fact.
 */
export function tellOfDeath(world: World, deathRecordId: EntityId): World {
  const death = world.history.personDeaths.find(
    (record) => record.id === deathRecordId,
  );
  if (!death) return world;
  return applyDeathNotices(
    world,
    crisisPersonDeathRecipientNotices(world, {
      afterSequence: death.sequence - 1,
    }).filter((notice) => notice.deathRecordId === deathRecordId),
  );
}

/** Days a bereavement scene stays offered before it is simply not raised. */
const BEREAVEMENT_SCENE_DAYS = 30;

/**
 * Offers the played person something to say, where a death and a real relation
 * support it. Nothing is required, and nothing is scheduled if it is ignored.
 */
export function offerBereavementScene(
  world: World,
  playerPersonId: EntityId,
): World {
  const learned = world.history.events
    .filter(
      (event) =>
        event.type === BEREAVEMENT_NOTICE_EVENT &&
        event.occurredAt >= addDays(world.currentDate, -BEREAVEMENT_SCENE_DAYS),
    )
    .filter((event) => event.involvedEntityIds.includes(playerPersonId));
  for (const event of learned) {
    const deceasedId = event.participants.find(
      (entry) => entry.role === "focus:subject",
    )?.personId;
    const player = world.people[playerPersonId];
    if (!deceasedId || !player) continue;
    const deceased = world.people[deceasedId];
    if (!deceased) continue;
    // Somebody else who also lost them, and is still here to say so.
    const other = bereavedCompanion(world, playerPersonId, deceasedId);
    if (!other) continue;
    const relationTag = event.tags
      .find((tag) => tag.startsWith("bereavement.relation:"))
      ?.slice("bereavement.relation:".length);
    if (
      world.history.events.some(
        (candidate) =>
          candidate.type === "scene.contextual-bound" &&
          candidate.tags.some((tag) => tag.includes(`"variant":"bereaved"`)) &&
          candidate.involvedEntityIds.includes(deceasedId),
      )
    ) {
      continue;
    }
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "home-evening",
        variant: "bereaved",
        playerPersonId,
        speakerPersonId: other,
        relationship: null,
        place: "Home",
        jurisdictionId: player.homeJurisdictionId,
        request: `What to say about ${personName(deceased)}.`,
        sourceEntityIds: [event.id, deceasedId],
        facts: {
          deceasedName: personName(deceased),
          deceasedGiven: deceased.givenName,
          ...(relationTag ? { relation: relationWord(relationTag) } : {}),
        },
        knownRecordIds: [event.id],
        target: null,
        date: null,
        expiresAt: addDays(world.currentDate, BEREAVEMENT_SCENE_DAYS),
      },
      `${personName(deceased)} has died, and there is somebody to say it to.`,
    );
  }
  return world;
}

/** Another living person who also knew the deceased and is present to the player. */
function bereavedCompanion(
  world: World,
  playerPersonId: EntityId,
  deceasedId: EntityId,
): EntityId | null {
  const alsoTold = world.history.events
    .filter(
      (event) =>
        event.type === BEREAVEMENT_NOTICE_EVENT &&
        event.involvedEntityIds.includes(deceasedId),
    )
    .flatMap((event) =>
      event.participants
        .filter((entry) => entry.role === "focus:told")
        .map((entry) => entry.personId),
    )
    .filter(
      (personId) =>
        personId !== playerPersonId &&
        !!world.people[personId] &&
        isPersonAliveAt(world, personId, currentLifeCutoff(world)),
    );
  return alsoTold[0] ?? null;
}
