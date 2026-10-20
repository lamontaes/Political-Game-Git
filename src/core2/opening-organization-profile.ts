/**
 * The latest profile of each organization the opening builds: its name,
 * classification and location, read from a profile history as it stands on
 * its date. Records become available once their sequence is below the
 * history's next sequence and their effective date has come; the latest by
 * effective date, then sequence, is the profile.
 *
 * The input is a Core-owned shape: any world whose history lists profile
 * records with these fields reads through it, so the core imports nothing
 * from the old engine for this piece.
 */

/** The fields a profile record needs for the latest-profile read. */
export interface OpeningProfileRecord {
  readonly organizationId: string;
  readonly sequence: number;
  readonly effectiveAt: string;
}

/** What the read needs of a world: its date and its profile history. */
export interface OpeningProfileHistory<R extends OpeningProfileRecord> {
  readonly currentDate: string;
  readonly history: {
    readonly nextSequence: number;
    readonly organizationProfiles: readonly R[];
  };
}

/** Every organization's latest profile, read in one pass over the history. */
export function openingOrganizationProfiles<R extends OpeningProfileRecord>(
  world: OpeningProfileHistory<R>,
): ReadonlyMap<string, R> {
  const latest = new Map<string, R>();
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
