import { lawInForce } from "../../../governing/law-in-force";
import { recordLawExposure } from "../../../law-exposure";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import { PROSECUTION_SENTENCED_EVENT } from "../../../justice/jail-terms";
import {
  PRETRIAL_HELD_EVENT,
  PRETRIAL_RELEASED_EVENT,
} from "../../../justice/jail-terms";
import type { EntityId, World } from "../../../types";

export const JUSTICE_PERSON_EXPOSURE_KIND = "justice-person-exposure" as const;

export const CASH_BAIL_QUESTION =
  "us-policy-positions:justice-public-safety.end-cash-bail";
export const MANDATORY_MINIMUM_QUESTION =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";

const CASH_BAIL_SELECTOR = "justice.pretrial-defendant";
const SENTENCED_SELECTOR = "justice.sentenced-defendant";
const CASH_BAIL_ACTION = "record-cash-bail-exposure";
const MINIMUM_ACTION = "record-mandatory-minimum-exposure";
const CASH_BAIL_PREDICATE = "justice.saved-cash-bail-effect";
const MINIMUM_PREDICATE = "justice.saved-minimum-sentence-effect";
const STAMPED_CHANNEL = "court-outcome" as const;

function exactPredicate(row: LawConsequenceRow, capability: string): boolean {
  return (
    row.conditions.length === 1 &&
    row.conditions[0]?.capability === capability &&
    Object.keys(row.conditions[0].parameters).length === 0 &&
    row.who.predicates.length === 0
  );
}

function propositionId(world: World, questionKey: string): EntityId | null {
  return (
    Object.values(world.policyCatalog?.propositions ?? {}).find(
      (entry) => entry.stableKey === questionKey,
    )?.id ?? null
  );
}

function stampedLawForEvent(
  world: World,
  event: World["history"]["events"][number],
  questionKey: string,
) {
  if (!event.jurisdictionId || event.occurredAt > world.currentDate)
    return null;
  const id = propositionId(world, questionKey);
  if (!id) return null;
  const law = lawInForce(world, event.jurisdictionId, id, event.occurredAt);
  const stamp = event.lawEffectStamps?.find(
    (candidate) =>
      candidate.questionKey === questionKey &&
      candidate.effectKind === event.type &&
      candidate.jurisdictionId === event.jurisdictionId &&
      candidate.governingLawKey === law?.measureId &&
      candidate.appliedAt === event.occurredAt &&
      candidate.sourceRecordIds?.includes(event.id),
  );
  return law && stamp ? { law, stamp } : null;
}

function bailOutcome(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== JUSTICE_PERSON_EXPOSURE_KIND ||
    row.when !== context.activity ||
    row.who.selector !== CASH_BAIL_SELECTOR ||
    row.what !== CASH_BAIL_ACTION ||
    row.amount !== undefined ||
    row.decision?.op !== "record" ||
    row.decision.key !== "effect" ||
    row.decision.type !== "decision" ||
    !exactPredicate(row, CASH_BAIL_PREDICATE) ||
    context.activity !== "case-stage" ||
    context.questionKey !== CASH_BAIL_QUESTION ||
    context.onDate !== world.currentDate
  )
    return [];
  const event = world.history.events.find(
    (candidate) => candidate.id === context.activityId,
  );
  if (
    !event ||
    (event.type !== PRETRIAL_HELD_EVENT &&
      event.type !== PRETRIAL_RELEASED_EVENT) ||
    event.occurredAt !== context.onDate
  )
    return [];
  const personId = event.participants.find(
    (participant) => participant.role === "focus:defendant",
  )?.personId;
  if (!personId || !context.subjectIds.includes(personId)) return [];
  const authority = stampedLawForEvent(world, event, CASH_BAIL_QUESTION);
  if (!authority) return [];
  const bailTag = event.tags.find((tag) => tag.startsWith("justice.bail:"));
  const bail = bailTag ? Number(bailTag.slice("justice.bail:".length)) : null;
  if (bail !== null && (!Number.isSafeInteger(bail) || bail <= 0)) return [];

  // An unpaid cash-bail hold is a non-money loss of liberty. Bail-free release
  // is a benefit only when the operative law ended money bail. Paid, refundable
  // bail principal is not treated as a cost exposure.
  let decision: ResolvedLawConsequence["value"];
  if (bail !== null && event.type === PRETRIAL_RELEASED_EVENT) {
    // The deposit remains refundable and is not a cost attributable here.
    return [];
  } else if (bail !== null && event.type === PRETRIAL_HELD_EVENT) {
    if (authority.law.answer !== "no") return [];
    decision = { type: "decision", value: "cash-bail-hold" };
  } else if (
    bail === null &&
    event.type === PRETRIAL_RELEASED_EVENT &&
    authority.law.answer === "yes"
  ) {
    decision = { type: "decision", value: "released-without-cash-bail" };
  } else return [];

  return [
    {
      row,
      law: authority.law,
      questionKey: CASH_BAIL_QUESTION,
      jurisdictionId: event.jurisdictionId!,
      subject: { kind: "person", id: personId },
      activityId: event.id,
      effectiveAt: event.occurredAt,
      sourceRecordIds: [event.id],
      value: decision,
    },
  ];
}

