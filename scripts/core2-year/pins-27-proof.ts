/**
 * Pins family 27 (#9747): a law's reach comes from the people it reaches.
 * At three drawn places, a played year each: who of the households eligible
 * for home energy aid (the law in force on day one in most states) and for
 * child care aid (turned on through dev mode's own law call) take it up, by
 * household income, and the share of a schools change that becomes pay, read
 * from each government's books.
 * Run: node --import tsx scripts/core2-year/pins-27-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { rowsOf } from "../../src/core2/law-reach/group-b-store";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const out = (line: string) => process.stdout.write(`${line}\n`);
out(`Pins family 27 proof, seed ${seed}`);

for (let draw = 0; draw < 3; draw += 1) {
  const place = drawPlace(seed, `pins-27-proof:${draw}`);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  out(`\n== ${place.name} (${place.key}), place seed ${place.seed}`);
  // Child care aid at 85 percent of the state median income a month for three
  // (the CCDF ceiling), through dev mode's own law call.
  try {
    dev.setLaw({
      level: "state",
      series: "child-care-income-limit",
      value: 5000,
    });
    out("child care aid turned on through dev mode's law call");
  } catch (error) {
    out(`child care aid not set: ${(error as Error).message}`);
  }
  dev.advance(addDays(makeIsoDate(core.date), 365));
  // Who took each program up, from the game's own case rows (`takesUp`
  // keeps one per household and program, weighted by the households a
  // counted row stands for), by the town's income fifth.
  const cases = rowsOf<{
    key: string;
    incomeMonthlyMinor: number;
    scale: number;
    takesUp: boolean;
    replaced: number;
  }>(api, "takeUps");
  for (const key of [...new Set(cases.map((c) => c.key))].sort()) {
    const rows = cases.filter((c) => c.key === key);
    const incomes = rows.map((c) => c.incomeMonthlyMinor).sort((a, b) => a - b);
    const fifth = (income: number) =>
      Math.min(
        4,
        Math.floor((5 * incomes.indexOf(income)) / Math.max(1, incomes.length)),
      );
    const by = new Map<number, { all: number; took: number }>();
    let all = 0,
      took = 0;
    for (const c of rows) {
      all += c.scale;
      if (c.takesUp) took += c.scale;
      const f = by.get(fifth(c.incomeMonthlyMinor)) ?? { all: 0, took: 0 };
      f.all += c.scale;
      if (c.takesUp) f.took += c.scale;
      by.set(fifth(c.incomeMonthlyMinor), f);
    }
    out(
      `${key}: ${Math.round(took)} of ${Math.round(all)} eligible households take it up (${((100 * took) / Math.max(1, all)).toFixed(0)}%); by income fifth among the eligible: ${[
        ...by,
      ]
        .sort((x, y) => x[0] - y[0])
        .map(
          ([f, r]) =>
            `${f + 1}: ${((100 * r.took) / Math.max(1, r.all)).toFixed(0)}% of ${Math.round(r.all)}`,
        )
        .join(", ")}`,
    );
  }
  const applied = (
    api
      .moduleState("core2-law-effects-v1")
      .table("applied")
      .rows() as unknown as {
      key: string;
      what: string;
      count?: number;
      amountMinor?: number;
      targetId: string;
    }[]
  ).filter((r) =>
    /energy-assistance-paid|child-care-paid|preschool-paid|ssi-paid/.test(
      r.what,
    ),
  );
  const byWhat = new Map<
    string,
    { rows: number; count: number; minor: number }
  >();
  for (const r of applied) {
    const row = byWhat.get(r.what) ?? { rows: 0, count: 0, minor: 0 };
    row.rows += 1;
    row.count += r.count ?? 1;
    row.minor += r.amountMinor ?? 0;
    byWhat.set(r.what, row);
  }
  out(
    `applied rows: ${[...byWhat].map(([what, r]) => `${what}: ${r.rows} rows for ${r.count} households, $${(r.minor / 100).toFixed(0)} a month`).join("; ") || "none"}`,
  );
  const services = rowsOf<{
    id: string;
    terms?: Record<string, number>;
  }>(api, "groups");
  for (const g of services.filter(
    (row) => row.terms?.compensationShare !== undefined,
  ))
    out(
      `${g.id}: share of the line that is pay, from the books: ${g.terms!.compensationShare!.toFixed(3)}`,
    );
}
