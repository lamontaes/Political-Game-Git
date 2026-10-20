/**
 * Private school tuition at the opening. Which families send their children to
 * the town's private school is decided by their means, not spread evenly: the
 * town's families with children aged 5-17 are ranked by cash per child, and
 * the best-off enroll all their children until the town's private share of
 * school-age children (NCES) is reached. Each enrolled child pays the average
 * private tuition (NCES Digest Table 205.50), monthly. The share checks the
 * town's total; it never picks a family. A town without a private school pays
 * none here (the spending stays with the household's other costs).
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import shares from "../../data/research/people/nces-private-enrollment-share-fall-2021.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import data from "./data/opening-private-tuition.json" with { type: "json" };
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { FinanceContractInput } from "./finance-types";
import type { CoreInput, Source } from "./types";

/** The private share of students in the town's state (NCES, fall 2021); the median where the state has no row. */
export function privateShareOf(input: {
  readonly placeMetadata?: Readonly<Record<string, string>>;
}): number {
  const key = input.placeMetadata?.placeKey;
  const state = key ? corePlaceByKey(key)?.stateJurisdictionKey : undefined;
  const row = (shares.states as Readonly<Record<string, { share: number }>>)[
    state ?? ""
  ];
  return row?.share ?? shares.median;
}

export function withPrivateTuition(input: CoreInput): CoreInput {
  if (!input.finance) return input;
  const schools = input.organizations.filter(
    (row) => row.classification === data.supplierClassification,
  );
  if (!schools.length) return input;
  stopgap(data.stopgapId);
  const start = makeIsoDate(input.startedAt);
  const people = new Map(input.people.map((row) => [row.id, row]));
  const first = new Date(`${start}T00:00:00Z`);
  first.setUTCMonth(first.getUTCMonth() + 1, 1);
  const dueAt = makeIsoDate(first.toISOString().slice(0, 10));
  const perChildMonthly =
    (p("openingPrivateTuitionAnnualUsd") * p("minorPerDollar")) /
    p("monthsPerYear");
  const share = privateShareOf(input);
  const contracts: FinanceContractInput[] = [];
  const sorted = [...schools].sort((a, b) => a.id.localeCompare(b.id));
  const town = new Set(schools.map((row) => row.placeId));
  const enrolled = new Map<string, number>();
  // Each town's families with school-age children and an adult to pay.
  const byTown = new Map<
    string,
    {
      home: CoreInput["households"][number];
      children: number;
      adults: string[];
      cashPerChild: number;
    }[]
  >();
  for (const home of input.households) {
    // Only the town's own families: relatives elsewhere use their own schools.
    if (!town.has(home.placeId)) continue;
    const members = home.memberIds.map((id) => people.get(id)!);
    const children = members.filter((row) => {
      const age = ageOnDate(makeIsoDate(row.birthDate), start);
      return (
        age >= p("openingSchoolAgeFirst") && age <= p("openingSchoolAgeLast")
      );
    }).length;
    const adults = members.filter(
      (row) =>
        ageOnDate(makeIsoDate(row.birthDate), start) >
        p("openingSchoolAgeLast"),
    );
    if (!children || !adults.length) continue;
    byTown.set(home.placeId, [
      ...(byTown.get(home.placeId) ?? []),
      {
        home,
        children,
        adults: adults.map((row) => row.id).sort(),
        cashPerChild:
          members.reduce((sum, row) => sum + row.liquidMinor, 0) / children,
      },
    ]);
  }
  for (const [placeId, families] of [...byTown].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const total = families.reduce((sum, row) => sum + row.children, 0);
    // The town's private share of its school-age children, at least one family
    // where a private school stands.
    const quota = Math.max(1, Math.round(total * share));
    const ranked = [...families].sort(
      (a, b) =>
        b.cashPerChild - a.cashPerChild || a.home.id.localeCompare(b.home.id),
    );
    const local = sorted.filter((row) => row.placeId === placeId);
    let taken = 0;
    for (const family of ranked) {
      if (taken >= quota) break;
      taken += family.children;
      const amountMinor = Math.round(family.children * perChildMonthly);
      if (amountMinor <= 0) continue;
      // Several private schools in town fill evenly: a family enrolls where the
      // fewest families are already enrolled (ties go to the lower school id).
      const school = local.reduce((fewest, row) =>
        (enrolled.get(row.id) ?? 0) < (enrolled.get(fewest.id) ?? 0)
          ? row
          : fewest,
      );
      enrolled.set(school.id, (enrolled.get(school.id) ?? 0) + 1);
      const source: Source = {
        tag: "ESTIMATED",
        asOf: start,
        citation: data.citation,
        estimatedFrom: `${family.children} children aged ${p("openingSchoolAgeFirst")}–${p("openingSchoolAgeLast")} at average tuition $${p("openingPrivateTuitionAnnualUsd")} a year; this family is among the best-off per child in a town where the private share of school-age children is ${share}.`,
      };
      contracts.push({
        id: `opening-private-tuition:${family.home.id}:${school.id}`,
        householdId: family.home.id,
        payerIds: family.adults,
        payeeId: school.id,
        kind: data.contractKind,
        amountMinor,
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
  return {
    ...input,
    finance: {
      ...input.finance,
      contracts: [...input.finance.contracts, ...contracts],
    },
  };
}
