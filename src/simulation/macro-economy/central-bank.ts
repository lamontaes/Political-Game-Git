/**
 * THE CENTRAL BANK IS PEOPLE (Build 19; Lamontae's note, Claude CTO's 9:35
 * p.m. rulings on September 28, 2026: "be sure things aren't hard-coded ...
 * maybe the only thing you should be able to do [is be] the Fed chair").
 *
 * A board of seven governors, one of them the chair, sets the policy rate at
 * scheduled meetings. Each governor is a person with their own temperament
 * and their own view of the trade-off between prices and jobs. At a meeting
 * every governor reads the same published numbers and weighs them through
 * the ordinary decision engine (`rate-choice.ts`, `decisions.ts`). Nothing
 * computes the rate from a formula.
 *
 * Governors and the chair are nominated by the President and confirmed by
 * the Senate when a seat opens (a term ends, or a member dies). A governor
 * whose term has ended serves until a successor is confirmed, as the law
 * provides (12 U.S.C. 242). The chair presides; the proposal carries unless
 * a majority of the committee's voters wanted to move the other way. The law is the route: seven governors appointed
 * by the President with the Senate's advice and consent for fourteen-year
 * terms, and a chair designated from among them for four years (12 U.S.C.
 * 241 and 242).
 *
 * The rate is voted by the real committee's twelve (Claude CTO's 10:32 p.m.
 * addendum, from Lamontae): the seven governors, the New York reserve
 * bank's president, and four of the other eleven reserve bank presidents in
 * the statutory yearly rotation (12 U.S.C. 263). Every reserve bank's
 * president is a person; the voting four change each January.
 *
 * Game profiles, each with its recorded basis:
 * 1. A reserve bank president is chosen by the bank's own directors and
 *    approved by the board. The game records a 90-day succession interval,
 *    the same interval this profile uses for every reserve bank. A president
 *    retires at the first five-year term end (the last day of February in a
 *    year ending in 1 or 6, 12 U.S.C. 341) at which they are 65 or older.
 * 2. The President nominates a governor from eligible people they know, using
 *    the game's ordinary appointment decision. The chair comes from sitting
 *    governors. The recorded profile allows 30 days to nominate and 70 days
 *    for confirmation, matching the game's federal judicial appointment
 *    profile; the Senate confirms unless the nominee dies or the nominating
 *    President leaves office.
 * 3. The meeting calendar records the eight months in the Committee's usual
 *    schedule: January, March, May, June, July, September, November and
 *    December. The meeting occurs when that month's figures close.
 * 4. The player can hold the chair: when the chair is the person the player
 *    controls, the game never decides for them; the rate holds until the
 *    player records a choice for the meeting (`chooseCentralBankRate`).
 */

import {
  inventedPersonBirthDate,
  type InventedPersonRole,
} from "../invented-person-age";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "../character-history";
import { currentPresidentOf } from "../crisis/offices";
import { currentFederalTenure } from "../federal-tenures";
import { evaluateDecision } from "../decisions";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { prepareOpeningFederalGeography } from "../opening-federal-geography";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { personTrait } from "../people-traits";
import type { TraitValue } from "../people-trait-definitions";
import { generatePersonIdentity } from "../person-identity";
import { currentHistoricalCutoff } from "../queries";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  appointmentCircle,
  chooseAppointee,
  recordPassedOver,
} from "../patronage/appointments";
import { federalColleaguesOf } from "../patronage/federal-circle";
import { MACRO_CREDIT_POLICY } from "./credit";
import {
  RATE_OPTIONS,
  rateConsiderations,
  rateMoveOf,
  type RateOptionKey,
  type RateReadings,
  type RateSetterView,
} from "./rate-choice";
import type { MacroEconomyStore, MacroPolicyRateRange } from "./types";

export const CENTRAL_BANK_VERSION = "central-bank-board-v1" as const;
export const CENTRAL_BANK_APPOINTED_EVENT = "economy.central-bank-appointed";
export const CENTRAL_BANK_NOMINATED_EVENT = "economy.central-bank-nominated";
export const CENTRAL_BANK_RATE_EVENT = "economy.policy-rate-decided";

export const CENTRAL_BANK_PROFILE = {
  id: "ocd-central-bank-game-profile/v1",
  seats: 7,
  /** 12 U.S.C. 242: fourteen-year terms, one ending every two years. */
  governorTermYears: 14,
  /** 12 U.S.C. 242: a chair designated for four years. */
  chairTermYears: 4,
  /** RECORDED: eight-month Committee calendar described in the file comment. */
  meetingMonths: [1, 3, 5, 6, 7, 9, 11, 12] as readonly number[],
  /** GAME PROFILE: the federal judicial appointment intervals used in game. */
  daysFromVacancyToNomination: 30,
  daysFromNominationToConfirmation: 70,
  /** The lowest the rate range's middle may go: a range of 0 to 0.25. */
  floorMidPct: 0.125,
  /** A board member's age range when first seated at the opening. */
  /** Before five years of published unemployment, the board's working normal rate. */
  fallbackNormalUnemploymentPct: 4.4,
  /** Months of published unemployment the board averages for its normal rate. */
  normalUnemploymentMonths: 240,
  /** GAME PROFILE: one succession interval shared by all twelve reserve banks. */
  daysToSeatReserveBankPresident: 90,
  /** RECORDED: Board policy requires retirement at 65, subject to term rules. */
  reserveBankPresidentRetirementAge: 65,
  /** A reserve bank president's age range when first seated at the opening. */
} as const;

