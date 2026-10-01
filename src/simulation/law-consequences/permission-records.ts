import { makeIsoDate } from "../dates";
import { appendedList } from "../history-index";
import { createStableId } from "../ids";
import { lawInForce, type LawInForce } from "../governing/law-in-force";
import {
  isLawEffectStamp,
  lawEffectStamp,
  type LawEffectContext,
} from "../law-effect-stamp";
import type { EntityId, IsoDate, LawPermissionRecord, World } from "../types";

export function lawPermissionRecords(
  world: World,
): readonly LawPermissionRecord[] {
  return world.history.lawPermissionRecords ?? [];
}

/** Absence is unknown; a future decision cannot authorize today's activity. */
export function latestLawPermission(
  world: World,
  subject: LawPermissionRecord["subject"],
  permissionKey: string,
  onDate: IsoDate = world.currentDate,
): LawPermissionRecord | null {
  let latest: LawPermissionRecord | null = null;
  for (const record of lawPermissionRecords(world)) {
    if (
      record.subject.kind !== subject.kind ||
      record.subject.id !== subject.id ||
      record.permissionKey !== permissionKey ||
      record.effectiveAt > onDate ||
      record.recordedAt > onDate
    )
      continue;
    if (
      !latest ||
      record.effectiveAt > latest.effectiveAt ||
      (record.effectiveAt === latest.effectiveAt &&
        record.sequence > latest.sequence)
    )
      latest = record;
  }
  return latest;
}

export interface LawPermissionInput {
  readonly subject: LawPermissionRecord["subject"];
  readonly permissionKey: string;
  readonly status: LawPermissionRecord["status"];
  readonly effectiveAt: IsoDate;
  readonly sourceRecordIds: readonly EntityId[];
}

/** Save a resolved legal decision. Selection and legal interpretation belong to the handler. */
export function appendLawPermission(
  world: World,
  law: LawInForce | null,
  context: LawEffectContext,
  input: LawPermissionInput,
): World {
  if (!law) return world;
  const subjectExists =
    input.subject.kind === "person"
      ? !!world.people[input.subject.id]
      : world.history.organizations.some((row) => row.id === input.subject.id);
  if (!subjectExists) throw new Error("Permission subject does not exist.");
  makeIsoDate(input.effectiveAt);
  if (
    input.effectiveAt > world.currentDate ||
    input.effectiveAt < law.operativeAt ||
    context.appliedAt !== input.effectiveAt
  )
    throw new Error(
      "Permission must apply on its actual operative review date.",
    );
  if (
    !input.permissionKey.trim() ||
    !["permitted", "prohibited"].includes(input.status)
  )
    throw new Error("Permission requires a key and a resolved legal status.");
  if (
    !input.sourceRecordIds.length ||
    new Set(input.sourceRecordIds).size !== input.sourceRecordIds.length
  )
    throw new Error("Permission requires unique saved source records.");
  for (const id of input.sourceRecordIds) {
    const source = Object.values(world.history)
      .flatMap((rows) => (Array.isArray(rows) ? rows : []))
      .find((row) => row.id === id);
    const date =
      source?.recordedAt ??
      source?.occurredAt ??
      source?.effectiveAt ??
      source?.createdAt ??
      source?.formedAt ??
      source?.introducedAt;
    if (
      !source ||
      source.sequence >= world.history.nextSequence ||
      !date ||
      date > input.effectiveAt
    )
      throw new Error(
        "Permission source must be an earlier available saved record.",
      );
  }
  const stamp = lawEffectStamp(law, {
    ...context,
    sourceRecordIds: [...input.sourceRecordIds],
  });
  if (!stamp) return world;
  // Existing decision identity namespace; no shared EntityKind union extension.
  const stableKey = `law-permission/v1:${JSON.stringify([
    input.subject.kind,
    input.subject.id,
    input.permissionKey,
    input.effectiveAt,
    law.measureId,
    context.questionKey,
    context.jurisdictionId,
    [...input.sourceRecordIds].sort(),
  ])}`;
  const prior = lawPermissionRecords(world);
  const existing = prior.find((record) => record.stableKey === stableKey);
  if (existing) {
    if (existing.status !== input.status)
      throw new Error("Conflicting permission for one law and saved review.");
    return world;
  }
  const record: LawPermissionRecord = {
    ...input,
    subject: { ...input.subject },
    sourceRecordIds: [...input.sourceRecordIds],
    id: createStableId("decision", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    lawEffectStamps: [stamp],
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      lawPermissionRecords: appendedList(prior, [record]),
    },
  };
}

/** Coordinator-owned World integrity calls this; it does not dispatch or select permissions. */
export function assertLawPermissionIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  let previousSequence = -1;
  const keys = new Set<string>();
  for (const record of lawPermissionRecords(world)) {
    if (
      !Number.isSafeInteger(record.sequence) ||
      record.sequence <= previousSequence ||
      record.sequence >= world.history.nextSequence
    )
      throw new Error("Permission history must retain append sequence order.");
    previousSequence = record.sequence;
    if (
      keys.has(record.stableKey) ||
      ids.has(record.id) ||
      record.id !==
        createStableId("decision", `${world.id}:${record.stableKey}`)
    )
      throw new Error(
        "Permission history has a duplicate or invalid identity.",
      );
    keys.add(record.stableKey);
    ids.add(record.id);
    makeIsoDate(record.effectiveAt);
    makeIsoDate(record.recordedAt);
    if (
      record.effectiveAt > record.recordedAt ||
      record.recordedAt > world.currentDate ||
      !record.permissionKey.trim() ||
      !["permitted", "prohibited"].includes(record.status)
    )
      throw new Error("Permission history has an invalid date, key or status.");
    if (
      record.subject.kind === "person"
        ? !world.people[record.subject.id]
        : record.subject.kind !== "organization" ||
          !world.history.organizations.some(
            (row) => row.id === record.subject.id,
          )
    )
      throw new Error("Permission history has a missing subject.");
    const stamp = record.lawEffectStamps?.[0];
    if (
      record.lawEffectStamps?.length !== 1 ||
      !isLawEffectStamp(stamp) ||
      stamp.appliedAt !== record.effectiveAt ||
      JSON.stringify(stamp.sourceRecordIds) !==
        JSON.stringify(record.sourceRecordIds)
    )
      throw new Error(
        "Permission history must retain its actual law attribution.",
      );
    const question = Object.values(
      world.policyCatalog?.propositions ?? {},
    ).find((entry) => entry.stableKey === stamp.questionKey);
    const law =
      question &&
      lawInForce(world, stamp.jurisdictionId, question.id, record.effectiveAt);
    if (
      !law ||
      law.measureId !== stamp.governingLawKey ||
      law.origin !== stamp.source ||
      law.operativeAt !== stamp.operativeAt
    )
      throw new Error(
        "Permission history does not match the law in force at its review.",
      );
    if (
      !record.sourceRecordIds.length ||
      new Set(record.sourceRecordIds).size !== record.sourceRecordIds.length
    )
      throw new Error("Permission history lacks unique saved sources.");
    for (const id of record.sourceRecordIds) {
      const source = Object.values(world.history)
        .flatMap((rows) => (Array.isArray(rows) ? rows : []))
        .find((row) => row.id === id);
      const date =
        source?.recordedAt ??
        source?.occurredAt ??
        source?.effectiveAt ??
        source?.createdAt ??
        source?.formedAt ??
        source?.introducedAt;
      if (
        !source ||
        source.sequence >= record.sequence ||
        !date ||
        date > record.effectiveAt
      )
        throw new Error(
          "Permission history references a missing or later saved source.",
        );
    }
  }
}
