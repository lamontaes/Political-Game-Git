/**
 * M1-05 golden-path check, housing, in a played world. Uses GOLDEN_PATH_SEED
 * and GOLDEN_PATH_PLACE_KEY from the runner. The drawn place is built as the
 * player gets it (`buildBenchWorld`, every module installed) and plays one
 * game year. Passes when:
 * (1) the town's median rent and median home value, at the start and at the
 *     end of the year, are inside the range of the county medians in its
 *     state (ACS 2020-2024 B25064 median gross rent and B25077 median owner
 *     value, src/core2/data/housing/housing.json countyRentValue; a county
 *     the ACS gives no median for is skipped), the value moved to the day by
 *     the house price index;
 * (2) the town's median home value moved over the year by a ratio inside the
 *     range of four-quarter ratios its state's FHFA all-transactions index
 *     recorded from 1985 on (housing.json housePriceIndex); where FHFA has no
 *     state rows (Puerto Rico, the island areas) the range is the annual
 *     CPI-U ratios in src/core2/data/macro/history.json, which the engine
 *     moves those prices by;
 * (3) every eviction case on record opened from rent owed (owed at notice
 *     above zero, on a lease that exists) and carries the steps of the
 *     place's law as recorded (the same row of housing.json eviction,
 *     statute text in data/research/housing/eviction-steps-2026.json);
 * (4) every case followed those steps in order, each on the day the law's
 *     days give: notice, cure deadline (notice plus the notice days), filing
 *     on the cure deadline, hearing (filing plus the hearing days), judgment
 *     (the hearing, or later when a payment plan was missed), removal
 *     (judgment plus the stay days);
 * (5) every removal followed a judgment, ended the lease and left a
 *     dwelling marked removed for eviction, and every household marked
 *     removed for eviction has a removed case behind it.
 * Exits nonzero naming each failed clause. A year with no case on record
 * passes clauses 3 to 5 and says so.
 */
import housingData from "../data/housing/housing.json" with { type: "json" };
import history from "../data/macro/history.json" with { type: "json" };
import regionsData from "../data/regional/regions.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import { rentValueOf, townFigures } from "../modules/housing";
import { advanceCore } from "../life";
import { buildPlayedWorld, nextDay, playYear } from "./m1-played-year";

const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
const housing = api.moduleState("housing");
const meta = core.placeMetadata ?? {};
const townId = String(meta.housingTown ?? world.placeId);
const usps = String(meta.housingState ?? "");
const county = String(meta.housingCounty ?? "");

// The first day files the town's dwellings; read the opening figures after it.
advanceCore(core, nextDay(world.start));
const opening = townFigures(api, townId);
playYear(world);
const closing = townFigures(api, townId);

// (1) Rents and home values against the state's county medians.
const rentValue = housingData.countyRentValue as unknown as Record<
  string,
  [number | null, number | null]
>;
// The state's FIPS code, from the regional table (an island area has no county code of its own).
const statePrefix =
  (regionsData.regions as { stateFips: string; stateUsps: string }[]).find(
    (row) => row.stateUsps === usps,
  )?.stateFips ?? "";
const inState = Object.entries(rentValue).filter(
  ([fips, row]) => fips.startsWith(statePrefix) && row[0] && row[1],
);
const rents = inState.map(([, row]) => row[0]! * 100);
const values = inState.map(([, row]) => row[1]! * 100);
const range = (list: number[]) =>
  list.length ? ([Math.min(...list), Math.max(...list)] as const) : undefined;
const rentRange = range(rents),
  valueRange = range(values);
const countyMedian = rentValueOf(county);
if (!rentRange || !valueRange)
  console.error(
    `rents and home values: unchecked, ${usps} has no county medians to make a regional range`,
  );