/** The twelve reserve banks, in district order. */
export const RESERVE_BANKS = [
  { key: "boston", city: "Boston" },
  { key: "new-york", city: "New York" },
  { key: "philadelphia", city: "Philadelphia" },
  { key: "cleveland", city: "Cleveland" },
  { key: "richmond", city: "Richmond" },
  { key: "atlanta", city: "Atlanta" },
  { key: "chicago", city: "Chicago" },
  { key: "st-louis", city: "St. Louis" },
  { key: "minneapolis", city: "Minneapolis" },
  { key: "kansas-city", city: "Kansas City" },
  { key: "dallas", city: "Dallas" },
  { key: "san-francisco", city: "San Francisco" },
] as const;
export type ReserveBankKey = (typeof RESERVE_BANKS)[number]["key"];

/**
 * The four rotating votes (12 U.S.C. 263(a)): one each from Boston,
 * Philadelphia and Richmond; Chicago and Cleveland; St. Louis, Dallas and
 * Atlanta; and Kansas City, Minneapolis and San Francisco, in the order the
 * committee has rotated them (2025: Boston, Chicago, St. Louis, Kansas
 * City; 2026: Philadelphia, Cleveland, Dallas, Minneapolis).
 */
const ROTATION: readonly (readonly ReserveBankKey[])[] = [
  ["boston", "philadelphia", "richmond"],
  ["chicago", "cleveland"],
  ["st-louis", "dallas", "atlanta"],
  ["kansas-city", "minneapolis", "san-francisco"],
];
const ROTATION_ANCHOR_YEAR = 2025;

/** The reserve banks whose presidents vote in a year: New York and four more. */
export function votingReserveBanks(year: number): readonly ReserveBankKey[] {
  return [
    "new-york",
    ...ROTATION.map((group) => {
      const step = (year - ROTATION_ANCHOR_YEAR) % group.length;
      return group[(step + group.length) % group.length]!;
    }),
  ];
}

export interface ReserveBankPresidentSeat {
  readonly bank: ReserveBankKey;
  readonly personId: EntityId;
  readonly since: IsoDate;
  readonly appointedEventId: EntityId;
  readonly inflationLean: TraitValue;
}

export interface CentralBankSeat {
  readonly seat: number;
  readonly personId: EntityId;
  readonly termEnds: IsoDate;
  readonly appointedEventId: EntityId;
  readonly inflationLean: TraitValue;
}

export interface CentralBankNomination {
  readonly office: "governor" | "chair";
  readonly seat: number;
  readonly nomineeId: EntityId;
  readonly presidentId: EntityId;
  readonly nominatedAt: IsoDate;
  readonly confirmationDue: IsoDate;
  readonly eventId: EntityId;
}

