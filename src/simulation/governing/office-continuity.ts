import { inventedPersonBirthDate } from "../invented-person-age";
import { crisisRecords } from "../crisis/records";
import { crisisOfficeContinuityNotices } from "../crisis/notices";
import { applyCongressTurnover } from "../living-world/congress-turnover";
import { applyGovernorTurnover } from "../nationwide-world/state-executive-turnover-calendar";
import { applyPresidentialTurnover } from "../nationwide-world/presidential-turnover";
import { applyConstitutionalReform } from "../living-world/constitutional-reform";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "../character-history";
import {
  addDays,
  compareSimulationMoments,
  makeIsoDate,
  simulationMomentOnLocalDate,
  spokenDate,
} from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { formatStatutoryDate } from "../legislation-content-contracts";
import { stateJurisdictionForKey } from "../life-places";
import { LIVING_WORLD_SCENARIO_PROFILE } from "../living-world/contract";
import {
  MINIMUM_AGE,
  congressSeats,
  seatTermWindow,
} from "../living-world/congress-seats";
import type { CongressSeat } from "../living-world/congress-seats";
import { projectCongress } from "../living-world/congress";
import { aggregateCongressAffiliation } from "../living-world/congress-aggregate-outcome";
import { seatStartingCondition } from "../world-setup/conditions";
import {
  CONGRESS_TURNOVER_PROFILE,
  congressionalElectionDay,
} from "../living-world/congress-turnover";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_CAUCUS_TAG,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
  SEAT_VACANCY_EVENT,
  congressSeatTitle,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { currentGovernorOf, currentPresidentOf } from "../crisis/offices";
import { publicPartyOf } from "./chamber-votes";
import {
  legislativeSenateElectionDay,
  senateSelectionRuleAt,
} from "./senate-selection";
import {
  electPresidingOfficer,
  recordPresidingOfficerVote,
} from "./presiding-officers";
import {
  jointAssemblyCandidates,
  jointAssemblyVote,
  recordJointAssemblyVote,
  seatedStateLegislators,
} from "./joint-assembly";
import {
  SENATE_APPOINTMENT_PLACEHOLDER_DAYS,
  SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS,
  senateVacancyLaw,
} from "../nationwide-world/senate-vacancy-law";
import { stateOfJurisdiction } from "../press/outlets";
import {
  appointmentCircle,
  chooseAppointee,
  recordAppointmentFavor,
  recordPassedOver,
} from "../patronage/appointments";
import { federalColleaguesOf, nominatorOf } from "../patronage/federal-circle";
import {
  FEDERAL_TENURE_EVENT,
  FEDERAL_VACANCY_EVENT,
  currentFederalTenure,
  federalTenureEnd,
  latestFederalOfficeRecord,
} from "../federal-tenures";
import { nationalOfficeHolder } from "../national-election-consumer";
import { appendNationalRecord, nationalRecords } from "../national-elections";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { seatGovernorSuccessor } from "../nationwide-world/governor-succession";
import {
  currentStateExecutiveHolders,
  stateExecutiveOffice,
} from "../nationwide-world/state-executives";
import {
  CHIEF_JUSTICE_CONFIRMATION,
  CHIEF_JUSTICE_NOMINATION,
  CHIEF_JUSTICESHIP_VACANT_SENTENCE,
  chiefJusticeNominationHandler,
  confirmChiefJustice,
  openChiefJusticeVacancy,
} from "./chief-justice-vacancy";
import {
  ASSOCIATE_JUSTICE_CONFIRMATION,
  ASSOCIATE_JUSTICE_NOMINATION,
  SUPREME_COURT_ID,
  associateJusticeNominationHandler,
  confirmAssociateJustice,
  openAssociateJusticeVacancy,
} from "./supreme-court-appointments";
import type {
  EntityId,
  EventVisibility,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";

/**
 * GOVERNING K3 — what happens to an office when its holder dies or loses
 * capacity.
 *
 * CRISIS reports the fact; this module decides what the law the game has
 * compiled says follows, once per notice. Where the game has the rule it acts
 * (a Vice President succeeds under the Twenty-Fifth Amendment, § 1; a dead
 * Representative's seat is vacant until a special election; the President
 * nominates a new Vice President or Chief Justice). Where the route is law
 * but its pace or choices are not compiled, a marked placeholder fills the
 * gap (a governor's successor, a temporary senator, the nominee and the
 * confirmation). Where it
 * does not know the route at all (the statutory line of
 * succession) it writes a public record saying exactly what is missing and
 * leaves the office unfilled rather than inventing a successor.
 */

export const OFFICE_CONTINUITY_VERSION = "office-continuity/v1";
export const OFFICE_CONTINUITY_EVENT = "governing.office-continuity" as const;
export const HOUSE_SPECIAL_ELECTION = "governing:house-special-election";

/** Game profile, not law: states set their own special-election calendars. */
export const HOUSE_SPECIAL_ELECTION_PROFILE = {
  id: "ocd-house-special-election-game-profile/v1",
  daysFromVacancyToElection: 90,
} as const;

/** The party a special election's voters return, from the seat's lean. */
function voterChoice(
  world: World,
  seatKey: string,
  priorParty: string | null,
  majors: readonly string[],
): string | null {
  const condition = seatStartingCondition(world, seatKey);
  const party = aggregateCongressAffiliation({
    democraticShare: condition?.generatedShare ?? null,
    baselineAffiliation: condition?.affiliation ?? priorParty,
    incumbentAffiliation: priorParty,
    incumbentSeeking: false,
  });
  return party && majors.includes(party)
    ? party
    : priorParty && majors.includes(priorParty)
      ? priorParty
      : null;
}

/**
 * A VACANT U.S. SENATE SEAT. The Seventeenth Amendment has the state's
 * governor issue writs of election, and lets the state's legislature let the
 * governor make a temporary appointment until the people fill the seat.
 *
 * Since Build 27 (September 28, 2026) each state's own law decides
 * (`nationwide-world/senate-vacancy-law.ts`): whether the governor may
 * appoint, whether the appointee must share the departed senator's party,
 * and when the special election falls. A governor free to choose appoints
 * someone of the governor's own party. When the term ends at the regular
 * election anyway, that election fills the seat and no special is held.
 *
 * PLACEHOLDER (filed as `us-senate-vacancy-appointment-and-special-election`):
 * the appointee is still a generated person, not someone the governor
 * knows, and the days to an appointment where the statute sets none.
 */
export const SENATE_APPOINTMENT = "governing:senate-appointment";

export const SENATE_VACANCY_PROFILE = {
  id: "ocd-senate-vacancy-game-profile/v1",
  daysFromVacancyToAppointment: 10,
} as const;

const APPOINTED_FOR_TAG = "appointed-for-vacancy:";

export const OFFICE_CONTINUITY_SOURCES = {
  amendment25: {
    label: "U.S. Const. amend. XXV",
    url: "https://constitution.congress.gov/constitution/amendment-25/",
  },
  successionAct: {
    label: "3 U.S.C. § 19",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title3-section19&num=0&edition=prelim",
  },
  houseVacancy: {
    label: "U.S. Const. art. I, § 2, cl. 4",
    url: "https://constitution.congress.gov/browse/article-1/section-2/clause-4/",
  },
  senateVacancy: {
    label: "U.S. Const. amend. XVII",
    url: "https://constitution.congress.gov/constitution/amendment-17/",
  },
} as const;

/** The CRISIS notice shape, copied structurally so neither lane imports the other. */
export interface OfficeContinuityNoticeInput {
  readonly noticeKey: string;
  readonly sequence: number;
  readonly originEventId: EntityId;
  readonly personId: EntityId;
  readonly kind: "death" | "incapacity-began" | "incapacity-ended";
  readonly effectiveDate: IsoDate;
  readonly recordedDate: IsoDate;
  readonly visibility: EventVisibility;
  readonly offices: readonly {
    readonly officeKey: string;
    readonly title: string;
    readonly organizationId: EntityId | null;
    readonly termEvidenceId: EntityId | null;
  }[];
  readonly sourceRecordId: EntityId;
}

export type OfficeContinuityOutcome =
  | "succeeded"
  | "vacant"
  | "special-election"
  | "blocked"
  | "not-automatic"
  | "no-change";

export interface OfficeContinuityRuling {
  readonly officeKey: string;
  readonly title: string;
  readonly outcome: OfficeContinuityOutcome;
  readonly sentence: string;
}

export function officeContinuityDedupeKey(
  notice: Pick<OfficeContinuityNoticeInput, "noticeKey">,
): string {
  return `${notice.noticeKey}|governing|${OFFICE_CONTINUITY_VERSION}`;
}

function consumedKey(notice: OfficeContinuityNoticeInput): string {
  return `${OFFICE_CONTINUITY_VERSION}:${officeContinuityDedupeKey(notice)}`;
}

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function seatFor(officeKey: string): CongressSeat | null {
  const [chamberKey, ...rest] = officeKey.split(":");
  const seatKey = rest.join(":");
  return (
    congressSeats().find(
      (seat) =>
        seat.chamberKey === chamberKey &&
        (seat.seatKey === seatKey || seat.seatKey === officeKey),
    ) ?? null
  );
}

function latestSeatRecord(
  world: World,
  seatKey: string,
): HistoricalEvent | undefined {
  let latest: HistoricalEvent | undefined;
  for (const event of world.history.events) {
    if (
      (event.type !== SEAT_TENURE_EVENT && event.type !== SEAT_VACANCY_EVENT) ||
      !event.tags.includes(LIVING_WORLD_WRITER_VERSION) ||
      tagValue(event, "seat:") !== seatKey
    )
      continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}

function seatTags(seat: CongressSeat, onDate: IsoDate): string[] {
  const window = seatTermWindow(seat, onDate);
  return [
    LIVING_WORLD_WRITER_VERSION,
    OFFICE_CONTINUITY_VERSION,
    `office:${seat.chamberKey}`,
    `seat:${seat.seatKey}`,
    `state:${seat.stateUsps}`,
    `term-start:${window.startsAt}`,
    `term-end:${window.endExclusive}`,
  ];
}

function specialElectionKey(seat: CongressSeat, vacancyDate: IsoDate): string {
  return `${OFFICE_CONTINUITY_VERSION}:special:${seat.seatKey}:${vacancyDate}`;
}

interface SeatVacancyCause {
  readonly effectiveDate: IsoDate;
  /** A tag value: `member-died`, `member-became-vice-president`. */
  readonly key: string;
  /** Finishes "The seat of the … is vacant …". */
  readonly clause: string;
}

const MEMBER_DIED = (effectiveDate: IsoDate): SeatVacancyCause => ({
  effectiveDate,
  key: "member-died",
  clause: "after the member's death",
});

/** A member's seat becomes vacant from the day they leave it. */
function vacateSeat(
  world: World,
  seat: CongressSeat,
  notice: SeatVacancyCause,
): { world: World; ruling: OfficeContinuityRuling } {
  const title = congressSeatTitle(seat);
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:vacancy:${seat.seatKey}:${notice.effectiveDate}`;
  const chamberId = livingWorldOrganizationId(
    world,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  const stateId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
  let next = world;
  if (!next.history.events.some((event) => event.stableKey === stableKey))
    next = recordWorldEvent(next, {
      stableKey,
      type: SEAT_VACANCY_EVENT,
      occurredAt: notice.effectiveDate,
      recordedAt: next.currentDate,
      jurisdictionId: stateId,
      involvedEntityIds: [chamberId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        ...seatTags(seat, notice.effectiveDate),
        `vacancy-cause:${notice.key}`,
      ],
      summary: `The seat of the ${title} is vacant ${notice.clause}.`,
      context: CONTEXT,
    });
  return scheduleSeatFilling(next, seat, notice.effectiveDate);
}

/**
 * Schedules whatever fills a seat that became vacant on a date, however it
 * was vacated: a Senate appointment and special election, or a House special
 * election. The vacancy record itself is the caller's.
 */
export function scheduleSeatFilling(
  world: World,
  seat: CongressSeat,
  vacancyDate: IsoDate,
): { world: World; ruling: OfficeContinuityRuling } {
  const title = congressSeatTitle(seat);
  const chamberId = livingWorldOrganizationId(
    world,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  const stateId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
  let next = world;
  if (seat.chamberKey === "us-senate")
    return openSenateVacancy(next, seat, vacancyDate, chamberId, stateId);
  const window = seatTermWindow(seat, vacancyDate);
  const electionDay = addDays(
    next.currentDate > vacancyDate ? next.currentDate : vacancyDate,
    HOUSE_SPECIAL_ELECTION_PROFILE.daysFromVacancyToElection,
  );
  const regular = congressionalElectionDay(
    Number(window.endExclusive.slice(0, 4)) - 1,
  );
  if (electionDay >= regular)
    return {
      world: next,
      ruling: {
        officeKey: seat.seatKey,
        title,
        outcome: "vacant",
        // A vacancy after the regular election has already been held waits
        // for the new term rather than for an election in the past.
        sentence:
          regular > next.currentDate
            ? `The seat is vacant until the regular election on ${formatStatutoryDate(regular)}.`
            : `The seat stays vacant until the new term begins on ${formatStatutoryDate(window.endExclusive)}.`,
      },
    };
  const dueKey = specialElectionKey(seat, vacancyDate);
  if (!next.history.futureDueItems.some((due) => due.stableKey === dueKey))
    next = scheduleFutureDueItem(next, {
      stableKey: dueKey,
      dueAt: electionDay,
      transitionKey: HOUSE_SPECIAL_ELECTION,
      entityIds: [chamberId],
      jurisdictionId: stateId,
      provenance: {
        kind: "authored",
        note: `${HOUSE_SPECIAL_ELECTION_PROFILE.id}: the state's governor calls a special election (U.S. Const. art. I, § 2, cl. 4); the ${HOUSE_SPECIAL_ELECTION_PROFILE.daysFromVacancyToElection}-day interval is a game profile.`,
      },
    });
  return {
    world: next,
    ruling: {
      officeKey: seat.seatKey,
      title,
      outcome: "special-election",
      sentence: `The seat is vacant. The governor of ${stateJurisdictionForKey(`US-${seat.stateUsps}`)!.name} calls a special election for ${spokenDate(electionDay)}.`,
    },
  };
}

