import { createOrganizationParticipation } from "../life";
import { activeOrganizationParticipationsAt } from "../life-queries";
import { primaryReading } from "../municipal-government";
import {
  installMunicipalGovernment,
  municipalOrganizationFor,
  municipalSeats,
  seatMunicipalMember,
} from "../municipal-public-work";
import type { GovernmentUnitIdentity } from "../government-units";
import { localChiefExecutiveRules } from "../nationwide-world/local-chief-executive-rules";
import { localGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import { localGoverningBodyRules } from "../nationwide-world/local-governing-body-rules";
import {
  ensureLocalGovernmentOrganization,
  homeLocalGovernmentUnits,
  localGovernmentOrganizationKey,
} from "../nationwide-world/local-governments";
import { DC_GOVERNMENT_KEY } from "../nationwide-world/district-of-columbia-council-opening";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import type { EntityId, World } from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { recordWorldEvent } from "../world";
import {
  materializeSettledTownHousehold,
  playerTown,
  townResidentId,
  townRosterPlace,
} from "./town-residents";

/**
 * The player's town government, seated with its own residents.
 *
 * Until this, a town's government was an organization with nobody in it: the
 * council the player could run for had no members, the mayor's office no
 * mayor. Now, when a life opens in a town, its governing body is filled to its
 * seat count and its mayor seated where the town elects one, each by a real
 * resident of the town drawn from the same roster its employers and
 * congregations are staffed from. Anybody the player meets on the council
 * lives down the road.
 *
 * Seats are organization participations in the town government, the same
 * records a campaign winner gets (`seatOnLocalGoverningBody` in campaigns.ts),
 * so a player who wins a seat joins these people, and the town's elections
 * later replace them.
 *
 * The seat count and whether the mayor is elected come from
 * `localGoverningBodyRules` and `localChiefExecutiveRules`: the town's own
 * reading where the game has read it, the ICMA survey's typical values
 * otherwise, each marked with its basis. A compiled government keeps its own
 * seat limit through `seatMunicipalMember`.
 *
 * PLACEHOLDER, pending `local-seats-at-the-opening`: every member's term is
 * recorded as beginning the day the life opens. How far into their terms the
 * sitting members already are has not been read for any town.
 */

export const LOCAL_GOVERNMENT_SEATS_VERSION = "local-government-seats/v1";

const V = LOCAL_GOVERNMENT_SEATS_VERSION;

/** Grown-ups old enough to hold local office in every state. */
const MINIMUM_AGE = 21;

export function localGovernmentSeatsKey(unitId: string): string {
  return `${V}:${unitId}:opening`;
}

export function localGovernmentSeated(world: World, unitId: string): boolean {
  const key = localGovernmentSeatsKey(unitId);
  return world.history.events.some((event) => event.stableKey === key);
}

/** The stable key a seat of a town without a compiled government is kept under. */
export function localGovernmentSeatKey(
  unit: GovernmentUnitIdentity,
  personId: EntityId,
  mayor: boolean,
): string {
  const key = `local-government-seat:${unit.id}:${personId}`;
  return mayor ? `${key}:mayor` : key;
}

export interface SeatedLocalOffice {
  readonly personId: EntityId;
  /** The participation that holds the seat, when it is already recorded. */
  readonly participationId?: EntityId;
  readonly mayor: boolean;
  readonly seatLabel: string;
}

export function organizationIdFor(
  world: World,
  unit: GovernmentUnitIdentity,
): EntityId | null {
  const compiled = municipalGovernmentForUnit(unit);
  if (compiled)
    return municipalOrganizationFor(world, compiled.key)?.id ?? null;
  const key = localGovernmentOrganizationKey(unit);
  return (
    world.history.organizations.find(
      (organization) => organization.stableKey === key,
    )?.id ?? null
  );
}

/** Who holds a seat in this town's government today, members and mayor. */
export function sittingLocalOfficers(
  world: World,
  unit: GovernmentUnitIdentity,
): readonly SeatedLocalOffice[] {
  const organizationId = organizationIdFor(world, unit);
  if (!organizationId) return [];
  const out: SeatedLocalOffice[] = [];
  for (const participation of world.history.organizationParticipations) {
    if (participation.organizationId !== organizationId) continue;
    const active = activeOrganizationParticipationsAt(
      world,
      participation.personId,
    ).find((row) => row.participation.id === participation.id);
    if (!active) continue;
    const role = active.state.roleKind;
    if (
      role !== "leader:municipal-member" &&
      role !== "leader:municipal-presiding-member" &&
      role !== "leader:municipal-mayor"
    )
      continue;
    out.push({
      personId: participation.personId,
      participationId: participation.id,
      mayor: role === "leader:municipal-mayor",
      seatLabel: active.state.context ?? "",
    });
  }
  return out;
}

/**
 * One grown resident of the town for roster `slot` of `organizationKey`,
 * materialized in the world, or null after a bounded search. A slot can land
 * on someone excluded (already seated, the player's household), so a few
 * neighboring slots are tried. `taken` collects the roster places used.
 */
export function drawTownResident(
  world: World,
  town: EntityId,
  organizationKey: string,
  slot: number,
  minimumAge: number,
  excluded: ReadonlySet<EntityId>,
  taken: Set<string> = new Set(),
): { readonly world: World; readonly personId: EntityId | null } {
  let next = world;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const found = townRosterPlace(
      next,
      town,
      organizationKey,
      slot * 8 + attempt,
      (member) => member.role === "adult" && member.age >= minimumAge,
      taken,
    );
    if (!found) return { world: next, personId: null };
    taken.add(`${found.household}:${found.member}`);
    next = materializeSettledTownHousehold(next, town, found.household);
    const personId = townResidentId(next, town, found.household, found.member);
    if (!next.people[personId] || excluded.has(personId)) continue;
    // A household keeps its roster place after a member dies, so the draw
    // skips anyone no longer living on the day it is made.
    if (
      !isPersonAliveAt(next, personId, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      })
    )
      continue;
    return { world: next, personId };
  }
  return { world: next, personId: null };
}

