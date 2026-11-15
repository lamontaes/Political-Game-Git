/**
 * A firm that is already running on day 0 holds the credit line it needed
 * (credit.ts, `review` at the opening). Danville, Pennsylvania (4218136, seed
 * ilt-danville): Moody Family Clinic, 132 staff, opens with 0.4 buffer days
 * ($17,383) against a first payday of $229,076 on Jan 30. Before, it held no
 * line (the first monthly review had not run and its manager chose to do
 * without), so it closed on its first payday with "cash and credit
 * exhausted". Pinned place and seed, never drawn.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { gameStartDate } from "../game-start";
import { setBookkeeping } from "../bookkeeping";
import { advanceCore } from "../life";
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreState } from "../types";

const PLACE = "4218136";
const SEED = "ilt-danville";

describe("a firm open on day 0 holds its line", { timeout: 300_000 }, () => {
  it("Danville: Moody Family Clinic holds a line from the first day and meets its first payday", () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const c = core as unknown as CoreState;
    const clinic = [...c.organizations.values()].find(
      (o) => o.name === "Moody Family Clinic",
    )!;
    expect(clinic, "Moody Family Clinic at Danville").toBeDefined();
    // The same firm and cash the trace read: 0.4 buffer days.
    expect(clinic.liquidMinor).toBeLessThan(2_000_000);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const books = c.finance.businesses.get(clinic.id)!;
    expect(books.creditFacilityId, "its line, by id").toBeTruthy();
    // Through the first payday (Jan 30) and the day after: not closed.
    advanceCore(core, makeIsoDate("2025-02-01"));
    expect(books.closedAt).toBeUndefined();
    expect(books.wagesUnpaidMinor).toBe(0);
  });
});
