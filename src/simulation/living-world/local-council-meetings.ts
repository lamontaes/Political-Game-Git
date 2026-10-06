import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import { applyInstitutionStep } from "../governing/legislative-clock";
import { offerPlannedAmendment } from "../governing/amendment-authors";
import {
  amendmentAdmissible,
  floorStageTakesAmendments,
} from "../governing/chamber-procedure";
import { councilBallotPartisanship } from "../governing/body-partisanship";
import { publicPartyOf } from "../governing/chamber-votes";
import { personName } from "../people";
import { lawInterestMeasure } from "../official-view-reads";
import { peopleKnownTo } from "./official-views";
import { livedOutcomesOf } from "./lived-outcomes";
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
  measureAmendments,
  measurePosition,
  placeMeasureOnCalendar,
} from "../legislation";
import { measureAnswersAt } from "../vote-bundle";
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
 * on the shared game timetable, which is not any town's sourced schedule.
 */

export const LOCAL_COUNCIL_MEETINGS_VERSION = "local-council-meetings/v1";
const V = LOCAL_COUNCIL_MEETINGS_VERSION;

export const LOCAL_COUNCIL_MEETING = "civic:local-council-meeting" as const;

export type CouncilMeetingMatterReason =
  | { readonly kind: "player-sponsored"; readonly recordId: EntityId }
  | { readonly kind: "player-amended"; readonly recordId: EntityId }
  | {
      readonly kind: "player-stand";
      readonly recordId: EntityId;
      readonly propositionId: EntityId;
    }
  | {
      readonly kind: "player-recorded-view";
      readonly recordId: EntityId;
      readonly propositionId: EntityId;
    }
  | {
      readonly kind: "known-person-contact";
      readonly recordId: EntityId;
      readonly personId: EntityId;
      readonly sourceKind: CouncilContactReasonSourceKind | "agenda-item";
      readonly sourceRecordId: EntityId;
    }
  | {
      readonly kind: "member-public-opposition";
      readonly recordId: EntityId;
      readonly personId: EntityId;
      readonly propositionId: EntityId;
    }
  | {
      readonly kind: "known-person-effect";
      readonly recordId: EntityId;
      readonly personId: EntityId;
      readonly propositionId: EntityId;
    };

export interface CouncilMeetingMatter {
  readonly measureId: EntityId;
  readonly reasons: readonly CouncilMeetingMatterReason[];
}

export type CouncilContactReasonSourceKind =
  | "law-exposure"
  | "lived-outcome"
  | "legislative-vote"
  | "official-view"
  | "official"
  | "law-interest-group";

export interface CouncilContactReasonSource {
  readonly kind: CouncilContactReasonSourceKind;
  readonly sourceRecordId: EntityId;
  /** Null when the linked record does not itself identify a measure. */
  readonly measureId: EntityId | null;
}

/**
 * Read optional B06 reason references attached to a civic contact's existing
 * entity links. Missing references produce no topic. This does not reconstruct
 * a reason from the resident, contacted official, or a public policy stance.
 */
