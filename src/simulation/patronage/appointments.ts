import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { publicOfficesHeldBy } from "../crisis/offices";
import { favorStandingBetween, recordFavor } from "../favors";
import { publicPartyOf } from "../governing/chamber-votes";
import { favorEventRefs, favorsGivenBy, favorsReceivedBy } from "./favor-refs";
import { peopleKnownTo } from "../living-world/official-views";
import { personName } from "../people";
import { ensurePeopleTraits, personTrait } from "../people-traits";
import { currentHistoricalCutoff } from "../queries";
import { recordRelationshipInteraction } from "../records";
import { readRelationshipStanding } from "../relationship-standing";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  FavorMotive,
  FavorSubject,
  MindSourceReference,
  World,
} from "../types";

/**
 * Appointments as decisions (Research 1, build step 5; approved by Lamontae,
 * D-1, September 28, 2026).
 *
 * An appointer names someone they know. What they weigh is the same for a
 * President naming a Vice President and a mayor filling a council seat:
 *
 * 1. loyalty — how the appointer stands with the person, and what the person
 *    already owes the appointer;
 * 2. faction — whether the person is in the appointer's party;
 * 3. competence — whether the person holds public office now;
 * 4. what the choice buys — a debt the appointer pays back, and the people who
 *    owe the candidate and so come along with them.
 *
 * How much each weighs comes from the appointer's own traits, never a share of
 * appointers. The game sets no threshold that makes anyone a boss: "machine"
 * and "company town" are words an observer uses about the favors this writes,
 * never a state the code sets (Lamontae, Claude CTO's 9:35 p.m. rulings).
 *
 * Every appointment made here is written as a favor through the one favor
 * record Build 22 owns (`../favors`). People who had given the appointer help
 * and were passed over are written a grievance against the appointer, so the
 * disappointed office seeker has a recorded cause (Research 1 spec 1).
 */

export const APPOINTMENTS_VERSION = "appointments-v1";

/** One post being filled. */
export interface AppointmentPost {
  /** Stable office key, e.g. "us-vice-president" or a council seat key. */
  readonly officeKey: string;
  /** Plain words for the post, e.g. "Vice President of the United States". */
  readonly title: string;
}

export interface ChooseAppointeeInput {
  readonly stableKey: string;
  readonly appointerPersonId: EntityId;
  readonly post: AppointmentPost;
  /**
   * Everyone the appointer could plausibly name, before the post's own rules.
   * Build it with `appointmentCircle`, which adds the people the appointer
   * knows to the colleagues the caller supplies.
   */
  readonly circle: readonly EntityId[];
  /** The post's own legal rules: age, residence, offices that bar it. */
  readonly eligible: (personId: EntityId) => boolean;
}

export interface AppointeeChoice {
  readonly world: World;
  readonly personId: EntityId;
  /** The appointer's durable decision trace: the recorded why. */
  readonly decisionTraceId: EntityId;
  /** Plain reasons for the choice, strongest first. */
  readonly reasons: readonly string[];
  /** Everyone on the short list, chosen first. */
  readonly shortList: readonly EntityId[];
  /**
   * People on the short list who had given the appointer help and were passed
   * over. Each now holds a recorded grievance against the appointer.
   */
  readonly passedOver: readonly EntityId[];
}

/**
 * How many people an appointer weighs seriously at once.
 *
 * RECORDED TRACE LIMIT: 8 candidates reach the durable decision trace after
 * everyone in the circle is scored, so the limit changes no ranking. The
 * bound keeps a federal, state, or local appointment from swelling a save.
 */
export const APPOINTMENT_SHORT_LIST = 8;

/**
 * The people an appointer can name: those the game already records them
 * knowing (household, workplace, any recorded moment), everyone they have
 * given or received a favor from, and the colleagues the caller names.
 *
 * Colleagues are supplied because an institution is how officeholders know
 * each other: a President works with every member of Congress, a mayor with
 * the council. That reading is inferred, not measured; generated officeholders
 * carry no recorded ties of their own yet (measured at main 787ec1b).
 */
export function appointmentCircle(
  world: World,
  appointerPersonId: EntityId,
  colleagues: readonly EntityId[],
): readonly EntityId[] {
  const circle = new Set<EntityId>(peopleKnownTo(world, appointerPersonId));
  for (const favor of favorsGivenBy(world, appointerPersonId))
    circle.add(favor.receiverPersonId);
  for (const favor of favorsReceivedBy(world, appointerPersonId))
    circle.add(favor.giverPersonId);
  for (const id of colleagues) circle.add(id);
  circle.delete(appointerPersonId);
  return [...circle].filter((id) => world.people[id]).sort();
}

