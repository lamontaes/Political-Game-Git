import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  FavorMotive,
  FavorRecord,
  MindSourceReference,
  DecisionTraceRecord,
} from "../../simulation/types";
import type { personTrait } from "../../simulation/people-traits";
import type { readRelationshipStanding } from "../../simulation/relationship-standing";
import { favorStandingBetween, type FavorFacts } from "./favor-standing";
export interface AppointmentFacts extends FavorFacts {
  readonly names: ReadonlyMap<EntityId, string>;
  readonly traits: ReadonlyMap<string, ReturnType<typeof personTrait>>;
  readonly relationships: ReadonlyMap<
    string,
    ReturnType<typeof readRelationshipStanding>
  >;
  readonly parties: ReadonlyMap<EntityId, string | null>;
  readonly offices: ReadonlyMap<
    EntityId,
    readonly { readonly title: string }[]
  >;
  readonly decisionTraces: readonly DecisionTraceRecord[];
}
export const APPOINTMENTS_VERSION = "appointments-v1";

export const APPOINTMENT_SHORT_LIST = 8;

interface Scored {
  readonly personId: EntityId;
  readonly considerations: readonly DecisionConsideration[];
  readonly score: number;
  readonly expected: boolean;
}

const IMPORTANCE_WEIGHT: Record<DecisionImportance, number> = {
  slight: 1,
  moderate: 2,
  strong: 4,
  decisive: 6,
};

const CONFIDENCE_WEIGHT = { low: 1, medium: 2, high: 3 } as const;

export function scoreOf(
  considerations: readonly DecisionConsideration[],
): number {
  return considerations.reduce(
    (total, row) =>
      total +
      (row.direction === "supports" ? 1 : -1) *
        IMPORTANCE_WEIGHT[row.importance] *
        CONFIDENCE_WEIGHT[row.confidence],
    0,
  );
}

const STEP_UP: Record<DecisionImportance, DecisionImportance> = {
  slight: "moderate",
  moderate: "strong",
  strong: "decisive",
  decisive: "decisive",
};

const STEP_DOWN: Record<DecisionImportance, DecisionImportance> = {
  slight: "slight",
  moderate: "slight",
  strong: "moderate",
  decisive: "strong",
};

function shaped(
  base: DecisionImportance,
  traitValue: number,
): DecisionImportance {
  if (traitValue >= 1) return STEP_UP[base];
  if (traitValue <= -1) return STEP_DOWN[base];
  return base;
}

const BAND_IMPORTANCE = {
  none: null,
  slight: "slight",
  marked: "moderate",
  strong: "strong",
} as const;

function traitRef(
  facts: AppointmentFacts,
  personId: EntityId,
  trait: Parameters<typeof personTrait>[2],
): MindSourceReference[] {
  const recordId = facts.traits.get(`${personId}:${trait}`)!.recordId;
  return recordId
    ? [{ kind: "personality-tendency", tendencyRecordId: recordId }]
    : [];
}

