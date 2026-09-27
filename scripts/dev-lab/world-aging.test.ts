import { describe, expect, it } from "vitest";

import type { IsoDate } from "../../src/simulation";

import {
  agingBenchmarkMarkdown,
  anniversary,
  costGrowth,
  createObserverDayButton,
  DEFAULT_AGING_PLACE,
  historyCounts,
  openWatchedWorld,
  quantile,
  saveAndReopen,
  summarizeProfile,
  type AgingResult,
  type FunctionCost,
} from "./world-aging";

const date = (value: string) => value as IsoDate;

describe("the world aging harness", () => {
  it(
    "opens a watched world in the named place and moves it one Day per press, keeping and reopening it through the save store",
    { timeout: 300_000 },
    async () => {
      const watched = openWatchedWorld("aging-test", DEFAULT_AGING_PLACE);
      expect(watched.placeName).toBe("Columbus, Ohio");
      expect(watched.world.control.kind).toBe("observer");
      const button = createObserverDayButton(watched.world);
      const dates = [button.world.currentDate];
      for (let press = 0; press < 3; press += 1) {
        const pressed = button.press();
        expect(pressed.status).toBe("moved");
        dates.push(button.world.currentDate);
      }
      // One press is one calendar day, never a skip.
      for (let index = 1; index < dates.length; index += 1) {
        const gap =
          (Date.parse(dates[index]!) - Date.parse(dates[index - 1]!)) /
          86_400_000;
        expect(gap).toBe(1);
      }
      expect(button.world.control.kind).toBe("observer");

      const trip = await saveAndReopen(button.world);
      expect(trip.saveBytes).toBeGreaterThan(0);
      expect(trip.reopenedMatches).toBe(true);
      expect(Object.keys(historyCounts(button.world))).toContain("events");
    },
  );

  it("refuses a place the game does not offer", () => {
    expect(() => openWatchedWorld("aging-test", "no-such-place")).toThrow(
      /no-such-place/,
    );
  });

  it("counts a game year from the opening date, leap days included", () => {
    expect(anniversary(date("2026-01-05"), 1)).toBe("2027-01-05");
    expect(anniversary(date("2026-01-05"), 20)).toBe("2046-01-05");
    expect(anniversary(date("2028-02-29"), 1)).toBe("2029-02-28");
    expect(anniversary(date("2028-02-29"), 4)).toBe("2032-02-29");
  });

  it("takes nearest-rank quantiles", () => {
    const sorted = Array.from({ length: 20 }, (_unused, index) => index + 1);
    expect(quantile(sorted, 0.5)).toBe(10);
    expect(quantile(sorted, 0.95)).toBe(19);
    expect(quantile([], 0.5)).toBe(0);
  });

  it("splits a sampled profile into own and inclusive time per function", () => {
    const frame = (functionName: string, lineNumber: number) => ({
      functionName,
      url: "",
      lineNumber,
    });
    const costs = summarizeProfile({
      nodes: [
        { id: 1, callFrame: frame("(root)", 0), children: [2] },
        { id: 2, callFrame: frame("advance", 0), children: [3, 4] },
        { id: 3, callFrame: frame("scan", 0), children: [5] },
        { id: 4, callFrame: frame("write", 0) },
        // Recursion: `scan` inside `scan` is counted once inclusively.
        { id: 5, callFrame: frame("scan", 0) },
      ],
      samples: [3, 5, 4, 2],
      timeDeltas: [1000, 2000, 3000, 4000],
    });
    expect(costs.get("scan")).toEqual({
      key: "scan",
      selfMs: 3,
      totalMs: 3,
    });
    expect(costs.get("write")?.selfMs).toBe(3);
    expect(costs.get("advance")).toEqual({
      key: "advance",
      selfMs: 4,
      totalMs: 10,
    });
  });

  it("ranks growth per Day, leaving V8's own bookkeeping out", () => {
    const costs = (entries: [string, number][]) =>
      new Map<string, FunctionCost>(
        entries.map(([key, ms]) => [key, { key, selfMs: ms, totalMs: ms }]),
      );
    const rows = costGrowth(
      {
        days: 365,
        costs: costs([
          ["scan", 365],
          ["write", 730],
          ["(program)", 10],
        ]),
      },
      {
        days: 366,
        costs: costs([
          ["scan", 3660],
          ["write", 732],
          ["(program)", 99999],
          ["new", 366],
        ]),
      },
      "selfMs",
    );
    expect(rows.map((row) => row.key)).toEqual(["scan", "new", "write"]);
    expect(rows[0]!.firstMsPerDay).toBe(1);
    expect(rows[0]!.lastMsPerDay).toBe(10);
    expect(rows[0]!.growthMsPerDay).toBe(9);
  });

  it("writes the table, the growth lists and the history counts", () => {
    const result: AgingResult = {
      options: {
        seed: "s",
        placeKey: DEFAULT_AGING_PLACE,
        years: 2,
        maxMinutes: 120,
        profileYears: [1, 2],
      },
      placeName: "Columbus, Ohio",
      openingMs: 2500,
      startedOn: date("2026-01-05"),
      opening: {
        saveBytes: 4 * 2 ** 20,
        saveMs: 300,
        saveCpuMs: 280,
        reopenMs: 400,
        reopenCpuMs: 380,
        historyCounts: { events: 600, claims: 0 },
      },
      years: [1, 2].map((year) => ({
        year,
        from: anniversary(date("2026-01-05"), year - 1),
        to: anniversary(date("2026-01-05"), year),
        days: 365,
        medianDayMs: 40 * year,
        p95DayMs: 90 * year,
        maxDayMs: 800,
        medianDayCpuMs: 30 * year,
        p95DayCpuMs: 70 * year,
        maxDayCpuMs: 700,
        yearSeconds: 20 * year,
        yearCpuSeconds: 15 * year,
        profiled: true,
        people: 800,
        saveBytes: 5 * 2 ** 20 * year,
        saveMs: 350,
        saveCpuMs: 330,
        reopenMs: 450,
        reopenCpuMs: 430,
        reopenedMatches: true,
        heapMiB: 900,
        loadAverage: 12,
        historyCounts: { events: 600 + 1000 * year, claims: 0 },
      })),
      stoppedEarly: null,
      profiles: {
        first: { year: 1, days: 365 },
        last: { year: 2, days: 365 },
        self: [
          {
            key: "scan (src/x.ts:1)",
            firstMsPerDay: 1,
            lastMsPerDay: 3,
            growthMsPerDay: 2,
          },
        ],
        total: [],
        lastYearTop: [{ key: "scan (src/x.ts:1)", selfMs: 3, totalMs: 4 }],
      },
      wallMinutes: 1,
      node: "v22",
    };
    const markdown = agingBenchmarkMarkdown(result);
    expect(markdown).toContain("## Day time, per game year");
    expect(markdown).toContain(
      "| 2* | 2027-01-05 to 2028-01-05 | 365 | 60 | 140 | 700 | 80 | 180 | 30 | 40 | 12 |",
    );
    expect(markdown).toContain(
      "| 2 | 2028-01-05 | 800 | 10 MiB | 330 | 350 | 430 | 450 | 900 |",
    );
    expect(markdown).toContain("`scan (src/x.ts:1)`");
    expect(markdown).toContain("| 1 | `scan (src/x.ts:1)` | 3.00 | 4.00 |");
    expect(markdown).toContain("| events | 600 | 1600 | 2600 |");
    expect(markdown).toContain("`claims`");
  });
});
