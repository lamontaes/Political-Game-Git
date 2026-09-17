import { organizationParticipationStateAt } from "../life-queries";
import { makeIsoDate } from "../dates";
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
 * Optional as-of read. Omitted, every reader answers for `world.currentDate`
 * exactly as before. With `asOf`, the save's recorded history is read as it
 * stood on that earlier date: effective dates after `asOf` are ignored, so a
 * later party change never recolors an older day.
 */
export interface LivingWorldReadOptions {
  readonly asOf?: IsoDate;
}

function readDate(
  world: World,
  options: LivingWorldReadOptions | undefined,
): IsoDate {
  if (!options?.asOf) return world.currentDate;
  const asOf = makeIsoDate(options.asOf);
  if (asOf > world.currentDate) {
    throw new Error(
      "A living-world as-of read cannot be after the current world date.",
    );
  }
  return asOf;
}

/**
 * The party a person is publicly affiliated with today (or on `asOf`), or
 * null. Affiliation only: never registration, caucus, belief or a vote.
 *
 * Participation records are authoritative once a person has any: a member
 * who later ends an affiliation does not fall back to the roll's old label.
 * Otherwise the label on the person's current seat-roll record is used.
 */
export function publicPartyAffiliation(
  world: World,
  personId: EntityId,
  options?: LivingWorldReadOptions,
): EntityId | null {
  return affiliationWithRoll(
    world,
    personId,
    undefined,
    readDate(world, options),
  );
}

function affiliationWithRoll(
  world: World,
  personId: EntityId,
  knownRoll: HistoricalEvent | null | undefined,
  asOf: IsoDate,
): EntityId | null {
  const recorded = world.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      participation.kind === PARTY_AFFILIATION_KIND &&
      participation.startedAt <= asOf,
  );
  if (recorded.length > 0) return activeOrganization(world, recorded, asOf);
  const roll =
    knownRoll === undefined
      ? currentRollEvent(world, personId, asOf)
      : knownRoll;
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
  options?: LivingWorldReadOptions,
): EntityId | null {
  return caucusWithRoll(world, personId, undefined, readDate(world, options));
}

function caucusWithRoll(
  world: World,
  personId: EntityId,
  knownRoll: HistoricalEvent | null | undefined,
  asOf: IsoDate,
): EntityId | null {
  const recorded = world.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      participation.kind === CAUCUS_MEMBERSHIP_KIND &&
      participation.startedAt <= asOf,
  );
  if (recorded.length > 0) return activeOrganization(world, recorded, asOf);
  const roll =
    knownRoll === undefined
      ? currentRollEvent(world, personId, asOf)
      : knownRoll;
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
  asOf: IsoDate,
): EntityId | null {
  const cutoff = {
    asOfDate: asOf,
    historySequenceExclusive: world.history.nextSequence,
  };
  return (
    records
      .filter(
        (record) =>
          organizationParticipationStateAt(world, record.id, cutoff)?.status ===
          "active",
      )
      .at(-1)?.organizationId ?? null
  );
}

/** The person's in-term seat-roll record, if they hold a seat on `asOf`. */
function currentRollEvent(
  world: World,
  personId: EntityId,
  asOf: IsoDate,
): HistoricalEvent | null {
  return (
    [...world.history.events]
      .reverse()
      .find(
        (event) =>
          event.type === SEAT_TENURE_EVENT &&
          event.recordedAt <= world.currentDate &&
          event.occurredAt <= asOf &&
          event.participants.some(
            (participant) =>
              participant.personId === personId &&
              participant.role === "focus:subject",
          ) &&
          asOf < (tagValue(event, "term-end:") ?? ""),
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
 * Both chambers as this save records them today (or on `options.asOf`).
 * Pure: counts are derived from seat records and participations on every
 * read, and nothing is created. Null for a save whose public world was never
 * established.
 */
export function projectCongress(
  world: World,
  options?: LivingWorldReadOptions,
): CongressView | null {
  if (!livingWorldEstablished(world)) return null;
  const asOf = readDate(world, options);
  const bySeat = new Map<string, HistoricalEvent>();
  for (const event of world.history.events) {
    if (
      (event.type !== SEAT_TENURE_EVENT && event.type !== SEAT_VACANCY_EVENT) ||
      !event.tags.includes(LIVING_WORLD_WRITER_VERSION) ||
      event.recordedAt > world.currentDate ||
      event.occurredAt > asOf
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
      .map((seat) => seatView(world, seat, bySeat.get(seat.seatKey), asOf));
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
    asOf,
    house: chamber("us-house"),
    senate: chamber("us-senate"),
    sources: Object.values(CONGRESS_SEAT_SOURCES),
  };
}

function seatView(
  world: World,
  seat: CongressSeat,
  event: HistoricalEvent | undefined,
  asOf: IsoDate,
): SeatView {
  return {
    seatKey: seat.seatKey,
    chamberKey: seat.chamberKey,
    stateUsps: seat.stateUsps,
    district: seat.district,
    senateClass: seat.senateClass,
    occupant: occupantFor(world, seat, event, asOf),
  };
}

function occupantFor(
  world: World,
  seat: CongressSeat,
  event: HistoricalEvent | undefined,
  asOf: IsoDate,
): SeatOccupant {
  if (!event) {
    // A snapshot always writes every seat; this guards a hand-edited save.
    // An as-of read before the snapshot's terms began lands here too.
    return { kind: "no-current-record", lastTermEnded: asOf };
  }
  const endExclusive = tagValue(event, "term-end:") as IsoDate | null;
  if (endExclusive && asOf >= endExclusive)
    return { kind: "no-current-record", lastTermEnded: endExclusive };
  if (event.type === SEAT_VACANCY_EVENT)
    return { kind: "vacancy", since: event.occurredAt, eventId: event.id };
  const personId = event.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  const person = personId ? world.people[personId] : undefined;
  const death = person
    ? world.history.personDeaths.find(
        (record) => record.personId === person.id && record.diedAt <= asOf,
      )
    : undefined;
  if (!person || death)
    return {
      kind: "no-current-record",
      lastTermEnded: death?.diedAt ?? asOf,
    };
  const member: PublicHolderView = {
    personId: person.id,
    personName: personName(person),
    officeKey: seat.chamberKey,
    title: congressSeatTitle(seat),
    stateUsps: seat.stateUsps,
    partyOrganizationId: affiliationWithRoll(world, person.id, event, asOf),
    caucusOrganizationId: caucusWithRoll(world, person.id, event, asOf),
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
