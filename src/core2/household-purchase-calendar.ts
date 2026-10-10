/** Estimated calendar phase only; this module neither creates income nor writes cash. */
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import type {
  FinanceContractInput,
  FinanceContractState,
  HouseholdPurchaseCalendarBasis,
  HouseholdPurchaseCalendarInput,
} from "./finance-types";
import type { FinancePlanningSession } from "./finance-plan";
import type {
  OpeningPurchaseCalendarChoice,
  OpeningPurchaseCalendarData,
} from "./opening-purchase-calendar";
import { stopgap } from "./stopgaps";
import type { Source } from "./types";

const ruleId = "generated-household-income-calendar-at-or-after-nominal";

/** Only fresh generated household budgets call this factory; supplied bills omit it. */
export function createHouseholdPurchaseCalendarMarker(
  householdId: string,
  choice: OpeningPurchaseCalendarChoice,
  data: OpeningPurchaseCalendarData,
): HouseholdPurchaseCalendarInput {
  if (
    !householdId.trim() ||
    data.recurringHouseholdDueRule !== ruleId ||
    !data.stopgapId.trim() ||
    choice.source.tag !== "ESTIMATED"
  )
    throw new Error(
      "Generated household purchases require the declared estimated recurrence rule.",
    );
  stopgap(data.stopgapId);
  return {
    ruleId: data.recurringHouseholdDueRule,
    stopgapId: data.stopgapId,
    householdId,
    firstNominalDueAt: makeIsoDate(choice.dueAt),
    openingBasisIds: [...choice.basisIds],
    source: { ...choice.source },
  };
}

/** Called by admission before its first contract/index mutation; no old-save adapter. */
export function validateHouseholdPurchaseCalendarAdmission(
  input: FinanceContractInput,
  date: string,
): HouseholdPurchaseCalendarInput | undefined {
  const marker = input.householdPurchaseCalendar;
  if (!marker) return undefined;
  if (
    marker.ruleId !== ruleId ||
    !marker.stopgapId?.trim() ||
    !marker.householdId?.trim() ||
    marker.householdId !== input.householdId ||
    input.accruesArrears ||
    !input.salesReceipt ||
    input.salesReceiptBudget ||
    input.recipientIncome ||
    input.externalInflow ||
    input.interestFacilityId ||
    input.source.tag !== "ESTIMATED" ||
    marker.source?.tag !== "ESTIMATED" ||
    !marker.source.citation?.trim() ||
    !marker.source.estimatedFrom?.trim() ||
    makeIsoDate(marker.source.asOf) > makeIsoDate(date) ||
    makeIsoDate(marker.firstNominalDueAt) !== makeIsoDate(input.dueAt) ||
    !Array.isArray(marker.openingBasisIds) ||
    marker.openingBasisIds.some((id) => !id.trim()) ||
    new Set(marker.openingBasisIds).size !== marker.openingBasisIds.length
  )
    throw new Error(
      "Generated household calendar metadata requires matching estimated nondebt purchase terms.",
    );
  stopgap(marker.stopgapId);
  return {
    ...marker,
    openingBasisIds: [...marker.openingBasisIds],
    source: { ...marker.source },
  };
}