function seatOne(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  personId: EntityId,
  mayor: boolean,
  seatLabel: string,
): World {
  const compiled = municipalGovernmentForUnit(unit);
  if (compiled) {
    let next = installMunicipalGovernment(world, {
      governmentKey: compiled.key,
      jurisdictionId: town,
      formedAt: world.currentDate,
    });
    if (!mayor) {
      const bodySize = primaryReading(compiled).bodySize;
      const seated = municipalSeats(next, compiled.key).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      ).length;
      if (bodySize !== null && seated >= bodySize) return next;
    }
    next = seatMunicipalMember(next, {
      governmentKey: compiled.key,
      personId,
      startedAt: next.currentDate,
      role: mayor ? "mayor" : "member",
      seatLabel,
    });
    return next;
  }
  const next = ensureLocalGovernmentOrganization(world, unit);
  const organizationId = organizationIdFor(next, unit);
  if (!organizationId) return next;
  return createOrganizationParticipation(next, {
    stableKey: localGovernmentSeatKey(unit, personId, mayor),
    personId,
    organizationId,
    startedAt: next.currentDate,
    kind: "leadership:municipal-office",
    roleKind: mayor ? "leader:municipal-mayor" : "leader:municipal-member",
    context: seatLabel,
    provenance: { kind: "generated", generatorKey: V },
  });
}

/**
 * Seat one town government: its body to its seat count, and its mayor where
 * the town elects one. Seats someone already holds (a player who won one) are
 * not filled again. Unchanged when the town's jurisdiction is not the life's.
 */
