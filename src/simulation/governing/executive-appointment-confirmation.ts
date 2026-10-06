import { scheduleFutureDueItem } from "../future-transitions";
import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import { createStableId } from "../ids";
import { eventById } from "../event-index";
import { makeIsoDate } from "../dates";
import { executiveProfileForOfficeKey } from "../executive-authority-game-profile";
import {
  legislativeRulePackForWorld,
  regularSessionDateStatus,
} from "../legislative-procedure-world";
import { personName } from "../people";
import { recordWorldEvent } from "../world";
import { createOrganizationParticipation } from "../life";
import { recordAppointmentFavor } from "../patronage/appointments";
import type {
  DecisionConsideration,
  EntityId,
  HistoricalEvent,
  World,
} from "../types";
import type { SeatedMember } from "../legislation-scenarios";
import {
  decideChamberVote,
  publicPartyOf,
  seatedChamberForPack,
} from "./chamber-votes";
import { executiveAppointmentPost } from "./executive-appointment-posts";
import { executiveAppointmentEligibility } from "./executive-appointment-eligibility";
import {
  appointmentTag,
  executiveAppointmentVacancy,
  scheduleExecutiveAppointmentTermExpiry,
} from "./executive-appointments";
import { governingOfficeForPerson } from "./state-governing";
import { relationshipConsiderations } from "./standing-considerations";

export const EXECUTIVE_APPOINTMENT_CONFIRMATION =
  "government:executive-appointment-confirmation" as const;

/** The existing disclosed hearing calendar supplies scheduling, never a legal
 * deadline, actual attendance, or permission to convene a closed legislature. */
export function scheduleExecutiveAppointmentConfirmation(
  world: World,
  nominationEventId: EntityId,
): World {
  const nomination = eventById(world, nominationEventId);
  const postKey = nomination
    ? appointmentTag(nomination, "appointment-post:")
    : null;
  const post = postKey ? executiveAppointmentPost(postKey) : null;
  if (
    !nomination ||
    nomination.type !== "executive.appointment-nominated" ||
    !post ||
    post.confirmation === "none"
  )
    return world;
  const stableKey = `${nomination.stableKey}:confirmation-due`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  const calendar =
    post.colleagueScope === "federal"
      ? LEGISLATIVE_SESSION_CALENDARS.congress
      : LEGISLATIVE_SESSION_CALENDARS.state;
  return scheduleFutureDueItem(world, {
    stableKey,
    transitionKey: EXECUTIVE_APPOINTMENT_CONFIRMATION,
    dueAt: nextSessionCalendarDate(calendar, world.currentDate, "hearing"),
    entityIds: [nomination.id],
    jurisdictionId: nomination.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [nomination.id] },
  });
}

export interface ExecutiveAppointmentConfirmationResult {
  readonly world: World;
  readonly status: "pending" | "refused" | "confirmed" | "rejected";
  readonly reason: string;
  readonly rollCallEventId: EntityId | null;
  readonly tenureEventId: EntityId | null;
}

/** A member weighs the actual appointer's public nomination and their own
 * saved relationship with the nominee. No private qualification is disclosed.
 * Party-cue weights use the existing nomination model's shared scale; they
 * are game assumptions, not a statutory duty to confirm a party colleague. */
function memberReasons(
  world: World,
  member: SeatedMember,
  nomineeId: EntityId,
  appointerId: EntityId,
  nomination: HistoricalEvent,
): readonly DecisionConsideration[] {
  if (!member.personId) return [];
  const reasons = relationshipConsiderations(
    world,
    member.personId,
    nomineeId,
    {
      optionKey: "vote-yea",
      fond: {
        stableKey: "member:nominee:relationship",
        explanation:
          "The member's own recorded relationship supports entrusting this nominee with the post.",
      },
      strain: {
        stableKey: "member:nominee:strain",
        explanation:
          "The member's own recorded relationship weighs against entrusting this nominee with the post.",
      },
    },
  );
  const party = member.partyKey ?? publicPartyOf(world, member.personId);
  const appointerParty = publicPartyOf(world, appointerId);
  if (party && appointerParty)
    reasons.push({
      stableKey: "member:nomination:appointer-party",
      optionKey: party === appointerParty ? "vote-yea" : "vote-nay",
      sourceType: "context:appointer-party",
      direction: "supports",
      importance: "strong",
      confidence: party === appointerParty ? "high" : "medium",
      explanation:
        party === appointerParty
          ? "The nominee is the recorded choice of an executive of the member's own party."
          : "The nominee is the recorded choice of an executive of the other party.",
      sourceRefs: [{ kind: "historical-event", eventId: nomination.id }],
    });
  return reasons;
}

