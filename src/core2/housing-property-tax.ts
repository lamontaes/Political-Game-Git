/**
 * Property tax on owners' homes: a household with a mortgage pays a twelfth
 * of its home's assessed value times the rate in force each month into its
 * servicer's escrow account, which pays each installment when it falls due
 * (its place's schedule); one without pays each installment itself, through
 * the ledger, to the taxing government. The assessed value follows the home's
 * value each January, but where the law caps assessment growth it rises no
 * faster than the cap (a home bought since is assessed at its price).
 *
 * The rate, the cap and who's paid come from the law in force (OPUS-GOV's
 * `lawInForce(api, "property-tax")`: the county's recorded rate) wherever
 * the laws are open; another source can be registered with
 * `registerPropertyTax`. Without the laws, each state's average effective
 * rate stands in. It's paid to the county's treasury where the budgets
 * engine keeps the county's government, else outside the town, where the
 * core's living cost sent owners' taxes before. A law can cap how fast
 * assessments rise (`setPropertyTaxCap`).
 */
import taxData from "./data/housing/property-tax.json" with { type: "json" };
import dueDates from "./data/housing/property-tax-due-dates.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import type { ModuleTable } from "./module-state";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState, Source } from "./types";

export interface PropertyTaxTerms {
  /** Annual tax as a share of assessed value. */
  readonly rate: number;
  /** The most assessed value may rise in a year, as a share; none when uncapped. */
  readonly assessmentCapShare?: number;
  /** Who's paid; the place's outside account when not given. */
  readonly payeeId?: string;
  readonly source: Source;
}

type TermsSource = (
  api: CoreAPI,
  placeId: string,
) => PropertyTaxTerms | undefined;
let termsSource: TermsSource | undefined;

export function registerPropertyTax(source: TermsSource): void {
  termsSource = source;
}

const RATES = taxData.byState as Record<string, number>;

/** The state's average effective rate on owner-occupied homes, as an annual share of value. */
export function stateEffectiveRate(usps: string): number {
  return RATES[usps] ?? taxData.national;
}

/** The county's rate in force; before the recorded rate's date, the recorded row stands as the county's rate. */
function fromLaw(api: CoreAPI): PropertyTaxTerms | undefined {
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID)) return undefined;
  let answer;
  try {
    answer = lawInForce(api, "property-tax");
  } catch {
    return undefined;
  }
  const row = answer.governing ?? answer.pending[0] ?? null;
  const percent = row?.value;
  if (typeof percent !== "number") return undefined;
  return {
    rate: percent / api.parameter("macroHundred"),
    source: {
      tag: row!.estimate || !answer.governing ? "ESTIMATED" : "SOURCED",
      asOf: answer.governing ? row!.effectiveDate : api.state.date,
      citation: [row!.source].flat().join(" "),
      ...(row!.estimate || !answer.governing
        ? {
            estimatedFrom:
              "The county's recorded effective rate on owner-occupied homes (median tax over median value).",
          }
        : {}),
    },
  };
}

const CAP_ROW = "law:assessment-cap";

/** A law caps how fast an assessment may rise a year (a share), or lifts the cap (null). */
export function setPropertyTaxCap(api: CoreAPI, capShare: number | null): void {
  api
    .moduleState("housing")
    .table("assessments")
    .put({ id: CAP_ROW, capShare });
}

/** The county's treasury, where the budgets engine keeps the county's government. */
function countyTreasury(api: CoreAPI): string | undefined {
  if (!(api.state as CoreState).modules.has(BUDGETS_MODULE_ID))
    return undefined;
  return governments(api).find((row) => row.level === "county")?.organizationId;
}

function terms(api: CoreAPI, placeId: string): PropertyTaxTerms {
  const found = termsSource?.(api, placeId) ?? fromLaw(api);
  const cap = (
    api.moduleState("housing").table("assessments").get(CAP_ROW) as
      { capShare: number | null } | undefined
  )?.capShare;
  const payeeId = found?.payeeId ?? countyTreasury(api);
  const registered = found && {
    ...found,
    ...(cap != null && found.assessmentCapShare === undefined
      ? { assessmentCapShare: cap }
      : {}),
    ...(payeeId ? { payeeId } : {}),
  };
  if (registered) return registered;
  stopgap("SG-WORLD-property-tax-rate");
  return {
    rate: stateEffectiveRate(api.state.placeMetadata?.housingState ?? ""),
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: taxData.source.citation,
      estimatedFrom:
        "The state's average effective rate on owner-occupied homes, until the county's rate in force is read.",
    },
  };
}

