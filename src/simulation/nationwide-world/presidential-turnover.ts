import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { currentPresidentOf } from "../crisis/offices";
import { addDays, compareSimulationMoments, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createOrganizationParticipation } from "../life";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { SETTING_PARTY_NAMES } from "../living-world/party-registry";
import {
  applyNationalTermTransitions,
  nationalOfficeHolder,
  planNationalOfficeTerm,
  scheduleNationalCount,
} from "../national-election-consumer";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureJurisdiction,
  ensureNationalElectionJurisdiction,
  nationalUnitJurisdiction,
} from "../national-election-geography";
import {
  ELECTORAL_ALLOCATION,
  FIRST_NATIONAL_CYCLE,
  nationalElectionRules,
} from "../national-election-rules";
import {
  appendNationalRecord,
  nationalAllocation,
  nationalOutcome,
  nationalPersonAlive,
  nationalRecords,
  registerNationalElection,
} from "../national-elections";
import type {
  NationalElection,
  NationalTermPlan,
  NationalUnitResult,
  PresidentialTicket,
} from "../national-election-types";
import { drawCanonicalNamedIdentity } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import {
  CENSUS_REGION_ORDER,
  censusRegionOf,
} from "../world-setup/census-regions";
import { politicalStartingConditions } from "../world-setup/conditions";
import { roundTo, standardNormal } from "../world-setup/deterministic-math";
import { CRUNCH46_POLICY } from "../world-setup/policy";
import { applySwing, calibrationRow } from "../world-setup/political-start";
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

/**
 * PRESIDENTIAL CONTINUITY — the presidency is elected on the canonical clock,
 * every fourth November from 2028, whether or not the player takes part.
 *
 * The constitutional sequence runs through the national election records that
 * already existed and had nothing feeding them: two party tickets are
 * nominated when the field closes, every state and the District reports a
 * popular result on election day, the states certify and the electors vote on
 * their statutory day, Congress counts on January 6, and the winners take the
 * oath at noon on January 20 and hold the office through the canonical work
 * records until the next inauguration. A President who dies in an elected term
 * is succeeded by the Vice President through the Twenty-Fifth Amendment
 * receiver, which reads these same records.
 *
 * What is law here: the dates (3 U.S.C. §§ 1, 7, 15; U.S. Const. amend. XX),
 * the elector allocation, the Twelfth Amendment's two-state rule, the
 * Twenty-Second Amendment's two-term limit, and the Article II minimum age.
 * The term limit is read through the rule layer (`presidentialTermLimitAt`),
 * so an amendment ratified in the World (`living-world/federal-reform.ts`)
 * replaces it.
 *
 * PLACEHOLDERS, NOT LAW OR RESEARCH, each filed as research question
 * `how-a-presidential-election-plays-out`:
 * - Each state's popular vote starts from its certified 2024 two-party share
 *   and moves by a national, regional and state swing drawn fresh each cycle
 *   with the spreads the world's starting politics already uses. How much a
 *   presidential result really moves between cycles is not researched, and
 *   the answered `should-partisan-geography-move` says a state's lean should
 *   come from its people's current opinion; this stands in until that
 *   producer exists.
 * - Nominees are drawn aged 45 to 69 from a state weighted by its electors.
 *   How parties choose nominees (primaries, conventions) is NOT MODELED.
 * - An incumbent eligible to stand runs again four times in five, and not at
 *   78 or older, as governors do.
 *
 * NOT MODELED, with the rule that applies meanwhile:
 * - Campaigns, including the player's own: the player cannot yet run for
 *   President. The contest is decided from the popular vote above alone.
 * - Maine's and Nebraska's district electors follow their state's result, as
 *   the world's opening presidency already does.
 * - Faithless electors: every elector votes for the ticket that carried their
 *   unit.
 * - An Electoral College tie or no majority: the House and Senate contingent
 *   elections have receivers but no producer, so no one is seated and the
 *   office stays empty. A tie between two tickets is rare but possible.
 * - A President-elect who dies before the inauguration (Twentieth Amendment,
 *   § 3): the term is not entered.
 * - Natural-born citizenship and fourteen years' residence: every nominee is
 *   born and resident in the state they are nominated from.
 * - Reapportionment after 2030: see `CARRIED_FORWARD_ALLOCATION_VERSION`.
 */

export const PRESIDENTIAL_TURNOVER_VERSION = "presidential-turnover/v1";

