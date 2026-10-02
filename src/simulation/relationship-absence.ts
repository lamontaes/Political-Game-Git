import { addDays, daysBetween } from "./dates";
import { recordsByStringField } from "./history-index";
import {
  eventsOfType,
  PRETRIAL_HELD_EVENT,
  pretrialHoldsOf,
  sentencesOf,
} from "./justice/jail-terms";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  workRelationshipHistoryForPerson,
} from "./life-queries";
import { MIGRATION_MOVED_EVENT } from "./migration/contract";
import { CONTACT_PROPOSED_EVENT } from "./people-contact-events";
import { relationshipHistory } from "./queries";
import type { EntityId, IsoDate, World } from "./types";

/**
 * How current a relationship is, from one side, after time apart.
 *
 * lamontae ruled on 2026-09-22 that relationships fade with absence and that
 * the fading must not read as a number. ChatGPT answered the shape in DEPTH2
 * (A03, `relationship-fading-with-absence`), and this file is that answer:
 *
 * - Fading is a state the reading is in, never a quantity subtracted per day.
 *   Nothing is stored and nothing ticks; the state is read from dated history
 *   the same way the five lines are, so a save carries no new field and an old
 *   save reads correctly.
 * - The pace is the pair's own. It follows how often the two of them usually
 *   met and how long they have known each other, so a busy month away from a
 *   lifelong friend reads nothing like a decade after a single meeting.
 * - Only a real lack of contact counts. Any recorded interaction keeps the
 *   pair in touch, however slight, since a chat is contact even though it
 *   moves nothing between them. Two people sharing a home or a workplace now
 *   see each other and are not apart. Opening someone's card, or not opening
 *   it, changes nothing, because nothing here reads what the player looked at.
 * - Family does not share a stranger's timeout: kin take far longer to go
 *   dormant, and what they owe each other never fades at all.
 * - Two people can read the same gap differently. The person who reached out
 *   and was never answered has felt the silence; the other has not.
 *
 * - A gap with a recorded reason is not neglect (A142). The days either of
 *   them spent in jail or held before trial, the time since one of them moved
 *   away (while they still live in different places), the weeks after a death
 *   in either family, and the first weeks of a new school or a new job are
 *   read from the records that hold them, and those days do not count toward
 *   the bond fading. Each reason is returned with its record, so the words
 *   can say why they have been apart.
 * - The fading itself slides: `fading` runs from 0 at the pair's usual rhythm
 *   to 1 when the bond is dormant, in step with the unexplained days apart.
 *   The four states are bands of that one measure, for the words only.
 *
 * NOT YET REPRESENTED, and so not read: an illness or a hospital stay, travel,
 * an agreed break. Nothing in the world records them. A workplace keeps
 * colleagues in touch but is not intimacy; it only stops the bond fading, it
 * adds nothing to any line.
 *
 * What the state does to each of the five lines lives in
 * `relationship-standing.ts`, where the lines are read. Absence never erases a
 * recorded interaction and never settles or hardens a grievance.
 */
export type RelationshipCurrency =
  /** In touch at about the usual rhythm, or living together. */
  | "current"
  /** Longer apart than usual. Past standing holds; present familiarity dims. */
  | "less-current"
  /** Apart long enough that the bond is dormant, not hostile. */
  | "dormant"
  /** Back in touch after a long gap, and not yet caught up. */
  | "reconnecting";

/** A recorded reason the two of them have been apart. */
export type ApartReasonKind =
  "moved" | "jailed" | "death-in-family" | "new-school" | "new-job";

export interface ApartReason {
  readonly kind: ApartReasonKind;
  /** Whose life the record is about: either of the two. */
  readonly personId: EntityId;
  readonly from: IsoDate;
  /** The day the reason stops explaining the gap, or null while it still does. */
  readonly until: IsoDate | null;
  /** The record that shows it: a move, a sentence, a death, an enrollment, a job. */
  readonly sourceRecordId: EntityId;
}

export interface RelationshipAbsence {
  readonly viewerId: EntityId;
  readonly subjectId: EntityId;
  readonly currency: RelationshipCurrency;
  /** The last meaningful contact the two of them had, if any. */
  readonly lastMeaningfulContactOn: IsoDate | null;
  /** Whether they share a home now, which is never absence. */
  readonly sharesHome: boolean;
  /** Whether they work at the same place now, which is not absence either. */
  readonly sharesWork: boolean;
  /** Whether this side asked to meet since then and was never answered. */
  readonly unansweredAttempt: boolean;
  /** The recorded reasons they have been apart since that contact. */
  readonly apartReasons: readonly ApartReason[];
  /** Days since that contact that a recorded reason explains. */
  readonly explainedDays: number;
  /**
   * How far the bond has faded, 0 (at the pair's usual rhythm or closer) to 1
   * (dormant), from the unexplained days apart. Never shown as a number.
   */
  readonly fading: number;
}

