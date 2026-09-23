/**
 * The transition between winning an office and taking it up.
 *
 * A won election grants no authority on election night (DEPTH2 A08): public
 * authority begins when the applicable rule says the term begins. What a
 * winner has in between is a transition — orientation, organizing meetings,
 * office and staff arrangements — and that is what this module describes and
 * records.
 *
 * Every level has a profile and every profile behaves: its services open and
 * close on dated windows measured from the election and the term start, a
 * winner can attend one while its span is open, and a span that closes
 * unattended is recorded as missed rather than silently forgotten. What they
 * do not share is output — Congress, a state legislature, a governor's office
 * and a local body offer different services on different calendars.
 *
 * Coverage is said in the data, not implied by it:
 *
 * - `public-practice`: the service follows the published new-member practice
 *   of that institution (the House's and Senate's own orientation for members-
 *   elect). The detailed guide contents have been filed with research;
 *   when they return they replace the windows below, which are the usual
 *   calendar, not a specific year's dates.
 * - `blanket`: no jurisdiction-specific transition is coded. The blanket rule
 *   applies so the winner still has a transition, and `notCoded` says what is
 *   missing. State legislatures, state executive offices and local offices are
 *   blanket today; notable jurisdictions get their own profile when researched.
 *
 * Transition planning never spends the office's budget or exercises its powers
 * early. Attending a service records that the winner attended and nothing more;
 * the consequences a service would have in office are listed in `notCoded`
 * until a consumer reads the attendance record.
 */

import { addDays, makeIsoDate } from "./dates";
import {
  BLANKET_STATE_OATH_VERSION,
  isOathSwornOn,
  OATH_FORMS,
} from "./oath-of-office";
import type { OathForm, OathSwornOn } from "./oath-of-office";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, World } from "./types";

export const OFFICE_TRANSITION_SERVICE_ATTENDED =
  "election.transition-service-attended";

export type OfficeTransitionLevel =
  | "federal-house"
  | "federal-senate"
  | "state-legislature"
  | "state-executive"
  | "local";

export type OfficeTransitionCoverage = "public-practice" | "blanket";

/**
 * When a service can be attended, as whole days from the election (`after`)
 * or before the term begins (`before`). Both bounds are clamped to the actual
 * transition: never before the day after the election, never on or after the
 * first day of the term.
 */
export interface TransitionSpan {
  readonly opens:
    | { readonly daysAfterElection: number }
    | { readonly daysBeforeStart: number };
  readonly closes:
    | { readonly daysAfterElection: number }
    | { readonly daysBeforeStart: number };
}

export interface OfficeTransitionService {
  readonly key: string;
  /** Player-facing name of the service. */
  readonly title: string;
  /** Player-facing: what happens there, in the institution's own terms. */
  readonly description: string;
  readonly span: TransitionSpan;
}

export interface OfficeTransitionProfile {
  readonly key: string;
  readonly level: OfficeTransitionLevel;
  readonly coverage: OfficeTransitionCoverage;
  /**
   * Player-facing: what a winner here is called before the term begins, from
   * the office's name (for a legislature, the chamber's).
   */
  readonly electTitle: (officeName: string) => string;
  /** Player-facing: how the term begins. */
  readonly entry: string;
  /** Player-facing: the swearing-in, as this institution holds it. */
  readonly swearingIn: string;
  readonly services: readonly OfficeTransitionService[];
  /** Developer-facing: what this profile does not model yet. */
  readonly notCoded: readonly string[];
}

const COMMON_NOT_CODED = [
  "Taking the oath is recorded as a public event; not taking it does not yet withhold the office's powers, and no jurisdiction's deadline for taking it is coded. Each jurisdiction's actual ceremony (who administers it, where, the oath's text) is filed with research.",
  "What the oath is taken on, and whether it is sworn or affirmed, is recorded; nothing reacts to the choice yet. Past the federal minimum (4 U.S.C. 101), the oath's words are a blanket shared by every state, not any state's own text.",
  "Attending a service is recorded; no later office consumer reads the attendance yet, so it changes no staff, knowledge or standing.",
  "Attendance costs no game time yet; the services are not calendar activities.",
  "Other winners' transitions are not simulated; they take up office on the start date.",
] as const;

