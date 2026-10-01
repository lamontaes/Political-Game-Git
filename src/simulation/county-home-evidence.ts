import type {
  CountySeatBinding,
  CountySeatSource,
} from "../districts/county-seat-types";
import type { EntityId, IsoDate } from "./types";

/** Saved home evidence; this family never supplies voter registration. */
export interface CountyHomeDistrictEvidenceRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly personId: EntityId;
  readonly home:
    | { readonly kind: "residence"; readonly residenceFactId: EntityId }
    | {
        readonly kind: "dwelling-occupancy";
        readonly dwellingId: EntityId;
        readonly dwellingOccupancyId: EntityId;
      };
  readonly occupiedFrom: IsoDate;
  readonly occupiedUntil: IsoDate | null;
  readonly binding: CountySeatBinding;
  /** Null only for a genuinely countywide territory, never a guessed district. */
  readonly districtRecordId: string | null;
  readonly addressEvidence: {
    readonly address: string;
    readonly sourceRecordId: string;
    readonly sourceUrl: string;
  };
  readonly determination:
    | {
        readonly kind: "actual-map";
        readonly source: CountySeatSource;
      }
    | {
        readonly kind: "estimated-map-unavailable";
        readonly source: CountySeatSource;
        readonly method: string;
        /** The same method applies to this saved geographic cohort. */
        readonly cohortJurisdictionId: EntityId;
      };
}