export function councilContactReasonSources(
  world: World,
  contact: World["history"]["events"][number],
): readonly CouncilContactReasonSource[] {
  if (contact.type !== "life.contacted-official") return [];
  const references = new Set(contact.involvedEntityIds);
  const sources: CouncilContactReasonSource[] = [];
  const push = (source: CouncilContactReasonSource) => {
    if (
      !sources.some(
        (row) =>
          row.kind === source.kind &&
          row.sourceRecordId === source.sourceRecordId,
      )
    )
      sources.push(source);
  };
  for (const exposure of world.history.lawExposures ?? [])
    if (references.has(exposure.id))
      push({
        kind: "law-exposure",
        sourceRecordId: exposure.id,
        measureId: exposure.measureId,
      });
  for (const vote of world.history.legislativeVotes ?? [])
    if (references.has(vote.id))
      push({
        kind: "legislative-vote",
        sourceRecordId: vote.id,
        measureId: vote.measureId,
      });
  for (const view of world.history.officialViews ?? [])
    if (references.has(view.id))
      push({
        kind: "official-view",
        sourceRecordId: view.id,
        measureId: view.measureId,
      });
  for (const belief of world.history.privateBeliefs)
    if (references.has(belief.id) && belief.subject?.kind === "official")
      push({
        kind: "official",
        sourceRecordId: belief.id,
        measureId: null,
      });
  for (const organization of world.history.organizations)
    if (references.has(organization.id)) {
      const measureId = lawInterestMeasure(world, organization.id);
      if (measureId)
        push({
          kind: "law-interest-group",
          sourceRecordId: organization.id,
          measureId,
        });
    }
  const residentId = contact.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (residentId)
    for (const outcome of livedOutcomesOf(
      world,
      residentId,
      contact.occurredAt,
    ))
      if (references.has(outcome.sourceRecordId))
        push({
          kind: "lived-outcome",
          sourceRecordId: outcome.sourceRecordId,
          measureId: null,
        });
  return sources;
}

/**
 * Read the recorded matters scheduled for this council meeting and explain
 * why each one matters to the player or someone they know. This is a record
 * reader: it assigns no importance score and writes no vote or event.
 */
