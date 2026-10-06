import { makeIsoDate, ageOnDate } from "./dates";
import { eventById } from "./event-index";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import type {
  CitizenshipStatus,
  CitizenshipStatusRecord,
} from "./citizenship-types";
import type { EntityId, IsoDate, Person, World } from "./types";

export interface CitizenshipReadOptions {
  readonly asOfDate?: IsoDate;
  readonly historySequenceExclusive?: number;
}

/** Private authority read. This neither establishes another person's knowledge
 * nor infers an old save's missing status from birthplace or appearance.
 */
export function citizenshipStatusOf(
  world: World,
  personId: EntityId,
  options: CitizenshipReadOptions = {},
): CitizenshipStatusRecord | null {
  const asOf = makeIsoDate(options.asOfDate ?? world.currentDate);
  const through =
    options.historySequenceExclusive ?? world.history.nextSequence;
  if (
    asOf > world.currentDate ||
    through > world.history.nextSequence ||
    !Number.isSafeInteger(through) ||
    through < 0
  )
    throw new Error("Citizenship reads cannot use future evidence.");
  let latest: CitizenshipStatusRecord | null = null;
  for (const record of world.people[personId]?.citizenshipStatuses ?? []) {
    if (
      record.effectiveAt > asOf ||
      record.recordedAt > asOf ||
      (record.sequence !== null && record.sequence >= through)
    )
      continue;
    if (record.sourceEventId) {
      const event = eventById(world, record.sourceEventId);
      if (
        !event ||
        event.type !== "citizenship.status-recorded" ||
        event.visibility !== "private" ||
        event.sequence !== record.sequence ||
        event.occurredAt !== record.effectiveAt ||
        event.recordedAt !== record.recordedAt ||
        !event.tags.includes(`citizenship-status:${record.status}`) ||
        event.recordedAt > asOf ||
        event.occurredAt > asOf ||
        event.sequence >= through ||
        !event.participants.some(
          (participant) => participant.personId === personId,
        )
      )
        continue;
    }
    if (!latest || record.effectiveAt >= latest.effectiveAt) latest = record;
  }
  return latest;
}

/** Citizenship requirement only; never a substitute for office-specific law. */
export function citizenshipEligibility(
  world: World,
  personId: EntityId,
  options: CitizenshipReadOptions & { readonly minimumYears?: number } = {},
) {
  const minimum = options.minimumYears ?? 0;
  if (!Number.isSafeInteger(minimum) || minimum < 0)
    throw new Error("Citizenship duration must be a non-negative whole year.");
  const record = citizenshipStatusOf(world, personId, options);
  const isCitizen = record
    ? record.status === "citizen-by-birth" ||
      record.status === "naturalized-citizen"
    : null;
  const years = record?.citizenSince
    ? ageOnDate(record.citizenSince, options.asOfDate ?? world.currentDate)
    : null;
  return {
    verdict:
      isCitizen === false
        ? ("fails" as const)
        : isCitizen === null || (minimum > 0 && years === null)
          ? ("unverified" as const)
          : minimum > 0 && years! < minimum
            ? ("fails" as const)
            : ("meets" as const),
    isCitizen,
    citizenSince: record?.citizenSince ?? null,
    years,
    record,
    estimated: record?.provenance.method === "estimated-from-population-share",
    sourceEntityIds: record
      ? [personId, ...(record.sourceEventId ? [record.sourceEventId] : [])]
      : [],
  };
}

export interface RecordCitizenshipTransitionInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly kind: "naturalization" | "citizenship-loss" | "status-confirmation";
  readonly status: CitizenshipStatus;
  readonly citizenSince: IsoDate | null;
  readonly sourceEntityIds: readonly EntityId[];
  readonly reason: string;
}

