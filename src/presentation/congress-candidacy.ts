import {
  addDays,
  candidacyEligibility,
  congressCandidacyPack,
  congressSeatIdentitiesForState,
  congressSeatIdentityForOfficeKey,
  congressionalElectionDay,
  electionContestResult,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  homeStateUsps,
  makeCurrencyCode,
  makeIsoDate,
  seatTermWindow,
  stateJurisdictionForKey,
  SEAT_TENURE_EVENT,
  LIVING_WORLD_WRITER_VERSION,
} from "../simulation";
import type {
  CandidacyBlock,
  CongressSeatIdentity,
  ElectionContestRecord,
  EntityId,
  IsoDate,
  World,
} from "../simulation";

/**
 * Standing for Congress from the state a person lives in.
 *
 * Every seat is the Congress record's own, so filing here, the contest it
 * opens, the result, and the member congressional turnover seats on 3 January
 * are one seat and one person throughout. Reading is free and writes nothing;
 * only `fileForCongressSeat` changes the World.
 */

export interface CongressSeatCalendar {
  /** The next general election for this seat that a filing today stands in. */
  readonly nextElection: IsoDate;
  readonly termStartsAt: IsoDate;
  /** The day the term ends; the next one begins the same day. */
  readonly termEndsAt: IsoDate;
}

/**
 * The seat's next regular election and the term it wins, from the seat's own
 * term window. A House seat is elected every even year; a Senate seat in the
 * November before its class's term ends. A filing on election day itself
 * stands in the one after.
 */
export function congressSeatCalendar(
  world: World,
  identity: CongressSeatIdentity,
): CongressSeatCalendar {
  let window = seatTermWindow(identity.seat, world.currentDate);
  for (;;) {
    const endYear = Number(window.endExclusive.slice(0, 4));
    const nextElection = congressionalElectionDay(endYear - 1);
    if (nextElection > world.currentDate) {
      return {
        nextElection,
        termStartsAt: window.endExclusive,
        termEndsAt: makeIsoDate(
          `${endYear + window.years}${window.endExclusive.slice(4)}`,
        ),
      };
    }
    window = seatTermWindow(identity.seat, addDays(window.endExclusive, 1));
  }
}

export interface CongressSeatCandidacy {
  readonly identity: CongressSeatIdentity;
  readonly calendar: CongressSeatCalendar;
  readonly eligible: boolean;
  readonly blocks: readonly CandidacyBlock[];
}

export interface CongressCandidacy {
  readonly stateUsps: string;
  readonly jurisdictionId: EntityId;
  /** Senate seats up at the next general election, then every House seat. */
  readonly seats: readonly CongressSeatCandidacy[];
}

/**
 * The seats in Congress this person could stand for from their state: every
 * House district (the Constitution asks only that a Representative live in the
 * state) and whichever Senate seat is elected next. Null outside the fifty
 * states, which elect no voting member of either chamber.
 */
export function congressCandidacyForPerson(
  world: World,
  personId: EntityId,
  alreadyACandidate = false,
): CongressCandidacy | null {
  const usps = homeStateUsps(world, personId);
  const identities = usps ? congressSeatIdentitiesForState(usps) : [];
  const jurisdiction =
    identities.length > 0
      ? stateJurisdictionForKey(identities[0]!.jurisdictionKey)
      : null;
  if (!usps || !jurisdiction) return null;
  const withCalendars = identities.map((identity) => ({
    identity,
    calendar: congressSeatCalendar(world, identity),
  }));
  const nextSenate = withCalendars
    .filter(({ identity }) => identity.seat.chamberKey === "us-senate")
    .map(({ calendar }) => calendar.nextElection)
    .sort()[0];
  const seats = withCalendars
    .filter(
      ({ identity, calendar }) =>
        identity.seat.chamberKey === "us-house" ||
        calendar.nextElection === nextSenate,
    )
    .sort(
      (left, right) =>
        (left.identity.seat.chamberKey === "us-senate" ? 0 : 1) -
          (right.identity.seat.chamberKey === "us-senate" ? 0 : 1) ||
        left.identity.officeKey.localeCompare(right.identity.officeKey),
    )
    .map(({ identity, calendar }) => {
      const eligibility = candidacyEligibility(world, {
        personId,
        jurisdictionId: jurisdiction.id,
        officeKey: identity.officeKey,
        alreadyACandidate,
      });
      return {
        identity,
        calendar,
        eligible: eligibility.eligible,
        blocks: eligibility.blocks,
      };
    });
  return { stateUsps: usps, jurisdictionId: jurisdiction.id, seats };
}

/**
 * Standing for a seat in Congress, through the same campaign and contest route
 * every other office uses. The contest is dated the federal election day and
 * carries the seat's own key, which is what congressional turnover reads to
 * let this contest, not its background model, decide the seat.
 */
