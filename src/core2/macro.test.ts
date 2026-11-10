/** M1-02 module checks on a small recorded fixture; the generated-world proof is tooling/macro-proof.ts. */
import { describe, expect, it } from "vitest";
import { registerBoardAppointer } from "./central-bank-appointments";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI, createCore } from "./state";
import {
  MACRO_MODULE,
  countryOutlook,
  countryStates,
  linkCreditLineToPrime,
  macroCoreData,
  withCentralBank,
} from "./modules/macro";
import {
  checkBands,
  historyMonths,
  countryMacroMonth,
  macroWorldOffsets,
  publishedMonths,
  type MacroMonth,
} from "./macro-model";
import {
  experiencedInflationPct,
  votersOn,
  generateBoard,
  BOARD,
} from "./central-bank-board";
import { medianTransactionBalance } from "./starting-cash";
import { parameter } from "./parameters";
import type { CoreInput, Source } from "./types";
import { readFileSync } from "node:fs";
import pmms from "../../data/research/macro/series/pmms-monthly.json" with { type: "json" };

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation: "Technical fixture records.",
  estimatedFrom: "Macro module fixture only.",
};
const place = "place:macro-fixture";
function opening(startedAt = "2021-01-01", seed = "macro-fixture"): CoreInput {
  return withCentralBank({
    seed,
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
  it("calibrates on the published figures of the last month before the start", () => {
    const rows = publishedMonths("2021-01-01", p);
    expect(rows).toHaveLength(13);
    expect(rows.at(-1)).toMatchObject({
      month: "2020-12",
      unemploymentPct: 6.7,
    });
  });
  it("a simulated two years follows from the states' sum; the 1990-2026 bands are reported beside it", () => {
    // The module's own months from published openings, and from drawn worlds on the game's start date.
    const worlds: [string, string][] = [
      ["2021-01-01", "macro-fixture"],
      ["2026-10-01", "world-a"],
      ["2025-01-20", "world-b"],
    ];
    for (const [start, seed] of worlds) {
      const where = `start ${start} seed ${seed}`;
      const core = createCore(opening(start, seed), {
        data,
        modules: [MACRO_MODULE],
      });
      advanceCore(core, `${Number(start.slice(0, 4)) + 2}${start.slice(4)}`);
      const months = [
        ...coreAPI(core).moduleState("macro").table("months").rows(),
      ].sort((a, b) =>
        String(a.month).localeCompare(String(b.month)),
      ) as unknown as MacroMonth[];
      // Every simulated month follows from the one before it: the normal rate
      // and expected inflation move toward what was lived, never away.
      const simulated = months.filter((row) => row.kind === "simulated");
      expect(simulated.length, where).toBeGreaterThan(12);
      for (const row of simulated) {
        const before = months[months.indexOf(row) - 1]!;
        const lived = before.unemploymentPct - before.naturalUnemploymentPct;
        const moved =
          row.naturalUnemploymentPct - before.naturalUnemploymentPct;
        expect(Math.sign(moved) * Math.sign(lived) >= 0, where).toBe(true);
        const lessons = before.inflationPct - before.expectedInflationPct;
        const learned = row.expectedInflationPct - before.expectedInflationPct;
        expect(Math.sign(learned) * Math.sign(lessons) >= 0, where).toBe(true);
      }
      // The real 1990-2026 band, beside the causes, as a comparison line only.
      const own = checkBands(months, p).filter((row) => !row.baseIsHistory);
      const outside = own.filter((row) => !row.inside);
      console.log(
        `macro bands ${where}: ${own.length - outside.length} of ${own.length} 12-month changes inside the real band${
          outside.length
            ? `; outside: ${outside
                .map((row) => JSON.stringify(row))
                .slice(0, 3)
                .join(" ")}`
            : ""
        }`,
      );
    }
  });
  it("the 2020 spike raised the normal rate on the record, and the opening month sits below trend", () => {
    const months = publishedMonths("2021-01-01", p);
    const at = (month: string) => months.find((row) => row.month === month)!;
    const spikeBefore = at("2019-12");
    const opening = months.at(-1)!;
    // The spike lived through 2020 moved the normal rate up from where it stood.
    expect(opening.naturalUnemploymentPct).toBeGreaterThan(
      spikeBefore.naturalUnemploymentPct,
    );
    // Unemployment above the normal rate is a negative gap on the record.
    expect(opening.outputGapPct).toBeLessThan(0);
  });
  it("the country tier holds every state as counts, and the national row is their sum", () => {
    const seed = `tier-${Math.random().toString(36).slice(2, 10)}`;
    const core = createCore(opening("2026-10-01", seed), {
        data,
        modules: [MACRO_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2026-12-31");
    const where = `seed ${seed}`;
    const states = countryStates(api);
    expect(states, where).toHaveLength(56);
    expect(
      api.moduleState("macro").table("countryStates").rows(),
      where,
    ).toHaveLength(56);
    const latest = api
      .moduleState("macro")
      .table("months")
      .rows()
      .filter((row) => row.kind === "simulated")
      .sort((a, b) => String(a.month).localeCompare(String(b.month)))
      .at(-1)!;
    let workers = 0,
      seekers = 0;
    for (const state of states)
      for (const cell of state.cells) {
        workers += cell.workers;
        seekers += cell.seekers;
      }
    expect(workers, where).toBeGreaterThan(0);
    expect(
      Number(latest.unemploymentPct),
      `${where} ${latest.month}`,
    ).toBeCloseTo((100 * seekers) / (workers + seekers), 6);
  });
  it("the outlook is the months the game then lives, and it writes nothing", () => {
    const seed = `outlook-${Math.random().toString(36).slice(2, 10)}`;
    const core = createCore(opening("2025-01-20", seed), {
        data,
        modules: [MACRO_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2025-01-21");
    const where = `seed ${seed}`;
    const kept = () => JSON.stringify(api.moduleState("macro").snapshot());
    const before = kept();
    const years = 3;
    const outlook = countryOutlook(api, years * 12);
    // Read-only: the same tables, the same day.
    expect(kept(), where).toBe(before);
    expect(core.date, where).toBe("2025-01-21");
    expect(outlook.nation, where).toHaveLength(years + 1);
    expect(Object.keys(outlook.states), where).toHaveLength(56);
    expect(outlook.monthsWithProblems, where).toBe(0);
    expect(outlook.moneyDrift, where).toBeLessThan(1e-9);
    // With nothing else changing, the world then plays the same months.
    advanceCore(core, "2028-01-31");
    const lived = new Map(
      (
        api
          .moduleState("macro")
          .table("months")
          .rows() as unknown as MacroMonth[]
      ).map((row) => [row.month, row]),
    );
    for (const point of outlook.nation) {
      const row = lived.get(point.month)!;
      expect(row, `${where} ${point.month}`).toBeDefined();
      expect(point.unemploymentPct, `${where} ${point.month}`).toBeCloseTo(
        row.unemploymentPct,
        6,
      );
      expect(point.inflationPct, `${where} ${point.month}`).toBeCloseTo(
        row.inflationPct,
        6,
      );
      expect(point.hourlyPay, `${where} ${point.month}`).toBeCloseTo(
        row.hourlyEarnings,
        6,
      );
    }
    // Each state's last point is the state as the tier then keeps it.
    const last = outlook.nation.at(-1)!.month;
    expect(last, where).toBe("2028-01");
    for (const state of countryStates(api)) {
      const point = outlook.states[state.usps]!.at(-1)!;
      let people = state.children;
      for (const cell of state.cells) people += cell.people;
      expect(point.people, `${where} ${state.usps}`).toBeCloseTo(people, 3);
      expect(point.budgetYear, `${where} ${state.usps}`).toBeCloseTo(
        state.ledger.budgetYear,
        0,
      );
    }
  });
  it("a higher policy rate raises the long rates the bank quotes, with no draws", () => {
    const start = historyMonths("2026-10-01", "seed-a", p).at(-1)!;
    const nation = {
      unemploymentPct: start.unemploymentPct,
      priceIndex: 1,
      jobs: 1,
      hourlyPay: 1,
      realOutput: 1,
      busy: 0,
    };
    const run = (rate: number) => {
      let row = start;
      for (let i = 0; i < 12; i++)
        row = countryMacroMonth(
          row,
          { row: start, nation },
          nation,
          undefined,
          rate,
          p,
        );
      return row;
    };
    expect(run(5).mortgage30Pct).toBeGreaterThan(run(3).mortgage30Pct);
    expect(run(5).treasury10Pct).toBeGreaterThan(run(3).treasury10Pct);
    expect(run(4)).toEqual(run(4));
  });
  it("carries no fiscal multiplier or budget impulse: output moves with the money actually paid and spent (owner, Oct 16)", () => {
    const keys = Object.keys(data.parameters).filter((key) =>
      /multiplier|budgetimpulse/i.test(key),
    );
    expect(keys).toEqual([]);
    const start = historyMonths("2026-10-01", "seed-a", p).at(-1)!;
    const nation = {
      unemploymentPct: start.unemploymentPct,
      priceIndex: 1,
      jobs: 1,
      hourlyPay: 1,
      realOutput: 1,
      busy: 0,
    };
    const row = countryMacroMonth(
      start,
      { row: start, nation },
      nation,
      undefined,
      4,
      p,
    ) as unknown as Record<string, unknown>;
    expect(
      Object.keys(row).filter((key) => /budget|fiscal/i.test(key)),
    ).toEqual([]);
  });
});

describe("the 30-year mortgage rate since June 2019", () => {
  // FHFA's MIRS Transition Index by release date, as downloaded.
  const index = new Map<string, number>();
  for (const line of readFileSync(
    new URL(
      "../../data/research/macro/series/mirs-transition-index.csv",
      import.meta.url,
    ),
    "utf8",
  )
    .split(/\r?\n/)
    .slice(1)) {
    const [date, value] = line.split(",");
    if (!date || !value) continue;
    const [month, , year] = date.split("/").map(Number) as [
      number,
      number,
      number,
    ];
    // Each value measures the month two before its release.
    const at = year * 12 + month - 1 - 2;
    index.set(
      `${Math.floor(at / 12)}-${String((at % 12) + 1).padStart(2, "0")}`,
      Number(value),
    );
  }
  // The opening reads back a window of months: openings a year apart cover
  // every month from June 2019 to the last recorded one.
  const byMonth = new Map(
    ["2020-01-01", "2021-01-01", "2022-01-01", "2026-10-20"]
      .flatMap((start) => publishedMonths(start, p))
      .filter((row) => row.month >= "2019-06")
      .map((row) => [row.month, row]),
  );
  const months = [...byMonth.values()].sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  it("reads FHFA's index for every month it covers, and the Treasury plus the spread only where it has not published", () => {
    expect(months[0]!.month).toBe("2019-06");
    expect(months.at(-1)!.month).toBe("2026-09");
    expect(months.length).toBe(88);
    const fallback: string[] = [];
    for (const row of months) {
      const published = index.get(row.month);
      if (published !== undefined) {
        expect(row.mortgage30Pct, row.month).toBe(published);
        continue;
      }
      fallback.push(row.month);
      expect(row.mortgage30Pct, row.month).toBeCloseTo(
        row.treasury10Pct + p("macroMortgageSpreadOverTreasuryPct"),
        10,
      );
    }
    // Only the months FHFA has not measured yet: none from June 2019 to July 2026.
    expect(fallback).toEqual(["2026-08", "2026-09"]);
  });

  it("names each month that moved from the excluded Freddie Mac survey, and by how much", () => {
    const moved = months
      .filter((row) => index.has(row.month))
      .map((row) => ({
        month: row.month,
        by: row.mortgage30Pct - (pmms as Record<string, number>)[row.month]!,
      }))
      .filter((row) => Math.abs(row.by) > 1e-9);
    process.stdout.write(
      `MORTGAGE moved ${moved.length} months: ${moved.map((row) => `${row.month} ${row.by >= 0 ? "+" : ""}${row.by.toFixed(2)}`).join(", ")}\n`,
    );
    expect(moved.length).toBe(82);
    // Within the spread recorded on the series.
    for (const row of moved) {
      expect(row.by, row.month).toBeGreaterThanOrEqual(-0.33 - 1e-9);
      expect(row.by, row.month).toBeLessThanOrEqual(0.27 + 1e-9);
    }
  });
});

describe("the board", () => {
  it("opens every member with the cash a family at the seat's pay keeps, from the SCF, never an empty wallet", () => {
    const seed = `board-cash-${Math.random().toString(36).slice(2, 10)}`;
    const board = generateBoard({ seed, startedAt: "2021-01-01" }, p);
    expect(board.people).toHaveLength(19);
    const expected = Math.round(
      medianTransactionBalance(BOARD.memberPay.annualDollars, seed) * 100,
    );
    for (const person of board.people)
      expect(person.liquidMinor, `${person.id} (seed ${seed})`).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });
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
    const simulated = store
      .table("months")
      .rows()
      .filter((row) => row.kind === "simulated");
    expect(simulated.length).toBeGreaterThan(0);
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

describe("each world's own economy (owner, Oct 27: realistic, not real)", () => {
  const FIGURES = [
    "unemploymentPct",
    "inflationPct",
    "payrollJobsThousands",
    "hourlyEarnings",
    "realOutput",
    "policyRatePct",
    "treasury10Pct",
    "mortgage30Pct",
  ] as const;
  it("opens two worlds on different months, neither the published one, each inside its spread", () => {
    const start = "2025-01-20";
    const published = publishedMonths(start, p);
    const a = historyMonths(start, "world-a", p);
    const b = historyMonths(start, "world-b", p);
    expect(a.map((row) => row.month)).toEqual(
      published.map((row) => row.month),
    );
    for (const [i, real] of published.entries())
      for (const key of FIGURES) {
        expect(a[i]![key], `${real.month} ${key}`).not.toBe(real[key]);
        expect(a[i]![key], `${real.month} ${key}`).not.toBe(b[i]![key]);
      }
    const open = a.at(-1)!,
      real = published.at(-1)!;
    const o = macroWorldOffsets("world-a", p);
    const floor = parameter("worldDrawOffsetFloorShare");
    for (const [moved, spread] of [
      [
        open.unemploymentPct - real.unemploymentPct,
        "macroWorldUnemploymentSpreadPoints",
      ],
      [
        open.inflationPct - real.inflationPct,
        "macroWorldInflationSpreadPoints",
      ],
      [
        open.policyRatePct - real.policyRatePct,
        "macroWorldPolicyRateSpreadPoints",
      ],
      [
        open.mortgage30Pct - real.mortgage30Pct,
        "macroWorldLongRateSpreadPoints",
      ],
    ] as const) {
      expect(Math.abs(moved), spread).toBeGreaterThanOrEqual(
        floor * p(spread) - 0.05,
      );
      expect(Math.abs(moved), spread).toBeLessThanOrEqual(p(spread) + 0.05);
    }
    // Said to one decimal, as the address says it, the opening rate is not the published one.
    expect(open.unemploymentPct.toFixed(1)).not.toBe(
      real.unemploymentPct.toFixed(1),
    );
    expect(Math.abs(o.unemploymentPoints)).toBeGreaterThan(0);
  });
  it("draws the same months again from the same seed", () => {
    expect(historyMonths("2025-01-20", "world-a", p)).toEqual(
      historyMonths("2025-01-20", "world-a", p),
    );
  });
});

describe("history before the start (M1-14, the economy's part)", () => {
  it("calibrates a 2026 world on every published month since January 2021", async () => {
    const history = (
      await import("./data/macro/history.json", { with: { type: "json" } })
    ).default;
    const rows = publishedMonths("2026-10-01", p);
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
  it("leaves a member in place while no one names a successor, then fills the seat once an appointer does", () => {
    const run = (appointer: boolean) => {
      // The world's own appointer is the president and Senate (the
      // government opens it); this test world has no government, so it
      // names the first candidate itself.
      registerBoardAppointer(
        appointer ? () => ({ index: 0, reasons: {} }) : undefined,
      );
      try {
        const core = createLifeCore(opening("2021-01-01"), {
            data,
            modules: [MACRO_MODULE],
          }),
          api = coreAPI(core);
        advanceCore(core, "2021-01-02");
        const members = () =>
          api.moduleState("macro").table("members").query("all", [true]);
        const before = members().find((row) => row.seatId === "governor:1")!;
        advanceCore(core, "2022-03-01");
        return {
          before,
          after: members().find((row) => row.seatId === "governor:1")!,
        };
      } finally {
        registerBoardAppointer(undefined);
      }
    };
    const none = run(false);
    expect(none.after.personId).toBe(none.before.personId);
    const named = run(true);
    expect(named.after.personId).not.toBe(named.before.personId);
  });
  it("fills a governor's seat when the term ends and reappoints reserve bank presidents under the retirement age", () => {
    registerBoardAppointer(() => ({ index: 0, reasons: {} }));
    const core = createLifeCore(opening("2021-01-01"), {
        data,
        modules: [MACRO_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const members = () =>
      api.moduleState("macro").table("members").query("all", [true]);
    const before = new Map(members().map((row) => [row.seatId, row]));
    advanceCore(core, "2022-03-01");
    const after = members();
    expect(after).toHaveLength(19);
    for (const row of after)
      expect(String(row.termEndsAt) >= core.date).toBe(true);
    // Governor seat 1's term ended January 31, 2022: a new member for 14 years.
    const seat = after.find((row) => row.seatId === "governor:1")!;
    expect(seat.personId).not.toBe(before.get("governor:1")!.personId);
    expect(seat).toMatchObject({
      appointedAt: "2022-02-01",
      termEndsAt: "2036-01-31",
    });
    expect(core.people.get(String(seat.personId))).toBeTruthy();
    expect(
      core.eventIds.has(
        `event:economy.board-appointment:2022-02-01:governor:1`,
      ),
    ).toBe(true);
    // Presidents' five-year terms ran to February 28, 2021: each is reappointed or replaced at 65.
    for (const row of after.filter((r) => r.seatKind === "president")) {
      expect(row.termEndsAt).toBe("2026-02-28");
      const old = before.get(String(row.seatId))!;
      const person = core.people.get(String(old.personId))!;
      const age = 2021 - Number(person.birthDate.slice(0, 4));
      if (row.personId === old.personId) expect(age).toBeLessThanOrEqual(65);
    }
    const leans = after.map((row) => Number(row.inflationLean));
    expect(Math.min(...leans)).toBeLessThan(0);
    expect(Math.max(...leans)).toBeGreaterThan(0);
    registerBoardAppointer(undefined);
  });
});

describe("a custom world's economy (M6-04)", () => {
  it("opens on the player's chosen national figures and runs by the same rules from there", () => {
    const base = opening("2021-01-01");
    const core = createCore(
        {
          ...base,
          placeMetadata: {
            ...base.placeMetadata,
            customEconomy: JSON.stringify({
              unemploymentPct: 9,
              inflationPct: 4,
              policyRatePct: 3,
            }),
          },
        },
        { data, modules: [MACRO_MODULE] },
      ),
      api = coreAPI(core);
    advanceCore(core, "2021-03-15");
    const months = [...api.moduleState("macro").table("months").rows()].sort(
      (a, b) => String(a.month).localeCompare(String(b.month)),
    );
    const opened = months.find((row) => row.month === "2020-12")!;
    expect(opened).toMatchObject({
      unemploymentPct: 9,
      inflationPct: 4,
      policyRatePct: 3,
    });
    // Okun's law: output sits below trend for unemployment above its natural rate.
    expect(Number(opened.outputGapPct)).toBeLessThan(0);
    const latest = months.at(-1)!;
    expect(latest.kind).toBe("simulated");
    expect(Number(latest.unemploymentPct)).toBeGreaterThan(8);
  });
});
