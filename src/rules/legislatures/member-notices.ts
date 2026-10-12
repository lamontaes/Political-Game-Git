import type {
  EntityId,
  IsoDate,
  SimulationMoment,
  FutureDueItem,
  LegislativeVoteDisposition,
} from "../../simulation/types";
import type { ChamberQuestionForum } from "../../simulation/governing/legislative-clock";
import type { ChamberQuestion } from "../../simulation/governing/member-ballots";
import type { CreateScheduledActivityInput } from "../../simulation/time-work";
import {
  effectiveOwner,
  isSeatedChamber,
  bodiesForMeasure,
  type InstitutionFacts,
  type InstitutionCommand,
} from "./institution-context";
import { measurePosition, availableMeasureSteps } from "./measure-replay";
import { chamberByKey } from "./pack-queries";
import { committeeRosters } from "./committees";
import { addDays } from "../elections/calendar";
import {
  compareSimulationMoments,
  addSimulationMinutes,
  simulationMomentAtLocalTime,
} from "./moments";
export interface MemberNoticeFacts extends InstitutionFacts {
  readonly currentMoment: SimulationMoment;
  readonly dueItems: readonly FutureDueItem[];
  readonly dueStatuses: ReadonlyMap<EntityId, { readonly status: string }>;
  readonly ballots: ReadonlyMap<
    string,
    LegislativeVoteDisposition["disposition"] | null
  >;
  readonly activityStableKeys: ReadonlySet<string>;
  readonly intervals: readonly {
    readonly participantPersonIds: readonly EntityId[];
    readonly status: string;
    readonly start: SimulationMoment;
    readonly end: SimulationMoment;
  }[];
  readonly notices: ReadonlyMap<
    string,
    { readonly title: string; readonly summary: string }
  >;
}
const COMMITTEE_HEARING_TRANSITION_KEY = "legislation:committee-hearing";
function committeeRoster(
  ...[body, committees, key, seed]: [
    Parameters<typeof committeeRosters>[0],
    Parameters<typeof committeeRosters>[1],
    string,
    string,
  ]
) {
  return committeeRosters(body, committees, seed).get(key) ?? [];
}
export function chamberQuestionKey(question: ChamberQuestion): string {
  return [
    question.measureId,
    question.purpose,
    question.forumKey ?? "-",
    question.floorStageKey ?? "-",
  ].join(":");
}
export function pendingChamberQuestions(
  facts: MemberNoticeFacts,
  measureId: EntityId,
  onDate: IsoDate = facts.onDate,
): readonly ChamberQuestionForum[] {
  const measure = facts.measure;
  if (measure.originChamberKey === "council") return [];
  const owner = effectiveOwner(facts, measure);
  if (owner !== "institution" && owner !== "sponsor-office") return [];
  const blueprint = facts.blueprint;
  if (!isSeatedChamber(facts, blueprint)) return [];
  const pack = blueprint.pack;
  const position = measurePosition(facts, measureId);
  const steps = availableMeasureSteps(facts, measureId);
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const floorReady =
    steps.includes("move-floor-vote") ||
    (steps.includes("await-next-legislative-day") &&
      position.earliestNextFloorDate !== null &&
      position.earliestNextFloorDate <= onDate);
  if (
    !floorReady &&
    !steps.includes("move-committee-report") &&
    !steps.includes("move-concurrence") &&
    !steps.includes("move-veto-override")
  )
    return [];
  const bodies = bodiesForMeasure(facts, measure, blueprint);
  const body = bodies.find((entry) => entry.chamberKey === chamberKey);
  const hearingBeforeVote = facts.dueItems.some(
    (item) =>
      item.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
      item.entityIds.includes(measureId) &&
      item.dueAt < onDate &&
      facts.dueStatuses.get(item.id)?.status === "scheduled",
  );
  if (
    steps.includes("move-committee-report") &&
    (!steps.includes("request-committee-hearing") || hearingBeforeVote) &&
    body
  ) {
    const committee = chamber.committees.find(
      (entry) => entry.committeeKey === position.committeeKey,
    );
    return committee
      ? [
          {
            question: {
              measureId,
              purpose: "committee-report",
              forumKey: committee.committeeKey,
              floorStageKey: null,
            },
            forumName: committee.name,
            members: committeeRoster(
              body,
              chamber.committees,
              committee.committeeKey,
              `${pack.packId}:${chamberKey}`,
            ),
          },
        ]
      : [];
  }
  if (floorReady && body && position.floorStageKey)
    return [
      {
        question: {
          measureId,
          purpose: "floor-stage",
          forumKey: chamberKey,
          floorStageKey: position.floorStageKey,
        },
        forumName: chamber.name,
        members: body.members,
      },
    ];
  if (steps.includes("move-concurrence") && body)
    return [
      {
        question: {
          measureId,
          purpose: "concurrence",
          forumKey: chamberKey,
          floorStageKey: null,
        },
        forumName: chamber.name,
        members: body.members,
      },
    ];
  if (steps.includes("move-veto-override")) {
    const override = pack.executive.override;
    if (override.kind === "not-applicable") return [];
    if (override.kind === "joint-session")
      return [
        {
          question: {
            measureId,
            purpose: "veto-override",
            forumKey: "joint",
            floorStageKey: null,
          },
          forumName: "the joint session",
          members: bodies.flatMap((entry) => entry.members),
        },
      ];
    return pack.chamberOrder.flatMap((forumKey) => {
      const forumBody = bodies.find((entry) => entry.chamberKey === forumKey);
      return forumBody
        ? [
            {
              question: {
                measureId,
                purpose: "veto-override" as const,
                forumKey,
                floorStageKey: null,
              },
              forumName: chamberByKey(pack, forumKey).name,
              members: forumBody.members,
            },
          ]
        : [];
    });
  }
  return [];
}
const MEMBER_VOTE_NOTICE_MINUTE = 16 * 60;
const MEMBER_VOTE_NOTICE_MINUTES = 60;
const MEMBER_VOTE_NOTICE_SOON = 30;
export function noticeMemberVote(
  facts: MemberNoticeFacts,
  measureId: EntityId,
  voteOn: IsoDate,
): readonly InstitutionCommand[] {
  if (facts.playerPersonId === null) return [];
  const personId = facts.playerPersonId,
    commands: InstitutionCommand[] = [];
  const intervals = [...facts.intervals];
  const stableKeys = new Set(facts.activityStableKeys);
  for (const forum of pendingChamberQuestions(facts, measureId, voteOn)) {
    if (!forum.members.some((member) => member.personId === personId)) continue;
    const stableKey = `legislative-clock/v1:member-vote:${chamberQuestionKey(forum.question)}:${personId}`;
    if (
      (facts.ballots.get(chamberQuestionKey(forum.question)) ?? null) !==
        null ||
      stableKeys.has(stableKey)
    )
      continue;
    const dayBefore = simulationMomentAtLocalTime({
      date: addDays(voteOn, -1) as IsoDate,
      minuteOfDay: MEMBER_VOTE_NOTICE_MINUTE,
      timeZone: facts.currentMoment.timeZone,
      preferredUtcOffsetMinutes: facts.currentMoment.utcOffsetMinutes,
    });
    const start =
      compareSimulationMoments(dayBefore, facts.currentMoment) > 0
        ? dayBefore
        : voteOn > facts.onDate
          ? addSimulationMinutes(facts.currentMoment, MEMBER_VOTE_NOTICE_SOON)
          : null;
    if (!start) continue;
    let noticeStart = start;
    while (noticeStart.date < voteOn) {
      const noticeEnd = addSimulationMinutes(
        noticeStart,
        MEMBER_VOTE_NOTICE_MINUTES,
      );
      const endsBeforeVoteDay =
        noticeEnd.date < voteOn ||
        (noticeEnd.date === voteOn && noticeEnd.minuteOfDay === 0);
      const conflict = intervals.some(
        (row) =>
          row.status === "scheduled" &&
          row.participantPersonIds.includes(personId) &&
          compareSimulationMoments(noticeStart, row.end) < 0 &&
          compareSimulationMoments(row.start, noticeEnd) < 0,
      );
      if (endsBeforeVoteDay && !conflict) break;
      noticeStart = addSimulationMinutes(
        noticeStart,
        MEMBER_VOTE_NOTICE_MINUTES,
      );
    }
    if (noticeStart.date >= voteOn) continue;
    const text = facts.notices.get(chamberQuestionKey(forum.question))!;
    const input: CreateScheduledActivityInput = {
      stableKey,
      title: text.title,
      summary: text.summary,
      kind: "confirmed",
      start: noticeStart,
      end: addSimulationMinutes(noticeStart, MEMBER_VOTE_NOTICE_MINUTES),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        jurisdictionId: facts.measure.jurisdictionId,
        label: forum.forumName,
        locationKey: "legislature:deciding-a-ballot",
      },
      sourceEntityIds: [measureId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    };
    commands.push({ command: "createScheduledActivity", input });
    stableKeys.add(stableKey);
    intervals.push({ ...input, status: "scheduled" });
  }
  return commands;
}

// stopgapId: "SG-P14-legislatures-member-notice-clock"
