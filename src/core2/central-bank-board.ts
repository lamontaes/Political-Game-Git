/** The central bank's board: fictional people, real seats and terms, and each member's view of a rate decision. */
import board from "./data/macro/board.json" with { type: "json" };
import history from "./data/macro/history.json" with { type: "json" };
import { getNameCorpus } from "./gov-rules/names-data";
import { SeededRng } from "./kernel/rng";
import type { MacroMonth, MacroParameter } from "./macro-model";
import type {
  ActOffer,
  ActionDefinition,
  CoreInput,
  HouseholdInput,
  PersonInput,
  Source,
} from "./types";

export const BOARD = board;

export interface BoardMember {
  id: string;
  personId: string;
  seatId: string;
  seatKind: "governor" | "president";
  districtId?: string;
  appointedAt: string;
  termEndsAt: string;
  career: string;
  experiencedInflationPct: number;
  /** Positive weighs inflation more (a hawk), negative weighs jobs more (a dove); from lived inflation. */
  inflationLean: number;
  source: Source;
}

export interface BoardOpening {
  people: PersonInput[];
  households: HouseholdInput[];
  members: BoardMember[];
}

const CPI = new Map(history.annualCpi.map((row) => [row.year, row.index]));

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dayBefore(date: string): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() - 1);
  return at.toISOString().slice(0, "YYYY-MM-DD".length);
}

/**
 * Learning-from-experience weighted mean of the annual inflation a person
 * lived through before `year` (Malmendier and Nagel 2016): recent years count
 * more, by the recorded weighting exponent.
 */
export function experiencedInflationPct(
  birthYear: number,
  year: number,
  p: MacroParameter,
): number {
  const age = year - birthYear;
  let weighted = p("zero"),
    total = p("zero");
  for (let back = p("one"); back < age; back++) {
    const now = CPI.get(year - back),
      before = CPI.get(year - back - p("one"));
    if (now === undefined || before === undefined) continue;
    const weight = ((age - back) / age) ** p("macroExperienceWeightShape");
    weighted += weight * (now / before - p("one")) * p("macroHundred");
    total += weight;
  }
  if (total === p("zero")) throw new Error("No lived inflation to weigh.");
  return weighted / total;
}

