import type {
  EntityId,
  LegislativeMeasureRecord,
} from "../../simulation/types";
import type {
  DeriveMemberDispositionInput,
  DerivedMemberDisposition,
} from "../../simulation/legislative-member-decisions";
import type { decideMemberVote } from "../../simulation/governing/member-vote-decision";
import { considerationScore } from "./reason-ranking";
export interface MemberDispositionFacts {
  readonly personIds: ReadonlySet<EntityId>;
  readonly measure: LegislativeMeasureRecord;
  readonly memberEvaluation: ReturnType<typeof decideMemberVote>;
}
export function deriveMemberDisposition(
  facts: MemberDispositionFacts,
  input: DeriveMemberDispositionInput,
): Omit<DerivedMemberDisposition, "world"> {
  if (!facts.personIds.has(input.personId)) {
    throw new Error(
      `A derived member disposition needs a canonical person: ${input.personId}`,
    );
  }

  const { evaluation, disposition } = facts.memberEvaluation;
  const selected = evaluation.selectedOptionKey ?? "withhold";
  const decisive = evaluation.context.considerations
    .filter((consideration) => consideration.optionKey === selected)
    .sort(
      (a, b) =>
        Math.abs(considerationScore(b)) - Math.abs(considerationScore(a)),
    )
    .slice(0, 2)
    .map((consideration) => consideration.explanation);
  return {
    disposition,
    evaluation,
    account:
      decisive.length > 0
        ? decisive.join(" ")
        : "Nothing in the current bill moved the member either way.",
  };
}