interface Scored {
  readonly personId: EntityId;
  readonly considerations: readonly DecisionConsideration[];
  readonly score: number;
  /** They had given the appointer help, so they expected something. */
  readonly expected: boolean;
}

const IMPORTANCE_WEIGHT: Record<DecisionImportance, number> = {
  slight: 1,
  moderate: 2,
  strong: 4,
  decisive: 6,
};
const CONFIDENCE_WEIGHT = { low: 1, medium: 2, high: 3 } as const;

function scoreOf(considerations: readonly DecisionConsideration[]): number {
  return considerations.reduce(
    (total, row) =>
      total +
      (row.direction === "supports" ? 1 : -1) *
        IMPORTANCE_WEIGHT[row.importance] *
        CONFIDENCE_WEIGHT[row.confidence],
    0,
  );
}

const STEP_UP: Record<DecisionImportance, DecisionImportance> = {
  slight: "moderate",
  moderate: "strong",
  strong: "decisive",
  decisive: "decisive",
};
const STEP_DOWN: Record<DecisionImportance, DecisionImportance> = {
  slight: "slight",
  moderate: "slight",
  strong: "moderate",
  decisive: "strong",
};

/** A trait held clearly toward one pole makes a reason weigh more or less. */
function shaped(
  base: DecisionImportance,
  traitValue: number,
): DecisionImportance {
  if (traitValue >= 1) return STEP_UP[base];
  if (traitValue <= -1) return STEP_DOWN[base];
  return base;
}

const BAND_IMPORTANCE = {
  none: null,
  slight: "slight",
  marked: "moderate",
  strong: "strong",
} as const;

function traitRef(
  world: World,
  personId: EntityId,
  trait: Parameters<typeof personTrait>[2],
): MindSourceReference[] {
  const recordId = personTrait(world, personId, trait).recordId;
  return recordId
    ? [{ kind: "personality-tendency", tendencyRecordId: recordId }]
    : [];
}

