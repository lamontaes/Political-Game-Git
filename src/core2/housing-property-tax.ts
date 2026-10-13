/**
 * Property tax on owners' homes: a household with a mortgage pays a twelfth
 * of its home's assessed value times the rate in force each month, through
 * its escrow; one without pays each installment in the month it falls due
 * (its place's schedule), through the ledger, to the taxing government. The assessed value follows the home's
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
import { transferCash } from "./world-transfer";
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
}

/** The share of a year's tax due this month for a home without a mortgage, by its place's installments; undefined where no schedule is recorded. */
function dueShare(usps: string, month: number): number | undefined {
  const row = (
    dueDates.places as Record<
      string,
      { installments: { month: number; day: number }[] }
    >
  )[usps];
  if (!row) return undefined;
  if (!row.installments.length) return 0;
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
  // Owners with a mortgage pay monthly into escrow (paid straight to the county here); the rest on the place's due dates.
  const usps = c.placeMetadata?.housingState ?? "",
    due = dueShare(usps, Number(c.date.slice(5, 7)));
  const escrowed = new Set<string>();
  for (const row of api
    .moduleState("housing")
    .table("mortgages")
    .rows() as unknown as {
    householdId: string;
    monthsLeft: number;
  }[])
    if (row.monthsLeft > 0) escrowed.add(row.householdId);
  // Home loans the town bank made in play are escrowed too.
  if ((api.state as CoreState).modules.has("credit"))
    for (const row of api
      .moduleState("credit")
      .table("loans")
      .query("open", [true]) as unknown as {
      kind?: string;
      householdId?: string;
    }[])
      if (row.kind === "mortgage" && row.householdId)
        escrowed.add(row.householdId);
  if (escrowed.size) stopgap("SG-WORLD-property-tax-monthly");
  const pooled = new Map<string, number>();
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
  let total = 0;
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
        id,
        householdId: home.householdId,
        assessedMinor: assessed,
        year,
      });
    const share = escrowed.has(home.householdId)
      ? 1 / months
      : (due ?? 1 / months);
    const bill = Math.round(assessed * t.rate * share);
    if (bill <= 0) continue;
    const household = c.households.get(home.householdId);
    const to = payee(home.placeId, t);
    if (!to) continue;
    if (household) {
      // A full household pays from its members' cash, largest balance first.
      let paid = 0;
      for (const personId of [...household.memberIds]
        .filter((pid) => c.people.has(pid))
        .sort(
          (a, b) => c.people.get(b)!.liquidMinor - c.people.get(a)!.liquidMinor,
        )) {
        if (paid >= bill) break;
        paid += transferCash(
          api,
          `property-tax:${home.householdId}:${c.date}:${personId}`,
          personId,
          to,
          bill - paid,
          t.source,
        );
      }
      total += paid;
    } else pooled.set(home.placeId, (pooled.get(home.placeId) ?? 0) + bill);
  }
  // The wider population's cash is pooled by place: its owners' taxes are paid from the pool.
  for (const [placeId, bill] of pooled) {
    const account = residentsRuntime(c)?.input.accounts.find(
      (row) => row.placeId === placeId,
    )?.accountId;
    const t = termsFor(placeId),
      to = payee(placeId, t);
    if (!account || !to) continue;
    total += transferCash(
      api,
      `property-tax:counted:${placeId}:${c.date}`,
      account,
      to,
      bill,
      t.source,
    );
  }
  return total;
}
