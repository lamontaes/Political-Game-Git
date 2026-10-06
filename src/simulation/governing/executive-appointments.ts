import { eventById } from "../event-index";
import { growingIndex, type GrowingIndexKind } from "../history-index";
import { makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { recordWorldEvent } from "../world";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { executiveAppointmentPost } from "./executive-appointment-posts";
import { governingOfficeForPerson } from "./state-governing";
import { executiveAppointmentEligibility } from "./executive-appointment-eligibility";

export function recordExecutiveAppointmentNomination(
  world: World,
  input: {
    readonly matterEventId: EntityId;
    readonly governingDecisionEventId: EntityId;
    readonly nomineePersonId: EntityId;
  },
): World {
  const matter = eventById(world, input.matterEventId);
  const decision = eventById(world, input.governingDecisionEventId);
  const vacancyId = matter
    ? (appointmentTag(matter, "appointment-vacancy:") as EntityId | null)
    : null;
  const vacancy = vacancyId
    ? executiveAppointmentVacancy(world, vacancyId)
    : null;
  const post = vacancy ? executiveAppointmentPost(vacancy.postOfficeKey) : null;
  const appointer = matter?.participants.find(
    (participant) => participant.role === "agency:officeholder",
  )?.personId;
  const office = appointer ? governingOfficeForPerson(world, appointer) : null;
  if (
    !matter ||
    !decision ||
    !vacancy ||
    !post ||
    !appointer ||
    !office ||
    office.officeKey !== post.appointerOfficeKey ||
    matter.jurisdictionId !== office.jurisdictionId ||
    !matter.tags.includes(`office:${office.officeKey}`) ||
    !matter.tags.includes("matter-family:appointment") ||
    decision.type !== "governing.matter-decided" ||
    decision.sequence <= matter.sequence ||
    decision.occurredAt > world.currentDate ||
    !decision.tags.includes(`matter:${matter.id}`) ||
    !decision.tags.includes(`choice:person:${input.nomineePersonId}`) ||
    !decision.participants.some(
      (participant) =>
        participant.personId === appointer &&
        participant.role === "agency:decider",
    ) ||
    executiveAppointmentEligibility(
      world,
      post.officeKey,
      input.nomineePersonId,
      office.jurisdictionId,
    ) !== "meets"
  )
    return world;
  const trace = world.history.decisionTraces.find(
    (row) =>
      row.stableKey === `appointments-v1:${matter.stableKey}:choose:trace` &&
      row.context.decisionType === "appointment.choose-appointee" &&
      row.context.actorPersonId === appointer &&
      row.context.subject.key === post.officeKey &&
      row.selectedOptionKey === `person:${input.nomineePersonId}` &&
      row.sequence < decision.sequence &&
      row.recordedAt <= world.currentDate,
  );
  if (!trace) return world;
  const stableKey = `${matter.stableKey}:nominated`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: EXECUTIVE_APPOINTMENT_NOMINATED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [appointer, input.nomineePersonId],
    participants: [
      { personId: appointer, role: "agency:appointer", detail: office.title },
      {
        personId: input.nomineePersonId,
        role: "agency:nominee",
        detail: post.title,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `appointment-post:${post.officeKey}`,
      `appointment-seat:${vacancy.seatOrdinal}`,
      `appointment-vacancy:${vacancy.vacancyEventId}`,
      `appointment-term:${vacancy.incumbentTermEventId}`,
      `appointment-decision:${trace.id}`,
      `appointment-matter:${matter.id}`,
      `source-event:${decision.id}`,
    ],
    summary: `The ${office.title} nominated a ${post.title}; the required confirmation remains pending.`,
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

export const EXECUTIVE_APPOINTMENT_NOMINATED =
  "executive.appointment-nominated" as const;
export const EXECUTIVE_APPOINTMENT_TERM_EXPIRY =
  "government:executive-appointment-term-expiry" as const;

export function scheduleExecutiveAppointmentTermExpiry(
  world: World,
  incumbentTermEventId: EntityId,
): World {
  const term = eventById(world, incumbentTermEventId);
  if (
    !term ||
    term.type !== "world.office-tenure" ||
    term.recordedAt > world.currentDate
  )
    return world;
  const postKey = appointmentTag(term, "appointment-post:");
  const post = postKey ? executiveAppointmentPost(postKey) : null;
  const end = appointmentTag(term, "term-end:");
  const seat = Number(appointmentTag(term, "appointment-seat:"));
  if (
    !post ||
    !end ||
    makeIsoDate(end) < world.currentDate ||
    !Number.isSafeInteger(seat) ||
    seat < 1 ||
    seat > post.seats ||
    latestExecutiveAppointmentSeat(world, post.officeKey, seat)?.id !== term.id
  )
    return world;
  const stableKey = `${term.stableKey}:term-expiry`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: makeIsoDate(end),
    transitionKey: EXECUTIVE_APPOINTMENT_TERM_EXPIRY,
    entityIds: [term.id],
    jurisdictionId: term.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [term.id] },
  });
}

