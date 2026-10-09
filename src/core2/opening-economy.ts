/** Compose opening record producers; runtime settlement remains in the shared writers. */
import {
  createOpeningFinance,
  type OpeningFinanceOptions,
} from "./opening-finance";
import {
  buildOpeningRetirementIncome,
  type OpeningIncomeOptions,
} from "./opening-income";
import {
  buildOpeningRetirementFunding,
  type OpeningRetirementFundingOptions,
} from "./opening-income-funding";
import {
  buildOpeningCustomers,
  type OpeningCustomerOptions,
} from "./opening-customers";
import { parameter as p } from "./parameters";
import type { CoreInput, Source } from "./types";

export interface OpeningEconomyOptions {
  finance?: OpeningFinanceOptions;
  income?: OpeningIncomeOptions;
  funding?: OpeningRetirementFundingOptions;
  customers?: OpeningCustomerOptions;
}

function cash(input: CoreInput): number {
  let total = p("zero");
  for (const owner of [...input.people, ...input.organizations]) {
    if (
      !Number.isSafeInteger(owner.liquidMinor) ||
      owner.liquidMinor < p("zero")
    )
      throw new Error(
        "Opening economy requires actual finite integer cash stocks.",
      );
    total += owner.liquidMinor;
    if (!Number.isSafeInteger(total))
      throw new Error("Opening economy cash aggregate overflows.");
  }
  return total;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

export interface OpeningEconomyAccountDisclosure {
  id: string;
  stage: "income" | "funding" | "customers";
  name: string;
  placeId: string;
  classification?: string;
  openedAt: string;
  liquidMinor: number;
  economicCoverage: string;
  nonoverlapBasis: string;
  sourceStockRecordId?: string;
  source: Source;
}

export function buildOpeningEconomy(
  input: CoreInput,
  options: OpeningEconomyOptions = {},
) {
  const originalCashMinor = cash(input);
  // Existing prepared finance wins. The CLI freezes the supplied original before
  // calling any producer; the composer never rebuilds population or deep past.
  const withFinance: CoreInput = input.finance
    ? input
    : {
        ...input,
        finance: createOpeningFinance(input, options.finance),
      };
  const income = buildOpeningRetirementIncome(withFinance, options.income);
  const funding = buildOpeningRetirementFunding(income.input, options.funding);
  const customers = buildOpeningCustomers(funding.input, options.customers);
  const addedCashMinor =
    income.receipt.addedOpeningLiquidMinor +
    funding.receipt.addedOpeningLiquidMinor +
    customers.receipt.addedCashMinor;
  const enrichedCashMinor = cash(customers.input);
  if (
    !Number.isSafeInteger(addedCashMinor) ||
    originalCashMinor + addedCashMinor !== enrichedCashMinor
  )
    throw new Error("Opening economy stock disclosures do not reconcile.");
  if (
    customers.input.jobs !== input.jobs ||
    customers.input.workCommitments !== input.workCommitments
  )
    throw new Error(
      "Opening economy changed original employment or timetables.",
    );
  const people = new Map(customers.input.people.map((row) => [row.id, row]));
  const organizations = new Map(
    customers.input.organizations.map((row) => [row.id, row]),
  );
  if (
    people.size !== customers.input.people.length ||
    organizations.size !== customers.input.organizations.length ||
    customers.input.people.length !== input.people.length ||
    customers.input.households !== input.households
  )
    throw new Error(
      "Opening economy changed the original people/household roster or admitted duplicate accounts.",
    );
  for (const original of input.people) {
    const next = people.get(original.id);
    if (
      !next ||
      next.liquidMinor !== original.liquidMinor ||
      next.householdId !== original.householdId ||
      next.jobId !== original.jobId ||
      next.livingCostDailyMinor !== original.livingCostDailyMinor
    )
      throw new Error(
        "Opening economy changed an original person's cash, household, job or cost plan.",
      );
    const beforeFields = { ...original },
      afterFields = { ...next };
    delete beforeFields.pastFacts;
    delete afterFields.pastFacts;
    if (
      canonical(beforeFields) !== canonical(afterFields) ||
      (original.pastFacts ?? []).some(
        (fact, index) => canonical(next.pastFacts?.[index]) !== canonical(fact),
      )
    )
      throw new Error(
        `Opening economy changed an original person or prior fact: ${original.id}`,
      );
  }
  for (const original of input.organizations) {
    const next = organizations.get(original.id);
    if (!next || next.liquidMinor !== original.liquidMinor)
      throw new Error("Opening economy changed original organization cash.");
    const beforeFields = { ...original },
      afterFields = { ...next };
    delete beforeFields.governmentFacts;
    delete afterFields.governmentFacts;
    if (
      canonical(beforeFields) !== canonical(afterFields) ||
      Object.entries(original.governmentFacts ?? {}).some(
        ([key, value]) => next.governmentFacts?.[key] !== value,
      )
    )
      throw new Error(
        `Opening economy changed an original organization or government fact: ${original.id}`,
      );
  }
  const originalOrganizationIds = new Set(
    input.organizations.map((row) => row.id),
  );
  if (
    originalOrganizationIds.size !== input.organizations.length ||
    new Set(input.people.map((row) => row.id)).size !== input.people.length
  )
    throw new Error(
      "Opening economy requires unique original cash account IDs.",
    );
  const accounts = new Map<string, OpeningEconomyAccountDisclosure>();
  const disclose = (
    id: string,
    stage: OpeningEconomyAccountDisclosure["stage"],
    liquidMinor: number,
    stock?: (typeof customers.receipt.newStocks)[number],
  ) => {
    const account = organizations.get(id);
    if (
      !account ||
      originalOrganizationIds.has(id) ||
      people.has(id) ||
      accounts.has(id) ||
      account.liquidMinor !== liquidMinor
    )
      throw new Error(
        `Opening economy stock disclosure conflicts with admitted account: ${id}`,
      );
    const disclosure: OpeningEconomyAccountDisclosure = {
      id,
      stage,
      name: account.name,
      placeId: account.placeId,
      classification: account.classification,
      openedAt: stock?.openedAt ?? account.source.asOf,
      liquidMinor,
      economicCoverage:
        stock?.economicCoverage ??
        account.source.estimatedFrom ??
        account.source.citation,
      nonoverlapBasis:
        stock?.nonoverlapBasis ??
        `One new finite ${stage} account ${id}, absent from the original account roster; existing person and organization cash is preserved separately.`,
      ...(stock ? { sourceStockRecordId: stock.stockSourceRecordId } : {}),
      source: account.source,
    };
    accounts.set(id, disclosure);
  };
  for (const row of income.receipt.payerAccounts)
    if (row.added) disclose(row.id, "income", row.openingLiquidMinor);
  for (const row of funding.receipt.contributorAccounts)
    if (row.added) disclose(row.id, "funding", row.openingLiquidMinor);
  for (const row of customers.receipt.newStocks)
    disclose(row.cashEntityId, "customers", row.liquidMinor, row);
  const addedOpeningAccounts = [...accounts.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const newlyAdmitted = customers.input.organizations.filter(
    (row) => !originalOrganizationIds.has(row.id),
  );
  if (
    newlyAdmitted.length !== addedOpeningAccounts.length ||
    newlyAdmitted.some((row) => !accounts.has(row.id)) ||
    addedOpeningAccounts.reduce(
      (total, row) => total + row.liquidMinor,
      p("zero"),
    ) !== addedCashMinor
  )
    throw new Error(
      "Opening economy contains an undisclosed or double-counted new cash account.",
    );
  for (const [key, value] of Object.entries(input.placeMetadata ?? {}))
    if (customers.input.placeMetadata?.[key] !== value)
      throw new Error(
        `Opening economy changed original place metadata: ${key}`,
      );
  const finalContracts = new Map(
    customers.input.finance?.contracts.map((row) => [row.id, row]),
  );
  for (const row of input.finance?.contracts ?? [])
    if (canonical(finalContracts.get(row.id)) !== canonical(row))
      throw new Error(
        `Opening economy changed an original finance contract: ${row.id}`,
      );
  if (
    input.finance &&
    (customers.input.finance?.facilities !== input.finance.facilities ||
      customers.input.finance?.businesses !== input.finance.businesses ||
      customers.input.finance?.conditions !== input.finance.conditions)
  )
    throw new Error(
      "Opening economy changed existing facilities, books or conditions.",
    );
  return {
    input: customers.input,
    receipt: {
      schema: "p8-opening-economy-records-v1",
      status: "OPENING_RECORDS_ONLY_NO_RUNTIME_SETTLEMENT",
      producerOrder: [
        "opening-finance",
        "opening-income",
        "opening-income-funding",
        "opening-customers",
      ],
      originalCashMinor,
      addedCashMinor,
      enrichedCashMinor,
      addedOpeningAccounts,
      originalPeople: input.people.length,
      enrichedPeople: customers.input.people.length,
      originalHouseholds: input.households.length,
      enrichedHouseholds: customers.input.households.length,
      originalOrganizations: input.organizations.length,
      enrichedOrganizations: customers.input.organizations.length,
      originalJobs: input.jobs.length,
      originalJobsPreserved: true,
      originalWorkCommitmentsPreserved: true,
      originalPeopleAndPastFactsPreserved: true,
      originalOrganizationsAndGovernmentFactsPreserved: true,
      originalPlaceMetadataPreserved: true,
      openingFinance: {
        suppliedFinancePreserved: Boolean(input.finance),
        originalContracts: input.finance?.contracts.length ?? p("zero"),
        boundContracts: withFinance.finance?.contracts.length ?? p("zero"),
        businesses: withFinance.finance?.businesses.length ?? p("zero"),
        facilities: withFinance.finance?.facilities.length ?? p("zero"),
        gaps: withFinance.finance?.gaps ?? [],
      },
      financeContracts: customers.input.finance?.contracts.length ?? p("zero"),
      income: income.receipt,
      funding: funding.receipt,
      customers: customers.receipt,
    },
  };
}

export type OpeningEconomyBuild = ReturnType<typeof buildOpeningEconomy>;