function considerationsFor(
  world: World,
  appointerPersonId: EntityId,
  candidateId: EntityId,
  keyPrefix: string,
): Scored {
  const optionKey = `person:${candidateId}`;
  const name = personName(world.people[candidateId]!);
  const rows: DecisionConsideration[] = [];
  // The appointer's own temperament decides how much each reason counts.
  // Someone dependable prizes loyalty; someone deliberate weighs the record;
  // someone who avoids a fight pays debts and keeps allies close.
  const reliability = personTrait(world, appointerPersonId, "reliability");
  const deliberation = personTrait(world, appointerPersonId, "deliberation");
  const conflict = personTrait(world, appointerPersonId, "conflict");

  // 1. Loyalty: how the appointer stands with them.
  const standing = readRelationshipStanding(
    world,
    appointerPersonId,
    candidateId,
  );
  for (const dimension of ["trust", "commitment", "warmth"] as const) {
    const reading = standing.readings[dimension];
    const base = BAND_IMPORTANCE[reading.band];
    if (!base) continue;
    const refs: MindSourceReference[] = reading.basis
      .slice(-3)
      .map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      }));
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:standing:${dimension}`,
      optionKey,
      sourceType: "social:relationship",
      direction: reading.adverse ? "opposes" : "supports",
      importance: shaped(base, reliability.value),
      confidence: "high",
      explanation: reading.adverse
        ? `${name} has not earned the appointer's ${dimension}.`
        : dimension === "trust"
          ? `The appointer trusts ${name}.`
          : dimension === "commitment"
            ? `The appointer feels bound to ${name}.`
            : `The appointer likes ${name}.`,
      sourceRefs: [
        ...refs,
        ...traitRef(world, appointerPersonId, "reliability"),
      ],
    });
  }
  const tension = standing.readings.tension;
  const tensionImportance = BAND_IMPORTANCE[tension.band];
  if (tensionImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:standing:tension`,
      optionKey,
      sourceType: "social:relationship",
      direction: "opposes",
      importance: tensionImportance,
      confidence: "high",
      explanation: `There is bad blood between the appointer and ${name}.`,
      sourceRefs: tension.basis.slice(-3).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });

  // 1b. Loyalty already bought: what the candidate owes the appointer.
  const owesAppointer = favorStandingBetween(
    world,
    candidateId,
    appointerPersonId,
    world.currentDate,
  );
  const owedImportance = BAND_IMPORTANCE[owesAppointer.receiverDebt];
  if (owedImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:owes-appointer`,
      optionKey,
      sourceType: "social:favor",
      direction: "supports",
      importance: shaped(owedImportance, reliability.value),
      confidence: "medium",
      explanation: `${name} owes the appointer for past help.`,
      sourceRefs: [
        ...favorEventRefs(world, candidateId, appointerPersonId),
        ...traitRef(world, appointerPersonId, "reliability"),
      ],
    });

  // 2. Faction: the appointer's party.
  const appointerParty = publicPartyOf(world, appointerPersonId);
  const candidateParty = publicPartyOf(world, candidateId);
  if (appointerParty && candidateParty)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:party`,
      optionKey,
      sourceType: "context:party",
      direction: appointerParty === candidateParty ? "supports" : "opposes",
      importance: appointerParty === candidateParty ? "strong" : "moderate",
      confidence: "high",
      explanation:
        appointerParty === candidateParty
          ? `${name} is in the appointer's party.`
          : `${name} is in the other party.`,
      sourceRefs: [],
    });

  // 3. Competence: a public office held now is a record anyone can read.
  const offices = publicOfficesHeldBy(world, candidateId);
  if (offices.length > 0)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:record`,
      optionKey,
      sourceType: "context:public-record",
      direction: "supports",
      importance: shaped("moderate", deliberation.value),
      confidence: "medium",
      explanation: `${name} serves now as ${offices[0]!.title}.`,
      sourceRefs: traitRef(world, appointerPersonId, "deliberation"),
    });

  // 4a. What the choice buys: paying back what the appointer owes them.
  const appointerOwes = favorStandingBetween(
    world,
    appointerPersonId,
    candidateId,
    world.currentDate,
  );
  const repayImportance = BAND_IMPORTANCE[appointerOwes.receiverDebt];
  if (repayImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:repays`,
      optionKey,
      sourceType: "social:favor",
      // Someone who avoids a fight settles a debt before it becomes one.
      direction: "supports",
      importance: shaped(repayImportance, -conflict.value),
      confidence: "medium",
      explanation: `Naming ${name} repays help the appointer received.`,
      sourceRefs: [
        ...favorEventRefs(world, appointerPersonId, candidateId),
        ...traitRef(world, appointerPersonId, "conflict"),
      ],
    });

  // 4b. What the choice buys: the people who owe the candidate.
  const following = followingOf(world, candidateId);
  // RECORDED FAVOR SCALE: followings of 1, 5, and 20 count as slight,
  // moderate, and strong. These are persisted game-scale bands, not claims
  // about appointment practice in any particular jurisdiction.
  const followingImportance: DecisionImportance | null =
    following >= 20
      ? "strong"
      : following >= 5
        ? "moderate"
        : following >= 1
          ? "slight"
          : null;
  if (followingImportance)
    rows.push({
      stableKey: `${keyPrefix}:${candidateId}:following`,
      optionKey,
      // Read as what anyone around them can see, not a recorded moment the
      // appointer shared.
      sourceType: "context:following",
      direction: "supports",
      importance: followingImportance,
      confidence: "low",
      explanation: `People who owe ${name} come along with the appointment.`,
      sourceRefs: [],
    });

  // Whether they had given the appointer help, and so expected something back:
  // they hold a commitment to the appointer they took on by giving, or the
  // appointer still owes them.
  const given = readRelationshipStanding(world, candidateId, appointerPersonId)
    .readings.commitment;
  const expected =
    ((given.band === "marked" || given.band === "strong") && !given.adverse) ||
    appointerOwes.receiverDebt === "marked" ||
    appointerOwes.receiverDebt === "strong";
  return {
    personId: candidateId,
    considerations: rows,
    score: scoreOf(rows),
    expected,
  };
}

/** How many people currently feel they owe this person. */
export function followingOf(world: World, personId: EntityId): number {
  const debtors = new Set<EntityId>();
  for (const favor of favorsGivenBy(world, personId)) {
    if (debtors.has(favor.receiverPersonId)) continue;
    const standing = favorStandingBetween(
      world,
      favor.receiverPersonId,
      personId,
      world.currentDate,
    );
    if (standing.receiverDebt !== "none") debtors.add(favor.receiverPersonId);
  }
  return debtors.size;
}