/** The first regular November congressional election after a date. */
function nextCongressionalElectionAfter(date: IsoDate): IsoDate {
  let year = Number(date.slice(0, 4));
  if (year % 2 === 1) year += 1;
  let day = congressionalElectionDay(year);
  if (day <= date) day = congressionalElectionDay(year + 2);
  return day;
}

/**
 * A vacant U.S. Senate seat, filled under the state's own law
 * (`senate-vacancy-law.ts`): an appointment where the governor may make one,
 * then a special election, prompt or at the next regular November election
 * as the state's statute says. PLACEHOLDER (SENATE_VACANCY_PROFILE) only
 * where the law is silent or unrecorded: the days to an appointment with no
 * statutory deadline, and a prompt election's unrecorded window.
 */
function openSenateVacancy(
  world: World,
  seat: CongressSeat,
  vacancyDate: IsoDate,
  chamberId: EntityId,
  stateId: EntityId,
): { world: World; ruling: OfficeContinuityRuling } {
  const title = congressSeatTitle(seat);
  const from =
    world.currentDate > vacancyDate ? world.currentDate : vacancyDate;
  // Where the Constitution in force has the legislatures choose senators,
  // the state's legislature fills the seat (Act of July 25, 1866, sec. 2).
  if (
    senateSelectionRuleAt(world, vacancyDate).method === "state-legislature"
  ) {
    const day = legislativeSenateElectionDay(from);
    const dueKey = specialElectionKey(seat, vacancyDate);
    const next = world.history.futureDueItems.some(
      (due) => due.stableKey === dueKey,
    )
      ? world
      : scheduleFutureDueItem(world, {
          stableKey: dueKey,
          dueAt: day,
          transitionKey: HOUSE_SPECIAL_ELECTION,
          entityIds: [chamberId],
          jurisdictionId: stateId,
          provenance: {
            kind: "authored",
            note: "The state's legislature elects a senator in joint assembly on the second Tuesday after it has notice of the vacancy (Act of July 25, 1866, ch. 245, sec. 2).",
          },
        });
    return {
      world: next,
      ruling: {
        officeKey: seat.seatKey,
        title,
        outcome: "special-election",
        sentence: `The seat is vacant. The state's legislature elects a senator in joint assembly on ${spokenDate(day)}.`,
      },
    };
  }
  const law = senateVacancyLaw(seat.stateUsps);
  const appoints = law ? law.appointment !== "none" : true;
  const deadline = law?.appointmentDeadlineDays ?? null;
  const appointmentDay = addDays(
    from,
    deadline === null
      ? SENATE_APPOINTMENT_PLACEHOLDER_DAYS
      : Math.min(SENATE_APPOINTMENT_PLACEHOLDER_DAYS, deadline),
  );
  const window = seatTermWindow(seat, vacancyDate);
  const regular = congressionalElectionDay(
    Number(window.endExclusive.slice(0, 4)) - 1,
  );
  let next = world;
  const appointmentKey = `${OFFICE_CONTINUITY_VERSION}:appointment:${seat.seatKey}:${vacancyDate}`;
  if (
    appoints &&
    appointmentDay < window.endExclusive &&
    !next.history.futureDueItems.some((due) => due.stableKey === appointmentKey)
  )
    next = scheduleFutureDueItem(next, {
      stableKey: appointmentKey,
      dueAt: appointmentDay,
      transitionKey: SENATE_APPOINTMENT,
      entityIds: [chamberId],
      jurisdictionId: stateId,
      provenance: {
        kind: "authored",
        note: law
          ? `${seat.stateUsps} law (${law.citation ?? law.source}): the governor makes a temporary appointment (U.S. Const. amend. XVII).`
          : `${SENATE_VACANCY_PROFILE.id}: the governor makes a temporary appointment (U.S. Const. amend. XVII); the appointment, its party and its ${SENATE_VACANCY_PROFILE.daysFromVacancyToAppointment}-day interval are a game profile.`,
      },
    });
  const nextGeneral = nextCongressionalElectionAfter(
    appoints ? appointmentDay : from,
  );
  const promptDate =
    law?.specialElection.kind === "prompt"
      ? addDays(
          from,
          law.specialElection.promptDays ??
            SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS,
        )
      : null;
  const special =
    promptDate !== null && promptDate < nextGeneral ? promptDate : nextGeneral;
  const appointee = appoints
    ? "The governor appoints a senator to serve"
    : `${stateJurisdictionForKey(`US-${seat.stateUsps}`)!.name} law gives the governor no appointment, so the seat stays empty`;
  if (special >= regular)
    return {
      world: next,
      ruling: {
        officeKey: seat.seatKey,
        title,
        outcome: "vacant",
        sentence: `The seat is vacant. ${appointee} until the regular election on ${spokenDate(regular)} fills it for the next term.`,
      },
    };
  const dueKey = specialElectionKey(seat, vacancyDate);
  if (!next.history.futureDueItems.some((due) => due.stableKey === dueKey))
    next = scheduleFutureDueItem(next, {
      stableKey: dueKey,
      dueAt: special,
      transitionKey: HOUSE_SPECIAL_ELECTION,
      entityIds: [chamberId],
      jurisdictionId: stateId,
      provenance: {
        kind: "authored",
        note:
          law && special === promptDate
            ? `${seat.stateUsps} law (${law.citation ?? law.source}): a prompt special election${law.specialElection.kind === "prompt" && law.specialElection.promptDays === null ? `; the ${SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS}-day interval is estimated from the median of other states' statutes` : ""}.`
            : `${law ? `${seat.stateUsps} law (${law.citation ?? law.source})` : SENATE_VACANCY_PROFILE.id}: the governor issues writs of election (U.S. Const. amend. XVII) for the next regular November election.`,
      },
    });
  return {
    world: next,
    ruling: {
      officeKey: seat.seatKey,
      title,
      outcome: "special-election",
      sentence: `The seat is vacant. ${appointee} until a special election on ${spokenDate(special)}.`,
    },
  };
}