interface AssessmentRow {
  id: string;
  householdId: string;
  assessedMinor: number;
  year: number;
  /** What the servicer's escrow holds for the home (below zero: what it advanced). */
  escrowMinor?: number;
  /** Who holds that escrow. */
  servicerId?: string;
  /** The monthly escrow deposit set by the last yearly analysis. */
  depositMinor?: number;
  /** When that analysis ran (YYYY-MM). */
  analyzedMonth?: string;
}

/**
 * RESPA's yearly escrow analysis (12 CFR 1024.17): the next twelve months of
 * deposits and installments projected from today's balance, held to a
 * cushion. A projected shortage is spread over the next twelve deposits; a
 * surplus of at least the refund threshold goes back to the owner, and a
 * smaller one lowers the deposit.
 */
function analyzeEscrow(
  usps: string,
  month: number,
  months: number,
  annual: number,
  balance: number,
  cushionShare: number,
  refundThresholdMinor: number,
): { depositMinor: number; refundMinor: number } {
  const base = annual / months;
  let running = balance,
    lowest = Number.POSITIVE_INFINITY;
  for (let k = 0; k < months; k++) {
    const at = ((month - 1 + k) % months) + 1;
    running += base - (dueShare(usps, at) ?? 1 / months) * annual;
    lowest = Math.min(lowest, running);
  }
  const gap = annual * cushionShare - lowest;
  if (gap > 0)
    return { depositMinor: Math.round(base + gap / months), refundMinor: 0 };
  if (-gap >= refundThresholdMinor)
    return { depositMinor: Math.round(base), refundMinor: Math.floor(-gap) };
  return { depositMinor: Math.round(base + gap / months), refundMinor: 0 };
}

/** Whole months from one YYYY-MM to another. */
function monthsFrom(from: string, to: string): number {
  return (
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    Number(to.slice(5, 7)) -
    Number(from.slice(5, 7))
  );
}

/**
 * The share of a year's tax an escrow holds at the start of a month: the
 * least that keeps it from running short over the next twelve months of
 * deposits and installments (the lowest balance RESPA's escrow analysis
 * targets, before any cushion; 12 CFR 1024.17).
 */
function escrowHeldShare(usps: string, month: number, months: number): number {
  let running = 0,
    lowest = 0;
  for (let k = 0; k < months; k++) {
    const at = ((month - 1 + k) % months) + 1;
    running += 1 / months - (dueShare(usps, at) ?? 1 / months);
    lowest = Math.min(lowest, running);
  }
  return -lowest;
}

/** The share of a year's tax due this month for a home without a mortgage, by its place's installments; undefined where no schedule is recorded. */
function dueShare(usps: string, month: number): number | undefined {
  const row = (
    dueDates.places as Record<
      string,
      {
        installments: { month: number; day: number }[];
        verified?: { status: string };
      }
    >
  )[usps];
  if (!row) return undefined;
  if (!row.installments.length) return 0;
  // Where no official text could be read, or the statute leaves the dates to each town, the schedule is an estimate.
  if (row.verified?.status === "unverified")
    stopgap("SG-WORLD-property-tax-due-dates-unverified");
  return (
    row.installments.filter((due) => due.month === month).length /
    row.installments.length
  );
}

