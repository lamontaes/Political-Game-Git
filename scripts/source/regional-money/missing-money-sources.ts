/** Assignments 5, Job 3. Acquisition uses the shared, receipt-writing client. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  STATES,
  TERRITORY_USPS,
} from "../../../src/simulation/state-reference";
import { readZipMember } from "../../../src/source/core/archive/zip";
import {
  parseFinancePublisher,
  parseFinanceIdentities,
} from "../../../src/source/domains/government-finances/production";
import { gzipSync } from "node:zlib";
import { readXlsxSheet } from "../../../src/source/core/archive/xlsx";
import { normalizeRetrievedText } from "../../../src/source/core/parse/html-text";
import { parseDelimited } from "../../../src/source/core/parse/delimited";
import { parseBlsTimeSeries } from "../../../src/source/core/parse/bls-timeseries";
import { pathToFileURL } from "node:url";
import { acquirePlan } from "../acquire";
import type {
  AcquisitionRequest,
  ArtifactRights,
} from "../../../src/source/core/index";
import {
  assertValidArtifactLock,
  rightsPermitProduction,
  sha256Hex,
  toCanonicalJson,
} from "../../../src/source/core/index";

const government: ArtifactRights = {
  status: "public-domain-us-government",
  declaredLicense: null,
  attributionRequired: false,
};
const freddiePermission: ArtifactRights = {
  status: "declared-license",
  declaredLicense:
    "Freddie Mac PMMS archives: Information from this document may be used with proper attribution. Alteration of this document or its content is strictly prohibited. https://www.freddiemac.com/pmms/pmms_archives",
  attributionRequired: true,
};
const unresolved: ArtifactRights = {
  status: "UNKNOWN",
  declaredLicense: null,
  attributionRequired: "UNKNOWN",
};
type Source = {
  domain: string;
  id: string;
  url: string;
  filename: string;
  provider: string;
  vintage: string | null;
  rights?: ArtifactRights;
};
export const sources: readonly Source[] = [
  ...(JSON.parse(
    readFileSync(
      "data/source/state-revenue-tax-rates/source-plan.json",
      "utf8",
    ),
  ) as Source[]),
  {
    domain: "bls-cpi",
    id: "cpi-food",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.11.USFoodBeverage",
    filename: "cu.data.11.USFoodBeverage",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-housing",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing",
    filename: "cu.data.12.USHousing",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-apparel",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.13.USApparel",
    filename: "cu.data.13.USApparel",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-transportation",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.14.USTransportation",
    filename: "cu.data.14.USTransportation",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-medical",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.15.USMedical",
    filename: "cu.data.15.USMedical",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-recreation",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.16.USRecreation",
    filename: "cu.data.16.USRecreation",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-education",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.17.USEducationAndCommunication",
    filename: "cu.data.17.USEducationAndCommunication",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-other",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.18.USOtherGoodsAndServices",
    filename: "cu.data.18.USOtherGoodsAndServices",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "eia-energy-prices",
    id: "electricity-prices-2024",
    url: "https://www.eia.gov/electricity/sales_revenue_price/xls/table_4.xlsx",
    filename: "table-4-2024.xlsx",
    provider: "U.S. Energy Information Administration",
    vintage: "2024",
  },
  {
    domain: "census-trade",
    id: "manufacturing-trade-2022-xlsx",
    url: "https://www.census.gov/foreign-trade/Press-Release/MITR/2022/2022_Manufacturing_and_International_Trade_Report.xlsx",
    filename: "manufacturing-trade-2022.xlsx",
    provider: "U.S. Census Bureau",
    vintage: "2022",
  },
  {
    domain: "scf-household-finance",
    id: "scf-public-tables",
    url: "https://www.federalreserve.gov/econres/files/scf2022_tables_public_nominal_historical.xlsx",
    filename: "scf2022-public-nominal.xlsx",
    provider: "Federal Reserve Board",
    vintage: "1989–2022",
  },
  {
    domain: "scf-household-finance",
    id: "scf-extract-2022",
    url: "https://www.federalreserve.gov/econres/files/scfp2022excel.zip",
    filename: "scfp2022excel.zip",
    provider: "Federal Reserve Board",
    vintage: "2022",
  },
  {
    domain: "freddie-mac-mortgage-rates",
    id: "pmms-history",
    url: "https://www.freddiemac.com/pmms/docs/PMMS_history.csv",
    filename: "PMMS_history.csv",
    provider: "Freddie Mac",
    vintage: null,
    rights: freddiePermission,
  },
  {
    domain: "eia-energy-prices",
    id: "gasoline-prices",
    url: "https://www.eia.gov/petroleum/gasdiesel/xls/pswrgvwall.xls",
    filename: "pswrgvwall.xls",
    provider: "U.S. Energy Information Administration",
    vintage: null,
  },
  {
    domain: "eia-energy-prices",
    id: "gasoline-seds-annual-prices",
    url: "https://www.eia.gov/state/seds/sep_prices/total/csv/pr_all.csv",
    filename: "seds-prices-1970-2024.csv",
    provider: "U.S. Energy Information Administration",
    vintage: "1970–2024",
  },
  {
    domain: "eia-energy-prices",
    id: "gasoline-us-weekly-history",
    url: "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=EMM_EPMR_PTE_NUS_DPG",
    filename: "gasoline-us-weekly-history.html",
    provider: "U.S. Energy Information Administration",
    vintage: "1990–2026",
  },
  {
    domain: "federal-student-aid",
    id: "portfolio-location-current",
    url: "https://studentaid.gov/sites/default/files/fsawg/datacenter/library/portfolio-by-location.xls",
    filename: "portfolio-location-current.xls",
    provider: "U.S. Department of Education, Federal Student Aid",
    vintage: null,
  },
  {
    domain: "census-trade",
    id: "trade-index",
    url: "https://www.census.gov/foreign-trade/Press-Release/mitr_index.html",
    filename: "mitr-index.html",
    provider: "U.S. Census Bureau",
    vintage: null,
  },
  {
    domain: "irs-payroll-brackets",
    id: "irs-annual-brackets-2026",
    url: "https://www.irs.gov/irb/2025-45_IRB",
    filename: "irb-2025-45.html",
    provider: "Internal Revenue Service",
    vintage: "2026",
  },
  {
    domain: "jpmci-business-cash",
    id: "cash-buffer-full",
    url: "https://www.jpmorganchase.com/content/dam/jpmc/jpmorgan-chase-and-co/institute/pdf/jpmc-institute-small-business-report.pdf",
    filename: "cash-buffer-2016.pdf",
    provider: "JPMorgan Chase Institute",
    vintage: "2015 observations; 2016 report",
    rights: unresolved,
  },
  {
    domain: "scf-household-finance",
    id: "scf-index",
    url: "https://www.federalreserve.gov/econres/scfindex.htm",
    filename: "scf-index.html",
    provider: "Federal Reserve Board",
    vintage: "2022 SCF",
  },
  {
    domain: "freddie-mac-mortgage-rates",
    id: "pmms-archives",
    url: "https://www.freddiemac.com/pmms/pmms_archives",
    filename: "pmms-archives.html",
    provider: "Freddie Mac",
    vintage: null,
    rights: unresolved,
  },
  {
    domain: "eia-energy-prices",
    id: "electricity-prices",
    url: "https://www.eia.gov/electricity/data/state/avgprice_annual.xlsx",
    filename: "avgprice_annual.xlsx",
    provider: "U.S. Energy Information Administration",
    vintage: null,
  },
  {
    domain: "eia-energy-prices",
    id: "gasoline-index",
    url: "https://www.eia.gov/petroleum/gasdiesel/",
    filename: "gasdiesel.html",
    provider: "U.S. Energy Information Administration",
    vintage: null,
  },
  {
    domain: "irs-payroll-brackets",
    id: "irs-15t-2026",
    url: "https://www.irs.gov/publications/p15t",
    filename: "p15t.html",
    provider: "Internal Revenue Service",
    vintage: "2026",
  },
  {
    domain: "bls-cpi",
    id: "cpi-summaries",
    url: "https://download.bls.gov/pub/time.series/cu/cu.data.2.Summaries",
    filename: "cu.data.2.Summaries",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-series",
    url: "https://download.bls.gov/pub/time.series/cu/cu.series",
    filename: "cu.series",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "bls-cpi",
    id: "cpi-definitions",
    url: "https://download.bls.gov/pub/time.series/cu/cu.txt",
    filename: "cu.txt",
    provider: "U.S. Bureau of Labor Statistics",
    vintage: null,
  },
  {
    domain: "nasbo-state-reserves",
    id: "fiscal-survey-fall-2025",
    url: "https://higherlogicdownload.s3.amazonaws.com/NASBO/9d2d2db1-c943-4f1b-b750-0fca152d64c2/UploadedImages/Fiscal%20Survey/NASBO_Fall_2025_Fiscal_Survey_Full_Report_S.pdf",
    filename: "fall-2025.pdf",
    provider: "National Association of State Budget Officers",
    vintage: "Fall 2025",
    rights: unresolved,
  },
  {
    domain: "jpmci-business-cash",
    id: "cash-buffer-report",
    url: "https://www.jpmorganchase.com/institute/all-topics/business-growth-and-entrepreneurship/report-cash-flows-balances-and-buffer-days",
    filename: "cash-buffer-report.html",
    provider: "JPMorgan Chase Institute",
    vintage: "2015 observations; 2016 report",
    rights: unresolved,
  },
  {
    domain: "federal-student-aid",
    id: "portfolio-location",
    url: "https://data.ed.gov/dataset/fb615e1a-f95f-478d-bf7b-350fdf21133e/resource/172e1f02-638c-4a4d-bd69-1c5d959f657e/download/portfolio-by-location.xls",
    filename: "portfolio-by-location.xls",
    provider: "U.S. Department of Education, Federal Student Aid",
    vintage: null,
  },
  {
    domain: "census-trade",
    id: "manufacturing-trade-2022",
    url: "https://www.census.gov/foreign-trade/Press-Release/MITR/2022/2022_Manufacturing_and_International_Trade_Report.pdf",
    filename: "manufacturing-trade-2022.pdf",
    provider: "U.S. Census Bureau",
    vintage: "2022",
  },
  {
    domain: "government-finances",
    id: "finance-units-2024",
    url: "https://www2.census.gov/programs-surveys/gov-finances/tables/2024/2024_Individual_Unit_Files.zip",
    filename: "2024-individual-units.zip",
    provider: "U.S. Census Bureau",
    vintage: "2024",
  },
];

function request(source: Source): AcquisitionRequest {
  const extension = source.filename.split(".").at(-1);
  const mediaType =
    extension === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : extension === "xls"
        ? "application/vnd.ms-excel"
        : extension === "pdf"
          ? "application/pdf"
          : extension === "zip"
            ? "application/zip"
            : extension === "html"
              ? "text/html"
              : "text/plain";
  return {
    artifactId: source.id,
    provider: source.provider,
    url: source.url,
    method: "GET",
    mediaType,
    publisher: {
      statedVintage: source.vintage,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: source.url,
    },
    rights: source.rights ?? government,
    storage: "committed",
    localPath: `data/source/${source.domain}/raw/${source.filename}`,
  };
}

export async function acquire(ids: readonly string[]): Promise<void> {
  const selected = sources.filter((source) => ids.includes(source.id));
  if (selected.length !== new Set(ids).size)
    throw new Error("Unknown or duplicate source selection");
  // Different publishers may run together; each domain has a single lock writer.
  const domains = [...new Set(selected.map((source) => source.domain))];
  const results = await Promise.allSettled(
    domains.map(async (domain) => {
      const lockPath = `data/source/${domain}/money-artifact-lock.json`;
      if (!existsSync(lockPath)) {
        mkdirSync(dirname(lockPath), { recursive: true });
        writeFileSync(lockPath, toCanonicalJson({ domain, artifacts: [] }));
      }
      const plan = {
        domain,
        requests: sources
          .filter((source) => source.domain === domain)
          .map(request),
      };
      const requestFailures: string[] = [];
      for (const source of selected.filter(
        (entry) => entry.domain === domain,
      )) {
        try {
          await acquirePlan(domain, plan, lockPath, source.id);
        } catch (error) {
          requestFailures.push(`${source.id}: ${String(error)}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (requestFailures.length) throw new Error(requestFailures.join("\n"));
    }),
  );
  const failures = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [`${domains[index]}: ${String(result.reason)}`]
      : [],
  );
  if (failures.length) throw new Error(failures.join("\n"));
}

export function verifyLocks(): void {
  for (const domain of new Set(sources.map((source) => source.domain))) {
    const path = `data/source/${domain}/money-artifact-lock.json`;
    if (!existsSync(path)) continue;
    const lock = JSON.parse(readFileSync(path, "utf8"));
    assertValidArtifactLock(lock);
    for (const artifact of lock.artifacts) {
      const bytes = readFileSync(artifact.localPath);
      if (
        bytes.length !== artifact.bytes.length ||
        sha256Hex(bytes) !== artifact.bytes.sha256
      )
        throw new Error(`Changed input ${artifact.artifactId}`);
    }
    console.log(`${domain}: verified ${lock.artifacts.length} artifacts`);
  }
}

/** Publisher null markers remain null, including the marker needed to explain why. */
export function figure(raw: string | undefined): {
  value: number | null;
  raw: string;
} {
  const text = raw?.trim() ?? "";
  if (
    [
      "",
      ".",
      "NA",
      "N/A",
      "n.a.",
      "N",
      "D",
      "S",
      "A",
      "X",
      "*",
      "-",
      "--",
      "W",
      "(D)",
      "(S)",
    ].includes(text)
  )
    return { value: null, raw: text };
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text))
    throw new Error(`Unrecognized numeric cell ${JSON.stringify(text)}`);
  const value = Number(text.replaceAll(",", ""));
  if (!Number.isFinite(value)) throw new Error("Nonfinite source number");
  return { value, raw: text };
}

