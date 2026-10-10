import { describe, expect, it } from "vitest";
import financeCatalog from "./data/opening-finance.json" with { type: "json" };
import customerCatalog from "./data/opening-customers.json" with { type: "json" };
import booksCatalog from "./data/business-books.json" with { type: "json" };
import { LIVING_COSTS_CATEGORY_SOURCES } from "../simulation/living-costs-category-data";
import { FinanceReadGuard } from "./finance-plan";
import { PARAMETERS } from "./parameters";
import {
  compactGeneratedHouseholdSource,
  defaultGeneratedHouseholdCalendarData,
  defaultGeneratedHouseholdCatalogs,
  generatedHouseholdSourceBasis,
  readGeneratedHouseholdSourceBasis,
  resolveGeneratedHouseholdSource,
  type GeneratedHouseholdSource,
  type GeneratedHouseholdSourceOwners,
} from "./generated-household-source";
import type { HouseholdInput, Source } from "./types";
const ownSource: Source = {
  tag: "SOURCED",
  asOf: "2021-01-01",
  citation: "Actual independent household identity record",
  estimatedFrom: "Retained original custom household provenance. ".repeat(200),
  generationPriorVintage: "actual original identity vintage",
};
const jobSource: Source = {
  tag: "SOURCED",
  asOf: "2021-01-01",
  citation: "Actual owned job Source",
};
function fixture(domain: "category" | "service") {
  const household = {
    id: "actual-hh",
    memberIds: ["actual-person"],
    placeId: "actual-place",
    source: ownSource,
  } as HouseholdInput;
  const service = customerCatalog.householdServices.find(
    (row) => row.key === "personal-care",
  )!;
  const parent = customerCatalog.parents.personalCare;
  const refs =
    domain === "category"
      ? [
          financeCatalog.periodMonthsParameter,
          "daysPerMeanYear",
          "monthsPerYear",
          "minorPerDollar",
        ]
      : [
          service.componentAnnualParameter,
          parent.sizeParameters["1"],
          parent.regionalParameters.northeast,
          parent.nationalParameter,
        ];
  const basis = generatedHouseholdSourceBasis({
    domain,
    household,
    key: domain === "category" ? "food" : "personal-care",
    region: "northeast",
    sizeColumn: "1",
    parameterRefs: refs,
    calendarDueAt: "2021-01-04",
    calendarBasisIds: ["actual-job"],
    missingIncome: false,
  });
  const source = compactGeneratedHouseholdSource(
    basis,
    "2021-01-01",
    "calendar year 2024; real prior vintage",
  );
  const owners: GeneratedHouseholdSourceOwners = {
    households: new Map([[household.id, household]]),
    calendarRecords: new Map([
      ["actual-job", { householdId: household.id, sources: [jobSource] }],
    ]),
    parameters: PARAMETERS,
  };
  return { source, owners, household };
}
for (const domain of ["category", "service"] as const)
  describe(`default ${domain} household Source basis`, () => {
    it("returns unchanged complete catalog/parameter rows and actual full owning Sources with bounded fresh Source bytes", () => {
      const { source, owners, household } = fixture(domain),
        resolved = resolveGeneratedHouseholdSource(source, owners);
      expect(resolved.catalog).toBe(
        domain === "category" ? financeCatalog : customerCatalog,
      );
      expect(resolved.householdSource).toBe(household.source);
      expect(resolved.householdSource).toEqual(ownSource);
      expect(resolved.calendarRecords[0]!.sources[0]).toBe(jobSource);
      expect(resolved.categorySources).toEqual(LIVING_COSTS_CATEGORY_SOURCES);
      for (const { key, row } of resolved.parameters)
        expect(row).toBe(PARAMETERS[key]);
      expect(resolved.catalogRow).toEqual(
        domain === "category"
          ? financeCatalog.categories.find((row) => row.key === "food")
          : customerCatalog.householdServices.find(
              (row) => row.key === "personal-care",
            ),
      );
      expect(JSON.stringify(source).length).toBeLessThan(2000);
      expect(JSON.stringify(source)).not.toContain(ownSource.estimatedFrom);
      expect(owners.households.get(household.id)!.source).toEqual(ownSource);
    });
    it("rejects selectors/version/full owning Source/parameter and calendar scope tamper without changing the actual owning graph", () => {
      const { source, owners, household } = fixture(domain),
        before = JSON.stringify({
          household,
          records: [...owners.calendarRecords],
          parameters: owners.parameters,
        });
      for (const field of [
        "catalogVersion",
        "key",
        "householdId",
        "ownerSourceDigest",
      ] as const) {
        const bad = structuredClone(source);
        bad.generatedHouseholdBasis[field] = "changed-original-ref";
        // Refresh representation text: even a coordinated text/ref rewrite cannot create the independent actual owner/catalog.
        const coherentBad = compactGeneratedHouseholdSource(
          bad.generatedHouseholdBasis,
          source.asOf,
          source.generationPriorVintage,
        );
        expect(() =>
          resolveGeneratedHouseholdSource(coherentBad, owners),
        ).toThrow();
      }
      expect(() =>
        resolveGeneratedHouseholdSource(source, {
          ...owners,
          households: new Map([
            [
              household.id,
              {
                ...household,
                source: {
                  ...household.source,
                  estimatedFrom: "changed actual full Source",
                },
              },
            ],
          ]),
        }),
      ).toThrow();
      const key = source.generatedHouseholdBasis.parameterRefs[0]!;
      expect(() =>
        resolveGeneratedHouseholdSource(source, {
          ...owners,
          parameters: {
            ...PARAMETERS,
            [key]: {
              ...PARAMETERS[key]!,
              estimatedFrom: "changed full parameter provenance",
            },
          },
        }),
      ).toThrow();
      expect(() =>
        resolveGeneratedHouseholdSource(source, {
          ...owners,
          calendarRecords: new Map([
            [
              "actual-job",
              { householdId: "other-household", sources: [jobSource] },
            ],
          ]),
        }),
      ).toThrow();
      expect(
        JSON.stringify({
          household,
          records: [...owners.calendarRecords],
          parameters: owners.parameters,
        }),
      ).toBe(before);
    });
    it("captures exact subtype fields/arrays under the original final guard and rejects a detached ref changed after preparation", () => {
      const { source } = fixture(domain);
      for (const change of [
        (row: GeneratedHouseholdSource) => {
          row.generatedHouseholdBasis.key = "changed";
        },
        (row: GeneratedHouseholdSource) => {
          (row.generatedHouseholdBasis.calendarBasisIds as string[])[0] =
            "other-owned-id";
        },
        (row: GeneratedHouseholdSource) => {
          delete (row as Source).generatedHouseholdBasis;
        },
      ]) {
        const actual = structuredClone(source),
          reads = new FinanceReadGuard();
        expect(readGeneratedHouseholdSourceBasis(reads, actual)).toEqual(
          actual.generatedHouseholdBasis,
        );
        reads.seal();
        change(actual);
        expect(() => reads.verify()).toThrow();
      }
    });
  });
