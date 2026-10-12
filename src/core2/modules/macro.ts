/**
 * The national economy and the central bank. Monthly figures move from last
 * month, the rate in force and the town's own totals; eight meetings a year
 * the board votes from each member's own view; each month's prices, pay and
 * demand reach every business as dated conditions; a decision reprices
 * prime-linked credit lines on its effective date.
 */
import { addDays, makeIsoDate } from "../../simulation/dates";
import { chooseAct } from "../choice";
import { DEFAULT_DATA, extendData } from "../data";
import macroParameters from "../data/macro/parameters.json" with { type: "json" };
import {
  BOARD,
  RATE_PULL_PROVIDER,
  committeeDecision,
  generateBoard,
  meetingReadings,
  memberView,
  moveOfTarget,
  nextMeetingDate,
  rateOffers,
  rateOptions,
  votersOn,
  type BoardMember,
} from "../central-bank-board";
import {
  MACRO_HISTORY_SOURCE,
  historyMonths,
  monthKey,
  shiftMonth,
  stepMacroMonth,
  type MacroMonth,
  type MacroParameter,
} from "../macro-model";
import type { Parameter } from "../parameters";
import {
  REGIONAL_PARAMETERS,
  openRegional,
  regionalFactors,
  regionalRegistered,
  stepRegional,
} from "./regional";
import type {
  CoreAPI,
  CoreData,
  CoreInput,
  CoreModule,
  CoreState,
  Source,
} from "../types";

export const MACRO_MODULE_ID = "macro";
export const MACRO_PARAMETERS = macroParameters as unknown as Readonly<
  Record<string, Parameter>
>;
const STATE_ID = "macro:state";

interface MacroStateRow {
  id: string;
  openedAt: string;
  openingMonth: string;
  latestMonth: string;
  /** Target-range midpoint in force. */
  policyRatePct: number;
  placeIds: string[];
  townResidents: number;
}

export interface LinkedLineRow {
  id: string;
  facilityId: string;
  index: "prime";
  spreadPct: number;
  source: Source;
}

function recordSource(api: CoreAPI): Source {
  return {
    tag: "SOURCED",
    asOf: api.state.date,
    citation: (MACRO_HISTORY_SOURCE as Source).citation,
  };
}

function params(api: CoreAPI): MacroParameter {
  return (key) => api.parameter(key);
}

function store(api: CoreAPI) {
  return api.moduleState(MACRO_MODULE_ID);
}

function readState(api: CoreAPI): MacroStateRow | undefined {
  return store(api).table("state").get(STATE_ID) as MacroStateRow | undefined;
}

function dated(api: CoreAPI, estimatedFrom: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: (MACRO_HISTORY_SOURCE as Source).citation,
    estimatedFrom,
  };
}

function firstOfNextMonth(date: string, p: MacroParameter): string {
  return `${shiftMonth(monthKey(date), p("one"), p)}-01`;
}

/** Paid income in the town's places over the same month a year before, annual percent; null when not yet recorded. */
function townIncomeGrowth(
  api: CoreAPI,
  places: readonly string[],
  month: string,
  p: MacroParameter,
): number | null {
  const paid = api.state.finance.paidIncomeByPlaceMonth;
  const sum = (at: string) =>
    places.reduce<number | null>((total, place) => {
      const value = paid.get(`${at}:${place}`);
      return value === undefined ? total : (total ?? p("zero")) + value;
    }, null);
  const now = sum(month),
    before = sum(shiftMonth(month, -p("macroMonthsPerYear"), p));
  if (now === null || before === null || before <= p("zero")) return null;
  return (now / before - p("one")) * p("macroHundred");
}

function publishConditions(
  api: CoreAPI,
  state: MacroStateRow,
  row: MacroMonth,
): void {
  const opening = store(api)
    .table("months")
    .get(`macro-month:${state.openingMonth}`) as unknown as MacroMonth;
  const one = api.parameter("one"),
    hundred = api.parameter("macroHundred");
  const regional = regionalRegistered(api);
  for (const placeId of state.placeIds) {
    // The place's region moves its pay and demand against the nation's; price parities hold.
    const region = regional
      ? regionalFactors(api, placeId, opening, row)
      : { wage: one, demand: one };
    api.addFinanceCondition({
      id: `macro-condition:${placeId}:${api.state.date}`,
      placeId,
      at: api.state.date,
      generalPriceFactor: row.priceIndex / opening.priceIndex,
      wagePriceFactor:
        (row.hourlyEarnings / opening.hourlyEarnings) * region.wage,
      // Demand outside the town: national output against its trend, relative to the opening month.
      macroDemandFactor:
        ((one + row.outputGapPct / hundred) /
          (one + opening.outputGapPct / hundred)) *
        region.demand,
      source: dated(
        api,
        `National ${row.month}: prices, average hourly pay and output against trend, relative to ${state.openingMonth}${regional ? ", with the place's region's pay and jobs against the nation's" : ""}.`,
      ),
    });
  }
}