function locked(id: string) {
  const source = sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`Unknown source ${id}`);
  const lock = JSON.parse(
    readFileSync(
      `data/source/${source.domain}/money-artifact-lock.json`,
      "utf8",
    ),
  );
  assertValidArtifactLock(lock);
  const artifact = lock.artifacts.find(
    (entry: { artifactId: string }) => entry.artifactId === id,
  );
  if (!artifact || !rightsPermitProduction(artifact.rights))
    throw new Error(`Missing or rights-unresolved artifact ${id}`);
  const bytes = readFileSync(artifact.localPath);
  if (
    sha256Hex(bytes) !== artifact.bytes.sha256 ||
    bytes.length !== artifact.bytes.length
  )
    throw new Error(`Changed input ${id}`);
  return { source, artifact, bytes };
}

type Corpus = {
  rows: readonly unknown[];
  coverage: Record<string, unknown>;
  notes: readonly string[];
};
const cpiInputs = [
  "cpi-summaries",
  "cpi-food",
  "cpi-housing",
  "cpi-apparel",
  "cpi-transportation",
  "cpi-medical",
  "cpi-recreation",
  "cpi-education",
  "cpi-other",
];
function compileCpi(): Corpus {
  const series = parseBlsTimeSeries(locked("cpi-series").bytes);
  if (series.defects.length) throw new Error("Malformed BLS series input");
  const byId = new Map(
    series.rows.map((entry) => [entry.values.series_id, entry.values]),
  );
  const rows = [];
  const seen = new Map<string, string>();
  for (const artifactId of cpiInputs) {
    const observations = parseBlsTimeSeries(locked(artifactId).bytes);
    if (observations.defects.length)
      throw new Error(`Malformed BLS observations ${artifactId}`);
    for (const { values: row, line } of observations.rows) {
      // Preserve the publisher summary geography coverage; add unadjusted national
      // component series for household prices without duplicating overlap.
      if (
        artifactId !== "cpi-summaries" &&
        !row.series_id.startsWith("CUUR0000")
      )
        continue;
      const key = `${row.series_id}:${row.year}:${row.period}`;
      const prior = seen.get(key);
      if (prior !== undefined) {
        if (prior !== row.value)
          throw new Error(`Conflicting CPI releases at ${key}`);
        continue;
      }
      seen.set(key, row.value);
      const description = byId.get(row.series_id);
      if (!description) throw new Error(`No CPI metadata for ${row.series_id}`);
      if (
        !/^\d{4}$/.test(row.year) ||
        !/^(M(0[1-9]|1[0-3])|S0[1-3])$/.test(row.period)
      )
        throw new Error("Invalid CPI period");
      rows.push({
        seriesId: row.series_id,
        year: Number(row.year),
        period: row.period,
        ...figure(row.value),
        units: `index; ${description.base_period}`,
        title: description.series_title,
        areaCode: description.area_code,
        seasonal: description.seasonal,
        footnotes: row.footnote_codes,
        evidence: { artifactId, line, metadataArtifactId: "cpi-series" },
      });
    }
  }
  return {
    rows,
    coverage: {
      series: new Set(rows.map((row) => row.seriesId)).size,
      areaCodes: [...new Set(rows.map((row) => row.areaCode))].sort(),
      stateSpecific: false,
      territories: "No separate territory calibration supplied",
    },
    notes: [
      "CPI is an index, not a dollar price or a state price-level comparison.",
      "M13 and S03 are annual averages; S01/S02 are half-years. Do not treat these as monthly observations.",
      "Summary series are supplemented with national unadjusted food, housing, apparel, transportation, medical, recreation, education and other-goods components. Publisher originals contain additional series that are not duplicated here.",
    ],
  };
}

