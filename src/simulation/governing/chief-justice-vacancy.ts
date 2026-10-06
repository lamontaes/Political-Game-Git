import { openJudicialAppointmentMatter } from "./state-governing";
import {
  judicialNominationInstruction,
  type JudicialNominationInstruction,
} from "./executive-judicial-appointments";
import {
  CHIEF_JUSTICE_VACANCY_VERSION,
  CHIEF_JUSTICE_NOMINATION,
  CHIEF_JUSTICE_CONFIRMATION,
  CHIEF_JUSTICE_NOMINATED_EVENT,
  CHIEF_JUSTICE_VACANCY_PROFILE,
} from "./supreme-court-appointment-profile";
export {
  CHIEF_JUSTICE_VACANCY_VERSION,
  CHIEF_JUSTICE_NOMINATION,
  CHIEF_JUSTICE_CONFIRMATION,
  CHIEF_JUSTICE_NOMINATED_EVENT,
  CHIEF_JUSTICE_VACANCY_PROFILE,
} from "./supreme-court-appointment-profile";
import { addDays, makeIsoDate } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import {
  appointmentCircle,
  chooseAppointee,
  recordAppointmentFavor,
  recordPassedOver,
} from "../patronage/appointments";
import { federalColleaguesOf } from "../patronage/federal-circle";
import {
  FEDERAL_TENURE_EVENT,
  FEDERAL_VACANCY_EVENT,
  currentFederalTenure,
} from "../federal-tenures";
import { scheduleFutureDueItem } from "../future-transitions";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { personName } from "../people";
import type {
  EntityId,
  FutureDueItem,
  FutureDueReasonKey,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  SUPREME_COURT_VOTE_EVENT,
  associateJusticeSeatsHeldBy,
  briefSenateOnNominee,
  choosePresidentialNominee,
  leaveLowerBench,
  openAssociateJusticeVacancy,
  recordConfirmationVote,
  senateConfirmationVote,
} from "./supreme-court-appointments";

/**
 * THE CHIEF JUSTICESHIP FALLS VACANT — U.S. Const. art. II, § 2, cl. 2: the
 * President "shall nominate, and by and with the Advice and Consent of the
 * Senate, shall appoint ... Judges of the supreme Court". The Constitution
 * sets no age, citizenship or residence requirement for a justice.
 *
 * Since Build 27 (September 28, 2026) the Chief Justice is chosen the way
 * every seat on the Court is (supreme-court-appointments.ts): the President
 * weighs the sitting associate justices, federal appeals judges and state
 * supreme court justices, and the seated Senate votes. A rejected nominee
 * sends the nomination back to the President. A confirmed associate justice
 * leaves that seat, which opens for its own nomination.
 *
 * An older save without judges can nominate an eligible recorded acquaintance
 * through the existing appointment decision. Missing candidates or a seated
 * Senate leave the vacancy pending; neither is replaced by a draw or consent.
 *
 * Still not modeled: a vacancy with no sitting President waits, and the game
 * does not yet reopen the nomination when a President takes office.
 */
const ADULT_AGE = 18;

const CHIEF_JUSTICE_TITLE = "Chief Justice of the United States";

export const CHIEF_JUSTICESHIP_VACANT_SENTENCE =
  "The office of Chief Justice is vacant until the Senate confirms the President's nominee.";

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function resolved(
  world: World,
  context: string,
  outcomeEventId: EntityId | null = null,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  };
}

