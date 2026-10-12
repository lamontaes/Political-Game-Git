/** Full retained credential-pay cohort, dated peer receipt, mean and source-ID closure. */
import { recordById, recordsWithFieldValue } from "./raw-record-index";
import type {
  World,
  EntityId,
  IsoDate,
  HistoricalCutoff,
  WorkRoleRecord,
  ResourceFlowTermsRecord,
  ResourceTransferOutcome,
} from "../../simulation/types";
import type * as life from "../../simulation/life-queries";
export interface ResourcePayReadFacts {
  readonly currentDate: IsoDate;
  readonly records: Pick<
    World["history"],
    "nextSequence" | "resourceFlowTerms" | "resourceTransferOutcomes"
  >;
}
export interface CredentialPayFacts {
  readonly currentDate: IsoDate;
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "workRelationships"
    | "educationEnrollments"
    | "resourceFlows"
    | "resourceFlowTerms"
    | "resourceTransferOutcomes"
  >;
  readonly roles: ReadonlyMap<string, ReturnType<typeof life.workRoleAt>>;
  readonly statuses: ReadonlyMap<string, ReturnType<typeof life.workStatusAt>>;
  readonly enrollmentStates: ReadonlyMap<
    string,
    ReturnType<typeof life.educationEnrollmentStateAt>
  >;
  readonly credentials: ReadonlyMap<string, boolean>;
}
export function credentialReceiptKey(
  facts: Pick<CredentialPayFacts, "currentDate" | "records">,
  id: EntityId,
  program?: string,
) {
  return JSON.stringify([
    facts.currentDate,
    facts.records.nextSequence,
    id,
    program,
  ]);
}
function receipt<V>(map: ReadonlyMap<string, V>, key: string): V {
  if (!map.has(key))
    throw Error("Missing dated life/credential receipt: " + key);
  return map.get(key)!;
}
function workRoleAt(facts: CredentialPayFacts, id: EntityId) {
  return receipt(facts.roles, credentialReceiptKey(facts, id));
}
function workStatusAt(facts: CredentialPayFacts, id: EntityId) {
  return receipt(facts.statuses, credentialReceiptKey(facts, id));
}
function educationEnrollmentStateAt(facts: CredentialPayFacts, id: EntityId) {
  return receipt(facts.enrollmentStates, credentialReceiptKey(facts, id));
}
function hasLifePathCredential(
  facts: CredentialPayFacts,
  id: EntityId,
  program: string,
) {
  return receipt(facts.credentials, credentialReceiptKey(facts, id, program));
}
// STOPGAP: economy.credential-pay-peer-frontier
export function currentResourceCutoff(
  facts: ResourcePayReadFacts,
): HistoricalCutoff {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
export function resourceFlowTermsHistory(
  facts: ResourcePayReadFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceFlowTermsRecord[] {
  return recordsWithFieldValue(
    facts.records.resourceFlowTerms,
    "resourceFlowId",
    resourceFlowId,
  ).filter((record) => available(record, cutoff));
}
export function resourceFlowTermsAt(
  facts: ResourcePayReadFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): ResourceFlowTermsRecord | undefined {
  return resourceFlowTermsHistory(facts, resourceFlowId, cutoff).at(-1);
}
export function resourceTransferOutcomesForFlow(
  facts: ResourcePayReadFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceTransferOutcome[] {
  return facts.records.resourceTransferOutcomes.filter(
    (record) =>
      record.resourceFlowId === resourceFlowId &&
      availableOn(record, record.occurredAt, cutoff),
  );
}
function available(
  record: {
    readonly effectiveAt: string;
    readonly sequence: number;
  },
  cutoff: HistoricalCutoff,
): boolean {
  return availableOn(record, record.effectiveAt, cutoff);
}
function availableOn(
  record: {
    readonly sequence: number;
  },
  date: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    date <= cutoff.asOfDate && record.sequence < cutoff.historySequenceExclusive
  );
}
export type TownPayPeriod = "weekly" | "biweekly" | "semimonthly" | "monthly";
const PERIODS_PER_YEAR: Readonly<Record<TownPayPeriod, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
export function weeklyHoursOf(role: WorkRoleRecord): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
}
interface PayNote {
  readonly period: TownPayPeriod;
  readonly phase: number;
}
function payNoteOf(cadenceKind: string): PayNote | null {
  const match =
    /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
      cadenceKind,
    );
  if (!match) return null;
  return {
    period: match[1] as TownPayPeriod,
    phase: Number(match[2] ?? 0),
  };
}
export function recordedCredentialHourlyPay(
  facts: CredentialPayFacts,
  workId: EntityId,
  onDate: IsoDate,
) {
  if (
    onDate > facts.currentDate ||
    !facts.records.resourceTransferOutcomes.length
  )
    return null;
  const snapshot = { ...facts, currentDate: onDate };
  const target = recordById(facts.records.workRelationships, workId);
  const targetRole = target ? workRoleAt(snapshot, workId) : undefined;
  if (
    !target ||
    target.recordedAt > onDate ||
    target.startedAt > onDate ||
    target.compensation !== "paid" ||
    workStatusAt(snapshot, workId)?.status !== "active" ||
    !targetRole?.occupationClassification ||
    !targetRole.locationJurisdictionId
  )
    return null;
  const credentials = facts.records.educationEnrollments.filter(
    (row) =>
      row.personId === target.personId &&
      row.startedAt <= onDate &&
      row.recordedAt <= onDate &&
      hasLifePathCredential(snapshot, target.personId, row.programKind),
  );
  if (!credentials.length) return null;
  const sources: EntityId[] = credentials.flatMap((row) => {
    const state = educationEnrollmentStateAt(snapshot, row.id);
    return state ? [row.id, state.id] : [];
  });
  const rates: number[] = [];
  const countedWork = new Set<EntityId>();
  for (const flow of facts.records.resourceFlows) {
    if (
      flow.basisKind !== "compensation:work" ||
      flow.basisReference.kind !== "work" ||
      flow.recordedAt > onDate ||
      flow.startsAt > onDate ||
      flow.recipient.kind !== "person"
    )
      continue;
    const work = recordById(
      facts.records.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (
      !work ||
      countedWork.has(work.id) ||
      work.personId === target.personId ||
      work.personId !== flow.recipient.personId ||
      work.startedAt > onDate ||
      work.recordedAt > onDate ||
      work.compensation !== "paid"
    )
      continue;
    const status = workStatusAt(snapshot, work.id);
    const role = workRoleAt(snapshot, work.id);
    if (
      status?.status !== "active" ||
      role?.occupationClassification !== targetRole.occupationClassification ||
      role.locationJurisdictionId !== targetRole.locationJurisdictionId ||
      !credentials.every((row) =>
        hasLifePathCredential(snapshot, work.personId, row.programKind),
      )
    )
      continue;
    const current = resourceFlowTermsAt(snapshot, flow.id);
    if (current?.status !== "active" || current.amount.currency !== "USD")
      continue;
    const payment = resourceTransferOutcomesForFlow(snapshot, flow.id)
      .filter(
        (row) =>
          row.status === "completed" &&
          row.transferredAmount.currency === "USD" &&
          row.transferredAmount.minorUnits > 0,
      )
      .at(-1);
    if (!payment) continue;
    const paidSnapshot = {
      ...snapshot,
      currentDate: payment.occurredAt,
      history: { ...snapshot.records, nextSequence: payment.sequence + 1 },
    };
    const paidRole = workRoleAt(paidSnapshot, work.id);
    if (
      !paidRole ||
      paidRole.occupationClassification !== role.occupationClassification ||
      paidRole.locationJurisdictionId !== role.locationJurisdictionId ||
      !credentials.every((row) =>
        hasLifePathCredential(paidSnapshot, work.personId, row.programKind),
      )
    )
      continue;
    const terms = resourceFlowTermsAt(snapshot, flow.id, {
      asOfDate: payment.occurredAt,
      historySequenceExclusive: payment.sequence + 1,
    });
    const note = terms ? payNoteOf(terms.cadenceKind) : null;
    const hours = weeklyHoursOf(paidRole);
    if (!note || hours <= 0) continue;
    rates.push(
      (payment.transferredAmount.minorUnits * PERIODS_PER_YEAR[note.period]) /
        (52 * hours),
    );
    countedWork.add(work.id);
    sources.push(
      work.id,
      status.id,
      role.id,
      paidRole.id,
      flow.id,
      terms!.id,
      payment.id,
    );
    for (const enrollment of facts.records.educationEnrollments.filter(
      (row) =>
        row.personId === work.personId &&
        row.recordedAt <= onDate &&
        row.startedAt <= onDate,
    )) {
      const state = educationEnrollmentStateAt(paidSnapshot, enrollment.id);
      if (state?.status === "completed") sources.push(enrollment.id, state.id);
    }
  }
  if (!rates.length) return null;
  return {
    hourlyMinor: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
    peerCount: rates.length,
    sourceRecordIds: [...new Set(sources)],
  };
}
