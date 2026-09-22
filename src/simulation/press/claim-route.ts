import type { ClaimStance } from "../claim-stances";
import { addDays, makeIsoDate } from "../dates";
import { hasPersonDiscoveredEvidence } from "../evidence";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import type { ProcedureKey } from "./records";
import { STATE_LEGISLATIVE_ETHICS_BODIES } from "./state-ethics-bodies";
import { pressRecordById, pressRecordsOfKind } from "./store";

/**
 * PEOPLE contradiction route for press answers about a matter
 * (propositionKey `matter:<matterId>`). Pure: it reads, it never writes.
 *
 * A denial is contradicted for a reporter only when that reporter holds a
 * record against it: knowledge of a public finding step, or the occurrence's
 * own record evidence.
 */

/** Authored fallback when no proceeding is open. */
const NO_PROCEEDING_CHECK_DAYS = 30;

const STATE_LEGISLATIVE_ETHICS_REMAINING_DAYS: Readonly<
  Record<string, number>
> = {
  "": 140,
  "complaint-received": 126,
  "respondent-notified": 105,
  "response-period-closed": 60,
  "preliminary-inquiry": 60,
};

/** Upper bound, in days, from a step to the adapter's last possible step. */
const REMAINING_DAYS = Object.fromEntries([
  ...Object.entries({
    "fec-enforcement": {
      "": 200,
      "complaint-received": 195,
      "respondent-notified": 180,
      "response-period-closed": 120,
      "reason-to-believe": 30,
      "no-reason-to-believe": 30,
    },
    "ky-legislative-ethics": {
      "": 195,
      "complaint-received": 185,
      "complaint-served": 165,
      "answer-period-closed": 120,
      "preliminary-inquiry": 60,
      "adjudicatory-hearing-ordered": 60,
    },
    "simulated-inquiry": { "": 30, "inquiry-opened": 30 },
  }),
  // Researched state ethics bodies share one authored timeline, so they share
  // one remaining-days map. The numbers come from the step intervals in
  // `stateLegislativeEthicsDefinition`, not from any state's law.
  ...STATE_LEGISLATIVE_ETHICS_BODIES.map((body) => [
    body.procedureKey,
    STATE_LEGISLATIVE_ETHICS_REMAINING_DAYS,
  ]),
]) as Readonly<Record<ProcedureKey, Readonly<Record<string, number>>>>;

const FINDING_OUTCOMES = new Set(["finding", "conciliation", "report-issued"]);

export interface PressContradictionRoute {
  readonly prefix: string;
  checkDate(world: World, stance: ClaimStance, id: EntityId): IsoDate | null;
  evidenceFor(
    world: World,
    stanceEvent: HistoricalEvent,
    stance: ClaimStance,
    id: EntityId,
    recipientPersonId: EntityId,
  ): { readonly evidenceEventId: EntityId; readonly label: string } | null;
}

export const pressMatterContradictionRoute: PressContradictionRoute = {
  prefix: "matter",
  checkDate(world, _stance, matterId) {
    const matter = pressRecordById(world, "matter", matterId);
    if (!matter) return null;
    const proceedings = pressRecordsOfKind(world, "matter-proceeding").filter(
      (proceeding) => proceeding.matterId === matter.id,
    );
    let latest: IsoDate | null = null;
    for (const proceeding of proceedings) {
      const steps = pressRecordsOfKind(world, "proceeding-step").filter(
        (step) => step.proceedingId === proceeding.id,
      );
      const last = steps.at(-1);
      if (last?.closes) continue;
      const remaining =
        REMAINING_DAYS[proceeding.procedureKey][last?.step ?? ""] ??
        NO_PROCEEDING_CHECK_DAYS;
      const from = last?.nextDueAt ?? world.currentDate;
      const due = addDays(
        from > world.currentDate ? from : world.currentDate,
        remaining,
      );
      if (latest === null || due > latest) latest = due;
    }
    return latest ?? addDays(world.currentDate, NO_PROCEEDING_CHECK_DAYS);
  },
  evidenceFor(world, _stanceEvent, stance, matterId, recipientPersonId) {
    if (stance.asserted !== "denies") return null;
    const matter = pressRecordById(world, "matter", matterId);
    if (!matter?.occurrenceId) return null;
    const proceedingIds = new Set(
      pressRecordsOfKind(world, "matter-proceeding")
        .filter((proceeding) => proceeding.matterId === matter.id)
        .map((proceeding) => proceeding.id),
    );
    const finding = pressRecordsOfKind(world, "proceeding-step").find(
      (step) =>
        proceedingIds.has(step.proceedingId) &&
        step.publicStep &&
        step.outcome !== null &&
        FINDING_OUTCOMES.has(step.outcome) &&
        world.history.knowledge.some(
          (record) =>
            record.personId === recipientPersonId &&
            record.eventId === step.eventId &&
            record.learnedAt <= world.currentDate,
        ),
    );
    if (finding) {
      return {
        evidenceEventId: finding.eventId,
        label: "the published finding",
      };
    }
    const occurrence = pressRecordById(
      world,
      "financial-occurrence",
      matter.occurrenceId,
    );
    if (!occurrence) return null;
    const cutoff = {
      asOfDate: makeIsoDate(world.currentDate),
      historySequenceExclusive: world.history.nextSequence,
    };
    const discovered = occurrence.recordEvidenceArtifactIds.find((artifactId) =>
      hasPersonDiscoveredEvidence(world, recipientPersonId, artifactId, cutoff),
    );
    if (!discovered) return null;
    const discovery = world.history.evidenceDiscoveries.find(
      (record) =>
        record.personId === recipientPersonId &&
        record.evidenceArtifactId === discovered,
    );
    return discovery
      ? {
          evidenceEventId: discovery.discoveryEventId,
          label: "the committee's own ledger",
        }
      : null;
  },
};