function compileElectricity(): Corpus {
  const sheet = readXlsxSheet(
    locked("electricity-prices-2024").bytes,
    "Table 4",
  ).rows;
  if (
    sheet[0]?.[0] !==
    "2024 Total Electric Industry- Average Retail Price (cents/kWh)"
  )
    throw new Error("Changed EIA vintage/schema");
  if (
    sheet[2]?.join("|") !==
    "State|Residential|Commercial|Industrial|Transportation|Total"
  )
    throw new Error("Changed EIA columns");
  const rows = sheet.slice(3).flatMap((row, index) => {
    if (
      row.length < 6 ||
      !row[0] ||
      row[0].startsWith("Note:") ||
      row[0].startsWith("Source:")
    )
      return [];
    return sheet[2].slice(1).map((sector, column) => ({
      geography: row[0],
      sector,
      year: 2024,
      units: "cents per kilowatthour",
      ...figure(row[column + 1]),
      evidence: {
        artifactId: "electricity-prices-2024",
        sheet: "Table 4",
        row: index + 4,
        column: column + 2,
      },
    }));
  });
  return {
    rows,
    coverage: {
      geographies: [...new Set(rows.map((row) => row.geography))],
      statesAndDc: Object.entries(STATES)
        .filter(([code]) => !TERRITORY_USPS.has(code))
        .map(([code, state]) => ({
          code,
          name: state.name,
          observed: rows.some((row) => row.geography === state.name),
        })),
      territories:
        "AS, GU, MP, PR and VI not separately reported in this table",
    },
    notes: [
      "Source geography rows include census divisions and the U.S. total; these must not be summed with state rows.",
      "A period is the publisher's missing value, not zero.",
    ],
  };
}

