import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { scheduleSeatFilling } from "../governing/office-continuity";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { makeIsoDate } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { electionContestResult } from "../election-contests";
import { stateJurisdictionForKey } from "../life-places";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { seatStartingCondition } from "../world-setup/conditions";
import { aggregateCongressAffiliation } from "./congress-aggregate-outcome";
import {
  congressCandidateIntakeDay,
  congressCandidateSlate,
  congressFieldIntakeDay,
  congressGeneralCandidates,
  congressNominationPlan,
  prepareCongressCandidateSlates,
  slateKey,
  type CongressCandidateSeatPlan,
} from "./congress-candidates";
import { holdFiledNominations } from "../nominations/party-nominations";
import {
  endCongressSeatWork,
  takeCongressSeatWork,
} from "./congress-member-work";
import { MINIMUM_AGE, congressSeats, seatTermWindow } from "./congress-seats";
import type { CongressSeat } from "./congress-seats";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_CAUCUS_TAG,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
  SEAT_VACANCY_EVENT,
  congressSeatTitle,
  livingWorldEstablished,
  livingWorldOrganizationId,
} from "./opening";
import {
  hasStableKey,
  recordByStableKey,
  recordsWithFieldValue,
} from "../history-index";

/**
 * CONGRESS CONTINUITY — the regular elections the opening snapshot does not
 * contain.
 *
 * The opening records one term per seat. Without this, every House seat and
 * one Senate class read "no current record" once January 3, 2027 passed.
 * Time now carries each seat forward:
 *
 * - On the general election day (2 U.S.C. § 7: the Tuesday after the first
 *   Monday in November of every even year) the seats whose terms end the
 *   following January 3 are decided, and one public results record names the
 *   winners. Candidate slates usually establish successors earlier in the
 *   year; an older save can still use the election-day fallback.
 * - On January 3 each winner's new term record is written, dated that day.
 *   A member-elect who died in between leaves an actual vacancy with its cause.
 *
 * Uncontested background seats use a disclosed aggregate game model, not a
 * forecast or real result. Only dates the clock actually crosses act: reading or reopening a
 * save writes nothing, a save that already passed these dates keeps its
 * record, and no incumbent is extended without an election.
 */

export const CONGRESS_TURNOVER_VERSION = "congress-turnover/v1";

/**
 * PLACEHOLDER(overnight): an age-only incumbent filing floor is a game rule,
 * pending a person-level candidacy decision with recorded reasons. The
 * election day below is sourced to 2 U.S.C. section 7; this age is not.
 */
export const CONGRESS_TURNOVER_PROFILE = {
  id: "ocd-congress-aggregate-game-profile/v2",
  /** Incumbents this old or older retire. */
  retirementAge: 82,
} as const;

export const CONGRESS_ELECTION_SOURCE = {
  citation: "2 U.S.C. § 7",
  url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title2-section7&num=0&edition=prelim",
  excerpt:
    "The Tuesday next after the 1st Monday in November, in every even numbered year, is established as the day for the election",
} as const;

export const CONGRESS_RESULTS_EVENT = "election.congress-general-results";

const resultsKey = (year: number) =>
  `${CONGRESS_TURNOVER_VERSION}:results:${year}`;

