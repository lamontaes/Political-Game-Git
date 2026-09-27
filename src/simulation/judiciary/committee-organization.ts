/** Saved fictional Senate organization for the Judiciary nomination route. */

import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { simulationMomentAtLocalTime } from "../dates";
import { committeeRoster } from "../governing/committee-assignment";
import { seatedCongressChamber } from "../governing/congress-chambers";
import type { SeatedMember } from "../legislation-scenarios";
import { congressSeats, seatTermWindow } from "../living-world/congress-seats";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import { SeededRng } from "../rng";
import {
  advanceWorldMinutes,
  createScheduledActivity,
  performScheduledActivity,
  scheduledConflictExists,
} from "../time-work";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";

export const SENATE_JUDICIARY_SLATE_EVENT = "judicial.senate-judiciary-slate";
export const SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT =
  "judicial.senate-judiciary-organization-vote";
export const SENATE_JUDICIARY_ORGANIZATION_SITTING_EVENT =
  "judicial.senate-judiciary-organization-sitting";
export const SENATE_JUDICIARY_APPOINTMENT_EVENT =
  "judicial.senate-judiciary-appointment";
export const SENATE_JUDICIARY_ORGANIZATION_PROFILE =
  "judiciary-senate-organization-placeholder/v1";
export const SENATE_JUDICIARY_PLAYER_CHOICE_EVENT =
  "judicial.senate-judiciary-player-choice";

export interface SenateOrganizationPlayerChoice {
  readonly attendance: "attend" | "absent";
  readonly ballot: "approve" | "reject" | "present" | null;
}

export interface SenateJudiciaryAppointment {
  readonly eventId: EntityId;
  readonly congressStartedAt: IsoDate;
  readonly chairPersonId: EntityId;
  readonly memberPersonIds: readonly EntityId[];
}

function congressStartedAt(world: World): IsoDate {
  const houseSeat = congressSeats().find(
    (seat) => seat.chamberKey === "us-house",
  );
  if (!houseSeat) throw new Error("The Congress has no House term calendar.");
  return seatTermWindow(houseSeat, world.currentDate).startsAt;
}

function judiciaryMembers(world: World) {
  const senate = seatedCongressChamber(world, "senate");
  const committee = US_CONGRESS_RULE_PACK.chambers
    .find((chamber) => chamber.chamberKey === "senate")
    ?.committees.find((candidate) => candidate.committeeKey === "judiciary");
  if (!senate?.body.members.length || !committee) return null;
  const proposed = committeeRoster(
    senate.body,
    US_CONGRESS_RULE_PACK.chambers.find(
      (chamber) => chamber.chamberKey === "senate",
    )!.committees,
    "judiciary",
    "us-congress-v1:senate",
  );
  if (
    proposed.length !== committee.appointedMembers ||
    proposed.some((member) => member.personId === null)
  )
    return null;
  return { senate, proposed };
}