export function meetingItemsThatMatter(
  world: World,
  playerId: EntityId,
  meetingDueItemId: EntityId,
): readonly CouncilMeetingMatter[] {
  const due = world.history.futureDueItems.find(
    (item) => item.id === meetingDueItemId,
  );
  if (
    !due ||
    due.transitionKey !== LOCAL_COUNCIL_MEETING ||
    !due.jurisdictionId ||
    !world.people[playerId]
  )
    return [];
  const match = new RegExp(
    `^${V.replace("/", "\\/")}:((?:gus2025|municipio):[^:]+):(meeting|posted-meeting):`,
  ).exec(due.stableKey);
  const unit = match ? governmentUnit(match[1]!) : null;
  const rules = unit ? councilRules(unit) : null;
  if (!unit || !rules) return [];

  const membersById = new Set(
    members(world, unit).map((seat) => seat.personId),
  );
  const knownPeople = new Set(peopleKnownTo(world, playerId));
  const candidates = councilMeasures(
    world,
    rules,
    lawJurisdiction(world, unit, due.jurisdictionId).jurisdictionId,
  ).filter((measure) => {
    const phase = measurePosition(world, measure.id).phase;
    return (
      (phase === "awaiting-referral" || phase === "on-floor") &&
      (phase !== "on-floor" || measure.introducedAt < due.dueAt)
    );
  });
  const reasonsByMeasure = new Map(
    candidates.map((measure) => [
      measure.id,
      [] as CouncilMeetingMatterReason[],
    ]),
  );
  const measuresByQuestion = new Map<EntityId, Map<EntityId, "yes" | "no">>();
  const add = (measureId: EntityId, reason: CouncilMeetingMatterReason) =>
    reasonsByMeasure.get(measureId)?.push(reason);
  for (const measure of candidates) {
    if (measure.sponsorPersonId === playerId)
      add(measure.id, { kind: "player-sponsored", recordId: measure.id });
    for (const amendment of measureAmendments(world, measure.id))
      if (amendment.offeredByPersonId === playerId)
        add(measure.id, { kind: "player-amended", recordId: amendment.id });
    for (const answer of measureAnswersAt(world, measure.id)) {
      const answerByMeasure =
        measuresByQuestion.get(answer.propositionId) ??
        new Map<EntityId, "yes" | "no">();
      answerByMeasure.set(measure.id, answer.answer);
      measuresByQuestion.set(answer.propositionId, answerByMeasure);
    }
  }

  const currentCommitments = world.history.campaignCommitments.filter(
    (record) => record.madeAt <= due.dueAt,
  );
  const supersededCommitments = new Set(
    currentCommitments.flatMap((record) =>
      record.supersedesCommitmentId ? [record.supersedesCommitmentId] : [],
    ),
  );
  for (const commitment of currentCommitments)
    if (
      commitment.personId === playerId &&
      !supersededCommitments.has(commitment.id)
    )
      for (const measureId of measuresByQuestion
        .get(commitment.propositionId)
        ?.keys() ?? [])
        add(measureId, {
          kind: "player-stand",
          recordId: commitment.id,
          propositionId: commitment.propositionId,
        });

  const currentBeliefs = world.history.privateBeliefs.filter(
    (record) => record.formedAt <= due.dueAt,
  );
  const supersededBeliefs = new Set(
    currentBeliefs.flatMap((record) =>
      record.supersedesBeliefId ? [record.supersedesBeliefId] : [],
    ),
  );
  for (const belief of currentBeliefs)
    if (
      belief.personId === playerId &&
      belief.propositionId &&
      !supersededBeliefs.has(belief.id) &&
      belief.position !== "uncertain" &&
      belief.position !== "conflicted"
    )
      for (const [measureId, answer] of measuresByQuestion.get(
        belief.propositionId,
      ) ?? [])
        if (
          (belief.position === "oppose" && answer === "yes") ||
          (belief.position === "support" && answer === "no")
        )
          add(measureId, {
            kind: "player-recorded-view",
            recordId: belief.id,
            propositionId: belief.propositionId,
          });

  const measuresById = new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );
  for (const event of world.history.events)
    if (
      event.type === "life.contacted-official" &&
      event.occurredAt <= due.dueAt &&
      event.involvedEntityIds.includes(playerId)
    ) {
      for (const measureId of reasonsByMeasure.keys())
        if (event.involvedEntityIds.includes(measureId))
          for (const personId of knownPeople)
            if (event.involvedEntityIds.includes(personId))
              add(measureId, {
                kind: "known-person-contact",
                recordId: event.id,
                personId,
                sourceKind: "agenda-item",
                sourceRecordId: measureId,
              });
      const contactPeople = event.involvedEntityIds.filter((personId) =>
        knownPeople.has(personId),
      );
      for (const source of councilContactReasonSources(world, event)) {
        if (!source.measureId) continue;
        const sourceMeasure = measuresById.get(source.measureId);
        if (!sourceMeasure) continue;
        const relatedMeasures = new Set<EntityId>();
        if (reasonsByMeasure.has(source.measureId))
          relatedMeasures.add(source.measureId);
        for (const answer of measureAnswersAt(world, source.measureId))
          for (const measureId of measuresByQuestion
            .get(answer.propositionId)
            ?.keys() ?? [])
            relatedMeasures.add(measureId);
        for (const measureId of relatedMeasures)
          for (const personId of contactPeople)
            add(measureId, {
              kind: "known-person-contact",
              recordId: event.id,
              personId,
              sourceKind: source.kind,
              sourceRecordId: source.sourceRecordId,
            });
      }
    }

  const currentPositions = world.history.publicPositions.filter(
    (record) => record.statedAt <= due.dueAt,
  );
  const supersededPositions = new Set(
    currentPositions.flatMap((record) =>
      record.supersedesPublicPositionId
        ? [record.supersedesPublicPositionId]
        : [],
    ),
  );
  for (const position of currentPositions)
    if (
      !supersededPositions.has(position.id) &&
      (position.personId === playerId || position.audience === "public") &&
      (membersById.has(position.personId) || position.personId === playerId)
    )
      for (const [measureId, answer] of measuresByQuestion.get(
        position.propositionId,
      ) ?? [])
        if (
          (position.stance === "oppose" && answer === "yes") ||
          (position.stance === "support" && answer === "no")
        )
          add(
            measureId,
            position.personId === playerId
              ? {
                  kind: "player-recorded-view",
                  recordId: position.id,
                  propositionId: position.propositionId,
                }
              : {
                  kind: "member-public-opposition",
                  recordId: position.id,
                  personId: position.personId,
                  propositionId: position.propositionId,
                },
          );

  const sourceMeasuresById = new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );
  for (const exposure of world.history.lawExposures ?? []) {
    if (!knownPeople.has(exposure.personId) || exposure.recordedAt > due.dueAt)
      continue;
    if (!sourceMeasuresById.has(exposure.measureId)) continue;
    for (const answer of measureAnswersAt(world, exposure.measureId))
      for (const measureId of measuresByQuestion
        .get(answer.propositionId)
        ?.keys() ?? [])
        add(measureId, {
          kind: "known-person-effect",
          recordId: exposure.id,
          personId: exposure.personId,
          propositionId: answer.propositionId,
        });
  }

  return candidates.map((measure) => ({
    measureId: measure.id,
    reasons: reasonsByMeasure.get(measure.id) ?? [],
  }));
}

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
  const rules = councilRules(unit);
  const calendar = rules
    ? (rulePackById(rules.packId).session.sittingCalendar ??
      LEGISLATIVE_SESSION_CALENDARS.council)
    : LEGISLATIVE_SESSION_CALENDARS.council;
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
      note: calendar.note,
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
    if (phase === "on-floor") {
      const position = measurePosition(next, measure.id);
      const pack = rulePackById(rules.packId);
      const chamber = chamberByKey(pack, "council");
      const stage = chamber.floorStages.find(
        (row) => row.stageKey === position.floorStageKey,
      );
      const seats = members(next, unit);
      if (
        stage &&
        seats.length > 0 &&
        seats.every((seat) => next.people[seat.personId]) &&
        (!position.earliestNextFloorDate ||
          position.earliestNextFloorDate <= next.currentDate) &&
        floorStageTakesAmendments(chamber, stage)
      ) {
        next = offerPlannedAmendment(next, {
          measureId: measure.id,
          chamber,
          stage,
          members: seats.map((seat, index) => ({
            memberKey: `council:${index + 1}`,
            personId: seat.personId,
            name: personName(next.people[seat.personId]!),
            caucusLabel: publicPartyOf(next, seat.personId) ?? "No party",
          })),
          stableKey: `${measure.stableKey}:reading:${stage.stageKey}:amendment`,
          nonpartisan: councilBallotPartisanship(unit).nonpartisan,
          admissible: (bill, part) =>
            mayAnswerQuestion(
              next,
              measure.jurisdictionId,
              part.propositionId,
            ) &&
            amendmentAdmissible(next, pack, chamber.chamberKey, bill, part)
              .admissible,
        });
      }
    }
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
 * after the opening on its shared timetable. Unchanged where the town
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
    nextSessionCalendarDate(
      rulePackById(council.rules.packId).session.sittingCalendar ??
        LEGISLATIVE_SESSION_CALENDARS.council,
      world.currentDate,
    ),
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
  const calendar =
    rulePackById(rules.packId).session.sittingCalendar ??
    LEGISLATIVE_SESSION_CALENDARS.council;
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
      note: `${calendar.id}: the posted public meeting is a meeting of ${unit.name}'s council.`,
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
        nextSessionCalendarDate(
          rulePackById(rules.packId).session.sittingCalendar ??
            LEGISLATIVE_SESSION_CALENDARS.council,
          due.dueAt,
        ),
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
      nextSessionCalendarDate(
        rulePackById(rules.packId).session.sittingCalendar ??
          LEGISLATIVE_SESSION_CALENDARS.council,
        due.dueAt,
      ),
    );
  return done(next, `The ${identity.bodyName} met.`);
}

export function localCouncilMeetingHandlers() {
  return [[LOCAL_COUNCIL_MEETING, localCouncilMeetingHandler]] as const;
}
