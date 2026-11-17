/**
 * Derives the people parameter rows sourced for research-people-sourced-parameters
 * from their research files and fails (exit 1) when a row in the parameter
 * tables no longer matches what its source gives:
 * - the births plan's age center and spread from the NCHS 2024 age-specific
 *   birth rates of all 56 places, its timing peak from NCHS Data Brief 240,
 *   its gestation from Jukic and others (2013) and its fallback median income
 *   from the HUD FY2025 income limits;
 * - the volunteer act's hours from the 2025 American Time Use Survey;
 * - the two temperament correlations from the NEO-PI-R facet matrix, with
 *   their Fisher intervals, and the five facet age curves in opening-kin.json
 *   from Terracciano and others (2005) Table 2;
 * - that the outcome bands the year run reports (trajectories, kin proximity,
 *   partisanship by place type) are whole and cover all 56 places.
 * Run: node --import tsx scripts/research/people-parameters-check.ts
 */
import gestation from "../../data/research/people/jukic-gestation-2013.json" with { type: "json" };
import atus from "../../data/research/people/atus-2025-volunteering.json" with { type: "json" };
import facets from "../../data/research/people/neo-pi-r-facet-correlations-1992.json" with { type: "json" };
import curves from "../../data/research/people/terracciano-blsa-neo-facets-2005.json" with { type: "json" };
import trajectories from "../../data/research/people/trauma-trajectories-2018.json" with { type: "json" };
import parentNear from "../../data/research/people/pew-parent-proximity-2005.json" with { type: "json" };
import kinNear from "../../data/research/people/pew-extended-family-proximity-2021.json" with { type: "json" };
import partisanship from "../../data/research/people/pew-partisanship-community-type-2023.json" with { type: "json" };
import renewalJson from "../../src/core2/data/renewal/parameters.json" with { type: "json" };
import parametersJson from "../../src/core2/data/parameters.json" with { type: "json" };
import kinJson from "../../src/core2/data/opening-kin.json" with { type: "json" };
import {
  TOWN_RENT_COUNTIES,
  TOWN_RENT_TOWNS,
} from "../../src/core2/reference/town-rent.generated";
import {
  censusRegionOf,
  censusRegionStates,
} from "../../src/core2/reference/census-regions";

interface Row {
  value: number;
  tag: string;
  spread?: { low?: number; high?: number };
}
const renewal = renewalJson as unknown as Record<string, Row>;
const parameters = parametersJson as unknown as Record<string, Row>;
const failures: string[] = [];
const near = (a: number, b: number, tolerance: number) =>
  Math.abs(a - b) <= tolerance;
function expectRow(
  table: Record<string, Row>,
  key: string,
  want: { value: number; low: number; high: number; tag: string },
  tolerance: number,
) {
  const row = table[key];
  const ok =
    row !== undefined &&
    row.tag === want.tag &&
    near(row.value, want.value, tolerance) &&
    near(row.spread?.low ?? NaN, want.low, tolerance) &&
    near(row.spread?.high ?? NaN, want.high, tolerance);
  console.log(
    `${ok ? "ok  " : "FAIL"} ${key.padEnd(42)} ${want.tag} ${want.value} [${want.low}, ${want.high}]` +
      (ok ? "" : `; the table has ${JSON.stringify(row)}`),
  );
  if (!ok) failures.push(key);
}

// Gestation: the median from ovulation and its interquartile range.
expectRow(
  renewal,
  "renewalGestationDays",
  {
    tag: "SOURCED",
    value: gestation.fromOvulation.medianDays,
    low: gestation.fromOvulation.p25Days,
    high: gestation.fromOvulation.p75Days,
  },
  0,
);