export function appointmentTag(
  event: HistoricalEvent,
  prefix: string,
): string | null {
  return (
    event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
    null
  );
}

const POST_RECORDS: GrowingIndexKind<Map<string, HistoricalEvent[]>> = {
  create: () => new Map(),
  add(index, record) {
    const event = record as HistoricalEvent;
    if (
      event.type !== "world.office-tenure" &&
      event.type !== "world.office-vacancy"
    )
      return;
    const postKey = appointmentTag(event, "appointment-post:");
    const seat = appointmentTag(event, "appointment-seat:");
    if (!postKey || !seat) return;
    const key = `${postKey}:${seat}`;
    index.set(key, [...(index.get(key) ?? []), event]);
  },
};

/** Reads only this named seat's saved canonical office records. An inventory
 * row or absent record cannot establish either an incumbent or a vacancy. */
export function latestExecutiveAppointmentSeat(
  world: World,
  postOfficeKey: string,
  seatOrdinal: number,
): HistoricalEvent | null {
  const records =
    growingIndex(POST_RECORDS, world.history.events).get(
      `${postOfficeKey}:${seatOrdinal}`,
    ) ?? [];
  let latest: HistoricalEvent | null = null;
  for (const event of records) {
    if (
      event.occurredAt > world.currentDate ||
      event.recordedAt > world.currentDate
    )
      continue;
    if (!latest || event.sequence > latest.sequence) latest = event;
  }
  return latest;
}

export interface ExecutiveAppointmentVacancy {
  readonly postOfficeKey: string;
  readonly seatOrdinal: number;
  readonly vacancyEventId: EntityId;
  readonly incumbentTermEventId: EntityId;
  readonly formerHolderPersonId: EntityId;
  readonly endExclusive: IsoDate | null;
}

export function executiveAppointmentVacancy(
  world: World,
  vacancyEventId: EntityId,
): ExecutiveAppointmentVacancy | null {
  const event = eventById(world, vacancyEventId);
  if (!event || event.type !== "world.office-vacancy") return null;
  const postOfficeKey = appointmentTag(event, "appointment-post:");
  const seatOrdinal = Number(appointmentTag(event, "appointment-seat:"));
  const incumbentTermEventId = appointmentTag(
    event,
    "appointment-term:",
  ) as EntityId | null;
  const post = postOfficeKey ? executiveAppointmentPost(postOfficeKey) : null;
  if (
    !post ||
    !Number.isSafeInteger(seatOrdinal) ||
    seatOrdinal < 1 ||
    seatOrdinal > post.seats ||
    !incumbentTermEventId
  )
    return null;
  if (
    latestExecutiveAppointmentSeat(world, post.officeKey, seatOrdinal)?.id !==
    event.id
  )
    return null;
  const term = eventById(world, incumbentTermEventId);
  const formerHolderPersonId = term?.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (
    !term ||
    term.type !== "world.office-tenure" ||
    !formerHolderPersonId ||
    term.sequence >= event.sequence ||
    !term.tags.includes(`appointment-post:${post.officeKey}`) ||
    !term.tags.includes(`appointment-seat:${seatOrdinal}`)
  )
    return null;
  const end = appointmentTag(event, "term-end:");
  return {
    postOfficeKey: post.officeKey,
    seatOrdinal,
    vacancyEventId: event.id,
    incumbentTermEventId: term.id,
    formerHolderPersonId,
    endExclusive: end ? makeIsoDate(end) : null,
  };
}

