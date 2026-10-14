/**
 * Property tax on owners' homes: each month an owner household pays a
 * twelfth of its home's assessed value times the rate in force, through the
 * ledger, to the taxing government. The assessed value follows the home's
 * value each January, but where the law caps assessment growth it rises no
 * faster than the cap (a home bought since is assessed at its price).
 *
 * The rate, the cap and who's paid come from the law in force (OPUS-GOV's
 * `lawInForce(api, "property-tax")` and the county's treasury), registered
 * with `registerPropertyTax` by the budgets module. Where the law in force
 * records no rate, the state's average effective rate is the estimate, paid
 * outside the town. The levy is paid monthly, as through escrow: the budgets
 * read the year's total, and no county's due dates are in the law data.
 */
import taxData from "./data/housing/property-tax.json" with { type: "json" };
import { residentsRuntime } from "./modules/residents";
import type { ModuleTable } from "./module-state";
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

function terms(api: CoreAPI, placeId: string): PropertyTaxTerms {
  const registered = termsSource?.(api, placeId);
  if (registered) return registered;
  return {
    rate: stateEffectiveRate(api.state.placeMetadata?.housingState ?? ""),
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: taxData.source.citation,
      estimatedFrom:
        "The state's average effective rate on owner-occupied homes, where the law in force records no rate.",
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
): number {
  const c = api.state as CoreState,
    year = Number(c.date.slice(0, 4)),
    months = api.parameter("macroMonthsPerYear");
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
    const bill = Math.round((assessed * t.rate) / months);
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
