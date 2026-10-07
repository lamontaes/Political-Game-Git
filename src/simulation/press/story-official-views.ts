import { eventById } from "../event-index";
import { governingOfficeForPerson } from "../governing/state-governing";
import { officesHeldBy } from "../governing/office-consequence";
import { hasStableKey, recordsWithFieldValue } from "../history-index";
import {
  heldBeliefOn,
  issueRecordFor,
  issueRecordForVote,
} from "../issue-record";
import {
  formViewFromFactor,
  officialViewImportance,
  reactionLens,
  tellViewToHearers,
} from "../living-world/official-views";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
} from "../public-information-integrity";
import type { EntityId, World } from "../types";
import { pressRecordById } from "./store";

/** A published act can inform only a reader whose knowledge names that story. */
export function formOfficialViewsFromStory(
  world: World,
  knowledgeId: EntityId,
): World {
  const knowledge = recordsWithFieldValue(
    world.history.knowledge,
    "id",
    knowledgeId,
  )[0];
  if (
    !knowledge ||
    knowledge.learnedAt > world.currentDate ||
    knowledge.accuracy !== "accurate" ||
    knowledge.source.kind !== "media" ||
    !knowledge.source.reference ||
    (world.control.kind === "person" &&
      world.control.personId === knowledge.personId)
  )
    return world;
  const publicationId = knowledge.source.reference as EntityId;
  const publication = recordsWithFieldValue(
    world.history.publications ?? [],
    "id",
    publicationId,
  )[0];
  if (
    !publication ||
    publication.sourceEventId !== knowledge.eventId ||
    publication.sequence >= knowledge.sequence ||
    publication.publishedAt > knowledge.learnedAt ||
    publication.recordedAt > knowledge.learnedAt
  )
    return world;
  const story = eventById(world, knowledge.eventId);
  if (
    !story ||
    story.type !== PRESS_STORY_EVENT_TYPE ||
    story.sequence >= knowledge.sequence
  )
    return world;
  const leadTags = story.tags.filter((tag) =>
    tag.startsWith(PRESS_STORY_LEAD_TAG),
  );
  if (leadTags.length !== 1) return world;
  const lead = pressRecordById(
    world,
    "story-lead",
    leadTags[0]!.slice(PRESS_STORY_LEAD_TAG.length) as EntityId,
  );
  if (!lead || lead.sequence >= knowledge.sequence) return world;

  let next = world;
  for (const basisId of lead.basisEventIds) {
    const basis = eventById(world, basisId);
    if (
      !basis ||
      basis.sequence >= knowledge.sequence ||
      basis.occurredAt > knowledge.learnedAt ||
      basis.recordedAt > knowledge.learnedAt
    )
      continue;
    const acts: {
      officialId: EntityId;
      propositionId: EntityId;
      stance: "for" | "against";
    }[] = [];
    const action = recordsWithFieldValue(
      world.history.legislativeActions ?? [],
      "eventId",
      basis.id,
    ).find((row) => row.sequence < knowledge.sequence);
    const vote = action?.voteId
      ? recordsWithFieldValue(
          world.history.legislativeVotes ?? [],
          "id",
          action.voteId,
        )[0]
      : null;
    if (
      vote &&
      vote.sequence < knowledge.sequence &&
      vote.takenAt <= knowledge.learnedAt
    )
      for (const member of vote.dispositions) {
        if (!member.personId) continue;
        for (const entry of issueRecordForVote(world, vote, member.personId))
          acts.push({
            officialId: member.personId,
            propositionId: entry.propositionId,
            stance: entry.stance,
          });
      }
    if (action && (action.kind === "signed" || action.kind === "vetoed"))
      for (const participant of basis.participants) {
        if (participant.role !== "focus:subject") continue;
        for (const entry of issueRecordFor(
          world,
          participant.personId,
          basis.occurredAt,
        )) {
          if (
            entry.measureId === action.measureId &&
            entry.act === action.kind &&
            entry.at === basis.occurredAt
          )
            acts.push({
              officialId: participant.personId,
              propositionId: entry.propositionId,
              stance: entry.stance,
            });
        }
      }
    for (const position of recordsWithFieldValue(
      world.history.publicPositions,
      "sourceEventId",
      basis.id,
    )) {
      if (
        position.sourceEventId !== basis.id ||
        position.audience !== "public" ||
        position.sequence >= knowledge.sequence ||
        position.statedAt > knowledge.learnedAt ||
        (position.stance !== "support" && position.stance !== "oppose") ||
        (!governingOfficeForPerson(world, position.personId) &&
          officesHeldBy(world, position.personId).length === 0)
      )
        continue;
      acts.push({
        officialId: position.personId,
        propositionId: position.propositionId,
        stance: position.stance === "support" ? "for" : "against",
      });
    }
    for (const act of acts) {
      if (act.officialId === knowledge.personId) continue;
      const held = heldBeliefOn(
        world,
        knowledge.personId,
        act.propositionId,
        knowledge.learnedAt,
        knowledge.sequence,
      );
      if (!held || (held.position !== "support" && held.position !== "oppose"))
        continue;
      const stableKey = `official-view:story:${knowledge.id}:${basis.id}:${act.officialId}:${act.propositionId}`;
      if (hasStableKey(next.history.decisionTraces, `${stableKey}:trace`))
        continue;
      const agrees = (held.position === "support") === (act.stance === "for");
      const felt = reactionLens(next, knowledge.personId);
      next = formViewFromFactor(
        next,
        knowledge.personId,
        act.officialId,
        {
          felt,
          salience: held.salience,
          factor: {
            stableKey,
            favors: agrees ? "support" : "opposition",
            sourceType: "information:published-official-act",
            importance: officialViewImportance(felt),
            confidence: knowledge.confidence,
            explanation: `${stableKey}:${agrees ? "agrees" : "disagrees"}`,
            sourceRefs: [
              { kind: "event-knowledge", knowledgeId: knowledge.id },
              { kind: "historical-event", eventId: story.id },
              { kind: "private-belief", beliefId: held.id },
            ],
          },
        },
        stableKey,
        `${stableKey}:conflicted`,
      );
      next = tellViewToHearers(next, {
        holderId: knowledge.personId,
        officialId: act.officialId,
        eventId: story.id,
        stableKey,
      });
    }
  }
  return next;
}