/** A resolution is current only for this Congress and its still-seated chair/members. */
export function senateJudiciaryAppointment(
  world: World,
): SenateJudiciaryAppointment | null {
  const term = congressStartedAt(world);
  const event = [...world.history.events]
    .reverse()
    .find(
      (candidate) =>
        candidate.type === SENATE_JUDICIARY_APPOINTMENT_EVENT &&
        candidate.tags.includes(`congress-start:${term}`),
    );
  if (!event) return null;
  const chairPersonId = event.tags
    .find((tag) => tag.startsWith("chair:"))
    ?.slice("chair:".length) as EntityId | undefined;
  const memberPersonIds = event.tags
    .filter((tag) => tag.startsWith("member:"))
    .map((tag) => tag.slice("member:".length) as EntityId);
  const voteId = event.tags
    .find((tag) => tag.startsWith("vote:"))
    ?.slice("vote:".length);
  const slateId = event.tags
    .find((tag) => tag.startsWith("slate:"))
    ?.slice("slate:".length);
  const vote = world.history.events.find(
    (candidate) => candidate.id === voteId,
  );
  const sittingId = vote?.tags
    .find((tag) => tag.startsWith("sitting:"))
    ?.slice("sitting:".length);
  const sitting = world.history.events.find(
    (candidate) => candidate.id === sittingId,
  );
  const slate = world.history.events.find(
    (candidate) => candidate.id === slateId,
  );
  const senate = seatedCongressChamber(world, "senate");
  const seated = new Set(
    senate?.body.members.map((member) => member.personId) ?? [],
  );
  const attendeeIds =
    sitting?.tags
      .filter((tag) => tag.startsWith("attendee:"))
      .map((tag) => tag.slice("attendee:".length)) ?? [];
  const count = (key: string) =>
    Number(
      vote?.tags
        .find((tag) => tag.startsWith(`${key}:`))
        ?.slice(key.length + 1),
    );
  const yea = count("yea");
  const nay = count("nay");
  const present = count("present");
  const absent = count("absent");
  if (
    !senate ||
    !chairPersonId ||
    !seated.has(chairPersonId) ||
    memberPersonIds.length === 0 ||
    new Set(memberPersonIds).size !== memberPersonIds.length ||
    !memberPersonIds.includes(chairPersonId) ||
    memberPersonIds.some((id) => !seated.has(id)) ||
    vote?.type !== SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT ||
    !vote.tags.includes(`congress-start:${term}`) ||
    !vote.tags.includes("result:adopted") ||
    !vote.tags.includes(`slate:${slateId}`) ||
    sitting?.type !== SENATE_JUDICIARY_ORGANIZATION_SITTING_EVENT ||
    !sitting.tags.includes(`congress-start:${term}`) ||
    !sitting.tags.includes(`slate:${slateId}`) ||
    attendeeIds.length !== new Set(attendeeIds).size ||
    attendeeIds.some((id) => !seated.has(id as EntityId)) ||
    ![yea, nay, present, absent].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    yea + nay + present !== attendeeIds.length ||
    absent + attendeeIds.length !== senate.body.members.length ||
    attendeeIds.length <= senate.seats / 2 ||
    yea <= nay ||
    slate?.type !== SENATE_JUDICIARY_SLATE_EVENT ||
    !slate.tags.includes(`congress-start:${term}`) ||
    !slate.tags.includes(`chair:${chairPersonId}`) ||
    memberPersonIds.some((id) => !slate.tags.includes(`member:${id}`)) ||
    slate.occurredAt > sitting.occurredAt ||
    sitting.occurredAt > vote.occurredAt ||
    vote.occurredAt > event.occurredAt
  )
    return null;
  return {
    eventId: event.id,
    congressStartedAt: term,
    chairPersonId,
    memberPersonIds,
  };
}

/**
 * PLACEHOLDER(overnight): a seeded slate recommendation, followed by real
 * actor-owned Senate ballots. The seeded roster is eligibility, not authority.
 * No controlled Senator is ever given an NPC ballot.
 */
