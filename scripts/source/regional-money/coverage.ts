/**
 * Cross-source coverage of the Part C money corpora for the 50 states and
 * D.C. Reads only the locked regional corpora; it assigns no game values.
 *
 *   node --import tsx scripts/source/regional-money/coverage.ts          # print
 *   node --import tsx scripts/source/regional-money/coverage.ts --check  # fail on a gap
 *
 * A gap is reported, never filled: a missing or suppressed cell stays missing.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const STATES: ReadonlyArray<readonly [fips: string, abbr: string]> = [
  ["01", "AL"],
  ["02", "AK"],
  ["04", "AZ"],
  ["05", "AR"],
  ["06", "CA"],
  ["08", "CO"],
  ["09", "CT"],
  ["10", "DE"],
  ["11", "DC"],
  ["12", "FL"],
  ["13", "GA"],
  ["15", "HI"],
  ["16", "ID"],
  ["17", "IL"],
  ["18", "IN"],
  ["19", "IA"],
  ["20", "KS"],
  ["21", "KY"],
  ["22", "LA"],
  ["23", "ME"],
  ["24", "MD"],
  ["25", "MA"],
  ["26", "MI"],
  ["27", "MN"],
  ["28", "MS"],
  ["29", "MO"],
  ["30", "MT"],
  ["31", "NE"],
  ["32", "NV"],
  ["33", "NH"],
  ["34", "NJ"],
  ["35", "NM"],
  ["36", "NY"],
  ["37", "NC"],
  ["38", "ND"],
  ["39", "OH"],
  ["40", "OK"],
  ["41", "OR"],
  ["42", "PA"],
  ["44", "RI"],
  ["45", "SC"],
  ["46", "SD"],
  ["47", "TN"],
  ["48", "TX"],
  ["49", "UT"],
  ["50", "VT"],
  ["51", "VA"],
  ["53", "WA"],
  ["54", "WV"],
  ["55", "WI"],
  ["56", "WY"],
];

/** Census Bureau regions, the geography the Consumer Expenditure tables use. */
const CENSUS_REGION: Record<string, string> = {};
for (const [region, list] of Object.entries({
  Northeast: "09 23 25 33 34 36 42 44 50",
  Midwest: "17 18 19 20 26 27 29 31 38 39 46 55",
  South: "01 05 10 11 12 13 21 22 24 28 37 40 45 47 48 51 54",
  West: "02 04 06 08 15 16 30 32 35 41 49 53 56",
}))
  for (const fips of list.split(" ")) CENSUS_REGION[fips] = region;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const corpus = (dir: string): any =>
  JSON.parse(
    gunzipSync(
      readFileSync(`data/source/${dir}/regional-corpus.json.gz`),
    ).toString("utf8"),
  );

type Wage = {
  scope: string;
  areaCode: string;
  areaType: string;
  primaryState: string;
  occupationCode: string;
  occupationGroup: string;
  annualMeanUsd: number | null;
  annualMeanRaw: string;
};
type Delineation = {
  countyFips: string;
  countyName: string;
  stateFips: string;
  cbsaClassification: string | null;
  wageAreaAvailable: boolean;
};
type Business = { countyFips: string; naics: string };
type Public = {
  scope: string;
  stateFips: string | null;
  ownershipCode: string;
};
type Value = { value: number | null };
type Housing = {
  countyFips: string;
  medianOwnerOccupiedHomeValue: { estimate: Value };
  medianGrossRent: { estimate: Value };
  commuteTimeToWork: { bins: Array<{ code: string; estimate: Value }> };
};

const wages: Wage[] = corpus("career-occupations").rows;
const delineations: Delineation[] = corpus("cbsa-delineations").rows;
const businesses: Business[] = corpus("county-business-patterns").rows;
const publicPay: Public[] = corpus("public-employment").rows;
const housing: Housing[] = corpus("acs-county-housing-commute").rows;
const payPeriod = corpus("bls-pay-period");
const spending = corpus("consumer-expenditure");

const businessTotals = new Set(
  businesses.filter((r) => r.naics === "------").map((r) => r.countyFips),
);
const housingByCounty = new Map(housing.map((r) => [r.countyFips, r]));
const regionLabels: string[] = spending.groups
  .find((g: { dimension: string }) => g.dimension === "region-of-residence")
  .cohortSamples.map((c: { label: string }) => c.label);

type Row = {
  fips: string;
  abbr: string;
  stateAllOccupations: boolean;
  statePublishedDetailedWages: number;
  stateSuppressedDetailedWages: number;
  stateTopCodedDetailedWages: number;
  wageAreas: number;
  counties: number;
  countiesWithWageArea: number;
  metroCounties: number;
  countiesWithoutBusinessTotals: string[];
  publicStateGovernment: boolean;
  publicLocalGovernment: boolean;
  housingCounties: number;
  homeValueMissing: string[];
  rentMissing: string[];
  commuteMissing: string[];
  spendingRegion: string;
};

