import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../life";
import {
  activeOrganizationParticipationsAt,
  organizationParticipationStateAt,
} from "../life-queries";
import { municipalProcedureReading } from "../municipal-government";
import {
  installMunicipalGovernment,
  municipalOrganizationFor,
  municipalSeats,
  seatMunicipalMember,
} from "../municipal-public-work";
import type { GovernmentUnitIdentity } from "../government-units";
import { boardGoverningBodyRules } from "../nationwide-world/township-governing-body-rules";
import { localChiefExecutiveRules } from "../nationwide-world/local-chief-executive-rules";
import { localGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import {
  localGoverningBodySeatLabel,
  localGoverningBodyRules,
  localGoverningBodySeatWord,
} from "../nationwide-world/local-governing-body-rules";
import {
  countyElectedRowOffices,
  countyRowOfficeFromRoleKind,
  countyRowOfficeRoleKind,
  type CountyRowOfficeKey,
} from "../nationwide-world/county-row-offices";
import {
  ensureLocalGovernmentOrganization,
  homeLocalGovernmentUnits,
  localGovernmentDisplayName,
  localGovernmentOrganizationKey,
  municipalWorkspaceGovernmentForUnit,
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
import {
  councilWardPlan,
  isWardSeat,
  redrawTownWards,
  seatWard,
  townWardMap,
  wardRange,
} from "./town-wards";

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

/** The role a county board member holds, beside a town's council roles. */
export const COUNTY_BOARD_MEMBER = "leader:county-board-member";

/** Grown-ups old enough to hold local office in every state. */
const MINIMUM_AGE = 21;

export function localGovernmentSeatsKey(unitId: string): string {
  return `${V}:${unitId}:opening`;
}

export function localGovernmentSeated(world: World, unitId: string): boolean {
  const key = localGovernmentSeatsKey(unitId);
  return world.history.events.some((event) => event.stableKey === key);
}

/**
 * Keep an internal trace when a local government's roster cannot supply any
 * living, eligible officeholder. This is not a public happening: the
 * information event type is excluded from journal, news, and recap readers.
 * The dated key leaves later calls free to try again after the roster changes.
 */
export function recordLocalGovernmentSeatGap(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
): World {
  const stableKey = `${localGovernmentSeatsKey(unit.id)}:seat-gap:${world.currentDate}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: "information.local-government-seat-gap",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [town],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      V,
      "reason:eligible-roster-exhausted",
      `unit:${unit.id}`,
      `unit-type:${unit.unitType}`,
      `state:${unit.stateUsps}`,
      ...(unit.countyGeoid ? [`county-area:${unit.countyGeoid}`] : []),
    ],
    summary: "No eligible officeholder was found in the recorded local roster.",
    context: {
      location: {
        jurisdictionId: town,
        label: world.jurisdictions[town]?.name ?? null,
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
  /** The body's recorded chair (its presiding member). */
  readonly presiding?: boolean;
  readonly seatLabel: string;
}

export function organizationIdFor(
  world: World,
  unit: GovernmentUnitIdentity,
): EntityId | null {
  const compiled = municipalWorkspaceGovernmentForUnit(unit);
  if (compiled)
    return municipalOrganizationFor(world, compiled.key)?.id ?? null;
  const key = localGovernmentOrganizationKey(unit);
  return (
    world.history.organizations.find(
      (organization) => organization.stableKey === key,
    )?.id ?? null
  );
}

/**
 * Who heads a resident's local government, as its form of government
 * records it: the seated chief executive of their town's own government,
 * else the body's seated chair, and where the town records neither, the
 * same for their county. Null where neither records one, so the caller
 * falls to the next level (the governor); a member who merely sits first on
 * the roster never answers for the town.
 */
export function localHeadOfGovernment(
  world: World,
  residentId: EntityId,
): EntityId | null {
  const home = homeLocalGovernmentUnits(world, residentId);
  for (const units of [home.municipal, home.counties]) {
    const officers = units.flatMap((unit) => sittingLocalOfficers(world, unit));
    const head =
      officers.find((officer) => officer.mayor) ??
      officers.find((officer) => officer.presiding);
    if (head) return head.personId;
  }
  return null;
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
      role !== "leader:municipal-mayor" &&
      role !== COUNTY_BOARD_MEMBER
    )
      continue;
    out.push({
      personId: participation.personId,
      participationId: participation.id,
      mayor: role === "leader:municipal-mayor",
      presiding: role === "leader:municipal-presiding-member",
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
  range: readonly [number, number] | null = null,
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
      range,
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
  // The organization a campaign winner joins: a sourced government, or a
  // matched city's game profile, which uses the same one.
  const compiled = municipalWorkspaceGovernmentForUnit(unit);
  if (compiled) {
    let next = installMunicipalGovernment(world, {
      governmentKey: compiled.key,
      jurisdictionId: town,
      formedAt: world.currentDate,
    });
    if (!mayor) {
      // The same size seatMunicipalMember enforces: the body's procedure
      // reading, which is its game profile where no source gave one.
      const bodySize = municipalProcedureReading(compiled).bodySize;
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
  // A council elected by ward has its map before its ward seats are filled,
  // and each ward seat is filled from its own ward (`town-wards.ts`).
  const plan = councilWardPlan(unit);
  if (plan && plan.wardSeats >= 2 && !townWardMap(next, unit))
    next = redrawTownWards(next, {
      unit,
      town,
      drawnBy: "council",
      members: sitting.flatMap((seat) => {
        const n = /seat (\d+)$/.exec(seat.seatLabel)?.[1];
        return !seat.mayor && n
          ? [{ seat: Number(n), personId: seat.personId }]
          : [];
      }),
      reason: "when the council was seated",
    });
  const wardMap = townWardMap(next, unit);
  const seated: SeatedLocalOffice[] = [];
  const draw = (slot: number, seat: number | null = null): EntityId | null => {
    const found = drawTownResident(
      next,
      town,
      `local-government:${unit.id}`,
      slot,
      MINIMUM_AGE,
      excluded,
      taken,
      wardMap && seat !== null && isWardSeat(plan, seat)
        ? wardRange(wardMap, seatWard(wardMap, seat))
        : null,
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
    const seatNumber = sitting.length + n + 1;
    const personId = draw(slot++, seatNumber);
    if (!personId) break;
    const seatWord = localGoverningBodySeatWord(unit, seatNumber);
    const label = localGoverningBodySeatLabel(
      identity.officeTitle,
      seatNumber,
      seatWord,
    );
    next = seatOne(next, unit, town, personId, false, label);
    seated.push({ personId, mayor: false, seatLabel: label });
  }

  const members = seated.filter((seat) => !seat.mayor).length;
  // Nobody could be seated, so there is nobody for the record to name; the
  // seats stay open and a later pass fills them.
  if (seated.length === 0) {
    return sitting.length === 0
      ? recordLocalGovernmentSeatGap(next, unit, town)
      : next;
  }
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
 * Seat one county, town or township government, or one municipio: its board
 * or municipal legislature at the size its law sets
 * (`boardGoverningBodyRules`), and its
 * mayor where the law elects one. Members are drawn from the residents of the
 * player's own town, which lies in the county: the game holds no other
 * roster there yet. Seats someone already holds are not filled again.
 */
export function ensureCountyGovernmentSeatsForUnit(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  excludePersonIds: readonly EntityId[] = [],
): World {
  if (localGovernmentSeated(world, unit.id)) return world;
  const rules = boardGoverningBodyRules(unit);
  if (!rules) return world;
  const hasChief = rules.chiefTitle !== null;
  let next = ensureLocalGovernmentOrganization(world, unit);
  const organizationId = organizationIdFor(next, unit);
  if (!organizationId) return world;
  const sitting = sittingLocalOfficers(next, unit);
  const openMembers = Math.max(
    0,
    rules.seats - sitting.filter((seat) => !seat.mayor).length,
  );
  const mayorOpen = hasChief && !sitting.some((seat) => seat.mayor);
  const taken = new Set<string>();
  const excluded = new Set([
    ...excludePersonIds,
    ...sitting.map((seat) => seat.personId),
  ]);
  const seated: SeatedLocalOffice[] = [];
  const seat = (slot: number, mayor: boolean, label: string): boolean => {
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
    if (!found.personId) return false;
    excluded.add(found.personId);
    next = createOrganizationParticipation(next, {
      stableKey: localGovernmentSeatKey(unit, found.personId, mayor),
      personId: found.personId,
      organizationId,
      startedAt: next.currentDate,
      kind: "leadership:municipal-office",
      roleKind: mayor
        ? "leader:municipal-mayor"
        : hasChief || unit.unitType === "township"
          ? "leader:municipal-member"
          : COUNTY_BOARD_MEMBER,
      context: label,
      provenance: { kind: "generated", generatorKey: V },
    });
    seated.push({ personId: found.personId, mayor, seatLabel: label });
    return true;
  };
  let slot = 0;
  if (mayorOpen) seat(slot++, true, rules.chiefTitle!);
  for (let n = 0; n < openMembers; n += 1)
    if (
      !seat(
        slot++,
        false,
        `${rules.memberTitle}, seat ${sitting.length + n + 1}`,
      )
    )
      break;

  const members =
    seated.filter((row) => !row.mayor).length +
    sitting.filter((row) => !row.mayor).length;
  // Nobody could be seated, so there is nobody for the record to name; the
  // seats stay open and a later pass fills them.
  if (seated.length === 0) {
    return sitting.length === 0
      ? recordLocalGovernmentSeatGap(next, unit, town)
      : next;
  }
  const name = localGovernmentDisplayName(unit);
  return recordWorldEvent(next, {
    stableKey: localGovernmentSeatsKey(unit.id),
    type: "local.government-seated",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: town,
    involvedEntityIds: seated.map((row) => row.personId),
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      `unit:${unit.id}`,
      `seats:${rules.seats}`,
      `seats-basis:${rules.basis}`,
      `mayor:${hasChief ? "elected" : "not-elected"}`,
      `executive-basis:${rules.executive.basis}`,
      `executive-status:${rules.executive.status}`,
    ],
    summary: `The ${rules.bodyName} of ${name} is seated with ${members} of ${rules.seats} members${
      hasChief && seated.some((row) => row.mayor)
        ? `, and ${name} has a ${rules.chiefTitle!.toLowerCase()}`
        : ""
    }.`,
    context: {
      location: {
        jurisdictionId: town,
        label: name,
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
 * The organization a county's row officers sit in: the county government
 * itself, kept apart from the board. A county whose board is a compiled
 * government keeps its own board organization, and a row officer is never a
 * member of it.
 */
export function countyRowOfficeOrganizationId(
  world: World,
  unit: GovernmentUnitIdentity,
): EntityId | null {
  const key = localGovernmentOrganizationKey(unit);
  return (
    world.history.organizations.find(
      (organization) => organization.stableKey === key,
    )?.id ?? null
  );
}

/** The stable key of the event that seats a county's row officers. */
export function countyRowOfficersKey(unitId: string): string {
  return `${V}:${unitId}:row-offices`;
}

export interface SeatedCountyRowOfficer {
  readonly office: CountyRowOfficeKey;
  readonly personId: EntityId;
  readonly participationId: EntityId;
  readonly title: string;
}

/** Who holds each of this county's row offices today (sheriff, prosecutor, ...). */
export function sittingCountyRowOfficers(
  world: World,
  unit: GovernmentUnitIdentity,
): readonly SeatedCountyRowOfficer[] {
  const organizationId = countyRowOfficeOrganizationId(world, unit);
  if (!organizationId) return [];
  const out: SeatedCountyRowOfficer[] = [];
  for (const participation of world.history.organizationParticipations) {
    if (participation.organizationId !== organizationId) continue;
    const active = activeOrganizationParticipationsAt(
      world,
      participation.personId,
    ).find((row) => row.participation.id === participation.id);
    const office = countyRowOfficeFromRoleKind(active?.state.roleKind ?? null);
    if (!active || !office) continue;
    out.push({
      office,
      personId: participation.personId,
      participationId: participation.id,
      title: active.state.context ?? "",
    });
  }
  return out;
}

function rowOfficerStableKey(
  unit: GovernmentUnitIdentity,
  office: CountyRowOfficeKey,
  personId: EntityId,
): string {
  return `local-government-row-office:${unit.id}:${office}:${personId}`;
}

/**
 * Seat the row offices this county's state elects (sheriff, prosecutor,
 * clerk, treasurer, assessor, coroner), one resident each, as generated
 * holders. The same table answers for every county
 * (`county-row-offices.ts`): which offices exist is the state's, who holds them
 * is drawn from the player's own town like the county board. A resident
 * never holds two of the county's offices, and board members are left on the
 * board. Offices already held are not filled again.
 */
export function ensureCountyRowOfficersForUnit(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  excludePersonIds: readonly EntityId[] = [],
): World {
  if (
    world.history.events.some(
      (event) => event.stableKey === countyRowOfficersKey(unit.id),
    )
  )
    return world;
  const offices = countyElectedRowOffices(unit);
  if (offices.length === 0) return world;
  let next = ensureLocalGovernmentOrganization(world, unit);
  const organizationId = countyRowOfficeOrganizationId(next, unit);
  if (!organizationId) return world;
  const held = new Set(
    sittingCountyRowOfficers(next, unit).map((row) => row.office),
  );
  const excluded = new Set([
    ...excludePersonIds,
    ...sittingLocalOfficers(next, unit).map((seat) => seat.personId),
    ...sittingCountyRowOfficers(next, unit).map((row) => row.personId),
  ]);
  const taken = new Set<string>();
  const seated: CountyRowOfficeKey[] = [];
  const personIds: EntityId[] = [];
  offices.forEach((rule, slot) => {
    if (held.has(rule.office)) return;
    const found = drawTownResident(
      next,
      town,
      `local-government:${unit.id}:row-${rule.office}`,
      slot,
      MINIMUM_AGE,
      excluded,
      taken,
    );
    next = found.world;
    if (!found.personId) return;
    excluded.add(found.personId);
    next = createOrganizationParticipation(next, {
      stableKey: rowOfficerStableKey(unit, rule.office, found.personId),
      personId: found.personId,
      organizationId,
      startedAt: next.currentDate,
      kind: "leadership:municipal-office",
      roleKind: countyRowOfficeRoleKind(rule.office),
      context: rule.title,
      provenance: { kind: "generated", generatorKey: V },
    });
    seated.push(rule.office);
    personIds.push(found.personId);
  });
  if (seated.length === 0) return next;
  return recordWorldEvent(next, {
    stableKey: countyRowOfficersKey(unit.id),
    type: "local.county-row-officers-seated",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: town,
    involvedEntityIds: personIds,
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V, `unit:${unit.id}`, ...seated.map((office) => `office:${office}`)],
    // Keys only; the English engine composes the sentence from the tags.
    summary: `county-row-officers-seated:${unit.id}:${seated.join(",")}`,
    context: {
      location: {
        jurisdictionId: town,
        label: localGovernmentDisplayName(unit),
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
 * Seat the winner of a county row-office race. The person who held the office
 * leaves it the day the winner's term begins; a winner who already holds it
 * keeps it. Called from the campaign's seating step.
 */
export function seatCountyRowOfficerWinner(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly office: CountyRowOfficeKey;
    readonly title: string;
    readonly winnerPersonId: EntityId;
    readonly effectiveAt: string;
    readonly contestId: EntityId;
    readonly outcomeEventId: EntityId;
  },
): World {
  const { unit, office, winnerPersonId } = input;
  let next = ensureLocalGovernmentOrganization(world, unit);
  const organizationId = countyRowOfficeOrganizationId(next, unit);
  if (!organizationId)
    throw new Error(
      `The county government ${unit.id} cannot be placed in this world, so nobody can be seated in it.`,
    );
  const roleKind = countyRowOfficeRoleKind(office);
  const sitting = next.history.organizationParticipations.filter(
    (participation) => {
      if (participation.organizationId !== organizationId) return false;
      const state = organizationParticipationStateAt(next, participation.id);
      return state?.status === "active" && state.roleKind === roleKind;
    },
  );
  if (
    sitting.some((participation) => participation.personId === winnerPersonId)
  )
    return next;
  for (const participation of sitting) {
    const state = organizationParticipationStateAt(next, participation.id);
    if (state?.status !== "active") continue;
    next = recordOrganizationParticipationState(next, {
      stableKey: `${participation.stableKey}:state:succeeded:${input.contestId}`,
      participationId: participation.id,
      effectiveAt:
        input.effectiveAt > participation.startedAt
          ? input.effectiveAt
          : participation.startedAt,
      status: "ended",
      roleKind: state.roleKind,
      context: state.context,
      provenance: { kind: "simulated-event", eventId: input.outcomeEventId },
      supersedesStateId: state.id,
    });
  }
  let stableKey = rowOfficerStableKey(unit, office, winnerPersonId);
  // Returning after time away: a new seat, so the earlier one stays as it was.
  if (
    next.history.organizationParticipations.some(
      (participation) => participation.stableKey === stableKey,
    )
  )
    stableKey = `${stableKey}:${input.contestId}`;
  return createOrganizationParticipation(next, {
    stableKey,
    personId: winnerPersonId,
    organizationId,
    startedAt: input.effectiveAt,
    kind: "leadership:municipal-office",
    roleKind,
    context: input.title,
    provenance: { kind: "simulated-event", eventId: input.outcomeEventId },
  });
}

/**
 * The player and everyone in the player's own household. Nobody among them
 * is seated at the opening: a life that starts beside a sitting mayor is a
 * story the player did not choose.
 */
export function playerHousemates(
  world: World,
  playerPersonId: EntityId,
): readonly EntityId[] {
  const households = new Set(
    world.history.householdMemberships
      .filter((membership) => membership.personId === playerPersonId)
      .map((membership) => membership.householdId),
  );
  const housemates = new Set<EntityId>([playerPersonId]);
  for (const membership of world.history.householdMemberships)
    if (households.has(membership.householdId))
      housemates.add(membership.personId);
  return [...housemates];
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
  const housemates = playerHousemates(world, playerPersonId);
  let next = world;
  for (const unit of units.municipal)
    next = ensureLocalGovernmentSeatsForUnit(next, unit, town, housemates);
  // The town or township board, the county board, or the municipio's
  // legislature and mayor, is seated from the same town's residents.
  for (const unit of units.townships)
    next = ensureCountyGovernmentSeatsForUnit(next, unit, town, housemates);
  for (const unit of units.counties) {
    next = ensureCountyGovernmentSeatsForUnit(next, unit, town, housemates);
    next = ensureCountyRowOfficersForUnit(next, unit, town, housemates);
  }
  return next;
}

