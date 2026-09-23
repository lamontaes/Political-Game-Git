import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type { EntityId, EntityKind, World } from "./types";

/**
 * Save checks for the job market's records. A leaf module, so `world.ts` can
 * read it without importing the writers.
 */
export function jobMarketHistoryRecords(world: World) {
  return [
    ...(world.history.jobOpenings ?? []),
    ...(world.history.jobApplications ?? []),
    ...(world.history.jobApplicationSteps ?? []),
  ];
}

export function assertJobMarketIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const groups: readonly (readonly [
    EntityKind,
    readonly { id: EntityId; stableKey: string; sequence: number }[],
  ])[] = [
    ["job-opening", world.history.jobOpenings ?? []],
    ["job-application", world.history.jobApplications ?? []],
    ["job-application-step", world.history.jobApplicationSteps ?? []],
  ];
  for (const [kind, records] of groups) {
    const keys = new Set<string>();
    let previous = -1;
    for (const row of records) {
      if (
        !row.stableKey.trim() ||
        ids.has(row.id) ||
        row.id !== createStableId(kind, `${world.id}:${row.stableKey}`) ||
        keys.has(row.stableKey) ||
        row.sequence <= previous
      )
        throw new Error("Invalid job market identity or ordering.");
      ids.add(row.id);
      keys.add(row.stableKey);
      previous = row.sequence;
    }
  }
  const openings = new Map(
    (world.history.jobOpenings ?? []).map((row) => [row.id, row]),
  );
  for (const row of world.history.jobOpenings ?? []) {
    if (
      makeIsoDate(row.opensAt) > world.currentDate ||
      row.closesAt < row.opensAt ||
      !world.history.organizations.some((o) => o.id === row.organizationId)
    )
      throw new Error("Invalid job opening.");
  }
  const applications = new Map(
    (world.history.jobApplications ?? []).map((row) => [row.id, row]),
  );
  for (const row of world.history.jobApplications ?? []) {
    if (
      !openings.has(row.openingId) ||
      !world.people[row.personId] ||
      makeIsoDate(row.submittedAt) > world.currentDate ||
      row.decisionAt < row.submittedAt
    )
      throw new Error("Invalid job application.");
  }
  for (const row of world.history.jobApplicationSteps ?? []) {
    if (
      !applications.has(row.applicationId) ||
      makeIsoDate(row.occurredAt) > world.currentDate
    )
      throw new Error("Invalid job application step.");
  }
}
