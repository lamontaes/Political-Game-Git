/**
 * Compacts fetch-disasters.ts's raw OpenFEMA files into the disasters
 * engine's data: each county's declarations (incident and declaration dates,
 * type, number; titles once per disaster) and, per county and disaster, the
 * federal Public Assistance obligated to that county's own government and to
 * each town government in it, by the town's normalized name.
 * Usage: npx tsx src/core2/tooling/build-disasters.ts <raw-dir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import { normalizedGovernmentName } from "../modules/disasters";

const raw = process.argv[2];
if (!raw) throw new Error("Usage: build-disasters.ts <raw-dir>");
const read = <T>(file: string) =>
  JSON.parse(readFileSync(join(raw, file), "utf8")) as T;

interface Declaration {
  disasterNumber: number;
  declarationDate: string;
  incidentType: string;
  declarationType: string;
  fipsStateCode: string;
  fipsCountyCode: string;
  incidentBeginDate: string;
  declarationTitle: string;
}
interface Assistance {
  disasterNumber: number;
  state: string;
  county: string;
  applicantName: string;
  federalObligatedAmount: number;
}

const declarations = read<Declaration[]>("declarations.json");
const types = [...new Set(declarations.map((r) => r.incidentType))].sort();
const declarationTypes = [
  ...new Set(declarations.map((r) => r.declarationType)),
].sort();
const titles: Record<number, string> = {};
const byCounty: Record<string, [string, string, number, number, number][]> = {};
for (const r of declarations) {
  const key = `${r.fipsStateCode}${r.fipsCountyCode}`;
  (byCounty[key] ??= []).push([
    r.incidentBeginDate.slice(0, 10),
    r.declarationDate.slice(0, 10),
    types.indexOf(r.incidentType),
    declarationTypes.indexOf(r.declarationType),
    r.disasterNumber,
  ]);
  titles[r.disasterNumber] = r.declarationTitle;
}
for (const rows of Object.values(byCounty))
  rows.sort((a, b) => a[0].localeCompare(b[0]) || a[4] - b[4]);

const usps = Object.fromEntries(
  Object.entries(lookup.states).map(([code, row]) => [row.name, code]),
);
const counties = new Map<string, string>();
for (const [geoid, name, state] of lookup.counties.rows as [
  string,
  string,
  string,
][])
  counties.set(`${state}|${name.toLowerCase()}`, geoid);
const assistance: Record<
  string,
  { county: number; towns: Record<string, number> }
> = {};
let unmatched = 0;
for (const r of read<Assistance[]>("assistance.json")) {
  const state = usps[r.state];
  const geoid = state
    ? counties.get(`${state}|${r.county.toLowerCase()}`)
    : undefined;
  if (!geoid || !(r.federalObligatedAmount > 0)) {
    unmatched++;
    continue;
  }
  const row = (assistance[`${geoid}|${r.disasterNumber}`] ??= {
    county: 0,
    towns: {},
  });
  const applicant = r.applicantName;
  const cents = Math.round(r.federalObligatedAmount * 100);
  const countyBase = normalizedGovernmentName(r.county);
  const name = normalizedGovernmentName(applicant);
  if (/county|parish|fiscal court/i.test(applicant) && name === countyBase)
    row.county += cents;
  else if (
    /\b(city|town|village|borough|township|municipality)\b/i.test(applicant) &&
    name
  )
    row.towns[name] = (row.towns[name] ?? 0) + cents;
}
// Housing assistance approved for households, by city.
interface Household {
  disasterNumber: number;
  state: string;
  county: string;
  city: string;
  entity: string;
  totalApprovedIhpAmount: number;
  totalDamage?: number;
  totalInspected?: number;
  noFemaInspectedDamage?: number;
  totalWithModerateDamage?: number;
  totalWithMajorDamage?: number;
  totalWithSubstantialDamage?: number;
}
const countiesByBase = new Map<string, string>();
for (const [geoid, name, state] of lookup.counties.rows as [
  string,
  string,
  string,
][])
  countiesByBase.set(`${state}|${normalizedGovernmentName(name)}`, geoid);
/** Per town: [aid approved, owners' FEMA-inspected damage (cents), homes damaged]. */
const households: Record<string, Record<string, [number, number, number]>> = {};
let householdsUnmatched = 0;
for (const r of read<Household[]>("households.json")) {
  const geoid = countiesByBase.get(
    `${r.state}|${normalizedGovernmentName(r.county)}`,
  );
  const city = normalizedGovernmentName(r.city ?? "");
  const damaged =
    r.entity === "HousingAssistanceOwners"
      ? Math.max(0, (r.totalInspected ?? 0) - (r.noFemaInspectedDamage ?? 0))
      : (r.totalWithModerateDamage ?? 0) +
        (r.totalWithMajorDamage ?? 0) +
        (r.totalWithSubstantialDamage ?? 0);
  const damage = Math.round((r.totalDamage ?? 0) * 100);
  if (
    !geoid ||
    !city ||
    !(r.totalApprovedIhpAmount > 0 || damage > 0 || damaged > 0)
  ) {
    householdsUnmatched++;
    continue;
  }
  const row = (households[`${geoid}|${r.disasterNumber}`] ??= {});
  const town = (row[city] ??= [0, 0, 0]);
  town[0] += Math.round(r.totalApprovedIhpAmount * 100);
  town[1] += damage;
  town[2] += damaged;
}
const source =
  "FEMA OpenFEMA DisasterDeclarationsSummaries v2 (declarations since 2000) and PublicAssistanceFundedProjectsSummaries v1 (federal obligated amounts, disasters declared since 2020), U.S. government works (17 U.S.C. 105); fetched by src/core2/tooling/fetch-disasters.ts.";
writeFileSync(
  "src/core2/data/disasters/declarations.json",
  JSON.stringify({ source, types, declarationTypes, titles, byCounty }) + "\n",
);
writeFileSync(
  "src/core2/data/disasters/assistance.json",
  JSON.stringify({ source, unit: "cents", byCountyDisaster: assistance }) +
    "\n",
);
writeFileSync(
  "src/core2/data/disasters/households.json",
  JSON.stringify({
    source: `${source} Household amounts: HousingAssistanceOwners and HousingAssistanceRenters v2, by city: [total approved Individuals and Households Program assistance, owners' FEMA-inspected real property damage, homes inspected with damage (owners) or with moderate, major or substantial damage (renters)].`,
    unit: "cents",
    byCountyDisaster: households,
  }) + "\n",
);
console.log(
  Object.keys(byCounty).length,
  "counties;",
  Object.keys(assistance).length,
  "county-disasters with assistance;",
  unmatched,
  "assistance rows unmatched;",
  Object.keys(households).length,
  "county-disasters with household assistance;",
  householdsUnmatched,
  "household rows unmatched",
);