function compileEiaPrices(): Corpus {
  const electricity = compileElectricity();
  const parsed = parseDelimited(locked("gasoline-seds-annual-prices").bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: true,
    expectedFieldCount: 58,
  });
  const years = Array.from({ length: 55 }, (_, index) => String(1970 + index));
  if (
    parsed.defects.length ||
    parsed.header?.join(",") !==
      ["Data_Status", "State", "MSN", ...years].join(",")
  )
    throw new Error("Changed EIA SEDS price schema");
  const published = parsed.rows.filter(({ fields }) => fields[2] === "MGTCD");
  const stateCodes = new Set(
    Object.keys(STATES).filter((code) => !TERRITORY_USPS.has(code)),
  );
  if (
    published.length !== 52 ||
    new Set(published.map(({ fields }) => fields[1])).size !== 52 ||
    published.some(
      ({ fields }) =>
        fields[0] !== "2024F" ||
        (fields[1] !== "US" && !stateCodes.has(fields[1])),
    )
  )
    throw new Error("Changed EIA SEDS motor gasoline coverage or vintage");
  const gasoline = published.flatMap(({ fields, line }) =>
    years.map((year, index) => ({
      kind: "annual-motor-gasoline-price",
      geographyCode: fields[1],
      year: Number(year),
      units: "USD per million Btu",
      dataStatus: fields[0],
      ...figure(fields[index + 3]),
      evidence: {
        artifactId: "gasoline-seds-annual-prices",
        msn: "MGTCD",
        line,
        column: index + 4,
      },
    })),
  );
  const weeklyHtml = locked("gasoline-us-weekly-history").bytes.toString(
    "utf8",
  );
  if (
    !weeklyHtml.includes(
      "Weekly U.S. Regular All Formulations Retail Gasoline Prices  (Dollars per Gallon)",
    ) ||
    (weeklyHtml.match(/<tbody>/g) ?? []).length !== 1
  )
    throw new Error("Changed EIA weekly gasoline page");
  const body = weeklyHtml.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  if (!body) throw new Error("Missing EIA weekly gasoline table");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const weekly = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(
    ([, row], rowIndex) => {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
        ([, cell]) =>
          cell
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;|&#160;/g, " ")
            .trim(),
      );
      if (cells.length === 1 && row.includes("colspan='13'")) return [];
      if (cells.length !== 11) throw new Error("Changed EIA weekly row width");
      const period = cells[0]?.match(/^(\d{4})-([A-Z][a-z]{2})$/);
      if (!period || !months.includes(period[2]))
        throw new Error("Changed EIA weekly month label");
      return [1, 3, 5, 7, 9].flatMap((dateColumn) => {
        const end = cells[dateColumn];
        if (!end) return [];
        const date = end.match(/^(\d{2})\/(\d{2})$/);
        if (!date || Number(date[1]) !== months.indexOf(period[2]) + 1)
          throw new Error("Changed EIA weekly date");
        return [
          {
            kind: "weekly-us-regular-gasoline-price",
            geographyCode: "US",
            weekEndDate: `${period[1]}-${date[1]}-${date[2]}`,
            units: "USD per gallon, including taxes",
            ...figure(cells[dateColumn + 1]),
            evidence: {
              artifactId: "gasoline-us-weekly-history",
              monthRow: rowIndex + 1,
              weekColumn: Math.floor((dateColumn + 1) / 2),
            },
          },
        ];
      });
    },
  );
  if (
    weekly.length !== 1884 ||
    weekly[0]?.weekEndDate !== "1990-08-20" ||
    weekly.at(-1)?.weekEndDate !== "2026-09-21"
  )
    throw new Error("Changed EIA weekly gasoline history coverage");
  return {
    rows: [...electricity.rows, ...gasoline, ...weekly],
    coverage: {
      ...electricity.coverage,
      gasolineAnnualGeographies: [
        ...published.map(({ fields }) => fields[1]),
      ].sort(),
      gasolineAnnualYears: [1970, 2024],
      gasolineDataStatus: "2024F",
      gasolineWeeklyNationalWeeks: weekly.length,
      gasolineWeeklyMissingWeeks: weekly.filter((row) => row.value === null)
        .length,
    },
    notes: [
      ...electricity.notes,
      "SEDS MGTCD is an annual motor gasoline average across all sectors in dollars per million Btu, not a weekly pump price or dollars per gallon.",
      "EIA says these state annual estimates include federal and state gasoline taxes, excluding local taxes. The U.S. row is an aggregate, not an additional state.",
      "The separate weekly U.S. regular gasoline history is in dollars per gallon including taxes; six published no-data weeks remain null. It is not a state series.",
    ],
  };
}
function compileScf(): Corpus {
  const bytes = locked("scf-public-tables").bytes;
  const sheetName = "Table 6 22 %s & medians";
  const sheet = readXlsxSheet(bytes, sheetName).rows;
  if (!sheet[77]?.[1]?.includes("thousands of 2022 dollars"))
    throw new Error("Changed SCF median units");
  // Published medians by income and age are separate margins, not joint distributions.
  const ranges = [
    { group: "all-families", first: 80, last: 80 },
    { group: "income-percentile", first: 84, last: 89 },
    { group: "reference-person-age", first: 93, last: 98 },
  ];
  const rows = ranges.flatMap(({ group, first, last }) =>
    Array.from({ length: last - first + 1 }, (_, offset) => {
      const index = first + offset - 1;
      const row = sheet[index];
      if (!row?.[0]) throw new Error("Missing SCF group label");
      return {
        group,
        category: row[0],
        measure:
          "median transaction-account holdings among families holding the asset",
        year: 2022,
        geography: "United States",
        units: "thousands of 2022 U.S. dollars",
        ...figure(row[1]),
        evidence: {
          artifactId: "scf-public-tables",
          sheet: sheetName,
          row: index + 1,
          column: 2,
        },
      };
    }),
  );
  return {
    rows,
    coverage: {
      geography: "United States",
      stateSpecific: false,
      territories: "No separate territory calibration supplied",
      groups: ranges.map((row) => row.group),
    },
    notes: [
      "Transaction accounts include more than savings accounts. These are household assets, not disposable income or wealth.",
      "Conditional medians do not imply every family owns the asset and are not an age-by-income joint distribution.",
      "The nominal workbook's 2022 table explicitly uses thousands of 2022 dollars; older-year figures are not used here.",
      "The separately acquired public microdata contains five implicates per household; it is not compiled here.",
    ],
  };
}
function compileTrade(): Corpus {
  const sheet = readXlsxSheet(
    locked("manufacturing-trade-2022-xlsx").bytes,
    "Table",
  ).rows;
  if (
    !sheet[1]?.[0].startsWith("In thousands of dollars.") ||
    sheet[3]?.[10] !== "Consumption Import Value of Goods"
  )
    throw new Error("Changed trade units/schema");
  const columns = [
    { index: 3, measure: "shipments", units: "thousands of U.S. dollars" },
    { index: 5, measure: "relative-standard-error", units: "percent" },
    { index: 7, measure: "total-exports", units: "thousands of U.S. dollars" },
    {
      index: 8,
      measure: "domestic-exports",
      units: "thousands of U.S. dollars",
    },
    {
      index: 9,
      measure: "general-imports",
      units: "thousands of U.S. dollars",
    },
    {
      index: 10,
      measure: "consumption-imports",
      units: "thousands of U.S. dollars",
    },
  ];
  const rows = sheet.slice(4).flatMap((row, index) => {
    if (!/^\d{10}$/.test(row[0] ?? "")) return [];
    if (!/^(2021|2022)$/.test(row[2])) throw new Error("Changed trade year");
    return columns.map(({ index: column, measure, units }) => ({
      productCode: row[0],
      product: row[1],
      year: Number(row[2]),
      measure,
      units,
      ...(column === 5 && ["A", "s"].includes(row[column])
        ? {
            value: null,
            raw: row[column],
            interval:
              row[column] === "A"
                ? "100 percent or more"
                : "more than 40 and less than 100 percent",
          }
        : figure(row[column])),
      evidence: {
        artifactId: "manufacturing-trade-2022-xlsx",
        sheet: "Table",
        row: index + 5,
        column: column + 1,
      },
    }));
  });
  return {
    rows,
    coverage: {
      geography: "United States",
      years: [2021, 2022],
      stateSpecific: false,
      territories: "No separate territory calibration supplied",
    },
    notes: [
      "Publisher markers remain null: N unavailable/unlinked, D disclosure suppression, S publication standard not met, A relative standard error at least 100 percent, X not applicable. Lowercase s describes an error interval, not uppercase S.",
      "Imports and shipments use different valuation/concordance conventions. No unsupported domestic-consumption share is generated.",
      "The raw workbook includes the Census Bureau's comparability and confidentiality notes.",
    ],
  };
}