/** Bills every owner household for what falls due this month (a twelfth through escrow, or its installment); returns what was paid. */
export function billPropertyTax(
  api: CoreAPI,
  assessments: ModuleTable,
  homes: readonly {
    householdId: string;
    placeId: string;
    valueMinor: number;
  }[],
): number {
  const c = api.state as CoreState,
    year = Number(c.date.slice(0, 4)),
    months = api.parameter("macroMonthsPerYear");
  // Owners with a mortgage pay monthly into escrow at their servicer; the rest on the place's due dates.
  const usps = c.placeMetadata?.housingState ?? "",
    due = dueShare(usps, Number(c.date.slice(5, 7)));
  // Each escrowed home's servicer: the mortgage's holder, or the bank for a home loan made in play.
  const escrowed = new Map<string, { servicer: string; opening: boolean }>();
  for (const row of api
    .moduleState("housing")
    .table("mortgages")
    .rows() as unknown as {
    householdId: string;
    holderId: string;
    monthsLeft: number;
  }[])
    if (row.monthsLeft > 0)
      escrowed.set(row.householdId, { servicer: row.holderId, opening: true });
  if ((api.state as CoreState).modules.has("credit"))
    for (const row of api
      .moduleState("credit")
      .table("loans")
      .query("open", [true]) as unknown as {
      kind?: string;
      householdId?: string;
      lenderId: string;
    }[])
      if (row.kind === "mortgage" && row.householdId)
        escrowed.set(row.householdId, {
          servicer: row.lenderId,
          opening: false,
        });
  const byPlace = new Map<string, PropertyTaxTerms>();
  const termsFor = (placeId: string) => {
    let row = byPlace.get(placeId);
    if (!row) byPlace.set(placeId, (row = terms(api, placeId)));
    return row;
  };
  const payee = (placeId: string, t: PropertyTaxTerms) =>
    t.payeeId ??
    [...c.organizations.values()].find(
      (org) => org.placeId === placeId && org.outsideFlow !== undefined,
    )?.id;
  // What each payer owes this month, by where it goes; the wider population's homes are paid from their place's pool.
  const pooledHomes = new Map<
    string,
    { householdId: string; amountMinor: number }[]
  >();
  const pooled = new Map<
    string,
    { placeId: string; to: string; amountMinor: number; source: Source }
  >();
  let total = 0;
  const pay = (
    householdId: string,
    placeId: string,
    toAccount: string,
    amountMinor: number,
    why: string,
    source: Source,
  ): number => {
    if (amountMinor <= 0) return 0;
    const household = c.households.get(householdId);
    if (!household) {
      const key = `${placeId}|${toAccount}|${why}`;
      const row = pooled.get(key) ?? {
        placeId,
        to: toAccount,
        amountMinor: 0,
        source,
      };
      row.amountMinor += amountMinor;
      pooled.set(key, row);
      // Which homes this pooled payment credits, so a short pool credits each home only what it paid.
      const homesOf = pooledHomes.get(key) ?? [];
      homesOf.push({ householdId, amountMinor });
      pooledHomes.set(key, homesOf);
      // The pool pays in full at the month's end; the wider population's balances are pooled too.
      return amountMinor;
    }
    // A full household pays from its members' cash, largest balance first.
    let paid = 0;
    for (const personId of [...household.memberIds]
      .filter((pid) => c.people.has(pid))
      .sort(
        (a, b) => c.people.get(b)!.liquidMinor - c.people.get(a)!.liquidMinor,
      )) {
      if (paid >= amountMinor) break;
      paid += moveTo(
        `${why}:${householdId}:${c.date}:${personId}`,
        accounts.main(personId),
        toAccount,
        amountMinor - paid,
        source,
      );
    }
    return paid;
  };
  const accounts = api.accounts();
  const moveTo = (
    id: string,
    from: string,
    to: string,
    amountMinor: number,
    source: Source,
  ): number => {
    const amount = Math.floor(amountMinor);
    if (!(amount > 0)) return 0;
    return accounts.transfer({
      id,
      from,
      to,
      amountMinor: amount,
      reasonKey: id.split(":")[0]!,
      source,
      partial: true,
    }).paidMinor;
  };
  // Where a refund goes: a full household's oldest member, else its place's pooled account.
  const ownerAccount = (householdId: string, placeId: string) => {
    const household = c.households.get(householdId);
    if (household) {
      const head = [...household.memberIds]
        .map((pid) => c.people.get(pid))
        .filter((person) => person?.alive)
        .sort(
          (a, b) =>
            a!.birthDate.localeCompare(b!.birthDate) ||
            a!.id.localeCompare(b!.id),
        )[0];
      return head ? accounts.main(head.id) : undefined;
    }
    const pooled = residentsRuntime(c)?.input.accounts.find(
      (row) => row.placeId === placeId,
    )?.accountId;
    return pooled ? accounts.main(pooled) : undefined;
  };
  const escrowAccount = (servicerId: string, source: Source) => {
    const id = `escrow:${servicerId}`;
    if (!c.cashJournal.accounts.has(id))
      accounts.open({ id, ownerId: servicerId, name: "escrow", source });
    return id;
  };
  // Where the law levies no property tax (no installments at all), nothing is billed or escrowed.
  const levied =
    (dueDates.places as Record<string, { installments: unknown[] }>)[usps]
      ?.installments.length !== 0;
  if (!levied) return 0;
  const fromEscrow: {
    id: string;
    householdId: string;
    escrow: string;
    county: string;
    servicer: string;
    installment: number;
    source: Source;
  }[] = [];
  for (const home of homes) {
    const t = termsFor(home.placeId);
    const id = `assessment:${home.householdId}`;
    const last = assessments.get(id) as unknown as AssessmentRow | undefined;
    // Each January the assessment follows the market, no faster than a cap where the law sets one.
    let assessed = last?.assessedMinor ?? home.valueMinor;
    if (last && last.year < year)
      assessed =
        t.assessmentCapShare === undefined
          ? home.valueMinor
          : Math.min(
              home.valueMinor,
              Math.round(last.assessedMinor * (1 + t.assessmentCapShare)),
            );
    if (!last || last.year < year)
      assessments.put({
        ...(last ?? {}),
        id,
        householdId: home.householdId,
        assessedMinor: assessed,
        year,
      });
    const annual = assessed * t.rate;
    const installment = Math.round(annual * (due ?? 1 / months));
    const to = payee(home.placeId, t);
    if (!to) continue;
    const county = accounts.main(to);
    const loan = escrowed.get(home.householdId);
    const servicer = loan?.servicer;
    // A servicer outside the town keeps no account here: its escrow pays the county a twelfth as each deposit arrives.
    if (servicer && c.organizations.get(servicer)?.outsideFlow !== undefined) {
      total += pay(
        home.householdId,
        home.placeId,
        county,
        Math.round(annual / months),
        "property-tax",
        t.source,
      );
      continue;
    }
    if (!servicer) {
      // The mortgage is paid off: the escrow settles with the owner (RESPA, 12 CFR 1024.34), a balance back to them, an advance repaid.
      const held = assessments.get(id) as unknown as AssessmentRow;
      if (held.escrowMinor !== undefined && held.servicerId) {
        if (held.escrowMinor > 0)
          moveTo(
            `escrow-refund:${home.householdId}:${c.date}`,
            `escrow:${held.servicerId}`,
            ownerAccount(home.householdId, home.placeId) ?? county,
            held.escrowMinor,
            t.source,
          );
        else if (held.escrowMinor < 0)
          pay(
            home.householdId,
            home.placeId,
            accounts.main(held.servicerId),
            -held.escrowMinor,
            "escrow-repay",
            t.source,
          );
        const rest: Record<string, unknown> = { ...held };
        delete rest.escrowMinor;
        delete rest.servicerId;
        delete rest.depositMinor;
        delete rest.analyzedMonth;
        assessments.put(rest as { id: string });
      }
      // No mortgage: the owner pays each installment as it falls due.
      total += pay(
        home.householdId,
        home.placeId,
        county,
        installment,
        "property-tax",
        t.source,
      );
      continue;
    }
    // With a mortgage: a monthly deposit into the servicer's escrow, which pays the county on the due dates.
    const row = assessments.get(id) as unknown as AssessmentRow;
    const escrow = escrowAccount(servicer, t.source);
    const cushion = api.parameter("housingEscrowCushionShare");
    let balance = row.escrowMinor ?? 0;
    // Only an opening mortgage's escrow is already funded; a loan made in play starts empty.
    if (row.escrowMinor === undefined && loan!.opening)
      // A new escrow already holds the deposits made since the last installment, and its cushion: the servicer sets them aside from its cash.
      balance = moveTo(
        `escrow-opening:${home.householdId}:${c.date}`,
        accounts.main(servicer),
        escrow,
        annual *
          (escrowHeldShare(usps, Number(c.date.slice(5, 7)), months) + cushion),
        t.source,
      );
    // Once a year the servicer analyzes the escrow and sets the deposit (and refunds a surplus).
    const month = c.date.slice(0, "YYYY-MM".length);
    let deposit = row.depositMinor ?? Math.round(annual / months);
    let analyzedMonth = row.analyzedMonth;
    if (
      analyzedMonth === undefined ||
      monthsFrom(analyzedMonth, month) >= months
    ) {
      const plan = analyzeEscrow(
        usps,
        Number(c.date.slice(5, 7)),
        months,
        annual,
        balance,
        cushion,
        api.parameter("housingEscrowSurplusRefundMinor"),
      );
      deposit = plan.depositMinor;
      analyzedMonth = month;
      if (plan.refundMinor > 0)
        balance -= moveTo(
          `escrow-surplus:${home.householdId}:${c.date}`,
          escrow,
          ownerAccount(home.householdId, home.placeId) ?? county,
          plan.refundMinor,
          t.source,
        );
    }
    // A deposit first repays what the servicer advanced.
    const repay = Math.min(deposit, Math.max(0, -balance));
    balance += pay(
      home.householdId,
      home.placeId,
      accounts.main(servicer),
      repay,
      "escrow-repay",
      t.source,
    );
    balance += pay(
      home.householdId,
      home.placeId,
      escrow,
      deposit - repay,
      "escrow",
      t.source,
    );
    assessments.put({
      ...row,
      escrowMinor: balance,
      servicerId: servicer,
      depositMinor: deposit,
      analyzedMonth,
    });
    if (installment > 0)
      fromEscrow.push({
        id,
        householdId: home.householdId,
        escrow,
        county,
        servicer,
        installment,
        source: t.source,
      });
  }
  // The wider population's cash is pooled by place: its owners' taxes and escrow are paid from the pool.
  for (const [key, row] of pooled) {
    const account = residentsRuntime(c)?.input.accounts.find(
      (a) => a.placeId === row.placeId,
    )?.accountId;
    if (!account) continue;
    const paid = moveTo(
      `${key.split("|")[2]}:counted:${row.placeId}:${row.to}:${c.date}`,
      accounts.main(account),
      row.to,
      row.amountMinor,
      row.source,
    );
    if (row.to.startsWith("escrow:") || key.endsWith("|escrow-repay")) {
      // An escrow deposit or repayment the pool couldn't fully pay: each home's record keeps only its share of what was paid.
      const short = row.amountMinor > 0 ? 1 - paid / row.amountMinor : 0;
      if (short > 0)
        for (const home of pooledHomes.get(key) ?? []) {
          const id = `assessment:${home.householdId}`;
          const held = assessments.get(id) as unknown as AssessmentRow;
          if (held?.escrowMinor !== undefined)
            assessments.put({
              ...held,
              escrowMinor:
                held.escrowMinor - Math.round(home.amountMinor * short),
            });
        }
      continue;
    }
    total += paid;
  }
  // Once every deposit is in, each escrow pays the county what it holds for the home, and the servicer advances what it lacks.
  for (const due of fromEscrow) {
    const row = assessments.get(due.id) as unknown as AssessmentRow;
    const balance = row.escrowMinor ?? 0;
    const held = moveTo(
      `property-tax:escrow:${due.householdId}:${c.date}`,
      due.escrow,
      due.county,
      Math.min(due.installment, Math.max(0, balance)),
      due.source,
    );
    const advanced = moveTo(
      `property-tax:advance:${due.householdId}:${c.date}`,
      accounts.main(due.servicer),
      due.county,
      due.installment - held,
      due.source,
    );
    total += held + advanced;
    assessments.put({ ...row, escrowMinor: balance - held - advanced });
  }
  return total;
}