/**
 * The appointer picks someone from their circle.
 *
 * Returns null when nobody in the circle is eligible; the caller then says so
 * and falls back to its own documented route rather than inventing a tie.
 * The controlled character's appointments are never decided here.
 */
export function chooseAppointee(
  world: World,
  input: ChooseAppointeeInput,
): AppointeeChoice | null {
  if (
    world.control.kind === "person" &&
    world.control.personId === input.appointerPersonId
  )
    return null;
  const candidates = input.circle.filter(
    (id) => id !== input.appointerPersonId && input.eligible(id),
  );
  if (candidates.length === 0) return null;

  let next = ensurePeopleTraits(world, [input.appointerPersonId]);
  const keyPrefix = `${APPOINTMENTS_VERSION}:${input.stableKey}`;
  const scored = candidates
    .map((id) =>
      considerationsFor(next, input.appointerPersonId, id, keyPrefix),
    )
    .sort((a, b) => b.score - a.score || a.personId.localeCompare(b.personId));
  const shortList = scored.slice(0, APPOINTMENT_SHORT_LIST);
  // The engine needs two options; with one person in the circle the other
  // option is to name nobody from it.
  const options = shortList.map((entry) => ({
    key: `person:${entry.personId}`,
    label: personName(next.people[entry.personId]!),
    description: `Name ${personName(next.people[entry.personId]!)} as ${input.post.title}.`,
  }));
  if (options.length < 2)
    options.push({
      key: "look-further",
      label: "Look further",
      description: "Look beyond the people the appointer knows.",
    });
  const evaluation = evaluateDecision(next, {
    stableKey: `${keyPrefix}:choose`,
    decisionType: "appointment.choose-appointee",
    actorPersonId: input.appointerPersonId,
    cutoff: currentHistoricalCutoff(next),
    subject: {
      kind: "context:appointment",
      key: input.post.officeKey,
      entityId: null,
    },
    options,
    constraints: [],
    considerations: shortList.flatMap((entry) => entry.considerations),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  if (!isSelectedDecision(evaluation)) return null;
  const selected = evaluation.selectedOptionKey;
  if (!selected || !selected.startsWith("person:")) return null;
  const personId = selected.slice("person:".length) as EntityId;
  next = recordDurableDecisionTrace(next, evaluation);
  const decisionTraceId = next.history.decisionTraces.at(-1)!.id;
  const chosen = shortList.find((entry) => entry.personId === personId)!;
  const reasons = [...chosen.considerations]
    .filter((row) => row.direction === "supports")
    .sort((a, b) => scoreOf([b]) - scoreOf([a]))
    .map((row) => row.explanation);
  const passedOver = shortList
    .filter((entry) => entry.personId !== personId && entry.expected)
    .map((entry) => entry.personId);
  return {
    world: next,
    personId,
    decisionTraceId,
    reasons,
    shortList: [
      personId,
      ...shortList.map((e) => e.personId).filter((id) => id !== personId),
    ],
    passedOver,
  };
}

export interface RecordAppointmentInput {
  readonly stableKey: string;
  readonly appointerPersonId: EntityId;
  readonly appointeePersonId: EntityId;
  readonly post: AppointmentPost;
  /** The canonical event that seated the appointee (their tenure event). */
  readonly eventId: EntityId;
  readonly subject: FavorSubject;
}

/**
 * Why the appointer gave the post, read from their recorded choice.
 *
 * A choice carried by loyalty, a debt or the people who owe the appointee is a
 * trade: the appointer expects something back. One carried by party or by the
 * appointee's record serves a shared cause. A post filled without a recorded
 * choice (nobody the appointer knew could take it) is the same: the appointer
 * expects the job done, not a return.
 */
export function appointmentMotive(
  world: World,
  appointerPersonId: EntityId,
  appointeePersonId: EntityId,
): FavorMotive {
  const optionKey = `person:${appointeePersonId}`;
  const trace = appointmentTrace(world, appointerPersonId, appointeePersonId);
  if (!trace) return "shared-belief";
  const strongest = trace.context.considerations
    .filter(
      (row) => row.optionKey === optionKey && row.direction === "supports",
    )
    .sort((a, b) => scoreOf([b]) - scoreOf([a]))[0];
  if (!strongest) return "shared-belief";
  return strongest.sourceType === "context:party" ||
    strongest.sourceType === "context:public-record"
    ? "shared-belief"
    : "trade";
}

/** Reasons that come from the appointer's own ties to a person, not merit. */
const PERSONAL_SOURCES: readonly string[] = [
  "social:relationship",
  "social:favor",
];

/**
 * Whether a recorded appointment was personal: someone better placed on the
 * merits (party, record, following) lost to the appointee because of the
 * appointer's ties to them. Claude CTO's rulings of September 28 and 29, 2026
 * (from Lamontae): an appointment on the merits writes no debt. The other
 * test, a post given on a personal request, has no request record to read
 * yet, so it never applies here.
 */
export function wasPersonalAppointment(
  considerations: readonly DecisionConsideration[],
  chosenOptionKey: string,
): boolean {
  const merit = new Map<string, number>();
  for (const row of considerations) {
    if (!row.optionKey.startsWith("person:")) continue;
    const add = PERSONAL_SOURCES.includes(row.sourceType) ? 0 : scoreOf([row]);
    merit.set(row.optionKey, (merit.get(row.optionKey) ?? 0) + add);
  }
  const chosen = merit.get(chosenOptionKey) ?? 0;
  return [...merit].some(
    ([key, score]) => key !== chosenOptionKey && score > chosen,
  );
}

/** The appointer's recorded choice of this appointee, if one was made. */
function appointmentTrace(
  world: World,
  appointerPersonId: EntityId,
  appointeePersonId: EntityId,
) {
  const optionKey = `person:${appointeePersonId}`;
  return [...world.history.decisionTraces]
    .reverse()
    .find(
      (row) =>
        row.context.decisionType === "appointment.choose-appointee" &&
        row.context.actorPersonId === appointerPersonId &&
        row.selectedOptionKey === optionKey,
    );
}

/**
 * Writes a personal appointment as a favor from the appointer to the
 * appointee, and nothing for one made on the merits or by the book.
 *
 * Called when the appointment actually takes effect (confirmation, seating),
 * never at nomination: a nomination the Senate rejects gave nothing. The
 * debt's size follows what the post meant to the appointee: SET BY HAND, a
 * post for someone who held no public office is life-changing, and for a
 * sitting officeholder it is great.
 */
export function recordAppointmentFavor(
  world: World,
  input: RecordAppointmentInput,
): World {
  const optionKey = `person:${input.appointeePersonId}`;
  const trace = appointmentTrace(
    world,
    input.appointerPersonId,
    input.appointeePersonId,
  );
  if (
    !trace ||
    !wasPersonalAppointment(trace.context.considerations, optionKey)
  )
    return world;
  const heldOffice = trace.context.considerations.some(
    (row) =>
      row.optionKey === optionKey && row.sourceType === "context:public-record",
  );
  return recordFavor(world, {
    stableKey: `${APPOINTMENTS_VERSION}:${input.stableKey}:favor`,
    givenAt: world.currentDate,
    giverPersonId: input.appointerPersonId,
    receiverPersonId: input.appointeePersonId,
    kind: "public:appointment",
    description: `named ${personName(world.people[input.appointeePersonId]!)} ${input.post.title}`,
    eventId: input.eventId,
    subject: input.subject,
    motive: appointmentMotive(
      world,
      input.appointerPersonId,
      input.appointeePersonId,
    ),
    weight: heldOffice ? "great" : "life-changing",
    audience: "public",
    witnessPersonIds: [],
    inReturnForFavorId: null,
    undertakingId: null,
  });
}

/**
 * Writes a grievance for each person who had helped the appointer and was
 * passed over. It cites no event: the nomination names only the appointer and
 * the nominee.
 */
export function recordPassedOver(
  world: World,
  input: {
    readonly stableKey: string;
    readonly appointerPersonId: EntityId;
    readonly passedOver: readonly EntityId[];
    readonly post: AppointmentPost;
  },
): World {
  let next = world;
  for (const personId of input.passedOver) {
    next = recordRelationshipInteraction(next, {
      stableKey: `${APPOINTMENTS_VERSION}:${input.stableKey}:passed-over:${personId}`,
      personIds: [personId, input.appointerPersonId],
      eventId: null,
      occurredAt: next.currentDate,
      kind: "conflict:passed-over-for-appointment",
      change: "strained",
      significance: "meaningful",
      summary: `${personName(next.people[personId]!)} expected to be named ${input.post.title} and was passed over.`,
      tags: [APPOINTMENTS_VERSION, `office:${input.post.officeKey}`],
    });
  }
  return next;
}
