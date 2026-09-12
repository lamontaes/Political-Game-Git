import {
  addDays,
  ageOnDate,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import { playedEpisodeStages } from "./life-episodes";
import { LIFE_PATHS2_CATALOG } from "./life-paths2-catalog";
import { lifePathEntryReason } from "./life-paths2";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
} from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  createScheduledActivity,
  createWorkItem,
  scheduledActivityState,
} from "./time-work";
import { recordEventKnowledge } from "./records";
import { recordWorldEvent } from "./world";
import type { ThreadAnchor } from "./narrative-threads";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  ScheduledActivityRecord,
  ScheduledActivityStateRecord,
  World,
} from "./types";

/** Recovered from Claude OPENING-LIFE1 5767496 plus stopped dirty checkpoint.
 * Ordinary requests use existing event/work-item history. Unsupported inferred
 * rota, transport, pooling, family-business and performed-work premises remain
 * withheld in the accepted bank. No reader creates its own premise.
 *
 * Three rules the LIFE-CONTENT13 repair (RETURN14 section D) added, each one a
 * premise the first version of this file asserted without a record behind it:
 *
 * - Being employed and enrolled is not a commute and not a timetable clash.
 *   The world models no transit mode, journey or timetable, so nothing here
 *   writes one. A clash with a class is written only against a class session
 *   actually booked on the calendar.
 * - A supervisor is the person whose work relationship at the same employer
 *   directs others while this person's is directed — read off both work
 *   records. A colleague is not promoted to one by the wording of a scene.
 * - Agreeing to cover a shift is not having covered it. The later request that
 *   leans on the favour is written only after a scheduled covered shift has a
 *   completed state on the calendar.
 */
export const LIFE_CIRCUMSTANCE_KINDS = [
  "colleague-coverage-request",
  "shared-assignment",
  "supervisor-extra-shift",
  "commute-schedule-conflict",
  "class-work-schedule-conflict",
  "own-shift-coverage-needed",
  "household-move-preparation",
  "education-work-crossroad",
] as const;
export type LifeCircumstanceKind = (typeof LIFE_CIRCUMSTANCE_KINDS)[number];
export const LIFE_CIRCUMSTANCE_ANSWERING_STAGE: Readonly<
  Record<LifeCircumstanceKind, string>
> = {
  "colleague-coverage-request":
    "work.the-shift-you-were-asked-for/asked-by-a-colleague",
  "shared-assignment": "school.the-thing-you-got-blamed-for/carrying-the-group",
  "supervisor-extra-shift": "work.the-shift-you-were-asked-for/called-in",
  // The commute stage is hosted inside the accepted school family, so that is
  // the family its play event is tagged with.
  "commute-schedule-conflict":
    "school.the-thing-you-got-blamed-for/the-commute",
  "class-work-schedule-conflict":
    "opening.adult.trans.drop-class-keep-job/moment",
  "own-shift-coverage-needed":
    "work.the-shift-you-were-asked-for/it-came-back-round",
  "household-move-preparation": "opening.early.family.packing-boxes/moment",
  "education-work-crossroad": "opening.adult.trans.college-vs-work/moment",
};

export const LIFE_CIRCUMSTANCE_TAG_PREFIX = "life.circumstance:";

/**
 * Kinds no writer produces, with the record that is missing.
 *
 * Kept in the kind list so an event some earlier build wrote still reads as
 * what it is, and never counted as open, because the premise it asserted has
 * no record behind it. The events themselves are left exactly as written.
 */
export const RETIRED_LIFE_CIRCUMSTANCE_KINDS: Readonly<
  Partial<Record<LifeCircumstanceKind, string>>
> = {
  "commute-schedule-conflict":
    "No transit mode, journey or timetable is modeled; a job plus an enrollment is not a commute or a clash.",
  "household-move-preparation":
    "No pending household move is modeled; a household location cannot be recorded ahead of its date.",
};

/**
 * Kinds whose first-version events asserted an unrecorded premise.
 *
 * `supervisor-extra-shift` named nobody, `class-work-schedule-conflict` cast
 * the first colleague found as a supervisor and invented a lab timetable, and
 * `own-shift-coverage-needed` treated an agreement as a shift worked. Events of
 * these kinds count only when the current writer produced them.
 */
const VERSIONED_LIFE_CIRCUMSTANCE_KINDS: ReadonlySet<LifeCircumstanceKind> =
  new Set([
    "supervisor-extra-shift",
    "class-work-schedule-conflict",
    "own-shift-coverage-needed",
  ]);

const CIRCUMSTANCE_PROVENANCE_V2 = "provenance:authored-life-circumstance-v2";

export function lifeCircumstanceTag(kind: LifeCircumstanceKind): string {
  return `${LIFE_CIRCUMSTANCE_TAG_PREFIX}${kind}`;
}

export function isLifeCircumstanceKind(
  value: string,
): value is LifeCircumstanceKind {
  return (LIFE_CIRCUMSTANCE_KINDS as readonly string[]).includes(value);
}

/**
 * How many circumstances a life may be carrying unanswered at once.
 *
 * A cap, not a rate. A player who lets a year go by should find a life with a
 * couple of things unresolved in it, not a backlog of every situation the bank
 * can describe. Lower than the opportunity cap because these are things already
 * happening rather than things being offered, and a life in four unresolved
 * predicaments at once reads as contrived rather than busy.
 */
