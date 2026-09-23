import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { makeIsoDate } from "../dates";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
  municipalSeats,
  seatMunicipalMember,
} from "../municipal-public-work";
import {
  drawCanonicalNameForGender,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
} from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";

/**
 * The Council of the District of Columbia, with a person in each of its
 * thirteen seats.
 *
 * D.C. Code § 1-204.01(b)(1): the Chairman and four members are elected at
 * large, and one member from each of the eight wards. The state legislature
 * opening seats a home state's chambers; the District's legislature is this
 * Council, described in the municipal data, so it is seated here instead,
 * once, when a life starts in the District.
 *
 * Seats are participations in the Council's municipal organization, the same
 * records a campaign winner gets, so the Council's votes are the votes of
 * these people and a player who wins a seat joins the same body.
 *
 * PLACEHOLDER, pending `dc-council-membership-at-the-opening`: ages are drawn
 * from 25 to 80, and nobody is given a party, because the save's generated
 * political conditions carry no share for the District and the Council's
 * party composition was not read.
 */

export const DC_COUNCIL_OPENING_VERSION = "dc-council-opening/v1" as const;
export const DC_GOVERNMENT_KEY = "us-dc-washington";

const V = DC_COUNCIL_OPENING_VERSION;
const openingKey = `${V}:opening`;

/** The thirteen seats of § 1-204.01(b)(1), in the order they are seated. */
export function dcCouncilSeatLabels(): readonly {
  readonly label: string;
  readonly presiding: boolean;
}[] {
  return [
    { label: "Chairman (at large)", presiding: true },
    ...[1, 2, 3, 4].map((n) => ({
      label: `At-large member, seat ${n}`,
      presiding: false,
    })),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      label: `Ward ${n}`,
      presiding: false,
    })),
  ];
}

export function dcCouncilSeated(world: World): boolean {
  return world.history.events.some((event) => event.stableKey === openingKey);
}

/** The stable key a generated member was created under. */
export function dcCouncilMemberKey(ordinal: number): string {
  return `${V}:seat:${ordinal}:member`;
}

export function ensureDistrictOfColumbiaCouncilOpening(world: World): World {
  if (dcCouncilSeated(world)) return world;
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY);
  if (!government) return world;
  const reading = primaryReading(government);
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  );
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId]) return world;
  let next = installMunicipalGovernment(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  const labels = dcCouncilSeatLabels();
  // A seat someone already holds (a player who won one) is not seated again.
  const open = Math.max(
    0,
    (reading.bodySize ?? labels.length) -
      municipalSeats(next, DC_GOVERNMENT_KEY).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      ).length,
  );
  const rng = new SeededRng(next.seed).fork(openingKey);
  const year = Number(next.currentDate.slice(0, 4));
  const pad = (value: number) => String(value).padStart(2, "0");
  const people: CharacterHistoryContextPersonInput[] = [];
  const seated = labels.slice(0, open);
  seated.forEach((_, index) => {
    const seatRng = rng.fork(`seat:${index + 1}`);
    const age = seatRng.integer(25, 81);
    const identity = generatePersonIdentity(seatRng.fork("identity"));
    const name = drawCanonicalNameForGender(
      seatRng.fork("name"),
      identity.gender,
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
    );
    people.push({
      stableKey: dcCouncilMemberKey(index + 1),
      ...name,
      identity,
      birthDate: makeIsoDate(
        `${year - age - 1}-${pad(seatRng.integer(1, 13))}-${pad(seatRng.integer(1, 29))}`,
      ),
      homeJurisdictionId: jurisdictionId,
    });
  });
  next = createCharacterHistoryContextPeople(next, people);
  const seatedIds: EntityId[] = [];
  seated.forEach((seat, index) => {
    const personId = characterHistoryContextPersonId(
      next,
      dcCouncilMemberKey(index + 1),
    );
    if (!next.people[personId]) return;
    next = seatMunicipalMember(next, {
      governmentKey: DC_GOVERNMENT_KEY,
      personId,
      startedAt: next.currentDate,
      role: seat.presiding ? "presiding-member" : "member",
      seatLabel: seat.label,
    });
    seatedIds.push(personId);
  });
  return recordWorldEvent(next, {
    stableKey: openingKey,
    type: "world.dc-council-opening",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: seatedIds,
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V, `seated:${seatedIds.length}`],
    summary: `${reading.bodyName ?? "The Council"} is seated: ${seatedIds.length} of ${reading.bodySize ?? labels.length} members.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * The seat a winner of a Council race takes when every seat is filled: the
 * lowest-numbered member the opening seated who still sits, never the
 * Chairman.
 *
 * PLACEHOLDER, pending `dc-council-membership-at-the-opening`: a Council race
 * in this game names no ward or at-large seat, so which opening member it
 * replaces is the game's own rule, not the seat the race was for.
 */
export function dcCouncilSeatAWinnerTakes(world: World): {
  readonly participationId: EntityId;
  readonly personId: EntityId;
  readonly seatLabel: string | null;
} | null {
  const seats = municipalSeats(world, DC_GOVERNMENT_KEY);
  for (let ordinal = 2; ordinal <= dcCouncilSeatLabels().length; ordinal += 1) {
    const personId = characterHistoryContextPersonId(
      world,
      dcCouncilMemberKey(ordinal),
    );
    const seat = seats.find(
      (candidate) =>
        candidate.personId === personId && candidate.role === "member",
    );
    if (seat)
      return {
        participationId: seat.participationId,
        personId,
        seatLabel: seat.seatLabel,
      };
  }
  return null;
}