it("requires the complete default catalog and parameter identities rather than matching citations or values", () => {
  expect(
    defaultGeneratedHouseholdCatalogs(
      "category",
      financeCatalog,
      PARAMETERS,
      booksCatalog,
    ),
  ).toBe(true);
  expect(
    defaultGeneratedHouseholdCatalogs("service", customerCatalog, PARAMETERS),
  ).toBe(true);
  const altered = structuredClone(customerCatalog);
  altered.householdServices[0]!.supplierOccupations = ["unsupported-product"];
  expect(
    defaultGeneratedHouseholdCatalogs("service", altered, PARAMETERS),
  ).toBe(false);
  const calendar = structuredClone(financeCatalog);
  calendar.openingPurchaseCalendar.source.estimatedFrom +=
    " actual custom calendar rationale";
  expect(
    defaultGeneratedHouseholdCatalogs(
      "category",
      calendar,
      PARAMETERS,
      booksCatalog,
    ),
  ).toBe(false);
  const custom = {
    ...PARAMETERS,
    daysPerMeanYear: {
      ...PARAMETERS.daysPerMeanYear!,
      citation: "Actual custom parameter citation",
    },
  };
  expect(
    defaultGeneratedHouseholdCatalogs(
      "category",
      financeCatalog,
      custom,
      booksCatalog,
    ),
  ).toBe(false);
});

it("keeps all three actual custom calendar Source fields outside compact eligibility", () => {
  expect(
    defaultGeneratedHouseholdCalendarData(
      financeCatalog.openingPurchaseCalendar,
    ),
  ).toBe(true);
  for (const field of [
    "citation",
    "estimatedFrom",
    "generationPriorVintage",
  ] as const) {
    const custom = structuredClone(financeCatalog.openingPurchaseCalendar);
    custom.source[field] += " actual custom calendar provenance";
    expect(defaultGeneratedHouseholdCalendarData(custom)).toBe(false);
  }
});

