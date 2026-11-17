/**
 * Rent assistance from a housing budget line. A government whose housing line
 * stands above its Census base pays the extra to as many of the town's
 * renting households as its dollars cover, each at the rent above its own
 * share of income (42 U.S.C. 1437f(o)), the households with the least income
 * per member first. Full households are paid through the
 * journal to their oldest adult; a counted household is paid through its
 * group's account for the households it stands for. A cut that leaves the
 * line at its base, or too small to cover a household, ends that household's
 * help.
 */
import { countedPayment } from "./counted-money";
import { appliedOn, lawApplied, lawNoLongerApplies } from "./law-reach/applied";
import {
  budgetToday,
  HOUSING_LINE_KEY,
  housingLineMeasureId,
} from "./law-reach/group-a-money";
import { mechanicRow } from "./law-reach/group-a-records";
import { townShare } from "./law-reach/group-b-money";
import lawParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments, lineExtra } from "./modules/budgets";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { tenants } from "./housing-occupancy";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { noteLinePaid } from "./budgets-treasury";
import { transferCash } from "./world-transfer";
import type { CoreAPI, CoreState } from "./types";

export const HOUSING_ASSISTANCE_KEY = HOUSING_LINE_KEY;

/** Pay this month's rent assistance and end it for households no longer covered. */
export function payRentAssistance(
  api: CoreAPI,
  /** The town's median monthly pay (the housing engine's town figures): a stand-in for the area median family income a voucher's limit is measured against, which the game does not keep (see `housingVoucherIncomeLimitShare`). */
  townMedianPayMinor: () => number,
): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const c = api.state as CoreState;
  const own = lawParameters.parameters.housingVoucherTenantIncomeShare.value;
  const months = api.parameter("macroMonthsPerYear");
  const adult = api.parameter("votingAge");
  const today = makeIsoDate(c.date);
  const funded = new Set<string>();
  let renters: ReturnType<typeof tenants> | undefined;
  for (const gov of governments(api)) {
    const budget = budgetToday(api, gov);
    if (!budget) continue;
    // The line above its Census base: this year's amendments and every budget bill the body has passed, which later years' budgets start from.
    const extra = lineExtra(api, gov, budget, "housing");
    // A state's or county's line is shared across all its people: the played
    // town receives the part its own people stand for (1 for the city's own
    // line). ESTIMATED from the population share, as renter households are
    // not recorded for the whole government.
    const share = townShare(api, gov);
    // stopgapId: SG-GOV-rent-help-population-share
    if (share < 1 && extra > 0)
      api.stopgap("SG-GOV-rent-help-population-share");
    // The line's dollars for the month; each household's help comes out of them until they run out.
    let money = (extra * share) / months;
    if (!(money > 0)) continue;
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
      if (money <= 0) break;
      if (funded.has(tenant.id)) continue;
      // One household's help is its rent above its own share of income; a household whose income carries its rent needs none.
      const voucher = Math.floor(
        Math.min(
          tenant.rentMinor,
          Math.max(0, tenant.rentMinor - tenant.incomeMinor * own),
        ),
      );
      if (voucher <= 0) continue;
      // A counted household takes the help of every household it stands for; the last one may be served in part.
      const served = Math.min(tenant.weight, money / voucher);
      money -= served * voucher;
      // The last household may be served in part, full or counted alike.
      const amount = (voucher * served) / tenant.weight;
      const source = {
        tag: "ESTIMATED" as const,
        asOf: c.date,
        citation: `${budget.id}: housing line above its Census base, paid as rent assistance, each household's rent above its own share of income.`,
        estimatedFrom: `The household's rent less ${own} of its monthly income (42 U.S.C. 1437f(o)), out of the line's dollars for the month.`,
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
            amountMinor: -Math.floor(amount),
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
  payHousingVouchers(api, funded, townMedianPayMinor);
}

/** The federal question that makes a housing voucher an entitlement. */
export const HOUSING_VOUCHERS_KEY =
  "us-federal-positions:housing.vouchers-for-every-eligible-family";

/**
 * Vouchers for every eligible family: while the federal law is in force, the
 * federal Treasury pays each renting household whose income is at most the
 * very-low-income limit the part of its rent above its own share of income
 * (42 U.S.C. 1437f(o)), full and counted households by the same rule. A
 * household a housing line already helps this month is not paid twice. The
 * money counts against the federal income security line, which carries
 * housing assistance, so the close pays only the rest outside.
 */
function payHousingVouchers(
  api: CoreAPI,
  helped: ReadonlySet<string>,
  median: () => number,
): void {
  const c = api.state as CoreState;
  if (!api.state.modules.has(LAWS_MODULE_ID)) return;
  const law = lawInForce(api, HOUSING_VOUCHERS_KEY);
  const federal = governments(api).find((g) => g.level === "federal");
  const paidTo = new Set<string>();
  if (law.value === 1 && federal) {
    const params = lawParameters.parameters;
    const limit = params.housingVoucherIncomeLimitShare.value;
    const own = params.housingVoucherTenantIncomeShare.value;
    const town = lawChain(api).townPlaceId;
    const lawId = law.governing?.id ?? HOUSING_VOUCHERS_KEY;
    const adult = api.parameter("votingAge");
    const today = makeIsoDate(c.date);
    let townMedian: number | undefined;
    for (const tenant of tenants(api)) {
      if (helped.has(tenant.id) || tenant.memberIds.length === 0) continue;
      if (tenant.placeId !== town) continue;
      if (tenant.incomeMinor > (townMedian ??= median()) * limit) continue;
      const amount = Math.floor(
        Math.min(
          tenant.rentMinor,
          Math.max(0, tenant.rentMinor - tenant.incomeMinor * own),
        ),
      );
      if (amount <= 0) continue;
      const source = {
        tag: "ESTIMATED" as const,
        asOf: c.date,
        citation: `${lawId}: a housing voucher for every eligible family pays the rent above the household's own share of income (42 U.S.C. 1437f(o)).`,
        estimatedFrom: `The town's median monthly pay as the area median; the lease's rent as the payment standard.`,
      };
      const id = `housing-voucher:${tenant.id}:${c.date}`;
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
          federal.organizationId,
          head.id,
          amount,
          source,
        );
      } else {
        paid =
          countedPayment(api, {
            id,
            placeId: tenant.placeId,
            householdId: tenant.id,
            otherOwnerId: federal.organizationId,
            amountMinor: -amount,
            reasonKey: "housing.assistance",
            source,
          }) * tenant.weight;
      }
      if (paid <= 0) continue;
      paidTo.add(tenant.id);
      noteLinePaid(api, federal.id, "incomeSecurity", paid);
      lawApplied(api, {
        key: HOUSING_VOUCHERS_KEY,
        lawId,
        targetId: tenant.id,
        target: tenant.tier === "full" ? "household" : "group",
        count: tenant.weight,
        engine: "housing",
        what: "housing-voucher-paid",
        amountMinor: paid,
      });
    }
  }
  for (const row of appliedOn(api, HOUSING_VOUCHERS_KEY))
    if (!paidTo.has(row.targetId))
      lawNoLongerApplies(api, HOUSING_VOUCHERS_KEY, row.targetId);
}
