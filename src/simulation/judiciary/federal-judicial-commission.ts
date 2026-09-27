/** A separate executive commission follows a recorded Senate confirmation. */

import { currentPresidentOf } from "../crisis/offices";
import { FEDERAL_TENURE_EVENT, currentFederalTenure } from "../federal-tenures";
import { leaveCongressSeatForConfirmedJudge } from "../governing/office-continuity";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { personName } from "../people";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  courtById,
  releaseJudicialSeatForAppointment,
  seatHolderAt,
  seatJudge,
} from "./courts";
import { startConfirmedFederalJudicialEmployment } from "./federal-judicial-employment";
import { publishJudiciaryMilestone } from "./news";
import { judicialSelectionById, judicialSelectionStages } from "./selection";

export const JUDICIAL_COMMISSION_EVENT = "judicial.commission-issued";

/** Refuse dual executive and judicial authority until a saved office exit exists. */
export function federalJudicialExecutiveOfficeBlocker(
  world: World,
  nomineeId: EntityId,
): string | null {
  const president = currentPresidentOf(world);
  return (
    (president?.personId === nomineeId ? president.title : null) ??
    (currentFederalTenure(world, "us-vice-president")?.personId === nomineeId
      ? "Vice President of the United States"
      : null) ??
    currentStateExecutiveHolders(world).find(
      (holder) => holder.personId === nomineeId,
    )?.title ??
    null
  );
}

export function commissionConfirmedFederalJudge(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly resultEventId: EntityId;
    readonly presidentPersonId: EntityId;
    /** The controlled President must choose explicitly; an NPC may act on a game profile. */
    readonly mode: "player-choice" | "automatic-npc";
  },
): World {
  const selection = judicialSelectionById(world, input.selectionRecordId);
  const seat = selection && world.judiciary?.seats[selection.seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  const result = world.history.events.find(
    (event) => event.id === input.resultEventId,
  );
  const nomination = selection
    ? judicialSelectionStages(world, selection.recordId).find(
        (stage) => stage.mechanism === "EXECUTIVE_NOMINATION",
      )
    : null;
  const confirmation = selection
    ? judicialSelectionStages(world, selection.recordId).find(
        (stage) => stage.mechanism === "LEGISLATIVE_CONFIRMATION",
      )
    : null;
  const nomineeId = nomination?.candidatePersonId;
  if (
    !selection ||
    !seat ||
    !court?.level.startsWith("federal-") ||
    !nomineeId ||
    confirmation?.outcome !== "completed" ||
    confirmation.outcomeEventId !== input.resultEventId ||
    result?.type !== "judicial.senate-result" ||
    !result.tags.includes(`selection:${selection.recordId}`) ||
    !result.tags.includes("outcome:confirmed") ||
    !result.involvedEntityIds.includes(nomineeId)
  )
    throw new Error(
      "A saved Senate confirmation is needed before commissioning.",
    );
  const prior = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_COMMISSION_EVENT &&
      event.tags.includes(`selection:${selection.recordId}`),
  );
  if (prior) return world;
  if (seatHolderAt(world, seat.seatId))
    throw new Error("The confirmed seat is no longer vacant.");
  const president = currentPresidentOf(world);
  if (!president || president.personId !== input.presidentPersonId)
    throw new Error("Only the sitting President can issue this commission.");
  const controlledPresident =
    world.control.kind === "person" &&
    world.control.personId === president.personId;
  if (controlledPresident !== (input.mode === "player-choice"))
    throw new Error("The controlled President must choose this commission.");
  const nominee = world.people[nomineeId];
  const actor = world.people[president.personId];
  if (!nominee || !actor)
    throw new Error("The commission needs its actual President and nominee.");
  const executiveOffice = federalJudicialExecutiveOfficeBlocker(
    world,
    nomineeId,
  );
  if (executiveOffice)
    throw new Error(
      `The nominee still holds ${executiveOffice}; an office-exit route is needed before judicial commissioning.`,
    );
  let next = recordWorldEvent(world, {
    stableKey: `${JUDICIAL_COMMISSION_EVENT}:${selection.recordId}`,
    type: JUDICIAL_COMMISSION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: court.jurisdictionId,
    involvedEntityIds: [president.personId, nomineeId],
    participants: [
      {
        personId: president.personId,
        role: "focus:actor",
        detail: "President",
      },
      {
        personId: nomineeId,
        role: "focus:subject",
        detail: "Confirmed nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selection.recordId}`,
      `result:${result.id}`,
      `court:${court.courtId}`,
      `seat:${seat.seatId}`,
      // PLACEHOLDER(wave2): NPC same-day issuance is a game timing choice.
      ...(input.mode === "automatic-npc" ? ["timing:wave2-npc-same-day"] : []),
    ],
    summary: `President ${personName(actor)} issued a commission to ${personName(nominee)} for ${court.name} after Senate confirmation.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "issue commission",
      motivation: null,
      immediateReaction: null,
    },
  });
  const commissionId = next.history.events.at(-1)!.id;
  next = releaseJudicialSeatForAppointment(next, nomineeId, seat.seatId);
  if (seat.linkedOfficeId === "us-chief-justice") {
    if (currentFederalTenure(next, "us-chief-justice"))
      throw new Error("The Chief Justiceship is already filled.");
    next = recordWorldEvent(next, {
      stableKey: `${JUDICIAL_COMMISSION_EVENT}:${selection.recordId}:tenure`,
      type: FEDERAL_TENURE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [nomineeId],
      participants: [
        {
          personId: nomineeId,
          role: "focus:subject",
          detail: "Chief Justice of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "office:us-chief-justice",
        "basis:us-const-art-ii-s2-cl2",
        `selection:${selection.recordId}`,
        `commission:${commissionId}`,
      ],
      summary: `${personName(nominee)} began service as Chief Justice after a recorded commission.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  } else {
    if (
      court.rules.termYears.state !== "known" ||
      court.rules.termYears.value !== null
    )
      throw new Error(
        "This federal seat needs its tenure duration resolved before seating.",
      );
    next = seatJudge(next, {
      seatId: seat.seatId,
      personId: nomineeId,
      startedAt: next.currentDate,
      selection: {
        path: "confirmation",
        selectionRecordId: selection.recordId,
        decisionRecordId: null,
        selectingPersonId: president.personId,
        contestId: null,
        note: `Commission ${commissionId} after Senate result ${result.id}`,
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
  }
  next = leaveCongressSeatForConfirmedJudge(next, nomineeId);
  next = startConfirmedFederalJudicialEmployment(next, {
    selectionRecordId: selection.recordId,
    nomineeId,
    courtId: court.courtId,
    resultEventId: result.id,
  });
  return publishJudiciaryMilestone(next, commissionId);
}