/**
 * The United States House. The term begins at noon on January 3 (Twentieth
 * Amendment §1). The Committee on House Administration runs New Member
 * Orientation in Washington in the weeks after the election, with the Clerk,
 * the Chief Administrative Officer and the Sergeant at Arms; the party
 * organizing meetings that elect leadership fall in the same weeks, and the
 * office-selection lottery closes orientation. Staff may be recruited during
 * the transition but go on the payroll only once the member is sworn in.
 */
const FEDERAL_HOUSE: OfficeTransitionProfile = {
  key: "us-house",
  level: "federal-house",
  coverage: "public-practice",
  electTitle: () => "Member-elect of the House",
  entry:
    "The term begins at noon on January 3, when the new House meets, elects its Speaker and swears in its members together.",
  swearingIn:
    "On the House floor the Speaker administers the oath to the new members together, right hand raised. Many repeat it afterward with the Speaker and their families for the photographs.",
  services: [
    {
      key: "house-new-member-orientation",
      title: "New Member Orientation",
      description:
        "A week in Washington run by the House's own administrators: the chamber's rules, ethics obligations, how an office is funded and run, and what the office allowance may and may not pay for.",
      span: {
        opens: { daysAfterElection: 7 },
        closes: { daysAfterElection: 21 },
      },
    },
    {
      key: "house-party-organizing",
      title: "Party organizing meetings",
      description:
        "Each party's members and members-elect meet to adopt their rules and elect their leaders for the new Congress.",
      span: {
        opens: { daysAfterElection: 7 },
        closes: { daysAfterElection: 21 },
      },
    },
    {
      key: "house-office-lottery",
      title: "Office lottery",
      description:
        "New members draw numbers, and choose their office suites in that order.",
      span: {
        opens: { daysAfterElection: 18 },
        closes: { daysAfterElection: 22 },
      },
    },
    {
      key: "house-staff-planning",
      title: "Staff interviews",
      description:
        "Meet people for the Washington and district offices. Nobody is paid by the House before you are sworn in.",
      span: {
        opens: { daysAfterElection: 1 },
        closes: { daysBeforeStart: 1 },
      },
    },
  ],
  notCoded: [
    ...COMMON_NOT_CODED,
    "The player cannot run for the House yet; this profile serves the day that candidacy exists.",
    "Windows are the usual November calendar, not a specific Congress's published schedule.",
  ],
};

/**
 * The United States Senate. The term begins at noon on January 3 (Twentieth
 * Amendment §1). The Secretary of the Senate and the Sergeant at Arms hold
 * orientation for senators-elect after the election, the party conferences
 * organize in the same weeks, and a new senator is sworn in by the presiding
 * officer, escorted by the state's other senator by custom.
 */
const FEDERAL_SENATE: OfficeTransitionProfile = {
  key: "us-senate",
  level: "federal-senate",
  coverage: "public-practice",
  electTitle: () => "Senator-elect",
  entry:
    "The term begins at noon on January 3. New senators take the oath in the chamber, customarily escorted by their state's other senator.",
  swearingIn:
    "The Vice President administers the oath at the front of the chamber to new senators a few at a time, each walked down the aisle by a colleague, and each signs the oath book.",
  services: [
    {
      key: "senate-orientation",
      title: "Senate orientation",
      description:
        "Sessions with the Senate's own officers on its rules, ethics obligations, office budgets and how a Senate office is staffed.",
      span: {
        opens: { daysAfterElection: 7 },
        closes: { daysAfterElection: 21 },
      },
    },
    {
      key: "senate-conference-organizing",
      title: "Party conference meetings",
      description:
        "Each party's senators and senators-elect meet to choose their leaders for the new Congress.",
      span: {
        opens: { daysAfterElection: 7 },
        closes: { daysAfterElection: 21 },
      },
    },
    {
      key: "senate-staff-planning",
      title: "Staff interviews",
      description:
        "Meet people for the Washington and state offices. Nobody is paid by the Senate before you are sworn in.",
      span: {
        opens: { daysAfterElection: 1 },
        closes: { daysBeforeStart: 1 },
      },
    },
  ],
  notCoded: [
    ...COMMON_NOT_CODED,
    "The player cannot run for the Senate yet; this profile serves the day that candidacy exists.",
    "Office suite assignment by seniority is not modelled.",
    "Windows are the usual November calendar, not a specific Congress's published schedule.",
  ],
};

