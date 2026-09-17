import type { EntityId, IsoDate, World } from "../types";
import { partyRecords } from "../world-setup/integrity";
import type {
  PartyEvolutionRecord,
  PartyUnitLevel,
  PartyUnitRecord,
} from "../world-setup/types";
import { LIVING_WORLD_WRITER_VERSION as V } from "./opening-keys";

/**
 * Party identity as persistent organizations. Any number of parties: there is
 * no fixed list, no "first party" and no pair. A legacy save's setting parties
 * are recognized by their stable keys; later units carry party-unit records.
 */
export interface PartyUnitView {
  readonly organizationId: EntityId;
  readonly partyKey: string;
  readonly name: string;
  readonly level: PartyUnitLevel;
  readonly parentOrganizationId: EntityId | null;
  readonly jurisdictionId: EntityId | null;
  readonly establishedAt: IsoDate;
  readonly origin: PartyUnitRecord["origin"];
}

export type PartyUnitStatus =
  | { readonly kind: "not-established" }
  | { readonly kind: "active" }
  | {
      readonly kind: "merged";
      readonly effectiveDate: IsoDate;
      readonly successorOrganizationId: EntityId | null;
    }
  | { readonly kind: "dissolved"; readonly effectiveDate: IsoDate };

const NATIONAL_PREFIX = `${V}:party:`;
const CHAPTER_PREFIX = `${V}:chapter:home:`;

/** Display names for setting parties; a party's saved profile always wins. */
export const SETTING_PARTY_NAMES: Readonly<Record<string, string>> = {
  democratic: "Democratic Party",
  republican: "Republican Party",
};

const SETTING_ORDER = Object.keys(SETTING_PARTY_NAMES);

export function settingPartyStableKey(partyKey: string): string {
  return `${NATIONAL_PREFIX}${partyKey}`;
}

function latestProfile(world: World, organizationId: EntityId) {
  let latest = null as
    (typeof world.history.organizationProfiles)[number] | null;
  for (const record of world.history.organizationProfiles) {
    if (record.organizationId === organizationId) latest = record;
  }
  return latest;
}

/** The profile name as of a date (renames are superseding profiles). */
export function organizationNameAt(
  world: World,
  organizationId: EntityId,
  date: IsoDate = world.currentDate,
): string | null {
  let name: string | null = null;
  for (const record of world.history.organizationProfiles) {
    if (record.organizationId !== organizationId) continue;
    if (record.effectiveAt <= date || name === null) name = record.name;
  }
  return name;
}

let cache: { world: World; units: readonly PartyUnitView[] } | null = null;

/** Every party unit the save records, in a stable order. Pure. */
export function partyUnits(world: World): readonly PartyUnitView[] {
  if (cache?.world === world) return cache.units;
  const byOrganization = new Map<EntityId, PartyUnitView>();
  const national = new Map<string, EntityId>();
  for (const organization of world.history.organizations) {
    if (!organization.stableKey.startsWith(NATIONAL_PREFIX)) continue;
    const partyKey = organization.stableKey.slice(NATIONAL_PREFIX.length);
    national.set(partyKey, organization.id);
    byOrganization.set(organization.id, {
      organizationId: organization.id,
      partyKey,
      name: latestProfile(world, organization.id)?.name ?? partyKey,
      level: "national",
      parentOrganizationId: null,
      jurisdictionId: null,
      establishedAt: organization.formedAt,
      origin: "setting",
    });
  }
  for (const organization of world.history.organizations) {
    if (!organization.stableKey.startsWith(CHAPTER_PREFIX)) continue;
    const partyKey = organization.stableKey.slice(CHAPTER_PREFIX.length);
    const profile = latestProfile(world, organization.id);
    byOrganization.set(organization.id, {
      organizationId: organization.id,
      partyKey,
      name: profile?.name ?? partyKey,
      level: "local",
      parentOrganizationId: national.get(partyKey) ?? null,
      jurisdictionId: profile?.locationJurisdictionId ?? null,
      establishedAt: organization.formedAt,
      origin: "setting",
    });
  }
  for (const record of partyRecords(world)) {
    if (record.kind !== "party-unit") continue;
    byOrganization.set(record.organizationId, {
      organizationId: record.organizationId,
      partyKey: record.partyKey,
      name:
        latestProfile(world, record.organizationId)?.name ?? record.partyKey,
      level: record.level,
      parentOrganizationId: record.parentOrganizationId,
      jurisdictionId: record.jurisdictionId,
      establishedAt: record.establishedAt,
      origin: record.origin,
    });
  }
  // Setting parties keep the order every earlier save showed them in, so a
  // party's color and list position never move; later units follow by date.
  const settingRank = (unit: PartyUnitView) => {
    const index = SETTING_ORDER.indexOf(unit.partyKey);
    return unit.origin === "setting" && index >= 0
      ? index
      : SETTING_ORDER.length;
  };
  const units = [...byOrganization.values()].sort(
    (a, b) =>
      settingRank(a) - settingRank(b) ||
      a.establishedAt.localeCompare(b.establishedAt) ||
      a.organizationId.localeCompare(b.organizationId),
  );
  cache = { world, units };
  return units;
}