/** The governor's temporary appointee takes the seat. */
export function senateAppointmentHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  return seatNewMember(world, due, "appointment");
}

/** Special election day: choose the member who serves out the term. */
export function houseSpecialElectionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  return seatNewMember(world, due, "special-election");
}

/**
 * The member a special election or a legislature seats when no known person
 * is chosen: invented for the seat, with an age from the shared table.
 */
export function newMemberInput(
  world: World,
  seat: CongressSeat,
  memberKey: string,
  rng: SeededRng,
): CharacterHistoryContextPersonInput {
  return {
    stableKey: memberKey,
    ...drawCanonicalNamedIdentity(
      rng.fork("name"),
      generatePersonIdentity(rng.fork("identity")),
    ),
    birthDate: inventedPersonBirthDate(rng, {
      role: "legislative-successor",
      referenceDate: world.currentDate,
      legalMinimumAge: MINIMUM_AGE[seat.chamberKey],
    }),
    homeJurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
  };
}

function seatNewMember(
  world: World,
  due: FutureDueItem,
  mode: "appointment" | "special-election",
): FutureTransitionHandlerResult {
  const done = (
    next: World,
    context: string,
    outcomeEventId: EntityId | null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  });
  const match = /:(?:special|appointment):(.+):(\d{4}-\d{2}-\d{2})$/.exec(
    due.stableKey,
  );
  const seat = match
    ? congressSeats().find((candidate) => candidate.seatKey === match[1])
    : undefined;
  if (!seat || !match) return done(world, "No seat matches.", null);
  const vacancyDate = makeIsoDate(match[2]!);
  const latest = latestSeatRecord(world, seat.seatKey);
  const stillVacant =
    latest?.type === SEAT_VACANCY_EVENT && latest.occurredAt === vacancyDate;
  // A special election also replaces the governor's temporary appointee.
  const heldByAppointee =
    mode === "special-election" &&
    latest?.type === SEAT_TENURE_EVENT &&
    latest.tags.includes(`${APPOINTED_FOR_TAG}${vacancyDate}`);
  if (!stillVacant && !heldByAppointee)
    return done(world, "The seat was already filled.", null);
  const window = seatTermWindow(seat, world.currentDate);
  if (world.currentDate >= window.endExclusive)
    return done(world, "The term ended before the special election.", null);
  const rng = new SeededRng(world.seed).fork(due.stableKey);
  const majors: string[] = LIVING_WORLD_SCENARIO_PROFILE.majorParties.map(
    (party) => party.key,
  );
  const previous = world.history.events
    .filter(
      (event) =>
        event.type === SEAT_TENURE_EVENT &&
        tagValue(event, "seat:") === seat.seatKey &&
        event.occurredAt <= vacancyDate,
    )
    .at(-1);
  const priorParty = previous ? tagValue(previous, SEAT_PARTY_TAG) : null;
  // An appointee's party: the departed senator's where the state's law
  // requires it; otherwise the governor's own, since the governor chooses.
  // Without a known governor or party, the departed senator's.
  const law = senateVacancyLaw(seat.stateUsps);
  const governor = currentGovernorOf(world, seat.stateUsps);
  const governorParty = governor
    ? publicPartyOf(world, governor.personId)
    : null;
  const appointeeParty =
    law?.appointment === "governor" && governorParty
      ? governorParty
      : priorParty;
  // A legislature choosing senators votes in joint assembly, each member
  // by their own caucus, relationships and principles (joint-assembly.ts).
  // A governor's appointee holding the seat stands as a candidate. ESTIMATED
  // where the state's legislature is not seated in this world: the state's
  // own lean stands in for its majority, as at a regular election
  // (congress-turnover.ts).
  const legislatureChooses =
    mode === "special-election" &&
    seat.chamberKey === "us-senate" &&
    senateSelectionRuleAt(world, vacancyDate).method === "state-legislature";
  const legislators = legislatureChooses
    ? seatedStateLegislators(world, seat.stateUsps)
    : null;
  const sittingAppointee =
    heldByAppointee && latest
      ? latest.participants.find((row) => row.role === "focus:subject")
          ?.personId
      : undefined;
  const sittingParty = latest ? tagValue(latest, SEAT_PARTY_TAG) : null;
  const legislatureVote = legislators
    ? jointAssemblyVote(world, {
        stableKey: `${due.stableKey}:joint-assembly`,
        members: legislators,
        candidates: jointAssemblyCandidates(
          legislators,
          sittingAppointee && sittingParty
            ? { personId: sittingAppointee, party: sittingParty }
            : null,
        ),
      })
    : null;
  if (legislatureVote && !legislatureVote.winner) {
    const next = recordJointAssemblyVote(world, {
      stableKey: `${due.stableKey}:joint-assembly`,
      seatKey: seat.seatKey,
      stateUsps: seat.stateUsps,
      title: congressSeatTitle(seat),
      occurredAt: world.currentDate,
      vote: legislatureVote,
      winnerPersonId: null,
    });
    return done(
      next,
      "The state legislature could not agree on a senator; the seat stays as it is.",
      next.history.events.at(-1)!.id,
    );
  }
  const condition =
    legislatureChooses && !legislators
      ? seatStartingCondition(world, seat.seatKey)
      : null;
  const legislatureParty = legislatureVote
    ? legislatureVote.winner!.party
    : legislatureChooses
      ? aggregateCongressAffiliation({
          democraticShare: condition?.generatedShare ?? null,
          baselineAffiliation: condition?.affiliation ?? null,
          incumbentAffiliation: priorParty,
          incumbentSeeking: false,
        })
      : null;
  const electedPersonId = legislatureVote?.winner?.personId ?? null;
  const party = legislatureParty
    ? legislatureParty
    : mode === "appointment" && appointeeParty
      ? appointeeParty
      : // The voters choose as they would at a regular election: the seat's
        // own two-party lean, with the prior party where the lean is even
        // or unread (congress-aggregate-outcome.ts). No draw.
        (voterChoice(world, seat.seatKey, priorParty, majors) ?? majors[0]!);
  const memberKey = `${due.stableKey}:member`;
  const title = congressSeatTitle(seat);
  // The governor names someone they know (appointments-v1): the state's
  // members of the House, anyone the governor has a recorded tie or favor
  // with who lives in the state. Only a governor who knows nobody eligible
  // falls back to the drawn stranger below.
  // Where the state's law requires the departed senator's party, the
  // governor's choice must belong to it.
  const requiredParty =
    law && law.appointment !== "governor" ? priorParty : null;
  const appointed =
    mode === "appointment"
      ? governorsSenateChoice(world, seat, title, due.stableKey, requiredParty)
      : null;
  const appointedParty = appointed
    ? publicPartyOf(appointed.world, appointed.personId)
    : null;
  let next = appointed
    ? appointed.world
    : electedPersonId
      ? world
      : createCharacterHistoryContextPeople(world, [
          newMemberInput(world, seat, memberKey, rng),
        ]);
  const winner = appointed
    ? appointed.personId
    : (electedPersonId ?? characterHistoryContextPersonId(next, memberKey));
  const seatParty = appointedParty ?? party;
  const leftHouseSeat = appointed
    ? congressSeatHeldBy(appointed.world, appointed.personId)
    : undefined;
  const chamberId = livingWorldOrganizationId(
    next,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  next = recordWorldEvent(next, {
    stableKey: `${due.stableKey}:term`,
    type: SEAT_TENURE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
    involvedEntityIds: appointed
      ? [winner, chamberId, appointed.governorId]
      : [winner, chamberId],
    participants: [{ personId: winner, role: "focus:subject", detail: title }],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      ...seatTags(seat, next.currentDate),
      `service-since:${next.currentDate}`,
      `${SEAT_PARTY_TAG}${seatParty}`,
      `${SEAT_CAUCUS_TAG}${seatParty}`,
      ...(mode === "appointment"
        ? [
            `${APPOINTED_FOR_TAG}${vacancyDate}`,
            `provenance:${SENATE_VACANCY_PROFILE.id}`,
          ]
        : [`provenance:${HOUSE_SPECIAL_ELECTION_PROFILE.id}`]),
      `provenance:${CONGRESS_TURNOVER_PROFILE.id}`,
    ],
    summary:
      mode === "appointment"
        ? `${personName(next.people[winner]!)} was appointed by the governor as ${title} until the seat is filled by election.`
        : `${personName(next.people[winner]!)} won the special election and serves the rest of the term as ${title}.`,
    context: CONTEXT,
  });
  const seatedEventId = next.history.events.at(-1)!.id;
  if (legislatureVote)
    next = recordJointAssemblyVote(next, {
      stableKey: `${due.stableKey}:joint-assembly`,
      seatKey: seat.seatKey,
      stateUsps: seat.stateUsps,
      title: congressSeatTitle(seat),
      occurredAt: next.currentDate,
      vote: legislatureVote,
      winnerPersonId: winner,
    });
  if (appointed) {
    next = recordAppointmentFavor(next, {
      stableKey: `${due.stableKey}:appointed`,
      appointerPersonId: appointed.governorId,
      appointeePersonId: winner,
      post: { officeKey: seat.seatKey, title },
      eventId: seatedEventId,
      subject: { kind: "none" },
    });
    // A member of the House named to the Senate gives up the House seat.
    if (leftHouseSeat)
      next = vacateSeat(next, leftHouseSeat, {
        effectiveDate: next.currentDate,
        key: "member-appointed-to-senate",
        clause: "after the member was appointed to the Senate",
      }).world;
  }
  return done(
    next,
    mode === "appointment"
      ? "The governor's appointee took the seat."
      : "The special election filled the seat.",
    seatedEventId,
  );
}