export const PRESIDENTIAL_TURNOVER_PROFILE = {
  id: "ocd-presidential-turnover-game-profile/v1",
  /** The nominating field closes this many days before election day. */
  fieldClosesDaysBefore: 60,
  /** Incumbents this old or older do not run. */
  retirementAge: 78,
  /** Chance an eligible incumbent runs again, per mille. */
  incumbentRunsPermille: 800,
  /** Age range of a newly drawn nominee, inclusive of the minimum. */
  nomineeAge: { minimum: 45, maximumExclusive: 70 },
} as const;

/** U.S. Const. art. II, § 1, cl. 5. */
export const PRESIDENTIAL_MINIMUM_AGE = 35;
/** U.S. Const. amend. XXII, § 1: elected no more than twice. */
export const TWENTY_SECOND_AMENDMENT_LIMIT: TermLimitRule = Object.freeze({
  maxConsecutiveTerms: null,
  maxLifetimeTerms: 2,
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
const INTENT_EVENT = "election.presidential-candidacy-intent";
const RESULT_EVENT = "election.presidential-popular-vote";
const COUNT_EVENT = "election.presidential-electoral-count";

function cycleKey(cycle: number): string {
  return `${PRESIDENTIAL_TURNOVER_VERSION}:${cycle}`;
}

function cycleForDue(due: FutureDueItem): number | null {
  const match = /^presidential-turnover\/v1:(\d{4}):/.exec(due.stableKey);
  return match ? Number(match[1]) : null;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
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
  for (const party of PARTIES) {
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

function unitStates(): readonly string[] {
  return Object.keys(ELECTORAL_ALLOCATION).sort();
}

/** A state drawn with weight proportional to its electors. */
function drawState(rng: SeededRng, exclude: string | null): string {
  const states = unitStates().filter((usps) => usps !== exclude);
  const total = states.reduce(
    (sum, usps) => sum + ELECTORAL_ALLOCATION[usps]!,
    0,
  );
  let roll = rng.integer(0, total);
  for (const usps of states) {
    roll -= ELECTORAL_ALLOCATION[usps]!;
    if (roll < 0) return usps;
  }
  return states.at(-1)!;
}

/** The unit state a person lives in, when it is one. */
function homeState(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  const key = person
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)?.stateJurisdictionKey
    : null;
  const usps = key?.startsWith("US-") ? key.slice(3) : null;
  return usps && ELECTORAL_ALLOCATION[usps] !== undefined ? usps : null;
}

interface Nominee {
  readonly personId: EntityId;
  readonly state: string;
}

function drawNominee(
  world: World,
  cycle: number,
  stableKey: string,
  excludeState: string | null,
  party: MajorParty,
): { world: World; nominee: Nominee } {
  const rng = new SeededRng(world.seed).fork(stableKey);
  const state = drawState(rng.fork("state"), excludeState);
  const jurisdiction = nationalUnitJurisdiction(cycle, state);
  const age = rng.integer(
    PRESIDENTIAL_TURNOVER_PROFILE.nomineeAge.minimum,
    PRESIDENTIAL_TURNOVER_PROFILE.nomineeAge.maximumExclusive,
  );
  let next = ensureJurisdiction(world, jurisdiction);
  next = createCharacterHistoryContextPeople(next, [
    {
      stableKey,
      ...drawCanonicalNamedIdentity(
        rng.fork("name"),
        generatePersonIdentity(rng.fork("identity")),
      ),
      // Born before the election's field closes, so the minimum age holds on
      // election day and at the oath.
      birthDate: makeIsoDate(
        `${cycle - age - 1}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
      ),
      homeJurisdictionId: jurisdiction.id,
      birthplaceJurisdictionId: jurisdiction.id,
    },
  ]);
  const personId = characterHistoryContextPersonId(next, stableKey);
  const partyOrganizationId = livingWorldOrganizationId(
    next,
    LIVING_WORLD_KEYS.nationalParty(party),
  );
  if (
    next.history.organizations.some(
      (organization) => organization.id === partyOrganizationId,
    )
  )
    next = createOrganizationParticipation(next, {
      stableKey: `${stableKey}:affiliation`,
      personId,
      organizationId: partyOrganizationId,
      startedAt: next.currentDate,
      initialStatus: "active",
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Public party affiliation",
      provenance: {
        kind: "authored",
        note: `${PRESIDENTIAL_TURNOVER_PROFILE.id}: nominated by this party.`,
      },
    });
  return { world: next, nominee: { personId, state } };
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
  electionDay: IsoDate,
): { personId: EntityId | null; party: MajorParty | null; reason: string } {
  const president = currentPresidentOf(world)?.personId ?? null;
  if (!president || !world.people[president])
    return { personId: null, party: null, reason: "no sitting President." };
  const person = world.people[president]!;
  const party =
    partyOf(world, president) ??
    ((politicalStartingConditions(world)?.presidency.winner ??
      null) as MajorParty | null);
  const rng = new SeededRng(world.seed).fork(`${cycleKey(cycle)}:incumbent`);
  const bar = presidentialTermBar(
    world,
    president,
    makeIsoDate(`${cycle + 1}-01-20`),
  );
  const reason =
    bar !== null
      ? bar
      : ageOn(person.birthDate, electionDay) >=
          PRESIDENTIAL_TURNOVER_PROFILE.retirementAge
        ? "they are retiring."
        : world.control.kind === "person" &&
            world.control.personId === president
          ? "the player decides for themselves."
          : party === null || !PARTIES.includes(party)
            ? "no party is on record for them."
            : rng.integer(0, 1000) >=
                PRESIDENTIAL_TURNOVER_PROFILE.incumbentRunsPermille
              ? "they are standing down."
              : "";
  return reason
    ? { personId: president, party: null, reason }
    : { personId: president, party, reason };
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
  const incumbent = incumbentStands(next, cycle, rules.electionDate);
  if (incumbent.personId)
    next = recordPublicEvent(next, {
      stableKey: `${key}:intent`,
      type: INTENT_EVENT,
      personIds: [incumbent.personId],
      tags: [`intent:${incumbent.party ? "seeking" : "not-seeking"}`],
      summary: incumbent.party
        ? "The President is seeking a second term."
        : `The President is not on the ballot: ${incumbent.reason}`,
    });
  const tickets: PresidentialTicket[] = [];
  for (const party of PARTIES) {
    let president: Nominee;
    let vicePresident: Nominee | null = null;
    if (incumbent.party === party && incumbent.personId) {
      const state =
        homeState(next, incumbent.personId) ??
        drawState(new SeededRng(next.seed).fork(`${key}:${party}:state`), null);
      president = { personId: incumbent.personId, state };
      const sittingVice = currentVicePresident(next);
      const viceState = sittingVice ? homeState(next, sittingVice) : null;
      if (
        sittingVice &&
        viceState &&
        viceState !== state &&
        partyOf(next, sittingVice) === party
      )
        vicePresident = { personId: sittingVice, state: viceState };
    } else {
      const drawn = drawNominee(
        next,
        cycle,
        `${key}:${party}:president`,
        null,
        party,
      );
      next = drawn.world;
      president = drawn.nominee;
    }
    if (!vicePresident) {
      // Twelfth Amendment: a ticket from one state could not receive that
      // state's electoral votes, so the running mate lives elsewhere.
      const drawn = drawNominee(
        next,
        cycle,
        `${key}:${party}:vice-president`,
        president.state,
        party,
      );
      next = drawn.world;
      vicePresident = drawn.nominee;
    }
    tickets.push({
      presidentPersonId: president.personId,
      vicePresidentPersonId: vicePresident.personId,
      presidentState: president.state,
      vicePresidentState: vicePresident.state,
    });
    next = recordPublicEvent(next, {
      stableKey: `${key}:${party}:nomination`,
      type: NOMINATION_EVENT,
      personIds: [president.personId, vicePresident.personId],
      tags: [`party:${party}`],
      summary: `${personName(next, president.personId)} is the ${SETTING_PARTY_NAMES[party]!.replace(/ Party$/, "")} nominee for President, with ${personName(next, vicePresident.personId)} for Vice President.`,
    });
  }
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
  const political = politicalStartingConditions(world);
  const regime = political?.regime ?? "near-reference";
  const policy = CRUNCH46_POLICY.political;
  const rng = new SeededRng(world.seed).fork(`${key}:swing`);
  const national =
    policy.nationalSwingSd[regime] * standardNormal(rng.fork("national"));
  const regional = Object.fromEntries(
    CENSUS_REGION_ORDER.map((region) => [
      region,
      policy.censusRegionResidualSd[regime] *
        standardNormal(rng.fork(`region:${region}`)),
    ]),
  );
  const [democratic, republican] = election.tickets;
  const stateResults = new Map<string, { share: number; total: number }>();
  let next = world;
  for (const unit of nationalElectionRules(cycle).units) {
    if (
      nationalRecords(next, election.id).some(
        (record) =>
          record.kind === "unit-result" && record.unitKey === unit.key,
      )
    )
      continue;
    if (!stateResults.has(unit.state)) {
      const row = calibrationRow(`us-president:${unit.state}`);
      const swing =
        national +
        (unit.state === "DC"
          ? 0
          : (regional[censusRegionOf(unit.state)] ?? 0)) +
        policy.stateResidualSd[regime] *
          standardNormal(rng.fork(`state:${unit.state}`));
      stateResults.set(unit.state, {
        share: roundTo(applySwing(row?.democraticTwoPartyShare ?? 0.5, swing)),
        total: row?.totalVotes ?? 0,
      });
    }
    const { share, total } = stateResults.get(unit.state)!;
    const democraticVotes = Math.round(total * share);
    const winner =
      share > 0.5
        ? democratic!.presidentPersonId
        : share < 0.5
          ? republican!.presidentPersonId
          : rng.fork(`tie:${unit.state}`).integer(0, 2) === 0
            ? democratic!.presidentPersonId
            : republican!.presidentPersonId;
    next = appendNationalRecord(next, {
      kind: "unit-result",
      stableKey: `${key}:unit:${unit.key}`,
      electionId: election.id,
      unitKey: unit.key,
      tallies: [
        {
          candidatePersonId: democratic!.presidentPersonId,
          votes: democraticVotes,
        },
        {
          candidatePersonId: republican!.presidentPersonId,
          votes: total - democraticVotes,
        },
      ],
      sourceContestResultId: null,
      allocationWinnerPersonId: winner,
      provenance: {
        method: "simulated",
        sourceEntityIds: [election.id],
        note: unit.countsPopular
          ? `${PRESIDENTIAL_TURNOVER_PROFILE.id}: the state's certified 2024 two-party share moved by this cycle's drawn swing. Placeholder, not research.`
          : `${PRESIDENTIAL_TURNOVER_PROFILE.id}: district electors follow their state's result; district presidential results are not modeled.`,
      },
    });
  }
  const carried = new Map<EntityId, number>();
  for (const unit of nationalElectionRules(cycle).units) {
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
      first!.electors === second!.electors
        ? `The presidential election is tied: ${personName(next, first!.personId)} and ${personName(next, second!.personId)} each carried states holding ${first!.electors} electoral votes.`
        : `${personName(next, first!.personId)} carried states holding ${first!.electors} electoral votes to ${personName(next, second!.personId)}'s ${second!.electors}.`,
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
  const president = nationalOutcome(next, election.id, "president");
  const vicePresident = nationalOutcome(next, election.id, "vice-president");
  if (!president || !vicePresident) {
    next = recordPublicEvent(next, {
      stableKey: `${key}:no-majority`,
      type: COUNT_EVENT,
      personIds: [],
      tags: ["election", "count:no-majority"],
      summary:
        "No ticket won a majority of the electoral votes, and the contingent election in Congress has not been held.",
    });
    return done(next, "No majority; the contingent election is not modeled.");
  }
  next = recordPublicEvent(next, {
    stableKey: `${key}:counted`,
    type: COUNT_EVENT,
    personIds: [president.personId, vicePresident.personId],
    tags: ["election"],
    summary: `Congress counted the electoral votes: ${personName(next, president.personId)} is elected President and ${personName(next, vicePresident.personId)} Vice President.`,
  });
  for (const office of ["president", "vice-president"] as const) {
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

export const PRESIDENTIAL_TURNOVER_HANDLERS = [
  [PRESIDENTIAL_FIELD_CLOSE, presidentialFieldCloseHandler],
  [PRESIDENTIAL_ELECTION_DAY, presidentialElectionDayHandler],
  [PRESIDENTIAL_ELECTORS_MEET, presidentialElectorsMeetHandler],
  [PRESIDENTIAL_TERM_PLAN, presidentialTermPlanHandler],
] as const;

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
 * the calendar. Writes nothing for a date the clock has not crossed.
 */
export function applyPresidentialTurnover(
  before: IsoDate,
  world: World,
): World {
  if (world.currentDate <= before || !hasPresidency(world)) return world;
  let next = swearInWinners(world);
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
