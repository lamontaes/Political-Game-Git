import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  World,
} from "../../simulation/types";
import type {
  CentralBankState,
  CentralBankSeat,
  ReserveBankPresidentSeat,
} from "../../simulation/macro-economy/central-bank";
import type { TraitValue } from "../../simulation/people-trait-definitions";
import type {
  MacroEconomyStore,
  MacroPolicyRateRange,
} from "../../simulation/macro-economy/types";
import { MACRO_CREDIT_POLICY } from "./macro-credit";
import {
  RATE_OPTIONS,
  rateMoveOf,
  rateConsiderations,
  type RateOptionKey,
  type RateReadings,
  type RateSetterView,
} from "./macro-rate-choice";
export const CENTRAL_BANK_VERSION = "central-bank-board-v1" as const;

export const CENTRAL_BANK_RATE_EVENT = "economy.policy-rate-decided";

export const CENTRAL_BANK_PROFILE = {
  id: "ocd-central-bank-game-profile/v1",
  seats: 7,
  governorTermYears: 14,
  chairTermYears: 4,
  meetingMonths: [1, 3, 5, 6, 7, 9, 11, 12] as readonly number[],
  daysFromVacancyToNomination: 30,
  daysFromNominationToConfirmation: 70,
  floorMidPct: 0.125,
  fallbackNormalUnemploymentPct: 4.4,
  normalUnemploymentMonths: 240,
  daysToSeatReserveBankPresident: 90,
  reserveBankPresidentRetirementAge: 65,
} as const;

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

const ROTATION: readonly (readonly ReserveBankKey[])[] = [
  ["boston", "philadelphia", "richmond"],
  ["chicago", "cleveland"],
  ["st-louis", "dallas", "atlanta"],
  ["kansas-city", "minneapolis", "san-francisco"],
];

const ROTATION_ANCHOR_YEAR = 2025;

export function votingReserveBanks(year: number): readonly ReserveBankKey[] {
  return [
    "new-york",
    ...ROTATION.map((group) => {
      const step = (year - ROTATION_ANCHOR_YEAR) % group.length;
      return group[(step + group.length) % group.length]!;
    }),
  ];
}

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function seatTermEnds(seat: number, fromYear: number): IsoDate {
  const firstEven = fromYear % 2 === 0 ? fromYear + 2 : fromYear + 1;
  return makeIsoDate(`${firstEven + 2 * seat}-01-31`);
}