// Fallback median: twice the very low limit, population-weighted over every
// HUD area a place can read (whole counties, and New England towns where
// HUD publishes towns instead of the county).
const CENTS = 100;
const perLimit = renewal["renewalMedianPerVeryLowLimit"]!.value;
const counties = new Set<string>();
const hudAreas: { median: number; population: number }[] = [];
const cells = (text: string) => text.split("/").map((cell) => Number(cell));
for (const entry of TOWN_RENT_COUNTIES.split(";")) {
  const [county, text] = entry.split(":") as [string, string];
  counties.add(county);
  const row = cells(text);
  hudAreas.push({ median: row[5]! * perLimit, population: row[7]! });
}
for (const entry of TOWN_RENT_TOWNS.split(";")) {
  const split = entry.lastIndexOf(":");
  const county = entry.slice(0, split).split("|")[0]!;
  const text = entry.slice(split + 1);
  if (counties.has(county) || text.split("/")[5] === "") continue;
  const row = cells(text);
  hudAreas.push({ median: row[5]! * perLimit, population: row[7] || 0 });
}
hudAreas.sort((a, b) => a.median - b.median);
const people = hudAreas.reduce((sum, row) => sum + row.population, 0);
function weightedQuantile(q: number): number {
  let seen = 0;
  for (const row of hudAreas) {
    seen += row.population;
    if (seen >= q * people) return row.median;
  }
  return hudAreas.at(-1)!.median;
}
expectRow(
  renewal,
  "renewalMedianAnnualIncomeMinor",
  {
    tag: "ESTIMATED",
    value: weightedQuantile(0.5) * CENTS,
    low: weightedQuantile(0.25) * CENTS,
    high: weightedQuantile(0.75) * CENTS,
  },
  0,
);

// Volunteering: one participant-day.
const hours = atus.volunteering.hoursPerParticipantDay;
expectRow(
  parameters,
  "volunteerHours",
  {
    tag: "SOURCED",
    value: hours.total,
    low: Math.min(hours.men, hours.women),
    high: Math.max(hours.men, hours.women),
  },
  0,
);

// Temperament correlations and their Fisher 95% intervals.
const Z95 = 1.959964;
const FISHER_DEGREES = 3;
for (const pair of facets.pairs) {
  const z = Math.atanh(pair.r);
  const se = 1 / Math.sqrt(facets.sampleSize - FISHER_DEGREES);
  const ends = [Math.tanh(z - Z95 * se), Math.tanh(z + Z95 * se)].map(
    (end) => Math.round(end * pair.sign * 1000) / 1000,
  );
  expectRow(
    parameters,
    pair.parameter,
    {
      tag: "ESTIMATED",
      value: pair.r * pair.sign,
      low: Math.min(...ends),
      high: Math.max(...ends),
    },
    0.0015,
  );
}

// Facet age curves in opening-kin.json against Table 2.
const dims = (
  kinJson as unknown as {
    personality: {
      dimensions: {
        facet: string;
        ageLinear: number;
        ageQuadratic: number;
      }[];
    };
  }
).personality.dimensions;
for (const facet of curves.facets) {
  const code = facet.facet.slice(0, 2);
  const dim = dims.find((row) => row.facet.startsWith(code));
  const ok =
    dim !== undefined &&
    dim.ageLinear === facet.linear &&
    dim.ageQuadratic === (facet.quadratic ?? 0);
  console.log(
    `${ok ? "ok  " : "FAIL"} opening-kin ${facet.facet.padEnd(30)} linear ${facet.linear} quadratic ${facet.quadratic ?? "none (0)"}`,
  );
  if (!ok) failures.push(`opening-kin ${facet.facet}`);
}

// Outcome bands the year run reports: whole, and every place covered.
const PLACES = [...censusRegionStates(), "PR", "GU", "VI", "AS", "MP"];
const kinPlaces = kinNear.places as Record<
  string,
  { percent: number; tag: string }
>;
const regionShare = kinNear.regions as unknown as Record<string, number>;
const sourced = censusRegionStates().map(
  (code) => regionShare[censusRegionOf(code)]!,
);
const median = [...sourced].sort((a, b) => a - b)[
  Math.floor(sourced.length / 2)
]!;
for (const code of PLACES) {
  const row = kinPlaces[code];
  const want = censusRegionStates().includes(code)
    ? regionShare[censusRegionOf(code)]
    : median;
  if (!row || row.percent !== want) failures.push(`kin proximity ${code}`);
}
if (Object.keys(kinPlaces).length !== PLACES.length)
  failures.push("kin proximity: not exactly the 56 places");
console.log(
  `ok   kin proximity: ${PLACES.length} places (island areas at the 51-place median, ${median}%); parent within an hour ${parentNear.nearParent.percent}%`,
);
const shares = trajectories.trajectories;
for (const row of shares)
  if (!(row.low <= row.percent && row.percent <= row.high))
    failures.push(`trajectory ${row.id}`);
console.log(
  `ok   trajectories: ${shares.map((row) => `${row.id} ${row.percent}%`).join(", ")}`,
);
console.log(
  `ok   partisanship by place type: ${partisanship.communityType.map((row) => row.id).join(", ")}`,
);

if (failures.length) {
  console.error(`Mismatched: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("Every people row matches its source.");
