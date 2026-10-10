import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import financeDataJson from "./data/finance.json" with { type: "json" };
import openingDataJson from "./data/opening-finance.json" with { type: "json" };
import type { FinanceContractInput, FinancePolicyData } from "./finance-types";
import { dateSegments } from "./modules/work";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type {
  CoreInput,
  HouseholdInput,
  Source,
  WorkCommitmentInput,
} from "./types";

export interface OpeningPurchaseCalendarData {
  householdFirstDueRule: string;
  noIncomeFallbackRule: string;
  businessFirstDueRule: string;
  recurringHouseholdDueRule: string;
  stopgapId: string;
  missingIncomeGap: string;
  source: {
    tag: string;
    citation: string;
    estimatedFrom: string;
    generationPriorVintage: string;
  };
}

export const DEFAULT_OPENING_PURCHASE_CALENDAR_DATA: OpeningPurchaseCalendarData =
  openingDataJson.openingPurchaseCalendar;

export interface OpeningPurchaseCalendarChoice {
  dueAt: string;
  source: Source;
  gaps: readonly string[];
  basisIds: readonly string[];
}

/** Opening-only indexes: a calendar query creates no income, attendance or payment. */
export function createOpeningPurchaseCalendar(
  input: CoreInput,
  recordedContracts: readonly FinanceContractInput[],
  data: OpeningPurchaseCalendarData = DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
): {
  household: (household: HouseholdInput) => OpeningPurchaseCalendarChoice;
  business: OpeningPurchaseCalendarChoice;
} {
  if (
    !data ||
    data.householdFirstDueRule !==
      "first-recorded-income-calendar-date-after-opening" ||
    data.noIncomeFallbackRule !==
      "recorded-expense-date-or-next-calendar-month" ||
    data.businessFirstDueRule !== "first-advanced-simulation-day" ||
    !data.stopgapId?.trim() ||
    !data.missingIncomeGap?.trim() ||
    data.source?.tag !== "ESTIMATED" ||
    !data.source.citation?.trim() ||
    !data.source.estimatedFrom?.trim() ||
    !data.source.generationPriorVintage?.trim()
  )
    throw new Error(
      "Opening purchases require a registered, sourced estimated first-due rule.",
    );
  stopgap(data.stopgapId);
  const p = (key: string) => parameter(key, registry),
    zero = p("zero"),
    one = p("one");
  if (zero !== zero - zero || one <= zero || one !== Math.sign(one))
    throw new Error(
      "Opening purchases require the exact one-day simulation step.",
    );
  const startedAt = makeIsoDate(input.startedAt),
    firstAdvancedAt = addDays(startedAt, one),
    dayMinutes = p("hoursPerDay") * p("minutesPerHour");
  if (!Number.isSafeInteger(dayMinutes) || dayMinutes <= zero)
    throw new Error(
      "Opening purchase calendar requires exact positive day/minute units.",
    );
  const index = <T extends { id: string }>(
    rows: readonly T[],
    kind: string,
  ) => {
    const map = new Map<string, T>();
    for (const row of rows) {
      if (!row.id?.trim() || map.has(row.id))
        throw new Error(
          `Duplicate or missing opening calendar ${kind}: ${row.id}`,
        );
      map.set(row.id, row);
    }
    return map;
  };
  const people = index(input.people, "person"),
    households = index(input.households, "household"),
    jobs = index(input.jobs, "job"),
    organizations = index(input.organizations, "organization");
  for (const id of people.keys())
    if (organizations.has(id))
      throw new Error(`Ambiguous opening calendar cash identity: ${id}`);
  index(input.workCommitments ?? [], "commitment");
  index(recordedContracts, "contract");
  const datedSource = (source: Source, id: string) => {
    if (
      !source ||
      !["SOURCED", "ESTIMATED"].includes(source.tag) ||
      !source.citation?.trim() ||
      makeIsoDate(source.asOf) > startedAt
    )
      throw new Error(
        `Opening calendar requires an available dated source: ${id}`,
      );
  };
  for (const household of households.values()) {
    if (new Set(household.memberIds).size !== household.memberIds.length)
      throw new Error(
        `Duplicate opening calendar household member: ${household.id}`,
      );
    for (const id of household.memberIds)
      if (people.get(id)?.householdId !== household.id)
        throw new Error(
          `Opening calendar requires actual household membership: ${household.id}/${id}`,
        );
  }
  type Anchor = { dueAt: string; ids: readonly string[]; detail: string };
  const wageByHousehold = new Map<string, Anchor[]>(),
    incomeByHousehold = new Map<string, Anchor[]>(),
    expenseByHousehold = new Map<string, Anchor[]>();
  const add = (map: Map<string, Anchor[]>, id: string, anchor: Anchor) => {
    const rows = map.get(id) ?? [];
    rows.push(anchor);
    map.set(id, rows);
  };
  const nextScheduledDate = (row: WorkCommitmentInput): string | undefined => {
    const start = makeIsoDate(row.startsAt),
      anchor = makeIsoDate(row.anchorDate),
      end = row.endsAt === undefined ? undefined : makeIsoDate(row.endsAt);
    if (
      !Number.isSafeInteger(row.periodDays) ||
      row.periodDays <= zero ||
      !Number.isSafeInteger(row.hourlyMinor) ||
      row.hourlyMinor < zero ||
      !Number.isFinite(row.expectedWeeklyMinutes) ||
      row.expectedWeeklyMinutes <= zero ||
      !row.slots.length ||
      (end !== undefined && end < start)
    )
      throw new Error(`Invalid actual opening work calendar: ${row.id}`);
    let earliest: string | undefined;
    const spans = row.slots
      .map((slot) => {
        if (
          !Number.isSafeInteger(slot.offsetDays) ||
          slot.offsetDays < zero ||
          slot.offsetDays >= row.periodDays ||
          !Number.isFinite(slot.startMinute) ||
          slot.startMinute < zero ||
          slot.startMinute >= dayMinutes ||
          !Number.isFinite(slot.minutes) ||
          slot.minutes <= zero ||
          slot.minutes > dayMinutes
        )
          throw new Error(`Invalid actual opening work slot: ${row.id}`);
        for (const segment of dateSegments(slot, dayMinutes, registry)) {
          if (segment.minutes <= zero) continue;
          // A spill segment cannot exist before its original scheduled shift began.
          const from = [
              firstAdvancedAt,
              addDays(start, segment.offset - slot.offsetDays),
            ]
              .sort()
              .at(-one)!,
            fromOffset = daysBetween(anchor, from),
            offset = segment.offset % row.periodDays,
            residue =
              ((fromOffset % row.periodDays) + row.periodDays) % row.periodDays,
            delay = (offset - residue + row.periodDays) % row.periodDays,
            dueAt = addDays(makeIsoDate(from), delay);
          if ((!end || dueAt <= end) && (!earliest || dueAt < earliest))
            earliest = dueAt;
        }
        return {
          start: slot.offsetDays * dayMinutes + slot.startMinute,
          minutes: slot.minutes,
        };
      })
      .sort((left, right) => left.start - right.start);
    for (const [position, span] of spans.entries()) {
      const next =
        spans[position + one]?.start ??
        spans[zero]!.start + row.periodDays * dayMinutes;
      if (span.start + span.minutes > next)
        throw new Error(`Overlapping actual opening work slots: ${row.id}`);
    }
    return earliest;
  };
  for (const row of input.workCommitments ?? []) {
    const person = people.get(row.personId),
      job = jobs.get(row.jobId);
    // Historical unowned commitments do not choose today's household calendar.
    if (!person || person.jobId !== row.jobId) continue;
    if (
      !job ||
      job.personId !== person.id ||
      job.organizationId !== row.organizationId ||
      !organizations.has(row.organizationId)
    )
      throw new Error(
        `Opening calendar requires the current owned job and employer: ${row.id}`,
      );
    if (makeIsoDate(row.startsAt) < makeIsoDate(person.birthDate))
      throw new Error(
        `Invalid actual opening work calendar before birth: ${row.id}`,
      );
    datedSource(job.source, job.id);
    datedSource(row.scheduleSource, row.id);
    datedSource(row.paySource, row.id);
    const dueAt = nextScheduledDate(row),
      jobEnd = job.endsAt === undefined ? undefined : makeIsoDate(job.endsAt);
    if (row.hourlyMinor <= zero || !dueAt || (jobEnd && dueAt >= jobEnd))
      continue;
    add(wageByHousehold, person.householdId, {
      dueAt,
      ids: [job.id, row.id],
      detail: `Owned work basis ${job.id}, ${row.id}; schedule/pay Sources remain on those records. This predicts neither attendance nor a paycheck.`,
    });
  }
  const incomePolicy: Pick<FinancePolicyData, "recipientIncomeKinds"> =
    financeDataJson;
  for (const row of recordedContracts) {
    // Other owners validate public, visitor, funding and business agreements.
    // Their dates neither authorize nor phase a household purchase estimate.
    if (!row.recipientIncome && !row.householdId) continue;
    datedSource(row.source, row.id);
    const dueAt = makeIsoDate(row.dueAt),
      end = row.endsAt === undefined ? undefined : makeIsoDate(row.endsAt);
    if (
      dueAt < startedAt ||
      (end && end <= dueAt) ||
      !Number.isSafeInteger(row.periodMonths) ||
      row.periodMonths <= zero ||
      !Number.isSafeInteger(row.amountMinor) ||
      row.amountMinor < zero
    )
      throw new Error(
        `Opening calendar needs actual nonoverdue compatible terms: ${row.id}`,
      );
    const firstOpportunity = dueAt < firstAdvancedAt ? firstAdvancedAt : dueAt;
    if (end && firstOpportunity >= end) continue;
    if (row.recipientIncome) {
      const term = row.recipientIncome,
        person = people.get(term.personId),
        home = households.get(term.householdId),
        rule = incomePolicy.recipientIncomeKinds.find(
          (entry) => entry.id === term.kindId,
        ),
        fact = person?.pastFacts?.find(
          (entry) => entry.id === term.sourceFactId,
        );
      if (
        !person ||
        !home ||
        person.householdId !== home.id ||
        !home.memberIds.includes(person.id) ||
        row.payeeId !== person.id ||
        !rule ||
        !fact ||
        !rule.sourceKinds.includes(fact.kind) ||
        fact.facts?.status !== rule.status ||
        makeIsoDate(fact.date) > startedAt ||
        Object.entries(
          rule.qualifyingFactsBySourceKind?.[fact.kind] ?? {},
        ).some(([key, value]) => fact.facts?.[key] !== value) ||
        row.kind !== rule.contractKind ||
        row.householdId ||
        row.salesReceipt ||
        row.salesReceiptBudget ||
        row.marketAdjusted ||
        row.accruesArrears ||
        row.creditFacilityId ||
        row.interestFacilityId ||
        row.periodMonths !== one ||
        row.payerIds.length !== one ||
        (!organizations.has(row.payerIds[zero]!) &&
          !people.has(row.payerIds[zero]!)) ||
        row.payerIds[zero] === person.id ||
        fact.facts.payerId !== row.payerIds[zero] ||
        Number(fact.facts.monthlyMinor) !== row.amountMinor ||
        (fact.facts.kindId && fact.facts.kindId !== term.kindId) ||
        (fact.facts.householdId && fact.facts.householdId !== home.id)
      )
        throw new Error(
          `Opening purchase calendar requires an actual dated qualified income award and matching terms: ${row.id}`,
        );
      datedSource(fact.source, fact.id);
      if (row.amountMinor > zero)
        add(incomeByHousehold, home.id, {
          dueAt: firstOpportunity,
          ids: [row.id, fact.id],
          detail: `Qualified income basis ${row.id}, ${fact.id}; entitlement and award Sources remain on those records. Payment is not predicted.`,
        });
    } else if (row.householdId && row.amountMinor > zero) {
      const home = households.get(row.householdId);
      if (
        !home ||
        !row.payerIds.length ||
        new Set(row.payerIds).size !== row.payerIds.length ||
        row.payerIds.some((id) => !home.memberIds.includes(id)) ||
        (!people.has(row.payeeId) && !organizations.has(row.payeeId)) ||
        row.payerIds.includes(row.payeeId)
      )
        throw new Error(
          `Opening fallback calendar requires an actual owned expense term: ${row.id}`,
        );
      add(expenseByHousehold, home.id, {
        dueAt: firstOpportunity,
        ids: [row.id],
        detail: `Owned expense basis ${row.id}; no admitted wage or recipient-income calendar. The expense is not income.`,
      });
    }
  }
  const choice = (
    dueAt: string,
    detail: string,
    basisIds: readonly string[],
    missingIncome: boolean,
    householdId?: string,
  ): OpeningPurchaseCalendarChoice => ({
    dueAt,
    source: {
      tag: "ESTIMATED",
      asOf: startedAt,
      generationPriorVintage: data.source.generationPriorVintage,
      citation:
        data.source.citation ===
        DEFAULT_OPENING_PURCHASE_CALENDAR_DATA.source.citation
          ? "JPMorgan Chase Institute, Farrell and Greig (2016), Paychecks, Paydays, and the Online Platform Economy; full citation and rationale: DATA openingPurchaseCalendar.source."
          : data.source.citation,
      estimatedFrom: `${data.source.estimatedFrom === DEFAULT_OPENING_PURCHASE_CALENDAR_DATA.source.estimatedFrom ? "" : `${data.source.estimatedFrom} `}DATA openingPurchaseCalendar.source; rule ${householdId ? data.householdFirstDueRule : data.businessFirstDueRule}${missingIncome ? ` / ${data.noIncomeFallbackRule}` : ""}; result ${dueAt}. ${detail} Basis IDs: ${basisIds.length ? basisIds.join(", ") : "none"}. ${data.stopgapId}${missingIncome ? ` Missing income timing: ${data.missingIncomeGap}:${householdId}.` : ""}`,
    },
    gaps: [
      data.stopgapId,
      ...(missingIncome ? [`${data.missingIncomeGap}:${householdId}`] : []),
    ],
    basisIds: [...basisIds],
  });
  const nextMonth = new Date(`${startedAt}T00:00:00.000Z`);
  nextMonth.setUTCDate(one);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + one);
  const fallbackAt = makeIsoDate(nextMonth.toISOString().split("T")[zero]!);
  const selected = new Map<string, OpeningPurchaseCalendarChoice>();
  for (const home of households.values()) {
    const wages = wageByHousehold.get(home.id) ?? [],
      incomes = incomeByHousehold.get(home.id) ?? [],
      expenses = expenseByHousehold.get(home.id) ?? [],
      hasIncome = wages.length > zero || incomes.length > zero,
      anchors = wages.length ? wages : incomes.length ? incomes : expenses,
      first = [...anchors].sort(
        (left, right) =>
          left.dueAt.localeCompare(right.dueAt) ||
          left.ids.join().localeCompare(right.ids.join()),
      )[zero];
    selected.set(
      home.id,
      first
        ? choice(first.dueAt, first.detail, first.ids, !hasIncome, home.id)
        : choice(
            fallbackAt,
            "No admitted work, recipient-income or expense calendar; explicit calendar-only fallback to the first next month (B0). Missing income timing remains open; no pay or award is invented.",
            [],
            true,
            home.id,
          ),
    );
  }
  return {
    household: (home) => {
      const actual = households.get(home.id),
        result = selected.get(home.id);
      if (
        !actual ||
        !result ||
        actual.memberIds.length !== home.memberIds.length ||
        actual.memberIds.some(
          (id, position) => home.memberIds[position] !== id,
        ) ||
        actual.placeId !== home.placeId
      )
        throw new Error(
          `Opening calendar requires the actual household: ${home.id}`,
        );
      return result;
    },
    business: choice(
      firstAdvancedAt,
      "Fresh business calendar only; no actual invoice is supplied. Household income calendars do not select business dues.",
      [],
      false,
    ),
  };
}
