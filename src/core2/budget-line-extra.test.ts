// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  amendBudget,
  budgetsOf,
  enactedBudgetChanges,
  governments,
  lineExtra,
  type BudgetRow,
  type GovernmentRow,
} from "./modules/budgets";
import { budgetToday } from "./law-reach/group-a-money";
import parameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import type { CoreAPI, CoreState } from "./types";

// A state's or county's adopted lines carry forward from its last budget by its receipts (carriedLines in modules/budgets.ts).
// A line's extra is read against that scaled base (lineExtra), so a line no bill raised pays no rent help
// and a raise shows whatever the factor is. Pinned places and the seed (never drawn):
//   Whitney, Nevada: receipts above 1; no housing bill in the county, yet the county's line read 475,182,513 above
//   the Census base before the fix. Runs by default.
//   Fort Carson, Colorado: receipts below 1; the county's line read 1,368,709,834 below its base, hiding a raise.
//   Runs with HOUSING_ALL_PINS=1, as the housing family test's slow places do.
setBookkeeping(false);
const SEED = "housing-pin-1";
// After the county's own budget is adopted for its fiscal year, before the council's mid-year bills (Whitney's
// came in March 2026 and the winter after): the raise and the cut then stand alone in their windows.
const DAYS = 560;
// A month's window holds one rent-help payment day (the sixth).
const WINDOW = 32;
const PINS = [
  { name: "Whitney, Nevada", key: "3283800" },
  { name: "Fort Carson, Colorado", key: "0827370" },
] as const;
const ALL = process.env.HOUSING_ALL_PINS === "1";

interface Post {
  readonly date: string;
  readonly accounts: readonly string[];
  readonly gross: number;
}

for (const pin of PINS) {
  const where = `${pin.name} (${pin.key}), seed ${SEED}`;
  (pin.key === PINS[0].key || ALL ? describe : describe.skip)(
    `a budget line's extra is read against its receipts-scaled base (${where})`,
    () => {
      const posts: Post[] = [];
      let api!: CoreAPI;
      let core!: CoreState;
      let county!: GovernmentRow;
      const step = (days: number) =>
        advanceCore(core, addDays(makeIsoDate(core.date), days));
      const paidBy = (gov: GovernmentRow, since: string) =>
        posts
          .filter(
            (p) =>
              p.date > since &&
              p.accounts.some((a) => a.includes(gov.organizationId)),
          )
          .reduce((n, p) => n + p.gross, 0);
      const row = (gov: GovernmentRow): BudgetRow =>
        budgetToday(api, gov) as BudgetRow;
      // The facts the cases read, taken in order in one world (about eight minutes to build and play).
      const seen: Record<string, number | string> = {};

      beforeAll(() => {
        const world = buildBenchWorld(SEED, gameStartDate(), {
          twoLevel: true,
          placeKey: pin.key,
        });
        core = world.core;
        api = coreAPI(core);
        setJournalTrace((input) => {
          if (!/^rent-assistance:/.test(input.sourceRef.id)) return;
          let gross = 0;
          for (const p of input.postings)
            if (p.deltaMinor > 0) gross += p.deltaMinor;
          posts.push({
            date: input.date,
            accounts: input.postings.map((p) => p.accountId),
            gross,
          });
        });
        step(DAYS);
        county = governments(api).find((g) => g.level === "county")!;
        // The year as played: no housing bill, so the county's line stands at its scaled base.
        seen.countyExtraBefore = lineExtra(api, county, row(county), "housing");
        seen.countyEnactedBefore =
          enactedBudgetChanges(api, county.id).housing ?? 0;
        seen.countyPaidInYear = paidBy(county, "0000-00-00");
        // A raise: the county's housing line is amended by a thousand vouchers' worth.
        const raise =
          parameters.parameters.housingAssistanceAnnualMinor.value * 1000;
        const raisedOn = core.date;
        amendBudget(api, {
          governmentId: county.id,
          line: "housing",
          deltaMinor: raise,
          measureId: "budget-line-extra-test-raise",
          carry: true,
        });
        seen.raise = raise;
        seen.extraAtRaise = lineExtra(api, county, row(county), "housing");
        seen.enactedAtRaise = enactedBudgetChanges(api, county.id).housing ?? 0;
        step(WINDOW);
        // The county's own council may pass a budget bill in the window; the line then follows it, and the
        // extra still reads what the bills and acts amount to (enacted changes).
        seen.extraAfterWindow = lineExtra(api, county, row(county), "housing");
        seen.enactedAfterWindow =
          enactedBudgetChanges(api, county.id).housing ?? 0;
        seen.paidAfterRaise = paidBy(county, raisedOn);
        // The cut: the line goes back to its base.
        const cutOn = core.date;
        amendBudget(api, {
          governmentId: county.id,
          line: "housing",
          deltaMinor: -lineExtra(api, county, row(county), "housing"),
          measureId: "budget-line-extra-test-cut",
          carry: true,
        });
        seen.extraAtCut = lineExtra(api, county, row(county), "housing");
        const amendmentsBefore = row(county).adoptedBy.amendedBy ?? [];
        step(WINDOW);
        seen.paidAfterCut = paidBy(county, cutOn);
        // The county's own council may pass a budget bill in these days. Name each one; the case holds only
        // if none of them put the line back above its base.
        seen.billsInCutWindow = (row(county).adoptedBy.amendedBy ?? [])
          .filter((id) => !amendmentsBefore.includes(id))
          .join(", ");
        seen.extraEndOfCutWindow = lineExtra(
          api,
          county,
          row(county),
          "housing",
        );
        seen.budgets = budgetsOf(api, county.id).length;
      }, 900_000);

      afterAll(() => setJournalTrace(null));

      it("a county's housing line no bill raised stands at its base, whatever its receipts did", () => {
        expect(seen.countyExtraBefore, where).toBe(seen.countyEnactedBefore);
      });
      it("pays no rent help from a line no bill raised above its base", () => {
        // Pinned fact: neither county's own bills raised its housing line (Fort Carson's cut it).
        expect(Number(seen.countyEnactedBefore), where).toBeLessThanOrEqual(0);
        expect(seen.countyPaidInYear, where).toBe(0);
      });
      it("a raise shows in full and pays", () => {
        expect(seen.extraAtRaise, where).toBe(
          Number(seen.countyExtraBefore) + Number(seen.raise),
        );
        expect(seen.extraAtRaise, where).toBe(seen.enactedAtRaise);
        expect(Number(seen.extraAtRaise), where).toBeGreaterThan(0);
        expect(Number(seen.paidAfterRaise), where).toBeGreaterThan(0);
      });
      it("the extra is what the bills and acts amount to, a month on", () => {
        expect(seen.extraAfterWindow, where).toBe(seen.enactedAfterWindow);
      });
      it("a cut puts the line back to its base and ends the help", () => {
        expect(seen.extraAtCut, where).toBe(0);
        expect(seen.paidAfterCut, where).toBe(0);
        // Bills in the window (named here when there are any) did not restore the line above its base.
        expect(
          Number(seen.extraEndOfCutWindow),
          `${where}: bills in the cut window: ${seen.billsInCutWindow || "none"}`,
        ).toBeLessThanOrEqual(0);
      });
    },
    1_000_000,
  );
}
