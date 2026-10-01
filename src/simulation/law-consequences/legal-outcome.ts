import { lawInForce, type LawInForce } from "../governing/law-in-force";
import {
  readFinalEnactedLawTerm,
  type FinalEnactedLawTerm,
} from "../governing/automatic-legislation";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceRow,
} from "../law-consequence-types";
import type { EntityId, IsoDate, World } from "../types";
import type { CourtCase } from "../justice/court-reasoning";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_MONTHS_TAG,
} from "../justice/jail-terms";

export const MINIMUM_CUSTODY_QUESTION =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";

/** Terms describe the rule; they never supply an invented sentence length. */
export const minimumCustodyRow: LawConsequenceRow = {
  id: "justice:minimum-custody-months",
  kind: "legal-outcome",
  when: "case-stage",
  who: { selector: "court.saved-defendant", predicates: [] },
  what: "minimum-custody-months",
  amount: { op: "term", key: "floor", unit: "months" },
  conditions: [
    { capability: "court.covered-offense", parameters: { term: "coverage" } },
  ],
  lag: {
    days: 0,
    sourceIds: ["data/research/laws/catalog-terms-batch-02.json"],
  },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/laws/catalog-terms-batch-02.json"],
    population:
      "Defendants convicted of an offense explicitly covered by the operative law",
    scope:
      "An enacted numeric floor in months; exact offense coverage is required",
    why: "The sentencing court must give at least the custody term the operative law requires for this offense.",
    uncertainty:
      "No starting-law floor or offense coverage is inferred from a yes/no answer.",
  },
};

/** Numeric rules come exclusively from the final provision at enactment. */
export function readMinimumCustodyTerm(
  world: World,
  law: LawInForce,
  questionKey = MINIMUM_CUSTODY_QUESTION,
  row: LawConsequenceRow = minimumCustodyRow,
): FinalEnactedLawTerm | null {
  const amount = row.amount;
  if (law.answer !== "yes" || amount?.op !== "term" || amount.unit !== "months")
    return null;
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey: amount.key,
    unit: amount.unit,
  });
  return term && Number.isSafeInteger(term.value) && term.value >= 0
    ? term
    : null;
}

interface CustodyFloor {
  readonly months: number;
  readonly law: LawInForce;
  readonly questionKey: string;
  readonly sourceRecordIds: readonly EntityId[];
}

/** Resolve the case's operative law; a numeric amount alone grants no coverage. */
export function custodyFloorAt(
  world: World,
  courtCase: Pick<CourtCase, "venueJurisdictionId" | "offenseKey">,
  questionKey = MINIMUM_CUSTODY_QUESTION,
  row: LawConsequenceRow = minimumCustodyRow,
  onDate: IsoDate = world.currentDate,
): CustodyFloor | null {
  if (!courtCase.venueJurisdictionId) return null;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === questionKey,
  );
  if (!proposition) return null;
  const law = lawInForce(
    world,
    courtCase.venueJurisdictionId,
    proposition.id,
    onDate,
  );
  if (!law || !readMinimumCustodyTerm(world, law, questionKey, row))
    return null;
  // CTO-approved final lawCategories reader is a separate Team1 publication.
  // Until its actual covered-offense record is available, this case is unsupported.
  // Neither draft lineage nor a blanket offense list can establish coverage.
  return null;
}

/** First legal-outcome caller: attribution of the floor the sentencing writer applied. */
export const legalOutcomeRegistration: LawConsequenceKindRegistration = {
  kind: "legal-outcome",
  owner: "Team9",
  selectors: ["court.saved-defendant"],
  actions: ["minimum-custody-months"],
  predicates: ["court.covered-offense"],
  units: ["months"],
  resolve(world, row, context) {
    if (
      row.kind !== "legal-outcome" ||
      row.who.selector !== "court.saved-defendant" ||
      row.who.predicates.length !== 0 ||
      row.conditions.length !== 1 ||
      row.conditions[0]?.capability !== "court.covered-offense" ||
      row.what !== "minimum-custody-months" ||
      context.activity !== "case-stage" ||
      !context.questionKey
    )
      return [];
    const event = world.history.events.find(
      (entry) => entry.id === context.activityId,
    );
    if (
      !event ||
      event.type !== PROSECUTION_SENTENCED_EVENT ||
      event.occurredAt !== context.onDate
    )
      return [];
    const personId = event.participants.find(
      (entry) => entry.role === "focus:defendant",
    )?.personId;
    if (!personId || !context.subjectIds.includes(personId)) return [];
    const offenseKey = event.tags
      .find((tag) => tag.startsWith("justice.offense:"))
      ?.slice("justice.offense:".length);
    const venueJurisdictionId = event.jurisdictionId;
    if (!offenseKey || !venueJurisdictionId) return [];
    const floor = custodyFloorAt(
      world,
      { venueJurisdictionId, offenseKey },
      context.questionKey,
      row,
      context.onDate,
    );
    if (!floor) return [];
    return [
      {
        row,
        law: floor.law,
        questionKey: floor.questionKey,
        jurisdictionId: venueJurisdictionId,
        subject: { kind: "person", id: personId },
        activityId: event.id,
        effectiveAt: event.occurredAt,
        sourceRecordIds: [event.id, ...floor.sourceRecordIds],
        value: { type: "amount", value: floor.months, unit: "months" },
      },
    ];
  },
  apply(world, resolved) {
    if (
      resolved.row.kind !== "legal-outcome" ||
      resolved.row.what !== "minimum-custody-months" ||
      resolved.value.type !== "amount" ||
      resolved.value.unit !== "months" ||
      !Number.isSafeInteger(resolved.value.value) ||
      resolved.value.value < 0 ||
      resolved.subject.kind !== "person" ||
      resolved.effectiveAt !== world.currentDate ||
      resolved.law.operativeAt > resolved.effectiveAt
    )
      return world;
    const index = world.history.events.findIndex(
      (entry) => entry.id === resolved.activityId,
    );
    const event = world.history.events[index] as
      | ((typeof world.history.events)[number] & LawEffectStampedRecord)
      | undefined;
    if (
      !event ||
      event.type !== PROSECUTION_SENTENCED_EVENT ||
      event.occurredAt !== resolved.effectiveAt ||
      !event.participants.some(
        (entry) =>
          entry.role === "focus:defendant" &&
          entry.personId === resolved.subject.id,
      )
    )
      return world;
    if (
      event.lawEffectStamps?.some(
        (stamp) => stamp.questionKey === resolved.questionKey,
      )
    )
      return world;
    const months = Number(
      event.tags
        .find((tag) => tag.startsWith(SENTENCE_MONTHS_TAG))
        ?.slice(SENTENCE_MONTHS_TAG.length),
    );
    if (!Number.isFinite(months) || months < resolved.value.value) return world;
    const stamp = lawEffectStamp(resolved.law, {
      effectKind: "minimum-custody-months",
      questionKey: resolved.questionKey,
      jurisdictionId: resolved.jurisdictionId,
      appliedAt: event.occurredAt,
      sourceRecordIds: resolved.sourceRecordIds,
    });
    if (!stamp) return world;
    const events = world.history.events.slice();
    events[index] = {
      ...event,
      lawEffectStamps: [...(event.lawEffectStamps ?? []), stamp],
    };
    return { ...world, history: { ...world.history, events } };
  },
};
