import { currentPresidentOf } from "../crisis/offices";
import {
  currentFederalTenure,
  FEDERAL_VACANCY_EVENT,
} from "../federal-tenures";
import { seatHolderAt } from "../judiciary/courts";
import type { EntityId, FutureDueItem, IsoDate, World } from "../types";
import {
  ASSOCIATE_JUSTICE_NOMINATION,
  CHIEF_JUSTICE_NOMINATION,
  SUPREME_COURT_ID,
  SUPREME_COURT_VACANCY_EVENT,
  SUPREME_COURT_VOTE_EVENT,
} from "./supreme-court-appointment-profile";
import {
  supremeCourtNomineePool,
  type SupremeCourtCandidate,
} from "./supreme-court-appointments";

export interface JudicialAppointmentContext {
  readonly presidentId: EntityId;
  readonly office: "chief" | "associate";
  readonly title: string;
  readonly vacancyDate: IsoDate;
  readonly vacancyEventId: EntityId;
  readonly candidates: readonly SupremeCourtCandidate[];
  readonly rejected: readonly EntityId[];
}

/** Read a real scheduled vacancy, not a missing inventory record. */
export function judicialAppointmentContext(
  world: World,
  due: FutureDueItem,
): JudicialAppointmentContext | null {
  if (
    !world.history.futureDueItems.some(
      (row) =>
        row.id === due.id &&
        row.stableKey === due.stableKey &&
        row.transitionKey === due.transitionKey &&
        row.dueAt === due.dueAt,
    ) ||
    due.dueAt > world.currentDate
  )
    return null;
  const president = currentPresidentOf(world);
  if (
    !president ||
    world.history.events.some(
      (event) => event.stableKey === `${due.stableKey}:nominated`,
    )
  )
    return null;
  let office: "chief" | "associate";
  let title: string;
  let vacancyDate: IsoDate;
  let vacancyTag: string;
  let vacancy;
  if (due.transitionKey === ASSOCIATE_JUSTICE_NOMINATION) {
    const match = /:associate-nomination:(\d+):(\d{4}-\d{2}-\d{2}):/.exec(
      due.stableKey,
    );
    if (!match) return null;
    const seatId = `${SUPREME_COURT_ID}:seat:${Number(match[1])}`;
    const seat = world.judiciary?.seats[seatId];
    if (!seat || seat.retiredAt !== null || seatHolderAt(world, seatId))
      return null;
    office = "associate";
    title = "Associate Justice of the Supreme Court";
    vacancyDate = match[2] as IsoDate;
    vacancyTag = `vacancy:${seat.ordinal}:${vacancyDate}`;
    vacancy = world.history.events.findLast(
      (event) =>
        event.type === SUPREME_COURT_VACANCY_EVENT &&
        event.tags.includes(`judicial-seat:${seatId}`) &&
        event.occurredAt <= world.currentDate,
    );
  } else if (due.transitionKey === CHIEF_JUSTICE_NOMINATION) {
    const match = /:nomination:(\d{4}-\d{2}-\d{2}):/.exec(due.stableKey);
    if (!match || currentFederalTenure(world, "us-chief-justice")) return null;
    office = "chief";
    title = "Chief Justice of the United States";
    vacancyDate = match[1] as IsoDate;
    vacancyTag = `vacancy:${vacancyDate}`;
    vacancy = world.history.events.findLast(
      (event) =>
        event.type === FEDERAL_VACANCY_EVENT &&
        event.tags.includes("office:us-chief-justice") &&
        event.occurredAt <= world.currentDate,
    );
  } else return null;
  if (
    !vacancy ||
    vacancy.occurredAt !== vacancyDate ||
    vacancy.recordedAt > world.currentDate
  )
    return null;
  const rejected = world.history.events
    .filter(
      (event) =>
        event.type === SUPREME_COURT_VOTE_EVENT &&
        event.tags.includes(vacancyTag) &&
        event.tags.includes("outcome:rejected") &&
        event.occurredAt <= world.currentDate,
    )
    .flatMap((event) =>
      event.participants
        .filter((row) => row.role === "focus:subject")
        .map((row) => row.personId),
    );
  return {
    presidentId: president.personId,
    office,
    title,
    vacancyDate,
    vacancyEventId: vacancy.id,
    rejected,
    candidates: supremeCourtNomineePool(world, office, [
      president.personId,
      ...rejected,
    ]),
  };
}

export interface JudicialNominationInstruction {
  readonly matterEventId: EntityId;
  readonly governingDecisionEventId: EntityId;
  readonly nomineePersonId: EntityId;
}

/** Admission to the existing Court nomination writer requires the actual
 * desk decision and the earlier canonical player-choice trace. */
export function judicialNominationInstruction(
  world: World,
  due: FutureDueItem,
  input: JudicialNominationInstruction,
): {
  readonly candidate: SupremeCourtCandidate;
  readonly sourceTags: readonly string[];
} | null {
  const context = judicialAppointmentContext(world, due);
  const matter = world.history.events.find(
    (event) => event.id === input.matterEventId,
  );
  const decision = world.history.events.find(
    (event) => event.id === input.governingDecisionEventId,
  );
  if (
    !context ||
    !matter ||
    !decision ||
    matter.type !== "governing.matter-opened" ||
    !matter.tags.includes("matter-family:appointment") ||
    !matter.tags.includes("appointment-domain:judicial") ||
    !matter.tags.includes("office:us-president") ||
    !matter.tags.includes(`appointment-due:${due.id}`) ||
    !matter.tags.includes(`source-event:${context.vacancyEventId}`) ||
    !matter.participants.some(
      (row) =>
        row.role === "agency:officeholder" &&
        row.personId === context.presidentId,
    ) ||
    !matter.participants.some(
      (row) =>
        row.role === "focus:candidate" &&
        row.personId === input.nomineePersonId,
    ) ||
    decision.type !== "governing.matter-decided" ||
    decision.sequence <= matter.sequence ||
    decision.occurredAt > world.currentDate ||
    !decision.tags.includes(`matter:${matter.id}`) ||
    !decision.tags.includes(`choice:person:${input.nomineePersonId}`) ||
    !decision.participants.some(
      (row) =>
        row.role === "agency:decider" && row.personId === context.presidentId,
    )
  )
    return null;
  const candidate = context.candidates.find(
    (row) => row.personId === input.nomineePersonId,
  );
  const trace = world.history.decisionTraces.find(
    (row) =>
      row.stableKey === `${due.stableKey}:president-choice:trace` &&
      row.context.decisionType === "governing.supreme-court-nomination" &&
      row.context.actorPersonId === context.presidentId &&
      row.context.subject.key === due.stableKey &&
      row.selectedOptionKey === input.nomineePersonId &&
      row.sequence < decision.sequence &&
      row.context.constraints.some(
        (constraint) =>
          constraint.kind === "player:recorded-choice" &&
          constraint.sourceRefs.some(
            (ref) =>
              ref.kind === "historical-event" && ref.eventId === matter.id,
          ),
      ),
  );
  if (!candidate || !trace) return null;
  return {
    candidate,
    sourceTags: [
      `appointment-matter:${matter.id}`,
      `appointment-decision:${trace.id}`,
      `source-event:${decision.id}`,
      `appointment-vacancy:${context.vacancyEventId}`,
    ],
  };
}