const rows: Row[] = STATES.map(([fips, abbr]) => {
  const stateWages = wages.filter(
    (r) => r.scope === "state" && r.areaCode === fips,
  );
  const detailed = stateWages.filter((r) => r.occupationGroup === "detailed");
  const counties = delineations.filter((r) => r.stateFips === fips);
  const countyCodes = counties.map((r) => r.countyFips);
  const housed = countyCodes
    .map((c) => housingByCounty.get(c))
    .filter((r): r is Housing => r !== undefined);
  const commuteTotal = (r: Housing) =>
    r.commuteTimeToWork.bins.find((b) => b.code === "B08303_001")?.estimate
      .value ?? null;
  return {
    fips,
    abbr,
    stateAllOccupations: stateWages.some(
      (r) => r.occupationCode === "00-0000" && r.annualMeanUsd !== null,
    ),
    statePublishedDetailedWages: detailed.filter(
      (r) => r.annualMeanUsd !== null,
    ).length,
    // OEWS marks: "*" = estimate not released; "#" = above the top-coding
    // ceiling, so the wage exists but its value is not published.
    stateSuppressedDetailedWages: detailed.filter(
      (r) => r.annualMeanUsd === null && r.annualMeanRaw === "*",
    ).length,
    stateTopCodedDetailedWages: detailed.filter(
      (r) => r.annualMeanUsd === null && r.annualMeanRaw === "#",
    ).length,
    wageAreas: new Set(
      wages
        .filter((r) => r.scope === "area" && r.primaryState === abbr)
        .map((r) => r.areaCode),
    ).size,
    counties: counties.length,
    countiesWithWageArea: counties.filter((r) => r.wageAreaAvailable).length,
    metroCounties: counties.filter(
      (r) => r.cbsaClassification === "Metropolitan Statistical Area",
    ).length,
    countiesWithoutBusinessTotals: countyCodes.filter(
      (c) => !businessTotals.has(c),
    ),
    publicStateGovernment: publicPay.some(
      (r) =>
        r.scope === "state-research" &&
        r.stateFips === fips &&
        r.ownershipCode === "2",
    ),
    publicLocalGovernment: publicPay.some(
      (r) =>
        r.scope === "state-research" &&
        r.stateFips === fips &&
        r.ownershipCode === "3",
    ),
    housingCounties: housed.length,
    homeValueMissing: housed
      .filter((r) => r.medianOwnerOccupiedHomeValue.estimate.value === null)
      .map((r) => r.countyFips),
    rentMissing: housed
      .filter((r) => r.medianGrossRent.estimate.value === null)
      .map((r) => r.countyFips),
    commuteMissing: housed
      .filter((r) => commuteTotal(r) === null)
      .map((r) => r.countyFips),
    spendingRegion: CENSUS_REGION[fips],
  };
});

const problems: string[] = [];
for (const r of rows) {
  if (!r.stateAllOccupations) problems.push(`${r.abbr}: no statewide wage row`);
  if (r.wageAreas === 0)
    problems.push(`${r.abbr}: no metro or nonmetro wage area`);
  if (r.counties === 0) problems.push(`${r.abbr}: no county delineation`);
  if (r.housingCounties !== r.counties)
    problems.push(
      `${r.abbr}: ACS covers ${r.housingCounties} of ${r.counties} counties`,
    );
  // BLS files the D.C. government under state ownership; D.C. has no
  // separate local-government ownership in these tables.
  if (!r.publicStateGovernment || (!r.publicLocalGovernment && r.fips !== "11"))
    problems.push(`${r.abbr}: public pay lacks state or local government rows`);
  if (!regionLabels.includes(r.spendingRegion))
    problems.push(`${r.abbr}: spending region ${r.spendingRegion} absent`);
}

const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0);
const summary = {
  jurisdictions: rows.length,
  counties: sum((r) => r.counties),
  countiesWithWageArea: sum((r) => r.countiesWithWageArea),
  countiesWithoutBusinessTotals: rows.flatMap(
    (r) => r.countiesWithoutBusinessTotals,
  ),
  homeValueMissing: rows.flatMap((r) => r.homeValueMissing),
  rentMissing: rows.flatMap((r) => r.rentMissing),
  commuteMissing: rows.flatMap((r) => r.commuteMissing),
  statePublishedDetailedWages: sum((r) => r.statePublishedDetailedWages),
  stateSuppressedDetailedWages: sum((r) => r.stateSuppressedDetailedWages),
  stateTopCodedDetailedWages: sum((r) => r.stateTopCodedDetailedWages),
  statesWithSuppressedDetailedWages: rows.filter(
    (r) => r.stateSuppressedDetailedWages > 0,
  ).length,
  otherUnpublishedDetailedWages: wages.filter(
    (r) =>
      r.scope === "state" &&
      r.occupationGroup === "detailed" &&
      r.annualMeanUsd === null &&
      !["*", "#"].includes(r.annualMeanRaw) &&
      STATES.some(([fips]) => fips === r.areaCode),
  ).length,
  payPeriodGeography: `${payPeriod.scope} (${payPeriod.referenceMonth}); no state rows`,
  spendingRegions: regionLabels.filter((l) =>
    ["Northeast", "Midwest", "South", "West"].includes(l),
  ),
  problems,
};

if (process.argv.includes("--markdown")) {
  const countyName = new Map(
    delineations.map((r) => [r.countyFips, r.countyName]),
  );
  const names = (codes: string[]) =>
    codes.map((c) => countyName.get(c) ?? c).join(", ") || "none";
  console.log(
    "| State | Job wages published / not released / above the top code | Wage areas | Counties with a wage area | Counties without business totals | Counties without median home value | Counties without median rent | Spending region |",
  );
  console.log("|---|---|---|---|---|---|---|---|");
  for (const r of rows)
    console.log(
      `| ${r.abbr} | ${r.statePublishedDetailedWages} / ${r.stateSuppressedDetailedWages} / ${r.stateTopCodedDetailedWages} | ${r.wageAreas} | ${r.countiesWithWageArea} of ${r.counties} | ${names(r.countiesWithoutBusinessTotals)} | ${names(r.homeValueMissing)} | ${names(r.rentMissing)} | ${r.spendingRegion} |`,
    );
} else console.log(JSON.stringify(summary, null, 2));

if (process.argv.includes("--check") && problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