export function partyUnit(
  world: World,
  organizationId: EntityId,
): PartyUnitView | null {
  return (
    partyUnits(world).find((unit) => unit.organizationId === organizationId) ??
    null
  );
}

export function isPartyOrganization(
  world: World,
  organizationId: EntityId,
): boolean {
  return partyUnit(world, organizationId) !== null;
}

function evolutionFor(
  world: World,
  organizationId: EntityId,
  date: IsoDate,
): PartyEvolutionRecord | null {
  let found: PartyEvolutionRecord | null = null;
  for (const record of partyRecords(world)) {
    if (
      record.kind === "party-evolution" &&
      record.effectiveDate <= date &&
      (record.change === "merged" || record.change === "dissolved") &&
      record.fromOrganizationIds.includes(organizationId) &&
      !record.toOrganizationIds.includes(organizationId)
    ) {
      found = record;
    }
  }
  return found;
}

/** Eligibility changes only from an evolution record's effective date. */
export function partyUnitStatusAt(
  world: World,
  organizationId: EntityId,
  date: IsoDate = world.currentDate,
): PartyUnitStatus {
  const unit = partyUnit(world, organizationId);
  if (!unit || unit.establishedAt > date) return { kind: "not-established" };
  const ended = evolutionFor(world, organizationId, date);
  if (!ended) return { kind: "active" };
  return ended.change === "merged"
    ? {
        kind: "merged",
        effectiveDate: ended.effectiveDate,
        successorOrganizationId: ended.toOrganizationIds[0] ?? null,
      }
    : { kind: "dissolved", effectiveDate: ended.effectiveDate };
}

export function activePartyUnitsAt(
  world: World,
  date: IsoDate = world.currentDate,
  filter: {
    readonly level?: PartyUnitLevel;
    readonly jurisdictionId?: EntityId;
  } = {},
): readonly PartyUnitView[] {
  return partyUnits(world).filter(
    (unit) =>
      partyUnitStatusAt(world, unit.organizationId, date).kind === "active" &&
      (filter.level === undefined || unit.level === filter.level) &&
      (filter.jurisdictionId === undefined ||
        unit.jurisdictionId === filter.jurisdictionId),
  );
}

/** The national unit a setting party key names, if the save has it. */
export function settingNationalPartyId(
  world: World,
  partyKey: string,
): EntityId | null {
  return (
    partyUnits(world).find(
      (unit) =>
        unit.level === "national" &&
        unit.origin === "setting" &&
        unit.partyKey === partyKey,
    )?.organizationId ?? null
  );
}

/**
 * Every national party the save has ever recorded, in its permanent display
 * order: a stable color/legend key by organization id. Merged and dissolved
 * parties keep their place so older views never change color.
 */
export function partyColorOrder(world: World): readonly EntityId[] {
  return partyUnits(world)
    .filter((unit) => unit.level === "national")
    .map((unit) => unit.organizationId);
}