/** Blanket: no state's own legislative transition is coded. */
/**
 * Blanket: no state's own legislative transition is coded. Its services are
 * anchored to the session rather than the election, because that is when a
 * legislature organizes: a first election the game dates in February still
 * meets its caucus in the weeks before a January term, not ten months early.
 */
const STATE_LEGISLATURE_BLANKET: OfficeTransitionProfile = {
  key: "state-legislature-blanket",
  level: "state-legislature",
  coverage: "blanket",
  electTitle: (chamber) => `Member-elect of the ${chamber}`,
  entry:
    "The seat is yours from the first day of the term, when members take the oath and the chamber organizes.",
  swearingIn:
    "On the opening day of the session the members take the oath together in the chamber, with families in the gallery.",
  services: [
    {
      key: "legislature-new-member-orientation",
      title: "New legislator orientation",
      description:
        "The legislature's own staff walk new members through the chamber's rules, how a bill moves, ethics and disclosure obligations, and what the office provides.",
      span: {
        opens: { daysBeforeStart: 60 },
        closes: { daysBeforeStart: 7 },
      },
    },
    {
      key: "legislature-caucus-organizing",
      title: "Caucus meeting",
      description:
        "Your party's members and members-elect meet to choose who will lead them in the new session.",
      span: {
        opens: { daysBeforeStart: 56 },
        closes: { daysBeforeStart: 1 },
      },
    },
    {
      key: "legislature-committee-requests",
      title: "Committee requests",
      description:
        "Tell your caucus leaders which committees you want to sit on, and why.",
      span: {
        opens: { daysBeforeStart: 45 },
        closes: { daysBeforeStart: 14 },
      },
    },
  ],
  notCoded: [
    ...COMMON_NOT_CODED,
    "No state's own new-member orientation, caucus calendar or committee assignment process is coded; every state legislature uses this blanket profile.",
    "Committee requests are not read by any committee assignment.",
  ],
};

/**
 * Blanket: no state's own gubernatorial transition statute is coded. Taking up
 * the term still requires the existing recorded qualification, which this
 * profile points to rather than duplicates.
 */
const STATE_EXECUTIVE_BLANKET: OfficeTransitionProfile = {
  key: "state-executive-blanket",
  level: "state-executive",
  coverage: "blanket",
  electTitle: (officeTitle) => `${officeTitle}-elect`,
  entry:
    "The office is yours from the first day of the term, when you take the oath. The office's requirements are checked for you; nothing has to be filed.",
  swearingIn:
    "At the inauguration, before a public audience at the capitol, a judge administers the oath of office.",
  services: [
    {
      key: "executive-transition-team",
      title: "Assemble a transition team",
      description:
        "Pick the people who will plan the first months: who to keep, who to appoint, what to do first. Planning is not governing; the office's budget and powers stay with the incumbent until the term begins.",
      span: {
        opens: { daysAfterElection: 1 },
        closes: { daysBeforeStart: 1 },
      },
    },
    {
      key: "executive-outgoing-briefing",
      title: "Briefing from the outgoing administration",
      description:
        "The departing office walks your team through what is pending: the budget in progress, open matters and the agencies' own reports.",
      span: {
        opens: { daysAfterElection: 7 },
        closes: { daysBeforeStart: 7 },
      },
    },
  ],
  notCoded: [
    ...COMMON_NOT_CODED,
    "No state's own transition statute, appropriation or office space is coded; every state executive office uses this blanket profile.",
    "The transition team names nobody and appoints nobody.",
  ],
};

/**
 * Blanket: no locality's own transition is coded, and no notable unique local
 * transition has been researched. The player cannot win a local office yet.
 */