function pending(
  world: World,
  reasonKey: FutureDueReasonKey,
  context: string,
): FutureTransitionHandlerResult {
  return { world, status: "blocked", reasonKey, context, outcomeEventId: null };
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function isDead(world: World, personId: EntityId): boolean {
  return world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

function scheduleNomination(
  world: World,
  vacancyDate: IsoDate,
  presidentId: EntityId,
): World {
  const stableKey = `${CHIEF_JUSTICE_VACANCY_VERSION}:nomination:${vacancyDate}:${world.currentDate}`;
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(
      world.currentDate,
      CHIEF_JUSTICE_VACANCY_PROFILE.daysFromVacancyToNomination,
    ),
    transitionKey: CHIEF_JUSTICE_NOMINATION,
    entityIds: [presidentId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${CHIEF_JUSTICE_VACANCY_PROFILE.id}: the President nominates a Chief Justice (U.S. Const. art. II, § 2, cl. 2); the ${CHIEF_JUSTICE_VACANCY_PROFILE.daysFromVacancyToNomination}-day interval is a game profile.`,
    },
  });
}

/**
 * Records that the Chief Justiceship is vacant and, when there is a sitting
 * President, puts the nomination on the calendar. Once per vacancy.
 */
export function openChiefJusticeVacancy(
  world: World,
  input: { readonly vacancyDate: IsoDate; readonly formerHolderId: EntityId },
): { readonly world: World; readonly presidentId: EntityId | null } {
  const stableKey = `${CHIEF_JUSTICE_VACANCY_VERSION}:vacancy:${input.vacancyDate}`;
  const president = currentPresidentOf(world);
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return { world, presidentId: president?.personId ?? null };
  const former = world.people[input.formerHolderId];
  let next = recordWorldEvent(world, {
    stableKey,
    type: FEDERAL_VACANCY_EVENT,
    occurredAt: input.vacancyDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.formerHolderId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CHIEF_JUSTICE_VACANCY_VERSION,
      "office:us-chief-justice",
      "vacancy-cause:chief-justice-died",
    ],
    summary: `The office of Chief Justice is vacant after the death of ${former ? personName(former) : "the Chief Justice"}.`,
    context: CONTEXT,
  });
  if (president)
    next = scheduleNomination(next, input.vacancyDate, president.personId);
  return { world: next, presidentId: president?.personId ?? null };
}

const CHIEF_JUSTICE_POST = {
  officeKey: "us-chief-justice",
  title: "Chief Justice of the United States",
} as const;

/**
 * For a World that seats no judges, the existing appointment decision can
 * select an eligible recorded acquaintance. No candidate is drawn when that
 * decision has no selected person.
 */
function legacyNominee(
  world: World,
  due: FutureDueItem,
  presidentId: EntityId,
): { readonly personId: EntityId; readonly world: World } | null {
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const vice = currentFederalTenure(world, "us-vice-president")?.personId;
  // A sitting governor is not drawn: the game has no route for them to give
  // up the governorship.
  const governors = new Set(
    currentStateExecutiveHolders(world).map((holder) => holder.personId),
  );
  // Nor is a sitting member of Congress: no member may hold another federal
  // office while serving (U.S. Const. art. I, sec. 6, cl. 2), and the game
  // has no route for them to give up the seat. They can still be known to
  // the President; they are only not eligible.
  const colleagues = federalColleaguesOf(world);
  const barred = new Set(colleagues);
  const pool = Object.values(world.people)
    .filter(
      (person) =>
        person.id !== presidentId &&
        person.id !== controlled &&
        person.id !== vice &&
        !governors.has(person.id) &&
        !barred.has(person.id) &&
        !isDead(world, person.id) &&
        ageOn(person.birthDate, world.currentDate) >= ADULT_AGE,
    )
    .map((person) => person.id)
    .sort();
  if (!pool.length) return null;
  const eligible = new Set(pool);
  const choice = chooseAppointee(world, {
    stableKey: due.stableKey,
    appointerPersonId: presidentId,
    post: CHIEF_JUSTICE_POST,
    circle: appointmentCircle(world, presidentId, colleagues),
    eligible: (personId) => eligible.has(personId),
  });
  if (!choice) return null;
  return {
    personId: choice.personId,
    world: recordPassedOver(choice.world, {
      stableKey: due.stableKey,
      appointerPersonId: presidentId,
      passedOver: choice.passedOver,
      post: CHIEF_JUSTICE_POST,
    }),
  };
}

/** The President names a nominee. */
export function chiefJusticeNominationHandler(
  world: World,
  due: FutureDueItem,
  instruction?: JudicialNominationInstruction,
): FutureTransitionHandlerResult {
  const match = /:nomination:(\d{4}-\d{2}-\d{2}):/.exec(due.stableKey);
  if (!match) return resolved(world, "No vacancy matches this nomination.");
  const vacancyDate = makeIsoDate(match[1]!);
  if (currentFederalTenure(world, "us-chief-justice"))
    return resolved(world, "The office of Chief Justice is already filled.");
  const president = currentPresidentOf(world);
  if (!president)
    return resolved(
      world,
      "There is no sitting President to nominate a Chief Justice.",
    );
  const rejected = world.history.events
    .filter(
      (event) =>
        event.type === SUPREME_COURT_VOTE_EVENT &&
        event.tags.includes("office:us-chief-justice") &&
        event.tags.includes(`vacancy:${vacancyDate}`) &&
        event.tags.includes("outcome:rejected"),
    )
    .flatMap((event) =>
      event.participants
        .filter((row) => row.role === "focus:subject")
        .map((row) => row.personId),
    );
  if (
    world.control.kind === "person" &&
    world.control.personId === president.personId &&
    !instruction
  )
    return resolved(
      openJudicialAppointmentMatter(world, due),
      "The President's nomination choice is on the shared desk.",
    );
  const instructed = instruction
    ? judicialNominationInstruction(world, due, instruction)
    : null;
  if (instruction && !instructed)
    return resolved(
      world,
      "No recorded player nomination authorizes this appointment.",
    );
  const chosen =
    instructed?.candidate ??
    choosePresidentialNominee(world, {
      stableKey: due.stableKey,
      presidentId: president.personId,
      office: "chief",
      exclude: rejected,
    });
  const legacy =
    chosen || world.judiciary
      ? null
      : legacyNominee(world, due, president.personId);
  const nomineeId = chosen?.personId ?? legacy?.personId ?? null;
  if (!nomineeId)
    return pending(
      world,
      "governing:no-recorded-chief-justice-nominee",
      "No Chief Justice nominee has been selected from recorded judges or eligible acquaintances.",
    );
  const chosenWorld = legacy?.world ?? world;
  const presidentName = personName(world.people[president.personId]!);
  const nomineeName = personName(world.people[nomineeId]!);
  let next = recordWorldEvent(chosenWorld, {
    stableKey: `${due.stableKey}:nominated`,
    type: CHIEF_JUSTICE_NOMINATED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
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
        detail: "Nominee for Chief Justice",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CHIEF_JUSTICE_VACANCY_VERSION,
      "office:us-chief-justice",
      `vacancy:${vacancyDate}`,
      `provenance:${CHIEF_JUSTICE_VACANCY_PROFILE.id}`,
      ...(chosen ? [`nominee-bench:${chosen.bench}`] : []),
      ...(instructed ? instructed.sourceTags : []),
    ],
    summary: `President ${presidentName} nominated ${nomineeName} to be Chief Justice of the United States. The Senate must confirm the nomination.`,
    context: CONTEXT,
  });
  const nominatedEventId = next.history.events.at(-1)!.id;
  next = scheduleFutureDueItem(next, {
    stableKey: `${CHIEF_JUSTICE_VACANCY_VERSION}:confirmation:${vacancyDate}:${nomineeId}`,
    dueAt: addDays(
      next.currentDate,
      CHIEF_JUSTICE_VACANCY_PROFILE.daysFromNominationToConfirmation,
    ),
    transitionKey: CHIEF_JUSTICE_CONFIRMATION,
    entityIds: [nomineeId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${CHIEF_JUSTICE_VACANCY_PROFILE.id}: the Senate votes on the nomination (U.S. Const. art. II, § 2, cl. 2); the ${CHIEF_JUSTICE_VACANCY_PROFILE.daysFromNominationToConfirmation}-day interval and the confirmation are a game profile.`,
    },
  });
  return resolved(next, `${nomineeName} was nominated.`, nominatedEventId);
}

