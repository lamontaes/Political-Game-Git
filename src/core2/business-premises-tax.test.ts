import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { propertyTaxTerms } from "./modules/budgets";
import {
  EMPLOYER_TAXES_MODULE_ID,
  premisesTaxMinor,
} from "./modules/employer-taxes";
import type { CoreState } from "./types";

// A business pays property tax on its premises each quarter: an estimated
// share of a year's sales, at the rate in force where it stands, from its own
// cash to the place's collector. Pinned to one place and seed (a played year
// takes about a minute); the second quarter's bill is read from the books'
// sales between the two quarter days.
const QUARTER_DAYS = ["01-01", "04-01", "07-01", "10-01"];

it(
  "a business's premises tax follows its sales and the rate in force, paid to the place's collector (seed pt1:0)",
  { timeout: 400_000 },
  () => {
    const draw = drawPlace("pt1:0", "session-a-property-tax");
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const c = core as CoreState;
    const quarters = () =>
      new Map(
        (
          api
            .moduleState(EMPLOYER_TAXES_MODULE_ID)
            .table("quarters")
            .rows() as unknown as { id: string; sales?: number }[]
        ).map((r) => [r.id, r.sales]),
      );
    const arrears = () =>
      new Map(
        (
          api
            .moduleState(EMPLOYER_TAXES_MODULE_ID)
            .table("quarters")
            .rows() as unknown as { id: string; premisesOwed?: number }[]
        ).map((r) => [r.id, r.premisesOwed ?? 0]),
      );
    const cash = (id: string) => api.accounts().balance(`cash:${id}:residual`);
    let first: Map<string, number | undefined> | undefined;
    let cashBefore = new Map<string, number>();
    let seen = 0;
    for (let day = 0; day < 400 && seen < 2; day++) {
      const today = makeIsoDate(core.date);
      const next = addDays(today, 1);
      const isQuarter = QUARTER_DAYS.includes(String(next).slice(5));
      if (isQuarter && seen === 1) {
        cashBefore = new Map(
          [...c.finance.businesses.keys()].map((id) => [id, cash(id)]),
        );
      }
      advanceCore(core, next);
      if (!isQuarter) continue;
      seen++;
      if (seen === 1) first = quarters();
    }
    expect(seen, where).toBe(2);
    const second = quarters();
    const owed = arrears();
    let checked = 0;
    let paidTotal = 0;
    for (const [id, sales2] of second) {
      const sales1 = first!.get(id);
      const org = c.organizations.get(id);
      const books = c.finance.businesses.get(id);
      if (
        sales1 === undefined ||
        sales2 === undefined ||
        !org ||
        books?.closedAt
      )
        continue;
      const terms = propertyTaxTerms(api, org.placeId);
      if (!terms) continue;
      const bill = premisesTaxMinor(sales2 - sales1, terms.rate);
      const paid = bill - (owed.get(id) ?? 0);
      // What it paid is the bill less what stayed owed, never more than it had.
      expect(paid, `${where}: ${id}`).toBeGreaterThanOrEqual(0);
      expect(paid, `${where}: ${id}`).toBeLessThanOrEqual(
        (cashBefore.get(id) ?? 0) + 1,
      );
      if (bill > 0) checked++;
      paidTotal += paid;
    }
    expect(checked, `${where}: no business billed`).toBeGreaterThan(0);
    expect(paidTotal, `${where}: nothing paid`).toBeGreaterThan(0);
  },
);