function minimumOutcome(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== JUSTICE_PERSON_EXPOSURE_KIND ||
    row.when !== context.activity ||
    row.who.selector !== SENTENCED_SELECTOR ||
    row.what !== MINIMUM_ACTION ||
    row.amount?.op !== "term" ||
    row.amount.key !== "floor" ||
    row.amount.unit !== "months" ||
    row.decision !== undefined ||
    !exactPredicate(row, MINIMUM_PREDICATE) ||
    context.activity !== "case-stage" ||
    context.questionKey !== MANDATORY_MINIMUM_QUESTION ||
    context.onDate !== world.currentDate
  )
    return [];
  const event = world.history.events.find(
    (candidate) => candidate.id === context.activityId,
  );
  if (
    !event ||
    event.type !== PROSECUTION_SENTENCED_EVENT ||
    event.occurredAt !== context.onDate ||
    !event.jurisdictionId
  )
    return [];
  const personId = event.participants.find(
    (participant) => participant.role === "focus:defendant",
  )?.personId;
  if (!personId || !context.subjectIds.includes(personId)) return [];
  const consequence = (world.history.legalOutcomeConsequences ?? []).find(
    (record) =>
      record.sentenceEventId === event.id &&
      record.subjectPersonId === personId &&
      record.effectKind === "minimum-custody-months" &&
      record.appliedAt === event.occurredAt &&
      record.minimumMonths > 0 &&
      Number.isSafeInteger(record.minimumMonths),
  );
  if (!consequence) return [];
  const proposition = propositionId(world, MANDATORY_MINIMUM_QUESTION);
  const law = proposition
    ? lawInForce(world, event.jurisdictionId, proposition, event.occurredAt)
    : null;
  const stamp = consequence.lawEffectStamps[0];
  if (
    !law ||
    law.answer !== "yes" ||
    stamp.questionKey !== MANDATORY_MINIMUM_QUESTION ||
    stamp.governingLawKey !== law.measureId ||
    stamp.jurisdictionId !== event.jurisdictionId ||
    stamp.appliedAt !== event.occurredAt ||
    !stamp.sourceRecordIds?.includes(event.id) ||
    (!event.tags.includes("justice.sentence-life") &&
      !event.tags.some((tag) => {
        if (!tag.startsWith("justice.sentence-months:")) return false;
        const actualMonths = Number(
          tag.slice("justice.sentence-months:".length),
        );
        return (
          Number.isSafeInteger(actualMonths) &&
          actualMonths >= consequence.minimumMonths
        );
      })) ||
    !consequence.sourceRecordIds.includes(event.id)
  )
    return [];
  return [
    {
      row,
      law,
      questionKey: MANDATORY_MINIMUM_QUESTION,
      jurisdictionId: event.jurisdictionId,
      subject: { kind: "person", id: personId },
      activityId: event.id,
      effectiveAt: event.occurredAt,
      sourceRecordIds: [
        ...new Set([event.id, consequence.id, ...consequence.sourceRecordIds]),
      ],
      value: {
        type: "amount",
        value: consequence.minimumMonths,
        unit: "months",
      },
    },
  ];
}

export function resolveJusticePersonExposure(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (row.who.selector === CASH_BAIL_SELECTOR)
    return bailOutcome(world, row, context);
  if (row.who.selector === SENTENCED_SELECTOR)
    return minimumOutcome(world, row, context);
  return [];
}

export function applyJusticePersonExposure(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (
    resolved.row.kind !== JUSTICE_PERSON_EXPOSURE_KIND ||
    resolved.subject.kind !== "person" ||
    resolved.effectiveAt !== world.currentDate
  )
    return world;
  const current = resolveJusticePersonExposure(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    questionKey: resolved.questionKey,
  }).find(
    (entry) =>
      entry.subject.id === resolved.subject.id &&
      entry.value.type === resolved.value.type &&
      JSON.stringify(entry.value) === JSON.stringify(resolved.value) &&
      entry.law.measureId === resolved.law.measureId,
  );
  if (!current) return world;

  const isHeldBail =
    current.value.type === "decision" &&
    current.value.value === "cash-bail-hold";
  const isNoBailRelease =
    current.value.type === "decision" &&
    current.value.value === "released-without-cash-bail";
  const isMinimum =
    current.value.type === "amount" && current.value.unit === "months";
  if (!isHeldBail && !isNoBailRelease && !isMinimum) return world;
  return recordLawExposure(world, {
    stableKey: `justice-person-exposure/v1:${JSON.stringify([
      current.row.id,
      current.activityId,
      current.subject.id,
      current.law.measureId,
    ])}`,
    personId: current.subject.id,
    measureId: current.law.measureId,
    channel: STAMPED_CHANNEL as "court-outcome",
    direction: isNoBailRelease ? "gain" : "cost",
    sectionKey: current.questionKey,
    amount: null,
    cadence: null,
    sourceRecordId: isMinimum
      ? (current.sourceRecordIds.find((id) => id !== current.activityId) ??
        current.activityId)
      : current.activityId,
    includeFamily: false,
  });
}

export const registrations: readonly LawConsequenceKindRegistration[] = [
  {
    kind: JUSTICE_PERSON_EXPOSURE_KIND,
    owner: "LW-17 person landings",
    selectors: [CASH_BAIL_SELECTOR, SENTENCED_SELECTOR],
    actions: [CASH_BAIL_ACTION, MINIMUM_ACTION],
    predicates: [CASH_BAIL_PREDICATE, MINIMUM_PREDICATE],
    units: ["months"],
    resolve: resolveJusticePersonExposure,
    apply: applyJusticePersonExposure,
  },
];
