import {
  SUPREME_COURT_APPOINTMENTS_VERSION,
  ASSOCIATE_JUSTICE_NOMINATION,
  ASSOCIATE_JUSTICE_CONFIRMATION,
  SUPREME_COURT_NOMINATED_EVENT,
  SUPREME_COURT_VOTE_EVENT,
  SUPREME_COURT_SEATED_EVENT,
  SUPREME_COURT_VACANCY_EVENT,
  SUPREME_COURT_ID,
  SUPREME_COURT_APPOINTMENT_PROFILE,
} from "./supreme-court-appointment-profile";
export {
  SUPREME_COURT_APPOINTMENTS_VERSION,
  ASSOCIATE_JUSTICE_NOMINATION,
  ASSOCIATE_JUSTICE_CONFIRMATION,
  SUPREME_COURT_NOMINATED_EVENT,
  SUPREME_COURT_VOTE_EVENT,
  SUPREME_COURT_SEATED_EVENT,
  SUPREME_COURT_VACANCY_EVENT,
  SUPREME_COURT_ID,
  SUPREME_COURT_APPOINTMENT_PROFILE,
} from "./supreme-court-appointment-profile";
import { addDays, makeIsoDate } from "../dates";
import {
  considerationScore,
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { openJudicialAppointmentMatter } from "./state-governing";
import {
  judicialAppointmentContext,
  judicialNominationInstruction,
  type JudicialNominationInstruction,
} from "./executive-judicial-appointments";
import { currentFederalTenure } from "../federal-tenures";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import {
  courtById,
  seatHolderAt,
  seatJudge,
  seatsForCourt,
  vacateJudicialSeat,
} from "../judiciary/courts";
import { currentPresidentOf } from "../crisis/offices";
import { seatedCongressChamber } from "./congress-chambers";
import { decideChamberVote, publicPartyOf } from "./chamber-votes";
import {
  ensureOfficeholderPrinciples,
  principleAgreement,
} from "./officeholder-principles";
import type {
  DecisionConsideration,
  DecisionContext,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";

/**
 * FILLING A SEAT ON THE SUPREME COURT — U.S. Const. art. II, § 2, cl. 2: the
 * President "shall nominate, and by and with the Advice and Consent of the
 * Senate, shall appoint ... Judges of the supreme Court".
 *
 * Every seat, the Chief Justice's and the associate justices', is filled the
 * same way: the sitting President chooses a nominee from the judges the World
 * already seats, and the senators who actually hold seats vote. A nomination
 * the Senate rejects goes back to the President, who names someone else.
 *
 * What decides, and whether it is measured or set by hand:
 *
 * 1. The pace. MEASURED: from nomination to the Senate's final vote took a
 *    median of 66 days for the 17 justices confirmed from 1975 through 2022
 *    (senate.gov, "Supreme Court Nominations, 1789-Present", read September
 *    28, 2026). PLACEHOLDER (filed as `supreme-court-vacancy-to-nomination`):
 *    30 days from a vacancy to the nomination.
 * 2. The vote threshold. LAW: a majority of senators voting. Since the
 *    Senate's precedent of April 6, 2017, ending debate on a Supreme Court
 *    nomination also takes only a majority, so no separate cloture count is
 *    modeled. The Vice President votes only to break a tie (art. I, § 3,
 *    cl. 4).
 * 3. Whom the President picks. Each President weighs every sitting federal
 *    appeals judge and state supreme court justice (and, for Chief Justice,
 *    every sitting associate justice) by the reasons below. PLACEHOLDER
 *    (filed as `supreme-court-nominee-selection`): how much each reason
 *    weighs, and the age bands. Inferred from the senate.gov list: all but
 *    one justice confirmed since 1990 came from a federal appeals court. A
 *    judge's legal views do not count yet, because the World records no
 *    judicial philosophy for its opening judges.
 * 4. How a senator votes. Each senator weighs whether the nominee comes from
 *    the President's party, the nominee's time on the bench, and whether the
 *    nominee is from the senator's own state. PLACEHOLDER (filed as
 *    `supreme-court-confirmation-votes`): how much each reason weighs.
 *    MEASURED for comparison (same senate.gov list): the last five
 *    confirmations, 2017 to 2022, drew 50 to 54 votes; the 1975 to 1994
 *    confirmations drew 52 to 99.
 *
 * The player is never voted for and never nominated without being asked: a
 * player who is a senator is recorded absent, and the player's character is
 * not in the nominee pool.
 */
const ASSOCIATE_TITLE = "Associate Justice of the Supreme Court";

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

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

function isDead(world: World, personId: EntityId): boolean {
  return world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/** The bench a person sits on now, if any, read from the court catalog. */
export type BenchService =
  "associate-justice" | "federal-appeals" | "state-supreme" | null;

export interface SupremeCourtCandidate {
  readonly personId: EntityId;
  readonly bench: Exclude<BenchService, null>;
  /** Judicial seats the person would leave on being confirmed. */
  readonly heldSeatIds: readonly string[];
}

/**
 * Everyone a President can weigh: sitting federal appeals judges and state
 * supreme court justices, plus sitting associate justices for Chief Justice.
 */
export function supremeCourtNomineePool(
  world: World,
  office: "chief" | "associate",
  exclude: readonly EntityId[] = [],
): readonly SupremeCourtCandidate[] {
  const judiciary = world.judiciary;
  if (!judiciary) return [];
  const excluded = new Set([
    ...exclude,
    ...(controlledPersonId(world) ? [controlledPersonId(world)!] : []),
  ]);
  const byPerson = new Map<
    EntityId,
    { bench: Exclude<BenchService, null>; seats: string[] }
  >();
  const rank = {
    "associate-justice": 3,
    "federal-appeals": 2,
    "state-supreme": 1,
  };
  for (const seat of Object.values(judiciary.seats)) {
    if (seat.retiredAt !== null || seat.linkedOfficeId) continue;
    const court = judiciary.courts[seat.courtId];
    if (!court) continue;
    const bench: BenchService =
      court.courtId === SUPREME_COURT_ID
        ? office === "chief"
          ? "associate-justice"
          : null
        : court.level === "federal-appellate"
          ? "federal-appeals"
          : court.level === "local-highest"
            ? "state-supreme"
            : null;
    if (!bench) continue;
    const holder = seatHolderAt(world, seat.seatId);
    if (!holder || excluded.has(holder.personId)) continue;
    const current = byPerson.get(holder.personId);
    if (!current)
      byPerson.set(holder.personId, { bench, seats: [seat.seatId] });
    else {
      current.seats.push(seat.seatId);
      if (rank[bench] > rank[current.bench]) current.bench = bench;
    }
  }
  return [...byPerson.entries()]
    .filter(([personId]) => world.people[personId] && !isDead(world, personId))
    .map(([personId, entry]) => ({
      personId,
      bench: entry.bench,
      heldSeatIds: entry.seats.sort(),
    }))
    .sort((a, b) => a.personId.localeCompare(b.personId));
}

function candidateReasons(
  world: World,
  candidate: SupremeCourtCandidate,
  presidentId: EntityId,
): DecisionConsideration[] {
  const person = world.people[candidate.personId]!;
  const reasons: DecisionConsideration[] = [];
  const option = candidate.personId;
  reasons.push(
    candidate.bench === "associate-justice"
      ? {
          stableKey: `nominee:${option}:bench`,
          optionKey: option,
          sourceType: "context:bench-service",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation: `${personName(person)} already sits on the Supreme Court.`,
          sourceRefs: [],
        }
      : candidate.bench === "federal-appeals"
        ? {
            stableKey: `nominee:${option}:bench`,
            optionKey: option,
            sourceType: "context:bench-service",
            direction: "supports",
            importance: "strong",
            confidence: "medium",
            explanation: `${personName(person)} sits on a federal court of appeals.`,
            sourceRefs: [],
          }
        : {
            stableKey: `nominee:${option}:bench`,
            optionKey: option,
            sourceType: "context:bench-service",
            direction: "supports",
            importance: "moderate",
            confidence: "medium",
            explanation: `${personName(person)} sits on a state supreme court.`,
            sourceRefs: [],
          },
  );
  // PLACEHOLDER (supreme-court-nominee-selection): the age bands. A younger
  // justice serves longer, which is the reason a President has.
  const age = ageOn(person.birthDate, world.currentDate);
  if (age < 55 || age >= 62)
    reasons.push({
      stableKey: `nominee:${option}:years`,
      optionKey: option,
      sourceType: "context:years-of-service-ahead",
      direction: age < 55 ? "supports" : "opposes",
      importance: "moderate",
      confidence: "medium",
      explanation:
        age < 55
          ? `At ${age}, ${personName(person)} could serve for decades.`
          : `At ${age}, ${personName(person)} would likely serve fewer years.`,
      sourceRefs: [],
    });
  const president = world.people[presidentId];
  if (president && president.homeJurisdictionId === person.homeJurisdictionId)
    reasons.push({
      stableKey: `nominee:${option}:home`,
      optionKey: option,
      sourceType: "context:shared-home-state",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: `${personName(person)} is from the President's home state.`,
      sourceRefs: [],
    });
  return reasons;
}

export interface PresidentialNomineeInput {
  readonly stableKey: string;
  readonly presidentId: EntityId;
  readonly office: "chief" | "associate";
  readonly exclude?: readonly EntityId[];
}

function presidentialNomineeContext(
  world: World,
  input: PresidentialNomineeInput,
): DecisionContext {
  const pool = supremeCourtNomineePool(world, input.office, [
    input.presidentId,
    ...(input.exclude ?? []),
  ]);
  return {
    stableKey: `${input.stableKey}:president-choice`,
    decisionType: "governing.supreme-court-nomination",
    actorPersonId: input.presidentId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:supreme-court-seat",
      key: input.stableKey,
      entityId: null,
    },
    options: [
      ...pool.map((candidate) => ({
        key: candidate.personId,
        label: personName(world.people[candidate.personId]!),
        description: "Nominate this judge.",
      })),
      {
        key: "no-nomination",
        label: "Leave the nomination pending",
        description: "Do not nominate a judge yet.",
      },
    ],
    constraints: [],
    considerations: pool.flatMap((candidate) =>
      candidateReasons(world, candidate, input.presidentId),
    ),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  };
}

/** A bounded desk list ordered by the existing Court reasons. No new judges. */
export function presidentialNomineeShortList(
  world: World,
  input: PresidentialNomineeInput,
): readonly SupremeCourtCandidate[] {
  const score = (candidate: SupremeCourtCandidate) =>
    candidateReasons(world, candidate, input.presidentId).reduce(
      (total, reason) => total + considerationScore(reason),
      0,
    );
  return [
    ...supremeCourtNomineePool(world, input.office, [
      input.presidentId,
      ...(input.exclude ?? []),
    ]),
  ]
    .sort(
      (left, right) =>
        score(right) - score(left) ||
        left.personId.localeCompare(right.personId),
    )
    .slice(0, 8);
}

/** NPC choice only. The controlled President chooses through the shared desk. */
export function choosePresidentialNominee(
  world: World,
  input: PresidentialNomineeInput,
): SupremeCourtCandidate | null {
  if (controlledPersonId(world) === input.presidentId) return null;
  const pool = supremeCourtNomineePool(world, input.office, [
    input.presidentId,
    ...(input.exclude ?? []),
  ]);
  if (!pool.length) return null;
  const evaluation = evaluateDecision(
    world,
    presidentialNomineeContext(world, input),
  );
  if (!isSelectedDecision(evaluation)) return null;
  return (
    pool.find(
      (candidate) => candidate.personId === evaluation.selectedOptionKey,
    ) ?? null
  );
}

/** Keep the existing Court reasons and actual alternatives, with a recorded
 * player instruction instead of selecting on the President's behalf. */
export function recordPlayerJudicialNominee(
  world: World,
  matterEventId: EntityId,
  personId: EntityId,
): World | null {
  const matter = world.history.events.find(
    (event) => event.id === matterEventId,
  );
  const dueId = matter?.tags
    .find((tag) => tag.startsWith("appointment-due:"))
    ?.slice("appointment-due:".length);
  const due = world.history.futureDueItems.find((row) => row.id === dueId);
  const context = due ? judicialAppointmentContext(world, due) : null;
  if (
    !matter ||
    matter.type !== "governing.matter-opened" ||
    matter.occurredAt > world.currentDate ||
    matter.recordedAt > world.currentDate ||
    !context ||
    controlledPersonId(world) !== context.presidentId ||
    !matter.tags.includes("appointment-domain:judicial") ||
    !matter.tags.includes("office:us-president") ||
    !matter.tags.includes(`source-event:${context.vacancyEventId}`) ||
    !matter.participants.some(
      (row) =>
        row.role === "agency:officeholder" &&
        row.personId === context.presidentId,
    ) ||
    !matter.participants.some(
      (row) => row.role === "focus:candidate" && row.personId === personId,
    ) ||
    !context.candidates.some((row) => row.personId === personId) ||
    world.history.events.some(
      (event) =>
        event.type === "governing.matter-decided" &&
        event.tags.includes(`matter:${matterEventId}`),
    )
  )
    return null;
  const packet = presidentialNomineeContext(world, {
    stableKey: due!.stableKey,
    presidentId: context.presidentId,
    office: context.office,
    exclude: context.rejected,
  });
  const prior = world.history.decisionTraces.find(
    (trace) => trace.stableKey === `${packet.stableKey}:trace`,
  );
  if (prior)
    return prior.context.actorPersonId === context.presidentId &&
      prior.context.subject.key === due!.stableKey &&
      prior.selectedOptionKey === personId
      ? world
      : null;
  const evaluation = evaluateDecision(world, {
    ...packet,
    randomness: "none",
    retention: "durable",
    constraints: packet.options
      .filter((option) => option.key !== personId)
      .map((option) => ({
        stableKey: `${packet.stableKey}:player-instruction:${option.key}`,
        optionKey: option.key,
        kind: "player:recorded-choice",
        explanation:
          "The controlled President explicitly chose another nominee.",
        sourceRefs: [
          { kind: "historical-event" as const, eventId: matterEventId },
        ],
      })),
  });
  return isSelectedDecision(evaluation) &&
    evaluation.selectedOptionKey === personId
    ? recordDurableDecisionTrace(world, evaluation)
    : null;
}

function benchOf(world: World, personId: EntityId): BenchService {
  const pool = supremeCourtNomineePool(world, "chief");
  return (
    pool.find((candidate) => candidate.personId === personId)?.bench ?? null
  );
}

export interface ConfirmationBallot {
  readonly personId: EntityId;
  readonly memberKey: string;
  readonly ballot: "yea" | "nay" | "absent" | "present-not-voting";
  readonly reason: string;
}

export interface ConfirmationVote {
  readonly ballots: readonly ConfirmationBallot[];
  readonly yeas: number;
  readonly nays: number;
  /** The Vice President's vote, cast only on a tie. */
  readonly tieBreaker: {
    readonly personId: EntityId;
    readonly ballot: "yea" | "nay";
  } | null;
  readonly confirmed: boolean;
}

function senatorReasons(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly partyKey: string | null;
    readonly stateUsps: string | null;
    readonly nomineeId: EntityId;
    readonly presidentParty: string | null;
    readonly bench: BenchService;
  },
): DecisionConsideration[] {
  const nominee = world.people[input.nomineeId]!;
  const reasons: DecisionConsideration[] = [];
  // PLACEHOLDER (supreme-court-confirmation-votes): the weights.
  if (input.partyKey && input.presidentParty)
    reasons.push(
      input.partyKey === input.presidentParty
        ? {
            stableKey: "senator:president-party",
            optionKey: "vote-yea",
            sourceType: "context:president-party",
            direction: "supports",
            importance: "strong",
            confidence: "high",
            explanation:
              "The nominee is the choice of a President of the senator's own party.",
            sourceRefs: [],
          }
        : {
            stableKey: "senator:president-party",
            optionKey: "vote-nay",
            sourceType: "context:president-party",
            direction: "supports",
            importance: "strong",
            confidence: "medium",
            explanation:
              "The nominee is the choice of a President of the other party.",
            sourceRefs: [],
          },
    );
  reasons.push(
    input.bench
      ? {
          stableKey: "senator:nominee-bench",
          optionKey: "vote-yea",
          sourceType: "context:bench-service",
          direction: "supports",
          importance: "moderate",
          confidence: "high",
          explanation: `${personName(nominee)} already serves as a judge.`,
          sourceRefs: [],
        }
      : {
          stableKey: "senator:nominee-bench",
          optionKey: "vote-nay",
          sourceType: "context:bench-service",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation: `${personName(nominee)} has never served as a judge.`,
          sourceRefs: [],
        },
  );
  // The nominee's record as the senator reads it: how far the principles
  // the nominee holds agree with the senator's own. The game records no
  // court rulings yet, so the principles stand for the record; a nominee
  // with none gives the senator nothing to weigh here.
  const views = principleAgreement(world, input.personId, input.nomineeId);
  if (views.importance)
    reasons.push({
      stableKey: "senator:nominee-views",
      optionKey: views.score > 0 ? "vote-yea" : "vote-nay",
      sourceType: "belief:political-principle",
      direction: "supports",
      importance: views.importance,
      confidence: "medium",
      explanation:
        views.score > 0
          ? `${personName(nominee)}'s views match the senator's principles.`
          : `${personName(nominee)}'s views cut against the senator's principles.`,
      sourceRefs: views.recordIds.map((principleRecordId) => ({
        kind: "political-principle" as const,
        principleRecordId,
      })),
    });
  const home = input.stateUsps
    ? stateJurisdictionForKey(`US-${input.stateUsps}`)
    : null;
  if (home && home.id === nominee.homeJurisdictionId)
    reasons.push({
      stableKey: "senator:home-state-nominee",
      optionKey: "vote-yea",
      sourceType: "context:home-state-nominee",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: `${personName(nominee)} is from the senator's own state.`,
      sourceRefs: [],
    });
  return reasons;
}

/**
 * The seated Senate votes on a nomination. Returns null when the World has no
 * seated Senate (an older save), so a caller can keep its earlier rule.
 */
export function senateConfirmationVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly nomineeId: EntityId;
    readonly presidentId: EntityId;
    readonly nominationEventId: EntityId;
    readonly officeKey: string;
  },
): ConfirmationVote | null {
  const senate = seatedCongressChamber(world, "senate");
  if (!senate || senate.body.members.length === 0) return null;
  const presidentParty = publicPartyOf(world, input.presidentId);
  const bench = benchOf(world, input.nomineeId);
  const player = controlledPersonId(world);
  const considerationsByMember = new Map(
    senate.body.members
      .filter((member) => member.personId !== null)
      .map((member) => [
        member.memberKey,
        senatorReasons(world, {
          personId: member.personId!,
          partyKey: member.partyKey ?? publicPartyOf(world, member.personId!),
          stateUsps:
            /us-senate:([A-Z]{2}):/.exec(member.memberKey)?.[1] ?? null,
          nomineeId: input.nomineeId,
          presidentParty,
          bench,
        }),
      ]),
  );
  const chamberInput = {
    ...input,
    kind: "nomination" as const,
    considerationsByMember,
  };
  const ballots: ConfirmationBallot[] = decideChamberVote(world, {
    ...chamberInput,
    members: senate.body.members,
    playerPersonId: player,
  }).flatMap((row) =>
    row.personId === null
      ? []
      : [
          {
            personId: row.personId,
            memberKey: row.memberKey,
            ballot: row.disposition === "excused" ? "absent" : row.disposition,
            reason:
              row.personId === player
                ? "senator:player-not-asked"
                : (row.reason ?? "senator:no-reason"),
          },
        ],
  );
  const yeas = ballots.filter((b) => b.ballot === "yea").length;
  const nays = ballots.filter((b) => b.ballot === "nay").length;
  let tieBreaker: ConfirmationVote["tieBreaker"] = null;
  if (yeas === nays && yeas > 0) {
    const vice = currentFederalTenure(world, "us-vice-president")?.personId;
    if (vice && vice !== player && world.people[vice] && !isDead(world, vice)) {
      const considerations = senatorReasons(world, {
        personId: vice,
        partyKey: publicPartyOf(world, vice),
        stateUsps: null,
        nomineeId: input.nomineeId,
        presidentParty,
        bench,
      });
      const viceMemberKey = `${input.stableKey}:vice-president`;
      const disposition = decideChamberVote(world, {
        ...chamberInput,
        stableKey: viceMemberKey,
        members: [
          {
            memberKey: viceMemberKey,
            personId: vice,
            name: personName(world.people[vice]!),
            partyKey: publicPartyOf(world, vice),
            caucusLabel: "Vice President",
          },
        ],
        considerationsByMember: new Map([[viceMemberKey, considerations]]),
        playerPersonId: player,
      })[0]!.disposition;
      if (disposition === "yea" || disposition === "nay")
        tieBreaker = { personId: vice, ballot: disposition };
    }
  }
  return {
    ballots,
    yeas,
    nays,
    tieBreaker,
    confirmed: yeas > nays || (yeas === nays && tieBreaker?.ballot === "yea"),
  };
}