/**
 * Whom a governor names to a vacant Senate seat, from the people they know.
 * Null when the governor is the player or knows nobody eligible.
 */
function governorsSenateChoice(
  world: World,
  seat: CongressSeat,
  title: string,
  stableKey: string,
  requiredParty: string | null,
): { world: World; personId: EntityId; governorId: EntityId } | null {
  const governor = currentGovernorOf(world, seat.stateUsps);
  if (!governor) return null;
  const stateId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
  const congress = projectCongress(world);
  const delegation = (congress?.house.seats ?? []).flatMap((candidate) =>
    candidate.stateUsps === seat.stateUsps &&
    candidate.occupant.kind === "member"
      ? [candidate.occupant.member.personId]
      : [],
  );
  const delegationSet = new Set(delegation);
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const choice = chooseAppointee(world, {
    stableKey,
    appointerPersonId: governor.personId,
    post: { officeKey: seat.seatKey, title },
    circle: appointmentCircle(world, governor.personId, delegation),
    eligible: (personId) => {
      const person = world.people[personId];
      if (!person || personId === controlled || dead.has(personId))
        return false;
      if (
        ageOn(person.birthDate, world.currentDate) <
        MINIMUM_AGE[seat.chamberKey]
      )
        return false;
      if (requiredParty && publicPartyOf(world, personId) !== requiredParty)
        return false;
      // U.S. Const. art. I, § 3, cl. 3: an inhabitant of the state.
      return (
        delegationSet.has(personId) ||
        stateOfJurisdiction(world, person.homeJurisdictionId) === stateId
      );
    },
  });
  if (!choice) return null;
  return {
    world: recordPassedOver(choice.world, {
      stableKey,
      appointerPersonId: governor.personId,
      passedOver: choice.passedOver,
      post: { officeKey: seat.seatKey, title },
    }),
    personId: choice.personId,
    governorId: governor.personId,
  };
}