/**
 * PLACEHOLDER (research: `relationship-absence-thresholds`). DEPTH2 says
 * outright that no universal pace is established and permits labeled
 * contextual bands for private testing. These are those bands. Each is
 * relative to the pair's own rhythm or history except the floors, which only
 * stop a pair who met twice in one week from reading as lapsed a fortnight
 * later. None of them flips anything: they set where the one sliding measure,
 * `fading`, starts and ends, and where the words change.
 */
/**
 * PLACEHOLDER (same research): the share of how long they have known each
 * other that a gap must reach before a long bond goes dormant. Ten years of
 * friendship survive three years apart; a year's acquaintance does not.
 */
const HISTORY_SHARE_BEFORE_DORMANT = 1 / 3;

export const RELATIONSHIP_ABSENCE_PACE = {
  basis: "PLACEHOLDER",
  researchQuestionId: "relationship-absence-thresholds",
  /** How many usual gaps may pass before a relationship stops being current. */
  rhythmsBeforeLessCurrent: 3,
  /** The shortest gap that can count as longer than usual. */
  lessCurrentFloorDays: 60,
  /** The usual gap assumed when a pair has met meaningfully only once. */
  singleMeetingRhythmDays: 90,
  /** How many times the less-current gap must pass before a bond is dormant. */
  lessCurrentSpansBeforeDormant: 4,
  /** The shortest gap that can make a bond dormant. */
  dormantFloorDays: 365,
  /** See HISTORY_SHARE_BEFORE_DORMANT below. */
  historyShareBeforeDormant: HISTORY_SHARE_BEFORE_DORMANT,
  /** How many times longer kin take to go dormant than anyone else. */
  kinDormancyFactor: 3,
} as const;

/**
 * PLACEHOLDER (research: `relationship-apart-reasons`). How long a recorded
 * event explains time apart, where the record itself carries no end: the
 * weeks after a death in the family, and the first weeks at a new school or a
 * new job. A jail term, a hold before trial and a move carry their own dates.
 */
export const APART_REASON_SPANS = {
  basis: "PLACEHOLDER",
  researchQuestionId: "relationship-apart-reasons",
  deathInFamilyDays: 90,
  newSchoolDays: 60,
  newJobDays: 60,
} as const;

const RHYTHMS_BEFORE_LESS_CURRENT =
  RELATIONSHIP_ABSENCE_PACE.rhythmsBeforeLessCurrent;
const LESS_CURRENT_FLOOR_DAYS = RELATIONSHIP_ABSENCE_PACE.lessCurrentFloorDays;
const SINGLE_MEETING_RHYTHM_DAYS =
  RELATIONSHIP_ABSENCE_PACE.singleMeetingRhythmDays;
const LESS_CURRENT_SPANS_BEFORE_DORMANT =
  RELATIONSHIP_ABSENCE_PACE.lessCurrentSpansBeforeDormant;
const DORMANT_FLOOR_DAYS = RELATIONSHIP_ABSENCE_PACE.dormantFloorDays;
const KIN_DORMANCY_FACTOR = RELATIONSHIP_ABSENCE_PACE.kinDormancyFactor;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

interface Thresholds {
  readonly rhythm: number;
  readonly lessCurrentAfter: number;
  readonly dormantAfter: number;
}

/** When a gap stops being usual for this pair, from their contacts so far. */
function thresholdsFor(contacts: readonly IsoDate[], kin: boolean): Thresholds {
  const gaps: number[] = [];
  for (let index = 1; index < contacts.length; index += 1) {
    gaps.push(daysBetween(contacts[index - 1]!, contacts[index]!));
  }
  const rhythm = gaps.length === 0 ? SINGLE_MEETING_RHYTHM_DAYS : median(gaps);
  const lessCurrentAfter = Math.max(
    LESS_CURRENT_FLOOR_DAYS,
    RHYTHMS_BEFORE_LESS_CURRENT * rhythm,
  );
  const known =
    contacts.length < 2 ? 0 : daysBetween(contacts[0]!, contacts.at(-1)!);
  const dormantAfter =
    Math.max(
      DORMANT_FLOOR_DAYS,
      LESS_CURRENT_SPANS_BEFORE_DORMANT * lessCurrentAfter,
      known * HISTORY_SHARE_BEFORE_DORMANT,
    ) * (kin ? KIN_DORMANCY_FACTOR : 1);
  return { rhythm, lessCurrentAfter, dormantAfter };
}

