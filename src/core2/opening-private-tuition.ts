/**
 * Private school tuition at the opening. Each household with children aged
 * 5–17 pays its children's share of private tuition to the town's private
 * school: children × the private share of the state's students (NCES) × the
 * average private tuition (NCES Digest Table 205.50), monthly. It is the
 * town's aggregate spread over its families, like the CE survey's averages,
 * not a choice of which family goes private. A town without a private school
 * pays none here (the spending stays with the household's other costs).
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import shares from "../../data/research/people/nces-private-enrollment-share-fall-2021.json" with { type: "json" };
import homeschool from "../../data/research/people/census-household-pulse-homeschool-share-2023.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import data from "./data/opening-private-tuition.json" with { type: "json" };
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { FinanceContractInput } from "./finance-types";
import type { CoreInput, Source } from "./types";

function stateOf(input: CoreInput): string {
  const key = input.placeMetadata?.placeKey;
  return (key ? corePlaceByKey(key)?.stateJurisdictionKey : undefined) ?? "";
}

/** A state's share from a research table; the table's median where the state has no row. */
function shareIn(
  table: {
    readonly states: Readonly<Record<string, { share: number }>>;
    readonly median: number;
  },
  state: string,
): number {
  return table.states[state]?.share ?? table.median;
}

/**
 * The private share of all enrolled children in the town's state. NCES counts
 * private against public students only, so the families who homeschool (Census
 * Household Pulse, 2023) are taken out of the whole first.
 */
function privateShareOf(input: CoreInput): number {
  const state = stateOf(input);
  return shareIn(shares, state) * (1 - shareIn(homeschool, state));
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
  const share = privateShareOf(input);
  const perChildMonthly =
    (share * p("openingPrivateTuitionAnnualUsd") * p("minorPerDollar")) /
    p("monthsPerYear");
  const contracts: FinanceContractInput[] = [];
  const sorted = [...schools].sort((a, b) => a.id.localeCompare(b.id));
  const town = new Set(schools.map((row) => row.placeId));
  const enrolled = new Map<string, number>();
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
    // Several private schools in town fill evenly: a family enrolls where the
    // fewest families are already enrolled (ties go to the lower school id).
    const local = sorted.filter((row) => row.placeId === home.placeId);
    const school = local.reduce((fewest, row) =>
      (enrolled.get(row.id) ?? 0) < (enrolled.get(fewest.id) ?? 0)
        ? row
        : fewest,
    )!;
    enrolled.set(school.id, (enrolled.get(school.id) ?? 0) + 1);
    const source: Source = {
      tag: "ESTIMATED",
      asOf: start,
      citation: data.citation,
      estimatedFrom: `${children} children aged ${p("openingSchoolAgeFirst")}–${p("openingSchoolAgeLast")} × private share ${share.toFixed(4)} of enrolled children (NCES private share less the Census Household Pulse homeschool share) × average tuition $${p("openingPrivateTuitionAnnualUsd")} a year; the town's private tuition spread over its families.`,
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
