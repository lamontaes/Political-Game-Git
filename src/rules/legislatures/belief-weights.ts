import type { EntityId, DecisionConsideration } from "../../simulation/types";
import type { readTrait } from "../../simulation/trait-readings";
const MEMBER_BELIEF_IMPORTANCE = [
  "slight",
  "moderate",
  "strong",
  "decisive",
] as const;

export function weighRecordedPolicyBeliefs(
  reading: ReturnType<typeof readTrait> | null,
  personId: EntityId,
  considerations: readonly DecisionConsideration[],
): readonly DecisionConsideration[] {
  if (!reading) return considerations;
  if (reading.state !== "recorded" || reading.value === 0)
    return considerations;
  const direction = reading.value < 0 ? 1 : -1;
  const steps = Math.abs(reading.value);
  return considerations.map((consideration) => {
    if (
      consideration.sourceType !== "belief:formed-position" ||
      !consideration.sourceRefs.some(
        (reference) => reference.kind === "private-belief",
      )
    )
      return consideration;
    const current = MEMBER_BELIEF_IMPORTANCE.indexOf(
      consideration.importance as (typeof MEMBER_BELIEF_IMPORTANCE)[number],
    );
    if (current < 0) return consideration;
    const next = Math.max(
      0,
      Math.min(
        MEMBER_BELIEF_IMPORTANCE.length - 1,
        current + direction * steps,
      ),
    );
    if (next === current) return consideration;
    return {
      ...consideration,
      importance: MEMBER_BELIEF_IMPORTANCE[next]!,
      explanation:
        consideration.explanation +
        (direction > 0
          ? " Their recorded deliberation gives this considered view more weight."
          : " Their recorded impulsiveness gives this considered view less weight."),
      sourceRefs: [
        ...consideration.sourceRefs,
        { kind: "personality-tendency", tendencyRecordId: reading.recordId },
      ],
    };
  });
}