export interface CentralBankState {
  readonly version: typeof CENTRAL_BANK_VERSION;
  readonly seats: readonly (CentralBankSeat | null)[];
  readonly chair: {
    readonly personId: EntityId;
    readonly termEnds: IsoDate;
    readonly appointedEventId: EntityId;
  } | null;
  readonly nominations: readonly CentralBankNomination[];
  /** When each open seat or the chair fell open, so a nomination follows. */
  readonly openings: readonly {
    readonly office: "governor" | "chair";
    readonly seat: number;
    readonly since: IsoDate;
  }[];
  /** The rate in force, set by the last meeting. */
  readonly policyRate: MacroPolicyRateRange;
  readonly lastMeetingAt: IsoDate | null;
  /** A choice the player, as chair, recorded for the next meeting. */
  readonly chairChoice: RateOptionKey | null;
  /**
   * The twelve reserve banks' presidents, in district order; null while a
   * bank's seat is open. Absent on a board seated before presidents were.
   */
  readonly presidents?: readonly (ReserveBankPresidentSeat | null)[];
  readonly presidentOpenings?: readonly {
    readonly bank: ReserveBankKey;
    readonly since: IsoDate;
  }[];
}

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function isDead(world: World, personId: EntityId): boolean {
  return world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

/**
 * A member's view of prices against jobs, drawn once from their own stream
 * when they join the board and recorded on the appointment. It is a
 * GAME PROFILE: people differ on it, and nothing about a person's name,
 * place or background sets it.
 */
function drawInflationLean(world: World, personId: EntityId): TraitValue {
  return new SeededRng(world.seed)
    .fork(`${CENTRAL_BANK_VERSION}:view:${personId}`)
    .integer(-2, 3) as TraitValue;
}

function leanWords(lean: TraitValue): string {
  if (lean >= 2) return "fears inflation above all";
  if (lean === 1) return "leans toward holding prices down";
  if (lean === 0) return "weighs prices and jobs evenly";
  if (lean === -1) return "leans toward protecting jobs";
  return "fears lost jobs above all";
}

function seatTermEnds(seat: number, fromYear: number): IsoDate {
  // Terms end on January 31 of even years, one seat every two years.
  const firstEven = fromYear % 2 === 0 ? fromYear + 2 : fromYear + 1;
  return makeIsoDate(`${firstEven + 2 * seat}-01-31`);
}

function withBank(world: World, bank: CentralBankState): World {
  return {
    ...world,
    macroEconomy: { ...world.macroEconomy!, centralBank: bank },
  };
}

function recordAppointment(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly office: "governor" | "chair" | "reserve-bank-president";
    readonly seat: number;
    readonly termEnds: IsoDate | null;
    readonly lean: TraitValue;
    readonly basis: "opening" | "confirmed" | "chosen";
  },
): { world: World; eventId: EntityId } {
  const person = world.people[input.personId]!;
  const city =
    input.office === "reserve-bank-president"
      ? RESERVE_BANKS[input.seat]!.city
      : null;
  const title =
    input.office === "chair"
      ? "Chair of the central bank's board"
      : city
        ? `President of the ${city} reserve bank`
        : "Governor on the central bank's board";
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: CENTRAL_BANK_APPOINTED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.personId],
    participants: [
      { personId: input.personId, role: "focus:subject", detail: title },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CENTRAL_BANK_VERSION,
      `office:central-bank-${input.office}`,
      `seat:${input.seat}`,
      ...(input.termEnds ? [`term-end:${input.termEnds}`] : []),
      ...(city ? [`reserve-bank:${RESERVE_BANKS[input.seat]!.key}`] : []),
      `view:inflation-lean:${input.lean}`,
      `basis:${input.basis}`,
    ],
    summary: city
      ? input.basis === "opening"
        ? `${personName(person)} is president of the ${city} reserve bank, and ${leanWords(input.lean)}.`
        : `The ${city} reserve bank's directors chose ${personName(person)} as its president, and the central bank's board approved.`
      : input.basis === "opening"
        ? `${personName(person)} sits on the central bank's board as ${input.office === "chair" ? "its chair" : "a governor"}, and ${leanWords(input.lean)}.`
        : `The Senate confirmed ${personName(person)} as ${input.office === "chair" ? "chair of the central bank's board" : "a governor on the central bank's board"}.`,
    context: CONTEXT,
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

/**
 * New people for the central bank: each a generated person with a name, a
 * birth date in the age range, and a home and birthplace, as the opening's
 * federal officials are.
 */
function generateBoardPeople(
  world: World,
  stableKeys: readonly string[],
  role: InventedPersonRole,
): { world: World; personIds: EntityId[] } {
  let next = world;
  const inputs: CharacterHistoryContextPersonInput[] = [];
  for (const stableKey of stableKeys) {
    const rng = new SeededRng(world.seed).fork(stableKey);
    const geography = prepareOpeningFederalGeography(next, stableKey);
    next = geography.world;
    inputs.push({
      stableKey,
      ...drawCanonicalNamedIdentity(
        rng.fork("name"),
        generatePersonIdentity(rng.fork("identity")),
      ),
      birthDate: inventedPersonBirthDate(rng, {
        role,
        referenceDate: world.currentDate,
      }),
      homeJurisdictionId: geography.homeJurisdictionId,
      birthplaceJurisdictionId: geography.birthplaceJurisdictionId,
    });
  }
  next = createCharacterHistoryContextPeople(next, inputs);
  return {
    world: next,
    personIds: inputs.map((input) =>
      characterHistoryContextPersonId(next, input.stableKey),
    ),
  };
}

/**
 * Seats the opening board: seven generated governors with staggered terms
 * and a chair among them, and the retained reference rate in force. Once;
 * a world without macro history gets nothing.
 */
