import { inventedPersonBirthDate } from "../invented-person-age";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { addDays, makeIsoDate } from "../dates";
import {
  electionContestResult,
  scheduleElectionContest,
} from "../election-contests";
import { drawCanonicalNamedIdentity } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import { scheduleFutureDueItem } from "../future-transitions";
import { recordWorldEvent } from "../world";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { chiefExecutiveJurisdictionId } from "./government-jurisdiction";
import { checkExecutiveTermLimit } from "./executive-term-limits";
import {
  isStateExecutiveElectionYearInWorld,
  stateExecutiveTermRuleForElectionYear,
  termDatesAfterElectionInWorld,
} from "./executive-term-rules-in-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./state-executive-candidacy-packs";
import {
  ensureStateJurisdiction,
  currentStateExecutiveHolders,
  stateExecutiveOffice,
} from "./state-executives";
import { generalElectionDay } from "./state-executive-term-rules";
import { planOrdinaryStateExecutiveTerm } from "./state-executive-terms";
import { decideAnotherTerm } from "../careers/another-term";
import { createOrganizationParticipations } from "../life";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { personName } from "../people";
import { majorPartyOf } from "../statewide-electorate";

import {
  GOVERNOR_FIELD_CLOSE,
  GOVERNOR_TERM_PLAN,
  GOVERNOR_TURNOVER_PROFILE,
  scheduleNextFieldClose,
  turnoverContestKey,
} from "./state-executive-turnover-calendar";

/**
 * GOVERNOR CONTINUITY — every governorship this World has materialized holds
 * its regular elections on the canonical clock, whether or not the player
 * takes part.
 *
 * When the field for a regular election closes, a contest is opened unless
 * one already exists for that office and day (the player's own filing is
 * that contest). The winner of an open contest gets a dated term through the
 * same planner a player's win uses, and a non-player winner qualifies in the
 * ordinary course. No incumbent stays past the end of a term without an
 * election, and nothing is written for a date the clock has not crossed.
 */

const GOVERNOR_INTENT_EVENT = "election.governor-candidacy-intent";