function presidentialRuling(
  world: World,
  notice: OfficeContinuityNoticeInput,
  office: OfficeContinuityNoticeInput["offices"][number],
): { world: World; ruling: OfficeContinuityRuling } {
  const base = { officeKey: office.officeKey, title: office.title };
  if (notice.kind === "incapacity-ended")
    return {
      world,
      ruling: {
        ...base,
        outcome: "no-change",
        sentence: "No powers were transferred, so there is nothing to return.",
      },
    };
  if (notice.kind === "incapacity-began")
    return {
      world,
      ruling: {
        ...base,
        outcome: "not-automatic",
        sentence:
          "Illness alone transfers nothing. Under the Twenty-Fifth Amendment the President may declare an inability (§ 3), or the Vice President and a majority of the Cabinet may (§ 4); neither declaration is recorded.",
      },
    };
  const plan = nationalRecords(world).find(
    (record) =>
      record.kind === "term-plan" &&
      record.id === office.termEvidenceId &&
      record.office === "president",
  );
  if (!plan || plan.kind !== "term-plan") {
    // A President seated by tenure record: the opening's, or one who came to
    // the office by succession. The Vice President by tenure record succeeds.
    const vacated = latestFederalOfficeRecord(world, "us-president");
    const vice = currentFederalTenure(world, "us-vice-president");
    const termEnd = vacated ? federalTenureEnd("us-president", vacated) : null;
    if (!vice) return statutorySuccession(world, notice, base, termEnd);
    if (!termEnd) return statutorySuccession(world, notice, base, null);
    return tenureSuccession(world, notice, base, vice.personId, termEnd);
  }
  const vice = nationalOfficeHolder(world, "vice-president");
  if (!vice || vice.plan.electionId !== plan.electionId) {
    // A Vice President confirmed under § 2 holds by tenure record.
    const confirmed = currentFederalTenure(world, "us-vice-president");
    if (!confirmed)
      return statutorySuccession(world, notice, base, plan.endsAt.date);
    return tenureSuccession(
      world,
      notice,
      base,
      confirmed.personId,
      plan.endsAt.date,
    );
  }
  const death = world.history.personDeaths.find(
    (row) => row.id === notice.sourceRecordId,
  );
  if (!death)
    return {
      world,
      ruling: {
        ...base,
        outcome: "blocked",
        sentence: "The death this notice reports is not in the record.",
      },
    };
  const effectiveAt =
    death.diedAt === world.currentDate
      ? world.currentMoment
      : simulationMomentOnLocalDate(world.currentMoment, death.diedAt);
  const next = appendNationalRecord(world, {
    kind: "succession",
    stableKey: `${OFFICE_CONTINUITY_VERSION}:succession:${plan.id}`,
    electionId: plan.electionId,
    vacatedPlanId: plan.id,
    successorPlanId: vice.plan.id,
    personId: vice.plan.personId,
    deathRecordId: death.id,
    effectiveAt:
      compareSimulationMoments(effectiveAt, world.currentMoment) > 0
        ? world.currentMoment
        : effectiveAt,
    basis: "us-const-amend-xxv-s1",
    provenance: {
      method: "simulated",
      sourceEntityIds: [plan.id, vice.plan.id],
      note: "U.S. Const. amend. XXV, § 1, applied to a recorded death.",
    },
  });
  return {
    world: openVicePresidentialVacancy(next, {
      vacancyDate: death.diedAt,
      formerHolderId: vice.plan.personId,
      presidentId: vice.plan.personId,
      cause: "became-president",
    }),
    ruling: {
      ...base,
      outcome: "succeeded",
      sentence: `${personName(world.people[vice.plan.personId]!)} became President under the Twenty-Fifth Amendment. ${VICE_PRESIDENCY_VACANT_SENTENCE}`,
    },
  };
}

/**
 * The officer who acts as President when there is neither a President nor a
 * Vice President: the Speaker of the House, "upon his resignation as Speaker
 * and as Representative in Congress" (3 U.S.C. § 19(a)(1)); failing a
 * Speaker, the President pro tempore of the Senate on the same terms
 * (§ 19(b)). The Cabinet officers after them (§ 19(d)) are not seated in
 * the game, so the line stops there.
 *
 * Each chamber elects its officer by vote, each member for their own
 * reasons (`presiding-officers.ts`), and the vote is recorded. A chamber
 * that elects nobody leaves the line to the next officer.
 */
function statutoryPresidentialSuccessor(
  world: World,
  stableKey: string,
  occurredAt: IsoDate,
): {
  readonly world: World;
  readonly successor: {
    readonly personId: EntityId;
    readonly seat: CongressSeat;
    readonly office:
      "Speaker of the House" | "President pro tempore of the Senate";
    readonly basis: "3-usc-19-a-1" | "3-usc-19-b";
  } | null;
} {
  const congress = projectCongress(world);
  if (!congress) return { world, successor: null };
  const chambers = [
    {
      chamberKey: "house",
      view: congress.house,
      office: "Speaker of the House" as const,
      basis: "3-usc-19-a-1" as const,
    },
    {
      chamberKey: "senate",
      view: congress.senate,
      office: "President pro tempore of the Senate" as const,
      basis: "3-usc-19-b" as const,
    },
  ];
  let next = world;
  for (const { chamberKey, view, office, basis } of chambers) {
    const sitting = view.seats.flatMap((seat) => {
      if (seat.occupant.kind !== "member") return [];
      const member = seat.occupant.member;
      const caucus = member.caucusOrganizationId ?? member.partyOrganizationId;
      return caucus
        ? [
            {
              seatKey: seat.seatKey,
              personId: member.personId,
              party: caucus,
              serviceSince: member.serviceSince ?? member.startedAt ?? null,
            },
          ]
        : [];
    });
    if (sitting.length === 0) continue;
    const voteKey = `${stableKey}:${chamberKey}:presiding-officer`;
    const elected = electPresidingOfficer(next, {
      stableKey: voteKey,
      officeTitle: office,
      members: sitting,
    });
    next = recordPresidingOfficerVote(elected.world, {
      stableKey: voteKey,
      chamberKey,
      officeTitle: office,
      occurredAt,
      election: elected.election,
    });
    const holder = sitting.find(
      (row) => row.personId === elected.election.winnerPersonId,
    );
    const seat = holder
      ? congressSeats().find(
          (candidate) => candidate.seatKey === holder.seatKey,
        )
      : undefined;
    if (holder && seat)
      return {
        world: next,
        successor: { personId: holder.personId, seat, office, basis },
      };
  }
  return { world: next, successor: null };
}

/**
 * Neither a President nor a Vice President: the statutory successor resigns
 * as a presiding officer and member of Congress and acts as President for the
 * rest of the term (3 U.S.C. § 19(c)). Their seat falls vacant and is filled
 * like any other. The vice presidency stays vacant: the Twenty-Fifth
 * Amendment's § 2 nomination belongs to "the President", and whether an
 * acting President may make it is unsettled, so none is scheduled.
 */