/**
 * Before the Senate votes, the nominee and every senator hold principles
 * through the same writer every officeholder's come from, so a senator can
 * weigh the nominee's views against their own.
 */
export function briefSenateOnNominee(world: World, nomineeId: EntityId): World {
  const senate = seatedCongressChamber(world, "senate");
  return ensureOfficeholderPrinciples(world, [
    nomineeId,
    ...(senate?.body.members ?? []).flatMap((member) =>
      member.personId ? [member.personId] : [],
    ),
  ]);
}

/** Records the roll call as one public event naming every senator's ballot. */
export function recordConfirmationVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly nomineeId: EntityId;
    readonly officeTitle: string;
    readonly vote: ConfirmationVote;
    readonly tags: readonly string[];
  },
): { readonly world: World; readonly eventId: EntityId } {
  const nominee = world.people[input.nomineeId]!;
  const { vote } = input;
  const pending = vote.yeas + vote.nays === 0;
  const tie = vote.tieBreaker
    ? ` The Vice President broke the tie by voting ${vote.tieBreaker.ballot === "yea" ? "yes" : "no"}.`
    : "";
  const next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:senate-vote`,
    type: SUPREME_COURT_VOTE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      input.nomineeId,
      ...vote.ballots.map((ballot) => ballot.personId),
      ...(vote.tieBreaker ? [vote.tieBreaker.personId] : []),
    ],
    participants: [
      {
        personId: input.nomineeId,
        role: "focus:subject",
        detail: `Nominee for ${input.officeTitle}`,
      },
      ...vote.ballots.map((ballot) => ({
        personId: ballot.personId,
        role: "agency:senate-vote" as const,
        detail: `${ballot.ballot}|${ballot.reason}`,
      })),
      ...(vote.tieBreaker
        ? [
            {
              personId: vote.tieBreaker.personId,
              role: "agency:tie-breaking-vote" as const,
              detail: vote.tieBreaker.ballot,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      SUPREME_COURT_APPOINTMENTS_VERSION,
      ...input.tags,
      `yeas:${vote.yeas}`,
      `nays:${vote.nays}`,
      pending
        ? "outcome:pending"
        : vote.confirmed
          ? "outcome:confirmed"
          : "outcome:rejected",
    ],
    summary: pending
      ? `The Senate recorded no yes or no vote on ${personName(nominee)} for ${input.officeTitle}; the nomination remains pending.`
      : `The Senate ${vote.confirmed ? "confirmed" : "rejected"} ${personName(nominee)} as ${input.officeTitle}, ${vote.yeas} to ${vote.nays}.${tie}`,
    context: CONTEXT,
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

/** A confirmed judge leaves every judicial seat they held below. */
export function leaveLowerBench(world: World, personId: EntityId): World {
  let next = world;
  for (const seat of Object.values(world.judiciary?.seats ?? {})) {
    const holder = seatHolderAt(next, seat.seatId);
    if (holder?.personId !== personId || seat.linkedOfficeId) continue;
    next = vacateJudicialSeat(next, {
      seatId: seat.seatId,
      vacatedAt: next.currentDate,
      reason: "elevated",
    });
  }
  return next;
}

function associateNominationKey(
  ordinal: number,
  vacancyDate: IsoDate,
  after: IsoDate,
): string {
  return `${SUPREME_COURT_APPOINTMENTS_VERSION}:associate-nomination:${ordinal}:${vacancyDate}:${after}`;
}

export function scheduleAssociateNomination(
  world: World,
  ordinal: number,
  vacancyDate: IsoDate,
  presidentId: EntityId,
): World {
  const stableKey = associateNominationKey(
    ordinal,
    vacancyDate,
    world.currentDate,
  );
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(
      world.currentDate,
      SUPREME_COURT_APPOINTMENT_PROFILE.daysFromVacancyToNomination,
    ),
    transitionKey: ASSOCIATE_JUSTICE_NOMINATION,
    entityIds: [presidentId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${SUPREME_COURT_APPOINTMENT_PROFILE.id}: the President nominates an associate justice (U.S. Const. art. II, § 2, cl. 2); the ${SUPREME_COURT_APPOINTMENT_PROFILE.daysFromVacancyToNomination}-day interval is a game profile.`,
    },
  });
}