export function considerationsFor(
  facts: AppointmentFacts,
  appointerPersonId: EntityId,
  candidateId: EntityId,
  keyPrefix: string,
): Scored {
  const optionKey = `person:${candidateId}`;
  const name = facts.names.get(candidateId)!;
  const rows: DecisionConsideration[] = [];
  const reliability = facts.traits.get(
    `${appointerPersonId}:${"reliability"}`,
  )!;
  const deliberation = facts.traits.get(
    `${appointerPersonId}:${"deliberation"}`,
  )!;
  const conflict = facts.traits.get(`${appointerPersonId}:${"conflict"}`)!;
  const standing = facts.relationships.get(
    `${appointerPersonId}:${candidateId}`,
  )!;
  for (const dimension of ["trust", "commitment", "warmth"] as const) {
    const reading = standing.readings[dimension];
    const base = BAND_IMPORTANCE[reading.band];
    if (!base) continue;
    const refs: MindSourceReference[] = reading.basis
      .slice(-3)
      .map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      }));
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:standing:${dimension}`,
      optionKey,
      sourceType: "social:relationship",
      direction: reading.adverse ? "opposes" : "supports",
      importance: shaped(base, reliability.value),
      confidence: "high",
      explanation: reading.adverse
        ? `${name} has not earned the appointer's ${dimension}.`
        : dimension === "trust"
          ? `The appointer trusts ${name}.`
          : dimension === "commitment"
            ? `The appointer feels bound to ${name}.`
            : `The appointer likes ${name}.`,
      sourceRefs: [
        ...refs,
        ...traitRef(facts, appointerPersonId, "reliability"),
      ],
    });
  }
  const tension = standing.readings.tension;
  const tensionImportance = BAND_IMPORTANCE[tension.band];
  if (tensionImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:standing:tension`,
      optionKey,
      sourceType: "social:relationship",
      direction: "opposes",
      importance: tensionImportance,
      confidence: "high",
      explanation: `There is bad blood between the appointer and ${name}.`,
      sourceRefs: tension.basis.slice(-3).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  const owesAppointer = favorStandingBetween(
    facts,
    candidateId,
    appointerPersonId,
    facts.onDate,
  );
  const owedImportance = BAND_IMPORTANCE[owesAppointer.receiverDebt];
  if (owedImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:owes-appointer`,
      optionKey,
      sourceType: "social:favor",
      direction: "supports",
      importance: shaped(owedImportance, reliability.value),
      confidence: "medium",
      explanation: `${name} owes the appointer for past help.`,
      sourceRefs: [
        ...favorEventRefs(facts, candidateId, appointerPersonId),
        ...traitRef(facts, appointerPersonId, "reliability"),
      ],
    });
  const appointerParty = facts.parties.get(appointerPersonId) ?? null;
  const candidateParty = facts.parties.get(candidateId) ?? null;
  if (appointerParty && candidateParty)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:party`,
      optionKey,
      sourceType: "context:party",
      direction: appointerParty === candidateParty ? "supports" : "opposes",
      importance: appointerParty === candidateParty ? "strong" : "moderate",
      confidence: "high",
      explanation:
        appointerParty === candidateParty
          ? `${name} is in the appointer's party.`
          : `${name} is in the other party.`,
      sourceRefs: [],
    });
  const offices = facts.offices.get(candidateId) ?? [];
  if (offices.length > 0)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:record`,
      optionKey,
      sourceType: "context:public-record",
      direction: "supports",
      importance: shaped("moderate", deliberation.value),
      confidence: "medium",
      explanation: `${name} serves now as ${offices[0]!.title}.`,
      sourceRefs: traitRef(facts, appointerPersonId, "deliberation"),
    });
  const appointerOwes = favorStandingBetween(
    facts,
    appointerPersonId,
    candidateId,
    facts.onDate,
  );
  const repayImportance = BAND_IMPORTANCE[appointerOwes.receiverDebt];
  if (repayImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:repays`,
      optionKey,
      sourceType: "social:favor",
      direction: "supports",
      importance: shaped(repayImportance, -conflict.value),
      confidence: "medium",
      explanation: `Naming ${name} repays help the appointer received.`,
      sourceRefs: [
        ...favorEventRefs(facts, appointerPersonId, candidateId),
        ...traitRef(facts, appointerPersonId, "conflict"),
      ],
    });
  const following = followingOf(facts, candidateId);
  const followingImportance: DecisionImportance | null =
    following >= 20
      ? "strong"
      : following >= 5
        ? "moderate"
        : following >= 1
          ? "slight"
          : null;
  if (followingImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:following`,
      optionKey,
      sourceType: "context:following",
      direction: "supports",
      importance: followingImportance,
      confidence: "low",
      explanation: `People who owe ${name} come along with the appointment.`,
      sourceRefs: [],
    });
  const given = facts.relationships.get(`${candidateId}:${appointerPersonId}`)!
    .readings.commitment;
  const expected =
    ((given.band === "marked" || given.band === "strong") && !given.adverse) ||
    appointerOwes.receiverDebt === "marked" ||
    appointerOwes.receiverDebt === "strong";
  return {
    personId: candidateId,
    considerations: rows,
    score: scoreOf(rows),
    expected,
  };
}

export function followingOf(
  facts: AppointmentFacts,
  personId: EntityId,
): number {
  const debtors = new Set<EntityId>();
  for (const favor of favorsGivenBy(facts, personId)) {
    if (debtors.has(favor.receiverPersonId)) continue;
    const standing = favorStandingBetween(
      facts,
      favor.receiverPersonId,
      personId,
      facts.onDate,
    );
    if (standing.receiverDebt !== "none") debtors.add(favor.receiverPersonId);
  }
  return debtors.size;
}

export function appointmentMotive(
  facts: AppointmentFacts,
  appointerPersonId: EntityId,
  appointeePersonId: EntityId,
): FavorMotive {
  const optionKey = `person:${appointeePersonId}`;
  const trace = appointmentTrace(facts, appointerPersonId, appointeePersonId);
  if (!trace) return "shared-belief";
  const strongest = trace.context.considerations
    .filter(
      (row) => row.optionKey === optionKey && row.direction === "supports",
    )
    .sort((a, b) => scoreOf([b]) - scoreOf([a]))[0];
  if (!strongest) return "shared-belief";
  return strongest.sourceType === "context:party" ||
    strongest.sourceType === "context:public-record"
    ? "shared-belief"
    : "trade";
}

const PERSONAL_SOURCES: readonly string[] = [
  "social:relationship",
  "social:favor",
];

export function wasPersonalAppointment(
  considerations: readonly DecisionConsideration[],
  chosenOptionKey: string,
): boolean {
  const merit = new Map<string, number>();
  for (const row of considerations) {
    if (!row.optionKey.startsWith("person:")) continue;
    const add = PERSONAL_SOURCES.includes(row.sourceType) ? 0 : scoreOf([row]);
    merit.set(row.optionKey, (merit.get(row.optionKey) ?? 0) + add);
  }
  const chosen = merit.get(chosenOptionKey) ?? 0;
  return [...merit].some(
    ([key, score]) => key !== chosenOptionKey && score > chosen,
  );
}

function appointmentTrace(
  facts: AppointmentFacts,
  appointerPersonId: EntityId,
  appointeePersonId: EntityId,
) {
  const optionKey = `person:${appointeePersonId}`;
  return [...facts.decisionTraces]
    .reverse()
    .find(
      (row) =>
        row.context.decisionType === "appointment.choose-appointee" &&
        row.context.actorPersonId === appointerPersonId &&
        row.selectedOptionKey === optionKey,
    );
}
export function favorsGivenBy(
  facts: AppointmentFacts,
  personId: EntityId,
): readonly FavorRecord[] {
  return facts.favors.filter((record) => record.giverPersonId === personId);
}

export function favorsReceivedBy(
  facts: AppointmentFacts,
  personId: EntityId,
): readonly FavorRecord[] {
  return facts.favors.filter((record) => record.receiverPersonId === personId);
}

export function favorEventRefs(
  facts: AppointmentFacts,
  receiverPersonId: EntityId,
  giverPersonId: EntityId,
): MindSourceReference[] {
  return favorsReceivedBy(facts, receiverPersonId)
    .filter((favor) => favor.giverPersonId === giverPersonId)
    .slice(-3)
    .map((favor) => ({
      kind: "historical-event" as const,
      eventId: favor.eventId,
    }));
}
export function rankAppointmentCandidates(
  facts: AppointmentFacts,
  appointerPersonId: EntityId,
  candidates: readonly EntityId[],
  keyPrefix: string,
) {
  return candidates
    .map((id) => considerationsFor(facts, appointerPersonId, id, keyPrefix))
    .sort((a, b) => b.score - a.score || a.personId.localeCompare(b.personId))
    .slice(0, APPOINTMENT_SHORT_LIST);
}

// stopgapId: "SG-P14-legislatures-appointment-weights"