function statutorySuccession(
  world: World,
  notice: OfficeContinuityNoticeInput,
  base: { readonly officeKey: string; readonly title: string },
  termEnd: IsoDate | null,
): { world: World; ruling: OfficeContinuityRuling } {
  const death = world.history.personDeaths.find(
    (row) => row.id === notice.sourceRecordId,
  );
  const line =
    death && termEnd
      ? statutoryPresidentialSuccessor(
          world,
          `${OFFICE_CONTINUITY_VERSION}:acting-president:${death.id}`,
          death.diedAt,
        )
      : { world, successor: null };
  const successor = line.successor;
  if (!death || !termEnd || !successor)
    return {
      world: line.world,
      ruling: {
        ...base,
        outcome: "blocked",
        sentence: !death
          ? "The death this notice reports is not in the record."
          : "The presidency is vacant. There is no Vice President, and no Speaker of the House or President pro tempore of the Senate is seated to act as President.",
      },
    };
  const person = world.people[successor.personId]!;
  const former = world.people[death.personId];
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:acting-president:${death.id}`;
  let next = line.world;
  if (!next.history.events.some((event) => event.stableKey === stableKey)) {
    next = recordWorldEvent(next, {
      stableKey,
      type: FEDERAL_TENURE_EVENT,
      occurredAt: death.diedAt,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [successor.personId],
      participants: [
        {
          personId: successor.personId,
          role: "focus:subject",
          detail: "Acting President of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        OFFICE_CONTINUITY_VERSION,
        "office:us-president",
        `term-end:${termEnd}`,
        `basis:${successor.basis}`,
        "acting:true",
      ],
      summary: `${personName(person)}, the ${successor.office}, resigned from Congress and is acting as President of the United States${former ? ` after the death of ${personName(former)}` : ""}, for the rest of the term.`,
      context: CONTEXT,
    });
    next = vacateSeat(next, successor.seat, {
      effectiveDate: death.diedAt,
      key: "member-acting-as-president",
      clause: "after the member resigned to act as President",
    }).world;
  }
  return {
    world: next,
    ruling: {
      ...base,
      outcome: "succeeded",
      sentence: `With no Vice President, ${personName(person)}, the ${successor.office}, resigned from Congress and is acting as President for the rest of the term.`,
    },
  };
}

/**
 * § 1 for a presidency held by tenure record: the Vice President becomes
 * President for the rest of the term, and the vice presidency falls vacant.
 */
function tenureSuccession(
  world: World,
  notice: OfficeContinuityNoticeInput,
  base: { readonly officeKey: string; readonly title: string },
  vicePersonId: EntityId,
  termEnd: IsoDate,
): { world: World; ruling: OfficeContinuityRuling } {
  const death = world.history.personDeaths.find(
    (row) => row.id === notice.sourceRecordId,
  );
  if (!death)
    return {
      world,
      ruling: {
        ...base,
        outcome: "blocked",
        sentence: "The death this notice reports is not in the record.",
      },
    };
  const successor = world.people[vicePersonId]!;
  const former = world.people[death.personId];
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:president-by-succession:${death.id}`;
  let next = world;
  if (!next.history.events.some((event) => event.stableKey === stableKey))
    next = recordWorldEvent(next, {
      stableKey,
      type: FEDERAL_TENURE_EVENT,
      occurredAt: death.diedAt,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [vicePersonId],
      participants: [
        {
          personId: vicePersonId,
          role: "focus:subject",
          detail: "President of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        OFFICE_CONTINUITY_VERSION,
        "office:us-president",
        `term-end:${termEnd}`,
        "basis:us-const-amend-xxv-s1",
      ],
      summary: `${personName(successor)} became President of the United States${former ? ` on the death of ${personName(former)}` : ""}, and serves the rest of the term.`,
      context: CONTEXT,
    });
  next = openVicePresidentialVacancy(next, {
    vacancyDate: death.diedAt,
    formerHolderId: vicePersonId,
    presidentId: vicePersonId,
    cause: "became-president",
  });
  return {
    world: next,
    ruling: {
      ...base,
      outcome: "succeeded",
      sentence: `${personName(successor)} became President under the Twenty-Fifth Amendment. ${VICE_PRESIDENCY_VACANT_SENTENCE}`,
    },
  };
}

function governorOffice(officeKey: string) {
  return US_STATE_USPS.map((usps) => stateExecutiveOffice(usps)).find(
    (office) => office?.officeKey === officeKey,
  );
}

function rulingFor(
  world: World,
  notice: OfficeContinuityNoticeInput,
  office: OfficeContinuityNoticeInput["offices"][number],
): { world: World; ruling: OfficeContinuityRuling } {
  const base = { officeKey: office.officeKey, title: office.title };
  if (office.officeKey === "us-president")
    return presidentialRuling(world, notice, office);
  if (notice.kind !== "death")
    return {
      world,
      ruling: {
        ...base,
        outcome: "no-change",
        sentence:
          "Illness does not remove anyone from this office; it stays with its holder.",
      },
    };
  if (office.officeKey === "us-vice-president") {
    const president = currentPresidentOf(world);
    return {
      world: openVicePresidentialVacancy(world, {
        vacancyDate: notice.effectiveDate,
        formerHolderId: notice.personId,
        presidentId: president?.personId ?? null,
        cause: "vice-president-died",
      }),
      ruling: {
        ...base,
        outcome: "vacant",
        sentence: president
          ? VICE_PRESIDENCY_VACANT_SENTENCE
          : "The vice presidency is vacant, and with no sitting President there is nobody to nominate a successor.",
      },
    };
  }
  if (office.officeKey === "us-chief-justice") {
    const opened = openChiefJusticeVacancy(world, {
      vacancyDate: notice.effectiveDate,
      formerHolderId: notice.personId,
    });
    return {
      world: opened.world,
      ruling: {
        ...base,
        outcome: "vacant",
        sentence: opened.presidentId
          ? CHIEF_JUSTICESHIP_VACANT_SENTENCE
          : "The office of Chief Justice is vacant, and with no sitting President there is nobody to nominate a successor.",
      },
    };
  }
  if (office.officeKey.startsWith(`${SUPREME_COURT_ID}:seat:`)) {
    const opened = openAssociateJusticeVacancy(world, {
      seatId: office.officeKey,
      vacancyDate: notice.effectiveDate,
      formerHolderId: notice.personId,
      reason: "death",
    });
    return {
      world: opened.world,
      ruling: {
        ...base,
        outcome: "vacant",
        sentence: opened.presidentId
          ? "The seat on the Supreme Court is vacant until the Senate confirms the President's nominee."
          : "The seat on the Supreme Court is vacant, and with no sitting President there is nobody to nominate a successor.",
      },
    };
  }
  const seat = seatFor(office.officeKey);
  if (seat) return vacateSeat(world, seat, MEMBER_DIED(notice.effectiveDate));
  const governorship = governorOffice(office.officeKey);
  if (governorship) {
    // PLACEHOLDER (governor-succession.ts): the next officer in line serves
    // the rest of the term.
    const seated = seatGovernorSuccessor(world, governorship, {
      vacancyDate: notice.effectiveDate,
      formerHolderId: notice.personId,
      formerTermEvidenceId: office.termEvidenceId,
    });
    const successor = seated.successorId
      ? seated.world.people[seated.successorId]
      : undefined;
    return successor
      ? {
          world: seated.world,
          ruling: {
            ...base,
            outcome: "succeeded",
            sentence: `${personName(successor)} succeeded to the office of ${governorship.displayName} and serves the rest of the term.`,
          },
        }
      : {
          world,
          ruling: {
            ...base,
            outcome: "blocked",
            sentence: `${governorship.displayName} is vacant, and no record of the office exists to seat a successor in.`,
          },
        };
  }
  return {
    world,
    ruling: {
      ...base,
      outcome: "blocked",
      // PLACEHOLDER: how this office is filled is not compiled. The sentence
      // is printed to players and says only what happened.
      sentence: "The office is vacant, and no successor has taken office.",
    },
  };
}

/**
 * THE VICE PRESIDENCY FALLS VACANT — Twenty-Fifth Amendment, § 2: "Whenever
 * there is a vacancy in the office of the Vice President, the President shall
 * nominate a Vice President who shall take office upon confirmation by a
 * majority vote of both Houses of Congress."
 *
 * The route is law; its pace and its choices are not, and each is marked:
 *
 * PLACEHOLDER (filed as `vice-presidential-vacancy-nomination-and-confirmation`):
 * - how long a President takes to name a nominee, and how long Congress takes
 *   to confirm one. The two times it has happened took 57 days (1973) and
 *   121 days (1974) from nomination to confirmation; the profile below sits
 *   between them and is not a finding.
 * - eligibility is incomplete. The President's existing appointment decision
 *   selects among recorded colleagues and contacts. Without a selection, the
 *   nomination is blocked and the office stays vacant. The eligible pool excludes
 *   the President, the player's own character, who would have to be asked, and
 *   sitting governors. Citizenship and fourteen years' residence are not recorded on a person,
 *   so they are not checked. A nominee who sat in Congress leaves the seat,
 *   which is then filled the way any vacated seat is.
 * - how Congress votes. The amendment requires a majority of both houses.
 *   Blanket rule meanwhile: both houses confirm, as they did both times.
 */
export const VICE_PRESIDENT_NOMINATION =
  "governing:vice-president-nomination" as const;
export const VICE_PRESIDENT_CONFIRMATION =
  "governing:vice-president-confirmation" as const;
export const VICE_PRESIDENT_NOMINATED_EVENT =
  "governing.vice-president-nominated" as const;

export const VICE_PRESIDENTIAL_VACANCY_PROFILE = {
  id: "ocd-vice-presidential-vacancy-game-profile/v1",
  daysFromVacancyToNomination: 10,
  daysFromNominationToConfirmation: 75,
} as const;

/** U.S. Const. art. II, § 1, cl. 5, read with amend. XII. */
const VICE_PRESIDENT_MINIMUM_AGE = 35;

const VICE_PRESIDENCY_VACANT_SENTENCE =
  "The vice presidency is vacant until the President's nominee is confirmed by both houses of Congress.";

type VicePresidentialVacancyCause = "vice-president-died" | "became-president";

function vicePresidencyHeld(world: World): boolean {
  return (
    nationalOfficeHolder(world, "vice-president") !== null ||
    currentFederalTenure(world, "us-vice-president") !== null
  );
}

/** When the sitting President's term ends, by either record. */
function presidentialTermEnd(world: World): IsoDate | null {
  const elected = nationalOfficeHolder(world, "president");
  if (elected) return elected.plan.endsAt.date;
  return currentFederalTenure(world, "us-president")?.endExclusive ?? null;
}

function nominationKey(vacancyDate: IsoDate, after: IsoDate): string {
  return `${OFFICE_CONTINUITY_VERSION}:vp-nomination:${vacancyDate}:${after}`;
}

function scheduleNomination(
  world: World,
  vacancyDate: IsoDate,
  presidentId: EntityId,
): World {
  const stableKey = nominationKey(vacancyDate, world.currentDate);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(
      world.currentDate,
      VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromVacancyToNomination,
    ),
    transitionKey: VICE_PRESIDENT_NOMINATION,
    entityIds: [presidentId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}: the President nominates a Vice President (U.S. Const. amend. XXV, § 2); the ${VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromVacancyToNomination}-day interval is a game profile.`,
    },
  });
}

/**
 * Records that the vice presidency is vacant and puts the President's
 * nomination on the calendar. Once per vacancy.
 */
function openVicePresidentialVacancy(
  world: World,
  input: {
    readonly vacancyDate: IsoDate;
    readonly formerHolderId: EntityId;
    readonly presidentId: EntityId | null;
    readonly cause: VicePresidentialVacancyCause;
  },
): World {
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:vp-vacancy:${input.vacancyDate}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const former = world.people[input.formerHolderId];
  let next = recordWorldEvent(world, {
    stableKey,
    type: FEDERAL_VACANCY_EVENT,
    occurredAt: input.vacancyDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.formerHolderId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OFFICE_CONTINUITY_VERSION,
      "office:us-vice-president",
      `vacancy-cause:${input.cause}`,
    ],
    summary:
      input.cause === "became-president"
        ? `The vice presidency is vacant: ${former ? personName(former) : "the Vice President"} became President.`
        : `The vice presidency is vacant after the death of ${former ? personName(former) : "the Vice President"}.`,
    context: CONTEXT,
  });
  if (input.presidentId)
    next = scheduleNomination(next, input.vacancyDate, input.presidentId);
  return next;
}

function resolved(
  world: World,
  context: string,
  outcomeEventId: EntityId | null = null,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  };
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

/** The President names a nominee. */
export function vicePresidentNominationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /:vp-nomination:(\d{4}-\d{2}-\d{2}):/.exec(due.stableKey);
  if (!match) return resolved(world, "No vacancy matches this nomination.");
  const vacancyDate = makeIsoDate(match[1]!);
  if (vicePresidencyHeld(world))
    return resolved(world, "The vice presidency is already filled.");
  const president = currentPresidentOf(world);
  if (!president)
    return resolved(
      world,
      "There is no sitting President to nominate a Vice President.",
    );
  // Eligibility remains incomplete (see the profile above).
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  // A sitting governor is not eligible here: the game has no route for them to give
  // up the governorship.
  const governors = new Set(
    currentStateExecutiveHolders(world).map((holder) => holder.personId),
  );
  const pool = Object.values(world.people)
    .filter(
      (person) =>
        person.id !== president.personId &&
        person.id !== controlled &&
        !governors.has(person.id) &&
        !dead.has(person.id) &&
        ageOn(person.birthDate, world.currentDate) >=
          VICE_PRESIDENT_MINIMUM_AGE,
    )
    .map((person) => person.id)
    .sort();
  if (!pool.length)
    return resolved(world, "Nobody in the World is eligible to be nominated.");
  // The President names someone they know: the people the game records them
  // knowing, anyone they owe or who owes them, and the members of Congress
  // and the governors they work with (appointments-v1). An empty decision
  // does not authorize naming someone else.
  const eligible = new Set(pool);
  const choice = chooseAppointee(world, {
    stableKey: due.stableKey,
    appointerPersonId: president.personId,
    post: VICE_PRESIDENT_POST,
    circle: appointmentCircle(
      world,
      president.personId,
      federalColleaguesOf(world),
    ),
    eligible: (personId) => eligible.has(personId),
  });
  if (!choice)
    return {
      world,
      status: "blocked",
      reasonKey: "government:vice-president-no-nominee",
      context:
        "The President has not selected a nominee; the vice presidency remains vacant.",
      outcomeEventId: null,
    };
  const nomineeId = choice.personId;
  const chosenWorld = recordPassedOver(choice.world, {
    stableKey: due.stableKey,
    appointerPersonId: president.personId,
    passedOver: choice.passedOver,
    post: VICE_PRESIDENT_POST,
  });
  const nominee = { personId: nomineeId };
  const presidentName = personName(world.people[president.personId]!);
  const nomineeName = personName(world.people[nominee.personId]!);
  let next = recordWorldEvent(chosenWorld, {
    stableKey: `${due.stableKey}:nominated`,
    type: VICE_PRESIDENT_NOMINATED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [president.personId, nominee.personId],
    participants: [
      {
        personId: president.personId,
        role: "focus:actor",
        detail: "President",
      },
      {
        personId: nominee.personId,
        role: "focus:subject",
        detail: "Nominee for Vice President",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OFFICE_CONTINUITY_VERSION,
      "office:us-vice-president",
      `vacancy:${vacancyDate}`,
      `provenance:${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}`,
    ],
    summary: `President ${presidentName} nominated ${nomineeName} to be Vice President. Both houses of Congress must confirm the nomination.`,
    context: CONTEXT,
  });
  const nominatedEventId = next.history.events.at(-1)!.id;
  next = scheduleFutureDueItem(next, {
    stableKey: `${OFFICE_CONTINUITY_VERSION}:vp-confirmation:${vacancyDate}:${nominee.personId}`,
    dueAt: addDays(
      next.currentDate,
      VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromNominationToConfirmation,
    ),
    transitionKey: VICE_PRESIDENT_CONFIRMATION,
    entityIds: [nominee.personId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}: both houses vote on the nomination (U.S. Const. amend. XXV, § 2); the ${VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromNominationToConfirmation}-day interval and the confirmation are a game profile.`,
    },
  });
  return resolved(next, `${nomineeName} was nominated.`, nominatedEventId);
}

