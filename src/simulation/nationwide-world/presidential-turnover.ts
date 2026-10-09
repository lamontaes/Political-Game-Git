import { researchRuleTable } from "../research-rule-tables";
import { candidacyEligibility } from "../candidacy";
import { currentStateExecutiveHolders } from "./state-executives";
import { decideSelfStarterRun } from "../nominations/field-entry";
import {
  holdNominationPrimary,
  nominationNominees,
  type NominationEntrant,
} from "../nominations/party-nominations";
import { stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import { decideAnotherTerm } from "../careers/another-term";
import { currentPresidentOf } from "../crisis/offices";
import { addDays, compareSimulationMoments, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "../living-world/opening";
import {
  projectCongress,
  publicPartyAffiliation,
} from "../living-world/congress";
import { SETTING_PARTY_NAMES } from "../living-world/party-registry";
import {
  applyNationalTermTransitions,
  nationalOfficeHolder,
  planNationalOfficeTerm,
  scheduleNationalCount,
} from "../national-election-consumer";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
  nationalUnitJurisdiction,
} from "../national-election-geography";
import {
  CONTINGENT_STATES,
  FIRST_NATIONAL_CYCLE,
  nationalElectionRules,
} from "../national-election-rules";
import {
  appendNationalRecord,
  nationalAllocation,
  recordContingentChoice,
  nationalOutcome,
  nationalPersonAlive,
  nationalRecords,
  registerNationalElection,
} from "../national-elections";
import type {
  NationalElection,
  NationalElectoralCount,
  NationalTermPlan,
  NationalUnitResult,
  PresidentialTicket,
} from "../national-election-types";
import { countRecordedVoterBallots } from "../election-contests";
import { recordedDistrictMembership } from "../district-residence";
import { districtIdentityCatalog } from "../../districts/catalog";
import { resolveDistrictBinding } from "../../districts/query";
import { politicalStartingConditions } from "../world-setup/conditions";
import { recordWorldEvent } from "../world";
import {
  FEDERAL_TENURE_EVENT,
  currentFederalTenure,
  federalTenureEnd,
} from "../federal-tenures";
import {
  FEDERAL_JURISDICTION_KEY,
  ruleValueInWorld,
  type TermLimitRule,
} from "../enacted-rule-changes";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";

/** Presidential elections follow dated national records. Nominees are existing
 * eligible people admitted through the shared field-entry and primary engines.
 * Popular results count residents' current candidate views through the same
 * counter as local elections. Calibration shares never supply ballots.
 * District electors require actual district-membership records. An unread
 * preference, empty field or tied nomination creates no invented winner.
 */
const presidentialData = researchRuleTable("presidentialRules");

export const PRESIDENTIAL_TURNOVER_VERSION = "presidential-turnover/v1";

export const PRESIDENTIAL_TURNOVER_PROFILE = {
  id: "ocd-presidential-turnover-game-profile/v1",
  /** The nominating field closes this many days before election day. */
  fieldClosesDaysBefore: presidentialData.nomination.fieldClosesDaysBefore,
} as const;

/** U.S. Const. art. II, § 1, cl. 5. */
export const PRESIDENTIAL_MINIMUM_AGE = presidentialData.eligibility.minimumAge;
/** U.S. Const. amend. XXII, § 1: elected no more than twice. */
export const TWENTY_SECOND_AMENDMENT_LIMIT: TermLimitRule = Object.freeze({
  maxConsecutiveTerms: null,
  maxLifetimeTerms: presidentialData.eligibility.maxLifetimeTerms,
  lookbackYears: null,
});

/** The office key the rule layer and constitutional measures use for the presidency. */
export const PRESIDENT_OFFICE_KEY = "us-president";

export const PRESIDENTIAL_FIELD_CLOSE =
  "governing:presidential-field-close" as const;
export const PRESIDENTIAL_ELECTION_DAY =
  "governing:presidential-election-day" as const;
export const PRESIDENTIAL_ELECTORS_MEET =
  "governing:presidential-electors-meet" as const;
export const PRESIDENTIAL_TERM_PLAN =
  "governing:presidential-term-plan" as const;

/** Ticket order in every registered election: a party's ticket is at its index. */
const PARTIES = ["democratic", "republican"] as const;
type MajorParty = (typeof PARTIES)[number];

const NOMINATION_EVENT = "election.presidential-nomination";
const RESULT_EVENT = "election.presidential-popular-vote";
const COUNT_EVENT = "election.presidential-electoral-count";

function cycleKey(cycle: number): string {
  return `${PRESIDENTIAL_TURNOVER_VERSION}:${cycle}`;
}

function cycleForDue(due: FutureDueItem): number | null {
  const match = /^presidential-turnover\/v1:(\d{4}):/.exec(due.stableKey);
  return match ? Number(match[1]) : null;
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

function electionForCycle(
  world: World,
  cycle: number,
): NationalElection | null {
  return (
    (world.history.nationalElections ?? []).find(
      (election) => election.cycle === cycle,
    ) ?? null
  );
}

function fieldClosingDate(electionDay: IsoDate): IsoDate {
  return addDays(
    electionDay,
    -PRESIDENTIAL_TURNOVER_PROFILE.fieldClosesDaysBefore,
  );
}

/**
 * A world whose opening seated a President. Worlds built without one (the
 * demo, and fixtures that register their own national elections) keep
 * exactly the records they supply.
 */
export function hasPresidency(world: World): boolean {
  return world.history.events.some(
    (event) =>
      event.type === "world.office-tenure" &&
      event.tags.includes("office:us-president"),
  );
}

/** The first presidential election whose day is still ahead. */
export function nextPresidentialCycle(world: World): number {
  const year = Number(world.currentDate.slice(0, 4));
  let cycle = Math.max(FIRST_NATIONAL_CYCLE, Math.ceil(year / 4) * 4);
  while (nationalElectionRules(cycle).electionDate <= world.currentDate)
    cycle += 4;
  return cycle;
}

/** A person's public party, read from their recorded affiliation. */
function partyOf(world: World, personId: EntityId): MajorParty | null {
  const affiliation = publicPartyAffiliation(world, personId);
  for (const party of PARTIES) {
    const organizationId = livingWorldOrganizationId(
      world,
      LIVING_WORLD_KEYS.nationalParty(party),
    );
    if (affiliation === organizationId) return party;
  }
  return null;
}

/**
 * The sitting Vice President: elected, else whoever the federal tenure
 * records seat (the opening one, or a successor confirmed to a vacancy).
 */
function currentVicePresident(world: World): EntityId | null {
  const elected = nationalOfficeHolder(world, "vice-president");
  if (elected) return elected.plan.personId;
  return currentFederalTenure(world, "us-vice-president")?.personId ?? null;
}

/**
 * Terms counted against the Twenty-Second Amendment: every presidential term
 * a person was elected to, the opening one included, plus a succession that
 * left them more than two years of a predecessor's term.
 */
export function presidentialTermsCounted(
  world: World,
  personId: EntityId,
  /** Count only terms beginning on or after this date (an amendment that does not count prior service). */
  since: IsoDate | null = null,
): number {
  const counts = (startsAt: IsoDate) => since === null || startsAt >= since;
  // A tenure record is the opening's own term, or a successor's remainder of
  // someone else's (its `term-end:` tag); a remainder counts only when more
  // than two years of it were left, as a national succession does below.
  const opening = world.history.events.filter((event) => {
    if (
      event.type !== FEDERAL_TENURE_EVENT ||
      !event.tags.includes("office:us-president") ||
      !counts(event.occurredAt) ||
      !event.participants.some(
        (participant) =>
          participant.role === "focus:subject" &&
          participant.personId === personId,
      )
    )
      return false;
    const endsAt = federalTenureEnd("us-president", event);
    return (
      !event.tags.some((tag) => tag.startsWith("term-end:")) ||
      (endsAt !== null && addDays(event.occurredAt, 365 * 2) < endsAt)
    );
  }).length;
  const records = nationalRecords(world);
  const elected = records.filter(
    (record) =>
      record.kind === "term-plan" &&
      record.office === "president" &&
      record.personId === personId &&
      counts(record.startsAt.date),
  ).length;
  const succeeded = records.filter((record) => {
    if (
      record.kind !== "succession" ||
      record.personId !== personId ||
      !counts(record.effectiveAt.date)
    )
      return false;
    const vacated = records.find(
      (plan): plan is NationalTermPlan =>
        plan.kind === "term-plan" && plan.id === record.vacatedPlanId,
    );
    return (
      vacated !== undefined &&
      addDays(record.effectiveAt.date, 365 * 2) < vacated.endsAt.date
    );
  }).length;
  return opening + elected + succeeded;
}

/** The presidential term limit governing a term beginning on a date, as this World's law has it. */
export interface PresidentialTermLimit {
  /** Null: no limit. */
  readonly limit: TermLimitRule | null;
  /** The instrument that sets it, for a plain reason. */
  readonly designation: string;
  /** Terms beginning before this date are not counted; null counts every term. */
  readonly countsFrom: IsoDate | null;
}

export function presidentialTermLimitAt(
  world: World,
  termStartsAt: IsoDate,
): PresidentialTermLimit {
  const resolved = ruleValueInWorld(
    world,
    {
      jurisdiction: FEDERAL_JURISDICTION_KEY,
      officeKey: PRESIDENT_OFFICE_KEY,
      field: "executive.term.limit",
      onDate: termStartsAt,
    },
    TWENTY_SECOND_AMENDMENT_LIMIT as TermLimitRule | null,
  );
  if (resolved.source === "compiled")
    return {
      limit: resolved.value,
      designation: "the Twenty-Second Amendment",
      countsFrom: null,
    };
  return {
    limit: resolved.value as TermLimitRule | null,
    designation: `the Constitution as amended in ${resolved.effectiveAt.slice(0, 4)}`,
    countsFrom:
      resolved.applicability.countsPriorService === false
        ? resolved.effectiveAt
        : null,
  };
}

/** Why a person may not be elected President for a term, or null when they may. */
export function presidentialTermBar(
  world: World,
  personId: EntityId,
  termStartsAt: IsoDate,
): string | null {
  const { limit, designation, countsFrom } = presidentialTermLimitAt(
    world,
    termStartsAt,
  );
  const cap = limit?.maxLifetimeTerms ?? null;
  if (cap === null) return null;
  return presidentialTermsCounted(world, personId, countsFrom) >= cap
    ? `they have served the ${cap === 1 ? "one term" : `${cap} terms`} ${designation} allows.`
    : null;
}

/** A person's recorded home state or territory. */
function homeState(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  const key = person
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)?.stateJurisdictionKey
    : null;
  const usps = key?.startsWith("US-") ? key.slice(3) : null;
  return usps && Object.hasOwn(STATES, usps) ? usps : null;
}

interface Nominee {
  readonly personId: EntityId;
  readonly state: string;
}

/** No new people: the existing filed campaigns and officeholders supply the field. */
export function nominatePresidentialField(
  world: World,
  cycle: number,
): {
  world: World;
  nominees: readonly { party: string; personId: EntityId }[];
} {
  let next = world;
  const key = `${cycleKey(cycle)}:field`;
  const incumbent = incumbentStands(next, cycle);
  next = incumbent.world;
  const congress = projectCongress(next);
  const pool = new Set<EntityId>([
    ...currentStateExecutiveHolders(next).map((x) => x.personId),
    ...[
      ...(congress?.house.seats ?? []),
      ...(congress?.senate.seats ?? []),
    ].flatMap((x) =>
      x.occupant.kind === "member" ? [x.occupant.member.personId] : [],
    ),
    ...(next.history.campaigns ?? [])
      .filter((x) => x.officeKey === PRESIDENT_OFFICE_KEY)
      .map((x) => x.candidatePersonId),
    ...(currentVicePresident(next) ? [currentVicePresident(next)!] : []),
    ...(incumbent.personId ? [incumbent.personId] : []),
  ]);
  const entrants: NominationEntrant[] = [];
  for (const personId of [...pool].sort()) {
    const party = partyOf(next, personId);
    const state = homeState(next, personId);
    if (
      !party ||
      !state ||
      !nationalPersonAlive(next, personId) ||
      !candidacyEligibility(next, {
        personId,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        officeKey: PRESIDENT_OFFICE_KEY,
        alreadyACandidate: false,
      }).eligible ||
      presidentialTermBar(next, personId, makeIsoDate(`${cycle + 1}-01-20`))
    )
      continue;
    const filed = (next.history.campaigns ?? []).some(
      (x) =>
        x.candidatePersonId === personId &&
        x.officeKey === PRESIDENT_OFFICE_KEY,
    );
    if (personId === incumbent.personId) {
      if (incumbent.party !== party && !filed) continue;
    } else if (!filed) {
      if (next.control.kind === "person" && next.control.personId === personId)
        continue;
      const decision = decideSelfStarterRun(next, {
        stableKey: `${key}:${personId}:entry`,
        decisionType: "election.consider-primary",
        personId,
        seatKey: PRESIDENT_OFFICE_KEY,
        intakeDate: next.currentDate,
        considerations: [
          {
            stableKey: `${key}:${personId}:office`,
            optionKey: "run",
            sourceType: "context:current-office",
            direction: "supports",
            importance: "moderate",
            confidence: "high",
            explanation:
              currentStateExecutiveHolders(next).find(
                (x) => x.personId === personId,
              )?.title ??
              [
                ...(congress?.house.seats ?? []),
                ...(congress?.senate.seats ?? []),
              ].flatMap((x) =>
                x.occupant.kind === "member" &&
                x.occupant.member.personId === personId
                  ? [x.occupant.member.title]
                  : [],
              )[0] ??
              presidentialData.office.title,
            sourceRefs: [],
          },
        ],
      });
      next = decision.world;
      if (!decision.runs) continue;
    }
    entrants.push({
      personId,
      party,
      incumbent: personId === incumbent.personId,
      partyBacked: false,
    });
  }
  if (!entrants.length) return { world: next, nominees: [] };
  next = holdNominationPrimary(next, {
    stableKey: key,
    seatKey: PRESIDENT_OFFICE_KEY,
    title: presidentialData.office.title,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    involvedEntityIds: entrants.map((x) => x.personId),
    entrants,
    partyShare: () => null,
    plan: {
      known: true,
      stateUsps: "US",
      family: "us-president",
      year: cycle,
      method: "party-primary",
      primaryDate: next.currentDate,
      dateBasis: "estimated-from-average",
      estimated: ["primary-date"],
      runoff: null,
      advance: 1,
      filingDeadline: next.currentDate,
      filingBasis: "estimated-from-average",
    },
    recordedVoters: {
      jurisdictionIds: Object.keys(STATES).map(
        (code) => stateJurisdictionForKey(`US-${code}`)!.id,
      ),
      admitVoter: (personId, party) => partyOf(next, personId) === party,
    },
  });
  return { world: next, nominees: nominationNominees(next, key) ?? [] };
}

function chooseRunningMate(
  world: World,
  cycle: number,
  president: Nominee,
  party: string,
): Nominee | null {
  const candidates = world.personOrder.filter(
    (personId) =>
      personId !== president.personId &&
      partyOf(world, personId) === party &&
      homeState(world, personId) !== null &&
      nationalPersonAlive(world, personId) &&
      candidacyEligibility(world, {
        personId,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        officeKey: PRESIDENT_OFFICE_KEY,
        alreadyACandidate: false,
      }).eligible,
  );
  if (!candidates.length) return null;
  const home = world.people[president.personId]!.homeJurisdictionId;
  const count = countRecordedVoterBallots(world, {
    stableKey: `${cycleKey(cycle)}:${president.personId}:running-mate`,
    jurisdictionId: home,
    electionDate: world.currentDate,
    candidatePersonIds: candidates,
    admitVoter: (personId) => personId === president.personId,
  });
  return count?.winnerPersonId
    ? {
        personId: count.winnerPersonId,
        state: homeState(world, count.winnerPersonId)!,
      }
    : null;
}

function personName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? `${person.givenName} ${person.familyName}` : "Someone";
}

