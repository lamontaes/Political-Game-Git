import { organizationParticipationStateAt } from "../life-queries";
import { personName } from "../people";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import {
  LIVING_WORLD_SCENARIO_PROFILE as PROFILE,
  type ChamberKey,
  type ChamberView,
  type CongressView,
  type MajorPartyKey,
  type PartyView,
  type PublicHolderView,
  type SeatOccupant,
  type SeatView,
} from "./contract";
import {
  CONGRESS_SEAT_SOURCES,
  congressSeats,
  type CongressSeat,
} from "./congress-seats";
import {
  CAUCUS_MEMBERSHIP_KIND,
  CHAMBER_NAMES,
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  PARTY_AFFILIATION_KIND,
  SEAT_CAUCUS_TAG,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
  SEAT_VACANCY_EVENT,
  congressSeatTitle,
  livingWorldEstablished,
  livingWorldOrganizationId,
} from "./opening";

/**
 * The party a person is publicly affiliated with today, or null. Affiliation
 * only: never registration, caucus, belief or a vote.
 *
 * Participation records are authoritative once a person has any: a member
 * who later ends an affiliation does not fall back to the roll's old label.
 * Otherwise the label on the person's current seat-roll record is used.
 */
export function publicPartyAffiliation(
  world: World,
  personId: EntityId,
): EntityId | null {
  return affiliationWithRoll(world, personId, undefined);
}

function affiliationWithRoll(
  world: World,
  personId: EntityId,
  knownRoll: HistoricalEvent | null | undefined,
): EntityId | null {
  const recorded = world.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      participation.kind === PARTY_AFFILIATION_KIND &&
      participation.startedAt <= world.currentDate,
  );
  if (recorded.length > 0) return activeOrganization(world, recorded);
  const roll =
    knownRoll === undefined ? currentRollEvent(world, personId) : knownRoll;
  const party = roll ? tagValue(roll, SEAT_PARTY_TAG) : null;
  return party && party !== "none"
    ? livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.nationalParty(party as MajorPartyKey),
      )
    : null;
}

/** A chamber caucus membership, with the same precedence as affiliation. */
export function caucusMembership(
  world: World,
  personId: EntityId,
): EntityId | null {
  return caucusWithRoll(world, personId, undefined);
}

function caucusWithRoll(
  world: World,
  personId: EntityId,
  knownRoll: HistoricalEvent | null | undefined,
): EntityId | null {
  const recorded = world.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      participation.kind === CAUCUS_MEMBERSHIP_KIND &&
      participation.startedAt <= world.currentDate,
  );
  if (recorded.length > 0) return activeOrganization(world, recorded);
  const roll =
    knownRoll === undefined ? currentRollEvent(world, personId) : knownRoll;
  const caucus = roll ? tagValue(roll, SEAT_CAUCUS_TAG) : null;
  const chamber = roll
    ? (tagValue(roll, "office:") as ChamberKey | null)
    : null;
  return caucus && caucus !== "none" && chamber
    ? livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.caucus(chamber, caucus as MajorPartyKey),
      )
    : null;
}

function activeOrganization(
  world: World,
  records: readonly {
    readonly id: EntityId;
    readonly organizationId: EntityId;
  }[],
): EntityId | null {
  return (
    records
      .filter(
        (record) =>
          organizationParticipationStateAt(world, record.id)?.status ===
          "active",
      )
      .at(-1)?.organizationId ?? null
  );
}

/** The person's in-term seat-roll record, if they hold a seat today. */
function currentRollEvent(
  world: World,
  personId: EntityId,
): HistoricalEvent | null {
  return (
    [...world.history.events]
      .reverse()
      .find(
        (event) =>
          event.type === SEAT_TENURE_EVENT &&
          event.recordedAt <= world.currentDate &&
          event.occurredAt <= world.currentDate &&
          event.participants.some(
            (participant) =>
              participant.personId === personId &&
              participant.role === "focus:subject",
          ) &&
          world.currentDate < (tagValue(event, "term-end:") ?? ""),
      ) ?? null
  );
}

/** The national parties this save records, with derived officeholder counts. */
export function nationalParties(
  world: World,
  currentHolderPersonIds: readonly EntityId[],
): readonly PartyView[] {
  const holders = new Set(currentHolderPersonIds);
  return PROFILE.majorParties.flatMap((party) => {
    const stableKey = LIVING_WORLD_KEYS.nationalParty(party.key);
    const organization = world.history.organizations.find(
      (candidate) => candidate.stableKey === stableKey,
    );
    if (!organization) return [];
    const affiliated = [...holders].filter(
      (personId) => publicPartyAffiliation(world, personId) === organization.id,
    );
    return [
      {
        organizationId: organization.id,
        partyKey: party.key as MajorPartyKey,
        name: party.name,
        level: "national" as const,
        parentOrganizationId: null,
        jurisdictionId: null,
        affiliatedOfficeholders: affiliated.length,
      },
    ];
  });
}

/**
 * Both chambers as this save records them today. Pure: counts are derived
 * from seat records and participations on every read, and nothing is created.
 * Null for a save whose public world was never established.
 */