export function congressionalElectionDay(year: number): IsoDate {
  const first = new Date(Date.UTC(year, 10, 1));
  const toMonday = (8 - first.getUTCDay()) % 7;
  return makeIsoDate(
    new Date(Date.UTC(year, 10, 2 + toMonday)).toISOString().slice(0, 10),
  );
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function latestSeatRecords(world: World): Map<string, HistoricalEvent> {
  const bySeat = new Map<string, HistoricalEvent>();
  // Read by type from an index: the latest record is the same whichever
  // order the two kinds are read in, since no two share a sequence.
  for (const event of [
    ...recordsWithFieldValue(world.history.events, "type", SEAT_TENURE_EVENT),
    ...recordsWithFieldValue(world.history.events, "type", SEAT_VACANCY_EVENT),
  ]) {
    if (!event.tags.includes(LIVING_WORLD_WRITER_VERSION)) continue;
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
  return bySeat;
}

function aliveOn(world: World, personId: EntityId, date: IsoDate): boolean {
  return (
    Boolean(world.people[personId]) &&
    !recordsWithFieldValue(
      world.history.personDeaths,
      "personId",
      personId,
    ).some((death) => death.diedAt <= date)
  );
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

interface SeatOutcome {
  readonly seat: CongressSeat;
  readonly incumbentPersonId: EntityId | null;
  readonly successorKey: string | null;
  /** Set when a recorded contest, not the profile, chose this winner. */
  readonly recordedWinnerPersonId?: EntityId | null;
  readonly party: string;
  readonly caucus: string;
  readonly serviceSince: IsoDate;
}

/** The world's own contest for this seat and day, if one was scheduled. */
export function recordedSeatContest(
  world: World,
  seat: CongressSeat,
  electionDay: IsoDate,
) {
  return recordsWithFieldValue(
    world.history.electionContests ?? [],
    "electionDate",
    electionDay,
  ).find(
    (contest) =>
      contest.office.seatKey === seat.seatKey ||
      contest.office.officeKey === seat.seatKey,
  );
}

/**
 * Whether the sitting member is seeking another term, as a recorded decision
 * of its own. It is written before the election and read by it, so standing
 * again, the result, and taking office stay three separate facts.
 */
const SEEKS_TERM_EVENT = "election.congress-candidacy-intent";

function seekingKey(seatKey: string, year: number): string {
  return `${CONGRESS_TURNOVER_VERSION}:seeking:${seatKey}:${year}`;
}

export function recordSeatCandidacyIntent(
  world: World,
  seat: CongressSeat,
  year: number,
  incumbentPersonId: EntityId | null,
  seeking: boolean,
  reason: string,
  options: {
    readonly occurredAt?: IsoDate;
    readonly decisionTraceId?: EntityId;
  } = {},
): World {
  const stableKey = seekingKey(seat.seatKey, year);
  if (hasStableKey(world.history.events, stableKey)) return world;
  const chamberId = livingWorldOrganizationId(
    world,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  const title = congressSeatTitle(seat);
  return recordWorldEvent(world, {
    stableKey,
    type: SEEKS_TERM_EVENT,
    occurredAt: options.occurredAt ?? world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
    involvedEntityIds: [
      ...new Set([
        chamberId,
        ...(incumbentPersonId ? [incumbentPersonId] : []),
      ]),
    ].sort(),
    participants: incumbentPersonId
      ? [
          {
            personId: incumbentPersonId,
            role: "focus:subject",
            detail: seeking ? "seeking-another-term" : "not-seeking",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CONGRESS_TURNOVER_VERSION,
      `seat:${seat.seatKey}`,
      `intent:${seeking ? "seeking" : "not-seeking"}`,
      `provenance:${CONGRESS_TURNOVER_PROFILE.id}`,
      ...(options.decisionTraceId
        ? [`decision-trace:${options.decisionTraceId}`]
        : []),
    ],
    summary: seeking
      ? `The ${title} is seeking another term.`
      : `The ${title} is not seeking another term: ${reason}`,
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

/** The recorded intent, or null when nobody has recorded one. */
export function seatCandidacyIntent(
  world: World,
  seatKey: string,
  year: number,
): boolean | null {
  const event = recordByStableKey(
    world.history.events,
    seekingKey(seatKey, year),
  );
  return event ? event.tags.includes("intent:seeking") : null;
}

// PLACEHOLDER(overnight): this preference age is a game assumption until a
// person-level ambition and retirement model has admitted calibration.
const CANDIDACY_STEP_DOWN_PREFERENCE_AGE = 75;

/** A dated NPC choice precedes the public candidate slate. */
function prepareCongressIntake(
  world: World,
  year: number,
  due: readonly { readonly seat: CongressSeat; readonly intakeDate: IsoDate }[],
): World {
  if (due.length === 0) return world;
  const latest = latestSeatRecords(world);
  const electionDay = congressionalElectionDay(year);
  let next = world;
  const plans: CongressCandidateSeatPlan[] = [];
  for (const { seat, intakeDate } of due) {
    if (congressCandidateSlate(next, seat.seatKey, year)) continue;
    const record = latest.get(seat.seatKey);
    const incumbentPersonId =
      record?.type === SEAT_TENURE_EVENT
        ? (record.participants.find((row) => row.role === "focus:subject")
            ?.personId ?? null)
        : null;
    // A controlled member's decision belongs to the player. A separately
    // filed contest likewise owns its own candidate list and result.
    if (
      (incumbentPersonId && isControlled(next, incumbentPersonId)) ||
      recordedSeatContest(next, seat, electionDay)
    )
      continue;
    const incumbent = incumbentPersonId
      ? next.people[incumbentPersonId]
      : undefined;
    const alive = incumbentPersonId
      ? aliveOn(next, incumbentPersonId, intakeDate)
      : false;
    const tooOld =
      incumbent !== undefined &&
      ageOn(incumbent.birthDate, electionDay) >=
        CONGRESS_TURNOVER_PROFILE.retirementAge;
    let seeking = false;
    let decisionTraceId: EntityId | undefined;
    if (incumbent && alive && !tooOld && record) {
      const decisionKey = `${seekingKey(seat.seatKey, year)}:decision`;
      const age = ageOn(incumbent.birthDate, electionDay);
      const evaluation = evaluateDecision(next, {
        stableKey: decisionKey,
        decisionType: "election.consider-another-congress-term",
        actorPersonId: incumbent.id,
        cutoff: {
          asOfDate: intakeDate,
          historySequenceExclusive: next.history.nextSequence,
        },
        subject: { kind: "context:life", key: seat.seatKey, entityId: null },
        options: [
          {
            key: "seek",
            label: "Seek another term",
            description: "Run again.",
          },
          {
            key: "step-down",
            label: "Step down",
            description: "Leave the seat.",
          },
        ],
        constraints: [],
        considerations: [
          {
            stableKey: `${decisionKey}:serving`,
            optionKey: "seek",
            sourceType: "institution:current-office",
            direction: "supports",
            importance: "strong",
            confidence: "high",
            explanation: "They are serving in this seat.",
            sourceRefs: [{ kind: "historical-event", eventId: record.id }],
          },
          ...(age >= CANDIDACY_STEP_DOWN_PREFERENCE_AGE
            ? [
                {
                  stableKey: `${decisionKey}:age`,
                  optionKey: "step-down" as const,
                  sourceType: "context:age" as const,
                  direction: "supports" as const,
                  importance: "decisive" as const,
                  confidence: "medium" as const,
                  explanation: "They are considering retirement from Congress.",
                  sourceRefs: [],
                },
              ]
            : []),
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
      next = recordDurableDecisionTrace(next, evaluation);
      decisionTraceId = next.history.decisionTraces.at(-1)!.id;
      seeking = evaluation.selectedOptionKey === "seek";
    }
    next = recordSeatCandidacyIntent(
      next,
      seat,
      year,
      incumbentPersonId,
      seeking,
      !incumbentPersonId
        ? "the seat has no sitting member."
        : !alive
          ? "the seat is vacant."
          : tooOld
            ? `they are ${CONGRESS_TURNOVER_PROFILE.retirementAge} or older.`
            : "they decided to step down.",
      { occurredAt: intakeDate, decisionTraceId },
    );
    plans.push({
      seat,
      incumbentPersonId,
      incumbentParty: record ? tagValue(record, SEAT_PARTY_TAG) : null,
      incumbentSeeking: seeking,
      intakeDate,
    });
  }
  return prepareCongressCandidateSlates(next, year, plans);
}

/** Whether this is the person being played, whose seat only their own race decides. */
function isControlled(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function decideSeat(
  world: World,
  seat: CongressSeat,
  record: HistoricalEvent | undefined,
  year: number,
  newStart: IsoDate,
  electionDay: IsoDate,
): SeatOutcome | null {
  const incumbent =
    record?.type === SEAT_TENURE_EVENT
      ? record.participants.find((p) => p.role === "focus:subject")?.personId
      : undefined;
  const recordedParty = record ? tagValue(record, SEAT_PARTY_TAG) : null;
  const recordedCaucus = record ? tagValue(record, SEAT_CAUCUS_TAG) : null;
  const person = incumbent ? world.people[incumbent] : undefined;
  const eligible =
    incumbent !== undefined &&
    person !== undefined &&
    aliveOn(world, incumbent, electionDay) &&
    ageOn(person.birthDate, electionDay) <
      CONGRESS_TURNOVER_PROFILE.retirementAge;
  // A contest this world actually scheduled decides its own seat. The
  // turnover profile is a fallback for seats nobody contested here, and it
  // never overwrites a recorded result.
  const contest = recordedSeatContest(world, seat, electionDay);
  if (contest) {
    const result = electionContestResult(world, contest.id);
    if (!result) return null;
    const incumbentWon = result.winnerPersonId === incumbent;
    return {
      seat,
      incumbentPersonId: incumbentWon ? result.winnerPersonId : null,
      successorKey: null,
      recordedWinnerPersonId: result.winnerPersonId,
      party: incumbentWon ? (recordedParty ?? "none") : "none",
      caucus: incumbentWon ? (recordedCaucus ?? "none") : "none",
      serviceSince: incumbentWon
        ? ((record
            ? (tagValue(record, "service-since:") as IsoDate | null)
            : null) ??
          record?.occurredAt ??
          newStart)
        : newStart,
    };
  }
  const slate = congressCandidateSlate(world, seat.seatKey, year);
  if (slate) {
    const viable = congressGeneralCandidates(world, seat.seatKey, year).filter(
      (candidate) => aliveOn(world, candidate.personId, electionDay),
    );
    if (viable.length === 0) return null;
    const condition = seatStartingCondition(world, seat.seatKey);
    // A member who lost renomination is not on the ballot, so their party
    // carries no incumbent into the general election.
    const seeking =
      eligible &&
      seatCandidacyIntent(world, seat.seatKey, year) === true &&
      viable.some((candidate) => candidate.personId === incumbent);
    const preferredParty = aggregateCongressAffiliation({
      democraticShare: condition?.generatedShare ?? null,
      baselineAffiliation: condition?.affiliation ?? null,
      incumbentAffiliation: recordedParty,
      incumbentSeeking: seeking,
    });
    const supportFor = (party: string): number => {
      const share = condition?.generatedShare;
      if (share === null || share === undefined)
        return condition?.affiliation === party ? 1 : 0;
      if (party === "democratic") return share;
      if (party === "republican") return 1 - share;
      return 0;
    };
    const winner =
      viable.find((candidate) => candidate.party === preferredParty) ??
      [...viable].sort(
        (left, right) =>
          supportFor(right.party) - supportFor(left.party) ||
          left.personId.localeCompare(right.personId),
      )[0]!;
    const incumbentWon = winner.personId === incumbent;
    return {
      seat,
      incumbentPersonId: incumbentWon ? winner.personId : null,
      successorKey: null,
      recordedWinnerPersonId: winner.personId,
      party: winner.party,
      caucus:
        winner.party === "democratic" || winner.party === "republican"
          ? winner.party
          : (condition?.caucus ?? recordedCaucus ?? "none"),
      serviceSince: incumbentWon
        ? ((record
            ? (tagValue(record, "service-since:") as IsoDate | null)
            : null) ??
          record?.occurredAt ??
          newStart)
        : newStart,
    };
  }
  const seeking =
    (seatCandidacyIntent(world, seat.seatKey, year) ?? eligible) && eligible;
  const condition = seatStartingCondition(world, seat.seatKey);
  const party = aggregateCongressAffiliation({
    democraticShare: condition?.generatedShare ?? null,
    baselineAffiliation: condition?.affiliation ?? null,
    incumbentAffiliation: recordedParty,
    incumbentSeeking: seeking,
  });
  // Unknown seat views and unknown prior affiliation are not a coin toss.
  if (party === null) return null;
  const caucus =
    party === "democratic" || party === "republican"
      ? party
      : (condition?.caucus ?? recordedCaucus ?? "none");
  // The person being played keeps a seat only by winning it. With no contest
  // of theirs on the ballot, the background model neither returns them nor
  // retires them by chance: they did not file, so the seat goes to someone
  // new, the same as any member who stands down.
  if (incumbent !== undefined && isControlled(world, incumbent)) {
    return {
      seat,
      incumbentPersonId: null,
      successorKey: `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${newStart}:member`,
      party,
      caucus,
      serviceSince: newStart,
    };
  }
  // Standing again is separately recorded. The constituency projection can
  // defeat a seeking incumbent; holding office does not elect them by itself.
  const returns = seeking && recordedParty === party;
  if (returns && incumbent) {
    return {
      seat,
      incumbentPersonId: incumbent,
      successorKey: null,
      party,
      caucus,
      serviceSince:
        (record
          ? (tagValue(record, "service-since:") as IsoDate | null)
          : null) ??
        record?.occurredAt ??
        newStart,
    };
  }
  return {
    seat,
    incumbentPersonId: null,
    successorKey: `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${newStart}:member`,
    party,
    caucus,
    serviceSince: newStart,
  };
}

/** Election day: decide the seats whose terms end next January 3. */
function holdCongressElection(world: World, year: number): World {
  if (hasStableKey(world.history.events, resultsKey(year))) return world;
  const electionDay = congressionalElectionDay(year);
  const newStart = makeIsoDate(`${year + 1}-01-03`);
  const seats = congressSeats().filter(
    (seat) => seatTermWindow(seat, electionDay).endExclusive === newStart,
  );
  const latest = latestSeatRecords(world);
  // A save first resumed after the placeholder intake window still receives
  // real candidate people before results are written. Its event date is the
  // election day, rather than a fabricated earlier filing day.
  let intents = prepareCongressIntake(
    world,
    year,
    seats.map((seat) => ({ seat, intakeDate: electionDay })),
  );
  for (const seat of seats) {
    const record = latest.get(seat.seatKey);
    const incumbent =
      record?.type === SEAT_TENURE_EVENT
        ? (record.participants.find((p) => p.role === "focus:subject")
            ?.personId ?? null)
        : null;
    const person = incumbent ? intents.people[incumbent] : undefined;
    const tooOld =
      person !== undefined &&
      ageOn(person.birthDate, electionDay) >=
        CONGRESS_TURNOVER_PROFILE.retirementAge;
    const alive = incumbent ? aliveOn(intents, incumbent, electionDay) : false;
    const played = incumbent !== null && isControlled(intents, incumbent);
    const filed = recordedSeatContest(intents, seat, electionDay) !== undefined;
    const seeking =
      incumbent !== null && alive && !tooOld && (played ? filed : true);
    intents = recordSeatCandidacyIntent(
      intents,
      seat,
      year,
      incumbent,
      seeking,
      !incumbent
        ? "the seat has no sitting member."
        : !alive
          ? "the seat is vacant."
          : played && !filed
            ? "they did not file for another term."
            : tooOld
              ? `they are ${CONGRESS_TURNOVER_PROFILE.retirementAge} or older.`
              : "they are standing down.",
    );
  }
  // A seat whose own contest has not been decided yet is left undecided here:
  // no winner is invented to fill it.
  const outcomes = seats.flatMap((seat) => {
    const decided = decideSeat(
      intents,
      seat,
      latest.get(seat.seatKey),
      year,
      newStart,
      electionDay,
    );
    return decided ? [decided] : [];
  });
  // PLACEHOLDER(overnight): a slate with no living candidate produces no
  // winner. Write-ins and party substitution need their own admitted rules.
  const decidedSeats = new Set(outcomes.map((outcome) => outcome.seat.seatKey));
  const unfilledSlates = seats.filter(
    (seat) =>
      congressCandidateSlate(intents, seat.seatKey, year) &&
      !decidedSeats.has(seat.seatKey),
  );
  const inputs: CharacterHistoryContextPersonInput[] = outcomes.flatMap(
    (outcome) => {
      if (!outcome.successorKey) return [];
      const rng = new SeededRng(world.seed).fork(outcome.successorKey);
      const age = rng.integer(MINIMUM_AGE[outcome.seat.chamberKey] + 3, 70);
      return [
        {
          stableKey: outcome.successorKey,
          ...drawCanonicalNamedIdentity(
            rng.fork("name"),
            generatePersonIdentity(rng.fork("identity")),
          ),
          birthDate: makeIsoDate(
            `${year - age}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
          ),
          homeJurisdictionId: stateJurisdictionForKey(
            `US-${outcome.seat.stateUsps}`,
          )!.id,
        },
      ];
    },
  );
  let next =
    inputs.length > 0
      ? createCharacterHistoryContextPeople(intents, inputs)
      : intents;
  const returning = outcomes.filter((o) => o.incumbentPersonId).length;
  const winnerIds = outcomes.map(
    (outcome) =>
      outcome.recordedWinnerPersonId ??
      outcome.incumbentPersonId ??
      characterHistoryContextPersonId(next, outcome.successorKey!),
  );
  next = recordWorldEvent(next, {
    stableKey: resultsKey(year),
    type: CONGRESS_RESULTS_EVENT,
    occurredAt: electionDay,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      livingWorldOrganizationId(next, LIVING_WORLD_KEYS.chamber("us-house")),
      livingWorldOrganizationId(next, LIVING_WORLD_KEYS.chamber("us-senate")),
      ...new Set(winnerIds),
    ],
    participants: outcomes.map((outcome, index) => ({
      personId: winnerIds[index]!,
      role: "focus:winner" as const,
      detail: [
        outcome.seat.seatKey,
        outcome.party,
        outcome.caucus,
        outcome.incumbentPersonId ? "returning" : "new",
        outcome.serviceSince,
      ].join("|"),
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CONGRESS_TURNOVER_VERSION,
      CONGRESS_TURNOVER_PROFILE.id,
      `term-start:${newStart}`,
      ...unfilledSlates.map((seat) => `unfilled:${seat.seatKey}`),
    ],
    summary: `Voters chose ${outcomes.length} members of Congress in the ${year} general election: ${returning} incumbents return and ${outcomes.length - returning} seats get new members.`,
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

/** January 3: seat each recorded winner for the new term. */
function seatCongressWinners(world: World, year: number): World {
  const results = recordByStableKey(world.history.events, resultsKey(year));
  if (!results) return world;
  const newStart = makeIsoDate(`${year + 1}-01-03`);
  const seatsByKey = new Map(congressSeats().map((s) => [s.seatKey, s]));
  let next = world;
  for (const participant of results.participants) {
    const [seatKey, party, caucus, , serviceSince] = (
      participant.detail ?? ""
    ).split("|");
    const seat = seatKey ? seatsByKey.get(seatKey) : undefined;
    if (!seat || !party || !caucus || !serviceSince) continue;
    const stableKey = `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${newStart}`;
    const vacancyKey = `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:vacancy:${newStart}`;
    if (
      next.history.events.some(
        (event) =>
          event.stableKey === stableKey || event.stableKey === vacancyKey,
      )
    )
      continue;
    const window = seatTermWindow(seat, newStart);
    const jurisdictionId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
    const chamberId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.chamber(seat.chamberKey),
    );
    const seatTags = [
      LIVING_WORLD_WRITER_VERSION,
      CONGRESS_TURNOVER_VERSION,
      `office:${seat.chamberKey}`,
      `seat:${seat.seatKey}`,
      `state:${seat.stateUsps}`,
      `term-start:${window.startsAt}`,
      `term-end:${window.endExclusive}`,
    ];
    const context = {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    };
    const title = congressSeatTitle(seat);
    // The last term's job ends as the new one begins, unless its holder
    // was returned to the seat.
    next = endCongressSeatWork(next, {
      seatKey: seat.seatKey,
      continuingPersonId: aliveOn(next, participant.personId, newStart)
        ? participant.personId
        : null,
      effectiveAt: newStart,
      sourceEventId: results.id,
    });
    if (!aliveOn(next, participant.personId, newStart)) {
      next = recordWorldEvent(next, {
        stableKey: vacancyKey,
        type: SEAT_VACANCY_EVENT,
        occurredAt: newStart,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [chamberId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [...seatTags, "vacancy-cause:member-elect-died"],
        summary: `The seat of the ${title} is vacant: the member-elect died before the term began.`,
        context,
      });
      next = scheduleSeatFilling(next, seat, newStart).world;
      continue;
    }
    next = recordWorldEvent(next, {
      stableKey,
      type: SEAT_TENURE_EVENT,
      occurredAt: newStart,
      recordedAt: next.currentDate,
      jurisdictionId,
      involvedEntityIds: [participant.personId, chamberId],
      participants: [
        {
          personId: participant.personId,
          role: "focus:subject",
          detail: title,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        ...seatTags,
        `service-since:${serviceSince}`,
        `${SEAT_PARTY_TAG}${party}`,
        `${SEAT_CAUCUS_TAG}${caucus}`,
        `provenance:${CONGRESS_TURNOVER_PROFILE.id}`,
      ],
      summary: `${personName(next.people[participant.personId]!)} begins a term as ${title}.`,
      context,
    });
    if (isControlled(next, participant.personId))
      next = takeCongressSeatWork(next, {
        personId: participant.personId,
        seatKey: seat.seatKey,
        title,
        chamberOrganizationId: chamberId,
        jurisdictionId,
        startsAt: newStart,
        tenureEventId: recordByStableKey(next.history.events, stableKey)!.id,
      });
  }
  for (const tag of results.tags) {
    if (!tag.startsWith("unfilled:")) continue;
    const seatKey = tag.slice("unfilled:".length);
    const seat = seatsByKey.get(seatKey);
    if (!seat) continue;
    const vacancyKey = `${LIVING_WORLD_KEYS.seat(seatKey)}:vacancy:${newStart}`;
    if (hasStableKey(next.history.events, vacancyKey)) continue;
    const chamberId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.chamber(seat.chamberKey),
    );
    next = endCongressSeatWork(next, {
      seatKey,
      continuingPersonId: null,
      effectiveAt: newStart,
      sourceEventId: results.id,
    });
    next = recordWorldEvent(next, {
      stableKey: vacancyKey,
      type: SEAT_VACANCY_EVENT,
      occurredAt: newStart,
      recordedAt: next.currentDate,
      jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
      involvedEntityIds: [chamberId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        LIVING_WORLD_WRITER_VERSION,
        CONGRESS_TURNOVER_VERSION,
        `office:${seat.chamberKey}`,
        `seat:${seatKey}`,
        `state:${seat.stateUsps}`,
        `term-start:${newStart}`,
        `term-end:${seatTermWindow(seat, newStart).endExclusive}`,
        "vacancy-cause:no-living-candidate",
      ],
      summary: `The seat of the ${congressSeatTitle(seat)} is vacant: no living candidate remained when the election was held.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    next = scheduleSeatFilling(next, seat, newStart).world;
  }
  return next;
}

const SLATE_EVENT = "election.congress-candidate-slate";

/**
 * The nomination stage for every field filed this year: each state's primary
 * on its own date, and a runoff where one was left open. Only dates the clock
 * crosses act.
 */
function holdCongressNominations(
  before: IsoDate,
  world: World,
  year: number,
  electionDay: IsoDate,
): World {
  // Primaries and runoffs fall between the first filing and election day.
  if (world.currentDate < `${year}-02-01` || before >= electionDay)
    return world;
  const seatsByKey = new Map(
    congressSeats().map((seat) => [seat.seatKey, seat]),
  );
  return holdFiledNominations(before, world, {
    fieldType: SLATE_EVENT,
    stableKeySuffix: `:${year}`,
    seatFor: (field) => {
      const seat = seatsByKey.get(
        field.tags.find((tag) => tag.startsWith("seat:"))?.slice(5) ?? "",
      );
      if (!seat || field.stableKey !== slateKey(seat.seatKey, year))
        return null;
      return {
        seatKey: seat.seatKey,
        title: congressSeatTitle(seat),
        jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
        involvedEntityIds: [
          livingWorldOrganizationId(
            world,
            LIVING_WORLD_KEYS.chamber(seat.chamberKey),
          ),
        ],
        plan: () => congressNominationPlan(world, seat, year),
        partyShare: (party) => {
          const share = seatStartingCondition(
            world,
            seat.seatKey,
          )?.generatedShare;
          if (share === null || share === undefined) return null;
          return party === "democratic"
            ? share
            : party === "republican"
              ? 1 - share
              : null;
        },
        aliveOn: (personId, date) => aliveOn(world, personId, date),
      };
    },
  });
}

/**
 * Called whenever the canonical clock moves from `before` to the World's
 * current date. Only dates actually crossed act.
 */
export function applyCongressTurnover(before: IsoDate, world: World): World {
  const after = world.currentDate;
  if (after <= before || !livingWorldEstablished(world)) return world;
  let next = world;
  const firstYear = Number(before.slice(0, 4)) - 1;
  const lastYear = Number(after.slice(0, 4));
  for (let year = firstYear; year <= lastYear; year += 1) {
    if (year % 2 !== 0) continue;
    const electionDay = congressionalElectionDay(year);
    const newStart = makeIsoDate(`${year + 1}-01-03`);
    const due = congressSeats().flatMap((seat, index) => {
      if (seatTermWindow(seat, electionDay).endExclusive !== newStart)
        return [];
      // The field never files later than the game's own intake day, so a
      // day already past needs no look at the state's primary.
      if (congressCandidateIntakeDay(year, index) <= before) return [];
      const intakeDate = congressFieldIntakeDay(next, seat, year, index);
      return before < intakeDate && intakeDate <= after
        ? [{ seat, intakeDate }]
        : [];
    });
    next = prepareCongressIntake(next, year, due);
    next = holdCongressNominations(before, next, year, electionDay);
    if (before < electionDay && electionDay <= after)
      next = holdCongressElection(next, year);
    if (before < newStart && newStart <= after)
      next = seatCongressWinners(next, year);
  }
  return next;
}
