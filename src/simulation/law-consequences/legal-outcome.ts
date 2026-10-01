import { lawInForce } from "../governing/law-in-force";
import { propositionIdByKey } from "../justice/pretrial";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceHandler,
} from "../law-consequence-types";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import type { HistoricalEvent } from "../types";

/** Attribute an actual saved legal determination; never invent a ruling. */
export const applySavedLegalOutcome: LawConsequenceHandler = (
  world,
  resolved,
) => {
  const {
    row,
    law,
    subject,
    activityId,
    effectiveAt,
    questionKey,
    jurisdictionId,
    sourceRecordIds,
    value,
  } = resolved;
  if (
    row.kind !== "legal-outcome" ||
    row.what !== "attribute-saved-legal-outcome"
  )
    throw new Error("Unsupported legal-outcome action");
  if (row.onRepeal !== "preserve-completed")
    throw new Error(
      "Saved legal outcomes must preserve completed consequences",
    );
  if (
    row.amount !== undefined ||
    row.decision?.op !== "record" ||
    row.decision.key !== "legal-outcome.saved-decision" ||
    row.decision.type !== "decision"
  )
    throw new Error(
      "Legal attribution requires an actual saved decision, not an amount",
    );
  if (
    subject.kind !== "person" ||
    effectiveAt !== world.currentDate ||
    value.type !== "decision"
  )
    return world;
  const index = world.history.events.findIndex(
    (event) => event.id === activityId,
  );
  const event = world.history.events[index];
  if (
    !event ||
    event.occurredAt !== effectiveAt ||
    event.type !== value.value ||
    !event.type.startsWith("justice.") ||
    !event.participants.some(
      (person) =>
        person.personId === subject.id && person.role === "focus:defendant",
    )
  )
    return world;
  const saved = event as HistoricalEvent & LawEffectStampedRecord;
  // A completed decision never gains a replacement law merely because the
  // current law changed. Its original attribution and result remain intact.
  if (saved.lawEffectStamps?.some((prior) => prior.questionKey === questionKey))
    return world;
  const stamp = lawEffectStamp(law, {
    effectKind: event.type,
    questionKey,
    jurisdictionId,
    appliedAt: event.occurredAt,
    sourceRecordIds: [...new Set([...sourceRecordIds, event.id])],
  });
  if (!stamp) return world;
  const stamped: HistoricalEvent & LawEffectStampedRecord = {
    ...event,
    lawEffectStamps: [...(saved.lawEffectStamps ?? []), stamp],
  };
  return {
    ...world,
    history: {
      ...world.history,
      events: world.history.events.map((prior, position) =>
        position === index ? stamped : prior,
      ),
    },
  };
};

/** Registration proposal only: coordinator owns registry admission. */
export const legalOutcomeRegistration: LawConsequenceKindRegistration = {
  kind: "legal-outcome",
  owner: "Team9",
  selectors: ["legal-outcome.saved-defendant"],
  actions: ["attribute-saved-legal-outcome"],
  predicates: ["legal-outcome.governing-question"],
  units: [],
  resolve: (world, row, context) => {
    if (
      row.who.selector !== "legal-outcome.saved-defendant" ||
      row.kind !== "legal-outcome" ||
      row.what !== "attribute-saved-legal-outcome" ||
      row.when !== context.activity ||
      row.amount !== undefined ||
      row.decision?.op !== "record" ||
      row.decision.key !== "legal-outcome.saved-decision" ||
      row.decision.type !== "decision" ||
      row.who.predicates.length ||
      row.conditions.length !== 1 ||
      row.conditions[0]?.capability !== "legal-outcome.governing-question"
    )
      return [];
    const questionKey = row.conditions[0].parameters.questionKey;
    if (typeof questionKey !== "string" || context.onDate !== world.currentDate)
      return [];
    const event = world.history.events.find(
      (event) => event.id === context.activityId,
    );
    if (
      !event ||
      event.occurredAt !== context.onDate ||
      !event.type.startsWith("justice.")
    )
      return [];
    const subjectId = event.participants.find(
      (person) => person.role === "focus:defendant",
    )?.personId;
    if (!subjectId || !context.subjectIds.includes(subjectId)) return [];
    // Existing writer attribution supplies its actual court venue. Never
    // substitute a home, referral or state jurisdiction for missing provenance.
    const prior = (
      event as HistoricalEvent & LawEffectStampedRecord
    ).lawEffectStamps?.find((stamp) => stamp.questionKey === questionKey);
    if (!prior) return [];
    const propositionId = propositionIdByKey(world, questionKey);
    const law = propositionId
      ? lawInForce(world, prior.jurisdictionId, propositionId, context.onDate)
      : null;
    if (!law || law.measureId !== prior.governingLawKey) return [];
    return [
      {
        row,
        law,
        questionKey,
        jurisdictionId: prior.jurisdictionId,
        subject: { kind: "person", id: subjectId },
        activityId: event.id,
        effectiveAt: context.onDate,
        sourceRecordIds: [...(prior.sourceRecordIds ?? [event.id])],
        value: { type: "decision", value: event.type },
      },
    ];
  },
  apply: applySavedLegalOutcome,
};
