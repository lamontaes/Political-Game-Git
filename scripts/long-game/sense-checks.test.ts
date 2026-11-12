import { describe, expect, it } from "vitest";
import { drawPlace } from "../core2-year/place";
import {
  chooseGame,
  LongGameFailure,
  playYears,
  type YearRow,
} from "./twenty-years";
import {
  SENSE_CHECK_IDS,
  runSenseChecks,
  type PlaceReading,
  type WorldReading,
} from "./sense-checks";

const place = (over: Partial<PlaceReading> = {}): PlaceReading => ({
  placeId: "made-up-place",
  households: 100,
  people: 260,
  adults: 200,
  recordedJobs: 120,
  outOfTownWorkers: 30,
  fullPeople: 4,
  fullWorkers: 2,
  ...over,
});
const world = (
  places: PlaceReading[],
  problems: string[] = [],
): WorldReading => ({
  places,
  countryProblems: problems,
});
const failing = (reading: WorldReading) =>
  runSenseChecks(reading)
    .filter((r) => !r.ok)
    .map((r) => r.id);

describe("long game sense checks, on a made-up world", () => {
  it("stay silent on a world that can exist", () => {
    expect(failing(world([place()]))).toEqual([]);
  });
  it("fail on more jobs than adults, in the recorded jobs or the out-of-town share", () => {
    expect(failing(world([place({ recordedJobs: 250 })]))).toEqual([
      "jobs-not-over-adults",
    ]);
    expect(
      failing(world([place({ recordedJobs: 150, outOfTownWorkers: 80 })])),
    ).toEqual(["jobs-not-over-adults"]);
  });
  it("fail on a negative count of people or households", () => {
    expect(failing(world([place({ people: -1 })]))).toEqual([
      "no-negative-counts",
    ]);
    expect(failing(world([place({ households: -0.5 })]))).toEqual([
      "no-negative-counts",
    ]);
  });
  it("fail on the country tier's impossible counts, naming them", () => {
    const found = runSenseChecks(
      world([place()], ["VT fifth 1 18-29: people is -3"]),
    );
    expect(found.map((r) => r.id)).toEqual([...SENSE_CHECK_IDS]);
    expect(found.find((r) => r.id === "country-tier-counts")).toMatchObject({
      ok: false,
      detail: "VT fifth 1 18-29: people is -3",
    });
  });
});

describe("the long game's year loop", () => {
  it.each(["lg-a", "lg-b"])(
    "plays one year in a drawn place and writes a row with every column (seed %s)",
    (seed) => {
      const game = chooseGame({ seed });
      const drawn = drawPlace(seed, "twenty-years");
      const who = `${drawn.name}, place ${drawn.key}, seed ${seed}`;
      expect(game.worldSeed, who).toBe(drawn.seed);
      const rows: YearRow[] = [];
      try {
        playYears(game, 1, (row) => rows.push(row));
      } catch (error) {
        // A failed check ends the run after its row; a crash is the test's failure.
        if (!(error instanceof LongGameFailure) || !/^check /.test(error.what))
          throw new Error(`${who}: ${(error as Error).message}`);
      }
      expect(rows, who).toHaveLength(1);
      const row = rows[0]!;
      process.stdout.write(
        `${who}: year ${row.year} ${row.date} ${row.seconds} s, heap ${row.heapMiB} MB, ${row.records} records\n`,
      );
      expect(row.year, who).toBe(1);
      expect(row.date, who).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.seconds, who).toBeGreaterThan(0);
      expect(row.heapMiB, who).toBeGreaterThan(0);
      expect(row.records, who).toBeGreaterThan(0);
      expect(
        row.checks.map((c) => c.id),
        who,
      ).toEqual([...SENSE_CHECK_IDS]);
      for (const c of row.checks) expect(c.detail, who).not.toBe("");
    },
    1_200_000,
  );
});