it("preserves repeated national formula roles while guarding their order and unique actual calendar owners", () => {
  const { source: original, owners, household } = fixture("service");
  const service = customerCatalog.householdServices.find(
    (row) => row.key === "personal-care",
  )!;
  const parent = customerCatalog.parents.personalCare;
  const expectedRefs = [
    service.componentAnnualParameter,
    parent.sizeParameters["1"],
    parent.regionalParameters.national,
    parent.nationalParameter,
  ];
  expect(expectedRefs[2]).toBe(expectedRefs[3]);
  const args = {
    domain: "service" as const,
    household,
    key: service.key,
    region: "national",
    sizeColumn: "1",
    parameterRefs: expectedRefs,
    calendarDueAt: original.generatedHouseholdBasis.calendarDueAt,
    calendarBasisIds: original.generatedHouseholdBasis.calendarBasisIds,
    missingIncome: false,
  };
  const source = compactGeneratedHouseholdSource(
    generatedHouseholdSourceBasis(args),
    original.asOf,
    original.generationPriorVintage,
  );
  const resolved = resolveGeneratedHouseholdSource(source, owners);
  expect(source.generatedHouseholdBasis.parameterRefs).toEqual(expectedRefs);
  expect(resolved.parameters.map((row) => row.key)).toEqual(expectedRefs);
  expect(resolved.parameters).toHaveLength(expectedRefs.length);
  for (const { key, row } of resolved.parameters)
    expect(row).toBe(PARAMETERS[key]);
  expect(resolved.parameters[2]!.row).toBe(resolved.parameters[3]!.row);
  expect(resolved.calendarRecords.map((row) => row.id)).toEqual(
    args.calendarBasisIds,
  );

  // Even coherently refreshed text cannot replace the owning catalog's roles.
  const reordered = [...expectedRefs];
  [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
  const deduplicated = expectedRefs.filter(
    (key, index, rows) => rows.indexOf(key) === index,
  );
  for (const parameterRefs of [reordered, deduplicated]) {
    const bad = compactGeneratedHouseholdSource(
      generatedHouseholdSourceBasis({ ...args, parameterRefs }),
      original.asOf,
      original.generationPriorVintage,
    );
    expect(() => resolveGeneratedHouseholdSource(bad, owners)).toThrow(
      /selected other original parameter rows/,
    );
  }
  const calendarId = args.calendarBasisIds[0]!;
  expect(() =>
    compactGeneratedHouseholdSource(
      generatedHouseholdSourceBasis({
        ...args,
        calendarBasisIds: [calendarId, calendarId],
      }),
      original.asOf,
      original.generationPriorVintage,
    ),
  ).toThrow(/basis IDs/);

  const actual = structuredClone(source),
    reads = new FinanceReadGuard();
  expect(
    readGeneratedHouseholdSourceBasis(reads, actual)!.parameterRefs,
  ).toEqual(expectedRefs);
  reads.seal();
  (actual.generatedHouseholdBasis.parameterRefs as string[])[2] =
    parent.regionalParameters.northeast;
  expect(() => reads.verify()).toThrow();
});

it("does not inspect unrelated registry entries when selecting default household Source representation", () => {
  const key = "openingCustomerOutsideHouseholdLiquidUsd";
  const registry = { ...PARAMETERS };
  Object.defineProperty(registry, key, {
    enumerable: true,
    get: () => {
      throw new Error("Unreferenced retired stock parameter was read.");
    },
  });
  expect(
    defaultGeneratedHouseholdCatalogs("service", customerCatalog, registry),
  ).toBe(true);
  expect(
    defaultGeneratedHouseholdCatalogs(
      "category",
      financeCatalog,
      registry,
      booksCatalog,
    ),
  ).toBe(true);
});

it("keeps genuine household formula, unit, cadence and vendor-capacity parameter provenance outside compact eligibility", () => {
  const service = customerCatalog.householdServices.find(
    (row) => row.key === "personal-care",
  )!;
  const dependencies = [
    { domain: "service" as const, key: service.componentAnnualParameter },
    {
      domain: "service" as const,
      key: customerCatalog.parents.personalCare.nationalParameter,
    },
    { domain: "service" as const, key: customerCatalog.periodMonthsParameter },
    { domain: "service" as const, key: "minorPerDollar" },
    { domain: "service" as const, key: "hoursPerDay" },
    { domain: "service" as const, key: "minutesPerHour" },
    { domain: "category" as const, key: financeCatalog.periodMonthsParameter },
    { domain: "category" as const, key: "daysPerMeanYear" },
    {
      domain: "category" as const,
      key: booksCatalog.kinds[0]!.payrollShareParameter,
    },
  ];
  for (const { domain, key } of dependencies) {
    const actual = PARAMETERS[key]!;
    const registry = {
      ...PARAMETERS,
      [key]: {
        ...actual,
        citation: `${actual.citation} Actual custom complete parameter provenance.`,
      },
    };
    expect(registry[key]!.value).toBe(actual.value);
    expect(
      defaultGeneratedHouseholdCatalogs(
        domain,
        domain === "service" ? customerCatalog : financeCatalog,
        registry,
        domain === "category" ? booksCatalog : undefined,
      ),
    ).toBe(false);
  }
});
