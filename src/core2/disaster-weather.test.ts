/**
 * The town's own weather after FEMA's record (Nation, Nov 9): the county's
 * exposure to flood, storm and wildfire grows with the climate's rate, and a
 * disaster happens when a whole one has built up, with the days and figures of
 * a recorded disaster of the county. A made disaster goes through the same
 * begin and declare as a recorded one: homes are marked damaged and their
 * households are paid and pay for repairs from their own accounts.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import declarations from "./data/disasters/declarations.json" with { type: "json" };
import households from "./data/disasters/households.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import {
  hazardOfIncident,
  RECORD_END,
  recordedHazardRate,
} from "./modules/climate";
import { buildPopulation } from "./population";
import type { damagedHomesOf } from "./modules/disasters";
import {
  countyCode,
  disasterAssistancePaid,
  normalizedGovernmentName,
} from "./modules/disasters";
import { coreAPI } from "./state";
import { townsWithDamage } from "./tooling/disaster-damage-screen";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const MADE = 1_000_000;

/** The first month of the run after the record, and the last month a made disaster may begin in. */
const FIRST_MONTH = "2026-11";
const LAST_MONTH = "2029-12";
const HAZARDS_MADE = ["flood", "storm", "wildfire"] as const;

type Rows = Record<string, [string, string, number, number, number][]>;

/**
 * The made disaster this county would have, read from the data alone: for each
 * hazard, the recorded disasters of the county in turn and the one whose FEMA
 * figures name homes damaged in the town (position `at` in the list), and the
 * month the recorded rate has built one whole disaster from that position.
 * Null when no hazard gets there by the last month.
 */
function damagingDisaster(county: string, townName: string) {
  const rows = declarations.byCounty as unknown as Rows;
  const homes = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, [number, number, number]>
  >;
  let best: {
    hazard: string;
    at: number;
    number: number;
    month: string;
  } | null = null;
  for (const hazard of HAZARDS_MADE) {
    const list = [
      ...(rows[county] ?? []),
      ...(rows[`${county.slice(0, 2)}000`] ?? []),
    ]
      .filter(
        (row) =>
          hazardOfIncident(declarations.types[row[2]] ?? "") === hazard &&
          row[0] >= "2000-01-01" &&
          row[0] <= RECORD_END,
      )
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(
        (row, at, all) => all.findIndex((one) => one[4] === row[4]) === at,
      );
    const at = list.findIndex(
      (row) =>
        (homes[`${county}|${row[4]}`]?.[townName]?.[2] ?? 0) > 0 &&
        (homes[`${county}|${row[4]}`]?.[townName]?.[0] ?? 0) > 0,
    );
    if (at < 0) continue;
    // The month the recorded rate first builds one whole disaster.
    let expected = 0;
    for (let year = 2026; year <= 2029 && expected < 1; year++)
      for (let month = 1; month <= 12 && expected < 1; month++) {
        const label = `${year}-${String(month).padStart(2, "0")}`;
        if (label < FIRST_MONTH || label > LAST_MONTH) continue;
        expected += recordedHazardRate(county, hazard, month);
        if (expected >= 1 && (!best || label < best.month))
          best = { hazard, at, number: list[at]![4], month: label };
      }
  }
  return best;
}

describe(`the town's weather from the climate (seed ${seed})`, () => {
  it("makes a disaster after the record that damages named households' homes", () => {
    const tried: string[] = [];
    let opened = 0;
    for (let draw = 0; draw < 4000 && opened < 6; draw++) {
      const place = drawPlace(`${seed}:weather:${draw}`, "core2-disasters");
      const name = normalizedGovernmentName(place.name.split(",")[0] ?? "");
      if (!townsWithDamage(place.state.replace(/^US-/, "")).has(name)) continue;
      // The data says whether this town gets a damaging made disaster, before a world is built.
      const probe = createLifeCore(
        buildPopulation({
          seed: place.seed,
          placeKey: place.key,
          startedAt: gameStartDate(),
          minimumPeople: 30,
        }),
      );
      const county = countyCode(probe);
      const first = county ? damagingDisaster(county, name) : null;
      if (!first) continue;
      opened += 1;
      const where = `${place.name}, ${place.state} (seed ${seed}:weather:${draw})`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      // The county's cycle stands at the damaging disaster (a fixture for the damage path
      // only: the exposure then builds by the climate's rate, and the disaster comes when
      // it holds one more whole disaster).
      api
        .moduleState("core2-disasters-v1")
        .table("exposure")
        .put({
          id: `exposure:${county}:${first.hazard}`,
          hazard: first.hazard,
          expected: first.at,
          fired: first.at,
        } as unknown as { id: string });
      // Run to the end of the month the exposure builds a whole disaster, and a bit more for its declaration.
      advanceCore(core, addDays(makeIsoDate(`${first.month}-01`), 75));
      const made = (
        api
          .moduleState("core2-disasters-v1")
          .table("damaged")
          .rows() as unknown as ReturnType<typeof damagedHomesOf>
      ).filter((row) => row.disasterNumber >= MADE);
      if (!made.length) {
        tried.push(
          `${where}: expected ${first.hazard} disaster ${first.number} in ${first.month}, no damaged homes by ${core.date}`,
        );
        continue;
      }
      const number = made[0]!.disasterNumber;
      const sample = made.find((row) => row.headId) ?? made[0]!;
      const paid = disasterAssistancePaid(api).filter(
        (row) => row.disaster === number,
      );
      expect(paid.length, `${where}: aid paid for ${number}`).toBeGreaterThan(
        0,
      );
      // A made disaster's figures are its template's, under a number of its own.
      expect(number % MADE).toBe(first.number);
      const exposure = api
        .moduleState("core2-disasters-v1")
        .table("exposure")
        .rows() as unknown as { id: string; expected: number; fired: number }[];
      for (const row of exposure)
        expect(row.fired, row.id).toBe(Math.floor(row.expected));
      process.stdout.write(
        `town weather: ${where}; made ${first.hazard} disaster ${number} (recorded ${number % MADE}) damaged ${made.length} homes, ${made.filter((row) => row.headId).length} named; household ${sample.householdId} (${sample.kind}) aid ${sample.aidMinor} cents, repairs ${sample.repairsPaidMinor} of ${sample.repairsOwedMinor}; exposure ${exposure.map((r) => `${r.id.split(":").pop()} ${r.expected.toFixed(3)}/${r.fired}`).join(", ")}; ${draw + 1} draws, ${opened} opened\n`,
      );
      return;
    }
    throw new Error(
      `no made disaster damaged homes in ${opened} opened places (seed ${seed}):\n${tried.join("\n")}`,
    );
  }, 3_600_000);
});
