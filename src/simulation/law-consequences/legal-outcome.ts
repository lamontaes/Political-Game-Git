import { lawInForce, type LawInForce } from "../governing/law-in-force";
import {
  readFinalEnactedLawTerm,
  readFinalEnactedLawCategories,
  type FinalEnactedLawTerm,
} from "../governing/automatic-legislation";
import { isLawEffectStamp, lawEffectStamp } from "../law-effect-stamp";
import { executiveEnforcementPriorityForLaw } from "../executive-enforcement-reader";
import { appendedList } from "../history-index";
import { createStableId } from "../ids";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceRow,
} from "../law-consequence-types";
import type {
  EntityId,
  IsoDate,
  LegalOutcomeConsequenceRecord,
  World,
} from "../types";
import type { CourtCase } from "../justice/court-reasoning";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_MONTHS_TAG,
  SENTENCE_LIFE_TAG,
} from "../justice/jail-terms";

export const MINIMUM_CUSTODY_QUESTION =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";

/** Order saved legal outcomes by the executive's recorded enforcement direction. */
export function rankLegalOutcomeEnforcement<
  T extends {
    readonly enforcementPriority?: "first" | "ordinary" | "lowest";
    readonly sequence: number;
  },
>(records: readonly T[]): readonly T[] {
  const rank = (priority: T["enforcementPriority"]) =>
    priority === "first" ? 0 : priority === "lowest" ? 2 : 1;
  return [...records].sort(
    (left, right) =>
      rank(left.enforcementPriority) - rank(right.enforcementPriority) ||
      left.sequence - right.sequence,
  );
}

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

/** The inclusive ceiling is a numeric rule, never a Boolean-age conversion. */
export const juvenileJurisdictionRow: LawConsequenceRow = {
  id: "justice:juvenile-jurisdiction-ceiling",
  kind: "legal-outcome",
  when: "case-stage",
  who: { selector: "court.saved-defendant", predicates: [] },
  what: "juvenile-jurisdiction-ceiling",
  amount: { op: "term", key: "age", unit: "years" },
  conditions: [],
  lag: { days: 0, sourceIds: ["data/research/laws/starting-law-2026.json"] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/laws/starting-law-2026.json"],
    population:
      "People considered for adult charging in the incident jurisdiction",
    scope:
      "The dated law's inclusive upper age of general juvenile jurisdiction",
    why: "The operative age ceiling determines general juvenile jurisdiction before adult charging.",
    uncertainty:
      "Adult transfer requires a saved authorized decision; this row grants no transfer and fills no unread age.",
  },
};

