import { personName } from "./people";
import { recordClaim, recordEventKnowledge } from "./records";
import type {
  ClaimAudience,
  ClaimRelationshipToTruth,
  EntityId,
  HistoricalEvent,
  World,
} from "./types";

/**
 * What a speaker meant by a factual answer (ALIVE44 chunk 7, PROSE B).
 *
 * A conversation turn already records who spoke, who heard, how loudly and
 * what the other person said back. What it never recorded was the player's own
 * factual assertion: which proposition the answer was about, what the speaker
 * believed about it, and whether they meant to be believed. Without that there
 * is no difference between a lie, a mistake and a refusal to answer, and the
 * game could only ever pretend to have one.
 *
 * Nothing here is a second conversation engine or a new store. The stance
 * travels as one versioned tag on the turn's own canonical event — the same
 * shape `life-request-details.ts` uses for request terms — and the words
 * themselves become an ordinary `ClaimRecord` spoken by the player. A later
 * discovery is its own event; it never rewrites what was said or who heard it.
 *
 * There is no lie detector. A stance is discovered only when a person who heard
 * the claim receives canonical evidence against it, and `deceive` is only ever
 * written when the speaker's own record established the opposite belief.
 */

export const CLAIM_STANCE_TAG_PREFIX = "claim.stance.v1:";
export const CLAIM_CONTRADICTION_EVENT = "claim.contradiction-found";
export const CLAIM_STANCE_EVENT_TAG_PREFIX = "claim.stance-event:";
export const CLAIM_EVIDENCE_TAG_PREFIX = "claim.evidence:";

/** What the speaker's own record says about the proposition. */
export type SpeakerBelief =
  "believes-true" | "believes-false" | "uncertain" | "not-applicable";

/** What the speaker chose to do with it. */
export type EpistemicIntent = "truthful" | "deceive" | "from-memory" | "evade";

export interface ClaimStance {
  readonly version: 1;
  /** Stable identity of the factual question, e.g. `attends:<activityId>`. */
  readonly propositionKey: string;
  /** The proposition in plain words, stated positively. */
  readonly proposition: string;
  /** Whether the words affirmed or denied it, or asserted nothing. */
  readonly asserted: "affirms" | "denies" | "none";
  readonly speakerBelief: SpeakerBelief;
  readonly intent: EpistemicIntent;
  /** The exact words the player chose. */
  readonly statement: string;
  /** Records that establish what the speaker believed. */
  readonly beliefEvidenceIds: readonly EntityId[];
  /** Everybody the turn recorded as hearing it. */
  readonly recipientPersonIds: readonly EntityId[];
  readonly audibility: string;
  /** The records the proposition is about. */
  readonly sourceEntityIds: readonly EntityId[];
}

export function claimStanceTag(stance: ClaimStance): string {
  return `${CLAIM_STANCE_TAG_PREFIX}${JSON.stringify(stance)}`;
}

