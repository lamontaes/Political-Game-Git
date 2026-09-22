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
import { recordedTermsInOffice } from "./prior-terms";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./state-executive-candidacy-packs";
import {
  ensureStateJurisdiction,
  currentStateExecutiveHolders,
  stateExecutiveOffice,
} from "./state-executives";
import {
  generalElectionDay,
  stateExecutiveTermRule,
} from "./state-executive-term-rules";
import { planOrdinaryStateExecutiveTerm } from "./state-executive-terms";

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

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

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
  const holder = currentStateExecutiveHolders(world).find(
    (record) => record.officeKey === office.officeKey,
  );
  const incumbent = holder ? world.people[holder.personId] : undefined;
  const eligible =
    incumbent !== undefined &&
    world.control.kind === "person" &&
    world.control.personId !== incumbent.id &&
    ageOn(incumbent.birthDate, electionDay) <
      GOVERNOR_TURNOVER_PROFILE.retirementAge &&
    recordedTermsInOffice(world, incumbent.id, office.officeKey) <
      GOVERNOR_TURNOVER_PROFILE.incumbentStepsDownAfterTerms;
  const incumbentRuns =
    eligible &&
    rng.integer(0, 1000) < GOVERNOR_TURNOVER_PROFILE.incumbentRunsPermille;
  const challengers = incumbentRuns ? 1 : 2;
  // Standing again is a decision of its own, recorded before the contest and
  // separate from both its result and taking office.
  // The state jurisdiction is established before the intent is recorded: a
  // vacant office has no person to name, and the record still has to be about
  // the state whose office it is.
  const withState = ensureStateJurisdiction(world, stateUsps);
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  let next = recordGovernorCandidacyIntent(withState, {
    office,
    year,
    stateJurisdictionId: stateId,
    incumbentPersonId: incumbent?.id ?? null,
    seeking: incumbentRuns,
    reason:
      incumbent === undefined
        ? "no sitting governor is on record."
        : !eligible
          ? "they cannot or will not stand again under this game profile."
          : "they are standing down.",
  });
  const inputs = Array.from({ length: challengers }, (_, index) => {
    const stableKey = `${key}:candidate:${index}`;
    const personRng = rng.fork(stableKey);
    const age = personRng.integer(38, 68);
    return {
      stableKey,
      ...drawCanonicalNamedIdentity(
        personRng.fork("name"),
        generatePersonIdentity(personRng.fork("identity")),
      ),
      birthDate: makeIsoDate(
        `${year - age}-${pad(personRng.integer(1, 13))}-${pad(personRng.integer(1, 29))}`,
      ),
      homeJurisdictionId: stateId,
    };
  });
  next = createCharacterHistoryContextPeople(next, inputs);
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
  const rule = stateExecutiveTermRule(found.office.stateUsps)!;
  const electionDay = generalElectionDay(rule.election, found.year);
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
  const rule = stateExecutiveTermRule(found.office.stateUsps)!;
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

export const GOVERNOR_TURNOVER_HANDLERS = [
  [GOVERNOR_FIELD_CLOSE, governorFieldCloseHandler],
  [GOVERNOR_TERM_PLAN, governorTermPlanHandler],
] as const;
