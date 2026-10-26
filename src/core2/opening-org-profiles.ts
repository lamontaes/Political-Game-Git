/**
 * Each organization's latest profile record at the opening's date, read from
 * the history the opening population is built from. It is the core's own copy
 * of the old life-queries read (`organizationProfileAt` at the current
 * cutoff): a record counts when it was written before the history's next
 * sequence and took effect on or before today; the latest by effective date,
 * then sequence, stands. One pass over the records, not one scan per
 * organization.
 */
interface ProfileRecord {
  readonly organizationId: string;
  readonly effectiveAt: string;
  readonly sequence: number;
}

interface ProfileHistory<P extends ProfileRecord> {
  readonly currentDate: string;
  readonly history: {
    readonly nextSequence: number;
    readonly organizationProfiles: readonly P[];
  };
}

export function openingOrganizationProfiles<P extends ProfileRecord>(
  world: ProfileHistory<P>,
): ReadonlyMap<string, P> {
  const latest = new Map<string, P>();
  for (const record of world.history.organizationProfiles) {
    if (
      record.sequence >= world.history.nextSequence ||
      record.effectiveAt > world.currentDate
    )
      continue;
    const held = latest.get(record.organizationId);
    if (
      !held ||
      record.effectiveAt > held.effectiveAt ||
      (record.effectiveAt === held.effectiveAt &&
        record.sequence > held.sequence)
    )
      latest.set(record.organizationId, record);
  }
  return latest;
}
