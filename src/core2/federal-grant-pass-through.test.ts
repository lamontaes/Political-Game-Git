// @vitest-environment node
/**
 * A bill that raises a federal grant line reaches the line a state, county or
 * town spends that grant on (transportation to highways, education to schools,
 * health to health and hospitals): the receiver's line rises by the receiver's
 * share of the dollars, so the measures the outcome web reads (`budget.<line>-added-pct`)
 * move, and a bill that puts the federal line back puts the receiver's back.
 * Two worlds from one drawn place and seed: one where Congress's budget bill
 * raises the federal line a fifth, carried as a passed bill carries it, and
 * one left alone. A place where no government receives federal aid for the
 * line is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { budgetLineAddedPct } from "./gov-measures";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  amendBudget,
  budgetsOf,
  governments,
  type BudgetRow,
} from "./modules/budgets";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PAIRS = [
  ["transportation", "highways"],
  ["education", "schools"],
  ["health", "healthAndHospitals"],
] as const;
const TRIES = 3;

function latest(api: CoreAPI, governmentId: string): BudgetRow | undefined {
  return budgetsOf(api, governmentId)
    .filter((b) => b.startsOn <= api.state.date)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
}

it(`a raise to a federal grant line raises the line each receiver spends it on, and putting it back puts theirs back (replay ${replay})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let attempt = 0; attempt < TRIES; attempt += 1) {
      const place = drawPlace(replay, `federal-grant-pass-through:${attempt}`);
      const where = `${place.name} (${place.key}), replay ${replay} draw federal-grant-pass-through:${attempt}, world seed ${place.seed}`;
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        }).core;
      const raised = build();
      const alone = build();
      const api = coreAPI(raised);
      const control = coreAPI(alone);
      const federal = governments(api).find((g) => g.level === "federal")!;
      const budget = latest(api, federal.id)!;
      const changes: { grant: string; spentOn: string; delta: number }[] = [];
      for (const [grant, spentOn] of PAIRS) {
        const base = budget.spendingMinor[grant] ?? 0;
        expect(base, `${where}: federal ${grant}`).toBeGreaterThan(0);
        const delta = Math.round(base / 5);
        expect(
          amendBudget(api, {
            governmentId: federal.id,
            line: grant,
            deltaMinor: delta,
            measureId: `H.R. 9020 (${grant}, test)`,
            carry: true,
          }),
          where,
        ).not.toBeNull();
        changes.push({ grant, spentOn, delta });
      }
      // The same day: every receiver's line already holds its share.
      const receivers = governments(api).filter((g) => g.level !== "federal");
      let risen = 0;
      for (const gov of receivers) {
        const now = latest(api, gov.id);
        const was = latest(control, gov.id);
        if (!now || !was) continue;
        for (const { spentOn } of changes) {
          const through = now.passThroughMinor?.[spentOn] ?? 0;
          expect(
            (now.spendingMinor[spentOn] ?? 0) -
              (was.spendingMinor[spentOn] ?? 0),
            `${where}: ${gov.level} ${spentOn} rose by its pass-through`,
          ).toBe(through);
          if (through > 0) risen += 1;
        }
      }
      if (!risen) {
        passed.push(`${where}: no government receives federal aid`);
        continue;
      }
      // A monthly close later: the added aid is paid, and the measures read it.
      const until = addDays(makeIsoDate(raised.date), 40);
      advanceCore(raised, until);
      advanceCore(alone, until);
      for (const { spentOn } of changes) {
        const withBill = budgetLineAddedPct(api, spentOn)?.value ?? 0;
        const without = budgetLineAddedPct(control, spentOn)?.value ?? 0;
        expect(
          withBill,
          `${where}: budget.${spentOn}-added-pct above the world left alone`,
        ).toBeGreaterThan(without);
      }
      // The federal lines put back: every receiver's line is back.
      for (const { grant, delta } of changes)
        amendBudget(api, {
          governmentId: federal.id,
          line: grant,
          deltaMinor: -delta,
          measureId: `H.R. 9021 (${grant} back, test)`,
          carry: true,
        });
      for (const gov of receivers) {
        const now = latest(api, gov.id);
        for (const { spentOn } of changes)
          expect(
            now?.passThroughMinor?.[spentOn] ?? 0,
            `${where}: ${gov.level} ${spentOn} pass-through after the bill is undone`,
          ).toBe(0);
      }
      process.stdout.write(
        `FEDERAL GRANT ${where}: ${risen} receiver lines rose; ${changes
          .map((c) => c.spentOn)
          .join(
            ", ",
          )} measures above the world left alone; all back after the undo. Passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No place had a receiver of federal aid: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
