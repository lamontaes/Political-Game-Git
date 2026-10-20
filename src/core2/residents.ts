/**
 * Two-level population (AGENTS.md, "Keep it simple"). Full people exist only
 * where they matter: the player's circle and household, public workers and
 * other named people. Everyone else is the modeled wider population: compact
 * household records that the counts are read from, and one residents account
 * per place that receives their wages and income and pays their purchases.
 *
 * `collapseToTwoLevels` turns a fully generated opening into that shape with
 * every total unchanged: people, cash, wages, retirement income and household
 * purchases. The residents engine then moves that money through the one
 * balanced journal on recorded dates.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import { stopgap } from "./stopgaps";
import {
  OUTSIDE_MARKET_KIND,
  outsideMarketAccount,
} from "./opening-outside-market";
import { DEFAULT_DEEP_PAST_DATA } from "./deep-past";
import type { FinanceContractInput } from "./finance-types";
import { FinanceReadGuard } from "./finance-plan";
import {
  nextWorkPayrollPeriod,
  workPayPeriodAtIndex,
  type WorkPayrollCalendarInput,
} from "./work-pay-period";
import type {
  CoreInput,
  HouseholdInput,
  HuskInput,
  IsoDate,
  JobInput,
  OrganizationInput,
  PersonId,
  PersonInput,
  PlaceId,
  Source,
  WorkCommitmentInput,
} from "./types";
import PLACE_EARNINGS from "./data/place-earnings-2024.json" with { type: "json" };
import schools from "./data/opening-public-schools.json" with { type: "json" };

export const RESIDENTS_STOPGAP = "SG-CORE-residents-cadence";
export const RESIDENTS_KIND = "residents";

export type ResidentFlowKind =
  "wages" | "retirement" | "purchase" | "outside-sales" | "outside-costs";

export type ResidentCadence =
  | { kind: "days"; every: number }
  | { kind: "months"; every: number; day: number };

/** One standing money flow between the wider population and a recorded owner. */
export interface ResidentFlowInput {
  id: string;
  kind: ResidentFlowKind;
  /** Finance kind for totals, e.g. household.food or income.retirement. */
  financeKind: string;
  payerId: string;
  payeeId: string;
  /** Residents account on the wider-population side of this flow. */
  residentsId: string;
  placeId: PlaceId;
  amountMinor: number;
  firstAt: IsoDate;
  cadence: ResidentCadence;
  endsAt?: IsoDate;
  salesReceipt: boolean;
  marketAdjusted: boolean;
  /**
   * Pay from jobs the game doesn't model: follows the place's pay level since
   * the opening (its finance conditions' wage factor), as modeled jobs'
   * pay does through their yearly raises.
   */
  payIndexed?: boolean;
  /** The employer whose count workers this pays (wages only). */
  organizationId?: string;
  /** Workers this wage flow pays, by job id; shrinks as people are filled in. */
  jobIds?: readonly string[];
  /** Each counted job's pay per day; amount = round(sum × periodFactor). */
  perDayMinorByJob?: Readonly<Record<string, number>>;
  periodFactor?: number;
  /**
   * A payroll paid twice a month is two flows, one per payday, each carrying
   * half the month: this lists the other payday's flow, which pays the same jobs.
   */
  partnerFlowIds?: readonly string[];
  /**
   * Wages: paydays at the opening whose period began before it pay only the
   * days worked since the opening, as full workers' earned pay does.
   */
  earnedDaysByDue?: Readonly<Record<string, number>>;
  /** Unplaced-worker pay: how many counted workers it pays (the opening's employment target less recorded jobs). */
  unplacedWorkers?: number;
  outsideId?: string;
  /** Purchase and retirement flows: each merged household contract's amount (fill-in takes it back). */
  amountByContract?: Readonly<Record<string, number>>;
  source: Source;
}

/** A collapsed household: the records the counts come from and fill-in draws on. */
export interface ResidentHouseholdRecord {
  household: HouseholdInput;
  people: readonly PersonInput[];
  jobs: readonly JobInput[];
  workCommitments: readonly WorkCommitmentInput[];
  contracts: readonly FinanceContractInput[];
}

