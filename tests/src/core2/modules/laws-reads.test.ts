/**
 * The laws engine's read doors (laws-reads.ts, justice-reads.ts,
 * outcome-web-reads.ts) in a played world: one drawn place of the 56, built the
 * way the game builds it with every module installed, and played 150 days. Each
 * door must hand back exactly the rows its table holds. A door whose table is
 * empty in this world is named in the output and not counted as proved.
 */
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../../../src/bench/world";
import { drawPlace } from "../../../golden-path/place";
import { gameStartDate } from "../../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../../src/core2/kernel/dates";
import { advanceCore } from "../../../../src/core2/life";
import { coreAPI } from "../../../../src/core2/state";
import type { CoreAPI, CoreState } from "../../../../src/core2/types";
import { CORRUPTION_MODULE_ID } from "../../../../src/core2/modules/corruption";
import { CRIME_MODULE_ID } from "../../../../src/core2/modules/crime";
import { JUSTICE_MODULE_ID } from "../../../../src/core2/modules/justice";
import { LAWS_MODULE_ID } from "../../../../src/core2/modules/laws";
import {
  allLawRows,
  enactmentRowsOfSeries,
  lawRowById,
  storedLawRowsOfSeries,
} from "../../../../src/core2/modules/laws-reads";
import {
  corruptionCrimeById,
  crimeMonthById,
  crimeMonthsOfPlace,
  custodyById,
  justiceCaseById,
  sentenceById,
} from "../../../../src/core2/modules/justice-reads";
import { OUTCOME_WEB_MODULE_ID } from "../../../../src/core2/outcome-web-model";
import {
  allWebMonths,
  webMonthsOfPlace,
} from "../../../../src/core2/modules/outcome-web-reads";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 150;

let api: CoreAPI;
let name = "";
const passedOver: string[] = [];

beforeAll(() => {
  const seed = `${SEED}:laws-reads`;
  const place = drawPlace(seed, "laws-reads");
  name = `${place.name} (${place.key}), seed ${seed}`;
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const end = addDays(makeIsoDate(world.date), DAYS);
  while (world.date < end)
    advanceCore(world, addDays(makeIsoDate(world.date), 1));
  api = coreAPI(world);
}, 900_000);

const rowsOf = (moduleId: string, table: string) =>
  api.state.modules.has(moduleId)
    ? (api.moduleState(moduleId).table(table).rows() as unknown as {
        id: string;
        [key: string]: unknown;
      }[])
    : [];

function seen(label: string, count: number): void {
  if (count === 0) passedOver.push(label);
}

describe("the laws engine's read doors, in a played world", () => {
  it("law doors return the stored law rows", () => {
    const stored = rowsOf(LAWS_MODULE_ID, "laws");
    seen("laws", stored.length);
    expect(stored.length, `${name}: no laws kept`).toBeGreaterThan(0);
    expect(allLawRows(api)).toEqual(stored);
    for (const row of stored.slice(0, 200))
      expect(lawRowById(api, row.id)).toBe(
        api.moduleState(LAWS_MODULE_ID).table("laws").get(row.id),
      );
    expect(lawRowById(api, "no-such-law")).toBeUndefined();
    const series = new Set(stored.map((row) => String(row.series)));
    for (const one of [...series].slice(0, 25)) {
      const own = storedLawRowsOfSeries(api, one);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((row) => row.series === one)).toBe(true);
      const jurisdiction = own[0]!.jurisdiction;
      expect(
        storedLawRowsOfSeries(api, one, jurisdiction).every(
          (row) => row.jurisdiction === jurisdiction && row.series === one,
        ),
      ).toBe(true);
    }
    const enactments = rowsOf(LAWS_MODULE_ID, "enactments");
    seen("enactments", enactments.length);
    for (const one of new Set(enactments.map((row) => String(row.series))))
      expect(enactmentRowsOfSeries(api, one)).toEqual(
        enactments.filter((row) => row.series === one),
      );
  });

  it("justice, crime and corruption doors return the stored rows", () => {
    for (const row of rowsOf(JUSTICE_MODULE_ID, "cases"))
      expect(justiceCaseById(api, row.id)).toBe(
        api.moduleState(JUSTICE_MODULE_ID).table("cases").get(row.id),
      );
    seen("justice cases", rowsOf(JUSTICE_MODULE_ID, "cases").length);
    for (const row of rowsOf(JUSTICE_MODULE_ID, "sentences"))
      expect(sentenceById(api, row.id)).toBe(
        api.moduleState(JUSTICE_MODULE_ID).table("sentences").get(row.id),
      );
    seen("justice sentences", rowsOf(JUSTICE_MODULE_ID, "sentences").length);
    for (const row of rowsOf(JUSTICE_MODULE_ID, "custody"))
      expect(custodyById(api, row.id)).toBe(
        api.moduleState(JUSTICE_MODULE_ID).table("custody").get(row.id),
      );
    seen("justice custody", rowsOf(JUSTICE_MODULE_ID, "custody").length);
    for (const row of rowsOf(CORRUPTION_MODULE_ID, "crimes"))
      expect(corruptionCrimeById(api, row.id)).toBe(
        api.moduleState(CORRUPTION_MODULE_ID).table("crimes").get(row.id),
      );
    seen("corruption crimes", rowsOf(CORRUPTION_MODULE_ID, "crimes").length);
    const months = rowsOf(CRIME_MODULE_ID, "months");
    seen("crime months", months.length);
    for (const row of months) {
      expect(crimeMonthById(api, row.id)).toBe(
        api.moduleState(CRIME_MODULE_ID).table("months").get(row.id),
      );
      expect(crimeMonthsOfPlace(api, String(row.placeId))).toEqual(
        months.filter((one) => one.placeId === row.placeId),
      );
    }
  });

  it("outcome web doors return the stored months", () => {
    const months = rowsOf(OUTCOME_WEB_MODULE_ID, "months");
    seen("web months", months.length);
    expect(allWebMonths(api)).toEqual(months);
    for (const row of months.slice(0, 50))
      expect(webMonthsOfPlace(api, String(row.placeId))).toEqual(
        months.filter((one) => one.placeId === row.placeId),
      );
  });

  it("names what this world left empty", () => {
    if (passedOver.length)
      console.log(`Passed over in ${name}: ${passedOver.join(", ")}`);
    expect(passedOver).not.toContain("laws");
  });
});
