import { addDays, makeIsoDate } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import {
  FEDERAL_TENURE_EVENT,
  FEDERAL_VACANCY_EVENT,
  currentFederalTenure,
} from "../federal-tenures";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";

/**
 * THE CHIEF JUSTICESHIP FALLS VACANT — U.S. Const. art. II, § 2, cl. 2: the
 * President "shall nominate, and by and with the Advice and Consent of the
 * Senate, shall appoint ... Judges of the supreme Court". The Constitution
 * sets no age, citizenship or residence requirement for a justice.
 *
 * The route is law; its pace and its choices are not, and each is marked:
 *
 * PLACEHOLDER (filed as `chief-justice-vacancy-nomination-and-confirmation`):
 * - how long a President takes to name a nominee and how long the Senate
 *   takes to vote. The profile below is a game profile, not a finding.
 * - whom a President nominates. The game models no judges and has no rule for
 *   whom a President would choose. Blanket rule meanwhile: an even draw among
 *   every living adult in the World, other than the President, the Vice
 *   President and the player's own character, who would have to be asked.
 * - how the Senate votes. Blanket rule meanwhile: the Senate confirms.
 * - a sitting associate justice being elevated, and the associate seat that
 *   would then open, are not modeled: the game seats no associate justices.
 */
export const CHIEF_JUSTICE_VACANCY_VERSION =
  "governing-chief-justice-vacancy-v1";
export const CHIEF_JUSTICE_NOMINATION =
  "governing:chief-justice-nomination" as const;
export const CHIEF_JUSTICE_CONFIRMATION =
  "governing:chief-justice-confirmation" as const;
export const CHIEF_JUSTICE_NOMINATED_EVENT =
  "governing.chief-justice-nominated" as const;

export const CHIEF_JUSTICE_VACANCY_PROFILE = {
  id: "ocd-chief-justice-vacancy-game-profile/v1",
  daysFromVacancyToNomination: 30,
  daysFromNominationToConfirmation: 70,
} as const;

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

/** The President names a nominee. */
export function chiefJusticeNominationHandler(
  world: World,
  due: FutureDueItem,
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
  // PLACEHOLDER: whom the President chooses (see the profile above).
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const vice = currentFederalTenure(world, "us-vice-president")?.personId;
  const pool = Object.values(world.people)
    .filter(
      (person) =>
        person.id !== president.personId &&
        person.id !== controlled &&
        person.id !== vice &&
        !isDead(world, person.id) &&
        ageOn(person.birthDate, world.currentDate) >= ADULT_AGE,
    )
    .map((person) => person.id)
    .sort();
  if (!pool.length)
    return resolved(world, "Nobody in the World can be nominated.");
  const nomineeId = new SeededRng(world.seed).fork(due.stableKey).pick(pool);
  const presidentName = personName(world.people[president.personId]!);
  const nomineeName = personName(world.people[nomineeId]!);
  let next = recordWorldEvent(world, {
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
  if (!nominee || isDead(world, nomineeId)) {
    const president = currentPresidentOf(world);
    return resolved(
      president
        ? scheduleNomination(world, vacancyDate, president.personId)
        : world,
      "The nominee died before the vote; the President nominates again.",
    );
  }
  let next = recordWorldEvent(world, {
    stableKey: `${due.stableKey}:confirmed`,
    type: FEDERAL_TENURE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [nomineeId],
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
    summary: `The Senate confirmed ${personName(nominee)} as Chief Justice of the United States.`,
    context: CONTEXT,
  });
  const confirmedEventId = next.history.events.at(-1)!.id;
  next = leaveCongressSeat(next, nomineeId);
  return resolved(
    next,
    `${personName(nominee)} was confirmed as Chief Justice.`,
    confirmedEventId,
  );
}
