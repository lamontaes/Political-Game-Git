/**
 * Private school enrollment each August. The opening decides which families
 * send their children to the town's private school once (opening-private-
 * tuition.ts); this repeats that ranking on the first of August with what the
 * families hold then. Full families with children aged 5 to 17 are ranked by
 * cash per child, the best-off enroll all their children until the town's
 * private share of school-age children (NCES) is reached, a family that fell
 * out of the quota ends its monthly tuition contract, one that moved in starts
 * one, and one whose children count changed pays the new amount. The share
 * checks the town's total; it never picks a family.
 *
 * Counted families keep their opening enrollment (stopgap
 * SG-CORE-private-tuition-counted-reenroll).
 */
import data from "./data/opening-private-tuition.json" with { type: "json" };
import { privateShareOf } from "./opening-private-tuition";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import type { FinanceContractInput } from "./finance-types";
import { setEverydayPurchase } from "./cost-of-living";
import type { CoreAPI, CoreState, Source } from "./types";

export const REENROLL_STOPGAP = "SG-CORE-private-tuition-counted-reenroll";

/** Each household's tuition now: the private school its everyday-living plan pays and the monthly amount. */
export function tuitionPlans(
  core: CoreState,
): Map<string, { schoolId: string; monthlyMinor: number }> {
  const schools = new Set(
    [...core.organizations.values()]
      .filter((row) => row.classification === data.supplierClassification)
      .map((row) => row.id),
  );
  const out = new Map<string, { schoolId: string; monthlyMinor: number }>();
  for (const [householdId, plan] of core.finance.livingPlans)
    for (const [payeeId, monthlyMinor] of plan.sellers)
      if (schools.has(payeeId) && monthlyMinor > 0)
        out.set(householdId, { schoolId: payeeId, monthlyMinor });
  return out;
}

/** Re-rank the town's full families and match their tuition contracts to the quota. */
export function reenrollPrivateTuition(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const schools = [...core.organizations.values()]
    .filter((row) => row.classification === data.supplierClassification)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!schools.length) return;
  const date = makeIsoDate(core.date);
  const towns = new Set(schools.map((row) => row.placeId));
  const perChildMonthly = Math.round(
    (p("openingPrivateTuitionAnnualUsd") * p("minorPerDollar")) /
      p("monthsPerYear"),
  );
  const families = new Map<
    string,
    {
      id: string;
      children: number;
      adults: string[];
      cashPerChild: number;
    }[]
  >();
  for (const home of core.households.values()) {
    if (!towns.has(home.placeId)) continue;
    const members = home.memberIds
      .map((id) => core.people.get(id))
      .filter((row) => row?.alive);
    const age = (birth: string) => ageOnDate(makeIsoDate(birth), date);
    const children = members.filter(
      (row) =>
        age(row!.birthDate) >= p("openingSchoolAgeFirst") &&
        age(row!.birthDate) <= p("openingSchoolAgeLast"),
    ).length;
    const adults = members
      .filter((row) => age(row!.birthDate) > p("openingSchoolAgeLast"))
      .map((row) => row!.id)
      .sort();
    if (!children || !adults.length) continue;
    const list = families.get(home.placeId) ?? [];
    list.push({
      id: home.id,
      children,
      adults,
      cashPerChild:
        members.reduce((sum, row) => sum + row!.liquidMinor, 0) / children,
    });
    families.set(home.placeId, list);
  }
  const now = tuitionPlans(core);
  const wanted = new Map<
    string,
    { children: number; adults: string[]; schoolId: string }
  >();
  const enrolled = new Map<string, number>();
  for (const [placeId, list] of [...families].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const total = list.reduce((sum, row) => sum + row.children, 0);
    const quota = Math.max(1, Math.round(total * privateShareOf(core)));
    const local = schools.filter((row) => row.placeId === placeId);
    let taken = 0;
    for (const family of [...list].sort(
      (a, b) => b.cashPerChild - a.cashPerChild || a.id.localeCompare(b.id),
    )) {
      if (taken >= quota) break;
      taken += family.children;
      // A family already enrolled keeps its school; a new one goes where the fewest are.
      const kept = local.find((row) => row.id === now.get(family.id)?.schoolId);
      const school =
        kept ??
        local.reduce((fewest, row) =>
          (enrolled.get(row.id) ?? 0) < (enrolled.get(fewest.id) ?? 0)
            ? row
            : fewest,
        );
      enrolled.set(school.id, (enrolled.get(school.id) ?? 0) + 1);
      wanted.set(family.id, {
        children: family.children,
        adults: family.adults,
        schoolId: school.id,
      });
    }
  }
  const first = new Date(`${date}T00:00:00Z`);
  first.setUTCMonth(first.getUTCMonth() + 1, 1);
  const dueAt = makeIsoDate(first.toISOString().slice(0, 10));
  // A family out of the quota stops paying; one whose children changed pays the new amount.
  for (const [householdId, current] of now) {
    if (!towns.has(core.households.get(householdId)?.placeId ?? "")) continue;
    const want = wanted.get(householdId);
    setEverydayPurchase(
      core,
      householdId,
      current.schoolId,
      want ? want.children * perChildMonthly : 0,
    );
  }
  for (const [householdId, want] of wanted) {
    if (now.has(householdId)) continue;
    const monthlyMinor = want.children * perChildMonthly;
    // A household with a living plan takes the school as a seller; one without opens its plan with it.
    if (setEverydayPurchase(core, householdId, want.schoolId, monthlyMinor))
      continue;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: date,
      citation: data.citation,
      estimatedFrom: `${want.children} children aged ${p("openingSchoolAgeFirst")}–${p("openingSchoolAgeLast")} at average tuition $${p("openingPrivateTuitionAnnualUsd")} a year; this family is among the best-off per child in a town where the private share of school-age children is ${privateShareOf(core)}.`,
    };
    api.addFinanceContract({
      id: `private-tuition:${householdId}:${date}`,
      householdId,
      payerIds: want.adults,
      payeeId: want.schoolId,
      kind: data.contractKind,
      amountMinor: monthlyMinor,
      dueAt,
      periodMonths: 1,
      accruesArrears: false,
      marketAdjusted: false,
      salesReceipt: true,
      salesReceiptBudget: false,
      settlementPhaseId: data.settlementPhaseId,
      source,
    } as FinanceContractInput);
  }
  api.stopgap(REENROLL_STOPGAP);
}