function runMonth(api: CoreAPI, state: MacroStateRow): void {
  const p = params(api);
  const months = store(api).table("months");
  const previous = months.get(
    `macro-month:${state.latestMonth}`,
  ) as unknown as MacroMonth;
  const month = shiftMonth(state.latestMonth, p("one"), p);
  const growth = townIncomeGrowth(
    api,
    state.placeIds,
    shiftMonth(month, -p("one"), p),
    p,
  );
  // No recorded town year yet: the town grows with the nation and adds nothing.
  const neutral = p("macroTrendGrowthPct") + p("macroInflationAnchorPct");
  const row = stepMacroMonth(
    previous,
    state.policyRatePct,
    growth ?? neutral,
    state.townResidents,
    p,
  );
  months.put(row as unknown as { id: string });
  if (regionalRegistered(api)) stepRegional(api, previous, row);
  const next = { ...state, latestMonth: row.month };
  store(api).table("state").put(next);
  publishConditions(api, next, row);
  api.moduleCalendar(MACRO_MODULE_ID).schedule({
    key: `month:${shiftMonth(row.month, p("one"), p)}`,
    date: firstOfNextMonth(api.state.date, p),
    kind: "macro-month",
    source: recordSource(api),
    sourceRecordIds: [row.id],
  });
}

function scheduleMeeting(api: CoreAPI, after: string): void {
  const date = nextMeetingDate(after);
  api.moduleCalendar(MACRO_MODULE_ID).schedule({
    key: `meeting:${date}`,
    date,
    kind: "macro-meeting",
    source: recordSource(api),
    sourceRecordIds: [STATE_ID],
  });
}

function open(api: CoreAPI): MacroStateRow {
  const p = params(api),
    core = api.state;
  const months = store(api).table("months");
  const rows = historyMonths(core.startedAt, p);
  for (const row of rows) months.put(row as unknown as { id: string });
  const board = generateBoard(core, p);
  for (const member of board.members) {
    if (!core.people.has(member.personId))
      throw new Error(
        "Board members must be in the opening input (withCentralBank).",
      );
    store(api)
      .table("members")
      .put({ ...member, isMember: true } as unknown as { id: string });
  }
  // Businesses' places, once at the opening; the regional layer replaces this with each place's region.
  const placeIds = [
    ...new Set([...core.organizations.values()].map((row) => row.placeId)),
  ].sort();
  const opening = rows.at(-p("one"))!;
  const step = p("macroPolicyStepPct");
  const state: MacroStateRow = {
    id: STATE_ID,
    openedAt: core.date,
    openingMonth: opening.month,
    latestMonth: opening.month,
    // The target range the effective rate sat in: its midpoint.
    policyRatePct: Math.max(
      p("macroPolicyLowerBoundPct"),
      Math.floor(opening.policyRatePct / step) * step + step / p("two"),
    ),
    placeIds,
    townResidents: core.people.size - board.members.length,
  };
  store(api)
    .table("state")
    .put(state as unknown as { id: string });
  if (regionalRegistered(api)) openRegional(api, opening, placeIds);
  if (monthKey(core.date) === shiftMonth(opening.month, p("one"), p))
    runMonth(api, state);
  else
    api.moduleCalendar(MACRO_MODULE_ID).schedule({
      key: `month:${shiftMonth(opening.month, p("one"), p)}`,
      date: firstOfNextMonth(core.date, p),
      kind: "macro-month",
      source: recordSource(api),
      sourceRecordIds: [opening.id],
    });
  scheduleMeeting(api, core.date);
  return readState(api)!;
}

function meet(api: CoreAPI, meetingId: string): void {
  const p = params(api),
    core = api.state as CoreState;
  const state = readState(api)!;
  const latest = store(api)
    .table("months")
    .get(`macro-month:${state.latestMonth}`) as unknown as MacroMonth;
  const readings = meetingReadings(latest, state.policyRatePct, p);
  const members = store(api)
    .table("members")
    .query("all", [true]) as unknown as BoardMember[];
  const voters = votersOn(core.date, members);
  const moves = rateOptions(state.policyRatePct, p);
  const votes = voters.map((member) => {
    const person = core.people.get(member.personId)!;
    const view = memberView(member, person.traits, readings, p);
    const result = chooseAct(
      core,
      member.personId,
      rateOffers(view, moves, meetingId, p),
    );
    return {
      member,
      view,
      move: moveOfTarget(result.selected!.targetId),
      reasonKey: result.reasonKey,
    };
  });
  const move = committeeDecision(votes.map((row) => row.move));
  const effectiveAt = addDays(
    makeIsoDate(core.date),
    BOARD.effectiveDaysAfterDecision,
  );
  for (const vote of votes)
    store(api)
      .table("votes")
      .put({
        id: `${meetingId}:${vote.member.id}`,
        meetingId,
        memberId: vote.member.id,
        personId: vote.member.personId,
        movePct: vote.move,
        dissent: vote.move !== move,
        inflationLean: vote.member.inflationLean,
        experiencedInflationPct: vote.member.experiencedInflationPct,
        desiredRatePct: vote.view.desiredRatePct,
        smoothing: vote.view.smoothing,
        pulls: vote.view.pulls,
        sizeCost: vote.view.sizeCost,
        reasonKey: vote.reasonKey,
      });
  store(api)
    .table("meetings")
    .put({
      id: meetingId,
      date: core.date,
      effectiveAt,
      readings: { ...readings },
      optionsPct: moves,
      voterIds: voters.map((row) => row.id),
      movePct: move,
      fromRatePct: state.policyRatePct,
      toRatePct: state.policyRatePct + move,
      dissents: votes.filter((row) => row.move !== move).length,
    });
  api.emit({
    id: `event:${meetingId}`,
    date: core.date,
    kind: "central-bank-rate-decision",
    personIds: voters.map((row) => row.personId),
    placeId: BOARD.placeId,
    source: recordSource(api),
    publicRecord: true,
  });
  api.moduleCalendar(MACRO_MODULE_ID).schedule({
    key: `effective:${meetingId}`,
    date: effectiveAt,
    kind: "macro-rate-effective",
    source: recordSource(api),
    sourceRecordIds: [meetingId],
  });
  scheduleMeeting(api, core.date);
}

