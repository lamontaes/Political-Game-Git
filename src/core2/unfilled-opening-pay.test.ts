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
      const waiting =
        Math.ceil(parameter("jobsRaiseAfterDays", core.data.parameters)) + 30;
      const standing = (id: string): PositionRow => {
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
      // The books carry it: the opening's pay rises by the owner's share of the step.
      const standingOne = standing(`${row.id}:standing`);
      raiseUnfilledPay(api, row.organizationId, [standingOne], trading);
      const lean = decisionLean(
        core,
        core.people.get(owner!)!,
        "jobs.raise-for-opening",
        "raise-pay",
        "hold-pay",
      );
      const step =
        (parameter("jobsRaiseStepShare", core.data.parameters) * (1 + lean)) /
        2;
      const raised = positions.get(standingOne.id) as unknown as PositionRow;
      expect(raised.hourlyMinor, here).toBe(
        Math.round(row.hourlyMinor * (1 + step)),
      );
      expect(raised.raisedBy, here).toBe(owner);
      expect(raised.firstHourlyMinor, here).toBe(row.hourlyMinor);
      // The rows an employer's review passes in are the table's own and read-only.
      const frozen = Object.freeze(standing(`${row.id}:frozen`));
      const reviewed: PositionRow[] = [frozen];
      raiseUnfilledPay(api, row.organizationId, reviewed, trading);
      expect(reviewed[0]!.hourlyMinor, here).toBe(
        Math.round(row.hourlyMinor * (1 + step)),
      );
      expect(
        (positions.get(frozen.id) as unknown as PositionRow).hourlyMinor,
        here,
      ).toBe(reviewed[0]!.hourlyMinor);
      // The books do not: no sales, no raise ("if they can't afford it they can't afford it").
      const broke = standing(`${row.id}:broke`);
      raiseUnfilledPay(api, row.organizationId, [broke], {
        ...trading!,
        salesMinor: 0,
      });
      expect(
        (positions.get(broke.id) as unknown as PositionRow).hourlyMinor,
        here,
      ).toBe(row.hourlyMinor);
      // A short wait raises nothing.
      const fresh = {
        ...standing(`${row.id}:fresh`),
        openedAt: core.date,
      } as PositionRow;
      positions.put(fresh as unknown as { id: string });
      raiseUnfilledPay(api, row.organizationId, [fresh], trading);
      expect(
        (positions.get(fresh.id) as unknown as PositionRow).hourlyMinor,
        here,
      ).toBe(row.hourlyMinor);
      return;
    }
    throw new Error(
      `no employer with an owner and a profitable month in 10 places; ${seed}`,
    );
  }, 3_600_000);
});