const LOCAL_BLANKET: OfficeTransitionProfile = {
  key: "local-blanket",
  level: "local",
  coverage: "blanket",
  electTitle: (officeTitle) => `${officeTitle}, elect`,
  entry: "The office is yours once you take the oath at the start of the term.",
  swearingIn:
    "The oath is administered at the start of the term, before the new body's first meeting.",
  services: [
    {
      key: "local-orientation",
      title: "Orientation with the clerk",
      description:
        "The clerk and senior staff explain meetings, public records, open-meeting obligations and how the budget is adopted.",
      span: {
        opens: { daysAfterElection: 7 },
        closes: { daysBeforeStart: 1 },
      },
    },
  ],
  notCoded: [
    ...COMMON_NOT_CODED,
    "The player cannot run for a local office yet.",
    "No locality's own transition is coded, and no notable unique local transition has been researched.",
  ],
};

export const OFFICE_TRANSITION_PROFILES: readonly OfficeTransitionProfile[] = [
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  STATE_LEGISLATURE_BLANKET,
  STATE_EXECUTIVE_BLANKET,
  LOCAL_BLANKET,
];

/** Every level resolves to a profile: a missing one is the blanket, never none. */
export function officeTransitionProfile(
  level: OfficeTransitionLevel,
): OfficeTransitionProfile {
  return OFFICE_TRANSITION_PROFILES.find((profile) => profile.level === level)!;
}

export interface DatedTransitionService extends OfficeTransitionService {
  readonly opensOn: IsoDate;
  /** Last day the service can be attended. */
  readonly closesOn: IsoDate;
}

function windowDate(
  bound: TransitionSpan["opens"],
  electionDate: IsoDate,
  startsAt: IsoDate,
): IsoDate {
  return "daysAfterElection" in bound
    ? addDays(electionDate, bound.daysAfterElection)
    : addDays(startsAt, -bound.daysBeforeStart);
}

/**
 * The profile's services on this transition's calendar. A service whose
 * span does not fit between the day after the election and the day before
 * the term begins is left out: a short transition offers less, it does not
 * push a service into office time.
 */
export function datedTransitionServices(
  profile: OfficeTransitionProfile,
  electionDate: IsoDate,
  startsAt: IsoDate,
): readonly DatedTransitionService[] {
  const first = addDays(electionDate, 1);
  const last = addDays(startsAt, -1);
  if (last < first) return [];
  return profile.services.flatMap((service) => {
    const opens = windowDate(service.span.opens, electionDate, startsAt);
    const closes = windowDate(service.span.closes, electionDate, startsAt);
    const opensOn = opens < first ? first : opens;
    const closesOn = closes > last ? last : closes;
    return closesOn < opensOn ? [] : [{ ...service, opensOn, closesOn }];
  });
}

export type TransitionServiceStatus =
  "upcoming" | "open" | "attended" | "missed";

export function transitionServiceAttendance(
  world: World,
  personId: EntityId,
  contestId: EntityId,
  serviceKey: string,
) {
  return (
    world.history.events.find(
      (event) =>
        event.type === OFFICE_TRANSITION_SERVICE_ATTENDED &&
        event.stableKey ===
          transitionAttendanceKey(personId, contestId, serviceKey),
    ) ?? null
  );
}

function transitionAttendanceKey(
  personId: EntityId,
  contestId: EntityId,
  serviceKey: string,
) {
  return `office-transition:${contestId}:${personId}:${serviceKey}`;
}

export function transitionServiceStatus(
  world: World,
  personId: EntityId,
  contestId: EntityId,
  service: DatedTransitionService,
): TransitionServiceStatus {
  if (transitionServiceAttendance(world, personId, contestId, service.key))
    return "attended";
  if (world.currentDate < service.opensOn) return "upcoming";
  if (world.currentDate > service.closesOn) return "missed";
  return "open";
}

/**
 * The winner attends a service while its span is open. Records the
 * attendance and nothing else; refuses without changing the World when the
 * span is not open, and is a no-op once attended.
 */