else {
  for (const [label, figures] of [
    ["start", opening],
    ["end", closing],
  ] as const) {
    if (!(
      figures.rentMinor >= rentRange[0] && figures.rentMinor <= rentRange[1]
    ))
      failures.push(
        `rent: the town's median rent at the ${label} of the year, ${figures.rentMinor / 100} dollars, is outside its state's county medians [${rentRange[0] / 100}, ${rentRange[1] / 100}] (ACS 2020-2024 B25064)`,
      );
    if (!(
      figures.homeValueMinor >= valueRange[0] &&
      figures.homeValueMinor <= valueRange[1]
    ))
      failures.push(
        `home value: the town's median home value at the ${label} of the year, ${figures.homeValueMinor / 100} dollars, is outside its state's county medians [${valueRange[0] / 100}, ${valueRange[1] / 100}] (ACS 2020-2024 B25077)`,
      );
  }
}

// (2) The year's move in home values against the recorded annual moves.
const hpi = (
  housingData.housePriceIndex.states as unknown as Record<
    string,
    Record<string, number>
  >
)[usps];
const ratios: number[] = [];
let ratioSource: string;
if (hpi) {
  const keys = Object.keys(hpi).sort();
  for (let i = 4; i < keys.length; i += 1)
    ratios.push(hpi[keys[i]!]! / hpi[keys[i - 4]!]!);
  ratioSource = `FHFA all-transactions HPI for ${usps}, ${keys[0]} to ${keys.at(-1)}`;
} else {
  const cpi = history.annualCpi as { year: number; index: number }[];
  for (let i = 1; i < cpi.length; i += 1)
    ratios.push(cpi[i]!.index / cpi[i - 1]!.index);
  ratioSource = `CPI-U annual, ${cpi[0]!.year} to ${cpi.at(-1)!.year} (no FHFA state rows for ${usps})`;
}
const valueRatio =
  opening.homeValueMinor > 0
    ? closing.homeValueMinor / opening.homeValueMinor
    : NaN;
const ratioRange = range(ratios)!;
if (!(valueRatio >= ratioRange[0] && valueRatio <= ratioRange[1]))
  failures.push(
    `home value move: the town's median home value moved by ${valueRatio} over the year, outside the recorded annual range [${ratioRange[0].toFixed(4)}, ${ratioRange[1].toFixed(4)}] (${ratioSource})`,
  );

// (3) to (5) Every eviction case.
type Case = {
  id: string;
  leaseId: string;
  householdId: string;
  counted?: boolean;
  open: boolean;
  stage: string;
  owedAtNoticeMinor: number;
  noticeAt: string;
  cureBy: string;
  filedAt?: string;
  hearingAt?: string;
  settledAt?: string;
  judgmentAt?: string;
  removalAt?: string;
  removedAt?: string;
  reasonKey?: string;
  law: {
    noticeDays: number;
    hearingDays: number;
    stayDays: number;
    gracePeriodDays: number;
    cureAllowed: boolean;
    statute?: string;
  };
};
const cases = housing.table("cases").rows() as unknown as Case[];
const lawRow = (
  housingData.eviction as unknown as Record<string, Case["law"] | undefined>
)[usps];
if (!lawRow) failures.push(`no recorded eviction steps for ${usps}`);
const later = (date: string, days: number) =>
  addDays(makeIsoDate(date), Math.max(1, days));