export const OPEN_LIFE_CIRCUMSTANCE_LIMIT = 2;

/** Adult request content only; youth employment needs its separately sourced path. */
const CIRCUMSTANCE_AGE_BAND: Readonly<
  Record<LifeCircumstanceKind, readonly [number, number]>
> = {
  "colleague-coverage-request": [18, 26],
  "shared-assignment": [18, 99],
  "supervisor-extra-shift": [17, 26],
  "commute-schedule-conflict": [17, 26],
  "class-work-schedule-conflict": [18, 26],
  "own-shift-coverage-needed": [18, 30],
  "household-move-preparation": [5, 8],
  "education-work-crossroad": [17, 20],
};

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

export interface LifeCircumstanceRecord {
  readonly kind: LifeCircumstanceKind;
  readonly eventId: EntityId;
  readonly stableKey: string;
  readonly openedAt: IsoDate;
  /** Who asked, or null where nobody did — a rota asks on nobody's behalf. */
  readonly counterpartPersonId: EntityId | null;
  readonly sequence: number;
}

/**
 * The circumstances this life is currently in.
 *
 * Open means two things, both read off records: the circumstance was written,
 * and the stage it makes answerable has not since been played. A stage played
 * before the circumstance was written does not close it — that would be an
 * older answer closing a newer question — so the comparison is on sequence
 * rather than on mere presence.
 */
export function lifeCircumstancesFor(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly LifeCircumstanceRecord[] {
  if (
    cutoff.asOfDate > world.currentDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  )
    throw new Error("Historical cutoff is outside this world's history.");
  const written: {
    readonly kind: LifeCircumstanceKind;
    readonly event: (typeof world.history.events)[number];
  }[] = [];
  // `episode:<family>` + `episode-stage:<stage>` is how the episode engine tags
  // a played beat. Collecting them in the same pass keeps this one walk of the
  // event log rather than one per circumstance.
  const playedAfter = new Map<string, number>();

  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    if (
      event.occurredAt > cutoff.asOfDate ||
      event.sequence >= cutoff.historySequenceExclusive
    )
      continue;
    let family: string | null = null;
    let stage: string | null = null;
    for (const tag of event.tags) {
      if (tag.startsWith("episode:")) family = tag.slice("episode:".length);
      else if (tag.startsWith("episode-stage:"))
        stage = tag.slice("episode-stage:".length);
      else if (tag.startsWith(LIFE_CIRCUMSTANCE_TAG_PREFIX)) {
        const kind = tag.slice(LIFE_CIRCUMSTANCE_TAG_PREFIX.length);
        if (
          isLifeCircumstanceKind(kind) &&
          RETIRED_LIFE_CIRCUMSTANCE_KINDS[kind] === undefined &&
          (!VERSIONED_LIFE_CIRCUMSTANCE_KINDS.has(kind) ||
            event.tags.includes(CIRCUMSTANCE_PROVENANCE_V2)) &&
          event.participants.some(
            (participant) =>
              participant.personId === personId &&
              participant.role === "focus:subject",
          )
        )
          written.push({ kind, event });
      }
    }
    if (family !== null && stage !== null) {
      const key = `${family}/${stage}`;
      const previous = playedAfter.get(key);
      if (previous === undefined || event.sequence > previous) {
        playedAfter.set(key, event.sequence);
      }
    }
  }
  if (written.length === 0) return [];

  const open: LifeCircumstanceRecord[] = [];
  for (const { kind, event } of written) {
    const playedAt = playedAfter.get(LIFE_CIRCUMSTANCE_ANSWERING_STAGE[kind]);
    if (playedAt !== undefined) continue;
    if (!premiseStillHolds(world, personId, kind, event, cutoff)) continue;
    open.push({
      kind,
      eventId: event.id,
      stableKey: event.stableKey,
      openedAt: event.occurredAt,
      counterpartPersonId:
        event.participants.find(
          (participant) =>
            participant.personId !== personId &&
            (participant.role.startsWith("agency:") ||
              participant.role === "coordination:counterpart"),
        )?.personId ?? null,
      sequence: event.sequence,
    });
  }
  return open.sort((left, right) => left.sequence - right.sequence);
}

/**
 * Whether what the circumstance says is still true, at this cutoff.
 *
 * A request is a thing that happened, and the event stays in history either
 * way. But a scene composed from it speaks in the present tense — "your
 * supervisor asks", "a shift at the same time as a class you have booked" — so
 * once the supervisor has left the job, the colleague has left, or the class
 * session is cancelled or already past, the circumstance stops being open
 * rather than holding a slot and a sentence that is no longer true.
 */
function premiseStillHolds(
  world: World,
  personId: EntityId,
  kind: LifeCircumstanceKind,
  event: (typeof world.history.events)[number],
  cutoff: HistoricalCutoff,
): boolean {
  const counterpartId =
    event.participants.find(
      (participant) =>
        participant.personId !== personId &&
        (participant.role.startsWith("agency:") ||
          participant.role === "coordination:counterpart"),
    )?.personId ?? null;
  const supervises = (candidateId: EntityId | null): boolean =>
    candidateId !== null &&
    recordedSupervisorsAt(world, personId, cutoff).some(
      (entry) => entry.personId === candidateId,
    );
  switch (kind) {
    case "supervisor-extra-shift":
      return supervises(counterpartId);
    case "class-work-schedule-conflict":
      return (
        supervises(counterpartId) &&
        bookedClassSessions(world, personId, cutoff).some((session) =>
          event.involvedEntityIds.includes(session.activity.id),
        )
      );
    case "own-shift-coverage-needed":
    case "colleague-coverage-request":
      return (
        counterpartId !== null &&
        sharesEmployer(world, personId, counterpartId, cutoff)
      );
    default:
      return true;
  }
}

