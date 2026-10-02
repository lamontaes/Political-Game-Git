import { applyInstitutionStep } from "../governing/legislative-clock";
import {
  councilRules,
  lawJurisdiction,
  type CouncilRules,
} from "./local-council-binding";
import { addDays } from "../dates";
import { fileMemberAgendaBills } from "../governing/member-agenda";
import { scheduleFutureDueItem } from "../future-transitions";
import { mayAnswerQuestion } from "../governing/question-authority";
import {
  governmentUnit,
  type GovernmentUnitIdentity,
} from "../government-units";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { rulePackById } from "../legislature-rule-packs";
import { nextMeasureNumbering } from "../measure-numbering";
import { completeCouncilPassage } from "../municipal-ordinance-procedure";
import { localGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import {
  homeLocalGovernmentUnits,
  localGovernmentDisplayName,
} from "../nationwide-world/local-governments";
import { boardGoverningBodyRules } from "../nationwide-world/township-governing-body-rules";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  LegislativeMeasureRecord,
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
import { epidemicCouncilMeetingDecision } from "../crisis/epidemic";

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
 * Members file and vote for their own reasons (`council-lawmaking.ts`): a
 * member files on the question their principles press hardest where the
 * town's law does not already say what they want, and every member votes
 * through the legislatures' vote engine with the town's voters as their
 * constituents. An ordinance answers one question the town's own law may
 * answer (`townQuestions`); what it does beyond being recorded goes through
 * the one enacted-law effects step.
 *
 * PLACEHOLDER, pending `local-council-legislative-volume`: the council meets
 * every `daysBetweenMeetings` days, which is not any town's schedule.
 */

export const LOCAL_COUNCIL_MEETINGS_VERSION = "local-council-meetings/v1";
const V = LOCAL_COUNCIL_MEETINGS_VERSION;

export const LOCAL_COUNCIL_MEETING = "civic:local-council-meeting" as const;

export const LOCAL_COUNCIL_MEETING_PROFILE = {
  id: "ocd-local-council-meeting-placeholder/v1",
  daysBetweenMeetings: 14,
} as const;

const P = LOCAL_COUNCIL_MEETING_PROFILE;

/** The ordinance the posted public meeting takes up, for one town. */
export function postedMeetingOrdinanceKey(town: EntityId): string {
  return `${V}:${town}:posted-meeting-ordinance`;
}

/* -------------------------------------------------------------------------- */
/* Which rules the council plays under                                         */
/* -------------------------------------------------------------------------- */

/** The body's name and its government's, for a town council or a county board. */
function bodyNames(unit: GovernmentUnitIdentity): {
  readonly bodyName: string;
  readonly governmentName: string;
} {
  const town = localGoverningBodyIdentity(unit);
  if (town)
    return { bodyName: town.bodyName, governmentName: town.governmentName };
  return {
    bodyName: boardGoverningBodyRules(unit)?.bodyName ?? "governing body",
    governmentName: localGovernmentDisplayName(unit),
  };
}

function members(world: World, unit: GovernmentUnitIdentity) {
  return sittingLocalOfficers(world, unit).filter((seat) => !seat.mayor);
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

/**
 * The questions the town's own law may answer: its own city or county
 * questions, where the powers catalog does not withhold the power
 * (`question-authority.ts`). A state's question is never an ordinance.
 */
export function townQuestions(
  world: World,
  town: EntityId,
): readonly PolicyPropositionDefinition[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder
    .map((id) => catalog.propositions[id])
    .filter(
      (proposition): proposition is PolicyPropositionDefinition =>
        proposition !== undefined &&
        mayAnswerQuestion(world, town, proposition.id),
    );
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
  const law = lawJurisdiction(world, unit, town);
  const numbering = nextMeasureNumbering(law.world, {
    jurisdictionId: law.jurisdictionId,
    originChamber: chamberByKey(pack, "council"),
    rulePackId: rules.packId,
  });
  return introduceMeasure(law.world, {
    stableKey:
      input.stableKey ??
      `${V}:${unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
    jurisdictionId: law.jurisdictionId,
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

/**
 * Members other than the player file what their principles press them to,
 * at most one ordinance each through the shared member filer.
 */
function fileOrdinances(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  rules: CouncilRules,
  player: EntityId | null,
): World {
  const seats = members(world, unit);
  const law = lawJurisdiction(world, unit, town);
  return fileMemberAgendaBills(law.world, {
    jurisdictionId: law.jurisdictionId,
    intakeKey: `${V}:${unit.id}:${law.world.currentDate}:filings`,
    chamberKey: "council",
    council: {
      pack: rulePackById(rules.packId),
      members: seats,
      questions: townQuestions(law.world, law.jurisdictionId).map(
        (question) => question.id,
      ),
      measures: councilMeasures(law.world, rules, law.jurisdictionId),
      playerPersonId: player,
      measureKey: (numbering) =>
        `${V}:${unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
    },
  });
}

function councilMeasures(
  world: World,
  rules: CouncilRules,
  jurisdictionId: EntityId,
): readonly LegislativeMeasureRecord[] {
  return (world.history.legislativeMeasures ?? []).filter(
    (measure) =>
      measure.rulePackId === rules.packId &&
      measure.jurisdictionId === jurisdictionId,
  );
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
  const law = lawJurisdiction(world, unit, town).jurisdictionId;
  for (const measure of councilMeasures(world, rules, law)) {
    if (player && measure.sponsorPersonId === player) continue;
    const phase = measurePosition(next, measure.id).phase;
    if (phase !== "awaiting-referral" && phase !== "on-floor") continue;
    // Taken up at a meeting after the one it was introduced at.
    if (phase === "on-floor" && measure.introducedAt >= next.currentDate)
      continue;
    const result = applyInstitutionStep(
      next,
      measure.id,
      (unchanged) => unchanged,
      {
        localCouncil: {
          governmentUnitId: unit.id,
          townJurisdictionId: town,
          playerPersonId: player,
        },
      },
    );
    // The shared writer preserves every compiled reading interval and quorum.
    if (result.kind !== "applied") continue;
    next = result.world;
    if (measurePosition(next, measure.id).phase === "awaiting-enrollment")
      next = completeCouncilPassage(next, measure, rules.governmentKey);
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
  // Where the place has no town government, its county's board (or its
  // municipio's legislature) is the body that makes its local law.
  // Inside a town or township, the town's board is that body, not the county's.
  const units = homeLocalGovernmentUnits(world, playerPersonId);
  for (const unit of [
    ...units.municipal,
    ...units.townships,
    ...units.counties,
  ]) {
    if (!localGovernmentSeated(world, unit.id)) continue;
    if (
      unit.unitType === "county" &&
      units.municipal.length + units.townships.length > 0
    )
      continue;
    if (unit.unitType === "township" && units.municipal.length > 0) continue;
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
  const present = vote.tally.presentNotVoting;
  const abstained =
    present === 0
      ? ""
      : `, with ${present} ${present === 1 ? "member" : "members"} answering present`;
  return `The ${bodyName} voted ${vote.tally.yea}-${vote.tally.nay} ${adopted ? "to adopt" : "against"} ${measure.designation}${abstained}, which would open the room one extra evening each week.`;
}

/** Who chairs a meeting of the town's council: its mayor, or a member. */
export function localCouncilChair(
  world: World,
  town: EntityId,
  playerPersonId: EntityId,
): EntityId | null {
  const council = seatedCouncil(world, playerPersonId);
  for (const unit of council ? [council.unit] : []) {
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
    `^${V.replace("/", "\\/")}:((?:gus2025|municipio):[^:]+):(meeting|posted-meeting):`,
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
  const identity = bodyNames(unit);
  // The chair may cancel a regular meeting while an illness is going around.
  // The posted public meeting is one the player may attend, and its
  // attendance scene does not read a cancellation yet, so it always meets.
  const decision =
    match![2] !== "meeting"
      ? { world, canceled: false }
      : epidemicCouncilMeetingDecision(world, {
          stableKey: due.stableKey,
          town,
          bodyName: identity.bodyName,
          chairPersonId: player ? localCouncilChair(world, town, player) : null,
          memberPersonIds: members(world, unit).map((seat) => seat.personId),
        });
  if (decision.canceled) {
    let next = decision.world;
    if (player)
      next = scheduleMeeting(
        next,
        unit,
        town,
        player,
        addDays(due.dueAt, P.daysBetweenMeetings),
      );
    return done(next, `The ${identity.bodyName} did not meet.`);
  }
  const votesBefore = (world.history.legislativeVotes ?? []).length;
  let next = moveOrdinances(world, unit, town, rules, player);
  next = fileOrdinances(next, unit, town, rules, player);
  const votes = (next.history.legislativeVotes ?? []).slice(votesBefore);
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

export function localCouncilMeetingHandlers() {
  return [[LOCAL_COUNCIL_MEETING, localCouncilMeetingHandler]] as const;
}
