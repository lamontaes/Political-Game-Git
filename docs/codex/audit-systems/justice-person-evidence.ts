import type { AuditRow, Evidence } from "../../../scripts/law-audit/audit";
import type { EntityId, World } from "../../../src/simulation/types";
import { eventById } from "../../../src/simulation/event-index";
import { personName } from "../../../src/simulation/people";
import { isLawEffectStamp } from "../../../src/simulation/law-effect-stamp";

const QUESTION = "us-policy-positions:justice-public-safety.end-cash-bail";
const TYPES = new Set([
  "justice.held-before-trial",
  "justice.released-before-trial",
]);
export interface JusticePersonEvidence extends Evidence {
  touchedPersonIds?: readonly EntityId[];
  identityExtraction?: {
    version: "justice-person-evidence/v1";
    status: "available" | "unavailable";
    reason: string | null;
    eventId: EntityId | null;
    path: "participants.focus:defendant";
    sourceRecordIds: readonly EntityId[];
  };
}
export type JusticePersonAuditRow = Omit<AuditRow, "evidence"> & {
  evidence: JusticePersonEvidence[];
};

/** Future audit-only enrichment. Does not run collectors, change firing or mutate a World. */
export function enrichJusticePersonEvidence(
  world: World,
  rows: readonly AuditRow[],
): JusticePersonAuditRow[] {
  return rows.map((row) => ({
    ...row,
    evidence: row.evidence.map((evidence) => {
      if (
        row.question !== QUESTION ||
        !row.effect.startsWith("stamped:") ||
        !TYPES.has(row.effect.replace(/^stamped:/, ""))
      )
        return { ...evidence };
      const copy: JusticePersonEvidence = { ...evidence };
      // Replace only our companion fields; a second call revalidates the original event.
      delete copy.touchedPersonIds;
      const id = /^events:(event_[a-f0-9]{16})$/.exec(evidence.record)?.[1] as
        EntityId | undefined;
      const unavailable = (reason: string): JusticePersonEvidence => ({
        ...copy,
        identityExtraction: {
          version: "justice-person-evidence/v1",
          status: "unavailable",
          reason,
          eventId: id ?? null,
          path: "participants.focus:defendant",
          sourceRecordIds: [...(evidence.sourceRecordIds ?? [])],
        },
      });
      if (!id) return unavailable("exact-event-locator-unavailable");
      const event = eventById(world, id);
      if (!event || event.id !== id)
        return unavailable("saved-event-unavailable");
      if (!TYPES.has(event.type) || row.effect !== `stamped:${event.type}`)
        return unavailable("event-type-mismatch");
      if (
        event.occurredAt !== evidence.appliedAt ||
        (evidence.recordDate !== undefined &&
          evidence.recordDate !== event.occurredAt)
      )
        return unavailable("event-date-mismatch");
      if (event.jurisdictionId !== evidence.jurisdictionId)
        return unavailable("event-jurisdiction-mismatch");
      if (
        (row.source === "starting" ? "in-force-at-start" : "enacted") !==
        row.lawSource
      )
        return unavailable("row-law-source-mismatch");
      const exportedIds = new Set(evidence.sourceRecordIds ?? []);
      const stamp = event.lawEffectStamps?.find(
        (value) =>
          isLawEffectStamp(value) &&
          value.questionKey === row.question &&
          value.governingLawKey === row.measureId &&
          value.source === row.lawSource &&
          value.effectKind === event.type &&
          value.appliedAt === evidence.appliedAt &&
          value.jurisdictionId === evidence.jurisdictionId &&
          value.sourceRecordIds?.includes(id) &&
          exportedIds.has(id) &&
          value.sourceRecordIds.length === exportedIds.size &&
          value.sourceRecordIds.every((sourceId) => exportedIds.has(sourceId)),
      );
      if (!stamp) return unavailable("matching-saved-law-stamp-unavailable");
      const ids = [
        ...new Set(
          event.participants
            .filter((participant) => participant.role === "focus:defendant")
            .map((participant) => participant.personId),
        ),
      ];
      if (ids.length === 0) return unavailable("defendant-role-unavailable");
      if (ids.some((personId) => !world.people[personId]))
        return unavailable("saved-defendant-person-unavailable");
      return {
        ...copy,
        touched: ids
          .map(
            (personId) =>
              `${personName(world.people[personId]!)} (${personId})`,
          )
          .join(", "),
        touchedPersonIds: ids,
        identityExtraction: {
          version: "justice-person-evidence/v1",
          status: "available",
          reason: null,
          eventId: id,
          path: "participants.focus:defendant",
          sourceRecordIds: [...(stamp.sourceRecordIds ?? [])],
        },
      };
    }),
  }));
}