function compileFinance(): Corpus {
  const bytes = locked("finance-units-2024").bytes;
  const member = "2024_Individual_Unit_Files/2024FinEstDAT_07152026modp.txt";
  const identityMember = "2024_Individual_Unit_Files/Fin_PID_2024.txt";
  const identityBytes = readZipMember(bytes, identityMember);
  const identityLines = identityBytes
    .toString("ascii")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  if (
    identityBytes.some((byte) => byte > 127) ||
    identityLines.some((line) => line.length !== 146)
  )
    throw new Error("Changed full finance identity layout");
  const datedLines = identityLines.filter(
    (line) => line.slice(140, 144).trim() !== "",
  );
  const dated = parseFinanceIdentities(
    Buffer.from(datedLines.join("\n"), "ascii"),
  );
  const identities = new Map<
    string,
    { name: string; endingMonthDay: string | null; line: number }
  >();
  for (const [index, line] of identityLines.entries()) {
    const id = line.slice(0, 12);
    if (
      !/^\d{12}$/.test(id) ||
      !/^[0-5]$/.test(id[2]) ||
      line.slice(144, 146) !== "24" ||
      identities.has(id)
    )
      throw new Error("Invalid or repeated finance identity");
    const known = dated.get(id);
    identities.set(id, {
      name: known?.name ?? line.slice(12, 76).trim(),
      endingMonthDay: known?.endingMonthDay ?? null,
      line: index + 1,
    });
  }
  const parsed = parseFinancePublisher(readZipMember(bytes, member));
  const rows = parsed.map((row) => {
    const identity = identities.get(row.publisherId);
    if (!identity)
      throw new Error(`Missing finance identity ${row.publisherId}`);
    return {
      publisherId: row.publisherId,
      publisherStateCode: row.publisherId.slice(0, 2),
      governmentType: row.publisherId[2],
      governmentName: identity.name,
      itemCode: row.itemCode,
      year: row.surveyYear,
      fiscalYearEndingMonthDay: identity.endingMonthDay,
      units: "thousands of U.S. dollars",
      ...figure(row.rawAmount),
      estimationFlag: row.flag,
      evidence: {
        artifactId: "finance-units-2024",
        member,
        line: row.line,
        identityMember,
        identityLine: identity.line,
      },
    };
  });
  return {
    rows,
    coverage: {
      governmentCount: new Set(rows.map((row) => row.publisherId)).size,
      identitiesWithMissingFiscalMonthDay: [...identities.values()].filter(
        (row) => row.endingMonthDay === null,
      ).length,
      publisherStateCodes: [
        ...new Set(rows.map((row) => row.publisherStateCode)),
      ].sort(),
      territories: "AS, GU, MP, PR and VI are not in this survey file",
    },
    notes: [
      "Reuses the existing government-finances amount parser and dated-identity parser. The full identity file also has blank fiscal month/day entries; this source-only corpus keeps those dates null and retains original line numbers.",
      "Publisher state codes are preserved alongside original government IDs; the corpus does not assign these governments to fictional-world entities.",
      "This is an annual survey sample, not every municipality. No missing government is assigned a zero balance.",
      "Totals, subcomponents, transfers, revenue and expenditure must not be summed indiscriminately. Raw item codes and imputation flags are preserved.",
      "The Census Bureau warns that individual units have not been reviewed as time series; the archive includes its original disclaimer and technical documentation.",
    ],
  };
}