export function claimStanceOf(event: HistoricalEvent): ClaimStance | null {
  const tags = event.tags.filter((tag) =>
    tag.startsWith(CLAIM_STANCE_TAG_PREFIX),
  );
  if (tags.length !== 1) return null;
  try {
    const value = JSON.parse(
      tags[0]!.slice(CLAIM_STANCE_TAG_PREFIX.length),
    ) as ClaimStance;
    if (
      value.version !== 1 ||
      typeof value.propositionKey !== "string" ||
      typeof value.statement !== "string" ||
      !Array.isArray(value.recipientPersonIds)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Checks that an intent is one the speaker's belief actually supports.
 *
 * A deliberate lie needs a belief opposite to what was asserted; a sincere
 * answer needs a belief that matches it; an answer from memory needs a belief
 * that is not settled. An evasion asserts nothing. Anything else is the writer
 * mislabelling a choice, and is refused rather than recorded.
 */
export function assertStanceCoherent(stance: ClaimStance): void {
  const { intent, speakerBelief, asserted } = stance;
  const matches =
    (asserted === "affirms" && speakerBelief === "believes-true") ||
    (asserted === "denies" && speakerBelief === "believes-false");
  const opposes =
    (asserted === "affirms" && speakerBelief === "believes-false") ||
    (asserted === "denies" && speakerBelief === "believes-true");
  const ok =
    intent === "deceive"
      ? opposes
      : intent === "truthful"
        ? matches
        : intent === "from-memory"
          ? asserted !== "none" && speakerBelief === "uncertain"
          : asserted === "none";
  if (!ok) {
    throw new Error(
      `A ${intent} answer cannot ${asserted === "none" ? "assert nothing" : `${asserted === "affirms" ? "affirm" : "deny"} a proposition`} the speaker ${speakerBelief}.`,
    );
  }
  if (!stance.statement.trim() || !stance.proposition.trim()) {
    throw new Error("A claim stance needs its exact words and proposition.");
  }
}

export interface RecordPlayerClaimInput {
  readonly stableKey: string;
  readonly eventId: EntityId;
  readonly speakerPersonId: EntityId;
  readonly audience: ClaimAudience;
  readonly stance: ClaimStance;
  /** Only when the world itself can already settle the proposition. */
  readonly worldTruth: "true" | "false" | "unknown";
}

/**
 * The player's words as a claim, and what each listener now believes they were
 * told. Recipients learn the words, not the truth: their knowledge is recorded
 * with unknown accuracy, as the engine already does for an NPC's claim.
 */
export function recordPlayerClaim(
  world: World,
  input: RecordPlayerClaimInput,
): World {
  assertStanceCoherent(input.stance);
  if (input.stance.asserted === "none") return world;
  const assertedTrue = input.stance.asserted === "affirms";
  const relationshipToTruth: ClaimRelationshipToTruth =
    input.worldTruth === "unknown"
      ? "unknown"
      : (input.worldTruth === "true") === assertedTrue
        ? "consistent"
        : "contradicts";
  let next = recordClaim(world, {
    stableKey: `${input.stableKey}:player-claim`,
    speakerPersonId: input.speakerPersonId,
    eventId: input.eventId,
    madeAt: world.currentDate,
    audience: input.audience,
    statement: input.stance.statement,
    relationshipToTruth,
    provenance: { kind: "direct-record" },
  });
  const claim = next.history.claims.at(-1)!;
  const speaker = personName(next.people[input.speakerPersonId]!);
  for (const personId of input.stance.recipientPersonIds) {
    if (personId === input.speakerPersonId) continue;
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:player-claim:heard:${personId}`,
      personId,
      eventId: input.eventId,
      learnedAt: next.currentDate,
      believedSummary: `${speaker} said: “${input.stance.statement}”`,
      accuracy: "unknown",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: input.speakerPersonId,
        claimId: claim.id,
      },
    });
  }
  return next;
}

export interface RecordedStance {
  readonly event: HistoricalEvent;
  readonly stance: ClaimStance;
}

/** Every stance this person has taken, oldest first. */
export function claimStancesBy(
  world: World,
  speakerPersonId: EntityId,
): readonly RecordedStance[] {
  return world.history.events.flatMap((event) => {
    if (
      !event.participants.some(
        (entry) =>
          entry.personId === speakerPersonId &&
          entry.role.startsWith("agency:"),
      )
    ) {
      return [];
    }
    const stance = claimStanceOf(event);
    return stance ? [{ event, stance }] : [];
  });
}

/** The discovery already recorded for this stance and person, if any. */
export function contradictionFound(
  world: World,
  stanceEventId: EntityId,
  discovererPersonId?: EntityId,
): HistoricalEvent | null {
  return (
    world.history.events.find(
      (event) =>
        event.type === CLAIM_CONTRADICTION_EVENT &&
        event.tags.includes(
          `${CLAIM_STANCE_EVENT_TAG_PREFIX}${stanceEventId}`,
        ) &&
        (discovererPersonId === undefined ||
          event.participants.some(
            (entry) =>
              entry.personId === discovererPersonId &&
              entry.role === "agency:discoverer",
          )),
    ) ?? null
  );
}
