/**
 * Private school tuition at the opening. Each household with children aged
 * 5–17 pays its children's share of private tuition to the town's private
 * school: children × the private share of school-age children (NCES) × the
 * average private tuition (NCES Digest Table 205.50), monthly. It is the
 * town's aggregate spread over its families, like the CE survey's averages,
 * not a choice of which family goes private. A town without a private school
 * pays none here (the spending stays with the household's other costs).
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import data from "./data/opening-private-tuition.json" with { type: "json" };
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { FinanceContractInput } from "./finance-types";
import type { CoreInput, Source } from "./types";

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
    (p("openingPrivateSchoolShare") *
      p("openingPrivateTuitionAnnualUsd") *
      p("minorPerDollar")) /
    p("monthsPerYear");
  const contracts: FinanceContractInput[] = [];
  const sorted = [...schools].sort((a, b) => a.id.localeCompare(b.id));
  const town = new Set(schools.map((row) => row.placeId));
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
    const amountMinor = Math.round(children * perChildMonthly);
    if (amountMinor <= 0) continue;
    // Several private schools in town share families in a stable order.
    const local = sorted.filter((row) => row.placeId === home.placeId);
    const school =
      local[
        [...home.id].reduce((n, c) => n + c.charCodeAt(0), 0) % local.length
      ]!;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: start,
      citation: data.citation,
      estimatedFrom: `${children} children aged ${p("openingSchoolAgeFirst")}–${p("openingSchoolAgeLast")} × private share ${p("openingPrivateSchoolShare")} × average tuition $${p("openingPrivateTuitionAnnualUsd")} a year; the town's private tuition spread over its families.`,
    };
    contracts.push({
      id: `opening-private-tuition:${home.id}:${school.id}`,
      householdId: home.id,
      payerIds: adults.map((row) => row.id).sort(),
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
  return {
    ...input,
    finance: {
      ...input.finance,
      contracts: [...input.finance.contracts, ...contracts],
    },
  };
}