function compileMortgage(): Corpus {
  const parsed = parseDelimited(locked("pmms-history").bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: true,
    expectedFieldCount: 9,
  });
  if (
    parsed.defects.length ||
    parsed.header?.join(",") !==
      "date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread"
  )
    throw new Error("Changed PMMS schema");
  const rows = parsed.rows.flatMap(({ fields, line }) => {
    const date = fields[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!date) throw new Error("Invalid PMMS date");
    const period = `${date[3]}-${date[1].padStart(2, "0")}-${date[2].padStart(2, "0")}`;
    return [1, 3].map((column) => ({
      date: period,
      year: Number(date[3]),
      mortgageTermYears: column === 1 ? 30 : 15,
      units: "annual interest rate, percent",
      ...figure(fields[column]),
      evidence: { artifactId: "pmms-history", line, column: column + 1 },
    }));
  });
  return {
    rows,
    coverage: {
      geography: "United States",
      stateSpecific: false,
      territories: "No separate territory calibration supplied",
    },
    notes: [
      "Source: Freddie Mac Primary Mortgage Market Survey. Original downloaded CSV is retained without alteration.",
      "These national mortgage rates are not a household's offered rate, loan balance, or mortgage payment.",
      "Missing historic fifteen-year quotes remain null. PMMS changed methodology in November 2022; preserve that break when using the series.",
    ],
  };
}