/** Whether the two of them live in different places now. */
function liveApart(world: World, a: EntityId, b: EntityId): boolean {
  const left = world.people[a]?.homeJurisdictionId;
  const right = world.people[b]?.homeJurisdictionId;
  return !!left && !!right && left !== right;
}

/**
 * The recorded reasons either of them was kept away between `since` and
 * today: each read from the record its producer wrote.
 */
function apartReasonsBetween(
  world: World,
  pair: readonly [EntityId, EntityId],
  since: IsoDate,
): readonly ApartReason[] {
  const today = world.currentDate;
  const reasons: ApartReason[] = [];
  const overlaps = (from: IsoDate, until: IsoDate | null) =>
    from <= today && (until === null || until > since);
  // A move by either of them, while they still live in different places.
  if (liveApart(world, pair[0], pair[1]))
    for (const event of eventsOfType(world, MIGRATION_MOVED_EVENT)) {
      if (event.occurredAt < since || event.occurredAt > today) continue;
      for (const personId of pair)
        if (event.participants.some((row) => row.personId === personId))
          reasons.push({
            kind: "moved",
            personId,
            from: event.occurredAt,
            until: null,
            sourceRecordId: event.id,
          });
    }
  const hasHolds = eventsOfType(world, PRETRIAL_HELD_EVENT).length > 0;
  for (const personId of pair) {
    // Time in jail, on a sentence or held before trial.
    for (const sentence of sentencesOf(world, personId))
      if (sentence.kind === "jail" && overlaps(sentence.from, sentence.until))
        reasons.push({
          kind: "jailed",
          personId,
          from: sentence.from,
          until: sentence.until,
          sourceRecordId: sentence.sentencedEventId,
        });
    if (hasHolds)
      for (const hold of pretrialHoldsOf(world, personId))
        if (overlaps(hold.from, hold.until))
          reasons.push({
            kind: "jailed",
            personId,
            from: hold.from,
            until: hold.until,
            sourceRecordId: hold.heldEventId,
          });
    // A death in their family (not one of the pair).
    if (world.people[personId])
      for (const kin of kinshipRelationshipsAt(world, personId)) {
        const otherId = kin.personIds.find((id) => id !== personId)!;
        if (pair.includes(otherId)) continue;
        for (const death of recordsByStringField(
          world.history.personDeaths,
          "personId",
          otherId,
        )) {
          const until = addDays(
            death.diedAt,
            APART_REASON_SPANS.deathInFamilyDays,
          );
          if (death.diedAt >= since && overlaps(death.diedAt, until))
            reasons.push({
              kind: "death-in-family",
              personId,
              from: death.diedAt,
              until,
              sourceRecordId: death.id,
            });
        }
      }
    // The first weeks at a new school past grade school, or a new job.
    for (const enrollment of recordsByStringField(
      world.history.educationEnrollments,
      "personId",
      personId,
    )) {
      if (enrollment.programKind.startsWith("schooling:")) continue;
      const until = addDays(
        enrollment.startedAt,
        APART_REASON_SPANS.newSchoolDays,
      );
      if (
        enrollment.startedAt >= since &&
        overlaps(enrollment.startedAt, until)
      )
        reasons.push({
          kind: "new-school",
          personId,
          from: enrollment.startedAt,
          until,
          sourceRecordId: enrollment.id,
        });
    }
    if (world.people[personId])
      for (const job of workRelationshipHistoryForPerson(world, personId)) {
        const until = addDays(job.startedAt, APART_REASON_SPANS.newJobDays);
        if (job.startedAt >= since && overlaps(job.startedAt, until))
          reasons.push({
            kind: "new-job",
            personId,
            from: job.startedAt,
            until,
            sourceRecordId: job.id,
          });
      }
  }
  return reasons.sort(
    (a, b) =>
      a.from.localeCompare(b.from) ||
      a.sourceRecordId.localeCompare(b.sourceRecordId),
  );
}

/** Days from `since` to today that at least one reason covers. */
function daysExplained(
  reasons: readonly ApartReason[],
  since: IsoDate,
  today: IsoDate,
): number {
  const spans = reasons
    .map((reason) => ({
      from: reason.from > since ? reason.from : since,
      until:
        reason.until === null || reason.until > today ? today : reason.until,
    }))
    .filter((span) => span.from < span.until)
    .sort((a, b) => a.from.localeCompare(b.from));
  let days = 0;
  let reached: IsoDate | null = null;
  for (const span of spans) {
    const from: IsoDate =
      reached !== null && reached > span.from ? reached : span.from;
    if (from < span.until) days += daysBetween(from, span.until);
    if (reached === null || span.until > reached) reached = span.until;
  }
  return days;
}

