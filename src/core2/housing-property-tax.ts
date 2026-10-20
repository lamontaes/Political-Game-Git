/**
 * Property tax on owners' homes: each month an owner household pays a
 * twelfth of its home's assessed value times the rate in force, through the
 * ledger, to the taxing government. The assessed value follows the home's
 * value each January, but where the law caps assessment growth it rises no
 * faster than the cap (a home bought since is assessed at its price).
 *
 * The rate, the cap and who's paid come from the law in force (OPUS-GOV's
 * `lawInForce(api, "property-tax")` and the county's treasury), registered
 * with `registerPropertyTax`. Until that's on this branch, each state's
 * average effective rate stands in, paid outside the town, where the core's
 * living cost already sent owners' taxes.
 */
import taxData from "./data/housing/property-tax.json" with { type: "json" };
import { countedPayment } from "./counted-money";
import type { ModuleTable } from "./module-state";
import { transferCash } from "./world-transfer";
import type { CoreAPI, CoreState, Source } from "./types";

export interface PropertyTaxTerms {
  /** Annual tax as a share of assessed value. */
  readonly rate: number;
  /** The most assessed value may rise in a year, as a share; none when uncapped. */
  readonly assessmentCapShare?: number;
  readonly assessmentLawRowId?: string;
  /** Who's paid; the place's outside account when not given. */
  readonly payeeId?: string;
  /** The law row the rate comes from; named on any arrears it leaves. */
  readonly lawRowId?: string;
  readonly source: Source;
}

/** Tax a household (or a place's counted owners) couldn't pay; the next bill adds it and is paid it first. */
export interface PropertyTaxArrearsRow {
  id: string;
  householdId: string;
  dwellingId: string;
  placeId: string;
  amountMinor: number;
  since: string;
  lawRowId: string;
}

const ARREARS_PREFIX = "tax-arrears:";
const STATE_AVERAGE_LAW = "property-tax:state-average-rate";

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

/** One bill date: a day of the month, the month's last day, or the nth weekday (1 = Monday). */
export type PropertyTaxDueDate =
  | { readonly month: number; readonly day: number | "last" }
  | { readonly month: number; readonly nth: number; readonly weekday: number };

export interface PropertyTaxDueDates {
  readonly installments: number;
  readonly dueDates: readonly PropertyTaxDueDate[];
  /** Counties or towns set their own dates; these are the most common pattern. */
  readonly setLocally: boolean;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly estimatedFrom: string;
}

const DUE_DATES = taxData.dueDates.byState as unknown as Record<
  string,
  PropertyTaxDueDates
>;

/** When a place's property tax is billed: its installments and due dates, from its state's row. */
export function propertyTaxDueDates(usps: string): PropertyTaxDueDates {
  const row = DUE_DATES[usps];
  if (!row) throw new Error(`No property-tax due dates for ${usps}.`);
  return row;
}

/**
 * The property tax rate in force where owners are billed, as a share of home
 * value, and the law row it stands on; none until a government's rate is
 * registered (the state average the engine falls back on is not a rate in force).
 */
export function propertyTaxRateInForce(
  api: CoreAPI,
  placeId: string,
): { share: number; recordId: string | null } | null {
  // The rate in force is the town's law; other places are not billed by it.
  if (api.state.placeMetadata?.housingTown !== placeId) return null;
  const registered = termsSource?.(api, placeId);
  return registered
    ? { share: registered.rate, recordId: registered.lawRowId ?? null }
    : null;
}

function terms(api: CoreAPI, placeId: string): PropertyTaxTerms {
  const registered = termsSource?.(api, placeId);
  if (registered) return registered;
  api.stopgap("SG-WORLD-property-tax-rate");
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

/** Bills every owner household for this month's tax (a twelfth, as through a mortgage escrow); returns what was paid. */
export function billPropertyTax(
  api: CoreAPI,
  assessments: ModuleTable,
  homes: readonly {
    householdId: string;
    placeId: string;
    valueMinor: number;
  }[],
  /** Where unpaid tax is kept as arrears rows (the assessments table when not given). */
  arrears: ModuleTable = assessments,
): number {
  const c = api.state as CoreState,
    year = Number(c.date.slice(0, 4)),
    months = api.parameter("macroMonthsPerYear");
  // Monthly, as escrow pays it; a county's own due dates (once or twice a year) come with its law.
  api.stopgap("SG-WORLD-property-tax-monthly");
  const owedRow = (id: string) =>
    arrears.get(ARREARS_PREFIX + id) as unknown as
      PropertyTaxArrearsRow | undefined;
  /** What stays unpaid is kept as the household's arrears (the earliest start kept); a fully paid row is removed. */
  const keepArrears = (
    id: string,
    home: { householdId: string; placeId: string },
    t: PropertyTaxTerms,
    unpaid: number,
  ) => {
    const prior = owedRow(id);
    if (unpaid <= 0) {
      if (prior) arrears.remove(ARREARS_PREFIX + id);
      return;
    }
    arrears.put({
      id: ARREARS_PREFIX + id,
      householdId: home.householdId,
      dwellingId: `dwelling:${home.householdId}`,
      placeId: home.placeId,
      amountMinor: unpaid,
      since: prior?.since ?? c.date,
      lawRowId: prior?.lawRowId ?? t.lawRowId ?? STATE_AVERAGE_LAW,
    });
  };
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
        marketValueMinor: home.valueMinor,
        previousAssessedMinor: last?.assessedMinor ?? null,
        capLawId: t.assessmentLawRowId ?? null,
        savedAssessmentMinor: Math.max(0, home.valueMinor - assessed),
      });
    // Last months' unpaid tax is added to this month's bill and paid first.
    const owed = owedRow(home.householdId)?.amountMinor ?? 0;
    const bill = Math.round((assessed * t.rate) / months) + owed;
    if (bill <= 0) continue;
    const household = c.households.get(home.householdId);
    const to = payee(home.placeId, t);
    if (!to) continue;
    if (household) {
      // A full household pays from its members' cash, largest balance first.
      let paid = 0;
      for (const personId of [...household.memberIds]
        .filter((pid) => c.people.get(pid)?.alive)
        .sort(
          (a, b) => c.people.get(b)!.liquidMinor - c.people.get(a)!.liquidMinor,
        )) {
        if (paid >= bill) break;
        paid += transferCash(
          api,
          `property-tax:${home.householdId}:${c.date}:${personId}:${t.lawRowId ?? STATE_AVERAGE_LAW}:${t.assessmentLawRowId ?? "uncapped"}`,
          personId,
          to,
          bill - paid,
          t.source,
        );
      }
      total += paid;
      keepArrears(home.householdId, home, t, bill - paid);
    } else {
      const paid = countedPayment(api, {
        id: `property-tax:${home.householdId}:${c.date}:${t.lawRowId ?? STATE_AVERAGE_LAW}:${t.assessmentLawRowId ?? "uncapped"}`,
        placeId: home.placeId,
        householdId: home.householdId,
        otherOwnerId: to,
        amountMinor: bill,
        reasonKey: "property-tax",
        source: t.source,
      });
      total += paid;
      keepArrears(home.householdId, home, t, bill - paid);
    }
  }
  return total;
}