/** The associate seats a person holds on the Supreme Court now. */
export function associateJusticeSeatsHeldBy(
  world: World,
  personId: EntityId,
): readonly { readonly seatId: string; readonly ordinal: number }[] {
  if (!courtById(world, SUPREME_COURT_ID)) return [];
  return seatsForCourt(world, SUPREME_COURT_ID)
    .filter(
      (seat) =>
        !seat.linkedOfficeId &&
        seatHolderAt(world, seat.seatId)?.personId === personId,
    )
    .map((seat) => ({ seatId: seat.seatId, ordinal: seat.ordinal }));
}

/**
 * Closes the associate justice's tenure and puts the nomination on the
 * calendar when a President sits. Once per seat and date.
 */
export function openAssociateJusticeVacancy(
  world: World,
  input: {
    readonly seatId: string;
    readonly vacancyDate: IsoDate;
    readonly formerHolderId: EntityId;
    readonly reason: "death" | "retirement" | "resignation" | "elevated";
  },
): { readonly world: World; readonly presidentId: EntityId | null } {
  const seat = world.judiciary?.seats[input.seatId];
  const president = currentPresidentOf(world);
  if (!seat) return { world, presidentId: president?.personId ?? null };
  const stableKey = `${SUPREME_COURT_APPOINTMENTS_VERSION}:vacancy:${seat.ordinal}:${input.vacancyDate}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return { world, presidentId: president?.personId ?? null };
  let next = world;
  const tenureOpen = (world.judiciary?.seatTenures ?? []).some(
    (tenure) =>
      tenure.seatId === seat.seatId &&
      tenure.personId === input.formerHolderId &&
      tenure.endedAt === null,
  );
  if (tenureOpen)
    next = vacateJudicialSeat(next, {
      seatId: seat.seatId,
      vacatedAt: input.vacancyDate,
      reason: input.reason,
    });
  const former = world.people[input.formerHolderId];
  const cause =
    input.reason === "death"
      ? `after the death of ${former ? personName(former) : "the justice"}`
      : input.reason === "elevated"
        ? `after ${former ? personName(former) : "the justice"} became Chief Justice`
        : `after ${former ? personName(former) : "the justice"} left the Court`;
  next = recordWorldEvent(next, {
    stableKey,
    type: SUPREME_COURT_VACANCY_EVENT,
    occurredAt: input.vacancyDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.formerHolderId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      SUPREME_COURT_APPOINTMENTS_VERSION,
      `judicial-seat:${seat.seatId}`,
      `vacancy-cause:associate-justice-${input.reason}`,
    ],
    summary: `A seat on the Supreme Court is vacant ${cause}.`,
    context: CONTEXT,
  });
  // A seat the law has since abolished is retired by the writer, not refilled.
  const stillActive = next.judiciary?.seats[seat.seatId]?.retiredAt === null;
  if (president && stillActive)
    next = scheduleAssociateNomination(
      next,
      seat.ordinal,
      input.vacancyDate,
      president.personId,
    );
  return { world: next, presidentId: president?.personId ?? null };
}

function rejectedNominees(world: World, tag: string): EntityId[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === SUPREME_COURT_VOTE_EVENT &&
        event.tags.includes(tag) &&
        event.tags.includes("outcome:rejected"),
    )
    .flatMap((event) =>
      event.participants
        .filter((row) => row.role === "focus:subject")
        .map((row) => row.personId),
    );
}

/** The President names a nominee for an open associate seat. */
export function associateJusticeNominationHandler(
  world: World,
  due: FutureDueItem,
  instruction?: JudicialNominationInstruction,
): FutureTransitionHandlerResult {
  const match = /:associate-nomination:(\d+):(\d{4}-\d{2}-\d{2}):/.exec(
    due.stableKey,
  );
  if (!match) return resolved(world, "No vacancy matches this nomination.");
  const ordinal = Number(match[1]);
  const vacancyDate = makeIsoDate(match[2]!);
  const seatId = `${SUPREME_COURT_ID}:seat:${ordinal}`;
  const seat = world.judiciary?.seats[seatId];
  if (!seat || seat.retiredAt !== null)
    return resolved(world, "The seat no longer exists.");
  if (seatHolderAt(world, seatId))
    return resolved(world, "The seat is already filled.");
  const president = currentPresidentOf(world);
  if (!president)
    return resolved(
      world,
      "There is no sitting President to nominate a justice.",
    );
  const vacancyTag = `vacancy:${ordinal}:${vacancyDate}`;
  if (controlledPersonId(world) === president.personId && !instruction)
    return resolved(
      openJudicialAppointmentMatter(world, due),
      "The President's nomination choice is on the shared desk.",
    );
  const instructed = instruction
    ? judicialNominationInstruction(world, due, instruction)
    : null;
  if (instruction && !instructed)
    return resolved(
      world,
      "No recorded player nomination authorizes this appointment.",
    );
  const nominee =
    instructed?.candidate ??
    choosePresidentialNominee(world, {
      stableKey: due.stableKey,
      presidentId: president.personId,
      office: "associate",
      exclude: rejectedNominees(world, vacancyTag),
    });
  if (!nominee)
    return {
      world,
      status: "blocked",
      reasonKey: "governing:no-recorded-associate-justice-nominee",
      context:
        "The Supreme Court nomination remains pending until the President selects a recorded eligible judge.",
      outcomeEventId: null,
    };
  const nomineeName = personName(world.people[nominee.personId]!);
  let next = recordWorldEvent(world, {
    stableKey: `${due.stableKey}:nominated`,
    type: SUPREME_COURT_NOMINATED_EVENT,
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
        detail: `Nominee for ${ASSOCIATE_TITLE}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      SUPREME_COURT_APPOINTMENTS_VERSION,
      `judicial-seat:${seatId}`,
      vacancyTag,
      `nominee-bench:${nominee.bench}`,
      ...(instructed ? instructed.sourceTags : []),
    ],
    summary: `President ${personName(world.people[president.personId]!)} nominated ${nomineeName} to the Supreme Court. The Senate must confirm the nomination.`,
    context: CONTEXT,
  });
  const eventId = next.history.events.at(-1)!.id;
  next = scheduleFutureDueItem(next, {
    stableKey: `${SUPREME_COURT_APPOINTMENTS_VERSION}:associate-confirmation:${ordinal}:${vacancyDate}:${nominee.personId}`,
    dueAt: addDays(
      next.currentDate,
      SUPREME_COURT_APPOINTMENT_PROFILE.daysFromNominationToVote,
    ),
    transitionKey: ASSOCIATE_JUSTICE_CONFIRMATION,
    entityIds: [nominee.personId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${SUPREME_COURT_APPOINTMENT_PROFILE.id}: the Senate votes on the nomination; ${SUPREME_COURT_APPOINTMENT_PROFILE.daysFromNominationToVote} days is the measured median, 1975-2022.`,
    },
  });
  return resolved(next, `${nomineeName} was nominated.`, eventId);
}

/**
 * The Senate votes. Confirmed, the nominee leaves any lower bench and any
 * seat in Congress and takes the seat; rejected, the President nominates
 * again.
 */
export function confirmAssociateJustice(
  world: World,
  due: FutureDueItem,
  leaveCongressSeat: (world: World, personId: EntityId) => World,
): FutureTransitionHandlerResult {
  const match = /:associate-confirmation:(\d+):(\d{4}-\d{2}-\d{2}):(.+)$/.exec(
    due.stableKey,
  );
  if (!match) return resolved(world, "No nomination matches.");
  const ordinal = Number(match[1]);
  const vacancyDate = makeIsoDate(match[2]!);
  const nomineeId = match[3]! as EntityId;
  const seatId = `${SUPREME_COURT_ID}:seat:${ordinal}`;
  const seat = world.judiciary?.seats[seatId];
  if (!seat || seat.retiredAt !== null)
    return resolved(world, "The seat no longer exists.");
  if (seatHolderAt(world, seatId))
    return resolved(world, "The seat is already filled.");
  const vacancyTag = `vacancy:${ordinal}:${vacancyDate}`;
  const president = currentPresidentOf(world);
  const nomination = world.history.events
    .filter(
      (event) =>
        event.type === SUPREME_COURT_NOMINATED_EVENT &&
        event.tags.includes(vacancyTag) &&
        event.participants.some(
          (row) => row.role === "focus:subject" && row.personId === nomineeId,
        ),
    )
    .at(-1);
  const nominatedBy = nomination?.participants.find(
    (row) => row.role === "focus:actor",
  )?.personId;
  const nominee = world.people[nomineeId];
  if (
    !nominee ||
    isDead(world, nomineeId) ||
    !president ||
    nominatedBy !== president.personId
  )
    return resolved(
      president
        ? scheduleAssociateNomination(
            world,
            ordinal,
            vacancyDate,
            president.personId,
          )
        : world,
      !nominee || isDead(world, nomineeId)
        ? "The nominee died before the vote; the President nominates again."
        : "The President who made the nomination has left office; the nomination lapses.",
    );
  const briefed = briefSenateOnNominee(world, nomineeId);
  const vote = senateConfirmationVote(briefed, {
    stableKey: due.stableKey,
    nomineeId,
    presidentId: president.personId,
    nominationEventId: nomination!.id,
    officeKey: seatId,
  });
  if (!vote)
    return {
      world,
      status: "blocked",
      reasonKey: "governing:senate-not-seated",
      context:
        "The Supreme Court nomination remains pending until a seated Senate records its vote.",
      outcomeEventId: null,
    };
  const recorded = recordConfirmationVote(briefed, {
    stableKey: due.stableKey,
    nomineeId,
    officeTitle: ASSOCIATE_TITLE,
    vote,
    tags: [`judicial-seat:${seatId}`, vacancyTag],
  });
  let next = recorded.world;
  const voteEventId = recorded.eventId;
  if (vote.yeas + vote.nays === 0)
    return {
      world: next,
      status: "blocked",
      reasonKey: "governing:senate-no-decision",
      context:
        "The Senate recorded no yes or no vote; the nomination remains pending.",
      outcomeEventId: voteEventId,
    };
  if (!vote.confirmed)
    return resolved(
      scheduleAssociateNomination(
        next,
        ordinal,
        vacancyDate,
        president.personId,
      ),
      `The Senate rejected ${personName(nominee)}, ${vote.yeas} to ${vote.nays}.`,
      voteEventId,
    );
  next = leaveCongressSeat(leaveLowerBench(next, nomineeId), nomineeId);
  next = seatJudge(next, {
    seatId,
    personId: nomineeId,
    startedAt: next.currentDate,
    selection: {
      path: "confirmation",
      selectionRecordId: null,
      decisionRecordId: voteEventId,
      selectingPersonId: president.personId,
      contestId: null,
      note: `Confirmed by the Senate, ${vote.yeas} to ${vote.nays}.`,
    },
    termEndsAt: null,
    retentionDueAt: null,
  });
  next = recordWorldEvent(next, {
    stableKey: `${due.stableKey}:seated`,
    type: SUPREME_COURT_SEATED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [nomineeId],
    participants: [
      { personId: nomineeId, role: "focus:subject", detail: ASSOCIATE_TITLE },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      SUPREME_COURT_APPOINTMENTS_VERSION,
      `judicial-seat:${seatId}`,
      vacancyTag,
      "basis:us-const-art-ii-s2-cl2",
    ],
    summary: `${personName(nominee)} took a seat on the Supreme Court.`,
    context: CONTEXT,
  });
  return resolved(
    next,
    `${personName(nominee)} was confirmed to the Supreme Court.`,
    next.history.events.at(-1)!.id,
  );
}
