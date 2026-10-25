/**
 * M1-03 golden-path check, state and metro economies, in a played world. Uses
 * GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY from the runner. The drawn place
 * is built as the player gets it (`buildBenchWorld`, every module installed)
 * and plays one game year from its opening month. Passes when:
 * (1) two states drawn from the seed change in jobs and in pay between the
 *     opening December and the next December, differently from each other,
 *     and each inside the 5th to 95th percentile of the real December-over-
 *     December state changes (BLS CES state series; the ranges are in
 *     data/research/regional/series/stats.json with their windows);
 * (2) the town sits in a region of its own state, and the prices and pay it
 *     was given (the finance conditions every engine reads) are the
 *     nation's moved by that region's own price level and pay since the
 *     opening;
 * (3) every state's and metro's opening figures in the played world are the
 *     real ones (BLS LAUS unemployment, BLS CES jobs, BEA regional price
 *     parities; src/core2/data/regional/regions.json carries the series).
 * Exits nonzero naming each failed clause.
 */
import { createHash } from "node:crypto";
import regionsData from "../data/regional/regions.json" with { type: "json" };
import stats from "../../../data/research/regional/series/stats.json" with { type: "json" };
import { stateFigures, REGIONS, type RegionMonth } from "../regional-model";
import { type MacroMonth } from "../macro-model";
import { advanceCore } from "../life";
import { buildPlayedWorld, nextDay, playYear } from "./m1-played-year";
import { openingRateMatches, weightedRate } from "./m1-measures";

const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
// The nation and the regions open on the first day played; read them from then.
advanceCore(core, nextDay(world.start));
const regional = api.moduleState("regional");
const macro = api.moduleState("macro");
const monthsTable = regional.table("months");
const regionMonths = (month: string) =>
  monthsTable.query("byMonth", [month]) as unknown as RegionMonth[];
const macroState = macro.table("state").get("macro:state") as unknown as {
  openingMonth: string;
  placeIds: string[];
};
const opening = macroState.openingMonth;
const regionIds = new Set(
  REGIONS.filter((row) => row.kind !== "territory").map((row) => row.stateFips),
);
const fipsList = [...regionIds].sort();

const openingRows = regionMonths(opening).map((row) => ({ ...row }));
playYear(world);
const state = macro.table("state").get("macro:state") as unknown as {
  latestMonth: string;
};

// (1) Two drawn states over a year, December over December.
if (!opening.endsWith("-12"))
  failures.push(
    `opening month ${opening} is not a December: the year's change is not comparable with the real December-over-December spread`,
  );
const nextDecember = `${Number(opening.slice(0, 4)) + 1}${opening.slice(4)}`;
const closingRows = regionMonths(nextDecember);
if (!closingRows.length)
  failures.push(
    `no regional month ${nextDecember} after the year (latest ${state.latestMonth})`,
  );
// The states in the order the seed ranks them; the first two are the draw.
const rank = (fips: string) =>
  createHash("sha256").update(`M1-03:${world.seed}:${fips}`).digest("hex");
const [first, second] = [...fipsList].sort((a, b) =>
  rank(a).localeCompare(rank(b)),
) as [string, string];
const change = (fips: string) => {
  const a = stateFigures(openingRows, fips),
    b = stateFigures(closingRows, fips);
  return {
    jobsPct: (b.jobsThousands / a.jobsThousands - 1) * 100,
    payPct: (b.hourlyEarnings / a.hourlyEarnings - 1) * 100,
  };
};
const drawn = [first, second].map((fips) => ({
  fips,
  usps: REGIONS.find((row) => row.stateFips === fips)!.stateUsps,
  ...change(fips),
}));
const jobBand = stats.stateOneYearJobGrowthPct,
  payBand = stats.stateOneYearPayGrowthPct;