function sharesHomeNow(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): boolean {
  if (!world.people[viewerId] || !world.people[subjectId]) return false;
  const mine = new Set(
    householdMembershipsAt(world, viewerId).map((entry) => entry.household.id),
  );
  if (mine.size === 0) return false;
  return householdMembershipsAt(world, subjectId).some((entry) =>
    mine.has(entry.household.id),
  );
}

function sharesWorkNow(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): boolean {
  if (!world.people[viewerId] || !world.people[subjectId]) return false;
  const mine = new Set(
    activeWorkRelationshipsAt(world, viewerId).map(
      (entry) => entry.relationship.organizationId,
    ),
  );
  if (mine.size === 0) return false;
  return activeWorkRelationshipsAt(world, subjectId).some((entry) =>
    mine.has(entry.relationship.organizationId),
  );
}

function areKin(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): boolean {
  if (!world.people[viewerId]) return false;
  return kinshipRelationshipsAt(world, viewerId).some((record) =>
    record.personIds.includes(subjectId),
  );
}

/**
 * Whether this side asked to meet after their last contact and heard nothing.
 *
 * A request the other person answered, even with a no, is not silence. Only a
 * proposal that lapsed unanswered counts, which is the one case where this
 * person knows they reached out and were not met.
 */
function askedAndUnanswered(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  since: IsoDate | null,
): boolean {
  // A request made the same day as the last contact still counts: asking to
  // meet again and never hearing back is felt whenever it happens.
  const asked = world.history.events.filter(
    (event) =>
      event.type === CONTACT_PROPOSED_EVENT &&
      (since === null || event.occurredAt >= since) &&
      event.involvedEntityIds.includes(subjectId) &&
      event.participants.some(
        (entry) => entry.role === "agency:asked" && entry.personId === viewerId,
      ),
  );
  if (asked.length === 0) return false;
  const lapsed = new Set(asked.map((event) => `contact:${event.id}:lapsed`));
  return world.history.events.some((event) => lapsed.has(event.stableKey));
}

/**
 * How current this relationship is for `viewerId`, as of the world's date.
 *
 * Returns "current" for a pair with no meaningful history at all: there is no
 * bond to be apart from, and the five lines already read that as nothing.
 */
export function readRelationshipAbsence(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): RelationshipAbsence {
  // One entry per day the two of them were in touch. A conversation and the
  // half hour after it are one day's contact, not two, and counting them twice
  // would make a reunion read as ordinary and halve the pair's rhythm.
  const contacts =
    viewerId === subjectId
      ? []
      : [
          ...new Set(
            relationshipHistory(world, viewerId, subjectId).map(
              (interaction) => interaction.occurredAt,
            ),
          ),
        ];
  const last = contacts.at(-1) ?? null;
  const sharesHome = sharesHomeNow(world, viewerId, subjectId);
  const sharesWork = sharesWorkNow(world, viewerId, subjectId);
  const kin = areKin(world, viewerId, subjectId);
  const unansweredAttempt = askedAndUnanswered(
    world,
    viewerId,
    subjectId,
    last,
  );
  const apartReasons =
    last === null || sharesHome || sharesWork
      ? []
      : apartReasonsBetween(world, [viewerId, subjectId], last);
  const explainedDays =
    last === null ? 0 : daysExplained(apartReasons, last, world.currentDate);
  const base = {
    viewerId,
    subjectId,
    lastMeaningfulContactOn: last,
    sharesHome,
    sharesWork,
    unansweredAttempt,
    apartReasons,
    explainedDays,
  };
  if (last === null || sharesHome || sharesWork) {
    return { ...base, fading: 0, currency: "current" };
  }

  const now = thresholdsFor(contacts, kin);
  // Only the days nothing recorded explains count as time drifting apart.
  const gap = daysBetween(last, world.currentDate) - explainedDays;
  const fading = Math.min(
    1,
    Math.max(0, (gap - now.rhythm) / (now.dormantAfter - now.rhythm)),
  );
  if (gap > now.dormantAfter) return { ...base, fading, currency: "dormant" };
  if (gap > now.lessCurrentAfter)
    return { ...base, fading, currency: "less-current" };

  // Within the usual rhythm. The one who reached out and heard nothing has
  // still felt the gap, whatever the calendar says.
  if (unansweredAttempt) return { ...base, fading, currency: "less-current" };

  // Back in touch after a gap long enough to have dimmed things. Judged
  // against the rhythm they had before this contact, not after it, so a
  // reunion does not redefine its own gap as ordinary.
  if (contacts.length >= 2) {
    const before = thresholdsFor(contacts.slice(0, -1), kin);
    const reunionGap = daysBetween(contacts.at(-2)!, last);
    if (reunionGap > before.lessCurrentAfter) {
      return { ...base, fading, currency: "reconnecting" };
    }
  }
  return { ...base, fading, currency: "current" };
}
