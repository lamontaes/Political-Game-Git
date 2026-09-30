import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { decideAnotherTerm } from "../careers/another-term";
import { councilTermLimitBar } from "./local-council-term-limits";
import { townSupportFromViews } from "../official-view-reads";
import { townSupportFromFavors } from "../patronage/following";
import { campaigns } from "../campaign-queries";
import {
  cancelElectionContest,
  electionContestById,
  electionContestResult,
  electionContestStatus,
  resolveElectionContest,
  scheduleElectionContest,
} from "../election-contests";
import {
  cancelFutureDueItem,
  scheduleFutureDueItem,
} from "../future-transitions";
import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../life";
import { organizationParticipationStateAt } from "../life-queries";
import {
  resolveMunicipalBallotRule,
  resolveMunicipalElectionTiming,
  tabulateBallot,
} from "../municipal-ballot-rules";
import type { MunicipalElectionTiming } from "../municipal-election-rules";
import { localChiefExecutiveRules } from "../nationwide-world/local-chief-executive-rules";
import {
  localChiefExecutiveIdentity,
  localGoverningBodyIdentity,
  localGoverningBodyIdentityForOfficeKey,
} from "../nationwide-world/local-governing-body-candidacy-packs";
import type { LocalGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import { localGoverningBodyRules } from "../nationwide-world/local-governing-body-rules";
import { homeLocalGovernmentUnits } from "../nationwide-world/local-governments";
import {
  nextTownElection,
  novemberGeneralElectionDay,
} from "../nationwide-world/town-election-calendar";
import {
  appointmentCircle,
  chooseAppointee,
  recordAppointmentFavor,
  recordPassedOver,
} from "../patronage/appointments";
import { personName } from "../people";

function nameOf(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? personName(person) : "A resident";
}
import { SeededRng } from "../rng";
import type {
  CandidateTally,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { recordWorldEvent } from "../world";
import {
  drawTownResident,
  localGovernmentSeated,
  organizationIdFor,
  sittingLocalOfficers,
} from "./local-government-seats";
import type { SeatedLocalOffice } from "./local-government-seats";
import { peopleKnownTo } from "./official-views";
import { playerTown, townRoster } from "./town-residents";
import {
  councilWardPlan,
  homePosition,
  isWardSeat,
  redrawTownWards,
  seatWard,
  townWardMap,
  wardAt,
  wardDrawerInForce,
  wardOfPerson,
  wardRange,
} from "./town-wards";

/**
 * The player's town government changes hands on its own.
 *
 * The council seated at the opening (`local-government-seats.ts`) is elected
 * again on the town's calendar. Before each election the field closes: a
 * sitting member runs again or retires, and neighbors file against them or for
 * an open seat. A field of more than two meets in a primary first, and the top
 * two go on to the general election, except where the state's counting rule
 * lets a candidate who clears its majority threshold win in the primary. The
 * winner takes the seat, so an incumbent can lose it. Between elections a
 * member may resign, and the council fills the seat by appointment.
 *
 * Every candidate is a resident of the town, drawn from the same roster its
 * employers and congregations are staffed from, and every race is an election
 * contest with a recorded field and count, resolved through the shared
 * contest writer.
 *
 * Read from the game's research: the town's seat count and term
 * (`localGoverningBodyRules`), whether the mayor is elected and for how long
 * (`localChiefExecutiveRules`), when the town votes (`nextTownElection` and
 * `resolveMunicipalElectionTiming`) and how the vote is counted
 * (`resolveMunicipalBallotRule`), each with its own basis label.
 *
 * PLACEHOLDERS, pending `local-election-behavior`:
 * - Where the state's law names a season but not a day, the election is held
 *   on the first Tuesday of that month; where nothing is read, on the
 *   November general election day in odd years. Both are labeled
 *   `game-default` on the contest.
 * - Seats are staggered so that about the same share comes up each time, in
 *   seat order. No town's own stagger has been read.
 * - A primary is held `primaryLeadDays` before the general election, and the
 *   field closes `FILING_LEAD_DAYS` before the first vote.
 * - Who runs, who retires, who resigns and how many people vote are drawn from
 *   the shares in `LOCAL_ELECTIONS_PROFILE`, and the count gives a sitting
 *   member a fixed edge. None of these is a measured rate.
 * - A winner takes the seat on the day of the count, and an appointee on the
 *   day of the resignation.
 */

export const LOCAL_ELECTIONS_VERSION = "local-elections/v1" as const;
const V = LOCAL_ELECTIONS_VERSION;

export const LOCAL_ELECTION_FILING = "civic:local-election-filing" as const;
export const LOCAL_ELECTION_COUNT = "civic:local-election-count" as const;
export const LOCAL_GOVERNMENT_YEAR = "civic:local-government-year" as const;

export const LOCAL_ELECTIONS_PROFILE = {
  id: "ocd-local-elections-placeholder/v1",
  filingLeadDays: 28,
  primaryLeadDays: 56,
  minimumCandidateAge: 21,
  /** How many neighbors file against a sitting member (index = count). */
  challengersAgainstIncumbent: [0.2, 0.45, 0.2, 0.1, 0.05],
  /** How many file for an open seat (index = count). */
  candidatesForOpenSeat: [0, 0.15, 0.45, 0.25, 0.15],
  /** A sitting member's share of support is multiplied by this. */
  incumbentEdge: 1.35,
  /** The share of grown residents who vote in a town election. */
  turnout: { low: 0.12, high: 0.32 },
  /** Grown residents per resident, for the count. */
  adultShare: 0.75,
} as const;

const P = LOCAL_ELECTIONS_PROFILE;

type ElectionDayBasis =
  "state-law-unverified" | "local-choice-drawn" | "game-default";

export interface TownElectionDay {
  readonly electionDate: IsoDate;
  /** Years between the town's regular elections. */
  readonly cadenceYears: number;
  readonly timing: MunicipalElectionTiming | null;
  readonly basis: ElectionDayBasis;
}

interface SeasonRule {
  readonly month: number;
  /** Which years: every, even, odd, or every fourth. */
  readonly years: "every" | "even" | "odd" | "fourth";
}

const SEASONS: Partial<Record<MunicipalElectionTiming, SeasonRule>> = {
  "even-year-june-consolidated": { month: 6, years: "even" },
  "even-year-august-consolidated": { month: 8, years: "even" },
  "even-year-may-consolidated": { month: 5, years: "even" },
  "odd-year-autumn": { month: 11, years: "odd" },
  "odd-year-spring": { month: 4, years: "odd" },
  "spring-annual": { month: 4, years: "every" },
  "spring-even-year": { month: 4, years: "even" },
  "annual-spring-april": { month: 4, years: "every" },
  "annual-spring-may": { month: 5, years: "every" },
  "annual-autumn-october": { month: 10, years: "every" },
  "autumn-gubernatorial": { month: 11, years: "even" },
  "town-meeting-day-march": { month: 3, years: "every" },
  "town-meeting-day-spring": { month: 3, years: "every" },
  "quadrennial-summer-june": { month: 6, years: "fourth" },
  "quadrennial-late-summer-august": { month: 8, years: "fourth" },
};

const CADENCE: Record<SeasonRule["years"], number> = {
  every: 1,
  even: 2,
  odd: 2,
  fourth: 4,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function firstTuesday(year: number, month: number): IsoDate {
  if (month === 11) return novemberGeneralElectionDay(year);
  for (let day = 1; day <= 7; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCDay() === 2)
      return makeIsoDate(`${year}-${pad(month)}-${pad(day)}`);
  }
  throw new Error(`No Tuesday found in ${year}-${month}.`);
}

function yearFits(year: number, years: SeasonRule["years"]): boolean {
  if (years === "every") return true;
  if (years === "even") return year % 2 === 0;
  if (years === "odd") return year % 2 === 1;
  return year % 4 === 0;
}

/**
 * The town's next regular election whose first vote (a primary, when there is
 * one) is at least the filing lead after `onDate`.
 */
export function nextTownElectionDay(
  unit: GovernmentUnitIdentity,
  onDate: IsoDate,
): TownElectionDay {
  const lead = P.filingLeadDays + P.primaryLeadDays;
  const place = unit.placeGeoid ?? unit.publisherId;
  const read = nextTownElection(
    unit.stateUsps,
    place,
    addDays(onDate, P.primaryLeadDays),
  );
  if (read)
    return {
      electionDate: read.electionDate,
      cadenceYears: 2,
      timing: read.timing,
      basis: read.basis,
    };
  const timing = resolveMunicipalElectionTiming(unit.stateUsps, place);
  const season = timing ? SEASONS[timing.timing] : undefined;
  const rule = season ?? { month: 11, years: "odd" as const };
  const earliest = addDays(onDate, lead);
  for (let year = Number(onDate.slice(0, 4)); ; year += 1) {
    if (!yearFits(year, rule.years)) continue;
    const day = firstTuesday(year, rule.month);
    if (day >= earliest)
      return {
        electionDate: day,
        cadenceYears: CADENCE[rule.years],
        timing: timing?.timing ?? null,
        basis: "game-default",
      };
  }
}

/** The seat number in a label such as "Council member, seat 3", or null. */
function seatNumber(label: string): number | null {
  const match = /seat (\d+)$/.exec(label);
  return match ? Number(match[1]) : null;
}

/** Whether seat `n` (0 for the mayor) is on this election's ballot. */
export function seatIsUp(
  n: number,
  electionYear: number,
  cadenceYears: number,
  termYears: number,
): boolean {
  const cycles = Math.max(1, Math.round(termYears / cadenceYears));
  const cycle = Math.floor(electionYear / cadenceYears);
  return (cycle + n) % cycles === 0;
}

/**
 * The seat a campaign for this town's council or mayor runs for in its
 * election year: the mayor's office, or a member seat on that year's ballot.
 * On a council elected by ward, a candidate runs for their own ward's seat,
 * or else an at-large seat (`town-wards.ts`); otherwise, and when the
 * candidate is not given, the lowest-numbered seat up. The town's own
 * elections leave it off their ballot, and the campaign's winner takes it, so
 * the two never seat two people for one seat. A year with no member seat up
 * has none.
 */
export function localCampaignSeat(
  unit: GovernmentUnitIdentity,
  mayor: boolean,
  electionDate: IsoDate,
  candidate: {
    readonly world: World;
    readonly town: EntityId;
    readonly personId: EntityId;
  } | null = null,
): number | null {
  if (mayor) return 0;
  const rules = localGoverningBodyRules(unit);
  const seatCount = rules?.seats?.value ?? 0;
  const termYears = rules?.termYears?.value ?? 4;
  const year = Number(electionDate.slice(0, 4));
  const { cadenceYears } = nextTownElectionDay(unit, addDays(electionDate, -1));
  const up: number[] = [];
  for (let n = 1; n <= seatCount; n += 1)
    if (seatIsUp(n, year, cadenceYears, termYears)) up.push(n);
  const plan = councilWardPlan(unit);
  const map = candidate ? townWardMap(candidate.world, unit) : null;
  const home =
    candidate && map
      ? homePosition(candidate.world, candidate.town, candidate.personId)
      : null;
  if (plan && map && home !== null) {
    const ward = wardAt(map, home);
    const own = up.find(
      (n) => isWardSeat(plan, n) && seatWard(map, n) === ward,
    );
    if (own !== undefined) return own;
    const atLarge = up.find((n) => !isWardSeat(plan, n));
    if (atLarge !== undefined) return atLarge;
  }
  return up[0] ?? null;
}

/** The seats campaigns (a player's, won, lost or running) hold in this town's `year`. */
function campaignSeats(
  world: World,
  unit: GovernmentUnitIdentity,
  year: number,
): ReadonlySet<number> {
  const seats = new Set<number>();
  for (const campaign of campaigns(world)) {
    const contest = electionContestById(world, campaign.contestId);
    if (!contest || Number(contest.electionDate.slice(0, 4)) !== year) continue;
    const office = localGoverningBodyIdentityForOfficeKey(
      contest.office.officeKey,
    );
    if (office?.unit.id !== unit.id) continue;
    const seat = localCampaignSeat(
      unit,
      office.seat === "chief-executive",
      contest.electionDate,
      {
        world,
        town: campaign.jurisdictionId,
        personId: campaign.candidatePersonId,
      },
    );
    if (seat !== null) seats.add(seat);
  }
  return seats;
}

/**
 * A campaign filed after the town's field closed runs for a seat the town
 * already put on its ballot. That seat is decided in the campaign's own
 * election, so the town's pending race for it is called off: its contest and
 * its count. Called when a campaign is filed, never from a due item.
 */
export function withdrawTownRaceForCampaign(
  world: World,
  contestId: EntityId,
): World {
  const contest = electionContestById(world, contestId);
  if (!contest) return world;
  const office = localGoverningBodyIdentityForOfficeKey(
    contest.office.officeKey,
  );
  if (!office) return world;
  const { unit } = office;
  const campaign = campaigns(world).find((row) => row.contestId === contestId);
  const seat = localCampaignSeat(
    unit,
    office.seat === "chief-executive",
    contest.electionDate,
    campaign
      ? {
          world,
          town: campaign.jurisdictionId,
          personId: campaign.candidatePersonId,
        }
      : null,
  );
  if (seat === null) return world;
  const year = contest.electionDate.slice(0, 4);
  const prefix = `${V}:${unit.id}:${year}-`;
  const suffix = `:seat-${seat}`;
  let next = world;
  for (const row of world.history.electionContests ?? []) {
    const race = row.stableKey.replace(/:(primary|general)$/, "");
    if (!race.startsWith(prefix) || !race.endsWith(suffix)) continue;
    if (electionContestStatus(next, row.id) !== "pending") continue;
    const why = `${seatPhrase(officeFor(unit, seat) ?? office, seat)} is decided in a campaign's own election.`;
    next = cancelElectionContest(next, {
      stableKey: `${row.stableKey}:called-off`,
      contestId: row.id,
      effectiveAt: next.currentDate,
      reason: why,
    });
    const count = next.history.futureDueItems.find(
      (item) =>
        item.stableKey === `${row.stableKey}:count` &&
        !next.history.futureDueItemStates.some(
          (state) =>
            state.dueItemId === item.id && state.status !== "scheduled",
        ),
    );
    if (count)
      next = cancelFutureDueItem(next, {
        stableKey: `${row.stableKey}:count:called-off`,
        dueItemId: count.id,
        effectiveAt: next.currentDate,
        reasonKey: "election:contest-cancelled",
        context: why,
      });
  }
  return next;
}

/** Who holds `seat` (0 for the mayor) on the town's government now. */
export function localSeatHolder(
  world: World,
  unit: GovernmentUnitIdentity,
  seat: number,
): SeatedLocalOffice | null {
  return holderOf(sittingLocalOfficers(world, unit), seat);
}

function pick(rng: SeededRng, shares: readonly number[]): number {
  let point = rng.next() * shares.reduce((sum, share) => sum + share, 0);
  for (let index = 0; index < shares.length; index += 1) {
    point -= shares[index]!;
    if (point < 0) return index;
  }
  return shares.length - 1;
}

function alive(world: World, personId: EntityId): boolean {
  return (
    !!world.people[personId] &&
    isPersonAliveAt(world, personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  );
}

function done(world: World, context: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function event(
  world: World,
  input: {
    readonly stableKey: string;
    readonly type: `${string}.${string}`;
    readonly town: EntityId;
    readonly label: string;
    readonly involved: readonly EntityId[];
    readonly tags: readonly string[];
    readonly summary: string;
  },
): World {
  if (world.history.events.some((row) => row.stableKey === input.stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.town,
    involvedEntityIds: [...input.involved],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V, ...input.tags],
    summary: input.summary,
    context: {
      location: {
        jurisdictionId: input.town,
        label: input.label,
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

/* -------------------------------------------------------------------------- */
/* Keys                                                                        */
/* -------------------------------------------------------------------------- */

function filingKey(unitId: string, electionDate: IsoDate): string {
  return `${V}:${unitId}:${electionDate}:filing`;
}

function raceKey(unitId: string, electionDate: IsoDate, seat: number): string {
  return `${V}:${unitId}:${electionDate}:seat-${seat}`;
}

function yearKey(unitId: string, year: number): string {
  return `${V}:${unitId}:year:${year}`;
}

interface DueParts {
  readonly unit: GovernmentUnitIdentity;
  readonly electionDate: IsoDate;
  readonly seat: number;
  readonly stage: "primary" | "general";
}

function unitFromKey(
  key: string,
): { unit: GovernmentUnitIdentity; rest: string } | null {
  const match = new RegExp(
    `^${V.replace("/", "\\/")}:(gus2025:[^:]+):(.+)$`,
  ).exec(key);
  if (!match) return null;
  const unit = governmentUnit(match[1]!);
  return unit ? { unit, rest: match[2]! } : null;
}

function countParts(key: string): DueParts | null {
  const found = unitFromKey(key);
  if (!found) return null;
  const match = /^(\d{4}-\d{2}-\d{2}):seat-(\d+):(primary|general):count$/.exec(
    found.rest,
  );
  if (!match) return null;
  return {
    unit: found.unit,
    electionDate: makeIsoDate(match[1]!),
    seat: Number(match[2]),
    stage: match[3] as DueParts["stage"],
  };
}

/* -------------------------------------------------------------------------- */
/* The town and its offices                                                    */
/* -------------------------------------------------------------------------- */

function officeFor(
  unit: GovernmentUnitIdentity,
  seat: number,
): LocalGoverningBodyIdentity | null {
  return seat === 0
    ? localChiefExecutiveIdentity(unit)
    : localGoverningBodyIdentity(unit);
}

function seatLabelFor(
  office: LocalGoverningBodyIdentity,
  seat: number,
): string {
  return seat === 0
    ? office.officeTitle
    : `${office.officeTitle}, seat ${seat}`;
}

/**
 * Each sitting officer's seat: 0 for the mayor, otherwise the number in the
 * seat's label. A member seated without one (a player who won a campaign)
 * holds the lowest number nobody else holds.
 */
function seatsOf(
  officers: readonly SeatedLocalOffice[],
): ReadonlyMap<number, SeatedLocalOffice> {
  const seats = new Map<number, SeatedLocalOffice>();
  const unnumbered: SeatedLocalOffice[] = [];
  for (const row of officers) {
    if (row.mayor) {
      if (!seats.has(0)) seats.set(0, row);
      continue;
    }
    const n = seatNumber(row.seatLabel);
    if (n !== null && !seats.has(n)) seats.set(n, row);
    else unnumbered.push(row);
  }
  let n = 1;
  for (const row of unnumbered) {
    while (seats.has(n)) n += 1;
    seats.set(n, row);
  }
  return seats;
}

/** The seat in a sentence: "seat 3 on the Ely City Council", "the mayor's office". */
function seatPhrase(office: LocalGoverningBodyIdentity, seat: number): string {
  return seat === 0
    ? `the ${office.officeTitle.toLowerCase()}'s office`
    : `seat ${seat} on the ${office.bodyName}`;
}

function holderOf(
  officers: readonly SeatedLocalOffice[],
  seat: number,
): SeatedLocalOffice | null {
  return seatsOf(officers).get(seat) ?? null;
}

/** Everyone the town's elections must not draw: officers and the player's household. */
function excludedFrom(
  world: World,
  unit: GovernmentUnitIdentity,
  playerIds: readonly EntityId[],
) {
  return new Set<EntityId>([
    ...playerIds,
    ...sittingLocalOfficers(world, unit).map((row) => row.personId),
  ]);
}

/** The player's household, whom the town's elections never draw. */
function playerHousehold(
  world: World,
  player: EntityId | undefined,
): readonly EntityId[] {
  if (!player || !world.people[player]) return [];
  const households = new Set(
    world.history.householdMemberships
      .filter((row) => row.personId === player)
      .map((row) => row.householdId),
  );
  return [
    player,
    ...world.history.householdMemberships
      .filter((row) => households.has(row.householdId))
      .map((row) => row.personId),
  ];
}

/* -------------------------------------------------------------------------- */
/* Seats: taking office and leaving it                                         */
/* -------------------------------------------------------------------------- */

function endSeat(
  world: World,
  holder: SeatedLocalOffice,
  why: string,
  key: string,
): World {
  if (!holder.participationId) return world;
  const state = organizationParticipationStateAt(world, holder.participationId);
  if (!state || state.status === "ended") return world;
  const participation = world.history.organizationParticipations.find(
    (row) => row.id === holder.participationId,
  )!;
  return recordOrganizationParticipationState(world, {
    stableKey: `${participation.stableKey}:state:ended:${key}`,
    participationId: participation.id,
    effectiveAt:
      world.currentDate > state.effectiveAt
        ? world.currentDate
        : state.effectiveAt,
    status: "ended",
    roleKind: state.roleKind,
    context: why,
    provenance: { kind: "generated", generatorKey: V },
    supersedesStateId: state.id,
  });
}

function takeSeat(
  world: World,
  unit: GovernmentUnitIdentity,
  personId: EntityId,
  seat: number,
  label: string,
  key: string,
): World {
  const organizationId = organizationIdFor(world, unit);
  if (!organizationId) return world;
  const stableKey = `${V}:seat:${unit.id}:${personId}:${key}`;
  if (
    world.history.organizationParticipations.some(
      (row) => row.stableKey === stableKey,
    )
  )
    return world;
  return createOrganizationParticipation(world, {
    stableKey,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "leadership:municipal-office",
    roleKind: seat === 0 ? "leader:municipal-mayor" : "leader:municipal-member",
    context: label,
    provenance: { kind: "generated", generatorKey: V },
  });
}

/* -------------------------------------------------------------------------- */
/* The calendar                                                                */
/* -------------------------------------------------------------------------- */

function scheduleFiling(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  player: EntityId,
  onDate: IsoDate = world.currentDate,
): World {
  const day = nextTownElectionDay(unit, onDate);
  const key = filingKey(unit.id, day.electionDate);
  if (world.history.futureDueItems.some((row) => row.stableKey === key))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey: key,
    dueAt: addDays(day.electionDate, -(P.filingLeadDays + P.primaryLeadDays)),
    transitionKey: LOCAL_ELECTION_FILING,
    entityIds: [town, player],
    jurisdictionId: town,
    provenance: {
      kind: "authored",
      note: `${P.id}: the field for ${unit.name}'s ${day.electionDate} election closes (${day.basis}).`,
    },
  });
}

function scheduleYear(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  player: EntityId,
): World {
  const year = Number(world.currentDate.slice(0, 4)) + 1;
  const key = yearKey(unit.id, year);
  if (world.history.futureDueItems.some((row) => row.stableKey === key))
    return world;
  const rng = new SeededRng(world.seed).fork(key);
  const dueAt = makeIsoDate(
    `${year}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
  );
  return scheduleFutureDueItem(world, {
    stableKey: key,
    dueAt,
    transitionKey: LOCAL_GOVERNMENT_YEAR,
    entityIds: [town, player],
    jurisdictionId: town,
    provenance: {
      kind: "authored",
      note: `${P.id}: a year in ${unit.name}'s government, when a member may resign.`,
    },
  });
}

/**
 * Put the player's town elections on the calendar, once the town government
 * is seated. Safe to call again: each item is keyed by its date.
 */
export function ensureLocalElectionCalendar(
  world: World,
  playerPersonId: EntityId,
): World {
  const town = playerTown(world, playerPersonId);
  if (!town) return world;
  let next = world;
  for (const unit of homeLocalGovernmentUnits(world, playerPersonId)
    .municipal) {
    if (!localGovernmentSeated(next, unit.id)) continue;
    next = scheduleFiling(next, unit, town, playerPersonId);
    next = scheduleYear(next, unit, town, playerPersonId);
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Filing: who runs                                                            */
/* -------------------------------------------------------------------------- */

function scheduleRace(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly town: EntityId;
    readonly office: LocalGoverningBodyIdentity;
    readonly seat: number;
    readonly generalDate: IsoDate;
    readonly stage: "primary" | "general";
    readonly voteDate: IsoDate;
    readonly candidates: readonly EntityId[];
    readonly basis: ElectionDayBasis;
  },
): World {
  const race = raceKey(input.unit.id, input.generalDate, input.seat);
  const stableKey = `${race}:${input.stage}`;
  // The count is scheduled first so it runs before the shared contest item
  // due the same day, which then finds the contest already decided.
  let next = scheduleFutureDueItem(world, {
    stableKey: `${stableKey}:count`,
    dueAt: input.voteDate,
    transitionKey: LOCAL_ELECTION_COUNT,
    entityIds: [input.town],
    jurisdictionId: input.town,
    provenance: {
      kind: "authored",
      note: `${P.id}: the count for ${stableKey}.`,
    },
  });
  const label = seatLabelFor(input.office, input.seat);
  next = scheduleElectionContest(next, {
    stableKey,
    jurisdictionId: input.town,
    office: {
      officeKey: input.office.officeKey,
      title:
        input.stage === "primary"
          ? `${input.office.bodyName}, ${label} (primary)`
          : `${input.office.bodyName}, ${label}`,
      seatKey: input.seat === 0 ? "chief-executive" : `seat-${input.seat}`,
      occupationClassification: "service:municipal-office",
    },
    electionDate: input.voteDate,
    candidatePersonIds: input.candidates,
    provenance: {
      method: "simulated",
      sourceEntityIds: [...input.candidates].sort(),
      note: `${P.id}: ${input.stage} for ${label}; election day basis ${input.basis}.`,
    },
  });
  return next;
}

export function localElectionFilingHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = unitFromKey(due.stableKey);
  const town = due.jurisdictionId;
  if (!found || !town)
    return done(world, "No town government matches this filing.");
  const { unit } = found;
  const match = /^(\d{4}-\d{2}-\d{2}):filing$/.exec(found.rest);
  if (!match) return done(world, "No election matches this filing.");
  const generalDate = makeIsoDate(match[1]!);
  const day = nextTownElectionDay(unit, addDays(world.currentDate, -1));
  const rules = localGoverningBodyRules(unit);
  const chief = localChiefExecutiveRules(unit);
  const year = Number(generalDate.slice(0, 4));
  const seatsUp: number[] = [];
  if (
    chief?.directlyElected.value &&
    seatIsUp(0, year, day.cadenceYears, chief.termYears.value)
  )
    seatsUp.push(0);
  const seatCount = rules?.seats?.value ?? 0;
  const termYears = rules?.termYears?.value ?? 4;
  for (let n = 1; n <= seatCount; n += 1)
    if (seatIsUp(n, year, day.cadenceYears, termYears)) seatsUp.push(n);

  let next = world;
  const player = due.entityIds[1];
  const household = playerHousehold(world, player);
  const excluded = excludedFrom(next, unit, household);
  const taken = new Set<string>();
  const primaryDate = addDays(generalDate, -P.primaryLeadDays);
  let races = 0;
  let primaries = 0;
  const campaigned = campaignSeats(next, unit, year);
  const plan = councilWardPlan(unit);
  const wardMap = townWardMap(next, unit);
  for (const seat of seatsUp) {
    const office = officeFor(unit, seat);
    if (!office || campaigned.has(seat)) continue;
    const race = raceKey(unit.id, generalDate, seat);
    if (
      (next.history.electionContests ?? []).some((row) =>
        row.stableKey.startsWith(race),
      )
    )
      continue;
    const rng = new SeededRng(next.seed).fork(race);
    const holder = holderOf(sittingLocalOfficers(next, unit), seat);
    const phrase = seatPhrase(office, seat);
    const candidates: EntityId[] = [];
    let incumbentRuns = false;
    // A ward seat is filled from its own ward: its holder may run again only
    // while they live there, and its field is drawn from its residents.
    const ward =
      wardMap && isWardSeat(plan, seat) ? seatWard(wardMap, seat) : null;
    const holderWard =
      ward !== null && holder
        ? wardOfPerson(next, unit, town, holder.personId)
        : null;
    const drawnOut =
      ward !== null && holderWard !== null && holderWard !== ward;
    if (drawnOut && holder && alive(next, holder.personId)) {
      next = event(next, {
        stableKey: `${race}:drawn-out`,
        type: "local.officeholder-retired",
        town,
        label: office.governmentName,
        involved: [holder.personId],
        tags: [`unit:${unit.id}`, `seat:${seat}`, "barred:ward"],
        summary: `${nameOf(next, holder.personId)} may not run again for ${phrase}: their home is in Ward ${holderWard} under the map ${wardMap!.drawnBy === "commission" ? "an independent commission" : "the council"} drew, and the seat represents Ward ${ward}.`,
      });
    }
    if (holder && alive(next, holder.personId) && !drawnOut) {
      const seatTerm =
        seat === 0 ? (chief?.termYears.value ?? termYears) : termYears;
      // A council seat under a term-limit ordinance: the law decides before
      // the member does.
      const organizationId = seat === 0 ? null : organizationIdFor(next, unit);
      const barred = organizationId
        ? councilTermLimitBar(next, {
            town,
            organizationId,
            personId: holder.personId,
            termYears: seatTerm,
            termStartsAt: generalDate,
          })
        : null;
      if (barred) {
        next = event(next, {
          stableKey: `${race}:term-limited`,
          type: "local.officeholder-retired",
          town,
          label: office.governmentName,
          involved: [holder.personId],
          tags: [`unit:${unit.id}`, `seat:${seat}`, "barred:term-limit"],
          summary: `${nameOf(next, holder.personId)} may not run again for ${phrase}: ${barred}`,
        });
      }
      const decided = barred
        ? { world: next, seeks: false }
        : decideAnotherTerm(next, {
            personId: holder.personId,
            stableKey: `${race}:another-term`,
            subjectKey: race,
            decisionType: "election.consider-another-local-term",
            onDate: next.currentDate,
            termEnds: addDays(generalDate, Math.round(seatTerm * 365.25)),
            serving: [
              {
                stableKey: `${race}:another-term:serving`,
                optionKey: "seek",
                sourceType: "context:current-office",
                direction: "supports",
                importance: "moderate",
                confidence: "high",
                explanation: `They hold ${phrase}.`,
                sourceRefs: [],
              },
            ],
          });
      next = decided.world;
      // The person being played decides their own candidacy by filing.
      const played =
        next.control.kind === "person" &&
        next.control.personId === holder.personId;
      const retires = barred !== null || (!played && !decided.seeks);
      if (retires) {
        if (!barred)
          next = event(next, {
            stableKey: `${race}:retired`,
            type: "local.officeholder-retired",
            town,
            label: office.governmentName,
            involved: [holder.personId],
            tags: [`unit:${unit.id}`, `seat:${seat}`],
            summary: `${nameOf(next, holder.personId)} will not run again for ${phrase}.`,
          });
      } else {
        candidates.push(holder.personId);
        incumbentRuns = true;
      }
    }
    const filers = incumbentRuns
      ? pick(rng, P.challengersAgainstIncumbent)
      : Math.max(1, pick(rng, P.candidatesForOpenSeat));
    for (let slot = 0; slot < filers; slot += 1) {
      const drawn = drawTownResident(
        next,
        town,
        `local-election:${race}`,
        slot,
        P.minimumCandidateAge,
        excluded,
        taken,
        ward !== null ? wardRange(wardMap!, ward) : null,
      );
      next = drawn.world;
      if (!drawn.personId) break;
      excluded.add(drawn.personId);
      candidates.push(drawn.personId);
    }
    if (candidates.length === 0) continue;
    const primary = candidates.length > 2;
    next = scheduleRace(next, {
      unit,
      town,
      office,
      seat,
      generalDate,
      stage: primary ? "primary" : "general",
      voteDate: primary ? primaryDate : generalDate,
      candidates,
      basis: day.basis,
    });
    races += 1;
    if (primary) primaries += 1;
  }
  // The next field closes after this election.
  if (player)
    next = scheduleFiling(next, unit, town, player, addDays(generalDate, 1));
  return done(
    next,
    `The field closed for ${races} ${races === 1 ? "race" : "races"} in ${unit.name}, ${primaries} with a primary.`,
  );
}

/* -------------------------------------------------------------------------- */
/* The count                                                                   */
/* -------------------------------------------------------------------------- */

function countVotes(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  seat: number,
  contestKey: string,
  candidates: readonly EntityId[],
  incumbent: EntityId | null,
  electionDate: IsoDate,
): CandidateTally[] {
  const rng = new SeededRng(world.seed).fork(`${contestKey}:count`);
  // A ward seat's voters are its ward's residents (`town-wards.ts`).
  const plan = councilWardPlan(unit);
  const map = townWardMap(world, unit);
  const roster = townRoster(town, world);
  const [from, to] =
    map && isWardSeat(plan, seat)
      ? wardRange(map, seatWard(map, seat))
      : [0, roster.households];
  const share = roster.households > 0 ? (to - from) / roster.households : 1;
  const adults = roster.population * P.adultShare;
  const turnout = P.turnout.low + rng.next() * (P.turnout.high - P.turnout.low);
  const ballots = Math.max(
    candidates.length * 20,
    Math.round(adults * turnout * share),
  );
  const support = candidates.map((id) => {
    const base = 0.6 + rng.next() * 0.8;
    // Spec 5: what residents think of what the candidate did in office.
    const views = townSupportFromViews(world, town, id, electionDate);
    // What the households who owe the candidate a job or a seat do with it.
    const debts = townSupportFromFavors(world, town, id, electionDate);
    return (id === incumbent ? base * P.incumbentEdge : base) * views * debts;
  });
  const total = support.reduce((sum, value) => sum + value, 0);
  const votes = support.map((value) =>
    Math.max(1, Math.round((ballots * value) / total)),
  );
  // No two candidates finish level: how a real tie is broken is not modeled.
  for (let i = 0; i < votes.length; i += 1)
    for (let j = 0; j < i; j += 1) if (votes[j] === votes[i]) votes[i]! += 1;
  const counted = votes.reduce((sum, value) => sum + value, 0);
  return candidates
    .map((candidatePersonId, index) => ({
      candidatePersonId,
      votes: votes[index]!,
      voteShare: votes[index]! / counted,
    }))
    .sort((left, right) => right.votes - left.votes);
}

export function localElectionCountHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const parts = countParts(due.stableKey);
  const town = due.jurisdictionId;
  if (!parts || !town) return done(world, "No race matches this count.");
  const { unit, electionDate, seat, stage } = parts;
  const race = raceKey(unit.id, electionDate, seat);
  const contestKey = `${race}:${stage}`;
  const contest = (world.history.electionContests ?? []).find(
    (row) => row.stableKey === contestKey,
  );
  if (!contest || electionContestResult(world, contest.id))
    return done(world, "This race was already counted.");
  const office = officeFor(unit, seat);
  if (!office)
    return done(world, "The office on this ballot no longer exists.");
  const label = seatLabelFor(office, seat);
  const phrase = seatPhrase(office, seat);
  const holder = holderOf(sittingLocalOfficers(world, unit), seat);
  const incumbent =
    holder && contest.candidatePersonIds.includes(holder.personId)
      ? holder.personId
      : null;
  const living = contest.candidatePersonIds.filter((id) => alive(world, id));
  const field = living.length > 0 ? living : contest.candidatePersonIds;
  const counted = countVotes(
    world,
    unit,
    town,
    seat,
    contestKey,
    field,
    incumbent,
    electionDate,
  );
  // Candidates who died before the vote are on the ballot with no votes.
  const tallies: CandidateTally[] = [
    ...counted,
    ...contest.candidatePersonIds
      .filter((id) => !field.includes(id))
      .map((candidatePersonId) => ({
        candidatePersonId,
        votes: 0,
        voteShare: 0,
      })),
  ];

  let winner: EntityId | null = counted[0]!.candidatePersonId;
  let advancing: EntityId[] = [];
  let ruleNote = "";
  if (stage === "primary") {
    const rule = resolveMunicipalBallotRule(
      unit.stateUsps,
      unit.placeGeoid ?? unit.publisherId,
    );
    const threshold =
      rule.rule === "majority-50-plus-1" ||
      rule.rule === "top-two-primary-runoff";
    const outcome = threshold
      ? tabulateBallot({
          rule: rule.rule,
          majorityTriggerPercent: rule.majorityTriggerPercent,
          candidateIds: counted.map((row) => row.candidatePersonId),
          ballots: counted.map((row) => ({
            ranking: [row.candidatePersonId],
            count: row.votes,
          })),
        })
      : null;
    if (outcome?.kind === "decided") {
      ruleNote = ` and won outright under ${unit.stateUsps}'s ${rule.rule} rule (${rule.basis})`;
    } else {
      advancing = counted.slice(0, 2).map((row) => row.candidatePersonId);
      winner = counted[0]!.candidatePersonId;
    }
  }

  let next = resolveElectionContest(world, {
    stableKey: `${contestKey}:result`,
    contestId: contest.id,
    resolvedAt: world.currentDate,
    winnerPersonId: winner,
    tallies,
    provenance: {
      method: "simulated",
      sourceEntityIds: [due.id, contest.id],
      note: `${P.id}: a placeholder count of a town ${stage}.`,
    },
  });

  if (stage === "primary") {
    next = event(next, {
      stableKey: `${contestKey}:held`,
      type: "local.election-primary-held",
      town,
      label: office.governmentName,
      involved: contest.candidatePersonIds,
      tags: [
        `unit:${unit.id}`,
        `seat:${seat}`,
        `field:${contest.candidatePersonIds.length}`,
      ],
      summary:
        advancing.length === 2
          ? `${nameOf(next, advancing[0]!)} and ${nameOf(next, advancing[1]!)} advance from a field of ${contest.candidatePersonIds.length} for ${phrase}.`
          : `${nameOf(next, winner)} led a field of ${contest.candidatePersonIds.length} for ${phrase}${ruleNote}.`,
    });
    if (advancing.length === 2) {
      next = scheduleRace(next, {
        unit,
        town,
        office,
        seat,
        generalDate: electionDate,
        stage: "general",
        voteDate: electionDate,
        candidates: advancing,
        basis: "game-default",
      });
      return done(next, `The primary for ${phrase} was counted.`);
    }
  }

  next = seatTheWinner(
    next,
    unit,
    town,
    office,
    seat,
    label,
    phrase,
    holder,
    winner,
    contestKey,
  );
  return done(next, `The race for ${phrase} was counted.`);
}

function seatTheWinner(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  office: LocalGoverningBodyIdentity,
  seat: number,
  label: string,
  phrase: string,
  holder: SeatedLocalOffice | null,
  winner: EntityId,
  contestKey: string,
): World {
  if (holder?.personId === winner) {
    return event(world, {
      stableKey: `${contestKey}:reelected`,
      type: "local.officeholder-reelected",
      town,
      label: office.governmentName,
      involved: [winner],
      tags: [`unit:${unit.id}`, `seat:${seat}`],
      summary: `${nameOf(world, winner)} kept ${phrase}.`,
    });
  }
  let next = world;
  const lost =
    holder !== null &&
    (world.history.electionContests ?? []).some(
      (row) =>
        row.stableKey.startsWith(
          contestKey.replace(/:(primary|general)$/, ""),
        ) && row.candidatePersonIds.includes(holder.personId),
    );
  if (holder) {
    next = endSeat(
      next,
      holder,
      lost
        ? `Lost the election for ${phrase}`
        : `Did not run again for ${phrase}`,
      contestKey,
    );
    if (lost)
      next = event(next, {
        stableKey: `${contestKey}:incumbent-defeated`,
        type: "local.incumbent-defeated",
        town,
        label: office.governmentName,
        involved: [holder.personId, winner],
        tags: [`unit:${unit.id}`, `seat:${seat}`],
        summary: `${nameOf(next, winner)} defeated ${nameOf(next, holder.personId)} for ${phrase}.`,
      });
  }
  next = takeSeat(next, unit, winner, seat, label, contestKey);
  return event(next, {
    stableKey: `${contestKey}:seat-changed`,
    type: "local.seat-changed",
    town,
    label: office.governmentName,
    involved: holder ? [holder.personId, winner] : [winner],
    tags: [
      `unit:${unit.id}`,
      `seat:${seat}`,
      lost ? "incumbent-lost" : "open-seat",
    ],
    summary: `${nameOf(next, winner)} takes ${phrase}.`,
  });
}

/* -------------------------------------------------------------------------- */
/* A year in office: resignations and vacancies                                */
/* -------------------------------------------------------------------------- */

/**
 * In the year after a decennial census, a council elected by ward redraws its
 * map, drawn by whoever holds the pen (`wardDrawerInForce`). Run by the
 * town's yearly handler; a law that changes who draws the map reads it
 * through `wardDrawerInForce` rather than keeping a schedule of its own.
 */
export function redistrictAfterCensus(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
): World {
  const map = townWardMap(world, unit);
  const year = Number(world.currentDate.slice(0, 4));
  if (!map || year % 10 !== 1 || map.drawnAt >= `${year}-01-01`) return world;
  return redrawTownWards(world, {
    unit,
    town,
    drawnBy: wardDrawerInForce(world, unit, town),
    members: wardMembers(world, unit),
    reason: `after the ${year - 1} census`,
  });
}

function wardMembers(world: World, unit: GovernmentUnitIdentity) {
  return [...seatsOf(sittingLocalOfficers(world, unit))]
    .filter(([seat]) => seat > 0)
    .map(([seat, row]) => ({ seat, personId: row.personId }));
}

/**
 * When a law hands the pen to an independent commission, the commission
 * redraws the council's map at the town's next yearly review rather than
 * waiting for the next census; the map it draws ignores where members live,
 * so two of them can land in one ward. A repeal hands the next redraw back
 * to the council without redrawing early.
 */
export function redistrictForWardCommission(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
): World {
  const map = townWardMap(world, unit);
  if (!map || map.drawnBy === "commission") return world;
  if (wardDrawerInForce(world, unit, town) !== "commission") return world;
  return redrawTownWards(world, {
    unit,
    town,
    drawnBy: "commission",
    members: wardMembers(world, unit),
    reason: "the independent ward commission law took effect",
  });
}

export function localGovernmentYearHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = unitFromKey(due.stableKey);
  const town = due.jurisdictionId;
  if (!found || !town)
    return done(world, "No town government matches this year.");
  const { unit } = found;
  const office = localGoverningBodyIdentity(unit);
  if (!office) return done(world, "The town has no governing body.");
  let next = redistrictForWardCommission(
    redistrictAfterCensus(world, unit, town),
    unit,
    town,
  );
  const player = due.entityIds[1];
  const excluded = excludedFrom(next, unit, playerHousehold(next, player));
  const taken = new Set<string>();
  let vacancies = 0;
  for (const [seat, holder] of seatsOf(sittingLocalOfficers(next, unit))) {
    const died = !alive(next, holder.personId);
    const played =
      next.control.kind === "person" &&
      next.control.personId === holder.personId;
    let resigns = false;
    if (!died && !played) {
      const decided = decideAnotherTerm(next, {
        personId: holder.personId,
        stableKey: `${due.stableKey}:${holder.personId}:stay`,
        subjectKey: due.stableKey,
        decisionType: "office.consider-resigning",
        onDate: next.currentDate,
        termEnds: addDays(next.currentDate, 365),
        seekLabel: "Stay in office",
        stepDownLabel: "Resign",
        serving: [
          {
            stableKey: `${due.stableKey}:${holder.personId}:stay:serving`,
            optionKey: "seek",
            sourceType: "context:current-office",
            direction: "supports",
            importance: "decisive",
            confidence: "high",
            explanation: "They were elected to serve out this term.",
            sourceRefs: [],
          },
        ],
      });
      next = decided.world;
      resigns = !decided.seeks;
    }
    if (!died && !resigns) continue;
    const seatOffice = officeFor(unit, seat) ?? office;
    const label = seatLabelFor(seatOffice, seat);
    const phrase = seatPhrase(seatOffice, seat);
    const key = `${due.stableKey}:${holder.personId}`;
    if (resigns) {
      next = endSeat(next, holder, `Resigned from ${phrase}`, key);
      next = event(next, {
        stableKey: `${key}:resigned`,
        type: "local.officeholder-resigned",
        town,
        label: office.governmentName,
        involved: [holder.personId],
        tags: [`unit:${unit.id}`, `seat:${seat}`],
        summary: `${nameOf(next, holder.personId)} resigned from ${phrase}.`,
      });
    } else {
      next = endSeat(next, holder, `Died while holding ${phrase}`, key);
    }
    // The mayor names someone they know who lives in the town
    // (appointments-v1), or somebody a council member knows and puts forward:
    // a council fills a vacancy from the names its members bring. Only when
    // there is no other mayor, or nobody any of them knows is eligible, does
    // the body's appointee come from the town roster.
    const sitting = sittingLocalOfficers(next, unit).filter(
      (officer) =>
        officer.personId !== holder.personId && alive(next, officer.personId),
    );
    const mayor = sitting.find((officer) => officer.mayor);
    const putForward = mayor
      ? [
          ...new Set(
            sitting
              .filter((officer) => officer.personId !== mayor.personId)
              .flatMap((officer) => peopleKnownTo(next, officer.personId)),
          ),
        ].sort()
      : [];
    const post = { officeKey: `${unit.id}:${seat}`, title: label };
    // A ward seat's appointee lives in its ward.
    const vacancyMap = townWardMap(next, unit);
    const vacantWard =
      vacancyMap && isWardSeat(councilWardPlan(unit), seat)
        ? seatWard(vacancyMap, seat)
        : null;
    const choice = mayor
      ? chooseAppointee(next, {
          stableKey: key,
          appointerPersonId: mayor.personId,
          post,
          circle: appointmentCircle(next, mayor.personId, putForward),
          eligible: (personId) => {
            const person = next.people[personId];
            return (
              !!person &&
              !excluded.has(personId) &&
              alive(next, personId) &&
              person.homeJurisdictionId === town &&
              (vacantWard === null ||
                wardOfPerson(next, unit, town, personId) === vacantWard) &&
              ageOnDate(person.birthDate, next.currentDate) >=
                P.minimumCandidateAge
            );
          },
        })
      : null;
    const drawn = choice
      ? { world: choice.world, personId: choice.personId }
      : drawTownResident(
          next,
          town,
          `local-appointment:${key}`,
          0,
          P.minimumCandidateAge,
          excluded,
          taken,
          vacantWard !== null ? wardRange(vacancyMap!, vacantWard) : null,
        );
    next = drawn.world;
    if (!drawn.personId) continue;
    if (choice && mayor)
      next = recordPassedOver(next, {
        stableKey: key,
        appointerPersonId: mayor.personId,
        passedOver: choice.passedOver,
        post,
      });
    excluded.add(drawn.personId);
    next = takeSeat(next, unit, drawn.personId, seat, label, key);
    next = event(next, {
      stableKey: `${key}:appointed`,
      type: "local.vacancy-appointed",
      town,
      label: office.governmentName,
      involved:
        choice && mayor
          ? [drawn.personId, holder.personId, mayor.personId]
          : [drawn.personId, holder.personId],
      tags: [`unit:${unit.id}`, `seat:${seat}`],
      summary:
        choice && mayor
          ? `Mayor ${nameOf(next, mayor.personId)} appointed ${nameOf(next, drawn.personId)} to ${phrase} until the next election.`
          : `${office.bodyName} appointed ${nameOf(next, drawn.personId)} to ${phrase} until the next election.`,
    });
    if (choice && mayor)
      next = recordAppointmentFavor(next, {
        stableKey: key,
        appointerPersonId: mayor.personId,
        appointeePersonId: drawn.personId,
        post,
        eventId: next.history.events.find(
          (row) => row.stableKey === `${key}:appointed`,
        )!.id,
        subject: { kind: "none" },
      });
    vacancies += 1;
  }
  if (player) next = scheduleYear(next, unit, town, player);
  return done(
    next,
    `${vacancies} ${vacancies === 1 ? "seat" : "seats"} filled in ${unit.name} this year.`,
  );
}

export const LOCAL_ELECTION_HANDLERS = [
  [LOCAL_ELECTION_FILING, localElectionFilingHandler],
  [LOCAL_ELECTION_COUNT, localElectionCountHandler],
  [LOCAL_GOVERNMENT_YEAR, localGovernmentYearHandler],
] as const;
