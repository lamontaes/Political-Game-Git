/**
 * The federal deficit reaches the money a state pays its bondholders, in a
 * played world: a place drawn from all 56 on a seed nobody chose, the bench
 * world with every module installed, built twice from the same seed. In one,
 * Congress's budget adds a fifth to the national defense line; the other is
 * the control. The budgets module records the larger federal row, the outcome
 * web reads its deficit against the base (federal.deficit-change-pct-of-gdp),
 * moves what the state pays to borrow (gov.borrowing-cost), and at each
 * monthly close the treasury owes the state's interest line at that cost over
 * the state's own rate on its debt: the bondholders are paid more.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  stateDebtRate,
  treasuryMonthsOf,
  treasuryParameter,
  type TreasuryMonthRow,
} from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.DEFICIT_SEED ?? randomBytes(20).toString("hex");
const LINE = "nationalDefense";
/** Congress adds a fifth to the national defense line. */
const RAISE = 0.2;
const MEASURE = "gov.borrowing-cost";
const LINKS = WEB_LINKS.filter((l) => l.to === MEASURE).map((l) => l.key);
/** The link has no lag: a few monthly closes after the budget is amended. */
const DAYS = 120;
const TRIES = 4;

/** The basis points the web added to the state's borrowing cost in the town's latest month on a date. */
function addedOn(core: CoreState, placeId: string, date: string) {
  const rows = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
  const row = [...rows]
    .filter((r) => r.date <= date)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
  if (!row) return null;
  const added = LINKS.reduce((n, key) => n + (row.effects[key] ?? 0), 0);
  return { added, recordId: row.id };
}

function stateMonths(api: CoreAPI) {
  const state = governments(api).find((g) => g.level === "state");
  if (!state) return null;
  return { state, months: treasuryMonthsOf(api, state.id) };
}

describe("the federal deficit reaches a state's bondholders", () => {
  it(
    `a larger federal deficit moves what the state pays its bondholders each month (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `federal-deficit-borrowing:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          const lawWorld = build();
          const control = build();
          const api = coreAPI(lawWorld);
          const chain = lawChain(api);
          if (!stateMonths(api)) {
            passed.push(`${drawn.name}: no state government`);
            continue;
          }
          const us = governments(api).find((g) => g.level === "federal")!;
          const budget = budgetsOf(api, us.id).at(-1)!;
          const base = baseBudget(api, us, budget.fiscalYear).spendingMinor[
            LINE
          ]!;
          const act = `deficit-test-${attempt}`;
          amendBudget(api, {
            governmentId: us.id,
            line: LINE,
            deltaMinor: Math.round(base * RAISE),
            measureId: act,
            carry: true,
          });
          const until = addDays(makeIsoDate(lawWorld.date), DAYS);
          advanceCore(lawWorld, until);
          advanceCore(control, until);
          const withLaw = stateMonths(api)!;
          const without = stateMonths(coreAPI(control))!;
          const rate = stateDebtRate(chain.stateKey);
          const unit = treasuryParameter("basisPointsPerUnit");
          const byDate = new Map(without.months.map((m) => [m.date, m]));
          const checked: {
            month: TreasuryMonthRow;
            other: TreasuryMonthRow;
            added: number;
            recordId: string;
          }[] = [];
          for (const month of withLaw.months) {
            const other = byDate.get(month.date);
            const line = month.lines.interest;
            if (!other || !line) continue;
            const web = addedOn(lawWorld, chain.townPlaceId, month.date);
            const webControl = addedOn(control, chain.townPlaceId, month.date);
            if (!web || !webControl || web.added === webControl.added) continue;
            const budget = budgetsOf(api, withLaw.state.id).find(
              (b) => b.id === month.budgetId,
            )!;
            const planned =
              (budget.spendingMinor.interest ?? 0) /
              treasuryParameter("monthsPerYear");
            // Last month's shortfall on the line is owed on top.
            const prior = withLaw.months
              .filter((m) => m.date < month.date)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            const arrears = prior?.lines.interest?.shortMinor ?? 0;
            // The interest owed is the twelfth at the cost the web keeps.
            expect(line.dueMinor, month.id).toBe(
              Math.round(planned * Math.max(0, 1 + web.added / unit / rate)) +
                arrears,
            );
            checked.push({
              month,
              other,
              added: web.added - webControl.added,
              recordId: web.recordId,
            });
          }
          if (!checked.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): no close in a month the law moved`,
            );
            continue;
          }
          const first = checked[0]!;
          const bonds = (m: TreasuryMonthRow) =>
            m.paymentIds.find((id) =>
              id.startsWith(`treasury-bonds:bondholders:${m.governmentId}:`),
            );
          // A larger deficit: the state pays more to borrow.
          expect(first.added, first.month.id).toBeGreaterThan(0);
          expect(
            first.month.lines.interest!.dueMinor,
            first.month.id,
          ).toBeGreaterThan(first.other.lines.interest!.dueMinor);
          process.stdout.write(
            `BORROWING ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): act ${act}; ${checked.length} closes in moved months; ${first.month.id}: borrowing cost ${first.added > 0 ? "+" : ""}${first.added.toFixed(1)} basis points against the control (${first.recordId}), state rate ${(rate * 100).toFixed(2)}%, interest owed ${first.month.lines.interest!.dueMinor} against ${first.other.lines.interest!.dueMinor} in the control world, bondholders paid in ${bonds(first.month) ?? "none"}. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a close in a month the law moved: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
