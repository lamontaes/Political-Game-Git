/**
 * Trace on a state's record opens what moved its month (country-model.ts `whatMoved`, read by
 * dev-why.ts): two worlds of the same drawn place and seed run in dev mode, one with the
 * state's income tax ended on the first day by a real law row. Trace on the state's record
 * in both names, under taxes withheld, the law row that changed, and its jobs lines differ by
 * sector. The place is drawn from every state that has an income tax to end; the place and
 * seed are named in every message (DEV_STATE_TRACE_SEED replays one, DEV_STATE_TRACE_DAYS
 * shortens the run).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { placeLocalities, placeStateKeys } from "../core2/places";
import { LAWS_MODULE_ID, stateOpeningLawRows } from "../core2/modules/laws";
import { countryStates } from "../core2/modules/macro";
import { coreAPI } from "../core2/state";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { findRecord, traceNode } from "./dev-trace";
import type { WhyPanel } from "./dev-why";

const seed = process.env.DEV_STATE_TRACE_SEED ?? randomBytes(8).toString("hex");
const DAYS = Number(process.env.DEV_STATE_TRACE_DAYS ?? 365);
const start = gameStartDate();

/** Localities of every state whose starting law has a state income tax above zero. */
const taxed = new Set(
  placeStateKeys()
    .filter((stateKey) =>
      stateOpeningLawRows(stateKey, start).some(
        (row) =>
          row.series === "income-tax" &&
          row.level === "state" &&
          typeof row.value === "number" &&
          row.value > 0,
      ),
    )
    .flatMap((stateKey) => placeLocalities(stateKey).map((row) => row.key)),
);
const place = drawPlace(seed, "dev-state-trace", (key) => taxed.has(key));
const where = `${place.name} (${place.key}, seed ${seed})`;

/** One world a year on, with or without the state's income tax ended on day one: Trace on its state's record. */
function traced(endTheTax: boolean) {
  const world = buildBenchWorld(place.seed, start, {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  const ended = endTheTax
    ? dev.setLaw({ level: "state", series: "income-tax", repeal: true }).law.id
    : undefined;
  dev.advance(
    new Date(Date.parse(`${core.date}T00:00:00Z`) + DAYS * 864e5)
      .toISOString()
      .slice(0, 10),
  );
  const state = countryStates(coreAPI(core)).find(
    (row) => row.key === place.state,
  );
  if (!state)
    throw new Error(`${where}: no country tier row for ${place.state}`);
  const node = traceNode(core, world.director, state.id);
  return { core, ended, node, panels: node.why };
}

const panel = (panels: readonly WhyPanel[], starts: string) => {
  const found = panels.find((row) => row.title.startsWith(starts));
  if (!found) throw new Error(`${where}: no "${starts}" panel in the trace`);
  return found;
};
const print = (label: string, panels: readonly WhyPanel[]) =>
  process.stdout.write(
    `${where} · ${label}\n${panels
      .map(
        (p) =>
          `  ${p.title}\n${p.rows.map((r) => `    ${r.label}: ${r.value}${r.id ? ` [${r.id}]` : ""}`).join("\n")}`,
      )
      .join("\n")}\n`,
  );

describe("Trace on a state's record", () => {
  it("names the law row that changed under taxes withheld, and its jobs differ by sector", () => {
    const left = traced(false);
    const ended = traced(true);
    print("left alone", left.panels);
    print("state income tax ended on day one", ended.panels);
    expect(ended.node.engine, where).toBe("macro.countryStates");
    expect(left.node.engine, where).toBe("macro.countryStates");

    const endedTaxes = panel(ended.panels, "Taxes withheld").rows;
    const leftTaxes = panel(left.panels, "Taxes withheld").rows;
    // The row that ended the tax is the law read, at nothing withheld; the world left alone never read it.
    const repeal = endedTaxes.find((row) => row.id === ended.ended);
    expect(
      repeal,
      `${where}: the repeal row ${ended.ended} is not named`,
    ).toBeDefined();
    expect(repeal!.value, where).toBe("$0.00");
    expect(
      leftTaxes.some((row) => row.id === ended.ended),
      `${where}: the world left alone names the repeal row`,
    ).toBe(false);
    // The world left alone withholds under its own state row, and that row opens in the trace.
    const own = leftTaxes.filter(
      (row) =>
        row.label.startsWith("withheld under the state law") &&
        row.value !== "$0.00",
    );
    expect(
      own.length,
      `${where}: no state income tax withheld when left alone`,
    ).toBeGreaterThan(0);
    expect(
      endedTaxes.some((row) => row.id === own[0]!.id),
      `${where}: the ended world still withholds under ${own[0]!.id}`,
    ).toBe(false);
    // Each law a line names opens that law: the line's record is the laws engine's row.
    for (const [world, row] of [
      [ended, repeal!],
      [left, own[0]!],
    ] as const)
      expect(
        findRecord(world.core, row.id!)?.engine,
        `${where}: ${row.id} does not open a law`,
      ).toBe(`${LAWS_MODULE_ID}.laws`);
    // Every panel has its lines.
    for (const p of [...ended.panels, ...left.panels])
      expect(p.rows.length, `${where}: ${p.title}`).toBeGreaterThan(0);

    // The jobs lines differ by sector between the two worlds.
    const jobsOf = (panels: readonly WhyPanel[]) =>
      new Map(
        panel(panels, "Jobs in").rows.map((row) => [row.label, row.value]),
      );
    const endedJobs = jobsOf(ended.panels);
    const leftJobs = jobsOf(left.panels);
    expect(endedJobs.size, where).toBe(leftJobs.size);
    const differ = [...leftJobs].filter(
      ([sector, value]) => endedJobs.get(sector) !== value,
    );
    process.stdout.write(
      `${where}: ${differ.length} of ${leftJobs.size} sectors' jobs lines differ\n`,
    );
    expect(
      differ.length,
      `${where}: no sector's jobs line differs`,
    ).toBeGreaterThan(0);
  }, 3_600_000);
});