export function ensureCentralBankSeated(
  world: World,
  policyRate: MacroPolicyRateRange,
): World {
  const store = world.macroEconomy;
  if (!store || store.centralBank) return world;
  const year = Number(world.currentDate.slice(0, 4));
  const stableKeys = Array.from(
    { length: CENTRAL_BANK_PROFILE.seats },
    (_, seat) => `${CENTRAL_BANK_VERSION}:opening:seat:${seat}`,
  );
  const people = generateBoardPeople(
    world,
    stableKeys,
    "central-bank-governor-at-opening",
  );
  let next = people.world;
  const seats: CentralBankSeat[] = [];
  for (const [seat, stableKey] of stableKeys.entries()) {
    const personId = people.personIds[seat]!;
    const input = { stableKey };
    const lean = drawInflationLean(next, personId);
    const termEnds = seatTermEnds(seat, year);
    const recorded = recordAppointment(next, {
      stableKey: `${input.stableKey}:appointed`,
      personId,
      office: "governor",
      seat,
      termEnds,
      lean,
      basis: "opening",
    });
    next = recorded.world;
    seats.push({
      seat,
      personId,
      termEnds,
      appointedEventId: recorded.eventId,
      inflationLean: lean,
    });
  }
  const chairSeat = new SeededRng(world.seed)
    .fork(`${CENTRAL_BANK_VERSION}:opening:chair`)
    .integer(0, seats.length);
  const chairTermEnds = makeIsoDate(
    `${year + new SeededRng(world.seed).fork(`${CENTRAL_BANK_VERSION}:opening:chair-term`).integer(1, CENTRAL_BANK_PROFILE.chairTermYears + 1)}-${world.currentDate.slice(5)}`,
  );
  const chair = recordAppointment(next, {
    stableKey: `${CENTRAL_BANK_VERSION}:opening:chair:appointed`,
    personId: seats[chairSeat]!.personId,
    office: "chair",
    seat: chairSeat,
    termEnds: chairTermEnds,
    lean: seats[chairSeat]!.inflationLean,
    basis: "opening",
  });
  next = chair.world;
  return withBank(next, {
    version: CENTRAL_BANK_VERSION,
    seats,
    chair: {
      personId: seats[chairSeat]!.personId,
      termEnds: chairTermEnds,
      appointedEventId: chair.eventId,
    },
    nominations: [],
    openings: [],
    policyRate,
    lastMeetingAt: null,
    chairChoice: null,
  });
}

/** Who may be nominated to a governor's seat under the recorded appointment rules. */
function nomineePool(world: World, bank: CentralBankState): EntityId[] {
  const president = currentPresidentOf(world)?.personId;
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const vice = currentFederalTenure(world, "us-vice-president")?.personId;
  const governors = new Set(
    currentStateExecutiveHolders(world).map((holder) => holder.personId),
  );
  const sitting = new Set(
    bank.seats.flatMap((seat) => (seat ? [seat.personId] : [])),
  );
  const pending = new Set(bank.nominations.map((row) => row.nomineeId));
  // LAW: a member of Congress may hold no other federal office while serving
  // (U.S. Constitution, art. I, sec. 6, cl. 2), and the game has no way yet
  // for a nominee to resign a seat to take one.
  const barred = new Set(federalColleaguesOf(world));
  return Object.values(world.people)
    .filter(
      (person) =>
        person.id !== president &&
        !barred.has(person.id) &&
        person.id !== controlled &&
        person.id !== vice &&
        !governors.has(person.id) &&
        !sitting.has(person.id) &&
        !pending.has(person.id) &&
        !isDead(world, person.id) &&
        ageOnDate(person.birthDate, world.currentDate) >= 30,
    )
    .map((person) => person.id)
    .sort();
}

/** Seats and the chair whose holder died or whose term ended. */
function findOpenings(world: World, bank: CentralBankState): CentralBankState {
  const today = world.currentDate;
  const openings = [...bank.openings];
  const has = (office: "governor" | "chair", seat: number) =>
    openings.some((row) => row.office === office && row.seat === seat) ||
    bank.nominations.some((row) => row.office === office && row.seat === seat);
  const seats = bank.seats.map((seat, index) => {
    if (seat && isDead(world, seat.personId)) {
      if (!has("governor", index))
        openings.push({ office: "governor", seat: index, since: today });
      return null;
    }
    // A governor past their term serves until a successor is confirmed.
    if (seat && seat.termEnds <= today && !has("governor", index))
      openings.push({ office: "governor", seat: index, since: today });
    return seat;
  });
  let chair = bank.chair;
  if (
    chair &&
    (isDead(world, chair.personId) ||
      chair.termEnds <= today ||
      !seats.some((seat) => seat?.personId === chair!.personId))
  ) {
    chair = null;
  }
  if (!chair && !has("chair", 0))
    openings.push({ office: "chair", seat: 0, since: today });
  return { ...bank, seats, chair, openings };
}