const VICE_PRESIDENT_POST = {
  officeKey: "us-vice-president",
  title: "Vice President of the United States",
} as const;

/** The seat in Congress a person holds today, if any. */
function congressSeatHeldBy(
  world: World,
  personId: EntityId,
): CongressSeat | undefined {
  const congress = projectCongress(world);
  const held = [
    ...(congress?.house.seats ?? []),
    ...(congress?.senate.seats ?? []),
  ].find(
    (seat) =>
      seat.occupant.kind === "member" &&
      seat.occupant.member.personId === personId,
  );
  return held
    ? congressSeats().find((candidate) => candidate.seatKey === held.seatKey)
    : undefined;
}

/** The Senate votes on an associate justice, who leaves any seat in Congress. */
export function associateJusticeConfirmationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  return confirmAssociateJustice(world, due, (next, personId) => {
    const seat = congressSeatHeldBy(next, personId);
    return seat
      ? vacateSeat(next, seat, {
          effectiveDate: next.currentDate,
          key: "member-became-justice",
          clause: "after the member joined the Supreme Court",
        }).world
      : next;
  });
}

/** The Senate confirms a Chief Justice, who leaves any seat in Congress. */
export function chiefJusticeConfirmationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  return confirmChiefJustice(world, due, (next, personId) => {
    const seat = congressSeatHeldBy(next, personId);
    return seat
      ? vacateSeat(next, seat, {
          effectiveDate: next.currentDate,
          key: "member-became-chief-justice",
          clause: "after the member became Chief Justice",
        }).world
      : next;
  });
}

