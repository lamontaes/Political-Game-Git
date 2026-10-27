/**
 * Checks the opening customers' public-buyer rows against their research
 * files and prints what each file says: the cleaning share and buyer coverage
 * in src/core2/data/parameters.json must equal what the Census, BOMA and IFMA
 * figures give, every per-place table covers all 56 places, the 2017 county
 * identities all reappear in the 2021 listing, and the BEA buyer shares sum
 * to one inside their 2019-2023 range. Exits 1 on any mismatch.
 * Run: node --import tsx scripts/research/check-opening-customer-priors.ts
 */
import { readFileSync } from "node:fs";
import { realLocalities } from "../../src/core2/places";
import { governmentUnitsForPlace } from "../../src/core2/reference/government-units";

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;
interface Spread {
  low: number;
  high: number;
}
interface Row {
  value: number;
  tag: string;
  spread?: Spread;
}
const parameters = read<Record<string, Row>>("src/core2/data/parameters.json");
const buildings = read<{
  national: {
    currentOperationsShare: number;
    countyShareOfCurrentOperations: number;
    specialAndSchoolDistrictCurrentOperationsThousands: number;
  };
  spreadAcrossStates: {
    currentOperationsShare: { p10: number; p90: number };
    countyShareOfCurrentOperations: { p10: number; p90: number };
  };
  places: Record<string, { tag: string }>;
}>(
  "data/research/core/census-2022-local-public-buildings-by-government-type.json",
);
const janitorial = read<{ rows: { key: string; janitorialShare: number }[] }>(
  "data/research/core/building-operating-cost-janitorial-share.json",
);
const continuity = read<{
  national: { counties2017: number; matched2021: number; counties2022: number };
  places: Record<string, { tag: string; continuityShare: number }>;
}>("data/research/core/census-gus-2021-county-identity-continuity.json");
const buyers = read<{
  classifications: Record<
    string,
    {
      shares: Record<string, number>;
      spread: Record<string, Spread>;
    }
  >;
}>("data/research/core/bea-2023-use-summary-buyer-shares.json");

const failures: string[] = [];
const expect = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
};
const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;
const PLACES = [
  ...["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI"],
  ...["ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN"],
  ...["MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH"],
  ...["OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA"],
  ...["WV", "WI", "WY", "PR", "GU", "VI", "AS", "MP"],
];

// The cleaning share: BOMA's cleaning share times the current-operations share.
const share = (key: string) =>
  janitorial.rows.find((row) => row.key === key)!.janitorialShare;
const nat = buildings.national;
const ops = buildings.spreadAcrossStates.currentOperationsShare;
const cleaning = parameters.openingCustomerPublicCleaningBudgetShare!;
expect(
  cleaning.value === round(share("boma-2012") * nat.currentOperationsShare, 3),
  `cleaning share ${cleaning.value} is not BOMA x Census current operations`,
);
expect(
  cleaning.spread?.low === round(share("boma-2012") * ops.p10, 3) &&
    cleaning.spread?.high === round(share("ifma-2000") * ops.p90, 3),
  "cleaning share spread does not match BOMA/IFMA x the state percentiles",
);

// The buyer coverage: general-purpose governments make all of the spending;
// a county-only buyer represents the county share.
expect(
  nat.specialAndSchoolDistrictCurrentOperationsThousands === 0,
  "special or school districts report public-building spending",
);
let governed = 0;
const localities = realLocalities();
for (const place of localities)
  if (
    place.sourceGeoid &&
    governmentUnitsForPlace(place.sourceGeoid).some(
      (unit) => unit.unitType !== "county",
    )
  )
    governed += 1;
const governedShare = governed / localities.length;
const coverage = parameters.openingCustomerLocalAuthorityBudgetCoverage!;
expect(
  coverage.value ===
    round(
      governedShare + (1 - governedShare) * nat.countyShareOfCurrentOperations,
      2,
    ),
  `coverage ${coverage.value} is not the place-weighted buyer share (${governed} of ${localities.length} places governed)`,
);
expect(
  coverage.spread?.low ===
    buildings.spreadAcrossStates.countyShareOfCurrentOperations.p10 &&
    coverage.spread?.high === 1,
  "coverage spread does not run from the 10th-percentile county share to one",
);

// Every per-place table covers all 56 places.
for (const [name, table] of [
  ["public buildings", buildings.places],
  ["county continuity", continuity.places],
] as const)
  for (const place of PLACES)
    expect(table[place] !== undefined, `${name}: no row for ${place}`);
expect(
  continuity.national.matched2021 === continuity.national.counties2017 &&
    continuity.national.counties2022 === continuity.national.counties2017,
  "a 2017 county identity is missing from the 2021 listing or the 2022 count",
);

// The BEA buyer shares sum to one and sit inside their five-year range.
for (const [classification, row] of Object.entries(buyers.classifications)) {
  const total = Object.values(row.shares).reduce((sum, v) => sum + v, 0);
  expect(
    Math.abs(total - 1) <= 0.005,
    `${classification}: buyer shares sum to ${total}`,
  );
  for (const [buyer, value] of Object.entries(row.shares))
    expect(
      row.spread[buyer]!.low <= value && value <= row.spread[buyer]!.high,
      `${classification} ${buyer}: ${value} outside its 2019-2023 range`,
    );
}

console.log(
  `cleaning share ${cleaning.value} [${cleaning.spread?.low}, ${cleaning.spread?.high}]; coverage ${coverage.value} [${coverage.spread?.low}, ${coverage.spread?.high}] (${governed} of ${localities.length} places governed); counties ${continuity.national.matched2021} of ${continuity.national.counties2017} matched in 2021; ${Object.keys(buyers.classifications).length} buyer classes`,
);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