const stages: Record<string, number> = {};
let broken = 0;
const fail = (id: string, text: string) => {
  broken += 1;
  if (broken <= 8) failures.push(`${id}: ${text}`);
};
for (const row of cases) {
  stages[row.stage] = (stages[row.stage] ?? 0) + 1;
  // (3) From rent owed, on the place's law.
  if (!(row.owedAtNoticeMinor > 0))
    fail(row.id, `opened with ${row.owedAtNoticeMinor} owed`);
  if (!row.counted && !core.finance.contracts.has(row.leaseId))
    fail(row.id, `names lease ${row.leaseId}, which is no record`);
  if (lawRow)
    for (const key of [
      "noticeDays",
      "hearingDays",
      "stayDays",
      "gracePeriodDays",
      "cureAllowed",
      "statute",
    ] as const)
      if (row.law[key] !== lawRow[key])
        fail(
          row.id,
          `followed ${key} ${row.law[key]}, the law of ${usps} says ${lawRow[key]}`,
        );
  // (4) The steps, in order, on the law's days.
  if (row.cureBy !== later(row.noticeAt, row.law.noticeDays))
    fail(
      row.id,
      `cure deadline ${row.cureBy} is not notice ${row.noticeAt} plus ${row.law.noticeDays} days`,
    );
  if (row.filedAt) {
    if (row.filedAt !== row.cureBy)
      fail(
        row.id,
        `filed ${row.filedAt}, not on the cure deadline ${row.cureBy}`,
      );
    if (row.hearingAt !== later(row.filedAt, row.law.hearingDays))
      fail(
        row.id,
        `hearing ${row.hearingAt} is not filing ${row.filedAt} plus ${row.law.hearingDays} days`,
      );
  } else if (row.judgmentAt || row.removalAt)
    fail(row.id, "has a judgment or removal and no filing");
  if (row.judgmentAt) {
    if (!row.hearingAt || row.judgmentAt < row.hearingAt)
      fail(
        row.id,
        `judgment ${row.judgmentAt} before its hearing ${row.hearingAt}`,
      );
    if (row.removalAt !== later(row.judgmentAt, row.law.stayDays))
      fail(
        row.id,
        `removal ${row.removalAt} is not judgment ${row.judgmentAt} plus ${row.law.stayDays} days`,
      );
    if (!row.settledAt && row.judgmentAt !== row.hearingAt)
      fail(
        row.id,
        `judgment ${row.judgmentAt} is not on the hearing day ${row.hearingAt}`,
      );
    if (row.settledAt && row.settledAt < row.hearingAt!)
      fail(row.id, `settled ${row.settledAt} before its hearing`);
  }
  // (5) A removal follows a judgment.
  if (row.stage === "removed") {
    if (!row.judgmentAt || row.removedAt !== row.removalAt)
      fail(
        row.id,
        `removed ${row.removedAt} without judgment on ${row.removalAt}`,
      );
    const lease = core.finance.contracts.get(row.leaseId);
    if (!row.counted && lease && !lease.endedAt)
      fail(row.id, `removed but lease ${row.leaseId} still runs`);
  }
}
const removedHouseholds = new Set(
  cases.filter((row) => row.stage === "removed").map((row) => row.householdId),
);
const markedRemoved = (
  housing.table("dwellings").rows() as unknown as {
    householdId: string;
    basis?: string;
  }[]
).filter((row) => row.basis === "eviction");
for (const row of markedRemoved)
  if (!removedHouseholds.has(row.householdId))
    fail(row.householdId, "marked removed for eviction with no removed case");
for (const id of removedHouseholds)
  if (!markedRemoved.some((row) => row.householdId === id))
    fail(id, "has a removed case and no dwelling marked removed");

console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: townId,
    seed: world.seed,
    start: world.start,
    state: usps,
    county,
    countyMedianRentDollars: countyMedian[0],
    countyMedianValueDollars: countyMedian[1],
    townMedianRentDollars: [opening.rentMinor / 100, closing.rentMinor / 100],
    stateCountyRentRangeDollars: rentRange
      ? [rentRange[0] / 100, rentRange[1] / 100]
      : null,
    townMedianValueDollars: [
      opening.homeValueMinor / 100,
      closing.homeValueMinor / 100,
    ],
    stateCountyValueRangeDollars: valueRange
      ? [valueRange[0] / 100, valueRange[1] / 100]
      : null,
    homeValueRatioOverYear: Number(valueRatio.toFixed(4)),
    annualRatioRange: ratioRange.map((n) => Number(n.toFixed(4))),
    annualRatioSource: ratioSource,
    casesOnRecord: cases.length,
    casesByStage: stages,
    removalsOnRecord: removedHouseholds.size,
    sampleCaseIds: cases.slice(0, 5).map((row) => row.id),
    sampleRemovedCaseIds: cases
      .filter((row) => row.stage === "removed")
      .slice(0, 5)
      .map((row) => row.id),
    note: cases.length ? undefined : "no eviction case opened in the year",
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