/** Called on a real term transition or recorded departure, never on a daily
 * search for apparently empty seats. Uses the existing office-vacancy writer. */
export function recordExecutiveAppointmentVacancy(
  world: World,
  input: {
    readonly incumbentTermEventId: EntityId;
    readonly cause: "term-expired" | "death" | "resignation";
    readonly causeEventId: EntityId;
  },
): World {
  const term = eventById(world, input.incumbentTermEventId);
  if (
    !term ||
    term.type !== "world.office-tenure" ||
    term.occurredAt > world.currentDate ||
    term.recordedAt > world.currentDate
  )
    return world;
  const postOfficeKey = appointmentTag(term, "appointment-post:");
  const post = postOfficeKey ? executiveAppointmentPost(postOfficeKey) : null;
  const seatOrdinal = Number(appointmentTag(term, "appointment-seat:"));
  const holder = term.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (
    !post ||
    !holder ||
    !world.people[holder] ||
    !Number.isSafeInteger(seatOrdinal) ||
    seatOrdinal < 1 ||
    seatOrdinal > post.seats
  )
    return world;
  const latest = latestExecutiveAppointmentSeat(
    world,
    post.officeKey,
    seatOrdinal,
  );
  if (latest?.id !== term.id) return world;
  const termEnd = appointmentTag(term, "term-end:");
  if (
    termEnd &&
    (termEnd <= term.occurredAt ||
      (post.termEndMonthDay !== null &&
        termEnd.slice(5) !== post.termEndMonthDay))
  )
    return world;
  const cause = eventById(world, input.causeEventId);
  if (
    !cause ||
    cause.occurredAt > world.currentDate ||
    cause.recordedAt > world.currentDate
  )
    return world;
  if (input.cause === "term-expired") {
    if (
      cause.id !== term.id ||
      !termEnd ||
      makeIsoDate(termEnd) > world.currentDate
    )
      return world;
  } else if (input.cause === "death") {
    if (
      !world.history.personDeaths.some(
        (death) =>
          death.personId === holder &&
          death.eventId === cause.id &&
          death.diedAt >= term.occurredAt &&
          death.diedAt <= world.currentDate,
      )
    )
      return world;
  } else if (
    cause.type !== "world.office-resignation" ||
    cause.sequence <= term.sequence ||
    !cause.tags.includes(`appointment-term:${term.id}`) ||
    !cause.participants.some(
      (participant) =>
        participant.personId === holder && participant.role === "focus:actor",
    )
  )
    return world;
  return recordWorldEvent(world, {
    stableKey: `${term.stableKey}:vacancy:${input.cause}:${cause.id}`,
    type: "world.office-vacancy",
    occurredAt:
      input.cause === "term-expired" ? makeIsoDate(termEnd!) : cause.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: term.jurisdictionId,
    involvedEntityIds: [holder],
    participants: [
      { personId: holder, role: "focus:subject", detail: "Former incumbent" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `office:${post.officeKey}:seat:${seatOrdinal}`,
      `appointment-post:${post.officeKey}`,
      `appointment-seat:${seatOrdinal}`,
      `appointment-term:${term.id}`,
      `vacancy-cause:${input.cause}`,
      `source-event:${cause.id}`,
      ...(input.cause !== "term-expired" && termEnd
        ? [`term-end:${termEnd}`]
        : []),
    ],
    summary: `A ${post.title} seat became vacant after ${input.cause.replaceAll("-", " ")}.`,
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
