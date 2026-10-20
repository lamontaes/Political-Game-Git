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
 * Counted families are ranked with them, each record times the households it
 * stands for, and their tuition is the household's part of the school's
 * merged purchase flow (modules/residents.ts); filling a family in turns the
 * part into its own living-plan seller.
 */
import data from "./data/opening-private-tuition.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import type { FinanceContractInput } from "./finance-types";
import { setEverydayPurchase } from "./cost-of-living";
import {
  countedSchoolFamilies,
  countedTuitionPlans,
  setCountedTuition,
} from "./modules/residents";
import type { CoreAPI, CoreState, Source } from "./types";

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
      /** Real households the record stands for (a counted record's weight). */
      weight: number;
      counted?: boolean;
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
      weight: 1,
    });
    families.set(home.placeId, list);
  }
  // Counted families are ranked with them: same rule, each record times the
  // households it stands for.
  const firstAge = p("openingSchoolAgeFirst"),
    lastAge = p("openingSchoolAgeLast");
  for (const family of countedSchoolFamilies(core, towns, firstAge, lastAge)) {
    const list = families.get(family.placeId) ?? [];
    list.push({
      id: family.householdId,
      children: family.children,
      adults: [],
      cashPerChild: family.cashPerChild,
      weight: family.weight,
      counted: true,
    });
    families.set(family.placeId, list);
  }
  const now = tuitionPlans(core);
  const countedNow = countedTuitionPlans(
    core,
    new Set(schools.map((row) => row.id)),
    data.contractKind,
  );
  const wanted = new Map<
    string,
    { children: number; adults: string[]; schoolId: string; counted?: boolean }
  >();
  const enrolled = new Map<string, number>();
  for (const [placeId, list] of [...families].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const total = list.reduce((sum, row) => sum + row.children * row.weight, 0);
    const quota = Math.max(
      1,
      Math.round(total * p("openingPrivateSchoolShare")),
    );
    const local = schools.filter((row) => row.placeId === placeId);
    let taken = 0;
    for (const family of [...list].sort(
      (a, b) => b.cashPerChild - a.cashPerChild || a.id.localeCompare(b.id),
    )) {
      if (taken >= quota) break;
      taken += family.children * family.weight;
      // A family already enrolled keeps its school; a new one goes where the fewest are.
      const current = family.counted
        ? countedNow.get(family.id)
        : now.get(family.id);
      const kept = local.find((row) => row.id === current?.schoolId);
      const school =
        kept ??
        local.reduce((fewest, row) =>
          (enrolled.get(row.id) ?? 0) < (enrolled.get(fewest.id) ?? 0)
            ? row
            : fewest,
        );
      enrolled.set(school.id, (enrolled.get(school.id) ?? 0) + family.weight);
      wanted.set(family.id, {
        children: family.children,
        adults: family.adults,
        schoolId: school.id,
        ...(family.counted ? { counted: true } : {}),
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
  // A counted family's tuition is its part of the school's merged flow.
  const countedSource: Source = {
    tag: "ESTIMATED",
    asOf: date,
    citation: data.citation,
    estimatedFrom: `Counted families with children aged ${firstAge}–${lastAge} at average tuition $${p("openingPrivateTuitionAnnualUsd")} a year, ranked by cash per child with the full families until the private share of school-age children (${p("openingPrivateSchoolShare")}) is reached.`,
  };
  const schoolOf = new Map(schools.map((row) => [row.id, row]));
  for (const [householdId, current] of countedNow) {
    const want = wanted.get(householdId);
    setCountedTuition(
      core,
      householdId,
      schoolOf.get(current.schoolId)!,
      want ? want.children * perChildMonthly : 0,
      { financeKind: data.contractKind, source: countedSource },
    );
  }
  for (const [householdId, want] of wanted) {
    if (!want.counted || countedNow.has(householdId)) continue;
    setCountedTuition(
      core,
      householdId,
      schoolOf.get(want.schoolId)!,
      want.children * perChildMonthly,
      { financeKind: data.contractKind, source: countedSource },
    );
  }
  for (const [householdId, want] of wanted) {
    if (want.counted || now.has(householdId)) continue;
    const monthlyMinor = want.children * perChildMonthly;
    // A household with a living plan takes the school as a seller; one without opens its plan with it.
    if (setEverydayPurchase(core, householdId, want.schoolId, monthlyMinor))
      continue;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: date,
      citation: data.citation,
      estimatedFrom: `${want.children} children aged ${p("openingSchoolAgeFirst")}–${p("openingSchoolAgeLast")} at average tuition $${p("openingPrivateTuitionAnnualUsd")} a year; this family is among the best-off per child in a town where the private share of school-age children is ${p("openingPrivateSchoolShare")}.`,
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
}