/**
 * The Senate confirms; the nominee takes office. A justice's tenure has no
 * fixed end (art. III, § 1). A nominee who sat in Congress gives up the seat
 * (art. I, § 6, cl. 2); `leaveCongressSeat` is the governing writer that
 * vacates it, passed in so this module does not import that writer.
 */
export function confirmChiefJustice(
  world: World,
  due: FutureDueItem,
  leaveCongressSeat: (world: World, personId: EntityId) => World,
): FutureTransitionHandlerResult {
  const match = /:confirmation:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(due.stableKey);
  if (!match) return resolved(world, "No nomination matches.");
  const vacancyDate = makeIsoDate(match[1]!);
  const nomineeId = match[2]! as EntityId;
  if (currentFederalTenure(world, "us-chief-justice"))
    return resolved(world, "The office of Chief Justice is already filled.");
  const nominee = world.people[nomineeId];
  const president = currentPresidentOf(world);
  const nomination = world.history.events
    .filter(
      (event) =>
        event.type === CHIEF_JUSTICE_NOMINATED_EVENT &&
        event.tags.includes(`vacancy:${vacancyDate}`) &&
        event.participants.some(
          (row) => row.role === "focus:subject" && row.personId === nomineeId,
        ),
    )
    .at(-1);
  const nominatedBy = nomination?.participants.find(
    (row) => row.role === "focus:actor",
  )?.personId;
  if (
    !nominee ||
    isDead(world, nomineeId) ||
    !president ||
    !nominatedBy ||
    nominatedBy !== president.personId
  ) {
    return resolved(
      president
        ? scheduleNomination(world, vacancyDate, president.personId)
        : world,
      !nominee || isDead(world, nomineeId)
        ? "The nominee died before the vote; the President nominates again."
        : "The President who made the nomination has left office; the nomination lapses.",
    );
  }
  const briefed = briefSenateOnNominee(world, nomineeId);
  const vote = senateConfirmationVote(briefed, {
    stableKey: due.stableKey,
    nomineeId,
    presidentId: president.personId,
    nominationEventId: nomination!.id,
    officeKey: "us-chief-justice",
  });
  if (!vote)
    return pending(
      world,
      "governing:senate-not-seated",
      "The Chief Justice nomination remains pending until a seated Senate records its vote.",
    );
  let next = briefed;
  next = recordConfirmationVote(next, {
    stableKey: due.stableKey,
    nomineeId,
    officeTitle: CHIEF_JUSTICE_TITLE,
    vote,
    tags: ["office:us-chief-justice", `vacancy:${vacancyDate}`],
  }).world;
  if (vote.yeas + vote.nays === 0)
    return {
      world: next,
      status: "blocked",
      reasonKey: "governing:senate-no-decision",
      context:
        "The Senate recorded no yes or no vote; the Chief Justice nomination remains pending.",
      outcomeEventId: next.history.events.at(-1)!.id,
    };
  if (!vote.confirmed)
    return resolved(
      scheduleNomination(next, vacancyDate, president.personId),
      `The Senate rejected ${personName(nominee)}, ${vote.yeas} to ${vote.nays}.`,
      next.history.events.at(-1)!.id,
    );
  const associateSeats = associateJusticeSeatsHeldBy(next, nomineeId);
  next = recordWorldEvent(next, {
    stableKey: `${due.stableKey}:confirmed`,
    type: FEDERAL_TENURE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [nomineeId, nominatedBy],
    participants: [
      {
        personId: nomineeId,
        role: "focus:subject",
        detail: CHIEF_JUSTICE_TITLE,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CHIEF_JUSTICE_VACANCY_VERSION,
      "office:us-chief-justice",
      "basis:us-const-art-ii-s2-cl2",
      `vacancy:${vacancyDate}`,
      `provenance:${CHIEF_JUSTICE_VACANCY_PROFILE.id}`,
    ],
    summary: `The Senate confirmed ${personName(nominee)} as Chief Justice of the United States, ${vote.yeas} to ${vote.nays}.`,
    context: CONTEXT,
  });
  const confirmedEventId = next.history.events.at(-1)!.id;
  // The appointment is a favor from the President who named them.
  next = recordAppointmentFavor(next, {
    stableKey: `${due.stableKey}:appointed`,
    appointerPersonId: nominatedBy,
    appointeePersonId: nomineeId,
    post: CHIEF_JUSTICE_POST,
    eventId: confirmedEventId,
    subject: { kind: "none" },
  });
  for (const seat of associateSeats)
    next = openAssociateJusticeVacancy(next, {
      seatId: seat.seatId,
      vacancyDate: next.currentDate,
      formerHolderId: nomineeId,
      reason: "elevated",
    }).world;
  next = leaveCongressSeat(leaveLowerBench(next, nomineeId), nomineeId);
  return resolved(
    next,
    `${personName(nominee)} was confirmed as Chief Justice.`,
    confirmedEventId,
  );
}