/** Nominate only the person selected by the President’s recorded decision. */
function nominate(
  world: World,
  bank: CentralBankState,
): {
  world: World;
  bank: CentralBankState;
} {
  const president = currentPresidentOf(world);
  if (!president) return { world, bank };
  let next = world;
  let working = bank;
  for (const opening of bank.openings) {
    if (
      addDays(opening.since, CENTRAL_BANK_PROFILE.daysFromVacancyToNomination) >
      world.currentDate
    )
      continue;
    const key = `${CENTRAL_BANK_VERSION}:nomination:${opening.office}:${opening.seat}:${opening.since}:${world.currentDate}`;
    // The President names the chair from the sitting governors, and a
    // governor from the people they know who may serve (appointments-v1),
    // by the same decision any appointer makes. A President the player
    // controls, or one who knows nobody eligible, names the longest-serving
    // governor as chair (the one whose term ends first), and leaves a
    // governor's seat open until they know someone: the real board has sat
    // with two or three seats empty for years at a time (2014-2018).
    const controlled =
      next.control.kind === "person" ? next.control.personId : null;
    const sitting = working.seats
      .flatMap((seat) => (seat ? [seat.personId] : []))
      .filter((id) => id !== controlled && !isDead(next, id))
      .sort();
    const pool =
      opening.office === "chair" ? sitting : nomineePool(next, working);
    if (pool.length === 0) continue;
    const post = {
      officeKey: `central-bank-${opening.office}:${opening.seat}`,
      title:
        opening.office === "chair"
          ? "chair of the central bank's board"
          : "a governor on the central bank's board",
    };
    const eligible = new Set(pool);
    const choice = chooseAppointee(next, {
      stableKey: key,
      appointerPersonId: president.personId,
      post,
      circle: appointmentCircle(
        next,
        president.personId,
        opening.office === "chair" ? sitting : [],
      ),
      eligible: (personId) => eligible.has(personId),
    });
    // An unselected appointment leaves this opening pending.
    if (!choice) continue;
    const nomineeId = choice.personId;
    if (choice)
      next = recordPassedOver(choice.world, {
        stableKey: key,
        appointerPersonId: president.personId,
        passedOver: choice.passedOver,
        post,
      });
    const nominee = next.people[nomineeId]!;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: CENTRAL_BANK_NOMINATED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [president.personId, nomineeId],
      participants: [
        {
          personId: president.personId,
          role: "focus:actor",
          detail: "President",
        },
        { personId: nomineeId, role: "focus:subject", detail: "Nominee" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        CENTRAL_BANK_VERSION,
        `office:central-bank-${opening.office}`,
        `seat:${opening.seat}`,
        `provenance:${CENTRAL_BANK_PROFILE.id}`,
      ],
      summary: `The President nominated ${personName(nominee)} to be ${opening.office === "chair" ? "chair of the central bank's board" : "a governor on the central bank's board"}. The Senate must confirm the nomination.`,
      context: CONTEXT,
    });
    working = {
      ...working,
      openings: working.openings.filter((row) => row !== opening),
      nominations: [
        ...working.nominations,
        {
          office: opening.office,
          seat: opening.seat,
          nomineeId,
          presidentId: president.personId,
          nominatedAt: next.currentDate,
          confirmationDue: addDays(
            next.currentDate,
            CENTRAL_BANK_PROFILE.daysFromNominationToConfirmation,
          ),
          eventId: next.history.events.at(-1)!.id,
        },
      ],
    };
  }
  return { world: next, bank: working };
}

function confirm(
  world: World,
  bank: CentralBankState,
): {
  world: World;
  bank: CentralBankState;
} {
  let next = world;
  let working = bank;
  const year = Number(world.currentDate.slice(0, 4));
  for (const nomination of bank.nominations) {
    if (nomination.confirmationDue > world.currentDate) continue;
    working = {
      ...working,
      nominations: working.nominations.filter((row) => row !== nomination),
    };
    const president = currentPresidentOf(next)?.personId;
    // GAME PROFILE: confirmation follows after 70 days unless the nominee
    // died or the nominating President left office; then the seat reopens.
    if (
      isDead(next, nomination.nomineeId) ||
      president !== nomination.presidentId
    ) {
      working = {
        ...working,
        openings: [
          ...working.openings,
          {
            office: nomination.office,
            seat: nomination.seat,
            since: next.currentDate,
          },
        ],
      };
      continue;
    }
    if (nomination.office === "chair") {
      const seat = working.seats.find(
        (row) => row?.personId === nomination.nomineeId,
      );
      if (!seat) {
        working = {
          ...working,
          openings: [
            ...working.openings,
            { office: "chair", seat: 0, since: next.currentDate },
          ],
        };
        continue;
      }
      const termEnds = makeIsoDate(
        `${year + CENTRAL_BANK_PROFILE.chairTermYears}-${next.currentDate.slice(5)}`,
      );
      const recorded = recordAppointment(next, {
        stableKey: `${CENTRAL_BANK_VERSION}:confirmed:chair:${nomination.nomineeId}:${next.currentDate}`,
        personId: nomination.nomineeId,
        office: "chair",
        seat: seat.seat,
        termEnds,
        lean: seat.inflationLean,
        basis: "confirmed",
      });
      next = recorded.world;
      working = {
        ...working,
        chair: {
          personId: nomination.nomineeId,
          termEnds,
          appointedEventId: recorded.eventId,
        },
      };
      continue;
    }
    // A new governor serves out the seat's fourteen-year term; when that term
    // has already run out, the seat's next term (12 U.S.C. 242).
    const previous = working.seats[nomination.seat];
    let termEnds = previous?.termEnds ?? seatTermEnds(nomination.seat, year);
    while (termEnds <= next.currentDate)
      termEnds = makeIsoDate(
        `${Number(termEnds.slice(0, 4)) + CENTRAL_BANK_PROFILE.governorTermYears}-01-31`,
      );
    const lean = drawInflationLean(next, nomination.nomineeId);
    const recorded = recordAppointment(next, {
      stableKey: `${CENTRAL_BANK_VERSION}:confirmed:governor:${nomination.seat}:${nomination.nomineeId}:${next.currentDate}`,
      personId: nomination.nomineeId,
      office: "governor",
      seat: nomination.seat,
      termEnds,
      lean,
      basis: "confirmed",
    });
    next = recorded.world;
    const displaced = previous?.personId;
    const seats = working.seats.map((row, index) =>
      index === nomination.seat
        ? {
            seat: nomination.seat,
            personId: nomination.nomineeId,
            termEnds,
            appointedEventId: recorded.eventId,
            inflationLean: lean,
          }
        : row,
    );
    working = {
      ...working,
      seats,
      // A chair who leaves the board leaves the chair.
      chair:
        working.chair && working.chair.personId === displaced
          ? null
          : working.chair,
    };
  }
  return { world: next, bank: working };
}

