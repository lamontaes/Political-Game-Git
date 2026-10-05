import {
  currentHistoricalCutoff,
  evaluateDecision,
  recordDurableDecisionTrace,
  type DecisionConsideration,
  type EntityId,
  type LifeHistoryRecordFamily,
  type MindSourceReference,
  type World,
} from "../simulation";
import { recordById } from "../simulation/history-index";
import { resolveLifeHistorySource } from "../simulation/life-sources";
import type { EpisodeBeat } from "../simulation/life-episodes";
import type { ThreadAnchor } from "../simulation/narrative-threads";

const LIFE_FAMILIES: Partial<
  Record<ThreadAnchor["store"], LifeHistoryRecordFamily>
> = {
  workRelationships: "work-relationship",
  householdMemberships: "household-membership",
  kinshipRelationships: "kinship",
  partnerships: "partnership",
  careResponsibilities: "care-responsibility",
  educationEnrollments: "education-enrollment",
  childAuthorities: "child-authority",
  lifeCommitments: "life-commitment",
  organizationParticipations: "organization-participation",
  resourceObligations: "resource-obligation",
};
type Candidate = {
  readonly definition: { readonly key: string };
  readonly beat: Pick<EpisodeBeat, "stageKey" | "causalInputs" | "stakes">;
};
function sourceFor(
  world: World,
  personId: EntityId,
  anchor: ThreadAnchor,
): MindSourceReference | null {
  const cutoff = currentHistoricalCutoff(world);
  if (
    anchor.at > cutoff.asOfDate ||
    (anchor.sequence !== null &&
      anchor.sequence >= cutoff.historySequenceExclusive)
  )
    return null;
  if (anchor.store === "events") {
    const event = recordById(world.history.events, anchor.recordId);
    return event?.involvedEntityIds.includes(personId)
      ? { kind: "historical-event", eventId: event.id }
      : null;
  }
  if (anchor.store === "memories") {
    const memory = recordById(world.history.memories, anchor.recordId);
    return memory?.personId === personId
      ? { kind: "memory", memoryId: memory.id }
      : null;
  }
  if (anchor.store === "relationshipInteractions") {
    const interaction = recordById(
      world.history.relationshipInteractions,
      anchor.recordId,
    );
    return interaction?.personIds.includes(personId)
      ? { kind: "relationship-interaction", interactionId: interaction.id }
      : null;
  }
  const family = LIFE_FAMILIES[anchor.store];
  if (!family) return null;
  const reference = { family, recordId: anchor.recordId };
  const source = resolveLifeHistorySource(world, reference);
  return source.personIds.includes(personId) &&
    source.effectiveAt <= cutoff.asOfDate &&
    source.sequence < cutoff.historySequenceExclusive
    ? { kind: "life-history", reference }
    : null;
}

/** No record-supported separation means no unsolicited scene, not list order. */
export function chooseSceneFromRecordedReasons<T extends Candidate>(
  world: World,
  personId: EntityId,
  candidates: readonly T[],
) {
  const keyOf = (candidate: T) =>
    `${candidate.definition.key}:${candidate.beat.stageKey}`;
  const subjectKey = [...candidates.map(keyOf)].sort().join("|");
  const previous = world.history.decisionTraces.at(-1);
  if (
    previous &&
    previous.sequence + 1 === world.history.nextSequence &&
    previous.context.decisionType === "life.scene.person-reason" &&
    previous.context.actorPersonId === personId &&
    previous.context.subject.key === subjectKey
  ) {
    return {
      world,
      choice:
        candidates.find(
          (candidate) => keyOf(candidate) === previous.selectedOptionKey,
        ) ?? null,
      decisionTraceId: previous.id,
    };
  }
  const considerations: DecisionConsideration[] = candidates.flatMap(
    (candidate) => {
      const seen = new Set<EntityId>();
      return candidate.beat.causalInputs.flatMap((input, index) => {
        const refs = input.satisfiedBy.flatMap((anchor) => {
          if (seen.has(anchor.recordId)) return [];
          const ref = sourceFor(world, personId, anchor);
          if (!ref) return [];
          seen.add(anchor.recordId);
          return [ref];
        });
        return refs.length
          ? [
              {
                stableKey: `${keyOf(candidate)}:cause:${index}`,
                optionKey: keyOf(candidate),
                sourceType: "context:recorded-person-circumstance" as const,
                direction: "supports" as const,
                importance:
                  candidate.beat.stakes === "pressing"
                    ? ("strong" as const)
                    : candidate.beat.stakes === "notable"
                      ? ("moderate" as const)
                      : ("slight" as const),
                confidence: "high" as const,
                explanation: input.detail,
                sourceRefs: refs,
              },
            ]
          : [];
      });
    },
  );
  const evaluation = evaluateDecision(world, {
    stableKey: `life.scene.person-reason:${personId}:${world.currentDate}:${world.history.nextSequence}`,
    decisionType: "life.scene.person-reason",
    actorPersonId: personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:opening-scene",
      key: subjectKey,
      entityId: personId,
    },
    options: [
      ...candidates.map((candidate) => ({
        key: keyOf(candidate),
        label: candidate.definition.key,
        description: "Consider the scene's recorded circumstances.",
      })),
      {
        key: "leave-quiet",
        label: "Leave the moment quiet",
        description: "Do not introduce an unsolicited scene.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  return {
    world: next,
    choice:
      candidates.find(
        (candidate) => keyOf(candidate) === evaluation.selectedOptionKey,
      ) ?? null,
    decisionTraceId: next.history.decisionTraces.at(-1)!.id,
  };
}
