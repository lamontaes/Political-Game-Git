import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { MacroMonth } from "./macro-model";
import type { CountryState } from "./country-model";
import { MACRO_MODULE_ID } from "./modules/macro";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/**
 * The behavior test behind the no-steering guard (tests/guards/no-steering.test.ts) (owner, Nov 8: real ranges
 * are not targets). Two identical worlds; in one, on day one, a measure is
 * pushed off its value. After a year the gap may close only if something the
 * world recorded explains it. Nothing here names a place's real range: the
 * test asks only whether the gap closed with nothing different between the
 * worlds besides the push itself.
 *
 * The causes it accepts are the records a measure answers to: the central
 * bank's policy rate (a recorded vote) for the national economy. A gap that
 * closes while the policy rate is the same in both worlds closed by a pull.
 */

const SEED = "no-steering-behavior";
const PUSH = 3;

function months(core: CoreState): MacroMonth[] {
  return (
    coreAPI(core)
      .moduleState(MACRO_MODULE_ID)
      .table("months")
      .rows() as unknown as MacroMonth[]
  )
    .filter((row) => row.kind === "simulated" || row.kind === "history")
    .sort((a, b) => a.month.localeCompare(b.month));
}

function world() {
  setBookkeeping(false);
  return buildBenchWorld(SEED, gameStartDate(), { twoLevel: true }).core;
}

/** Lay off PUSH points of every state's labor force on day one: workers become seekers and their firms' jobs go with them. */
function layOff(core: CoreState): void {
  const table = coreAPI(core)
    .moduleState(MACRO_MODULE_ID)
    .table("countryStates");
  for (const row of table.rows()) {
    const state = structuredClone(row) as unknown as CountryState;
    let before = 0,
      after = 0;
    for (const cell of state.cells) {
      before += cell.workers;
      const out = (PUSH / 100) * (cell.workers + cell.seekers);
      cell.workers -= out;
      cell.seekers += out;
      after += cell.workers;
    }
    for (const sector of state.sectors) sector.jobs *= after / before;
    table.put(state as unknown as { id: string });
  }
}

describe("a pushed value does not drift back by itself", () => {
  // The country tier keeps unemployment as counts (workers and seekers by
  // state); the national row is their sum, so a push is laid on the counts.
  // The cause it accepts is the central bank's recorded vote (the policy
  // rate); this test asks whether the gap closes with the policy rate the
  // same in both worlds.
  it("national unemployment pushed up three points on day one stays apart where the policy rate is the same", () => {
    // One world at a time, so only one is held in memory.
    const year = (push: boolean) => {
      const core = world();
      // The country tier opens on the first step.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      if (push) layOff(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      return { ...months(core).at(-1)! };
    };
    const a = year(true);
    const b = year(false);
    const gapStart = PUSH;
    const gapEnd = a.unemploymentPct - b.unemploymentPct;
    const note = `unemployment gap ${gapStart} to ${gapEnd.toFixed(2)} points; policy rate ${a.policyRatePct} against ${b.policyRatePct}`;
    console.log(`no-steering push: ${note}`);
    const policyRatesDiffer =
      Math.abs(a.policyRatePct - b.policyRatePct) > 0.01;
    // Closed by a recorded cause (the central bank answered): fine. Closed
    // with the same policy rate in both worlds: a pull toward a level.
    if (policyRatesDiffer) {
      expect(policyRatesDiffer, note).toBe(true);
      return;
    }
    expect(Math.abs(gapEnd), note).toBeGreaterThan(gapStart / 2);
  }, 3_600_000);
});