/** Who sits on the board at the opening. Seeded generation of who exists; their views follow from their lives. */
export function generateBoard(
  input: Pick<CoreInput, "seed" | "startedAt">,
  p: MacroParameter,
): BoardOpening {
  const start = input.startedAt,
    startYear = Number(start.slice(0, 4));
  const corpus = getNameCorpus();
  const source: Source = {
    tag: "SOURCED",
    asOf: start,
    citation: board.source.citation,
  };
  const seats: {
    seatId: string;
    seatKind: BoardMember["seatKind"];
    districtId?: string;
    appointedAt: string;
    termEndsAt: string;
  }[] = [];
  const g = board.governorSeats;
  // The seat whose term ends first after the start is seat 1; terms end every second January.
  let firstEnd = g.firstTermEndYear;
  while (isoDate(firstEnd, g.termEndMonth, g.termEndDay) < start)
    firstEnd += g.termEndYearStep;
  for (let seat = 0; seat < g.count; seat++) {
    const endYear = firstEnd + seat * g.termEndYearStep;
    const startTerm = endYear - p("macroGovernorTermYears");
    seats.push({
      seatId: `governor:${seat + 1}`,
      seatKind: "governor",
      appointedAt: isoDate(startTerm, g.termStartMonth, g.termStartDay),
      termEndsAt: isoDate(endYear, g.termEndMonth, g.termEndDay),
    });
  }
  const t = board.presidentTerm,
    termYears = p("macroPresidentTermYears");
  let termStart = t.anchorStartYear;
  while (isoDate(termStart + termYears, t.startMonth, t.startDay) <= start)
    termStart += termYears;
  while (isoDate(termStart, t.startMonth, t.startDay) > start)
    termStart -= termYears;
  for (const district of board.districts)
    seats.push({
      seatId: `president:${district.id}`,
      seatKind: "president",
      districtId: district.id,
      appointedAt: isoDate(termStart, t.startMonth, t.startDay),
      termEndsAt: dayBefore(
        isoDate(termStart + termYears, t.startMonth, t.startDay),
      ),
    });

  const people: PersonInput[] = [],
    households: HouseholdInput[] = [],
    drafts: Omit<BoardMember, "inflationLean">[] = [];
  const ids = seats.map((seat) => `person:central-bank:${seat.seatId}`);
  for (const [index, seat] of seats.entries()) {
    const rng = new SeededRng(
      JSON.stringify(["central-bank-member-v1", input.seed, seat.seatId]),
    );
    const appointedYear = Number(seat.appointedAt.slice(0, 4));
    const ageAtAppointment =
      p("macroGovernorMinimumAge") + rng.next() * p("macroGovernorAgeSpan");
    const birthYear = Math.floor(appointedYear - ageAtAppointment);
    const birthDate = isoDate(
      birthYear,
      rng.integer(1, 13),
      rng.integer(1, 29),
    );
    const personId = ids[index]!;
    const career = rng.pick(board.careers);
    const scale = p("macroTraitScaleBoard"),
      trait = () => (rng.next() * 2 - 1) * scale;
    people.push({
      id: personId,
      givenName: rng.pick(corpus.givenNames),
      familyName: rng.pick(corpus.familyNames),
      birthDate,
      placeId: board.placeId,
      householdId: `household:${personId}`,
      tier: board.memberTier,
      traits: {
        [board.traits.patience]: trait(),
        [board.traits.risk]: trait(),
        [board.traits.deliberation]: trait(),
      },
      liquidMinor: p("zero"),
      livingCostDailyMinor: p("zero"),
      source: {
        tag: "ESTIMATED",
        asOf: start,
        citation: board.source.citation,
        estimatedFrom:
          "Fictional member generated from the world seed; real seat, term and appointment dates.",
      },
      familyIds: [],
      knownIds: ids.filter((id) => id !== personId),
      pastFacts: [
        {
          id: `fact:${personId}:career`,
          date: isoDate(birthYear + 30, 1, 1),
          kind: "career-start",
          summary: career,
          source,
          facts: { career },
        },
        {
          id: `fact:${personId}:appointed`,
          date: seat.appointedAt,
          kind: "central-bank-appointment",
          summary: seat.seatId,
          source,
          facts: { seatId: seat.seatId, termEndsAt: seat.termEndsAt },
        },
      ],
    });
    households.push({
      id: `household:${personId}`,
      placeId: board.placeId,
      memberIds: [personId],
      source,
    });
    drafts.push({
      ...seat,
      id: `member:${seat.seatId}`,
      personId,
      career,
      experiencedInflationPct: experiencedInflationPct(birthYear, startYear, p),
      source,
    });
  }
  return { people, households, members: withLeans(drafts, p) };
}

/** Each lived-inflation figure's lean against the group's own mean and spread: positive weighs inflation more (a hawk). */
export function inflationLeans(
  experienced: readonly number[],
  p: MacroParameter,
): number[] {
  const mean =
    experienced.reduce((sum, value) => sum + value, p("zero")) /
    experienced.length;
  const deviation = Math.sqrt(
    experienced.reduce(
      (sum, value) => sum + (value - mean) ** p("two"),
      p("zero"),
    ) / experienced.length,
  );
  return experienced.map((value) =>
    deviation > p("zero")
      ? Math.tanh((value - mean) / (deviation * p("macroExperienceLeanScale")))
      : p("zero"),
  );
}

/** Each member's lean: how far their lived inflation sits from the board's, on a sliding scale. */
export function withLeans<T extends Omit<BoardMember, "inflationLean">>(
  drafts: readonly T[],
  p: MacroParameter,
): (T & { inflationLean: number })[] {
  const leans = inflationLeans(
    drafts.map((row) => row.experiencedInflationPct),
    p,
  );
  return drafts.map((row, i) => ({ ...row, inflationLean: leans[i]! }));
}

/** A seat whose term has ended, and the term it opens. */
export interface BoardVacancy {
  readonly seatId: string;
  readonly seatKind: BoardMember["seatKind"];
  readonly districtId?: string;
  readonly termStartsAt: string;
  readonly termEndsAt: string;
}

/** Someone who could be appointed to a seat: a recorded identity and their career. */
export interface BoardCandidate {
  readonly identity: {
    readonly id: string;
    readonly givenName: string;
    readonly familyName: string;
    readonly birthDate: string;
    readonly placeId: string;
    readonly seatKey: string;
    readonly source: Source;
  };
  readonly career: string;
  readonly experiencedInflationPct: number;
}