function recordPublicEvent(
  world: World,
  input: {
    stableKey: string;
    type: `${string}.${string}`;
    personIds: readonly EntityId[];
    tags: readonly string[];
    summary: string;
  },
): World {
  if (world.history.events.some((event) => event.stableKey === input.stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    involvedEntityIds: input.personIds.length
      ? [...input.personIds]
      : [NATIONAL_ELECTION_JURISDICTION.id],
    participants: input.personIds.map((personId) => ({
      personId,
      role: "focus:subject",
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [PRESIDENTIAL_TURNOVER_VERSION, "office:us-president", ...input.tags],
    summary: input.summary,
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

/** The incumbent's decision to stand again, and the reason when they do not. */
function incumbentStands(
  world: World,
  cycle: number,
): {
  world: World;
  personId: EntityId | null;
  party: MajorParty | null;
  reason: string;
} {
  const president = currentPresidentOf(world)?.personId ?? null;
  if (!president || !world.people[president])
    return {
      world,
      personId: null,
      party: null,
      reason: "no sitting President.",
    };
  const party =
    partyOf(world, president) ??
    ((politicalStartingConditions(world)?.presidency.winner ??
      null) as MajorParty | null);
  const termStart = makeIsoDate(`${cycle + 1}-01-20`);
  const bar = presidentialTermBar(world, president, termStart);
  const fixed =
    bar !== null
      ? bar
      : world.control.kind === "person" && world.control.personId === president
        ? "the player decides for themselves."
        : party === null || !PARTIES.includes(party)
          ? "no party is on record for them."
          : "";
  if (fixed) return { world, personId: president, party: null, reason: fixed };
  // The President decides for themselves, from their age, health, temperament
  // and family, as every officeholder does (careers/another-term.ts). No
  // fixed retirement age and no draw.
  const decided = decideAnotherTerm(world, {
    personId: president,
    stableKey: `${cycleKey(cycle)}:incumbent:decision`,
    subjectKey: PRESIDENT_OFFICE_KEY,
    decisionType: "election.consider-another-presidential-term",
    onDate: world.currentDate,
    termEnds: makeIsoDate(`${cycle + 5}-01-20`),
    serving: [
      {
        stableKey: `${cycleKey(cycle)}:incumbent:decision:serving`,
        optionKey: "seek",
        sourceType: "context:current-office",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation: "They are serving as President.",
        sourceRefs: [],
      },
    ],
  });
  return decided.seeks
    ? { world: decided.world, personId: president, party, reason: "" }
    : {
        world: decided.world,
        personId: president,
        party: null,
        reason: `they are standing down. ${decided.reason}`,
      };
}

/** The field closes: the parties' tickets are set and the election registered. */
export function presidentialFieldCloseHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const cycle = cycleForDue(due);
  if (cycle === null) return done(world, "No presidential election matches.");
  if (electionForCycle(world, cycle))
    return done(world, `The ${cycle} presidential election is already set.`);
  const rules = nationalElectionRules(cycle);
  const key = cycleKey(cycle);
  let next = ensureNationalElectionJurisdiction(world);
  const nominated = nominatePresidentialField(next, cycle);
  next = nominated.world;
  const tickets: PresidentialTicket[] = [];
  for (const nomination of nominated.nominees) {
    const state = homeState(next, nomination.personId);
    if (!state) continue;
    const president = { personId: nomination.personId, state };
    const vicePresident = chooseRunningMate(
      next,
      cycle,
      president,
      nomination.party,
    );
    if (!vicePresident) continue;
    tickets.push({
      presidentPersonId: president.personId,
      vicePresidentPersonId: vicePresident.personId,
      presidentState: president.state,
      vicePresidentState: vicePresident.state,
    });
    next = recordPublicEvent(next, {
      stableKey: `${key}:${nomination.party}:nomination`,
      type: NOMINATION_EVENT,
      personIds: [president.personId, vicePresident.personId],
      tags: [`party:${nomination.party}`],
      summary: `${personName(next, president.personId)} is the ${SETTING_PARTY_NAMES[nomination.party]!.replace(/ Party$/, "")} nominee for President, with ${personName(next, vicePresident.personId)} for Vice President.`,
    });
  }
  if (!tickets.length) return done(next, "No presidential election matches.");
  const people = tickets.flatMap((ticket) => [
    ticket.presidentPersonId,
    ticket.vicePresidentPersonId,
  ]);
  next = registerNationalElection(next, {
    stableKey: key,
    cycle,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    tickets,
    provenance: {
      method: "simulated",
      sourceEntityIds: [...people].sort(),
      note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the ${cycle} presidential election, the ${PARTIES.join(" and ")} tickets in that order.`,
    },
  });
  const electionId = electionForCycle(next, cycle)!.id;
  const schedule = (
    suffix: string,
    dueAt: IsoDate,
    transitionKey: `${string}:${string}`,
  ): void => {
    next = scheduleFutureDueItem(next, {
      stableKey: `${key}:${suffix}`,
      dueAt,
      transitionKey,
      entityIds: [electionId],
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      provenance: {
        kind: "authored",
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the ${cycle} presidential ${suffix}.`,
      },
    });
  };
  schedule("election-day", rules.electionDate, PRESIDENTIAL_ELECTION_DAY);
  schedule(
    "electors-meet",
    rules.electorMeetingDate,
    PRESIDENTIAL_ELECTORS_MEET,
  );
  next = scheduleNationalCount(next, electionId);
  schedule("term-plan", addDays(rules.countDate, 1), PRESIDENTIAL_TERM_PLAN);
  return done(next, `The ${cycle} presidential tickets are set.`);
}

function electionForDue(world: World, due: FutureDueItem) {
  const cycle = cycleForDue(due);
  const election = cycle === null ? null : electionForCycle(world, cycle);
  return election && cycle !== null ? { cycle, election } : null;
}

/** Election day: every state and the District reports its popular vote. */
export function presidentialElectionDayHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = electionForDue(world, due);
  if (!found) return done(world, "No presidential election is registered.");
  const { cycle, election } = found;
  const key = cycleKey(cycle);
  const rules = nationalElectionRules(cycle);
  const candidatePersonIds = election.tickets.map(
    (ticket) => ticket.presidentPersonId,
  );
  let next = world;
  for (const unit of rules.units) {
    if (
      nationalRecords(next, election.id).some(
        (record) =>
          record.kind === "unit-result" && record.unitKey === unit.key,
      )
    )
      continue;
    const jurisdiction = nationalUnitJurisdiction(cycle, unit.key);
    const districtNumber = unit.countsPopular
      ? null
      : Number(unit.key.slice(unit.key.lastIndexOf("-") + 1));
    const counted = countRecordedVoterBallots(world, {
      stableKey: `${key}:unit:${unit.key}:recorded-voters`,
      jurisdictionId: jurisdiction.id,
      electionDate: rules.electionDate,
      candidatePersonIds,
      ...(districtNumber === null
        ? {}
        : {
            admitVoter: (personId: EntityId) => {
              const membership = recordedDistrictMembership(
                world,
                personId,
                "congressional",
                rules.electionDate,
              );
              if (!membership) return false;
              const district = resolveDistrictBinding(
                districtIdentityCatalog(),
                membership.binding,
                { chamber: "congressional", stateUsps: unit.state },
              );
              return (
                district.kind === "accepted" &&
                Number(district.identity.districtCode) === districtNumber
              );
            },
          }),
    });
    if (!counted) continue;
    next = appendNationalRecord(next, {
      kind: "unit-result",
      stableKey: `${key}:unit:${unit.key}`,
      electionId: election.id,
      unitKey: unit.key,
      tallies: counted.tallies.map(({ candidatePersonId, votes }) => ({
        candidatePersonId,
        votes,
      })),
      sourceContestResultId: null,
      allocationWinnerPersonId: counted.winnerPersonId,
      provenance: {
        method: "simulated",
        sourceEntityIds: [
          ...new Set([
            election.id,
            ...counted.ballots.map((ballot) => ballot.voterPersonId),
          ]),
        ].sort(),
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: ${key}:unit:${unit.key}:recorded-voters`,
      },
    });
  }
  const carried = new Map<EntityId, number>();
  for (const unit of rules.units) {
    const result = nationalRecords(next, election.id).find(
      (record): record is NationalUnitResult =>
        record.kind === "unit-result" && record.unitKey === unit.key,
    );
    if (result?.allocationWinnerPersonId)
      carried.set(
        result.allocationWinnerPersonId,
        (carried.get(result.allocationWinnerPersonId) ?? 0) + unit.electors,
      );
  }
  const [first, second] = election.tickets
    .map((ticket) => ({
      personId: ticket.presidentPersonId,
      electors: carried.get(ticket.presidentPersonId) ?? 0,
    }))
    .sort((a, b) => b.electors - a.electors);
  next = recordPublicEvent(next, {
    stableKey: `${key}:popular-vote`,
    type: RESULT_EVENT,
    personIds: election.tickets.map((ticket) => ticket.presidentPersonId),
    tags: ["election"],
    summary:
      second && first!.electors === second.electors
        ? `The presidential election is tied: ${personName(next, first!.personId)} and ${personName(next, second!.personId)} each carried states holding ${first!.electors} electoral votes.`
        : second
          ? `${personName(next, first!.personId)} carried states holding ${first!.electors} electoral votes to ${personName(next, second.personId)}'s ${second.electors}.`
          : `${personName(next, first!.personId)}: ${first!.electors}`,
  });
  return done(
    next,
    `The ${cycle} presidential vote was counted in every state.`,
  );
}

/** The electors' statutory day: the states certify and every elector votes. */
export function presidentialElectorsMeetHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = electionForDue(world, due);
  if (!found) return done(world, "No presidential election is registered.");
  const { cycle, election } = found;
  const key = cycleKey(cycle);
  let next = world;
  const results = nationalRecords(next, election.id).filter(
    (record): record is NationalUnitResult => record.kind === "unit-result",
  );
  for (const result of results) {
    if (
      nationalRecords(next, election.id).some(
        (record) =>
          record.kind === "certification" && record.resultId === result.id,
      )
    )
      continue;
    next = appendNationalRecord(next, {
      kind: "certification",
      stableKey: `${key}:certified:${result.unitKey}`,
      electionId: election.id,
      resultId: result.id,
      disposition: "certified",
      authorityNote:
        "Certified by the state's canvassing authority (3 U.S.C. § 5).",
      allocationWinnerPersonId: result.allocationWinnerPersonId,
      provenance: {
        method: "simulated",
        sourceEntityIds: [result.id],
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the reported result, certified as reported.`,
      },
    });
  }
  const cast = new Set(
    nationalRecords(next, election.id).flatMap((record) =>
      record.kind === "ballot" ? [record.electorKey] : [],
    ),
  );
  for (const elector of nationalAllocation(next, election.id).electors) {
    if (cast.has(elector.key)) continue;
    const ticket = election.tickets.find(
      (candidate) =>
        candidate.presidentPersonId === elector.allocatedTicketPresidentId,
    )!;
    next = appendNationalRecord(next, {
      kind: "ballot",
      stableKey: `${key}:ballot:${elector.key}`,
      electionId: election.id,
      electorKey: elector.key,
      presidentPersonId: ticket.presidentPersonId,
      vicePresidentPersonId: ticket.vicePresidentPersonId,
      disposition: "accepted",
      provenance: {
        method: "simulated",
        sourceEntityIds: [election.id],
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the elector votes for the ticket that carried their unit; faithless electors are not modeled.`,
      },
    });
  }
  return done(next, `The ${cycle} electors voted.`);
}

/** The party whose nominee a member of Congress votes for (placeholder). */
function contingentVote(
  world: World,
  personId: EntityId,
  candidates: readonly EntityId[],
  nomineeOf: (ticket: PresidentialTicket) => EntityId,
  election: NationalElection,
): EntityId | null {
  const organizationId = publicPartyAffiliation(world, personId);
  const index = PARTIES.findIndex(
    (party) =>
      livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.nationalParty(party),
      ) === organizationId,
  );
  const ticket = index < 0 ? undefined : election.tickets[index];
  const nominee = ticket ? nomineeOf(ticket) : null;
  return nominee && candidates.includes(nominee) ? nominee : null;
}

/**
 * No ticket won a majority: the House chooses the President, one vote per
 * state, and the Senate the Vice President (U.S. Const. amend. XII). Members
 * vote their party's nominee (a placeholder; see the file header). Each body
 * votes once, and a failed vote is recorded as one.
 */
function holdContingentElections(
  world: World,
  election: NationalElection,
  key: string,
): World {
  const count = nationalRecords(world, election.id).find(
    (record): record is NationalElectoralCount => record.kind === "count",
  );
  if (!count) return world;
  const congress = projectCongress(world);
  let next = world;
  const provenance = (note: string) => ({
    method: "simulated" as const,
    sourceEntityIds: [count.id],
    note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: ${note} Placeholder, not research.`,
  });
  const held = (office: "president" | "vice-president") =>
    nationalRecords(next, election.id).some(
      (record) =>
        record.kind === "contingent-choice" && record.office === office,
    );
  if (
    !count.presidentPersonId &&
    count.presidentialChoicePersonIds.length &&
    !held("president")
  ) {
    const candidates = count.presidentialChoicePersonIds;
    const votes: { voterKey: string; candidatePersonId: EntityId | null }[] =
      [];
    for (const state of CONTINGENT_STATES) {
      const members = (congress?.house.seats ?? []).flatMap((seat) =>
        seat.stateUsps === state && seat.occupant.kind === "member"
          ? [seat.occupant.member.personId]
          : [],
      );
      if (!members.length) continue;
      const tally = new Map<EntityId, number>();
      for (const personId of members) {
        const choice = contingentVote(
          next,
          personId,
          candidates,
          (ticket) => ticket.presidentPersonId,
          election,
        );
        if (choice) tally.set(choice, (tally.get(choice) ?? 0) + 1);
      }
      const ranked = [...tally].sort((a, b) => b[1] - a[1]);
      votes.push({
        voterKey: state,
        candidatePersonId:
          ranked.length &&
          (ranked.length === 1 || ranked[0]![1] > ranked[1]![1])
            ? ranked[0]![0]
            : null,
      });
    }
    next = recordContingentChoice(next, {
      stableKey: `${key}:house-choice`,
      electionId: election.id,
      countId: count.id,
      office: "president",
      votes,
      wholeNumber: CONTINGENT_STATES.length,
      senatorPersonIds: [],
      provenance: provenance(
        "each state delegation votes for the nominee most of its members' parties put forward.",
      ),
    });
    const chosen = nationalOutcome(next, election.id, "president");
    const counted = (id: EntityId) =>
      votes.filter((vote) => vote.candidatePersonId === id).length;
    next = recordPublicEvent(next, {
      stableKey: `${key}:house-choice`,
      type: COUNT_EVENT,
      personIds: [...candidates],
      tags: ["election", "contingent:house"],
      summary: chosen
        ? `No ticket won a majority of the electoral votes, so the House chose the President, one vote per state: ${personName(next, chosen.personId)} carried ${counted(chosen.personId)} of ${CONTINGENT_STATES.length} delegations.`
        : `No ticket won a majority of the electoral votes, and the House, voting one state at a time, did not give any nominee ${Math.floor(CONTINGENT_STATES.length / 2) + 1} delegations. ${candidates.map((id) => `${personName(next, id)} carried ${counted(id)}`).join(" and ")}. The presidency stays unfilled.`,
    });
  }
  if (
    !count.vicePresidentPersonId &&
    count.vicePresidentialChoicePersonIds.length &&
    !held("vice-president")
  ) {
    const candidates = count.vicePresidentialChoicePersonIds;
    const senators = (congress?.senate.seats ?? []).flatMap((seat) =>
      seat.occupant.kind === "member" ? [seat.occupant.member.personId] : [],
    );
    const votes = senators.map((personId) => ({
      voterKey: personId,
      candidatePersonId: contingentVote(
        next,
        personId,
        candidates,
        (ticket) => ticket.vicePresidentPersonId,
        election,
      ),
    }));
    next = recordContingentChoice(next, {
      stableKey: `${key}:senate-choice`,
      electionId: election.id,
      countId: count.id,
      office: "vice-president",
      votes,
      wholeNumber: CONTINGENT_STATES.length * 2,
      senatorPersonIds: senators,
      provenance: provenance("each senator votes for their party's nominee."),
    });
    const chosen = nationalOutcome(next, election.id, "vice-president");
    const counted = (id: EntityId) =>
      votes.filter((vote) => vote.candidatePersonId === id).length;
    next = recordPublicEvent(next, {
      stableKey: `${key}:senate-choice`,
      type: COUNT_EVENT,
      personIds: [...candidates],
      tags: ["election", "contingent:senate"],
      summary: chosen
        ? `The Senate chose the Vice President: ${personName(next, chosen.personId)}, with ${counted(chosen.personId)} of 100 votes.`
        : `The Senate did not give any nominee for Vice President the 51 votes a majority of its 100 seats needs. ${candidates.map((id) => `${personName(next, id)} had ${counted(id)}`).join(" and ")}. The vice presidency stays unfilled.`,
    });
  }
  return next;
}

/** The day after the count: the winners' terms are dated. */
export function presidentialTermPlanHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = electionForDue(world, due);
  if (!found) return done(world, "No presidential election is registered.");
  const { cycle, election } = found;
  const key = cycleKey(cycle);
  let next = world;
  next = holdContingentElections(next, election, key);
  const president = nationalOutcome(next, election.id, "president");
  const vicePresident = nationalOutcome(next, election.id, "vice-president");
  if (president && vicePresident)
    next = recordPublicEvent(next, {
      stableKey: `${key}:counted`,
      type: COUNT_EVENT,
      personIds: [president.personId, vicePresident.personId],
      tags: ["election"],
      summary: `${
        nationalRecords(next, election.id).some(
          (record) => record.kind === "contingent-choice",
        )
          ? "After the contingent elections, "
          : "Congress counted the electoral votes: "
      }${personName(next, president.personId)} is elected President and ${personName(next, vicePresident.personId)} Vice President.`,
    });
  for (const office of ["president", "vice-president"] as const) {
    if (!nationalOutcome(next, election.id, office)) continue;
    if (
      nationalRecords(next, election.id).some(
        (record) => record.kind === "term-plan" && record.office === office,
      )
    )
      continue;
    next = planNationalOfficeTerm(next, {
      stableKey: `${key}:term-plan:${office}`,
      electionId: election.id,
      office,
      qualificationNote:
        "Takes the oath of office at noon on January 20 (U.S. Const. art. II, § 1; amend. XX, § 1).",
      workTimeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      },
      provenance: {
        method: "simulated",
        sourceEntityIds: [election.id],
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the counted winner's term.`,
      },
    });
  }
  return done(next, `The ${cycle} winners' terms were dated.`);
}

export function presidentialTurnoverHandlers() {
  return [
    [PRESIDENTIAL_FIELD_CLOSE, presidentialFieldCloseHandler],
    [PRESIDENTIAL_ELECTION_DAY, presidentialElectionDayHandler],
    [PRESIDENTIAL_ELECTORS_MEET, presidentialElectorsMeetHandler],
    [PRESIDENTIAL_TERM_PLAN, presidentialTermPlanHandler],
  ] as const;
}

/** Noon on January 20 has passed: a living winner takes the oath. */
function swearInWinners(world: World): World {
  let next = world;
  let sworn = false;
  for (const plan of nationalRecords(world).filter(
    (record): record is NationalTermPlan => record.kind === "term-plan",
  )) {
    if (
      compareSimulationMoments(next.currentMoment, plan.startsAt) < 0 ||
      compareSimulationMoments(next.currentMoment, plan.endsAt) >= 0 ||
      !plan.stableKey.startsWith(PRESIDENTIAL_TURNOVER_VERSION) ||
      !nationalPersonAlive(next, plan.personId) ||
      nationalRecords(next, plan.electionId).some(
        (record) =>
          (record.kind === "qualification" || record.kind === "term-state") &&
          record.planId === plan.id,
      )
    )
      continue;
    next = appendNationalRecord(next, {
      kind: "qualification",
      stableKey: `${plan.stableKey}:oath`,
      electionId: plan.electionId,
      planId: plan.id,
      personId: plan.personId,
      effectiveAt: plan.startsAt,
      disposition: "qualified-and-sworn",
      authorityNote:
        "Took the oath of office at noon on January 20 (U.S. Const. art. II, § 1; amend. XX, § 1).",
      provenance: {
        method: "simulated",
        sourceEntityIds: [plan.id],
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the counted winner is sworn in at the term's start.`,
      },
    });
    sworn = true;
  }
  return sworn ? applyNationalTermTransitions(next) : next;
}

/**
 * Called whenever the canonical clock moves. Swears in winners whose term has
 * begun and makes sure the next presidential election's field closing is on
 * the calendar.
 *
 * The oath is checked on every move, not only when the date changes: the term
 * starts at noon, and a clock that crosses noon on January 20 without changing
 * the date must still seat the winner the moment the old term ends. The
 * calendar is only extended when a date has been crossed.
 */
export function applyPresidentialTurnover(
  before: IsoDate,
  world: World,
): World {
  if (!hasPresidency(world)) return world;
  let next = swearInWinners(world);
  if (world.currentDate <= before) return next;
  const cycle = nextPresidentialCycle(next);
  if (electionForCycle(next, cycle)) return next;
  const stableKey = `${cycleKey(cycle)}:field-close`;
  if (next.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return next;
  const closes = fieldClosingDate(nationalElectionRules(cycle).electionDate);
  const tomorrow = addDays(next.currentDate, 1);
  next = ensureNationalElectionJurisdiction(next);
  return scheduleFutureDueItem(next, {
    stableKey,
    // A save opened after the field would have closed still holds its
    // election: the field closes tomorrow instead.
    dueAt: closes > next.currentDate ? closes : tomorrow,
    transitionKey: PRESIDENTIAL_FIELD_CLOSE,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the nominating field for the ${cycle} presidential election closes ${PRESIDENTIAL_TURNOVER_PROFILE.fieldClosesDaysBefore} days before election day.`,
    },
  });
}