export function attendTransitionService(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly contestId: EntityId;
    readonly jurisdictionId: EntityId;
    /** What the winner is called until the term begins. */
    readonly electTitle: string;
    readonly profile: OfficeTransitionProfile;
    readonly service: DatedTransitionService;
  },
): World {
  const status = transitionServiceStatus(
    world,
    input.personId,
    input.contestId,
    input.service,
  );
  if (status === "attended") return world;
  if (status !== "open")
    throw new Error(
      status === "upcoming"
        ? `${input.service.title} does not open until ${input.service.opensOn}.`
        : `${input.service.title} closed on ${input.service.closesOn}.`,
    );
  return recordWorldEvent(world, {
    stableKey: transitionAttendanceKey(
      input.personId,
      input.contestId,
      input.service.key,
    ),
    type: OFFICE_TRANSITION_SERVICE_ATTENDED,
    occurredAt: makeIsoDate(world.currentDate),
    recordedAt: makeIsoDate(world.currentDate),
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.personId, input.contestId],
    participants: [
      {
        personId: input.personId,
        role: "focus:officeholder",
        detail: `Attended ${input.service.title} as ${input.electTitle}.`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `office-transition:${input.profile.key}`,
      `office-transition-service:${input.service.key}`,
    ],
    summary: `Attended ${input.service.title} as ${input.electTitle}.`,
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

export const OFFICE_OATH_TAKEN = "office.oath-taken";

function oathKey(personId: EntityId, contestId: EntityId) {
  return `office-oath:${contestId}:${personId}`;
}

const OATH_SWORN_ON_TAG = "oath-sworn-on:";
const OATH_FORM_TAG = "oath-form:";

/**
 * What an oath was taken on, and whether it was sworn or affirmed. Null for
 * an oath recorded before the choice existed: that is unknown, not "nothing".
 */
export function oathChoiceOf(event: {
  readonly tags: readonly string[];
}): { readonly swornOn: OathSwornOn; readonly form: OathForm } | null {
  const swornOn = event.tags
    .find((tag) => tag.startsWith(OATH_SWORN_ON_TAG))
    ?.slice(OATH_SWORN_ON_TAG.length);
  const form = event.tags
    .find((tag) => tag.startsWith(OATH_FORM_TAG))
    ?.slice(OATH_FORM_TAG.length);
  if (!swornOn || !isOathSwornOn(swornOn)) return null;
  if (form !== "swear" && form !== "affirm") return null;
  return { swornOn, form };
}

/** The recorded swearing-in for this term, if the officeholder has taken it. */
export function oathOfOfficeRecord(
  world: World,
  personId: EntityId,
  contestId: EntityId,
) {
  return (
    world.history.events.find(
      (event) =>
        event.type === OFFICE_OATH_TAKEN &&
        event.stableKey === oathKey(personId, contestId),
    ) ?? null
  );
}

/**
 * The officeholder is sworn in. A public event on or after the first day of
 * the term: before it the office is not theirs to swear into, and the World is
 * left unchanged with a refusal. Taking it twice records once.
 */
export function takeOathOfOffice(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly contestId: EntityId;
    readonly jurisdictionId: EntityId;
    /** The office as it is held, e.g. "Member of the House of Representatives". */
    readonly officeTitle: string;
    readonly startsAt: IsoDate;
    readonly profile: OfficeTransitionProfile;
    /** What the officeholder places a hand on, and whether they swear or affirm. */
    readonly swornOn: OathSwornOn;
    readonly form: OathForm;
  },
): World {
  if (oathOfOfficeRecord(world, input.personId, input.contestId)) return world;
  if (!isOathSwornOn(input.swornOn) || !OATH_FORMS.includes(input.form))
    throw new Error("Choose what to swear on, and whether to swear or affirm.");
  if (world.currentDate < input.startsAt)
    throw new Error(
      `The term does not begin until ${input.startsAt}; there is no oath to take yet.`,
    );
  const summary = `Sworn in as ${input.officeTitle}.`;
  return recordWorldEvent(world, {
    stableKey: oathKey(input.personId, input.contestId),
    type: OFFICE_OATH_TAKEN,
    occurredAt: makeIsoDate(world.currentDate),
    recordedAt: makeIsoDate(world.currentDate),
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.personId, input.contestId],
    participants: [
      {
        personId: input.personId,
        role: "focus:officeholder",
        detail: summary,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `office-transition:${input.profile.key}`,
      "office-oath",
      `${OATH_SWORN_ON_TAG}${input.swornOn}`,
      `${OATH_FORM_TAG}${input.form}`,
      BLANKET_STATE_OATH_VERSION,
    ],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: `${input.form}:${input.swornOn}`,
      motivation: null,
      immediateReaction: null,
    },
  });
}