for (const row of drawn) {
  if (!(row.jobsPct > jobBand.p05 && row.jobsPct < jobBand.p95))
    failures.push(
      `state ${row.usps} jobs ${row.jobsPct.toFixed(2)}% outside the real one-year spread [${jobBand.p05.toFixed(2)}, ${jobBand.p95.toFixed(2)}] (${jobBand.window})`,
    );
  if (!(row.payPct > payBand.p05 && row.payPct < payBand.p95))
    failures.push(
      `state ${row.usps} pay ${row.payPct.toFixed(2)}% outside the real one-year spread [${payBand.p05.toFixed(2)}, ${payBand.p95.toFixed(2)}] (${payBand.window})`,
    );
}
// BLS publishes one-year percent changes to one decimal: states that read the same there have not diverged.
const published = (value: number) => Math.round(value * 10) / 10;
if (published(drawn[0]!.jobsPct) === published(drawn[1]!.jobsPct))
  failures.push(
    `the two drawn states read the same in jobs at the published precision (${drawn[0]!.usps} ${drawn[0]!.jobsPct.toFixed(4)}%, ${drawn[1]!.usps} ${drawn[1]!.jobsPct.toFixed(4)}%)`,
  );
if (published(drawn[0]!.payPct) === published(drawn[1]!.payPct))
  failures.push(
    `the two drawn states read the same in pay at the published precision (${drawn[0]!.usps} ${drawn[0]!.payPct.toFixed(4)}%, ${drawn[1]!.usps} ${drawn[1]!.payPct.toFixed(4)}%)`,
  );
// For the record: how many of all states sat outside the spread (not a clause).
const allChanges = fipsList.map((fips) => change(fips));
const outside = allChanges.filter(
  (row) =>
    row.jobsPct <= jobBand.p05 ||
    row.jobsPct >= jobBand.p95 ||
    row.payPct <= payBand.p05 ||
    row.payPct >= payBand.p95,
).length;

// (2) The town follows its region.
const placesTable = regional.table("places");
const townRegion = placesTable.get(world.placeId) as unknown as
  { regionId: string } | undefined;
const townRegionRow = townRegion
  ? REGIONS.find((row) => row.id === townRegion.regionId)
  : undefined;
if (!townRegionRow) failures.push(`the town ${world.placeId} has no region`);
else if (`US-${townRegionRow.stateUsps}` !== world.stateKey)
  failures.push(
    `the town's region ${townRegionRow.id} is in ${townRegionRow.stateUsps}, not the town's state ${world.stateKey}`,
  );
const nationMonth = (month: string) =>
  macro.table("months").get(`macro-month:${month}`) as unknown as MacroMonth;
const nationOpening = nationMonth(opening),
  nationNow = nationMonth(state.latestMonth);
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.abs(b);
const followed: string[] = [];
for (const row of placesTable.rows() as unknown as {
  id: string;
  regionId: string;
}[]) {
  const was = monthsTable.get(`${row.regionId}:${opening}`) as unknown as
    RegionMonth | undefined;
  const now = monthsTable.get(
    `${row.regionId}:${state.latestMonth}`,
  ) as unknown as RegionMonth | undefined;
  const condition = (core.finance.conditionsByPlace.get(row.id) ?? [])
    .filter((entry) => entry.at <= core.date)
    .at(-1);
  if (!was || !now || !condition) {
    failures.push(
      `${row.id}: region months or a published condition are missing`,
    );
    continue;
  }
  const wantPrice =
    (nationNow.priceIndex / nationOpening.priceIndex) *
    (now.priceLevelPct / was.priceLevelPct);
  const wantPay = now.hourlyEarnings / was.hourlyEarnings;
  if (!near(condition.generalPriceFactor, wantPrice))
    failures.push(
      `${row.id}: prices ${condition.generalPriceFactor} are not the nation's times region ${row.regionId}'s price level (${wantPrice})`,
    );
  if (!near(condition.wagePriceFactor, wantPay))
    failures.push(
      `${row.id}: pay ${condition.wagePriceFactor} is not region ${row.regionId}'s own pay since the opening (${wantPay})`,
    );
  followed.push(
    `${row.id} ${row.regionId} ${condition.id}: prices x${condition.generalPriceFactor.toFixed(4)} (nation x${(nationNow.priceIndex / nationOpening.priceIndex).toFixed(4)}), pay x${condition.wagePriceFactor.toFixed(4)} (nation x${(nationNow.hourlyEarnings / nationOpening.hourlyEarnings).toFixed(4)})`,
  );
}
if (!followed.length) failures.push("no place has a region");

