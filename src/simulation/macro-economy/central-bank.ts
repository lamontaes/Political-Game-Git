/**
 * THE CENTRAL BANK IS PEOPLE (Build 19; Lamontae's note, Claude CTO's 9:35
 * p.m. rulings on September 28, 2026: "be sure things aren't hard-coded ...
 * maybe the only thing you should be able to do [is be] the Fed chair").
 *
 * A board of seven governors, one of them the chair, sets the policy rate at
 * scheduled meetings. Each governor is a person with their own temperament
 * and their own view of the trade-off between prices and jobs. At a meeting
 * every governor reads the same published numbers and weighs them through
 * the ordinary decision engine (`rate-choice.ts`, `decisions.ts`); the chair
 * proposes, and the proposal carries unless a majority of the board wanted
 * to move the other way. Nothing computes the rate from a formula.
 *
 * Governors and the chair are nominated by the President and confirmed by
 * the Senate when a seat opens (a term ends, or a member dies). A governor
 * whose term has ended serves until a successor is confirmed, as the law
 * provides (12 U.S.C. 242). The law is the route: seven governors appointed
 * by the President with the Senate's advice and consent for fourteen-year
 * terms, and a chair designated from among them for four years (12 U.S.C.
 * 241 and 242).
 *
 * Simplifications, each marked:
 * 1. PLACEHOLDER: the Federal Open Market Committee also seats five Reserve
 *    Bank presidents; the game's rate is set by the seven governors alone.
 * 2. PLACEHOLDER (filed as `central-bank-nomination-and-confirmation`): whom
 *    a President nominates and how the Senate votes. Until appointments
 *    become decisions among people the President knows (Build 20), the
 *    President draws from the same pool the Chief Justice vacancy uses, and
 *    the Senate confirms unless the nominating President has left office.
 *    The chair is drawn from the sitting governors.
 * 3. PLACEHOLDER: the meeting calendar is eight meetings a year in the
 *    months the Committee has usually met (January, March, May, June, July,
 *    September, November, December), held when the month's figures close.
 * 4. The player can hold the chair: when the chair is the person the player
 *    controls, the game never decides for them; the rate holds until the
 *    player records a choice for the meeting (`chooseCentralBankRate`).
 */

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
  /** PLACEHOLDER: the months the board meets (see the file comment). */
  meetingMonths: [1, 3, 5, 6, 7, 9, 11, 12] as readonly number[],
  /** PLACEHOLDER, the Chief Justice vacancy's game profile. */
  daysFromVacancyToNomination: 30,
  daysFromNominationToConfirmation: 70,
  /** The lowest the rate range's middle may go: a range of 0 to 0.25. */
  floorMidPct: 0.125,
  /** A board member's age range when first seated at the opening. */
  openingAge: { min: 45, max: 70 },
  /** Before five years of published unemployment, the board's working normal rate. */
  fallbackNormalUnemploymentPct: 4.4,
  /** Months of published unemployment the board averages for its normal rate. */
  normalUnemploymentMonths: 240,
} as const;

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
    readonly office: "governor" | "chair";
    readonly seat: number;
    readonly termEnds: IsoDate;
    readonly lean: TraitValue;
    readonly basis: "opening" | "confirmed";
  },
): { world: World; eventId: EntityId } {
  const person = world.people[input.personId]!;
  const title =
    input.office === "chair"
      ? "Chair of the central bank's board"
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
      `term-end:${input.termEnds}`,
      `view:inflation-lean:${input.lean}`,
      `basis:${input.basis}`,
    ],
    summary:
      input.basis === "opening"
        ? `${personName(person)} sits on the central bank's board as ${input.office === "chair" ? "its chair" : "a governor"}, and ${leanWords(input.lean)}.`
        : `The Senate confirmed ${personName(person)} as ${input.office === "chair" ? "chair of the central bank's board" : "a governor on the central bank's board"}.`,
    context: CONTEXT,
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
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
  let next = world;
  const inputs: CharacterHistoryContextPersonInput[] = [];
  for (let seat = 0; seat < CENTRAL_BANK_PROFILE.seats; seat += 1) {
    const stableKey = `${CENTRAL_BANK_VERSION}:opening:seat:${seat}`;
    const rng = new SeededRng(world.seed).fork(stableKey);
    const geography = prepareOpeningFederalGeography(next, stableKey);
    next = geography.world;
    const age = rng.integer(
      CENTRAL_BANK_PROFILE.openingAge.min,
      CENTRAL_BANK_PROFILE.openingAge.max + 1,
    );
    inputs.push({
      stableKey,
      ...drawCanonicalNamedIdentity(
        rng.fork("name"),
        generatePersonIdentity(rng.fork("identity")),
      ),
      birthDate: makeIsoDate(
        `${year - age}-${String(rng.integer(1, 13)).padStart(2, "0")}-${String(rng.integer(1, 29)).padStart(2, "0")}`,
      ),
      homeJurisdictionId: geography.homeJurisdictionId,
      birthplaceJurisdictionId: geography.birthplaceJurisdictionId,
    });
  }
  next = createCharacterHistoryContextPeople(next, inputs);
  const seats: CentralBankSeat[] = [];
  for (const [seat, input] of inputs.entries()) {
    const personId = characterHistoryContextPersonId(next, input.stableKey);
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

/** Who may be nominated to a governor's seat. PLACEHOLDER (see the file comment). */
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
  return Object.values(world.people)
    .filter(
      (person) =>
        person.id !== president &&
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
    const rng = new SeededRng(world.seed).fork(key);
    let nomineeId: EntityId | undefined;
    if (opening.office === "chair") {
      // PLACEHOLDER: the President designates the chair from the sitting
      // governors, other than one the player controls.
      const controlled =
        next.control.kind === "person" ? next.control.personId : null;
      const sitting = working.seats
        .flatMap((seat) => (seat ? [seat.personId] : []))
        .filter((id) => id !== controlled && !isDead(next, id))
        .sort();
      if (sitting.length) nomineeId = rng.pick(sitting);
    } else {
      const pool = nomineePool(next, working);
      if (pool.length) nomineeId = rng.pick(pool);
    }
    if (!nomineeId) continue;
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
    // PLACEHOLDER: the Senate confirms unless the nominee died or the
    // President who nominated them has left office; the seat reopens.
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
export function stepCentralBankSeats(world: World): World {
  const bank = world.macroEconomy?.centralBank;
  if (!bank) return world;
  let working = findOpenings(world, bank);
  let next = world;
  ({ world: next, bank: working } = confirm(next, working));
  working = findOpenings(next, working);
  ({ world: next, bank: working } = nominate(next, working));
  return withBank(next, working);
}

export function isCentralBankMeetingMonth(monthKey: string): boolean {
  return CENTRAL_BANK_PROFILE.meetingMonths.includes(
    Number(monthKey.slice(5, 7)),
  );
}

function viewOf(world: World, seat: CentralBankSeat): RateSetterView {
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
  seat: CentralBankSeat,
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
  const members = bank.seats.flatMap((seat) =>
    seat && !isDead(world, seat.personId) ? [seat] : [],
  );
  if (members.length === 0) return world;
  const current = bank.policyRate;
  const mid = (current.lowerPct + current.upperPct) / 2;
  const readings = centralBankReadings(world, store, mid, bank.lastMeetingAt);
  // Whoever chairs presides; without a confirmed chair, the longest-serving
  // governor (the lowest seat still filled) presides pro tempore.
  const presiding =
    (bank.chair &&
      members.find((seat) => seat.personId === bank.chair!.personId)) ??
    members[0]!;
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
      : `${chairName} proposed to ${RATE_OPTIONS.find((row) => row.key === proposal)!.label.toLowerCase()}, but a majority of the board would not go along.`,
    dissenters.length
      ? `${dissenters.length} of ${members.length} members wanted a different course.`
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
    throw new Error(`Unknown rate choice: ${option}`);
  return withBank(world, { ...bank, chairChoice: option });
}