/** Keeps the board filled: openings found, nominations made, votes held. */
/** The last day of February of a year. */
function februaryEnd(year: number): IsoDate {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return makeIsoDate(`${year}-02-${leap ? "29" : "28"}`);
}

/**
 * Seats the twelve reserve bank presidents on a board that has none (a
 * world's first month, or a board seated before presidents were). Once.
 */
export function ensureReserveBankPresidents(world: World): World {
  const bank = world.macroEconomy?.centralBank;
  if (!bank || bank.presidents) return world;
  const stableKeys = RESERVE_BANKS.map(
    (row) => `${CENTRAL_BANK_VERSION}:opening:reserve-bank:${row.key}`,
  );
  const people = generateBoardPeople(
    world,
    stableKeys,
    "reserve-bank-president-at-opening",
  );
  let next = people.world;
  const presidents: ReserveBankPresidentSeat[] = [];
  for (const [index, row] of RESERVE_BANKS.entries()) {
    const personId = people.personIds[index]!;
    const lean = drawInflationLean(next, personId);
    const recorded = recordAppointment(next, {
      stableKey: `${stableKeys[index]}:appointed`,
      personId,
      office: "reserve-bank-president",
      seat: index,
      termEnds: null,
      lean,
      basis: "opening",
    });
    next = recorded.world;
    presidents.push({
      bank: row.key,
      personId,
      since: next.currentDate,
      appointedEventId: recorded.eventId,
      inflationLean: lean,
    });
  }
  return withBank(next, {
    ...next.macroEconomy!.centralBank!,
    presidents,
    presidentOpenings: [],
  });
}

/**
 * Presidents who died, or who had reached retirement age by a five-year
 * term end, leave; a bank whose seat has been open long enough gets a new
 * president.
 */
function stepReserveBankPresidents(world: World): World {
  const bank = world.macroEconomy?.centralBank;
  if (!bank?.presidents) return world;
  const today = world.currentDate;
  // The most recent term end on or before today: February in a year ending
  // in 1 or 6.
  let termYear = Number(today.slice(0, 4));
  while (termYear % 5 !== 1 || februaryEnd(termYear) > today) termYear -= 1;
  const lastTermEnd = februaryEnd(termYear);
  const openings = [...(bank.presidentOpenings ?? [])];
  const presidents = bank.presidents.map((seat) => {
    if (!seat) return seat;
    const person = world.people[seat.personId];
    const retires =
      person !== undefined &&
      seat.since < lastTermEnd &&
      ageOnDate(person.birthDate, lastTermEnd) >=
        CENTRAL_BANK_PROFILE.reserveBankPresidentRetirementAge;
    if (!isDead(world, seat.personId) && !retires) return seat;
    openings.push({ bank: seat.bank, since: today });
    return null;
  });
  let next = world;
  const remaining: { bank: ReserveBankKey; since: IsoDate }[] = [];
  for (const opening of openings) {
    if (
      addDays(
        opening.since,
        CENTRAL_BANK_PROFILE.daysToSeatReserveBankPresident,
      ) > today
    ) {
      remaining.push(opening);
      continue;
    }
    const index = RESERVE_BANKS.findIndex((row) => row.key === opening.bank);
    const stableKey = `${CENTRAL_BANK_VERSION}:reserve-bank:${opening.bank}:${today}`;
    const people = generateBoardPeople(
      next,
      [stableKey],
      "reserve-bank-president-successor",
    );
    next = people.world;
    const personId = people.personIds[0]!;
    const lean = drawInflationLean(next, personId);
    const recorded = recordAppointment(next, {
      stableKey: `${stableKey}:appointed`,
      personId,
      office: "reserve-bank-president",
      seat: index,
      termEnds: null,
      lean,
      basis: "chosen",
    });
    next = recorded.world;
    presidents[index] = {
      bank: opening.bank,
      personId,
      since: today,
      appointedEventId: recorded.eventId,
      inflationLean: lean,
    };
  }
  if (
    next === world &&
    openings.length === (bank.presidentOpenings ?? []).length
  )
    return world;
  return withBank(next, {
    ...next.macroEconomy!.centralBank!,
    presidents,
    presidentOpenings: remaining,
  });
}

