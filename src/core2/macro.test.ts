/** M1-02 module checks on a small recorded fixture; the generated-world proof is tooling/macro-proof.ts. */
import { describe, expect, it } from "vitest";
import { advanceCore } from "./life";
import { coreAPI, createCore } from "./state";
import {
  MACRO_MODULE,
  linkCreditLineToPrime,
  macroCoreData,
  withCentralBank,
} from "./modules/macro";
import { checkBands, historyMonths, stepMacroMonth } from "./macro-model";
import {
  experiencedInflationPct,
  votersOn,
  generateBoard,
} from "./central-bank-board";
import { parameter } from "./parameters";
import type { CoreInput, Source } from "./types";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation: "Technical fixture records.",
  estimatedFrom: "Macro module fixture only.",
};
const place = "place:macro-fixture";
function opening(startedAt = "2021-01-01"): CoreInput {
  return withCentralBank({
    seed: "macro-fixture",
    startedAt,
    people: [],
    households: [],
    jobs: [],
    organizations: ["organization:shop", "organization:bank"].map((id) => ({
      id,
      name: id,
      placeId: place,
      kind: "employer",
      liquidMinor: 1_000_000,
      source: { ...source, asOf: startedAt },
    })),
    finance: {
      contracts: [],
      facilities: [
        {
          id: "facility:shop-line",
          borrowerId: "organization:shop",
          lenderId: "organization:bank",
          limitMinor: 500_000,
          active: true,
          annualInterestParameter: "zero",
          source: { ...source, asOf: startedAt },
        },
      ],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  });
}

describe("national economy", () => {
  it("opens on the real figures of the last month before the start", () => {
    const rows = historyMonths("2021-01-01", p);
    expect(rows).toHaveLength(13);
    expect(rows.at(-1)).toMatchObject({
      month: "2020-12",
      unemploymentPct: 6.7,
    });
  });
  it("keeps a simulated year's own 12-month changes inside the 1990-2026 bands", () => {
    for (const start of ["2021-01-01", "2026-10-01", "2008-10-01"]) {
      const months = historyMonths(start, p);
      for (let i = 0; i < 24; i++)
        months.push(
          stepMacroMonth(months.at(-1)!, months.at(-1)!.policyRatePct, 0, 0, p),
        );
      const own = checkBands(months, p).filter((row) => !row.baseIsHistory);
      expect(own.length).toBeGreaterThan(30);
      expect(own.filter((row) => !row.inside)).toEqual([]);
    }
  });
  it("a higher rate lowers output and raises unemployment, with no draws", () => {
    const start = historyMonths("2026-10-01", p).at(-1)!;
    const run = (rate: number) => {
      let row = start;
      for (let i = 0; i < 12; i++) row = stepMacroMonth(row, rate, 0, 0, p);
      return row;
    };
    expect(run(5).unemploymentPct).toBeGreaterThan(run(3).unemploymentPct);
    expect(run(5).mortgage30Pct).toBeGreaterThan(run(3).mortgage30Pct);
    expect(run(4)).toEqual(run(4));
  });
});

describe("the board", () => {
  it("seats seven governors and twelve presidents, twelve voting, leaning by lived inflation", () => {
    const board = generateBoard({ seed: "s", startedAt: "2021-01-01" }, p);
    expect(board.members).toHaveLength(19);
    expect(votersOn("2021-03-17", board.members)).toHaveLength(12);
    const older = experiencedInflationPct(1950, 2021, p),
      younger = experiencedInflationPct(1975, 2021, p);
    expect(older).toBeGreaterThan(younger);
    const sorted = [...board.members].sort(
      (a, b) => a.experiencedInflationPct - b.experiencedInflationPct,
    );
    expect(sorted.at(-1)!.inflationLean).toBeGreaterThan(
      sorted[0]!.inflationLean,
    );
    expect(generateBoard({ seed: "s", startedAt: "2021-01-01" }, p)).toEqual(
      board,
    );
  });
  it("publishes monthly conditions, records every vote with its reasons, and reprices a linked line on the effective date", () => {
    const core = createCore(opening("2026-10-01"), {
        data,
        modules: [MACRO_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2026-10-01");
    linkCreditLineToPrime(api, "facility:shop-line", 1.5, {
      ...source,
      asOf: "2026-10-01",
    });
    const opened =
      core.finance.facilities.get("facility:shop-line")!.annualInterestRate!;
    advanceCore(core, "2026-12-31");
    const store = api.moduleState("macro");
    const conditions = core.finance.conditionsByPlace.get(place)!;
    expect(conditions.map((row) => row.at)).toEqual([
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
    const meetings = ["meeting:2026-11-04", "meeting:2026-12-16"].map(
      (id) =>
        store.table("meetings").get(id)! as unknown as {
          toRatePct: number;
          fromRatePct: number;
          effectiveAt: string;
        },
    );
    for (const id of ["meeting:2026-11-04", "meeting:2026-12-16"]) {
      const votes = store.table("votes").query("byMeeting", [id]);
      expect(votes).toHaveLength(12);
      for (const vote of votes)
        expect(vote).toMatchObject({
          pulls: expect.any(Object),
          desiredRatePct: expect.any(Number),
        });
    }
    const repricings = store
      .table("repricings")
      .query("byFacility", ["facility:shop-line"]);
    const moved = meetings.filter((row) => row.toRatePct !== row.fromRatePct);
    expect(repricings).toHaveLength(moved.length);
    for (const [i, row] of moved.entries())
      expect(repricings[i]).toMatchObject({ date: row.effectiveAt });
    const line = core.finance.facilities.get("facility:shop-line")!;
    expect(line.annualInterestRate).toBeCloseTo(
      (meetings.at(-1)!.toRatePct + p("macroPrimeSpreadPct") + 1.5) / 100,
    );
    if (moved.length) expect(line.annualInterestRate).not.toBe(opened);
  });
});

describe("history before the start (M1-14, the economy's part)", () => {
  it("opens a 2026 world with every real month since January 2021", async () => {
    const history = (
      await import("./data/macro/history.json", { with: { type: "json" } })
    ).default;
    const rows = historyMonths("2026-10-01", p);
    expect(rows[0]!.month).toBe("2021-01");
    expect(rows.at(-1)!.month).toBe("2026-09");
    expect(rows).toHaveLength(69);
    const real = new Map(history.monthly.map((row) => [row.month, row]));
    for (const row of rows) {
      const source = real.get(row.month)!;
      if (source.unemploymentPct !== undefined)
        expect(row.unemploymentPct).toBe(source.unemploymentPct);
      if (source.payrollJobsThousands !== undefined)
        expect(row.payrollJobsThousands).toBe(source.payrollJobsThousands);
    }
  });
});