/** Sole status-change writer. Explicit recorded authority, no daily inference. */
export function recordCitizenshipTransition(
  world: World,
  input: RecordCitizenshipTransitionInput,
): World {
  const person = world.people[input.personId];
  if (!person)
    throw new Error("A citizenship transition requires an actual person.");
  if (
    !["naturalization", "citizenship-loss", "status-confirmation"].includes(
      input.kind,
    ) ||
    ![
      "citizen-by-birth",
      "naturalized-citizen",
      "noncitizen",
      "noncitizen-national",
    ].includes(input.status)
  )
    throw new Error("Unknown citizenship transition or status.");
  const same = person.citizenshipStatuses?.find(
    (record) => record.stableKey === input.stableKey,
  );
  if (same) {
    if (
      same.status !== input.status ||
      same.effectiveAt !== input.effectiveAt ||
      same.citizenSince !== input.citizenSince
    )
      throw new Error(
        "Citizenship transition stable key conflicts with saved status.",
      );
    return world;
  }
  const effectiveAt = makeIsoDate(input.effectiveAt);
  const previous = citizenshipStatusOf(world, input.personId);
  if (
    !input.stableKey.trim() ||
    !input.reason.trim() ||
    effectiveAt > world.currentDate ||
    effectiveAt < person.birthDate ||
    (previous && effectiveAt < previous.effectiveAt)
  )
    throw new Error(
      "Citizenship transitions need a recorded reason and a valid nonfuture date.",
    );
  const citizen =
    input.status === "citizen-by-birth" ||
    input.status === "naturalized-citizen";
  if (
    (input.kind === "naturalization" &&
      (input.status !== "naturalized-citizen" ||
        input.citizenSince !== effectiveAt)) ||
    (input.kind === "citizenship-loss" && citizen) ||
    (!citizen && input.citizenSince !== null) ||
    (input.citizenSince !== null &&
      (makeIsoDate(input.citizenSince) > effectiveAt ||
        input.citizenSince < person.birthDate))
  )
    throw new Error(
      "Citizenship transition status and citizenship date disagree.",
    );
  const sequence = world.history.nextSequence;
  const sourceEvents = input.sourceEntityIds
    .map((id) => eventById(world, id))
    .filter((event) => event !== undefined && event !== null);
  for (const event of sourceEvents) {
    if (
      event.recordedAt > world.currentDate ||
      event.occurredAt > world.currentDate ||
      event.sequence >= sequence
    )
      throw new Error("Citizenship source events must already be recorded.");
  }
  const sourceEventIds = new Set(sourceEvents.map((event) => event.id));
  const next = recordWorldEvent(world, {
    stableKey: `citizenship:transition:${input.personId}:${input.stableKey}`,
    type: "citizenship.status-recorded",
    occurredAt: effectiveAt,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [
      ...new Set([
        input.personId,
        ...input.sourceEntityIds.filter((id) => !sourceEventIds.has(id)),
      ]),
    ],
    participants: [
      {
        personId: input.personId,
        role: "focus:citizenship-status",
        detail: input.kind,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `citizenship-status:${input.status}`,
      `citizenship-transition:${input.kind}`,
      ...sourceEvents.map((event) => `source-record:${event.id}`),
    ],
    summary: input.reason,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const record: CitizenshipStatusRecord = {
    stableKey: input.stableKey,
    status: input.status,
    effectiveAt,
    recordedAt: world.currentDate,
    sequence,
    citizenSince: input.citizenSince,
    sourceEventId: next.history.events.at(-1)!.id,
    visibility: "private",
    provenance: {
      method: "recorded-event",
      basis: null,
      countyGeoids: [],
      sourceVintage: null,
      sourceArtifactSha256s: [],
      sourceEntityIds: [...new Set(input.sourceEntityIds)],
      note: input.reason,
    },
  };
  const changed: World = {
    ...next,
    people: {
      ...next.people,
      [person.id]: {
        ...person,
        citizenshipStatuses: [...(person.citizenshipStatuses ?? []), record],
      },
    },
  };
  assertWorldIntegrity(changed);
  return changed;
}

/** Structural save validation permits absent old-save records, never invents one. */
export function assertPersonCitizenshipIntegrity(
  person: Person,
  currentDate: IsoDate,
): void {
  const keys = new Set<string>();
  let previous: IsoDate | null = null;
  for (const record of person.citizenshipStatuses ?? []) {
    if (
      !record.stableKey.trim() ||
      keys.has(record.stableKey) ||
      ![
        "citizen-by-birth",
        "naturalized-citizen",
        "noncitizen",
        "noncitizen-national",
      ].includes(record.status) ||
      record.visibility !== "private" ||
      !["estimated-from-population-share", "recorded-event"].includes(
        record.provenance.method,
      ) ||
      !record.provenance.note.trim() ||
      (record.sequence !== null &&
        (!Number.isSafeInteger(record.sequence) || record.sequence < 0)) ||
      makeIsoDate(record.effectiveAt) < person.birthDate ||
      record.effectiveAt > currentDate ||
      makeIsoDate(record.recordedAt) > currentDate ||
      record.recordedAt < record.effectiveAt ||
      (previous && record.effectiveAt < previous) ||
      (record.citizenSince !== null &&
        (makeIsoDate(record.citizenSince) < person.birthDate ||
          record.citizenSince > record.effectiveAt)) ||
      ((record.status === "noncitizen" ||
        record.status === "noncitizen-national") &&
        record.citizenSince !== null) ||
      (record.provenance.method === "recorded-event" &&
        (!record.sourceEventId || record.sequence === null))
    )
      throw new Error("Invalid canonical private citizenship status history.");
    keys.add(record.stableKey);
    previous = record.effectiveAt;
  }
}