// (3) Opening figures against the real series, read straight from the data.
type Series = Record<string, Record<string, number>>;
const real = regionsData.series as unknown as {
  stateUnemploymentPct: Series;
  stateJobsThousands: Series;
  stateHourlyEarnings: Series;
  metroUnemploymentPct: Series;
};
const latest = (series: Record<string, number> | undefined) => {
  if (!series) return undefined;
  let found: number | undefined;
  for (const [at, value] of Object.entries(series).sort())
    if (at <= opening) found = value;
  return found;
};
let statesChecked = 0,
  metrosChecked = 0;
const noSeries: string[] = [];
for (const fips of fipsList) {
  const rows = openingRows.filter((row) => row.stateFips === fips);
  const usps = REGIONS.find((row) => row.stateFips === fips)!.stateUsps;
  const people = (row: RegionMonth) =>
    REGIONS.find((region) => region.id === row.regionId)!.population;
  const total = rows.reduce((sum, row) => sum + people(row), 0);
  const jobs = latest(real.stateJobsThousands[fips]),
    unemployment = latest(real.stateUnemploymentPct[fips]),
    pay = latest(real.stateHourlyEarnings[fips]);
  if (jobs === undefined || unemployment === undefined) {
    noSeries.push(usps);
    continue;
  }
  statesChecked += 1;
  const jobsNow = rows.reduce((sum, row) => sum + row.jobsThousands, 0);
  if (!near(jobsNow, jobs))
    failures.push(
      `${usps}: opening jobs ${jobsNow.toFixed(1)}k, real ${jobs}k`,
    );
  const rates = rows.map((row) => ({
    pct: row.unemploymentPct,
    people: people(row),
  }));
  // No case is excused: a rest-of-state region floored at the state's own
  // rate still leaves the state's weighted rate to match the published one.
  if (!openingRateMatches(rates, unemployment))
    failures.push(
      `${usps}: opening unemployment ${weightedRate(rates).toFixed(3)}%, real ${unemployment}%`,
    );
  if (pay !== undefined) {
    const payNow =
      rows.reduce((sum, row) => sum + row.hourlyEarnings * people(row), 0) /
      total;
    if (!near(payNow, pay))
      failures.push(
        `${usps}: opening hourly pay ${payNow.toFixed(2)}, real ${pay} (${(100 * (payNow / pay - 1)).toFixed(2)}%)`,
      );
  }
  for (const row of rows) {
    const region = REGIONS.find((r) => r.id === row.regionId)!;
    if (region.kind !== "metro") continue;
    const metro = latest(real.metroUnemploymentPct[region.lausMetroCode ?? ""]);
    if (metro !== undefined) {
      metrosChecked += 1;
      if (Math.abs(row.unemploymentPct - metro) > 1e-9)
        failures.push(
          `${region.id}: opening unemployment ${row.unemploymentPct}%, real ${metro}%`,
        );
    }
    const years = Object.keys(region.rppPct)
      .map(Number)
      .sort()
      .filter((year) => year <= Number(opening.slice(0, 4)));
    const rpp = years.length ? region.rppPct[String(years.at(-1))] : undefined;
    if (rpp !== undefined && Math.abs(row.priceLevelPct - rpp) > 1e-9)
      failures.push(
        `${region.id}: opening price level ${row.priceLevelPct}, real ${rpp}`,
      );
  }
}
if (!statesChecked) failures.push("no state opening figure was checked");

console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: world.placeId,
    seed: world.seed,
    start: world.start,
    openingMonth: opening,
    comparedTo: nextDecember,
    drawnStates: drawn.map(
      (row) =>
        `${row.usps} jobs ${row.jobsPct.toFixed(2)}% pay ${row.payPct.toFixed(2)}%`,
    ),
    realSpread: {
      jobsPct: [jobBand.p05, jobBand.p95],
      payPct: [payBand.p05, payBand.p95],
      source: "data/research/regional/series/stats.json (BLS CES state series)",
    },
    statesOutsideTheSpread: `${outside} of ${fipsList.length}`,
    townRegion: townRegionRow?.id,
    townConditions: followed,
    openingFigures: {
      source: regionsData.source.citation,
      statesChecked,
      metrosChecked,
      statesWithoutSeries: noSeries,
    },
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