import {
  countySeatCatalog,
  resolveCountySeatBinding,
} from "../districts/county-seat-catalog";
import { addDays, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { householdMembershipsAt } from "./life-queries";
import { factsForPerson } from "./people";
import { dwellingOccupancyStateAt } from "./resource-queries";
import type { HistoricalCutoff, World } from "./types";

export type CountyHomeDistrictEvidenceInput = Omit<
  CountyHomeDistrictEvidenceRecord,
  "id" | "sequence" | "recordedAt"
>;

function checkCutoff(world: World, cutoff: HistoricalCutoff): void {
  if (
    makeIsoDate(cutoff.asOfDate) > world.currentDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  )
    throw new Error("County home evidence cutoff is outside recorded history.");
}

function homeExistsAt(
  world: World,
  record: CountyHomeDistrictEvidenceRecord,
  cutoff: HistoricalCutoff,
): boolean {
  const person = world.people[record.personId];
  if (!person) return false;
  if (record.home.kind === "residence") {
    const home = record.home;
    const fact = factsForPerson(person).find(
      (fact) => fact.id === home.residenceFactId,
    );
    return (
      !!fact &&
      fact.kind === "residence" &&
      fact.occurredAt <= record.occupiedFrom &&
      fact.occurredAt <= cutoff.asOfDate &&
      (fact.endedAt === null || fact.endedAt > cutoff.asOfDate) &&
      (record.occupiedUntil === null ||
        fact.endedAt === null ||
        record.occupiedUntil <= fact.endedAt)
    );
  }
  const home = record.home;
  const dwelling = world.history.dwellings.find(
    (row) => row.id === home.dwellingId,
  );
  const occupancy = world.history.dwellingOccupancies.find(
    (row) => row.id === home.dwellingOccupancyId,
  );
  if (
    !dwelling ||
    !occupancy ||
    occupancy.dwellingId !== dwelling.id ||
    dwelling.sequence >= cutoff.historySequenceExclusive ||
    occupancy.sequence >= cutoff.historySequenceExclusive ||
    dwelling.establishedAt > record.occupiedFrom ||
    occupancy.startedAt > record.occupiedFrom ||
    occupancy.startedAt > cutoff.asOfDate ||
    dwellingOccupancyStateAt(world, occupancy.id, cutoff)?.status !== "active"
  )
    return false;
  if (occupancy.occupant.kind === "person")
    return occupancy.occupant.personId === record.personId;
  const householdId = occupancy.occupant.householdId;
  return householdMembershipsAt(world, record.personId, cutoff).some(
    (row) =>
      row.household.id === householdId &&
      row.membership.startedAt <= record.occupiedFrom,
  );
}

function recordError(
  world: World,
  record: CountyHomeDistrictEvidenceRecord,
): string | null {
  try {
    if (
      (record.home.kind !== "residence" &&
        record.home.kind !== "dwelling-occupancy") ||
      (record.determination.kind !== "actual-map" &&
        record.determination.kind !== "estimated-map-unavailable")
    )
      return "Unsupported saved county home or map determination kind.";
    makeIsoDate(record.recordedAt);
    makeIsoDate(record.occupiedFrom);
    if (record.occupiedUntil !== null) makeIsoDate(record.occupiedUntil);
    const source = record.determination.source;
    makeIsoDate(source.readOn);
    makeIsoDate(source.effectiveFrom);
    if (source.effectiveUntil !== null) makeIsoDate(source.effectiveUntil);
    if (
      !record.stableKey.trim() ||
      record.id !==
        createStableId(
          "county-home-district-evidence",
          `${world.id}:${record.stableKey}`,
        ) ||
      !Number.isSafeInteger(record.sequence) ||
      record.sequence < 0 ||
      record.sequence >= world.history.nextSequence ||
      record.recordedAt > world.currentDate ||
      record.occupiedFrom > record.recordedAt ||
      (record.occupiedUntil !== null &&
        (record.occupiedUntil <= record.occupiedFrom ||
          record.occupiedUntil > record.recordedAt))
    )
      return "Invalid county home evidence identity or interval.";
    if (
      !record.addressEvidence.address.trim() ||
      !record.addressEvidence.sourceRecordId.trim() ||
      !record.addressEvidence.sourceUrl.startsWith("https://") ||
      !source.version.trim() ||
      !source.documentId.trim() ||
      !source.url.startsWith("https://") ||
      source.status !== "adopted" ||
      source.effectiveFrom > record.recordedAt ||
      (source.effectiveUntil !== null &&
        source.effectiveUntil <= record.recordedAt)
    )
      return "No applicable dated map evidence for the recorded home.";
    const seat = resolveCountySeatBinding(
      countySeatCatalog(),
      record.binding,
      record.recordedAt,
    );
    if (seat.kind === "refused") return seat.reason;
    const territory = seat.identity.domicile;
    if (
      !territory ||
      (territory.kind === "district"
        ? territory.districtRecordId !== record.districtRecordId
        : record.districtRecordId !== null)
    )
      return "Home determination does not identify this seat's actual territory.";
    if (record.determination.kind === "estimated-map-unavailable") {
      const determination = record.determination;
      const person = world.people[record.personId];
      const homeJurisdiction =
        record.home.kind === "residence"
          ? person &&
            factsForPerson(person).find(
              (row) =>
                row.id ===
                (record.home.kind === "residence"
                  ? record.home.residenceFactId
                  : null),
            )?.jurisdictionId
          : world.history.dwellings.find(
              (row) =>
                row.id ===
                (record.home.kind === "dwelling-occupancy"
                  ? record.home.dwellingId
                  : null),
            )?.jurisdictionId;
      if (
        !determination.method.trim() ||
        homeJurisdiction !== determination.cohortJurisdictionId ||
        !world.jurisdictions[determination.cohortJurisdictionId]
      )
        return "An estimated map requires a saved geographic cohort and explicit common method.";
      const conflicting = (world.history.countyHomeDistrictEvidence ?? []).some(
        (row) =>
          row.id !== record.id &&
          row.binding.geoid === record.binding.geoid &&
          row.determination.kind === "estimated-map-unavailable" &&
          row.determination.cohortJurisdictionId ===
            determination.cohortJurisdictionId &&
          row.determination.source.version === source.version &&
          row.determination.method !== determination.method,
      );
      if (conflicting)
        return "An estimated home method cannot single out a member of the geographic cohort.";
    }
    // Verify both ends of the actual occupancy interval from records already
    // available when this evidence was recorded. An ended home may remain in
    // history; it must not be treated as the current home.
    if (
      !homeExistsAt(world, record, {
        asOfDate: record.occupiedFrom,
        historySequenceExclusive: record.sequence,
      }) ||
      !homeExistsAt(world, record, {
        asOfDate:
          record.occupiedUntil === null
            ? record.recordedAt
            : addDays(record.occupiedUntil, -1),
        historySequenceExclusive: record.sequence,
      })
    )
      return "The home evidence lacks this person's recorded residence or occupancy.";
    return null;
  } catch {
    return "Malformed county home evidence or referenced saved records.";
  }
}

/** Append actual supplied evidence; no address, district or voter fact is generated. */
export function recordCountyHomeDistrictEvidence(
  world: World,
  input: CountyHomeDistrictEvidenceInput,
):
  | {
      readonly kind: "recorded";
      readonly world: World;
      readonly record: CountyHomeDistrictEvidenceRecord;
    }
  | {
      readonly kind: "refused";
      readonly world: World;
      readonly reason: string;
    } {
  const record: CountyHomeDistrictEvidenceRecord = {
    ...input,
    id: createStableId(
      "county-home-district-evidence",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  };
  const records = world.history.countyHomeDistrictEvidence ?? [];
  if (
    records.some(
      (row) => row.id === record.id || row.stableKey === record.stableKey,
    )
  )
    return {
      kind: "refused",
      world,
      reason: "County home evidence stable key is already recorded.",
    };
  const next = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      countyHomeDistrictEvidence: [...records, record],
    },
  };
  const error = recordError(next, record);
  if (error) return { kind: "refused", world, reason: error };
  return { kind: "recorded", world: next, record };
}