export interface ResidentsInput {
  version: "core2-residents-v1";
  accounts: readonly { placeId: PlaceId; accountId: string }[];
  households: readonly ResidentHouseholdRecord[];
  flows: readonly ResidentFlowInput[];
  /** Each class and workgroup's size in the full build, by `${circle}|${contextKey}` (PEOPLE's peerCohortSize). */
  cohortSizes?: Readonly<Record<string, number>>;
  /** Employer payday calendars the counted workers were on (fill-in reuses their cadence). */
  calendars?: readonly WorkPayrollCalendarInput[];
  /**
   * Real households each counted household of a place stands for, where the
   * place opens at its Census count from a sample of its households (omit a
   * place for one each). Every reader of a count multiplies by it.
   */
  weights?: Readonly<Record<PlaceId, number>>;
  /**
   * Counted people carry no deep past: fill-in rebuilds a household's from
   * the world's seed and start date (deep past depends on nobody else).
   */
  pastBuild?: {
    seed: string;
    startedAt: IsoDate;
    /** Per person, how many of their facts came before deep past. */
    deepPastAt: Readonly<Record<string, number>>;
  };
  source: Source;
}

const sum = (values: Iterable<number>) => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};

function dayOf(date: string): number {
  return Number(date.slice(8, 10));
}

/** First date on or after `from` that falls on `day` (clamped to the month's end). */
export function nextMonthDay(from: IsoDate, day: number, months = 1): IsoDate {
  const at = new Date(`${from}T00:00:00.000Z`);
  const candidate = (year: number, month: number) => {
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, last)))
      .toISOString()
      .slice(0, 10);
  };
  const same = candidate(at.getUTCFullYear(), at.getUTCMonth());
  if (same >= from) return makeIsoDate(same);
  return makeIsoDate(candidate(at.getUTCFullYear(), at.getUTCMonth() + months));
}

export function advanceCadence(at: IsoDate, cadence: ResidentCadence): IsoDate {
  if (cadence.kind === "days")
    return makeIsoDate(addDays(makeIsoDate(at), cadence.every));
  const date = new Date(`${at}T00:00:00.000Z`);
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + cadence.every, 1),
  );
  return nextMonthDay(
    makeIsoDate(target.toISOString().slice(0, 10)),
    cadence.day,
  );
}

function perDayWageMinor(row: WorkCommitmentInput): number {
  const minutes = sum(row.slots.map((slot) => slot.minutes));
  return (minutes * row.hourlyMinor) / 60 / row.periodDays;
}

const DAYS_PER_YEAR = 365,
  MONTHS_PER_YEAR = 12;

/** A household's monthly living costs paid outside the town, due on the 1st. */
export function householdOutsideFlow(
  key: string,
  payerId: string,
  placeId: PlaceId,
  amountMinor: number,
  start: IsoDate,
  outsideId: string,
  residentsId: string,
  source: Source,
): ResidentFlowInput {
  return {
    id: `residents:outside-living:${key}`,
    kind: "purchase",
    financeKind: "household.outside-living-costs",
    payerId,
    payeeId: outsideId,
    residentsId,
    placeId,
    amountMinor,
    firstAt: nextMonthDay(makeIsoDate(addDays(makeIsoDate(start), 1)), 1),
    cadence: { kind: "months", every: 1, day: 1 },
    salesReceipt: false,
    marketAdjusted: false,
    source,
  };
}

