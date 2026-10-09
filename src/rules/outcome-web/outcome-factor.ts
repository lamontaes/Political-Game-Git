import {
  shapedLinkFactorFromFacts,
  type OutcomeLinkFactorFacts,
} from "./link-factor";

export interface OutcomeFactorModeratorFacts {
  readonly mode: "scale" | "only-when";
  readonly effectAtFull: number;
  readonly level: number | null;
}

export interface OutcomeFactorCauseFacts {
  readonly key: string;
  readonly from: string;
  readonly link: OutcomeLinkFactorFacts;
  readonly value: number | null;
  readonly baseline: number | null;
  readonly readAt: string;
  readonly evidence: string;
  readonly eligible: boolean;
  readonly endedByRevert: boolean;
  readonly moderator?: OutcomeFactorModeratorFacts;
}

export interface OutcomeFactorCause {
  readonly key: string;
  readonly from: string;
  readonly factor: number;
  readonly causeValue: number;
  readonly causeBaseline: number;
  readonly readAt: string;
  readonly evidence: string;
}

export interface OutcomeFactorReading {
  readonly outcome: string;
  readonly multiplier: number;
  readonly causes: readonly OutcomeFactorCause[];
}

/** Compose a place outcome once link, measure, baseline, and moderator facts are selected. */
export function outcomeFactorFromFacts(
  outcome: string,
  candidates: readonly OutcomeFactorCauseFacts[],
): OutcomeFactorReading {
  const causes: OutcomeFactorCause[] = [];
  for (const candidate of candidates) {
    if (
      !candidate.eligible ||
      candidate.endedByRevert ||
      candidate.value === null ||
      candidate.baseline === null
    )
      continue;
    let factor = shapedLinkFactorFromFacts(
      candidate.link,
      candidate.value,
      candidate.baseline,
    );
    if (candidate.moderator) {
      const { mode, effectAtFull, level } = candidate.moderator;
      if (level !== null) {
        const scale =
          mode === "only-when"
            ? Math.min(1, Math.max(0, level))
            : 1 + effectAtFull * level;
        factor = 1 + (factor - 1) * scale;
      } else if (mode === "only-when") {
        continue;
      }
    }
    causes.push({
      key: candidate.key,
      from: candidate.from,
      factor,
      causeValue: candidate.value,
      causeBaseline: candidate.baseline,
      readAt: candidate.readAt,
      evidence: candidate.evidence,
    });
  }
  return {
    outcome,
    multiplier: causes.reduce((total, cause) => total * cause.factor, 1),
    causes,
  };
}