function lineRate(primePct: number, line: LinkedLineRow, p: MacroParameter) {
  return (primePct + line.spreadPct) / p("macroHundred");
}

function takeEffect(api: CoreAPI, meetingId: string): void {
  const p = params(api);
  const meeting = store(api).table("meetings").get(meetingId) as unknown as {
    toRatePct: number;
    fromRatePct: number;
  };
  const state = readState(api)!;
  store(api)
    .table("state")
    .put({ ...state, policyRatePct: meeting.toRatePct });
  if (meeting.toRatePct === meeting.fromRatePct) return;
  const prime = meeting.toRatePct + p("macroPrimeSpreadPct");
  for (const row of store(api)
    .table("lines")
    .query("byIndex", ["prime"]) as unknown as LinkedLineRow[]) {
    const before = api.state.finance.facilities.get(row.facilityId);
    if (!before || !before.active) continue;
    const fromRate =
      before.annualInterestRate ??
      api.parameter(before.annualInterestParameter);
    const toRate = lineRate(prime, row, p);
    api.repriceCreditFacility(
      row.facilityId,
      toRate,
      dated(api, `Prime rate after ${meetingId}, plus the line's own spread.`),
    );
    store(api)
      .table("repricings")
      .put({
        id: `${row.facilityId}:${api.state.date}`,
        facilityId: row.facilityId,
        borrowerId: before.borrowerId,
        date: api.state.date,
        meetingId,
        fromRate,
        toRate,
      });
  }
}

/** Ties a recorded credit line to the prime rate plus its own spread, repricing it now and at every decision. */
export function linkCreditLineToPrime(
  api: CoreAPI,
  facilityId: string,
  spreadPct: number,
  lineSource: Source,
): void {
  const state = readState(api) ?? open(api);
  const row: LinkedLineRow = {
    id: facilityId,
    facilityId,
    index: "prime",
    spreadPct,
    source: lineSource,
  };
  store(api)
    .table("lines")
    .put(row as unknown as { id: string });
  api.repriceCreditFacility(
    facilityId,
    lineRate(
      state.policyRatePct + api.parameter("macroPrimeSpreadPct"),
      row,
      params(api),
    ),
    lineSource,
  );
}

export const MACRO_MODULE: CoreModule = {
  id: MACRO_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      months: {},
      members: { indexes: { all: { fields: ["isMember"] } } },
      meetings: {},
      votes: { indexes: { byMeeting: { fields: ["meetingId"] } } },
      lines: { indexes: { byIndex: { fields: ["index"] } } },
      repricings: { indexes: { byFacility: { fields: ["facilityId"] } } },
    },
  },
  reasonProviders: {
    [RATE_PULL_PROVIDER]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
      sourceIds: [binding.arguments!.meetingId!],
    }),
  },
  onCalendarWork(api, work) {
    const state = readState(api)!;
    if (work.kind === "macro-month") runMonth(api, state);
    else if (work.kind === "macro-meeting") meet(api, work.key);
    else if (work.kind === "macro-rate-effective")
      takeEffect(api, work.sourceRecordIds[0]!);
  },
  onDay(api) {
    if (!readState(api)) open(api);
  },
};

/** The board members are people in the world; add them to the opening input. */
export function withCentralBank(input: CoreInput): CoreInput {
  const p: MacroParameter = (key) => {
    const row = MACRO_PARAMETERS[key] ?? DEFAULT_DATA.parameters[key];
    if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
    return row.value;
  };
  const board = generateBoard(input, p);
  return {
    ...input,
    people: [...input.people, ...board.people],
    households: [...input.households, ...board.households],
  };
}

/** Core data with the macro parameters merged in. */
export function macroCoreData(base: CoreData = DEFAULT_DATA): CoreData {
  return extendData(base, {
    parameters: { ...MACRO_PARAMETERS, ...REGIONAL_PARAMETERS },
  });
}
