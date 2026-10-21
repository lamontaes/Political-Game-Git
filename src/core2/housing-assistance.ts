/**
 * Rent assistance from a housing budget line. A government whose housing line
 * stands above the line as adopted pays the extra to as many of the town's
 * renting households as it covers at the average voucher, the households with
 * the least income per member first. Full households are paid through the
 * journal to their oldest adult; a counted household is paid through its
 * group's account for the households it stands for. A cut that leaves the
 * line at its base, or too small to cover a household, ends that household's
 * help.
 */
import { countedPayment } from "./counted-money";
import { appliedOn, lawApplied, lawNoLongerApplies } from "./law-reach/applied";
import {
  baseLine,
  budgetToday,
  HOUSING_LINE_KEY,
  housingLineMeasureId,
} from "./law-reach/group-a-money";
import { mechanicRow } from "./law-reach/group-a-records";
import lawParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { tenants } from "./housing-occupancy";
import { transferCash } from "./world-transfer";
import type { CoreAPI, CoreState } from "./types";

export const HOUSING_ASSISTANCE_KEY = HOUSING_LINE_KEY;

/** Pay this month's rent assistance and end it for households no longer covered. */
export function payRentAssistance(api: CoreAPI): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const c = api.state as CoreState;
  const annual = lawParameters.parameters.housingAssistanceAnnualMinor.value;
  const months = api.parameter("macroMonthsPerYear");
  const adult = lawParameters.parameters.adultAge.value;
  const today = makeIsoDate(c.date);
  const funded = new Set<string>();
  let renters: ReturnType<typeof tenants> | undefined;
  for (const gov of governments(api)) {
    const budget = budgetToday(api, gov);
    if (!budget) continue;
    const extra =
      (budget.spendingMinor.housing ?? 0) -
      baseLine(api, gov, budget, "housing");
    let slots = Math.floor(extra / annual);
    if (slots <= 0) continue;
    // The measure that last changed this line is the law the help is paid under.
    const lawId = String(
      mechanicRow(api, housingLineMeasureId(gov.id))?.facts.lawId ?? budget.id,
    );
    renters ??= tenants(api);
    const ranked = renters
      .filter((t) => t.memberIds.length > 0)
      .sort(
        (a, b) =>
          a.incomeMinor / a.memberIds.length -
            b.incomeMinor / b.memberIds.length || a.id.localeCompare(b.id),
      );
    for (const tenant of ranked) {
      if (slots <= 0) break;
      if (funded.has(tenant.id)) continue;
      // A counted household uses one slot per household it stands for; the last one may be served in part.
      const served = Math.min(tenant.weight, slots);
      slots -= served;
      const amount = Math.min(annual / months, tenant.rentMinor);
      const source = {
        tag: "ESTIMATED" as const,
        asOf: c.date,
        citation: `${budget.id}: housing line above its adopted base, paid as rent assistance at the average voucher.`,
        estimatedFrom: `HUD Picture of Subsidized Households 2023, average voucher ${annual} a year`,
      };
      const id = `rent-assistance:${tenant.id}:${c.date}`;
      let paid = 0;
      if (tenant.tier === "full") {
        const head = tenant.memberIds
          .map((m) => c.people.get(m))
          .filter(
            (p) =>
              p?.alive && ageOnDate(makeIsoDate(p.birthDate), today) >= adult,
          )
          .sort(
            (a, b) =>
              a!.birthDate.localeCompare(b!.birthDate) ||
              a!.id.localeCompare(b!.id),
          )[0];
        if (!head) continue;
        paid = transferCash(
          api,
          id,
          gov.organizationId,
          head.id,
          amount,
          source,
        );
      } else {
        // The payment is for one household; the counted money scales it to the households it stands for.
        paid =
          countedPayment(api, {
            id,
            placeId: tenant.placeId,
            householdId: tenant.id,
            otherOwnerId: gov.organizationId,
            amountMinor: -Math.floor((amount * served) / tenant.weight),
            reasonKey: "housing.assistance",
            source,
          }) * tenant.weight;
      }
      funded.add(tenant.id);
      if (paid > 0)
        lawApplied(api, {
          key: HOUSING_ASSISTANCE_KEY,
          lawId,
          targetId: tenant.id,
          target: tenant.tier === "full" ? "household" : "group",
          count: tenant.weight,
          engine: "housing",
          what: "rent-assistance",
          amountMinor: paid,
        });
    }
  }
  // Households that were helped and are not covered this month.
  for (const row of appliedOn(api, HOUSING_ASSISTANCE_KEY))
    if (!funded.has(row.targetId))
      lawNoLongerApplies(api, HOUSING_ASSISTANCE_KEY, row.targetId);
}