export function fileForCongressSeat(
  world: World,
  personId: EntityId,
  officeKey: string,
): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const identity = congressSeatIdentityForOfficeKey(officeKey);
  if (!identity) throw new Error("That is not a seat in Congress.");
  const candidacy = congressCandidacyForPerson(world, personId);
  const seat = candidacy?.seats.find(
    (candidate) => candidate.identity.officeKey === officeKey,
  );
  if (!candidacy || !seat)
    throw new Error("That seat is not open to this character's state now.");
  const stableKey = `candidacy:${personId}:${world.currentDate}`;
  const registered = ensureStateJurisdiction(world, identity.stateUsps);
  const opponents = ensureCampaignOpponents(registered, {
    stableKey,
    // Rivals live in the state, in the candidate's own home place.
    jurisdictionId: person.homeJurisdictionId,
    count: 1,
    excludePersonIds: [personId],
  });
  // Resolves the pack eagerly so a missing seat fails here, not mid-campaign.
  congressCandidacyPack(identity);
  return fileCampaign(opponents.world, {
    stableKey,
    candidatePersonId: personId,
    jurisdictionId: candidacy.jurisdictionId,
    officeKey,
    districtBinding: null,
    electionDate: seat.calendar.nextElection,
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `${person.familyName} for ${identity.title === "U.S. Senator" ? "Senate" : "Congress"}`,
    donorPoolName: "People who might give",
    advertisingVendorName: "Whoever sells the advertising",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  }).world;
}

export type CongressSeatStatus =
  | { readonly kind: "none" }
  | {
      readonly kind: "pending-election";
      readonly identity: CongressSeatIdentity;
      readonly electionDate: IsoDate;
    }
  | {
      readonly kind: "lost";
      readonly identity: CongressSeatIdentity;
      readonly electionDate: IsoDate;
    }
  | {
      readonly kind: "won-awaiting-term";
      readonly identity: CongressSeatIdentity;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    }
  | {
      readonly kind: "in-office";
      readonly identity: CongressSeatIdentity;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    };

function latestCongressContest(
  world: World,
  personId: EntityId,
): { contest: ElectionContestRecord; identity: CongressSeatIdentity } | null {
  const contests = (world.history.electionContests ?? [])
    .map((contest) => ({
      contest,
      identity: congressSeatIdentityForOfficeKey(contest.office.officeKey),
    }))
    .filter(
      (
        entry,
      ): entry is {
        contest: ElectionContestRecord;
        identity: CongressSeatIdentity;
      } =>
        entry.identity !== null &&
        entry.contest.candidatePersonIds.includes(personId),
    )
    .sort((left, right) =>
      left.contest.electionDate.localeCompare(right.contest.electionDate),
    );
  return contests.at(-1) ?? null;
}

/** Whether this person holds the seat's current tenure record on this date. */
function seatedOn(
  world: World,
  seatKey: string,
  personId: EntityId,
  onDate: IsoDate,
): boolean {
  const records = world.history.events.filter(
    (event) =>
      event.type === SEAT_TENURE_EVENT &&
      event.tags.includes(LIVING_WORLD_WRITER_VERSION) &&
      event.tags.includes(`seat:${seatKey}`) &&
      event.occurredAt <= onDate,
  );
  const latest = records.sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.sequence - right.sequence,
  )[records.length - 1];
  return (
    latest?.participants.some(
      (participant) =>
        participant.personId === personId &&
        participant.role === "focus:subject",
    ) ?? false
  );
}

/**
 * Where this person stands with the last seat in Congress they ran for,
 * read from the contest and the Congress record rather than kept separately.
 */
export function congressSeatStatus(
  world: World,
  personId: EntityId,
): CongressSeatStatus {
  const latest = latestCongressContest(world, personId);
  if (!latest) return { kind: "none" };
  const { contest, identity } = latest;
  const result = electionContestResult(world, contest.id);
  if (!result)
    return {
      kind: "pending-election",
      identity,
      electionDate: contest.electionDate,
    };
  if (result.winnerPersonId !== personId)
    return { kind: "lost", identity, electionDate: contest.electionDate };
  const term = seatTermWindow(identity.seat, addDays(contest.electionDate, 90));
  if (world.currentDate < term.startsAt)
    return {
      kind: "won-awaiting-term",
      identity,
      startsAt: term.startsAt,
      endsAt: term.endExclusive,
    };
  return seatedOn(world, identity.officeKey, personId, world.currentDate)
    ? {
        kind: "in-office",
        identity,
        startsAt: term.startsAt,
        endsAt: term.endExclusive,
      }
    : { kind: "none" };
}
