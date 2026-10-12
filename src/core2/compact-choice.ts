/** Saved evaluated numbers only. No evaluator, provider or current actor lookup. */
import type {
  ActOffer,
  CompactChoiceScoreV1,
  CompactChoiceTraceV1,
  DecisionResult,
} from "./types";

export function compactOriginalAnswer(
  original: Readonly<DecisionResult>,
  offers: readonly ActOffer[],
  chosenIndex: number,
): Readonly<CompactChoiceTraceV1> {
  const scores = original.scores;
  if (
    !scores ||
    scores.length !== offers.length ||
    !Number.isInteger(chosenIndex) ||
    chosenIndex < 0 ||
    chosenIndex >= offers.length
  )
    throw new Error(
      "Compact answer requires the original complete score pass.",
    );
  let runnerIndex: number | undefined;
  for (let index = 0; index < scores.length; index++) {
    const candidate = scores[index]!,
      offer = offers[index]!;
    if (
      candidate.actionId !== offer.definition.id ||
      candidate.targetId !== offer.targetId
    )
      throw new Error("Compact answer score differs from its original offer.");
    const key = `${candidate.actionId}:${candidate.targetId}`;
    if (index === chosenIndex) continue;
    const prior = runnerIndex === undefined ? undefined : scores[runnerIndex]!;
    if (
      !prior ||
      candidate.score > prior.score ||
      (candidate.score === prior.score &&
        key < `${prior.actionId}:${prior.targetId}`)
    )
      runnerIndex = index;
  }
  const compact = (index: number): Readonly<CompactChoiceScoreV1> => {
    const row = scores[index]!,
      offer = offers[index]!;
    if (
      !Number.isFinite(row.score) ||
      !Number.isFinite(offer.effortHours) ||
      !Number.isFinite(offer.availableHours)
    )
      throw new Error(
        "Compact answer requires saved finite time and score evidence.",
      );
    return Object.freeze({
      offerIndex: index,
      actionId: row.actionId,
      targetId: row.targetId,
      availableHours: offer.availableHours,
      effortHours: offer.effortHours!,
      ...(offer.driveId === undefined ? {} : { driveId: offer.driveId }),
      score: row.score,
      contributions: Object.freeze({ ...row.reasons }),
      ...(row.reasonTerms?.length
        ? {
            reasonTerms: Object.freeze(
              row.reasonTerms.map((term) =>
                Object.freeze({
                  bindingId: term.id,
                  provider: term.provider,
                  weightParameter: term.weightParameter,
                  value: term.value,
                  contribution: term.contribution,
                  ...(term.sourceIds === undefined
                    ? {}
                    : { sourceIds: Object.freeze([...term.sourceIds]) }),
                }),
              ),
            ),
          }
        : {}),
    });
  };
  return Object.freeze({
    version: "core2-compact-choice-v1",
    actorId: original.actorId,
    date: original.date,
    selection: "controlled-answer",
    chosen: compact(chosenIndex),
    ...(runnerIndex === undefined ? {} : { runnerUp: compact(runnerIndex) }),
    runnerUpStatus:
      runnerIndex === undefined ? "no-distinct-alternative" : "saved",
    sourceRecordRefs: Object.freeze([
      Object.freeze({ kind: "person", id: original.actorId }),
    ]),
  });
}

/** Validate a detached saved pair. This grants no choice or payment authority. */
export function validateCompactChoice(
  trace: Readonly<CompactChoiceTraceV1>,
): void {
  if (
    trace.version !== "core2-compact-choice-v1" ||
    !trace.actorId?.trim() ||
    !trace.date?.trim() ||
    (trace.selection !== "utility-max" &&
      trace.selection !== "controlled-answer") ||
    trace.runnerUpStatus !==
      (trace.runnerUp ? "saved" : "no-distinct-alternative")
  )
    throw new Error("Malformed compact choice identity or alternative status.");
  for (const row of [
    trace.chosen,
    ...(trace.runnerUp ? [trace.runnerUp] : []),
  ]) {
    if (
      !Number.isSafeInteger(row.offerIndex) ||
      row.offerIndex < 0 ||
      !row.actionId?.trim() ||
      !row.targetId?.trim() ||
      !Number.isFinite(row.availableHours) ||
      row.availableHours < 0 ||
      !Number.isFinite(row.effortHours) ||
      row.effortHours < 0 ||
      !Number.isFinite(row.score)
    )
      throw new Error("Malformed compact choice offer or score.");
    const values = Object.values(row.contributions);
    if (
      values.some((value) => !Number.isFinite(value)) ||
      values.reduce((sum, value) => sum + value, 0) !== row.score
    )
      throw new Error(
        "Compact choice contributions differ from its saved score.",
      );
    for (const term of row.reasonTerms ?? [])
      if (
        !term.bindingId?.trim() ||
        !term.provider?.trim() ||
        !term.weightParameter?.trim() ||
        !Number.isFinite(term.value) ||
        !Number.isFinite(term.contribution) ||
        term.sourceIds?.some((id) => !id.trim())
      )
        throw new Error("Malformed compact choice provider contribution.");
  }
  if (trace.runnerUp && trace.chosen.offerIndex === trace.runnerUp.offerIndex)
    throw new Error(
      "Compact runner-up must be a distinct original offered option.",
    );
  if (
    !trace.sourceRecordRefs.some(
      (ref) => ref.kind === "person" && ref.id === trace.actorId,
    ) ||
    trace.sourceRecordRefs.some((ref) => !ref.kind.trim() || !ref.id.trim())
  )
    throw new Error("Compact choice has lost its actual actor reference.");
}
