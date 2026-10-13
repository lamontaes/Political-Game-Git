/**
 * M1-05 golden-path check, on the whole economy. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town on the two-level world
 * with every economy engine runs two years from its start date. Passes when:
 * (1) the town's median rent sits inside the spread of its state's county
 * median gross rents (ACS B25064, its lowest to highest county,
 * widened by consumer prices since the opening); (2) its median
 * home value sits inside the spread of its state's county median values
 * (ACS B25077), the same way; (3) every eviction case began from rent
 * owed and followed its state's steps: notice, the cure period, filing, the
 * hearing after its days, judgment only on rent still owed, removal after
 * the stay. Exits nonzero on failure.
 */
import homeValues from "../../../data/tables/county-home-value.json" with { type: "json" };
import housingData from "../data/housing/housing.json" with { type: "json" };
import { advanceCore, createLifeCore } from "../life";
import type { MacroMonth } from "../macro-model";
import { townFigures } from "../modules/housing";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
const failures: string[] = [];
const input = withWorldEconomy(
  generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
);
const core = createLifeCore(input, {
  data: worldCoreData(),
  modules: [...WORLD_MODULES],
});
const api = coreAPI(core);
advanceCore(core, input.startedAt);
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 2);
advanceCore(core, end.toISOString().slice(0, 10));

// The town: where its businesses are.
const counts = new Map<string, number>();
for (const id of core.finance.businesses.keys()) {
  const placeId = core.organizations.get(id)?.placeId;
  if (placeId) counts.set(placeId, (counts.get(placeId) ?? 0) + 1);
}
const town = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
const figures = townFigures(api, town);

// The state's counties, by FIPS: the town's state from its county rows.
const fipsOf = (usps: string) =>
  ({
    AL: "01",
    AK: "02",
    AZ: "04",
    AR: "05",
    CA: "06",
    CO: "08",
    CT: "09",
    DE: "10",
    DC: "11",
    FL: "12",
    GA: "13",
    HI: "15",
    ID: "16",
    IL: "17",
    IN: "18",
    IA: "19",
    KS: "20",
    KY: "21",
    LA: "22",
    ME: "23",
    MD: "24",
    MA: "25",
    MI: "26",
    MN: "27",
    MS: "28",
    MO: "29",
    MT: "30",
    NE: "31",
    NV: "32",
    NH: "33",
    NJ: "34",
    NM: "35",
    NY: "36",
    NC: "37",
    ND: "38",
    OH: "39",
    OK: "40",
    OR: "41",
    PA: "42",
    RI: "44",
    SC: "45",
    SD: "46",
    TN: "47",
    TX: "48",
    UT: "49",
    VT: "50",
    VA: "51",
    WA: "53",
    WV: "54",
    WI: "55",
    WY: "56",
    PR: "72",
    GU: "66",
    VI: "78",
    AS: "60",
    MP: "69",
  })[usps];
const usps = input.placeMetadata?.housingState ?? "";
const fips = fipsOf(usps);
const rows = (text: string) =>
  text.split(";").map((row) => row.split(":") as [string, string]);
const spread = (values: number[]) => {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  return sorted.length
    ? // A place can sit at its county's edge: the state's lowest to highest county.
      { low: sorted[0]!, high: sorted.at(-1)!, counties: sorted.length }
    : undefined;
};
const countyRentValue = housingData.countyRentValue as unknown as Record<
  string,
  [number | null, number | null]
>;
const rentSpread = spread(
  Object.entries(countyRentValue)
    .filter(([county]) => fips && county.startsWith(fips))
    .map(([, [rent]]) => rent ?? 0),
);
const valueSpread = spread(
  rows(homeValues.COUNTY_HOME_VALUE_ROWS)
    .filter(([county]) => fips && county.startsWith(fips))
    .map(([, value]) => Number(value)),
);
// Prices since the opening widen the range both ways (the tables are recent; the world may open earlier).
const macro = api.moduleState("macro");
const state = macro.table("state").get("macro:state") as unknown as {
  openingMonth: string;
  latestMonth: string;
};
const month = (key: string) =>
  macro.table("months").get(`macro-month:${key}`) as unknown as MacroMonth;
const prices =
  month(state.latestMonth).priceIndex / month(state.openingMonth).priceIndex;
const inside = (
  label: string,
  value: number,
  range: { low: number; high: number } | undefined,
) => {
  if (!range) return `${label}: no county figures for ${usps}`;
  const low = range.low / prices,
    high = range.high * prices;
  if (!(value >= low && value <= high))
    failures.push(
      `${label} ${value.toFixed(0)} outside [${low.toFixed(0)}, ${high.toFixed(0)}]`,
    );
  return `${label} ${value.toFixed(0)} in [${low.toFixed(0)}, ${high.toFixed(0)}]`;
};
const rentLine = inside("rent", figures.rentMinor / 100, rentSpread);
const valueLine = inside(
  "home value",
  figures.homeValueMinor / 100,
  valueSpread,
);

// Every eviction case, step by step against its law.
type Case = {
  id: string;
  stage: string;
  owedAtNoticeMinor: number;
  noticeAt: string;
  cureBy: string;
  filedAt?: string;
  hearingAt?: string;
  owedAtFilingMinor?: number;
  judgmentAt?: string;
  removalAt?: string;
  owedAtJudgmentMinor?: number;
  removedAt?: string;
  law: { noticeDays: number; hearingDays: number; stayDays: number };
};
const cases = [
  ...api.moduleState("housing").table("cases").rows(),
] as unknown as Case[];
// A step the statute gives no days to falls on the next day (housing's rule).
const after = (date: string, days: number) => {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + Math.max(1, days));
  return at.toISOString().slice(0, "YYYY-MM-DD".length);
};
for (const row of cases) {
  const bad = (why: string) => failures.push(`${row.id}: ${why}`);
  if (!(row.owedAtNoticeMinor > 0)) bad("notice without rent owed");
  if (row.cureBy !== after(row.noticeAt, row.law.noticeDays))
    bad("cure period not the statute's notice days");
  if (row.filedAt) {
    if (row.filedAt < row.cureBy) bad("filed before the cure period ended");
    if (!(row.owedAtFilingMinor! > 0)) bad("filed with nothing owed");
    if (row.hearingAt !== after(row.filedAt, row.law.hearingDays))
      bad("hearing not the statute's days after filing");
  }
  if (row.judgmentAt) {
    if (!row.hearingAt || row.judgmentAt < row.hearingAt)
      bad("judgment before the hearing");
    if (row.removalAt !== after(row.judgmentAt, row.law.stayDays))
      bad("removal not the statute's stay after judgment");
  }
  if (row.removedAt) {
    if (!row.removalAt || row.removedAt < row.removalAt)
      bad("removed before the stay ended");
    if (row.stage === "removed" && !row.judgmentAt)
      bad("removed without a judgment");
  }
}
const stages: Record<string, number> = {};
for (const row of cases) stages[row.stage] = (stages[row.stage] ?? 0) + 1;

console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      renters: figures.renters,
      checks: [rentLine, valueLine],
      rentSpread: rentSpread,
      homeValueSpread: valueSpread,
      pricesSinceOpening: +prices.toFixed(4),
      evictionCases: stages,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
