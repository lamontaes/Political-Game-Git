import type { HistoricalEvent } from "../../simulation/types";
import type { CitizenPetition } from "../../simulation/recall";
import { resolveRequiredSignatures } from "../offices/signatures";
export interface RecallCloseFacts {
  readonly petition: CitizenPetition | null;
  readonly validSignatures: number;
  readonly registeredVoters: number;
  readonly distributionReviewId: string | null;
  readonly targetHoldsSeat: boolean;
  readonly startingThreshold:
    Parameters<typeof resolveRequiredSignatures>[0] | null;
  readonly electionDate: string | null;
}
export function recallPetitionCloses(facts: RecallCloseFacts) {
  const p = facts.petition;
  if (!p || p.phase !== "circulating") return { kind: "no-petition" as const };
  if (p.kind !== "recall") {
    const required = Math.ceil(
      (facts.registeredVoters * Number(p.rule.threshold.percent)) / 100,
    );
    if (facts.registeredVoters === 0 || facts.validSignatures < required)
      return { kind: "failed" as const, required };
    const distribution = Number(p.rule.distribution.requiredFraction ?? 0);
    if (distribution > 0 && !facts.distributionReviewId)
      return {
        kind: "blocked" as const,
        reasonKey: "petition:distribution-review-required",
        required,
        distribution,
      };
    return {
      kind: "qualified" as const,
      required,
      distributionReviewId: facts.distributionReviewId,
      electionDate: null,
    };
  }
  if (!facts.targetHoldsSeat) return { kind: "lapsed" as const };
  const threshold = p.threshold ?? facts.startingThreshold;
  if (!threshold)
    return {
      kind: "blocked" as const,
      reasonKey: "recall:missing-legal-threshold",
    };
  const required = resolveRequiredSignatures(threshold, facts.registeredVoters);
  if (facts.registeredVoters === 0 || facts.validSignatures < required)
    return { kind: "failed" as const, required };
  if (!facts.electionDate)
    return {
      kind: "blocked" as const,
      reasonKey: "recall:missing-election-calendar",
      required,
    };
  return {
    kind: "qualified" as const,
    required,
    electionDate: facts.electionDate,
  };
}

export function pendingPlayerSignatureRequests(
  events: readonly HistoricalEvent[],
  petition: { readonly stableKey: string; readonly closesAt: string },
  currentDate: string,
) {
  return events
    .filter(
      (row) =>
        row.type === "civic.petition-asked" &&
        row.tags.includes(`petition:${petition.stableKey}`) &&
        row.tags.includes("answer-mode:player") &&
        row.occurredAt <= petition.closesAt &&
        row.recordedAt <= currentDate,
    )
    .map((request) => ({
      circulatorPersonId: request.participants.find(
        (row) => row.role === "agency:circulator",
      )!.personId,
      signerPersonId: request.participants.find(
        (row) => row.role === "focus:requested",
      )!.personId,
      askEventId: request.id,
    }));
}
export function distributionReview(
  events: readonly HistoricalEvent[],
  petitionKey: string,
  currentDate: string,
) {
  return (
    events.find(
      (row) =>
        row.type === "civic.petition-signature-reviewed" &&
        row.tags.includes(`petition:${petitionKey}`) &&
        row.tags.includes("distribution:valid") &&
        row.occurredAt <= currentDate &&
        row.recordedAt <= currentDate,
    ) ?? null
  );
}

// stopgapId: "SG-P14-elections-recall-denominator-proxy"