/** The next term of a seat whose term ends on `endedAt`: governors 14 years, reserve bank presidents five. */
export function nextTerm(
  member: Pick<
    BoardMember,
    "seatId" | "seatKind" | "districtId" | "termEndsAt"
  >,
  p: MacroParameter,
): BoardVacancy {
  const ended = member.termEndsAt;
  const start = new Date(`${ended}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 1);
  const termStartsAt = start.toISOString().slice(0, "YYYY-MM-DD".length);
  const years =
    member.seatKind === "governor"
      ? p("macroGovernorTermYears")
      : p("macroPresidentTermYears");
  const end = new Date(`${ended}T00:00:00Z`);
  end.setUTCFullYear(end.getUTCFullYear() + years);
  return {
    seatId: member.seatId,
    seatKind: member.seatKind,
    ...(member.districtId ? { districtId: member.districtId } : {}),
    termStartsAt,
    termEndsAt: end.toISOString().slice(0, "YYYY-MM-DD".length),
  };
}

/** Seeded generation of who could fill a seat; who is chosen is the appointer's decision. */
export function boardCandidates(
  seed: string,
  vacancy: BoardVacancy,
  p: MacroParameter,
): BoardCandidate[] {
  const corpus = getNameCorpus();
  const year = Number(vacancy.termStartsAt.slice(0, 4));
  const source: Source = {
    tag: "ESTIMATED",
    asOf: vacancy.termStartsAt,
    citation: board.source.citation,
    estimatedFrom:
      "Fictional candidate generated from the world seed for a real seat and term.",
  };
  return Array.from({ length: p("macroBoardCandidates") }, (_, index) => {
    const rng = new SeededRng(
      JSON.stringify([
        "central-bank-candidate-v1",
        seed,
        vacancy.seatId,
        vacancy.termStartsAt,
        index,
      ]),
    );
    const age =
      p("macroGovernorMinimumAge") + rng.next() * p("macroGovernorAgeSpan");
    const birthYear = Math.floor(year - age);
    const id = `person:central-bank:${vacancy.seatId}:${vacancy.termStartsAt}:${index}`;
    return {
      identity: {
        id,
        givenName: rng.pick(corpus.givenNames),
        familyName: rng.pick(corpus.familyNames),
        birthDate: isoDate(birthYear, rng.integer(1, 13), rng.integer(1, 29)),
        placeId: board.placeId,
        seatKey: vacancy.seatId,
        source,
      },
      career: rng.pick(board.careers),
      experiencedInflationPct: experiencedInflationPct(birthYear, year, p),
    };
  });
}

/** The seven governors, the permanent president and the year's four rotating presidents (12 U.S.C. 263). */
export function votersOn(
  date: string,
  members: readonly BoardMember[],
): BoardMember[] {
  const year = Number(date.slice(0, 4)),
    offset = year - board.rotation.anchorYear;
  const rotating = new Set(
    board.rotation.groups.map((group) => {
      const n = group.order.length;
      return group.order[((offset % n) + n) % n]!;
    }),
  );
  const permanent = new Set(
    board.districts
      .filter((row) => row.rotationGroup === "permanent")
      .map((row) => row.id),
  );
  return members.filter(
    (row) =>
      row.seatKind === "governor" ||
      permanent.has(row.districtId!) ||
      rotating.has(row.districtId!),
  );
}

/** The nth weekday of each meeting month, and the next one after a date. */
export function nextMeetingDate(after: string): string {
  const year = Number(after.slice(0, 4));
  for (const y of [year, year + 1])
    for (const meeting of board.meetings) {
      const first = new Date(Date.UTC(y, meeting.month - 1, 1));
      const shift = (board.meetingWeekday - first.getUTCDay() + 7) % 7;
      const day = 1 + shift + (meeting.nthWednesday - 1) * 7;
      const date = isoDate(y, meeting.month, day);
      if (date > after) return date;
    }
  throw new Error("No meeting in the calendar.");
}

export interface MeetingReadings {
  /** Latest 12-month consumer-price inflation, read in the goal's terms. */
  inflationPct: number;
  unemploymentPct: number;
  policyRatePct: number;
  month: string;
}

export function meetingReadings(
  latest: Readonly<MacroMonth>,
  policyRatePct: number,
  p: MacroParameter,
): MeetingReadings {
  return {
    inflationPct: latest.inflationPct - p("macroCpiOverPceWedgePct"),
    unemploymentPct: latest.unemploymentPct,
    policyRatePct,
    month: latest.month,
  };
}

export interface MemberView {
  memberId: string;
  personId: string;
  /** The rate this member thinks right, from their own weights. */
  desiredRatePct: number;
  /** Share of the distance they would close at one meeting, from their patience. */
  smoothing: number;
  /** Each concern's pull on the move, in percentage points; their sum is the preferred move. */
  pulls: { neutral: number; prices: number; jobs: number };
  sizeCost: number;
}

/**
 * A Taylor-type view weighted by the member's lean, closed gradually at the
 * board's pace. The member's temperament enters once, where the shared
 * chooser weighs moving against holding (`macro.rate-vote`), not here.
 */
export function memberView(
  member: Readonly<BoardMember>,
  readings: Readonly<MeetingReadings>,
  p: MacroParameter,
): MemberView {
  const lean = member.inflationLean;
  const inflationResponse =
    p("macroTaylorInflationResponse") *
    (p("one") + p("macroLeanInflationShift") * lean);
  const gapResponse =
    p("macroTaylorGapResponse") * (p("one") - p("macroLeanGapShift") * lean);
  const goal = p("macroInflationGoalPct");
  const neutral = p("macroNeutralRealRatePct") + goal - readings.policyRatePct;
  const prices =
    (p("one") + inflationResponse) * (readings.inflationPct - goal);
  const jobs =
    -gapResponse *
    p("macroOkunOutputPerUnemploymentPoint") *
    (readings.unemploymentPct - p("macroNaturalUnemploymentPct"));
  const smoothing = p("macroSmoothingBase");
  return {
    memberId: member.id,
    personId: member.personId,
    desiredRatePct: readings.policyRatePct + neutral + prices + jobs,
    smoothing,
    pulls: {
      neutral: smoothing * neutral,
      prices: smoothing * prices,
      jobs: smoothing * jobs,
    },
    sizeCost: p("one"),
  };
}

/** The moves on the table: never below the lowest target range. */
export function rateOptions(
  policyRatePct: number,
  p: MacroParameter,
): number[] {
  return board.rateMovesPct.filter(
    (move) =>
      policyRatePct + move >=
      p("macroPolicyLowerBoundPct") -
        p("macroPolicyStepPct") / p("macroHundred"),
  );
}

function definition(move: number, p: MacroParameter): ActionDefinition {
  const steps = Math.round(Math.abs(move) / p("macroPolicyStepPct"));
  const kind = steps === 0 ? board.actions.hold : board.actions.move;
  return {
    id: kind.id,
    actKinds: steps > 1 ? [...kind.actKinds, "take-risk"] : kind.actKinds,
    goalKinds: [],
    need: board.need,
    effortParameter: board.effortParameter,
    effectParameter: board.effectParameter,
    targetKind: board.targetKind,
    effect: board.effect,
  };
}

export const RATE_PULL_PROVIDER = "macro:rate-pull";

/** One offer per move; each concern's pull and the size cost enter as module reasons. */
export function rateOffers(
  view: Readonly<MemberView>,
  moves: readonly number[],
  meetingId: string,
  p: MacroParameter,
): ActOffer[] {
  return moves.map((move) => ({
    definition: definition(move, p),
    targetId: `macro-rate-option:${meetingId}:${move}`,
    availableHours: p("one"),
    effortHours: p("zero"),
    reasonBindings: [
      ...(["neutral", "prices", "jobs"] as const).map((concern) => ({
        id: `pull:${concern}`,
        provider: RATE_PULL_PROVIDER,
        weightParameter: "macroRatePullWeight",
        arguments: {
          concern,
          value: String(p("two") * move * view.pulls[concern]),
          meetingId,
        },
      })),
      {
        id: "size",
        provider: RATE_PULL_PROVIDER,
        weightParameter: "macroRatePullWeight",
        arguments: {
          concern: "size",
          value: String(-view.sizeCost * move * move),
          meetingId,
        },
      },
    ],
  }));
}

export function moveOfTarget(targetId: string): number {
  return Number(targetId.slice(targetId.lastIndexOf(":") + 1));
}

/** The committee's decision is the median vote; between two middle votes, the one nearer holding. */
export function committeeDecision(moves: readonly number[]): number {
  const sorted = [...moves].sort((a, b) => a - b);
  const low = sorted[Math.floor((sorted.length - 1) / 2)]!,
    high = sorted[Math.ceil((sorted.length - 1) / 2)]!;
  return Math.abs(low) <= Math.abs(high) ? low : high;
}
