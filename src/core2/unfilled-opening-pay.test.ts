/**
 * An opening nobody takes may be offered more by its employer (owner, Oct 16):
 * read from the employer's own books and its owner's traits, no cap beyond
 * what the business can carry. In a played world the openings of an ordinary
 * year fill within days, so none stands long enough to be raised; the raise is
 * shown on a real employer in a drawn place with one opening left standing
 * (an edge fixture), named by employer, owner and opening record id. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { businessTradingMonth, ownerOf } from "./modules/business";
import {
  JOBS_MODULE_ID,
  raiseUnfilledPay,
  type PositionRow,
} from "./modules/jobs";
import { parameter } from "./parameters";
import { coreAPI } from "./state";
import { decisionLean } from "./trait-decisions";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`unfilled openings and their pay (seed ${seed})`, () => {
  it("an employer who can carry it raises an opening left unfilled, by its owner's traits; one who cannot does not", () => {
    for (let draw = 0; draw < 10; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "unfilled-opening-pay");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), 120));
      const positions = api.moduleState(JOBS_MODULE_ID).table("positions");
      const rows = positions.rows() as unknown as PositionRow[];
      // An employer with a living owner and a month of trading it can carry a raise from.
      const found = rows
        .map((row) => ({
          row,
          owner: ownerOf(api, row.organizationId),
          trading: businessTradingMonth(api, row.organizationId),
        }))
        .find(
          (entry) =>
            entry.owner &&
            core.people.get(entry.owner)?.alive &&
            entry.trading &&
            entry.trading.days > 0 &&
            entry.trading.salesMinor -
              entry.trading.payrollMinor -
              entry.trading.costsMinor -
              entry.trading.complianceMinor >
              0,
        );
      if (!found) continue;
      const { row, owner, trading } = found;
      const heads = Math.max(
        1,
        [...(core.finance.jobsByOrganization.get(row.organizationId) ?? [])]
          .length,
      );
      const monthDays = parameter("jobsDaysPerYear", core.data.parameters) / 12;
      const perMonth = monthDays / trading!.days;
      const carries =
        ((trading!.salesMinor -
          trading!.costsMinor -
          trading!.complianceMinor) *
          perMonth) /
        heads;
      const hours = core.jobs.get(row.templateJobId)?.hoursDaily ?? 0;
      const standing = (id: string, waiting: number): PositionRow => {
        const { filledBy: _filledBy, ...rest } = row as PositionRow & {
          filledBy?: string;
        };
        void _filledBy;
        const open = {
          ...rest,
          id,
          status: "open" as const,
          openedAt: addDays(makeIsoDate(core.date), -waiting),
        };
        positions.put(open as unknown as { id: string });
        return open as PositionRow;
      };
      const here = `${where}: ${row.organizationId}, owner ${owner}`;
      const hourlyAfter = (id: string) =>
        (positions.get(id) as unknown as PositionRow).hourlyMinor;
      // The seat must be priced below what it can carry for there to be anything to add.
      if (!(hours > 0 && row.hourlyMinor * hours * monthDays < carries))
        continue;
      const lean = decisionLean(
        core,
        core.people.get(owner!)!,
        "jobs.raise-for-opening",
        "raise-pay",
        "hold-pay",
      );
      // An opening stood empty a long time is raised by its owner, and never past what the seat carries.
      const long = standing(`${row.id}:long`, 400);
      raiseUnfilledPay(api, row.organizationId, [long], trading, heads);
      const raised = positions.get(long.id) as unknown as PositionRow;
      if (lean > -1) {
        expect(raised.hourlyMinor, here).toBeGreaterThan(row.hourlyMinor);
        expect(raised.raisedBy, here).toBe(owner);
        expect(raised.firstHourlyMinor, here).toBe(row.hourlyMinor);
        expect(
          raised.hourlyMinor * hours * monthDays,
          here,
        ).toBeLessThanOrEqual(carries);
        // Sliding: a shorter wait adds no more than a longer one.
        const short = standing(`${row.id}:short`, 20);
        raiseUnfilledPay(api, row.organizationId, [short], trading, heads);
        expect(hourlyAfter(short.id), here).toBeLessThanOrEqual(
          raised.hourlyMinor,
        );
      } else {
        // A stubborn owner holds the pay.
        expect(raised.hourlyMinor, here).toBe(row.hourlyMinor);
      }
      // The rows an employer's review passes in are the table's own and read-only.
      const frozen = Object.freeze(standing(`${row.id}:frozen`, 400));
      const reviewed: PositionRow[] = [frozen];
      raiseUnfilledPay(api, row.organizationId, reviewed, trading, heads);
      expect(
        (positions.get(frozen.id) as unknown as PositionRow).hourlyMinor,
        here,
      ).toBe(reviewed[0]!.hourlyMinor);
      // The books do not carry it: no sales, no raise ("if they can't afford it they can't afford it").
      const broke = standing(`${row.id}:broke`, 400);
      raiseUnfilledPay(
        api,
        row.organizationId,
        [broke],
        { ...trading!, salesMinor: 0 },
        heads,
      );
      expect(hourlyAfter(broke.id), here).toBe(row.hourlyMinor);
      // Nothing has been lost on the first day, so nothing is raised on it.
      const fresh = standing(`${row.id}:fresh`, 0);
      raiseUnfilledPay(api, row.organizationId, [fresh], trading, heads);
      expect(hourlyAfter(fresh.id), here).toBe(row.hourlyMinor);
      return;
    }
    throw new Error(
      `no employer with an owner and a profitable month in 10 places; ${seed}`,
    );
  }, 3_600_000);
});
