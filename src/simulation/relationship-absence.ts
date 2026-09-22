import { daysBetween } from "./dates";
import { householdMembershipsAt } from "./life-queries";
import { CONTACT_PROPOSED_EVENT } from "./people-contact";
import { relationshipHistory } from "./queries";
import type {
  EntityId,
  IsoDate,
  RelationshipInteraction,
  World,
} from "./types";

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
 * - Only a real lack of meaningful contact counts. Two people sharing a home
 *   are not apart. Opening someone's card, or not opening it, changes nothing,
 *   because nothing here reads what the player looked at.
 * - Two people can read the same gap differently. The person who reached out
 *   and was never answered has felt the silence; the other has not.
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

export interface RelationshipAbsence {
  readonly viewerId: EntityId;
  readonly subjectId: EntityId;
  readonly currency: RelationshipCurrency;
  /** The last meaningful contact the two of them had, if any. */
  readonly lastMeaningfulContactOn: IsoDate | null;
  /** Whether they share a home now, which is never absence. */
  readonly sharesHome: boolean;
  /** Whether this side asked to meet since then and was never answered. */
  readonly unansweredAttempt: boolean;
}

/*
 * CALIBRATION, NOT RESEARCH. DEPTH2 says outright that no universal pace is
 * established and permits labelled contextual bands for private testing. These
 * are those bands. Each is relative to the pair's own rhythm or history except
 * the floors, which only stop a pair who met twice in one week from reading as
 * lapsed a fortnight later.
 */
/** How many usual gaps may pass before a relationship stops being current. */
const RHYTHMS_BEFORE_LESS_CURRENT = 3;
/** The shortest gap that can count as longer than usual. */
const LESS_CURRENT_FLOOR_DAYS = 60;
/** The usual gap assumed when a pair has met meaningfully only once. */
const SINGLE_MEETING_RHYTHM_DAYS = 90;
/** How many times the less-current gap must pass before a bond is dormant. */
const LESS_CURRENT_SPANS_BEFORE_DORMANT = 4;
/** The shortest gap that can make a bond dormant. */
const DORMANT_FLOOR_DAYS = 365;
/**
 * The share of how long they have known each other that a gap must reach
 * before a long bond goes dormant. Ten years of friendship survive three years
 * apart; a year's acquaintance does not.
 */
const HISTORY_SHARE_BEFORE_DORMANT = 1 / 3;

/** A meaningful interaction: anything recorded above the passing kind. */
function meaningful(interaction: RelationshipInteraction): boolean {
  return interaction.significance !== "minor";
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

interface Thresholds {
  readonly lessCurrentAfter: number;
  readonly dormantAfter: number;
}

/** When a gap stops being usual for this pair, from their contacts so far. */
function thresholdsFor(contacts: readonly IsoDate[]): Thresholds {
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
  const dormantAfter = Math.max(
    DORMANT_FLOOR_DAYS,
    LESS_CURRENT_SPANS_BEFORE_DORMANT * lessCurrentAfter,
    known * HISTORY_SHARE_BEFORE_DORMANT,
  );
  return { lessCurrentAfter, dormantAfter };
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
  return world.history.events.some(
    (event) =>
      event.type === CONTACT_PROPOSED_EVENT &&
      (since === null || event.occurredAt > since) &&
      event.participants.some(
        (entry) => entry.role === "agency:asked" && entry.personId === viewerId,
      ) &&
      event.involvedEntityIds.includes(subjectId) &&
      world.history.events.some(
        (lapse) => lapse.stableKey === `contact:${event.id}:lapsed`,
      ),
  );
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
  const contacts =
    viewerId === subjectId
      ? []
      : relationshipHistory(world, viewerId, subjectId)
          .filter(meaningful)
          .map((interaction) => interaction.occurredAt);
  const last = contacts.at(-1) ?? null;
  const sharesHome = sharesHomeNow(world, viewerId, subjectId);
  const unansweredAttempt = askedAndUnanswered(
    world,
    viewerId,
    subjectId,
    last,
  );
  const base = {
    viewerId,
    subjectId,
    lastMeaningfulContactOn: last,
    sharesHome,
    unansweredAttempt,
  };
  if (last === null || sharesHome) return { ...base, currency: "current" };

  const now = thresholdsFor(contacts);
  const gap = daysBetween(last, world.currentDate);
  if (gap > now.dormantAfter) return { ...base, currency: "dormant" };
  if (gap > now.lessCurrentAfter) return { ...base, currency: "less-current" };

  // Within the usual rhythm. The one who reached out and heard nothing has
  // still felt the gap, whatever the calendar says.
  if (unansweredAttempt) return { ...base, currency: "less-current" };

  // Back in touch after a gap long enough to have dimmed things. Judged
  // against the rhythm they had before this contact, not after it, so a
  // reunion does not redefine its own gap as ordinary.
  if (contacts.length >= 2) {
    const before = thresholdsFor(contacts.slice(0, -1));
    const reunionGap = daysBetween(contacts.at(-2)!, last);
    if (reunionGap > before.lessCurrentAfter) {
      return { ...base, currency: "reconnecting" };
    }
  }
  return { ...base, currency: "current" };
}