export function stepCentralBankSeats(world: World): World {
  const bank = world.macroEconomy?.centralBank;
  if (!bank) return world;
  let working = findOpenings(world, bank);
  let next = world;
  ({ world: next, bank: working } = confirm(next, working));
  working = findOpenings(next, working);
  ({ world: next, bank: working } = nominate(next, working));
  return stepReserveBankPresidents(
    ensureReserveBankPresidents(withBank(next, working)),
  );
}

export function isCentralBankMeetingMonth(monthKey: string): boolean {
  return CENTRAL_BANK_PROFILE.meetingMonths.includes(
    Number(monthKey.slice(5, 7)),
  );
}

/** Who votes: a governor or a voting reserve bank president. */
interface Voter {
  readonly personId: EntityId;
  readonly inflationLean: TraitValue;
}

function viewOf(world: World, seat: Voter): RateSetterView {
  return {
    inflationLean: seat.inflationLean,
    risk: personTrait(world, seat.personId, "risk").value,
    deliberation: personTrait(world, seat.personId, "deliberation").value,
  };
}

/** What the board sees: the published numbers and the banks' condition. */
export function centralBankReadings(
  world: World,
  store: MacroEconomyStore,
  policyMidPct: number,
  since: IsoDate | null,
): RateReadings {
  const releases = store.releases;
  const latest = (indicator: string) =>
    releases.filter(
      (release) => release.indicator === indicator && release.value !== null,
    );
  const unemployment = latest("unemployment-rate");
  const inflation = latest("consumer-price-inflation-12m");
  const recent = unemployment.slice(
    -CENTRAL_BANK_PROFILE.normalUnemploymentMonths,
  );
  const normal =
    recent.length >= 60
      ? recent.reduce((sum, row) => sum + row.value!, 0) / recent.length
      : CENTRAL_BANK_PROFILE.fallbackNormalUnemploymentPct;
  const lastNational = [...store.months]
    .reverse()
    .find((month) => month.scope === "national" && month.credit);
  const failures = world.history.events.filter(
    (event) =>
      event.type === "economy.bank-failed" &&
      (since === null || event.occurredAt > since),
  ).length;
  return {
    inflationPct: inflation.at(-1)?.value ?? null,
    unemploymentPct: unemployment.at(-1)?.value ?? null,
    unemploymentEarlierPct: unemployment.at(-4)?.value ?? null,
    normalUnemploymentPct: Math.round(normal * 100) / 100,
    chargeOffPct:
      lastNational?.credit?.chargeOffPct ??
      MACRO_CREDIT_POLICY.start.chargeOffPct,
    calmChargeOffPct: MACRO_CREDIT_POLICY.start.chargeOffPct,
    recentBankFailures: failures,
    policyMidPct,
    neutralRealRatePct: MACRO_CREDIT_POLICY.neutralRealRatePct,
  };
}

function choiceOf(
  world: World,
  seat: Voter,
  readings: RateReadings,
  meetingKey: string,
): { option: RateOptionKey; reasons: readonly string[] } {
  const rows = rateConsiderations(viewOf(world, seat), readings);
  const evaluation = evaluateDecision(world, {
    stableKey: `${meetingKey}:${seat.personId}`,
    decisionType: "central-bank.policy-rate",
    actorPersonId: seat.personId,
    cutoff: currentHistoricalCutoff(world),
    subject: { kind: "context:policy-rate", key: meetingKey, entityId: null },
    options: RATE_OPTIONS.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.label,
    })),
    constraints: [],
    considerations: rows.map((row, index) => ({
      stableKey: `${row.concern}:${row.optionKey}:${index}`,
      optionKey: row.optionKey,
      sourceType: `context:${row.concern}`,
      direction: row.direction,
      importance: row.importance,
      confidence: "medium",
      explanation: row.explanation,
      sourceRefs: [],
    })),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  const option = (evaluation.selectedOptionKey ?? "hold") as RateOptionKey;
  const reasons = [
    ...new Set(
      rows
        .filter(
          (row) => row.optionKey === option && row.direction === "supports",
        )
        .map((row) => row.explanation),
    ),
  ];
  return { option, reasons };
}

function rangeFromMid(
  mid: number,
  decisionEventId: EntityId,
): MacroPolicyRateRange {
  return {
    lowerPct: Math.round((mid - 0.125) * 1000) / 1000,
    upperPct: Math.round((mid + 0.125) * 1000) / 1000,
    basis: "modeled-decision",
    decisionEventId,
  };
}

/**
 * One meeting: every governor forms a choice, the chair proposes, the board
 * votes, and the rate in force changes (or not) with the reasons recorded.
 */
