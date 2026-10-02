import { evaluateDecision } from "../decisions";
import { currentLifeCutoff } from "../life-queries";
import { custodyFloorAt } from "../law-consequences/legal-outcome";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  World,
} from "../types";
import {
  judgePrincipleConsideration,
  SENTENCE_JAIL,
  type CourtCase,
} from "./court-reasoning";
import {
  sentencingRangeForCase,
  type SourcedSentenceRange,
} from "./sentencing-ranges";

export type CustodyTerm =
  | { readonly kind: "months"; readonly months: number }
  | { readonly kind: "life" };
export interface SentenceTermChoice {
  readonly range: SourcedSentenceRange;
  readonly evaluation: DecisionEvaluation;
  readonly term: CustodyTerm | null;
}

export function sourcedCustodyBoundsForCase(
  world: World,
  courtCase: CourtCase,
  floor: ReturnType<typeof custodyFloorAt> = custodyFloorAt(world, courtCase),
): {
  readonly range: SourcedSentenceRange;
  readonly minimumMonths: number;
  readonly maximumMonths: number | null;
} | null {
  const range = sentencingRangeForCase(courtCase);
  if (!range) return null;
  const minimumMonths = Math.max(range.minMonths, floor?.months ?? 0);
  // CTO ruling 25: the later enacted floor controls if it exceeds the old
  // ceiling. Keep the research row unchanged and expose the operative bounds.
  const maximumMonths =
    range.maxMonths === null ? null : Math.max(range.maxMonths, minimumMonths);
  return { range, minimumMonths, maximumMonths };
}

/** Select sourced legal options through the same actor decision engine. */
export function evaluateCustodyTerm(
  world: World,
  judgeId: EntityId,
  courtCase: CourtCase,
  pleaded: boolean,
  floor: ReturnType<typeof custodyFloorAt> = custodyFloorAt(world, courtCase),
): SentenceTermChoice | null {
  const bounds = sourcedCustodyBoundsForCase(world, courtCase, floor);
  if (!bounds) return null;
  const { range, minimumMonths: minimum, maximumMonths: maximum } = bounds;
  const key = `${courtCase.caseKey}:custody-term`;
  const candidates = [
    {
      key: "term:minimum",
      term: { kind: "months", months: minimum } as CustodyTerm,
    },
    ...(range.presumptiveMonths !== null &&
    range.presumptiveMonths >= minimum &&
    (maximum === null || range.presumptiveMonths <= maximum)
      ? [
          {
            key: "term:presumptive",
            term: {
              kind: "months",
              months: range.presumptiveMonths,
            } as CustodyTerm,
          },
        ]
      : []),
    {
      key: "term:maximum",
      term: range.maxLife
        ? ({ kind: "life" } as CustodyTerm)
        : ({ kind: "months", months: maximum! } as CustodyTerm),
    },
  ];
  const considerations: DecisionConsideration[] = [];
  const support = (
    suffix: string,
    optionKey: string,
    importance: DecisionConsideration["importance"],
    explanation: string,
  ) => {
    considerations.push({
      stableKey: `${key}:${suffix}`,
      optionKey,
      sourceType: "context:sentencing-law",
      direction: "supports",
      importance,
      confidence: "high",
      explanation,
      sourceRefs: [],
    });
  };
  // Authored judgment weights, not empirical estimates or sentence levels.
  support(
    "parsimony",
    "term:minimum",
    "slight",
    "Use the least term sufficient within the recorded legal range.",
  );
  if (pleaded)
    support(
      "plea",
      "term:minimum",
      "moderate",
      "They accepted responsibility through the saved guilty plea.",
    );
  const priors =
    courtCase.sentencingApplicability?.priorConvictionEventIds ?? [];
  if (priors.length)
    support(
      "priors",
      "term:maximum",
      "strong",
      "Their case records contain earlier convictions.",
    );
  if (courtCase.standingFindings > 1)
    support(
      "findings",
      "term:maximum",
      "moderate",
      "The case contains repeated standing findings.",
    );
  if (candidates.some((c) => c.key === "term:presumptive"))
    support(
      "guideline",
      "term:presumptive",
      "moderate",
      "The sourced sentencing row names this presumptive term.",
    );
  const principle = judgePrincipleConsideration(world, judgeId, key);
  if (principle)
    considerations.push({
      ...principle,
      optionKey:
        principle.optionKey === SENTENCE_JAIL ? "term:maximum" : "term:minimum",
    });
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "justice.sentence-term",
    actorPersonId: judgeId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:criminal-case",
      key: courtCase.caseKey,
      entityId: null,
    },
    options: candidates.map((candidate) => ({
      key: candidate.key,
      label:
        candidate.term.kind === "life"
          ? "Life imprisonment"
          : `${candidate.term.months} months`,
      description:
        "Choose this term from the applicable recorded sentencing range.",
    })),
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return {
    range,
    evaluation,
    term:
      candidates.find((c) => c.key === evaluation.selectedOptionKey)?.term ??
      null,
  };
}
