import { viewOfOfficial } from "./official-view-reads";
import type { EntityId, EventKnowledgeRecord, World } from "./types";

/** A saved statement the player learned from someone or witnessed being said. */
export interface PlayerHeardStatement {
  readonly speakerId: EntityId;
  readonly speakerName: string;
  readonly statement: string;
  readonly saidAt: string;
  readonly learnedAt: string;
  readonly knowledgeId: EntityId;
  readonly claimId: EntityId;
}

/**
 * Read the player's people-you-know list from saved statement claims and the
 * knowledge records that delivered those claims. No population inference or
 * reputation total is performed.
 */
export function statementsHeardByPlayer(
  world: World,
  playerId: EntityId,
): readonly PlayerHeardStatement[] {
  if (world.control.kind !== "person" || world.control.personId !== playerId) return [];
  const entries: PlayerHeardStatement[] = [];
  for (const knowledge of world.history.knowledge) {
    if (knowledge.personId !== playerId) continue;
    if (knowledge.source.kind !== "told-by" || knowledge.source.claimId === null) continue;
    const claim = world.history.claims.find((row) => row.id === knowledge.source.claimId);
    if (
      !claim ||
      claim.eventId !== knowledge.eventId ||
      claim.speakerPersonId !== knowledge.source.sourcePersonId
    ) continue;
    const speaker = world.people[claim.speakerPersonId];
    if (!speaker) continue;
    entries.push({
      speakerId: speaker.id,
      speakerName: `${speaker.givenName} ${speaker.familyName}`,
      statement: claim.statement,
      saidAt: claim.madeAt,
      learnedAt: knowledge.learnedAt,
      knowledgeId: knowledge.id,
      claimId: claim.id,
    });
  }
  return entries.sort(
    (a, b) =>
      a.learnedAt.localeCompare(b.learnedAt) ||
      a.knowledgeId.localeCompare(b.knowledgeId),
  );
}

export type OfficialViewCue = {
  readonly personId: EntityId;
  readonly stance: "support" | "oppose" | "mixed";
};

/**
 * Record-backed scene cue for people actually present. It returns a cue only
 * where that person has a saved view of the player. Session 4's consumer seam:
 * pass viewer/player id plus actual present person ids; use each returned
 * person's saved view as a grounded fact for the scene situation/English
 * packet. This function does not create dialogue or write records.
 */
export function officialViewCuesForPresentPeople(
  world: World,
  playerId: EntityId,
  presentPersonIds: readonly EntityId[],
): readonly OfficialViewCue[] {
  const cues: OfficialViewCue[] = [];
  for (const personId of presentPersonIds) {
    if (personId === playerId || !world.people[personId]) continue;
    const view = viewOfOfficial(world, personId, playerId);
    if (!view.belief && view.rows.length === 0) continue;
    const points = view.belief
      ? view.belief.position === "support"
        ? 1
        : view.belief.position === "oppose"
          ? -1
          : 0
      : view.points > 0
        ? 1
        : view.points < 0
          ? -1
          : 0;
    cues.push({
      personId,
      stance: points > 0 ? "support" : points < 0 ? "oppose" : "mixed",
    });
  }
  return cues;
}