export function readJuvenileJurisdictionTerm(
  world: World,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): FinalEnactedLawTerm | null {
  const amount = juvenileJurisdictionRow.amount;
  if (amount?.op !== "term") return null;
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey: amount.key,
    unit: amount.unit,
    onDate,
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
  if (!law) return null;
  const term = readMinimumCustodyTerm(world, law, questionKey, row);
  if (!term) return null;
  const coverageKey = row.conditions.find(
    (entry) => entry.capability === "court.covered-offense",
  )?.parameters.term;
  if (typeof coverageKey !== "string") return null;
  const coverage = readFinalEnactedLawCategories(world, law, {
    questionKey,
    termKey: coverageKey,
  });
  // crime/producer.ts arrestReferral saves keys as `crime:${offense}`.
  // Only the enacted raw category values establish coverage, never a default list.
  if (
    !coverage?.values.some((kind) => courtCase.offenseKey === `crime:${kind}`)
  )
    return null;
  return {
    months: term.value,
    law,
    questionKey,
    sourceRecordIds: [
      ...new Set([...term.sourceRecordIds, ...coverage.sourceRecordIds]),
    ],
  };
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
    const event = world.history.events.find(
      (entry) => entry.id === resolved.activityId,
    );
    if (
      !event ||
      event.type !== PROSECUTION_SENTENCED_EVENT ||
      event.jurisdictionId !== resolved.jurisdictionId ||
      event.occurredAt !== resolved.effectiveAt ||
      !event.participants.some(
        (entry) =>
          entry.role === "focus:defendant" &&
          entry.personId === resolved.subject.id,
      )
    )
      return world;
    const months = Number(
      event.tags
        .find((tag) => tag.startsWith(SENTENCE_MONTHS_TAG))
        ?.slice(SENTENCE_MONTHS_TAG.length),
    );
    const life = event.tags.includes(SENTENCE_LIFE_TAG);
    if (!life && (!Number.isFinite(months) || months < resolved.value.value))
      return world;
    const stamp = lawEffectStamp(resolved.law, {
      effectKind: "legal-outcome",
      questionKey: resolved.questionKey,
      jurisdictionId: resolved.jurisdictionId,
      appliedAt: event.occurredAt,
      sourceRecordIds: resolved.sourceRecordIds,
    });
    if (!stamp) return world;
    const stableKey = `legal-outcome/v1:${JSON.stringify([
      event.id,
      resolved.subject.id,
      resolved.row.id,
      resolved.questionKey,
      resolved.law.measureId,
    ])}`;
    const prior = world.history.legalOutcomeConsequences ?? [];
    const existing = prior.find((record) => record.stableKey === stableKey);
    if (existing) {
      if (existing.minimumMonths !== resolved.value.value)
        throw new Error("Conflicting minimum for the same saved sentence.");
      return world;
    }
    const enforcementProposition = Object.values(
      world.policyCatalog.propositions,
    ).find((proposition) => proposition.stableKey === resolved.questionKey);
    const enforcementPriority = enforcementProposition
      ? executiveEnforcementPriorityForLaw(
          world,
          resolved.jurisdictionId,
          enforcementProposition.id,
          resolved.law.measureId,
          resolved.effectiveAt,
        )
      : null;
    const record: LegalOutcomeConsequenceRecord = {
      id: createStableId("decision", `${world.id}:${stableKey}`),
      stableKey,
      sequence: world.history.nextSequence,
      recordedAt: world.currentDate,
      sentenceEventId: event.id,
      subjectPersonId: resolved.subject.id,
      jurisdictionId: resolved.jurisdictionId,
      appliedAt: event.occurredAt,
      effectKind: "minimum-custody-months",
      minimumMonths: resolved.value.value,
      ...(enforcementPriority ? { enforcementPriority } : {}),
      sourceRecordIds: [...resolved.sourceRecordIds],
      lawEffectStamps: [stamp],
    };
    return {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 1,
        legalOutcomeConsequences: appendedList(prior, [record]),
      },
    };
  },
};

/** Shared world integrity can call this without creating or changing a sentence. */
export function assertLegalOutcomeConsequenceIntegrity(world: World): void {
  const keys = new Set<string>();
  const ids = new Set<EntityId>();
  for (const record of world.history.legalOutcomeConsequences ?? []) {
    const event = world.history.events.find(
      (entry) => entry.id === record.sentenceEventId,
    );
    const stamp = record.lawEffectStamps?.[0];
    const months = Number(
      event?.tags
        .find((tag) => tag.startsWith(SENTENCE_MONTHS_TAG))
        ?.slice(SENTENCE_MONTHS_TAG.length),
    );
    if (
      keys.has(record.stableKey) ||
      ids.has(record.id) ||
      !Number.isSafeInteger(record.sequence) ||
      record.sequence >= world.history.nextSequence ||
      !Number.isSafeInteger(record.minimumMonths) ||
      record.minimumMonths < 0 ||
      !event ||
      event.type !== PROSECUTION_SENTENCED_EVENT ||
      event.sequence >= record.sequence ||
      event.jurisdictionId !== record.jurisdictionId ||
      event.occurredAt !== record.appliedAt ||
      record.appliedAt > record.recordedAt ||
      record.recordedAt > world.currentDate ||
      !event.participants.some(
        (p) =>
          p.role === "focus:defendant" && p.personId === record.subjectPersonId,
      ) ||
      (!event.tags.includes(SENTENCE_LIFE_TAG) &&
        (!Number.isFinite(months) || months < record.minimumMonths)) ||
      record.lawEffectStamps?.length !== 1 ||
      !isLawEffectStamp(stamp) ||
      stamp.appliedAt !== record.appliedAt ||
      stamp.jurisdictionId !== record.jurisdictionId ||
      JSON.stringify(stamp.sourceRecordIds) !==
        JSON.stringify(record.sourceRecordIds) ||
      !record.sourceRecordIds.includes(event.id)
    )
      throw new Error("Invalid saved legal-outcome consequence.");
    keys.add(record.stableKey);
    ids.add(record.id);
  }
}