function februaryEnd(year: number): IsoDate {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return makeIsoDate(`${year}-02-${leap ? "29" : "28"}`);
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
export interface CentralBankFacts {
  readonly onDate: IsoDate;
  readonly cutoff: HistoricalCutoff;
  readonly worldId: EntityId;
  readonly bank: CentralBankState | null;
  readonly store: MacroEconomyStore | null;
  readonly events: World["history"]["events"];
  readonly deaths: World["history"]["personDeaths"];
  readonly people: Readonly<Record<string, { readonly birthDate: IsoDate }>>;
  readonly names: ReadonlyMap<EntityId, string>;
  readonly traits: ReadonlyMap<
    EntityId,
    { readonly risk: TraitValue; readonly deliberation: TraitValue }
  >;
  readonly controlledPersonId: EntityId | null;
}
function isDead(facts: CentralBankFacts, personId: EntityId) {
  return facts.deaths.some(
    (d) => d.personId === personId && d.diedAt <= facts.onDate,
  );
}
// stopgapId: "economy.central-bank-reading-window"
export function centralBankReadings(
  facts: CentralBankFacts,
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
  const failures = facts.events.filter(
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
export function openingCentralBankTerms(onDate: IsoDate) {
  return Array.from({ length: CENTRAL_BANK_PROFILE.seats }, (_, seat) => ({
    seat,
    termEnds: seatTermEnds(seat, Number(onDate.slice(0, 4))),
  }));
}
// stopgapId: "economy.central-bank-succession-profile"
export function prepareReserveBankSuccession(facts: CentralBankFacts) {
  const bank = facts.bank;
  if (!bank?.presidents) return null;
  const today = facts.onDate;
  let termYear = Number(today.slice(0, 4));
  while (termYear % 5 !== 1 || februaryEnd(termYear) > today) termYear -= 1;
  const lastTermEnd = februaryEnd(termYear),
    openings = [...(bank.presidentOpenings ?? [])];
  const presidents = bank.presidents.map((seat) => {
    if (!seat) return seat;
    const person = facts.people[seat.personId];
    const retires =
      person !== undefined &&
      seat.since < lastTermEnd &&
      ageOnDate(person.birthDate, lastTermEnd) >=
        CENTRAL_BANK_PROFILE.reserveBankPresidentRetirementAge;
    if (!isDead(facts, seat.personId) && !retires) return seat;
    openings.push({ bank: seat.bank, since: today });
    return null;
  });
  const remaining: NonNullable<
    CentralBankState["presidentOpenings"]
  >[number][] = [];
  const requests: {
    bank: ReserveBankKey;
    seat: number;
    stableKey: string;
    role: "reserve-bank-president-successor";
    since: IsoDate;
  }[] = [];
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
    const seat = RESERVE_BANKS.findIndex((r) => r.key === opening.bank);
    requests.push({
      bank: opening.bank,
      seat,
      stableKey: `${CENTRAL_BANK_VERSION}:reserve-bank:${opening.bank}:${today}`,
      role: "reserve-bank-president-successor",
      since: today,
    });
  }
  return {
    presidents,
    remaining,
    requests,
    changed:
      requests.length > 0 ||
      openings.length !== (bank.presidentOpenings ?? []).length,
  };
}
export function resumeReserveBankSuccession(
  plan: NonNullable<ReturnType<typeof prepareReserveBankSuccession>>,
  replacements: readonly ReserveBankPresidentSeat[],
) {
  if (replacements.length !== plan.requests.length)
    throw Error("Missing ordered reserve-bank successor producer receipt");
  const presidents = [...plan.presidents];
  for (const [i, request] of plan.requests.entries())
    presidents[request.seat] = replacements[i]!;
  return plan.changed
    ? { presidents, presidentOpenings: plan.remaining }
    : null;
}
type Voter = CentralBankSeat | ReserveBankPresidentSeat;
export interface RateChoice {
  readonly option: RateOptionKey;
  readonly reasons: readonly string[];
}
// stopgapId: "economy.central-bank-native-English"
export function prepareCentralBankMeeting(
  facts: CentralBankFacts,
  monthKey: string,
) {
  const bank = facts.bank,
    store = facts.store;
  if (!store || !bank) return null;
  const meetingKey = `${CENTRAL_BANK_VERSION}:meeting:${monthKey}`;
  if (facts.events.some((e) => e.stableKey === meetingKey)) return null;
  const governors = bank.seats.flatMap((seat) =>
    seat && !isDead(facts, seat.personId) ? [seat] : [],
  );
  if (!governors.length) return null;
  const voting = new Set(votingReserveBanks(Number(monthKey.slice(0, 4))));
  const presidents = (bank.presidents ?? []).flatMap((seat) =>
    seat && voting.has(seat.bank) && !isDead(facts, seat.personId)
      ? [seat]
      : [],
  );
  const members: readonly Voter[] = [...governors, ...presidents];
  const mid = (bank.policyRate.lowerPct + bank.policyRate.upperPct) / 2;
  const readings = centralBankReadings(facts, store, mid, bank.lastMeetingAt);
  const presiding =
    (bank.chair &&
      governors.find((s) => s.personId === bank.chair!.personId)) ??
    governors[0]!;
  const requests = members
    .filter((s) => s.personId !== facts.controlledPersonId)
    .map((seat) => {
      const traits = facts.traits.get(seat.personId);
      if (!traits)
        throw Error("Missing separately owned actor traits " + seat.personId);
      const rows = rateConsiderations(
        { inflationLean: seat.inflationLean, ...traits } as RateSetterView,
        readings,
      );
      return {
        personId: seat.personId,
        rows,
        input: {
          stableKey: `${meetingKey}:${seat.personId}`,
          decisionType: "central-bank.policy-rate",
          actorPersonId: seat.personId,
          cutoff: facts.cutoff,
          subject: {
            kind: "context:policy-rate" as const,
            key: meetingKey,
            entityId: null,
          },
          options: RATE_OPTIONS.map((o) => ({
            key: o.key,
            label: o.label,
            description: o.label,
          })),
          constraints: [],
          considerations: rows.map((r, index) => ({
            stableKey: `${r.concern}:${r.optionKey}:${index}`,
            optionKey: r.optionKey,
            sourceType: `context:${r.concern}` as const,
            direction: r.direction,
            importance: r.importance,
            confidence: "medium" as const,
            explanation: r.explanation,
            sourceRefs: [],
          })),
          perceptionIds: [],
          randomness: "none" as const,
          retention: "ephemeral" as const,
        },
      };
    });
  return { meetingKey, monthKey, members, mid, readings, presiding, requests };
}
export function rateChoiceFromEvaluation(
  request: NonNullable<
    ReturnType<typeof prepareCentralBankMeeting>
  >["requests"][number],
  selectedOptionKey: string | null,
): RateChoice {
  const option = (selectedOptionKey ?? "hold") as RateOptionKey;
  return {
    option,
    reasons: [
      ...new Set(
        request.rows
          .filter((r) => r.optionKey === option && r.direction === "supports")
          .map((r) => r.explanation),
      ),
    ],
  };
}
// stopgapId: "economy.central-bank-direction-vote"
export function resolveCentralBankMeeting(
  facts: CentralBankFacts,
  prepared: NonNullable<ReturnType<typeof prepareCentralBankMeeting>>,
  choices: ReadonlyMap<EntityId, RateChoice>,
) {
  const { meetingKey, monthKey, members, mid, presiding } = prepared;
  const bank = facts.bank!;
  let proposal: RateOptionKey, proposalReasons: readonly string[];
  if (presiding.personId === facts.controlledPersonId) {
    proposal = bank.chairChoice ?? "hold";
    proposalReasons = bank.chairChoice
      ? ["The chair's own call."]
      : ["The chair called no vote to change the rate."];
  } else {
    const receipt = choices.get(presiding.personId);
    if (!receipt)
      throw Error(
        "Missing separately owned actor evaluation " + presiding.personId,
      );
    ({ option: proposal, reasons: proposalReasons } = receipt);
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
  const carried = dissenters.length * 2 < members.length,
    decided: RateOptionKey = carried ? proposal : "hold";
  const newMid = Math.max(
    CENTRAL_BANK_PROFILE.floorMidPct,
    Math.round((mid + rateMoveOf(decided)) * 1000) / 1000,
  );
  const chairName = facts.names.get(presiding.personId);
  if (chairName === undefined)
    throw Error("Missing actor name " + presiding.personId);
  const moved = newMid - mid,
    verb = moved > 0 ? "raised" : moved < 0 ? "cut" : "held";
  const rangeText = `${(newMid - 0.125).toFixed(2)} to ${(newMid + 0.125).toFixed(2)} percent`;
  const summary = [
    moved === 0
      ? `The central bank's board held its policy rate at ${rangeText}.`
      : `The central bank's board ${verb} its policy rate by ${Math.abs(moved) === 0.5 ? "half a point" : "a quarter point"}, to ${rangeText}.`,
    carried
      ? `${chairName} proposed it${proposalReasons.length ? ": " + proposalReasons.join(" ") : "."}`
      : `${chairName} proposed to ${RATE_OPTIONS.find((r) => r.key === proposal)!.label.toLowerCase()}, but a majority of the committee would not go along.`,
    dissenters.length
      ? `${dissenters.length} of ${members.length} voters wanted a different course.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    newMid,
    event: {
      stableKey: meetingKey,
      type: CENTRAL_BANK_RATE_EVENT as typeof CENTRAL_BANK_RATE_EVENT,
      occurredAt: facts.onDate,
      recordedAt: facts.onDate,
      jurisdictionId: null,
      involvedEntityIds: [...new Set(members.map((s) => s.personId))].sort(),
      participants: [
        {
          personId: presiding.personId,
          role: "agency:actor" as const,
          detail: "Presiding",
        },
        ...dissenters.map((s) => ({
          personId: s.personId,
          role: "agency:dissenter" as const,
          detail: null,
        })),
      ],
      personFactConstraints: [],
      visibility: "public" as const,
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
    },
  };
}
export function completedCentralBankMeeting(
  facts: CentralBankFacts,
  plan: ReturnType<typeof resolveCentralBankMeeting>,
  eventId: EntityId,
) {
  return {
    ...facts.bank!,
    policyRate: rangeFromMid(plan.newMid, eventId),
    lastMeetingAt: facts.onDate,
    chairChoice: null,
  };
}