function daysBetweenInclusive(from: IsoDate, through: string): number {
  return (
    Math.round(
      (Date.parse(`${through}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}

/**
 * A public school district's teachers are counted workers like any town's:
 * the district's pay owner (the town government's) pays their wages through the
 * counts' payroll, so there is no reason to keep them, and their households,
 * as full people (the year of a dense town grew 36 s when #5044 kept them).
 */
export function isSchoolDistrict(org: {
  classification?: string;
  publicPayAuthority?: unknown;
}): boolean {
  return (
    !!org.publicPayAuthority &&
    (org.classification ?? "").startsWith(schools.classification)
  );
}

/** Who stays a full person: the circle, whole households, and public workers. */
export function fullPeople(input: CoreInput): Set<PersonId> {
  // The circle: the player, family and the people they know (coworkers they
  // haven't met are filled in when met). Without a player, the supplied focus.
  const player = input.people.find((row) => row.id === input.playerId);
  const keep = new Set<PersonId>(
    player
      ? [player.id, ...player.familyIds, ...player.knownIds]
      : input.focusPersonIds,
  );
  const organizations = new Map(input.organizations.map((o) => [o.id, o]));
  for (const job of input.jobs) {
    const employer = organizations.get(job.organizationId);
    if (
      employer &&
      (employer.kind !== "employer" ||
        (employer.publicPayAuthority && !isSchoolDistrict(employer)))
    )
      keep.add(job.personId);
  }
  for (const org of input.publicOrganizations ?? [])
    for (const staff of org.staff ?? []) keep.add(staff.personId);
  // Households are never split: their contracts and cash are shared.
  for (const home of input.households)
    if (home.memberIds.some((id) => keep.has(id)))
      for (const id of home.memberIds) keep.add(id);
  return keep;
}

/**
 * Collapse everyone outside `fullPeople` into the wider population. Every
 * total is unchanged: people (full plus counted), cash (people plus residents
 * accounts), wages, retirement income and household purchases.
 */
export interface CollapseOptions {
  keep?: ReadonlySet<PersonId>;
  /** The part of a counted household's living cost not bought locally (a labeled CEX and HUD estimate) leaves the town. Off when an outside-spending engine is installed. */
  outsideLivingCosts?: boolean;
  /** Pay for counted workers the opening couldn't place (a labeled ACS median-earnings estimate). Off when a jobs engine places them. */
  unplacedWorkerIncome?: boolean;
  /** Real households each counted household of a place stands for (see `ResidentsInput.weights`). */
  weights?: Readonly<Record<PlaceId, number>>;
}

export function collapseToTwoLevels(
  input: CoreInput,
  options: CollapseOptions = {},
): CoreInput {
  stopgap(RESIDENTS_STOPGAP);
  const keep = new Set(options.keep ?? fullPeople(input));
  const start = makeIsoDate(input.startedAt);
  const peopleById = new Map(input.people.map((row) => [row.id, row]));
  const collapsedHomes = input.households.filter(
    (home) => !home.memberIds.some((id) => keep.has(id)),
  );
  const collapsedHomeIds = new Set(collapsedHomes.map((home) => home.id));
  const collapsed = new Set<PersonId>();
  for (const home of collapsedHomes)
    for (const id of home.memberIds) collapsed.add(id);
  for (const row of input.people)
    if (!keep.has(row.id) && !collapsed.has(row.id))
      throw new Error(`Person outside every household: ${row.id}`);

  const source: Source = {
    tag: "ESTIMATED",
    asOf: start,
    citation:
      "Wider population: the generated households of this place, kept as records and counts rather than individually simulated people (two-level population).",
    estimatedFrom:
      "Totals equal the full generated opening: people, cash, wages, retirement income and household purchases.",
  };
  // A school district holds no cash: its counted teachers are paid by the pay
  // owner of its authority (the town government's), as its full ones are.
  const organizationsById = new Map(input.organizations.map((o) => [o.id, o]));
  const payerOf = (organizationId: string) => {
    const org = organizationsById.get(organizationId);
    const owner =
      org && isSchoolDistrict(org)
        ? org.publicPayAuthority?.ownerId
        : undefined;
    return owner && organizationsById.has(owner) ? owner : organizationId;
  };
  const accountByPlace = new Map<PlaceId, string>();
  const residentCash = new Map<string, number>();
  const accountFor = (placeId: PlaceId) => {
    let id = accountByPlace.get(placeId);
    if (!id) {
      id = `residents:${placeId}`;
      accountByPlace.set(placeId, id);
      residentCash.set(id, 0);
    }
    return id;
  };
  const homeOf = new Map<PersonId, HouseholdInput>();
  for (const home of collapsedHomes) {
    const account = accountFor(home.placeId);
    for (const id of home.memberIds) {
      homeOf.set(id, home);
      // A sampled household stands for as many as its place's weight says.
      residentCash.set(
        account,
        residentCash.get(account)! +
          (peopleById.get(id)?.liquidMinor ?? 0) *
            (options.weights?.[home.placeId] ?? 1),
      );
    }
  }

  // Jobs and commitments of collapsed workers become count wage flows.
  const jobsByPerson = new Map<PersonId, JobInput[]>();
  for (const job of input.jobs)
    if (collapsed.has(job.personId))
      jobsByPerson.set(job.personId, [
        ...(jobsByPerson.get(job.personId) ?? []),
        job,
      ]);
  const commitmentsByPerson = new Map<PersonId, WorkCommitmentInput[]>();
  for (const row of input.workCommitments ?? [])
    if (collapsed.has(row.personId))
      commitmentsByPerson.set(row.personId, [
        ...(commitmentsByPerson.get(row.personId) ?? []),
        row,
      ]);
  const calendars = new Map(
    (input.workPayrollCalendars ?? []).map((row) => [row.id, row]),
  );
  const flows: ResidentFlowInput[] = [];
  const wageGroups = new Map<
    string,
    {
      calendar: WorkPayrollCalendarInput;
      residentsId: string;
      placeId: PlaceId;
      perDay: number;
      jobIds: string[];
      perDayByJob: Record<string, number>;
      source: Source;
    }
  >();
  for (const [personId, rows] of commitmentsByPerson)
    for (const row of rows) {
      if (row.endsAt !== undefined && row.endsAt <= start) continue;
      const calendar = row.payrollCalendarId
        ? calendars.get(row.payrollCalendarId)
        : undefined;
      if (!calendar)
        throw new Error(`Collapsed worker has no payroll calendar: ${row.id}`);
      const home = homeOf.get(personId)!;
      const residentsId = accountFor(home.placeId);
      const key = `${calendar.id}|${residentsId}`;
      const group = wageGroups.get(key) ?? {
        calendar,
        residentsId,
        placeId: home.placeId,
        perDay: 0,
        jobIds: [],
        perDayByJob: {},
        source: row.paySource,
      };
      group.perDay += perDayWageMinor(row);
      group.jobIds.push(row.jobId);
      group.perDayByJob[row.jobId] =
        (group.perDayByJob[row.jobId] ?? 0) + perDayWageMinor(row);
      wageGroups.set(key, group);
    }
  for (const [key, group] of wageGroups) {
    const calendar = group.calendar;
    const base = {
      kind: "wages" as const,
      financeKind: "work.count-payroll",
      payerId: payerOf(calendar.organizationId),
      payeeId: group.residentsId,
      residentsId: group.residentsId,
      placeId: group.placeId,
      salesReceipt: false,
      marketAdjusted: false,
      organizationId: calendar.organizationId,
      jobIds: group.jobIds,
      perDayMinorByJob: group.perDayByJob,
      source: group.source,
    };
    // Paydays from the opening on: the first ones may cover days before it,
    // which no one is owed in the game (full workers earn from attendance).
    const reads = new FinanceReadGuard(),
      units = { zero: 0, one: 1, monthsPerYear: MONTHS_PER_YEAR };
    const earnedDaysByDue: Record<string, number> = {};
    let period = nextWorkPayrollPeriod(reads, calendar, start, start, units);
    const firstDue = makeIsoDate(period.dueAt);
    while (period.fromAt < start) {
      const from = period.fromAt < start ? start : period.fromAt;
      earnedDaysByDue[period.dueAt] =
        period.throughAt < from
          ? 0
          : daysBetweenInclusive(makeIsoDate(from), period.throughAt);
      period = workPayPeriodAtIndex(
        reads,
        calendar,
        period.index + 1,
        start,
        units,
      );
    }
    const first = firstDue;
    if (calendar.periodDays) {
      flows.push({
        ...base,
        id: `residents:wages:${key}`,
        amountMinor: Math.round(group.perDay * calendar.periodDays),
        periodFactor: calendar.periodDays,
        firstAt: first,
        cadence: { kind: "days", every: calendar.periodDays },
        earnedDaysByDue,
      });
    } else {
      const months = calendar.periodMonths ?? 1;
      const monthly = (group.perDay * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
      const twice =
        calendar.rule === "twice-calendar-month-after-inclusive-period-end";
      const days = twice
        ? [dayOf(first), ((dayOf(first) + 14) % 28) + 1]
        : [dayOf(first)];
      const ids = days.map((_, index) => `residents:wages:${key}:${index}`);
      days.forEach((day, index) =>
        flows.push({
          ...base,
          id: ids[index]!,
          ...(ids.length > 1
            ? { partnerFlowIds: ids.filter((_, other) => other !== index) }
            : {}),
          amountMinor: Math.round((monthly * months) / days.length),
          periodFactor:
            (DAYS_PER_YEAR / MONTHS_PER_YEAR) * (months / days.length),
          firstAt: nextMonthDay(first, day),
          cadence: { kind: "months", every: months, day },
          earnedDaysByDue,
        }),
      );
    }
  }

  // Contracts: household purchases merge; retirement income goes to residents.
  const contracts: FinanceContractInput[] = [];
  const purchaseGroups = new Map<
    string,
    { rows: FinanceContractInput[]; residentsId: string; placeId: PlaceId }
  >();
  const removedIncome: FinanceContractInput[] = [];
  const contractsByHome = new Map<string, FinanceContractInput[]>();
  for (const row of input.finance?.contracts ?? []) {
    const collapsedPayers = row.payerIds.filter((id) => collapsed.has(id));
    const payeeCollapsed = collapsed.has(row.payeeId);
    if (!collapsedPayers.length && !payeeCollapsed) {
      contracts.push(row);
      continue;
    }
    if (collapsedPayers.length) {
      const home = homeOf.get(collapsedPayers[0]!)!;
      if (
        collapsedPayers.length !== row.payerIds.length ||
        (row.householdId !== undefined && row.householdId !== home.id) ||
        payeeCollapsed ||
        row.accruesArrears ||
        row.creditFacilityId ||
        row.interestFacilityId ||
        row.recipientIncome ||
        row.externalInflow
      )
        throw new Error(`Unsupported collapsed purchase terms: ${row.id}`);
      contractsByHome.set(home.id, [
        ...(contractsByHome.get(home.id) ?? []),
        row,
      ]);
      const residentsId = accountFor(home.placeId);
      const bucket = Math.floor((dayOf(row.dueAt) - 1) / 7);
      const key = [
        row.payeeId,
        row.kind,
        row.periodMonths,
        !!row.salesReceipt,
        !!row.marketAdjusted,
        row.endsAt ?? "",
        bucket,
        residentsId,
      ].join("|");
      const group = purchaseGroups.get(key) ?? {
        rows: [],
        residentsId,
        placeId: home.placeId,
      };
      group.rows.push(row);
      purchaseGroups.set(key, group);
      continue;
    }
    if (!row.recipientIncome || row.kind !== "income.retirement")
      throw new Error(`Unsupported collapsed income terms: ${row.id}`);
    const home = homeOf.get(row.payeeId)!;
    contractsByHome.set(home.id, [
      ...(contractsByHome.get(home.id) ?? []),
      row,
    ]);
    removedIncome.push(row);
  }
  for (const [key, group] of purchaseGroups) {
    const first = group.rows[0]!;
    const amount = sum(group.rows.map((row) => row.amountMinor));
    if (amount <= 0) continue;
    const day = Math.round(
      sum(group.rows.map((row) => dayOf(row.dueAt) * row.amountMinor)) / amount,
    );
    const firstDue = group.rows.map((row) => row.dueAt).sort()[0]!;
    flows.push({
      id: `residents:purchase:${key}`,
      kind: "purchase",
      financeKind: first.kind,
      payerId: group.residentsId,
      payeeId: first.payeeId,
      residentsId: group.residentsId,
      placeId: group.placeId,
      amountMinor: amount,
      firstAt: nextMonthDay(makeIsoDate(firstDue), Math.max(1, day)),
      cadence: {
        kind: "months",
        every: first.periodMonths,
        day: Math.max(1, day),
      },
      ...(first.endsAt ? { endsAt: first.endsAt } : {}),
      salesReceipt: !!first.salesReceipt,
      marketAdjusted: !!first.marketAdjusted,
      amountByContract: Object.fromEntries(
        group.rows.map((row) => [row.id, row.amountMinor]),
      ),
      source: first.source,
    });
  }
  // Collapsed retirees: the outside payer pays the residents directly, and
  // their share leaves the per-person funding obligation.
  if (removedIncome.length) {
    const removedIds = new Set(removedIncome.map((row) => row.id));
    const removedAwards = new Set(
      removedIncome.map((row) => row.recipientIncome!.sourceFactId),
    );
    const outsideByPayer = new Map<string, string>();
    for (let index = 0; index < contracts.length; index++) {
      const row = contracts[index]!;
      const inflow = row.externalInflow;
      if (!inflow?.incomeContractIds) continue;
      const removed = inflow.incomeContractIds.filter((id) =>
        removedIds.has(id),
      );
      if (!removed.length) continue;
      const remaining = inflow.incomeContractIds.filter(
        (id) => !removedIds.has(id),
      );
      const awards = (inflow.sourceAwardIds ?? []).filter(
        (id) => !removedAwards.has(id),
      );
      const removedHere = new Set(removed);
      let removedAmount = 0;
      for (const child of removedIncome)
        if (removedHere.has(child.id)) {
          removedAmount += child.amountMinor;
          for (const payer of child.payerIds)
            outsideByPayer.set(payer, row.payerIds[0]!);
        }
      if (!remaining.length) {
        contracts.splice(index, 1);
        index--;
      } else
        contracts[index] = {
          ...row,
          amountMinor: row.amountMinor - removedAmount,
          externalInflow: {
            ...inflow,
            incomeContractIds: remaining,
            sourceAwardIds: awards,
          },
        };
    }
    const retirementGroups = new Map<
      string,
      {
        amount: number;
        row: FinanceContractInput;
        residentsId: string;
        placeId: PlaceId;
        byContract: Record<string, number>;
      }
    >();
    for (const row of removedIncome) {
      const home = homeOf.get(row.payeeId)!;
      const residentsId = accountFor(home.placeId);
      const payer = outsideByPayer.get(row.payerIds[0]!) ?? row.payerIds[0]!;
      const key = `${payer}|${row.dueAt}|${row.periodMonths}|${residentsId}`;
      const group = retirementGroups.get(key) ?? {
        amount: 0,
        row: { ...row, payerIds: [payer] },
        residentsId,
        placeId: home.placeId,
        byContract: {},
      };
      group.amount += row.amountMinor;
      group.byContract[row.id] = row.amountMinor;
      retirementGroups.set(key, group);
    }
    for (const [key, group] of retirementGroups)
      flows.push({
        id: `residents:retirement:${key}`,
        kind: "retirement",
        financeKind: group.row.kind,
        payerId: group.row.payerIds[0]!,
        payeeId: group.residentsId,
        residentsId: group.residentsId,
        placeId: group.placeId,
        amountMinor: group.amount,
        firstAt: makeIsoDate(group.row.dueAt),
        cadence: {
          kind: "months",
          every: group.row.periodMonths,
          day: dayOf(group.row.dueAt),
        },
        salesReceipt: false,
        marketAdjusted: false,
        amountByContract: group.byContract,
        source: group.row.source,
      });
  }

  // Living costs not bought from a local seller (rent above all: HUD fair
  // market rent is part of each household's assigned cost) are paid outside
  // the town on the 1st. Counted households share one flow; full ones pay
  // from their own payer.
  const outsideAccounts = new Map(
    input.organizations
      .filter((row) => row.kind === OUTSIDE_MARKET_KIND)
      .map((row) => [row.placeId, row]),
  );
  const addedOutside: OrganizationInput[] = [];
  const outsideFor = (placeId: PlaceId) => {
    let row = outsideAccounts.get(placeId);
    if (!row) {
      row = outsideMarketAccount(placeId, start);
      outsideAccounts.set(placeId, row);
      addedOutside.push(row);
    }
    return row.id;
  };
  const boundMonthlyByHome = new Map<string, number>();
  for (const row of input.finance?.contracts ?? []) {
    const home = row.householdId;
    if (!home || !row.kind.startsWith("household.") || row.periodMonths <= 0)
      continue;
    boundMonthlyByHome.set(
      home,
      (boundMonthlyByHome.get(home) ?? 0) + row.amountMinor / row.periodMonths,
    );
  }
  const livingSource: Source = {
    tag: "ESTIMATED",
    asOf: start,
    citation:
      "Each household's assigned living cost (BLS CEX basket plus HUD Fair Market Rent) less what it buys from recorded local sellers.",
    estimatedFrom:
      "Paid on the 1st to landlords, lenders and sellers outside the town; no local landlord or housing market is modeled yet.",
  };
  const countedOutside = new Map<
    PlaceId,
    { amount: number; byHome: Record<string, number> }
  >();
  for (const home of options.outsideLivingCosts === false
    ? []
    : input.households) {
    const members = home.memberIds.map((id) => peopleById.get(id)!);
    const payer = members.find((row) => row.livingCostDailyMinor > 0);
    if (!payer) continue;
    const assigned = Math.round(
      (sum(members.map((row) => row.livingCostDailyMinor)) * DAYS_PER_YEAR) /
        MONTHS_PER_YEAR,
    );
    const unbound = Math.max(
      0,
      Math.round(assigned - (boundMonthlyByHome.get(home.id) ?? 0)),
    );
    if (unbound <= 0) continue;
    if (collapsedHomeIds.has(home.id)) {
      const group = countedOutside.get(home.placeId) ?? {
        amount: 0,
        byHome: {},
      };
      group.amount += unbound;
      group.byHome[`household:${home.id}`] = unbound;
      countedOutside.set(home.placeId, group);
    } else
      flows.push(
        householdOutsideFlow(
          home.id,
          payer.id,
          home.placeId,
          unbound,
          start,
          outsideFor(home.placeId),
          accountFor(home.placeId),
          livingSource,
        ),
      );
  }
  // Workers the opening couldn't place in a town firm (other industries or
  // jobs outside the town) still earn: the employment target from the
  // opening's own ACS/CPS receipt, less recorded jobs, at the median recorded
  // wage, paid every two weeks from outside.
  const receipt = input.placeMetadata?.openingEmploymentReceipt;
  const target = receipt
    ? Number(
        (JSON.parse(receipt) as { employmentTarget?: number }).employmentTarget,
      )
    : NaN;
  const employed = new Set(input.jobs.map((row) => row.personId)).size;
  const annualWages = input.jobs
    .map((row) => row.wageDailyMinor * DAYS_PER_YEAR)
    .sort((a, b) => a - b);
  // What the town's residents with earnings earn (ACS median earnings, the
  // place's own where its sample is firm enough), else the town's median
  // recorded wage. Many unplaced workers commute, so the town's own firms'
  // pay isn't theirs.
  const placeEarnings = (
    PLACE_EARNINGS.byPlace as Readonly<Record<string, number>>
  )[input.placeMetadata?.placeKey ?? ""];
  const median = placeEarnings
    ? placeEarnings * 100
    : (annualWages[Math.floor(annualWages.length / 2)] ?? 0);
  const adults = (ids: Iterable<PersonId>) => {
    let n = 0;
    for (const id of ids) {
      const born = peopleById.get(id)?.birthDate;
      if (born && Number(start.slice(0, 4)) - Number(born.slice(0, 4)) >= 18)
        n++;
    }
    return n;
  };
  const countedAdults = adults(collapsed),
    allAdults = adults(peopleById.keys());
  const unplaced =
    Number.isFinite(target) && allAdults > 0
      ? Math.max(0, target - employed) * (countedAdults / allAdults)
      : 0;
  if (
    options.unplacedWorkerIncome !== false &&
    unplaced > 0 &&
    median > 0 &&
    accountByPlace.size
  ) {
    const placeId = [...accountByPlace.keys()][0]!;
    // The sampled households stand for as many as the place's weight says,
    // so the workers they leave unplaced, and what those workers are paid, do.
    const weight = options.weights?.[placeId] ?? 1;
    flows.push({
      id: `residents:unplaced-wages:${placeId}`,
      kind: "wages",
      financeKind: "work.unplaced-residents",
      payerId: outsideFor(placeId),
      payeeId: accountFor(placeId),
      residentsId: accountFor(placeId),
      placeId,
      amountMinor: Math.round(
        (unplaced * weight * median * 14) / DAYS_PER_YEAR,
      ),
      unplacedWorkers: unplaced * weight,
      firstAt: makeIsoDate(addDays(makeIsoDate(start), 14)),
      cadence: { kind: "days", every: 14 },
      salesReceipt: false,
      marketAdjusted: false,
      payIndexed: true,
      source: {
        tag: "ESTIMATED",
        asOf: start,
        citation: placeEarnings
          ? `Opening employment target (ACS county employed/civilian population by age, CPS where missing) less recorded jobs, at the place's median earnings. ${PLACE_EARNINGS.citation}`
          : "Opening employment target (ACS county employed/civilian population by age, CPS where missing) less recorded jobs, at the town's median recorded wage (BLS OEWS-based job pay).",
        estimatedFrom: `${Math.round(unplaced)} counted workers in industries or places the opening doesn't model, each earning $${Math.round(median / 100)} a year${placeEarnings ? " (the place's median earnings)" : " (the town's median recorded wage; no firm place estimate)"}; a labeled estimate for the modeled wider population.`,
      },
    });
  }
  for (const [placeId, group] of countedOutside)
    flows.push({
      ...householdOutsideFlow(
        `counted:${placeId}`,
        accountFor(placeId),
        placeId,
        group.amount,
        start,
        outsideFor(placeId),
        accountFor(placeId),
        livingSource,
      ),
      amountByContract: group.byHome,
    });

  // Full people's ties to collapsed people become husks (met later, filled in then).
  const husks = new Map<PersonId, HuskInput>(
    (input.husks ?? []).map((row) => [row.id, row]),
  );
  for (const row of input.people) {
    if (!keep.has(row.id)) continue;
    for (const id of [...row.familyIds, ...row.knownIds]) {
      if (!collapsed.has(id) || husks.has(id)) continue;
      const other = peopleById.get(id)!;
      husks.set(id, {
        id,
        givenName: other.givenName,
        familyName: other.familyName,
        placeId: other.placeId,
        ...(other.countyId ? { countyId: other.countyId } : {}),
        looks: other.looks ?? {},
        said: other.said ?? [],
        birthDate: other.birthDate,
        familyIds: other.familyIds,
        source: other.source,
      });
    }
  }

  const deepPastAt: Record<string, number> = {};
  const households: ResidentHouseholdRecord[] = collapsedHomes.map((home) => ({
    household: home,
    // Nobody in the counts has a past until they're filled in.
    // Their upbringing is kept; deep past is rebuilt at fill-in, in place
    // (facts written after deep past, e.g. retirement history, follow it).
    // Nor where they learned each name they know: fill-in rebuilds that from
    // their past (MEMORY-FLAT; modules/residents.ts, knownSources).
    people: home.memberIds.map((id) => {
      const { knownIdSources: _sources, ...row } = peopleById.get(id)!;
      void _sources;
      const deep = `${row.id}:${DEFAULT_DEEP_PAST_DATA.version}:`;
      const facts = row.pastFacts ?? [];
      const first = facts.findIndex((fact) => fact.id.startsWith(deep));
      if (first < 0) return row;
      deepPastAt[row.id] = first;
      return {
        ...row,
        pastFacts: facts.filter((fact) => !fact.id.startsWith(deep)),
      };
    }),
    jobs: home.memberIds.flatMap((id) => jobsByPerson.get(id) ?? []),
    workCommitments: home.memberIds.flatMap(
      (id) => commitmentsByPerson.get(id) ?? [],
    ),
    contracts: contractsByHome.get(home.id) ?? [],
  }));
  const accounts: OrganizationInput[] = [...accountByPlace].map(
    ([placeId, id]) => ({
      id,
      placeId,
      name: "Residents not individually followed",
      kind: RESIDENTS_KIND,
      liquidMinor: Math.round(residentCash.get(id)!),
      source,
    }),
  );
  const collapsedCommitments = new Set(
    [...commitmentsByPerson.values()].flat().map((row) => row.id),
  );
  const workPayrollCalendars = (input.workPayrollCalendars ?? [])
    .map((row) => ({
      ...row,
      workCommitmentIds: row.workCommitmentIds.filter(
        (id) => !collapsedCommitments.has(id),
      ),
    }))
    .filter((row) => row.workCommitmentIds.length);
  return {
    ...input,
    people: input.people.filter((row) => keep.has(row.id)),
    households: input.households.filter((row) => !collapsedHomeIds.has(row.id)),
    jobs: input.jobs.filter((row) => !collapsed.has(row.personId)),
    workCommitments: (input.workCommitments ?? []).filter(
      (row) => !collapsed.has(row.personId),
    ),
    workPayrollCalendars,
    organizations: [...input.organizations, ...accounts, ...addedOutside],
    familyLinks: (input.familyLinks ?? []).filter((row) =>
      row.personIds.every((id) => keep.has(id)),
    ),
    focusPersonIds: input.focusPersonIds.filter((id) => keep.has(id)),
    priorFactsSource: (input.priorFactsSource ?? []).filter((row) =>
      keep.has(row.personId),
    ),
    husks: [...husks.values()],
    ...(input.finance ? { finance: { ...input.finance, contracts } } : {}),
    residents: {
      version: "core2-residents-v1",
      pastBuild: {
        seed: input.seed,
        startedAt: makeIsoDate(input.startedAt),
        deepPastAt,
      },
      accounts: [...accountByPlace].map(([placeId, accountId]) => ({
        placeId,
        accountId,
      })),
      households,
      ...(options.weights && Object.keys(options.weights).length
        ? { weights: options.weights }
        : {}),
      // Flows already recorded (e.g. outside buyers) are kept.
      flows: [...(input.residents?.flows ?? []), ...flows],
      calendars: [
        ...new Set(
          [...commitmentsByPerson.values()]
            .flat()
            .map((row) => row.payrollCalendarId)
            .filter((id): id is string => !!id),
        ),
      ].map((id) => calendars.get(id)!),
      source,
    },
  };
}
