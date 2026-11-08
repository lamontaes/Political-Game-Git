import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { MacroMonth } from "./macro-model";
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

describe("a pushed value does not drift back by itself", () => {
  // KNOWN FAILURE (owner: Money). A three-point push closes to nothing in a
  // year with the policy rate the same in both worlds (macro-model.ts: the
  // unemployment rate is the natural rate minus the output gap over Okun's
  // coefficient, and the gap decays by its persistence). `it.fails` records
  // that: when the pull is removed this test starts passing, `it.fails` then
  // fails, and the marker is deleted in the same change. The baseline only
  // shrinks.
  it.fails(
    "national unemployment pushed up three points on day one stays apart where the policy rate is the same",
    () => {
      const pushed = world();
      const control = world();
      // The national model opens its month records on the first step.
      for (const core of [pushed, control])
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const api = coreAPI(pushed);
      const last = months(pushed).at(-1)!;
      api
        .moduleState(MACRO_MODULE_ID)
        .table("months")
        .put({
          ...last,
          unemploymentPct: last.unemploymentPct + PUSH,
        } as never);
      for (const core of [pushed, control])
        advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const a = months(pushed).at(-1)!;
      const b = months(control).at(-1)!;
      const gapStart = PUSH;
      const gapEnd = a.unemploymentPct - b.unemploymentPct;
      const policyRatesDiffer =
        Math.abs(a.policyRatePct - b.policyRatePct) > 0.01;
      const note = `unemployment gap ${gapStart} to ${gapEnd.toFixed(2)} points; policy rate ${a.policyRatePct} against ${b.policyRatePct}`;
      // Closed by a recorded cause (the central bank answered): fine. Closed
      // with the same policy rate in both worlds: a pull toward a level.
      if (policyRatesDiffer) {
        expect(policyRatesDiffer, note).toBe(true);
        return;
      }
      expect(Math.abs(gapEnd), note).toBeGreaterThan(gapStart / 2);
    },
    3_600_000,
  );
});
