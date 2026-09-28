import { addDays } from "../dates";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import { scheduleFutureDueItem } from "../future-transitions";
import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { stableHash } from "../ids";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  recordEnactment,
  takeFloorVote,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { rulePackById } from "../legislature-rule-packs";
import { nextMeasureNumbering } from "../measure-numbering";
import {
  municipalRulePackFor,
  municipalRulePackId,
  primaryReading,
} from "../municipal-government";
import { recordCouncilReadingVote } from "../municipal-ordinance-procedure";
import { localGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import { homeLocalGovernmentUnits } from "../nationwide-world/local-governments";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { SeededRng } from "../rng";
import { townCouncilProfilePackId } from "../town-council-profile";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  LegislativeVoteRecord,
  PolicyPropositionDefinition,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  localGovernmentSeated,
  sittingLocalOfficers,
} from "./local-government-seats";
import { PUBLIC_MEETING_KEY } from "../life-opportunities";
import { playerTown } from "./town-residents";

/**
 * The player's town council meets and votes.
 *
 * Every two weeks the council seated at the opening meets. At each meeting a
 * member other than the player introduces an ordinance, and every ordinance
 * introduced at an earlier meeting is put to a roll call of the sitting
 * members and adopted or rejected. The first meeting is the public meeting
 * the opening posts on the local calendar: its agenda item, opening the
 * meeting room one extra evening each week, is on the council's agenda as an
 * ordinance, so that meeting ends with the council's vote.
 *
 * A council whose charter is compiled into a rule pack that the engine can
 * run moves its ordinances through that pack's own readings and thresholds
 * (`recordCouncilReadingVote`). Every other council plays under the labeled
 * town profile (`town-council-profile.ts`).
 *
 * PLACEHOLDERS, pending `local-council-legislative-volume`:
 * - The council meets every `daysBetweenMeetings` days and one member
 *   introduces one ordinance each time. Neither is any town's schedule.
 * - A member's ballot is a game-authored stand-in drawn from a stable hash of
 *   the world, the ordinance and the member, disclosed on the vote as the
 *   District of Columbia's sittings disclose theirs. How a member decides is
 *   not modeled.
 * - An ordinance answers one question from the world's policy catalog that
 *   is decided at the municipal level; what it does beyond being recorded
 *   goes through the one enacted-law effects step.
 */

export const LOCAL_COUNCIL_MEETINGS_VERSION = "local-council-meetings/v1";
const V = LOCAL_COUNCIL_MEETINGS_VERSION;

export const LOCAL_COUNCIL_MEETING = "civic:local-council-meeting" as const;

export const LOCAL_COUNCIL_MEETING_PROFILE = {
  id: "ocd-local-council-meeting-placeholder/v1",
  daysBetweenMeetings: 14,
  introductionsPerMeeting: 1,
} as const;

const P = LOCAL_COUNCIL_MEETING_PROFILE;

export const LOCAL_COUNCIL_AUTHORED_BALLOT_NOTE = `${P.id}: each member's ballot is a game-authored stand-in, not any real council member's position; how a member decides is not modeled yet.`;

/** The ordinance the posted public meeting takes up, for one town. */
export function postedMeetingOrdinanceKey(town: EntityId): string {
  return `${V}:${town}:posted-meeting-ordinance`;
}

/* -------------------------------------------------------------------------- */
/* Which rules the council plays under                                         */
/* -------------------------------------------------------------------------- */

interface CouncilRules {
  readonly packId: string;
  /** Set when the town's compiled charter runs the procedure. */
  readonly governmentKey: string | null;
}

function councilRules(unit: GovernmentUnitIdentity): CouncilRules | null {
  const compiled = municipalGovernmentForUnit(unit);
  if (compiled) {
    const pack = municipalRulePackFor(compiled);
    if (pack.ok)
      return {
        packId: municipalRulePackId(primaryReading(compiled)),
        governmentKey: compiled.key,
      };
  }
  if (!localGoverningBodyIdentity(unit)) return null;
  return { packId: townCouncilProfilePackId(unit), governmentKey: null };
}

function members(world: World, unit: GovernmentUnitIdentity) {
  return sittingLocalOfficers(world, unit).filter((seat) => !seat.mayor);
}

/** The member's ballot on one ordinance, the same at every reading. */
export function localCouncilAuthoredBallot(
  world: World,
  measureStableKey: string,
  personId: EntityId,
): "yea" | "nay" {
  const digest = stableHash(
    `${world.id}:${measureStableKey}:authored-ballot:${personId}`,
  );
  // Most ordinances a council takes up pass; two ballots in three are yea.
  return Number.parseInt(digest.slice(-2), 16) % 3 === 0 ? "nay" : "yea";
}

/* -------------------------------------------------------------------------- */
/* The calendar                                                                */
/* -------------------------------------------------------------------------- */