/** The recorded decision to stand again, or not, for one office and year. */
export function recordGovernorCandidacyIntent(
  world: World,
  input: {
    readonly office: {
      readonly officeKey: string;
      readonly displayName: string;
    };
    readonly year: number;
    readonly stateJurisdictionId: EntityId;
    readonly incumbentPersonId: EntityId | null;
    readonly seeking: boolean;
    readonly reason: string;
  },
): World {
  const stableKey = `${GOVERNOR_TURNOVER_PROFILE.id}:intent:${input.office.officeKey}:${input.year}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: GOVERNOR_INTENT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.stateJurisdictionId,
    // An office with nobody in it still has a state whose office it is. Naming
    // the jurisdiction keeps the record about something when the seat is
    // vacant, which is exactly when the reason below is worth recording.
    involvedEntityIds: input.incumbentPersonId
      ? [input.incumbentPersonId]
      : [input.stateJurisdictionId],
    participants: input.incumbentPersonId
      ? [
          {
            personId: input.incumbentPersonId,
            role: "focus:subject",
            detail: input.seeking ? "seeking-another-term" : "not-seeking",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      GOVERNOR_TURNOVER_PROFILE.id,
      `office:${input.office.officeKey}`,
      `intent:${input.seeking ? "seeking" : "not-seeking"}`,
    ],
    summary: input.seeking
      ? `The ${input.office.displayName} is seeking another term.`
      : `The ${input.office.displayName} is not on the ballot: ${input.reason}`,
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
 * Whether the sitting governor stands again for the term decided on
 * `electionDay`, recorded once as the intent event. The regular contest and a
 * player's own filing both ask this, so a governor who runs is in the race the
 * player enters instead of disappearing from it.
 */
function decideIncumbentGovernor(
  world: World,
  stateUsps: string,
  year: number,
  electionDay: IsoDate,
): {
  readonly world: World;
  readonly incumbentPersonId: EntityId | null;
  readonly seeking: boolean;
} {
  const office = stateExecutiveOffice(stateUsps)!;
  const holder = currentStateExecutiveHolders(world).find(
    (record) => record.officeKey === office.officeKey,
  );
  const incumbent = holder ? world.people[holder.personId] : undefined;
  // Whether the incumbent MAY stand is the state's term limit for the term
  // this election fills, under this World's law; whether they WANT to is
  // their own decision below, from their office, health, age and family.
  const term = termDatesAfterElectionInWorld(world, stateUsps, electionDay);
  const barredByLimit =
    incumbent !== undefined && term !== null
      ? (checkExecutiveTermLimit(world, {
          stateUsps,
          personId: incumbent.id,
          termStartsAt: term.startsAt,
        })?.barredReason ?? null)
      : null;
  // The person being played decides their own candidacy.
  const played =
    incumbent !== undefined &&
    world.control.kind === "person" &&
    world.control.personId === incumbent.id;
  let current = world;
  let seeking = false;
  let reason =
    incumbent === undefined
      ? "no sitting governor is on record."
      : barredByLimit !== null
        ? "they have served the terms the state allows."
        : "they are standing down.";
  if (incumbent !== undefined && !played && barredByLimit === null) {
    const key = `${turnoverContestKey(office.officeKey, year)}:another-term`;
    const decided = decideAnotherTerm(current, {
      personId: incumbent.id,
      stableKey: key,
      subjectKey: office.officeKey,
      onDate: current.currentDate,
      // ESTIMATED FROM AVERAGE: a jurisdiction whose term rule is not read
      // here gets four years, the modal term across the 50 states (the
      // comparison places used by the state-executive term-rule corpus).
      termEnds: term?.endsAt ?? addDays(electionDay, 4 * 365),
      serving: [
        {
          stableKey: `${key}:serving`,
          optionKey: "seek",
          sourceType: "context:current-office",
          direction: "supports",
          importance: "moderate",
          confidence: "high",
          explanation: `They are the sitting ${office.displayName}.`,
          sourceRefs: [],
        },
      ],
      decisionType: "election.consider-another-governor-term",
    });
    current = decided.world;
    seeking = decided.seeks;
    if (!seeking) reason = lowerFirst(decided.reason);
  }
  // Standing again is a decision of its own, recorded before the contest and
  // separate from both its result and taking office.
  // The state jurisdiction is established before the intent is recorded: a
  // vacant office has no person to name, and the record still has to be about
  // the state whose office it is.
  const withState = ensureStateJurisdiction(current, stateUsps);
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  const next = recordGovernorCandidacyIntent(withState, {
    office,
    year,
    stateJurisdictionId: stateId,
    incumbentPersonId: incumbent?.id ?? null,
    seeking,
    reason,
  });
  return { world: next, incumbentPersonId: incumbent?.id ?? null, seeking };
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * The sitting governor, when they stand again at the election the player is
 * filing for; null when the seat is open. Reads the same decision the
 * regular contest makes, made once and recorded.
 */
export function incumbentGovernorStandingAgain(
  world: World,
  stateUsps: string,
  electionDay: IsoDate,
): { readonly world: World; readonly incumbentPersonId: EntityId | null } {
  const office = stateExecutiveOffice(stateUsps);
  if (!office) return { world, incumbentPersonId: null };
  const year = Number(electionDay.slice(0, 4));
  const decided = decideIncumbentGovernor(world, stateUsps, year, electionDay);
  return {
    world: decided.world,
    incumbentPersonId: decided.seeking ? decided.incumbentPersonId : null,
  };
}

/** Opens the regular contest for one office, once, when its field closes. */
function openRegularContest(
  world: World,
  stateUsps: string,
  year: number,
  electionDay: IsoDate,
): World {
  const office = stateExecutiveOffice(stateUsps)!;
  const key = turnoverContestKey(office.officeKey, year);
  const contests = world.history.electionContests ?? [];
  if (
    contests.some(
      (contest) =>
        contest.stableKey === `${key}:contest` ||
        (contest.office.officeKey === office.officeKey &&
          contest.electionDate === electionDay),
    )
  )
    return world;
  const rng = new SeededRng(world.seed).fork(key);
  const decided = decideIncumbentGovernor(world, stateUsps, year, electionDay);
  const incumbent = decided.incumbentPersonId
    ? world.people[decided.incumbentPersonId]
    : undefined;
  const incumbentRuns = decided.seeking;
  // Each major party puts up a candidate, except the party of a governor who
  // is running again: that governor is its candidate.
  const incumbentParty =
    incumbentRuns && incumbent
      ? majorPartyOf(decided.world, incumbent.id, electionDay)
      : null;
  const challengerParties = MAJOR_PARTIES.filter(
    (party) => party !== incumbentParty,
  );
  const challengers = incumbentRuns && incumbentParty ? 1 : 2;
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  let next = decided.world;
  const inputs = Array.from({ length: challengers }, (_, index) => {
    const stableKey = `${key}:candidate:${index}`;
    const personRng = rng.fork(stableKey);
    return {
      stableKey,
      ...drawCanonicalNamedIdentity(
        personRng.fork("name"),
        generatePersonIdentity(personRng.fork("identity")),
      ),
      birthDate: inventedPersonBirthDate(personRng, {
        role: "state-executive-challenger",
        referenceDate: makeIsoDate(`${year}-01-01`),
      }),
      homeJurisdictionId: stateId,
    };
  });
  next = createCharacterHistoryContextPeople(next, inputs);
  next = affiliateChallengers(
    next,
    key,
    inputs.map((input, index) => ({
      personId: characterHistoryContextPersonId(next, input.stableKey),
      party: challengerParties[index] ?? null,
    })),
    stateId,
    electionDay,
  );
  const candidatePersonIds = [
    ...(incumbentRuns && incumbent ? [incumbent.id] : []),
    ...inputs.map((input) =>
      characterHistoryContextPersonId(next, input.stableKey),
    ),
  ];
  return scheduleElectionContest(next, {
    stableKey: `${key}:contest`,
    jurisdictionId: stateId,
    office: {
      officeKey: office.officeKey,
      title: office.displayName,
      seatKey: null,
      occupationClassification: `service:${office.officeKey}`,
    },
    electionDate: electionDay,
    candidatePersonIds,
    provenance: {
      method: "simulated",
      sourceEntityIds: [...candidatePersonIds].sort(),
      note: `${GOVERNOR_TURNOVER_PROFILE.id}: the regular election for ${office.displayName}, opened when the candidate field closed.`,
    },
  });
}

const MAJOR_PARTIES = ["democratic", "republican"] as const;

/**
 * Records each challenger as their party's candidate: a public affiliation
 * with the party, cited to the event that names them. Skipped where this
 * World has no national party to join (a world without its living politics).
 */
function affiliateChallengers(
  world: World,
  key: string,
  challengers: readonly {
    readonly personId: EntityId;
    readonly party: (typeof MAJOR_PARTIES)[number] | null;
  }[],
  stateId: EntityId,
  electionDay: IsoDate,
): World {
  let next = world;
  for (const { personId, party } of challengers) {
    if (!party) continue;
    const partyId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.nationalParty(party),
    );
    if (
      !next.history.organizations.some(
        (organization) => organization.id === partyId,
      ) ||
      majorPartyOf(next, personId, electionDay) === party
    )
      continue;
    const stableKey = `${key}:candidate:${personId}:party`;
    next = recordWorldEvent(next, {
      stableKey,
      type: "election.party-candidate-named",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: stateId,
      involvedEntityIds: [personId, partyId],
      participants: [
        { personId, role: "focus:subject", detail: `candidate:${party}` },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["election.governor", `party:${party}`],
      summary: `${personName(next.people[personId]!)} runs for governor as the ${party === "democratic" ? "Democratic" : "Republican"} candidate.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    next = createOrganizationParticipations(next, [
      {
        stableKey: `${stableKey}:affiliation`,
        personId,
        organizationId: partyId,
        startedAt: next.currentDate,
        initialStatus: "active",
        kind: PARTY_AFFILIATION_KIND,
        roleKind: "member:public-affiliation",
        context: "Public party affiliation",
        provenance: {
          kind: "simulated-event",
          eventId: next.history.events.at(-1)!.id,
        },
      },
    ]);
  }
  return next;
}

