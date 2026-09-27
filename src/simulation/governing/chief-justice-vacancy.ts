import { addDays } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import {
  FEDERAL_VACANCY_EVENT,
  currentFederalTenure,
} from "../federal-tenures";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
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
 * The older 30/70-day game profile is retained for saved due items. A due
 * item cannot choose a nominee or cast Senate ballots. The judicial selection
 * writers require a recorded philosophy, explicit nomination and roll call.
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

/** A legacy due item cannot make the President's nomination for them. */
export function chiefJusticeNominationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  if (!/:nomination:(\d{4}-\d{2}-\d{2}):/.test(due.stableKey))
    return resolved(world, "No vacancy matches this nomination.");
  if (currentFederalTenure(world, "us-chief-justice"))
    return resolved(world, "The office of Chief Justice is already filled.");
  return {
    world,
    status: "blocked",
    reasonKey: "judiciary:presidential-nomination-required",
    context:
      "The Chief Justiceship remains vacant until the President records an eligible nominee.",
    outcomeEventId: null,
  };
}

/** Legacy due items cannot invent Senate consent or a federal tenure. */
export function confirmChiefJustice(
  world: World,
  due: FutureDueItem,
  _leaveCongressSeat: (world: World, personId: EntityId) => World,
): FutureTransitionHandlerResult {
  void _leaveCongressSeat;
  if (!/:confirmation:(\d{4}-\d{2}-\d{2}):(.+)$/.test(due.stableKey))
    return resolved(world, "No nomination matches.");
  if (currentFederalTenure(world, "us-chief-justice"))
    return resolved(world, "The office of Chief Justice is already filled.");
  return {
    world,
    status: "blocked",
    reasonKey: "judiciary:senate-consent-required",
    context:
      "The Chief Justiceship remains vacant without a recorded Senate confirmation vote.",
    outcomeEventId: null,
  };
}