/** Caller passes the unshifted next AND following nominal dates from existing month arithmetic. */
export function nextHouseholdPurchaseDate(
  session: FinancePlanningSession,
  row: FinanceContractState,
  nextNominalDueAt: string,
  followingNominalDueAt: string,
): HouseholdPurchaseCalendarBasis | undefined {
  const r = session.reads,
    m = session.metadata,
    zero = session.zero,
    one = session.one,
    marker = r.field(row, "householdPurchaseCalendar");
  if (!marker) return undefined;
  r.keys(marker);
  const selectedRule = r.field(marker, "ruleId"),
    gap = r.field(marker, "stopgapId"),
    homeId = r.field(marker, "householdId"),
    firstNominal = makeIsoDate(r.field(marker, "firstNominalDueAt")),
    nominal = makeIsoDate(nextNominalDueAt),
    following = makeIsoDate(followingNominalDueAt),
    previousNominal = m.field(row, "nominalDueAt");
  const copySource = (source: Source, availableAt = session.date): Source => {
    const tag = r.field(source, "tag"),
      asOf = makeIsoDate(r.field(source, "asOf")),
      citation = r.field(source, "citation");
    if (
      !["SOURCED", "ESTIMATED"].includes(tag) ||
      !citation.trim() ||
      asOf > availableAt
    )
      throw new Error(
        "Purchase renewal requires actual available source evidence.",
      );
    const copy: Record<string, unknown> = {};
    for (const key of r.keys(source)) {
      if (typeof key !== "string")
        throw new Error("Purchase calendar Source requires named data fields.");
      const value = r.field(source as unknown as Record<string, unknown>, key);
      if (value !== undefined && typeof value !== "string")
        throw new Error(
          "Purchase calendar Source requires plain scalar provenance.",
        );
      copy[key] = value;
    }
    return copy as unknown as Source;
  };
  const originalSource = copySource(r.field(marker, "source")),
    openingIds = r.array(r.field(marker, "openingBasisIds"), zero, one);
  if (
    selectedRule !== ruleId ||
    !gap.trim() ||
    homeId !== r.field(row, "householdId") ||
    r.field(row, "accruesArrears") ||
    !r.field(row, "salesReceipt") ||
    r.field(row, "salesReceiptBudget") ||
    r.field(row, "recipientIncome") ||
    r.field(row, "externalInflow") ||
    r.field(row, "interestFacilityId") ||
    r.field(r.field(row, "source"), "tag") !== "ESTIMATED" ||
    originalSource.tag !== "ESTIMATED" ||
    !originalSource.estimatedFrom?.trim() ||
    openingIds.some((id) => !id.trim()) ||
    new Set(openingIds).size !== openingIds.length ||
    !previousNominal ||
    makeIsoDate(previousNominal) < firstNominal ||
    firstNominal !== r.field(row, "firstDueAt") ||
    r.field(row, "billingDay") !==
      new Date(`${firstNominal}T00:00:00.000Z`).getUTCDate() ||
    makeIsoDate(previousNominal) > m.field(row, "dueAt") ||
    nominal <= previousNominal ||
    following <= nominal
  )
    throw new Error(
      "Purchase renewal requires the actual generated household marker and separate nominal cadence.",
    );
  stopgap(gap);
  const home = r.mapGet(r.field(session.core, "households"), homeId);
  if (!home || r.field(home, "id") !== homeId)
    throw new Error("Purchase renewal household is missing.");
  const memberIds = r.array(r.field(home, "memberIds"), zero, one);
  if (new Set(memberIds).size !== memberIds.length)
    throw new Error("Purchase renewal household members repeat.");
  type Reference = HouseholdPurchaseCalendarBasis["references"][number];
  type Anchor = { date: string; references: readonly Reference[] };
  const wages: Anchor[] = [],
    incomes: Anchor[] = [];
  const day =
    session.parameter("hoursPerDay") * session.parameter("minutesPerHour");
  if (!Number.isSafeInteger(day) || day <= zero)
    throw new Error("Purchase renewal requires exact positive day units.");
  const work = r.field(session.core, "work"),
    commitments = r.field(work, "commitments"),
    commitmentIndex = r.field(work, "commitmentsByPerson"),
    incomeIndex = session.map("incomeContractsByPerson");
  const monthDate = (
    from: string,
    months: number,
    billingDay: number,
  ): string => {
    const date = new Date(`${makeIsoDate(from)}T00:00:00.000Z`),
      month = date.getUTCMonth() + months,
      last = new Date(
        Date.UTC(date.getUTCFullYear(), month + one, zero),
      ).getUTCDate();
    return makeIsoDate(
      new Date(
        Date.UTC(date.getUTCFullYear(), month, Math.min(billingDay, last)),
      )
        .toISOString()
        .split("T")[zero]!,
    );
  };
  const incomeDate = (
    from: string,
    period: number,
    billingDay: number,
  ): string => {
    const base = new Date(`${makeIsoDate(from)}T00:00:00.000Z`),
      target = new Date(`${nominal}T00:00:00.000Z`),
      months =
        (target.getUTCFullYear() - base.getUTCFullYear()) *
          session.parameter("monthsPerYear") +
        target.getUTCMonth() -
        base.getUTCMonth(),
      periods = Math.max(zero, Math.floor(months / period));
    const candidate = monthDate(from, periods * period, billingDay);
    return candidate >= nominal
      ? candidate
      : monthDate(from, (periods + one) * period, billingDay);
  };
  const policy = session.policy()!;
  for (const personId of memberIds) {
    const person = r.mapGet(r.field(session.core, "people"), personId);
    if (
      !person ||
      r.field(person, "id") !== personId ||
      r.field(person, "householdId") !== homeId
    )
      throw new Error(
        "Purchase renewal requires current actual household membership.",
      );
    const jobId = r.field(person, "jobId"),
      job = jobId ? r.mapGet(r.field(session.core, "jobs"), jobId) : undefined,
      indexed = r.mapGet(commitmentIndex, personId);
    if (
      jobId &&
      (!job ||
        r.field(job, "id") !== jobId ||
        r.field(job, "personId") !== personId)
    )
      throw new Error("Purchase renewal owned job identity is stale.");
    if (job && r.field(person, "alive")) {
      const employerId = r.field(job, "organizationId"),
        employer = r.mapGet(r.field(session.core, "organizations"), employerId);
      if (!employer || r.field(employer, "id") !== employerId)
        throw new Error("Purchase renewal actual employer is missing.");
      const jobSource = copySource(r.field(job, "source")),
        jobEnd = r.field(job, "endsAt");
      for (const id of indexed ? r.members(indexed) : []) {
        const commitment = r.mapGet(commitments, id);
        if (
          !commitment ||
          r.field(commitment, "id") !== id ||
          r.field(commitment, "personId") !== personId
        )
          throw new Error("Purchase renewal commitment index is stale.");
        if (r.field(commitment, "jobId") !== jobId) continue;
        if (r.field(commitment, "organizationId") !== employerId)
          throw new Error("Purchase renewal commitment employer is stale.");
        const start = makeIsoDate(r.field(commitment, "startsAt")),
          anchor = makeIsoDate(r.field(commitment, "anchorDate")),
          end = r.field(commitment, "endsAt"),
          period = r.field(commitment, "periodDays"),
          rate = r.field(commitment, "hourlyMinor"),
          expected = r.field(commitment, "expectedWeeklyMinutes"),
          slots = r.array(r.field(commitment, "slots"), zero, one),
          scheduleSource = copySource(r.field(commitment, "scheduleSource")),
          paySource = copySource(r.field(commitment, "paySource"));
        if (
          !Number.isSafeInteger(period) ||
          period <= zero ||
          !Number.isSafeInteger(rate) ||
          rate < zero ||
          !Number.isFinite(expected) ||
          expected <= zero ||
          !slots.length ||
          start < r.field(person, "birthDate") ||
          (end && makeIsoDate(end) < start)
        )
          throw new Error("Purchase renewal periodic work terms are invalid.");
        const spans: { start: number; minutes: number }[] = [];
        let earliest: string | undefined;
        for (const slot of slots) {
          const offset = r.field(slot, "offsetDays"),
            minute = r.field(slot, "startMinute"),
            minutes = r.field(slot, "minutes");
          if (
            !Number.isSafeInteger(offset) ||
            offset < zero ||
            offset >= period ||
            !Number.isFinite(minute) ||
            minute < zero ||
            minute >= day ||
            !Number.isFinite(minutes) ||
            minutes <= zero ||
            minutes > day
          )
            throw new Error("Purchase renewal periodic work slot is invalid.");
          spans.push({ start: offset * day + minute, minutes });
          const same = Math.min(minutes, day - minute),
            overflow = minutes - same;
          for (const segment of [
            { offset, minutes: same },
            ...(overflow > zero
              ? [{ offset: offset + one, minutes: overflow }]
              : []),
          ]) {
            if (segment.minutes <= zero || rate <= zero) continue;
            const from = [nominal, addDays(start, segment.offset - offset)]
                .sort()
                .at(-one)!,
              residue =
                ((daysBetween(anchor, from) % period) + period) % period,
              delay = ((segment.offset % period) - residue + period) % period,
              date = addDays(makeIsoDate(from), delay);
            if (
              date < following &&
              (!end || date <= makeIsoDate(end)) &&
              (!jobEnd || date < makeIsoDate(jobEnd)) &&
              (!earliest || date < earliest)
            )
              earliest = date;
          }
        }
        spans.sort((left, right) => left.start - right.start);
        for (const [position, span] of spans.entries())
          if (
            span.start + span.minutes >
            (spans[position + one]?.start ?? spans[zero]!.start + period * day)
          )
            throw new Error("Purchase renewal work slots overlap.");
        if (earliest)
          wages.push({
            date: earliest,
            references: [
              { kind: "job", id: jobId!, source: jobSource },
              { kind: "commitment", id, source: scheduleSource, paySource },
            ],
          });
      }
    }
    const incomeIds = r.mapGet(incomeIndex, personId);
    for (const id of incomeIds ? r.members(incomeIds) : []) {
      const income = m.mapGet(session.map("contracts"), id),
        term = income && r.field(income, "recipientIncome");
      if (
        !income ||
        r.field(income, "id") !== id ||
        !term ||
        r.field(term, "personId") !== personId ||
        r.field(term, "householdId") !== homeId
      )
        throw new Error("Purchase renewal income index is stale.");
      if (r.field(income, "endedAt")) continue;
      const kind = r.field(term, "kindId"),
        awardId = r.field(term, "sourceFactId"),
        rules = r.array(r.field(policy, "recipientIncomeKinds"), zero, one),
        rule = rules.find((value) => r.field(value, "id") === kind),
        facts = r.field(person, "pastFacts"),
        award = facts
          ? r
              .array(facts, zero, one)
              .find((value) => r.field(value, "id") === awardId)
          : undefined,
        values = award && r.field(award, "facts"),
        payers = r.array(r.field(income, "payerIds"), zero, one),
        amount = r.field(income, "amountMinor"),
        period = r.field(income, "periodMonths"),
        end = r.field(income, "endsAt");
      if (
        !rule ||
        !award ||
        !values ||
        !r
          .array(r.field(rule, "sourceKinds"), zero, one)
          .includes(r.field(award, "kind")) ||
        makeIsoDate(r.field(award, "date")) > session.date ||
        r.field(values, "status") !== r.field(rule, "status") ||
        r.field(income, "kind") !== r.field(rule, "contractKind") ||
        r.field(income, "payeeId") !== personId ||
        r.field(income, "householdId") ||
        r.field(income, "salesReceipt") ||
        r.field(income, "salesReceiptBudget") ||
        r.field(income, "marketAdjusted") ||
        r.field(income, "accruesArrears") ||
        r.field(income, "creditFacilityId") ||
        r.field(income, "interestFacilityId") ||
        period !== one ||
        !Number.isSafeInteger(amount) ||
        amount < zero ||
        payers.length !== one ||
        payers[zero] === personId ||
        r.field(values, "payerId") !== payers[zero] ||
        Number(r.field(values, "monthlyMinor")) !== amount ||
        (r.field(values, "kindId") && r.field(values, "kindId") !== kind) ||
        (r.field(values, "householdId") &&
          r.field(values, "householdId") !== homeId)
      )
        throw new Error(
          "Purchase renewal requires the actual qualified recipient-income award and compatible terms.",
        );
      const payer =
        r.mapGet(r.field(session.core, "organizations"), payers[zero]!) ??
        r.mapGet(r.field(session.core, "people"), payers[zero]!);
      if (!payer) throw new Error("Purchase renewal income payer is missing.");
      copySource(r.field(payer, "source"));
      const qualification = r.field(rule, "qualifyingFactsBySourceKind"),
        required =
          qualification && r.field(qualification, r.field(award, "kind"));
      for (const key of required ? r.keys(required) : []) {
        if (
          typeof key !== "string" ||
          r.field(values, key) !== r.field(required!, key)
        )
          throw new Error("Purchase renewal award qualifications changed.");
      }
      const termSource = copySource(r.field(income, "source")),
        awardSource = copySource(
          r.field(award, "source"),
          makeIsoDate(r.field(award, "date")),
        ),
        billingDay = r.field(income, "billingDay");
      if (
        billingDay !==
        new Date(
          `${makeIsoDate(r.field(income, "firstDueAt"))}T00:00:00.000Z`,
        ).getUTCDate()
      )
        throw new Error(
          "Purchase renewal income billing day contradicts its admitted calendar.",
        );
      const date = incomeDate(m.field(income, "dueAt"), period, billingDay);
      if (
        amount > zero &&
        date < following &&
        (!end || date < makeIsoDate(end))
      )
        incomes.push({
          date,
          references: [
            { kind: "income-contract", id, source: termSource },
            { kind: "income-award", id: awardId, source: awardSource },
          ],
        });
    }
  }
  // Prioritize this household's owned wage calendar; no-wage periods use actual income terms.
  const anchors = wages.length ? wages : incomes,
    selected = [...anchors].sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.references
          .map((ref) => ref.id)
          .join()
          .localeCompare(right.references.map((ref) => ref.id).join()),
    )[zero],
    mode = selected
      ? wages.length
        ? "work"
        : "recipient-income"
      : "missing-income",
    effectiveDueAt = selected?.date ?? nominal;
  return {
    nominalDueAt: nominal,
    effectiveDueAt,
    mode,
    references: selected?.references ?? [],
    source: {
      ...originalSource,
      tag: "ESTIMATED",
      asOf: session.date,
      estimatedFrom: `${originalSource.estimatedFrom} Renewal rule ${selectedRule}; household ${homeId}; nominal ${nominal}, following nominal ${following}, effective ${effectiveDueAt}, mode ${mode}. Relevant current record IDs: ${selected?.references.map((ref) => ref.id).join(", ") || "none in this cadence window"}. ${selected ? "An owned scheduled or qualified income calendar opportunity predicts neither attendance nor payment." : "No eligible positive income opportunity exists in [nominal, following nominal); retain nominal with an explicit missing-income basis, not an invented job, award or paycheck."} This estimated bounded phase preserves the original amount and monthly cadence without weekend/short-month drift. ${gap}`,
    },
  };
}

