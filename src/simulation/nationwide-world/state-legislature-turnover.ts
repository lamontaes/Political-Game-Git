import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { candidacyPackById } from "../candidacy-packs";
import { addDays, makeIsoDate } from "../dates";
import { legislativeTermDates } from "../legislative-office-terms";
import {
  createOrganizationParticipations,
  createWorkRelationships,
  recordWorkStatus,
} from "../life";
import type {
  CreateOrganizationParticipationInput,
  CreateWorkRelationshipInput,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { workStatusAt } from "../life-queries";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import {
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  drawCanonicalNameForGender,
} from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { createStableId } from "../ids";
import { stateLegislativeElectionRule } from "./state-legislative-election-calendar";
import {
  generalElectionDay,
  isElectionYear,
} from "./state-executive-term-rules";
import {
  STATE_LEGISLATURE_KEYS,
  STATE_LEGISLATURE_OPENING_VERSION,
  campaignSeatHolders,
  seatTenureMatch,
  stateLegislativeSeats,
  stateSeatsInDistrict,
} from "./state-legislature-opening";
import { electionContestResult } from "../election-contests";

/**
 * STATE LEGISLATIVE CONTINUITY: the regular elections for the chambers an
 * opening seated.
 *
 * Before this, the members seated when a life began served until they died,
 * and nothing filled their seats. After sixteen years a 151-seat House listed
 * 103 members. Time now carries each seat forward:
 *
 * - On the state's regular legislative election day (the calendar in
 *   `state-legislative-election-calendar.ts`, which puts every seat of a
 *   chamber on the ballot at each regular election) each seat is decided,
 *   and one public results record names the winners.
 * - When the new term begins (`legislativeTermDates`: the sourced date where
 *   there is one, otherwise January 1 after the election) a member leaving
 *   the seat stops serving and the new member starts.
 *
 * Only dates the clock actually crosses act: reading or reopening a save
 * writes nothing, and a save that already passed an election keeps its
 * record.
 *
 * PLACEHOLDERS, NOT RESEARCH, filed with
 * `state-legislator-age-tenure-and-district-lean` (the same question the
 * opening's own ages and leans wait on): how often an incumbent runs and
 * wins, the retirement age, and how often an open seat stays with its
 * party. They reuse Congress's game profile. Primaries, campaigns and vote
 * counts for these seats are NOT MODELED.
 *
 * A seat with a campaign on the ballot (the player's own, filed for their
 * district) is left to that campaign: it is not drawn here, and when the term
 * begins its winner holds the seat and the member they replace stops serving.
 * A campaign's winner serves out their own term, and the seat is not drawn
 * while it runs; when it ends, a member who did not file again leaves it.
 */

export const STATE_LEGISLATURE_TURNOVER_VERSION =
  "state-legislature-turnover/v1" as const;
const V = STATE_LEGISLATURE_TURNOVER_VERSION;

export const STATE_LEGISLATURE_TURNOVER_PROFILE = {
  id: "ocd-state-legislature-turnover-game-profile/v1",
  /** Chance a sitting member runs again and wins, per mille. */
  incumbentReturnPermille: 850,
  /** Members this old or older retire. */
  retirementAge: 82,
  /** Chance an open seat stays with the departing member's party, per mille. */
  samePartyPermille: 750,
} as const;

export const STATE_LEGISLATIVE_RESULTS_EVENT =
  "election.state-legislative-general-results";

const OPENING_EVENT = "world.state-legislature-opening";

const resultsKey = (packId: string, electionDay: IsoDate) =>
  `${V}:${packId}:results:${electionDay}`;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** The candidacy packs whose legislatures an opening seated in this save. */
function seatedPacks(world: World): string[] {
  const packs: string[] = [];
  for (const event of world.history.events) {
    if (event.type !== OPENING_EVENT) continue;
    if (!event.tags.includes(STATE_LEGISLATURE_OPENING_VERSION)) continue;
    const packId = tagValue(event, "pack:");
    if (packId && !packs.includes(packId)) packs.push(packId);
  }
  return packs;
}

interface SeatOutcome {
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  readonly party: string | null;
  /** The sitting member who keeps the seat, or null for a new member. */
  readonly returningPersonId: EntityId | null;
  /** The member leaving the seat, if one is sitting. */
  readonly leavingPersonId: EntityId | null;
  readonly successorKey: string | null;
}

function partyKeyOf(world: World, personId: EntityId): string | null {
  for (const party of ["democratic", "republican"]) {
    const organizationId = livingWorldOrganizationId(
      world,
      LIVING_WORLD_KEYS.nationalParty(party),
    );
    if (
      world.history.organizationParticipations.some(
        (participation) =>
          participation.personId === personId &&
          participation.organizationId === organizationId &&
          participation.kind === PARTY_AFFILIATION_KIND,
      )
    )
      return party;
  }
  return null;
}

/** Election day: every seat in the chambers is decided. */
function holdStateLegislativeElection(
  world: World,
  packId: string,
  electionDay: IsoDate,
): World {
  const key = resultsKey(packId, electionDay);
  if (world.history.events.some((event) => event.stableKey === key))
    return world;
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const profile = STATE_LEGISLATURE_TURNOVER_PROFILE;
  // Each chamber's own term start: the sourced rule where there is one.
  const termStartOf = (officeKey: string) =>
    legislativeTermDates(officeKey, electionDay)?.startsAt ??
    makeIsoDate(`${Number(electionDay.slice(0, 4)) + 1}-01-01`);
  const holders = campaignSeatHolders(world, packId);
  const heldThrough = (officeKey: string, ordinal: number) =>
    holders
      .filter((h) => h.officeKey === officeKey && h.ordinal === ordinal)
      .reduce<IsoDate | null>(
        (latest, h) =>
          latest === null || h.endsAt > latest ? h.endsAt : latest,
        null,
      );
  // The seat each campaign on this ballot is for: a member running again
  // keeps their own seat; anyone else takes the district's first seat no
  // other campaign is contesting or still holds.
  const contested = new Map<string, EntityId>();
  const contests = (world.history.electionContests ?? [])
    .filter(
      (contest) =>
        contest.electionDate === electionDay &&
        contest.office.districtBinding &&
        pack.offices.some((o) => o.officeKey === contest.office.officeKey),
    )
    .sort((a, b) => a.sequence - b.sequence);
  for (const contest of contests) {
    const officeKey = contest.office.officeKey;
    const open = stateSeatsInDistrict(
      packId,
      officeKey,
      contest.office.districtBinding!.recordId,
    ).filter((s) => !contested.has(`${officeKey}|${s.ordinal}`));
    const seat =
      open.find((s) =>
        holders.some(
          (h) =>
            h.officeKey === officeKey &&
            h.ordinal === s.ordinal &&
            contest.candidatePersonIds.includes(h.personId),
        ),
      ) ??
      open.find((s) => {
        const through = heldThrough(officeKey, s.ordinal);
        return through === null || through <= termStartOf(officeKey);
      });
    if (seat) contested.set(`${officeKey}|${seat.ordinal}`, contest.id);
  }
  const campaignSeats: string[] = [];
  const outcomes: SeatOutcome[] = [];
  const inputs: CharacterHistoryContextPersonInput[] = [];
  for (const seat of stateLegislativeSeats(world, packId)) {
    const seatKey = `${seat.officeKey}|${seat.ordinal}`;
    const contestId = contested.get(seatKey);
    if (contestId) {
      campaignSeats.push(
        `campaign-seat:${seatKey}|${contestId}|${termStartOf(seat.officeKey)}`,
      );
      continue;
    }
    // A campaign's winner still serving their term is not on this ballot.
    const through = heldThrough(seat.officeKey, seat.ordinal);
    if (through !== null && through > termStartOf(seat.officeKey)) continue;
    const rng = new SeededRng(world.seed).fork(
      `${V}:${packId}:${seat.officeKey}:${seat.ordinal}:${electionDay}`,
    );
    const sitting = seat.member;
    const person = sitting ? world.people[sitting.personId] : undefined;
    const incumbentParty = sitting ? partyKeyOf(world, sitting.personId) : null;
    // A campaign's winner who did not file again leaves the seat.
    const returns =
      sitting !== null &&
      !sitting.byCampaign &&
      person !== undefined &&
      ageOn(person.birthDate, electionDay) < profile.retirementAge &&
      rng.integer(0, 1000) < profile.incumbentReturnPermille;
    if (returns) {
      outcomes.push({
        officeKey: seat.officeKey,
        ordinal: seat.ordinal,
        title: seat.title,
        party: incumbentParty,
        returningPersonId: sitting.personId,
        leavingPersonId: null,
        successorKey: null,
      });
      continue;
    }
    // An open seat. With no party on record for the seat (Puerto Rico's
    // members await research), the new member has none either.
    const departingParty =
      incumbentParty ??
      (sitting === null ? lastPartyOfSeat(world, packId, seat) : null);
    const parties = ["democratic", "republican"];
    const party =
      departingParty === null
        ? null
        : rng.fork("party").integer(0, 1000) < profile.samePartyPermille
          ? departingParty
          : parties.find((candidate) => candidate !== departingParty)!;
    const office = pack.offices.find(
      (candidate) => candidate.officeKey === seat.officeKey,
    );
    const minimumAge =
      office?.qualification.minimumAge.kind === "known"
        ? office.qualification.minimumAge.value
        : 18;
    const successorKey = `${key}:${seat.officeKey}:${seat.ordinal}:member`;
    const age = rng.integer(minimumAge + 3, 70);
    const identity = generatePersonIdentity(rng.fork("identity"));
    const name = drawCanonicalNameForGender(
      rng.fork("name"),
      identity.gender,
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
    );
    inputs.push({
      stableKey: successorKey,
      ...name,
      identity,
      birthDate: makeIsoDate(
        `${Number(electionDay.slice(0, 4)) - age - 1}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
      ),
      homeJurisdictionId: jurisdiction.id,
    });
    outcomes.push({
      officeKey: seat.officeKey,
      ordinal: seat.ordinal,
      title: seat.title,
      party,
      returningPersonId: null,
      leavingPersonId: sitting?.personId ?? null,
      successorKey,
    });
  }
  if (outcomes.length === 0 && campaignSeats.length === 0) return world;
  let next =
    inputs.length > 0
      ? createCharacterHistoryContextPeople(world, inputs)
      : world;
  const winnerIds = outcomes.map(
    (outcome) =>
      outcome.returningPersonId ??
      characterHistoryContextPersonId(next, outcome.successorKey!),
  );
  const returning = outcomes.filter((o) => o.returningPersonId).length;
  const termStarts = [
    ...new Set([
      ...outcomes.map((outcome) => termStartOf(outcome.officeKey)),
      ...campaignSeats.map((tag) => tag.split("|").at(-1)!),
    ]),
  ];
  const bodyId = createStableId(
    "organization",
    `${next.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  next = recordWorldEvent(next, {
    stableKey: key,
    type: STATE_LEGISLATIVE_RESULTS_EVENT,
    occurredAt: electionDay,
    recordedAt: next.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [bodyId, ...new Set(winnerIds)],
    participants: outcomes.map((outcome, index) => ({
      personId: winnerIds[index]!,
      role: "focus:winner" as const,
      detail: [
        outcome.officeKey,
        outcome.ordinal,
        outcome.party ?? "none",
        outcome.returningPersonId ? "returning" : "new",
        outcome.leavingPersonId ?? "",
        termStartOf(outcome.officeKey),
      ].join("|"),
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      STATE_LEGISLATURE_TURNOVER_PROFILE.id,
      `pack:${packId}`,
      ...termStarts.map((date) => `term-start:${date}`),
      ...campaignSeats,
    ],
    summary: `Voters chose ${outcomes.length + campaignSeats.length} members of the ${pack.displayName} in the ${electionDay.slice(0, 4)} general election: ${returning} return and ${outcomes.length - returning} seats get new members.${campaignSeats.length === 0 ? "" : campaignSeats.length === 1 ? " The race for one more seat is counted on its own." : ` The races for ${campaignSeats.length} more seats are counted on their own.`}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return next;
}

/** The party of a vacant seat's last holder, when the record names one. */
function lastPartyOfSeat(
  world: World,
  packId: string,
  seat: { officeKey: string; ordinal: number },
): string | null {
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const prefix = `${STATE_LEGISLATURE_OPENING_VERSION}:${seat.officeKey}:seat:${seat.ordinal}:tenure`;
  const holders = world.history.workRelationships
    .filter(
      (work) =>
        work.organizationId === bodyId && work.stableKey.startsWith(prefix),
    )
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return holders[0] ? partyKeyOf(world, holders[0].personId) : null;
}

/** The term begins: departing members stop serving and new members start. */
function seatStateLegislativeWinners(
  world: World,
  packId: string,
  results: HistoricalEvent,
  termStart: IsoDate,
): World {
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  let next = world;
  const seats: CreateWorkRelationshipInput[] = [];
  const affiliations: CreateOrganizationParticipationInput[] = [];
  const current = new Map(
    stateLegislativeSeats(world, packId).map((seat) => [
      `${seat.officeKey}|${seat.ordinal}`,
      seat,
    ]),
  );
  for (const participant of results.participants) {
    const [officeKey, ordinalText, party, kind, , startsOn] = (
      participant.detail ?? ""
    ).split("|");
    if (kind !== "new" || !officeKey || !ordinalText) continue;
    if (startsOn && startsOn !== termStart) continue;
    const ordinal = Number(ordinalText);
    const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(officeKey, ordinal)}:tenure:${termStart}`;
    if (next.history.workRelationships.some((w) => w.stableKey === tenureKey))
      continue;
    const seat = current.get(`${officeKey}|${ordinal}`);
    // The member leaving the seat stops serving the day the new term begins.
    const leaving = seat?.member ?? null;
    const leftBeforeTerm =
      leaving !== null &&
      next.history.personDeaths.some(
        (death) =>
          death.personId === leaving.personId &&
          death.diedAt <= addDays(termStart, -1),
      );
    // A campaign's winner leaves when their own term expires.
    if (seat?.member && !seat.member.byCampaign && !leftBeforeTerm) {
      const status = workStatusAt(next, seat.member.workRelationshipId);
      if (status && status.status !== "ended")
        next = recordWorkStatus(next, {
          stableKey: `${tenureKey}:predecessor-ended`,
          workRelationshipId: seat.member.workRelationshipId,
          effectiveAt: addDays(termStart, -1),
          status: "ended",
          reason: "Their term ended and someone else won the seat.",
          supersedesStatusId: status.id,
          provenance: { kind: "simulated-event", eventId: results.id },
        });
    }
    // A successor who died before taking the seat leaves it empty.
    if (
      next.history.personDeaths.some(
        (death) => death.personId === participant.personId,
      )
    )
      continue;
    seats.push({
      stableKey: tenureKey,
      personId: participant.personId,
      organizationId: bodyId,
      startedAt: termStart,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: results.id },
      initialRole: {
        title: seat?.title ?? "Member of the Legislature",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
    if (party && party !== "none")
      affiliations.push({
        stableKey: `${tenureKey}:affiliation`,
        personId: participant.personId,
        organizationId: livingWorldOrganizationId(
          next,
          LIVING_WORLD_KEYS.nationalParty(party),
        ),
        startedAt: termStart,
        initialStatus: "active",
        kind: PARTY_AFFILIATION_KIND,
        roleKind: "member:public-affiliation",
        context: "Public party affiliation",
        provenance: { kind: "simulated-event", eventId: results.id },
      });
  }
  // A seat a campaign decided: its winner holds it from the term start, and
  // the member there before them stops serving the day before.
  for (const tag of results.tags) {
    if (!tag.startsWith("campaign-seat:")) continue;
    const [officeKey, ordinalText, contestId, startsOn] = tag
      .slice("campaign-seat:".length)
      .split("|");
    if (!officeKey || !ordinalText || !contestId || startsOn !== termStart)
      continue;
    const ordinal = Number(ordinalText);
    const result = electionContestResult(next, contestId as EntityId);
    // No winner on record: the sitting member stays.
    if (!result) continue;
    const winner = result.winnerPersonId;
    const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(officeKey, ordinal)}:tenure:${termStart}`;
    for (const work of next.history.workRelationships) {
      if (work.organizationId !== bodyId) continue;
      const match = seatTenureMatch(work.stableKey);
      if (!match || match[1] !== officeKey || Number(match[2]) !== ordinal)
        continue;
      if (work.personId === winner || work.startedAt >= termStart) continue;
      if (
        next.history.personDeaths.some(
          (death) =>
            death.personId === work.personId &&
            death.diedAt <= addDays(termStart, -1),
        )
      )
        continue;
      const status = workStatusAt(next, work.id);
      if (!status || status.status === "ended") continue;
      next = recordWorkStatus(next, {
        stableKey: `${tenureKey}:predecessor-ended`,
        workRelationshipId: work.id,
        effectiveAt: addDays(termStart, -1),
        status: "ended",
        reason: "Their term ended and someone else won the seat.",
        supersedesStatusId: status.id,
        provenance: { kind: "simulated-event", eventId: results.id },
      });
    }
    // The campaign seats its own winner where the term's law is on record;
    // elsewhere the winner takes the seat here.
    const seatedByCampaign = next.history.workRelationships.some(
      (work) =>
        work.organizationId === bodyId &&
        work.personId === winner &&
        work.kind === "employment:legislative-member" &&
        (work.startedAt === termStart ||
          (seatTenureMatch(work.stableKey) !== null &&
            workStatusAt(next, work.id)?.status === "active")),
    );
    if (
      seatedByCampaign ||
      next.history.workRelationships.some((w) => w.stableKey === tenureKey) ||
      next.history.personDeaths.some((death) => death.personId === winner)
    )
      continue;
    seats.push({
      stableKey: tenureKey,
      personId: winner,
      organizationId: bodyId,
      startedAt: termStart,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: results.id },
      initialRole: {
        title:
          current.get(`${officeKey}|${ordinal}`)?.title ??
          "Member of the Legislature",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
  }
  if (seats.length) next = createWorkRelationships(next, seats);
  if (affiliations.length)
    next = createOrganizationParticipations(next, affiliations);
  return next;
}

/**
 * When an empty seat in this chamber is next filled: by a member already
 * elected who has not yet taken office, or at the next regular election.
 * Reads only; null where the pack is unknown.
 */
export function nextStateSeatFilling(
  world: World,
  packId: string,
  officeKey: string,
): {
  readonly electedOn: IsoDate;
  readonly takesOfficeOn: IsoDate | null;
} | null {
  const pack = candidacyPackById(packId);
  if (!pack) return null;
  const today = world.currentDate;
  const rule = stateLegislativeElectionRule(
    pack.jurisdictionKey.replace(/^US-/, ""),
  );
  for (
    let year = Number(today.slice(0, 4)) - 1;
    year < Number(today.slice(0, 4)) + 8;
    year += 1
  ) {
    if (!isElectionYear(rule, year)) continue;
    const electionDay = generalElectionDay(rule, year);
    const termStart =
      legislativeTermDates(officeKey, electionDay)?.startsAt ??
      makeIsoDate(`${year + 1}-01-01`);
    const held = world.history.events.some(
      (event) => event.stableKey === resultsKey(packId, electionDay),
    );
    if (held && electionDay <= today && today < termStart)
      return { electedOn: electionDay, takesOfficeOn: termStart };
    if (electionDay > today)
      return { electedOn: electionDay, takesOfficeOn: null };
  }
  return null;
}

/**
 * Called whenever the canonical clock moves forward a day or more: holds each
 * seated legislature's regular election and seats its winners when the term
 * begins. Only dates actually crossed act.
 */
export function applyStateLegislatureTurnover(
  before: IsoDate,
  world: World,
): World {
  const after = world.currentDate;
  if (after <= before) return world;
  // Cheap window test before any history scan: a regular legislative
  // election falls between November 2 and 8, and a term begins on January 1
  // (legislativeTermDates). A move that crosses neither does nothing.
  let crossesAny = false;
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4)) && !crossesAny;
    year += 1
  ) {
    const january = `${year}-01-01`;
    crossesAny =
      (before < january && january <= after) ||
      (before < `${year}-11-08` && `${year}-11-02` <= after);
  }
  if (!crossesAny) return world;
  const packs = seatedPacks(world);
  if (packs.length === 0) return world;
  let next = world;
  for (const packId of packs) {
    const pack = candidacyPackById(packId);
    if (!pack) continue;
    const usps = pack.jurisdictionKey.replace(/^US-/, "");
    const rule = stateLegislativeElectionRule(usps);
    const firstYear = Number(before.slice(0, 4)) - 4;
    const lastYear = Number(after.slice(0, 4));
    for (let year = firstYear; year <= lastYear; year += 1) {
      if (!isElectionYear(rule, year)) continue;
      const electionDay = generalElectionDay(rule, year);
      if (before < electionDay && electionDay <= after)
        next = holdStateLegislativeElection(next, packId, electionDay);
      const results = next.history.events.find(
        (event) => event.stableKey === resultsKey(packId, electionDay),
      );
      if (!results) continue;
      for (const tag of results.tags) {
        if (!tag.startsWith("term-start:")) continue;
        const termStart = tag.slice("term-start:".length);
        if (before < termStart && termStart <= after)
          next = seatStateLegislativeWinners(
            next,
            packId,
            results,
            makeIsoDate(termStart),
          );
      }
    }
  }
  return next;
}