/** Unknown and contradictory evidence remain distinct from a positive home join. */
export function countyHomeDistrictEvidenceAt(
  world: World,
  personId: EntityId,
  binding: CountySeatBinding,
  cutoff: HistoricalCutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  },
):
  | {
      readonly kind: "known";
      readonly record: CountyHomeDistrictEvidenceRecord;
    }
  | { readonly kind: "unknown" | "ambiguous" } {
  checkCutoff(world, cutoff);
  const resolved = resolveCountySeatBinding(
    countySeatCatalog(),
    binding,
    cutoff.asOfDate,
  );
  if (resolved.kind === "refused") return { kind: "unknown" };
  const records = (world.history.countyHomeDistrictEvidence ?? []).filter(
    (row) =>
      row.personId === personId &&
      row.binding.geoid === binding.geoid &&
      row.recordedAt <= cutoff.asOfDate &&
      row.sequence < cutoff.historySequenceExclusive &&
      row.occupiedFrom <= cutoff.asOfDate &&
      (row.occupiedUntil === null || row.occupiedUntil > cutoff.asOfDate) &&
      row.determination.source.effectiveFrom <= cutoff.asOfDate &&
      (row.determination.source.effectiveUntil === null ||
        row.determination.source.effectiveUntil > cutoff.asOfDate) &&
      recordError(world, row) === null &&
      homeExistsAt(world, row, cutoff),
  );
  if (records.length > 1) return { kind: "ambiguous" };
  const record = records[0];
  if (
    !record ||
    record.binding.recordId !== binding.recordId ||
    record.binding.sourceVersion !== binding.sourceVersion
  )
    return { kind: "unknown" };
  return { kind: "known", record };
}

/** Audit owns the world.ts call and global history enumeration. */
export function assertCountyHomeDistrictEvidenceIntegrity(world: World): void {
  let sequence = -1;
  const keys = new Set<string>();
  for (const record of world.history.countyHomeDistrictEvidence ?? []) {
    const error = recordError(world, record);
    if (error || record.sequence <= sequence || keys.has(record.stableKey))
      throw new Error(
        `Invalid county home district evidence ${record.id}: ${error ?? "duplicate or unordered record"}`,
      );
    keys.add(record.stableKey);
    sequence = record.sequence;
  }
}