/** Both houses confirm; the nominee takes office for the rest of the term. */
export function vicePresidentConfirmationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /:vp-confirmation:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(
    due.stableKey,
  );
  if (!match) return resolved(world, "No nomination matches.");
  const vacancyDate = makeIsoDate(match[1]!);
  const nomineeId = match[2]! as EntityId;
  if (vicePresidencyHeld(world))
    return resolved(world, "The vice presidency is already filled.");
  const termEnd = presidentialTermEnd(world);
  if (!termEnd || world.currentDate >= termEnd)
    return resolved(world, "The term ended before the vote.");
  const nominee = world.people[nomineeId];
  const dead = world.history.personDeaths.some(
    (death) =>
      death.personId === nomineeId && death.diedAt <= world.currentDate,
  );
  if (!nominee || dead) {
    const president = currentPresidentOf(world);
    return resolved(
      president
        ? scheduleNomination(world, vacancyDate, president.personId)
        : world,
      "The nominee died before the vote; the President nominates again.",
    );
  }
  // The seat in Congress the nominee leaves, if any, read before they take
  // the new office.
  const heldSeat = congressSeatHeldBy(world, nomineeId);
  const nominatingPresident = nominatorOf(
    world,
    VICE_PRESIDENT_NOMINATED_EVENT,
    `vacancy:${vacancyDate}`,
    nomineeId,
  );
  let next = recordWorldEvent(world, {
    stableKey: `${due.stableKey}:confirmed`,
    type: FEDERAL_TENURE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: nominatingPresident
      ? [nomineeId, nominatingPresident]
      : [nomineeId],
    participants: [
      {
        personId: nomineeId,
        role: "focus:subject",
        detail: "Vice President of the United States",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OFFICE_CONTINUITY_VERSION,
      "office:us-vice-president",
      `term-end:${termEnd}`,
      "basis:us-const-amend-xxv-s2",
      `vacancy:${vacancyDate}`,
      `provenance:${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}`,
    ],
    summary: `Both houses of Congress confirmed ${personName(nominee)} as Vice President of the United States, to serve the rest of the term.`,
    context: CONTEXT,
  });
  const confirmedEventId = next.history.events.at(-1)!.id;
  // The appointment is a favor from the President who named them, written
  // when it takes effect: a nomination that fails gave nothing.
  if (nominatingPresident)
    next = recordAppointmentFavor(next, {
      stableKey: `${due.stableKey}:appointed`,
      appointerPersonId: nominatingPresident,
      appointeePersonId: nomineeId,
      post: VICE_PRESIDENT_POST,
      eventId: confirmedEventId,
      subject: { kind: "none" },
    });
  if (heldSeat)
    next = vacateSeat(next, heldSeat, {
      effectiveDate: next.currentDate,
      key: "member-became-vice-president",
      clause: "after the member became Vice President",
    }).world;
  return resolved(
    next,
    `${personName(nominee)} was confirmed as Vice President.`,
    confirmedEventId,
  );
}

/**
 * Applies each notice once. Safe to call from a UI read and a due runner:
 * a notice already consumed at this version writes nothing.
 */
export function applyOfficeContinuityNotices(
  world: World,
  notices: readonly OfficeContinuityNoticeInput[],
): World {
  let next = world;
  for (const notice of [...notices].sort((a, b) => a.sequence - b.sequence)) {
    const stableKey = consumedKey(notice);
    if (next.history.events.some((event) => event.stableKey === stableKey))
      continue;
    if (!notice.offices.length) continue;
    const rulings: OfficeContinuityRuling[] = [];
    for (const office of notice.offices) {
      const applied = rulingFor(next, notice, office);
      next = applied.world;
      rulings.push(applied.ruling);
    }
    const person = next.people[notice.personId];
    next = recordWorldEvent(next, {
      stableKey,
      type: OFFICE_CONTINUITY_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [
        ...new Set([
          notice.personId,
          ...notice.offices.flatMap((office) =>
            office.organizationId ? [office.organizationId] : [],
          ),
        ]),
      ].sort(),
      participants: [],
      personFactConstraints: [],
      visibility: notice.visibility,
      tags: [
        OFFICE_CONTINUITY_VERSION,
        `continuity-change:${notice.kind}`,
        `crisis-notice:${notice.noticeKey}`,
        `crisis-origin:${notice.originEventId}`,
        ...rulings.flatMap((ruling) => [
          `office:${ruling.officeKey}`,
          `outcome:${ruling.officeKey}:${ruling.outcome}`,
        ]),
      ],
      summary: rulings
        .map(
          (ruling) =>
            `${person ? `${personName(person)}, ${ruling.title}.` : `${ruling.title}.`} ${ruling.sentence}`,
        )
        .join(" "),
      context: CONTEXT,
    });
  }
  return next;
}

const LAST_APPLIED_NOTICE = new WeakMap<readonly unknown[], number>();

function lastAppliedNoticeSequence(world: World): number {
  const events = world.history.events;
  const cached = LAST_APPLIED_NOTICE.get(events);
  if (cached !== undefined) return cached;
  let sequence = -1;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (event.type !== OFFICE_CONTINUITY_EVENT) continue;
    const key = event.tags
      .find((tag) => tag.startsWith("crisis-notice:"))
      ?.slice("crisis-notice:".length);
    const record = key
      ? crisisRecords(world).find((candidate) => candidate.stableKey === key)
      : undefined;
    if (record) {
      sequence = record.sequence;
      break;
    }
  }
  LAST_APPLIED_NOTICE.set(events, sequence);
  return sequence;
}

/** Consume recorded office changes through the existing exactly-once writer. */
export function applyRecordedOfficeContinuity(world: World): World {
  if (
    !crisisRecords(world).some(
      (record) => record.kind === "official-continuity",
    )
  )
    return world;
  const notices = crisisOfficeContinuityNotices(world, {
    afterSequence: lastAppliedNoticeSequence(world),
  });
  return notices.length ? applyOfficeContinuityNotices(world, notices) : world;
}

/**
 * One clock entry for office terms and recorded vacancies. The office-specific
 * election and seating writers keep their existing legal rules. The intervening
 * legislative work runs before crisis notices, as it did in the date boundary.
 * No outer date guard: presidential entry can fall at noon on the same date,
 * and an already recorded death must reach its office without another day.
 */
export function applyOfficeLifecycle(
  before: IsoDate,
  world: World,
  afterTermTurnover: (world: World) => World,
): World {
  let next = world;
  next = applyCongressTurnover(before, next);
  next = applyGovernorTurnover(before, next);
  next = applyPresidentialTurnover(before, next);
  next = applyConstitutionalReform(before, next);
  return applyRecordedOfficeContinuity(afterTermTurnover(next));
}

/** What the record says followed for one office, newest first. */
export function officeContinuityRulings(
  world: World,
  officeKey?: string,
): readonly {
  readonly eventId: EntityId;
  readonly date: IsoDate;
  readonly personId: EntityId | null;
  readonly officeKey: string;
  readonly outcome: OfficeContinuityOutcome;
}[] {
  return world.history.events
    .filter((event) => event.type === OFFICE_CONTINUITY_EVENT)
    .flatMap((event) =>
      event.tags
        .filter((tag) => tag.startsWith("outcome:"))
        .map((tag) => {
          const body = tag.slice("outcome:".length);
          const cut = body.lastIndexOf(":");
          return {
            eventId: event.id,
            date: event.occurredAt,
            personId:
              event.involvedEntityIds.find((id) => world.people[id]) ?? null,
            officeKey: body.slice(0, cut),
            outcome: body.slice(cut + 1) as OfficeContinuityOutcome,
          };
        }),
    )
    .filter((row) => !officeKey || row.officeKey === officeKey)
    .reverse();
}

export function officeContinuityHandlers() {
  return [
    [HOUSE_SPECIAL_ELECTION, houseSpecialElectionHandler],
    [SENATE_APPOINTMENT, senateAppointmentHandler],
    [VICE_PRESIDENT_NOMINATION, vicePresidentNominationHandler],
    [VICE_PRESIDENT_CONFIRMATION, vicePresidentConfirmationHandler],
    [CHIEF_JUSTICE_NOMINATION, chiefJusticeNominationHandler],
    [CHIEF_JUSTICE_CONFIRMATION, chiefJusticeConfirmationHandler],
    [ASSOCIATE_JUSTICE_NOMINATION, associateJusticeNominationHandler],
    [ASSOCIATE_JUSTICE_CONFIRMATION, associateJusticeConfirmationHandler],
  ] as const;
}