function officeForDue(due: FutureDueItem) {
  const match = /^governor-turnover\/v1:(.+):(\d{4}):/.exec(due.stableKey);
  if (!match) return null;
  const office = CHIEF_EXECUTIVE_JURISDICTIONS.map((usps) =>
    stateExecutiveOffice(usps),
  ).find((candidate) => candidate?.officeKey === match[1]);
  return office ? { office, year: Number(match[2]) } : null;
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

/** The field closes: open the regular contest and line up what follows. */
export function governorFieldCloseHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = officeForDue(due);
  if (!found) return done(world, "No office matches this field closing.");
  const rule = stateExecutiveTermRuleForElectionYear(
    world,
    found.office.stateUsps,
    found.year,
  );
  if (!rule) return done(world, "No office matches this field closing.");
  const electionDay = generalElectionDay(rule.election, found.year);
  // A law passed after this closing was scheduled can move the office's
  // elections to other years. The closing then has nothing to open; the next
  // one on the new calendar is scheduled instead.
  if (
    !isStateExecutiveElectionYearInWorld(
      world,
      found.office.stateUsps,
      found.year,
    )
  )
    return done(
      scheduleNextFieldClose(world, found.office.stateUsps, due.dueAt),
      `A law moved ${found.office.displayName}'s ${found.year} election; the next field closing is on the calendar.`,
    );
  let next = openRegularContest(
    world,
    found.office.stateUsps,
    found.year,
    electionDay,
  );
  const stateId = chiefExecutiveJurisdictionId(found.office.stateUsps)!;
  const planKey = `${turnoverContestKey(found.office.officeKey, found.year)}:term-plan`;
  if (!next.history.futureDueItems.some((d) => d.stableKey === planKey))
    next = scheduleFutureDueItem(next, {
      stableKey: planKey,
      dueAt: addDays(electionDay, 1),
      transitionKey: GOVERNOR_TERM_PLAN,
      entityIds: [stateId],
      jurisdictionId: stateId,
      provenance: {
        kind: "authored",
        note: `${GOVERNOR_TURNOVER_PROFILE.id}: the winner's term is dated the day after the election.`,
      },
    });
  next = scheduleNextFieldClose(next, found.office.stateUsps, electionDay);
  return done(next, `The field for ${found.office.displayName} closed.`);
}

/** The day after the election: date the winner's term. */
export function governorTermPlanHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = officeForDue(due);
  if (!found) return done(world, "No office matches this election.");
  const rule = stateExecutiveTermRuleForElectionYear(
    world,
    found.office.stateUsps,
    found.year,
  );
  if (!rule) return done(world, "No office matches this election.");
  const electionDay = generalElectionDay(rule.election, found.year);
  const contest = (world.history.electionContests ?? []).find(
    (candidate) =>
      candidate.office.officeKey === found.office.officeKey &&
      candidate.electionDate === electionDay &&
      electionContestResult(world, candidate.id),
  );
  if (!contest) return done(world, "No decided contest to date.");
  return done(
    planOrdinaryStateExecutiveTerm(world, contest.id),
    `The ${found.year} winner's term was dated.`,
  );
}

export function governorTurnoverHandlers() {
  return [
    [GOVERNOR_FIELD_CLOSE, governorFieldCloseHandler],
    [GOVERNOR_TERM_PLAN, governorTermPlanHandler],
  ] as const;
}