export function organizeSenateJudiciary(
  world: World,
  playerChoice?: SenateOrganizationPlayerChoice,
  playerAttendanceEventId: EntityId | null = null,
): World {
  if (senateJudiciaryAppointment(world)) return world;
  const term = congressStartedAt(world);
  if (
    world.history.events.some(
      (event) =>
        event.type === SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT &&
        event.tags.includes(`congress-start:${term}`),
    )
  )
    return world;
  const members = judiciaryMembers(world);
  if (!members)
    throw new Error("A seated Senate Judiciary slate is unavailable.");
  const { senate, proposed } = members;
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const controlledSenator = senate.body.members.find(
    (member) => member.personId === controlledPersonId,
  );
  if (controlledSenator && !playerChoice)
    throw new Error(
      "The controlled Senator must cast their own organization ballot.",
    );
  if (!controlledSenator && playerChoice)
    throw new Error(
      "Only the controlled Senator can make this organization choice.",
    );
  if (
    playerChoice &&
    ((playerChoice.attendance === "attend" && !playerChoice.ballot) ||
      (playerChoice.attendance === "absent" && playerChoice.ballot !== null))
  )
    throw new Error(
      "An organization ballot requires the player's actual attendance.",
    );

  const partyCounts = new Map<string, number>();
  for (const member of senate.body.members) {
    if (member.partyKey)
      partyCounts.set(
        member.partyKey,
        (partyCounts.get(member.partyKey) ?? 0) + 1,
      );
  }
  const rankedParties = [...partyCounts].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  if (
    !rankedParties[0] ||
    rankedParties[0][1] <= senate.body.members.length / 2
  )
    throw new Error("No recorded Senate majority can recommend a chair.");
  const majorityParty = rankedParties[0][0];
  const chairCandidates = proposed.filter(
    (member) => member.partyKey === majorityParty && member.personId !== null,
  );
  if (chairCandidates.length === 0)
    throw new Error(
      "The eligible Judiciary slate has no majority-party chair candidate.",
    );
  const rng = new SeededRng(
    `${world.seed}:${SENATE_JUDICIARY_ORGANIZATION_PROFILE}:${term}`,
  );
  const chair = chairCandidates[rng.integer(0, chairCandidates.length)]!;
  const chairPersonId = chair.personId!;
  const proposedIds = proposed.map((member) => member.personId!);
  let next = recordWorldEvent(world, {
    stableKey: `senate-judiciary-slate:${term}`,
    type: SENATE_JUDICIARY_SLATE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      chairPersonId,
      ...proposedIds.filter((id) => id !== chairPersonId),
    ],
    participants: [
      {
        personId: chairPersonId,
        role: "focus:subject",
        detail: "Proposed Judiciary chair",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `congress-start:${term}`,
      `profile:${SENATE_JUDICIARY_ORGANIZATION_PROFILE}`,
      `chair:${chairPersonId}`,
      ...proposedIds.map((id) => `member:${id}`),
    ],
    summary: `A fictional Senate party-conference profile recommended ${personName(nextPerson(world, chairPersonId))} and an eligible Judiciary slate for Senate approval.`,
    context: {
      location: null,
      socialContext: "Senate Judiciary Committee slate recommendation",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const slateEventId = next.history.events.at(-1)!.id;
  const meetingTime = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date: next.currentDate,
      minuteOfDay,
      timeZone: next.currentMoment.timeZone,
      preferredUtcOffsetMinutes: next.currentMoment.utcOffsetMinutes,
    });
  const meetingStart = meetingTime(10 * 60);
  const meetingEnd = meetingTime(11 * 60);
  if (controlledSenator && playerChoice) {
    const completion = world.history.events.find(
      (event) => event.id === playerAttendanceEventId,
    );
    const activity = world.history.scheduledActivities.find(
      (candidate) =>
        completion?.involvedEntityIds.includes(candidate.id) &&
        candidate.stableKey ===
          `senate-judiciary-organization:${term}:controlled-attendance` &&
        candidate.participantPersonIds.includes(controlledSenator.personId!),
    );
    if (
      (playerChoice.attendance === "attend" &&
        (!completion ||
          completion.type !== "schedule.activity-completed" ||
          completion.occurredAt !== world.currentDate ||
          !completion.participants.some(
            (participant) =>
              participant.personId === controlledSenator.personId &&
              participant.role === "presence:participant",
          ) ||
          !activity ||
          !activity.sourceEntityIds.some((id) =>
            world.history.events.some(
              (event) =>
                event.id === id && event.type === "judicial.senate-referral",
            ),
          ))) ||
      (playerChoice.attendance === "absent" && playerAttendanceEventId !== null)
    )
      throw new Error(
        "The controlled Senator has no performed organization attendance basis.",
      );
    if (
      playerChoice.attendance === "attend" &&
      scheduledConflictExists(
        next,
        [controlledSenator.personId!],
        meetingStart,
        meetingEnd,
      )
    )
      throw new Error("A saved commitment prevents this Senator's attendance.");
    next = recordWorldEvent(next, {
      stableKey: `senate-judiciary-player-choice:${term}:${controlledSenator.personId}`,
      type: SENATE_JUDICIARY_PLAYER_CHOICE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [controlledSenator.personId!],
      participants: [
        {
          personId: controlledSenator.personId!,
          role: "focus:actor",
          detail: "Controlled Senator",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `congress-start:${term}`,
        `slate:${slateEventId}`,
        `attendance:${playerChoice.attendance}`,
        `ballot:${playerChoice.ballot ?? "none"}`,
        ...(playerAttendanceEventId
          ? [`completion:${playerAttendanceEventId}`]
          : []),
      ],
      summary: `${personName(nextPerson(next, controlledSenator.personId!))} chose ${playerChoice.attendance === "attend" ? `to attend and vote ${playerChoice.ballot}` : "not to attend"} the Senate Judiciary organization sitting.`,
      context: {
        location: null,
        socialContext: "Player Senator's Judiciary organization choice",
        pressure: null,
        choice: playerChoice.ballot,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  const attending: SeatedMember[] = [];
  let absent = 0;
  for (const member of senate.body.members) {
    if (!member.personId) continue;
    if (member.personId === controlledPersonId && playerChoice) {
      if (playerChoice.attendance === "attend") attending.push(member);
      else absent += 1;
      continue;
    }
    const conflict = scheduledConflictExists(
      next,
      [member.personId],
      meetingStart,
      meetingEnd,
    );
    const attendance = evaluateDecision(next, {
      stableKey: `senate-judiciary-organization:${term}:${member.personId}:attendance`,
      decisionType: "judiciary.senate-organization-attendance",
      actorPersonId: member.personId!,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:government",
        key: `senate-judiciary-organization:${term}`,
        entityId: null,
      },
      options: [
        {
          key: "attend",
          label: "Attend",
          description: "Attend the Senate organization vote.",
        },
        {
          key: "absent",
          label: "Absent",
          description: "Do not attend the Senate organization vote.",
        },
      ],
      constraints: conflict
        ? [
            {
              stableKey: `senate-judiciary-organization:${term}:${member.personId}:calendar-conflict`,
              optionKey: "attend",
              kind: "calendar-conflict",
              explanation:
                "A saved activity overlaps the organization sitting.",
              sourceRefs: [],
            },
          ]
        : [],
      considerations: [
        {
          stableKey: `senate-judiciary-organization:${term}:${member.personId}:attendance-duty`,
          optionKey: "attend",
          sourceType: "context:government",
          direction: "supports",
          importance: "slight",
          confidence: "low",
          explanation:
            "PLACEHOLDER: a seated Senator has an organizational vote to attend.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, attendance);
    if (attendance.selectedOptionKey === "attend") attending.push(member);
    else absent += 1;
  }
  const attendeeIds = attending.map((member) => member.personId!);
  next = recordWorldEvent(next, {
    stableKey: `senate-judiciary-organization-sitting:${term}`,
    type: SENATE_JUDICIARY_ORGANIZATION_SITTING_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: attendeeIds.length > 0 ? attendeeIds : [next.id],
    participants: attendeeIds.map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: "Senator at the organization sitting",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `congress-start:${term}`,
      `slate:${slateEventId}`,
      ...attendeeIds.map((id) => `attendee:${id}`),
      `absent:${absent}`,
    ],
    summary: `${attendeeIds.length} Senators attended the fictional Judiciary organization sitting; ${absent} were absent.`,
    context: {
      location: null,
      socialContext: "Senate Judiciary organization sitting",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const sittingEventId = next.history.events.at(-1)!.id;
  let yea = 0;
  let nay = 0;
  let present = 0;
  for (const member of attending) {
    if (member.personId === controlledPersonId && playerChoice) {
      if (playerChoice.ballot === "approve") yea += 1;
      else if (playerChoice.ballot === "reject") nay += 1;
      else present += 1;
      continue;
    }
    const sameParty = member.partyKey === majorityParty;
    const evaluation = evaluateDecision(next, {
      stableKey: `senate-judiciary-organization:${term}:${member.personId}`,
      decisionType: "judiciary.senate-committee-organization-ballot",
      actorPersonId: member.personId!,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:government",
        key: `senate-judiciary-organization:${term}`,
        entityId: null,
      },
      options: [
        {
          key: "approve",
          label: "Approve",
          description: "Appoint the recommended Judiciary slate.",
        },
        {
          key: "reject",
          label: "Reject",
          description: "Reject the recommended Judiciary slate.",
        },
        {
          key: "present",
          label: "Present",
          description: "Withhold a vote on the Judiciary slate.",
        },
      ],
      constraints: [],
      considerations: sameParty
        ? [
            {
              stableKey: `senate-judiciary-organization:${term}:${member.personId}:conference`,
              optionKey: "approve",
              sourceType: "context:government",
              direction: "supports",
              importance: "slight",
              confidence: "medium",
              explanation:
                "PLACEHOLDER: this member's conference recommended the organizational slate.",
              sourceRefs: [],
            },
          ]
        : [],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    if (evaluation.selectedOptionKey === "approve") yea += 1;
    else if (evaluation.selectedOptionKey === "reject") nay += 1;
    else present += 1;
  }
  const passed = yea + nay + present > senate.seats / 2 && yea > nay;
  next = recordWorldEvent(next, {
    stableKey: `senate-judiciary-organization-vote:${term}`,
    type: SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [chairPersonId],
    participants: [
      {
        personId: chairPersonId,
        role: "focus:subject",
        detail: "Proposed Judiciary chair",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `congress-start:${term}`,
      `slate:${slateEventId}`,
      `sitting:${sittingEventId}`,
      `yea:${yea}`,
      `nay:${nay}`,
      `present:${present}`,
      `absent:${absent}`,
      `result:${passed ? "adopted" : "rejected"}`,
    ],
    summary: `The Senate voted ${yea}–${nay} on its fictional Judiciary organization resolution; ${present} answered present and ${absent} were absent. The resolution ${passed ? "passed" : "failed"}.`,
    context: {
      location: null,
      socialContext: "Senate Judiciary Committee organization vote",
      pressure: null,
      choice: passed ? "adopted" : "rejected",
      motivation: null,
      immediateReaction: null,
    },
  });
  if (!passed) return next;
  const voteEventId = next.history.events.at(-1)!.id;
  return recordWorldEvent(next, {
    stableKey: `senate-judiciary-appointment:${term}`,
    type: SENATE_JUDICIARY_APPOINTMENT_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      chairPersonId,
      ...proposedIds.filter((id) => id !== chairPersonId),
    ],
    participants: [
      {
        personId: chairPersonId,
        role: "focus:subject",
        detail: "Appointed Judiciary chair",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `congress-start:${term}`,
      `slate:${slateEventId}`,
      `vote:${voteEventId}`,
      `chair:${chairPersonId}`,
      ...proposedIds.map((id) => `member:${id}`),
    ],
    summary: `By recorded Senate resolution, ${personName(nextPerson(next, chairPersonId))} became Judiciary chair with the approved committee members.`,
    context: {
      location: null,
      socialContext: "Senate appointment of Judiciary Committee",
      pressure: null,
      choice: "appointed",
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** A controlled Senator spends ordinary time and supplies the missing choice. */
export function recordControlledSenateJudiciaryOrganizationChoice(
  world: World,
  choice: SenateOrganizationPlayerChoice,
  organizationDueItemId: EntityId,
): World {
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (
    !controlledPersonId ||
    !seatedCongressChamber(world, "senate")?.body.members.some(
      (member) => member.personId === controlledPersonId,
    )
  )
    throw new Error("Only a controlled seated Senator can choose this ballot.");
  if (senateJudiciaryAppointment(world))
    throw new Error(
      "The Senate has already appointed Judiciary for this Congress.",
    );
  const due = world.history.futureDueItems.find(
    (item) => item.id === organizationDueItemId,
  );
  if (
    due?.transitionKey !== "judiciary:committee-consideration" ||
    due.dueAt > world.currentDate
  )
    throw new Error("The Senate Judiciary organization sitting is not due.");
  const referralEventId =
    due.provenance.kind === "simulated"
      ? due.provenance.sourceEntityIds.find((id) =>
          world.history.events.some(
            (event) =>
              event.id === id && event.type === "judicial.senate-referral",
          ),
        )
      : null;
  if (!referralEventId)
    throw new Error("The Senate Judiciary referral record is unavailable.");
  if (choice.attendance === "absent") {
    const spent = advanceWorldMinutes(world, 5);
    if (spent === world)
      throw new Error("A scheduled commitment blocks this Senate action.");
    return organizeSenateJudiciary(spent, choice);
  }
  if (world.currentMoment.minuteOfDay > 10 * 60)
    throw new Error("The Senate Judiciary organization sitting has passed.");
  const meetingTime = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date: world.currentDate,
      minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  const start = meetingTime(10 * 60);
  const end = meetingTime(11 * 60);
  if (scheduledConflictExists(world, [controlledPersonId], start, end))
    throw new Error("A saved commitment prevents this Senator's attendance.");
  let next = createScheduledActivity(world, {
    stableKey: `senate-judiciary-organization:${congressStartedAt(world)}:controlled-attendance`,
    title: "Senate Judiciary organization sitting",
    summary: "Attend the Senate sitting to appoint Judiciary members.",
    kind: "confirmed",
    start,
    end,
    participantPersonIds: [controlledPersonId],
    responsiblePersonId: controlledPersonId,
    location: {
      locationKey: "senate-chamber",
      label: "Senate chamber",
      jurisdictionId: null,
    },
    sourceEntityIds: [referralEventId],
    flexibility: { kind: "fixed" },
    access: { kind: "office" },
  });
  const activityId = next.history.scheduledActivities.at(-1)!.id;
  next = performScheduledActivity(next, activityId);
  const completion = [...next.history.events]
    .reverse()
    .find(
      (event) =>
        event.type === "schedule.activity-completed" &&
        event.involvedEntityIds.includes(activityId) &&
        event.participants.some(
          (participant) =>
            participant.personId === controlledPersonId &&
            participant.role === "presence:participant",
        ),
    );
  if (!completion)
    throw new Error(
      "The controlled Senator has no performed organization attendance basis.",
    );
  return organizeSenateJudiciary(next, choice, completion.id);
}

function nextPerson(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error("A Judiciary appointee must be a saved person.");
  return person;
}
