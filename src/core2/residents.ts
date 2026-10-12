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
import { addDays, makeIsoDate } from "../simulation/dates";
import { stopgap } from "./stopgaps";
import type { FinanceContractInput } from "./finance-types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
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

export const RESIDENTS_STOPGAP = "SG-CORE-residents-cadence";
export const RESIDENTS_KIND = "residents";

export type ResidentFlowKind =
  "wages" | "retirement" | "purchase" | "outside-sales";

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
  /** The employer whose count workers this pays (wages only). */
  organizationId?: string;
  /** Workers this wage flow pays, by job id; shrinks as people are filled in. */
  jobIds?: readonly string[];
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
      (employer.kind !== "employer" || employer.publicPayAuthority)
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
export function collapseToTwoLevels(
  input: CoreInput,
  options: { keep?: ReadonlySet<PersonId> } = {},
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
      residentCash.set(
        account,
        residentCash.get(account)! + (peopleById.get(id)?.liquidMinor ?? 0),
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
        source: row.paySource,
      };
      group.perDay += perDayWageMinor(row);
      group.jobIds.push(row.jobId);
      wageGroups.set(key, group);
    }
  for (const [key, group] of wageGroups) {
    const calendar = group.calendar;
    const base = {
      kind: "wages" as const,
      financeKind: "work.count-payroll",
      payerId: calendar.organizationId,
      payeeId: group.residentsId,
      residentsId: group.residentsId,
      placeId: group.placeId,
      salesReceipt: false,
      marketAdjusted: false,
      organizationId: calendar.organizationId,
      jobIds: group.jobIds,
      source: group.source,
    };
    const first = makeIsoDate(
      calendar.firstPaydayAt < start ? start : calendar.firstPaydayAt,
    );
    if (calendar.periodDays) {
      flows.push({
        ...base,
        id: `residents:wages:${key}`,
        amountMinor: Math.round(group.perDay * calendar.periodDays),
        firstAt: first,
        cadence: { kind: "days", every: calendar.periodDays },
      });
    } else {
      const months = calendar.periodMonths ?? 1;
      const monthly = (group.perDay * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
      const twice =
        calendar.rule === "twice-calendar-month-after-inclusive-period-end";
      const days = twice
        ? [dayOf(first), ((dayOf(first) + 14) % 28) + 1]
        : [dayOf(first)];
      days.forEach((day, index) =>
        flows.push({
          ...base,
          id: `residents:wages:${key}:${index}`,
          amountMinor: Math.round((monthly * months) / days.length),
          firstAt: nextMonthDay(first, day),
          cadence: { kind: "months", every: months, day },
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
      const removedAmount = sum(
        removedIncome
          .filter((child) => removed.includes(child.id))
          .map((child) => child.amountMinor),
      );
      for (const child of removedIncome)
        if (removed.includes(child.id))
          for (const payer of child.payerIds)
            outsideByPayer.set(payer, row.payerIds[0]!);
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
      };
      group.amount += row.amountMinor;
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
        source: group.row.source,
      });
  }

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

  const households: ResidentHouseholdRecord[] = collapsedHomes.map((home) => ({
    household: home,
    people: home.memberIds.map((id) => peopleById.get(id)!),
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
      liquidMinor: residentCash.get(id)!,
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
    organizations: [...input.organizations, ...accounts],
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
      accounts: [...accountByPlace].map(([placeId, accountId]) => ({
        placeId,
        accountId,
      })),
      households,
      // Flows already recorded (e.g. outside buyers) are kept.
      flows: [...(input.residents?.flows ?? []), ...flows],
      source,
    },
  };
}