/**
 * The circumstances this life is in, as thread anchors an episode fact can use.
 *
 * Returned as a map from kind so `episodeFacts` can turn each into the fact it
 * gates without this module knowing the fact vocabulary. Every anchor points at
 * the event that established the circumstance, so a stage offered because of
 * one can always be traced back to the record that made it true.
 */
export function lifeCircumstanceAnchors(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): ReadonlyMap<LifeCircumstanceKind, readonly ThreadAnchor[]> {
  const byKind = new Map<LifeCircumstanceKind, ThreadAnchor[]>();
  for (const circumstance of lifeCircumstancesFor(world, personId, cutoff)) {
    const anchors = byKind.get(circumstance.kind) ?? [];
    anchors.push({
      store: "events",
      recordId: circumstance.eventId,
      stableKey: circumstance.stableKey,
      at: circumstance.openedAt,
      sequence: circumstance.sequence,
      role: "context",
      note: `The record that established this circumstance.`,
    });
    byKind.set(circumstance.kind, anchors);
  }
  return byKind;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Writes at most one new circumstance for this life, and stops.
 *
 * Called from transitions a player actually took — opening an ordinary life,
 * letting a stretch of time go by, choosing something — and from nothing that
 * reads. One at a time, because these are situations rather than notifications
 * and a life handed three at once is a life nobody believes.
 *
 * Idempotent at the day: every stable key carries the date it was written on,
 * so calling this twice against the same world writes once. That is what the
 * repeated-selector and the save-reload proofs rest on.
 */
export function refreshLifeCircumstances(
  world: World,
  personId: EntityId,
): World {
  const person = world.people[personId];
  if (
    !person ||
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return world;
  if (
    world.history.events.some(
      (event) =>
        event.occurredAt === world.currentDate &&
        event.participants.some(
          (p) => p.personId === personId && p.role === "focus:subject",
        ) &&
        event.tags.some((tag) => tag.startsWith(LIFE_CIRCUMSTANCE_TAG_PREFIX)),
    )
  )
    return world;
  const age = ageOnDate(person.birthDate, world.currentDate);
  const open = lifeCircumstancesFor(world, personId);
  if (open.length >= OPEN_LIFE_CIRCUMSTANCE_LIMIT) return world;

  const openKinds = new Set(open.map((entry) => entry.kind));
  const cutoff = currentLifeCutoff(world);

  // Which kind, not merely whether. Walking the declared order and taking the
  // first that fits would give every life in the game the same two situations
  // in the same order forever, because the same two are always eligible first.
  // So the choice is made the way `life-opportunities.ts` makes it: the kind
  // this life has seen least recently wins, and the world's own seed breaks
  // ties, so two saves differ and one save replays identically.
  // A stage is played once per instance, and an instance is keyed by the
  // person the family binds, so a second request of a kind this life has
  // already answered could never be answered again: it would sit in one of the
  // two open slots for good.
  const answered = new Set(
    playedEpisodeStages(world, personId).map(
      (entry) => `${entry.episodeKey}/${entry.stageKey}`,
    ),
  );
  for (const kind of preferredOrder(world, personId, openKinds)) {
    const [floor, ceiling] = CIRCUMSTANCE_AGE_BAND[kind];
    if (age < floor || age >= ceiling) continue;
    if (answered.has(LIFE_CIRCUMSTANCE_ANSWERING_STAGE[kind])) continue;
    const next = tryWriteCircumstance(world, personId, kind, cutoff);
    if (next !== world) return next;
  }
  return world;
}

/**
 * The kinds this life has not seen for longest, first.
 *
 * Reads the event log rather than keeping a counter, so a reloaded save orders
 * them exactly as the save that wrote them did.
 */
function preferredOrder(
  world: World,
  personId: EntityId,
  exclude: ReadonlySet<LifeCircumstanceKind>,
): readonly LifeCircumstanceKind[] {
  const lastSeen = new Map<LifeCircumstanceKind, number>();
  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    for (const tag of event.tags) {
      if (!tag.startsWith(LIFE_CIRCUMSTANCE_TAG_PREFIX)) continue;
      const kind = tag.slice(LIFE_CIRCUMSTANCE_TAG_PREFIX.length);
      if (isLifeCircumstanceKind(kind)) lastSeen.set(kind, event.sequence);
    }
  }
  return LIFE_CIRCUMSTANCE_KINDS.filter((kind) => !exclude.has(kind))
    .map((kind) => ({
      kind,
      seen: lastSeen.get(kind) ?? -1,
      tie: stableTieBreak(
        `${world.seed}:${personId}:${world.currentDate}:${kind}`,
      ),
    }))
    .sort((left, right) =>
      left.seen !== right.seen ? left.seen - right.seen : left.tie - right.tie,
    )
    .map((entry) => entry.kind);
}

function stableTieBreak(value: string): number {
  let total = 0;
  for (const character of value) {
    total = (total * 31 + character.charCodeAt(0)) % 1_000_003;
  }
  return total;
}

function circumstanceKey(
  kind: LifeCircumstanceKind,
  date: IsoDate,
  personId: EntityId,
): string {
  return `life-circumstance:${personId}:${kind}:${date}`;
}

function alreadyWritten(world: World, stableKey: string): boolean {
  return world.history.events.some((event) => event.stableKey === stableKey);
}

/**
 * One circumstance, written only where the world already supports it.
 *
 * Each branch below states its own preconditions in canonical records and
 * refuses otherwise. None of them creates a person, an organization, a job or
 * an enrollment to make itself possible: a life with no job never gets asked to
 * cover a shift, and that silence is the correct output rather than a scene to
 * be unlocked.
 */
function tryWriteCircumstance(
  world: World,
  personId: EntityId,
  kind: LifeCircumstanceKind,
  cutoff: HistoricalCutoff,
): World {
  const person = world.people[personId];
  if (!person) return world;
  const stableKey = circumstanceKey(kind, world.currentDate, personId);
  if (alreadyWritten(world, stableKey)) return world;

  const work = activeWorkRelationshipsAt(world, personId, cutoff);
  const school = activeEducationEnrollmentsAt(world, personId, cutoff);
  const jurisdictionId =
    lifePlaceByJurisdictionId(person.homeJurisdictionId)?.context.jurisdiction
      .id ?? person.homeJurisdictionId;

  switch (kind) {
    case "colleague-coverage-request": {
      if (work.length === 0) return world;
      const colleagueId = firstColleague(world, personId, cutoff);
      if (colleagueId === null) return world;
      return writeAsk(world, {
        stableKey,
        kind,
        personId,
        counterpartPersonId: colleagueId,
        jurisdictionId,
        type: "work.coverage-requested",
        // What they SAID, recorded as what they said. The world does not know
        // whether there is a funeral, the scene's third option is asking whose
        // it is, and a summary that asserted it would settle the question the
        // scene exists to leave open.
        summary:
          "Somebody on the same rota asked you to take their shift, saying it was for a funeral.",
        relatedEntityIds: [],
        occasion: {
          title: "Shift you were asked to cover",
          summary: "The shift somebody on your rota asked you to take.",
          startHour: 16,
          endHour: 22,
          label: "Workplace",
        },
      });
    }

    case "shared-assignment": {
      if (school.length === 0) return world;
      const classmateId = firstClassmate(world, personId, cutoff);
      if (classmateId === null) return world;
      // This authored assignment records the named contribution as outstanding.
      // It does not infer a person's diligence or willingness from enrollment.
      return writeAsk(world, {
        stableKey,
        kind,
        personId,
        counterpartPersonId: classmateId,
        jurisdictionId,
        type: "school.shared-assignment",
        summary:
          "A shared piece of coursework is due and counts as one piece. The other half has not been handed in.",
        relatedEntityIds: [],
        occasion: null,
        task: {
          title: "The shared piece of coursework",
          summary:
            "It is due, it counts as one piece, and the other half is not done.",
          requiredMinutes: 180,
          // Neither waiting nor blocked, in the engine's sense. Work that is
          // waiting on somebody else is out of this person's hands and cannot
          // require a decision from them; this is squarely theirs — it is due,
          // it has their name on it, and what to do about the missing half is
          // the choice the scene exists to offer. That the half is missing is
          // established by the circumstance's own event, which names the
          // person, rather than by a field that would take the decision away.
        },
      });
    }

    case "supervisor-extra-shift": {
      // A new request, not an old clash: the supervisor asks for an evening,
      // and what it competes with is the course the enrollment records, not a
      // particular evening somebody had already set aside.
      if (school.length === 0) return world;
      const supervisor = recordedSupervisorsAt(world, personId, cutoff)[0];
      if (!supervisor) return world;
      return writeAsk(world, {
        stableKey,
        kind,
        personId,
        counterpartPersonId: supervisor.personId,
        jurisdictionId,
        type: "work.supervisor-shift-requested",
        summary:
          "Your supervisor asked whether you could pick up an extra evening shift you were not scheduled for.",
        relatedEntityIds: [
          supervisor.relationshipId,
          supervisor.supervisorRelationshipId,
        ],
        occasion: {
          title: "Extra shift offered",
          summary: "The evening shift your supervisor asked you to pick up.",
          startHour: 16,
          endHour: 22,
          label: "Workplace",
        },
      });
    }

    case "commute-schedule-conflict":
    case "household-move-preparation":
      // Retired: see RETIRED_LIFE_CIRCUMSTANCE_KINDS for the missing record.
      return world;

    case "class-work-schedule-conflict": {
      const supervisor = recordedSupervisorsAt(world, personId, cutoff)[0];
      if (!supervisor) return world;
      // The clash is with a class session that is actually on the calendar,
      // so the request is for that same stretch of time and nothing else.
      // Whole hours are what the event can carry, so a session that would
      // round to an empty or backwards interval is not written about.
      const session = bookedClassSessions(world, personId, cutoff).find(
        (candidate) =>
          candidate.state.start.date === candidate.state.end.date &&
          Math.ceil(candidate.state.end.minuteOfDay / 60) >
            Math.floor(candidate.state.start.minuteOfDay / 60),
      );
      if (!session) return world;
      return writeAsk(world, {
        stableKey,
        kind,
        personId,
        counterpartPersonId: supervisor.personId,
        jurisdictionId,
        type: "work.class-schedule-conflict",
        summary:
          "Your supervisor asked you to work a shift at the same time as a class session you have booked.",
        relatedEntityIds: [
          supervisor.relationshipId,
          supervisor.supervisorRelationshipId,
          session.activity.id,
        ],
        occasion: {
          title: "Shift at the same time as a class",
          summary: "The shift your supervisor asked you to work.",
          startHour: Math.floor(session.state.start.minuteOfDay / 60),
          endHour: Math.ceil(session.state.end.minuteOfDay / 60),
          label: "Workplace",
        },
      });
    }

    case "own-shift-coverage-needed": {
      if (work.length === 0) return world;
      // The favour this leans on must have been worked, not only agreed to:
      // a covered shift that reached a completed state on the calendar.
      const worked = completedCoveredShifts(world, personId).find(
        (entry) =>
          entry.requesterPersonId !== null &&
          sharesEmployer(world, personId, entry.requesterPersonId, cutoff),
      );
      if (!worked || worked.requesterPersonId === null) return world;
      return writeAsk(world, {
        stableKey,
        kind,
        personId,
        counterpartPersonId: worked.requesterPersonId,
        jurisdictionId,
        type: "work.own-shift-coverage-needed",
        summary:
          "You need somebody to cover one of your shifts. The colleague whose shift you worked earlier still works there.",
        // The worked shift, whose own sources name the request it answered.
        relatedEntityIds: [worked.activityId],
        counterpartRole: "coordination:counterpart",
        counterpartDetail: "The colleague whose shift you worked",
        occasion: {
          title: "Shift you need covered",
          summary: "The shift you need somebody to take.",
          startHour: 16,
          endHour: 22,
          label: "Workplace",
        },
      });
    }

    case "education-work-crossroad": {
      const studyPaths = LIFE_PATHS2_CATALOG.filter(
        (path) =>
          path.kind === "study" &&
          path.scope === "personal" &&
          lifePathEntryReason(world, personId, path) === null,
      );
      const workPaths = LIFE_PATHS2_CATALOG.filter(
        (path) =>
          path.kind === "work" &&
          path.scope === "personal" &&
          lifePathEntryReason(world, personId, path) === null,
      );
      if (studyPaths.length === 0 || workPaths.length === 0) return world;
      if (
        activeEducationEnrollmentsAt(world, personId, cutoff).some(
          (entry) =>
            entry.enrollment.programKind.startsWith("postsecondary:") ||
            entry.enrollment.programKind.startsWith("training:"),
        )
      )
        return world;
      // Nobody asked. Two open paths are a position the record puts this
      // person in, so the event names no asker.
      return writeAsk(world, {
        stableKey,
        kind,
        personId,
        counterpartPersonId: null,
        jurisdictionId,
        type: "life.education-work-crossroad",
        summary:
          "You have a path into further study and a path into full-time work open at the same time.",
        relatedEntityIds: [],
        occasion: null,
      });
    }
  }
}

/**
 * The stretch of a day a circumstance is about, and where.
 *
 * Carried on the event rather than on the calendar — see {@link writeAsk}. The
 * hours are what was proposed, not what was agreed.
 */
interface OccasionInput {
  readonly title: string;
  readonly summary: string;
  readonly startHour: number;
  readonly endHour: number;
  readonly label: string;
}

interface TaskInput {
  readonly title: string;
  readonly summary: string;
  readonly requiredMinutes: number;
}

interface AskInput {
  readonly stableKey: string;
  readonly kind: LifeCircumstanceKind;
  readonly personId: EntityId;
  readonly counterpartPersonId: EntityId | null;
  /** Defaults to the person who asked; a request this person makes names who it is for. */
  readonly counterpartRole?: "agency:asked" | "coordination:counterpart";
  readonly counterpartDetail?: string;
  readonly jurisdictionId: EntityId;
  readonly type: `${string}.${string}`;
  readonly summary: string;
  readonly relatedEntityIds: readonly EntityId[];
  /** The evening it is for, when it is for one. */
  readonly occasion: OccasionInput | null;
  /** The piece of work it leaves behind, when it leaves one. */
  readonly task?: TaskInput;
}

/**
 * One circumstance, as the records that carry it.
 *
 * Always an event, because something happened.
 *
 * Deliberately NOT a calendar entry, and the reason is the contract rather than
 * convenience. The engine refuses to book two activities over each other for
 * the same person, which is right — a fixed commitment is fixed, and a world
 * that let somebody be in two places would be lying about the week. But the
 * premise of half these scenes IS the collision: the shift is on the evening
 * the coursework was for, the bus leaves before the shift ends. Those cannot
 * both be bookings.
 *
 * They are not bookings. An offered shift is an offer: nothing is on the
 * calendar because nobody has agreed to anything yet, and the hours live on the
 * event as what was proposed. If the player says yes, the scene's own writer is
 * where the commitment gets made — which is also where the collision becomes
 * the player's problem rather than the generator's.
 *
 * A work item is written where the circumstance leaves the player actually
 * owing somebody something, so it shows up beside the rest of the week rather
 * than only inside one scene.
 */
function writeAsk(world: World, input: AskInput): World {
  const participants = [
    {
      personId: input.personId,
      role: "focus:subject" as const,
      detail: "The person this is happening to",
    },
    ...(input.counterpartPersonId === null
      ? []
      : [
          {
            personId: input.counterpartPersonId,
            role: input.counterpartRole ?? ("agency:asked" as const),
            detail: input.counterpartDetail ?? "The person who asked",
          },
        ]),
  ];

  let next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.personId,
      ...(input.counterpartPersonId === null
        ? []
        : [input.counterpartPersonId]),
      ...input.relatedEntityIds,
    ],
    participants,
    personFactConstraints: [],
    // Private, because these are things that happened to one person at their
    // own work or school. A public visibility would put a colleague's tip-pool
    // cash into the world's public record on the strength of one person having
    // seen it, which is a much larger claim than the scene makes.
    visibility: "private",
    tags: [
      lifeCircumstanceTag(input.kind),
      VERSIONED_LIFE_CIRCUMSTANCE_KINDS.has(input.kind)
        ? CIRCUMSTANCE_PROVENANCE_V2
        : "provenance:authored-life-circumstance-v1",
      ...(input.occasion
        ? [
            `proposal:start-hour:${input.occasion.startHour}`,
            `proposal:end-hour:${input.occasion.endHour}`,
          ]
        : []),
    ],
    summary: input.summary,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: input.occasion?.label ?? "Where it happened",
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1);
  if (!event) throw new Error("The circumstance was not recorded.");

  // The proposed hours, recorded on the event rather than booked. See above.
  void input.occasion;

  if (input.task) {
    next = createWorkItem(next, {
      stableKey: `${input.stableKey}:task`,
      title: input.task.title,
      summary: input.task.summary,
      jurisdictionId: input.jurisdictionId,
      sourceEntityIds: [event.id],
      focus: { kind: "person", personId: input.personId },
      effort: {
        kind: "authored-duration",
        requiredMinutes: input.task.requiredMinutes,
      },
      access: { kind: "private", personIds: [input.personId] },
      assignedPersonIds: [input.personId],
      playerRequirement:
        next.control.kind === "person" &&
        next.control.personId === input.personId
          ? "decision"
          : "none",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
  }

  return recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:knowledge`,
    personId: input.personId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: input.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

/* -------------------------------------------------------------------------- */
/* Who is available, read off the records                                      */
/* -------------------------------------------------------------------------- */

/**
 * Somebody else working for the same employer, in the world's own order.
 *
 * The world's `personOrder` decides so that a replay of the same save reaches
 * the same person rather than whoever a set happened to yield first.
 */
function firstColleague(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): EntityId | null {
  const employerIds = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).map(
      (entry) => entry.relationship.organizationId,
    ),
  );
  if (employerIds.size === 0) return null;
  for (const candidate of [...world.personOrder].sort()) {
    if (
      candidate === personId ||
      !world.people[candidate] ||
      ageOnDate(world.people[candidate]!.birthDate, cutoff.asOfDate) < 18 ||
      world.history.personDeaths.some(
        (death) =>
          death.personId === candidate && death.diedAt <= cutoff.asOfDate,
      )
    )
      continue;
    const shares = activeWorkRelationshipsAt(world, candidate, cutoff).some(
      (entry) =>
        entry.relationship.organizationId !== null &&
        employerIds.has(entry.relationship.organizationId),
    );
    if (shares) return candidate;
  }
  return null;
}

function livingAdultAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): boolean {
  const person = world.people[personId];
  return (
    person !== undefined &&
    ageOnDate(person.birthDate, cutoff.asOfDate) >= 18 &&
    !world.history.personDeaths.some(
      (death) => death.personId === personId && death.diedAt <= cutoff.asOfDate,
    )
  );
}

function sharesEmployer(
  world: World,
  personId: EntityId,
  otherId: EntityId,
  cutoff: HistoricalCutoff,
): boolean {
  const employerIds = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).flatMap((entry) =>
      entry.relationship.organizationId === null
        ? []
        : [entry.relationship.organizationId],
    ),
  );
  return activeWorkRelationshipsAt(world, otherId, cutoff).some(
    (entry) =>
      entry.relationship.organizationId !== null &&
      employerIds.has(entry.relationship.organizationId),
  );
}

export interface RecordedSupervisor {
  readonly personId: EntityId;
  readonly organizationId: EntityId;
  /** This person's own directed work relationship at that employer. */
  readonly relationshipId: EntityId;
  /** The supervisor's work relationship there, whose authority directs others. */
  readonly supervisorRelationshipId: EntityId;
}

/**
 * Who this person's work records say directs their work.
 *
 * The narrowest supervisory relation the records can express: this person's
 * active relationship at an employer is `directed`, and the other person's
 * active relationship at the same employer `directs-others`. The world keeps
 * no finer reporting line, so where it holds several such people they are all
 * returned, in the world's stable order. A job title is never read.
 */
export function recordedSupervisorsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly RecordedSupervisor[] {
  const found: RecordedSupervisor[] = [];
  for (const entry of activeWorkRelationshipsAt(world, personId, cutoff)) {
    const organizationId = entry.relationship.organizationId;
    if (organizationId === null || entry.relationship.authority !== "directed")
      continue;
    for (const candidate of [...world.personOrder].sort()) {
      if (candidate === personId || !livingAdultAt(world, candidate, cutoff))
        continue;
      const directs = activeWorkRelationshipsAt(world, candidate, cutoff).find(
        (other) =>
          other.relationship.organizationId === organizationId &&
          other.relationship.authority === "directs-others",
      );
      if (!directs || found.some((known) => known.personId === candidate))
        continue;
      found.push({
        personId: candidate,
        organizationId,
        relationshipId: entry.relationship.id,
        supervisorRelationshipId: directs.relationship.id,
      });
    }
  }
  // Sorted the way `episodeRoleBindings` sorts its bindings, so the person a
  // writer names and the person a stage's copy is composed around are the same
  // one where a workplace records more than one.
  return [...found].sort((left, right) =>
    left.personId.localeCompare(right.personId),
  );
}

/**
 * Class sessions this person has booked that have not happened yet.
 *
 * A booked session is a scheduled activity this person carries out, sourced
 * from one of their active enrollments, still in the `scheduled` state and
 * starting after now. It is the only class timetable the world records.
 */
export function bookedClassSessions(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly {
  readonly activity: ScheduledActivityRecord;
  readonly state: ScheduledActivityStateRecord;
}[] {
  const enrollmentIds = new Set(
    activeEducationEnrollmentsAt(world, personId, cutoff).map(
      (entry) => entry.enrollment.id,
    ),
  );
  if (enrollmentIds.size === 0) return [];
  return world.history.scheduledActivities
    .filter(
      (activity) =>
        activity.responsiblePersonId === personId &&
        activity.sourceEntityIds.some((id) => enrollmentIds.has(id)),
    )
    .map((activity) => ({
      activity,
      state: scheduledActivityState(world, activity.id),
    }))
    .filter(
      ({ state }) =>
        state.status === "scheduled" &&
        compareSimulationMoments(state.start, world.currentMoment) > 0,
    )
    .sort(
      (left, right) =>
        compareSimulationMoments(left.state.start, right.state.start) ||
        left.activity.sequence - right.activity.sequence,
    );
}

/** Where a covered shift is booked. Also the key a UI venue would declare. */
export const COVERED_SHIFT_LOCATION_KEY = "life-circumstance:covered-shift";

/** Days between working somebody's shift and needing one of your own covered. */
export const COVERED_SHIFT_RETURN_DAYS = 120;

function proposedHour(
  tags: readonly string[],
  which: "start" | "end",
): number | null {
  const tag = tags.find((entry) => entry.startsWith(`proposal:${which}-hour:`));
  const hour = tag ? Number(tag.slice(`proposal:${which}-hour:`.length)) : NaN;
  return Number.isInteger(hour) ? hour : null;
}

function requesterOf(
  world: World,
  eventId: EntityId,
  personId: EntityId,
): EntityId | null {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  return (
    event?.participants.find(
      (participant) =>
        participant.personId !== personId &&
        participant.role === "agency:asked",
    )?.personId ?? null
  );
}

/**
 * Coverage requests this person said yes to, each with the event of the yes.
 *
 * The yes is the `cover-it` answer to the request's own stage, played after
 * the request and with the requester in the cast. Nothing here says the shift
 * was worked; that is {@link completedCoveredShifts}.
 */
function agreedCoverageRequests(
  world: World,
  personId: EntityId,
): readonly {
  readonly requestEventId: EntityId;
  readonly agreementEventId: EntityId;
  readonly requesterPersonId: EntityId;
  readonly startHour: number;
  readonly endHour: number;
}[] {
  const agreements = playedEpisodeStages(world, personId).filter(
    (entry) =>
      entry.episodeKey === "work.the-shift-you-were-asked-for" &&
      entry.stageKey === "asked-by-a-colleague" &&
      entry.optionKey === "cover-it",
  );
  const found = [];
  for (const request of world.history.events) {
    if (
      !request.tags.includes(lifeCircumstanceTag("colleague-coverage-request"))
    )
      continue;
    const requesterPersonId = requesterOf(world, request.id, personId);
    if (
      requesterPersonId === null ||
      !request.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "focus:subject",
      )
    )
      continue;
    const agreement = agreements.find((entry) => {
      const played = world.history.events.find(
        (event) => event.id === entry.eventId,
      );
      return (
        entry.sequence > request.sequence &&
        played?.involvedEntityIds.includes(requesterPersonId) === true
      );
    });
    const startHour = proposedHour(request.tags, "start");
    const endHour = proposedHour(request.tags, "end");
    if (!agreement || startHour === null || endHour === null) continue;
    found.push({
      requestEventId: request.id,
      agreementEventId: agreement.eventId,
      requesterPersonId,
      startHour,
      endHour,
    });
  }
  return found;
}

/**
 * Puts the shift this person agreed to cover on their calendar.
 *
 * Agreeing, booking and working are three records, not one. This writes the
 * second: a fixed scheduled activity at the hours the colleague asked for, on
 * the first day those hours are still ahead, sourced from the request and the
 * yes. It refuses — returning the world unchanged — when there is no yes, when
 * the shift is already booked, when the job or the colleague's job has ended,
 * or when the calendar already holds something at that time. Working it is
 * `performScheduledActivity`; nothing here marks it done.
 *
 * Not called by any reader. The unified story controller calls it from the
 * `cover-it` answer, and the existing Calendar/Places route offers the booked
 * activity for performance. No separate shift-management surface exists.
 */
/** Unique per attempt, so a cancelled booking can be replaced. */
function coverShiftKey(
  world: World,
  personId: EntityId,
  requestEventId: EntityId,
): string {
  const attempts = world.history.scheduledActivities.filter(
    (activity) =>
      activity.location.locationKey === COVERED_SHIFT_LOCATION_KEY &&
      activity.sourceEntityIds.includes(requestEventId),
  ).length;
  return `${COVERED_SHIFT_LOCATION_KEY}:${personId}:${requestEventId}:${attempts}`;
}

export function scheduleAgreedCoverShift(
  world: World,
  personId: EntityId,
): World {
  const cutoff = currentLifeCutoff(world);
  if (activeWorkRelationshipsAt(world, personId, cutoff).length === 0)
    return world;
  const pending = agreedCoverageRequests(world, personId).find(
    (entry) =>
      sharesEmployer(world, personId, entry.requesterPersonId, cutoff) &&
      // A cancelled booking is not a booking: only a live or worked one stands
      // in the way of putting the shift back on the calendar.
      !world.history.scheduledActivities.some(
        (activity) =>
          activity.location.locationKey === COVERED_SHIFT_LOCATION_KEY &&
          activity.sourceEntityIds.includes(entry.requestEventId) &&
          scheduledActivityState(world, activity.id).status !== "cancelled",
      ),
  );
  if (!pending || pending.endHour <= pending.startHour) return world;
  const at = (date: IsoDate, hour: number) =>
    simulationMomentAtLocalTime({
      date,
      minuteOfDay: hour * 60,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  const date =
    compareSimulationMoments(
      at(world.currentDate, pending.startHour),
      world.currentMoment,
    ) > 0
      ? world.currentDate
      : addDays(world.currentDate, 1);
  const person = world.people[personId]!;
  try {
    return createScheduledActivity(world, {
      stableKey: coverShiftKey(world, personId, pending.requestEventId),
      title: "Shift you agreed to cover",
      summary:
        "The shift a colleague asked you to take, which you said yes to.",
      kind: "confirmed",
      start: at(date, pending.startHour),
      end: at(date, pending.endHour),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: COVERED_SHIFT_LOCATION_KEY,
        label: "Workplace",
        jurisdictionId:
          lifePlaceByJurisdictionId(person.homeJurisdictionId)?.context
            .jurisdiction.id ?? person.homeJurisdictionId,
      },
      sourceEntityIds: [pending.requestEventId, pending.agreementEventId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("conflicts"))
      return world;
    throw error;
  }
}

/**
 * Covered shifts this person actually worked, oldest first.
 *
 * Worked means the booked activity's latest state is `completed` with an
 * outcome event — the record `performScheduledActivity` writes — at least
 * {@link COVERED_SHIFT_RETURN_DAYS} ago, and not already leaned on by an
 * earlier request of this person's own.
 */
export function completedCoveredShifts(
  world: World,
  personId: EntityId,
): readonly {
  readonly activityId: EntityId;
  readonly requestEventId: EntityId;
  readonly requesterPersonId: EntityId | null;
}[] {
  const alreadyCited = new Set(
    world.history.events
      .filter((event) =>
        event.tags.includes(lifeCircumstanceTag("own-shift-coverage-needed")),
      )
      .flatMap((event) => event.involvedEntityIds),
  );
  return world.history.scheduledActivities
    .filter(
      (activity) =>
        activity.location.locationKey === COVERED_SHIFT_LOCATION_KEY &&
        activity.responsiblePersonId === personId &&
        !alreadyCited.has(activity.id),
    )
    .flatMap((activity) => {
      const state = scheduledActivityState(world, activity.id);
      const requestEventId = activity.sourceEntityIds.find((id) =>
        world.history.events.some(
          (event) =>
            event.id === id &&
            event.tags.includes(
              lifeCircumstanceTag("colleague-coverage-request"),
            ),
        ),
      );
      if (
        state.status !== "completed" ||
        state.outcomeEventId === null ||
        requestEventId === undefined ||
        addDays(state.end.date, COVERED_SHIFT_RETURN_DAYS) > world.currentDate
      )
        return [];
      return [
        {
          activityId: activity.id,
          requestEventId,
          requesterPersonId: requesterOf(world, requestEventId, personId),
        },
      ];
    });
}

/** Somebody enrolled at the same school or programme. */
function firstClassmate(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): EntityId | null {
  const organizationIds = new Set(
    activeEducationEnrollmentsAt(world, personId, cutoff).map(
      (entry) =>
        `${entry.enrollment.organizationId}:${entry.enrollment.programKind}`,
    ),
  );
  if (organizationIds.size === 0) return null;
  for (const candidate of [...world.personOrder].sort()) {
    if (
      candidate === personId ||
      !world.people[candidate] ||
      ageOnDate(world.people[candidate]!.birthDate, cutoff.asOfDate) < 18 ||
      world.history.personDeaths.some(
        (death) =>
          death.personId === candidate && death.diedAt <= cutoff.asOfDate,
      )
    )
      continue;
    const shares = activeEducationEnrollmentsAt(world, candidate, cutoff).some(
      (entry) =>
        organizationIds.has(
          `${entry.enrollment.organizationId}:${entry.enrollment.programKind}`,
        ),
    );
    if (shares) return candidate;
  }
  return null;
}