/** These IRS tables contain no nested tables; reject a publisher layout change. */
function irsTables(artifactId: string) {
  const html = locked(artifactId).bytes.toString("utf8");
  return [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(
    (match) => {
      if ((match[0].match(/<table\b/gi) ?? []).length !== 1)
        throw new Error("Nested IRS table requires explicit review");
      return {
        raw: match[0],
        sourceLine: html.slice(0, match.index).split("\n").length,
        cells: [...match[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
          (row) =>
            [...row[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
              (cell) =>
                normalizeRetrievedText(Buffer.from(cell[1]!), "text/html"),
            ),
        ),
      };
    },
  );
}
function irsNumber(raw: string): number {
  const parsed = figure(raw.replaceAll("$", "").replaceAll("%", ""));
  if (parsed.value === null)
    throw new Error(`Missing IRS numeric cell: ${raw}`);
  return parsed.value;
}
function compileIrs(): Corpus {
  const rows: unknown[] = [];
  const annual = irsTables("irs-annual-brackets-2026").filter((t) =>
    /summary="TABLE [1-4] - Section 1\(j\)/.test(t.raw),
  );
  if (annual.length !== 4)
    throw new Error("Expected four individual annual tax schedules");
  for (const table of annual) {
    const title = normalizeRetrievedText(
      Buffer.from(table.raw.match(/summary="([^"]+)"/)![1]!),
    );
    let count = 0;
    for (const [index, cells] of table.cells.entries()) {
      if (!cells[0]?.startsWith("Not over") && !cells[0]?.startsWith("Over"))
        continue;
      if (cells.length !== 2)
        throw new Error("Changed annual IRS bracket layout");
      const limits = [...cells[0].matchAll(/\$([\d,.]+)/g)].map((m) =>
        irsNumber(m[1]!),
      );
      const first = cells[0].startsWith("Not over");
      const rate = cells[1]!.match(/(\d+)%/);
      const base = cells[1]!.match(/^\$([\d,.]+) plus /);
      if (!rate || (!first && !base))
        throw new Error("Unknown IRS annual formula");
      rows.push({
        kind: "annual-tax-liability-bracket",
        year: 2026,
        filingStatus: title,
        lowerExclusive: first ? 0 : limits[0],
        upperInclusive: first ? limits[0] : (limits[1] ?? null),
        upperUnbounded: !first && limits.length === 1,
        baseTax: first ? 0 : irsNumber(base![1]!),
        ratePercent: irsNumber(rate[1]!),
        units: "USD taxable annual income and tax; rate in percent",
        raw: cells,
        evidence: {
          artifactId: "irs-annual-brackets-2026",
          tableLine: table.sourceLine,
          tableRow: index + 1,
        },
      });
      count++;
    }
    if (count !== 7)
      throw new Error("Expected seven brackets per individual schedule");
  }
  const payroll = irsTables("irs-15t-2026").filter(
    (t) =>
      t.cells[0]?.[0] ===
      "2026 Percentage Method Tables for Automated Payroll Systems and Withholding on Periodic Payments of Pensions and Annuities",
  );
  if (payroll.length !== 1)
    throw new Error("Expected one automated annual withholding table");
  let status = "";
  let payrollCount = 0;
  for (const [index, cells] of payroll[0]!.cells.entries()) {
    if (
      [
        "Married Filing Jointly",
        "Single or Married Filing Separately",
        "Head of Household",
      ].includes(cells[0]!)
    ) {
      status = cells[0]!;
      continue;
    }
    if (!cells[0]?.startsWith("$")) continue;
    if (!status || cells.length !== 10)
      throw new Error("Changed payroll table layout");
    for (const offset of [0, 5]) {
      rows.push({
        kind: "automated-payroll-withholding-bracket",
        year: 2026,
        filingStatus: status,
        step2Checkbox: offset === 5,
        lowerInclusive: irsNumber(cells[offset]!),
        upperExclusive:
          cells[offset + 1] === "" ? null : irsNumber(cells[offset + 1]!),
        upperUnbounded: cells[offset + 1] === "",
        baseTax: irsNumber(cells[offset + 2]!),
        ratePercent: irsNumber(cells[offset + 3]!),
        excessOver: irsNumber(cells[offset + 4]!),
        units:
          "USD adjusted annual wages and tentative annual withholding; rate in percent",
        raw: cells.slice(offset, offset + 5),
        evidence: {
          artifactId: "irs-15t-2026",
          tableLine: payroll[0]!.sourceLine,
          tableRow: index + 1,
        },
      });
      payrollCount++;
    }
  }
  if (payrollCount !== 48)
    throw new Error(`Expected 48 payroll brackets, got ${payrollCount}`);
  return {
    rows,
    coverage: {
      geography: "United States federal",
      annualIndividualSchedules: 4,
      payrollSchedules: 6,
      territories: "Territory-specific payroll rules are not compiled here",
    },
    notes: [
      "Withholding is not annual tax liability. Apply Publication 15-T Worksheet 1A, Form W-4 adjustments, pay-period conversion and rounding before using these tentative rates.",
      "Annual tax tables apply to taxable income, not gross wages. Deductions, credits, capital gains, alternative minimum tax and estates/trusts are outside this corpus.",
      "An unbounded top bracket has a null upper bound with upperUnbounded=true; this is not an unpublished value. Original table rows and line references are retained.",
    ],
  };
}

export function compile(check: boolean): void {
  const compilers = [
    {
      domain: "irs-payroll-brackets",
      inputs: ["irs-annual-brackets-2026", "irs-15t-2026"],
      run: compileIrs,
    },
    {
      domain: "bls-cpi",
      inputs: ["cpi-series", ...cpiInputs],
      run: compileCpi,
    },
    {
      domain: "eia-energy-prices",
      inputs: [
        "electricity-prices-2024",
        "gasoline-seds-annual-prices",
        "gasoline-us-weekly-history",
      ],
      run: compileEiaPrices,
    },
    {
      domain: "scf-household-finance",
      inputs: ["scf-public-tables"],
      run: compileScf,
    },
    {
      domain: "census-trade",
      inputs: ["manufacturing-trade-2022-xlsx"],
      run: compileTrade,
    },
    {
      domain: "government-finances",
      inputs: ["finance-units-2024"],
      run: compileFinance,
    },
    {
      domain: "freddie-mac-mortgage-rates",
      inputs: ["pmms-history"],
      run: compileMortgage,
    },
  ];
  for (const entry of compilers) {
    const corpus = entry.run();
    if (!corpus.rows.length) throw new Error(`Empty corpus ${entry.domain}`);
    const canonical = toCanonicalJson({ schemaVersion: 1, ...corpus }, 0);
    const prefix = `data/source/${entry.domain}`;
    const corpusPath = `${prefix}/money-corpus.json.gz`;
    const manifest = {
      compiler: "scripts/source/regional-money/missing-money-sources.ts",
      corpusPath,
      canonicalSha256: sha256Hex(Buffer.from(canonical)),
      recordCount: corpus.rows.length,
      inputs: entry.inputs.map((id) => {
        const { artifact } = locked(id);
        return {
          artifactId: id,
          localPath: artifact.localPath,
          sha256: artifact.bytes.sha256,
        };
      }),
      coverage: corpus.coverage,
      runtimeWired: false,
    };
    for (const [path, bytes] of [
      [corpusPath, gzipSync(Buffer.from(canonical), { level: 9 })],
      [
        `${prefix}/money-corpus-manifest.json`,
        Buffer.from(toCanonicalJson(manifest)),
      ],
    ] as const) {
      if (check) {
        if (!readFileSync(path).equals(bytes)) throw new Error(`Stale ${path}`);
      } else writeFileSync(path, bytes);
    }
    console.log(
      `${check ? "checked" : "compiled"} ${entry.domain}: ${corpus.rows.length} observations`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [action, ...ids] = process.argv.slice(2);
  if (action === "--acquire" && ids.length) await acquire(ids);
  else if (action === "--check") {
    verifyLocks();
    compile(true);
  } else if (action === "--compile") compile(false);
  else
    throw new Error("Use --acquire <artifact-id>... or --compile or --check");
}