export function holdCentralBankMeeting(world: World, monthKey: string): World {
  const store = world.macroEconomy;
  const bank = store?.centralBank;
  if (!store || !bank) return world;
  const meetingKey = `${CENTRAL_BANK_VERSION}:meeting:${monthKey}`;
  if (world.history.events.some((event) => event.stableKey === meetingKey))
    return world;
  const governors = bank.seats.flatMap((seat) =>
    seat && !isDead(world, seat.personId) ? [seat] : [],
  );
  if (governors.length === 0) return world;
  // This year's voting presidents: New York and the four in rotation.
  const voting = new Set(votingReserveBanks(Number(monthKey.slice(0, 4))));
  const presidents = (bank.presidents ?? []).flatMap((seat) =>
    seat && voting.has(seat.bank) && !isDead(world, seat.personId)
      ? [seat]
      : [],
  );
  const members: readonly Voter[] = [...governors, ...presidents];
  const current = bank.policyRate;
  const mid = (current.lowerPct + current.upperPct) / 2;
  const readings = centralBankReadings(world, store, mid, bank.lastMeetingAt);
  // Whoever chairs presides; without a confirmed chair, the longest-serving
  // governor (the lowest seat still filled) presides pro tempore.
  const presiding =
    (bank.chair &&
      governors.find((seat) => seat.personId === bank.chair!.personId)) ??
    governors[0]!;
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const choices = new Map<
    EntityId,
    { option: RateOptionKey; reasons: readonly string[] }
  >();
  for (const seat of members)
    if (seat.personId !== controlled)
      choices.set(seat.personId, choiceOf(world, seat, readings, meetingKey));

  let proposal: RateOptionKey;
  let proposalReasons: readonly string[];
  if (presiding.personId === controlled) {
    // The player chairs: the game never decides for them.
    proposal = bank.chairChoice ?? "hold";
    proposalReasons = bank.chairChoice
      ? ["The chair's own call."]
      : ["The chair called no vote to change the rate."];
  } else {
    ({ option: proposal, reasons: proposalReasons } = choices.get(
      presiding.personId,
    )!);
  }
  const direction = Math.sign(rateMoveOf(proposal));
  const dissenters = members.filter((seat) => {
    const own = choices.get(seat.personId);
    return (
      own &&
      seat.personId !== presiding.personId &&
      Math.sign(rateMoveOf(own.option)) !== direction
    );
  });
  const carried = dissenters.length * 2 < members.length;
  const decided: RateOptionKey = carried ? proposal : "hold";
  const newMid = Math.max(
    CENTRAL_BANK_PROFILE.floorMidPct,
    Math.round((mid + rateMoveOf(decided)) * 1000) / 1000,
  );
  const chairName = personName(world.people[presiding.personId]!);
  const moved = newMid - mid;
  const verb = moved > 0 ? "raised" : moved < 0 ? "cut" : "held";
  const rangeText = `${(newMid - 0.125).toFixed(2)} to ${(newMid + 0.125).toFixed(2)} percent`;
  const summary = [
    moved === 0
      ? `The central bank's board held its policy rate at ${rangeText}.`
      : `The central bank's board ${verb} its policy rate by ${Math.abs(moved) === 0.5 ? "half a point" : "a quarter point"}, to ${rangeText}.`,
    carried
      ? `${chairName} proposed it${proposalReasons.length ? `: ${proposalReasons.join(" ")}` : "."}`
      : `${chairName} proposed to ${RATE_OPTIONS.find((row) => row.key === proposal)!.label.toLowerCase()}, but a majority of the committee would not go along.`,
    dissenters.length
      ? `${dissenters.length} of ${members.length} voters wanted a different course.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  let next = recordWorldEvent(world, {
    stableKey: meetingKey,
    type: CENTRAL_BANK_RATE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      ...new Set(members.map((seat) => seat.personId)),
    ].sort(),
    participants: [
      {
        personId: presiding.personId,
        role: "agency:actor",
        detail: "Presiding",
      },
      ...dissenters.map((seat) => ({
        personId: seat.personId,
        role: "agency:dissenter" as const,
        detail: null,
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CENTRAL_BANK_VERSION,
      `decision:${decided}`,
      `proposal:${proposal}`,
      `carried:${carried}`,
      `rate-mid:${newMid}`,
      `rate-change:${Math.round(moved * 1000) / 1000}`,
      `month:${monthKey}`,
    ],
    summary,
    context: CONTEXT,
  });
  const eventId = next.history.events.at(-1)!.id;
  const latest = next.macroEconomy!;
  next = {
    ...next,
    macroEconomy: {
      ...latest,
      centralBank: {
        ...latest.centralBank!,
        policyRate: rangeFromMid(newMid, eventId),
        lastMeetingAt: next.currentDate,
        chairChoice: null,
      },
    },
  };
  return next;
}

/**
 * The player, as chair, records what they will propose at the next meeting.
 * Refused unless the player chairs the board.
 */
export function chooseCentralBankRate(
  world: World,
  option: RateOptionKey,
): World {
  const bank = world.macroEconomy?.centralBank;
  if (
    !bank ||
    world.control.kind !== "person" ||
    bank.chair?.personId !== world.control.personId
  )
    throw new Error("Only the board's chair can propose the policy rate.");
  if (!RATE_OPTIONS.some((row) => row.key === option))
    throw new Error(`Unsupported rate choice: ${option}`);
  return withBank(world, { ...bank, chairChoice: option });
}
