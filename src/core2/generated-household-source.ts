/** Generated default household provenance only. It grants no payment authority. */
import financeCatalog from "./data/opening-finance.json" with { type: "json" };
import customerCatalog from "./data/opening-customers.json" with { type: "json" };
import booksCatalog from "./data/business-books.json" with { type: "json" };
import {
  LIVING_COSTS_CATEGORY_DATA,
  LIVING_COSTS_CATEGORY_SOURCES,
} from "../simulation/living-costs-category-data";
import { stableHash } from "../simulation/ids";
import { makeIsoDate } from "../simulation/dates";
import { P, PARAMETERS, type Parameter } from "./parameters";
import type { FinanceReadGuard } from "./finance-plan";
import type { CoreInput, HouseholdInput, Source } from "./types";

export interface GeneratedHouseholdSourceBasis {
  schema: "p8-hh-source-basis/v1";
  domain: "category" | "service";
  catalogVersion: string;
  householdId: string;
  ownerSourceDigest: string;
  key: string;
  region: string;
  sizeColumn: string;
  parameterRefs: readonly string[];
  calendarDueAt: string;
  calendarBasisIds: readonly string[];
  missingIncome: boolean;
}
export interface GeneratedHouseholdSource extends Source {
  generatedHouseholdBasis: GeneratedHouseholdSourceBasis;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, row]) => row !== undefined)
      .sort(([a], [b]) => (a < b ? -P.one : a > b ? P.one : P.zero))
      .map(([key, row]) => `${JSON.stringify(key)}:${canonical(row)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
const defaultFinance = canonical(financeCatalog),
  defaultCustomers = canonical(customerCatalog),
  defaultBooks = canonical(booksCatalog);
const defaultCalendar = canonical(financeCatalog.openingPurchaseCalendar);
/** Caller custom calendar DATA keeps its full three Source fields. */
export function defaultGeneratedHouseholdCalendarData(data: unknown): boolean {
  return canonical(data) === defaultCalendar;
}
const financeVersion = financeCatalog.version,
  customerVersion = customerCatalog.version;
const categorySnapshots = new Map(
  Object.entries(LIVING_COSTS_CATEGORY_DATA).map(([key, row]) => [
    key,
    canonical(row),
  ]),
);
const categorySourceSnapshot = canonical(LIVING_COSTS_CATEGORY_SOURCES);
const parameterSnapshots = new Map(
  Object.entries(PARAMETERS).map(([key, row]) => [key, canonical(row)]),
);
const financeRows = new Map(
  financeCatalog.categories.map((row) => [row.key, canonical(row)]),
);
const serviceRows = new Map(
  customerCatalog.householdServices.map((row) => [row.key, canonical(row)]),
);
// Complete parameter rows for the declared household formula dependencies.
// Registry entries outside these routes are not household provenance and must
// not change its representation or be read merely to decide compaction.
const householdUnitParameterRefs = [
  "zero",
  "one",
  "daysPerMeanYear",
  "monthsPerYear",
  "minorPerDollar",
  "hoursPerDay",
  "minutesPerHour",
];
const householdParameterRefs = {
  category: [
    ...new Set([
      ...householdUnitParameterRefs,
      financeCatalog.periodMonthsParameter,
      ...booksCatalog.kinds.flatMap((kind) => [
        kind.marginParameter,
        kind.payrollShareParameter,
        kind.salesCostShareParameter,
      ]),
    ]),
  ],
  service: [
    ...new Set([
      ...householdUnitParameterRefs,
      customerCatalog.periodMonthsParameter,
      customerCatalog.agreementLeadDaysParameter,
      customerCatalog.sizeTopCodeParameter,
      ...customerCatalog.householdServices.map(
        (row) => row.componentAnnualParameter,
      ),
      ...Object.values(customerCatalog.parents).flatMap((parent) => [
        parent.nationalParameter,
        ...Object.values(parent.regionalParameters),
        ...Object.values(parent.sizeParameters),
      ]),
    ]),
  ],
};
/** Complete catalog/dependency rows checked once per producer, not per due. */
export function defaultGeneratedHouseholdCatalogs(
  domain: "category" | "service",
  data: unknown,
  parameters: unknown,
  books?: unknown,
): boolean {
  if (!parameters || typeof parameters !== "object") return false;
  const registry = parameters as Readonly<Record<string, Parameter>>;
  return (
    canonical(data) ===
      (domain === "category" ? defaultFinance : defaultCustomers) &&
    householdParameterRefs[domain].every((key) => {
      const row = registry[key];
      return (
        row !== undefined && canonical(row) === parameterSnapshots.get(key)
      );
    }) &&
    (domain !== "category" || canonical(books) === defaultBooks)
  );
}
export function mayCompactGeneratedHouseholdSources(
  sources: readonly (Source | undefined)[],
): boolean {
  return sources.every(
    (row) =>
      row === undefined ||
      row.generatedHouseholdBasis?.schema === "p8-hh-source-basis/v1",
  );
}
export function generatedHouseholdSourceBasis(
  args: Omit<
    GeneratedHouseholdSourceBasis,
    "schema" | "catalogVersion" | "householdId" | "ownerSourceDigest"
  > & { household: HouseholdInput },
): GeneratedHouseholdSourceBasis {
  const { household, ...basis } = args;
  return Object.freeze({
    ...basis,
    schema: "p8-hh-source-basis/v1",
    catalogVersion:
      args.domain === "category" ? financeVersion : customerVersion,
    householdId: household.id,
    ownerSourceDigest: stableHash(canonical(household.source)),
    parameterRefs: Object.freeze([...args.parameterRefs]),
    calendarBasisIds: Object.freeze([...args.calendarBasisIds]),
  });
}
export function compactGeneratedHouseholdSource(
  basis: GeneratedHouseholdSourceBasis,
  asOf: string,
  generationPriorVintage: string | undefined,
): GeneratedHouseholdSource {
  checkBasis(basis);
  return {
    tag: "ESTIMATED",
    asOf,
    generationPriorVintage,
    citation:
      "BLS Consumer Expenditure Survey (2024); JPMorgan Chase Institute (2016). DATA openingPurchaseCalendar.source; full catalogs/owners resolve through generatedHouseholdBasis.",
    estimatedFrom: `Default ${basis.domain} ${basis.key} prior; basis digest ${stableHash(canonical(basis))}; original household-envelope cap; ${basis.domain === "category" ? "source-category allocation / projected-capacity vendor shares" : "component/size/region scaling / equal vendor shares"}. Calendar marker ${financeCatalog.openingPurchaseCalendar.recurringHouseholdDueRule}; result ${basis.calendarDueAt}; basis ${basis.calendarBasisIds.join(", ") || "none"}. ${financeCatalog.openingPurchaseCalendar.stopgapId} No observed invoice, attendance or payment.${basis.missingIncome ? ` Missing income timing: explicit calendar-only fallback; ${financeCatalog.openingPurchaseCalendar.missingIncomeGap}:${basis.householdId}.` : ""}`,
    generatedHouseholdBasis: basis,
  };
}
function checkBasis(basis: GeneratedHouseholdSourceBasis): void {
  const keys = [
    "schema",
    "domain",
    "catalogVersion",
    "householdId",
    "ownerSourceDigest",
    "key",
    "region",
    "sizeColumn",
    "parameterRefs",
    "calendarDueAt",
    "calendarBasisIds",
    "missingIncome",
  ];
  if (
    !basis ||
    Object.keys(basis).length !== keys.length ||
    Object.keys(basis).some((key) => !keys.includes(key)) ||
    basis.schema !== "p8-hh-source-basis/v1" ||
    !["category", "service"].includes(basis.domain) ||
    [
      basis.householdId,
      basis.ownerSourceDigest,
      basis.key,
      basis.region,
      basis.sizeColumn,
      basis.catalogVersion,
      basis.calendarDueAt,
    ].some((row) => typeof row !== "string" || !row.trim()) ||
    typeof basis.missingIncome !== "boolean"
  )
    throw new Error("Invalid generated household Source basis.");
  makeIsoDate(basis.calendarDueAt);
  for (const ids of [basis.parameterRefs, basis.calendarBasisIds])
    if (
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string" || !id.trim())
    )
      throw new Error("Invalid generated household Source basis IDs.");
  // Parameter references preserve formula roles; the national fallback uses
  // the same source row as both its regional numerator and national divisor.
  if (new Set(basis.calendarBasisIds).size !== basis.calendarBasisIds.length)
    throw new Error("Invalid generated household calendar basis IDs.");
}
/** Bounded original guard reads; no projector may silently omit this property. */
export function readGeneratedHouseholdSourceBasis(
  reads: FinanceReadGuard,
  source: Source,
): GeneratedHouseholdSourceBasis | undefined {
  const basis = reads.field(source, "generatedHouseholdBasis");
  if (basis === undefined) return undefined;
  const keys = reads.keys(basis),
    copy = {} as GeneratedHouseholdSourceBasis;
  for (const key of keys) {
    if (typeof key !== "string")
      throw new Error("Generated household basis requires own named fields.");
    const value = reads.field(basis as unknown as Record<string, unknown>, key);
    Object.assign(copy, {
      [key]:
        key === "parameterRefs" || key === "calendarBasisIds"
          ? reads.array(value as readonly string[], P.zero, P.one)
          : value,
    });
  }
  checkBasis(copy);
  if (
    reads.field(source, "estimatedFrom") !==
    compactGeneratedHouseholdSource(
      copy,
      reads.field(source, "asOf"),
      reads.field(source, "generationPriorVintage"),
    ).estimatedFrom
  )
    throw new Error(
      "Generated household Source differs from its exact typed basis.",
    );
  return Object.freeze(copy);
}
export interface GeneratedHouseholdSourceOwners {
  households: ReadonlyMap<string, Pick<HouseholdInput, "id" | "source">>;
  /** Entries must be the actual job/commitment/award/expense owners, not copied citations. */
  calendarRecords: ReadonlyMap<
    string,
    { householdId: string; sources: readonly Source[] }
  >;
  parameters: Readonly<Record<string, Parameter>>;
}
/** Pure provenance resolution; never used to approve cash, qualifications or eligibility. */
export function resolveGeneratedHouseholdSource(
  source: Source,
  owners: GeneratedHouseholdSourceOwners,
) {
  const basis = source.generatedHouseholdBasis;
  if (!basis) throw new Error("Source has no generated household basis.");
  checkBasis(basis);
  if (
    source.estimatedFrom !==
    compactGeneratedHouseholdSource(
      basis,
      source.asOf,
      source.generationPriorVintage,
    ).estimatedFrom
  )
    throw new Error(
      "Generated household Source differs from its exact typed basis.",
    );
  const household = owners.households.get(basis.householdId);
  if (
    !household ||
    household.id !== basis.householdId ||
    stableHash(canonical(household.source)) !== basis.ownerSourceDigest
  )
    throw new Error(
      "Generated household basis differs from its actual full owner Source.",
    );
  const catalog =
    basis.domain === "category" ? financeCatalog : customerCatalog;
  if (
    basis.catalogVersion !==
    (basis.domain === "category" ? financeVersion : customerVersion)
  )
    throw new Error("Wrong generated household catalog version.");
  const row =
    basis.domain === "category"
      ? financeCatalog.categories.find((entry) => entry.key === basis.key)
      : customerCatalog.householdServices.find(
          (entry) => entry.key === basis.key,
        );
  if (
    !row ||
    canonical(row) !==
      (basis.domain === "category" ? financeRows : serviceRows).get(basis.key)
  )
    throw new Error("Missing or changed complete household catalog row.");
  let expectedRefs: readonly string[], categoryMeans: unknown, parent: unknown;
  if (basis.domain === "category") {
    const table = (
      LIVING_COSTS_CATEGORY_DATA as unknown as Record<
        string,
        { regions: Record<string, unknown>; sizes: Record<string, unknown> }
      >
    )[basis.key];
    if (
      canonical(table) !== categorySnapshots.get(basis.key) ||
      canonical(LIVING_COSTS_CATEGORY_SOURCES) !== categorySourceSnapshot
    )
      throw new Error("Changed complete retained BLS category/source records.");
    if (!table?.regions[basis.region] || !table.sizes[basis.sizeColumn])
      throw new Error("Missing exact household category region/size row.");
    categoryMeans = {
      regional: table.regions[basis.region],
      size: table.sizes[basis.sizeColumn],
      national: table.regions.national,
    };
    expectedRefs = [
      financeCatalog.periodMonthsParameter,
      "daysPerMeanYear",
      "monthsPerYear",
      "minorPerDollar",
    ];
  } else {
    const service = customerCatalog.householdServices.find(
      (entry) => entry.key === basis.key,
    )!;
    const selected = (
      customerCatalog.parents as unknown as Record<
        string,
        {
          nationalParameter: string;
          regionalParameters: Record<string, string>;
          sizeParameters: Record<string, string>;
        }
      >
    )[service.parentKey];
    if (
      !selected?.regionalParameters[basis.region] ||
      !selected.sizeParameters[basis.sizeColumn]
    )
      throw new Error(
        "Missing exact household service parent region/size row.",
      );
    parent = selected;
    expectedRefs = [
      service.componentAnnualParameter,
      selected.sizeParameters[basis.sizeColumn]!,
      selected.regionalParameters[basis.region]!,
      selected.nationalParameter,
    ];
  }
  if (canonical(basis.parameterRefs) !== canonical(expectedRefs))
    throw new Error(
      "Generated household Source selected other original parameter rows.",
    );
  const parameters = basis.parameterRefs.map((key) => {
    const row = owners.parameters[key];
    if (!row || canonical(row) !== parameterSnapshots.get(key))
      throw new Error(
        "Generated household parameter differs from the complete default owning row.",
      );
    return { key, row };
  });
  const calendarRecords = basis.calendarBasisIds.map((id) => {
    const row = owners.calendarRecords.get(id);
    if (!row || row.householdId !== household.id || !row.sources.length)
      throw new Error(
        "Generated household calendar basis lacks its actual owning record.",
      );
    return { id, sources: row.sources };
  });
  return {
    householdSource: household.source,
    catalog,
    catalogRow: row,
    booksCatalog,
    parameters,
    parent,
    categoryMeans,
    categorySources: LIVING_COSTS_CATEGORY_SOURCES,
    calendarData: financeCatalog.openingPurchaseCalendar,
    calendarRecords,
  };
}

/** Developer provenance lookup from actual current input rows, never a cash API. */
export function resolveGeneratedHouseholdSourceFromInput(
  source: Source,
  input: CoreInput,
  parameters: Readonly<Record<string, Parameter>> = PARAMETERS,
  recordedContracts = input.finance?.contracts ?? [],
) {
  const basis = source.generatedHouseholdBasis;
  if (!basis) throw new Error("Source has no generated household basis.");
  const homes = input.households.filter((row) => row.id === basis.householdId);
  if (homes.length !== P.one)
    throw new Error("Missing or ambiguous actual household Source owner.");
  const home = homes[P.zero]!,
    calendarRecords = new Map<
      string,
      { householdId: string; sources: readonly Source[] }
    >();
  for (const id of basis.calendarBasisIds) {
    const found: { householdId: string; sources: readonly Source[] }[] = [];
    for (const job of input.jobs)
      if (job.id === id) {
        const people = input.people.filter((row) => row.id === job.personId);
        if (people.length !== P.one)
          throw new Error("Missing actual calendar job person owner.");
        found.push({
          householdId: people[P.zero]!.householdId,
          sources: [job.source],
        });
      }
    for (const row of input.workCommitments ?? [])
      if (row.id === id) {
        const people = input.people.filter(
          (person) => person.id === row.personId,
        );
        if (people.length !== P.one)
          throw new Error("Missing actual calendar commitment person owner.");
        found.push({
          householdId: people[P.zero]!.householdId,
          sources: [row.scheduleSource, row.paySource],
        });
      }
    for (const person of input.people)
      for (const fact of person.pastFacts ?? [])
        if (fact.id === id)
          found.push({
            householdId: person.householdId,
            sources: [fact.source],
          });
    for (const row of recordedContracts)
      if (row.id === id) {
        const owner = row.householdId ?? row.recipientIncome?.householdId;
        if (!owner)
          throw new Error("Calendar term lacks its actual household owner.");
        found.push({ householdId: owner, sources: [row.source] });
      }
    if (found.length !== P.one)
      throw new Error("Missing or ambiguous actual calendar Source owner.");
    calendarRecords.set(id, found[P.zero]!);
  }
  return resolveGeneratedHouseholdSource(source, {
    households: new Map([[home.id, home]]),
    calendarRecords,
    parameters,
  });
}