export function projectCongress(world: World): CongressView | null {
  if (!livingWorldEstablished(world)) return null;
  const bySeat = new Map<string, HistoricalEvent>();
  for (const event of world.history.events) {
    if (
      (event.type !== SEAT_TENURE_EVENT && event.type !== SEAT_VACANCY_EVENT) ||
      !event.tags.includes(LIVING_WORLD_WRITER_VERSION) ||
      event.recordedAt > world.currentDate ||
      event.occurredAt > world.currentDate
    )
      continue;
    const seatKey = tagValue(event, "seat:");
    if (!seatKey) continue;
    const current = bySeat.get(seatKey);
    if (
      !current ||
      event.occurredAt > current.occurredAt ||
      (event.occurredAt === current.occurredAt &&
        event.sequence > current.sequence)
    )
      bySeat.set(seatKey, event);
  }
  const chamber = (chamberKey: ChamberKey): ChamberView => {
    const seats = congressSeats()
      .filter((seat) => seat.chamberKey === chamberKey)
      .map((seat) => seatView(world, seat, bySeat.get(seat.seatKey)));
    return {
      chamberKey,
      organizationId: livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.chamber(chamberKey),
      ),
      name: CHAMBER_NAMES[chamberKey],
      seats,
      totals: totalsFor(seats),
    };
  };
  return {
    asOf: world.currentDate,
    house: chamber("us-house"),
    senate: chamber("us-senate"),
    sources: Object.values(CONGRESS_SEAT_SOURCES),
  };
}

function seatView(
  world: World,
  seat: CongressSeat,
  event: HistoricalEvent | undefined,
): SeatView {
  return {
    seatKey: seat.seatKey,
    chamberKey: seat.chamberKey,
    stateUsps: seat.stateUsps,
    district: seat.district,
    senateClass: seat.senateClass,
    occupant: occupantFor(world, seat, event),
  };
}

function occupantFor(
  world: World,
  seat: CongressSeat,
  event: HistoricalEvent | undefined,
): SeatOccupant {
  if (!event) {
    // A snapshot always writes every seat; this guards a hand-edited save.
    return { kind: "no-current-record", lastTermEnded: world.currentDate };
  }
  const endExclusive = tagValue(event, "term-end:") as IsoDate | null;
  if (endExclusive && world.currentDate >= endExclusive)
    return { kind: "no-current-record", lastTermEnded: endExclusive };
  if (event.type === SEAT_VACANCY_EVENT)
    return { kind: "vacancy", since: event.occurredAt, eventId: event.id };
  const personId = event.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  const person = personId ? world.people[personId] : undefined;
  const death = person
    ? world.history.personDeaths.find(
        (record) =>
          record.personId === person.id && record.diedAt <= world.currentDate,
      )
    : undefined;
  if (!person || death)
    return {
      kind: "no-current-record",
      lastTermEnded: death?.diedAt ?? world.currentDate,
    };
  const member: PublicHolderView = {
    personId: person.id,
    personName: personName(person),
    officeKey: seat.chamberKey,
    title: congressSeatTitle(seat),
    stateUsps: seat.stateUsps,
    partyOrganizationId: affiliationWithRoll(world, person.id, event),
    caucusOrganizationId: caucusWithRoll(world, person.id, event),
    termId: event.id,
    startedAt: event.occurredAt,
    endExclusive,
    serviceSince: tagValue(event, "service-since:") as IsoDate | null,
    birthDate: person.birthDate,
    residenceJurisdictionId: person.homeJurisdictionId,
    residenceLabel:
      world.jurisdictions[person.homeJurisdictionId]?.name ?? null,
  };
  return { kind: "member", member };
}

function totalsFor(seats: readonly SeatView[]): ChamberView["totals"] {
  const byParty = new Map<EntityId | null, number>();
  const byCaucus = new Map<EntityId | null, number>();
  let members = 0;
  let vacancies = 0;
  let noCurrentRecord = 0;
  for (const seat of seats) {
    if (seat.occupant.kind === "vacancy") vacancies += 1;
    else if (seat.occupant.kind === "no-current-record") noCurrentRecord += 1;
    else {
      members += 1;
      const { partyOrganizationId, caucusOrganizationId } =
        seat.occupant.member;
      byParty.set(
        partyOrganizationId,
        (byParty.get(partyOrganizationId) ?? 0) + 1,
      );
      byCaucus.set(
        caucusOrganizationId,
        (byCaucus.get(caucusOrganizationId) ?? 0) + 1,
      );
    }
  }
  const order = <K>(map: Map<K, number>) =>
    [...map.entries()].sort(
      (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])),
    );
  return {
    seats: seats.length,
    members,
    vacancies,
    noCurrentRecord,
    byParty: order(byParty).map(([partyOrganizationId, count]) => ({
      partyOrganizationId,
      members: count,
    })),
    byCaucus: order(byCaucus).map(([caucusOrganizationId, count]) => ({
      caucusOrganizationId,
      members: count,
    })),
  };
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}