export function ensureLocalGovernmentSeatsForUnit(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  excludePersonIds: readonly EntityId[] = [],
): World {
  if (localGovernmentSeated(world, unit.id)) return world;
  // The Council of the District of Columbia is seated by its own opening,
  // from the Council's recorded roster, and its Mayor is a separate office.
  if (municipalGovernmentForUnit(unit)?.key === DC_GOVERNMENT_KEY) return world;
  const identity = localGoverningBodyIdentity(unit);
  const rules = localGoverningBodyRules(unit);
  if (!identity || !rules || rules.seats === null) return world;
  const chief = localChiefExecutiveRules(unit);
  const mayorElected = chief?.directlyElected.value === true;

  const sitting = sittingLocalOfficers(world, unit);
  const openMembers = Math.max(
    0,
    rules.seats.value - sitting.filter((seat) => !seat.mayor).length,
  );
  const mayorOpen = mayorElected && !sitting.some((seat) => seat.mayor);

  const taken = new Set<string>();
  const excluded = new Set([
    ...excludePersonIds,
    ...sitting.map((seat) => seat.personId),
  ]);
  let next = world;
  const seated: SeatedLocalOffice[] = [];
  const draw = (slot: number): EntityId | null => {
    const found = drawTownResident(
      next,
      town,
      `local-government:${unit.id}`,
      slot,
      MINIMUM_AGE,
      excluded,
      taken,
    );
    next = found.world;
    if (found.personId) excluded.add(found.personId);
    return found.personId;
  };

  let slot = 0;
  if (mayorOpen) {
    const personId = draw(slot++);
    if (personId) {
      next = seatOne(next, unit, town, personId, true, chief!.title.value);
      seated.push({ personId, mayor: true, seatLabel: chief!.title.value });
    }
  }
  for (let n = 0; n < openMembers; n += 1) {
    const personId = draw(slot++);
    if (!personId) break;
    const label = `${identity.officeTitle}, seat ${sitting.length + n + 1}`;
    next = seatOne(next, unit, town, personId, false, label);
    seated.push({ personId, mayor: false, seatLabel: label });
  }

  const members = seated.filter((seat) => !seat.mayor).length;
  return recordWorldEvent(next, {
    stableKey: localGovernmentSeatsKey(unit.id),
    type: "local.government-seated",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: town,
    involvedEntityIds: seated.map((seat) => seat.personId),
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      `unit:${unit.id}`,
      `seats:${rules.seats.value}`,
      `seats-basis:${rules.seats.basis}`,
      `mayor:${mayorElected ? "elected" : "not-elected"}`,
    ],
    summary: `${identity.bodyName} is seated with ${members + sitting.filter((seat) => !seat.mayor).length} of ${rules.seats.value} members${
      mayorElected
        ? seated.some((seat) => seat.mayor) ||
          sitting.some((seat) => seat.mayor)
          ? `, and ${identity.governmentName} has a ${chief!.title.value.toLowerCase()}`
          : ""
        : ""
    }.`,
    context: {
      location: {
        jurisdictionId: town,
        label: identity.governmentName,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * The player's town governments, seated once at the opening. Only the
 * governments of the town the player lives in are seated with individuals;
 * everywhere else stays modeled.
 */
export function ensureLocalGovernmentSeats(
  world: World,
  playerPersonId: EntityId,
): World {
  const town = playerTown(world, playerPersonId);
  if (!town) return world;
  const units = homeLocalGovernmentUnits(world, playerPersonId);
  // Nobody in the player's own household is seated at the opening: a life
  // that starts beside a sitting mayor is a story the player did not choose.
  const households = new Set(
    world.history.householdMemberships
      .filter((membership) => membership.personId === playerPersonId)
      .map((membership) => membership.householdId),
  );
  const housemates = new Set<EntityId>([playerPersonId]);
  for (const membership of world.history.householdMemberships)
    if (households.has(membership.householdId))
      housemates.add(membership.personId);
  let next = world;
  for (const unit of units.municipal)
    next = ensureLocalGovernmentSeatsForUnit(next, unit, town, [...housemates]);
  return next;
}