/** Guard and detach the bounded current basis before putting it in a completed receipt. */
export function currentHouseholdPurchaseCalendarBasis(
  session: FinancePlanningSession,
  row: FinanceContractState,
): HouseholdPurchaseCalendarBasis | undefined {
  const r = session.reads,
    m = session.metadata,
    basis = m.field(row, "householdPurchaseCalendarBasis");
  if (!r.field(row, "householdPurchaseCalendar")) return undefined;
  if (!basis)
    throw new Error(
      "Generated household purchase lacks its admitted current calendar basis.",
    );
  r.keys(basis);
  const nominalDueAt = makeIsoDate(r.field(basis, "nominalDueAt")),
    effectiveDueAt = makeIsoDate(r.field(basis, "effectiveDueAt")),
    mode = r.field(basis, "mode");
  if (
    nominalDueAt !== m.field(row, "nominalDueAt") ||
    effectiveDueAt !== m.field(row, "dueAt") ||
    !["opening", "work", "recipient-income", "missing-income"].includes(mode)
  )
    throw new Error(
      "Current household calendar basis contradicts actual nominal/effective dates.",
    );
  const source = (value: Source): Source => {
    const copy: Record<string, unknown> = {};
    for (const key of r.keys(value)) {
      if (typeof key !== "string")
        throw new Error("Calendar Source requires named own fields.");
      const field = r.field(value as unknown as Record<string, unknown>, key);
      if (field !== undefined && typeof field !== "string")
        throw new Error("Calendar Source requires scalar provenance.");
      copy[key] = field;
    }
    const result = copy as unknown as Source;
    if (
      !["SOURCED", "ESTIMATED"].includes(result.tag) ||
      !result.citation.trim() ||
      makeIsoDate(result.asOf) > session.date
    )
      throw new Error("Current household calendar Source is invalid.");
    return result;
  };
  const basisSource = source(r.field(basis, "source"));
  if (basisSource.tag !== "ESTIMATED" || !basisSource.estimatedFrom?.trim())
    throw new Error(
      "The recurring purchase phase remains an explicit estimate.",
    );
  return {
    nominalDueAt,
    effectiveDueAt,
    mode,
    references: r
      .array(r.field(basis, "references"), session.zero, session.one)
      .map((ref) => {
        r.keys(ref);
        const id = r.field(ref, "id"),
          kind = r.field(ref, "kind"),
          paySource = r.field(ref, "paySource");
        if (
          !id.trim() ||
          ![
            "opening-basis",
            "job",
            "commitment",
            "income-contract",
            "income-award",
          ].includes(kind)
        )
          throw new Error("Current household calendar reference is invalid.");
        return {
          id,
          kind,
          source: source(r.field(ref, "source")),
          ...(paySource ? { paySource: source(paySource) } : {}),
        };
      }),
    source: basisSource,
  };
}
