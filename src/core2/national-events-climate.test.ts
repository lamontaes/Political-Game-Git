/**
 * The country's disasters after FEMA's record come from the climate's hazard
 * levels (Nation, Nov 9): each state's exposure to flood, storm and wildfire
 * grows with its recorded rate moved by the warming, and a disaster happens
 * the month the exposure holds one more whole disaster. Two small worlds, the
 * same but for the federal power-plant rule flipped on day one in one, run to
 * early 2028 (past the rule's 24 months of lag): the disasters are the
 * recorded rate's, and the exposures differ by the laws.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { openClimate, hazardFactor } from "./modules/climate";
import { enactLaw, openLaws, stateLawInForce } from "./modules/laws";
import {
  nationalDisasterDetail,
  nationalEvents,
  openNationalEvents,
} from "./modules/national-events";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const POWER_PLANTS =
  "us-federal-positions:energy-environment.limit-power-plant-carbon";
const RECORD_END = "2026-10-09";

function run(flip: boolean) {
  const place = drawPlace(`${seed}:events`, "core2-national-events");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: gameStartDate(),
      minimumPeople: 30,
    }),
  );
  openLaws(core);
  openClimate(core);
  openNationalEvents(core);
  const api = coreAPI(core);
  let open = 0;
  if (flip) {
    open = stateLawInForce(api, "US-OH", POWER_PLANTS).value ?? 0;
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: POWER_PLANTS,
      value: open ? 0 : 1,
      effectiveDate: addDays(makeIsoDate(core.date), 2),
      measureId: "events-test-power-plants",
      citation: "Twin world for the national events test",
    });
  }
  advanceCore(core, "2028-01-20");
  const exposures = api
    .moduleState("national-events")
    .table("exposure")
    .rows() as unknown as {
    id: string;
    expected: number;
    fired: number;
  }[];
  return { api, place, open, exposures, events: nationalEvents(api) };
}

describe(`the country's disasters from the climate's hazard levels (seed ${seed})`, () => {
  it("makes disasters after the record from exposures that move only with the laws", () => {
    const base = run(false);
    const twin = run(true);
    const made = base.events.filter((e) => e.hazard);
    const real = base.events.filter((e) => !e.hazard);
    // Inside the record they are FEMA's; after it they come from the levels.
    expect(real.length).toBeGreaterThan(0);
    for (const e of real) expect(e.date <= RECORD_END).toBe(true);
    expect(made.length).toBeGreaterThan(0);
    for (const e of made) {
      expect(e.date > RECORD_END, e.id).toBe(true);
      expect(["flood", "storm", "wildfire"]).toContain(e.hazard);
      // Opened, it shows the counties and aid of a recorded disaster of its state.
      expect(nationalDisasterDetail(base.api, e.id)?.counties.length).toBe(
        e.counties,
      );
    }
    // A disaster has happened for each whole one the exposure holds, never more.
    for (const row of base.exposures) {
      expect(row.fired, row.id).toBe(Math.floor(row.expected));
    }
    // Generated per year, the count matches the recorded rate it comes from (about the record's yearly flood, storm and wildfire disasters).
    const months = new Set(made.map((e) => e.date.slice(0, 7)));
    const expectedTotal = base.exposures.reduce((n, r) => n + r.expected, 0);
    const generatedYears = 14 / 12;
    expect(expectedTotal / generatedYears).toBeGreaterThan(50);
    // The twin differs by the laws, and only by them: its exposures sum moves the way the rule's link says.
    const sum = (rows: typeof base.exposures) =>
      rows.reduce((n, r) => n + r.expected, 0);
    const direction = twin.open ? 1 : -1;
    expect(Math.sign(sum(twin.exposures) - sum(base.exposures))).toBe(
      direction,
    );
    expect(
      Math.sign(
        hazardFactor(twin.api, "flood") - hazardFactor(base.api, "flood"),
      ),
    ).toBe(direction);
    process.stdout.write(
      `national events from levels: ${base.place.name}, ${base.place.state} (seed ${seed}:events); ${real.length} recorded and ${made.length} generated disasters to 2028-01-20 in ${months.size} months; exposure sum ${sum(base.exposures).toFixed(6)} baseline vs ${sum(twin.exposures).toFixed(6)} with the power-plant rule ${twin.open ? "repealed" : "enacted"}; first ${made[0]!.id}\n`,
    );
  }, 900_000);
});