/** Resolves one saved nomination using actual seated bodies. Alaska's joint
 * legislature is one combined roll call, never two separate passage tests.
 * This command does not generate legislators, attendance, a hearing, or facts
 * about the nominee. Scheduling and played hearing content are separate. */
export function confirmExecutiveAppointment(
  world: World,
  nominationEventId: EntityId,
): ExecutiveAppointmentConfirmationResult {
  const result = (
    status: ExecutiveAppointmentConfirmationResult["status"],
    reason: string,
    next = world,
    rollCallEventId: EntityId | null = null,
    tenureEventId: EntityId | null = null,
  ): ExecutiveAppointmentConfirmationResult => ({
    world: next,
    status,
    reason,
    rollCallEventId,
    tenureEventId,
  });
  const nomination = eventById(world, nominationEventId);
  const postKey = nomination
    ? appointmentTag(nomination, "appointment-post:")
    : null;
  const post = postKey ? executiveAppointmentPost(postKey) : null;
  if (
    !nomination ||
    nomination.type !== "executive.appointment-nominated" ||
    nomination.occurredAt > world.currentDate ||
    nomination.recordedAt > world.currentDate ||
    !post
  )
    return result(
      "refused",
      "An actual current executive nomination is required.",
    );
  const prior = world.history.events.find(
    (event) =>
      event.type === "executive.appointment-confirmation" &&
      event.tags.includes(`source-event:${nomination.id}`) &&
      (event.tags.includes("outcome:confirmed") ||
        event.tags.includes("outcome:rejected")),
  );
  if (prior) {
    const tenure = world.history.events.find(
      (event) => event.stableKey === `${nomination.stableKey}:seated`,
    );
    return result(
      tenure
        ? "confirmed"
        : prior.tags.includes("outcome:rejected")
          ? "rejected"
          : "pending",
      "The recorded confirmation result is retained.",
      world,
      prior.id,
      tenure?.id ?? null,
    );
  }
  const vacancyId = appointmentTag(
    nomination,
    "appointment-vacancy:",
  ) as EntityId | null;
  const vacancy = vacancyId
    ? executiveAppointmentVacancy(world, vacancyId)
    : null;
  const appointerId = nomination.participants.find(
    (row) => row.role === "agency:appointer",
  )?.personId;
  const nomineeId = nomination.participants.find(
    (row) => row.role === "agency:nominee",
  )?.personId;
  const traceId = appointmentTag(
    nomination,
    "appointment-decision:",
  ) as EntityId | null;
  const office = appointerId
    ? governingOfficeForPerson(world, appointerId)
    : null;
  if (
    !vacancy ||
    !appointerId ||
    !nomineeId ||
    !traceId ||
    !office ||
    office.officeKey !== post.appointerOfficeKey ||
    office.jurisdictionId !== nomination.jurisdictionId ||
    executiveAppointmentEligibility(
      world,
      post.officeKey,
      nomineeId,
      office.jurisdictionId,
    ) !== "meets"
  )
    return result(
      "refused",
      "The vacancy, current appointer, or nominee's authority eligibility no longer supports this nomination.",
    );
  const profile = executiveProfileForOfficeKey(post.authorityOfficeKey);
  const ref = profile?.pack.presentment.legislativeRulePackId;
  if (ref?.kind !== "known" || post.confirmation === "none")
    return result(
      "pending",
      "The named post's confirming body is not available through the shared rule path.",
    );
  const pack = legislativeRulePackForWorld(world, ref.value);
  const session = regularSessionDateStatus(pack, world.currentDate);
  if (
    session.kind === "outside-regular-session-year" ||
    session.kind === "past-outer-limit"
  )
    return result(
      "pending",
      "The regular legislative session does not authorize a confirmation on this date.",
    );
  const chambers =
    post.confirmation === "joint-legislature"
      ? pack.chambers
      : pack.chambers.filter((chamber) => chamber.chamberKey === "senate");
  if (!chambers.length)
    return result(
      "pending",
      "No confirming chamber is recorded in this rule pack.",
    );
  const seated = chambers.map((chamber) =>
    seatedChamberForPack(world, pack.packId, chamber.chamberKey, chamber.name),
  );
  if (seated.some((body) => !body))
    return result(
      "pending",
      "The actual confirming rosters have not been seated.",
    );
  const members = seated.flatMap((body) => body!.body.members);
  const eligibleMembers = seated.reduce((sum, body) => sum + body!.seats, 0);
  if (
    !eligibleMembers ||
    new Set(members.map((member) => member.memberKey)).size !== members.length
  )
    return result(
      "refused",
      "The saved confirming roster has no valid unique seats.",
    );
  const considerationsByMember = new Map(
    members.map((member) => [
      member.memberKey,
      memberReasons(world, member, nomineeId, appointerId, nomination),
    ]),
  );
  const attemptKey = `${nomination.stableKey}:confirmation:${createStableId("event", JSON.stringify({ date: world.currentDate, eligibleMembers, members, reasons: [...considerationsByMember] }))}`;
  const existingAttempt = world.history.events.find(
    (event) => event.stableKey === attemptKey,
  );
  if (existingAttempt)
    return result(
      "pending",
      "The recorded pending roll call has unchanged reasons and roster.",
      world,
      existingAttempt.id,
    );
  // Decide once over the combined body. A controlled member without an actual
  // ballot remains absent through the existing vote consumer.
  const dispositions = decideChamberVote(world, {
    kind: "nomination",
    nominationKind: "executive-appointment",
    stableKey: attemptKey,
    nominationEventId,
    nomineeId,
    officeKey: post.officeKey,
    postOfficeKey: post.officeKey,
    appointerId,
    jurisdictionId: office.jurisdictionId,
    seatOrdinal: vacancy.seatOrdinal,
    vacancyEventId: vacancy.vacancyEventId,
    incumbentTermEventId: vacancy.incumbentTermEventId,
    appointmentDecisionTraceId: traceId,
    members,
    playerPersonId:
      world.control.kind === "person" ? world.control.personId : null,
    considerationsByMember,
  });
  const yeas = dispositions.filter((row) => row.disposition === "yea").length;
  const nays = dispositions.filter((row) => row.disposition === "nay").length;
  const denominator =
    post.confirmationMajority === "all-members" ? eligibleMembers : yeas + nays;
  const requiredVotes = Math.floor(denominator / 2) + 1;
  const confirmed = yeas >= requiredVotes;
  const pending = yeas + nays === 0;
  let next = recordWorldEvent(world, {
    stableKey: attemptKey,
    type: "executive.appointment-confirmation",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      nomineeId,
      ...dispositions.flatMap((row) => (row.personId ? [row.personId] : [])),
    ],
    participants: [
      { personId: nomineeId, role: "focus:subject", detail: post.title },
      ...dispositions.flatMap((row) =>
        row.personId
          ? [
              {
                personId: row.personId,
                role: "agency:confirmation-vote" as const,
                detail: `${row.memberKey}|${row.disposition}|${row.reason ?? "member:no-reason"}`,
              },
            ]
          : [],
      ),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `appointment-post:${post.officeKey}`,
      `appointment-seat:${vacancy.seatOrdinal}`,
      `source-event:${nomination.id}`,
      `appointment-vacancy:${vacancy.vacancyEventId}`,
      `eligible-members:${eligibleMembers}`,
      `denominator:${denominator}`,
      `required-votes:${requiredVotes}`,
      `yeas:${yeas}`,
      `nays:${nays}`,
      `majority:${post.confirmationMajority}`,
      pending
        ? "outcome:pending"
        : confirmed
          ? "outcome:confirmed"
          : "outcome:rejected",
      "vote-reasons:game-profile",
    ],
    summary: pending
      ? `No yes or no vote was recorded on ${personName(world.people[nomineeId]!)}; confirmation remains pending.`
      : `The confirming body ${confirmed ? "confirmed" : "rejected"} ${personName(world.people[nomineeId]!)} for ${post.title}, with ${yeas} yes votes; ${requiredVotes} were required.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const rollCall = next.history.events.at(-1)!;
  if (!confirmed)
    return result(
      pending ? "pending" : "rejected",
      "The recorded roll call did not confirm the nominee.",
      next,
      rollCall.id,
    );
  // One domain seating writer; no favor or employment is written at nomination.
  next = seatConfirmedExecutiveAppointment(next, nomination.id, rollCall.id);
  const tenure = next.history.events.find(
    (event) => event.stableKey === `${nomination.stableKey}:seated`,
  );
  return result(
    tenure ? "confirmed" : "pending",
    tenure
      ? "The confirmed nominee took the saved post."
      : "The confirmed nomination awaits a supported term and seating record.",
    next,
    rollCall.id,
    tenure?.id ?? null,
  );
}

function seatConfirmedExecutiveAppointment(
  world: World,
  nominationEventId: EntityId,
  rollCallEventId: EntityId,
): World {
  const nomination = eventById(world, nominationEventId)!;
  const rollCall = eventById(world, rollCallEventId)!;
  if (
    !rollCall.tags.includes("outcome:confirmed") ||
    !rollCall.tags.includes(`source-event:${nomination.id}`)
  )
    return world;
  const post = executiveAppointmentPost(
    appointmentTag(nomination, "appointment-post:")!,
  )!;
  const vacancy = executiveAppointmentVacancy(
    world,
    appointmentTag(nomination, "appointment-vacancy:") as EntityId,
  )!;
  const formerTerm = eventById(world, vacancy.incumbentTermEventId)!;
  const nomineeId = nomination.participants.find(
    (row) => row.role === "agency:nominee",
  )!.personId;
  const appointerId = nomination.participants.find(
    (row) => row.role === "agency:appointer",
  )!.personId;
  const organizationId = appointmentTag(
    formerTerm,
    "opening-organization:",
  ) as EntityId | null;
  if (
    !organizationId ||
    !world.history.organizations.some((row) => row.id === organizationId)
  )
    return world;
  const oldEnd = appointmentTag(formerTerm, "term-end:");
  const termEnd =
    vacancy.endExclusive ??
    (post.termYears && oldEnd
      ? makeIsoDate(
          `${Number(oldEnd.slice(0, 4)) + post.termYears}-${oldEnd.slice(5)}`,
        )
      : null);
  if (post.termYears && (!termEnd || termEnd <= world.currentDate))
    return world;
  let next = recordWorldEvent(world, {
    stableKey: `${nomination.stableKey}:seated`,
    type: "world.office-tenure",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: nomination.jurisdictionId,
    involvedEntityIds: [nomineeId, organizationId],
    participants: [
      { personId: nomineeId, role: "focus:subject", detail: post.title },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `office:${post.officeKey}:seat:${vacancy.seatOrdinal}`,
      `appointment-post:${post.officeKey}`,
      `appointment-seat:${vacancy.seatOrdinal}`,
      `appointment-term:${formerTerm.id}`,
      `appointment-vacancy:${vacancy.vacancyEventId}`,
      `source-event:${rollCall.id}`,
      `nomination:${nomination.id}`,
      `opening-organization:${organizationId}`,
      ...(termEnd ? [`term-end:${termEnd}`] : []),
    ],
    summary: `${personName(world.people[nomineeId]!)} took the confirmed ${post.title} post.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const tenure = next.history.events.at(-1)!;
  next = createOrganizationParticipation(next, {
    stableKey: `${tenure.stableKey}:participation`,
    personId: nomineeId,
    organizationId,
    startedAt: world.currentDate,
    kind:
      post.kind === "board"
        ? "leadership:appointed-board"
        : "leadership:department-head",
    roleKind:
      post.kind === "board" ? "member:board-member" : "leader:department-head",
    context: post.title,
    provenance: { kind: "simulated-event", eventId: tenure.id },
  });
  next = scheduleExecutiveAppointmentTermExpiry(next, tenure.id);
  return recordAppointmentFavor(next, {
    stableKey: tenure.stableKey,
    appointerPersonId: appointerId,
    appointeePersonId: nomineeId,
    post,
    eventId: tenure.id,
    subject: { kind: "organization", organizationId },
  });
}