function meetingKey(unitId: string, date: string): string {
  return `${V}:${unitId}:meeting:${date}`;
}

function scheduleMeeting(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  player: EntityId,
  dueAt: string,
): World {
  const stableKey = meetingKey(unit.id, dueAt);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: LOCAL_COUNCIL_MEETING,
    entityIds: [town, player],
    jurisdictionId: town,
    provenance: {
      kind: "authored",
      note: `${P.id}: ${unit.name}'s council meets every ${P.daysBetweenMeetings} days, pending local-council-legislative-volume.`,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Ordinances                                                                  */
/* -------------------------------------------------------------------------- */

function townQuestions(world: World): readonly PolicyPropositionDefinition[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder
    .map((id) => catalog.propositions[id])
    .filter(
      (proposition): proposition is PolicyPropositionDefinition =>
        proposition !== undefined &&
        (catalog.issues[proposition.issueId]?.levels ?? []).includes(
          "municipality",
        ),
    );
}

/** "Short-term rental rules" becomes "Short-Term Rental Rules Ordinance". */
function ordinanceTitle(questionName: string): string {
  const words = questionName
    .replace(/\s+(law|act|ordinance)$/i, "")
    .split(/\s+/)
    .map((word, index) =>
      index > 0 &&
      /^(a|an|and|as|at|by|for|in|of|on|or|the|to|with)$/i.test(word)
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    );
  return `${words.join(" ")} Ordinance`;
}

function introduce(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  rules: CouncilRules,
  input: {
    readonly stableKey?: string;
    readonly sponsorPersonId: EntityId;
    readonly shortTitle: string;
    readonly summary: string;
    readonly proposition: PolicyPropositionDefinition | null;
    readonly answer: "yes" | "no";
  },
): World {
  const pack = rulePackById(rules.packId);
  const numbering = nextMeasureNumbering(world, {
    jurisdictionId: town,
    originChamber: chamberByKey(pack, "council"),
    rulePackId: rules.packId,
  });
  return introduceMeasure(world, {
    stableKey:
      input.stableKey ??
      `${V}:${unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
    jurisdictionId: town,
    rulePackId: rules.packId,
    ...numbering,
    shortTitle: input.shortTitle,
    summary: input.summary,
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: input.sponsorPersonId,
    ...(input.proposition
      ? {
          propositionIds: [input.proposition.id],
          propositionAnswers: [
            { propositionId: input.proposition.id, answer: input.answer },
          ],
        }
      : {}),
  });
}

function introduceOne(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  rules: CouncilRules,
  player: EntityId | null,
  index: number,
): World {
  const sponsors = members(world, unit).filter(
    (seat) => seat.personId !== player,
  );
  const questions = townQuestions(world);
  if (sponsors.length === 0 || questions.length === 0) return world;
  const rng = new SeededRng(world.seed).fork(
    `${V}:${unit.id}:${world.currentDate}:${index}`,
  );
  const sponsor = sponsors[rng.integer(0, sponsors.length)]!;
  const question = questions[rng.integer(0, questions.length)]!;
  const answer: "yes" | "no" = rng.integer(0, 2) === 0 ? "yes" : "no";
  return introduce(world, unit, town, rules, {
    sponsorPersonId: sponsor.personId,
    shortTitle: ordinanceTitle(question.name),
    summary: `Answers "${question.question}" with ${answer}.`,
    proposition: question,
    answer,
  });
}

function councilMeasures(
  world: World,
  rules: CouncilRules,
  town: EntityId,
): readonly LegislativeMeasureRecord[] {
  return (world.history.legislativeMeasures ?? []).filter(
    (measure) =>
      measure.rulePackId === rules.packId && measure.jurisdictionId === town,
  );
}

/** Adopted under the town profile: enrolled, recorded as law, its effects applied. */
function afterAdoption(world: World, measure: LegislativeMeasureRecord): World {
  let next = enrollMeasure(world, {
    stableKey: `${measure.stableKey}:enrolled`,
    measureId: measure.id,
  });
  if (measurePosition(next, measure.id).phase !== "awaiting-enactment")
    return next;
  next = recordEnactment(next, {
    stableKey: `${measure.stableKey}:enactment`,
    measureId: measure.id,
    actDesignation: measure.designation,
    effectiveAt: next.currentDate,
  });
  return applyEnactedLawEffects(next, measure.id);
}

/** Every ordinance a member other than the player carries takes its next step. */
function moveOrdinances(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  rules: CouncilRules,
  player: EntityId | null,
): World {
  let next = world;
  for (const measure of councilMeasures(world, rules, town)) {
    if (player && measure.sponsorPersonId === player) continue;
    const phase = measurePosition(next, measure.id).phase;
    if (phase === "awaiting-referral") {
      next = placeMeasureOnCalendar(next, {
        stableKey: `${measure.stableKey}:agenda`,
        measureId: measure.id,
        rationale: `Placed on the council's agenda for its next meeting (${P.id}).`,
      });
      continue;
    }
    if (phase !== "on-floor") continue;
    // Taken up at a meeting after the one it was introduced at.
    if (measure.introducedAt >= next.currentDate) continue;
    const seats = members(next, unit);
    if (seats.length === 0) continue;
    const dispositions: LegislativeVoteDisposition[] = seats.map(
      (seat, index) => ({
        memberKey: `council:${index + 1}`,
        personId: seat.personId,
        disposition:
          seat.personId === player
            ? "absent"
            : localCouncilAuthoredBallot(
                next,
                measure.stableKey,
                seat.personId,
              ),
      }),
    );
    const provenance = {
      method: "authored-fixture" as const,
      note: LOCAL_COUNCIL_AUTHORED_BALLOT_NOTE,
      sourceEntityIds: [measure.id],
    };
    if (rules.governmentKey) {
      const result = recordCouncilReadingVote(next, {
        governmentKey: rules.governmentKey,
        measureId: measure.id,
        dispositions,
        provenance,
      });
      // A reading that may not be taken yet waits for a later meeting.
      if (result.ok) next = result.world;
      continue;
    }
    next = takeFloorVote(next, {
      stableKey: `${measure.stableKey}:adoption:${next.currentDate}`,
      measureId: measure.id,
      dispositions,
      presentMembers: dispositions.filter((row) => row.disposition !== "absent")
        .length,
      electedMembers: seats.length,
      provenance,
    });
    if (measurePosition(next, measure.id).phase !== "failed")
      next = afterAdoption(next, measure);
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* The posted public meeting                                                   */
/* -------------------------------------------------------------------------- */

function seatedCouncil(
  world: World,
  playerPersonId: EntityId,
): {
  readonly unit: GovernmentUnitIdentity;
  readonly town: EntityId;
  readonly rules: CouncilRules;
} | null {
  const town = playerTown(world, playerPersonId);
  if (!town) return null;
  // Only the town's own council meets; a second government for the same
  // place (rare) keeps its seats but not a calendar.
  for (const unit of homeLocalGovernmentUnits(world, playerPersonId)
    .municipal) {
    if (!localGovernmentSeated(world, unit.id)) continue;
    const rules = councilRules(unit);
    if (rules) return { unit, town, rules };
  }
  return null;
}

/**
 * Put the town council's regular meetings on the calendar, the first
 * `daysBetweenMeetings` after the opening. Unchanged where the town
 * government is not seated.
 */
export function ensureLocalCouncilMeetings(
  world: World,
  playerPersonId: EntityId,
): World {
  const council = seatedCouncil(world, playerPersonId);
  if (!council) return world;
  return scheduleMeeting(
    world,
    council.unit,
    council.town,
    playerPersonId,
    addDays(world.currentDate, P.daysBetweenMeetings),
  );
}

/**
 * The public meeting posted on the local calendar today, for tomorrow
 * evening, is a meeting of the town council: its agenda item goes before the
 * council as an ordinance, and the council meets that day to vote on it.
 * Unchanged when no meeting was posted today or the town is not seated.
 */
export function ensurePostedMeetingOnCouncilAgenda(
  world: World,
  playerPersonId: EntityId,
): World {
  const notice = world.history.events.find(
    (event) => event.stableKey === `${PUBLIC_MEETING_KEY}:notice`,
  );
  if (!notice || notice.occurredAt !== world.currentDate) return world;
  const council = seatedCouncil(world, playerPersonId);
  if (!council || notice.jurisdictionId !== council.town) return world;
  const { unit, town, rules } = council;
  const key = postedMeetingOrdinanceKey(town);
  if (
    (world.history.legislativeMeasures ?? []).some(
      (measure) => measure.stableKey === key,
    )
  )
    return world;
  const sponsor = members(world, unit).find(
    (seat) => seat.personId !== playerPersonId,
  );
  if (!sponsor) return world;
  let next = introduce(world, unit, town, rules, {
    stableKey: key,
    sponsorPersonId: sponsor.personId,
    shortTitle: "Meeting Room Evening Hours Ordinance",
    summary:
      "Opens the public meeting room one extra evening each week. No hours or funding proposal is attached.",
    proposition: null,
    answer: "yes",
  });
  const measure = next.history.legislativeMeasures!.at(-1)!;
  next = placeMeasureOnCalendar(next, {
    stableKey: `${measure.stableKey}:agenda`,
    measureId: measure.id,
    rationale: "Posted on the agenda of the public meeting.",
  });
  const dueAt = addDays(world.currentDate, 1);
  const stableKey = `${V}:${unit.id}:posted-meeting:${dueAt}`;
  if (next.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return next;
  return scheduleFutureDueItem(next, {
    stableKey,
    dueAt,
    transitionKey: LOCAL_COUNCIL_MEETING,
    entityIds: [town, playerPersonId],
    jurisdictionId: town,
    provenance: {
      kind: "authored",
      note: `${P.id}: the posted public meeting is a meeting of ${unit.name}'s council.`,
    },
  });
}

/** The roll call the posted public meeting ended with, if there was one. */
export function postedMeetingVote(
  world: World,
  town: EntityId,
): {
  readonly vote: LegislativeVoteRecord;
  readonly measure: LegislativeMeasureRecord;
  readonly bodyName: string;
} | null {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.stableKey === postedMeetingOrdinanceKey(town),
  );
  if (!measure) return null;
  const vote = (world.history.legislativeVotes ?? []).find(
    (row) => row.measureId === measure.id,
  );
  if (!vote) return null;
  const pack = rulePackById(measure.rulePackId);
  return {
    vote,
    measure,
    bodyName: chamberByKey(pack, "council").name,
  };
}

/** "The Ely City Council voted 4-1 to adopt ORD 1, which opens ..." */
export function postedMeetingVoteSentence(
  world: World,
  town: EntityId,
): string | null {
  const found = postedMeetingVote(world, town);
  if (!found) return null;
  const { vote, measure, bodyName } = found;
  const adopted = vote.outcome === "passed";
  return `The ${bodyName} voted ${vote.tally.yea}-${vote.tally.nay} ${adopted ? "to adopt" : "against"} ${measure.designation}, which would open the room one extra evening each week.`;
}

/** Who chairs a meeting of the town's council: its mayor, or a member. */
export function localCouncilChair(
  world: World,
  town: EntityId,
  playerPersonId: EntityId,
): EntityId | null {
  for (const unit of homeLocalGovernmentUnits(world, playerPersonId)
    .municipal) {
    if (!localGovernmentSeated(world, unit.id)) continue;
    const officers = sittingLocalOfficers(world, unit).filter(
      (seat) =>
        seat.personId !== playerPersonId &&
        world.people[seat.personId]?.homeJurisdictionId === town,
    );
    const chair =
      officers.find((seat) => seat.mayor) ??
      officers.find((seat) => !seat.mayor);
    if (chair) return chair.personId;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* A meeting                                                                   */
/* -------------------------------------------------------------------------- */

export function localCouncilMeetingHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = new RegExp(
    `^${V.replace("/", "\\/")}:(gus2025:[^:]+):(meeting|posted-meeting):`,
  ).exec(due.stableKey);
  const unit = match ? governmentUnit(match[1]!) : null;
  const town = due.jurisdictionId;
  const player = due.entityIds[1] ?? null;
  const done = (next: World, context: string) => ({
    world: next,
    status: "resolved" as const,
    reasonKey: null,
    context,
    outcomeEventId: null,
  });
  if (!unit || !town)
    return done(world, "No town council matches this meeting.");
  const rules = councilRules(unit);
  if (!rules) return done(world, "This town has no council to meet.");
  const votesBefore = (world.history.legislativeVotes ?? []).length;
  let next = moveOrdinances(world, unit, town, rules, player);
  for (let index = 0; index < P.introductionsPerMeeting; index += 1)
    next = introduceOne(next, unit, town, rules, player, index);
  const votes = (next.history.legislativeVotes ?? []).slice(votesBefore);
  const identity = localGoverningBodyIdentity(unit)!;
  const measuresById = new Map(
    (next.history.legislativeMeasures ?? []).map((row) => [row.id, row]),
  );
  next = recordWorldEvent(next, {
    stableKey: `${due.stableKey}:held`,
    type: "local.council-meeting-held",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [town, ...votes.map((vote) => vote.measureId)],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [V, `unit:${unit.id}`, `votes:${votes.length}`],
    summary:
      votes.length === 0
        ? `The ${identity.bodyName} met and took no vote.`
        : `The ${identity.bodyName} met and voted on ${votes
            .map((vote) => {
              const measure = measuresById.get(vote.measureId);
              return `${measure?.designation ?? "an ordinance"} (${vote.outcome === "passed" ? "adopted" : "rejected"} ${vote.tally.yea}-${vote.tally.nay})`;
            })
            .join(", ")}.`,
    context: {
      location: {
        jurisdictionId: town,
        label: identity.governmentName,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  // The posted meeting is an extra one; only a regular meeting sets the next.
  if (player && match![2] === "meeting")
    next = scheduleMeeting(
      next,
      unit,
      town,
      player,
      addDays(due.dueAt, P.daysBetweenMeetings),
    );
  return done(next, `The ${identity.bodyName} met.`);
}

export const LOCAL_COUNCIL_MEETING_HANDLERS = [
  [LOCAL_COUNCIL_MEETING, localCouncilMeetingHandler],
] as const;
