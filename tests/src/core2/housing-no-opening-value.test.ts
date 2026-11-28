/**
 * A town with no owner-occupied home at the opening still builds, tested by
 * giving the stock row no opening base and building one month
 * (world-housing-building-hangs-no-opening-value): the housing stock row holds
 * an opening home value of zero, and the first month a home value exists
 * divided by it, so every start was infinite and the game never returned.
 * Run in a child process with a time limit, since the failure is a loop that
 * never ends. Played world, a place and seed nobody chose.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const script = `import { buildBenchWorld } from "./src/bench/world";
import { drawPlace } from "./scripts/core2-year/place";
import { gameStartDate } from "./src/core2/game-start";
import { coreAPI } from "./src/core2/state";
import { buildMonth } from "./src/core2/housing-construction";
const place = drawPlace(process.argv[1], "housing-no-opening-value");
const { core } = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
import { advanceCore } from "./src/core2/life";
import { addDays, makeIsoDate } from "./src/core2/kernel/dates";
advanceCore(core, addDays(makeIsoDate(core.date), 35));
const api = coreAPI(core);
const store = api.moduleState("housing");
const stock = store.table("stock");
const projects = store.table("projects");
const landlord = [...core.organizations.values()].find((o) => o.id.startsWith("organization:landlord:"));
core.organizations.get(landlord.id).liquidMinor = 1e12;
for (const row of stock.rows()) stock.put({ ...row, openingHomeValueMinor: 0, openingRentMinor: 0 });
buildMonth(api, { stock, projects }, { placeId: landlord.placeId, usps: core.placeMetadata.housingState ?? "", landlordId: landlord.id, homeValueMinor: 30_000_000, rentMinor: 100_000, priceLevel: 1, medianMonthlyPayMinor: 400_000, source: { tag: "ESTIMATED", asOf: core.date, citation: "test", estimatedFrom: "test" } }, () => {});
const rows = stock.rows();
console.log(JSON.stringify({ place: place.name + " (" + place.key + ")", started: projects.rows().length, rows: rows.map((r) => [r.openingHomeValueMinor, r.openingRentMinor, Number.isFinite(r.carrySingle), Number.isFinite(r.carryMulti)]) }));
`;

it(`builds when the opening has no home value, seed ${seed}`, () => {
  const out = execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script, seed],
    {
      cwd: process.cwd(),
      timeout: 280_000,
      encoding: "utf8",
      maxBuffer: 1 << 24,
    },
  );
  const result = JSON.parse(out.trim().split("\n").at(-1)!) as {
    place: string;
    started: number;
    rows: [number, number, boolean, boolean][];
  };
  expect(result.rows.length, `${result.place}, seed ${seed}`).toBeGreaterThan(
    0,
  );
  for (const [value, rent, single, multi] of result.rows) {
    expect(
      single && multi,
      `${result.place}, seed ${seed}: carries finite`,
    ).toBe(true);
    expect(
      value + rent,
      `${result.place}, seed ${seed}: opening base set`,
    ).toBeGreaterThan(0);
  }
}, 300_000);
